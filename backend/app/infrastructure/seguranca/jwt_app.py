"""Emissão e validação do JWT da própria aplicação (login do admin).

Não confundir com o token do Bora Vender: este é assinado e verificado por
NÓS, com o segredo da aplicação; aquele é emitido pela Direcional/Cognito.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt

from ...domain.exceptions import TokenInvalido


class ServicoJwtApp:
    def __init__(self, segredo: str, algoritmo: str, expira_minutos: int) -> None:
        self._segredo = segredo
        self._algoritmo = algoritmo
        self._expira_minutos = expira_minutos

    def emitir(self, assunto: str, extras: dict | None = None) -> str:
        agora = datetime.now(timezone.utc)
        payload = {
            "sub": assunto,
            "iat": agora,
            "exp": agora + timedelta(minutes=self._expira_minutos),
            **(extras or {}),
        }
        return jwt.encode(payload, self._segredo, algorithm=self._algoritmo)

    def validar(self, token: str) -> dict:
        try:
            return jwt.decode(token, self._segredo, algorithms=[self._algoritmo])
        except jwt.ExpiredSignatureError as erro:
            raise TokenInvalido("Sessão expirada. Entre novamente.") from erro
        except jwt.PyJWTError as erro:
            raise TokenInvalido("Sessão inválida.") from erro
