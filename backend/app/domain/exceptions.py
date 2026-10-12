"""Exceções do domínio.

A camada de aplicação lança/propaga estas exceções; a camada de interface
(API) é quem as traduz em respostas HTTP. O domínio não conhece HTTP.
"""
from __future__ import annotations


class ErroDeDominio(Exception):
    """Raiz de todos os erros de domínio."""


class CredencialAusente(ErroDeDominio):
    """Nenhum token foi fornecido para uma operação que o exige."""


class TokenInvalido(ErroDeDominio):
    """O token não pôde ser lido ou foi recusado pelo provedor."""


class TokenExpirado(TokenInvalido):
    """O token é válido em forma, mas já passou da validade (exp)."""


class EmpreendimentoNaoEncontrado(ErroDeDominio):
    def __init__(self, empreendimento_id: str) -> None:
        self.empreendimento_id = empreendimento_id
        super().__init__(f"Empreendimento não encontrado: {empreendimento_id}")


class CredencialInvalida(ErroDeDominio):
    """E-mail ou senha incorretos no login do admin."""


class NaoAutorizado(ErroDeDominio):
    """Falta sessão válida para uma operação protegida."""


class CredencialBoraVenderAusente(ErroDeDominio):
    """Nenhum token do Bora Vender foi cadastrado no servidor ainda."""


class FalhaNaIntegracao(ErroDeDominio):
    """O Bora Vender respondeu com erro ou ficou indisponível."""

    def __init__(self, mensagem: str, *, status: int | None = None) -> None:
        self.status = status
        super().__init__(mensagem)
