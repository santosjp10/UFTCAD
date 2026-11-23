/* ═══════════════════════════════════════════════════════════════════
   v8.4 — SCRIPTS (.scr), como no AutoCAD (etapa 2)
   • SCRIPT: executa uma sequência de comandos digitados. Cada espaço ou
     quebra de linha vale como Enter; linha em branco = Enter; linha que
     começa com ";" é comentário. No texto do TEXT, o resto da linha é o texto.
   • Versões de linha de comando dos comandos que abrem janelas:
     -LAYER, -TEXT, -POLYGON, ZOOM [opções] e variáveis (OSMODE, ORTHOMODE,
     GRIDMODE, CLAYER, TEXTSIZE, HPNAME, HPSCALE, HPANG, SETVAR).
   • Ponto digitado onde o comando pede um objeto vale como clique nesse ponto
     (seleção, OFFSET, TRIM, FILLET, HATCH…), e a seleção aceita Último,
     Anterior, Janela (J/W) e Cruzando (C).
   • GRAVARSCRIPT: grava o que se faz na linha de comando e com o mouse e
     devolve o script, para editar, salvar e executar de novo.
   ═══════════════════════════════════════════════════════════════════ */

// ── 1. PONTO DIGITADO = CLIQUE; SELEÇÃO POR TECLADO ─────────────────────────
function scrPt(v){ var s=String(v).trim(); return /^@?\s*[-+.\d]/.test(s)?parseCoord(s):null; }
(function(){
  var sc=ncSelClick;
  ncSelClick=function(ds,pt){
    if(ds.phase==='selwin'&&ds.forceDir){ var a=ds.w1,lo=Math.min(a.x,pt.x),hi=Math.max(a.x,pt.x);
      if(ds.forceDir==='W'){ ds.w1={x:lo,y:a.y}; pt={x:hi,y:pt.y}; } else { ds.w1={x:hi,y:a.y}; pt={x:lo,y:pt.y}; } ds.forceDir=null; }
    return sc(ds,pt);
  };
  ncInput=function(v){
    var ds=S.ds; if(!ds||!NC[ds.cmd]) return false;
    var raw=String(v).trim(),u=raw.toUpperCase(),pt=scrPt(raw);
    if(ds.phase==='sel'||ds.phase==='selwin'){
      if(pt){ if(ds.phase==='sel'&&ds.selMode){ ds.w1={x:pt.x,y:pt.y}; ds.forceDir=ds.selMode; ds.selMode=null; ds.phase='selwin'; ncPrompt(); return true; } ncSelClick(ds,pt); return true; }
      if(ds.phase==='selwin'&&u===''){ ds.phase='sel'; ncPrompt(); return true; }
      if(u===''&&ds.ids.length) S.prevSel=ds.ids.slice();
      if(u==='L'||u==='ULTIMO'||u==='ÚLTIMO'||u==='LAST'){ for(var i=S.ents.length-1;i>=0;i--) if(ncEditable(S.ents[i])){ if(ds.ids.indexOf(S.ents[i].id)<0) ds.ids.push(S.ents[i].id); break; } S.sel=ds.ids.slice(); log('1 encontrado (último), total '+ds.ids.length+'.','inf'); ncPrompt(); renderAll(); return true; }
      if(u==='P'||u==='ANTERIOR'||u==='PREVIOUS'){ (S.prevSel||[]).forEach(function(id){ var e=findE(id); if(e&&ncEditable(e)&&ds.ids.indexOf(id)<0) ds.ids.push(id); }); S.sel=ds.ids.slice(); log('Seleção anterior: total '+ds.ids.length+'.','inf'); ncPrompt(); renderAll(); return true; }
      if(u==='J'||u==='W'||u==='JANELA'||u==='WINDOW'){ ds.selMode='W'; logp('Primeiro canto da janela:'); return true; }
      if(u==='C'||u==='CRUZANDO'||u==='CROSSING'){ ds.selMode='C'; logp('Primeiro canto (cruzando):'); return true; }
      return ncSelInput(ds,u);
    }
    var r=NC[ds.cmd].input(ds,u,raw);
    if(r===false&&pt){ NC[ds.cmd].click(ds,pt); r=true; }       // ponto digitado onde se espera clique
    if(r===false) log('Opção ou valor inválido.','er');
    if(S.ds===ds){ ncPrompt(); renderAll(); }
    return true;
  };
  var fi=filletInput; filletInput=function(v){ var ds=S.ds,pt=scrPt(v); if(ds&&pt&&ds.phase!=='radius'){ handleClick(pt); return true; } return fi(v); };
  var ti=teInput; teInput=function(v){ var ds=S.ds,pt=scrPt(v); if(ds&&pt&&ds.phase!=='mode'){ handleClick(pt); return true; } return ti(v); };
})();

