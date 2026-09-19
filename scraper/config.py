import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()

# Neste ambiente de desenvolvimento (sandbox), os binários do Chromium já
# vêm pré-instalados nesse caminho fixo. Em outros ambientes (ex.: GitHub
# Actions), esse caminho não existe e o Playwright deve resolver o browser
# normalmente (após um `playwright install chromium`) — daí o fallback None.
_SANDBOX_CHROMIUM = "/opt/pw-browsers/chromium"
CHROMIUM_EXECUTABLE_PATH = _SANDBOX_CHROMIUM if os.path.exists(_SANDBOX_CHROMIUM) else None


@dataclass(frozen=True)
class OnticConfig:
    login_url: str
    username: str
    password: str

    @classmethod
    def from_env(cls) -> "OnticConfig":
        login_url = os.environ.get("ONTIC_LOGIN_URL", "")
        username = os.environ.get("ONTIC_USERNAME", "")
        password = os.environ.get("ONTIC_PASSWORD", "")

        missing = [
            name
            for name, value in (
                ("ONTIC_LOGIN_URL", login_url),
                ("ONTIC_USERNAME", username),
                ("ONTIC_PASSWORD", password),
            )
            if not value
        ]
        if missing:
            raise RuntimeError(
                f"Faltam variáveis no .env: {', '.join(missing)}. "
                "Copie .env.example para .env e preencha."
            )

        return cls(login_url=login_url, username=username, password=password)
