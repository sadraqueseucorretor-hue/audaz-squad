"""Configuração da aplicação, lida de variáveis de ambiente / arquivo .env.

Nenhum segredo (token, CPF) mora aqui. O token de acesso é sempre fornecido
pelo cliente em cada requisição; esta configuração só guarda parâmetros
públicos da integração.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuracoes(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # Integração Bora Vender (Direcional)
    bora_vender_base_url: str = "https://be.direcional.com.br/bora-vender/v1"
    unidade_de_negocio: str = "Direcional"
    regional: str = "CE"
    http_timeout_segundos: float = 30.0

    # Cache da disponibilidade (espelho de vendas). O valor do imóvel não muda
    # de um dia para o outro, então 1 hora (3600s) por padrão.
    cache_disponibilidade_segundos: int = 3600

    # Banco de dados (Postgres em produção; SQLite nos testes).
    database_url: str = "postgresql+asyncpg://audaz:audaz@localhost:5432/audaz"

    # Autenticação própria (JWT da aplicação).
    jwt_secret: str = "troque-este-segredo-em-producao"
    jwt_algoritmo: str = "HS256"
    jwt_expira_minutos: int = 60 * 12

    # Admin inicial criado no primeiro start (se ainda não existir nenhum usuário).
    admin_email: str | None = None
    admin_senha: str | None = None

    # Caminho do build do frontend a servir (quando o nginx ainda não entrou).
    # Vazio = não servir estáticos.
    diretorio_estaticos: str = ""

    # API
    titulo_api: str = "AudazSquad API"
    versao_api: str = "0.1.0"
    prefixo_api: str = "/api/v1"

    # CORS — origens do frontend (Vite dev em 5173 por padrão).
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"]
    )

    # --- Renovação automática do token do Bora Vender ---
    # Credenciais de login na Direcional (o payload do /autenticacao/login).
    # Se ambas estiverem preenchidas, o servidor renova o token sozinho antes
    # de expirar — sem precisar colar um token novo na mão.
    bora_vender_email: str | None = None
    bora_vender_senha: str | None = None
    # Endpoint de login e header obrigatório client_id (vistos na chamada real).
    bora_vender_login_url: str = (
        "https://be.direcional.com.br/bora-vender/v1/autenticacao/login"
    )
    bora_vender_client_id: str = "b53793b2-7c67-42f4-ac30-06f3a6295179"
    bora_vender_origin: str = "https://boravender.app.br"
    # Caminho (com pontos) do ID token na resposta do login. O access_token
    # dessa API decodifica como token_use=id também, então fixamos o campo.
    bora_vender_token_campo: str = "authenticationResult.idToken"
    # Liga/desliga a rotina de renovação automática.
    renovacao_automatica: bool = True
    # Renova quando faltar este tempo (ou menos) para expirar. Padrão: 5 min.
    renovar_antes_segundos: int = 300
    # De quanto em quanto tempo a rotina confere o token.
    intervalo_renovacao_segundos: int = 60


@lru_cache
def obter_configuracoes() -> Configuracoes:
    return Configuracoes()
