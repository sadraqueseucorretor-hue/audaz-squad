"""Rotas de integração: gestão do token do Bora Vender guardado no servidor.

Protegidas: só o admin logado sobe um novo token ou consulta o status.
A tela admin usa o status (segundos_restantes/expirado) para a contagem
regressiva e o alerta de vencimento.
"""
from __future__ import annotations

from fastapi import APIRouter

from ....application.use_cases.credencial_bora_vender import StatusCredencial
from ..deps import SalvarCredencialDep, StatusCredencialDep, UsuarioAtualDep
from ..schemas import SalvarTokenIn, StatusCredencialOut

router = APIRouter(prefix="/integracao/bora-vender", tags=["integração"])


def _para_saida(s: StatusCredencial) -> StatusCredencialOut:
    i = s.info
    return StatusCredencialOut(
        usuario=i.usuario,
        email=i.email,
        atividade=i.atividade,
        emitido_em=i.emitido_em,
        expira_em=i.expira_em,
        expirado=i.expirado,
        segundos_restantes=i.segundos_restantes,
        atualizado_em=s.atualizado_em,
        atualizado_por=s.atualizado_por,
    )


@router.put("/token", response_model=StatusCredencialOut, summary="Salva um novo token")
async def salvar_token(
    corpo: SalvarTokenIn, usuario: UsuarioAtualDep, caso_de_uso: SalvarCredencialDep
) -> StatusCredencialOut:
    status = await caso_de_uso.executar(corpo.token, por=usuario.email)
    return _para_saida(status)


@router.get(
    "/token/status",
    response_model=StatusCredencialOut,
    summary="Validade do token atual (para a contagem regressiva)",
)
async def status_token(
    usuario: UsuarioAtualDep, caso_de_uso: StatusCredencialDep
) -> StatusCredencialOut:
    return _para_saida(await caso_de_uso.executar())
