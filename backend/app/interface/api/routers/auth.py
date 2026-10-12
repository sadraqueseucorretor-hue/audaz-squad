"""Rotas de autenticação: login, sessão atual e inspeção avulsa de token."""
from __future__ import annotations

from fastapi import APIRouter

from ..deps import AutenticarDep, InspecionarTokenDep, JwtDep, UsuarioAtualDep
from ..schemas import (
    InspecaoTokenIn,
    InspecaoTokenOut,
    LoginIn,
    SessaoOut,
    UsuarioOut,
)

router = APIRouter(prefix="/auth", tags=["autenticação"])


@router.post("/login", response_model=SessaoOut, summary="Login do admin")
async def login(corpo: LoginIn, autenticar: AutenticarDep, jwt_service: JwtDep) -> SessaoOut:
    usuario = await autenticar.executar(corpo.email, corpo.senha)
    token = jwt_service.emitir(usuario.email, extras={"nome": usuario.nome})
    return SessaoOut(
        access_token=token,
        usuario=UsuarioOut(id=usuario.id, email=usuario.email, nome=usuario.nome),
    )


@router.get("/me", response_model=UsuarioOut, summary="Dados da sessão atual")
async def me(usuario: UsuarioAtualDep) -> UsuarioOut:
    return UsuarioOut(id=usuario.id, email=usuario.email, nome=usuario.nome)


@router.post(
    "/token/inspecionar",
    response_model=InspecaoTokenOut,
    summary="Lê um token avulso (sem guardar) — útil para testes",
)
async def inspecionar_token(
    corpo: InspecaoTokenIn, caso_de_uso: InspecionarTokenDep
) -> InspecaoTokenOut:
    return InspecaoTokenOut.de(caso_de_uso.executar(corpo.token))
