# AudazSquad API

Backend em **FastAPI** que faz a integração nativa com o **Bora Vender** (Direcional):
inspeção de token, listagem de empreendimentos e espelho de vendas (disponibilidade).

Construído com **Clean Architecture**, **DDD** e princípios **SOLID**.

## Arquitetura (Regra de Dependência: de fora para dentro)

```
app/
├── domain/                 # Núcleo. Não depende de nada externo.
│   ├── entities.py         #   Empreendimento, Unidade, Disponibilidade (agregado)
│   ├── value_objects.py    #   Dinheiro, StatusUnidade, Credencial
│   ├── token.py            #   InformacoesToken (modelo de leitura)
│   ├── repositories.py     #   PORTAS (interfaces abstratas)
│   └── exceptions.py       #   Erros de domínio
├── application/            # Casos de uso. Depende só do domínio.
│   └── use_cases/          #   ListarEmpreendimentos, ObterDisponibilidade, InspecionarToken
├── infrastructure/         # Adaptadores. Implementam as portas.
│   ├── config.py           #   Configurações via ambiente (pydantic-settings)
│   ├── bora_vender/        #   Cliente httpx, mapper JSON→domínio, repositórios
│   └── seguranca/          #   InspetorJwt (pyjwt)
└── interface/api/          # HTTP (FastAPI). Traduz erros→status, injeta dependências.
    ├── schemas.py          #   Contratos de entrada/saída (Pydantic)
    ├── deps.py             #   Composition root (monta tudo)
    └── routers/            #   health, auth, empreendimentos
```

**Por que assim:** o domínio e os casos de uso não conhecem FastAPI, httpx nem
o Bora Vender. Trocar a fonte de dados ou o framework web é mexer só nas bordas.

## Autenticação

O backend **não** faz login no Cognito. O corretor/sistema obtém o token no
Bora Vender e o envia em cada requisição no cabeçalho:

```
Authorization: Bearer <token>
```

O backend repassa esse token ao Bora Vender. Nenhum token ou segredo é gravado
no código ou no repositório.

## Rodando

```bash
cd backend
poetry install
cp .env.example .env            # ajuste se precisar
poetry run uvicorn app.main:app --reload --port 8000
```

Docs interativas: http://localhost:8000/docs

## Endpoints

| Método | Rota                                                     | O que faz |
|--------|----------------------------------------------------------|-----------|
| GET    | `/health`                                                | Verifica se a API está no ar |
| POST   | `/api/v1/auth/token/inspecionar`                         | Lê de quem é o token e se expirou (sem verificar assinatura) |
| GET    | `/api/v1/empreendimentos`                                | Lista os empreendimentos da regional (requer token) |
| GET    | `/api/v1/empreendimentos/{id}/disponibilidade`           | Espelho de vendas + resumo (requer token) |

## Testes

```bash
poetry run pytest
```

Os testes rodam sem rede: os repositórios do Bora Vender são substituídos por
dublês via `app.dependency_overrides`, e o mapeamento é validado contra um
exemplo de espelho de vendas em `tests/fixtures/`.
