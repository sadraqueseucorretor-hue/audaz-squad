"""Modelo de leitura das informações contidas num token de acesso."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True, slots=True)
class InformacoesToken:
    """Dados extraídos de um token, sem verificação de assinatura.

    Serve ao fluxo de teste de autenticação: saber de quem é o token e se
    ainda está válido, exatamente como o script `boravender.py` fazia ao
    decodificar o JWT para inspecionar `exp`.
    """

    assunto: str | None
    usuario: str | None
    email: str | None
    atividade: str | None
    emitido_em: datetime | None
    expira_em: datetime | None

    @property
    def expirado(self) -> bool:
        if self.expira_em is None:
            return False
        return datetime.now(timezone.utc) >= self.expira_em

    @property
    def segundos_restantes(self) -> int | None:
        if self.expira_em is None:
            return None
        delta = self.expira_em - datetime.now(timezone.utc)
        return int(delta.total_seconds())
