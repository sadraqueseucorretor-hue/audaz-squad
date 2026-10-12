"""Importa o firestore-export.json para o catálogo via API (HTTP).

Faz login como admin e envia cada empreendimento e a config do site pelas
rotas já existentes — assim não depende de driver/host do banco: basta a API
estar no ar.

Uso:
    python scripts/importar_catalogo.py \
        --base http://localhost:8000 \
        --email admin@audazsquad.com \
        --senha SUA_SENHA \
        --arquivo ../firestore-export.json
"""
from __future__ import annotations

import argparse
import json
import sys

import httpx


def main() -> int:
    p = argparse.ArgumentParser(description="Importa o catálogo exportado do Firestore.")
    p.add_argument("--base", default="http://localhost:8000", help="URL base da API.")
    p.add_argument("--email", required=True, help="E-mail do admin.")
    p.add_argument("--senha", required=True, help="Senha do admin.")
    p.add_argument("--arquivo", default="firestore-export.json", help="Caminho do JSON.")
    args = p.parse_args()

    dados = json.load(open(args.arquivo, encoding="utf-8"))
    empreendimentos = dados.get("empreendimentos", [])
    site = dados.get("site", {})

    base = args.base.rstrip("/")
    v1 = f"{base}/api/v1"

    with httpx.Client(timeout=30) as c:
        r = c.post(f"{v1}/auth/login", json={"email": args.email, "senha": args.senha})
        if r.status_code != 200:
            print(f"✗ Login falhou ({r.status_code}): {r.text}", file=sys.stderr)
            return 1
        token = r.json()["access_token"]
        h = {"Authorization": f"Bearer {token}"}

        ok = 0
        for emp in empreendimentos:
            slug = emp.get("slug")
            if not slug:
                print(f"  - ignorado (sem slug): {emp.get('nome')!r}")
                continue
            resp = c.put(f"{v1}/catalogo/empreendimentos/{slug}", json=emp, headers=h)
            if resp.status_code == 200:
                ok += 1
            else:
                print(f"  ✗ {slug}: {resp.status_code} {resp.text}", file=sys.stderr)

        if site:
            rs = c.put(f"{v1}/catalogo/config/site", json=site, headers=h)
            print("site:", "ok" if rs.status_code == 200 else f"erro {rs.status_code}")

    print(f"✓ {ok}/{len(empreendimentos)} empreendimentos importados.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
