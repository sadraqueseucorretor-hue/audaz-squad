"""Implementações das portas de repositório usando o Bora Vender."""
from __future__ import annotations

from collections.abc import Sequence

from ...domain.entities import Disponibilidade, Empreendimento
from ...domain.exceptions import FalhaNaIntegracao
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
        unidade_de_negocio: str,
        regional: str,
    ) -> None:
        self._cliente = cliente
        self._unidade_de_negocio = unidade_de_negocio
        self._regional = regional

    async def listar(
        self, credencial: Credencial, *, somente_disponiveis: bool = False
    ) -> Sequence[Empreendimento]:
        dados = await self._cliente.get_json(
            "empreendimento/obter",
            credencial,
            params={
                "unidadeDeNegocio": self._unidade_de_negocio,
                "regional": self._regional,
                "somenteDisponiveis": str(somente_disponiveis).lower(),
            },
        )
        if not isinstance(dados, list):
            raise FalhaNaIntegracao("Lista de empreendimentos em formato inesperado.")
        return [mapear_empreendimento(item) for item in dados if item]


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
