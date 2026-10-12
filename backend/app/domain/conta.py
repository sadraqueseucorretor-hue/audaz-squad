"""Entidades ligadas a contas/credenciais administrativas."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True, slots=True)
class UsuarioAdmin:
    """Usuário que administra o catálogo. Autenticado pela própria API."""

    id: int | None
    email: str
    nome: str | None
    senha_hash: str
    ativo: bool = True
    criado_em: datetime | None = None


@dataclass(frozen=True, slots=True)
class CredencialArmazenada:
    """Token do Bora Vender guardado no servidor, com metadados de auditoria."""

    token: str
    atualizado_em: datetime | None = None
    atualizado_por: str | None = None
