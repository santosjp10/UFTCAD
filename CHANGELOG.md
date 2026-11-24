# Changelog

## v8.7 — Textos com várias linhas e tamanhos; cotas verticais padronizadas

### Ferramenta de texto
- A ferramenta **Texto** (botão Texto, `DT`) passou a abrir o editor de várias linhas, o mesmo do **Texto M** (`T`/`MT`) e do **Editar texto** (`ED`).
  - Enter quebra a linha; Ctrl+Enter confirma.
  - A primeira linha fica no ponto clicado, como antes.
- **Vários tamanhos na mesma caixa de texto.** A barra do editor tem **Título ×2**, **Subtítulo ×1,5**, **Normal ×1**, **Nota ×0,75** e um campo para a altura em mm.
  - Com um trecho selecionado, o tamanho vale para o trecho; sem seleção, para a linha do cursor.
  - O editor mostra os tamanhos como vão ficar, e o rodapé lista as alturas usadas.
  - O espaçamento de cada linha segue o maior texto da linha.
- **Texto de uma linha e um tamanho** continua sendo um TEXT comum. Com várias linhas ou tamanhos, vira uma caixa de texto (MTEXT). Ao editar um TEXT e acrescentar linhas ou tamanhos, ele vira MTEXT na mesma posição.
- **Formato:** os tamanhos são guardados com os códigos do MTEXT do AutoCAD (`{\H2x;Título}`, relativo à altura base). Por isso:
  - aparecem iguais no AutoCAD e no ZWCAD pelo DXF 2000;
  - voltam ao importar o DXF. Alturas absolutas do AutoCAD (`\H5;`) são convertidas; fonte, cor e outros códigos são ignorados com segurança;
  - no DXF R12, no PDF, no SVG e ao explodir, cada trecho vira um texto com a sua altura;
  - mudar a altura base ou a escala de anotação mantém as proporções.
- Colar no editor cola apenas o texto, sem formatação de outros programas. Chaves e barras digitadas aparecem como digitadas.

### Cotas verticais
- **O texto da cota vertical fica sempre à esquerda da linha de cota, lido de baixo para cima**, como pede a ABNT, qualquer que seja o sentido em que a cota foi feita. Antes, uma cota feita de cima para baixo ficava com o texto à direita e de cabeça para baixo.
- A correção vale para cotas lineares, alinhadas na vertical, de raio e de diâmetro. Também vale na tela, no PDF, no SVG e no DXF.
- **Ponto digitado:** na cota linear (DLI), um terceiro ponto digitado na linha de comando decide se a cota é horizontal ou vertical pela posição digitada. Antes, a última posição do mouse podia virar a cota para horizontal, com valor 0.

### Outros
- Testes: `tests/test_texto.py` (33). O teste do texto em `test_navegador` usa o editor novo. Total de **836 testes**, todos passando.
- Kit de validação gerado de novo para a v8.7.

## v8.6 — ZOOM com opções (R5) e kit de validação externa (R9)

### ZOOM como no AutoCAD (R5)
- `Z` / `ZOOM` agora pergunta: `Canto da janela, fator (nX, nXP) ou [Tudo/Centro/Extensão/Anterior/Escala/Janela/Objeto] <Extensão>`.
  - **Tudo:** objetos e origem.
  - **Centro:** ponto e altura (ou nX).
  - **Extensão:** desenho inteiro; é também a resposta do Enter.
  - **Anterior:** volta à vista anterior.
  - **Escala:** `2X` é relativo à vista; `2` é relativo à extensão; `1/50XP` vale dentro de uma viewport.
  - **Janela:** dois cantos. Um ponto digitado ou clicado na pergunta já inicia a janela.
  - **Objeto:** seleciona os objetos e enquadra.
- **No MSPACE** (dentro de uma viewport do layout), ZOOM E, nX, Anterior e `1/50XP` agem sobre a vista da viewport. `1/50XP` deixa a viewport em 1:50; uma viewport travada não muda.
- **Histórico de vistas:** as 10 últimas de cada espaço (Model, cada layout, cada viewport). Giros seguidos da roda ou um arraste contam como uma única mudança. O histórico é limpo em Novo e Abrir.
- **Atalhos** `ZE`, `ZJ`, `ZP`, `ZA` e `ZO`, e botões **Janela** e **Anterior** no grupo Navegar.
- **Duplo clique no botão do meio** = Extensão.
- Antes, `Z` ia direto para a extensão. A dica do exercício 3 da Aula guiada agora sugere `ZE`.

### Kit de validação externa (R9) — pasta `validacao/`
- **5 desenhos de teste**, gerados pelo próprio EduCAD, em DXF 2000 e R12:
  1. geometria (linhas, círculo, arco, elipse, polilinha com arco, spline, pontos);
  2. texto e cotas (acentos, °, ±, ⌀, MTEXT, 6 tipos de cota, estilos Standard e ABNT, linha de chamada);
  3. hachuras (6 padrões, escala, ângulo, ilha);
  4. camadas e blocos (cores ACI e RGB, tipos de linha, espessuras, camada que não imprime, travada e desligada, bloco com escala, rotação e espelho);
  5. layout A3 em 1:100 com carimbo.
- **Folha de calibração em PDF** (A4): linhas de 100 mm, quadrado de 50 mm, círculo de Ø50 e uma linha de 100 mm numa viewport 1:50.
- **`ROTEIRO.md`:** 34 conferências com o comando a usar no AutoCAD/ZWCAD (LIST, AUDIT, Propriedades, DIST) e o valor esperado. Inclui a medição da impressão e o teste num tablet Android. Cada valor esperado é conferido no próprio arquivo pelo gerador antes de entrar no roteiro.
- **`RESULTADOS.md`** (planilha para preencher) e o modelo de *issue* **Resultado de validação**.
- **`PRE-VALIDACAO.md`:** auditoria pelo ezdxf e leitura por três leitores independentes (dxfgrabber, dxf-parser e dxf). Os 10 arquivos foram lidos sem erro, e as 34 conferências batem.
- **`previas/`:** imagens dos DXF desenhadas pelo pacote independente `dxf`, para comparar com o AutoCAD.
- **`gerar_kit.py`** gera o kit de novo a qualquer momento; `tests/test_validacao.py` roda o gerador no CI.

### Correções encontradas pela pré-validação
- **Blocos no DXF 2000:** os blocos saíam **explodidos**, como linhas e círculos soltos. Agora saem como definição de bloco e inserções (INSERT), com escala, rotação e espelho, também no papel (carimbo) e em blocos aninhados.
  - Uma cota dentro de um bloco vai como geometria.
  - A opção "Blocos como BLOCK e INSERT" pode ser desmarcada na exportação.
  - O DXF R12 continua com os blocos explodidos.
- **Cotas de raio e diâmetro sem valor gravado** (por exemplo, criadas por script ou importadas) saíam no DXF com raio 0, e o AutoCAD mostraria R0. Agora o raio vem da geometria.

### Outros
- HELP atualizado.
- Testes: `tests/test_zoom.py` (39) e `tests/test_validacao.py` (6); `test_pacote3` e `test_layout_l3` passaram a esperar blocos como INSERT. Total de **803 testes**, todos passando.

## v8.5 — Topografia, variáveis nos scripts e exercício de poligonal

### POLIGONAL (aba Educacional → grupo Topografia)
- **Caderneta de campo:** uma estação por linha, digitada ou colada do Excel. O formato brasileiro é aceito (vírgula decimal, tabulação ou ponto e vírgula).
- **Poligonal fechada ou aberta**, com dois tipos de medida:
  - ângulos horários da ré para a vante (ou anti-horários) e o azimute de partida;
  - azimutes ou rumos.
- **Ângulos:**
  - formatos `114°06'00"`, `114 06 00`, `114d06'`, `114:06:00` ou decimal;
  - rumos em `83°03'30" SE`, `N45d30'E`, `S12 30 O`, com L/E e O/W.
- **Erro angular:** Σ − (n ∓ 2)·180°, com reconhecimento automático de ângulos internos ou externos, e tolerância k"·√n (60"·√n por padrão).
- **Erro linear:** eE, eN e e, com precisão 1:P/e e mínimo configurável (1:1000 por padrão).
- **Compensação:** o erro angular é distribuído em partes iguais e as coordenadas são corrigidas proporcionalmente às distâncias. Também é possível desenhar sem compensação, para ver o erro de fechamento.
- **Planilha de cálculo:** ângulo medido e corrigido, azimute, rumo, distância, ΔE, ΔN, correções e coordenadas E e N. Pode ser copiada para o Excel ou salva em CSV no formato brasileiro. O resumo mostra os itens dentro da tolerância em verde e os de fora em vermelho.
- **Desenho**, num único Ctrl+Z:
  - polilinha fechada, ou aberta;
  - marcos e nomes na camada Pontos;
  - quadro de coordenadas com área (m² e ha), perímetro e precisão, na camada Quadro, onde o modo Didático não escreve medidas;
  - opção de deslocar para perto da origem, para coordenadas UTM.
- 3 exemplos: o talhão do exercício 4, uma divisa por rumos e um caminhamento aberto por azimutes.
- O cálculo é conferido nos testes por uma implementação independente.

### Coordenada polar topográfica
- `@85.24<AZ96d56'30"` (azimute), `@48.12<N45d30'E` ou `@48.12<S12d30'W` (rumo) e `@50<45d30'` (ângulo em GMS a partir do eixo X). Funcionam em qualquer comando e em scripts.

### Variáveis e repetição nos scripts
- **Diretivas:**
  - `#SET` (ou `#DEFINIR`) para variáveis;
  - `#FOR i = a TO b [STEP s]` (ou `#PARA … ATE … PASSO`) para repetição com contador;
  - `#REPEAT n` (ou `#REPETIR`) para repetição simples;
  - `#IF … #ELSE … #END` (ou `#SE`, `#SENAO`, `#FIM`) para condições.
  Os blocos podem ser aninhados.
- **Expressões entre chaves** (`{i*3000}`):
  - operadores `+ - * / % ^`, comparações e `e/ou/não`;
  - funções `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2` (em graus), `sqrt`, `abs`, `round`, `floor`, `ceil`, `min`, `max`, `mod`, `hypot` e a constante `pi`;
  - `{{` e `}}` produzem chaves literais.
- **Segurança:** não há `eval`. O interpretador é próprio, e nomes desconhecidos são erro. Limites impedem repetições excessivas.
- **Erros** de sintaxe ou de execução apontam a **linha do arquivo original**.
- **Salvar expandido:** gera um `.scr` comum, sem diretivas, que roda no AutoCAD e no ZWCAD.
- 3 exemplos novos: covas de plantio 3 × 2 m (`#FOR`), plantio em quincôncio (`#IF`) e divisa por azimutes e rumos (`PLINE`).

### Aula guiada — exercício 4: poligonal fechada de um talhão
- A caderneta tem 5 estações, com ângulos internos medidos e erro angular de 39". O exercício tem 5 passos:
  1. camada Poligonal;
  2. poligonal calculada, compensada e desenhada;
  3. marcos e nomes;
  4. área no desenho;
  5. quadro de coordenadas.
