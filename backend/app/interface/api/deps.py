"""Composição e injeção de dependências da API (composition root).

Monta as implementações concretas (Postgres, httpx, JWT) e as entrega aos
casos de uso. Os routers dependem só destes provedores.
"""
from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Annotated

import httpx
from fastapi import Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from ...application.use_cases.autenticacao import AutenticarUsuario
from ...application.use_cases.catalogo import (
    ExcluirDoCatalogo,
    ListarCatalogo,
    ObterConfigSite,
    ObterDoCatalogo,
    ReordenarCatalogo,
    SalvarConfigSite,
    SalvarNoCatalogo,
)
from ...application.use_cases.credencial_bora_vender import (
    ObterStatusCredencialBoraVender,
    SalvarCredencialBoraVender,
)
from ...application.use_cases.inspecionar_token import InspecionarToken
from ...application.use_cases.listar_empreendimentos import ListarEmpreendimentos
from ...application.use_cases.obter_disponibilidade import ObterDisponibilidade
from ...domain.conta import UsuarioAdmin
from ...domain.exceptions import (
    CredencialBoraVenderAusente,
    NaoAutorizado,
)
from ...domain.value_objects import Credencial
from ...infrastructure.bora_vender.client import ClienteBoraVender
from ...infrastructure.bora_vender.repositorios import (
    RepositorioDisponibilidadeBoraVender,
    RepositorioDisponibilidadeComCache,
    RepositorioEmpreendimentosBoraVender,
)
from ...infrastructure.config import Configuracoes, obter_configuracoes
from ...infrastructure.db.repositorios import (
    RepositorioCatalogoDB,
    RepositorioConfigDB,
    RepositorioCredencialBoraVenderDB,
    RepositorioUsuariosDB,
)
from ...infrastructure.seguranca.inspetor_jwt import InspetorJwt
from ...infrastructure.seguranca.jwt_app import ServicoJwtApp
from ...infrastructure.seguranca.senha import conferir


def get_configuracoes() -> Configuracoes:
    return obter_configuracoes()


ConfigDep = Annotated[Configuracoes, Depends(get_configuracoes)]


# ----- banco de dados -----

async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    maker = request.app.state.sessionmaker
    async with maker() as sessao:
        try:
            yield sessao
            await sessao.commit()
        except Exception:
            await sessao.rollback()
            raise


SessionDep = Annotated[AsyncSession, Depends(get_session)]


# ----- http / Bora Vender -----

def get_http_client(request: Request) -> httpx.AsyncClient:
    return request.app.state.http


def get_cliente_bora_vender(
    http: Annotated[httpx.AsyncClient, Depends(get_http_client)], config: ConfigDep
) -> ClienteBoraVender:
    return ClienteBoraVender(http, base_url=config.bora_vender_base_url)


ClienteDep = Annotated[ClienteBoraVender, Depends(get_cliente_bora_vender)]


async def get_credencial(sessao: SessionDep) -> Credencial:
    """Token do Bora Vender guardado no servidor. Usado nas chamadas ao vivo."""
    armazenada = await RepositorioCredencialBoraVenderDB(sessao).obter()
    if armazenada is None:
        raise CredencialBoraVenderAusente(
            "Nenhum token do Bora Vender cadastrado. Suba um token na área admin."
        )
    return Credencial(token=armazenada.token)


CredencialDep = Annotated[Credencial, Depends(get_credencial)]


# ----- segurança da app -----

def get_jwt_service(config: ConfigDep) -> ServicoJwtApp:
    return ServicoJwtApp(config.jwt_secret, config.jwt_algoritmo, config.jwt_expira_minutos)


JwtDep = Annotated[ServicoJwtApp, Depends(get_jwt_service)]


def get_inspetor() -> InspetorJwt:
    return InspetorJwt()


async def get_usuario_atual(
    sessao: SessionDep,
    jwt_service: JwtDep,
    authorization: Annotated[str | None, Header()] = None,
) -> UsuarioAdmin:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise NaoAutorizado("Faça login para acessar a área administrativa.")
    claims = jwt_service.validar(authorization[7:].strip())
    email = claims.get("sub")
    usuario = await RepositorioUsuariosDB(sessao).por_email(email or "")
    if usuario is None or not usuario.ativo:
        raise NaoAutorizado("Sessão inválida.")
    return usuario


