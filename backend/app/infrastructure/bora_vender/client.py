"""Adaptador HTTP para a API Bora Vender.

Encapsula o httpx: sabe a base URL, injeta o Bearer, aplica timeout e traduz
falhas de transporte/HTTP em exceções de domínio. É a única classe que conhece
o httpx — o resto do sistema fala com entidades e portas.
"""
from __future__ import annotations

from typing import Any

import httpx

from ...domain.exceptions import FalhaNaIntegracao, TokenInvalido
from ...domain.value_objects import Credencial


class ClienteBoraVender:
    def __init__(self, http: httpx.AsyncClient, base_url: str) -> None:
        self._http = http
        self._base_url = base_url.rstrip("/")

    async def get_json(
        self, caminho: str, credencial: Credencial, params: dict[str, Any] | None = None
    ) -> Any:
        url = f"{self._base_url}/{caminho.lstrip('/')}"
        cabecalhos = {
            "Authorization": credencial.header_autorizacao,
            "Accept": "application/json",
        }
        try:
            resposta = await self._http.get(url, params=params, headers=cabecalhos)
        except httpx.TimeoutException as erro:
            raise FalhaNaIntegracao("Tempo esgotado ao falar com o Bora Vender.") from erro
        except httpx.HTTPError as erro:
            raise FalhaNaIntegracao(f"Falha de conexão com o Bora Vender: {erro}") from erro

        if resposta.status_code in (401, 403):
            raise TokenInvalido(
                "O Bora Vender recusou o token. Ele pode ter expirado — gere um novo."
            )
        if resposta.status_code >= 400:
            raise FalhaNaIntegracao(
                f"Bora Vender respondeu {resposta.status_code}.",
                status=resposta.status_code,
            )

        try:
            return resposta.json()
        except ValueError as erro:
            raise FalhaNaIntegracao("Resposta do Bora Vender não é JSON válido.") from erro
