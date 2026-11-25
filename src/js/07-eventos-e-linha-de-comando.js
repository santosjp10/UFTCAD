// ── EVENTS ───────────────────────────────────────────────────
function bindEv(){
  var w=S.wrap;
  w.addEventListener('mousemove',onMM);
  // mousedown no document para capturar mesmo quando input tem foco
  document.addEventListener('mousedown',onMD);
  w.addEventListener('mouseup',onMU);
  w.addEventListener('dblclick',onDbl);
  w.addEventListener('wheel',onWheel,{passive:false});
  w.addEventListener('contextmenu',function(e){e.preventDefault();cancelTool();});
  document.addEventListener('keydown',onKey);
  document.getElementById('cmdinput').addEventListener('keydown',onCmdKey);
  // Prevenir que o cmdinput roube foco do canvas durante offset pick
  document.getElementById('cmdinput').addEventListener('mousedown',function(ev){
    if(S.tool==='offset'&&S.ds&&S.ds.phase==='pick') ev.preventDefault();
  });
}
function ev2xy(e){var r=S.wrap.getBoundingClientRect();return{sx:e.clientX-r.left,sy:e.clientY-r.top};}

function onMM(e){
  S.shiftDown=!!e.shiftKey;
  if(S.teFence){ var _q=ev2xy(e),_w=s2w(_q.sx,_q.sy); if(Math.hypot(_q.sx-S.teFence.sx,_q.sy-S.teFence.sy)>5) S.teFence.moved=true;
    var _l=S.teFence.path[S.teFence.path.length-1]; if(Math.hypot(_w.x-_l.x,_w.y-_l.y)*S.vp.sc>3) S.teFence.path.push(_w); }
  var p=ev2xy(e);
  if(S.isPan){S.vp.x+=p.sx-S.panFrom.x;S.vp.y+=p.sy-S.panFrom.y;S.panFrom={x:p.sx,y:p.sy};renderAll();return;}
  // Na fase de posicionamento de cotas, usar posição raw
  var isDimPos=(S.ds&&S.ds.phase==='pos')&&
    (S.tool==='dim'||S.tool==='dimali'||S.tool==='dimr'||S.tool==='dimd'||S.tool==='dima');
  if(isDimPos){
    var rawDim=s2w(p.sx,p.sy);
    S.hover={x:rawDim.x,y:rawDim.y,st:null};
    document.getElementById('coordbox').textContent='X: '+rawDim.x.toFixed(3)+'   Y: '+rawDim.y.toFixed(3);
    drawScene();drawOver();
    return;
  }
  // No SELECT: usar doSnap para detectar pontos de snap e mostrar markers
  if(S.tool==='select'){
    if(!S.grip) S.gripHover=gripAt(p.sx,p.sy);
    S.hover=doSnap(p.sx,p.sy);
    document.getElementById('coordbox').textContent='X: '+S.hover.x.toFixed(3)+'   Y: '+S.hover.y.toFixed(3);
    // Garantir que o DI está oculto no SELECT
    if(DI.active) diHide();
    // Hover highlight: encontrar objeto sob cursor
    var raw2=s2w(p.sx,p.sy);
    var hov=null;
    for(var i=S.ents.length-1;i>=0;i--){if(hitEnt(S.ents[i],raw2.x,raw2.y)){hov=S.ents[i].id;break;}}
    if(S.hoverId!==hov){S.hoverId=hov;}
    drawScene();drawOver();
    return;
  }
  S.hover=doSnap(p.sx,p.sy);
  document.getElementById('coordbox').textContent='X: '+S.hover.x.toFixed(3)+'   Y: '+S.hover.y.toFixed(3);
  // cursor especial no offset: cell quando aguarda objeto ou lado
  if(S.tool==='offset'){
    var ph=S.ds&&S.ds.phase;
    S.wrap.style.cursor=(ph==='pick'||ph==='side')?'cell':'crosshair';
  }
  // Dynamic Input: atualizar posição e valores
  diUpdate(p.sx,p.sy);
  drawScene();drawOver();
}

function onMD(e){
  S.shiftDown=!!e.shiftKey;
  // Filtrar cliques fora do canvas — exceto offset pick e dynInput
  var inCanvas = S.wrap.contains(e.target);
  var inDI = document.getElementById('dynInput').contains(e.target);
  if(!inCanvas && !inDI && !(S.tool==='offset'&&S.ds&&S.ds.phase==='pick')) return;
  if(inDI) return; // dynInput trata seus próprios eventos

  var p=ev2xy(e);
  if(e.button===1||(e.button===0&&S.tool==='pan')){S.isPan=true;S.panFrom={x:p.sx,y:p.sy};return;}
  if(e.button!==0) return;
  // Na fase de posicionamento de cotas, usar S.hover (já é raw, sem snap de objeto)
  // Isso garante que o clique confirma EXATAMENTE o preview visível.
  var dimPosFase=(S.ds&&S.ds.phase==='pos')&&
    (S.tool==='dim'||S.tool==='dimali'||S.tool==='dimr'||S.tool==='dimd'||S.tool==='dima');
  var pt;
  if(dimPosFase && S.hover){
    pt=S.hover;  // usar posição do preview — sem snap, sem atração
  } else {
    pt=doSnap(p.sx,p.sy);
  }

  // Offset fases pick e side: clique direto no canvas, independente do foco
  if(S.tool==='offset'&&S.ds&&(S.ds.phase==='pick'||S.ds.phase==='side')){
    handleClick(pt);
    return;
  }

  if((S.tool==='trim'||S.tool==='extend')&&S.ds&&S.ds.phase==='main'&&e.button===0){ S.teFence={sx:p.sx,sy:p.sy,path:[{x:pt.x,y:pt.y}],moved:false,pt:{x:pt.x,y:pt.y}}; return; }
  if(S.tool==='select'&&S.grip){ S.gripDragFrom=null; gripCommit(pt); return; }
  if(S.tool==='select'&&!S.isWin){ var _g=gripAt(p.sx,p.sy); if(_g){ S.gripDragFrom={x:p.sx,y:p.sy}; gripStart(_g); return; } }
  if(S.tool==='select'){
    var hit=null,rawSel=s2w(p.sx,p.sy);
    for(var i=S.ents.length-1;i>=0;i--){if(hitEnt(S.ents[i],rawSel.x,rawSel.y)){hit=S.ents[i];break;}}
    if(hit){
      if(!e.shiftKey&&!e.ctrlKey) S.sel=[];
      var idx=S.sel.indexOf(hit.id);
      if(idx>=0) S.sel.splice(idx,1); else S.sel.push(hit.id);
      log('['+hit.tp+'] id:'+hit.id+' ('+S.sel.length+' sel.)','ok');
    } else {
      if(!e.shiftKey&&!e.ctrlKey) S.sel=[];
      S.isWin=true;S.winFrom={x:pt.x,y:pt.y};
    }
    renderAll();updSelInfo();return;
  }
  handleClick(pt);
  S.snapOverride=null;
}

