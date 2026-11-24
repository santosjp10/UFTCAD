/* ═══════════════════════════════════════════════════════════════════
   v8.1 — AULA GUIADA (R8 do parecer técnico)
   Exercícios passo a passo na aba Educacional, com verificação automática
   das medidas no próprio desenho. Cada passo tem instrução, dica e uma
   função de verificação que diz exatamente o que falta ou está errado.
   Para criar um exercício novo, acrescente um objeto em EX_LIST (ver README).
   ═══════════════════════════════════════════════════════════════════ */
var EXA={open:false,cur:0,started:0,timer:null,last:{},shown:{},done:{}};
try{ EXA.done=JSON.parse(localStorage.getItem('educad-aula')||'{}')||{}; }catch(e){ EXA.done={}; }
var EX_TOL=0.05; // mm

// ── leitura do desenho (sempre do espaço do modelo) ─────────────────────────
function exModel(){ return (typeof modelEntsNow==='function')?modelEntsNow():S.ents; }
function exLayerName(e){ var l=getLy(e.ly); return l?String(l.nm):''; }
function exLd(e){ if(e.ld&&e.ld!=='bylayer') return e.ld; var l=getLy(e.ly); return (l&&l.ld)||'solid'; }
function exSegs(){
  var o=[];
  exModel().forEach(function(e){
    var ly=getLy(e.ly); if(ly&&!ly.vis) return;
    function add(x1,y1,x2,y2){ if(Math.hypot(x2-x1,y2-y1)>1e-9) o.push({x1:x1,y1:y1,x2:x2,y2:y2,e:e}); }
    if(e.tp==='line') add(e.x1,e.y1,e.x2,e.y2);
    else if(e.tp==='rect'){ add(e.x,e.y,e.x+e.w,e.y); add(e.x+e.w,e.y,e.x+e.w,e.y+e.h); add(e.x+e.w,e.y+e.h,e.x,e.y+e.h); add(e.x,e.y+e.h,e.x,e.y); }
    else if(e.tp==='pl'){ plSegs(e).forEach(function(s){ if(s.kind==='line') add(s.x1,s.y1,s.x2,s.y2); }); }
  });
  return o;
}
// O trecho a→b está desenhado (por linhas, polilinha ou retângulo, inteiro ou em partes)?
function exCovered(S2,a,b,filter){
  var L=Math.hypot(b.x-a.x,b.y-a.y); if(L<1e-9) return false;
  var ux=(b.x-a.x)/L,uy=(b.y-a.y)/L,n=Math.max(4,Math.min(40,Math.ceil(L/5)));
  for(var k=0;k<=n;k++){ var t=k/n,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},hit=false;
    for(var i=0;i<S2.length&&!hit;i++){ var s=S2[i]; if(filter&&!filter(s.e)) continue;
      var sl=Math.hypot(s.x2-s.x1,s.y2-s.y1),sx=(s.x2-s.x1)/sl,sy=(s.y2-s.y1)/sl;
      if(Math.abs(sx*uy-sy*ux)>1e-3) continue;
      if(segD(p.x,p.y,s.x1,s.y1,s.x2,s.y2)<=EX_TOL) hit=true; }
    if(!hit) return false; }
  return true;
}
function exP(x,y){ return {x:x,y:y}; }
function exFmt(p){ return gNum(p.x)+','+gNum(p.y); }
// Polígono fechado (lista de vértices) desenhado? Devolve a primeira aresta que falta.
function exPoly(S2,P,filter){ for(var i=0;i<P.length;i++){ var a=P[i],b=P[(i+1)%P.length]; if(!exCovered(S2,a,b,filter)) return {ok:false,miss:[a,b]}; } return {ok:true}; }
function exRectPts(x,y,w,h){ return [exP(x,y),exP(x+w,y),exP(x+w,y+h),exP(x,y+h)]; }
function exMissMsg(r,what){ return what+': falta o lado de '+exFmt(r.miss[0])+' a '+exFmt(r.miss[1])+'.'; }
function exDims(tp){ return exModel().filter(function(e){ return tp?e.tp===tp:(e.tp==='dim'||e.tp==='dimr'||e.tp==='dimd'||e.tp==='dima'); }); }
function exHasDim(val,tp,style){
  var L=exDims(tp).filter(function(e){ return Math.abs(dimMeasure(e)-val)<=EX_TOL; });
  if(!L.length) return {ok:false,msg:'Falta a cota de '+gNum(val)+(tp==='dimd'?' (diâmetro)':'')+'.'};
  if(style&&!L.some(function(e){ return (e.dimStyle||'Standard')===style; })) return {ok:false,msg:'A cota de '+gNum(val)+' existe, mas não usa o estilo '+style+'. Selecione-a e troque o estilo no painel de propriedades (ou use "Aplicar à seleção" no DDIM).'};
  return {ok:true};
}
function exAll(list){ for(var i=0;i<list.length;i++){ var r=list[i](); if(!r.ok) return r; } return {ok:true}; }
function exCircle(cx,cy,r){ return exModel().some(function(e){ return e.tp==='circ'&&Math.abs(e.cx-cx)<=EX_TOL&&Math.abs(e.cy-cy)<=EX_TOL&&Math.abs(e.r-r)<=EX_TOL; }); }
function exHatchAt(p){ return exModel().some(function(e){ if(e.tp!=='hatch') return false; if(e.loops) return pointInLoops(p,e.loops); return p.x>=e.x&&p.x<=e.x+e.w&&p.y>=e.y&&p.y<=e.y+e.h; }); }
// procura um valor de posição (ex.: o topo da vista superior) entre as extremidades dos segmentos
function exCandidates(S2,axis,pred){ var v={}; S2.forEach(function(s){ [s[axis+'1'],s[axis+'2']].forEach(function(q){ if(pred(q)) v[Math.round(q*1000)/1000]=q; }); }); return Object.keys(v).map(function(k){return v[k];}); }
function exLayouts(){ return (S.layouts||[]).map(function(L){ return {L:L,ents:L.id===S.space?S.ents:L.ents}; }); }

