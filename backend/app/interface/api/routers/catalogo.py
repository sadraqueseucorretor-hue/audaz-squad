"""Rotas do catálogo administrado (substitui o Firestore).

Leitura é pública (corretores). Escrita exige admin logado.
Os documentos mantêm o mesmo formato que o frontend já consome.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body

from ..deps import (
    ExcluirCatalogoDep,
    ListarCatalogoDep,
    ObterCatalogoDep,
    ObterConfigDep,
    ReordenarCatalogoDep,
    SalvarCatalogoDep,
    SalvarConfigDep,
    UsuarioAtualDep,
)
from ..schemas import ReordenarIn

router = APIRouter(prefix="/catalogo", tags=["catálogo"])


@router.get("/empreendimentos", summary="Lista o catálogo (público)")
async def listar(caso_de_uso: ListarCatalogoDep) -> list[dict[str, Any]]:
    itens = await caso_de_uso.executar()
    return [i.como_documento() for i in itens]


@router.get("/empreendimentos/{slug}", summary="Um empreendimento do catálogo")
async def obter(slug: str, caso_de_uso: ObterCatalogoDep) -> dict[str, Any]:
    return (await caso_de_uso.executar(slug)).como_documento()


@router.put(
    "/empreendimentos/{slug}",
    summary="Cria ou atualiza um empreendimento (admin)",
)
async def salvar(
    slug: str,
    usuario: UsuarioAtualDep,
    caso_de_uso: SalvarCatalogoDep,
    documento: dict[str, Any] = Body(...),
) -> dict[str, Any]:
    item = await caso_de_uso.executar(slug, documento)
    return item.como_documento()


@router.delete(
    "/empreendimentos/{slug}",
    status_code=204,
    summary="Exclui um empreendimento (admin)",
)
async def excluir(
    slug: str, usuario: UsuarioAtualDep, caso_de_uso: ExcluirCatalogoDep
) -> None:
    await caso_de_uso.executar(slug)


@router.put("/ordem", status_code=204, summary="Reordena o catálogo (admin)")
async def reordenar(
    corpo: ReordenarIn, usuario: UsuarioAtualDep, caso_de_uso: ReordenarCatalogoDep
) -> None:
    await caso_de_uso.executar(corpo.slugs)


@router.get("/config/site", summary="Configuração do site (público)")
async def obter_config(caso_de_uso: ObterConfigDep) -> dict[str, Any]:
    return (await caso_de_uso.executar()).dados


@router.put("/config/site", summary="Salva a configuração do site (admin)")
async def salvar_config(
    usuario: UsuarioAtualDep,
    caso_de_uso: SalvarConfigDep,
    dados: dict[str, Any] = Body(...),
) -> dict[str, Any]:
    return (await caso_de_uso.executar(dados)).dados