- A verificação confere as coordenadas compensadas com tolerância de 1 cm. Se a poligonal for desenhada sem compensação, a verificação informa a coordenada esperada.

### Outros
- HELP atualizado.
- Testes: `tests/test_poligonal.py` (54 testes); `test_aula.py` passou a esperar 4 exercícios. Total de **757 testes**, todos passando.

## v8.4 — Scripts (.scr), como no AutoCAD

### Comando SCRIPT (botão Script, grupo Arquivo)
- **Editor de scripts:** permite escrever, colar, **abrir e salvar `.scr`**. Os arquivos são lidos em UTF-8 ou Windows-1252 e salvos em ANSI com CRLF, que abrem também no AutoCAD e no ZWCAD.
- **3 exemplos:**
  - placa com furo;
  - canteiros de horta com hachura de cultivo, rótulos e cotas;
  - divisa de terreno por coordenadas com marcos e polígono.
- **Regras de leitura do AutoCAD:**
  - cada espaço ou quebra de linha vale como Enter, e dois espaços seguidos valem dois Enter;
  - linha em branco conclui o comando;
  - `;` no início da linha é comentário;
  - os prefixos `_` e `.` são aceitos;
  - no TEXT, o resto da linha é o texto, com espaços e acentos.
- `DELAY ms` pausa o script; `RSCRIPT` repete o script, com limite de 50 vezes.
- **Velocidade:** instantânea, "ver desenhando" ou passo a passo. **Esc** interrompe.
- **Um Ctrl+Z desfaz o script inteiro.** Essa opção pode ser desligada para desfazer comando por comando.
- **Erros:** o script para e informa a linha e a entrada responsáveis. Ao reabrir o editor, a linha com erro aparece selecionada.
  - Um comando que abre janela (DDIM, ARRAY…) também interrompe o script, e a mensagem indica a alternativa de linha de comando.
  - Uma distância solta, que dependeria da posição do cursor, gera a dica de usar coordenadas.

### Versões de linha de comando (sem janela)
- `-LAYER`: Criar (M), Definir (S), Novo (N), Cor (C; ACI 1–255, nome em português ou inglês, ou `#rrggbb`), Ligar/Desligar e Travar/Destravar. Em scripts, `LAYER` e `LA` usam esta versão.
- `TEXT` / `DT` em scripts e `-TEXT` digitado: ponto, altura, ângulo e texto. As linhas seguintes viram novas linhas de texto, e uma linha vazia conclui.
- `POLYGON` em scripts e `-POLYGON` digitado: lados, centro ou Aresta, Inscrito ou Circunscrito, e raio. Com o raio digitado, o lado de baixo fica horizontal, como no AutoCAD.
- `ZOOM` com opções Extensão, Tudo, Janela, +, − e fator `2X`.
- **Variáveis de sistema:**
  - `OSMODE`, `ORTHOMODE`, `GRIDMODE` e `SNAPMODE`;
  - `CLAYER` (camada atual) e `TEXTSIZE` (altura padrão do texto);
  - `HPNAME`, `HPSCALE` e `HPANG` (padrão, escala e ângulo da hachura). `HPNAME` aceita os nomes do AutoCAD e os do EduCAD, com ou sem `EDU_`.
  - `SETVAR nome valor` também funciona.
- O alias `PLINE` foi acrescentado; o EduCAD aceitava só `PL` e `POLYLINE`.

### Objetos e seleção pelo teclado (também fora dos scripts)
- **Ponto digitado onde o comando pede um objeto vale como clique nesse ponto:** seleção do MOVE, COPY, ERASE, ROTATE e demais comandos, objeto e lado do OFFSET, TRIM, EXTEND, FILLET e ponto interno do HATCH.
- **Seleção:** `L` (último objeto), `P` (seleção anterior), `J`/`W` (janela) e `C` (cruzando), com os cantos digitados.
- ELLIPSE aceita a distância digitada para o outro semieixo.

### GRAVARSCRIPT (ou ACTRECORD)
- Grava o que se faz na linha de comando e com o mouse (comandos, pontos clicados, opções). Durante a gravação, um indicador vermelho aparece na barra de status.
- Ao concluir, o script gravado abre no editor para revisar, salvar e executar de novo.
- O texto feito pela janela é gravado como `TEXT` de linha de comando, e o polígono feito pela janela como `POLYGON`. A seleção feita antes do comando é gravada como pontos sobre os objetos.

### Correções
- **MOVE, COPY e demais comandos do motor:** um ponto digitado como `10,10` era lido como a distância 10,1 (vírgula decimal), e não como a coordenada X=10, Y=10. Com vírgula, agora vale a coordenada, como no AutoCAD.
- **ZOOM digitado sozinho e seguido de `E` em outra entrada:** o `E` iniciava o ERASE. Agora o ZOOM pergunta a opção.

### Outros
- HELP atualizado.
- Testes: `tests/test_scripts.py` (58 testes). Total de **703 testes**, todos passando.

## v8.3 — Entrada de muitos pontos (coordenadas de planilha)

### Colar coordenadas na linha de comando
- **Durante qualquer comando que pede pontos** (PL, L, SPL, PO…), colar várias linhas na linha de comando, ou com o foco no desenho, equivale a digitar cada linha e teclar Enter, como no AutoCAD.
- Aceita colunas copiadas do Excel, do LibreOffice e do Google Planilhas em português: tabulação ou ponto e vírgula como separador, vírgula decimal e ponto de milhar (`8.701.250,000`). O formato do AutoCAD (`x,y`, `@dx,dy`, `d<ângulo`) também é aceito.
- O cabeçalho é ignorado.
- Linhas que não são coordenadas, como `F` (fechar) ou `U` (desfazer), passam como opções do comando.
- **Sem comando ativo:**
  - uma lista de coordenadas abre o importador (PONTOS) já preenchido;
  - uma lista de comandos é executada linha a linha (por exemplo `REC` / `0,0` / `@40,20`).
- **Coordenada digitada no formato brasileiro:** `10,5;20,25` e `@4,5;0`.

### Comando PONTOS (botão Pontos XY)
- Uma janela para colar a tabela ou abrir um arquivo CSV/TXT, em UTF-8 ou Windows-1252.
- **Reconhecimento automático:**
  - separador (tabulação, ponto e vírgula, vírgula ou espaço), decimal e cabeçalho;
  - colunas pelo nome (X/E/Este/Easting, Y/N/Norte/Northing, Ponto/Estação/Vértice/Marco; a coluna de cota é ignorada);
  - sem cabeçalho: nome, X e Y pela ordem das colunas;
  - tabelas UTM sem cabeçalho na ordem Norte, Este: as colunas são trocadas, e a janela avisa.
- **Opções:**
  - escolha manual das colunas;
  - unidade da tabela (mm, cm, m, km), convertida para a unidade do desenho;
  - polilinha aberta ou polígono fechado;
  - marcadores (entidade PONTO) e rótulos com o nome, na camada **Pontos**;
  - **deslocamento para perto da origem**: sugerido sozinho para coordenadas grandes como UTM; o valor subtraído é informado.
- **Pré-visualização:** desenho, linhas inválidas apontadas pelo número da linha, **perímetro e área em m² e ha** no formato brasileiro.
- A inserção vira **um único passo de desfazer**. O relatório de perímetro e área também sai na linha de comando.

### Entidade PONTO (`PO`, `POINT`, `PONTO`)
- Marcada com um "×".
- Seleção, grips, MOVE/COPY/ROTATE/MIRROR/SCALE/STRETCH, OSNAP (ponto final) e propriedades X e Y.
- DXF: exportada como POINT (R12 e 2000). A **importação de POINT**, que antes era ignorada, passou a funcionar.
- Também sai no PDF, no SVG e na impressão.

### Outros
- Botões **Ponto** e **Pontos XY** no grupo Desenhar, com dicas que correspondem ao comando digitável. A altura da faixa continua dentro do limite.
- HELP atualizado.
- Testes: `tests/test_pontos.py` (37 testes). Total de **645 testes**, todos passando.

## v8.2 — Catálogo de padrões de hachura

### 29 padrões novos, com galeria de miniaturas
- O diálogo da hachura (botão Hachura ou `H` → Configurações) virou uma **galeria com miniaturas**, organizada por grupo. Clique escolhe; **duplo clique escolhe e já inicia o HATCH**. Os 11 padrões anteriores continuam no grupo "Básicos".

| Grupo | Padrões |
|---|---|
| Gerais | Linhas 45° (ANSI31), Malha quadrada (NET), Malha 45° (ANSI37), Quadrados tracejados (SQUARE), Cruzes (CROSS), Colmeia (HONEY), **Sólido** (preenchimento), Linhas horizontais (LINE) e Pontos (DOTS); estes dois só no painel de propriedades e na importação, porque já existem nos básicos |
| Materiais (ANSI) | Aço (ANSI32), Bronze/latão/cobre (ANSI33), Plástico/borracha (ANSI34), Tijolo refratário (ANSI35), Mármore/ardósia/vidro (ANSI36), Alumínio (ANSI38) |
| Construção | Concreto, Concreto pontos e linhas (SACNCR), Tijolo/alvenaria (BRICK), Madeira (corte longitudinal), Vidro/translúcido |
| Solos e terreno | Terra/solo natural (EARTH), Solo compactado/aterro, Areia, Brita/cascalho, Rocha, Água/líquido |
| Vegetação e cultivo | Grama/pastagem (GRASS), Solo vegetal, **Lavoura em linhas (plantio)**, Mata/vegetação densa |

- Os padrões com nome do AutoCAD usam a mesma definição do `acad.pat`, e o tamanho padrão equivale à escala 1 do `acadiso.pat` (em mm). Os demais são do EduCAD, desenhados sobre uma rede regular: brita, lavoura e mata se repetem sem acumular deslocamento.

### Motor de padrões
- Todos os padrões novos usam um único motor, no formato das famílias de linhas do AutoCAD: ângulo, origem, deslocamento entre linhas e sequência de traços, espaços e pontos.
- Os segmentos são **recortados pelo contorno e pelas ilhas** (regra par/ímpar) e servem igualmente para a tela, o Layout, a impressão, o PDF vetorial, o SVG e o DXF.
- Na tela, um padrão miúdo demais para o zoom atual é desenhado mais espaçado, para não virar uma mancha nem travar. A impressão e o PDF usam sempre o tamanho real.
- Na impressão e no PDF, as linhas de hachura saem com 0,18 mm.

### Propriedades e edição
- O painel de seleção de uma hachura ganhou o campo **Padrão** (troca o padrão mantendo a escala relativa), além de **Rotação do padrão** e **Tamanho do padrão (mm)**.
- ROTATE gira o padrão junto, MIRROR o espelha e SCALE multiplica o tamanho.

### DXF
- **Exportação:** HATCH nativo com as linhas do padrão gravadas. Os padrões do AutoCAD saem com o próprio nome, como predefinidos; os do EduCAD saem como personalizados, com o prefixo `EDU_`. O sólido sai como preenchimento sólido. A auditoria do ezdxf não aponta erros.
- **Importação:**
  - padrões do catálogo são reconhecidos pelo nome, com tamanho e rotação calculados das linhas do arquivo;
  - **qualquer outro padrão** (por exemplo AR-PARQ1 ou GRAVEL) é desenhado a partir das linhas gravadas no próprio DXF, como no AutoCAD;
  - antes, todos viravam linhas a 45°.

