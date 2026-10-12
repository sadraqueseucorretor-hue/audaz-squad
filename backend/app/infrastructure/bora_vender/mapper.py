"""Tradução do JSON do Bora Vender para as entidades do domínio.

Toda a dependência do *formato* da API externa fica concentrada aqui. Se o
Bora Vender mudar nomes de campos, só este arquivo muda — o domínio e os
casos de uso ficam intactos (princípio aberto/fechado + baixo acoplamento).
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from ...domain.entities import Disponibilidade, Empreendimento, Unidade
from ...domain.value_objects import Dinheiro, StatusUnidade


def _texto(valor: Any) -> str | None:
    if valor is None:
        return None
    texto = str(valor).strip()
    return texto or None


def _inteiro(valor: Any) -> int | None:
    if valor in (None, "", "-"):
        return None
    try:
        return int(float(valor))
    except (TypeError, ValueError):
        return None


def _data(valor: Any) -> datetime | None:
    texto = _texto(valor)
    if not texto:
        return None
    try:
        return datetime.fromisoformat(texto.replace("Z", "+00:00"))
    except ValueError:
        return None


def mapear_empreendimento(dado: dict[str, Any]) -> Empreendimento:
    """Mapeia um item do endpoint /empreendimento/obter."""
    return Empreendimento(
        id=str(dado.get("idEmpreendimentoSales") or ""),
        nome=_texto(dado.get("nomeEmpreendimento")) or "",
        construtora=_texto(dado.get("unidadeDeNegocio")) or _texto(dado.get("construtora")),
        logradouro=_texto(dado.get("logradouroObra")),
        bairro=_texto(dado.get("bairroObra")),
        cidade=_texto(dado.get("cidadeObra")) or _texto(dado.get("municipioObra")),
        uf=_texto(dado.get("ufObra")) or _texto(dado.get("regional")),
        cep=_texto(dado.get("cepObra")) or _texto(dado.get("cep")),
        numero_unidades=_inteiro(dado.get("numeroDeUnidades")),
    )


def mapear_unidade(dado: dict[str, Any], *, bloco: str | None, valor_andar: Any) -> Unidade:
    """Mapeia uma unidade dentro de blocos[].andar[].unidades[].

    O valor da unidade vem no nível do `andar` (campo `valor`); caímos para o
    `valorFinalKit` da própria unidade quando o andar não traz valor.
    """
    valor_bruto = valor_andar if valor_andar not in (None, 0, 0.0) else dado.get("valorFinalKit")
    return Unidade(
        id=str(dado.get("idUnidadeSales") or ""),
        identificador=_texto(dado.get("identificador")) or _texto(dado.get("idUnidadeSales")) or "",
        status=StatusUnidade(_texto(dado.get("statusUnidade")) or "Indefinido"),
        valor=Dinheiro.de(valor_bruto),
        bloco=bloco,
        andar=_inteiro(dado.get("andar")),
        tipo=_texto(dado.get("tipoUnidade")),
        tipo_planta=_texto(dado.get("tipoPlanta")),
        area_privativa=_as_float(dado.get("areaPrivativaPrincipal")),
        num_quartos=_inteiro(dado.get("numQuartos")),
        num_suites=_inteiro(dado.get("numSuites")),
        num_banhos=_inteiro(dado.get("numBanhos")),
        vagas=_inteiro(dado.get("qtdeVagas")),
        produto=_texto(dado.get("produtoDirecional")),
        atualizado_em=_data(dado.get("dataAlteracao")),
        valor_final_kit=_dinheiro_opt(dado.get("valorFinalKit")),
        valor_aval_bancaria=_dinheiro_opt(dado.get("valorAvalBancaria")),
        folga_volta_caixa=_dinheiro_opt(dado.get("folgaVoltaCaixa")),
        ba_unidade=_dinheiro_opt(dado.get("baUnidade")),
    )


def _as_float(valor: Any) -> float | None:
    if valor in (None, "", "-"):
        return None
    try:
        return float(valor)
    except (TypeError, ValueError):
        return None


def _dinheiro_opt(valor: Any) -> Dinheiro | None:
    """Dinheiro quando há valor; None quando o campo não vem na resposta."""
    if valor in (None, "", "-"):
        return None
    try:
        return Dinheiro.de(valor)
    except ValueError:
        return None


def mapear_disponibilidade(empreendimento_id: str, payload: dict[str, Any]) -> Disponibilidade:
    """Mapeia a resposta de /unidade/obter-espelho-de-vendas.

    Estrutura: { "blocos": [ { "nome", "andar": [ { "valor", "unidades": [...] } ] } ] }
    """
    unidades: list[Unidade] = []
    for bloco in payload.get("blocos") or []:
        nome_bloco = _texto(bloco.get("nome"))
        for andar in bloco.get("andar") or []:
            valor_andar = andar.get("valor")
            for dado in andar.get("unidades") or []:
                unidade = mapear_unidade(dado, bloco=nome_bloco, valor_andar=valor_andar)
                if unidade.id:
                    unidades.append(unidade)
    return Disponibilidade(empreendimento_id=empreendimento_id, unidades=tuple(unidades))
