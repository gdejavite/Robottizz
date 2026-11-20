#!/bin/bash
# Clique duplo para abrir o menu do bot (no Mac).
# Se o Mac bloquear na primeira vez: botão direito no arquivo > Abrir > Abrir.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js não encontrado. Instale a versão LTS em https://nodejs.org e abra este arquivo de novo."
  read -r -p "Enter para sair"
  exit 1
fi
if [ ! -d node_modules/wrangler ]; then
  echo "Instalando as dependências pela primeira vez, aguarde 1 a 2 minutos..."
  npm install || { read -r -p "Enter para sair"; exit 1; }
fi
node scripts/bot.mjs menu
