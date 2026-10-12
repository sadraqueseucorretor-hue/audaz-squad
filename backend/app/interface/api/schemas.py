"""Schemas de entrada/saída da API (Pydantic) e tradução a partir do domínio.

Estes modelos são o "contrato" HTTP. Ficam separados das entidades de domínio
de propósito: a API pode evoluir seu formato sem contaminar o núcleo.
"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from ...domain.entities import Disponibilidade, Empreendimento, Unidade
from ...domain.token import InformacoesToken
from ...domain.value_objects import Dinheiro


def _num(d: Dinheiro | None) -> float | None:
    return float(d.valor) if d is not None else None


def _fmt(d: Dinheiro | None) -> str | None:
    return d.formatar() if d is not None else None


class EmpreendimentoOut(BaseModel):
    id: str
    nome: str
    construtora: str | None = None
    logradouro: str | None = None
    bairro: str | None = None
    cidade: str | None = None
    uf: str | None = None
    cep: str | None = None
    numero_unidades: int | None = None

    @classmethod
    def de(cls, e: Empreendimento) -> "EmpreendimentoOut":
        return cls(
            id=e.id,
            nome=e.nome,
            construtora=e.construtora,
            logradouro=e.logradouro,
            bairro=e.bairro,
            cidade=e.cidade,
            uf=e.uf,
            cep=e.cep,
            numero_unidades=e.numero_unidades,
        )


class UnidadeOut(BaseModel):
    id: str
    identificador: str
    status: str
    categoria_status: str
    disponivel: bool
    valor: float
    valor_formatado: str
    bloco: str | None = None
    andar: int | None = None
    tipo: str | None = None
    tipo_planta: str | None = None
    area_privativa: float | None = None
    num_quartos: int | None = None
    num_suites: int | None = None
    num_banhos: int | None = None
    vagas: int | None = None
    produto: str | None = None
    atualizado_em: datetime | None = None
    # Valores comerciais (None quando não vêm na resposta do Bora Vender).
    valor_final_kit: float | None = None
    valor_final_kit_formatado: str | None = None
    valor_aval_bancaria: float | None = None
    valor_aval_bancaria_formatado: str | None = None
    folga_volta_caixa: float | None = None
    folga_volta_caixa_formatado: str | None = None
    ba_unidade: float | None = None
    ba_unidade_formatado: str | None = None

    @classmethod
    def de(cls, u: Unidade) -> "UnidadeOut":
        return cls(
            id=u.id,
            identificador=u.identificador,
            status=u.status.descricao,
            categoria_status=u.status.categoria.value,
            disponivel=u.disponivel,
            valor=float(u.valor.valor),
            valor_formatado=u.valor.formatar(),
            bloco=u.bloco,
            andar=u.andar,
            tipo=u.tipo,
            tipo_planta=u.tipo_planta,
            area_privativa=u.area_privativa,
            num_quartos=u.num_quartos,
            num_suites=u.num_suites,
            num_banhos=u.num_banhos,
            vagas=u.vagas,
            produto=u.produto,
            atualizado_em=u.atualizado_em,
            valor_final_kit=_num(u.valor_final_kit),
            valor_final_kit_formatado=_fmt(u.valor_final_kit),
            valor_aval_bancaria=_num(u.valor_aval_bancaria),
            valor_aval_bancaria_formatado=_fmt(u.valor_aval_bancaria),
            folga_volta_caixa=_num(u.folga_volta_caixa),
            folga_volta_caixa_formatado=_fmt(u.folga_volta_caixa),
            ba_unidade=_num(u.ba_unidade),
            ba_unidade_formatado=_fmt(u.ba_unidade),
        )


class ResumoOut(BaseModel):
    total: int
    disponiveis: int
    por_categoria: dict[str, int]
    preco_minimo_disponivel: float | None = None
    preco_maximo_disponivel: float | None = None


class DisponibilidadeOut(BaseModel):
    empreendimento_id: str
    resumo: ResumoOut
    unidades: list[UnidadeOut]

    @classmethod
    def de(cls, d: Disponibilidade) -> "DisponibilidadeOut":
        r = d.resumo
        return cls(
            empreendimento_id=d.empreendimento_id,
            resumo=ResumoOut(
                total=r.total,
                disponiveis=r.disponiveis,
                por_categoria=r.por_categoria,
                preco_minimo_disponivel=(
                    float(r.preco_minimo_disponivel.valor)
                    if r.preco_minimo_disponivel
                    else None
                ),
                preco_maximo_disponivel=(
                    float(r.preco_maximo_disponivel.valor)
                    if r.preco_maximo_disponivel
                    else None
                ),
            ),
            unidades=[UnidadeOut.de(u) for u in d.unidades],
        )


class InspecaoTokenIn(BaseModel):
    token: str = Field(..., description="Token a inspecionar (com ou sem 'Bearer ').")


class InspecaoTokenOut(BaseModel):
    assunto: str | None = None
    usuario: str | None = None
    email: str | None = None
    atividade: str | None = None
    emitido_em: datetime | None = None
    expira_em: datetime | None = None
    expirado: bool
    segundos_restantes: int | None = None

    @classmethod
    def de(cls, i: InformacoesToken) -> "InspecaoTokenOut":
        return cls(
            assunto=i.assunto,
            usuario=i.usuario,
            email=i.email,
            atividade=i.atividade,
            emitido_em=i.emitido_em,
            expira_em=i.expira_em,
            expirado=i.expirado,
            segundos_restantes=i.segundos_restantes,
        )


class ErroOut(BaseModel):
    detalhe: str


# ----- autenticação -----

class LoginIn(BaseModel):
    email: str
    senha: str


class UsuarioOut(BaseModel):
    id: int | None
    email: str
    nome: str | None = None


class SessaoOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut


class UsuarioCriarIn(BaseModel):
    email: str = Field(..., description="E-mail de login do novo administrador.")
    senha: str = Field(..., min_length=6, description="Senha (mínimo 6 caracteres).")
    nome: str | None = Field(default=None, description="Nome de exibição (opcional).")


# ----- credencial Bora Vender -----

class SalvarTokenIn(BaseModel):
    token: str = Field(..., description="Token do Bora Vender (com ou sem 'Bearer ').")


class StatusCredencialOut(BaseModel):
    usuario: str | None = None
    email: str | None = None
    atividade: str | None = None
    emitido_em: datetime | None = None
    expira_em: datetime | None = None
    expirado: bool
    segundos_restantes: int | None = None
    atualizado_em: datetime | None = None
    atualizado_por: str | None = None


# ----- catálogo -----

class ReordenarIn(BaseModel):
    slugs: list[str]
