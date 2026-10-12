"""Implementações Postgres das portas de persistência.

Cada repositório recebe uma AsyncSession e converte entre modelos ORM e
entidades de domínio. O domínio nunca vê SQLAlchemy.
"""
from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...domain.catalogo import ConfigSite, EmpreendimentoCatalogo
from ...domain.conta import CredencialArmazenada, UsuarioAdmin
from ...domain.repositorios_dados import (
    RepositorioCatalogo,
    RepositorioConfig,
    RepositorioCredencialBoraVender,
    RepositorioUsuarios,
)
from .models import (
    ConfigModel,
    CredencialBoraVenderModel,
    EmpreendimentoCatalogoModel,
    UsuarioModel,
)

CHAVE_SITE = "site"
ID_CREDENCIAL = 1


class RepositorioUsuariosDB(RepositorioUsuarios):
    def __init__(self, sessao: AsyncSession) -> None:
        self._s = sessao

    async def por_email(self, email: str) -> UsuarioAdmin | None:
        obj = await self._s.scalar(
            select(UsuarioModel).where(UsuarioModel.email == email.lower().strip())
        )
        return _para_usuario(obj) if obj else None

    async def criar(self, usuario: UsuarioAdmin) -> UsuarioAdmin:
        obj = UsuarioModel(
            email=usuario.email.lower().strip(),
            nome=usuario.nome,
            senha_hash=usuario.senha_hash,
            ativo=usuario.ativo,
        )
        self._s.add(obj)
        await self._s.flush()
        return _para_usuario(obj)

    async def existe_algum(self) -> bool:
        return (await self._s.scalar(select(UsuarioModel.id).limit(1))) is not None


class RepositorioCatalogoDB(RepositorioCatalogo):
    def __init__(self, sessao: AsyncSession) -> None:
        self._s = sessao

    async def listar(self) -> Sequence[EmpreendimentoCatalogo]:
        objs = await self._s.scalars(
            select(EmpreendimentoCatalogoModel).order_by(
                EmpreendimentoCatalogoModel.ordem.is_(None),
                EmpreendimentoCatalogoModel.ordem,
                EmpreendimentoCatalogoModel.slug,
            )
        )
        return [_para_catalogo(o) for o in objs]

    async def por_slug(self, slug: str) -> EmpreendimentoCatalogo | None:
        obj = await self._s.get(EmpreendimentoCatalogoModel, slug)
        return _para_catalogo(obj) if obj else None

    async def salvar(self, item: EmpreendimentoCatalogo) -> EmpreendimentoCatalogo:
        obj = await self._s.get(EmpreendimentoCatalogoModel, item.slug)
        if obj is None:
            obj = EmpreendimentoCatalogoModel(slug=item.slug)
            self._s.add(obj)
        obj.documento = item.documento
        obj.bv_id = item.bv_id
        if item.ordem is not None:
            obj.ordem = item.ordem
        await self._s.flush()
        return _para_catalogo(obj)

    async def excluir(self, slug: str) -> None:
        obj = await self._s.get(EmpreendimentoCatalogoModel, slug)
        if obj is not None:
            await self._s.delete(obj)

    async def reordenar(self, slugs_em_ordem: Sequence[str]) -> None:
        for posicao, slug in enumerate(slugs_em_ordem):
            obj = await self._s.get(EmpreendimentoCatalogoModel, slug)
            if obj is not None:
                obj.ordem = posicao


class RepositorioConfigDB(RepositorioConfig):
    def __init__(self, sessao: AsyncSession) -> None:
        self._s = sessao

    async def obter_site(self) -> ConfigSite:
        obj = await self._s.get(ConfigModel, CHAVE_SITE)
        return ConfigSite(dados=dict(obj.dados) if obj else {})

    async def salvar_site(self, config: ConfigSite) -> ConfigSite:
        obj = await self._s.get(ConfigModel, CHAVE_SITE)
        if obj is None:
            obj = ConfigModel(chave=CHAVE_SITE, dados={})
            self._s.add(obj)
        # merge raso, como o setDoc(..., { merge: true }) do Firestore
        obj.dados = {**obj.dados, **config.dados}
        await self._s.flush()
        return ConfigSite(dados=dict(obj.dados))


class RepositorioCredencialBoraVenderDB(RepositorioCredencialBoraVender):
    def __init__(self, sessao: AsyncSession) -> None:
        self._s = sessao

    async def obter(self) -> CredencialArmazenada | None:
        obj = await self._s.get(CredencialBoraVenderModel, ID_CREDENCIAL)
        if obj is None:
            return None
        return CredencialArmazenada(
            token=obj.token,
            atualizado_em=obj.atualizado_em,
            atualizado_por=obj.atualizado_por,
        )

    async def salvar(self, credencial: CredencialArmazenada) -> CredencialArmazenada:
        obj = await self._s.get(CredencialBoraVenderModel, ID_CREDENCIAL)
        if obj is None:
            obj = CredencialBoraVenderModel(id=ID_CREDENCIAL, token=credencial.token)
            self._s.add(obj)
        obj.token = credencial.token
        obj.atualizado_por = credencial.atualizado_por
        await self._s.flush()
        return CredencialArmazenada(
            token=obj.token,
            atualizado_em=obj.atualizado_em,
            atualizado_por=obj.atualizado_por,
        )


# ----- conversões ORM -> domínio -----

def _para_usuario(o: UsuarioModel) -> UsuarioAdmin:
    return UsuarioAdmin(
        id=o.id,
        email=o.email,
        nome=o.nome,
        senha_hash=o.senha_hash,
        ativo=o.ativo,
        criado_em=o.criado_em,
    )


def _para_catalogo(o: EmpreendimentoCatalogoModel) -> EmpreendimentoCatalogo:
    return EmpreendimentoCatalogo(
        slug=o.slug,
        documento=dict(o.documento or {}),
        ordem=o.ordem,
        bv_id=o.bv_id,
        atualizado_em=o.atualizado_em,
    )
