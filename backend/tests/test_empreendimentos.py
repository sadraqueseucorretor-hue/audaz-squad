"""Testes da listagem de empreendimentos em várias unidades de negócio."""
from __future__ import annotations

import pytest

from app.domain.exceptions import FalhaNaIntegracao, TokenInvalido
from app.domain.value_objects import Credencial
from app.infrastructure.bora_vender.repositorios import (
    RepositorioEmpreendimentosBoraVender,
)

CRED = Credencial(token="x.y.z")


class ClienteFake:
    """Devolve uma lista por unidade de negócio (ou levanta erro)."""

    def __init__(self, por_unidade: dict[str, object]) -> None:
        self._por_unidade = por_unidade
        self.chamadas: list[str] = []

    async def get_json(self, caminho, credencial, params=None):
        unidade = params["unidadeDeNegocio"]
        self.chamadas.append(unidade)
        resultado = self._por_unidade[unidade]
        if isinstance(resultado, Exception):
            raise resultado
        return resultado


def _emp(id_, nome):
    return {"idEmpreendimentoSales": id_, "nomeEmpreendimento": nome}


async def test_junta_direcional_e_riva_ordenado():
    cliente = ClienteFake({
        "Direcional": [_emp("a0D1", "Mirante")],
        "Riva": [_emp("a0R1", "Lúmina Fátima"), _emp("a0R2", "Orizon Rooftop")],
    })
    repo = RepositorioEmpreendimentosBoraVender(
        cliente, unidades_de_negocio=["Direcional", "Riva"], regional="CE"
    )
    itens = await repo.listar(CRED)
    ids = [e.id for e in itens]
    assert set(ids) == {"a0D1", "a0R1", "a0R2"}
    # ordenado por nome
    assert [e.nome for e in itens] == ["Lúmina Fátima", "Mirante", "Orizon Rooftop"]
    assert cliente.chamadas == ["Direcional", "Riva"]


async def test_dedup_por_id():
    cliente = ClienteFake({
        "Direcional": [_emp("dup", "Nome A")],
        "Riva": [_emp("dup", "Nome A"), _emp("r", "Nome B")],
    })
    repo = RepositorioEmpreendimentosBoraVender(
        cliente, unidades_de_negocio=["Direcional", "Riva"], regional="CE"
    )
    itens = await repo.listar(CRED)
    assert len(itens) == 2


async def test_erro_pontual_numa_unidade_nao_cancela_as_outras():
    cliente = ClienteFake({
        "Direcional": [_emp("a0D1", "Mirante")],
        "Riva": FalhaNaIntegracao("Bora Vender respondeu 500."),
    })
    repo = RepositorioEmpreendimentosBoraVender(
        cliente, unidades_de_negocio=["Direcional", "Riva"], regional="CE"
    )
    itens = await repo.listar(CRED)
    assert [e.id for e in itens] == ["a0D1"]


async def test_token_invalido_propaga():
    cliente = ClienteFake({"Direcional": TokenInvalido("expirado")})
    repo = RepositorioEmpreendimentosBoraVender(
        cliente, unidades_de_negocio=["Direcional"], regional="CE"
    )
    with pytest.raises(TokenInvalido):
        await repo.listar(CRED)
