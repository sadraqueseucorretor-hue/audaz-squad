"""Testes do cache (TTL) de disponibilidade."""
from __future__ import annotations

from app.domain.entities import Disponibilidade
from app.domain.repositories import RepositorioDeDisponibilidade
from app.domain.value_objects import Credencial
from app.infrastructure.bora_vender.repositorios import RepositorioDisponibilidadeComCache
from app.infrastructure.cache import CacheTTL

CRED = Credencial(token="x")


class DisponibilidadeFakeContada(RepositorioDeDisponibilidade):
    def __init__(self) -> None:
        self.chamadas = 0

    async def obter(self, credencial, empreendimento_id):
        self.chamadas += 1
        return Disponibilidade(empreendimento_id=empreendimento_id, unidades=())


def test_cache_ttl_basico():
    c = CacheTTL(3600)
    assert c.obter("k") is None
    c.guardar("k", 42)
    assert c.obter("k") == 42
    c.invalidar("k")
    assert c.obter("k") is None


async def test_cache_evita_segunda_chamada():
    fake = DisponibilidadeFakeContada()
    repo = RepositorioDisponibilidadeComCache(fake, CacheTTL(3600))
    a = await repo.obter(CRED, "emp-1")
    b = await repo.obter(CRED, "emp-1")
    assert fake.chamadas == 1  # segunda veio do cache
    assert a is b


async def test_cache_separa_por_empreendimento():
    fake = DisponibilidadeFakeContada()
    repo = RepositorioDisponibilidadeComCache(fake, CacheTTL(3600))
    await repo.obter(CRED, "emp-1")
    await repo.obter(CRED, "emp-2")
    assert fake.chamadas == 2


async def test_cache_expira():
    fake = DisponibilidadeFakeContada()
    repo = RepositorioDisponibilidadeComCache(fake, CacheTTL(0))  # TTL 0 = sempre expira
    await repo.obter(CRED, "emp-1")
    await repo.obter(CRED, "emp-1")
    assert fake.chamadas == 2