UsuarioAtualDep = Annotated[UsuarioAdmin, Depends(get_usuario_atual)]


# ----- casos de uso: autenticação -----

def get_autenticar(sessao: SessionDep) -> AutenticarUsuario:
    return AutenticarUsuario(RepositorioUsuariosDB(sessao), conferir)


# ----- casos de uso: credencial Bora Vender -----

def get_salvar_credencial(sessao: SessionDep) -> SalvarCredencialBoraVender:
    return SalvarCredencialBoraVender(RepositorioCredencialBoraVenderDB(sessao), InspetorJwt())


def get_status_credencial(sessao: SessionDep) -> ObterStatusCredencialBoraVender:
    return ObterStatusCredencialBoraVender(
        RepositorioCredencialBoraVenderDB(sessao), InspetorJwt()
    )


# ----- casos de uso: Bora Vender ao vivo -----

def get_listar_empreendimentos(cliente: ClienteDep, config: ConfigDep) -> ListarEmpreendimentos:
    repo = RepositorioEmpreendimentosBoraVender(
        cliente, unidade_de_negocio=config.unidade_de_negocio, regional=config.regional
    )
    return ListarEmpreendimentos(repo)


def get_obter_disponibilidade(cliente: ClienteDep, request: Request) -> ObterDisponibilidade:
    # Repositório real + camada de cache (TTL) compartilhada, criada no lifespan.
    repo = RepositorioDisponibilidadeBoraVender(cliente)
    cache = request.app.state.cache_disponibilidade
    return ObterDisponibilidade(RepositorioDisponibilidadeComCache(repo, cache))


def get_inspecionar_token() -> InspecionarToken:
    return InspecionarToken(InspetorJwt())


# ----- casos de uso: catálogo -----

def get_listar_catalogo(sessao: SessionDep) -> ListarCatalogo:
    return ListarCatalogo(RepositorioCatalogoDB(sessao))


def get_obter_catalogo(sessao: SessionDep) -> ObterDoCatalogo:
    return ObterDoCatalogo(RepositorioCatalogoDB(sessao))


def get_salvar_catalogo(sessao: SessionDep) -> SalvarNoCatalogo:
    return SalvarNoCatalogo(RepositorioCatalogoDB(sessao))


def get_excluir_catalogo(sessao: SessionDep) -> ExcluirDoCatalogo:
    return ExcluirDoCatalogo(RepositorioCatalogoDB(sessao))


def get_reordenar_catalogo(sessao: SessionDep) -> ReordenarCatalogo:
    return ReordenarCatalogo(RepositorioCatalogoDB(sessao))


def get_obter_config(sessao: SessionDep) -> ObterConfigSite:
    return ObterConfigSite(RepositorioConfigDB(sessao))


def get_salvar_config(sessao: SessionDep) -> SalvarConfigSite:
    return SalvarConfigSite(RepositorioConfigDB(sessao))


# Aliases Annotated para os routers.
AutenticarDep = Annotated[AutenticarUsuario, Depends(get_autenticar)]
SalvarCredencialDep = Annotated[SalvarCredencialBoraVender, Depends(get_salvar_credencial)]
StatusCredencialDep = Annotated[ObterStatusCredencialBoraVender, Depends(get_status_credencial)]
ListarEmpreendimentosDep = Annotated[ListarEmpreendimentos, Depends(get_listar_empreendimentos)]
ObterDisponibilidadeDep = Annotated[ObterDisponibilidade, Depends(get_obter_disponibilidade)]
InspecionarTokenDep = Annotated[InspecionarToken, Depends(get_inspecionar_token)]
ListarCatalogoDep = Annotated[ListarCatalogo, Depends(get_listar_catalogo)]
ObterCatalogoDep = Annotated[ObterDoCatalogo, Depends(get_obter_catalogo)]
SalvarCatalogoDep = Annotated[SalvarNoCatalogo, Depends(get_salvar_catalogo)]
ExcluirCatalogoDep = Annotated[ExcluirDoCatalogo, Depends(get_excluir_catalogo)]
ReordenarCatalogoDep = Annotated[ReordenarCatalogo, Depends(get_reordenar_catalogo)]
ObterConfigDep = Annotated[ObterConfigSite, Depends(get_obter_config)]
SalvarConfigDep = Annotated[SalvarConfigSite, Depends(get_salvar_config)]
