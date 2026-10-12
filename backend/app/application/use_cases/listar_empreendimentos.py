"""Caso de uso: listar os empreendimentos disponíveis no Bora Vender."""
from __future__ import annotations

from collections.abc import Sequence

from ...domain.entities import Empreendimento
from ...domain.repositories import RepositorioDeEmpreendimentos
from ...domain.value_objects import Credencial


class ListarEmpreendimentos:
    """Orquestra a listagem. Uma responsabilidade só (SRP)."""

    def __init__(self, repositorio: RepositorioDeEmpreendimentos) -> None:
        self._repositorio = repositorio

    async def executar(
        self, credencial: Credencial, *, somente_disponiveis: bool = False
    ) -> Sequence[Empreendimento]:
        return await self._repositorio.listar(
            credencial, somente_disponiveis=somente_disponiveis
        )
