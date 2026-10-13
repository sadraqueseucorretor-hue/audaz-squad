"""Implementações das portas de repositório usando o Bora Vender."""
from __future__ import annotations

from collections.abc import Sequence

from ...domain.entities import Disponibilidade, Empreendimento
from ...domain.exceptions import FalhaNaIntegracao, TokenInvalido
from ...domain.repositories import (
    RepositorioDeDisponibilidade,
    RepositorioDeEmpreendimentos,
)
from ...domain.value_objects import Credencial
from ..cache import CacheTTL
from .client import ClienteBoraVender
from .mapper import mapear_disponibilidade, mapear_empreendimento


class RepositorioEmpreendimentosBoraVender(RepositorioDeEmpreendimentos):
    def __init__(
        self,
        cliente: ClienteBoraVender,
        *,
        unidades_de_negocio: Sequence[str],
        regional: str,
    ) -> None:
        self._cliente = cliente
        # Remove vazios/duplicados preservando a ordem informada.
        self._unidades = list(dict.fromkeys(u for u in unidades_de_negocio if u))
        self._regional = regional

    async def listar(
        self, credencial: Credencial, *, somente_disponiveis: bool = False
    ) -> Sequence[Empreendimento]:
        # Consulta cada unidade de negócio e junta tudo, sem repetir o mesmo
        # empreendimento (dedup por id). Um erro de token derruba todas (é
        # autenticação); um erro pontual numa unidade não cancela as outras.
        vistos: dict[str, Empreendimento] = {}
        ultimo_erro: FalhaNaIntegracao | None = None
        for unidade in self._unidades:
            try:
                dados = await self._cliente.get_json(
                    "empreendimento/obter",
                    credencial,
                    params={
                        "unidadeDeNegocio": unidade,
                        "regional": self._regional,
                        "somenteDisponiveis": str(somente_disponiveis).lower(),
                    },
                )
            except TokenInvalido:
                raise
            except FalhaNaIntegracao as erro:
                ultimo_erro = erro
                continue
            if not isinstance(dados, list):
                continue
            for item in dados:
                if not item:
                    continue
                emp = mapear_empreendimento(item)
                if emp.id:
                    vistos.setdefault(emp.id, emp)

        if not vistos and ultimo_erro is not None:
            raise ultimo_erro
        return sorted(vistos.values(), key=lambda e: (e.nome or "").lower())


class RepositorioDisponibilidadeBoraVender(RepositorioDeDisponibilidade):
    def __init__(self, cliente: ClienteBoraVender) -> None:
        self._cliente = cliente

    async def obter(
        self, credencial: Credencial, empreendimento_id: str
    ) -> Disponibilidade:
        payload = await self._cliente.get_json(
            "unidade/obter-espelho-de-vendas",
            credencial,
            params={"IdEmpreendimentoSales": empreendimento_id},
        )
        if not isinstance(payload, dict):
            raise FalhaNaIntegracao("Espelho de vendas em formato inesperado.")
        return mapear_disponibilidade(empreendimento_id, payload)


class RepositorioDisponibilidadeComCache(RepositorioDeDisponibilidade):
    """Camada de cache (TTL) na frente do repositório real.

    A disponibilidade é a mesma para qualquer corretor, então guardamos por
    empreendimento e o cache é compartilhado entre todas as requisições. Só
    chama o Bora Vender quando não há valor válido em cache.
    """

    def __init__(self, interno: RepositorioDeDisponibilidade, cache: "CacheTTL") -> None:
        self._interno = interno
        self._cache = cache

    async def obter(
        self, credencial: Credencial, empreendimento_id: str
    ) -> Disponibilidade:
        em_cache = self._cache.obter(empreendimento_id)
        if em_cache is not None:
            return em_cache
        valor = await self._interno.obter(credencial, empreendimento_id)
        self._cache.guardar(empreendimento_id, valor)
        return valor