### Correções
- **"Linhas Horizontais" saía a 45°**: o ângulo 0 digitado era trocado por 45.
- O campo de espaçamento aceita valores grandes (por exemplo, 150 para hachurar canteiros desenhados em verdadeira grandeza) e decimais.

### Testes
- `tests/test_hachuras.py`: 29 testes novos. Cobrem a galeria (todas as miniaturas desenham), o HATCH com ilha (nenhum traço fora da área nem dentro da ilha), cada padrão numa área típica, o fechamento da rede da brita, rotação e escala, o painel, o sólido, o SVG, o PDF e o DXF (exportar, auditar, reabrir com nome, rotação e tamanho iguais, BRICK do ezdxf, padrão fora do catálogo).
- Os 579 testes anteriores continuam passando (608 no total).

## v8.1 — Aula guiada com verificação automática (R8 do parecer técnico)

### Aula guiada (aba Educacional → 🎓 Aula guiada, ou comando `AULA`)
- Painel com **exercícios passo a passo**: objetivo, normas envolvidas, instrução de cada passo, **💡 Dica** com os comandos e **Verificar**.
- A **verificação é automática**: o painel confere o desenho a cada alteração, marca o passo com ✓ e passa ao seguinte. O botão Verificar mostra exatamente **o que falta ou está errado**, por exemplo:
  - "Contorno 120 × 80: falta o lado de 120,0 a 120,80";
  - "Não encontrei um retângulo de 60 × 30 abaixo da vista frontal com x de 0 a 60. Confira o alinhamento com a frontal";
  - "A linha em y = 20 existe, mas está contínua. Aresta oculta usa linha tracejada (NBR 8403)";
  - "A cota de 120 existe, mas não usa o estilo ABNT".
- As medidas são conferidas no desenho (tolerância de 0,05 mm), **qualquer que seja o método**: retângulo, polilinha ou linhas soltas, inteiras ou em partes. Nas vistas, o que se confere é o **alinhamento entre as vistas**, não uma posição fixa.
- Barra de progresso, tempo de conclusão e registro dos exercícios concluídos neste navegador (✓ na lista, com o melhor tempo).
- "Começar" abre um desenho novo e enquadra a área do exercício ao lado do painel. O desenho anterior continua disponível em RECUPERAR.

### Exercícios incluídos
1. **Placa de identificação de parcela** (iniciante, 5 passos): coordenadas, furos Ø8, estilo ABNT, cotas linear e de diâmetro.
2. **Vistas ortográficas — bloco com degrau** (5 passos): vista frontal, superior e lateral esquerda no 1º diedro (NBR 10067), alinhamento das vistas, aresta oculta tracejada e cotagem.
3. **Planta de canteiros de uma horta** (7 passos): camada Terreno, terreno de 8 × 6 m em verdadeira grandeza, quatro canteiros com COPY Matriz, hachura (sem hachurar os corredores), cotas em série e prancha 1:50 com carimbo preenchido.

### Exercícios do professor
- Os exercícios ficam na lista `EX_LIST`, em `src/js/28-aula-guiada.js`. Cada passo tem título, instrução, dica e uma função de verificação curta, que usa funções prontas: `exPoly` (polígono desenhado), `exCircle`, `exHasDim` (cota com medida e estilo), `exHatchAt`, `exCovered` (trecho desenhado, com filtro por camada ou tipo de linha) e `exLayouts`. O README traz um modelo.

### Correções encontradas pelos testes
- **CIRCLE:** um número digitado depois do centro agora é o **raio**, como no AutoCAD. Antes, dependia da posição do cursor e não fazia nada se o mouse estivesse fora da área de desenho.
- **DLI com pontos digitados:** o terceiro ponto digitado (posição da cota) definia a direção errada. Uma cota entre 0,0 e 120,0 posicionada em 60,-12 saía **vertical, medindo 0**, porque a direção era calculada pelo segundo ponto. Agora a direção vem do ponto digitado; com o mouse, continua valendo a pré-visualização.

### Testes
- `tests/test_aula.py`: 39 testes novos. Os três exercícios são resolvidos com comandos reais, incluindo erros de propósito (altura errada, vista desalinhada, aresta contínua, cota em outro estilo, camada errada, canteiro sem hachura) para conferir as mensagens.
- Os 540 testes anteriores continuam passando (579 no total).

## v8.0 — Cotas em série e de base (R6 do parecer técnico)

### DIMCONTINUE — cotas em série (DCO)
- Botão **Contínua** (grupo Cotar) ou `DCO` / `DIMCONTINUE`.
- Parte da **última cota linear ou alinhada** do desenho. Cada clique cria uma cota que começa na 2ª linha de extensão da anterior, **na mesma linha de cota**: é a cotagem em cadeia, como a distância entre os furos de uma peça ou entre os canteiros de uma área.
- Mantém a direção (horizontal ou vertical), a camada e o estilo da cota de partida; em cotas alinhadas, mantém o afastamento.
- Pré-visualização da próxima cota antes do clique.

### DIMBASELINE — cotas de base (DBA)
- Botão **De base** ou `DBA` / `DIMBASELINE`.
- Todas as cotas partem da **1ª linha de extensão** da cota de base, e cada nova linha de cota fica mais afastada, pelo valor do novo campo **"Espaçamento da linha de base"** do estilo (DIMDLI). Padrão: 3,75 no Standard e 7 no ABNT.

### Opções (as mesmas do AutoCAD)
- **[Selecionar]** (S, ou Enter antes da primeira cota) escolhe outra cota de partida; a linha de extensão mais próxima do clique vira a origem.
- **[Desfazer]** (U) remove só a última cota do comando.
- **Enter** ou **Esc** encerram. Cada cota é desfeita com um Ctrl+Z.
- Sem nenhuma cota no desenho, o comando pede para selecionar uma.

### Estilos e exportação
- DDIM → Modificar → Linhas: novo campo **Espaçamento da linha de base** (DIMDLI).
- O DXF 2000 exporta o DIMDLI de cada estilo, no lugar do valor fixo de 3,75 de antes. As cotas em série e de base saem como DIMENSION nativas, editáveis no AutoCAD/ZWCAD.

### Faixa de opções
- Com os dois botões novos, o modo compacto passou a valer até 1519 px de largura, e há um modo mais compacto abaixo de 1180 px. A faixa continua com no máximo duas linhas de botões de 1024 a 1920 px.
- O teste de altura da faixa passou a conferir seis larguras de tela, não só 1366 px. Foi ele que detectou a terceira linha que os dois botões novos criariam.

### Testes
- `tests/test_cotas_serie.py`: 29 testes novos, com mouse e teclado reais. Cobrem série horizontal, vertical e alinhada, cotas de base nos estilos Standard e ABNT, Selecionar, Desfazer, botões, DDIM e DXF.
- As baterias que posicionam a vista na metade da tela passaram a arredondar essa posição. Com outra altura de faixa, a metade caía em meio pixel e os cliques do teste ficavam 0,125 mm fora do lugar. Era imprecisão do teste, não do aplicativo.
- Os 511 testes anteriores continuam passando (540 no total).

## v7.9 — Botões para os comandos da v7 (R3 do parecer técnico)

### Novos botões na faixa de opções (aba Início)
- **Modificar** ganhou: **Esticar** (S), **Interromper** (BR), **Unir** (J), **Editar PL** (PE) e **Explodir** (X).
- Novo grupo **Anotar**: **Texto M** (texto múltiplo, T/MT), **Chamada** (linha de chamada, LE) e **Editar texto** (ED).
- Novo grupo **Blocos**: **Criar bloco** (B) e **Inserir** (I).
- **Arquivo** ganhou **Recuperar** (RECUPERAR), que lista as cópias de segurança deste navegador.
- A barra do **Layout** ganhou **▣ Viewports** (MV / MVIEW, com Ajustar/Travar/Objeto/Poligonal/2/3/4).
- A organização segue a aba Início do AutoCAD: Anotação e Bloco ficam na mesma aba que Desenhar e Modificar.
- Cada botão mostra na dica o comando digitável equivalente e foi incluído no teste de dicas da v7.8. Clicar e digitar dão o mesmo resultado.

### EXPLODE como comando
- **Explodir** (botão ou X) agora segue o AutoCAD: sem seleção, pede "Selecione objetos"; com seleção, explode na hora. Antes, sem seleção, só avisava.

### Faixa de opções compacta
- Com os novos botões, abaixo de 1366 px de largura os botões ficam um pouco menores para a faixa **não ganhar uma linha extra**. Altura medida da faixa:

| Largura da tela | v7.8 | v7.9 |
|---|---|---|
| 1920 e 1366 px | 154 px | 154 px |
| 1280 px | 154 px | 139 px |
| 1024 px | 216 px | 129 px |

### Testes
- `tests/test_botoes.py`: 30 testes novos. Cada botão novo é usado com mouse real no fluxo completo do comando: criar e editar texto, chamada, criar e inserir bloco, explodir com e sem seleção, editar polilinha, unir, interromper, esticar, recuperar e viewports.
- `tests/test_dicas.py` passou a aceitar sinônimos do mesmo comando nas dicas (MV e MVIEW, T e MT).
- Os 481 testes anteriores continuam passando (511 no total).

## v7.8 — Dicas da faixa de opções corrigidas, com teste automático (R2 do parecer técnico)

### Dicas corrigidas
- As dicas que apareciam ao passar o mouse sobre os botões ainda mostravam letras de antes da v7.0, que hoje executam outros comandos:

| Botão | Dica antiga | O que a letra antiga faz hoje | Dica nova |
|---|---|---|---|
| Retângulo | R | redesenha a tela | **REC** |
| Elipse | E | **apaga** a seleção | **EL** |
| Texto | T | abre o texto de várias linhas | **DT** (texto de uma linha; T ou MT = várias linhas) |
| Select | S | inicia o STRETCH | **SELECT** (Esc encerra o comando) |

- Todos os botões passaram a mostrar a dica no formato **"Nome — COMANDO"**, inclusive os que não tinham comando na dica: cotas de raio (DRA), diâmetro (DDI) e angular (DAN), Desfazer (U), Refazer (REDO), Novo/Abrir/Salvar (NEW/OPEN/SAVE), Exportar (EXPORT), Tela limpa (LIMPA), Novo layout (LAYOUT), Carimbo, Página e PDF.
- O botão **Apagar** passou a funcionar como o `E` do AutoCAD: com objetos selecionados, apaga na hora; sem seleção, pede "Selecione objetos".
- O **HELP** foi reescrito com os comandos atuais, agrupados (Desenho, Texto, Cotas, Modificar, Blocos, Medir, Layout, Arquivo, Config, Precisão). A versão anterior ainda listava `R` para retângulo, `E` para elipse e `D` para cota linear.

