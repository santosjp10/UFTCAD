@echo off
rem MODO QUIOSQUE: tela cheia travada, sem nenhum elemento do navegador.
rem Útil em laboratório e avaliações. Para sair: Alt+F4.
set URL=https://SEU-USUARIO.github.io/educad/
start "" msedge --kiosk "%URL%" --edge-kiosk-type=fullscreen --no-first-run
