"""
Fluxo de autenticação na plataforma Ontic/Untic via Playwright.

Os seletores abaixo (#username, #password, etc.) são placeholders — serão
ajustados assim que inspecionarmos o HTML real do formulário de login
(ver scraper/inspect_login.py). Não usar em produção antes disso.
"""

from playwright.sync_api import BrowserContext, sync_playwright

from scraper.config import CHROMIUM_EXECUTABLE_PATH, OnticConfig


def login(config: OnticConfig) -> BrowserContext:
    playwright = sync_playwright().start()
    browser = playwright.chromium.launch(
        headless=True, executable_path=CHROMIUM_EXECUTABLE_PATH
    )
    context = browser.new_context()
    page = context.new_page()

    page.goto(config.login_url, wait_until="networkidle")

    # TODO: ajustar seletores conforme o HTML real do formulário.
    page.fill("#username", config.username)
    page.fill("#password", config.password)
    page.click("button[type=submit]")

    page.wait_for_load_state("networkidle")

    return context
