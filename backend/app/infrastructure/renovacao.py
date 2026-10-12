"""Rotina em segundo plano que mantém o token do Bora Vender sempre válido.

A cada `intervalo_renovacao_segundos`, verifica o token guardado e, se faltar
pouco para expirar (ou não houver token), faz login na Direcional e grava um
token novo. Nunca derruba o loop por causa de uma falha pontual — apenas
registra e tenta de novo no próximo ciclo.
"""
from __future__ import annotations

import asyncio
import logging

from ..application.use_cases.renovar_credencial import RenovarCredencialBoraVender
from .bora_vender.autenticador import AutenticadorBoraVenderHttp
from .db.repositorios import RepositorioCredencialBoraVenderDB
from .seguranca.inspetor_jwt import InspetorJwt

logger = logging.getLogger("audaz.renovacao")


async def loop_de_renovacao(app, config) -> None:
    autenticador = AutenticadorBoraVenderHttp(
        app.state.http,
        config.bora_vender_login_url,
        client_id=config.bora_vender_client_id,
        origin=config.bora_vender_origin,
        campo_token=config.bora_vender_token_campo,
    )
    inspetor = InspetorJwt()
    intervalo = max(10, int(config.intervalo_renovacao_segundos))
    logger.info(
        "Renovação automática do token do Bora Vender ativa "
        "(checa a cada %ss; renova faltando %ss).",
        intervalo,
        config.renovar_antes_segundos,
    )

    while True:
        try:
            async with app.state.sessionmaker() as sessao:
                caso = RenovarCredencialBoraVender(
                    RepositorioCredencialBoraVenderDB(sessao),
                    inspetor,
                    autenticador,
                    email=config.bora_vender_email,
                    senha=config.bora_vender_senha,
                    margem_segundos=config.renovar_antes_segundos,
                )
                if await caso.executar():
                    await sessao.commit()
                    logger.info("Token do Bora Vender renovado automaticamente.")
        except asyncio.CancelledError:
            raise
        except Exception as erro:  # noqa: BLE001 — nunca derruba o loop
            logger.warning("Falha ao renovar o token do Bora Vender: %s", erro)
        await asyncio.sleep(intervalo)