// ── 2. COMANDOS DE LINHA DE COMANDO (sem janelas) ───────────────────────────
var SCR_COLORS={VERMELHO:1,RED:1,AMARELO:2,YELLOW:2,VERDE:3,GREEN:3,CIANO:4,CYAN:4,AZUL:5,BLUE:5,MAGENTA:6,BRANCO:7,WHITE:7,PRETO:7,BLACK:7,CINZA:8,GRAY:8,GREY:8};
function scrColor(s){ s=String(s).trim(); if(/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase(); var u=s.toUpperCase(); if(SCR_COLORS[u]) return aciToHex(SCR_COLORS[u]); var n=parseInt(s,10); if(String(n)===s&&n>=1&&n<=255) return aciToHex(n); return null; }
function scrLayer(nm){ nm=String(nm).trim(); var k=nm.toUpperCase(); return S.layers.filter(function(l){ return String(l.nm).toUpperCase()===k; })[0]||null; }
function scrLayerNew(nm){ var L=scrLayer(nm); if(L) return L; L={id:nextLayerId(),nm:nm,col:'#ffffff',vis:true,lock:false,ld:'solid',lw:.25}; S.layers.push(L); return L; }
function scrLayersUI(){ updLayerUI(); updLayerSel(); updStatus(); if(typeof updPropsPanel==='function') updPropsPanel(); renderAll(); }
function scrNames(raw){ var s=String(raw).trim(); if(s===''){ var c=getLy(S.curLy); return c?[c]:[]; } if(s==='*') return S.layers.slice(); return s.split(',').map(function(n){ return scrLayer(n); }).filter(Boolean); }
NC['-layer']={init:function(ds){ ds.phase='opt'; },
  prompt:function(ds){ return ({opt:'-LAYER [Criar(M)/Definir(S)/Novo(N)/Cor(C)/Ligar(ON)/Desligar(OFF)/Travar(LO)/Destravar(U)] (Enter conclui):',
    M:'Nome da camada a criar e tornar atual:',S:'Nome da camada a tornar atual:',N:'Nome(s) das camadas novas (separe por vírgula):',C:'Cor (1-255, nome ou #rrggbb):',CN:'Camada(s) para a cor (Enter = atual):',
    ON:'Camada(s) a ligar:',OFF:'Camada(s) a desligar:',LO:'Camada(s) a travar:',U:'Camada(s) a destravar:'})[ds.phase]||''; },
  click:function(){},
  input:function(ds,u,raw){
    var p=ds.phase;
    if(p==='opt'){ if(u===''){ ncEnd(); return true; }
      var m={M:'M',MAKE:'M',CRIAR:'M',S:'S',SET:'S',DEFINIR:'S',N:'N',NEW:'N',NOVO:'N',C:'C',COLOR:'C',COR:'C',ON:'ON',LIGAR:'ON',OFF:'OFF',DESLIGAR:'OFF',LO:'LO',LOCK:'LO',TRAVAR:'LO',U:'U',UNLOCK:'U',DESTRAVAR:'U'}[u];
      if(!m) return false; ds.phase=m; return true; }
    if(p==='M'||p==='S'){ if(raw===''){ ds.phase='opt'; return true; } var L=p==='M'?scrLayerNew(raw):scrLayer(raw);
      if(!L){ log('-LAYER: camada "'+raw+'" não existe.','er'); ds.phase='opt'; return true; }
      S.curLy=L.id; log('Camada atual: '+L.nm,'ok'); scrLayersUI(); ds.phase='opt'; return true; }
    if(p==='N'){ raw.split(',').forEach(function(n){ if(n.trim()) scrLayerNew(n.trim()); }); scrLayersUI(); ds.phase='opt'; return true; }
    if(p==='C'){ var c=scrColor(raw); if(!c){ log('-LAYER: cor inválida: '+raw,'er'); ds.phase='opt'; return true; } ds.col=c; ds.phase='CN'; return true; }
    var Ls=scrNames(raw); if(!Ls.length){ log('-LAYER: camada "'+raw+'" não existe.','er'); ds.phase='opt'; return true; }
    Ls.forEach(function(L){ if(p==='CN') L.col=ds.col; else if(p==='ON') L.vis=true; else if(p==='OFF'){ if(L.id===S.curLy) log('A camada atual não pode ser desligada.','inf'); else L.vis=false; } else if(p==='LO') L.lock=true; else if(p==='U') L.lock=false; });
    scrLayersUI(); ds.phase='opt'; return true; }};
function scrTextH(){ var th=document.getElementById('th'); var v=S.textSize||(th&&parseFloat(th.value))||2.5; return v>0?v:2.5; }
NC['-text']={init:function(ds){ ds.phase='pt'; },
  prompt:function(ds){ return ({pt:'TEXT Ponto inicial do texto:',h:'Altura <'+gNum(scrTextH())+'>:',rot:'Ângulo de rotação do texto <0>:',str:'Texto (Enter em linha vazia conclui):'})[ds.phase]; },
  click:function(ds,pt){ if(ds.phase==='pt'){ ds.p={x:pt.x,y:pt.y}; ds.phase='h'; } else if(ds.phase==='rot'){ ds.rot=Math.atan2(pt.y-ds.p.y,pt.x-ds.p.x); ds.phase='str'; } else if(ds.phase==='h'){ ds.h=Math.hypot(pt.x-ds.p.x,pt.y-ds.p.y)||scrTextH(); ds.phase='rot'; } },
  input:function(ds,u,raw){
    if(ds.phase==='pt') return false;
    if(ds.phase==='h'){ if(u===''){ ds.h=scrTextH(); ds.phase='rot'; return true; } var h=ncNum(raw); if(h===null||h<=0) return false; ds.h=h; S.textSize=h; ds.phase='rot'; return true; }
    if(ds.phase==='rot'){ if(u===''){ ds.rot=0; ds.phase='str'; return true; } var a=ncNum(raw); if(a===null) return false; ds.rot=a*Math.PI/180; ds.phase='str'; return true; }
    if(raw===''){ ncEnd(); return true; }
    snapshot(); addE({tp:'txt',x:ds.p.x,y:ds.p.y,txt:raw,h:ds.h,rot:ds.rot||0},true); ds.done++;
    var k=1.5*ds.h; ds.p={x:ds.p.x+k*Math.sin(ds.rot||0),y:ds.p.y-k*Math.cos(ds.rot||0)}; return true; }};
NC['-polygon']={init:function(ds){ ds.phase='n'; },
  prompt:function(ds){ return ({n:'POLYGON Número de lados <'+(S.polN||4)+'>:',c:'Centro do polígono ou [Aresta]:',m:'[Inscrito no círculo/Circunscrito ao círculo] <'+(S.polM==='cc'?'C':'I')+'>:',r:'Raio do círculo:',e1:'Primeiro ponto da aresta:',e2:'Segundo ponto da aresta:'})[ds.phase]; },
  click:function(ds,pt){ var n=ds.n;
    if(ds.phase==='c'){ ds.c={x:pt.x,y:pt.y}; ds.phase='m'; return; }
    if(ds.phase==='r'){ var r=Math.hypot(pt.x-ds.c.x,pt.y-ds.c.y),a=Math.atan2(pt.y-ds.c.y,pt.x-ds.c.x); if(r<1e-9) return; polyBuild(ds.c,r,n,S.polM,a); ncEnd(); return; }
    if(ds.phase==='e1'){ ds.p1={x:pt.x,y:pt.y}; ds.phase='e2'; return; }
    if(ds.phase==='e2'){ var ex=pt.x-ds.p1.x,ey=pt.y-ds.p1.y,L=Math.hypot(ex,ey); if(L<1e-9) return; var ang=Math.atan2(ey,ex),ap=L/(2*Math.tan(Math.PI/n)),R=L/(2*Math.sin(Math.PI/n));
      var c={x:(ds.p1.x+pt.x)/2-ap*Math.sin(ang),y:(ds.p1.y+pt.y)/2+ap*Math.cos(ang)},P=[];
      for(var i=0;i<n;i++){ var t=Math.atan2(ds.p1.y-c.y,ds.p1.x-c.x)+i*2*Math.PI/n; P.push({x:c.x+R*Math.cos(t),y:c.y+R*Math.sin(t)}); }
      P.push({x:P[0].x,y:P[0].y}); snapshot(); addE({tp:'pl',pts:P,closed:true},true); log('Polígono '+n+' lados (aresta = '+gNum(Math.round(L*1e4)/1e4)+').','ok'); ncEnd(); } },
  input:function(ds,u,raw){
    if(ds.phase==='n'){ var n=u===''?(S.polN||4):parseInt(raw,10); if(!(n>=3&&n<=1024)||(u!==''&&String(n)!==raw)) return false; ds.n=S.polN=n; ds.phase='c'; return true; }
    if(ds.phase==='c'){ if(u==='A'||u==='E'||u==='ARESTA'||u==='EDGE'){ ds.phase='e1'; return true; } return false; }
    if(ds.phase==='m'){ if(u===''||u==='I'||u==='INSCRITO'){ S.polM=S.polM&&u===''?S.polM:'ic'; } else if(u==='C'||u==='CIRCUNSCRITO'){ S.polM='cc'; } else return false; ds.phase='r'; return true; }
    if(ds.phase==='r'){ var r=ncNum(raw); if(r===null||r<=0) return false; var n2=ds.n; polyBuild(ds.c,r,n2,S.polM,-Math.PI/2+Math.PI/n2); ncEnd(); return true; } // lado de baixo horizontal, como no AutoCAD
    return false; }};
NC['-zoom']={init:function(ds){ ds.phase='opt'; },
  prompt:function(ds){ return ds.phase==='opt'?'ZOOM [Extensão(E)/Tudo(A)/Janela(J)/Mais(+)/Menos(-)] ou fator nX:':ds.phase==='w1'?'Primeiro canto:':'Canto oposto:'; },
  click:function(ds,pt){ if(ds.phase==='opt'||ds.phase==='w1'){ ds.a=pt; ds.phase='w2'; return; }
    var a=ds.a,w=Math.abs(pt.x-a.x)||1,h=Math.abs(pt.y-a.y)||1,W=cvW(),H=cvH(); S.vp.sc=Math.min(W/w,H/h)*.95; S.vp.x=W/2-(Math.min(a.x,pt.x)+w/2)*S.vp.sc; S.vp.y=H/2+(Math.min(a.y,pt.y)+h/2)*S.vp.sc; ncEnd(false); renderAll(); },
  input:function(ds,u,raw){ if(ds.phase!=='opt') return false;
    if(u===''){ ncEnd(false); return true; }
    if(/^(E|EXT|EXTENS[AÃ]O|EXTENTS|A|ALL|TUDO|FIT)$/.test(u)){ zoomFit(); ncEnd(false); return true; }
    if(/^(J|W|JANELA|WINDOW)$/.test(u)){ ds.phase='w1'; return true; }
    if(u==='+'||u==='IN'||u==='MAIS'){ doZoom(1.5); ncEnd(false); return true; }
    if(u==='-'||u==='OUT'||u==='MENOS'){ doZoom(.67); ncEnd(false); return true; }
    var m=/^(\d+(?:[.,]\d+)?)X?$/.exec(u); if(m){ doZoom(parseFloat(m[1].replace(',','.'))); ncEnd(false); return true; }
    return false; }};
// variáveis de sistema (nome → [obter, definir(valor bruto) → true/false])
function scrMode(k){ return [function(){ return S.modes[k]?1:0; },function(v){ var n=ncNum(v); if(n===null) return false; if(!!S.modes[k]!==(n!==0)) toggleMode(k); return true; }]; }
function scrHpFind(nm){ var u=String(nm).trim().toUpperCase(); return HPAT_BY[u]||HPAT_BY['EDU_'+u]||HPAT.map(function(p){ return HPAT_BY[p[1]]; }).filter(function(P){ return P.acad&&P.acad.toUpperCase()===u; })[0]||null; }
function scrHpApply(){ var P=HPAT_BY[S.hpName||'ANSI31']||HPAT_BY.ANSI31; S.hatchPat={name:P.name,type:'pat',pname:P.id,ang:S.hpAng||0,sp:P.size*(S.hpScale||1)}; }
var SCR_VARS={
  OSMODE:scrMode('osnap'),ORTHOMODE:scrMode('ortho'),GRIDMODE:scrMode('grid'),SNAPMODE:scrMode('snap'),
  CLAYER:[function(){ var l=getLy(S.curLy); return l?l.nm:''; },function(v){ var L=scrLayer(v); if(!L){ log('CLAYER: camada "'+v+'" não existe. Use -LAYER Criar.','er'); return true; } S.curLy=L.id; scrLayersUI(); return true; }],
  TEXTSIZE:[function(){ return gNum(scrTextH()); },function(v){ var n=ncNum(v); if(n===null||n<=0) return false; S.textSize=n; var th=document.getElementById('th'); if(th) th.value=n; return true; }],
  HPNAME:[function(){ return S.hpName||'ANSI31'; },function(v){ var P=scrHpFind(v); if(!P){ log('HPNAME: padrão "'+v+'" não existe. Veja a galeria da hachura (H).','er'); return true; } S.hpName=P.id; scrHpApply(); return true; }],
  HPSCALE:[function(){ return gNum(S.hpScale||1); },function(v){ var n=ncNum(v); if(n===null||n<=0) return false; S.hpScale=n; scrHpApply(); return true; }],
  HPANG:[function(){ return gNum(S.hpAng||0); },function(v){ var n=ncNum(v); if(n===null) return false; S.hpAng=n; scrHpApply(); return true; }]
};
NC.setvar={init:function(ds){ ds.phase=ds.vname?'val':'name'; },
  prompt:function(ds){ return ds.phase==='name'?'SETVAR Nome da variável ('+Object.keys(SCR_VARS).join(', ')+'):':'Novo valor para '+ds.vname+' <'+SCR_VARS[ds.vname][0]()+'>:'; },
  click:function(){},
  input:function(ds,u,raw){
    if(ds.phase==='name'){ if(u===''){ ncEnd(false); return true; } if(!SCR_VARS[u]) return false; ds.vname=u; ds.phase='val'; return true; }
    if(u===''){ ncEnd(false); return true; }
    var ok=SCR_VARS[ds.vname][1](raw); if(ok===false) return false; log(ds.vname+' = '+SCR_VARS[ds.vname][0](),'ok'); ncEnd(false); return true; }};
// ELLIPSE: distância digitada para o outro semieixo (sem depender do cursor)
function scrEllipseNum(v){ var ds=S.ds; if(S.tool!=='ellipse'||!ds||!ds.pts||ds.pts.length!==2) return false; var n=ncNum(v); if(n===null||n<=0) return false;
  var c=ds.pts[0],ax=ds.pts[1].x-c.x,ay=ds.pts[1].y-c.y,l=Math.hypot(ax,ay)||1; handleClick({x:c.x-ay/l*n,y:c.y+ax/l*n}); return true; }

// ── 3. EXECUTOR DE SCRIPTS ──────────────────────────────────────────────────
var SCR_ALIAS={TEXT:'-text',DT:'-text',DTEXT:'-text','-TEXT':'-text',POLYGON:'-polygon',POL:'-polygon','-POLYGON':'-polygon','-POL':'-polygon',
  '-LAYER':'-layer','-LA':'-layer','-CAMADA':'-layer',ZOOM:'-zoom','-ZOOM':'-zoom',SETVAR:'setvar','SCRIPT':'script','SCR':'script',
  GRAVARSCRIPT:'rec',ACTRECORD:'rec',GRAVAR:'rec',PARARGRAVACAO:'recstop',ACTSTOP:'recstop'};
var SCR_SCRIPT_ONLY={TEXT:1,DT:1,DTEXT:1,POLYGON:1,POL:1,LAYER:1,LA:1};  // em scripts, as versões sem janela
var SCR={running:false};
function scrIdle(){ return !S.ds&&!S.grip; }
// Comandos próprios deste módulo (linha de comando e scripts)
function scrCommand(v,inScript){
  if(!scrIdle()) return false;
  var s=String(v).trim(),w=s.split(/\s+/),c=w[0].toUpperCase().replace(/^[_.']+/,''),rest=s.slice(w[0].length).trim();
  if(inScript&&(c==='LAYER'||c==='LA')) c='-LAYER';
  if(SCR_VARS[c]){ setTool('setvar'); S.ds.vname=c; S.ds.phase='val'; ncPrompt(); if(rest) cmdSubmit(rest); return true; }
  var a=SCR_ALIAS[c]; if(!a) return false;
  if(!inScript&&SCR_SCRIPT_ONLY[c]) return false; // digitados: TEXT, DT e POLYGON continuam com a janela
  if(a==='script'){ if(inScript){ log('SCRIPT dentro de script não é permitido.','er'); return true; } scrOpen(); return true; }
  if(a==='rec'){ scrRecToggle(); return true; }
  if(a==='recstop'){ if(SCRREC.on) scrRecToggle(); return true; }
  if(a==='-zoom'&&rest){ setTool('-zoom'); cmdSubmit(rest); return true; }
  setTool(a); return true;
}
(function(){
  var ok0=onCmdKey;
  onCmdKey=function(e){
    if(e.key===' '&&scrWantsText()){ e.stopPropagation(); return; } // espaço faz parte do texto
    if(e.key==='Enter'){
      var ci=document.getElementById('cmdinput'),v=ci.value.trim();
      if(scrIdle()&&/^[_.][A-Za-z]/.test(v)){ v=v.replace(/^[_.]+/,''); ci.value=v; }
      if(scrEllipseNum(v)){ ci.value=''; return; }
      var rec=SCRREC.on&&!SCR.running;
      if(rec){ SCRREC.inKey++; SCRREC.pend=scrRecPush(v); }
      try{
        if(scrCommand(v,SCR.running)){ ci.value=''; if(!SCR.running) log('> '+v); return; }
        return ok0.apply(this,arguments);
      } finally { if(rec){ SCRREC.inKey--; SCRREC.pend=-1; } }
    }
    return ok0.apply(this,arguments);
  };
})();
// leitor: espaço e fim de linha = Enter; ";" no início = comentário; no texto do TEXT, o resto da linha
function scrWantsText(){ return S.ds&&S.ds.cmd==='-text'&&S.ds.phase==='str'; }
function scrNext(R){
  while(R.li<R.lines.length){
    var L=R.lines[R.li];
    if(R.col===0&&/^\s*;/.test(L)){ R.li++; continue; }
    if(scrWantsText()){ var t=L.slice(R.col); R.li++; R.col=0; return {v:t,line:R.map?R.map[R.li-1]:R.li}; }
    var i=R.col; while(i<L.length&&L[i]!==' '&&L[i]!=='\t') i++;
    var tok=L.slice(R.col,i),ln=R.map?R.map[R.li]:R.li+1;
    if(i>=L.length){ R.li++; R.col=0; } else R.col=i+1;
    return {v:tok,line:ln};
  }
  return null;
}
function scrFinish(msg,type){
  var R=SCR.cur; SCR.running=false; SCR.cur=null; window.log=SCR.log0;
  if(R.hover!==undefined) S.hover=R.hover;
  if(R.oneUndo&&JSON.stringify(S.ents)!==R.pre){ S.undos=R.undos0.concat([R.pre]); while(S.undos.length>UNDO_MAX) S.undos.shift(); S.redos=[]; S.dirty=true; }
  document.body.classList.remove('scr-running');
  renderAll(); updStatus(); updSelInfo(); updLayerUI();
  log(msg,type); if(SCR.onEnd) SCR.onEnd(type!=='er'); return type!=='er';
}
function scrStep(){
  var R=SCR.cur; if(!R) return;
  var t0=Date.now();
  while(true){
    if(R.cancel) return scrFinish('SCRIPT cancelado na linha '+R.line+'.','er');
    var tk=scrNext(R);
    if(!tk){ if(R.repeat&&R.reps<R.maxReps){ R.reps++; R.li=0; R.col=0; continue; } if(S.ds&&S.tool!=='select') cmdSubmit(''); return scrFinish('SCRIPT concluído: '+R.n+' entrada(s), '+(S.ents.length-R.n0)+' objeto(s) a mais'+(R.oneUndo?' — Ctrl+Z desfaz tudo.':'.'),'ok'); }
    R.line=tk.line; R.n++;
    if(R.n>R.maxSteps) return scrFinish('SCRIPT interrompido: mais de '+R.maxSteps+' entradas.','er');
    var u=tk.v.trim().toUpperCase().replace(/^[_.']+/,'');
    if(scrIdle()&&u==='DELAY'){ var d=scrNext(R),ms=d?Math.min(10000,Math.max(0,parseInt(d.v,10)||0)):0; R.n++; return setTimeout(scrStep,ms); }
    if(scrIdle()&&(u==='RSCRIPT')){ R.repeat=true; R.reps++; if(R.reps>R.maxReps) return scrFinish('RSCRIPT: '+R.maxReps+' repetições concluídas.','ok'); R.li=0; R.col=0; continue; }
    if(scrIdle()&&u==='RESUME') continue;
    R.err=null; S.hover=null;
    cmdSubmit(tk.v);
    if(R.err){ R.errLine=tk.line; SCR.lastErr={line:tk.line,tok:tk.v,msg:R.err};
      return scrFinish('SCRIPT interrompido na linha '+tk.line+' ("'+tk.v+'"): '+R.err+(/^\d+([.,]\d+)?$/.test(tk.v.trim())?' Em scripts, use coordenadas (x,y ou @dx,dy ou @dist<ângulo) em vez da distância na direção do cursor.':''),'er'); }
    var ov=document.querySelector('.ov.show');
    if(ov){ ov.classList.remove('show'); SCR.lastErr={line:tk.line,tok:tk.v,msg:'abre uma janela'}; if(S.ds&&S.tool!=='select') cancelTool();
      return scrFinish('SCRIPT interrompido na linha '+tk.line+': "'+tk.v+'" abre uma janela, que um script não preenche. Use as versões de linha de comando (-LAYER, TEXT, POLYGON, HPNAME/HPSCALE…).','er'); }
    if(R.delay){ renderAll(); return setTimeout(scrStep,R.delay); }
    if(Date.now()-t0>4000){ renderAll(); return setTimeout(scrStep,0); }
  }
}
function scrRun(text,opt){
  opt=opt||{};
  if(SCR.running){ log('Já há um script em execução (Esc cancela).','er'); return false; }
  text=String(text||'').replace(/^﻿/,'').replace(/\r\n?/g,'\n');
  if(text.length>500000){ log('SCRIPT: arquivo grande demais (máx. 500 mil caracteres).','er'); return false; }
  if(S.tool!=='select'||S.ds) cancelTool();
  var lines=text.split('\n'),lastEOF=/\n$/.test(text); if(lastEOF) lines.pop();
  var R={lines:lines,li:0,col:0,n:0,n0:S.ents.length,line:0,delay:opt.delay||0,oneUndo:opt.oneUndo!==false,maxSteps:opt.maxSteps||100000,maxReps:opt.maxReps||50,reps:0,
    pre:JSON.stringify(S.ents),undos0:S.undos.slice(),hover:S.hover,name:opt.name||'script',lastEOF:lastEOF,map:opt.lineMap||null};
  SCR.cur=R; SCR.running=true; SCR.lastErr=null; SCR.lastText=text; SCR.onEnd=opt.onEnd||null;
  SCR.log0=window.log; window.log=function(m,t){ if(t==='er'&&SCR.cur&&!SCR.cur.err) SCR.cur.err=m; return SCR.log0.apply(this,arguments); };
  document.body.classList.add('scr-running');
  SCR.log0('SCRIPT: executando '+R.name+(R.delay?' passo a passo (Esc cancela)':'')+'…','inf');
  scrStep(); return true;
}
document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&SCR.running&&SCR.cur){ SCR.cur.cancel=true; e.stopPropagation(); e.preventDefault(); } },true);

// ── 4. GRAVAÇÃO (GRAVARSCRIPT / ACTRECORD) ──────────────────────────────────
var SCRREC={on:false,toks:[],inKey:0,pend:-1};
var SCR_TOOLCMD={line:'LINE',polyline:'PLINE',rectangle:'RECTANG',circle:'CIRCLE',arc:'ARC',ellipse:'ELLIPSE',spline:'SPLINE',hatch:'HATCH',point:'POINT',
  dim:'DIMLINEAR',dimali:'DIMALIGNED',dimr:'DIMRADIUS',dimd:'DIMDIAMETER',dima:'DIMANGULAR',dimcontinue:'DIMCONTINUE',dimbaseline:'DIMBASELINE',
  move:'MOVE',copy:'COPY',rotate:'ROTATE',scale:'SCALE',mirror:'MIRROR',offset:'OFFSET',erase:'ERASE',trim:'TRIM',extend:'EXTEND',fillet:'FILLET',chamfer:'CHAMFER',
  stretch:'STRETCH',join:'JOIN',pedit:'PEDIT',break:'BREAK',explode:'EXPLODE',leader:'LEADER',text:'TEXT',dist:'DIST',area:'AREA'};
function scrFmt(v){ var r=Math.round(v*1e4)/1e4; return String(Object.is(r,-0)?0:r); }
function scrRecPush(v,idle){ SCRREC.toks.push({v:String(v),idle:idle===undefined?scrIdle()&&!/^(@|[+.\d]|-[\d.])/.test(String(v)):idle,txt:scrWantsText()}); return SCRREC.toks.length-1; }
function scrRecPoint(pt){ var t=scrFmt(pt.x)+','+scrFmt(pt.y); if(SCRREC.inKey&&SCRREC.pend>=0){ var p=SCRREC.toks[SCRREC.pend]; if(!scrPt(p.v)) SCRREC.toks[SCRREC.pend]={v:t,idle:false}; else p.idle=false; SCRREC.pend=-1; } else if(!SCRREC.inKey) scrRecPush(t,false); }
function scrRecText(){ // tokens → texto do script (uma linha por comando)
  var out=[],cur=null;
  SCRREC.toks.forEach(function(t){
    if(t.v===''){ if(cur!==null){ out.push(cur); cur=null; out.push(''); } else out.push(''); return; }
    if(t.idle&&cur!==null){ out.push(cur); cur=null; }
    if(t.txt){ out.push(cur===null?t.v:cur+' '+t.v); cur=null; return; }
    cur=cur===null?t.v:cur+' '+t.v; });
  if(cur!==null) out.push(cur);
  return out.join('\n')+'\n';
}
function scrRecToggle(){
  if(!SCRREC.on){ SCRREC.on=true; SCRREC.toks=[]; scrRecBadge(); log('GRAVANDO SCRIPT: use a linha de comando e o mouse normalmente. GRAVARSCRIPT (ou o indicador vermelho) conclui.','ok'); return; }
  SCRREC.on=false; scrRecBadge(); var lt=SCRREC.toks[SCRREC.toks.length-1]; if(lt&&/^(GRAVARSCRIPT|ACTRECORD|GRAVAR|PARARGRAVACAO|ACTSTOP)$/i.test(lt.v)) SCRREC.toks.pop(); if(S.ds&&S.tool!=='select') scrRecPush('',false);
  var txt='; Script gravado no EduCAD em '+new Date().toLocaleString('pt-BR')+'\n'+scrRecText();
  log('Gravação concluída: '+SCRREC.toks.length+' entrada(s). Revise, salve ou execute o script.','ok');
  scrOpen(txt,'gravado.scr');
}
function scrRecBadge(){ var b=document.getElementById('scr-rec'); if(b) b.style.display=SCRREC.on?'':'none'; }
(function(){
  var hc=handleClick;
  handleClick=function(pt){
    if(SCRREC.on&&!SCR.running&&pt&&!(S.tool==='select'&&!S.ds)){
      var pol=S.tool==='polygon'&&S.ds&&S.ds.method!=='edge'&&!S.ds.center;
      scrRecPoint(pt); if(pol) scrRecPush(S.ds.method==='cc'?'C':'I',false);
    }
    return hc.apply(this,arguments);
  };
  var st=setTool;
  setTool=function(tool){
    var rec=SCRREC.on&&!SCR.running&&!SCRREC.inKey&&tool!=='select'&&tool!=='pan';
    if(rec) scrRecPush(SCR_TOOLCMD[tool]||tool.toUpperCase(),true);
    var r=st.apply(this,arguments);
    // seleção feita antes do comando: grava como pontos sobre os objetos
    if(SCRREC.on&&!SCR.running&&S.ds&&NC[tool]&&NC[tool].needSel&&S.ds.phase!=='sel'&&S.ds.ids&&S.ds.ids.length){
      var at=SCRREC.toks.length,pts=[];
      S.ds.ids.forEach(function(id){ var e=findE(id); if(!e) return; var c=(snapPts(e)||[]).filter(function(q){ return hitEnt(e,q.x,q.y); })[0]; if(c) pts.push(scrFmt(c.x)+','+scrFmt(c.y)); });
      if(SCRREC.inKey){ SCRREC.after=pts; } else { pts.forEach(function(p){ scrRecPush(p,false); }); scrRecPush('',false); }
    }
    return r;
  };
  var ct=confirmText;
  confirmText=function(){
    if(SCRREC.on&&!SCR.running&&S.ds&&S.ds.pts&&S.ds.pts[0]){ // DT pela janela → TEXT de linha de comando
      var i=SCRREC.toks.length-1; while(i>=0&&!SCRREC.toks[i].idle) i--; if(i>=0) SCRREC.toks.length=i;
      var p=S.ds.pts[0],h=parseFloat(document.getElementById('th').value)||10,t=document.getElementById('tv').value||'Texto';
      [['TEXT',true],[scrFmt(p.x)+','+scrFmt(p.y),false],[String(h),false],['0',false]].forEach(function(a){ scrRecPush(a[0],a[1]); });
      SCRREC.toks.push({v:t,idle:false,txt:true}); scrRecPush('',false);
    }
    return ct.apply(this,arguments);
  };
  var cp=confirmPolygon;
  confirmPolygon=function(){
    if(SCRREC.on&&!SCR.running){ var i=SCRREC.toks.length-1; if(i>=0&&/^(POL|POLYGON|-POLYGON)$/i.test(SCRREC.toks[i].v)) SCRREC.toks.length=i;
      scrRecPush('POLYGON',true); scrRecPush(String(Math.max(3,Math.min(1024,parseInt(document.getElementById('pol-sides').value)||6))),false);
      if(document.getElementById('pol-method').value==='edge') scrRecPush('A',false); }
    return cp.apply(this,arguments);
  };
  var kd=function(e){ if(e.key==='Escape'&&SCRREC.on&&!SCR.running&&S.ds) scrRecPush('',false); };
  document.addEventListener('keydown',kd,true);
})();
// pontos da pré-seleção gravados depois do nome do comando digitado
(function(){ var ok1=onCmdKey; onCmdKey=function(e){ var r=ok1.apply(this,arguments); if(SCRREC.after){ var a=SCRREC.after; SCRREC.after=null; a.forEach(function(p){ scrRecPush(p,false); }); scrRecPush('',false); } return r; }; })();

// ── 5. JANELA DO SCRIPT ─────────────────────────────────────────────────────
var SCR_EX=[
 ['Placa com furo (básico)','placa.scr',
  '; Exemplo 1 — placa com furo e texto (unidades: mm)\n; Cada espaço ou quebra de linha vale como Enter.\n; Linha em branco = Enter (conclui o comando). Linha com ";" = comentário.\n'+
  '-LAYER M Contorno C 3 Contorno\n\n'+
  'RECTANG 0,0 100,60\nCIRCLE 50,30 15\nLINE 0,30 100,30\n\n'+
  'TEXTSIZE 5\nTEXT 0,-12 5 0 Placa 100 x 60 mm\n\n'+
  'DLI 0,0 100,0 50,-6\nZOOM E\n'],
 ['Canteiros de horta (repetição)','canteiros.scr',
  '; Exemplo 2 — 4 canteiros de 1,0 x 5,0 m com corredores de 0,5 m (unidades: mm)\n; Linhas repetidas assim podem ser geradas numa planilha (Excel) e coladas aqui.\n'+
  '-LAYER M Canteiros C verde Canteiros\n\n'+
  'RECTANG 0,0 1000,5000\nRECTANG 1500,0 2500,5000\nRECTANG 3000,0 4000,5000\nRECTANG 4500,0 5500,5000\n'+
  '-LAYER M Hachura C 2 Hachura\n\n'+
  'HPNAME EDU_CULTIVO\nHPSCALE 20\nHATCH 500,2500 2000,2500 3500,2500 5000,2500\n\n'+
  '-LAYER S Canteiros\n\nTEXTSIZE 150\n'+
  'TEXT 0,5200 150 0 C1\n\nTEXT 1500,5200 150 0 C2\n\nTEXT 3000,5200 150 0 C3\n\nTEXT 4500,5200 150 0 C4\n\n'+
  'DLI 0,0 1000,0 500,-400\nDLI 1000,0 1500,0 1250,-400\nZOOM E\n'],
 ['Terreno por coordenadas (polígono)','terreno.scr',
  '; Exemplo 3 — divisa de um terreno por coordenadas em metros (desenho em mm: × 1000)\n'+
  '-LAYER M Divisa C 1 Divisa\n\n'+
  'PLINE 0,0 42000,0 48500,-21500 22000,-33000 -3000,-18000 C\n'+
  'POINT 0,0 42000,0 48500,-21500 22000,-33000 -3000,-18000\n\n'+
  'TEXTSIZE 1500\nTEXT 500,500 1500 0 V1\n\nTEXT 42500,500 1500 0 V2\n\n'+
  'POLYGON 6 20000,-15000 I 2500\nZOOM E\n']
];
function scrOpen(text,name){
  var ov=document.getElementById('ov-script'); if(!ov) return;
  if(S.tool!=='select') setTool('select');
  var ta=document.getElementById('scr-txt');
  if(text!==undefined){ ta.value=text; SCR.fname=name||'script.scr'; SCR.lastErr=null; } else if(!ta.value) { ta.value=SCR_EX[0][2]; SCR.fname=SCR_EX[0][1]; }
  ov.classList.add('show'); scrInfo();
  setTimeout(function(){ ta.focus(); if(SCR.lastErr&&ta.value===SCR.lastText) scrMarkLine(SCR.lastErr.line); },30);
}
function scrMarkLine(n){ var ta=document.getElementById('scr-txt'),L=ta.value.split('\n'),a=0; for(var i=0;i<n-1&&i<L.length;i++) a+=L[i].length+1; ta.setSelectionRange(a,a+(L[n-1]||'').length);
  var lh=parseFloat(getComputedStyle(ta).lineHeight)||14; ta.scrollTop=Math.max(0,(n-4)*lh); }
function scrInfo(){ var ta=document.getElementById('scr-txt'),inf=document.getElementById('scr-info'); var L=ta.value.split('\n');
  var cmt=L.filter(function(l){ return /^\s*;/.test(l); }).length;
  inf.textContent=(SCR.fname||'script.scr')+' · '+L.length+' linha(s), '+cmt+' comentário(s)'+(SCR.lastErr&&ta.value===SCR.lastText?' · erro na linha '+SCR.lastErr.line+': '+SCR.lastErr.msg:''); }
function scrExec(){
  var ta=document.getElementById('scr-txt'),delay=+document.getElementById('scr-speed').value,one=document.getElementById('scr-undo').checked;
  closeOv('ov-script');
  scrRun(ta.value,{delay:delay,oneUndo:one,name:SCR.fname||'script.scr',onEnd:function(ok){ if(!ok&&SCR.lastErr) log('Abra o SCRIPT de novo para ver a linha com erro destacada.','inf'); }});
}
function scrSave(){ var t=document.getElementById('scr-txt').value.replace(/\r?\n/g,'\r\n'); if(!/\r\n$/.test(t)) t+='\r\n';
  var nm=(SCR.fname||'script.scr').replace(/\.scr$/i,'')+'.scr';
  var b=new Blob([cp1252Encode(t)],{type:'application/octet-stream'}),a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=nm; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },500);
  log('Script salvo: '+nm+' (ANSI, CRLF — abre no AutoCAD e no ZWCAD).','ok'); }