// ── exercícios ──────────────────────────────────────────────────────────────
var EX_LIST=[
 {id:'placa',title:'1. Placa de identificação de parcela',level:'Iniciante · 15 min',
  goal:'Coordenadas absolutas e relativas, círculos, cópia e cotagem com o estilo ABNT.',
  norm:'NBR 10126 (cotagem)',view:{x:-20,y:-30,w:170,h:130},
  intro:'Uma placa de 120 × 80 mm com quatro furos de fixação de Ø8, a 10 mm das bordas, identifica cada parcela do experimento.',
  steps:[
   {t:'Contorno da placa',i:'Desenhe um retângulo de 120 × 80 mm com o canto inferior esquerdo em <b>0,0</b>.',
    h:'Digite <code>REC</code> Enter, <code>0,0</code> Enter e <code>@120,80</code> Enter.',
    c:function(){ var r=exPoly(exSegs(),exRectPts(0,0,120,80)); return r.ok?r:{ok:false,msg:exMissMsg(r,'Contorno 120 × 80')}; }},
   {t:'Furos de fixação',i:'Desenhe quatro furos de <b>Ø8</b> (raio 4) com centros em 10,10 · 110,10 · 10,70 · 110,70.',
    h:'<code>C</code> Enter, <code>10,10</code> Enter, <code>4</code> Enter. Depois use <code>CO</code> (Copiar) com ponto base 10,10 e destinos <code>@100,0</code>, <code>@0,60</code> e <code>@100,60</code>.',
    c:function(){ var C=[[10,10],[110,10],[10,70],[110,70]]; for(var i=0;i<C.length;i++) if(!exCircle(C[i][0],C[i][1],4)) return {ok:false,msg:'Falta o furo de Ø8 com centro em '+C[i][0]+','+C[i][1]+'.'}; return {ok:true}; }},
   {t:'Estilo de cota ABNT',i:'Torne o estilo <b>ABNT</b> o estilo de cota atual.',
    h:'Digite <code>D</code> Enter, clique em ABNT e em <b>Definir atual</b>. Ou escolha ABNT em "Est. cota", no painel de propriedades.',
    c:function(){ return S.dimCurrent==='ABNT'?{ok:true}:{ok:false,msg:'O estilo de cota atual é "'+S.dimCurrent+'".'}; }},
   {t:'Cotas da placa',i:'Cote a largura (<b>120</b>) e a altura (<b>80</b>) da placa com <code>DLI</code>.',
    h:'<code>DLI</code>: clique nos dois cantos (use o OSNAP Extremidade) e depois onde a linha de cota deve ficar, 10 mm fora da peça.',
    c:function(){ return exAll([function(){return exHasDim(120,'dim','ABNT');},function(){return exHasDim(80,'dim','ABNT');}]); }},
   {t:'Cota do furo',i:'Cote o diâmetro de um dos furos (<b>Ø8</b>) com <code>DDI</code>.',
    h:'<code>DDI</code>: clique no centro do furo (OSNAP Centro), num ponto da circunferência e no lugar do texto.',
    c:function(){ return exHasDim(8,'dimd','ABNT'); }}
  ]},
 {id:'vistas',title:'2. Vistas ortográficas — bloco com degrau',level:'Intermediário · 30 min',
  goal:'Projeção no 1º diedro: vista frontal, superior e lateral esquerda alinhadas, aresta oculta e cotagem.',
  norm:'NBR 10067 (vistas) · NBR 8403 (linhas) · NBR 10126 (cotagem)',view:{x:-30,y:-110,w:220,h:170},
  intro:'Peça de 60 (largura) × 40 (altura) × 30 (profundidade), com um degrau de 30 × 20 no lado direito, em toda a profundidade. No 1º diedro, a vista superior fica <b>abaixo</b> da frontal e a vista lateral esquerda fica <b>à direita</b> dela.',
  steps:[
   {t:'Vista frontal',i:'Desenhe o contorno da vista frontal pelos vértices <b>0,0 → 60,0 → 60,20 → 30,20 → 30,40 → 0,40</b> e feche.',
    h:'<code>PL</code> Enter, digite os pontos (<code>0,0</code>, <code>@60,0</code>, <code>@0,20</code>, <code>@-30,0</code>, <code>@0,20</code>, <code>@-30,0</code>) e <code>F</code> para fechar.',
    c:function(){ var r=exPoly(exSegs(),[exP(0,0),exP(60,0),exP(60,20),exP(30,20),exP(30,40),exP(0,40)]); return r.ok?r:{ok:false,msg:exMissMsg(r,'Vista frontal')}; }},
   {t:'Vista superior',i:'Abaixo da frontal, desenhe a vista superior: <b>mesma largura e alinhada</b> (x de 0 a 60), profundidade <b>30</b>, com a aresta do degrau visível em <b>x = 30</b>. Deixe um espaço entre as vistas (por exemplo, 20 mm).',
    h:'Ligue o ORTHO (F8) e puxe linhas de chamada das arestas da frontal para baixo. Ou <code>REC</code> <code>0,-20</code> <code>@60,-30</code> e uma linha de <code>30,-20</code> a <code>@0,-30</code>.',
    c:function(){ var S2=exSegs(),C=exCandidates(S2,'y',function(y){return y<-EX_TOL;}),best=null;
      for(var i=0;i<C.length;i++){ var y0=C[i],r=exPoly(S2,exRectPts(0,y0-30,60,30)); if(r.ok){ if(!exCovered(S2,exP(30,y0),exP(30,y0-30))) best={ok:false,msg:'A vista superior está no lugar, mas falta a aresta do degrau em x = 30 (de '+gNum(y0)+' a '+gNum(y0-30)+').'}; else return {ok:true}; } }
      return best||{ok:false,msg:'Não encontrei um retângulo de 60 × 30 abaixo da vista frontal com x de 0 a 60. Confira o alinhamento com a frontal (mesmo x) e a profundidade 30.'}; }},
   {t:'Vista lateral esquerda',i:'À direita da frontal, desenhe a vista lateral esquerda: <b>mesma altura e alinhada</b> (y de 0 a 40), largura igual à profundidade (<b>30</b>).',
    h:'Com o ORTHO, puxe linhas de chamada horizontais da frontal. Ou <code>REC</code> <code>80,0</code> <code>@30,40</code>.',
    c:function(){ var S2=exSegs(),C=exCandidates(S2,'x',function(x){return x>60+EX_TOL;});
      for(var i=0;i<C.length;i++){ if(exPoly(S2,exRectPts(C[i],0,30,40)).ok){ EXA.sideX=C[i]; return {ok:true}; } }
      return {ok:false,msg:'Não encontrei um retângulo de 30 × 40 à direita da frontal com y de 0 a 40. Confira o alinhamento com a frontal (mesmo y).'}; }},
   {t:'Aresta oculta',i:'Na vista lateral, a aresta do degrau (altura <b>20</b>) fica escondida atrás da parte alta da peça: desenhe-a com linha <b>tracejada</b> (oculta).',
    h:'Na aba <b>Educacional</b>, clique em <b>Linha oculta</b> antes de desenhar a linha; ou selecione a linha e troque o tipo para Tracejada no painel de propriedades.',
    c:function(){ var S2=exSegs(),x0=EXA.sideX; if(x0===undefined){ var r=EX_LIST[1].steps[2].c(); if(!r.ok) return {ok:false,msg:'Faça antes a vista lateral esquerda.'}; x0=EXA.sideX; }
      var a=exP(x0,20),b=exP(x0+30,20);
      if(exCovered(S2,a,b,function(e){ var ld=exLd(e); return ld==='dashed'||ld==='hidden'; })) return {ok:true};
      if(exCovered(S2,a,b)) return {ok:false,msg:'A linha em y = 20 existe, mas está contínua. Aresta oculta usa linha tracejada (NBR 8403).'};
      return {ok:false,msg:'Falta a aresta oculta de '+exFmt(a)+' a '+exFmt(b)+', tracejada.'}; }},
   {t:'Cotagem',i:'Com o estilo <b>ABNT</b>, cote a largura <b>60</b>, a altura <b>40</b> e a profundidade <b>30</b> (cada medida uma única vez, na vista que melhor a mostra).',
    h:'Largura e altura na vista frontal; a profundidade na vista superior ou na lateral. Use <code>DLI</code> e o OSNAP Extremidade.',
    c:function(){ return exAll([function(){return exHasDim(60,'dim','ABNT');},function(){return exHasDim(40,'dim','ABNT');},function(){return exHasDim(30,'dim','ABNT');}]); }}
  ]},
 {id:'horta',title:'3. Planta de canteiros de uma horta',level:'Intermediário · 40 min',
  goal:'Camadas, cópia com espaçamento, hachura, cotas em série e prancha em escala com carimbo.',
  norm:'NBR 8196 (escalas) · NBR 16752 (folhas) · NBR 10582 (legenda)',view:{x:-800,y:-1500,w:9600,h:8300},
  intro:'Terreno de 8 m × 6 m com quatro canteiros de 1,20 m × 5,00 m e corredores de 0,60 m. Desenhe em milímetros, em verdadeira grandeza: 8 m = 8000.',
  steps:[
   {t:'Camada do terreno',i:'Crie a camada <b>Terreno</b> e torne-a atual.',
    h:'No painel Camadas, clique em <b>+ Nova</b>, digite Terreno e confirme; depois clique na camada para torná-la atual.',
    c:function(){ var l=S.layers.filter(function(x){return /terreno/i.test(x.nm);})[0]; if(!l) return {ok:false,msg:'Não há camada chamada Terreno.'}; return {ok:true}; }},
   {t:'Terreno 8 × 6 m',i:'Na camada Terreno, desenhe o limite do terreno: retângulo <b>8000 × 6000</b> com canto em <b>0,0</b>.',
    h:'<code>REC</code> <code>0,0</code> <code>@8000,6000</code>. Depois <code>ZE</code> Enter (ou <code>Z</code> Enter Enter) para ver o desenho inteiro.',
    c:function(){ var S2=exSegs(),r=exPoly(S2,exRectPts(0,0,8000,6000)); if(!r.ok) return {ok:false,msg:exMissMsg(r,'Terreno 8000 × 6000')};
      if(!exPoly(S2,exRectPts(0,0,8000,6000),function(e){return /terreno/i.test(exLayerName(e));}).ok) return {ok:false,msg:'O terreno está desenhado, mas não na camada Terreno. Selecione-o e troque a camada no painel de propriedades.'};
      return {ok:true}; }},
   {t:'Primeiro canteiro',i:'Desenhe o primeiro canteiro: <b>1200 × 5000</b> com canto em <b>700,500</b>.',
    h:'<code>REC</code> <code>700,500</code> <code>@1200,5000</code>. (Pode criar antes uma camada Canteiros.)',
    c:function(){ var r=exPoly(exSegs(),exRectPts(700,500,1200,5000)); return r.ok?r:{ok:false,msg:exMissMsg(r,'Canteiro 1')}; }},
   {t:'Outros três canteiros',i:'Faça mais três canteiros iguais, com corredores de <b>600</b> entre eles (distância de 1800 de um canteiro ao seguinte).',
    h:'<code>CO</code>, selecione o canteiro, Enter, ponto base <code>700,500</code>, depois <code>M</code> (Matriz), <code>4</code> itens e o segundo ponto <code>@1800,0</code>.',
    c:function(){ var S2=exSegs(); for(var i=1;i<4;i++){ var r=exPoly(S2,exRectPts(700+1800*i,500,1200,5000)); if(!r.ok) return {ok:false,msg:exMissMsg(r,'Canteiro '+(i+1))}; } return {ok:true}; }},
   {t:'Hachura dos canteiros',i:'Hachure os quatro canteiros (padrão à sua escolha).',
    h:'<code>H</code> Enter e clique dentro de cada canteiro; Enter conclui. Ajuste o espaçamento (por exemplo, 150) com a opção Configurações.',
    c:function(){ for(var i=0;i<4;i++){ if(!exHatchAt(exP(700+1800*i+600,3000))) return {ok:false,msg:'O canteiro '+(i+1)+' ainda não está hachurado.'}; }
      if(exHatchAt(exP(700+1200+300,3000))) return {ok:false,msg:'O corredor entre os canteiros 1 e 2 também ficou hachurado. Desfaça e clique só dentro dos canteiros.'};
      return {ok:true}; }},
   {t:'Cotas em série',i:'Com o estilo <b>ABNT</b>, cote a largura de um canteiro (<b>1200</b>), um corredor (<b>600</b>) e a largura total do terreno (<b>8000</b>).',
    h:'<code>DLI</code> na largura do canteiro 1 e, em seguida, <code>DCO</code> (cota em série) para o corredor. A largura total pode ficar numa linha de cota mais afastada.',
    c:function(){ return exAll([function(){return exHasDim(1200,'dim','ABNT');},function(){return exHasDim(600,'dim','ABNT');},function(){return exHasDim(8000,'dim','ABNT');}]); }},
   {t:'Prancha em escala 1:50',i:'Monte a prancha: abra o <b>Layout</b>, deixe a viewport em <b>1:50</b>, insira o <b>Carimbo ABNT</b> e preencha o título do desenho.',
    h:'Clique na aba Layout1, escolha 1:50 em "Escala da viewport", clique em 🗂 Carimbo ABNT e dê duplo clique em "TÍTULO DO DESENHO" para escrever o título.',
    c:function(){ var LS=exLayouts(); if(!LS.length) return {ok:false,msg:'Ainda não há layout. Clique na aba Layout1.'};
      for(var i=0;i<LS.length;i++){ var E=LS[i].ents,vp=E.filter(function(e){return e.tp==='viewport'&&Math.abs(vpRatio(e)-1/50)<1e-9;});
        var cb=E.some(function(e){return e.tp==='insert'&&/^CARIMBO/.test(e.name);}),tit=E.some(function(e){return e.tp==='mtext'&&e.txt==='TÍTULO DO DESENHO';});
        if(vp.length&&cb&&!tit) return {ok:true};
        if(i===LS.length-1){ if(!vp.length) return {ok:false,msg:'A viewport do layout não está em 1:50.'}; if(!cb) return {ok:false,msg:'Falta inserir o Carimbo ABNT no layout.'}; return {ok:false,msg:'Preencha o título do desenho no carimbo (duplo clique em "TÍTULO DO DESENHO").'}; } }
      return {ok:false,msg:''}; }}
  ]}
];