### Correção encontrada pelo teste
- **Hachura → OK sem escolher padrão** gerava erro de JavaScript e não iniciava o comando, porque a lista de padrões abria sem nenhum item marcado. Agora o primeiro padrão já vem selecionado.

### Teste automático das dicas
- Cada botão declara o seu comando (`data-cmd`). O novo `tests/test_dicas.py` confere, para os 48 botões com comando:
  1. a dica mostra o comando declarado e não cita nenhum outro comando;
  2. o comando existe na linha de comando;
  3. todo botão de ferramenta que tem comando digitável mostra esse comando;
  4. **clicar no botão e digitar o comando produzem o mesmo resultado** (ferramenta ativa, janelas abertas, vista, objetos, seleção, layouts e funções chamadas);
  5. o HELP só cita comandos que existem, e com o significado atual.
- Assim, uma mudança futura num atalho que não acompanhe a dica faz o teste falhar no GitHub.

### Testes
- `tests/test_dicas.py`: 24 testes novos.
- Os 457 testes anteriores continuam passando (481 no total).

## v7.7 — Salvamento automático e recuperação (R1 do parecer técnico)

### Cópia de segurança automática
- O EduCAD guarda uma cópia do desenho **no próprio navegador**: o modelo, todos os layouts, os blocos, os estilos de cota e as configurações.
- Quando a cópia é gravada:
  - **8 segundos depois de cada alteração**;
  - a cada **SAVETIME** minutos, se houver alterações (padrão: 1 minuto);
  - ao trocar de aba ou janela, ao fechar ou ao recarregar a página.
- Usa o IndexedDB e, se o navegador não permitir (como alguns navegadores abrindo o arquivo pelo disco), o localStorage. Nos dois casos, funciona sem internet.
- São guardadas as **5 sessões mais recentes**.
- A **barra de status** mostra a situação: "● Cópia de segurança 10:42" (verde), "Guardando…" (laranja) ou "desligado/indisponível". Clicar nela abre a lista de cópias.

### Recuperação ao abrir
- Se o EduCAD foi fechado com alterações não salvas em arquivo (navegador fechado, travado, aba fechada, PC reiniciado sem perfil congelado), aparece **"Recuperar desenhos"**. Para cada cópia, mostra nome, data e hora, número de objetos e três opções:
  - **Recuperar**: abre o desenho, com o título marcado "(recuperado)", para salvar com Ctrl+S;
  - **Baixar .json**: guarda a cópia como arquivo sem substituir o desenho atual;
  - **Descartar**.
- Desenhos já salvos em arquivo (Ctrl+S, Salvar ou Exportar JSON) **não** são oferecidos de novo.

### Comandos
- `RECUPERAR` (`RECOVER`): lista todas as cópias de segurança deste navegador.
- `SAVETIME`: intervalo em minutos (0 desliga). A escolha é lembrada.
- `LIMPARRECUPERACAO`: apaga todas as cópias. Recomendado ao terminar a aula em **computadores compartilhados**, porque as cópias ficam no perfil do navegador daquele PC.

### Código
- Salvar e abrir passaram a usar duas funções reaproveitáveis, `buildDoc()` e `applyDoc()`, compartilhadas com a recuperação.
- Novo módulo `src/js/26-salvamento-automatico.js`.

### Testes
- `tests/test_autosave.py`: 25 testes novos, com o mesmo navegador fechado e reaberto, como faz o aluno.
- Os 432 testes anteriores continuam passando (457 no total).

### Limitações
- A cópia fica **só naquele navegador, naquele computador**. Ela não substitui o arquivo salvo nem acompanha o aluno para outro PC.
- Em laboratórios com **perfil de navegador congelado** (restaurado a cada reinício), a cópia sobrevive ao fechamento do navegador, mas não ao reinício do PC.

## v7.6 — PDF vetorial, configuração de página, anotação escalável e layouts no DXF (Layout, pacote L3)

### PDF vetorial em escala exata
- Botão **📄 PDF** na barra do layout, comando `PDF` ou Exportar → "PDF vetorial". Shift+clique no botão (ou "todos os layouts" no Exportar) gera **uma página por layout**, cada uma no seu tamanho de folha.
- O PDF é **gerado pelo próprio EduCAD**, sem rasterizar:
  - linhas, arcos e círculos como curvas;
  - textos como texto real (pesquisável e copiável);
  - hachuras e recortes das viewports.
- **1 mm no PDF = 1 mm na folha.** Para imprimir em escala, use "Tamanho real / 100%".
- Respeita o estilo de plotagem (monocromático, colorido ou tons de cinza), as espessuras em mm, as camadas que não imprimem e as camadas congeladas por viewport.
- Na impressão e no PDF, os textos saem no tamanho real; antes, um tamanho mínimo pensado para a tela podia aumentá-los.

### Configurar página (PAGESETUP)
- Botão **⚙ Página** ou comandos `PAGESETUP` / `PLOT`. Opções:
  - **folha de saída**: a mesma do layout, ou outra entre A4 e A0;
  - **área de plotagem**: folha inteira, área imprimível (margens) ou **janela** escolhida por dois cantos;
  - **escala de plotagem**: 1:1 (tamanho real) ou **ajustar à folha de saída**, por exemplo para imprimir uma prancha A3 numa impressora A4;
  - **centralizar** ou deslocar X/Y em mm;
  - estilo de plotagem.
- Um resumo mostra o tamanho de saída, a área e a escala resultante. A área de plotagem aparece tracejada em vermelho na folha.
- A configuração é salva com cada layout e vale para o PDF e para a impressão.

### Anotação escalável (como ANNOTATIVE / DIMSCALE 0 do AutoCAD)
- **Estilos de cota anotativos**: DDIM → aba Ajuste → "Anotativo (tamanho no papel)". Setas e textos ficam com o tamanho do estilo (por exemplo, 2,5 mm) **no papel, em qualquer viewport**, seja 1:50, 1:25 ou 1:100. As linhas de chamada (LEADER) seguem o estilo de cota.
- **Textos anotativos**: caixa "Anotativo" no editor de MTEXT e no painel de seleção. A altura digitada vale no papel.
- **Escala de anotação do modelo** na barra de status: define o tamanho com que as cotas e textos anotativos aparecem no Model e no DXF. Ela é salva no arquivo.
- No DXF, estilos anotativos saem com DIMSCALE 0, que no AutoCAD significa "escalar pelo layout".

### Layouts e viewports no DXF/DWG
- O DXF 2000 agora leva **todos os layouts**, com os nomes do EduCAD e o tamanho da folha. Também leva:
  - os objetos desenhados no papel (carimbo, notas, tabelas, cotas);
  - as **viewports** como entidades VIEWPORT: centro e altura da vista na escala certa, **escala travada**, **camadas congeladas** e **recorte poligonal** (com o contorno no papel).
- Abrindo no AutoCAD ou no ZWCAD (ou convertendo para DWG), a prancha chega montada.

### Testes
- `tests/test_layout_l3.py`: 30 testes novos. O PDF é conferido com o pypdf (tamanho da página, texto real, escala exata de 120,000 mm) e o DXF com o ezdxf (layouts, viewports, trava, congelamento, recorte, DIMSCALE 0).
- Os 402 testes anteriores continuam passando (432 no total).
- O GitHub Actions passou a instalar também o pypdf.

### Limitações
- O PDF usa a fonte Courier (padrão do PDF, monoespaçada como a do EduCAD). Caracteres fora do português/Latin-1 viram "?".
- Gerado no navegador, o PDF não foi testado em todas as impressoras. Confira a primeira impressão com uma régua.

## v7.5 — Viewports como no AutoCAD/ZWCAD (Layout, pacote L2)

### MVIEW completo
- `MV` (MVIEW) agora oferece **[Ajustar/Travar/Objeto/Poligonal/2/3/4]**, como no AutoCAD:
  - **canto e canto oposto**: viewport retangular;
  - **Ajustar** (Enter): viewport ocupando a área imprimível;
  - **2 / 3 / 4**: divide uma área (dois cantos, ou Enter para a área imprimível) em duas viewports lado a lado, em três (duas à esquerda e uma grande à direita) ou em quatro (2×2);
  - **Poligonal**: clique os vértices e Enter fecha; útil para recortar só a parte que interessa da planta;
  - **Objeto**: transforma uma polilinha fechada, círculo, elipse ou retângulo desenhado no papel no recorte da viewport, por exemplo um **detalhe circular ampliado**;
  - **Travar**: trava ou destrava a escala das viewports selecionadas.
- Cada nova viewport já vem centrada no desenho e na escala da NBR 8196 que cabe nela.
- Viewports poligonais têm grips nos vértices, e mudar a forma não desloca o desenho no papel. Recortes curvos, com muitos vértices, mostram só o grip de mover.

### Escala travada (🔒)
- Uma viewport travada não muda de escala nem de enquadramento: no MSPACE, o zoom e o pan ficam bloqueados (com aviso), e a barra de escala e o campo de escala também.
- Trava e destrava pelo **MVIEW > Travar** ou pela caixa **"Escala travada"** no painel de seleção.
- A borda da viewport mostra **🔒**.

### Camadas congeladas por viewport (como o VP Freeze do AutoCAD)
- Num layout, cada camada ganha o botão **❄**: congela aquela camada **só na viewport atual** (a selecionada, a que está em MSPACE ou a primeira).
- Exemplo: a planta geral mostra tudo e o detalhe esconde as linhas de construção.
- A borda da viewport mostra **❄** com o número de camadas congeladas, e o painel de seleção lista quais são.

### Camadas que não imprimem e camada VIEWPORTS
- Toda camada ganha o botão **🖨**: a camada continua visível na tela, mas **não sai na impressão**. Serve para linhas de construção, anotações de aula etc.
- As viewports passam a ficar na camada **VIEWPORTS**, criada automaticamente como "não imprime", como se faz no AutoCAD. Para imprimir as bordas, basta ligar o 🖨 dessa camada.
- Viewports de arquivos da v7.4 são movidas para essa camada automaticamente.
- O DXF 2000 exporta o indicador de plotagem da camada (grupo 290).

### Ajustes de interface
- A barra da página do layout não cobre mais o painel lateral.

### Testes
- `tests/test_layout_l2.py`: 22 testes novos.
- Os 380 testes anteriores continuam passando (402 no total).

## v7.4 — Espaço do papel no estilo AutoCAD/ZWCAD (Layout, pacote L1)

### A folha passa a ser um espaço de desenho
- O layout agora é desenhado na própria área de desenho, como no AutoCAD: folha branca sobre fundo cinza e a área imprimível tracejada.
- **Tudo o que se desenha num layout fica no papel, em mm e em escala 1:1**: linhas, polilinhas, textos, MTEXT, cotas, linhas de chamada, blocos e hachuras, com todos os comandos, OSNAPs, grips e desfazer.
- Cada espaço tem o seu **desfazer** e a sua **vista**: o Ctrl+Z no modelo não afeta o papel, e vice-versa.

