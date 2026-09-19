"""
Passo 1 do reconhecimento: abre a página de login da Ontic/Untic e salva um
screenshot + o HTML da página, SEM usar nenhuma credencial.

Objetivo: mapear os seletores do formulário de login (campos de usuário/senha,
botão de submit, possível captcha/2FA) antes de escrever o fluxo de
autenticação automatizado.

Uso:
    ONTIC_LOGIN_URL="https://..." python -m scraper.inspect_login
"""

import os
import sys

from playwright.sync_api import sync_playwright

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "_inspect")


def main() -> None:
    login_url = os.environ.get("ONTIC_LOGIN_URL")
    if not login_url:
        print("Defina ONTIC_LOGIN_URL (env var) com a URL de login antes de rodar.")
        sys.exit(1)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(login_url, wait_until="networkidle")

        screenshot_path = os.path.join(OUTPUT_DIR, "login_page.png")
        html_path = os.path.join(OUTPUT_DIR, "login_page.html")

        page.screenshot(path=screenshot_path, full_page=True)
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(page.content())

        print(f"Screenshot salvo em: {screenshot_path}")
        print(f"HTML salvo em: {html_path}")

        browser.close()


if __name__ == "__main__":
    main()
