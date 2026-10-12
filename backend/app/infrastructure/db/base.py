"""Base declarativa e engine/sessão async do SQLAlchemy."""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


def criar_engine(database_url: str) -> AsyncEngine:
    return create_async_engine(database_url, future=True, pool_pre_ping=True)


def criar_sessionmaker(engine: AsyncEngine) -> async_sessionmaker:
    return async_sessionmaker(engine, expire_on_commit=False)


async def criar_tabelas(engine: AsyncEngine) -> None:
    """Cria as tabelas que ainda não existem (bom para subir rápido no Docker).

    Para evolução de schema em produção, use migrações (Alembic).
    """
    # Importa os modelos para que fiquem registrados no metadata.
    from . import models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