### Viewports
- A viewport é um **objeto do papel**: mostra o modelo numa escala 1:n e pode ser selecionada, movida e redimensionada por grips.
- Ao redimensionar, o desenho fica parado no papel, como no AutoCAD.
- O layout novo já vem com uma viewport na área imprimível, centrada no desenho e na **escala da NBR 8196** mais próxima que caiba: 1:1, 1:2, 1:5, 1:10, 1:20, 1:25, 1:50, 1:75, 1:100, 1:200, 1:250, 1:500, 1:1000, 1:2000, 1:2500, 1:5000, 1:10000 ou ampliações 2:1, 5:1 e 10:1.
- A escala pode ser escolhida na barra da página, com "Outra…" para personalizar e "Ajustar ao desenho". Também pode ser editada no painel Seleção.
- **MSPACE**: um duplo clique na viewport entra na vista do modelo, onde a roda do mouse faz zoom e arrastar move a vista. Esc, duplo clique fora ou `PS` voltam ao papel. Também há os comandos `MS` e `PS`.
- **MVIEW** (`MV`): cria outras viewports por dois cantos, ou ajustada à área imprimível com Enter.
- A escala considera a unidade do desenho: com o desenho em metros, 1:1000 significa 1 m = 1 mm no papel.

### Vários layouts em abas
- Botão **＋** e comando `LAYOUT` criam layouts; **duplo clique** na aba renomeia.
- **Botão direito** na aba abre um menu: Novo, Renomear, Duplicar (com o conteúdo) e Excluir.
- Os **layouts são salvos no arquivo** (folha, margens, estilo de plotagem e tudo o que estiver no papel) e restaurados ao abrir.

### Página
- Folhas **A4 a A0** da NBR 10068, com orientação e margens da norma (25 mm à esquerda; 7 mm nas demais em A2 a A4, 10 mm em A0 e A1), editáveis.
- Toda a configuração da página fica na barra inferior do layout.

### Estilos de plotagem e espessuras
- Três estilos: **Monocromático** (padrão, como o monochrome.ctb), **Colorido** (branco e tons muito claros viram preto) e **Tons de cinza**.
- Valem na tela, na impressão e também para as cotas.
- As **espessuras de linha** são mostradas e impressas **em mm reais** (NBR 8403), dentro e fora das viewports.

### Carimbo ABNT
- O botão **🗂 Carimbo ABNT** (ou o comando `CARIMBO`) insere no papel:
  - a margem;
  - a legenda (NBR 10582), como bloco, com campos editáveis por duplo clique: instituição, curso, disciplina, título, desenhista, data, escala e folha.
- O campo **Escala** já vem preenchido com a escala da viewport, e a data com o dia atual.
- Uma viewport ainda não ajustada pelo usuário é reposicionada acima do carimbo.
- O antigo botão Legenda virou **📋 Tabela**: uma tabela de legenda desenhada no papel, com células editáveis.

### Impressão
- A folha é impressa em **alta resolução** (300 dpi, ou o máximo seguro em A1/A0), em escala real, com o estilo de plotagem e as espessuras em mm. As bordas das viewports e a grade não saem na impressão.

### Outros
- A exportação DXF/SVG, mesmo feita a partir de um layout, continua levando o desenho do modelo (o layout no DXF faz parte do pacote L3).
- `IMPORTDXF` e a abertura de arquivos voltam automaticamente para o modelo.

### Testes
- `tests/test_layout.py`: 37 testes novos.
- Os 343 testes anteriores continuam passando (380 no total). O teste de gravação do FILLET passou a conferir o arquivo salvo.

## v7.3 — Arquitetura modular, testes no GitHub, alta resolução e toque (pacote 4 da v7)

### Código dividido em módulos
- O código-fonte agora fica em `src/`: 24 módulos JavaScript numerados (`src/js/01-…` a `24-…`), os estilos em `src/css/app.css` e a estrutura da página em `src/app.html`.
- `python build.py` monta o **`index.html` de arquivo único** (o mesmo de sempre: funciona offline, por duplo clique e no GitHub Pages). Também gera `src/dev.html`, que carrega os módulos separados para desenvolvimento.
- `python build.py --check` confere se o `index.html` publicado corresponde aos módulos.
- A divisão foi feita sem alterar o comportamento: o arquivo único montado a partir dos módulos é idêntico ao anterior, byte a byte, antes das novidades desta versão.
- Removida uma declaração duplicada de função (`dimStyleOf`) que existia desde a v6.1.

### Testes automáticos no GitHub (GitHub Actions)
- `.github/workflows/testes.yml` roda a cada envio (push) e a cada pull request:
  1. confere se o `index.html` está atualizado em relação a `src/`;
  2. roda todas as baterias de testes no arquivo único;
  3. roda um teste rápido na versão modular (`src/dev.html`).
- O resultado aparece na aba **Actions** do repositório, e um selo verde ou vermelho aparece ao lado de cada envio.
- Novo `tests/run_all.py`: roda todas as baterias e mostra um resumo (`--alvo` e `--somente` permitem escolher o arquivo e as baterias).

### Alta resolução
- O desenho usa a resolução física da tela (`devicePixelRatio`): linhas e textos nítidos em telas Retina, 4K e celulares, sem alterar coordenadas, snaps ou seleção.
- A resolução se ajusta ao mover a janela para outro monitor ou ao mudar o zoom do navegador.

### Toque (tablets e celulares)
- **Toque** = clique (seleção, pontos, grips, opções); **arrastar com um dedo** move a vista; **pinça** com dois dedos dá zoom em torno do ponto entre os dedos.
- **Toque duplo** = duplo clique (edição de texto); **toque longo** = Enter (conclui polilinha, seleção, comandos), com vibração quando disponível.
- **Barra de toque**, que aparece no primeiro toque ou em telas sensíveis ao toque: ⏎ Enter, Esc, ↶ Desfazer, ⇧ Shift para o próximo toque, ⤢ Zoom extensão e ⌨ teclado da linha de comando.
- Botões da faixa de opções maiores no modo toque.

### Telas estreitas
- Abaixo de 900 px de largura, o painel lateral fica recolhido e o botão **☰ Painéis** o mostra sobre o desenho. A faixa de opções passa a rolar na horizontal.

### Testes
- `tests/test_plataforma.py`: 23 testes novos, cobrindo:
  - montagem modular;
  - tela 2× (resolução física, seleção e posição do desenho);
  - toque simulado (toque, dois toques, arrastar, pinça, toque longo, toque duplo e barra de toque);
  - tela estreita;
  - versão modular.
- Os 320 testes anteriores continuam passando (343 no total). Três baterias também foram conferidas na versão modular.

## v7.2 — Hachura por contorno, blocos, MTEXT, LEADER e importação de DXF (pacote 3 da v7)

### HATCH por ponto interno (como no AutoCAD)
- `H` (ou `BH`) pede **"Selecione um ponto interno"**: o EduCAD encontra o contorno fechado em volta do clique, mesmo formado por linhas, arcos e polilinhas separados que se cruzam.
- **Ilhas**: objetos fechados dentro da área (um círculo, por exemplo) ficam sem hachura.
- Opções:
  - **Selecionar objetos**: usa círculos, polilinhas fechadas, retângulos e elipses como contorno;
  - **Configurações**: abre o diálogo de padrões ABNT sem perder as áreas já escolhidas;
  - **Desfazer**: remove a última área.
- Pré-visualização em verde de cada área escolhida.
- Contorno aberto é avisado ("verifique se as linhas se encontram").
- A hachura acompanha MOVE, ROTATE, SCALE e MIRROR, mostra a área (descontando as ilhas) e é exportada como HATCH nativo com contorno e ilhas no DXF 2000.

### MTEXT (texto de várias linhas)
- `T` agora é **MTEXT**, como no AutoCAD; o texto de uma linha passou a ser `DT`.
- Dois cantos definem o quadro, e o texto quebra pela largura dele.
- Editor com várias linhas (Enter quebra a linha, Ctrl+Enter confirma), altura e **9 justificações**.
- Opções na linha de comando: [Altura/Justificar/Rotação/Largura].
- **Duplo clique** em qualquer texto, MTEXT ou linha de chamada abre o editor. Também há o comando `ED` (TEXTEDIT).
- Exportado como MTEXT nativo no DXF 2000.

### LEADER (linhas de chamada)
- `LE` (também `MLD`, `QLEADER`): ponta da seta → pontos seguintes → Enter → texto.
- Seta e cores seguem o estilo de cota atual (DDIM), com patamar horizontal e texto à direita ou à esquerda conforme a direção.
- Ideal para identificar elementos em plantas: "Poço de visita", "Dreno", "Canteiro 1".

### BLOCK e INSERT
- **BLOCK** (`B`): nome → ponto base → seleção → **[Manter/Converter em bloco/Apagar] <Converter>**.
- **INSERT** (`I`): nome (`?` lista os blocos) → ponto de inserção, com pré-visualização → escala → rotação.
- As referências de bloco funcionam com MOVE, COPY, ROTATE, SCALE, MIRROR, grips e seleção, e são salvas no JSON.
- **EXPLODE** de uma referência devolve os objetos do bloco.
- Nos arquivos DXF, SVG e na impressão, os blocos saem como a geometria correspondente.

### Importação de DXF
- **Abrir** aceita arquivos `.dxf` (R12 a 2018+, ASCII). Também há os comandos `DXFIN` (abre) e `IMPORTDXF` (anexa ao desenho atual).
- Importa:
  - LINE, CIRCLE, ARC, LWPOLYLINE e POLYLINE (com arcos), TEXT, MTEXT, ELLIPSE e SPLINE;
  - SOLID e LEADER;
  - INSERT, com os blocos, e HATCH, com contornos e ilhas;
  - DIMENSION, como geometria.
- Preserva camadas (cor, tipo e espessura de linha, ligada/desligada, bloqueada), cores por objeto (ACI e RGB), acentos (UTF-8 ou Windows-1252) e símbolos (`%%d`, `%%c`, `%%p`, `\U+`).
- **Unidades** convertidas para mm (polegada, pé, cm, m).
- Os tipos não suportados são listados ao final da importação.

### Seleção
- A janela **cruzando** agora usa a geometria real dos objetos. Uma linha diagonal que só passa perto da janela (dentro do retângulo envolvente) não é mais selecionada.

### Testes
- `tests/test_pacote3.py`: 40 testes novos, com mouse e teclado reais. Inclui arquivos DXF gerados pelo ezdxf e um teste de ida e volta (exportar e reabrir).
- Os 280 testes anteriores continuam passando (320 no total).

### Limitações conhecidas
- No DXF exportado, as referências de bloco saem explodidas (geometria correta, mas sem a definição BLOCK/INSERT).
- MLEADER, atributos de bloco (ATTDEF), imagens e objetos 3D não são importados; o aplicativo informa quantos foram ignorados.
- A detecção de contorno da hachura aproxima arcos e círculos por segmentos curtos.

## v7.1 — Polilinhas com arcos, PEDIT, JOIN, BREAK e STRETCH (pacote 2 da v7)

