@echo off
rem Abre o EduCAD numa janela própria, sem abas nem barra de endereços, já em tela cheia.
rem Ajuste o endereço abaixo para o seu GitHub Pages (ou o caminho do index.html).
set URL=https://SEU-USUARIO.github.io/educad/
start "" msedge --app="%URL%" --start-fullscreen
