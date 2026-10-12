"""Entidades e agregados do domínio.

- `Empreendimento`: identidade = idEmpreendimentoSales.
- `Unidade`: identidade = idUnidadeSales.
- `Disponibilidade`: agregado que reúne as unidades de um empreendimento e
  responde às perguntas de negócio (o que está disponível, faixa de preço...).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from .value_objects import CategoriaStatus, Dinheiro, StatusUnidade


@dataclass(frozen=True, slots=True)
class Empreendimento:
    """Um empreendimento como listado pelo Bora Vender."""

    id: str
    nome: str
    construtora: str | None = None
    logradouro: str | None = None
    bairro: str | None = None
    cidade: str | None = None
    uf: str | None = None
    cep: str | None = None
    numero_unidades: int | None = None

    def __post_init__(self) -> None:
        if not self.id:
            raise ValueError("Empreendimento sem id.")
        if not self.nome:
            raise ValueError("Empreendimento sem nome.")


@dataclass(frozen=True, slots=True)
class Unidade:
    """Uma unidade (apartamento, etc.) dentro de um empreendimento."""

    id: str
    identificador: str
    status: StatusUnidade
    valor: Dinheiro
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
    # Valores comerciais (Bora Vender) — None quando o campo não vem na resposta.
    valor_final_kit: Dinheiro | None = None       # valor final do imóvel
    valor_aval_bancaria: Dinheiro | None = None   # avaliação da unidade pelo banco
    folga_volta_caixa: Dinheiro | None = None     # desconto opcional do corretor (Volta ao Caixa)
    ba_unidade: Dinheiro | None = None            # desconto que a unidade já possui

    def __post_init__(self) -> None:
        if not self.id:
            raise ValueError("Unidade sem id.")

    @property
    def disponivel(self) -> bool:
        return self.status.disponivel


@dataclass(frozen=True, slots=True)
class ResumoDisponibilidade:
    """Números agregados de um empreendimento, prontos para a UI."""

    total: int
    disponiveis: int
    por_categoria: dict[str, int]
    preco_minimo_disponivel: Dinheiro | None
    preco_maximo_disponivel: Dinheiro | None


@dataclass(frozen=True, slots=True)
class Disponibilidade:
    """Agregado: o espelho de vendas de um empreendimento."""

    empreendimento_id: str
    unidades: tuple[Unidade, ...] = field(default_factory=tuple)

    @property
    def unidades_disponiveis(self) -> tuple[Unidade, ...]:
        return tuple(u for u in self.unidades if u.disponivel)

    @property
    def resumo(self) -> ResumoDisponibilidade:
        por_categoria: dict[str, int] = {c.value: 0 for c in CategoriaStatus}
        for u in self.unidades:
            por_categoria[u.status.categoria.value] += 1

        disponiveis = self.unidades_disponiveis
        # Faixa de preço pelo valor final do imóvel (valorFinalKit).
        precos = [u.valor_final_kit for u in disponiveis if u.valor_final_kit and not u.valor_final_kit.zero]
        menor = min(precos, key=lambda d: d.valor) if precos else None
        maior = max(precos, key=lambda d: d.valor) if precos else None

        return ResumoDisponibilidade(
            total=len(self.unidades),
            disponiveis=len(disponiveis),
            por_categoria=por_categoria,
            preco_minimo_disponivel=menor,
            preco_maximo_disponivel=maior,
        )