### Polilinhas com segmentos em arco
- A polilinha passou a ter **segmentos curvos**, com a mesma convenção do AutoCAD e do DXF (bulge por vértice).
- **PLINE** ganhou as opções **[Arco/Linha/Fechar/Desfazer]**. No modo Arco, cada novo ponto cria um arco tangente ao segmento anterior, com pré-visualização.
- Polilinhas com arcos funcionam em todo o aplicativo:
  - desenho, Layout, seleção e janela;
  - OSNAP: extremidade, meio do arco, centro, interseção, perpendicular e mais próximo;
  - grips: o grip do meio de um arco muda a curvatura, mantendo as pontas;
  - MOVE, COPY, ROTATE, SCALE e MIRROR (o espelho inverte o sentido do arco);
  - comprimento e área no painel de seleção;
  - exportação: LWPOLYLINE com bulge no DXF 2000, POLYLINE com bulge no R12 e arcos reais no SVG.

### FILLET e CHAMFER mantêm a peça inteira
- Concordar ou chanfrar dois lados vizinhos de uma polilinha ou retângulo **não explode mais o objeto**: ele continua uma única polilinha, com o arco ou chanfro incorporado, como no AutoCAD.
- A opção **Polilinha** de FILLET e CHAMFER trata todos os cantos de uma vez e mantém um único objeto. Cantos com segmentos curtos demais são informados e ignorados.

### OFFSET, TRIM, EXTEND e EXPLODE
- **OFFSET** de polilinhas com arcos: arcos concêntricos com raio ajustado e cantos reconectados. Funciona com polilinhas abertas e fechadas, como o contorno de um retângulo concordado.
- **TRIM** de polilinhas com arcos: remove o trecho entre os cortes, inclusive dentro de um arco, e mantém o restante como polilinha.
- **EXTEND**: estende polilinhas cuja ponta é reta. Ponta em arco é informada como ainda não suportada.
- **EXPLODE** (X) separa a polilinha em linhas e arcos.

### Novos comandos
- **PEDIT (PE)**:
  - **Fechar/Abrir**, **Unir (J)** (acrescenta linhas, arcos e polilinhas conectados), **Decurvar**, **Inverter** e **Desfazer**;
  - em linha ou arco, pergunta "Deseja transformá-lo em uma polilinha? <S>";
  - retângulos são tratados como polilinhas.
- **JOIN (J)**:
  - linhas colineares viram uma linha;
  - arcos de mesmo centro e raio viram um arco, ou um círculo se fecharem a volta;
  - peças encadeadas (linhas, arcos e polilinhas com pontas coincidentes) viram uma polilinha, fechada se as pontas se encontrarem.
- **BREAK (BR)**:
  - interrompe linhas, arcos, círculos (viram arco), polilinhas e retângulos;
  - o ponto de seleção é o 1º ponto de interrupção, e a opção **[Primeiro ponto]** permite outro;
  - **@** interrompe em um único ponto.
- **STRETCH (S)**:
  - estica pela **janela cruzando**: só os vértices dentro dela se movem;
  - objetos inteiramente dentro são movidos; retângulos parcialmente dentro viram polilinha;
  - cotas acompanham, com opção Deslocamento e pré-visualização.

### Testes
- `tests/test_polilinhas.py`: 34 testes novos, com mouse e teclado reais. Inclui validação do DXF com bulge pelo ezdxf.
- Os 246 testes anteriores continuam passando (280 no total). Três testes foram atualizados para o novo comportamento:
  - FILLET/CHAMFER de polilinha mantêm um único objeto;
  - `S` agora inicia o STRETCH.

## v7.0 — Motor de comandos no estilo AutoCAD (pacote 1 da v7)

### Linha de comando como no AutoCAD
- **Toda digitação sobre o desenho vai para a linha de comando**, e o comando só executa com **Enter ou Espaço**, como no AutoCAD. Os atalhos de tecla única, que disparavam ferramentas na hora e conflitavam com os aliases, foram removidos.
- **Espaço = Enter também dentro da linha de comando** (para comandos, opções e valores).
- **Aliases no padrão do AutoCAD**:
  - `E` = ERASE (antes era Elipse), `EL` = ELLIPSE e `REC` = RECTANG;
  - `R`/`RE` = REDRAW, `S` = STRETCH (previsto para o pacote 2) e `CP` = COPY;
  - `D` = DIMSTYLE, além de `DLI`, `DAL`, `DRA`, `DDI` e `DAN` para as cotas.

### Seleção dentro do comando (verbo → objeto) ou antes dele (objeto → verbo)
- Sem pré-seleção, o comando pede **"Selecione objetos"**. Valem clique, **janela** (arrastar da esquerda para a direita), **cruzando** (da direita para a esquerda), Shift+clique para remover e `Todos`. Enter conclui.
- Com pré-seleção, o comando vai direto ao primeiro ponto.

### Comandos reescritos (prompts com [opções], valores padrão e pré-visualização)
- **ERASE**: apaga a seleção.
- **MOVE**: ponto base → segundo ponto. Também aceita a opção **Deslocamento** (Enter no ponto base e digite `dx,dy`).
- **COPY**: cópias múltiplas, com **Desfazer** e **Matriz** (n itens por espaçamento ou **Ajustar** até um ponto).
- **ROTATE**: ângulo digitado ou pelo cursor, **Cópia** e **Referência** (ângulo de referência por valor ou dois pontos → novo ângulo ou Pontos). Antes usava a caixa do navegador.
- **SCALE**: fator digitado ou pelo cursor, **Cópia** e **Referência** (comprimento de referência → novo comprimento). Antes usava a caixa do navegador.
- **MIRROR**: dois pontos da linha de espelhamento e **"Apagar os objetos de origem? [Sim/Não] <Não>"**.
- **OFFSET**:
  - distância por valor ou dois pontos, ou **Através** (ponto de passagem);
  - **apaGar** origem, **Camada** (Atual/Origem), **Múltiplo** e **Desfazer**;
  - pré-visualização tracejada antes do clique.
- **CHAMFER**: agora na mesma sequência do FILLET:
  - **Distância** (d1, d2) e **Ângulo** (comprimento + ângulo), **Aparar**, **mÉtodo**, **Múltiplo**, **Polilinha** e **Desfazer**;
  - **Shift+clique** para canto vivo e pré-visualização.
  - Funciona com linhas e lados de polilinhas e retângulos.

### Em todos os comandos novos
- Pontos com OSNAP, ORTHO, POLAR, coordenadas (`x,y`, `@dx,dy`, `@d<a`) e distância direta na direção do cursor.
- **Esc** cancela sem alterar nada; cada operação é desfeita com um único Ctrl+Z.
- Raio, distâncias, modo de aparar e opções do OFFSET e do CHAMFER são lembrados e salvos no desenho.

### Testes
- `tests/test_comandos.py`: 47 testes novos, com mouse e teclado reais.
- Os 199 testes anteriores continuam passando (246 no total). O teste do `U` dentro do LINE foi ajustado: agora `U` + Enter, como no AutoCAD.

### Compatibilidade de hábitos
- Quem usava as teclas únicas antigas (`L`, `C`, `M`... sem Enter) precisa agora confirmar com **Enter ou Espaço**.
- `E` passou a apagar; a elipse é `EL`.
- `R` não abre mais o retângulo; use `REC`.

## v6.8 — TRIM e EXTEND no estilo do AutoCAD 2021+

### Modo Rápido (padrão, como no AutoCAD atual)
- `TR` e `EX` começam direto em **"Selecione o objeto a aparar/estender"**. Não é preciso escolher arestas antes: **todos os objetos funcionam como arestas**.
- **TRIM**: clique no trecho a remover; sai só a parte entre as interseções mais próximas.
- **EXTEND**: clique perto da ponta a prolongar; o objeto vai até a aresta mais próxima naquela direção. Um novo clique estende até a aresta seguinte.
- **Shift+clique inverte a operação**: estende dentro do TRIM e apara dentro do EXTEND.
- **Arrastar** desenha uma **cerca à mão livre**: todos os objetos que ela cruzar são aparados ou estendidos de uma vez.
- **Clique em área vazia** abre uma **janela Cruzando**: os objetos que ela cruza são processados.
- **TRIM rápido apaga** o objeto quando não há trecho delimitado a remover, como no AutoCAD.
- **Pré-visualização** ao passar o cursor: o que sai fica **vermelho** e o que fica, **verde**, com a indicação "aparar", "apagar objeto" ou "estender".
- O comando continua ativo após cada operação; **Enter/Espaço** encerra e **Esc** cancela.
- Cada clique, cerca ou janela é desfeito em **um único Ctrl+Z**.

### Opções (digitadas direto sobre o desenho)
- **T** (aresTas): passa ao modo Padrão e pede as arestas de corte ou de contorno; Enter sem escolher usa todas.
- **C** (Cruzando): janela por dois cantos.
- **O** (mOdo): Rápido ou Padrão. A escolha é lembrada e salva no desenho.
- **R** (apagaR, só no TRIM): apaga objetos sem sair do comando.
- **U** (Desfazer): desfaz a última operação sem sair do comando.

### Outros
- Objetos em camadas bloqueadas ou ocultas não são alterados.
- A seleção de objetos usa o ponto real do cursor; o OSNAP não desvia o clique.

### Testes
- `tests/test_trim_extend.py`: 26 testes novos, com mouse e teclado reais.
- Os 173 testes anteriores continuam passando (199 no total).

## v6.7 — FILLET no estilo AutoCAD

### Sequência igual à do AutoCAD
- `F` ou `FILLET` mostra as configurações atuais (`Modo = APARAR, Raio = 5`) e o prompt **"Selecione o primeiro objeto ou [Desfazer/Polilinha/Raio/Aparar/Múltiplo]"**.
- Depois vem **"Selecione o segundo objeto, ou Shift+clique para canto vivo, ou [Raio]"**.
- Não há mais caixa de diálogo: o raio e as opções vão pela linha de comando. As letras digitadas sobre o desenho vão direto para ela.
- **Pré-visualização**: o 1º objeto fica destacado. Ao passar sobre o 2º, o resultado aparece em verde antes do clique; se não for possível, aparece a mensagem de erro.
- A concordância mantém os **lados clicados** de cada objeto, como no AutoCAD.
- Opções:
  - **R** (Raio): valor digitado ou dois pontos clicados.
  - **T** (Aparar): Aparar ou Não aparar.
  - **M** (Múltiplo): várias concordâncias seguidas; Enter encerra.
  - **U** (Desfazer): desfaz a última concordância sem sair do comando.
  - **P** (Polilinha): concorda todos os vértices de uma polilinha ou retângulo de uma vez.
- **Shift+clique** no 2º objeto cria canto vivo (raio 0) sem mudar o raio configurado.
- Raio e modo de aparar são lembrados entre execuções e salvos no arquivo do desenho.
- Enter/Espaço aceita o padrão; Esc cancela; Enter após o comando repete o FILLET.

### Objetos suportados
- Linha + linha, linha + arco, linha + círculo, arco + arco, arco + círculo e círculo + círculo.
- Lados de **polilinhas e retângulos**, inclusive dois lados do mesmo objeto.
- Arcos são aparados ou estendidos; **círculos não são aparados**, como no AutoCAD.
- **Linhas paralelas** são unidas por um semicírculo, e o raio é ignorado, como no AutoCAD.
- **Raio 0** estende ou apara até o canto vivo, mantendo os lados clicados.
- Mensagens claras para raio muito grande, objeto concordado consigo mesmo e objetos sem ponto comum.
- O arco criado fica na camada e com as propriedades dos objetos, quando estão na mesma camada; caso contrário, na camada atual.

