/* ═══════════════════════════════════════════════════════════════════
   v8.13 — BIBLIOTECA DE BLOCOS (paleta visual, como as Tool Palettes do AutoCAD)
   • Catálogo por grupo (Arquitetura, Topografia, Mecânico) e categoria, com
     miniaturas, busca e descrição. Clique num bloco e clique no desenho.
   • Cada item vira um BLOCO de verdade (BLOCK/INSERT, igual ao comando I e
     ao DXF): definido só quando é usado, com o nome do item (ex.: PORTA_ABRIR_80).
   • Itens paramétricos (largura da porta, da janela, nº de degraus…) geram um
     bloco por valor — a alternativa leve aos "blocos dinâmicos" do AutoCAD.
   • Escala automática: objetos reais (portas, móveis) são desenhados em metros
     e convertidos para a unidade do desenho; símbolos (norte, marcos, postes)
     são desenhados em mm de papel e seguem a escala de anotação.
   • Camada automática (ARQ-PORTA, TOP-PONTOS… quando existir no desenho).
   • Inserção: ponto → rotação (arraste, digite ou Enter) e repete até Esc;
     opções Rotação, Escala e Espelhar na linha de comando ou na paleta.
   • Abas "Do desenho" (blocos deste desenho) e "Meus blocos" (guardados no
     navegador, com a unidade de origem).
   ═══════════════════════════════════════════════════════════════════ */
