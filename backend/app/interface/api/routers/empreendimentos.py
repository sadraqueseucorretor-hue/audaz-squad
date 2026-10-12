"""Rotas de empreendimentos e disponibilidade."""
from __future__ import annotations

from fastapi import APIRouter, Query

from ..deps import CredencialDep, ListarEmpreendimentosDep, ObterDisponibilidadeDep
from ..schemas import DisponibilidadeOut, EmpreendimentoOut

router = APIRouter(prefix="/empreendimentos", tags=["empreendimentos"])


@router.get(
    "",
    response_model=list[EmpreendimentoOut],
    summary="Lista os empreendimentos da regional",
)
async def listar(
    credencial: CredencialDep,
    caso_de_uso: ListarEmpreendimentosDep,
    somente_disponiveis: bool = Query(
        False, description="Filtrar apenas empreendimentos com unidades disponíveis."
    ),
) -> list[EmpreendimentoOut]:
    empreendimentos = await caso_de_uso.executar(
        credencial, somente_disponiveis=somente_disponiveis
    )
    return [EmpreendimentoOut.de(e) for e in empreendimentos]


@router.get(
    "/{empreendimento_id}/disponibilidade",
    response_model=DisponibilidadeOut,
    summary="Espelho de vendas (unidades, valores e resumo) de um empreendimento",
)
async def disponibilidade(
    empreendimento_id: str,
    credencial: CredencialDep,
    caso_de_uso: ObterDisponibilidadeDep,
) -> DisponibilidadeOut:
    resultado = await caso_de_uso.executar(credencial, empreendimento_id)
    return DisponibilidadeOut.de(resultado)
