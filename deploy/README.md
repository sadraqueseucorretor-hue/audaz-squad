# Deploy do AudazSquad

Frontend **nativo** (nginx serve o build) + backend em **Docker**, deploy
automático pelo **GitHub Actions** no push da `main`. Rodando em
`audazimob.com/squad`, na mesma VPS do AudazCenter.

## Estrutura do repositório (depois da reestruturação)

```
audaz-squad/
├── frontend/          # app Vite/React (build vai para frontend/dist)
│   ├── src/ public/ index.html package.json vite.config.js .env.production
├── backend/           # FastAPI (Docker)
│   ├── app/ Dockerfile pyproject.toml ...
├── deploy/
│   ├── nginx.conf                 # blocos /squad para o nginx da VPS
│   ├── reestruturar-monorepo.sh   # script que montou esta estrutura
│   └── README.md                  # este arquivo
├── .github/workflows/deploy.yml   # CI/CD
└── docker-compose.yml             # backend (API) + Postgres
```

## 1) Reestruturar (uma vez, na sua máquina)

```bash
bash deploy/reestruturar-monorepo.sh
cd frontend && npm install && cd ..
git add -A && git commit -m "monorepo: frontend/ + backend/ + deploy"
```

## 2) Preparar a VPS (uma vez)

1. **Docker** (se ainda não tiver):
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
2. **Pasta e arquivos:**
   ```bash
   sudo mkdir -p /opt/audaz-squad/frontend/dist
   # copie docker-compose.yml para /opt/audaz-squad/ (o CI também envia a cada deploy)
   ```
3. **`/opt/audaz-squad/.env`** (NÃO vai para o git) — senhas de produção:
   ```env
   POSTGRES_USER=audaz
   POSTGRES_PASSWORD=<senha forte>
   POSTGRES_DB=audaz_squad
   JWT_SECRET=<segredo forte>
   ADMIN_EMAIL=<seu email admin>
   ADMIN_SENHA=<senha admin>
   CORS_ORIGINS=["https://audazimob.com"]
   CACHE_DISPONIBILIDADE_SEGUNDOS=3600
   ```
4. **nginx:** copie os blocos de `deploy/nginx.conf` para DENTRO do `server {}`
   do `audazimob.com` e recarregue:
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```
5. **Imagem do ghcr:** deixe o pacote **público** (GitHub → repo → Packages →
   `audaz-squad-api` → Package settings → Change visibility → Public). Assim a
   VPS faz `docker compose pull` sem precisar de login. (Alternativa: rodar
   `docker login ghcr.io` na VPS com um token.)
6. **Sudoers** (para o CI recarregar o nginx sem senha) — como no AudazCenter,
   libere ao usuário de deploy: `NOPASSWD: /bin/systemctl reload nginx`.

## 3) Segredos do GitHub (repo → Settings → Secrets → Actions)

| Secret     | O que é                                    |
|------------|--------------------------------------------|
| `SSH_HOST` | IP/host da VPS                             |
| `SSH_USER` | usuário de deploy na VPS                   |
| `SSH_KEY`  | chave privada SSH desse usuário            |

O `GITHUB_TOKEN` (push da imagem no ghcr) é automático — não precisa criar.

## 4) Primeiro import do catálogo (uma vez)

Com o backend no ar na VPS, rode o import apontando para a API local da VPS
(ou pelo túnel), usando o `firestore-export.json`:

```bash
# na VPS, dentro de /opt/audaz-squad (precisa de python + httpx)
python backend/scripts/importar_catalogo.py \
  --base http://127.0.0.1:8020 \
  --email <ADMIN_EMAIL> --senha <ADMIN_SENHA> \
  --arquivo firestore-export.json
```

## Deploy no dia a dia

Só isto:

```bash
git push origin main
```

O Actions builda o frontend, builda+publica a imagem do backend, envia o
`dist` para a VPS, faz `docker compose pull && up -d` e recarrega o nginx.

## Rodar local (opcional)

```bash
# backend + banco
docker compose up -d --build        # API em http://localhost:8020
# frontend
cd frontend && npm run dev          # http://localhost:5173 (proxy /api -> 8020)
```
