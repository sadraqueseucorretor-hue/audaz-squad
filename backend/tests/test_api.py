"""Testes das rotas ao vivo do Bora Vender com dublês (sem rede, sem DB).

Substituímos tanto a credencial (que normalmente vem do Postgres) quanto os
casos de uso por dublês via `app.dependency_overrides`.
"""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.application.use_cases.listar_empreendimentos import ListarEmpreendimentos
from app.application.use_cases.obter_disponibilidade import ObterDisponibilidade
from app.domain.entities import Disponibilidade, Empreendimento, Unidade
from app.domain.repositories import (
    RepositorioDeDisponibilidade,
    RepositorioDeEmpreendimentos,
)
from app.domain.value_objects import Credencial, Dinheiro, StatusUnidade
from app.interface.api import deps
from app.main import app


class EmpreendimentosFake(RepositorioDeEmpreendimentos):
    async def listar(self, credencial, *, somente_disponiveis=False):
        return [Empreendimento(id="emp-1", nome="Estilo Dunas", bairro="Dunas")]


class DisponibilidadeFake(RepositorioDeDisponibilidade):
    async def obter(self, credencial, empreendimento_id):
        unidades = (
            Unidade(id="u-1", identificador="101", status=StatusUnidade("Disponível"), valor=Dinheiro.de(219900)),
            Unidade(id="u-2", identificador="102", status=StatusUnidade("Vendida"), valor=Dinheiro.de(210000)),
        )
        return Disponibilidade(empreendimento_id=empreendimento_id, unidades=unidades)


def setup_module(_module):
    app.dependency_overrides[deps.get_credencial] = lambda: Credencial(token="fake")
    app.dependency_overrides[deps.get_listar_empreendimentos] = lambda: ListarEmpreendimentos(EmpreendimentosFake())
    app.dependency_overrides[deps.get_obter_disponibilidade] = lambda: ObterDisponibilidade(DisponibilidadeFake())


def teardown_module(_module):
    app.dependency_overrides.clear()


cliente = TestClient(app)


def test_health():
    assert cliente.get("/health").json() == {"status": "ok"}


def test_listar_empreendimentos():
    r = cliente.get("/api/v1/empreendimentos")
    assert r.status_code == 200
    assert r.json()[0]["nome"] == "Estilo Dunas"


def test_disponibilidade_com_resumo():
    r = cliente.get("/api/v1/empreendimentos/emp-1/disponibilidade")
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["resumo"]["total"] == 2
    assert corpo["resumo"]["disponiveis"] == 1
    assert corpo["unidades"][0]["valor_formatado"].startswith("R$")
