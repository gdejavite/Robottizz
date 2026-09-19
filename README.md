# Robottizz

Automação interna da Robotizz Trader Solutions para extrair dados da
plataforma Ontic/Untic (estratégias, performance, assinantes/conversões,
repasses) e transformá-los em relatórios e, futuramente, em um funil de
captação de assinantes direto (D2C).

## Roadmap

1. **Reconhecimento do login** (`scraper/inspect_login.py`) — abre a página
   de login e salva screenshot + HTML, sem usar credenciais. Objetivo:
   mapear os seletores do formulário.
2. **Autenticação** (`scraper/auth.py`) — login automatizado via Playwright,
   usando as credenciais do `.env`.
3. **Extração de dados** (`scraper/client.py`) — mapear e implementar, página
   a página, os pontos de dados dentro do painel logado.
4. **Relatórios** — transformar os dados extraídos nos relatórios formatados
   (papel timbrado Robotizz).
5. **Automação** — mover a execução para um agendador persistente (ex.:
   GitHub Actions com secrets criptografados), já que este ambiente de
   desenvolvimento é efêmero.

## Setup local

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # preencher com ONTIC_LOGIN_URL / USERNAME / PASSWORD
```

## Segurança de credenciais

- `.env` nunca é commitado (está no `.gitignore`).
- Dados extraídos (`data/`, `reports/`) também não são commitados — podem
  conter informações financeiras sensíveis da empresa.
- Para automação recorrente, as credenciais devem viver em um cofre de
  secrets do ambiente de execução (ex.: GitHub Actions secrets), nunca em
  texto puro no repositório.
