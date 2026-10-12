"""Caso de uso: obter o espelho de vendas (disponibilidade) de um empreendimento."""
from __future__ import annotations

from ...domain.entities import Disponibilidade
from ...domain.repositories import RepositorioDeDisponibilidade
from ...domain.value_objects import Credencial


class ObterDisponibilidade:
    def __init__(self, repositorio: RepositorioDeDisponibilidade) -> None:
        self._repositorio = repositorio

    async def executar(
        self, credencial: Credencial, empreendimento_id: str
    ) -> Disponibilidade:
        if not empreendimento_id or not empreendimento_id.strip():
            raise ValueError("Informe o id do empreendimento.")
        return await self._repositorio.obter(credencial, empreendimento_id.strip())
