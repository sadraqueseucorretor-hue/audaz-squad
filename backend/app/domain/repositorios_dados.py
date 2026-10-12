"""Portas de persistência (catálogo, config, usuários, credencial do BV).

Como as demais portas, são definidas pelo domínio e implementadas pela
infraestrutura (aqui, Postgres via SQLAlchemy).
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Sequence

from .catalogo import ConfigSite, EmpreendimentoCatalogo
from .conta import CredencialArmazenada, UsuarioAdmin


class RepositorioUsuarios(ABC):
    @abstractmethod
    async def por_email(self, email: str) -> UsuarioAdmin | None: ...

    @abstractmethod
    async def criar(self, usuario: UsuarioAdmin) -> UsuarioAdmin: ...

    @abstractmethod
    async def existe_algum(self) -> bool: ...


class RepositorioCatalogo(ABC):
    @abstractmethod
    async def listar(self) -> Sequence[EmpreendimentoCatalogo]: ...

    @abstractmethod
    async def por_slug(self, slug: str) -> EmpreendimentoCatalogo | None: ...

    @abstractmethod
    async def salvar(self, item: EmpreendimentoCatalogo) -> EmpreendimentoCatalogo: ...

    @abstractmethod
    async def excluir(self, slug: str) -> None: ...

    @abstractmethod
    async def reordenar(self, slugs_em_ordem: Sequence[str]) -> None: ...


class RepositorioConfig(ABC):
    @abstractmethod
    async def obter_site(self) -> ConfigSite: ...

    @abstractmethod
    async def salvar_site(self, config: ConfigSite) -> ConfigSite: ...


class RepositorioCredencialBoraVender(ABC):
    @abstractmethod
    async def obter(self) -> CredencialArmazenada | None: ...

    @abstractmethod
    async def salvar(self, credencial: CredencialArmazenada) -> CredencialArmazenada: ...
