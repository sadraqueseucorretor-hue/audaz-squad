"""Cache simples em memória com expiração por tempo (TTL).

Processo único (um container). Se um dia houver várias réplicas da API, trocar
por um cache compartilhado (ex.: Redis) mantendo a mesma interface.
"""
from __future__ import annotations

import time
from typing import Any


class CacheTTL:
    def __init__(self, ttl_segundos: float) -> None:
        self._ttl = ttl_segundos
        self._dados: dict[str, tuple[float, Any]] = {}

    def obter(self, chave: str) -> Any | None:
        item = self._dados.get(chave)
        if item is None:
            return None
        expira_em, valor = item
        if time.monotonic() >= expira_em:
            self._dados.pop(chave, None)
            return None
        return valor

    def guardar(self, chave: str, valor: Any) -> None:
        self._dados[chave] = (time.monotonic() + self._ttl, valor)

    def invalidar(self, chave: str | None = None) -> None:
        if chave is None:
            self._dados.clear()
        else:
            self._dados.pop(chave, None)