function scrLoadFile(ev){ var f=ev.target.files[0]; if(!f) return; var r=new FileReader();
  r.onload=function(e){ var buf=new Uint8Array(e.target.result),txt; try{ txt=new TextDecoder('utf-8',{fatal:true}).decode(buf); }catch(err){ txt=new TextDecoder('windows-1252').decode(buf); }
    document.getElementById('scr-txt').value=txt.replace(/^﻿/,'').replace(/\r\n?/g,'\n'); SCR.fname=f.name; SCR.lastErr=null; scrInfo(); ev.target.value=''; };
  r.readAsArrayBuffer(f); }
window.addEventListener('load',function(){
  var ov=document.createElement('div'); ov.className='ov'; ov.id='ov-script';
  ov.innerHTML='<div class="modal scr-modal"><h3>Script (.scr) — sequência de comandos</h3>'+
   '<div class="scr-bar"><button class="btn s" type="button" id="scr-open">Abrir .scr…</button><button class="btn s" type="button" id="scr-save">Salvar .scr</button>'+
   '<select id="scr-ex"><option value="">Exemplos…</option></select><button class="btn s" type="button" id="scr-rec-btn" title="Grava o que você fizer na linha de comando e com o mouse — GRAVARSCRIPT">● Gravar</button></div>'+
   '<textarea id="scr-txt" spellcheck="false" wrap="off"></textarea>'+
   '<div id="scr-info" class="scr-info"></div>'+
   '<div class="scr-help">Cada <b>espaço</b> ou <b>quebra de linha</b> vale como Enter; <b>linha em branco</b> conclui o comando; <b>;</b> no início = comentário. '+
   'Em scripts, TEXT, POLYGON e LAYER usam as perguntas da linha de comando (sem janela). Variáveis: OSMODE, ORTHOMODE, CLAYER, TEXTSIZE, HPNAME, HPSCALE, HPANG. '+
   'Na seleção: ponto, J (janela), C (cruzando), L (último), P (anterior). Esc interrompe.</div>'+
   '<div class="scr-opts"><label>Velocidade <select id="scr-speed"><option value="0">Instantânea</option><option value="150">Ver desenhando</option><option value="500">Passo a passo (lento)</option></select></label>'+
   '<label><input type="checkbox" id="scr-undo" checked> Um Ctrl+Z desfaz o script inteiro</label></div>'+
   '<input type="file" id="scr-file" accept=".scr,.txt" style="display:none">'+
   '<div class="mact"><button class="btn s" type="button" onclick="closeOv(\'ov-script\')">Fechar</button><button class="btn p" type="button" id="scr-run">Executar</button></div></div>';
  document.body.appendChild(ov);
  var ex=document.getElementById('scr-ex'); SCR_EX.forEach(function(x,i){ var o=document.createElement('option'); o.value=String(i); o.textContent=x[0]; ex.appendChild(o); });
  ex.addEventListener('change',function(){ if(this.value==='') return; var x=SCR_EX[+this.value]; document.getElementById('scr-txt').value=x[2]; SCR.fname=x[1]; SCR.lastErr=null; this.value=''; scrInfo(); });
  document.getElementById('scr-run').addEventListener('click',scrExec);
  document.getElementById('scr-save').addEventListener('click',scrSave);
  document.getElementById('scr-open').addEventListener('click',function(){ document.getElementById('scr-file').click(); });
  document.getElementById('scr-file').addEventListener('change',scrLoadFile);
  document.getElementById('scr-rec-btn').addEventListener('click',function(){ closeOv('ov-script'); if(!SCRREC.on) scrRecToggle(); });
  document.getElementById('scr-txt').addEventListener('input',scrInfo);
  document.getElementById('scr-txt').addEventListener('keydown',function(e){ if(e.key==='Tab'){ e.preventDefault(); var t=this,s=t.selectionStart; t.setRangeText(' ',s,t.selectionEnd,'end'); } if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); scrExec(); } });
  ['keydown','keyup','keypress'].forEach(function(k){ ov.addEventListener(k,function(ev){ if(ev.key!=='Escape') ev.stopPropagation(); }); });
  var sb=document.getElementById('sbar')||document.body,bd=document.createElement('span'); bd.id='scr-rec'; bd.className='scr-rec'; bd.textContent='● GRAVANDO SCRIPT — clique para concluir'; bd.style.display='none';
  bd.addEventListener('click',function(){ if(SCRREC.on) scrRecToggle(); }); sb.appendChild(bd);
});
