# Backend AudazSquad — imagem de produção enxuta.
FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Instala apenas as dependências (espelham o pyproject.toml). Não construímos o
# nosso pacote: a API roda a partir de /app, onde o módulo `app` é importável.
# Deixar isto antes do COPY aproveita o cache quando só o código muda.
RUN pip install --no-cache-dir \
    "fastapi>=0.115.0,<1.0.0" \
    "uvicorn[standard]>=0.30.0,<1.0.0" \
    "httpx>=0.28.1,<0.29.0" \
    "pyjwt>=2.15.1,<3.0.0" \
    "pydantic>=2.8.0,<3.0.0" \
    "pydantic-settings>=2.4.0,<3.0.0" \
    "sqlalchemy[asyncio]>=2.0.30,<3.0.0" \
    "asyncpg>=0.30.0,<0.31.0" \
    "bcrypt>=4.1.0,<5.0.0"

COPY app ./app

EXPOSE 8000

# Em produção, remova o --reload (não há --reload aqui).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
