"""Modelos ORM (SQLAlchemy). Isolados do domínio: os repositórios convertem
entre estes modelos e as entidades puras."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from .base import Base


def _agora() -> datetime:
    return datetime.now(timezone.utc)


class UsuarioModel(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    nome: Mapped[str | None] = mapped_column(String(255), nullable=True)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_agora)


class EmpreendimentoCatalogoModel(Base):
    __tablename__ = "catalogo_empreendimentos"

    slug: Mapped[str] = mapped_column(String(160), primary_key=True)
    ordem: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    bv_id: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    documento: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_agora, onupdate=_agora
    )


class ConfigModel(Base):
    __tablename__ = "config"

    chave: Mapped[str] = mapped_column(String(80), primary_key=True)
    dados: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_agora, onupdate=_agora
    )


class CredencialBoraVenderModel(Base):
    __tablename__ = "credencial_bora_vender"

    # Linha única (singleton). Usamos id fixo = 1.
    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    token: Mapped[str] = mapped_column(Text, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_agora, onupdate=_agora
    )
    atualizado_por: Mapped[str | None] = mapped_column(String(255), nullable=True)
