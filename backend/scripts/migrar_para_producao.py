"""Copia o catálogo (empreendimentos + config do site + ordem) da API LOCAL
para a API de PRODUÇÃO, usando as rotas HTTP já existentes.

Vantagem: não toca no banco direto, não depende do firestore-export.json e usa
o mesmo formato que o painel admin — o que a API local entrega é exatamente o
que a de produção aceita.

Pré-requisitos:
  - A API LOCAL no ar (docker compose up) com os dados que você quer enviar.
  - A API de PRODUÇÃO acessível e as credenciais do admin de produção.

Uso:
    python scripts/migrar_para_producao.py \
        --local http://localhost:8020 \
        --prod  https://audazimob.online/squad \
        --email admin@audazsquad.com \
        --senha SENHA_DO_ADMIN_DE_PRODUCAO
"""
from __future__ import annotations

import argparse
import sys

import httpx


def main() -> int:
    p = argparse.ArgumentParser(description="Migra o catálogo da API local para produção.")
    p.add_argument("--local", default="http://localhost:8020", help="URL base da API local.")
    p.add_argument("--prod", required=True, help="URL base da API de produção (ex.: https://audazimob.online/squad).")
    p.add_argument("--email", required=True, help="E-mail do admin de PRODUÇÃO.")
    p.add_argument("--senha", required=True, help="Senha do admin de PRODUÇÃO.")
    args = p.parse_args()

    local_v1 = f"{args.local.rstrip('/')}/api/v1"
    prod_v1 = f"{args.prod.rstrip('/')}/api/v1"

    with httpx.Client(timeout=60) as c:
        # 1. Lê do LOCAL (rotas públicas, não precisa de login).
        try:
            emp_resp = c.get(f"{local_v1}/catalogo/empreendimentos")
            emp_resp.raise_for_status()
            empreendimentos = emp_resp.json()
            site = c.get(f"{local_v1}/catalogo/config/site").json()
        except Exception as erro:  # noqa: BLE001
            print(f"✗ Não consegui ler a API local em {local_v1}: {erro}", file=sys.stderr)
            print("  A API local está no ar? (docker compose up)", file=sys.stderr)
            return 1

        print(f"→ Lidos do local: {len(empreendimentos)} empreendimentos, "
              f"config do site com {len(site)} chave(s).")

        # 2. Login no PROD.
        r = c.post(f"{prod_v1}/auth/login", json={"email": args.email, "senha": args.senha})
        if r.status_code != 200:
            print(f"✗ Login em produção falhou ({r.status_code}): {r.text}", file=sys.stderr)
            return 1
        h = {"Authorization": f"Bearer {r.json()['access_token']}"}

        # 3. Envia cada empreendimento ao PROD.
        ok = 0
        slugs_em_ordem: list[str] = []
        for emp in empreendimentos:
            slug = emp.get("slug")
            if not slug:
                print(f"  - ignorado (sem slug): {emp.get('nome')!r}")
                continue
            resp = c.put(f"{prod_v1}/catalogo/empreendimentos/{slug}", json=emp, headers=h)
            if resp.status_code == 200:
                ok += 1
                slugs_em_ordem.append(slug)
            else:
                print(f"  ✗ {slug}: {resp.status_code} {resp.text}", file=sys.stderr)

        # 4. Config do site.
        if site:
            rs = c.put(f"{prod_v1}/catalogo/config/site", json=site, headers=h)
            print("site:", "ok" if rs.status_code == 200 else f"erro {rs.status_code} {rs.text}")

        # 5. Preserva a ordem exibida.
        if slugs_em_ordem:
            ro = c.put(f"{prod_v1}/catalogo/ordem", json={"slugs": slugs_em_ordem}, headers=h)
            print("ordem:", "ok" if ro.status_code in (200, 204) else f"erro {ro.status_code}")

    print(f"✓ {ok}/{len(empreendimentos)} empreendimentos enviados para produção.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
