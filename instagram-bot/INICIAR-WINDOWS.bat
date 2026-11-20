@echo off
chcp 65001 >nul
title Bot de DM do Instagram
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js nao encontrado. Instale a versao LTS em https://nodejs.org
  echo e abra este arquivo de novo.
  pause
  exit /b 1
)
if not exist node_modules\wrangler (
  echo Instalando as dependencias pela primeira vez, aguarde 1 a 2 minutos...
  call npm install
  if errorlevel 1 ( pause & exit /b 1 )
)
node scripts\bot.mjs menu
pause
