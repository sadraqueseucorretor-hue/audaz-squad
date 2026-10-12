"""Autenticação no Bora Vender: troca e-mail+senha por um token de acesso.

Usada pela rotina de renovação automática. A Direcional usa AWS Cognito; a
resposta do login traz vários tokens (idToken/accessToken/refreshToken) dentro
de `authenticationResult`. As chamadas da API usam o **ID token**
(`authenticationResult.idToken`). O login exige o header `client_id`.
"""
from __future__ import annotations

from collections.abc import Iterator
from typing import Any

import httpx
import jwt

from ...domain.exceptions import FalhaNaIntegracao
from ...domain.repositories import AutenticadorBoraVender


def _parece_jwt(valor: object) -> bool:
    if not isinstance(valor, str):
        return False
    partes = valor.strip().split(".")
    return len(partes) == 3 and all(partes)


def _coletar_jwts(no: Any) -> Iterator[str]:
    if isinstance(no, str):
        if _parece_jwt(no):
            yield no.strip()
    elif isinstance(no, dict):
        for valor in no.values():
            yield from _coletar_jwts(valor)
    elif isinstance(no, (list, tuple)):
        for valor in no:
            yield from _coletar_jwts(valor)


def _navegar(dados: Any, caminho: str) -> Any:
    atual = dados
    for parte in caminho.split("."):
        if isinstance(atual, dict) and parte in atual:
            atual = atual[parte]
        else:
            return None
    return atual


def _tem_exp(token: str) -> bool:
    try:
        return "exp" in jwt.decode(token, options={"verify_signature": False})
    except jwt.PyJWTError:
        return False


class AutenticadorBoraVenderHttp(AutenticadorBoraVender):
    def __init__(
        self,
        http: httpx.AsyncClient,
        login_url: str,
        *,
        client_id: str,
        origin: str | None = None,
        campo_token: str | None = None,
    ) -> None:
        self._http = http
        self._login_url = login_url
        self._client_id = client_id
        self._origin = origin
        self._campo = (campo_token or "").strip() or None

    def _headers(self) -> dict[str, str]:
        cabecalhos = {
            "Accept": "application/json, text/plain, */*",
            "Content-Type": "application/json",
            "client_id": self._client_id,
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36"
            ),
        }
        if self._origin:
            cabecalhos["Origin"] = self._origin
            cabecalhos["Referer"] = self._origin.rstrip("/") + "/"
        return cabecalhos

    async def autenticar(self, email: str, senha: str) -> str:
        try:
            resposta = await self._http.post(
                self._login_url,
                json={"email": email, "senha": senha},
                headers=self._headers(),
            )
        except httpx.TimeoutException as erro:
            raise FalhaNaIntegracao(
                "Tempo esgotado ao fazer login no Bora Vender."
            ) from erro
        except httpx.HTTPError as erro:
            raise FalhaNaIntegracao(
                f"Falha de conexão no login do Bora Vender: {erro}"
            ) from erro

        if resposta.status_code in (400, 401, 403):
            raise FalhaNaIntegracao(
                "Login recusado pelo Bora Vender. "
                "Confira BORA_VENDER_EMAIL e BORA_VENDER_SENHA.",
                status=resposta.status_code,
            )
        if resposta.status_code >= 400:
            raise FalhaNaIntegracao(
                f"Bora Vender respondeu {resposta.status_code} no login.",
                status=resposta.status_code,
            )

        token = self._extrair(resposta)
        if not token:
            raise FalhaNaIntegracao(
                "Não foi possível localizar o token na resposta do login."
            )
        return token

    def _extrair(self, resposta: httpx.Response) -> str | None:
        try:
            dados = resposta.json()
        except ValueError:
            dados = None

        # 1. Campo configurado (ex.: "authenticationResult.idToken").
        if self._campo and dados is not None:
            valor = _navegar(dados, self._campo)
            if _parece_jwt(valor):
                return valor.strip()

        # 2. Detecção no corpo: prefere um JWT que tenha exp.
        if dados is not None:
            candidatos = list(_coletar_jwts(dados))
            for token in candidatos:
                if _tem_exp(token):
                    return token
            if candidatos:
                return candidatos[0]

        # 3. Corpo pode ser o token puro (texto).
        texto = (resposta.text or "").strip().strip('"')
        if _parece_jwt(texto):
            return texto

        # 4. Último recurso: header Authorization da resposta.
        auth = resposta.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            auth = auth[7:].strip()
        if _parece_jwt(auth):
            return auth
        return None
