"""Configuração dos testes: usa SQLite (async) e um admin semeado, antes de
qualquer import de `app` (as configurações são lidas uma única vez)."""
from __future__ import annotations

import os
import pathlib

_DB = pathlib.Path(__file__).parent / "_test.db"
if _DB.exists():
    _DB.unlink()

os.environ.setdefault("DATABASE_URL", f"sqlite+aiosqlite:///{_DB}")
os.environ.setdefault("JWT_SECRET", "segredo-de-teste")
os.environ.setdefault("ADMIN_EMAIL", "admin@teste.com")
os.environ.setdefault("ADMIN_SENHA", "senha123")
os.environ.setdefault("CORS_ORIGINS", '["http://localhost:5173"]')
