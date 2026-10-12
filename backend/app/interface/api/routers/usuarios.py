"""Gestão de administradores — listar, cadastrar e remover.

Todas as rotas exigem um admin logado (UsuarioAtualDep). Não há cadastro
público: um admin só é criado por outro admin (ou semeado no .env).
"""
from __future__ import annotations

from fastapi import APIRouter

from ..deps import (
    CriarUsuarioDep,
    ExcluirUsuarioDep,
    ListarUsuariosDep,
    UsuarioAtualDep,
)
from ..schemas import UsuarioCriarIn, UsuarioOut

router = APIRouter(prefix="/usuarios", tags=["administradores"])


@router.get("", response_model=list[UsuarioOut], summary="Lista os administradores")
async def listar(usuario: UsuarioAtualDep, caso_de_uso: ListarUsuariosDep) -> list[UsuarioOut]:
    itens = await caso_de_uso.executar()
    return [UsuarioOut(id=u.id, email=u.email, nome=u.nome) for u in itens]


@router.post(
    "", response_model=UsuarioOut, status_code=201, summary="Cadastra um novo administrador"
)
async def criar(
    corpo: UsuarioCriarIn, usuario: UsuarioAtualDep, caso_de_uso: CriarUsuarioDep
) -> UsuarioOut:
    novo = await caso_de_uso.executar(corpo.email, corpo.senha, corpo.nome)
    return UsuarioOut(id=novo.id, email=novo.email, nome=novo.nome)


@router.delete("/{usuario_id}", status_code=204, summary="Remove um administrador")
async def excluir(
    usuario_id: int, usuario: UsuarioAtualDep, caso_de_uso: ExcluirUsuarioDep
) -> None:
    await caso_de_uso.executar(usuario_id)
