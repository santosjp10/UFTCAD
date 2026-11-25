# Roteiro de validação externa — EduCAD 2D v8.13

Este roteiro confere, em programas de CAD de mercado, os arquivos que o EduCAD gera (R9 do parecer técnico). Leva cerca de 40 minutos por programa.

**Arquivos do kit** (nesta pasta): `01` a `05` em DXF 2000 (e as versões `-R12.dxf`, para programas antigos), `06-calibracao.pdf`, este roteiro e a planilha `RESULTADOS.md`.

## 1. AutoCAD e ZWCAD (cada arquivo DXF 2000)

1. Abra o arquivo (OPEN). Anote se apareceu alguma mensagem de erro ou de recuperação.
2. Digite `AUDIT` e responda **Sim** para corrigir. **Esperado: 0 erros encontrados.**
3. `ZOOM` `E` e compare o desenho com a prévia em `previas/` (quando existir) ou com o próprio EduCAD.
4. Faça as conferências da tabela do arquivo e marque ✓ ou ✗ em `RESULTADOS.md`.
5. Salve como DWG (SAVEAS), feche, reabra o DWG e confira de novo o item 1 da tabela.

### 01-geometria.dxf

Linhas, círculo, arco, elipse inclinada, polilinha com arco, spline, pontos, retângulo e hexágono.

| # | O que fazer | Valor esperado |
|---|---|---|
| 1 | LIST na linha inclinada (de 0,0 a 60,80) | comprimento 100.0000, ângulo 53.1301° |
| 2 | LIST no círculo | centro 150,50; raio 25.0000; área 1963.4954; circunferência 157.0796 |
| 3 | LIST no arco | centro 250,50; raio 30; ângulo inicial 0°, final 120°; comprimento 62.8319 |
| 4 | LIST na elipse | centro 350,50; eixo maior 80 (raio 40) a 30°; razão 0.5 (eixo menor 40) |
| 5 | LIST na polilinha com arco (canto 0,120) | fechada; área 6513.2741; perímetro 305.6637 |
| 6 | LIST no retângulo (canto 380,120) | área 1200.0000; perímetro 140.0000 |
| 7 | LIST no hexágono (centro 450,50) | área 2338.2686; perímetro 180.0000 |
| 8 | Clicar na spline e conferir as extremidades | começa em 150,120 e termina em 260,170 (passa pelos 4 pontos) |
| 9 | Contar os pontos (QSELECT tipo Ponto) | 3 pontos em 300,120 · 320,120 · 340,120 |

### 02-texto-e-cotas.dxf

Texto com acentos e símbolos, texto múltiplo, cotas linear, vertical, alinhada, raio, diâmetro e angular, estilos Standard e ABNT, linha de chamada.

| # | O que fazer | Valor esperado |
|---|---|---|
| 1 | Ler o texto de altura 5 | "Ação de irrigação — 25 °C ± 0,5 ⌀ 50" (acentos, °, ± e ⌀ corretos; no arquivo, °, ± e ⌀ vão como %%d, %%p e %%c, os códigos do AutoCAD) |
| 2 | Ler o texto múltiplo | duas linhas: "Linha 1" / "Linha 2 com acentuação" |
| 3 | Conferir as cotas (clicar e ver Propriedades → Medida) | 120 (Standard) · 80 · 144.2221 (alinhada) · R25 · Ø50 · 33.69° (ABNT) |
| 4 | Estilos de cota (DIMSTYLE) | Standard e ABNT existem e são usados |
| 5 | STYLE (estilos de texto): fonte do estilo Standard | Arial (arial.ttf) — não mais txt.shx |
| 6 | Mover um ponto de definição de uma cota (grip) | o valor da cota acompanha: são cotas associativas/editáveis, não linhas soltas |
| 7 | Linha de chamada com o texto | seta apontando o círculo e o texto "Furo Ø50" (no DXF, a linha de chamada vai como linhas, seta e texto) |

### 03-hachuras.dxf

Seis padrões (ANSI31, BRICK escala 2, EARTH a 30°, GRASS escala 0,5, sólido e padrão próprio EDU_CULTIVO) e uma hachura com ilha.

| # | O que fazer | Valor esperado |
|---|---|---|
| 1 | Propriedades de cada hachura → Padrão | ANSI31 · BRICK · EARTH · GRASS · SOLID · EDU_CULTIVO · ANSI37 |
| 2 | Escala e ângulo (Propriedades) | BRICK escala 2 · GRASS escala 0.5 · EARTH ângulo 30° |
| 3 | LIST na hachura com ilha | 2 contornos; área 5294.0385 (retângulo 6000 − furo 705.9615); o furo fica sem hachura |
| 4 | Sólido | SOLID preenchido (cor cheia) |
| 5 | Padrão próprio EDU_CULTIVO | aparece desenhado (linhas guardadas no arquivo, sem precisar do .pat) |

