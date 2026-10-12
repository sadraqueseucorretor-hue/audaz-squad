"""Casos de uso do catálogo administrado (ex-Firestore)."""
from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from ...domain.catalogo import ConfigSite, EmpreendimentoCatalogo
from ...domain.exceptions import EmpreendimentoNaoEncontrado
from ...domain.repositorios_dados import RepositorioCatalogo, RepositorioConfig


class ListarCatalogo:
    def __init__(self, repositorio: RepositorioCatalogo) -> None:
        self._r = repositorio

    async def executar(self) -> Sequence[EmpreendimentoCatalogo]:
        return await self._r.listar()


class ObterDoCatalogo:
    def __init__(self, repositorio: RepositorioCatalogo) -> None:
        self._r = repositorio

    async def executar(self, slug: str) -> EmpreendimentoCatalogo:
        item = await self._r.por_slug(slug)
        if item is None:
            raise EmpreendimentoNaoEncontrado(slug)
        return item


class SalvarNoCatalogo:
    def __init__(self, repositorio: RepositorioCatalogo) -> None:
        self._r = repositorio

    async def executar(
        self, slug: str, documento: dict[str, Any]
    ) -> EmpreendimentoCatalogo:
        # Campos de controle não poluem o documento guardado.
        doc = {k: v for k, v in documento.items() if k not in ("slug", "ordem")}
        bv_id = doc.get("bvId") or doc.get("idEmpreendimentoSales")
        ordem = documento.get("ordem")
        item = EmpreendimentoCatalogo(
            slug=slug, documento=doc, bv_id=bv_id, ordem=ordem
        )
        return await self._r.salvar(item)


class ExcluirDoCatalogo:
    def __init__(self, repositorio: RepositorioCatalogo) -> None:
        self._r = repositorio

    async def executar(self, slug: str) -> None:
        await self._r.excluir(slug)


class ReordenarCatalogo:
    def __init__(self, repositorio: RepositorioCatalogo) -> None:
        self._r = repositorio

    async def executar(self, slugs_em_ordem: Sequence[str]) -> None:
        await self._r.reordenar(slugs_em_ordem)


class ObterConfigSite:
    def __init__(self, repositorio: RepositorioConfig) -> None:
        self._r = repositorio

    async def executar(self) -> ConfigSite:
        return await self._r.obter_site()


class SalvarConfigSite:
    def __init__(self, repositorio: RepositorioConfig) -> None:
        self._r = repositorio

    async def executar(self, dados: dict[str, Any]) -> ConfigSite:
        return await self._r.salvar_site(ConfigSite(dados=dados))
