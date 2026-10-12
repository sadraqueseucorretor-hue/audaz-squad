"""Rota de saúde — útil para o Vite/monitoração saber se a API está no ar."""
from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["infra"])


@router.get("/health", summary="Verificação de saúde")
async def health() -> dict[str, str]:
    return {"status": "ok"}