function onMU(e){
  if(S.isPan){S.isPan=false;return;}
  if(S.teFence){ var _f=S.teFence; S.teFence=null; if(_f.moved&&_f.path.length>1) teFence(_f.path); else teClick(_f.pt); renderAll(); return; }
  if(S.grip&&S.gripDragFrom){ var _p=ev2xy(e),_d=Math.hypot(_p.sx-S.gripDragFrom.x,_p.sy-S.gripDragFrom.y); S.gripDragFrom=null; if(_d>5&&S.hover){ gripCommit(S.hover); } return; }
  if(S.isWin&&S.hover) finishWin();
}

function onDbl(e){if(S.tool==='polyline'&&S.ds&&S.ds.pts&&S.ds.pts.length>=2) finishPL();}

function onWheel(e){e.preventDefault();var p=ev2xy(e);doZoom(e.deltaY<0?1.15:.87,p.sx,p.sy);}

function finishPL(){
  S.lastTool='polyline';
  if(!S.ds||!S.ds.pts||S.ds.pts.length<2){S.ds=null;return;}
  addE({tp:'pl',pts:S.ds.pts.slice(),closed:false});
  log('Polilinha '+S.ds.pts.length+' pts','ok');S.ds=null;
}

function finishWin(){
  var ws=S.winFrom,we=S.hover,isR=we.x>ws.x;
  var x0=Math.min(ws.x,we.x),x1=Math.max(ws.x,we.x),y0=Math.min(ws.y,we.y),y1=Math.max(ws.y,we.y);
  for(var i=0;i<S.ents.length;i++){
    var e=S.ents[i],ly=getLy(e.ly);if(ly&&!ly.vis)continue;
    var bb=bbox(e);if(!bb)continue;
    var inside=bb.x>=x0&&bb.y>=y0&&(bb.x+bb.w)<=x1&&(bb.y+bb.h)<=y1;
    var touches=!(bb.x>x1||(bb.x+bb.w)<x0||bb.y>y1||(bb.y+bb.h)<y0)&&(inside||entCrossesRect(e,{x:x0,y:y0,w:x1-x0,h:y1-y0})); // v7.2
    if((isR?inside:touches)&&S.sel.indexOf(e.id)<0) S.sel.push(e.id);
  }
  S.isWin=false;S.winFrom=null;
  log('Seleção: '+S.sel.length+' obj.','ok');renderAll();updSelInfo();
}

// Finaliza o comando LINE (Enter ou Esc): mantém segmentos, volta ao SELECT
function finishLine(){
  if(S.tool!=='line') return;
  var ns=S.ds?S.ds.segs||0:0;
  if(ns>0) log('LINE: '+ns+' segmento(s) criado(s).','ok');
  S.lastTool='line'; // registrar para repetição com Enter
  S.ds=null;
  diHide();
  S.tool='select';
  document.querySelectorAll('.rb').forEach(function(b){b.classList.remove('on');});
  var rb=document.getElementById('rb-select');if(rb)rb.classList.add('on');
  document.getElementById('stool').textContent='SELECT';
  S.wrap.style.cursor='default';
  renderAll();
  logp('SELECT: clique para selecionar.');
}

