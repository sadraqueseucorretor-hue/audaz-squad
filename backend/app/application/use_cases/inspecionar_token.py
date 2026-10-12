"""Caso de uso: inspecionar um token de acesso (fluxo de teste de autenticação)."""
from __future__ import annotations

from ...domain.repositories import InspetorDeToken
from ...domain.token import InformacoesToken


class InspecionarToken:
    def __init__(self, inspetor: InspetorDeToken) -> None:
        self._inspetor = inspetor

    def executar(self, token: str) -> InformacoesToken:
        return self._inspetor.inspecionar(token)