// ── verificação ─────────────────────────────────────────────────────────────
function exState(){ var X=EX_LIST[EXA.cur],res=X.steps.map(function(s){ try{ return s.c(); }catch(err){ return {ok:false,msg:'Erro na verificação: '+err.message}; } });
  var first=-1; for(var i=0;i<res.length;i++) if(!res[i].ok){ first=i; break; } return {X:X,res:res,cur:first}; }
function exCheck(manual){
  if(!EXA.open) return; var st=exState(),X=st.X,key=X.id;
  st.res.forEach(function(r,i){ var k=key+':'+i; if(r.ok&&!EXA.last[k]&&EXA.started){ log('✓ Aula guiada — passo '+(i+1)+' concluído: '+X.steps[i].t+'.','ok'); } EXA.last[k]=r.ok; });
  if(st.cur<0&&EXA.started&&!EXA.finished){ EXA.finished=Date.now(); var sec=Math.round((EXA.finished-EXA.started)/1000); var prev=EXA.done[key];
    EXA.done[key]={t:sec,best:prev&&prev.best?Math.min(prev.best,sec):sec,date:new Date().toISOString()}; try{ localStorage.setItem('educad-aula',JSON.stringify(EXA.done)); }catch(e){}
    log('🏁 Exercício concluído: '+X.title+' em '+exTime(sec)+'.','ok'); }
  exRender(st,manual);
}
function exTime(s){ return Math.floor(s/60)+' min '+('0'+(s%60)).slice(-2)+' s'; }

