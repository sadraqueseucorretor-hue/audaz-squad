"""Casos de uso da credencial (token) do Bora Vender guardada no servidor."""
from __future__ import annotations

from dataclasses import dataclass

from ...domain.conta import CredencialArmazenada
from ...domain.exceptions import CredencialBoraVenderAusente
from ...domain.repositories import InspetorDeToken
from ...domain.repositorios_dados import RepositorioCredencialBoraVender
from ...domain.token import InformacoesToken


@dataclass(frozen=True, slots=True)
class StatusCredencial:
    info: InformacoesToken
    atualizado_em: object | None
    atualizado_por: str | None


class SalvarCredencialBoraVender:
    def __init__(
        self,
        repositorio: RepositorioCredencialBoraVender,
        inspetor: InspetorDeToken,
    ) -> None:
        self._repositorio = repositorio
        self._inspetor = inspetor

    async def executar(self, token: str, *, por: str | None = None) -> StatusCredencial:
        token = (token or "").strip()
        # Valida que é um JWT legível antes de guardar (lança TokenInvalido se não for).
        info = self._inspetor.inspecionar(token)
        salvo = await self._repositorio.salvar(
            CredencialArmazenada(token=token, atualizado_por=por)
        )
        return StatusCredencial(
            info=info, atualizado_em=salvo.atualizado_em, atualizado_por=salvo.atualizado_por
        )


class ObterStatusCredencialBoraVender:
    def __init__(
        self,
        repositorio: RepositorioCredencialBoraVender,
        inspetor: InspetorDeToken,
    ) -> None:
        self._repositorio = repositorio
        self._inspetor = inspetor

    async def executar(self) -> StatusCredencial:
        armazenada = await self._repositorio.obter()
        if armazenada is None:
            raise CredencialBoraVenderAusente(
                "Nenhum token do Bora Vender cadastrado. Suba um token para começar."
            )
        info = self._inspetor.inspecionar(armazenada.token)
        return StatusCredencial(
            info=info,
            atualizado_em=armazenada.atualizado_em,
            atualizado_por=armazenada.atualizado_por,
        )