### Novo comando
- **X / EXPLODE**: converte polilinhas e retângulos selecionados em linhas.

### Limitação
- Polilinhas e retângulos concordados são convertidos em linhas e arcos independentes. No AutoCAD, continuam sendo uma única polilinha, com segmentos em arco. Polilinhas com arcos estão previstas para a v7.

### Testes
- `tests/test_fillet.py`: 31 testes novos, com mouse e teclado reais.
- Os 142 testes anteriores continuam passando (173 no total).

## v6.6 — Identificação do desenvolvedor

- **Sobre → Desenvolvedor**: novo cartão de identificação com nome, função, curso, universidade e campus. O visual segue a identidade do aplicativo.
- **Correção**: o e-mail de contato aparecia como "[email protected]", com link quebrado. Era um resíduo da proteção de e-mails do Cloudflare, e o script dela foi removido na v6.1. Agora o endereço aparece por extenso, com link `mailto:` funcional.
- Cache do aplicativo instalado atualizado para `educad-v6.6`: quem instalou o app recebe a nova versão automaticamente.
- Os 142 testes continuam passando.

## v6.5 — Tela cheia e aplicativo instalável

### Abertura em tela cheia
- O EduCAD abre com uma **tela inicial** com o botão **"Abrir aplicativo CAD em tela cheia"**. O clique leva o aplicativo a ocupar o monitor inteiro, sem abas, barra de endereços ou barras do navegador.
- Por segurança, nenhum navegador permite que uma página entre em tela cheia sozinha: é obrigatório um clique ou uma tecla do usuário. Por isso existe o botão.
- "Continuar na janela do navegador" abre normalmente. A opção "Não mostrar esta tela novamente" é lembrada. Um link com `?telacheia=1` sempre mostra a tela inicial.
- **Botão ⛶** na barra superior e comando `TELACHEIA` (também `FULLSCREEN` ou `FS`) alternam a tela cheia a qualquer momento.
- **Tecla Esc preservada para o CAD.** No Chrome e no Edge, durante a tela cheia, o Esc continua cancelando comandos; para sair, mantém-se o Esc pressionado. No Firefox e no Safari o navegador reserva o Esc para sair da tela cheia, e o aplicativo avisa isso.

### Tela limpa
- **Ctrl+0**, o botão **▭ Tela limpa** ou o comando `LIMPA` ocultam a faixa de opções e o painel direito, como o CLEANSCREEN do AutoCAD. Ficam só a área de desenho, a linha de comando e a barra de status.

### Aplicativo instalável (PWA)
- No Chrome e no Edge, a partir do GitHub Pages, aparece o botão **⬇ Instalar** (ou o comando `INSTALAR`).
- Instalado, o EduCAD ganha ícone na área de trabalho e no menu Iniciar e abre em **janela própria**, sem abas nem barra de endereços, como um programa do computador.
- Funciona **sem internet** depois da primeira visita. Novas versões publicadas são baixadas automaticamente quando há conexão.
- Novos arquivos: `manifest.webmanifest`, `sw.js` e `icons/`.

### Atalhos para laboratório (`atalhos/`)
- Arquivos `.bat` (Windows) e `.desktop` (Linux) abrem o EduCAD no Edge ou no Chrome em modo aplicativo e tela cheia.
- Há também uma versão em **modo quiosque**, travada em tela cheia, para avaliações. Instruções em `atalhos/LEIA-ME.md`.

### Testes
- `tests/test_tela.py` (18 testes):
  - tela inicial, entrada e saída da tela cheia, comando, botão e tecla Enter;
  - preferência lembrada e tela limpa, com a área de desenho crescendo;
  - manifesto e ícones;
  - service worker ativo;
  - **instalabilidade conferida pelo próprio Chrome**;
  - abertura sem internet.
- Os 124 testes anteriores continuam passando (142 no total).

## v6.4 — Edição e precisão

### Grips (alças de edição)
- Ao selecionar objetos aparecem alças azuis, como no AutoCAD. Elas ficam rosa sob o cursor (e o atraem) e vermelhas quando ativas.
- Clique numa alça (ou arraste-a) para editar. **Espaço/Enter** alterna entre os modos **STRETCH → MOVE → ROTATE → SCALE → MIRROR**.
- O prompt segue o formato do AutoCAD: `** STRETCH ** Especifique o ponto de estiramento ou [Base/Copiar/Desfazer/Sair]`.
  - `C` faz cópias múltiplas; `B` define outro ponto base; `X` sai.
  - Aceita coordenadas (`@10,0`, `@25<45`), distância na direção do cursor, ângulo (ROTATE) e fator (SCALE, inclusive com vírgula decimal).
- Alças por tipo de objeto:
  - linha: extremidades e meio;
  - círculo: centro e quadrantes (raio);
  - arco: centro, extremidades e raio;
  - retângulo e hachura: cantos e lados;
  - polilinha: vértices e meios de segmento;
  - elipse: centro e eixos;
  - texto: ponto de inserção;
  - cotas: pontos de origem e posição da linha de cota.
- Alças coincidentes de objetos diferentes (duas linhas que se tocam) são estiradas juntas.
- **Esc** cancela a edição pela alça; um segundo **Esc** limpa a seleção.
- Botão **GRIPS** liga/desliga as alças. Acima de 100 objetos selecionados elas não aparecem, por desempenho (como GRIPOBJLIMIT).
- Cada edição por grip é desfeita em um único Ctrl+Z.

### OSNAP
- Novos modos:
  - **QUADRANT**: círculos, arcos e elipses. Antes, os quadrantes apareciam como "endpoint".
  - **PERPENDICULAR**: linhas, polilinhas, retângulos, círculos e arcos.
  - **TANGENT**: círculos e arcos, a partir do último ponto.
  - **NEAREST**: projeção exata sobre o objeto, com prioridade menor que os demais.
- **F3** liga/desliga todos os snaps de objeto. **F9** passa a controlar só o snap de grade.
- Substituição pela linha de comando, como no AutoCAD: durante um comando, digite `END`, `MID`, `CEN`, `INT`, `QUA`, `PER`, `TAN`, `NEA` ou `NON` para forçar o modo no próximo ponto.
- Novos marcadores visuais (⊥ perpendicular, ◇ quadrante, tangente, ampulheta para o mais próximo) e rótulos com o nome do AutoCAD.

### Propriedades
- **ByLayer** em cor, espessura e tipo de linha, e passa a ser o **padrão dos novos objetos**. O objeto herda a aparência da camada, e mudar a camada atualiza todos os objetos ByLayer.
- Clique na bolinha colorida de uma camada para mudar a sua cor.
- **Painel contextual**: sem seleção, define as propriedades dos novos objetos. Com seleção, edita os objetos selecionados (camada, cor, espessura e linha), com desfazer. Valores diferentes entre os objetos aparecem como **\*VARIA\***.
- **Geometria editável** no painel SELEÇÃO, para um objeto selecionado:
  - linha: coordenadas, comprimento e ângulo;
  - círculo: centro, raio e diâmetro, mais perímetro e área;
  - arco: centro, raio e ângulos, mais comprimento;
  - retângulo: posição, largura e altura;
  - elipse: centro, semieixos e rotação;
  - texto: conteúdo, altura, rotação e posição;
  - polilinha: vértices, comprimento, área e a opção Fechada;
  - hachura: ângulo e espaçamento;
  - cota: medida e estilo.
- Valores inválidos são destacados e recusados. Cada alteração pode ser desfeita.

### Outros
- **DXF 2000**: objetos ByLayer são exportados como ByLayer; cores, espessuras e tipos explícitos continuam explícitos.
- O painel direito agora rola, em vez de espremer a lista de camadas.

### Testes
- `tests/test_edicao.py`: 39 testes novos, com mouse e teclado reais no Chromium.
- Os 85 testes anteriores continuam passando (124 no total).

### Compatibilidade
- Desenhos antigos abrem normalmente. Seus objetos mantêm as cores explícitas que já tinham; só os objetos novos nascem ByLayer.

## v6.3 — Exportação DXF 2000 e caminho para DWG

### Novo: DXF 2000 (AC1015), o formato padrão de exportação
Disponível em **Exportar** (ou pelos comandos `EXPORT`/`EXP`) e diretamente pelo comando `DXFOUT`. Abre no AutoCAD 2000 ou superior, no ZWCAD, no BricsCAD, no DraftSight, no LibreCAD e no QGIS. Em relação ao DXF R12 da v6.2, o arquivo agora preserva:

- **Entidades nativas**: polilinhas e retângulos como LWPOLYLINE (polígonos sem vértice duplicado), ELLIPSE com rotação, SPLINE (a curva do EduCAD convertida exatamente em B-spline cúbica), HATCH, TEXT com rotação, LINE, CIRCLE e ARC.
- **Cotas editáveis** (entidades DIMENSION): linear horizontal e vertical, alinhada, raio, diâmetro e angular por 3 pontos. Cada cota leva a geometria exata exibida no EduCAD (bloco `*D`), e o CAD de destino continua tratando-a como cota (medida, estilo, edição).
- **Estilos do DDIM como DIMSTYLE**: tamanho de texto e de setas, afastamentos, escala global, precisão, separador decimal, supressão de zeros, prefixo e sufixo, fator de escala, tolerâncias, unidades alternativas, cores e espessuras. O estilo atual vira `$DIMSTYLE`.
- **Aparência**: cor RGB verdadeira (além da cor ACI mais próxima), espessura de linha (lineweight) e tipo de linha (CENTER, HIDDEN, DASHED, PHANTOM, DOT, DASHDOT, DIVIDE) por objeto e por camada.
- **Camadas** com cor, tipo, espessura e estados ligada/desligada e bloqueada.
- **Hachuras** com padrões predefinidos do AutoCAD/ZWCAD (ANSI31, NET, DOTS, DASH), escalados para o espaçamento usado no EduCAD.
- **Unidades** em milímetros (`$INSUNITS`) e vista inicial ajustada ao desenho.
- **Textos com acentos** gravados em Windows-1252 (página de código declarada no arquivo). Caracteres fora dela usam a notação `\U+XXXX` do AutoCAD; °, Ø e ± usam `%%d`, `%%c` e `%%p`.
- **Opções no diálogo**: exportar cotas e hachuras como entidades nativas (padrão) ou explodidas em linhas, sólidos e textos, para programas que não as suportam.
- O nome do arquivo segue o nome do desenho aberto.

### DWG
O DWG é um formato binário fechado. Gravá-lo no navegador exigiria a biblioteca comercial da ODA ou a LibreDWG (GPL, gravação experimental e incompatível com a licença MIT). Por isso, a opção **DWG** (ou o comando `DWGOUT`) gera um DXF 2000 completo e abre um guia de conversão:

- **AutoCAD ou ZWCAD**: Abrir o DXF → Salvar como DWG.
- **ODA File Converter** (gratuito): conversão em lote de DXF para DWG, com escolha da versão.
- **BricsCAD, DraftSight ou QCAD Pro**: também abrem o DXF e salvam em DWG.

