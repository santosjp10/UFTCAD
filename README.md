# EduCAD 2D

**Acesse o aplicativo:** https://santosjp10.github.io/UFTCAD/ — funciona no navegador e pode ser instalado (PWA), inclusive sem internet depois da primeira abertura.

[![Testes](https://github.com/santosjp10/UFTCAD/actions/workflows/testes.yml/badge.svg)](https://github.com/santosjp10/UFTCAD/actions/workflows/testes.yml)

Software educacional livre de CAD 2D para a disciplina de **Desenho Técnico** (Ciências Agrárias e Agronomia). Roda inteiramente no navegador, sem instalação, com interface e dinâmica de comandos inspiradas no AutoCAD.

> Uso educacional. Não afiliado ao AutoCAD® nem a qualquer software comercial.

## Como usar

- **Online:** acesse o endereço do GitHub Pages do repositório e clique em **"Abrir aplicativo CAD em tela cheia"**.
- **Como aplicativo do computador:** no Chrome ou no Edge, clique em **⬇ Instalar** na barra superior. O EduCAD passa a abrir pelo ícone da área de trabalho, em janela própria, e funciona sem internet.
- **Tablet ou celular:** toque = clique, arrastar = mover a vista, pinça = zoom, toque longo = Enter; use a barra de toque para Enter, Esc, Desfazer e teclado.
- **Cópia de segurança:** o desenho é guardado automaticamente no navegador (8 s após cada alteração). Se o EduCAD for fechado sem salvar, ao reabrir aparece **Recuperar desenhos**. Em PCs compartilhados, digite `LIMPARRECUPERACAO` ao terminar.
- **Laboratório:** use os atalhos da pasta `atalhos/` para abrir direto em tela cheia, ou em modo quiosque nas avaliações.
- **Offline, sem instalar:** baixe o `index.html` e abra-o no navegador. A tela cheia funciona; a instalação como aplicativo exige o endereço do GitHub Pages.

Durante o uso: **⛶** ou `TELACHEIA` alterna a tela cheia; **Ctrl+0** ou `LIMPA` oculta faixa de opções e painéis.

O aplicativo abre com uma área de desenho em branco. Digite os comandos como no AutoCAD (`L`, `C`, `REC`, `M`, `CO`, `RO`, `O`, `TR`...) e confirme com Enter ou Espaço. Passe o mouse sobre um botão para ver o comando equivalente. Digite `HELP` para ver a lista, ou `DEMO` para carregar um desenho de exemplo. Coordenadas: `10,20`, `@5,3`, `@10<45` ou apenas a distância na direção do cursor.

### Edição com grips e precisão

Selecione um objeto e clique numa alça azul para estirá-lo. A tecla Espaço alterna entre mover, girar, escalar e espelhar. Os snaps de objeto incluem extremidade, ponto médio, centro, interseção, quadrante, perpendicular, tangente e mais próximo. F3 liga e desliga todos. Durante um comando, digite `PER`, `TAN` e similares para forçar um modo no próximo ponto. O painel de propriedades edita os objetos selecionados, e o painel de seleção permite digitar comprimento, raio, ângulo e outras medidas.

### Muitos pontos de uma vez (coordenadas de planilha)
- **Durante PL, L, SPL ou PO**, copie as colunas X e Y do Excel, do LibreOffice ou do Google Planilhas e cole na linha de comando (Ctrl+V). Cada linha vale como um ponto digitado. O formato brasileiro é aceito (vírgula decimal, tabulação ou ponto e vírgula), assim como `x,y`, `@dx,dy` e linhas com comandos, como `F` para fechar.
- **`PONTOS`** (botão Pontos XY) importa uma tabela colada ou um arquivo CSV/TXT. O separador, o decimal, o cabeçalho e as colunas X (Este) e Y (Norte) são reconhecidos sozinhos. A janela também oferece:
  - unidade da tabela (mm, cm, m, km);
  - deslocamento para perto da origem, para coordenadas UTM;
  - polilinha aberta ou polígono fechado;
  - marcadores e rótulos na camada Pontos;
  - pré-visualização, área (m² e ha) e perímetro.
  Um Ctrl+Z desfaz tudo.
- **`PO`** cria pontos, exportados e importados como POINT no DXF.

### Biblioteca de blocos
**Biblioteca** (`Ctrl+3`, `BIBLIOTECA`) abre uma paleta flutuante com miniaturas por categoria e busca:
- **Arquitetura:** portas, janelas, louças, cozinha, móveis, camas, escadas, vegetação, automóvel, norte, nível e corte.
- **Topografia:** marcos, vértices, pontos, RN, postes, boca de lobo, PV, bueiro, hidrografia, vegetação, edificações e cercas.
- **Mecânico:** rugosidade, seta de corte, marca de centro e solda.

Para inserir, clique no bloco e depois no desenho. Arraste para girar, ou digite o ângulo; `M` espelha e `E` muda a escala. A inserção repete até Esc.

A escala é automática: os objetos reais são desenhados em metros, e os símbolos têm tamanho impresso fixo, conforme a escala de anotação. Cada item vai para a sua camada (ARQ-PORTA, TOP-PONTOS…).

Portas, janelas, escadas e camas têm parâmetro (vão, degraus, largura).

Os blocos do desenho podem ser guardados em **Meus blocos**, que ficam neste navegador.

### Modelos de desenho (templates)
**Novo** (`Ctrl+N`, `NEW`, `MODELOS`) abre a biblioteca de modelos:
- **Padrão:** o desenho inicial de sempre, em milímetro.
- **Desenho Mecânico:** milímetro, A4 paisagem, 1:1. Camadas da NBR 8403 (contorno, oculta, centro, corte, hachura, cotas). Cota MECÂNICO ABNT e fonte ISOCPEUR.
- **Desenho Arquitetônico:** metro, A3 paisagem, 1:50. Camadas ARQ- (paredes, portas, janelas, mobiliário, cotas, eixos…). Cota com traço oblíquo (3,50). Blocos de portas e janela.
- **Desenho Topográfico:** metro, ângulos em GMS, A3 paisagem, 1:1000. Camadas TOP- (pontos, curvas de nível, limites, edificações, vias, hidrografia, coordenadas…). Blocos MARCO, RN e ÁRVORE.

Cada modelo já vem com o carimbo preenchido, a viewport na escala, alturas de texto, hachura e grade. Tudo pode ser alterado depois.

Em **Meus modelos** você pode guardar o desenho atual como modelo, no navegador, ou usar um arquivo `.json` como modelo.

### Fontes dos textos e espessuras de linha (compatibilidade com o AutoCAD)
- **Fonte de cada texto:** escolha no editor de texto ou no painel de propriedades.
  - Convencionais: Arial, Arial Narrow, Calibri, Verdana, Times New Roman, Courier New e Consolas.
  - De CAD: ISOCPEUR (letra técnica ISO/ABNT), romans.shx, simplex.shx e txt.shx.
- **`ST` / `ESTILO`:** define a fonte padrão do desenho (o estilo Standard; Arial, se nada for escolhido) e aplica a fonte aos textos selecionados ou a todos.
- **No DXF,** cada fonte vira um estilo de texto com o arquivo real (arial.ttf, times.ttf, isocpeur.ttf, romans.shx…), e o AutoCAD mostra a fonte escolhida em vez de txt.shx. As cotas usam o estilo da fonte do seu estilo de cota.
- **No PDF,** os textos saem em Helvetica, Times ou Courier, conforme a fonte.
- **Espessuras:** camada 0 com 0,35 mm; Construção, Dimensão e Hachura com 0,18 mm (NBR 8403).
  - O DXF abre no AutoCAD com o botão **LWT desligado**, como os desenhos do próprio AutoCAD. As espessuras continuam gravadas para a impressão.
  - Uma opção na exportação abre o arquivo já com o LWT ligado.
  - As listas de espessura têm os valores do AutoCAD (0,05 a 2,11 mm).

### Salvar e exportar
- **Salvar** (`SAVE`) e **Exportar** (`EXPORT`) abrem a mesma janela, com o nome do arquivo, o formato e o local.
- **Formatos:** Desenho EduCAD (.json), DXF 2000, DXF R12, DXF para converter em DWG, PDF (layout atual ou todos), SVG e PNG.
- **Onde o arquivo vai:**
  - No **Chrome** e no **Edge** do computador, o botão Salvar… abre a janela do sistema, onde se escolhe a pasta e se confirma.
  - Nos outros navegadores, o arquivo é baixado com o nome escolhido.
- **Ctrl+S** (`QSAVE`) grava de novo no mesmo arquivo, sem perguntar. **Ctrl+Shift+S** = Salvar como.
- **Abrir** pela janela do sistema também guarda o arquivo para o Ctrl+S.

### Cota com distância digitada
- Na cota linear (`DLI`) e na alinhada (`DAL`), depois dos dois pontos, digite a distância entre a linha de cota e o 2º ponto, por exemplo `10`.
- A cota fica do lado onde está o cursor; um número negativo inverte o lado.
- No `DLI`, `H` ou `V` fixam a cota horizontal ou vertical.
- Em scripts: `DLI 0,0 100,0 10`.

### Margens da folha (ABNT NBR 16752:2020)
- O Layout 1, os layouts novos e a troca de formato usam as margens da NBR 16752:2020: **esquerda 20 mm**, **superior, direita e inferior 10 mm**, em todos os formatos (A0 a A4).
- A moldura do carimbo, a viewport automática e a plotagem da "área imprimível" seguem essas margens.
- **Carimbo (legenda):** no A4 retrato, ocupa toda a largura útil entre as margens (180 mm). Nas folhas largas, tem 178 mm no canto inferior direito. Acompanha sozinho as mudanças de margem, formato e orientação, mantendo o que foi escrito nos campos.
- Os valores podem ser mudados no painel do layout. O botão **NBR** volta ao padrão da norma.
- Desenhos antigos que usavam as margens padrão anteriores (NBR 10068: 25/7 mm) são atualizados ao abrir. Margens personalizadas são mantidas.

### Textos com várias linhas e vários tamanhos
- A ferramenta **Texto** (DT) e o **Texto M** (MTEXT) abrem o mesmo editor:
  - Enter quebra a linha; Ctrl+Enter confirma.
  - Os botões **Título ×2**, **Subtítulo ×1,5**, **Normal** e **Nota ×0,75**, ou uma altura em mm, mudam o tamanho do trecho selecionado. Sem seleção, mudam a linha onde está o cursor.
- Texto de uma linha e de um tamanho continua sendo um TEXT comum. Com várias linhas ou tamanhos, vira uma única caixa de texto (MTEXT).
- Os tamanhos ficam gravados com os códigos do AutoCAD (`{\H2x;Título}`), então saem no DXF e voltam na importação.

### ZOOM como no AutoCAD
- `Z` (ou `ZOOM`) pergunta as opções:

| Opção | O que faz |
|---|---|
| **Tudo** | enquadra os objetos e a origem |
| **Centro** | centraliza num ponto, com altura ou nX |
| **Extensão** | enquadra o desenho; é a resposta padrão do Enter |
| **Anterior** | volta à vista anterior |
| **Escala** | aplica um fator |
| **Janela** | enquadra dois cantos (um ponto digitado ou clicado também inicia a janela) |
| **Objeto** | enquadra os objetos selecionados |

- Fatores: `2X` é relativo à vista atual; `2` é relativo à extensão do desenho; `1/50XP`, dentro de uma viewport (MSPACE), define a escala 1:50.
- Atalhos: `ZE` (extensão), `ZJ` (janela), `ZP` (anterior), `ZA` (tudo) e `ZO` (objeto). Há botões **Janela** e **Anterior** no grupo Navegar.
- O histórico guarda as 10 últimas vistas de cada espaço (Model, cada layout, cada viewport). Giros seguidos da roda contam como uma mudança.
- Duplo clique no botão do meio do mouse = Extensão.

### Topografia: poligonal
- **`POLIGONAL`** (aba Educacional → Topografia) calcula uma poligonal fechada ou aberta a partir da caderneta de campo. A caderneta pode ser digitada ou colada do Excel.
- **Medidas aceitas:**
  - ângulos horários ou anti-horários, mais o azimute de partida;
  - azimutes ou rumos (NE, SE, SO, NO; L/E e O/W).
  Os ângulos podem vir em `114°06'00"`, `114 06 00`, `114d06'` ou em graus decimais.
- **Erros e tolerâncias:**
  - erro angular, com reconhecimento automático de ângulos internos ou externos, e tolerância k"·√n;
  - erro linear (eE, eN, e) e precisão 1:P/e, com o mínimo configurável.
- **Compensação:** o erro angular é distribuído em partes iguais, e o linear proporcionalmente às distâncias.
- **Resultados:** coordenadas, área (Gauss) em m² e ha, perímetro e uma planilha de cálculo que pode ser copiada ou salva em CSV.
- **No desenho:** polígono, marcos, nomes e quadro de coordenadas, tudo num único Ctrl+Z.
- **Coordenada polar topográfica na linha de comando:** `@85.24<AZ96d56'30"` (azimute) e `@48.12<N45d30'E` (rumo).

### Scripts com variáveis e repetição
| Diretiva | Exemplo |
|---|---|
| Variável | `#SET ex = 3000` |
| Repetição com contador | `#FOR i = 0 TO 9 [STEP 2]` … `#END` |
| Repetição simples | `#REPEAT 5` … `#END` |
| Condição | `#IF mod(i,2) == 0` … `#ELSE` … `#END` |
| Expressão | `CIRCLE {i*ex},0 200` |

- Há versões em português: `#PARA … ATE … PASSO`, `#REPETIR`, `#SE`, `#SENAO` e `#FIM`.
- As expressões usam um interpretador próprio, sem `eval`. Aceitam:
  - os operadores `+ - * / % ^` e as comparações;
  - `e/ou/não`;
  - as funções `sin cos tan atan2 sqrt abs round min max mod`, com ângulos em graus.
- Um erro aponta a linha do arquivo original.
- **Salvar expandido** gera um `.scr` comum, que roda no AutoCAD e no ZWCAD.

### Scripts (.scr), como no AutoCAD
- **`SCRIPT`** (botão Script) abre o editor de scripts. Nele é possível:
  - escrever, colar, abrir ou salvar arquivos `.scr` (ANSI e CRLF, que abrem também no AutoCAD e no ZWCAD);
  - escolher um dos 3 exemplos;
  - executar na hora ou "ver desenhando".
  Um Ctrl+Z desfaz o script inteiro, e um erro mostra a linha responsável.
- **Regras do AutoCAD:**
  - cada espaço ou quebra de linha vale como Enter;
  - linha em branco conclui o comando;
  - `;` no início da linha é comentário;
  - no TEXT, o resto da linha é o texto;
  - `DELAY` pausa e `RSCRIPT` repete (com limite).
- **Sem janelas, para uso em scripts:** `-LAYER` (Criar, Definir, Novo, Cor, Ligar, Desligar, Travar), `TEXT`, `POLYGON`, `ZOOM E` e as variáveis `OSMODE`, `ORTHOMODE`, `GRIDMODE`, `CLAYER`, `TEXTSIZE`, `HPNAME`, `HPSCALE` e `HPANG`.
- **Objetos e seleção pelo teclado:** um ponto digitado onde o comando pede um objeto vale como clique, e a seleção aceita `L` (último), `P` (anterior), `J` (janela) e `C` (cruzando).
- **`GRAVARSCRIPT`** grava o que se faz na linha de comando e com o mouse e devolve o script, que pode ser editado e executado de novo.

Exemplo:
```
; canteiro de 1 x 5 m (desenho em mm)
-LAYER M Canteiros C verde Canteiros

RECTANG 0,0 1000,5000
HPNAME EDU_CULTIVO
HPSCALE 20
HATCH 500,2500

TEXT 0,5200 150 0 Canteiro 1

ZOOM E
```

### Hachuras

`H` (ou o botão Hachura) abre a galeria de padrões: básicos, gerais, materiais (ANSI), construção, solos e terreno, vegetação e cultivo. Escolha o padrão e o tamanho e clique dentro das áreas. O tamanho padrão equivale à escala 1 do AutoCAD em mm. Para desenhos em verdadeira grandeza (um terreno de 8000 mm, por exemplo), aumente o tamanho, por exemplo para 150. Para criar um padrão novo, acrescente uma linha em `HPAT` (arquivo `src/js/29-padroes-de-hachura.js`), no mesmo formato das famílias de linhas do AutoCAD (`.pat`).

### Aula guiada

Na aba **Educacional**, o botão **🎓 Aula guiada** (ou o comando `AULA`) abre exercícios passo a passo: placa com furos, vistas ortográficas no 1º diedro e planta de canteiros com prancha 1:50. Cada passo é conferido automaticamente no desenho, e o botão **Verificar** diz o que falta ou está errado.

**Para criar um exercício**, acrescente um objeto em `EX_LIST` (arquivo `src/js/28-aula-guiada.js`) e rode `python build.py`:

```js
{id:'canteiro', title:'4. Canteiro simples', level:'Iniciante · 10 min',
 goal:'Retângulo em verdadeira grandeza e cota.', norm:'NBR 10126', view:{x:-200,y:-600,w:1800,h:5800},
 intro:'Canteiro de 1,20 m × 5,00 m.',
 steps:[
  {t:'Contorno', i:'Desenhe 1200 × 5000 com canto em <b>0,0</b>.', h:'<code>REC</code> <code>0,0</code> <code>@1200,5000</code>',
   c:function(){ var r=exPoly(exSegs(),exRectPts(0,0,1200,5000)); return r.ok?r:{ok:false,msg:exMissMsg(r,'Canteiro')}; }},
  {t:'Cota', i:'Cote a largura <b>1200</b> com o estilo ABNT.', h:'<code>DLI</code>',
   c:function(){ return exHasDim(1200,'dim','ABNT'); }}
 ]}
```

### Layout (espaço do papel)

Desenhe no **Model** em verdadeira grandeza e monte a prancha num **Layout**:

1. A viewport já vem na escala da NBR 8196 que cabe na folha. Para mudar, use **Escala da viewport** na barra inferior.
2. Use **🗂 Carimbo ABNT** para inserir a margem e a legenda. Os campos são editados com duplo clique.
3. Textos, cotas e notas podem ser feitos direto na folha, em mm.
4. Para ajustar o enquadramento, dê duplo clique na viewport (**MSPACE**); use a roda do mouse para zoom e arraste para mover a vista.
5. Para detalhes ampliados, use `MV` (MVIEW): Poligonal, Objeto (um círculo vira o recorte do detalhe) ou 2/3/4 viewports. Use ❄ nas camadas para congelá-las só na viewport atual e 🔒 para travar a escala.
6. Use **⚙ Página** para a folha de saída, a área e a escala de plotagem, e **📄 PDF** para o PDF vetorial em escala exata (imprima em "Tamanho real / 100%"). Cotas e textos **anotativos** mantêm a mesma altura no papel em qualquer viewport.
7. Camadas com 🖨 desligado (como VIEWPORTS) não saem na impressão nem no PDF.

### Estilos de cota (DDIM)

O comando `DDIM` (ou `DIMSTYLE`, `DST`) abre o gerenciador de estilos de cota, semelhante ao do AutoCAD. Nele é possível criar e modificar estilos em sete abas: Linhas, Símbolos e setas, Texto, Ajuste, Unidades primárias, Unidades alternativas e Tolerâncias. A pré-visualização é atualizada ao vivo. Cada campo indica a variável equivalente do AutoCAD. Os estilos são salvos junto com o desenho.

## Publicar no GitHub Pages

1. Envie **todos** os arquivos para a branch `main` (inclusive `manifest.webmanifest`, `sw.js` e a pasta `icons/`, necessários para a instalação como aplicativo).
2. Em **Settings → Pages**, escolha *Deploy from a branch* com `main` e a pasta `/ (root)`.
3. O app ficará disponível em `https://<usuario>.github.io/<repositorio>/`.

## Formatos

| Formato | Uso |
|---|---|
| **PDF vetorial** | Prancha do layout em escala exata (uma página por layout), pelo botão 📄 PDF ou Exportar |
| **DXF 2000** (padrão) | AutoCAD 2000+, ZWCAD, BricsCAD, DraftSight, LibreCAD, QGIS. Entidades nativas, cotas editáveis com estilos, cores RGB, espessuras e tipos de linha, hachuras e layouts com viewports |
| **DWG** | Gera um DXF 2000 e mostra como convertê-lo em DWG (AutoCAD/ZWCAD → Salvar como, ou ODA File Converter, gratuito) |
| DXF R12 | Compatibilidade máxima (CNC, programas antigos). Curvas e cotas simplificadas |
| JSON | Formato nativo, editável no EduCAD (inclui estilos de cota e blocos) |
| **Abrir DXF** | Arquivos `.dxf` de AutoCAD, ZWCAD, LibreCAD, QGIS etc. pelo botão Abrir ou `DXFIN` (`IMPORTDXF` anexa ao desenho atual) |
| SVG | Vetorial em mm (escala 1:1), para Inkscape e relatórios |
| PNG | Imagem da tela |

Comandos: `EXPORT` (diálogo), `DXFOUT` (DXF 2000 direto), `DWGOUT` (DXF para conversão em DWG).

## Desenvolvimento

O código está dividido em módulos; o `index.html` publicado é montado a partir deles.

```
src/
├── app.html                 estrutura da página (marcadores @@CSS@@ e @@JS@@)
├── css/app.css              estilos
├── dev.html                 versão de desenvolvimento (gerada; carrega os módulos separados)
└── js/
    ├── 01-estado-e-inicializacao.js      estado global e início do aplicativo
    ├── 02-geometria-basica.js            coordenadas, snaps e seleção por clique
    ├── 03-cliques.js                     comandos de desenho básicos
    ├── 04-entidades-e-transformacoes.js  criação, MOVE/ROTATE/SCALE/MIRROR, OFFSET
    ├── 05-desfazer-selecao-vista.js      desfazer/refazer, janela, zoom
    ├── 06-desenho.js                     renderização no canvas
    ├── 07-eventos-e-linha-de-comando.js  mouse, teclado e linha de comando
    ├── 08-entrada-dinamica.js            Dynamic Input
    ├── 09-interface-e-arquivos.js        modos, camadas, salvar/abrir
    ├── 10-exportacao.js                  DXF 2000, DXF R12, SVG, PNG
    ├── 11 … 24                           cotas (DDIM), grips/OSNAP, tela cheia/PWA, FILLET,
    │                                     TRIM/EXTEND, motor de comandos, polilinhas, hachura,
    │                                     MTEXT/LEADER/blocos, importação DXF, toque, unidades, layout
```

Fluxo de trabalho:

1. Edite os arquivos de `src/`. Para testar sem montar, abra `src/dev.html` no navegador.
2. Rode `python build.py` para gerar o `index.html`.
3. Rode os testes: `python tests/run_all.py`.
4. Envie tudo (inclusive o `index.html` gerado) para o GitHub. O GitHub Actions repete a conferência e os testes.

## Testes

```bash
pip install playwright ezdxf pypdf
playwright install chromium
python tests/run_all.py          # todas as baterias, com resumo
python tests/test_navegador.py   # 32 testes de regressão (v6.1)
python tests/test_cotas.py       # 30 testes do DDIM e do motor de cotas (v6.2)
python tests/test_dxf.py         # 23 testes da exportação DXF 2000 / DWG (v6.3)
python tests/test_edicao.py      # 39 testes de grips, OSNAP, ByLayer e propriedades (v6.4)
python tests/test_tela.py        # 18 testes de tela cheia, tela limpa e aplicativo instalável (v6.5)
python tests/test_fillet.py      # 31 testes do FILLET no estilo AutoCAD (v6.7)
python tests/test_trim_extend.py # 26 testes de TRIM e EXTEND no modo Rápido (v6.8)
python tests/test_comandos.py    # 47 testes do motor de comandos (v7.0)
python tests/test_polilinhas.py  # 34 testes de polilinhas com arcos, PEDIT, JOIN, BREAK e STRETCH (v7.1)
python tests/test_pacote3.py     # 40 testes de hachura por contorno, MTEXT, LEADER, blocos e importação de DXF (v7.2)
python tests/test_plataforma.py  # 23 testes de montagem modular, alta resolução, toque e telas estreitas (v7.3)
python tests/test_layout.py      # 37 testes do espaço do papel: layouts, viewports, carimbo, plotagem (v7.4)
python tests/test_layout_l2.py   # 22 testes de MVIEW, escala travada, camadas por viewport e camadas que não imprimem (v7.5)
python tests/test_layout_l3.py   # 30 testes de PDF vetorial, configuração de página, anotação escalável e layouts no DXF (v7.6)
python tests/test_autosave.py    # 25 testes de salvamento automático e recuperação (v7.7)
python tests/test_dicas.py       # 24 testes: dica de cada botão = comando digitável, com o mesmo resultado (v7.8)
python tests/test_botoes.py      # 30 testes dos botões dos comandos da v7 (v7.9)
python tests/test_cotas_serie.py # 29 testes de cotas em série (DCO) e de base (DBA) (v8.0)
python tests/test_aula.py        # 39 testes da Aula guiada e da verificação automática (v8.1)
python tests/test_hachuras.py    # 29 testes do catálogo de padrões de hachura (v8.2)
python tests/test_pontos.py      # 37 testes de pontos, coordenadas coladas e importação de tabelas (v8.3)
python tests/test_scripts.py     # 58 testes de scripts .scr, comandos sem janela, seleção por teclado e gravação (v8.4)
python tests/test_poligonal.py   # 54 testes de poligonal, azimutes/rumos, variáveis nos scripts e exercício de topografia (v8.5)
python tests/test_zoom.py        # 39 testes do ZOOM com opções, histórico de vistas e blocos nativos no DXF (v8.6)
python tests/test_validacao.py   # 6 testes: o kit de validação é gerado e confere com os arquivos (v8.6)
python tests/test_texto.py       # 33 testes de textos com várias linhas e tamanhos e das cotas verticais (v8.7)
python tests/test_margens.py     # 20 testes das margens da ABNT NBR 16752:2020 no layout (v8.8)
python tests/test_arquivos.py    # 44 testes da janela Salvar/Exportar e da cota com distância digitada (v8.9)
python tests/test_fontes.py      # 42 testes das fontes dos textos e das espessuras de linha no DXF (v8.10)
python tests/test_carimbo.py     # 19 testes do carimbo ajustado à largura útil da folha (v8.11)
python tests/test_templates.py   # 41 testes dos modelos de desenho (v8.12)
python tests/test_biblioteca.py  # 52 testes da biblioteca de blocos (v8.13)
```

Os testes rodam num navegador real e cobrem undo/redo, diálogos, geometria, snap, segurança no carregamento de arquivos, estilos de cota e a validade dos arquivos DXF e SVG.

Os testes rodam automaticamente no GitHub a cada envio (aba **Actions**).

## Validação externa (AutoCAD, ZWCAD, impressão e tablet)

A pasta [`validacao/`](validacao/) traz o kit do R9:
- 5 desenhos de teste em DXF 2000 e R12:
  1. geometria;
  2. texto e cotas;
  3. hachuras;
  4. camadas e blocos;
  5. layout em escala.
- A folha de calibração em PDF, para medir com régua.
- O [roteiro](validacao/ROTEIRO.md), com 34 conferências e os valores esperados.
- A planilha [`RESULTADOS.md`](validacao/RESULTADOS.md), para registrar o que for conferido. Também há um modelo de *issue* "Resultado de validação".

Antes da conferência manual, os arquivos passam por quatro leitores independentes: ezdxf, dxfgrabber, dxf-parser e dxf. O resultado está em [`PRE-VALIDACAO.md`](validacao/PRE-VALIDACAO.md). Para gerar o kit de novo depois de mudar o aplicativo: `python validacao/gerar_kit.py`.

## Versões

Veja o [CHANGELOG](CHANGELOG.md). A v6.1 é a versão de estabilização. A v6.2 adiciona o gerenciador de estilos de cota (DDIM). A v6.3 adiciona a exportação DXF 2000 e o caminho para DWG. A v6.4 adiciona grips, novos OSNAPs, ByLayer e edição de propriedades e geometria da seleção. A v6.5 adiciona a abertura em tela cheia, a tela limpa e a instalação como aplicativo. A v6.6 identifica o desenvolvedor na seção Sobre. A v6.7 traz o FILLET com a sequência do AutoCAD e o comando EXPLODE. A v6.8 traz TRIM e EXTEND no modo Rápido do AutoCAD 2021+. A v7.0 traz o motor de comandos no estilo AutoCAD (seleção dentro do comando, opções entre colchetes, aliases padrão) para ERASE, MOVE, COPY, ROTATE, SCALE, MIRROR, OFFSET e CHAMFER. A v7.1 traz polilinhas com arcos e os comandos PEDIT, JOIN, BREAK e STRETCH. A v7.2 traz hachura por ponto interno, MTEXT, LEADER, blocos (BLOCK/INSERT) e a abertura de arquivos DXF. A v7.3 traz o código dividido em módulos, testes automáticos no GitHub, nitidez em telas de alta resolução e uso por toque em tablets. A v7.4 transforma a aba Layout num espaço do papel como o do AutoCAD. A v7.5 completa as viewports (MVIEW poligonal e por objeto, escala travada, camadas por viewport). A v7.6 traz o PDF vetorial em escala exata, a configuração de página, a anotação escalável e os layouts no DXF. A v7.7 traz o salvamento automático com recuperação. A v7.8 corrige as dicas da faixa de opções e as confere com teste automático. A v7.9 traz botões para os comandos da v7 (Anotar, Blocos, Esticar, Interromper, Unir, Editar PL, Explodir, Viewports). A v8.0 traz as cotas em série (DCO) e de base (DBA). A v8.1 traz a Aula guiada, com exercícios passo a passo e verificação automática. A v8.2 traz 29 padrões de hachura novos (materiais ANSI, construção, solos, vegetação e cultivo), com galeria de miniaturas. A v8.3 traz a entrada de muitos pontos: coordenadas coladas da planilha na linha de comando, o comando PONTOS (tabela do Excel/CSV, UTM, polígono com área e perímetro) e a entidade PONTO. A v8.4 traz os scripts (.scr) no padrão do AutoCAD, com editor, exemplos, gravação e versões de linha de comando de LAYER, TEXT, POLYGON e ZOOM. A v8.5 traz a poligonal topográfica (erros, tolerâncias, compensação, área e quadro de coordenadas), azimutes e rumos na linha de comando, variáveis e repetição nos scripts e o exercício 4 da Aula guiada (topografia). A v8.6 traz o ZOOM com opções e histórico de vistas (R5), o kit de validação externa (R9) e os blocos exportados como BLOCK/INSERT no DXF 2000. A v8.7 traz textos com várias linhas e vários tamanhos na mesma caixa e as cotas verticais com o texto sempre à esquerda da linha de cota (ABNT), feitas em qualquer sentido. A v8.8 adota as margens da folha da ABNT NBR 16752:2020 (esquerda 20 mm, demais 10 mm). A v8.9 traz a janela Salvar/Exportar (nome, formato, pasta e confirmação) e a cota com distância digitada. A v8.10 traz a escolha da fonte dos textos (preservada no DXF) e espessuras de linha compatíveis com o AutoCAD. A v8.11 ajusta o carimbo à largura útil da folha (A4 retrato de margem a margem). A v8.12 traz os modelos de desenho (Novo → Padrão, Mecânico, Arquitetônico, Topográfico e Meus modelos). A v8.13 traz a biblioteca de blocos (paleta visual com 78 itens de arquitetura, topografia e mecânica, Meus blocos).

## Licença

MIT. Veja [LICENSE](LICENSE).
