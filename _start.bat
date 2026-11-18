@echo off
rem Inicia a Evidia local (API operacional + frontend). Mesma rotina do _start.ps1:
rem cria o venv, instala dependencias, aplica migracoes, sobe a API com --reload,
rem aguarda o healthcheck e abre o navegador.
rem Opcoes: -NoBrowser  -FrontendOnly  -BackendOnly
set PYTHONPATH=.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0_start.ps1" %*
