#!/usr/bin/env bash
# Reestrutura o repositório para monorepo: frontend/ + backend/.
# (backend/ já existe; aqui movemos o frontend da raiz para frontend/.)
#
# Rode na RAIZ do repo. Os arquivos novos (frontend/vite.config.js,
# frontend/.env.production, deploy/, .github/) já foram entregues pelo Claude —
# este script só move o código-fonte do frontend preservando o histórico do git.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

mkdir -p frontend

# Move o frontend para frontend/ (git mv preserva histórico).
# vite.config.js NÃO entra aqui: o novo já está em frontend/vite.config.js.
for item in index.html package.json package-lock.json src public tests firestore.rules storage.rules; do
  if [ -e "$item" ]; then
    git mv "$item" frontend/
    echo "movido: $item -> frontend/$item"
  fi
done

# vite.config.js antigo da raiz sai (substituído pelo novo em frontend/).
[ -e vite.config.js ] && git rm -q vite.config.js && echo "removido: vite.config.js (raiz)"

# docs/ era o build do GitHub Pages — não é mais usado (o nginx serve frontend/dist).
[ -e docs ] && git rm -rq docs && echo "removido: docs/ (build antigo do Pages)"

echo
echo "OK. Estrutura montada. Confira com:  git status"
echo "Depois:  cd frontend && npm install   (recria node_modules no novo lugar)"