### 04-camadas-e-blocos.dxf

Camadas com cores ACI e RGB, tipos de linha, espessuras, camada que não imprime, travada e desligada; propriedades próprias; bloco MARCO inserido 3 vezes (escala 2, rotação 45°, espelhado).

| # | O que fazer | Valor esperado |
|---|---|---|
| 1 | Ao abrir: botão LWT (espessuras na tela) desligado, como no AutoCAD | LWT desligado; ao ligar, as espessuras aparecem |
| 2 | LAYER: Paredes | cor 1 (vermelho), Continuous, 0.50 mm |
| 3 | LAYER: Eixos | cor RGB 0,160,255, CENTER, 0.18 mm |
| 4 | LAYER: Ocultas | cor 3 (verde), HIDDEN, 0.25 mm |
| 5 | LAYER: NaoImprime | não plotável (ícone da impressora desligado) |
| 6 | LAYER: Travada e Desligada | Travada com cadeado; Desligada apagada (lâmpada desligada) |
| 7 | Propriedades da linha laranja tracejada | cor própria RGB 255,128,0 · DASHED · 0.70 mm (não ByLayer) |
| 8 | Bloco MARCO (INSERT / BEDIT) | definição com 3 objetos; 3 inserções |
| 9 | Propriedades das inserções | em 40,-40: escala 2, rotação 45° · em 90,-40: espelhado (escala X −1) |

### 05-layout-escala.dxf

Terreno de 20 × 15 m no Model e o layout "Prancha A3" com viewport em 1:100 e carimbo ABNT.

| # | O que fazer | Valor esperado |
|---|---|---|
| 1 | Abas de layout | existe a aba "Prancha A3" |
| 2 | PAGESETUP do layout | papel A3 (420 × 297 mm) |
| 3 | Propriedades da viewport → Escala padrão | 1:100 |
| 4 | No papel, DIST de um canto a outro do terreno (OSNAP através da viewport) | 200.0000 mm (20 m em 1:100) |
| 5 | Carimbo ABNT no layout | bloco do carimbo inserido no papel, com o título |
| 6 | No Model, cota da frente do terreno | 20000 (estilo ABNT) |

Versões R12 (`-R12.dxf`): basta abrir, rodar `AUDIT` e conferir se o desenho aparece. Em R12 as cotas, hachuras, textos múltiplos e layouts saem simplificados (explodidos) por limitação do formato.

## 2. PDF medido com régua

1. Abra `06-calibracao.pdf` e imprima em **tamanho real (100%)**, desmarcando "Ajustar à página" (A4 paisagem).
2. Meça com régua ou paquímetro: a linha horizontal e a vertical (**100,0 mm**), o quadrado (**50 × 50 mm**), o círculo (**Ø 50 mm**) e a linha da viewport 1:50 (**100,0 mm** = 5 m).
3. Tolerância: ±0,5 mm. Diferença maior costuma ser a impressora reduzindo a página; confira a opção de escala.
4. Gere um PDF do layout "Prancha A3" do `05-layout-escala` no EduCAD (aba Layout → PDF) e meça o terreno: **200 mm** em A3.

## 3. Tablet Android

1. No Chrome do tablet, abra o endereço do EduCAD no GitHub Pages e use "Instalar aplicativo" (ou "Adicionar à tela inicial").
2. Abra pelo ícone, desligue o Wi-Fi e confirme que o aplicativo abre sem internet.
3. Desenhe com o dedo: um retângulo (REC), um círculo e uma linha; use pinça para zoom e dois dedos para mover.
4. Use os botões da barra de toque (Enter, Esc, Desfazer) e a linha de comando com o teclado virtual (`REC 0,0 @100,50`).
5. Salve o desenho, feche, reabra e use RECUPERAR para conferir o salvamento automático.
6. Exporte um DXF e um PDF e confira se os arquivos aparecem em Downloads.

## 4. Como registrar

Preencha `RESULTADOS.md` (uma linha por arquivo e programa) e envie pelo GitHub: edite o arquivo e faça um commit, ou abra uma *issue* com o modelo **Resultado de validação**. Informe a versão do programa (ex.: AutoCAD 2024, ZWCAD 2025) e anexe uma captura de tela quando algo não conferir.

*Gerado automaticamente por `validacao/gerar_kit.py` em 25/11/2026. Os valores esperados foram conferidos no próprio arquivo antes de entrar neste roteiro.*
