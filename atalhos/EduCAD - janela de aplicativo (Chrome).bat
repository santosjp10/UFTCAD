@echo off
rem Abre o EduCAD numa janela própria, sem abas nem barra de endereços, já em tela cheia.
set URL=https://SEU-USUARIO.github.io/educad/
start "" chrome --app="%URL%" --start-fullscreen
