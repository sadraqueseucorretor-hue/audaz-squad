"""Testes de auth + catálogo + token do Bora Vender contra o banco (SQLite).

Usa o TestClient como context manager para disparar o ciclo de vida (criar
tabelas e semear o admin a partir das variáveis definidas no conftest).
"""
from __future__ import annotations

import time

import jwt
from fastapi.testclient import TestClient

from app.main import app

ADMIN = {"email": "admin@teste.com", "senha": "senha123"}


def _logar(c: TestClient) -> dict:
    r = c.post("/api/v1/auth/login", json=ADMIN)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_login_e_me():
    with TestClient(app) as c:
        assert c.post("/api/v1/auth/login", json={"email": ADMIN["email"], "senha": "errada"}).status_code == 401
        h = _logar(c)
        me = c.get("/api/v1/auth/me", headers=h)
        assert me.status_code == 200
        assert me.json()["email"] == ADMIN["email"]


def test_catalogo_leitura_publica_escrita_protegida():
    with TestClient(app) as c:
        # escrever sem login -> 401
        assert c.put("/api/v1/catalogo/empreendimentos/vista-do-parque", json={"nome": "X"}).status_code == 401

        h = _logar(c)
        doc = {"nome": "Vista do Parque", "cidade": "Fortaleza", "status": "lancamento",
               "bvId": "a0E123", "materiais": {"book": [{"titulo": "Book", "url": "https://x/y.pdf"}]}}
        r = c.put("/api/v1/catalogo/empreendimentos/vista-do-parque", json=doc, headers=h)
        assert r.status_code == 200
        assert r.json()["slug"] == "vista-do-parque"

        # leitura pública (sem token)
        lista = c.get("/api/v1/catalogo/empreendimentos").json()
        assert any(e["slug"] == "vista-do-parque" for e in lista)
        item = c.get("/api/v1/catalogo/empreendimentos/vista-do-parque").json()
        assert item["nome"] == "Vista do Parque"
        assert item["bvId"] == "a0E123"


def test_config_site():
    with TestClient(app) as c:
        h = _logar(c)
        c.put("/api/v1/catalogo/config/site", json={"marca": "AUDAZ SQUAD", "titulo": "Central"}, headers=h)
        site = c.get("/api/v1/catalogo/config/site").json()
        assert site["marca"] == "AUDAZ SQUAD"


def test_token_bora_vender_salvar_e_status():
    with TestClient(app) as c:
        h = _logar(c)
        # status sem token cadastrado -> 409
        assert c.get("/api/v1/integracao/bora-vender/token/status", headers=h).status_code == 409

        exp = int(time.time()) + 3600
        token_bv = jwt.encode(
            {"sub": "s", "cognito:username": "corretor#1", "custom:Atividade": "Coordenador", "exp": exp},
            "qualquer", algorithm="HS256",
        )
        r = c.put("/api/v1/integracao/bora-vender/token", json={"token": token_bv}, headers=h)
        assert r.status_code == 200
        assert r.json()["usuario"] == "corretor#1"
        assert r.json()["expirado"] is False

        status = c.get("/api/v1/integracao/bora-vender/token/status", headers=h).json()
        assert status["atividade"] == "Coordenador"
        assert status["segundos_restantes"] > 0
        assert status["atualizado_por"] == ADMIN["email"]


def test_token_status_exige_login():
    with TestClient(app) as c:
        assert c.get("/api/v1/integracao/bora-vender/token/status").status_code == 401
