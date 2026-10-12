"""Entidades do catálogo administrado (o que antes vivia no Firestore).

O catálogo é o conteúdo curado pelo admin para os corretores: cada
empreendimento é um documento flexível (fotos, materiais, infos técnicas),
identificado por `slug`. Mantemos o documento como um dicionário para
preservar exatamente o formato que o frontend já consome, e promovemos
alguns campos para colunas (ordenação, vínculo com o Bora Vender).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(frozen=True, slots=True)
class EmpreendimentoCatalogo:
    slug: str
    documento: dict[str, Any] = field(default_factory=dict)
    ordem: int | None = None
    bv_id: str | None = None  # idEmpreendimentoSales: liga à disponibilidade do Bora Vender
    atualizado_em: datetime | None = None

    def __post_init__(self) -> None:
        if not self.slug:
            raise ValueError("Empreendimento do catálogo sem slug.")

    def como_documento(self) -> dict[str, Any]:
        """Formato entregue ao frontend: o documento + campos de controle."""
        saida = dict(self.documento)
        saida["slug"] = self.slug
        if self.ordem is not None:
            saida["ordem"] = self.ordem
        if self.bv_id:
            saida.setdefault("bvId", self.bv_id)
        if self.atualizado_em:
            saida.setdefault("atualizadoEm", self.atualizado_em.isoformat())
        return saida


@dataclass(frozen=True, slots=True)
class ConfigSite:
    """Configurações gerais do site (doc `config/site` no Firestore)."""

    dados: dict[str, Any] = field(default_factory=dict)
