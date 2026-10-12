"""Testes da gestão de administradores (casos de uso + rotas protegidas)."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.application.use_cases.usuarios import (
    CriarUsuario,
    ExcluirUsuario,
    ListarUsuarios,
)
from app.domain.conta import UsuarioAdmin
from app.domain.exceptions import OperacaoNaoPermitida, UsuarioJaExiste
from app.domain.repositorios_dados import RepositorioUsuarios
from app.main import app

ADMIN = {"email": "admin@teste.com", "senha": "senha123"}


# ---- dublê do repositório ----

class RepoUsuariosFake(RepositorioUsuarios):
    def __init__(self, iniciais: list[UsuarioAdmin] | None = None) -> None:
        self._itens: list[UsuarioAdmin] = list(iniciais or [])
        self._seq = 100

    async def por_email(self, email):
        e = email.lower().strip()
        return next((u for u in self._itens if u.email == e), None)

    async def por_id(self, id):
        return next((u for u in self._itens if u.id == id), None)

    async def listar(self):
        return list(self._itens)

    async def criar(self, usuario):
        self._seq += 1
        novo = UsuarioAdmin(
            id=self._seq, email=usuario.email, nome=usuario.nome,
            senha_hash=usuario.senha_hash,
        )
        self._itens.append(novo)
        return novo

    async def excluir(self, id):
        self._itens = [u for u in self._itens if u.id != id]

    async def existe_algum(self):
        return bool(self._itens)

    async def contar(self):
        return len(self._itens)


def _admin(id, email):
    return UsuarioAdmin(id=id, email=email, nome=None, senha_hash="x")


# ---- casos de uso (unitários) ----

async def test_criar_hasheia_e_normaliza_email():
    repo = RepoUsuariosFake()
    caso = CriarUsuario(repo, lambda s: "hash:" + s)
    novo = await caso.executar("  JOAO@Audaz.com ", "segredo123", nome="João")
    assert novo.email == "joao@audaz.com"
    assert novo.senha_hash == "hash:segredo123"
    assert novo.nome == "João"


async def test_criar_recusa_email_duplicado():
    repo = RepoUsuariosFake([_admin(1, "ana@x.com")])
    caso = CriarUsuario(repo, lambda s: s)
    with pytest.raises(UsuarioJaExiste):
        await caso.executar("ana@x.com", "segredo123")


async def test_criar_recusa_senha_curta():
    caso = CriarUsuario(RepoUsuariosFake(), lambda s: s)
    with pytest.raises(OperacaoNaoPermitida):
        await caso.executar("novo@x.com", "123")


async def test_excluir_bloqueia_ultimo_admin():
    repo = RepoUsuariosFake([_admin(1, "unico@x.com")])
    with pytest.raises(OperacaoNaoPermitida):
        await ExcluirUsuario(repo).executar(1)
    assert await repo.contar() == 1


async def test_excluir_quando_ha_mais_de_um():
    repo = RepoUsuariosFake([_admin(1, "a@x.com"), _admin(2, "b@x.com")])
    await ExcluirUsuario(repo).executar(2)
    assert await repo.contar() == 1
    assert await ListarUsuarios(repo).executar() == [_admin(1, "a@x.com")]


# ---- rotas (integração) ----

def _logar(c: TestClient, cred=ADMIN) -> dict:
    r = c.post("/api/v1/auth/login", json=cred)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_usuarios_exige_login():
    with TestClient(app) as c:
        assert c.get("/api/v1/usuarios").status_code == 401
        assert c.post("/api/v1/usuarios", json={"email": "x@x.com", "senha": "segredo1"}).status_code == 401


def test_criar_listar_e_logar_novo_admin():
    novo = {"email": "corretor-novo@teste.com", "senha": "segredo123", "nome": "Corretor Novo"}
    with TestClient(app) as c:
        h = _logar(c)
        r = c.post("/api/v1/usuarios", json=novo, headers=h)
        assert r.status_code == 201, r.text
        novo_id = r.json()["id"]
        assert r.json()["email"] == novo["email"]

        emails = [u["email"] for u in c.get("/api/v1/usuarios", headers=h).json()]
        assert novo["email"] in emails

        # o novo admin consegue logar
        h2 = _logar(c, {"email": novo["email"], "senha": novo["senha"]})
        assert c.get("/api/v1/auth/me", headers=h2).json()["email"] == novo["email"]

        # duplicado -> 409
        assert c.post("/api/v1/usuarios", json=novo, headers=h).status_code == 409

        # limpa pra não vazar pra outros testes
        assert c.delete(f"/api/v1/usuarios/{novo_id}", headers=h).status_code == 204