// ── painel ──────────────────────────────────────────────────────────────────
function exEl(tag,cls,txt){ var e=document.createElement(tag); if(cls) e.className=cls; if(txt!==undefined) e.textContent=txt; return e; }
function exRender(st,manual){
  var P=document.getElementById('aula-panel'); if(!P) return;
  st=st||exState(); var X=st.X,body=document.getElementById('aula-body'); body.textContent='';
  var sel=document.getElementById('aula-sel'); sel.value=String(EXA.cur);
  body.appendChild(exEl('div','aula-meta',X.level+' · '+X.norm));
  var g=exEl('div','aula-goal'); g.innerHTML='<b>Objetivo:</b> '+X.goal; body.appendChild(g);
  var it=exEl('div','aula-intro'); it.innerHTML=X.intro; body.appendChild(it);
  if(!EXA.started){ var sb=exEl('button','btn p aula-start','▶ Começar em um desenho novo'); sb.type='button'; sb.addEventListener('click',exStart); body.appendChild(sb);
    var d=EXA.done[X.id]; if(d) body.appendChild(exEl('div','aula-meta','Já concluído neste navegador · melhor tempo '+exTime(d.best)));
    return; }
  var nOk=st.res.filter(function(r){return r.ok;}).length,pr=exEl('div','aula-prog'),bar=exEl('div','aula-bar'); bar.style.width=Math.round(100*nOk/st.res.length)+'%'; pr.appendChild(bar);
  body.appendChild(pr); body.appendChild(exEl('div','aula-meta',nOk+' de '+st.res.length+' passos'));
  var ol=exEl('ol','aula-steps');
  X.steps.forEach(function(s,i){ var li=exEl('li',st.res[i].ok?'ok':(i===st.cur?'cur':'')); var h=exEl('div','aula-st',(st.res[i].ok?'✓ ':(i===st.cur?'▶ ':'○ '))+s.t); li.appendChild(h);
    if(i===st.cur){ var ins=exEl('div','aula-ins'); ins.innerHTML=s.i; li.appendChild(ins);
      var hb=exEl('button','btn s aula-hintbtn',EXA.shown[X.id+':'+i]?'Ocultar dica':'💡 Dica'); hb.type='button'; hb.addEventListener('click',function(){ EXA.shown[X.id+':'+i]=!EXA.shown[X.id+':'+i]; exRender(); });
      var cb=exEl('button','btn p aula-check','Verificar'); cb.type='button'; cb.addEventListener('click',function(){ exCheck(true); });
      var row=exEl('div','aula-row'); row.appendChild(cb); row.appendChild(hb); li.appendChild(row);
      if(EXA.shown[X.id+':'+i]){ var hd=exEl('div','aula-hint'); hd.innerHTML=s.h; li.appendChild(hd); }
      if(manual||EXA.fbStep===i){ EXA.fbStep=i; var fb=exEl('div','aula-fb',st.res[i].msg||'Ainda não encontrei este passo no desenho.'); li.appendChild(fb); } }
    ol.appendChild(li); });
  body.appendChild(ol);
  if(st.cur<0){ var fin=exEl('div','aula-done'); var sec=Math.round(((EXA.finished||Date.now())-EXA.started)/1000);
    fin.textContent='🏁 Exercício concluído em '+exTime(sec)+'. Salve o desenho (Ctrl+S) ou gere o PDF da prancha.'; body.appendChild(fin);
    if(EXA.cur<EX_LIST.length-1){ var nx=exEl('button','btn p aula-next','Próximo exercício →'); nx.type='button'; nx.addEventListener('click',function(){ exSelect(EXA.cur+1); }); body.appendChild(nx); } }
  var rs=exEl('button','btn s aula-restart','↺ Recomeçar'); rs.type='button'; rs.addEventListener('click',exStart); body.appendChild(rs);
}
function exZoom(v){ var pw=EXA.open?330:0,W=cvW()-pw,H=cvH(),sc=Math.min(W/v.w,H/v.h)*0.9; S.vp={x:pw+W/2-(v.x+v.w/2)*sc,y:H/2+(v.y+v.h/2)*sc,sc:sc}; renderAll(); updStatus(); } // a vista fica à direita do painel
function exStart(){
  var had=(exModel().length||(S.layouts&&S.layouts.length));
  if(had&&S.dirty&&!confirm('Começar o exercício num desenho novo? O desenho atual não salvo será substituído (a cópia de segurança continua disponível em RECUPERAR).')) return;
  if(S.space!=='model') switchSpace('model');
  var cf=window.confirm; window.confirm=function(){ return true; }; try{ newDoc(); } finally { window.confirm=cf; }
  var X=EX_LIST[EXA.cur]; document.getElementById('ftitle').textContent='Aula guiada — '+X.title.replace(/^\d+\.\s*/,'');
  EXA.started=Date.now(); EXA.finished=0; EXA.last={}; EXA.fbStep=-1; EXA.sideX=undefined; S.dirty=false;
  exZoom(X.view); log('Aula guiada: '+X.title+'. Siga os passos do painel; a verificação é automática.','inf'); exCheck(false);
}
function exSelect(i){ EXA.cur=Math.max(0,Math.min(EX_LIST.length-1,i)); EXA.started=0; EXA.finished=0; EXA.last={}; EXA.fbStep=-1; exRender(); }
function aulaOpen(){ var P=document.getElementById('aula-panel'); EXA.open=true; P.classList.add('show'); exRender(); clearInterval(EXA.timer); EXA.timer=setInterval(function(){ exCheck(false); },1200); }
function aulaClose(){ EXA.open=false; document.getElementById('aula-panel').classList.remove('show'); clearInterval(EXA.timer); }
function aulaToggle(){ if(EXA.open) aulaClose(); else aulaOpen(); }
(function(){ var sn=snapshot,un=undo,re=redo;
  function soon(){ if(EXA.open){ clearTimeout(EXA.soon); EXA.soon=setTimeout(function(){ exCheck(false); },250); } }
  snapshot=function(){ var r=sn.apply(this,arguments); soon(); return r; };
  undo=function(){ var r=un.apply(this,arguments); soon(); return r; };
  redo=function(){ var r=re.apply(this,arguments); soon(); return r; };
})();
window.addEventListener('load',function(){
  var P=document.createElement('div'); P.id='aula-panel';
  P.innerHTML='<div class="aula-head"><span>🎓 Aula guiada</span><button type="button" class="aula-x" title="Fechar (AULA)">×</button></div><select id="aula-sel"></select><div id="aula-body"></div>';
  (document.getElementById('cw')||document.body).appendChild(P);
  var sel=P.querySelector('#aula-sel'); EX_LIST.forEach(function(X,i){ var o=document.createElement('option'); o.value=String(i); o.textContent=X.title+(EXA.done[X.id]?' ✓':''); sel.appendChild(o); });
  sel.addEventListener('change',function(){ exSelect(+sel.value); });
  P.querySelector('.aula-x').addEventListener('click',aulaClose);
  ['keydown','mousedown','mouseup','mousemove','click','dblclick','wheel','pointerdown','pointermove','pointerup','contextmenu'].forEach(function(t){ P.addEventListener(t,function(ev){ ev.stopPropagation(); }); });
});
