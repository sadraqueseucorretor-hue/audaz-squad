"""Inspetor de token baseado em JWT (pyjwt).

Decodifica sem verificar a assinatura — exatamente como o script original
(`decode(token, options={"verify_signature": False})`) — para ler de quem é
o token e quando expira. Isso NÃO autentica o token; a validação real é feita
pelo próprio Bora Vender quando a chamada é feita com ele.
"""
from __future__ import annotations

from datetime import datetime, timezone

import jwt

from ...domain.exceptions import TokenInvalido
from ...domain.repositories import InspetorDeToken
from ...domain.token import InformacoesToken


def _instante(epoch: object) -> datetime | None:
    if epoch is None:
        return None
    try:
        return datetime.fromtimestamp(int(epoch), tz=timezone.utc)
    except (TypeError, ValueError, OSError):
        return None


class InspetorJwt(InspetorDeToken):
    def inspecionar(self, token: str) -> InformacoesToken:
        bruto = (token or "").strip()
        if bruto.lower().startswith("bearer "):
            bruto = bruto[7:].strip()
        if not bruto:
            raise TokenInvalido("Token ausente.")
        try:
            claims = jwt.decode(bruto, options={"verify_signature": False})
        except jwt.PyJWTError as erro:
            raise TokenInvalido(f"Não foi possível ler o token: {erro}") from erro

        return InformacoesToken(
            assunto=claims.get("sub"),
            usuario=claims.get("cognito:username") or claims.get("name"),
            email=claims.get("email"),
            atividade=claims.get("custom:Atividade"),
            emitido_em=_instante(claims.get("iat")),
            expira_em=_instante(claims.get("exp")),
        )
