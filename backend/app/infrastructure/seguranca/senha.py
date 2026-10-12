"""Hashing de senha com bcrypt (uso direto da lib, sem passlib).

O bcrypt ignora bytes além de 72; truncamos explicitamente para evitar o erro
das versões novas da lib e manter o comportamento previsível.
"""
from __future__ import annotations

import bcrypt

_LIMITE = 72


def _bytes(senha: str) -> bytes:
    return senha.encode("utf-8")[:_LIMITE]


def gerar_hash(senha: str) -> str:
    return bcrypt.hashpw(_bytes(senha), bcrypt.gensalt()).decode("utf-8")


def conferir(senha: str, hash_armazenado: str) -> bool:
    try:
        return bcrypt.checkpw(_bytes(senha), hash_armazenado.encode("utf-8"))
    except (ValueError, TypeError):
        return False
