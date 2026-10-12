"""Testes do mapeamento JSON -> domínio e do agregado de disponibilidade."""
from __future__ import annotations

import json
from pathlib import Path

from app.domain.value_objects import CategoriaStatus
from app.infrastructure.bora_vender.mapper import (
    mapear_disponibilidade,
    mapear_empreendimento,
)

FIXTURE = Path(__file__).parent / "fixtures" / "espelho_exemplo.json"


def carregar() -> dict:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def test_mapeia_todas_as_unidades():
    disp = mapear_disponibilidade("emp-1", carregar())
    assert disp.empreendimento_id == "emp-1"
    assert len(disp.unidades) == 4


def test_valor_vem_do_andar_e_cai_para_a_unidade():
    disp = mapear_disponibilidade("emp-1", carregar())
    por_id = {u.id: u for u in disp.unidades}
    assert float(por_id["u-001"].valor.valor) == 219900.0  # valor do andar
    assert float(por_id["u-004"].valor.valor) == 210000.0  # cai para valorFinalKit


def test_classificacao_de_status():
    disp = mapear_disponibilidade("emp-1", carregar())
    por_id = {u.id: u for u in disp.unidades}
    assert por_id["u-001"].status.categoria is CategoriaStatus.DISPONIVEL
    assert por_id["u-001"].disponivel is True
    assert por_id["u-002"].status.categoria is CategoriaStatus.RESERVADA
    assert por_id["u-004"].status.categoria is CategoriaStatus.VENDIDA
    assert por_id["u-004"].disponivel is False


def test_resumo_agrega_corretamente():
    disp = mapear_disponibilidade("emp-1", carregar())
    r = disp.resumo
    assert r.total == 4
    assert r.disponiveis == 2
    assert r.por_categoria["disponivel"] == 2
    assert r.por_categoria["reservada"] == 1
    assert r.por_categoria["vendida"] == 1
    # Faixa de preço considera só as disponíveis (219900 e 235000).
    assert float(r.preco_minimo_disponivel.valor) == 219900.0
    assert float(r.preco_maximo_disponivel.valor) == 235000.0


def test_mapeia_empreendimento():
    emp = mapear_empreendimento(
        {
            "idEmpreendimentoSales": "a0E...X",
            "nomeEmpreendimento": "Estilo Dunas",
            "logradouroObra": "Rua das Dunas, 100",
            "bairroObra": "Praia do Futuro",
            "numeroDeUnidades": 175,
            "regional": "CE",
        }
    )
    assert emp.id == "a0E...X"
    assert emp.nome == "Estilo Dunas"
    assert emp.bairro == "Praia do Futuro"
    assert emp.numero_unidades == 175
    assert emp.uf == "CE"


def test_mapeia_valores_comerciais():
    disp = mapear_disponibilidade("emp-1", carregar())
    por_id = {u.id: u for u in disp.unidades}
    u1 = por_id["u-001"]
    assert float(u1.valor_final_kit.valor) == 219900.0
    assert float(u1.valor_aval_bancaria.valor) == 230000.0
    assert float(u1.folga_volta_caixa.valor) == 5000.0
    assert float(u1.ba_unidade.valor) == 8000.0
    # Unidade sem esses campos -> None (não vira zero).
    assert por_id["u-002"].valor_final_kit is None
    assert por_id["u-002"].valor_aval_bancaria is None


def test_dinheiro_formata_em_reais():
    disp = mapear_disponibilidade("emp-1", carregar())
    u = {x.id: x for x in disp.unidades}["u-001"]
    assert u.valor.formatar() == "R$ 219.900,00"
