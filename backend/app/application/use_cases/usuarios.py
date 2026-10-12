"""Casos de uso de gestão de administradores (listar, criar, excluir).

Criar/excluir são operações administrativas: a camada de interface só as expõe
atrás de login (UsuarioAtualDep). Não há cadastro público.
"""
from __future__ import annotations

from collections.abc import Callable, Sequence

from ...domain.conta import UsuarioAdmin
from ...domain.exceptions import OperacaoNaoPermitida, UsuarioJaExiste
from ...domain.repositorios_dados import RepositorioUsuarios

# Gerador de hash de senha injetado — mantém o caso de uso independente da lib.
GeradorDeHash = Callable[[str], str]

_MIN_SENHA = 6


class ListarUsuarios:
    def __init__(self, usuarios: RepositorioUsuarios) -> None:
        self._u = usuarios

    async def executar(self) -> Sequence[UsuarioAdmin]:
        return await self._u.listar()


class CriarUsuario:
    def __init__(self, usuarios: RepositorioUsuarios, gerar_hash: GeradorDeHash) -> None:
        self._u = usuarios
        self._hash = gerar_hash

    async def executar(
        self, email: str, senha: str, nome: str | None = None
    ) -> UsuarioAdmin:
        email = (email or "").strip().lower()
        if "@" not in email or "." not in email:
            raise OperacaoNaoPermitida("Informe um e-mail válido.")
        if len(senha or "") < _MIN_SENHA:
            raise OperacaoNaoPermitida(
                f"A senha precisa ter ao menos {_MIN_SENHA} caracteres."
            )
        if await self._u.por_email(email) is not None:
            raise UsuarioJaExiste(f"Já existe um administrador com o e-mail {email}.")
        return await self._u.criar(
            UsuarioAdmin(
                id=None,
                email=email,
                nome=(nome or "").strip() or None,
                senha_hash=self._hash(senha),
            )
        )


class ExcluirUsuario:
    def __init__(self, usuarios: RepositorioUsuarios) -> None:
        self._u = usuarios

    async def executar(self, id: int) -> None:
        alvo = await self._u.por_id(id)
        if alvo is None:
            return  # idempotente: já não existe
        if await self._u.contar() <= 1:
            raise OperacaoNaoPermitida(
                "Não é possível remover o último administrador."
            )
        await self._u.excluir(id)
