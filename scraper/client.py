"""
Extratores de dados da plataforma Ontic/Untic.

Cada método aqui é um placeholder: será implementado depois que mapearmos,
junto com o usuário, quais páginas/rotas existem dentro do painel logado
(estratégias, relatórios de performance, assinantes/conversões, repasses).
"""

from playwright.sync_api import BrowserContext


class OnticClient:
    def __init__(self, context: BrowserContext):
        self.context = context

    def list_strategies(self) -> list[dict]:
        raise NotImplementedError("Mapear a página de listagem de estratégias.")

    def get_strategy_performance(self, strategy_id: str) -> dict:
        raise NotImplementedError("Mapear a página de performance por estratégia.")

    def get_subscribers_and_conversions(self) -> dict:
        raise NotImplementedError("Mapear a página de assinantes/conversões.")

    def get_repasses(self) -> dict:
        raise NotImplementedError("Mapear a página de repasses/financeiro.")