function isTypingTarget(el){
  return !!el && (el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.tagName==='SELECT'||el.isContentEditable);
}
function onKey(e){
  var ci=document.getElementById('cmdinput');
  var activeEl=document.activeElement;
  var inDI=DI.el&&DI.el.contains(activeEl);
  // v6.5: com a tela de abertura visível, as teclas ficam com os botões dela
  var _ss=document.getElementById('startscr'); if(_ss&&_ss.style.display!=='none') return;
  // v6.1: digitação em diálogos/painéis (texto, camadas, cotas...) não dispara atalhos
  if(activeEl!==ci && !inDI && isTypingTarget(activeEl)) return;
  // v6.1: com um diálogo aberto, ignorar atalhos do desenho (exceto Esc fecha o diálogo)
  var openOv=document.querySelector('.ov.show');
  if(openOv){ if(e.key==='Escape'){ openOv.classList.remove('show'); if(S.tool==='text') S.ds=null; } return; }
  // v6.1: Espaço = Enter fora de campos de texto (padrão AutoCAD)
  if(e.key===' ' && activeEl!==ci && !inDI){ e.preventDefault(); return onKey({key:'Enter',preventDefault:function(){},stopPropagation:function(){},ctrlKey:false,altKey:false,shiftKey:false}); }
  // v6.7: durante o FILLET as letras vão para a linha de comando (opções R, T, M, P, U), como no AutoCAD
  // v7.0: como no AutoCAD, toda digitação vai para a linha de comando (comandos e opções executam com Enter/Espaço)
  if(activeEl!==ci&&e.key&&e.key.length===1&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!(DI.active&&diShouldShow()&&/[0-9.,@<\-]/.test(e.key))){ e.preventDefault(); ci.value+=e.key; ci.focus(); return; }

  // Se o DI está visível e o foco NÃO está num campo do DI nem no cmdinput:
  // capturar digitação e redirecionar para o campo ativo do DI
  if(DI.active && activeEl!==ci && !inDI && !e.ctrlKey && !e.altKey && !e.metaKey){
    var k2=e.key;
    // @ e < iniciam notação de coordenada AutoCAD (@dx,dy ou @dist<ang)
    // Devem sempre ir para o cmdinput, não para o DI
    if(k2==='@'||k2==='<'){
      e.preventDefault();
      ci.value=k2;
      ci.focus();
      ci.setSelectionRange(1,1);
      return;
    }
    // Teclas numéricas simples → redirecionar para campo ativo do DI
    // Excluir @ e < pois pertencem ao cmdinput (coordenadas relativas)
    var isTypeable=(k2.length===1&&/[0-9.\-]/.test(k2));
    if(isTypeable){
      e.preventDefault();
      // Campo padrão: se há base → L (distância); senão → X
      // Se o focusField já está definido e é válido, manter
      var hasBase2=!!DI.base;
      var defaultField=hasBase2?'d':'x';
      var targetField=DI.focusField||defaultField;
      // Garantir que campo é coerente com o estado
      if(hasBase2&&(targetField==='x'||targetField==='y')) targetField='d';
      if(!hasBase2&&(targetField==='d'||targetField==='a')) targetField='x';
      var inp=document.getElementById('di-'+targetField);
      if(inp){
        inp.value=k2;
        inp.focus();
        inp.setSelectionRange(1,1);
        DI.focusField=targetField;
        DI.mode=(targetField==='x'||targetField==='y')?'xy':'da';
        diHighlight();
        return;
      }
    }
    // Tab: alternar campo do DI
    if(k2==='Tab'){
      e.preventDefault();
      var order=['x','y','d','a'];
      var idx=order.indexOf(DI.focusField||'x');
      var next=order[(idx+1)%order.length];
      DI.focusField=next;
      var inp2=document.getElementById('di-'+next);
      if(inp2){inp2.focus();inp2.select();}
      if(next==='x'||next==='y') DI.mode='xy'; else DI.mode='da';
      diHighlight();
      return;
    }
  }

  if(activeEl===ci) return;
  var k=e.key;
  if(k==='Escape'){
    if(S.grip){ gripEnd(); return; }
    if(S.tool==='line'&&S.ds){
      // Esc = finalizar LINE mantendo segmentos criados → volta SELECT (padrão AutoCAD)
      finishLine();
    }
    else if(S.tool==='offset'){
      if(S.ds&&S.ds.phase==='side'){
        S.ds.phase='pick';S.ds.base=null;
        logp('OFFSET d='+S.ds.dist.toFixed(2)+'mm: selecione o objeto (Esc=sair):');
        renderAll();
      } else {
        S.ds=null;
        document.getElementById('cmdinput').removeAttribute('tabindex');
        diHide();
        S.tool='select';
        document.querySelectorAll('.rb').forEach(function(b){b.classList.remove('on');});
        var rbSel2=document.getElementById('rb-select');if(rbSel2)rbSel2.classList.add('on');
        document.getElementById('stool').textContent='SELECT';
        S.wrap.style.cursor='default';
        renderAll();updSelInfo();
      }
    }
    else if(S.tool==='select'){
      // Esc no modo select: limpar seleção
      S.sel=[];S.ds=null;S.isWin=false;S.winFrom=null;
      renderAll();updSelInfo();
    }
    else {
      // Qualquer outra ferramenta: voltar ao SELECT preservando a seleção atual
      var savedSel=S.sel.slice();
      DI.active=false;diHide();
      cancelTool();
      S.sel=savedSel;
      renderAll();updSelInfo();
    }
    return;
  }
  if(k==='Delete'||k==='Backspace'){delSel();return;}
  if(e.ctrlKey&&k==='z'){e.preventDefault();undo();return;}
  if(e.ctrlKey&&(k==='y'||k==='Y')){e.preventDefault();redo();return;}
  if(e.ctrlKey&&k==='a'){e.preventDefault();selAll();return;}
  if(e.ctrlKey&&k==='s'){e.preventDefault();if(e.shiftKey)saveCmd();else qsaveCmd();return;} // v8.9: Ctrl+S regrava; Ctrl+Shift+S = Salvar como
  if(e.ctrlKey&&k==='n'){e.preventDefault();tplOpen();return;} // v8.12: biblioteca de modelos
  if(k==='F3'){e.preventDefault();toggleMode('osnap');return;}
  if(e.ctrlKey&&(k==='0'||e.code==='Digit0'||e.code==='Numpad0')){e.preventDefault();toggleCleanScreen();return;}
  if(k==='F7'){toggleMode('grid');return;}
  if(k==='F8'){toggleMode('ortho');return;}
  if(k==='F9'){toggleMode('snap');return;}
  if(k==='Enter'&&S.grip){ e.preventDefault(); gripCycle(); return; }
  if(k==='Enter'&&S.tool==='fillet'&&S.ds){ e.preventDefault(); filletInput(''); return; }
  if(k==='Enter'&&(S.tool==='trim'||S.tool==='extend')&&S.ds){ e.preventDefault(); teInput(''); return; }
  if(k==='Enter'&&ncIs(S.tool)&&S.ds){ e.preventDefault(); ncInput(''); return; }
  if(k==='Enter'){
    e.preventDefault();e.stopPropagation();
    // ── Padrão AutoCAD: Enter finaliza comando ativo;
    //    em SELECT (sem comando ativo) repete o último comando.
    var _activeTool=S.tool;
    if(_activeTool==='line'){
      finishLine(); // finishLine já seta lastTool e volta a SELECT
    }
    else if(_activeTool==='polyline'&&S.ds) finishPL();
    else if(_activeTool==='spline'&&S.ds){finishSpline();}
    else if(_activeTool==='area'&&S.ds&&S.ds.pts&&S.ds.pts.length>=3){
      var pts=S.ds.pts, n=pts.length, areaVal=0;
      for(var i=0;i<n;i++){var j=(i+1)%n;areaVal+=pts[i].x*pts[j].y;areaVal-=pts[j].x*pts[i].y;}
      areaVal=Math.abs(areaVal)/2;
      var perimeter=0;for(var i=0;i<n;i++){var j=(i+1)%n;perimeter+=Math.hypot(pts[j].x-pts[i].x,pts[j].y-pts[i].y);}
      log('ÁREA: '+areaVal.toFixed(4)+' mm²  ('+( areaVal/1000000).toFixed(6)+' m²)','ok');
      log('PERÍMETRO: '+perimeter.toFixed(4)+'mm','ok');
      S.ds=null; logp('ÁREA: 1º ponto:');
    }
    else if(_activeTool==='copy'&&S.ds){
      var nc=S.ds.copies||0;
      if(nc>0) log('COPY: '+nc+' cópia(s) criada(s).','ok');
      S.ds=null;renderAll(); logp('COPY: clique no objeto a copiar:');
    }
    else if(_activeTool==='offset'&&S.ds){
      if(S.ds.phase==='side'){
        S.ds.phase='pick';S.ds.base=null;
        logp('OFFSET d='+S.ds.dist.toFixed(2)+'mm: selecione o objeto:');renderAll();
      } else {
        S.ds=null; S.wrap.style.cursor='crosshair';
        var ci=document.getElementById('cmdinput');
        ci.removeAttribute('tabindex');ci.focus();
        logp('OFFSET: informe a nova distância:');
      }
    } else if(_activeTool==='trim'){
      if(!S.ds||S.ds.phase==='cut'){
        var visIds=S.ents.filter(function(e){var ly=getLy(e.ly);return ly&&ly.vis;}).map(function(e){return e.id;});
        var cutters=(S.ds&&S.ds.cutters&&S.ds.cutters.length)?S.ds.cutters:visIds;
        var allMode=cutters.length===visIds.length;
        S.ds={phase:'trim',cutters:cutters,allMode:allMode};
        S.sel=[];
        log('TRIM: '+(allMode?'todos os objetos como borda':cutters.length+' borda(s) selecionada(s)'),'ok');
        logp('TRIM: clique no trecho a remover (Enter=reselecionar bordas, Esc=sair):');
        renderAll();
      } else if(S.ds.phase==='trim'){
        S.ds=null;S.sel=[];
        logp('TRIM: selecione bordas ou Enter para usar todos:');
        renderAll();
      }
    } else if(_activeTool==='extend'){
      if(!S.ds||S.ds.phase==='bnd'){
        var visIds=S.ents.filter(function(e){var ly=getLy(e.ly);return ly&&ly.vis;}).map(function(e){return e.id;});
        var bounds=(S.ds&&S.ds.bounds&&S.ds.bounds.length)?S.ds.bounds:visIds;
        var allMode=bounds.length===visIds.length&&(!S.ds||!S.ds.bounds||!S.ds.bounds.length);
        S.ds={phase:'ext',bounds:bounds,allMode:allMode};
        S.sel=[];
        log('EXTEND: '+(allMode?'todos os objetos como limite':bounds.length+' limite(s) selecionado(s)'),'ok');
        logp('EXTEND: clique na extremidade a estender (Enter=reselecionar limites, Esc=sair):');
        renderAll();
      } else if(S.ds.phase==='ext'){
        S.ds=null;S.sel=[];
        logp('EXTEND: selecione limites ou Enter para usar todos:');
        renderAll();
      }
    } else if(_activeTool==='select'||_activeTool==='pan'){
      // SELECT com Enter: repetir último comando (padrão AutoCAD)
      if(S.lastTool){
        var _lt=S.lastTool;
        log('Repetindo: '+_lt.toUpperCase(),'inf');
        setTool(_lt);
      } else {
        document.getElementById('cmdinput').focus();
      }
    } else {
      document.getElementById('cmdinput').focus();
    }
    return;
  }
  if(k==='+'||k==='='){doZoom(1.2);return;}
  if(k==='-'){doZoom(.83);return;}
  // C = fechar linha (voltar ao 1º ponto) quando LINE ativo com ≥2 segmentos
  if((k==='c'||k==='C')&&!e.ctrlKey&&!e.altKey&&S.tool==='line'&&S.ds&&S.ds.segs>=1&&S.ds.firstPt){
    var lp2=S.ds.pts[S.ds.pts.length-1];
    var fp=S.ds.firstPt;
    var ld2=Math.hypot(fp.x-lp2.x,fp.y-lp2.y);
    if(ld2>0.001){
      addE({tp:'line',x1:lp2.x,y1:lp2.y,x2:fp.x,y2:fp.y});
      log('LINE: fechado com '+( (S.ds.segs||0)+1)+' segmentos.','ok');
    }
    finishLine();
    return;
  }
  // U = desfazer último segmento da cadeia LINE ativa
  if((k==='u'||k==='U')&&!e.ctrlKey&&!e.altKey&&S.tool==='line'&&S.ds&&S.ds.segs>=1){
    undo();
    // restaurar ds apontando para o ponto anterior
    // após undo, o último ent criado foi removido; precisamos retomar do ponto anterior
    // Encontrar o último segmento da cadeia (se houver)
    var hist2=S.ds.hist||[],fp2=S.ds.firstPt;
    var lastLinePt=hist2.length?hist2.pop():fp2;
    S.ds={pts:[lastLinePt],segs:(S.ds.segs||1)-1,firstPt:fp2,hist:hist2};
    log('LINE: último segmento desfeito.','inf');
    logp('Próximo ponto ('+S.ds.segs+' seg):');
    renderAll();return;
  }
}