### Outros
- O DXF R12 continua disponível ("compatibilidade máxima"), útil para máquinas CNC e programas antigos.
- **Correção**: a hachura de linhas era desenhada na tela com o ângulo espelhado em relação ao DXF e ao SVG. Agora 45° é "/" em todos, como no AutoCAD.

### Testes
- `tests/test_dxf.py` (23 testes): usa o diálogo real de exportação e valida o arquivo com ezdxf em leitura estrita e auditoria. Verifica entidades, camadas, cores RGB, espessuras, tipos de linha, estilos de cota, medidas das cotas (iguais às do EduCAD), acentos, hachuras, as opções explodidas, o fluxo DWG, o R12, o comando DXFOUT e o desenho vazio.
- O arquivo também foi aberto e renderizado no LibreCAD 2.2 durante o desenvolvimento.
- Os 62 testes das versões anteriores continuam passando.

### Limitações conhecidas
- O fundo sob o texto da cota (opção do DDIM) não é exportado. Setas do tipo "ponto" e "aberta" aparecem corretas, mas o AutoCAD as substitui por setas preenchidas se a cota for regenerada (traço oblíquo e preenchida são preservados).
- Exporta apenas o espaço modelo. O Layout (folha e viewport) não é exportado.
- O LibreCAD redesenha as cotas por conta própria e ignora o separador decimal e a cota angular. Também não exibe os padrões NET e DOTS. AutoCAD e ZWCAD usam a geometria gravada no arquivo.
- Não foi possível testar no AutoCAD e no ZWCAD neste ambiente. Os arquivos seguem a estrutura de referência do DXF 2000 e passam na auditoria do ezdxf.

## v6.2 — Estilos de cota (DDIM) e início em branco

### Novo: gerenciador de estilos de cota (DDIM)
Pode ser aberto pelos comandos `DDIM`, `DIMSTYLE` ou `DST`, pelo botão **DimStyle** da faixa de opções ou pelo ⚙ ao lado de "Est. cota" no painel de propriedades.

- **Gerenciador**: lista de estilos (★ = atual, com contagem de cotas em uso) e filtro "Todos / Em uso". Mostra uma pré-visualização com peça de exemplo cotada (linear, alinhada, diâmetro, raio e angular) e um resumo do estilo. Botões: Definir atual, Novo, Modificar, Renomear, Excluir e Aplicar à seleção.
- **Novo estilo**: nome, "Começar com" (estilo-base) e opção de já defini-lo como atual.
- **Editor em 7 abas**, como no AutoCAD, com pré-visualização ao vivo:
  - *Linhas*: cor e espessura da linha de cota e das extensões, supressões, prolongamento, afastamento da origem e comprimento fixo.
  - *Símbolos e setas*: seta preenchida, aberta, aberta 90°, traço oblíquo, ponto ou nenhuma; tamanho; marca de centro (marca ou linha de centro).
  - *Texto*: fonte, cor, altura, fundo sob o texto, posição vertical e horizontal, afastamento e alinhamento (horizontal, alinhado ou ISO).
  - *Ajuste*: melhor ajuste (setas e/ou texto vão para fora quando não cabem) ou manter dentro; linha entre extensões; **escala global**.
  - *Unidades primárias*: formato, unidade exibida (mm, cm, m, pol.), precisão, **separador decimal** (ponto, vírgula ou espaço), arredondamento, prefixo e sufixo, fator de escala da medida e supressão de zeros. Para ângulos: graus decimais, graus/min/seg, grados ou radianos, com precisão própria.
  - *Unidades alternativas*: multiplicador, precisão, prefixo, sufixo e posição.
  - *Tolerâncias*: simétrica (±), desvio (+/−, empilhado), limites (máx./mín.) e básica (em caixa).
- Cada campo mostra a **variável equivalente do AutoCAD** (DIMASZ, DIMTXT, DIMDSEP etc.), como apoio didático.
- Cancelar descarta as alterações. Valores inválidos são destacados e impedem salvar.
- Estilos de fábrica: **Standard** e **ABNT** (vírgula decimal e zeros finais suprimidos).

### Motor de cotas reescrito
- Um único gerador de geometria desenha as cotas na tela, na pré-visualização durante a criação, no Layout, na seleção e na exportação DXF/SVG. O que se vê é o que se exporta.
- **Tamanhos reais**: setas, textos e afastamentos em mm do desenho × escala global, como no AutoCAD. Na v6.1, um fator interno de 0,1 deixava as cotas com tamanho dependente do zoom. Na tela há uma altura mínima de leitura; a exportação e a impressão usam o tamanho real.
- **Cotas associativas ao estilo**: modificar um estilo redesenha todas as cotas que o usam.
- **Valor medido a partir da geometria** (linear, alinhada e angular): escalar ou girar a cota atualiza o valor.
- Cota angular: o lado do cursor define o setor medido (por exemplo, 90° ou 270°) e a posição do arco. Linhas de extensão são desenhadas quando o arco passa além das pernas.
- Raio e diâmetro: texto dentro ou fora do círculo, linha de chamada horizontal ou alinhada e marca de centro.
- Seleção por clique em qualquer parte da cota, inclusive no texto.

### Integração
- Os estilos de cota são **salvos no arquivo JSON** e restaurados ao abrir. Arquivos antigos abrem com os estilos padrão. Novo documento redefine os estilos.
- Painel de propriedades: seletor "Est. cota". Com cotas selecionadas, aplica o estilo a elas (com desfazer).

### Início em branco
- O aplicativo abre com a área de desenho **vazia**. O desenho de exemplo continua disponível pelo comando `DEMO`.

### Testes
- `tests/test_cotas.py`: 30 testes do DDIM e do motor de cotas, incluindo DXF validado com ezdxf.
- `tests/test_navegador.py`: os 32 testes de regressão da v6.1 continuam passando.

### Observação de compatibilidade
- Em desenhos da v6.1, as cotas passam a ser exibidas em tamanho real (setas e textos de 2,5 mm). Se ficarem pequenas ou grandes demais para a escala do desenho, ajuste a **Escala global** na aba Ajuste do DDIM.

## v6.1 — Estabilização

Versão de correção da v6.0. Sem novos comandos, exceto Espaço = Enter. Todas as correções foram verificadas no Chromium por `tests/test_navegador.py` (32 testes).

### Críticas
- **Undo/Redo**: Ctrl+Z desfazia duas operações e o Ctrl+Y restaurava só uma, com perda de trabalho. Agora há um único modelo: o estado anterior é salvo antes de cada mutação. FILLET e CHAMFER passam a ser desfeitos num único passo. O limite subiu de 60 para 100 passos.
- **Atalhos dentro de diálogos**: digitar no diálogo de TEXTO (ou de camadas, cotas etc.) trocava de ferramenta e o texto não era inserido. O Backspace apagava os objetos selecionados. Os atalhos agora ficam inativos em campos de formulário e com diálogos abertos. Enter confirma o texto e Esc fecha o diálogo.
- **Exportação DXF**: só eram gravados LINE, CIRCLE, ARC e TEXT. Agora o DXF R12 (AC1009) inclui retângulos, polilinhas, polígonos, elipses e splines (como POLYLINE), hachuras (contorno + linhas/pontos) e cotas (linhas, setas SOLID e textos). Também inclui tipos de linha (DASHED, CENTER, HIDDEN...), cores ACI mais próximas, camadas desligadas e bloqueadas, acentos (`\U+XXXX`) e símbolos (`%%c`, `%%d`). As opções "DXF 2007+" e "DWG" foram removidas, porque geravam arquivos inválidos ou enganosos.

### Altas
- ROTATE e MIRROR agora tratam corretamente arcos (ângulos), retângulos (convertidos em polilinha fechada), elipses (rotação), splines, textos (rotação) e cotas. Antes, splines e cotas eram ignoradas.
- ARC por 3 pontos em sentido horário gerava o arco complementar.
- ELLIPSE ignorava a inclinação do eixo maior. Agora tem rotação no desenho, no snap, na seleção, no Layout e na exportação.
- IDs repetidos após abrir um arquivo JSON.
- XSS: nomes de camada vindos de um JSON eram inseridos como HTML. O arquivo agora também é validado antes de carregar.
- ORTHO e POLAR anulavam o OSNAP. Agora o OSNAP tem prioridade, como no AutoCAD.
- O snap de interseção era O(n²) a cada movimento do mouse (cerca de 100 ms com 2.000 linhas). Agora só considera objetos próximos ao cursor (cerca de 2 ms).

### Médias
- OFFSET em polilinha criava uma cópia sobreposta. Agora funciona em polilinhas abertas e fechadas. Spline é recusada com aviso, e distâncias que inverteriam o objeto são bloqueadas.
- COPY com `@dx,dy` ou com distância digitada usava o cursor como base, e não o ponto base.
- FILLET e CHAMFER alteravam a extremidade errada quando o clique era longe do canto. FILLET com raio 0 cria canto vivo.
- FILLET aceitava clicar em arco ou círculo e depois recusava. Agora só aceita linhas, com mensagem explicativa.
- A seleção por janela não incluía textos e cotas, e o Zoom Fit os ignorava.
- O clique de seleção usava o ponto com snap e às vezes "escorregava" do objeto.
- O clique para selecionar texto ficava abaixo do texto. Texto selecionado agora é destacado.
- Excluir uma camada apagava seus objetos sem confirmação nem undo. Agora pede confirmação e move os objetos para a camada 0.
- Aviso ao fechar a aba com alterações não salvas.
- O `U` dentro do LINE podia retomar de uma linha que não era da cadeia atual.
- SVG: `viewBox` ajustado ao desenho (antes fixo em ±500), unidades em mm, arcos, splines, hachuras e cotas, e texto escapado.
- PNG: fundo preservado, sem pré-visualização nem anotações do modo didático.
- Layout: splines não eram impressas, e elipses e textos perdiam a rotação.

### Baixas
- Removido o script `/cdn-cgi/...email-decode.min.js`, resíduo do Cloudflare que gerava erro 404.
- Corrigido o seletor CSS inválido `.#cw.pan-active`.
- Removido o listener de Enter sem efeito.

### Novo
- **Espaço = Enter** fora de campos de texto: finaliza o comando ou repete o último, como no AutoCAD.

### Limitações conhecidas (previstas para a v7)
- ROTATE e SCALE ainda usam caixa de diálogo do navegador, sem pré-visualização nem opção Reference.
- Atalhos de tecla única no desenho divergem do AutoCAD (`E` = Elipse, `S` = Select, `R` = Retângulo). Prompts sem opções `[ ]`.
- Sem grips editáveis, BLOCK/INSERT, EXPLODE, STRETCH, líderes, ByLayer real nem edição de propriedades da seleção.
- Hachura somente retangular. Ao girar, preserva a orientação do contorno e gira o padrão.
- FILLET e CHAMFER apenas entre linhas. Cotas não associativas.
- Seleção por janela/crossing baseada em retângulo envolvente.
- Sem suporte a toque e sem nitidez em telas HiDPI.
