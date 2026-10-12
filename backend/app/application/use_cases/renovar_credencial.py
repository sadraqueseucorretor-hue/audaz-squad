"""Caso de uso: renovar automaticamente o token do Bora Vender.

Decide se precisa renovar (sem token, expirado, ou perto de expirar) e, em caso
afirmativo, faz login com as credenciais configuradas e guarda o novo token.
Pensado para ser chamado por uma rotina periódica em segundo plano.
"""
from __future__ import annotations

from ...domain.conta import CredencialArmazenada
from ...domain.exceptions import TokenInvalido
from ...domain.repositories import AutenticadorBoraVender, InspetorDeToken
from ...domain.repositorios_dados import RepositorioCredencialBoraVender

RENOVADO_POR = "rotina-automatica"


class RenovarCredencialBoraVender:
    def __init__(
        self,
        repositorio: RepositorioCredencialBoraVender,
        inspetor: InspetorDeToken,
        autenticador: AutenticadorBoraVender,
        *,
        email: str | None,
        senha: str | None,
        margem_segundos: int = 300,
    ) -> None:
        self._repositorio = repositorio
        self._inspetor = inspetor
        self._autenticador = autenticador
        self._email = email
        self._senha = senha
        self._margem = margem_segundos

    def _precisa_renovar(self, token: str | None) -> bool:
        if not token:
            return True
        try:
            info = self._inspetor.inspecionar(token)
        except TokenInvalido:
            return True  # token ilegível: melhor renovar
        restantes = info.segundos_restantes
        if restantes is None:
            return False  # sem exp legível: não força (evita renovar em loop)
        return restantes <= self._margem

    async def executar(self) -> bool:
        """Renova se necessário. Retorna True se um novo token foi gravado."""
        if not (self._email and self._senha):
            return False
        atual = await self._repositorio.obter()
        token_atual = atual.token if atual else None
        if not self._precisa_renovar(token_atual):
            return False
        novo_token = await self._autenticador.autenticar(self._email, self._senha)
        await self._repositorio.salvar(
            CredencialArmazenada(token=novo_token, atualizado_por=RENOVADO_POR)
        )
        return True