function onCmdKey(e){
  e.stopPropagation();
  // v7.0: Espaço = Enter na linha de comando (exceto para digitar "ZOOM E" etc.)
  if(e.key===' '){ var _ci=document.getElementById('cmdinput'),_v=_ci.value.trim().toUpperCase();
    if(S.ds||_v===''||(!/\s/.test(_v)&&_v!=='ZOOM'&&_v!=='Z')){ e.preventDefault(); return onCmdKey({key:'Enter',stopPropagation:function(){},preventDefault:function(){}}); } }
  if(e.key==='Escape'){
    document.getElementById('cmdinput').value='';
    if(S.grip){ gripEnd(); return; }
    if(S.tool==='line'&&S.ds){
      // Esc no LINE: finalizar mantendo segmentos → SELECT
      finishLine();
    } else if(S.tool!=='select'){
      var savedSel2=S.sel.slice();
      cancelTool();
      S.sel=savedSel2;
      renderAll();updSelInfo();
    }
    return;
  }
  if(e.key!=='Enter')return;
  e.preventDefault();
  var ci=document.getElementById('cmdinput');
  var v=ci.value.trim();
  ci.value='';
  if(S.grip){ if(trySnapOverride(v)) return; if(v) gripTyped(v); else gripCycle(); return; }
  if(S.tool==='fillet'&&S.ds&&filletInput(v)){ ci.blur(); return; }
  if((S.tool==='trim'||S.tool==='extend')&&S.ds&&teInput(v)){ ci.blur(); return; }
  if(ncIs(S.tool)&&S.ds&&ncInput(v)){ ci.blur(); return; }
  if(S.tool==='polyline'&&S.ds&&S.ds.pts&&S.ds.pts.length&&plineOption(v)){ ci.blur(); return; }
  if(v&&trySnapOverride(v)) return;

  // Enter vazio: finaliza comando ativo OU repete último comando (padrão AutoCAD)
  if(!v){
    var _ct=S.tool;
    if(_ct==='line'&&S.ds){
      // Enter dentro de LINE: finalizar e sair (padrão AutoCAD)
      finishLine();
    } else if(_ct==='polyline'&&S.ds){
      finishPL();
    } else if(_ct==='spline'&&S.ds){
      finishSpline();
    } else if(_ct==='copy'&&S.ds){
      var nc2=S.ds.copies||0;
      if(nc2>0) log('COPY: '+nc2+' cópia(s) criada(s).','ok');
      S.ds=null; renderAll();
      logp('COPY: clique no objeto a copiar:');
    } else if(_ct==='offset'&&S.ds){
      if(S.ds.phase==='side'){
        S.ds.phase='pick'; S.ds.base=null;
        logp('OFFSET d='+S.ds.dist.toFixed(2)+'mm: selecione o objeto:'); renderAll();
      } else {
        S.ds=null; S.wrap.style.cursor='crosshair';
        document.getElementById('cmdinput').removeAttribute('tabindex');
        logp('OFFSET: informe a nova distância (ou Esc para sair):');
      }
    } else if(_ct==='area'&&S.ds&&S.ds.pts&&S.ds.pts.length>=3){
      var pts2=S.ds.pts,n2=pts2.length,areaVal2=0;
      for(var i2=0;i2<n2;i2++){var j2=(i2+1)%n2;areaVal2+=pts2[i2].x*pts2[j2].y;areaVal2-=pts2[j2].x*pts2[i2].y;}
      areaVal2=Math.abs(areaVal2)/2;
      var peri2=0;for(var i2=0;i2<n2;i2++){var j2=(i2+1)%n2;peri2+=Math.hypot(pts2[j2].x-pts2[i2].x,pts2[j2].y-pts2[i2].y);}
      log('ÁREA: '+areaVal2.toFixed(4)+' mm²  ('+(areaVal2/1000000).toFixed(6)+' m²)','ok');
      log('PERÍMETRO: '+peri2.toFixed(4)+'mm','ok');
      S.ds=null; logp('ÁREA: 1º ponto:');
    } else if(_ct==='select'||_ct==='pan'){
      // SELECT + Enter vazio: repetir último comando (padrão AutoCAD)
      if(S.lastTool){
        var _lt2=S.lastTool;
        log('Repetindo: '+_lt2.toUpperCase(),'inf');
        setTool(_lt2);
      }
      // sem lastTool: não faz nada, mantém foco no cmd input
    }
    return;
  }

  log('> '+v);

  // Offset: se aguardando distância, qualquer número inicia a fase pick
  if(S.tool==='offset'&&(!S.ds||S.ds.phase!=='pick')){
    var num=parseFloat(v);
    if(!isNaN(num)&&num>0){
      S.ds={phase:'pick',dist:num};
      log('OFFSET: distância = '+num.toFixed(2)+'mm','ok');
      logp('OFFSET d='+num.toFixed(2)+'mm: clique no objeto a deslocar (Enter=nova dist, Esc=sair):');
      // Remover foco do input e aplicar cursor; o canvas recebe cliques via listener no document
      ci.blur();
      ci.setAttribute('tabindex','-1');  // impede re-foco via clique acidental
      S.wrap.style.cursor='cell';
      return;
    } else {log('OFFSET: informe um número positivo para a distância.','er');return;}
  }

  // Tentar como coordenada primeiro (10,20 ou @5,3 ou @10<45)
  var pt=parseCoord(v);
  if(pt){handleClick(pt);ci.focus();return;}

  // Tentar como número sozinho: distância na direção do cursor
  // Suportado para LINE e demais ferramentas que têm pts
  // v8.1: CIRCLE — número digitado depois do centro é o raio (como no AutoCAD), sem depender da posição do cursor
  if(S.tool==='circle'&&S.ds&&S.ds.pts&&S.ds.pts.length===1&&/^\s*\d+([.,]\d+)?\s*$/.test(v)){
    var _r=parseFloat(v.replace(',','.')); if(_r>0){ handleClick({x:S.ds.pts[0].x+_r,y:S.ds.pts[0].y}); ci.focus(); return; } }
  if(S.tool!=='offset' && cmdRefPt()){
    var num=parseFloat(v);
    if(!isNaN(num) && num>0 && v.match(/^[\d]+\.?\d*$/)){
      var base=cmdRefPt();
      if(S.hover){
        var ddx=S.hover.x-base.x,ddy=S.hover.y-base.y,dL=Math.hypot(ddx,ddy);
        if(dL>0.0001){
          pt={x:base.x+ddx/dL*num,y:base.y+ddy/dL*num,st:null};
        } else {
          // sem direção de cursor: usar horizontal para direita
          pt={x:base.x+num,y:base.y,st:null};
        }
        log(S.tool.toUpperCase()+' → dist='+num.toFixed(2)+'mm','inf');
        handleClick(pt);ci.focus();return;
      }
    }
  }

  // C = fechar / U = desfazer último seg — quando LINE ativo
  if(S.tool==='line'&&S.ds){
    if(v.toUpperCase()==='C'&&S.ds.segs>=1&&S.ds.firstPt){
      var lp3=S.ds.pts[S.ds.pts.length-1],fp3=S.ds.firstPt;
      var ld3=Math.hypot(fp3.x-lp3.x,fp3.y-lp3.y);
      if(ld3>0.001) addE({tp:'line',x1:lp3.x,y1:lp3.y,x2:fp3.x,y2:fp3.y});
      log('LINE: fechado.','ok');
      S.ds=null;diHide();renderAll();logp('LINE: 1º ponto:');ci.focus();return;
    }
    if(v.toUpperCase()==='U'&&S.ds.segs>=1){
      undo();
      var hist4=S.ds.hist||[],fp4=S.ds.firstPt;
      var lastLP=hist4.length?hist4.pop():fp4;
      S.ds={pts:[lastLP],segs:(S.ds.segs||1)-1,firstPt:fp4,hist:hist4};
      log('LINE: último segmento desfeito.','inf');
      logp('Próximo ponto ('+S.ds.segs+' seg):');
      renderAll();ci.focus();return;
    }
  }

  // Tentar como comando
  var up=v.toUpperCase().trim(),cmd=up.split(' ')[0];
  var map={
    'L':'line','LINE':'line','C':'circle','CIRCLE':'circle','REC':'rectangle','RECT':'rectangle','RECTANG':'rectangle','R':'redraw','RE':'redraw','REDRAW':'redraw','REGEN':'redraw',
    'A':'arc','ARC':'arc','E':'erase','EL':'ellipse','ELLIPSE':'ellipse','T':'mtext','MT':'mtext','MTEXT':'mtext','DT':'text','TEXT':'text','ED':'textedit','TEXTEDIT':'textedit','DDEDIT':'textedit',
     'LE':'leader','LEADER':'leader','QLEADER':'leader','MLD':'leader','MLEADER':'leader','B':'block','BLOCK':'block','BLOCO':'block','I':'insert','INSERT':'insert','INSERIR':'insert',
     'BH':'hatch','BHATCH':'hatch','DXFIN':'dxfin','ABRIRDXF':'dxfin','IMPORTDXF':'dxfmerge','ANEXARDXF':'dxfmerge',
    'PL':'polyline','POLYLINE':'polyline','PLINE':'polyline','RECTANGLE':'rectangle','SPL':'spline','SPLINE':'spline','H':'hatch','HATCH':'hatch',
    'D':'ddim','DIM':'dim','DLI':'dim','DIMLINEAR':'dim',
    'DAL':'dimali','DIMALIGNED':'dimali',
    'DR':'dimr','DD':'dimd','DA':'dima','DRA':'dimr','DIMRADIUS':'dimr','DDI':'dimd','DIMDIAMETER':'dimd','DAN':'dima','DIMANGULAR':'dima',
    'M':'move','MOVE':'move','CO':'copy','CP':'copy','COPY':'copy',
    'RO':'rotate','ROTATE':'rotate','SC':'scale','SCALE':'scale',
    'MI':'mirror','MIRROR':'mirror','O':'offset','OFFSET':'offset',
    'TR':'trim','TRIM':'trim','EX':'extend','EXTEND':'extend',
    'POL':'polygon','POLYGON':'polygon',
    'F':'fillet','FILLET':'fillet','CHA':'chamfer','CHAMFER':'chamfer',
    'DCO':'dimcontinue','DIMCONT':'dimcontinue','DIMCONTINUE':'dimcontinue','DBA':'dimbaseline','DIMBASE':'dimbaseline','DIMBASELINE':'dimbaseline',
    'AULA':'aula','EXERCICIOS':'aula','EXERCÍCIOS':'aula',
    'PO':'point','POINT':'point','PONTO':'point','PONTOS':'pontos','IMPORTARPONTOS':'pontos','COORDENADAS':'pontos','PTS':'pontos',
    'SCRIPT':'script','SCR':'script','GRAVARSCRIPT':'scrrec','ACTRECORD':'scrrec',
    'POLIGONAL':'poligonal','POLIG':'poligonal','TRAVERSE':'poligonal',
    'ST':'style','STYLE':'style','ESTILO':'style','FONTE':'style',
    'BIBLIOTECA':'bib','BIB':'bib','BLOCKSPALETTE':'bib','TOOLPALETTES':'bib','ADCENTER':'bib',
    'MODELOS':'tpl','TEMPLATES':'tpl','NOVOMODELO':'tpl','MOLDURA':'moldura',
    'X':'explode','EXPLODE':'explode','EXPLODIR':'explode',
    'RECUPERAR':'recover','RECOVER':'recover','DRAWINGRECOVERY':'recover','SAVETIME':'savetime','LIMPARRECUPERACAO':'asclear',
    'PDF':'pdf','EXPORTPDF':'pdf','PLOT':'pagesetup','PLOTAR':'pagesetup','PAGESETUP':'pagesetup','PAGINA':'pagesetup',
    'MS':'mspace','MSPACE':'mspace','PS':'pspace','PSPACE':'pspace','MV':'mview','MVIEW':'mview','CARIMBO':'carimbo','TITLEBLOCK':'carimbo','LAYOUT':'newlayout','NOVOLAYOUT':'newlayout','MODEL':'model','MODELO':'model',
    'TELACHEIA':'fullscreen','FULLSCREEN':'fullscreen','FS':'fullscreen','LIMPA':'cleanscreen','CLEANSCREENON':'cleanscreen','CLEANSCREENOFF':'cleanscreen','INSTALAR':'install',
    'DXFOUT':'dxfout','DWGOUT':'dwgout','EXPORT':'export','EXP':'export',
    'DDIM':'ddim','DIMSTYLE':'ddim','DST':'ddim','DIMSTY':'ddim','DEMO':'demo',
    'UN':'units','UNITS':'units','DDUNITS':'units',
    'LT':'linetype','LINETYPE':'linetype','LTYPE':'linetype',
    'AR':'array','ARRAY':'array',
    'DI':'dist','DIST':'dist','DISTANCE':'dist','AA':'area','AREA':'area',
    'P':'pan','PAN':'pan','S':'stretch','STRETCH':'stretch','SELECT':'select','J':'join','JOIN':'join','UNIR':'join','PE':'pedit','PEDIT':'pedit','BR':'break','BREAK':'break','INTERROMPER':'break',
    'U':'undo','UNDO':'undo','REDO':'redo',
    'Z':'zoom','ZE':'zf','ZOOM':'zoom','ZJ':'zoomwin','ZW':'zoomwin','ZP':'zoomprev','ZA':'zoomall','ZO':'zoomobj',
    'DEL':'del','ERASE':'del',
    'ORTHO':'ortho','GRID':'grid','SNAP':'snap',
    'NEW':'new','SAVE':'save','OPEN':'open','SAVEAS':'save','SALVAR':'save','SALVARCOMO':'save','QSAVE':'qsave','EXPORTAR':'export',
    'LAYER':'ly','LA':'ly',
    'HELP':'help','?':'help',
  };
  var act=map[cmd];
  if(!act){log('Comando desconhecido: '+v+'. HELP para lista.','er');return;}
  switch(act){
    case 'line':case 'circle':case 'rectangle':case 'arc':case 'ellipse':
    case 'text':case 'polyline':case 'spline':case 'hatch':case 'dim':case 'dimali':case 'dimr':case 'dimd':case 'dima':
    case 'move':case 'copy':case 'rotate':case 'scale':case 'mirror':case 'offset':case 'erase':
    case 'trim':case 'extend':case 'fillet':case 'chamfer':
    case 'stretch':case 'join':case 'pedit':case 'break':
    case 'mtext':case 'leader':case 'block':case 'insert':case 'textedit':
      setTool(act);break;
    case 'dxfin':dxfIn(false);break;
    case 'dxfmerge':dxfIn(true);break;
    case 'polygon':startPolygon();break;
    case 'array':showArrayDlg();break;
    case 'ddim':showDimStyle();break;
    case 'dxfout':expDXF('2000');break;
    case 'fullscreen':toggleFullscreen();break;
    case 'explode':setTool('explode');break;
    case 'point':setTool('point');break;
    case 'pontos':ptOpen();break;
    case 'script':scrOpen();break;
    case 'tpl':tplOpen();break;
    case 'bib':bibOpen();break;
    case 'moldura':showTemplate();break;
    case 'style':styleOpen();break;
    case 'poligonal':poOpen();break;
    case 'scrrec':scrRecToggle();break;
    case 'aula':aulaToggle();break;
    case 'dimcontinue':case 'dimbaseline':setTool(act);break;
    case 'pdf':expPDF(false);break;
    case 'recover':asShowAll();break;
    case 'savetime':setTool('savetime');break;
    case 'asclear':asClearAll();break;
    case 'pagesetup':if(S.space==='model')switchSpace('layout');pageSetupOpen();break;
    case 'mspace':if(S.space==='model')log('MSPACE: abra um layout primeiro.','er');else mspaceEnter(curViewport());break;
    case 'pspace':mspaceExit();break;
    case 'mview':setTool('mview');break;
    case 'carimbo':titleBlockInsert();break;
    case 'newlayout':layoutNew();break;
    case 'model':switchSpace('model');break;
    case 'cleanscreen':toggleCleanScreen();break;
    case 'install':appInstall();break;
    case 'dwgout':expDWG();break;
    case 'export':showExport();break;
    case 'demo':if(S.ents.length&&!confirm('Carregar o desenho de exemplo substitui o desenho atual. Continuar?'))break;loadDemo();updLayerUI();break;
    case 'linetype':showLineType();break;
    case 'units':showUnits();break;
    case 'dist':setTool('dist');break;
    case 'area':setTool('area');break;
    case 'pan':setTool('pan');break;
    case 'select':setTool('select');break;
    case 'undo':undo();break;
    case 'redo':redo();break;
    case 'del':setTool('erase');break;
    case 'redraw':renderAll();log('REDRAW: tela redesenhada.','inf');break;
    case 'zf':zoomFit();break;
    case 'zoom':{var zv=v.trim().split(/\s+/).slice(1).join(' ');zoomCmd(zv);}break;
    case 'zoomwin':zoomCmd('J');break;
    case 'zoomprev':zoomCmd('P');break;
    case 'zoomall':zoomCmd('T');break;
    case 'zoomobj':zoomCmd('O');break;
    case 'ortho':toggleMode('ortho');break;
    case 'grid':toggleMode('grid');break;
    case 'snap':toggleMode('snap');break;
    case 'new':tplOpen();break;
    case 'save':saveCmd();break;
    case 'qsave':qsaveCmd();break;
    case 'open':openDoc();break;
    case 'ly':showAddLayer();break;
    case 'help':
      log('═══ COMANDOS EduCAD v8.13 — digite e confirme com Enter ou Espaço ═══','inf');
      log('DESENHO: L=Linha  PL=Polilinha  REC=Retângulo  C=Círculo  A=Arco  EL=Elipse  POL=Polígono  SPL=Spline  H=Hachura','inf');
      log('PONTOS: PO=Ponto  PONTOS=Importar tabela de coordenadas (Excel/CSV)  |  durante PL/L/SPL, cole uma lista de coordenadas na linha de comando','inf');
      log('SCRIPTS: SCRIPT=Executar/editar .scr  GRAVARSCRIPT=Gravar  #SET #FOR #REPEAT #IF #END {expressão}  |  sem janela: -LAYER  -TEXT  -POLYGON  ZOOM E  |  variáveis: OSMODE ORTHOMODE CLAYER TEXTSIZE HPNAME HPSCALE HPANG','inf');
      log('TOPOGRAFIA: POLIGONAL=Cálculo de poligonal (caderneta, erros, compensação, área)  |  @dist<AZ96d56\'30" (azimute)  @dist<N45d30\'E (rumo)','inf');
      log('TEXTO: T ou MT=Texto múltiplo  DT=Texto de uma linha  ED=Editar texto  LE=Linha de chamada','inf');
      log('  ST ou ESTILO = fonte padrão dos textos (Arial, Times, ISOCPEUR, romans.shx…); a fonte de cada texto se escolhe no editor ou nas propriedades','inf');
      log('COTAS: DLI=Linear  DAL=Alinhada  DCO=Em série (contínua)  DBA=De base  DRA=Raio  DDI=Diâmetro  DAN=Angular  |  D ou DDIM=Estilos de cota','inf');
      log('  Na cota linear ou alinhada, depois dos 2 pontos: clique a posição ou digite a distância da linha de cota ao 2º ponto (ex.: 10; H ou V fixam o sentido)','inf');
      log('MODIFICAR: E=Apagar  M=Mover  CO=Copiar  RO=Rotacionar  SC=Escalar  MI=Espelhar  O=Offset  AR=Array','inf');
      log('  TR=Trim  EX=Extend  F=Fillet  CHA=Chamfer  S=Stretch  BR=Break  J=Join  PE=Editar polilinha  X=Explodir','inf');
      log('BLOCOS: B=Criar bloco  I=Inserir bloco','inf');
      log('MEDIR: DI=Distância  AA=Área  |  NAVEGAR: P=Pan  R ou RE=Redesenhar','inf');
      log('ZOOM: Z=Zoom [Tudo/Centro/Extensão/Anterior/Escala/Janela/Objeto, nX, 1/50XP]  ZE=Extensão  ZJ=Janela  ZP=Anterior  ZA=Tudo  ZO=Objeto  |  duplo clique no botão do meio = Extensão','inf');
      log('LAYOUT: MV=Viewports  MS/PS=Entrar/sair da viewport  CARIMBO  LAYOUT=Novo layout  PAGESETUP ou PLOT  PDF','inf');
      log('ARQUIVO: NEW  OPEN  SAVE (nome, formato e pasta)  QSAVE/Ctrl+S (regrava)  EXPORT  DXFIN  IMPORTDXF  RECUPERAR  SAVETIME  LIMPARRECUPERACAO','inf');
      log('  NEW/Ctrl+N = Novo com modelo: Padrão, Mecânico, Arquitetônico ou Topográfico (e Meus modelos)','inf');
      log('  BIBLIOTECA/Ctrl+3 = Biblioteca de blocos (portas, janelas, louças, móveis, marcos, postes, drenagem, vegetação…)','inf');
      log('CONFIG: UN=Unidades  LT=Tipos de linha  LA=Camadas  TELACHEIA  LIMPA (Ctrl+0)  INSTALAR  DEMO=Exemplo','inf');
      log('ENSINO: AULA = exercícios guiados com verificação automática (aba Educacional)','inf');
      log('PRECISÃO: F3=OSNAP  F7=Grade  F8=Ortho  F9=Snap  |  durante um comando: END MID CEN INT QUA PER TAN NEA NON','inf');
      log('COORDENADAS: 10,20  @5,3  @10<45  ou só a distância na direção do cursor','inf');
      log('Opções dos comandos aparecem entre [ ] — digite a letra maiúscula. Enter repete o último comando; Esc cancela; Ctrl+Z/Ctrl+Y desfaz/refaz.','inf');
      log('════════════════════════════════════════════════════════','inf');
      break;
  }
}

