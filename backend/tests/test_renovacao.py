"""Testes da renovação automática do token do Bora Vender.

Cobrem: (1) o autenticador HTTP extrai o idToken correto e envia o client_id;
(2) o caso de uso decide renovar só quando falta token, está expirado ou perto.
Nada aqui toca a rede real — usa-se httpx.MockTransport e dublês.
"""
from __future__ import annotations

import time

import httpx
import jwt
import pytest

from app.application.use_cases.renovar_credencial import (
    RENOVADO_POR,
    RenovarCredencialBoraVender,
)
from app.domain.conta import CredencialArmazenada
from app.domain.repositories import AutenticadorBoraVender
from app.domain.repositorios_dados import RepositorioCredencialBoraVender
from app.infrastructure.bora_vender.autenticador import AutenticadorBoraVenderHttp
from app.infrastructure.seguranca.inspetor_jwt import InspetorJwt


def _jwt(*, exp_delta: int, token_use: str = "id") -> str:
    claims = {
        "exp": int(time.time()) + exp_delta,
        "iat": int(time.time()),
        "token_use": token_use,
        "email": "corretor@exemplo.com",
    }
    return jwt.encode(claims, "segredo", algorithm="HS256")


# ---- dublês ----

class RepoFake(RepositorioCredencialBoraVender):
    def __init__(self, token: str | None = None) -> None:
        self._cred = CredencialArmazenada(token=token) if token else None
        self.salvos: list[CredencialArmazenada] = []

    async def obter(self) -> CredencialArmazenada | None:
        return self._cred

    async def salvar(self, credencial: CredencialArmazenada) -> CredencialArmazenada:
        self._cred = credencial
        self.salvos.append(credencial)
        return credencial


class AutFake(AutenticadorBoraVender):
    def __init__(self, token: str) -> None:
        self._token = token
        self.chamadas = 0

    async def autenticar(self, email: str, senha: str) -> str:
        self.chamadas += 1
        return self._token


def _caso(repo, aut, *, email="e@x.com", senha="s", margem=300):
    return RenovarCredencialBoraVender(
        repo, InspetorJwt(), aut, email=email, senha=senha, margem_segundos=margem
    )


# ---- autenticador HTTP (extração + headers) ----

async def test_autenticar_extrai_idtoken_e_envia_client_id():
    id_token = _jwt(exp_delta=86400)
    access_token = _jwt(exp_delta=86400)  # igual ao real: token_use=id também
    visto = {}

    def handler(request: httpx.Request) -> httpx.Response:
        visto["client_id"] = request.headers.get("client_id")
        visto["origin"] = request.headers.get("Origin")
        return httpx.Response(
            200,
            json={
                "authenticationResult": {
                    "accessToken": access_token,
                    "idToken": id_token,
                    "refreshToken": "aaa.bbb.ccc",
                    "expiresIn": 86400,
                    "tokenType": "Bearer",
                },
                "nomeCorretor": "Fulano",
            },
        )

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http:
        aut = AutenticadorBoraVenderHttp(
            http,
            "https://be.direcional.com.br/bora-vender/v1/autenticacao/login",
            client_id="cid-123",
            origin="https://boravender.app.br",
            campo_token="authenticationResult.idToken",
        )
        token = await aut.autenticar("e@x.com", "senha")

    assert token == id_token  # pega o idToken, não o accessToken
    assert visto["client_id"] == "cid-123"
    assert visto["origin"] == "https://boravender.app.br"


async def test_autenticar_login_recusado_vira_falha():
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"mensagem": "credenciais inválidas"})

    from app.domain.exceptions import FalhaNaIntegracao

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http:
        aut = AutenticadorBoraVenderHttp(http, "https://x/login", client_id="c")
        with pytest.raises(FalhaNaIntegracao):
            await aut.autenticar("e", "s")


# ---- decisão de renovação ----

async def test_renova_quando_nao_ha_token():
    repo = RepoFake(token=None)
    aut = AutFake(_jwt(exp_delta=86400))
    assert await _caso(repo, aut).executar() is True
    assert aut.chamadas == 1
    assert repo.salvos and repo.salvos[-1].atualizado_por == RENOVADO_POR


async def test_renova_quando_perto_de_expirar():
    repo = RepoFake(token=_jwt(exp_delta=100))  # falta 100s, margem 300
    aut = AutFake(_jwt(exp_delta=86400))
    assert await _caso(repo, aut, margem=300).executar() is True
    assert aut.chamadas == 1


async def test_nao_renova_token_valido():
    repo = RepoFake(token=_jwt(exp_delta=5000))  # bem longe de expirar
    aut = AutFake(_jwt(exp_delta=86400))
    assert await _caso(repo, aut, margem=300).executar() is False
    assert aut.chamadas == 0
    assert repo.salvos == []


async def test_nao_renova_sem_credenciais():
    repo = RepoFake(token=None)
    aut = AutFake(_jwt(exp_delta=86400))
    assert await _caso(repo, aut, email=None, senha=None).executar() is False
    assert aut.chamadas == 0