// ── geometria (unidades do item: m ou mm de papel) ──────────────────────────
function bL(a,b,c,d){ return {tp:'line',x1:a,y1:b,x2:c,y2:d,ly:0}; }
function bC(x,y,r){ return {tp:'circ',cx:x,cy:y,r:r,ly:0}; }
function bA(x,y,r,a0,a1){ return {tp:'arc',cx:x,cy:y,r:r,sa:a0*Math.PI/180,ea:a1*Math.PI/180,ly:0}; }
function bP(f,closed){ var p=[]; for(var i=0;i+1<f.length;i+=2) p.push({x:f[i],y:f[i+1]}); if(closed) p.push({x:p[0].x,y:p[0].y}); return {tp:'pl',closed:!!closed,pts:p,ly:0}; }
function bR(x,y,w,h){ return bP([x,y,x+w,y,x+w,y+h,x,y+h],true); }
function bE(x,y,rx,ry,rot){ return {tp:'ell',cx:x,cy:y,rx:rx,ry:ry,rot:(rot||0)*Math.PI/180,ly:0}; }
function bT(x,y,h,t){ return {tp:'txt',x:x,y:y,h:h,txt:t,rot:0,ly:0}; }
function bS(f){ var p=[]; for(var i=0;i+1<f.length;i+=2) p.push({x:f[i],y:f[i+1]}); var e={tp:'hatch',loops:[p],htype:'pat',pname:'SOLID',ang:0,sp:1,ly:0}; hatchSync(e); return e; }
function bCirclePts(x,y,r,a0,a1,n){ var f=[]; for(var i=0;i<=n;i++){ var a=(a0+(a1-a0)*i/n)*Math.PI/180; f.push(x+r*Math.cos(a),y+r*Math.sin(a)); } return f; }
function bRot(ents,deg,cx,cy){ return ents.map(function(e){ var c=JSON.parse(JSON.stringify(e)); rotat(c,{x:cx||0,y:cy||0},deg*Math.PI/180); return c; }); }
function bMov(ents,dx,dy){ return ents.map(function(e){ var c=JSON.parse(JSON.stringify(e)); transl(c,dx,dy); return c; }); }
function bScallop(r,n,lobe){ var o=[]; for(var i=0;i<n;i++){ var t=i*360/n,R=r-lobe; o.push(bA(R*Math.cos(t*Math.PI/180),R*Math.sin(t*Math.PI/180),lobe,t-75,t+75)); } return o; }
function bCadeira(){ return [bR(-0.22,-0.22,0.44,0.44),bR(-0.22,0.17,0.44,0.07)]; } // encosto para +y
function bCadeiraEm(x,y,deg){ return bMov(bRot(bCadeira(),deg),x,y); }
function bArrowHead(x,y,deg,len,wid){ var a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a),bx=x-c*len,by=y-s*len; return bS([x,y,bx-s*wid/2,by+c*wid/2,bx+s*wid/2,by-c*wid/2]); }
function f2(v){ return String(Math.round(v*100)/100).replace('.',','); }
// ── catálogo ────────────────────────────────────────────────────────────────
// un: 'm' (tamanho real em metros) | 'papel' (mm impressos; segue a escala de anotação)
var BIB_GRUPOS=[{id:'arq',nome:'Arquitetura'},{id:'top',nome:'Topografia'},{id:'mec',nome:'Mecânico'}];
var BIB=[
 // ARQUITETURA ─ portas
 {id:'PORTA_ABRIR',g:'arq',cat:'Portas',nome:'Porta de abrir',un:'m',ly:'ARQ-PORTA',rot:true,par:{nome:'Vão (m)',ops:[0.6,0.7,0.8,0.9,1.0],def:0.8,min:0.4,max:1.5},
  desc:'Folha e arco de giro. Base na dobradiça, vão ao longo de +X. Use Espelhar (M) para abrir para o outro lado.',
  f:function(w){ return [bR(0,0,0.035,w),bA(0,0,w,0,90),bL(0,0,w,0)]; }},
 {id:'PORTA_DUPLA',g:'arq',cat:'Portas',nome:'Porta de abrir dupla',un:'m',ly:'ARQ-PORTA',rot:true,par:{nome:'Vão (m)',ops:[1.2,1.4,1.6,2.0],def:1.4,min:0.8,max:3},
  desc:'Duas folhas de abrir. Base no canto esquerdo do vão.',
  f:function(w){ var h=w/2; return [bR(0,0,0.035,h),bA(0,0,h,0,90),bR(w-0.035,0,0.035,h),bA(w,0,h,90,180),bL(0,0,w,0)]; }},
 {id:'PORTA_CORRER',g:'arq',cat:'Portas',nome:'Porta de correr',un:'m',ly:'ARQ-PORTA',rot:true,par:{nome:'Vão (m)',ops:[0.8,1.0,1.2,1.6,2.0],def:1.2,min:0.6,max:4},
  desc:'Duas folhas de correr numa parede de 15 cm. Base na face da parede, no início do vão.',
  f:function(w){ var h=w/2; return [bL(0,0,0,0.15),bL(w,0,w,0.15),bR(0,0.04,h+0.05,0.035),bR(h-0.05,0.075,h+0.05,0.035)]; }},
 {id:'PORTAO',g:'arq',cat:'Portas',nome:'Portão de correr',un:'m',ly:'ARQ-PORTA',rot:true,par:{nome:'Vão (m)',ops:[2.5,3.0,3.5,4.0],def:3,min:1,max:8},
  desc:'Portão de correr (garagem). Base no início do vão.',
  f:function(w){ return [bR(0,0.02,w,0.05),bL(0,0.1,w*0.6,0.1),bArrowHead(w*0.6+0.25,0.1,0,0.25,0.12)]; }},
 // janelas
 {id:'JANELA_CORRER',g:'arq',cat:'Janelas',nome:'Janela de correr',un:'m',ly:'ARQ-JANELA',rot:true,par:{nome:'Vão (m)',ops:[1.0,1.2,1.5,2.0],def:1.2,min:0.4,max:4},
  desc:'Peitoril e duas folhas, parede de 15 cm. Base na face da parede, no início do vão.',
  f:function(w){ var h=w/2; return [bL(0,0,w,0),bL(0,0.15,w,0.15),bL(0,0,0,0.15),bL(w,0,w,0.15),bL(0,0.065,h+0.05,0.065),bL(h-0.05,0.085,w,0.085)]; }},
 {id:'JANELA_BASCULANTE',g:'arq',cat:'Janelas',nome:'Janela basculante',un:'m',ly:'ARQ-JANELA',rot:true,par:{nome:'Vão (m)',ops:[0.4,0.6,0.8,1.0],def:0.6,min:0.3,max:2},
  desc:'Basculante (banheiro, serviço), parede de 15 cm.',
  f:function(w){ return [bL(0,0,w,0),bL(0,0.15,w,0.15),bL(0,0,0,0.15),bL(w,0,w,0.15),bL(0,0.075,w,0.075)]; }},
 {id:'JANELA_ABRIR',g:'arq',cat:'Janelas',nome:'Janela de abrir (2 folhas)',un:'m',ly:'ARQ-JANELA',rot:true,par:{nome:'Vão (m)',ops:[0.8,1.0,1.2,1.5],def:1.0,min:0.4,max:3},
  desc:'Duas folhas de abrir para dentro (+Y), parede de 15 cm.',
  f:function(w){ var h=w/2; return [bL(0,0,w,0),bL(0,0.15,w,0.15),bL(0,0,0,0.15),bL(w,0,w,0.15),bL(0,0.075,w,0.075),bL(0,0.15,0,0.15+h),bA(0,0.15,h,0,90),bL(w,0.15,w,0.15+h),bA(w,0.15,h,90,180)]; }},
 // banheiro e serviço
 {id:'VASO_SANITARIO',g:'arq',cat:'Banheiro e serviço',nome:'Vaso sanitário',un:'m',ly:'ARQ-LOUCAS',rot:true,desc:'Bacia com caixa acoplada (40 × 68 cm). Base no centro da parede de fundo.',
  f:function(){ return [bR(-0.2,0,0.4,0.17),bE(0,0.43,0.18,0.25),bE(0,0.45,0.11,0.16)]; }},
 {id:'LAVATORIO',g:'arq',cat:'Banheiro e serviço',nome:'Lavatório',un:'m',ly:'ARQ-LOUCAS',rot:true,desc:'Lavatório de 50 cm. Base no centro da parede.',
  f:function(){ return [bL(-0.25,0,0.25,0),bL(-0.25,0,-0.25,0.2),bL(0.25,0,0.25,0.2),bA(0,0.2,0.25,0,180),bE(0,0.22,0.17,0.11),bC(0,0.22,0.02),bL(0,0.03,0,0.09)]; }},
 {id:'CHUVEIRO',g:'arq',cat:'Banheiro e serviço',nome:'Box de chuveiro',un:'m',ly:'ARQ-LOUCAS',rot:true,par:{nome:'Lado (m)',ops:[0.8,0.9,1.0,1.2],def:0.9,min:0.7,max:2},
  desc:'Área do box com ralo. Base no canto.',
  f:function(w){ return [bR(0,0,w,w),bL(0,0,w,w),bL(0,w,w,0),bC(w/2,w/2,0.05)]; }},
 {id:'BANHEIRA',g:'arq',cat:'Banheiro e serviço',nome:'Banheira',un:'m',ly:'ARQ-LOUCAS',rot:true,desc:'Banheira 1,70 × 0,75 m. Base no canto.',
  f:function(){ return [bR(0,0,1.7,0.75),bR(0.07,0.07,1.56,0.61),bC(0.2,0.375,0.03)]; }},
 {id:'BANCADA_COZINHA',g:'arq',cat:'Banheiro e serviço',nome:'Bancada com cuba',un:'m',ly:'ARQ-LOUCAS',rot:true,par:{nome:'Comprimento (m)',ops:[1.2,1.5,1.8,2.0],def:1.5,min:0.8,max:4},
  desc:'Bancada de 60 cm de profundidade com cuba central. Base no canto de trás.',
  f:function(w){ return [bR(0,0,w,0.6),bR(w/2-0.25,0.1,0.5,0.4),bC(w/2,0.3,0.025),bL(w/2,0.04,w/2,0.12)]; }},
 {id:'TANQUE',g:'arq',cat:'Banheiro e serviço',nome:'Tanque',un:'m',ly:'ARQ-LOUCAS',rot:true,desc:'Tanque de lavar 60 × 55 cm. Base no canto de trás.',
  f:function(){ return [bR(0,0,0.6,0.55),bR(0.06,0.06,0.48,0.43),bC(0.3,0.25,0.025)]; }},
 {id:'MAQ_LAVAR',g:'arq',cat:'Banheiro e serviço',nome:'Máquina de lavar',un:'m',ly:'ARQ-MOBILIARIO',rot:true,desc:'60 × 60 cm. Base no canto de trás.',
  f:function(){ return [bR(0,0,0.6,0.6),bC(0.3,0.32,0.22),bL(0.05,0.08,0.55,0.08)]; }},
 // cozinha
 {id:'FOGAO_4',g:'arq',cat:'Cozinha',nome:'Fogão 4 bocas',un:'m',ly:'ARQ-MOBILIARIO',rot:true,desc:'55 × 60 cm. Base no canto de trás.',
  f:function(){ var o=[bR(0,0,0.55,0.6)]; [[0.15,0.18],[0.4,0.18],[0.15,0.43],[0.4,0.43]].forEach(function(q){ o.push(bC(q[0],q[1],0.08),bC(q[0],q[1],0.03)); }); return o; }},
 {id:'GELADEIRA',g:'arq',cat:'Cozinha',nome:'Geladeira',un:'m',ly:'ARQ-MOBILIARIO',rot:true,desc:'70 × 70 cm. Base no canto de trás.',
  f:function(){ return [bR(0,0,0.7,0.7),bL(0,0.62,0.7,0.62),bT(0.17,0.28,0.13,'GEL')]; }},
 {id:'MESA_4',g:'arq',cat:'Cozinha',nome:'Mesa quadrada 4 lugares',un:'m',ly:'ARQ-MOBILIARIO',rot:false,desc:'Mesa 90 × 90 cm com 4 cadeiras. Base no centro.',
  f:function(){ return [bR(-0.45,-0.45,0.9,0.9)].concat(bCadeiraEm(0,0.62,0),bCadeiraEm(0,-0.62,180),bCadeiraEm(0.62,0,-90),bCadeiraEm(-0.62,0,90)); }},
 // estar e jantar
 {id:'MESA_6',g:'arq',cat:'Estar e jantar',nome:'Mesa 6 lugares',un:'m',ly:'ARQ-MOBILIARIO',rot:true,desc:'Mesa 1,60 × 0,90 m com 6 cadeiras. Base no centro.',
  f:function(){ return [bR(-0.8,-0.45,1.6,0.9)].concat(bCadeiraEm(-0.45,0.62,0),bCadeiraEm(0.45,0.62,0),bCadeiraEm(-0.45,-0.62,180),bCadeiraEm(0.45,-0.62,180),bCadeiraEm(1.02,0,-90),bCadeiraEm(-1.02,0,90)); }},
 {id:'MESA_REDONDA',g:'arq',cat:'Estar e jantar',nome:'Mesa redonda 4 lugares',un:'m',ly:'ARQ-MOBILIARIO',rot:false,desc:'Mesa Ø 1,00 m com 4 cadeiras. Base no centro.',
  f:function(){ return [bC(0,0,0.5)].concat(bCadeiraEm(0,0.68,0),bCadeiraEm(0,-0.68,180),bCadeiraEm(0.68,0,-90),bCadeiraEm(-0.68,0,90)); }},
 {id:'CADEIRA',g:'arq',cat:'Estar e jantar',nome:'Cadeira',un:'m',ly:'ARQ-MOBILIARIO',rot:true,desc:'44 × 44 cm, encosto voltado para +Y. Base no centro.',f:function(){ return bCadeira(); }},
 {id:'SOFA',g:'arq',cat:'Estar e jantar',nome:'Sofá',un:'m',ly:'ARQ-MOBILIARIO',rot:true,par:{nome:'Lugares',ops:[2,3],def:3,min:1,max:5,int:true},
  desc:'Sofá de 2 ou 3 lugares (0,85 m de profundidade). Base no canto de trás.',
  f:function(n){ var w=0.36+0.6*n,o=[bR(0,0,w,0.85),bL(0,0.2,w,0.2),bL(0.18,0.2,0.18,0.85),bL(w-0.18,0.2,w-0.18,0.85)]; for(var i=1;i<n;i++) o.push(bL(0.18+0.6*i,0.2,0.18+0.6*i,0.85)); return o; }},
 {id:'POLTRONA',g:'arq',cat:'Estar e jantar',nome:'Poltrona',un:'m',ly:'ARQ-MOBILIARIO',rot:true,desc:'80 × 80 cm. Base no canto de trás.',
  f:function(){ return [bR(0,0,0.8,0.8),bL(0,0.2,0.8,0.2),bL(0.15,0.2,0.15,0.8),bL(0.65,0.2,0.65,0.8)]; }},
 {id:'MESA_CENTRO',g:'arq',cat:'Estar e jantar',nome:'Mesa de centro',un:'m',ly:'ARQ-MOBILIARIO',rot:true,desc:'1,00 × 0,50 m. Base no centro.',f:function(){ return [bR(-0.5,-0.25,1,0.5),bR(-0.45,-0.2,0.9,0.4)]; }},
 {id:'RACK_TV',g:'arq',cat:'Estar e jantar',nome:'Rack com TV',un:'m',ly:'ARQ-MOBILIARIO',rot:true,desc:'1,80 × 0,45 m. Base no canto de trás.',f:function(){ return [bR(0,0,1.8,0.45),bR(0.4,0.05,1.0,0.08)]; }},
 {id:'ESCRIVANINHA',g:'arq',cat:'Estar e jantar',nome:'Escrivaninha com cadeira',un:'m',ly:'ARQ-MOBILIARIO',rot:true,desc:'1,20 × 0,60 m. Base no canto de trás.',
  f:function(){ return [bR(0,0,1.2,0.6)].concat(bCadeiraEm(0.6,0.85,180)); }},
 // dormitório
 {id:'CAMA_SOLTEIRO',g:'arq',cat:'Dormitório',nome:'Cama de solteiro',un:'m',ly:'ARQ-MOBILIARIO',rot:true,desc:'0,88 × 1,88 m. Base no canto da cabeceira.',
  f:function(){ return [bR(0,0,0.88,1.88),bR(0.1,0.07,0.68,0.32),bL(0,0.55,0.88,0.55),bL(0.88,0.55,0.6,0.75)]; }},
 {id:'CAMA_CASAL',g:'arq',cat:'Dormitório',nome:'Cama de casal',un:'m',ly:'ARQ-MOBILIARIO',rot:true,par:{nome:'Largura (m)',ops:[1.38,1.58,1.93],def:1.38,min:1,max:2.2},
  desc:'Casal (1,38), queen (1,58) ou king (1,93) × 1,88–2,03 m. Base no canto da cabeceira.',
  f:function(w){ var L=w>1.5?1.98:1.88,p=(w-0.2)/2-0.05; return [bR(0,0,w,L),bR(0.1,0.07,p,0.32),bR(w-0.1-p,0.07,p,0.32),bL(0,0.55,w,0.55),bL(w,0.55,w-0.3,0.75)]; }},
 {id:'BERCO',g:'arq',cat:'Dormitório',nome:'Berço',un:'m',ly:'ARQ-MOBILIARIO',rot:true,desc:'0,60 × 1,30 m. Base no canto.',f:function(){ return [bR(0,0,0.6,1.3),bR(0.04,0.04,0.52,1.22)]; }},
 {id:'GUARDA_ROUPA',g:'arq',cat:'Dormitório',nome:'Guarda-roupa',un:'m',ly:'ARQ-MOBILIARIO',rot:true,par:{nome:'Comprimento (m)',ops:[1.2,1.6,2.0,2.4],def:1.6,min:0.6,max:4},
  desc:'60 cm de profundidade, com cabides. Base no canto de trás.',
  f:function(w){ var o=[bR(0,0,w,0.6),bL(0.05,0.3,w-0.05,0.3)]; for(var x=0.15;x<w-0.1;x+=0.2) o.push(bL(x-0.04,0.18,x+0.04,0.42)); return o; }},
 {id:'CRIADO_MUDO',g:'arq',cat:'Dormitório',nome:'Criado-mudo',un:'m',ly:'ARQ-MOBILIARIO',rot:true,desc:'45 × 40 cm com abajur. Base no canto de trás.',f:function(){ return [bR(0,0,0.45,0.4),bC(0.225,0.2,0.1)]; }},
 // escadas
 {id:'ESCADA_RETA',g:'arq',cat:'Escadas',nome:'Escada reta',un:'m',ly:'ARQ-MOBILIARIO',rot:true,par:{nome:'Degraus',ops:[8,12,16,18],def:16,min:3,max:30,int:true},
  desc:'Largura 1,00 m, piso 28 cm, linha de percurso com seta (sobe para +Y). Base no canto do primeiro degrau.',
  f:function(n){ var L=n*0.28,o=[bL(0,0,0,L),bL(1,0,1,L)]; for(var i=0;i<=n;i++) o.push(bL(0,i*0.28,1,i*0.28)); o.push(bC(0.5,0.14,0.04),bL(0.5,0.14,0.5,L-0.2),bArrowHead(0.5,L-0.05,90,0.18,0.12)); return o; }},
 {id:'ESCADA_L',g:'arq',cat:'Escadas',nome:'Escada em L com patamar',un:'m',ly:'ARQ-MOBILIARIO',rot:true,par:{nome:'Degraus por lance',ops:[6,8,9],def:8,min:3,max:15,int:true},
  desc:'Dois lances de 1,00 m com patamar quadrado. Base no canto do primeiro degrau.',
  f:function(n){ var L=n*0.28,o=[bL(0,0,0,L+1),bL(1,0,1,L),bL(0,L+1,1+L+1,L+1),bL(1,L,L+2,L),bL(L+2,L,L+2,L+1)]; for(var i=0;i<=n;i++){ o.push(bL(0,i*0.28,1,i*0.28)); o.push(bL(1+1+i*0.28,L,1+1+i*0.28,L+1)); } o.push(bC(0.5,0.14,0.04),bL(0.5,0.14,0.5,L+0.5),bL(0.5,L+0.5,L+1.8,L+0.5),bArrowHead(L+1.95,L+0.5,0,0.18,0.12)); return o; }},
 // vegetação
 {id:'ARVORE_PLANTA',g:'arq',cat:'Vegetação',nome:'Árvore',un:'m',ly:'ARQ-PISO',rot:false,par:{nome:'Copa Ø (m)',ops:[2,3,4,6],def:3,min:0.5,max:20},
  desc:'Copa recortada e tronco. Base no centro.',f:function(d){ return bScallop(d/2,9,d*0.14).concat([bC(0,0,d*0.04)]); }},
 {id:'ARBUSTO',g:'arq',cat:'Vegetação',nome:'Arbusto',un:'m',ly:'ARQ-PISO',rot:false,desc:'Ø 1,00 m. Base no centro.',f:function(){ return bScallop(0.5,7,0.15).concat([bC(0,0,0.25)]); }},
 {id:'PALMEIRA',g:'arq',cat:'Vegetação',nome:'Palmeira',un:'m',ly:'ARQ-PISO',rot:false,desc:'Ø 3,00 m, folhas radiais. Base no centro.',
  f:function(){ var o=[bC(0,0,0.15)]; for(var i=0;i<8;i++){ var a=i*45*Math.PI/180,c=Math.cos(a),s=Math.sin(a); o.push(bL(0.15*c,0.15*s,1.5*c,1.5*s)); var m=0.9; o.push(bL(m*c,m*s,(m+0.35)*c-0.2*s,(m+0.35)*s+0.2*c),bL(m*c,m*s,(m+0.35)*c+0.2*s,(m+0.35)*s-0.2*c)); } return o; }},
 {id:'VASO_PLANTA',g:'arq',cat:'Vegetação',nome:'Vaso com planta',un:'m',ly:'ARQ-MOBILIARIO',rot:false,desc:'Ø 50 cm. Base no centro.',f:function(){ return [bC(0,0,0.25),bC(0,0,0.2)].concat(bScallop(0.17,6,0.06)); }},
 // veículos
 {id:'CARRO',g:'arq',cat:'Veículos',nome:'Automóvel',un:'m',ly:'ARQ-MOBILIARIO',rot:true,desc:'1,80 × 4,50 m (vaga mínima 2,50 × 5,00). Frente para +Y. Base no centro.',
  f:function(){ return [bP([-0.8,-2.25,0.8,-2.25,0.9,-2.05,0.9,2.0,0.7,2.25,-0.7,2.25,-0.9,2.0,-0.9,-2.05],true),bP([-0.75,0.4,0.75,0.4,0.65,1.05,-0.65,1.05],true),bP([-0.7,-1.2,0.7,-1.2,0.62,-1.65,-0.62,-1.65],true),bL(-0.9,1.25,-1.05,1.15),bL(0.9,1.25,1.05,1.15)]; }},
 // símbolos de projeto (papel)
 {id:'NORTE',g:'arq,top',cat:'Orientação',nome:'Norte (rosa)',un:'papel',ly:'0',rot:true,desc:'Ø 12 mm impressos. Use no layout (folha) ou no Model, na escala de anotação.',
  f:function(){ return [bC(0,0,6),bP([0,9,3,-4,0,-1.5,-3,-4],true),bS([0,9,0,-1.5,-3,-4]),bT(-1.4,10.4,3.5,'N')]; }},
 {id:'NORTE_SETA',g:'arq,top',cat:'Orientação',nome:'Norte (seta)',un:'papel',ly:'0',rot:true,desc:'Seta de 15 mm com N.',
  f:function(){ return [bL(0,-7,0,7),bS([0,8,-2.2,3,0,4.2,2.2,3]),bT(-1.4,9.6,3.5,'N')]; }},
 {id:'NIVEL_PLANTA',g:'arq',cat:'Símbolos',nome:'Nível em planta',un:'papel',ly:'ARQ-NIVEL',rot:false,desc:'Círculo Ø 5 mm com quadrantes cheios; escreva o nível ao lado (+0,00).',
  f:function(){ return [bC(0,0,2.5),bL(-4,0,4,0),bL(0,-4,0,4),bS([0,0].concat(bCirclePts(0,0,2.5,0,90,8))),bS([0,0].concat(bCirclePts(0,0,2.5,180,270,8)))]; }},
 {id:'CORTE_IND',g:'arq',cat:'Símbolos',nome:'Indicação de corte',un:'papel',ly:'ARQ-CORTE',rot:true,desc:'Traço do plano, seta do sentido de vista e letra (A). Insira um em cada ponta.',
  f:function(){ return [bP([0,0,0,8],false),bL(0,8,5,8),bArrowHead(6,8,0,2.5,1.6),bT(1.2,9.6,3.5,'A')]; }},
 {id:'EIXO_BOLHA',g:'arq',cat:'Símbolos',nome:'Bolha de eixo',un:'papel',ly:'ARQ-EIXO',rot:false,desc:'Círculo Ø 10 mm na ponta da linha de eixo (escreva o número ou a letra).',f:function(){ return [bC(0,5,5)]; }},
 {id:'ELEVACAO_IND',g:'arq',cat:'Símbolos',nome:'Indicação de vista',un:'papel',ly:'ARQ-CORTE',rot:true,desc:'Círculo com seta (fachadas/vistas internas).',
  f:function(){ return [bC(0,0,4),bS([0,6.5,-3.5,1.6,3.5,1.6])]; }},
 // TOPOGRAFIA ─ pontos e marcos (papel)
 {id:'MARCO_GEODESICO',g:'top',cat:'Pontos e marcos',nome:'Marco geodésico',un:'papel',ly:'TOP-PONTOS',rot:false,desc:'Triângulo de 3 mm com ponto central (vértice de apoio, SGB).',
  f:function(){ var h=3*Math.sqrt(3)/2; return [bP([-1.5,-h/3,1.5,-h/3,0,2*h/3],true),{tp:'point',x:0,y:0,ly:0},bC(0,0,0.25)]; }},
 {id:'MARCO',g:'top',cat:'Pontos e marcos',nome:'Marco de concreto',un:'papel',ly:'TOP-PONTOS',rot:false,desc:'Quadrado de 2 mm com ponto (vértice materializado).',f:function(){ return [bR(-1,-1,2,2),bC(0,0,0.25)]; }},
 {id:'VERTICE',g:'top',cat:'Pontos e marcos',nome:'Vértice do imóvel',un:'papel',ly:'TOP-LIMITE',rot:false,desc:'Círculo de 2 mm (vértice de divisa, SIGEF).',f:function(){ return [bC(0,0,1),{tp:'point',x:0,y:0,ly:0}]; }},
 {id:'PONTO_LEV',g:'top',cat:'Pontos e marcos',nome:'Ponto levantado',un:'papel',ly:'TOP-PONTOS',rot:false,desc:'Cruz de 1,5 mm com ponto (ponto irradiado).',f:function(){ return [bL(-0.75,0,0.75,0),bL(0,-0.75,0,0.75),{tp:'point',x:0,y:0,ly:0}]; }},
 {id:'PONTO_COTADO',g:'top',cat:'Pontos e marcos',nome:'Ponto cotado',un:'papel',ly:'TOP-COTA-ALTIMETRICA',rot:false,desc:'"×" de 1,2 mm; escreva a cota ao lado.',f:function(){ return [bL(-0.6,-0.6,0.6,0.6),bL(-0.6,0.6,0.6,-0.6)]; }},
 {id:'RN',g:'top',cat:'Pontos e marcos',nome:'Referência de nível (RN)',un:'papel',ly:'TOP-COTA-ALTIMETRICA',rot:false,desc:'Círculo de 3 mm com a metade inferior cheia.',
  f:function(){ return [bC(0,0,1.5),bL(-1.5,0,1.5,0),bS(bCirclePts(0,0,1.5,180,360,12))]; }},
 {id:'ESTACA',g:'top',cat:'Pontos e marcos',nome:'Estaca / piquete',un:'papel',ly:'TOP-PONTOS',rot:false,desc:'Quadrado cheio de 1 mm.',f:function(){ return [bS([-0.5,-0.5,0.5,-0.5,0.5,0.5,-0.5,0.5])]; }},
 {id:'ESTACAO',g:'top',cat:'Pontos e marcos',nome:'Estação da poligonal',un:'papel',ly:'TOP-POLIGONAL',rot:false,desc:'Círculo de 3 mm com triângulo (estação ocupada pelo instrumento).',
  f:function(){ return [bC(0,0,1.5),bP([-0.9,-0.6,0.9,-0.6,0,0.9],true)]; }},
 // infraestrutura e drenagem
 {id:'POSTE',g:'top',cat:'Infraestrutura e drenagem',nome:'Poste de energia',un:'papel',ly:'TOP-EDIFICACAO',rot:false,desc:'Círculo de 2 mm com centro cheio.',f:function(){ return [bC(0,0,1),bS(bCirclePts(0,0,0.4,0,360,12))]; }},
 {id:'POSTE_LUZ',g:'top',cat:'Infraestrutura e drenagem',nome:'Poste de iluminação',un:'papel',ly:'TOP-EDIFICACAO',rot:false,desc:'Círculo com raios.',
  f:function(){ var o=[bC(0,0,0.8)]; for(var i=0;i<4;i++){ var a=(45+i*90)*Math.PI/180; o.push(bL(1.1*Math.cos(a),1.1*Math.sin(a),1.9*Math.cos(a),1.9*Math.sin(a))); } return o; }},
 {id:'TORRE',g:'top',cat:'Infraestrutura e drenagem',nome:'Torre de transmissão',un:'papel',ly:'TOP-EDIFICACAO',rot:true,desc:'Quadrado de 3 mm com diagonais.',f:function(){ return [bR(-1.5,-1.5,3,3),bL(-1.5,-1.5,1.5,1.5),bL(-1.5,1.5,1.5,-1.5)]; }},
 {id:'BOCA_LOBO',g:'top',cat:'Infraestrutura e drenagem',nome:'Boca de lobo',un:'papel',ly:'TOP-HIDROGRAFIA',rot:true,desc:'Retângulo 3 × 1,5 mm com grelha; lado comprido no meio-fio.',
  f:function(){ return [bR(-1.5,-0.75,3,1.5),bL(-0.75,-0.75,-0.75,0.75),bL(0,-0.75,0,0.75),bL(0.75,-0.75,0.75,0.75)]; }},
 {id:'POCO_VISITA',g:'top',cat:'Infraestrutura e drenagem',nome:'Poço de visita (PV)',un:'papel',ly:'TOP-HIDROGRAFIA',rot:false,desc:'Círculo duplo de 3 mm.',f:function(){ return [bC(0,0,1.5),bC(0,0,0.8)]; }},
 {id:'CAIXA_PASSAGEM',g:'top',cat:'Infraestrutura e drenagem',nome:'Caixa de passagem',un:'papel',ly:'TOP-EDIFICACAO',rot:true,desc:'Quadrado de 2 mm com X.',f:function(){ return [bR(-1,-1,2,2),bL(-1,-1,1,1),bL(-1,1,1,-1)]; }},
 {id:'BUEIRO',g:'top',cat:'Infraestrutura e drenagem',nome:'Bueiro (travessia)',un:'papel',ly:'TOP-HIDROGRAFIA',rot:true,desc:'Tubo sob a via, com alas; alinhe ao eixo do bueiro.',
  f:function(){ return [bL(-3,-0.8,3,-0.8),bL(-3,0.8,3,0.8),bL(-3,-0.8,-3.8,-1.6),bL(-3,0.8,-3.8,1.6),bL(3,-0.8,3.8,-1.6),bL(3,0.8,3.8,1.6)]; }},
 {id:'HIDRANTE',g:'top',cat:'Infraestrutura e drenagem',nome:'Hidrante',un:'papel',ly:'TOP-EDIFICACAO',rot:false,desc:'Círculo de 2,4 mm com H.',f:function(){ return [bC(0,0,1.2),bT(-0.55,-0.65,1.3,'H')]; }},
 {id:'POCO_ARTESIANO',g:'top',cat:'Infraestrutura e drenagem',nome:'Poço',un:'papel',ly:'TOP-HIDROGRAFIA',rot:false,desc:'Círculo de 2,4 mm com anel cheio.',f:function(){ return [bC(0,0,1.2),bS(bCirclePts(0,0,0.5,0,360,12))]; }},
 {id:'CAIXA_DAGUA',g:'top',cat:'Infraestrutura e drenagem',nome:'Reservatório / caixa d’água',un:'papel',ly:'TOP-EDIFICACAO',rot:false,desc:'Quadrado de 3 mm com círculo.',f:function(){ return [bR(-1.5,-1.5,3,3),bC(0,0,1.1)]; }},
 // hidrografia
 {id:'SENTIDO_FLUXO',g:'top',cat:'Hidrografia',nome:'Sentido do escoamento',un:'papel',ly:'TOP-HIDROGRAFIA',rot:true,desc:'Seta de 8 mm (gire para o sentido da água).',f:function(){ return [bL(-4,0,2,0),bArrowHead(4,0,0,2,1.4)]; }},
 {id:'NASCENTE',g:'top',cat:'Hidrografia',nome:'Nascente',un:'papel',ly:'TOP-HIDROGRAFIA',rot:true,desc:'Círculo cheio com início do curso d’água.',
  f:function(){ return [bS(bCirclePts(0,0,0.8,0,360,12)),bP([0.8,0,1.6,0.5,2.4,-0.5,3.2,0.5,4,0],false)]; }},
 {id:'BREJO',g:'top',cat:'Hidrografia',nome:'Área alagadiça',un:'papel',ly:'TOP-HIDROGRAFIA',rot:false,desc:'Símbolo de brejo (repita sobre a área).',
  f:function(){ return [bL(-2,0,2,0),bL(-1.2,0.6,1.2,0.6),bL(0,0,0,1.6),bL(-0.5,0,-0.9,1.2),bL(0.5,0,0.9,1.2)]; }},
 // vegetação (papel)
 {id:'ARVORE',g:'top',cat:'Vegetação',nome:'Árvore isolada',un:'papel',ly:'TOP-VEGETACAO',rot:false,desc:'Círculo de 4 mm com centro (posição do tronco).',f:function(){ return [bC(0,0,2),bC(0,0,0.3)]; }},
 {id:'ARVORE_COPA',g:'top',cat:'Vegetação',nome:'Árvore (copa)',un:'papel',ly:'TOP-VEGETACAO',rot:false,desc:'Copa recortada de 5 mm.',f:function(){ return bScallop(2.5,8,0.7).concat([{tp:'point',x:0,y:0,ly:0}]); }},
 {id:'FRUTIFERA',g:'top',cat:'Vegetação',nome:'Frutífera',un:'papel',ly:'TOP-VEGETACAO',rot:false,desc:'Círculo de 3 mm com centro cheio.',f:function(){ return [bC(0,0,1.5),bS(bCirclePts(0,0,0.45,0,360,12))]; }},
 {id:'PALMEIRA_SIMB',g:'top',cat:'Vegetação',nome:'Palmeira',un:'papel',ly:'TOP-VEGETACAO',rot:false,desc:'Estrela de 4 mm.',
  f:function(){ var o=[]; for(var i=0;i<4;i++){ var a=i*45*Math.PI/180; o.push(bL(-2*Math.cos(a),-2*Math.sin(a),2*Math.cos(a),2*Math.sin(a))); } return o; }},
 {id:'CULTURA',g:'top',cat:'Vegetação',nome:'Cultura / pomar (padrão)',un:'papel',ly:'TOP-VEGETACAO',rot:true,desc:'Três pequenas plantas em linha (repita sobre a área cultivada).',
  f:function(){ var o=[]; [-3,0,3].forEach(function(x){ o.push(bC(x,0,0.7),bL(x,-1.2,x,-0.7)); }); return o; }},
 // edificações e cercas
 {id:'CASA',g:'top',cat:'Edificações e cercas',nome:'Casa (símbolo)',un:'papel',ly:'TOP-EDIFICACAO',rot:false,desc:'Edificação pequena demais para a escala (3 mm).',f:function(){ return [bP([-1.5,-1.5,1.5,-1.5,1.5,0.6,0,1.8,-1.5,0.6],true)]; }},
 {id:'IGREJA',g:'top',cat:'Edificações e cercas',nome:'Templo',un:'papel',ly:'TOP-EDIFICACAO',rot:false,desc:'Quadrado com cruz.',f:function(){ return [bR(-1.5,-1.5,3,3),bL(0,1.5,0,3.5),bL(-0.7,2.8,0.7,2.8)]; }},
 {id:'ESCOLA',g:'top',cat:'Edificações e cercas',nome:'Escola',un:'papel',ly:'TOP-EDIFICACAO',rot:false,desc:'Quadrado com bandeira.',f:function(){ return [bR(-1.5,-1.5,3,3),bL(0,1.5,0,3.8),bS([0,3.8,1.4,3.3,0,2.8])]; }},
 {id:'PORTEIRA',g:'top',cat:'Edificações e cercas',nome:'Porteira',un:'papel',ly:'TOP-CERCA',rot:true,desc:'Porteira na cerca (4 mm), alinhe à cerca.',f:function(){ return [bS([-2.3,-0.3,-1.7,-0.3,-1.7,0.3,-2.3,0.3]),bS([1.7,-0.3,2.3,-0.3,2.3,0.3,1.7,0.3]),bL(-1.7,0,1.7,0),bL(-1.7,0,0,1.2)]; }},
 {id:'MATA_BURRO',g:'top',cat:'Edificações e cercas',nome:'Mata-burro',un:'papel',ly:'TOP-CERCA',rot:true,desc:'Grade na via (4 × 2 mm).',f:function(){ var o=[bR(-2,-1,4,2)]; for(var x=-1.2;x<1.3;x+=0.8) o.push(bL(x,-1,x,1)); return o; }},
 // MECÂNICO (papel)
 {id:'RUGOSIDADE',g:'mec',cat:'Símbolos',nome:'Rugosidade (usinagem)',un:'papel',ly:'0',rot:true,desc:'Símbolo de estado de superfície (NBR 8404), ponta no ponto de inserção.',f:function(){ return [bL(-3,3,0,0),bL(0,0,6,10),bL(6,10,14,10)]; }},
 {id:'CORTE_SETA',g:'mec',cat:'Símbolos',nome:'Seta de corte',un:'papel',ly:'CORTE-PLANO',rot:true,desc:'Extremidade do plano de corte com seta de vista.',f:function(){ return [bL(0,0,0,8),bS([-1.5,5,0,8,1.5,5]),bL(-3,0,3,0)]; }},
 {id:'CENTRO_FURO',g:'mec',cat:'Símbolos',nome:'Marca de centro',un:'papel',ly:'CENTRO',rot:true,desc:'Cruz de centro de furo (12 mm).',f:function(){ return [bL(-6,0,-1,0),bL(1,0,6,0),bL(0,-6,0,-1),bL(0,1,0,6),bL(-0.5,0,0.5,0),bL(0,-0.5,0,0.5)]; }},
 {id:'SOLDA_FILETE',g:'mec',cat:'Símbolos',nome:'Solda de filete',un:'papel',ly:'0',rot:true,desc:'Seta de referência com triângulo de filete (AWS/ISO 2553).',f:function(){ return [bL(0,0,5,5),bL(5,5,18,5),bP([9,5,9,8,12,5],true),bArrowHead(0,0,225,2,1.2)]; }}
];
function bibItem(id){ return BIB.filter(function(b){ return b.id===id; })[0]; }
function bibInGroup(it,g){ return (','+it.g+',').indexOf(','+g+',')>=0; }
function bibParVal(it,v){ if(!it.par) return null; v=+v; if(!(v>0)) v=it.par.def; v=Math.min(it.par.max,Math.max(it.par.min,v)); return it.par.int?Math.round(v):Math.round(v*100)/100; }
function bibName(it,v){ if(!it.par) return it.id; v=bibParVal(it,v); return it.id+'_'+(it.par.int?v:Math.round(v*100)); }
function bibEnts(it,v){ return it.f(it.par?bibParVal(it,v):undefined).map(function(e){ var c=JSON.parse(JSON.stringify(e)); c.id=uid(); if(c.tp==='hatch') hatchSync(c); return c; }); }
// define o bloco no desenho (se ainda não existir) e devolve o nome
function bibDefine(id,v){ var it=bibItem(id); if(!it) return null; var nm=bibName(it,v); if(!S.blocks[nm]) S.blocks[nm]={base:{x:0,y:0},ents:bibEnts(it,v),bib:it.id,un:it.un}; return nm; }
// fator de escala para a unidade do desenho / escala de anotação
function bibAutoScale(un,space){ var paper=(space||S.space)!=='model';
  if(un==='papel') return paper?1:1/annoK();
  if(un==='m') return paper?1000*(S.annoScale||1):1000/unitMm();
  if(typeof un==='number') return paper?un*(S.annoScale||1):un/unitMm(); // Meus blocos: mm por unidade de origem
  return 1; }