// ── COMMAND PROCESSOR (integrado no onCmdKey acima) ──────────

// v6.1: ponto de referência do comando ativo (último ponto, ponto base do COPY, centro do POLYGON...)
function cmdRefPt(){
  if(!S.ds) return null;
  if(S.ds.pts&&S.ds.pts.length) return S.ds.pts[S.ds.pts.length-1];
  if(S.ds.base&&S.ds.phase==='dest') return S.ds.base;
  if(S.ds.center) return S.ds.center;
  if(S.ds.p1) return S.ds.p1;
  return null;
}
function parseCoord(raw){
  var base=cmdRefPt()||S.hover||{x:0,y:0};
  // polar @D<A
  var m=raw.match(/^@?(-?\d+\.?\d*)<(-?\d+\.?\d*)$/);
  if(m){var d=parseFloat(m[1]),a=parseFloat(m[2])*Math.PI/180,rel=raw[0]==='@';return rel?{x:base.x+d*Math.cos(a),y:base.y+d*Math.sin(a),st:null}:{x:d*Math.cos(a),y:d*Math.sin(a),st:null};}
  // cartesian @?X,Y
  m=raw.match(/^(@?)(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
  if(m){var rel=m[1]==='@',x=parseFloat(m[2]),y=parseFloat(m[3]);return rel?{x:base.x+x,y:base.y+y,st:null}:{x:x,y:y,st:null};}
  return null;
}

