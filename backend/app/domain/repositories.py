"""Portas (interfaces) que o domínio/aplicação exigem do mundo externo.

Seguindo a Regra de Dependência da Clean Architecture, as camadas internas
definem estas abstrações e a infraestrutura as implementa. Os casos de uso
dependem só destas interfaces — nunca de httpx, pyjwt ou do Bora Vender.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Sequence

from .entities import Disponibilidade, Empreendimento
from .token import InformacoesToken
from .value_objects import Credencial


class RepositorioDeEmpreendimentos(ABC):
    """Fonte de empreendimentos (no caso, o Bora Vender)."""

    @abstractmethod
    async def listar(
        self, credencial: Credencial, *, somente_disponiveis: bool = False
    ) -> Sequence[Empreendimento]:
        ...


class RepositorioDeDisponibilidade(ABC):
    """Fonte do espelho de vendas (unidades/valores) de um empreendimento."""

    @abstractmethod
    async def obter(
        self, credencial: Credencial, empreendimento_id: str
    ) -> Disponibilidade:
        ...


class InspetorDeToken(ABC):
    """Lê as informações de um token sem confiar nelas (sem verificar assinatura)."""

    @abstractmethod
    def inspecionar(self, token: str) -> InformacoesToken:
        ...


class AutenticadorBoraVender(ABC):
    """Troca credenciais (e-mail/senha) por um token de acesso do Bora Vender."""

    @abstractmethod
    async def autenticar(self, email: str, senha: str) -> str:
        ...
