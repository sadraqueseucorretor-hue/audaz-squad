"""Fábrica da aplicação FastAPI: ciclo de vida, rotas e tradução de erros.

A camada de interface é a única que conhece HTTP. Aqui abrimos/fechamos os
recursos (httpx, engine do banco), criamos as tabelas, semeamos o admin
inicial, servimos os estáticos do frontend (enquanto o nginx não entra) e
mapeamos exceções de domínio para códigos HTTP.
"""
from __future__ import annotations

import asyncio
import os
from contextlib import asynccontextmanager, suppress

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .domain.exceptions import (
    CredencialAusente,
    CredencialBoraVenderAusente,
    CredencialInvalida,
    EmpreendimentoNaoEncontrado,
    ErroDeDominio,
    FalhaNaIntegracao,
    NaoAutorizado,
    TokenExpirado,
    TokenInvalido,
)
from .infrastructure.cache import CacheTTL
from .infrastructure.renovacao import loop_de_renovacao
from .infrastructure.config import obter_configuracoes
from .infrastructure.db.base import criar_engine, criar_sessionmaker, criar_tabelas
from .infrastructure.db.repositorios import RepositorioUsuariosDB
from .infrastructure.seguranca.senha import gerar_hash
from .domain.conta import UsuarioAdmin
from .interface.api.routers import auth, catalogo, empreendimentos, health, integracao


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    config = obter_configuracoes()

    engine = criar_engine(config.database_url)
    app.state.engine = engine
    app.state.sessionmaker = criar_sessionmaker(engine)
    await criar_tabelas(engine)
    await _semear_admin(app, config)

    # Cache da disponibilidade (TTL), compartilhado por toda a aplicação.
    app.state.cache_disponibilidade = CacheTTL(config.cache_disponibilidade_segundos)

    async with httpx.AsyncClient(timeout=config.http_timeout_segundos) as http:
        app.state.http = http

        # Rotina que renova o token do Bora Vender antes de expirar (opt-in:
        # só liga se houver credenciais configuradas no .env).
        tarefa_renovacao: asyncio.Task | None = None
        if (
            config.renovacao_automatica
            and config.bora_vender_email
            and config.bora_vender_senha
        ):
            tarefa_renovacao = asyncio.create_task(loop_de_renovacao(app, config))

        try:
            yield
        finally:
            if tarefa_renovacao is not None:
                tarefa_renovacao.cancel()
                with suppress(asyncio.CancelledError):
                    await tarefa_renovacao

    await engine.dispose()


async def _semear_admin(app: FastAPI, config) -> None:
    """Cria o admin inicial a partir de ADMIN_EMAIL/ADMIN_SENHA, se não houver nenhum."""
    if not (config.admin_email and config.admin_senha):
        return
    async with app.state.sessionmaker() as sessao:
        repo = RepositorioUsuariosDB(sessao)
        if await repo.existe_algum():
            return
        await repo.criar(
            UsuarioAdmin(
                id=None,
                email=config.admin_email,
                nome="Administrador",
                senha_hash=gerar_hash(config.admin_senha),
            )
        )
        await sessao.commit()


def criar_app() -> FastAPI:
    config = obter_configuracoes()
    app = FastAPI(
        title=config.titulo_api,
        version=config.versao_api,
        summary="Backend da AudazSquad: catálogo (Postgres) + integração Bora Vender.",
        lifespan=ciclo_de_vida,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    for roteador in (auth.router, integracao.router, empreendimentos.router, catalogo.router):
        app.include_router(roteador, prefix=config.prefixo_api)

    _registrar_tratadores_de_erro(app)
    _montar_estaticos(app, config)
    return app


def _montar_estaticos(app: FastAPI, config) -> None:
    diretorio = config.diretorio_estaticos
    if diretorio and os.path.isdir(diretorio):
        # Catch-all no fim: as rotas de API já foram registradas antes.
        app.mount("/", StaticFiles(directory=diretorio, html=True), name="frontend")


def _registrar_tratadores_de_erro(app: FastAPI) -> None:
    def resposta(status: int, detalhe: str) -> JSONResponse:
        return JSONResponse(status_code=status, content={"detalhe": detalhe})

    @app.exception_handler(CredencialInvalida)
    async def _(_: Request, erro: CredencialInvalida) -> JSONResponse:
        return resposta(401, str(erro))

    @app.exception_handler(NaoAutorizado)
    async def _(_: Request, erro: NaoAutorizado) -> JSONResponse:
        return resposta(401, str(erro))

    @app.exception_handler(CredencialAusente)
    async def _(_: Request, erro: CredencialAusente) -> JSONResponse:
        return resposta(401, str(erro))

    @app.exception_handler(TokenExpirado)
    async def _(_: Request, erro: TokenExpirado) -> JSONResponse:
        return resposta(401, str(erro))

    @app.exception_handler(TokenInvalido)
    async def _(_: Request, erro: TokenInvalido) -> JSONResponse:
        return resposta(401, str(erro))

    @app.exception_handler(CredencialBoraVenderAusente)
    async def _(_: Request, erro: CredencialBoraVenderAusente) -> JSONResponse:
        return resposta(409, str(erro))

    @app.exception_handler(EmpreendimentoNaoEncontrado)
    async def _(_: Request, erro: EmpreendimentoNaoEncontrado) -> JSONResponse:
        return resposta(404, str(erro))

    @app.exception_handler(FalhaNaIntegracao)
    async def _(_: Request, erro: FalhaNaIntegracao) -> JSONResponse:
        return resposta(502, str(erro))

    @app.exception_handler(ErroDeDominio)
    async def _(_: Request, erro: ErroDeDominio) -> JSONResponse:
        return resposta(400, str(erro))


app = criar_app()
