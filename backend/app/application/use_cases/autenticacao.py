"""Caso de uso de autenticação do admin."""
from __future__ import annotations

from collections.abc import Callable

from ...domain.conta import UsuarioAdmin
from ...domain.exceptions import CredencialInvalida
from ...domain.repositorios_dados import RepositorioUsuarios

# Verificador de senha injetado (senha_em_claro, hash) -> bool. Mantém o caso
# de uso independente da biblioteca de hashing.
VerificadorDeSenha = Callable[[str, str], bool]


class AutenticarUsuario:
    def __init__(self, usuarios: RepositorioUsuarios, verificar: VerificadorDeSenha) -> None:
        self._usuarios = usuarios
        self._verificar = verificar

    async def executar(self, email: str, senha: str) -> UsuarioAdmin:
        usuario = await self._usuarios.por_email(email)
        if usuario is None or not usuario.ativo:
            raise CredencialInvalida("E-mail ou senha incorretos.")
        if not self._verificar(senha, usuario.senha_hash):
            raise CredencialInvalida("E-mail ou senha incorretos.")
        return usuario