// ── estado da paleta ───────────────────────────────────────────────────────
var BIBST={tab:null,q:'',sel:null,src:'bib',par:{},rot:0,mult:1,m:false,autoLy:true};
function bibUserList(){ try{ return JSON.parse(localStorage.getItem('educad-blocos')||'[]')||[]; }catch(e){ return []; } }
function bibUserSave(L){ try{ localStorage.setItem('educad-blocos',JSON.stringify(L)); return true; }catch(e){ log('Não foi possível guardar neste navegador (espaço cheio?).','er'); return false; } }
// fonte selecionada → {nome, ents (unidades de origem), un, ly, rot, defName}
function bibCur(){
  var s=BIBST.sel; if(!s) return null;
  if(BIBST.src==='bib'){ var it=bibItem(s); if(!it) return null; var v=it.par?bibParVal(it,BIBST.par[it.id]):undefined; return {src:'bib',it:it,nome:it.nome+(it.par?' — '+(it.par.int?v:f2(v)+' m'):''),name:bibName(it,v),un:it.un,ly:it.ly,rot:it.rot,v:v}; }
  if(BIBST.src==='dwg'){ var B=S.blocks[s]; if(!B) return null; return {src:'dwg',nome:s,name:s,un:'dwg',ly:null,rot:true}; }
  if(BIBST.src==='user'){ var m=bibUserList().filter(function(u){return u.nome===s;})[0]; if(!m) return null; return {src:'user',nome:m.nome,name:m.nome,un:m.mm,ly:null,rot:true,m:m}; }
  return null;
}
function bibCurScale(c){ c=c||bibCur(); if(!c) return 1; return (c.un==='dwg'?1:bibAutoScale(c.un))*(BIBST.mult||1); }
function bibEnsure(c){ // define o bloco no desenho na hora de inserir
  if(c.src==='bib') return bibDefine(c.it.id,c.v);
  if(c.src==='user'){ var nm=c.name; if(S.blocks[nm]&&!S.blocks[nm].user){ nm=nm+'_U'; } if(!S.blocks[nm]) S.blocks[nm]={base:{x:0,y:0},ents:JSON.parse(JSON.stringify(c.m.ents)),user:true}; return nm; }
  return c.name;
}
function bibGhostEnts(c){ if(c.src==='bib') return bibEnts(c.it,c.v); if(c.src==='user') return JSON.parse(JSON.stringify(c.m.ents)); var B=S.blocks[c.name]; return B?JSON.parse(JSON.stringify(B.ents)):[]; }
function bibLayer(c){ if(!BIBST.autoLy||!c.ly) return S.curLy; var L=S.layers.filter(function(l){ return l.nm===c.ly; })[0]; return L?L.id:S.curLy; }
// ── comando de inserção (BIBINS) ───────────────────────────────────────────
NC.bibins={
  init:function(ds){ ds.phase='pt'; ds.n=0; ds.c=bibCur(); if(!ds.c){ log('Escolha um bloco na biblioteca.','er'); setTimeout(function(){ if(S.ds===ds) ncEnd(); },0); } },
  prompt:function(ds){ var c=ds.c; if(!c) return '';
    return {pt:'Ponto de inserção de '+c.nome+(ds.n?' (Enter termina)':'')+' ou [Rotação/Escala/Espelhar] <rot '+gNum(BIBST.rot)+'°, esc '+gNum(BIBST.mult)+(BIBST.m?', espelhado':'')+'>:',
      rot:'Ângulo de rotação <'+gNum(BIBST.rot)+'°> (arraste, digite ou Enter):',pr:'Ângulo de rotação <'+gNum(BIBST.rot)+'>:',ps:'Fator de escala (multiplica a escala automática '+gNum(bibCurScale(c)/(BIBST.mult||1))+') <'+gNum(BIBST.mult)+'>:'}[ds.phase]; },
  make:function(ds,rot){ var c=ds.c; snapshot(); var nm=bibEnsure(c); var e={tp:'insert',name:nm,x:ds.p.x,y:ds.p.y,s:bibCurScale(c),rot:rot*Math.PI/180,m:!!BIBST.m,ly:bibLayer(c)}; addE(e,true);
    ds.n++; ds.done=(ds.done||0)+1; S.lastBlock=nm; log('Bloco '+nm+' inserido'+(e.ly!==S.curLy?' na camada '+getLy(e.ly).nm:'')+' (escala '+gNum(e.s)+', rotação '+gNum(rot)+'°).','ok'); ds.phase='pt'; renderAll(); },
  click:function(ds,pt){ if(ds.phase==='pt'){ ds.p={x:pt.x,y:pt.y}; ds.pts=[ds.p]; if(ds.c.rot) ds.phase='rot'; else this.make(ds,BIBST.rot); }
    else if(ds.phase==='rot'){ var a=Math.atan2(pt.y-ds.p.y,pt.x-ds.p.x)*180/Math.PI; if(Math.hypot(pt.x-ds.p.x,pt.y-ds.p.y)<1e-9) a=BIBST.rot; a=Math.round(a*1e6)/1e6; BIBST.rot=a; bibSyncInputs(); this.make(ds,a); } },
  input:function(ds,u,raw){ var n=ncNum(u);
    if(ds.phase==='pt'){ if(u===''){ ncEnd(); return true; }
      if(u==='R'||u==='ROTACAO'||u==='ROTAÇÃO'){ ds.phase='pr'; return true; } if(u==='E'||u==='S'||u==='ESCALA'){ ds.phase='ps'; return true; }
      if(u==='M'||u==='ESPELHAR'){ BIBST.m=!BIBST.m; bibSyncInputs(); log('Espelhar: '+(BIBST.m?'sim':'não')+'.','inf'); return true; }
      var p=parseCoord(raw); if(!p) return false; this.click(ds,p); return true; }
    if(ds.phase==='rot'){ if(u===''){ this.make(ds,BIBST.rot); return true; } if(n===null||/,/.test(raw)&&parseCoord(raw)){ var q=parseCoord(raw); if(!q) return false; this.click(ds,q); return true; } BIBST.rot=n; bibSyncInputs(); this.make(ds,n); return true; }
    if(ds.phase==='pr'){ if(u!==''){ if(n===null) return false; BIBST.rot=n; bibSyncInputs(); } ds.phase='pt'; return true; }
    if(ds.phase==='ps'){ if(u!==''){ if(!(n>0)) return false; BIBST.mult=n; bibSyncInputs(); } ds.phase='pt'; return true; }
    return false; },
  preview:function(ctx,ds,hp){ var c=ds.c; if(!c||!hp) return; var at=ds.phase==='rot'?ds.p:hp,rot=BIBST.rot;
    if(ds.phase==='rot'){ ncRubber(ctx,ds.p,hp); if(Math.hypot(hp.x-ds.p.x,hp.y-ds.p.y)>1e-9) rot=Math.atan2(hp.y-ds.p.y,hp.x-ds.p.x)*180/Math.PI; ncLabel(ctx,hp,gNum(Math.round(rot*10)/10)+'°'); }
    var e={id:'bibghost',x:at.x,y:at.y,s:bibCurScale(c),rot:rot*Math.PI/180,m:!!BIBST.m};
    ctx.save(); ctx.globalAlpha=.75; bibGhostEnts(c).forEach(function(k){ if(k.ly===0||k.ly===undefined) k.ly=bibLayer(c); insertXform(k,e); drawE(ctx,k,true); }); ctx.restore(); }
};
// ── miniaturas (SVG) ───────────────────────────────────────────────────────
function bibSvg(ents,W,H){
  var bb=null; ents.forEach(function(e){ var b; try{ b=bbox(e); }catch(x){ b=null; } if(e.tp==='point') b={x:e.x,y:e.y,w:0,h:0}; if(!b) return; bb=bb?{x0:Math.min(bb.x0,b.x),y0:Math.min(bb.y0,b.y),x1:Math.max(bb.x1,b.x+b.w),y1:Math.max(bb.y1,b.y+b.h)}:{x0:b.x,y0:b.y,x1:b.x+b.w,y1:b.y+b.h}; });
  if(!bb) return '<svg viewBox="0 0 10 10" width="'+W+'" height="'+H+'"></svg>';
  var w=Math.max(bb.x1-bb.x0,1e-6),h=Math.max(bb.y1-bb.y0,1e-6),m=Math.max(w,h)*0.08; var vb=[bb.x0-m,-(bb.y1+m),w+2*m,h+2*m],sw=Math.max(w,h)/60;
  function N(v){ return Math.round(v*1e4)/1e4; }
  var o=[]; ents.forEach(function(e){
    switch(e.tp){
      case 'line': o.push('<line x1="'+N(e.x1)+'" y1="'+N(-e.y1)+'" x2="'+N(e.x2)+'" y2="'+N(-e.y2)+'"/>'); break;
      case 'circ': o.push('<circle cx="'+N(e.cx)+'" cy="'+N(-e.cy)+'" r="'+N(e.r)+'"/>'); break;
      case 'arc': { var a0=e.sa,a1=e.ea; while(a1<=a0) a1+=2*Math.PI; var large=(a1-a0)>Math.PI?1:0; o.push('<path d="M'+N(e.cx+e.r*Math.cos(a0))+' '+N(-(e.cy+e.r*Math.sin(a0)))+'A'+N(e.r)+' '+N(e.r)+' 0 '+large+' 0 '+N(e.cx+e.r*Math.cos(a1))+' '+N(-(e.cy+e.r*Math.sin(a1)))+'"/>'); break; }
      case 'ell': o.push('<ellipse cx="'+N(e.cx)+'" cy="'+N(-e.cy)+'" rx="'+N(e.rx)+'" ry="'+N(e.ry)+'" transform="rotate('+N(-(e.rot||0)*180/Math.PI)+' '+N(e.cx)+' '+N(-e.cy)+')"/>'); break;
      case 'pl': o.push('<polyline points="'+e.pts.map(function(p){return N(p.x)+','+N(-p.y);}).join(' ')+(e.closed&&e.pts.length&&(e.pts[0].x!==e.pts[e.pts.length-1].x||e.pts[0].y!==e.pts[e.pts.length-1].y)?' '+N(e.pts[0].x)+','+N(-e.pts[0].y):'')+'"/>'); break;
      case 'rect': o.push('<rect x="'+N(e.x)+'" y="'+N(-(e.y+e.h))+'" width="'+N(e.w)+'" height="'+N(e.h)+'"/>'); break;
      case 'hatch': if(e.loops) o.push('<path class="f" d="'+e.loops.map(function(L){ return 'M'+L.map(function(p){return N(p.x)+' '+N(-p.y);}).join('L')+'Z'; }).join('')+'"/>'); break;
      case 'txt': o.push('<text x="'+N(e.x)+'" y="'+N(-e.y)+'" font-size="'+N(e.h*1.25)+'">'+String(e.txt).replace(/[<&>]/g,'')+'</text>'); break;
      case 'point': o.push('<circle class="f" cx="'+N(e.x)+'" cy="'+N(-e.y)+'" r="'+N(sw*1.5)+'"/>'); break;
      case 'insert': { var B=S.blocks[e.name]; if(B) o.push(bibSvg(insertExpand(e,0),W,H).replace(/^<svg[^>]*>|<\/svg>$/g,'')); break; }
    }
  });
  return '<svg viewBox="'+vb.map(N).join(' ')+'" width="'+W+'" height="'+H+'" fill="none" stroke="currentColor" stroke-width="'+N(sw)+'" stroke-linecap="round" stroke-linejoin="round">'+o.join('')+'</svg>';
}
// ── paleta ─────────────────────────────────────────────────────────────────
function bibDefaultTab(){ return S.template==='topografico'?'top':S.template==='mecanico'?'mec':'arq'; }
function bibOpen(tab){ var P=document.getElementById('bib-pal'); if(tab) BIBST.tab=tab; else if(!BIBST.tab||BIBST.tplSeen!==(S.template||'')){ BIBST.tab=bibDefaultTab(); if(!(S.ds&&S.ds.cmd==='bibins')) BIBST.sel=null; } BIBST.tplSeen=S.template||''; P.classList.add('show'); bibRender(); var q=document.getElementById('bib-q'); if(q&&window.innerWidth>700) q.focus(); }
function bibClose(){ document.getElementById('bib-pal').classList.remove('show'); if(S.ds&&S.ds.cmd==='bibins') ncEnd(); }
function bibToggle(){ var P=document.getElementById('bib-pal'); if(P.classList.contains('show')) bibClose(); else bibOpen(); }
function bibList(){ // itens visíveis: [{key, src, nome, cat, ents, sub}]
  var q=BIBST.q.trim().toLowerCase(),t=BIBST.tab,out=[];
  function match(s){ if(!q) return true; s=s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); return q.normalize('NFD').replace(/[̀-ͯ]/g,'').split(/\s+/).every(function(w){ return s.indexOf(w)>=0; }); }
  if(t==='dwg'){ Object.keys(S.blocks).sort().forEach(function(k){ if(/^\*|^CARIMBO|^_/.test(k)) return; if(match(k)) out.push({key:k,src:'dwg',nome:k,cat:'Blocos deste desenho',ents:S.blocks[k].ents}); }); return out; }
  if(t==='user'){ bibUserList().forEach(function(m){ if(match(m.nome)) out.push({key:m.nome,src:'user',nome:m.nome,cat:'Meus blocos (neste navegador)',ents:m.ents,sub:m.data}); }); return out; }
  BIB.forEach(function(it){ if(q?!match(it.nome+' '+it.cat+' '+it.id+' '+it.desc):!bibInGroup(it,t)) return; out.push({key:it.id,src:'bib',nome:it.nome,cat:(q?(BIB_GRUPOS.filter(function(g){return bibInGroup(it,g.id);}).map(function(g){return g.nome;})[0]+' · '):'')+it.cat,it:it}); });
  return out;
}
function bibRender(){
  var P=document.getElementById('bib-pal'); if(!P) return;
  P.querySelectorAll('.bib-tab').forEach(function(b){ b.classList.toggle('on',b.getAttribute('data-tab')===BIBST.tab&&!BIBST.q.trim()); });
  var G=document.getElementById('bib-grid'); G.textContent=''; var L=bibList(),cat=null;
  if(!L.length){ var e=document.createElement('div'); e.className='bib-none'; e.textContent=BIBST.tab==='user'&&!BIBST.q?'Nenhum bloco guardado. Na aba "Do desenho", escolha um bloco e use "Guardar em Meus blocos".':BIBST.tab==='dwg'&&!BIBST.q?'Este desenho ainda não tem blocos. Crie um com o comando B (BLOCK) ou insira um da biblioteca.':'Nada encontrado.'; G.appendChild(e); }
  L.forEach(function(x){
    if(x.cat!==cat){ cat=x.cat; var h=document.createElement('div'); h.className='bib-cat'; h.textContent=cat; G.appendChild(h); }
    var c=document.createElement('div'); c.className='bib-card'+(BIBST.sel===x.key&&BIBST.src===x.src?' on':''); c.setAttribute('data-key',x.key); c.setAttribute('data-src',x.src); c.tabIndex=0;
    var ents=x.it?bibEnts(x.it,BIBST.par[x.it.id]):x.ents; c.title=x.it?x.it.nome+' — '+x.it.desc:x.nome;
    c.innerHTML=bibSvg(ents,64,46)+'<div class="bib-nm"></div>'; c.querySelector('.bib-nm').textContent=x.nome;
    c.addEventListener('click',function(){ bibPick(x.src,x.key,true); });
    c.addEventListener('keydown',function(ev){ if(ev.key==='Enter'){ ev.preventDefault(); bibPick(x.src,x.key,true); } });
    G.appendChild(c); });
  bibFooter();
}
function bibPick(src,key,start){
  BIBST.src=src; BIBST.sel=key; var it=src==='bib'?bibItem(key):null; if(it) BIBST.rot=0;
  document.querySelectorAll('#bib-grid .bib-card').forEach(function(c){ c.classList.toggle('on',c.getAttribute('data-key')===key&&c.getAttribute('data-src')===src); });
  bibFooter(); if(start) bibStart();
}
function bibStart(){ if(!bibCur()) return; if(S.ds&&S.ds.cmd==='bibins'){ S.ds.c=bibCur(); ncPrompt(); renderAll(); return; } setTool('bibins'); }
function bibFooter(){
  var F=document.getElementById('bib-foot'),c=bibCur(); F.textContent='';
  if(!c){ var p=document.createElement('div'); p.className='bib-hint'; p.textContent='Clique num bloco e depois no desenho. Arraste para girar; Enter mantém o ângulo. Esc termina.'; F.appendChild(p); return; }
  var t=document.createElement('div'); t.className='bib-sel'; t.textContent=c.nome; F.appendChild(t);
  var d=document.createElement('div'); d.className='bib-desc'; var sz=bibSizeTxt(c); d.textContent=(c.it?c.it.desc+' ':'')+sz; F.appendChild(d);
  var row=document.createElement('div'); row.className='bib-row';
  if(c.it&&c.it.par){ var P=c.it.par,lab=document.createElement('label'); lab.textContent=P.nome; var inp=document.createElement('input'); inp.id='bib-par'; inp.setAttribute('list','bib-par-ops'); inp.value=P.int?c.v:f2(c.v);
    var dl=document.createElement('datalist'); dl.id='bib-par-ops'; P.ops.forEach(function(v){ var o=document.createElement('option'); o.value=P.int?v:f2(v); dl.appendChild(o); });
    inp.addEventListener('change',function(){ var v=parseFloat(String(inp.value).replace(',','.')); BIBST.par[c.it.id]=bibParVal(c.it,v); bibRender(); bibStart(); });
    lab.appendChild(inp); row.appendChild(lab); row.appendChild(dl); }
  var rl=document.createElement('label'); rl.textContent='Rotação °'; var ri=document.createElement('input'); ri.id='bib-rot'; ri.value=gNum(BIBST.rot); ri.addEventListener('change',function(){ var v=parseFloat(String(ri.value).replace(',','.')); BIBST.rot=isFinite(v)?v:0; renderAll(); }); rl.appendChild(ri); row.appendChild(rl);
  var sl=document.createElement('label'); sl.textContent='Escala ×'; var si=document.createElement('input'); si.id='bib-mult'; si.value=gNum(BIBST.mult); si.title='Multiplica a escala automática'; si.addEventListener('change',function(){ var v=parseFloat(String(si.value).replace(',','.')); BIBST.mult=v>0?v:1; si.value=gNum(BIBST.mult); bibFooter(); renderAll(); }); sl.appendChild(si); row.appendChild(sl);
  F.appendChild(row);
  var r2=document.createElement('div'); r2.className='bib-row';
  var ml=document.createElement('label'); ml.className='bib-chk'; var mi=document.createElement('input'); mi.type='checkbox'; mi.id='bib-m'; mi.checked=BIBST.m; mi.addEventListener('change',function(){ BIBST.m=mi.checked; renderAll(); }); ml.appendChild(mi); ml.appendChild(document.createTextNode(' Espelhar')); r2.appendChild(ml);
  var al=document.createElement('label'); al.className='bib-chk'; var ai=document.createElement('input'); ai.type='checkbox'; ai.id='bib-ly'; ai.checked=BIBST.autoLy; ai.addEventListener('change',function(){ BIBST.autoLy=ai.checked; bibFooter(); }); al.appendChild(ai);
  var lyName=c.ly&&BIBST.autoLy&&S.layers.some(function(l){return l.nm===c.ly;})?c.ly:getLy(S.curLy).nm; al.appendChild(document.createTextNode(' Camada automática → '+lyName)); al.title='Usa a camada própria do item (ARQ-PORTA, TOP-PONTOS…) quando ela existe no desenho; senão, a camada atual.'; r2.appendChild(al);
  F.appendChild(r2);
  var r3=document.createElement('div'); r3.className='bib-row';
  var b=document.createElement('button'); b.className='btn p'; b.type='button'; b.id='bib-ins'; b.textContent='Inserir'; b.addEventListener('click',bibStart); r3.appendChild(b);
  if(c.src==='dwg'){ var g=document.createElement('button'); g.className='btn s'; g.type='button'; g.id='bib-keep'; g.textContent='Guardar em Meus blocos'; g.addEventListener('click',function(){ bibUserAdd(c.name); }); r3.appendChild(g); }
  if(c.src==='user'){ var x=document.createElement('button'); x.className='btn s'; x.type='button'; x.id='bib-del'; x.textContent='Excluir de Meus blocos'; x.addEventListener('click',function(){ bibUserDel(c.name); }); r3.appendChild(x); }
  F.appendChild(r3);
}
function bibSizeTxt(c){ var ents=bibGhostEnts(c),bb=null; ents.forEach(function(e){ var b=e.tp==='point'?{x:e.x,y:e.y,w:0,h:0}:bbox(e); if(!b) return; bb=bb?{x0:Math.min(bb.x0,b.x),y0:Math.min(bb.y0,b.y),x1:Math.max(bb.x1,b.x+b.w),y1:Math.max(bb.y1,b.y+b.h)}:{x0:b.x,y0:b.y,x1:b.x+b.w,y1:b.y+b.h}; }); if(!bb) return '';
  var w=bb.x1-bb.x0,h=bb.y1-bb.y0;
  if(c.un==='m') return 'Tamanho real '+f2(w)+' × '+f2(h)+' m → fator '+gNum(bibCurScale(c))+' neste desenho.';
  if(c.un==='papel') return 'Símbolo de '+f2(w)+' × '+f2(h)+' mm impressos'+(S.space==='model'?' (escala de anotação '+ratioLabel(S.annoScale||1)+' → fator '+gNum(bibCurScale(c))+').':' (folha).');
  if(c.un==='dwg') return 'Bloco do desenho, '+gNum(w)+' × '+gNum(h)+' unidades.';
  return 'Guardado com '+gNum(c.un)+' mm por unidade → fator '+gNum(bibCurScale(c))+' neste desenho.';
}
function bibSyncInputs(){ var r=document.getElementById('bib-rot'),s=document.getElementById('bib-mult'),m=document.getElementById('bib-m'); if(r) r.value=gNum(BIBST.rot); if(s) s.value=gNum(BIBST.mult); if(m) m.checked=BIBST.m; }
function bibUserAdd(name){ var B=S.blocks[name]; if(!B) return; var L=bibUserList().filter(function(m){ return m.nome!==name; });
  L.unshift({nome:name,data:new Date().toLocaleDateString('pt-BR'),mm:unitMm(),ents:JSON.parse(JSON.stringify(flattenEnts(B.ents)))}); if(L.length>60) L.length=60;
  if(bibUserSave(L)) log('Bloco "'+name+'" guardado em Meus blocos (com a unidade '+((S.units&&S.units.insertScale)||'mm')+'); ele fica disponível em qualquer desenho deste navegador.','ok'); }
