"""Objetos de valor do domínio.

Objetos de valor são imutáveis e definidos pelo seu conteúdo (não têm
identidade própria). Não dependem de nada fora do domínio.
"""
from __future__ import annotations

import unicodedata
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from enum import Enum


def _sem_acento(texto: str) -> str:
    nfkd = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).casefold().strip()


@dataclass(frozen=True, slots=True)
class Dinheiro:
    """Valor monetário em reais. Guardado como Decimal para não perder centavos."""

    valor: Decimal

    def __post_init__(self) -> None:
        if self.valor < 0:
            raise ValueError("Valor monetário não pode ser negativo.")

    @classmethod
    def de(cls, bruto: object) -> "Dinheiro":
        """Cria a partir de int/float/str/Decimal; `None` e vazio viram zero."""
        if bruto is None or bruto == "":
            return cls(Decimal("0"))
        try:
            return cls(Decimal(str(bruto)))
        except (InvalidOperation, ValueError) as erro:
            raise ValueError(f"Valor monetário inválido: {bruto!r}") from erro

    @property
    def zero(self) -> bool:
        return self.valor == 0

    def formatar(self) -> str:
        inteiro = f"{self.valor:,.2f}"
        # 1,234,567.89 -> 1.234.567,89
        inteiro = inteiro.replace(",", "X").replace(".", ",").replace("X", ".")
        return f"R$ {inteiro}"


class CategoriaStatus(str, Enum):
    """Classificação de alto nível do status de uma unidade."""

    DISPONIVEL = "disponivel"
    RESERVADA = "reservada"
    VENDIDA = "vendida"
    QUITADA = "quitada"
    BLOQUEADA = "bloqueada"
    OUTRO = "outro"


# Palavras-chave (sem acento) que classificam o texto livre vindo da API.
_REGRAS_STATUS: tuple[tuple[str, CategoriaStatus], ...] = (
    ("disponivel", CategoriaStatus.DISPONIVEL),
    ("reserv", CategoriaStatus.RESERVADA),
    ("vendid", CategoriaStatus.VENDIDA),
    ("quitad", CategoriaStatus.QUITADA),
    ("bloque", CategoriaStatus.BLOQUEADA),
)


@dataclass(frozen=True, slots=True)
class StatusUnidade:
    """Status de uma unidade.

    A API devolve texto livre ("Vendida", "Reservada aguardando revisão...").
    Preservamos o texto original e derivamos uma categoria estável para a
    regra de negócio decidir o que conta como disponível.
    """

    descricao: str

    @property
    def categoria(self) -> CategoriaStatus:
        alvo = _sem_acento(self.descricao)
        for chave, categoria in _REGRAS_STATUS:
            if chave in alvo:
                return categoria
        return CategoriaStatus.OUTRO

    @property
    def disponivel(self) -> bool:
        return self.categoria is CategoriaStatus.DISPONIVEL


@dataclass(frozen=True, slots=True)
class Credencial:
    """Token de acesso (Bearer) usado nas chamadas ao Bora Vender.

    O domínio não sabe como o token foi obtido nem como validá-lo
    criptograficamente — apenas o transporta. Nunca é persistido.
    """

    token: str

    def __post_init__(self) -> None:
        if not self.token or not self.token.strip():
            raise ValueError("Token de acesso ausente.")

    @property
    def header_autorizacao(self) -> str:
        return f"Bearer {self.token}"
