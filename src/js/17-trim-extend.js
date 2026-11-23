/* ═══════════════════════════════════════════════════════════════════
   v6.8 — TRIM e EXTEND no estilo do AutoCAD 2021+ (modo Rápido)
   • Todos os objetos funcionam como arestas, sem seleção prévia.
   • Clique no trecho a remover (TRIM) ou perto da ponta a prolongar (EXTEND);
     Shift+clique inverte a operação (TRIM ↔ EXTEND).
   • Arrastar = cerca à mão livre: tudo o que ela cruzar é aparado/estendido.
   • Clique em área vazia = janela "Cruzando" (dois cantos).
   • TRIM rápido: objeto sem nenhuma interseção é apagado (como no AutoCAD).
   • Pré-visualização: o trecho que sai fica vermelho; o que fica, verde.
   • Opções: aresTas (modo Padrão), Cruzando, mOdo, apagaR (TRIM), Desfazer.
   ═══════════════════════════════════════════════════════════════════ */
if(!S.teMode) S.teMode='quick';
var TE_TYPES={trim:['line','arc','circ','pl'],extend:['line','arc','pl']};

function teIsOpEnt(e,op){
  if(TE_TYPES[op].indexOf(e.tp)<0) return false;
  var ly=getLy(e.ly); return !(ly&&(!ly.vis||ly.lock));
}
function teHit(pt,op){
  for(var i=S.ents.length-1;i>=0;i--){ var e=S.ents[i]; if(teIsOpEnt(e,op)&&hitEnt(e,pt.x,pt.y)) return e; }
  return null;
}
function teBounds(tgt){
  var ds=S.ds,ids;
  if(ds&&ds.mode==='standard'&&ds.cutters&&ds.cutters.length) ids=ds.cutters.slice();
  else ids=S.ents.filter(function(e){var ly=getLy(e.ly);return !(ly&&!ly.vis);}).map(function(e){return e.id;});
  return ids.filter(function(id){return id!==tgt.id;});
}
function teHasAnyInt(tgt){
  for(var i=0;i<S.ents.length;i++){ var o=S.ents[i]; if(o===tgt) continue; var ly=getLy(o.ly); if(ly&&!ly.vis) continue;
    try{ if(entIntersect(tgt,o).length) return true; }catch(err){} }
  return false;
}
// Executa uma operação sobre um alvo (já dentro de um lote com snapshot único)
function teApplyOne(tgt,pick,op){
  if(op==='trim'){
    var r=doTrim(tgt,pick,teBounds(tgt));
    if(r) return 'trim';
    // modo Rápido: se não há trecho delimitado a remover, o objeto inteiro sai (como no AutoCAD)
    if(S.ds&&S.ds.mode==='quick'){ S.ents=S.ents.filter(function(e){return e!==tgt;}); return 'erase'; }
    return null;
  }
  if(TE_TYPES.extend.indexOf(tgt.tp)<0) return null;
  return doExtend(tgt,pick,teBounds(tgt))?'extend':null;
}
// Lote com um único passo de desfazer e mensagens resumidas
function teBatch(fn){
  var before=JSON.stringify(S.ents);
  snapshot();
  var s0=snapshot,l0=log,r0=renderAll,res;
  snapshot=function(){}; log=function(){}; renderAll=function(){};
  try{ res=fn(); } finally { snapshot=s0; log=l0; renderAll=r0; }
  if(JSON.stringify(S.ents)===before){ S.undos.pop(); return {changed:false,res:res}; }
  if(S.ds) S.ds.done=(S.ds.done||0)+1;
  return {changed:true,res:res};
}
// Simulação sem alterar o desenho (para a pré-visualização)
function teSimulate(tgtId,pick,op){
  var saved={ents:S.ents,snap:snapshot,lg:log,ren:renderAll,sel:S.sel,us:updStatus,ui:updSelInfo};
  var id0=_id,out=null;
  S.ents=JSON.parse(JSON.stringify(S.ents));
  snapshot=function(){}; log=function(){}; renderAll=function(){}; updStatus=function(){}; updSelInfo=function(){};
  try{ var t=findE(tgtId); if(t&&teApplyOne(t,pick,op)) out=S.ents; }catch(err){ out=null; }
  finally{ S.ents=saved.ents; snapshot=saved.snap; log=saved.lg; renderAll=saved.ren; S.sel=saved.sel; updStatus=saved.us; updSelInfo=saved.ui; _id=id0; }
  return out;
}
// ── fluxo do comando ───────────────────────────────────────────────────────
function tePrompt(){
  var ds=S.ds; if(!ds) return;
  var T=ds.cmd==='trim';
  var txt={
    main:T?'TRIM Selecione o objeto a aparar ou Shift+seleção para estender ou [aresTas de corte/Cruzando/mOdo/apagaR/Desfazer]:'
          :'EXTEND Selecione o objeto a estender ou Shift+seleção para aparar ou [aresTas de contorno/Cruzando/mOdo/Desfazer]:',
    edges:T?'Selecione as arestas de corte <todos os objetos>:':'Selecione as arestas de contorno <todos os objetos>:',
    crossing:'Especifique o canto oposto:',
    crossing1:'Especifique o primeiro canto:',
    mode:'Modo [Rápido/Padrão] <'+(ds.mode==='quick'?'Rápido':'Padrão')+'>:',
    erase:'Selecione os objetos a apagar (Enter para voltar):'}[ds.phase];
  logp(txt);
}
function teStart(cmd){
  S.ds={cmd:cmd,phase:S.teMode==='standard'?'edges':'main',mode:S.teMode,cutters:[],done:0};
  log('Configurações atuais: Modo = '+(S.teMode==='quick'?'Rápido (todos os objetos são arestas)':'Padrão')+'.','inf');
  tePrompt(); renderAll();
}
function teOp(){ var T=S.ds.cmd==='trim'; return (T!==!!S.shiftDown)?'trim':'extend'; }
function teClick(pt){
  var ds=S.ds; if(!ds){ teStart(S.tool); return; }
  if(ds.phase==='edges'){
    var h=null; for(var i=S.ents.length-1;i>=0;i--){ if(hitEnt(S.ents[i],pt.x,pt.y)){h=S.ents[i];break;} }
    if(!h){ log('Nenhum objeto no ponto. Enter usa todos os objetos.','inf'); return; }
    var k=ds.cutters.indexOf(h.id); if(k<0) ds.cutters.push(h.id); else ds.cutters.splice(k,1);
    S.sel=ds.cutters.slice(); log((ds.cmd==='trim'?'Arestas de corte: ':'Arestas de contorno: ')+ds.cutters.length,'inf'); renderAll(); return;
  }
  if(ds.phase==='erase'){
    var he=null; for(var j=S.ents.length-1;j>=0;j--){ if(hitEnt(S.ents[j],pt.x,pt.y)){he=S.ents[j];break;} }
    if(he){ snapshot(); S.ents=S.ents.filter(function(e){return e!==he;}); ds.done++; log('Objeto apagado.','ok'); renderAll(); }
    return;
  }
  if(ds.phase==='crossing1'){ ds.c1={x:pt.x,y:pt.y}; ds.phase='crossing'; tePrompt(); return; }
  if(ds.phase==='crossing'){ teCrossing(ds.c1,pt); ds.c1=null; ds.phase='main'; tePrompt(); renderAll(); return; }
  if(ds.phase==='mode') return;
  // fase principal
  var op=teOp(),tgt=teHit(pt,op);
  if(!tgt){ ds.c1={x:pt.x,y:pt.y}; ds.phase='crossing'; tePrompt(); return; } // área vazia → janela Cruzando
  var r=teBatch(function(){ return teApplyOne(tgt,pt,op); });
  if(r.changed) log(r.res==='erase'?'TRIM: objeto sem interseções apagado.':(op==='trim'?'Trecho removido.':'Objeto estendido.'),'ok');
  else log(op==='trim'?'Nada a aparar neste ponto.':'Nenhuma aresta de contorno na direção da ponta clicada.','inf');
  renderAll(); updSelInfo();
}
// Primeiro ponto de cruzamento de um caminho (cerca) com uma entidade
function teFenceHit(path,e){
  for(var i=1;i<path.length;i++){
    var tmp={tp:'line',x1:path[i-1].x,y1:path[i-1].y,x2:path[i].x,y2:path[i].y},pts=[];
    try{ pts=entIntersectSnap(tmp,e)||[]; }catch(err){ pts=[]; }
    if(pts.length){ var a=path[i-1]; pts.sort(function(p,q){return Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(q.x-a.x,q.y-a.y);}); return {x:pts[0].x,y:pts[0].y}; }
  }
  return null;
}
function teApplyMany(list,op){
  var n=0;
  var r=teBatch(function(){
    list.forEach(function(it){ var t=findE(it.id); if(t&&teApplyOne(t,it.pick,op)) n++; });
    return n;
  });
  log(r.changed?(n+' objeto(s) '+(op==='trim'?'aparado(s)':'estendido(s)')+'.'):'Nenhum objeto alterado.',r.changed?'ok':'inf');
  renderAll(); updSelInfo();
}
function teFence(path){
  var op=teOp(),list=[];
  S.ents.forEach(function(e){ if(!teIsOpEnt(e,op)) return; var p=teFenceHit(path,e); if(p) list.push({id:e.id,pick:p}); });
  if(!list.length){ log('A cerca não cruzou nenhum objeto.','inf'); return; }
  teApplyMany(list,op);
}
function teCrossing(a,b){
  var op=teOp(),r={x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(a.x-b.x),h:Math.abs(a.y-b.y)},list=[];
  function inR(p){return p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;}
  S.ents.forEach(function(e){
    if(!teIsOpEnt(e,op)) return; var pick=null;
    if(e.tp==='line'){ var c=clipSegRect(e.x1,e.y1,e.x2,e.y2,r); if(c) pick={x:(c[0]+c[2])/2,y:(c[1]+c[3])/2}; }
    else if(e.tp==='pl'){ for(var i=1;i<e.pts.length&&!pick;i++){ var c2=clipSegRect(e.pts[i-1].x,e.pts[i-1].y,e.pts[i].x,e.pts[i].y,r); if(c2) pick={x:(c2[0]+c2[2])/2,y:(c2[1]+c2[3])/2}; } }
    else { var sw=e.tp==='circ'?2*Math.PI:((e.ea-e.sa)%(2*Math.PI)+2*Math.PI)%(2*Math.PI),s0=e.tp==='circ'?0:e.sa;
      for(var k=0;k<=96&&!pick;k++){ var a2=s0+sw*k/96,q={x:e.cx+e.r*Math.cos(a2),y:e.cy+e.r*Math.sin(a2)}; if(inR(q)) pick=q; } }
    if(pick) list.push({id:e.id,pick:pick});
  });
  if(!list.length){ log('A janela não cruzou nenhum objeto.','inf'); return; }
  teApplyMany(list,op);
}
// Entradas digitadas. Retorna true se consumiu.
function teInput(v){
  var ds=S.ds; if(!ds) return false;
  var u=String(v).trim().toUpperCase();
  if(ds.phase==='mode'){
    if(u==='R'||u==='RAPIDO'||u==='RÁPIDO'||u==='Q'||u==='QUICK') ds.mode='quick';
    else if(u==='P'||u==='PADRAO'||u==='PADRÃO'||u==='S'||u==='STANDARD') ds.mode='standard';
    else if(u!==''){ log('Use R (Rápido) ou P (Padrão).','er'); return true; }
    S.teMode=ds.mode; log('Modo = '+(ds.mode==='quick'?'Rápido':'Padrão'),'ok');
    ds.phase=ds.mode==='standard'?'edges':'main'; ds.cutters=[]; S.sel=[]; tePrompt(); renderAll(); return true;
  }
  if(ds.phase==='edges'){
    if(u===''){ if(!ds.cutters.length) log('Todos os objetos serão usados como arestas.','inf'); S.sel=[]; ds.phase='main'; tePrompt(); renderAll(); return true; }
    if(u==='O'||u==='MODO'||u==='MODE'){ ds.phase='mode'; tePrompt(); return true; }
    log('Selecione objetos ou pressione Enter (O = mudar o modo).','inf'); return true;
  }
  if(ds.phase==='erase'){ if(u===''){ ds.phase='main'; tePrompt(); } return true; }
  if(ds.phase==='crossing'||ds.phase==='crossing1'){ if(u===''){ ds.phase='main'; ds.c1=null; tePrompt(); renderAll(); } return true; }
  // fase principal
  if(u===''){ setTool('select'); return true; }
  if(u==='T'||u==='B'||u==='ARESTAS'){ ds.mode='standard'; S.teMode='standard'; ds.cutters=[]; ds.phase='edges'; log('Modo Padrão: selecione as arestas.','inf'); tePrompt(); return true; }
  if(u==='C'||u==='CRUZANDO'||u==='CROSSING'){ ds.phase='crossing1'; tePrompt(); return true; }
  if(u==='O'||u==='MODO'||u==='MODE'){ ds.phase='mode'; tePrompt(); return true; }
  if((u==='R'||u==='APAGAR'||u==='ERASE')&&ds.cmd==='trim'){ ds.phase='erase'; tePrompt(); return true; }
  if(u==='U'||u==='D'||u==='DESFAZER'||u==='UNDO'){
    if(ds.done>0){ undo(); ds.done--; S.ds=ds; log('Última operação desfeita.','ok'); tePrompt(); } else log('Nada para desfazer neste comando.','inf');
    return true;
  }
  log('Opção inválida.','er'); return true;
}
// ── pré-visualização ───────────────────────────────────────────────────────
var TE_CACHE={key:null,res:null};
function drawTrimExtPreview(ctx,hp){
  var ds=S.ds; if(!ds) return;
  ctx.save(); ctx.setLineDash([]);
  if(ds.phase==='edges'&&ds.cutters.length){ ds.cutters.forEach(function(id){var e=findE(id);if(e){ctx.strokeStyle='#f5a623';ctx.lineWidth=2;drawE(ctx,e,false);}}); }
  if(ds.phase==='crossing'&&ds.c1){
    var a=w2s(ds.c1.x,ds.c1.y),b=w2s(hp.x,hp.y);
    ctx.setLineDash([5,4]); ctx.strokeStyle='#4ec87a'; ctx.fillStyle='rgba(78,200,122,.08)'; ctx.lineWidth=1;
    ctx.fillRect(Math.min(a.x,b.x),Math.min(a.y,b.y),Math.abs(a.x-b.x),Math.abs(a.y-b.y)); ctx.strokeRect(Math.min(a.x,b.x),Math.min(a.y,b.y),Math.abs(a.x-b.x),Math.abs(a.y-b.y));
  }
  if(S.teFence&&S.teFence.moved){
    ctx.setLineDash([4,3]); ctx.strokeStyle='#4ec87a'; ctx.lineWidth=1.5; ctx.beginPath();
    S.teFence.path.forEach(function(p,i){var q=w2s(p.x,p.y);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);}); ctx.stroke();
  }
  if(ds.phase==='main'&&!(S.teFence&&S.teFence.moved)){
    var op=teOp(),t=teHit(hp,op);
    if(t){
      var key=t.id+'|'+op+'|'+Math.round(hp.x*S.vp.sc/3)+','+Math.round(hp.y*S.vp.sc/3)+'|'+S.ents.length+'|'+(S.undos.length);
      if(TE_CACHE.key!==key){ TE_CACHE.key=key; TE_CACHE.res=teSimulate(t.id,{x:hp.x,y:hp.y},op); }
      var res=TE_CACHE.res,orig2={}; S.ents.forEach(function(e){orig2[e.id]=1;});
      if(res){
        var orig={}; S.ents.forEach(function(e){orig[e.id]=1;});
        var tr=JSON.parse(JSON.stringify(t)); tr.col='#e85050'; tr.lw=3; tr.ld='solid'; ctx.globalAlpha=.9; drawE(ctx,tr,false);
        ctx.globalAlpha=1; ctx.strokeStyle='#4ec87a'; ctx.lineWidth=2;
        res.forEach(function(e){ if(e.id===t.id||!orig[e.id]){ var e2=JSON.parse(JSON.stringify(e)); e2.col='#4ec87a'; e2.lw=2; e2.ld='solid'; drawE(ctx,e2,false); } });
      }
      var sp=w2s(hp.x,hp.y); ctx.fillStyle=res?'#4ec87a':'#8a94a8'; ctx.font='bold 10px Consolas';
      var kept=res?res.filter(function(e){return e.id===t.id||!orig2[e.id];}).length:0;
      ctx.fillText(res?(op==='trim'?(kept?'aparar':'apagar objeto'):'estender'):(op==='trim'?'sem corte':'sem contorno'),sp.x+14,sp.y-10);
    }
  }
  ctx.restore();
}
var _setTool_v68=setTool;
setTool=function(tool){ S.teFence=null; _setTool_v68(tool); if(tool==='trim'||tool==='extend') teStart(tool); };