function bibUserDel(name){ if(!confirm('Excluir "'+name+'" de Meus blocos?')) return; bibUserSave(bibUserList().filter(function(m){ return m.nome!==name; })); BIBST.sel=null; bibRender(); }
window.addEventListener('load',function(){
  var P=document.createElement('div'); P.id='bib-pal'; P.className='bib-pal';
  P.innerHTML='<div class="bib-head" id="bib-head"><span>▦ Biblioteca de blocos</span><button type="button" class="bib-x" title="Fechar (Ctrl+3)" id="bib-close">×</button></div>'+
   '<div class="bib-tabs">'+BIB_GRUPOS.map(function(g){ return '<button type="button" class="bib-tab" data-tab="'+g.id+'">'+g.nome+'</button>'; }).join('')+'<button type="button" class="bib-tab" data-tab="dwg">Do desenho</button><button type="button" class="bib-tab" data-tab="user">Meus blocos</button></div>'+
   '<input id="bib-q" class="bib-q" placeholder="Buscar (porta, cama, poste, marco…)" autocomplete="off">'+
   '<div id="bib-grid" class="bib-grid"></div><div id="bib-foot" class="bib-foot"></div>';
  document.body.appendChild(P);
  P.querySelectorAll('.bib-tab').forEach(function(b){ b.addEventListener('click',function(){ BIBST.tab=b.getAttribute('data-tab'); BIBST.q=''; if(!(S.ds&&S.ds.cmd==='bibins')) BIBST.sel=null; document.getElementById('bib-q').value=''; bibRender(); }); });
  document.getElementById('bib-q').addEventListener('input',function(ev){ BIBST.q=ev.target.value; bibRender(); });
  document.getElementById('bib-close').addEventListener('click',bibClose);
  ['keydown','keyup','keypress'].forEach(function(k){ P.addEventListener(k,function(ev){ var t=ev.target; if(t&&(t.tagName==='INPUT'||t.tagName==='SELECT')){ if(ev.key==='Escape'&&k==='keydown'){ t.blur(); } ev.stopPropagation(); } }); });
  // arrastar pela barra de título
  var H=document.getElementById('bib-head'),drag=null;
  H.addEventListener('pointerdown',function(ev){ if(ev.target.id==='bib-close') return; var r=P.getBoundingClientRect(); drag={dx:ev.clientX-r.left,dy:ev.clientY-r.top}; H.setPointerCapture(ev.pointerId); });
  H.addEventListener('pointermove',function(ev){ if(!drag) return; P.style.left=Math.max(0,Math.min(window.innerWidth-80,ev.clientX-drag.dx))+'px'; P.style.top=Math.max(0,Math.min(window.innerHeight-40,ev.clientY-drag.dy))+'px'; P.style.right='auto'; });
  H.addEventListener('pointerup',function(){ drag=null; });
  document.addEventListener('keydown',function(ev){ if(ev.ctrlKey&&!ev.shiftKey&&!ev.altKey&&ev.key==='3'){ ev.preventDefault(); bibToggle(); } });
});
