/* ═══════════════════════════════════════════════════════════════════
   v6.7 — FILLET (CONCORDÂNCIA) NO ESTILO AUTOCAD
   Sequência: "Selecione o primeiro objeto ou [Desfazer/Polilinha/Raio/Aparar/Múltiplo]"
   → "Selecione o segundo objeto ou Shift+clique para canto vivo ou [Raio]".
   Objetos: linhas, arcos, círculos e segmentos de polilinhas e retângulos,
   em qualquer combinação. Pré-visualização ao passar sobre o 2º objeto,
   raio e modo de aparar persistentes, linhas paralelas (semicírculo),
   raio 0 (canto vivo), opção Polilinha (todos os vértices) e Múltiplo.
   ═══════════════════════════════════════════════════════════════════ */
if(S.filletR===undefined) S.filletR=5;
if(S.filletTrim===undefined) S.filletTrim=true;
var FIL_TYPES=['line','arc','circ','pl','rect'];

// Segmentos retos de polilinha/retângulo (mesma ordem usada no EXPLODE)
function plSegList(e){
  var P;
  if(e.tp==='rect') P=[{x:e.x,y:e.y},{x:e.x+e.w,y:e.y},{x:e.x+e.w,y:e.y+e.h},{x:e.x,y:e.y+e.h},{x:e.x,y:e.y}];
  else { P=e.pts.slice(); if(e.closed&&P.length>2&&Math.hypot(P[0].x-P[P.length-1].x,P[0].y-P[P.length-1].y)>1e-9) P.push({x:P[0].x,y:P[0].y}); }
  var o=[]; for(var i=1;i<P.length;i++){ if(Math.hypot(P[i].x-P[i-1].x,P[i].y-P[i-1].y)>1e-9) o.push({x1:P[i-1].x,y1:P[i-1].y,x2:P[i].x,y2:P[i].y}); }
  return o;
}
function explodeToLines(e){
  return plSegList(e).map(function(s){ return {id:uid(),tp:'line',x1:s.x1,y1:s.y1,x2:s.x2,y2:s.y2,ly:e.ly,col:e.col,lw:e.lw,ld:e.ld}; });
}
// EXPLODE (X): polilinhas e retângulos → linhas
function explodeSel(){
  var ids=S.sel.slice(); if(!ids.length){ log('EXPLODE: selecione polilinhas ou retângulos e digite X.','inf'); return; }
  var n=0,out=[]; snapshot();
  S.ents=S.ents.filter(function(e){
    if(ids.indexOf(e.id)>=0&&(e.tp==='pl'||e.tp==='rect')){ var L=explodeToLines(e); out=out.concat(L); n++; return false; }
    return true;
  });
  if(!n){ S.undos.pop(); log('EXPLODE: nenhum objeto explodível na seleção (polilinha ou retângulo).','inf'); return; }
  S.ents=S.ents.concat(out); S.sel=out.map(function(e){return e.id;});
  log('EXPLODE: '+n+' objeto(s) convertido(s) em '+out.length+' linha(s).','ok'); renderAll(); updSelInfo();
}

// ── seleção de objeto para o FILLET ─────────────────────────────────────────
function filletHit(pt){
  for(var i=S.ents.length-1;i>=0;i--){
    var e=S.ents[i]; if(FIL_TYPES.indexOf(e.tp)<0) continue;
    var ly=getLy(e.ly); if(ly&&(!ly.vis||ly.lock)) continue;
    if(!hitEnt(e,pt.x,pt.y)) continue;
    var h={e:e,seg:null,pick:{x:pt.x,y:pt.y}};
    if(e.tp==='pl'||e.tp==='rect'){
      var S2=plSegList(e),bi=-1,bd=1e18;
      S2.forEach(function(s,k){var d=segD(pt.x,pt.y,s.x1,s.y1,s.x2,s.y2);if(d<bd){bd=d;bi=k;}});
      if(bi<0) continue; h.seg=bi; h.curve={kind:'line',x1:S2[bi].x1,y1:S2[bi].y1,x2:S2[bi].x2,y2:S2[bi].y2};
    } else if(e.tp==='line') h.curve={kind:'line',x1:e.x1,y1:e.y1,x2:e.x2,y2:e.y2};
    else h.curve={kind:'circ',cx:e.cx,cy:e.cy,r:e.r,arc:e.tp==='arc'?{sa:e.sa,ea:e.ea}:null};
    return h;
  }
  return null;
}
// ── geometria ──────────────────────────────────────────────────────────────
function _lineUnit(c){var dx=c.x2-c.x1,dy=c.y2-c.y1,l=Math.hypot(dx,dy);return {ux:dx/l,uy:dy/l,nx:-dy/l,ny:dx/l,l:l};}
function _lcInt(L,cx,cy,r){
  var u=_lineUnit(L),fx=L.x1-cx,fy=L.y1-cy,b=fx*u.ux+fy*u.uy,c=fx*fx+fy*fy-r*r,disc=b*b-c;
  if(disc<-1e-12) return []; disc=Math.sqrt(Math.max(0,disc));
  return [-b-disc,-b+disc].map(function(t){return {x:L.x1+u.ux*t,y:L.y1+u.uy*t};});
}
function _ccInt(x1,y1,r1,x2,y2,r2){
  var d=Math.hypot(x2-x1,y2-y1); if(d<1e-12||d>r1+r2+1e-9||d<Math.abs(r1-r2)-1e-9) return [];
  var a=(r1*r1-r2*r2+d*d)/(2*d),h=Math.sqrt(Math.max(0,r1*r1-a*a)),mx=x1+a*(x2-x1)/d,my=y1+a*(y2-y1)/d;
  return [{x:mx+h*(y2-y1)/d,y:my-h*(x2-x1)/d},{x:mx-h*(y2-y1)/d,y:my+h*(x2-x1)/d}];
}
function _curveInt(a,b){
  if(a.kind==='line'&&b.kind==='line'){var r=lineLineInt(a.x1,a.y1,a.x2,a.y2,b.x1,b.y1,b.x2,b.y2);return r?[{x:r.x,y:r.y}]:[];}
  if(a.kind==='line') return _lcInt(a,b.cx,b.cy,b.r);
  if(b.kind==='line') return _lcInt(b,a.cx,a.cy,a.r);
  return _ccInt(a.cx,a.cy,a.r,b.cx,b.cy,b.r);
}
function _offsets(c,R){
  if(c.kind==='line'){var u=_lineUnit(c);return [1,-1].map(function(s){return {kind:'line',x1:c.x1+u.nx*R*s,y1:c.y1+u.ny*R*s,x2:c.x2+u.nx*R*s,y2:c.y2+u.ny*R*s};});}
  var o=[{kind:'circ',cx:c.cx,cy:c.cy,r:c.r+R}]; if(c.r-R>1e-9) o.push({kind:'circ',cx:c.cx,cy:c.cy,r:c.r-R}); return o;
}
function _tangent(c,P){
  if(c.kind==='line'){var f=footOnSeg(P.x,P.y,[c.x1,c.y1,c.x2,c.y2],false)||(function(){var u=_lineUnit(c),t=(P.x-c.x1)*u.ux+(P.y-c.y1)*u.uy;return {x:c.x1+u.ux*t,y:c.y1+u.uy*t};})();return f;}
  var d=Math.hypot(P.x-c.cx,P.y-c.cy); if(d<1e-12) return null; return {x:c.cx+(P.x-c.cx)/d*c.r,y:c.cy+(P.y-c.cy)/d*c.r};
}
function _lineParam(c,P){var dx=c.x2-c.x1,dy=c.y2-c.y1;return ((P.x-c.x1)*dx+(P.y-c.y1)*dy)/(dx*dx+dy*dy);}
function _arcBetween(C,R,T1,T2,mid){
  var a1=Math.atan2(T1.y-C.y,T1.x-C.x),a2=Math.atan2(T2.y-C.y,T2.x-C.x);
  var sw=((a2-a1)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
  if(mid){ var am=Math.atan2(mid.y-C.y,mid.x-C.x); return arcHas(am,a1,a2)?{cx:C.x,cy:C.y,r:R,sa:a1,ea:a2}:{cx:C.x,cy:C.y,r:R,sa:a2,ea:a1}; }
  return sw<=Math.PI?{cx:C.x,cy:C.y,r:R,sa:a1,ea:a2}:{cx:C.x,cy:C.y,r:R,sa:a2,ea:a1};
}
// Novo trecho de uma curva após aparar/estender até T, mantendo o lado do clique
function _trimTo(h,T,isLineLine,corner){
  var c=h.curve,p=h.pick;
  if(c.kind==='line'){
    var t=_lineParam(c,T),tp=_lineParam(c,p),s=tp>=t?1:-1;
    if(isLineLine&&corner){ var tc=_lineParam(c,corner); if((tc-tp)*(t-tp)<-1e-9) return {err:'big'}; }
    var end=endToTrim(t,s);
    return end===1?{x1:T.x,y1:T.y,x2:c.x2,y2:c.y2}:{x1:c.x1,y1:c.y1,x2:T.x,y2:T.y};
  }
  if(!c.arc) return null; // círculo: não é aparado (como no AutoCAD)
  var aT=Math.atan2(T.y-c.cy,T.x-c.cx),ap=Math.atan2(p.y-c.cy,p.x-c.cx);
  var A={sa:aT,ea:c.arc.ea},B={sa:c.arc.sa,ea:aT},sw=function(o){return ((o.ea-o.sa)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);};
  var inA=arcHas(ap,A.sa,A.ea),inB=arcHas(ap,B.sa,B.ea);
  if(inA&&inB) return sw(A)<=sw(B)?A:B;
  return inA?A:(inB?B:A);
}
// Calcula a concordância (sem alterar o desenho)
function filletCompute(h1,h2,R){
  var c1=h1.curve,c2=h2.curve,p1=h1.pick,p2=h2.pick,res={arc:null,m1:null,m2:null};
  if(h1.e===h2.e&&(h1.seg===null||h1.seg===h2.seg)) return {err:'Não é possível concordar um objeto com ele mesmo.'};
  var LL=c1.kind==='line'&&c2.kind==='line';
  var corner=null;
  if(LL){ var I=lineLineInt(c1.x1,c1.y1,c1.x2,c1.y2,c2.x1,c2.y1,c2.x2,c2.y2); corner=I?{x:I.x,y:I.y}:null; }
  // Linhas paralelas: semicírculo ligando as duas (o raio informado é ignorado, como no AutoCAD)
  if(LL&&!corner){
    var u=_lineUnit(c1),dist=Math.abs((c2.x1-c1.x1)*u.nx+(c2.y1-c1.y1)*u.ny);
    if(dist<1e-9) return {err:'As linhas são colineares.'};
    var e1a={x:c1.x1,y:c1.y1},e1b={x:c1.x2,y:c1.y2},T1=Math.hypot(e1a.x-p1.x,e1a.y-p1.y)<Math.hypot(e1b.x-p1.x,e1b.y-p1.y)?e1a:e1b,O=T1===e1a?e1b:e1a;
    var sg=((c2.x1-c1.x1)*u.nx+(c2.y1-c1.y1)*u.ny)>0?1:-1,Cc={x:T1.x+u.nx*sg*dist/2,y:T1.y+u.ny*sg*dist/2};
    var T2=_tangent(c2,Cc),out={x:T1.x-O.x,y:T1.y-O.y},ol=Math.hypot(out.x,out.y);
    res.arc=_arcBetween(Cc,dist/2,T1,T2,{x:Cc.x+out.x/ol*dist/2,y:Cc.y+out.y/ol*dist/2});
    res.m1=null; var t2=_lineParam(c2,T2),q=_lineParam(c2,p2);
    res.m2=Math.abs(t2-0)<Math.abs(t2-1)?{x1:T2.x,y1:T2.y,x2:c2.x2,y2:c2.y2}:{x1:c2.x1,y1:c2.y1,x2:T2.x,y2:T2.y};
    res.parallel=true; return res;
  }
  if(!(R>1e-9)){
    // Raio 0: canto vivo na interseção mais próxima dos cliques
    var I0=_curveInt(c1,c2); if(!I0.length) return {err:'Os objetos não se cruzam nem se prolongam até um ponto comum.'};
    var bi=null,bs=1e18; I0.forEach(function(q){var sc=Math.hypot(q.x-p1.x,q.y-p1.y)+Math.hypot(q.x-p2.x,q.y-p2.y);if(sc<bs){bs=sc;bi=q;}});
    res.m1=_trimTo(h1,bi,LL,corner); res.m2=_trimTo(h2,bi,LL,corner);
    if((res.m1&&res.m1.err)||(res.m2&&res.m2.err)) return {err:'Raio muito grande.'};
    res.corner=bi; return res;
  }
  // Centros candidatos: interseções das curvas deslocadas de R
  var cands=[];
  _offsets(c1,R).forEach(function(o1){ _offsets(c2,R).forEach(function(o2){ _curveInt(o1,o2).forEach(function(C){
    var T1=_tangent(c1,C),T2=_tangent(c2,C); if(!T1||!T2) return;
    if(Math.abs(Math.hypot(C.x-T1.x,C.y-T1.y)-R)>1e-6*(1+R)||Math.abs(Math.hypot(C.x-T2.x,C.y-T2.y)-R)>1e-6*(1+R)) return;
    cands.push({C:C,T1:T1,T2:T2,sc:Math.hypot(T1.x-p1.x,T1.y-p1.y)+Math.hypot(T2.x-p2.x,T2.y-p2.y)});
  });});});
  if(!cands.length) return {err:'Raio muito grande para estes objetos.'};
  cands.sort(function(a,b){return a.sc-b.sc;});
  var k=cands[0];
  res.m1=_trimTo(h1,k.T1,LL,corner); res.m2=_trimTo(h2,k.T2,LL,corner);
  if((res.m1&&res.m1.err)||(res.m2&&res.m2.err)) return {err:'Raio muito grande.'};
  res.arc=_arcBetween(k.C,R,k.T1,k.T2,null);
  return res;
}
// Aplica no desenho (um único passo de desfazer)
function filletApply(h1,h2,R,noSnap){
  var r=filletCompute(h1,h2,R); if(r.err){ log('FILLET: '+r.err,'er'); return false; }
  if(!noSnap) snapshot();
  var exploded={};
  function target(h){
    if(h.seg===null) return h.e;
    if(!exploded[h.e.id]){
      var L=explodeToLines(h.e),idx=S.ents.indexOf(h.e);
      if(idx>=0) S.ents.splice.apply(S.ents,[idx,1].concat(L));
      exploded[h.e.id]=L;
    }
    return exploded[h.e.id][h.seg];
  }
  var t1=target(h1),t2=target(h2);
  if(S.filletTrim){
    [[t1,r.m1],[t2,r.m2]].forEach(function(q){ var e=q[0],m=q[1]; if(!e||!m) return;
      if(e.tp==='line'){e.x1=m.x1;e.y1=m.y1;e.x2=m.x2;e.y2=m.y2;} else if(e.tp==='arc'){e.sa=m.sa;e.ea=m.ea;} });
  }
  if(r.arc&&r.arc.r>1e-9){
    var same=h1.e.ly===h2.e.ly,src=h1.e;
    addE({tp:'arc',cx:r.arc.cx,cy:r.arc.cy,r:r.arc.r,sa:r.arc.sa,ea:r.arc.ea,ly:same?src.ly:S.curLy,
      col:same?src.col:S.style.col,lw:same?src.lw:S.style.lw,ld:same?src.ld:S.style.ld},true);
  }
  var ex=Object.keys(exploded).length;
  log('FILLET: '+(r.parallel?'linhas paralelas unidas por semicírculo':(r.arc?'concordância R='+gNum(R)+' criada':'canto vivo criado'))+(S.filletTrim?'':' (sem aparar)')+(ex?' — polilinha/retângulo convertido em linhas (polilinhas com arcos: v7)':'')+'.','ok');
  return true;
}
// Opção Polilinha: concorda todos os vértices
function filletPolyline(e){
  if(e.tp!=='pl'&&e.tp!=='rect'){ log('FILLET: o objeto não é uma polilinha nem um retângulo.','er'); return; }
  var closed=e.tp==='rect'||!!e.closed,R=S.filletR;
  snapshot();
  var L=explodeToLines(e),idx=S.ents.indexOf(e); S.ents.splice.apply(S.ents,[idx,1].concat(L));
  var ok=0,fail=0,n=L.length,pairs=closed?n:n-1;
  for(var i=0;i<pairs;i++){
    var a=L[i],b=L[(i+1)%n];
    var ha={e:a,seg:null,pick:{x:(a.x1+a.x2)/2,y:(a.y1+a.y2)/2},curve:{kind:'line',x1:a.x1,y1:a.y1,x2:a.x2,y2:a.y2}};
    var hb={e:b,seg:null,pick:{x:(b.x1+b.x2)/2,y:(b.y1+b.y2)/2},curve:{kind:'line',x1:b.x1,y1:b.y1,x2:b.x2,y2:b.y2}};
    var r=filletCompute(ha,hb,R);
    if(r.err||r.parallel){fail++;continue;}
    var save=S.filletTrim; S.filletTrim=true; var did=filletApply(ha,hb,R,true); S.filletTrim=save;
    if(did) ok++; else fail++;
  }
  log('FILLET Polilinha: '+ok+' vértice(s) concordado(s)'+(fail?', '+fail+' segmento(s) curto(s) demais para o raio':'')+'.',ok?'ok':'er');
  renderAll();
}
// ── fluxo do comando ───────────────────────────────────────────────────────
function filletPrompt(){
  var ds=S.ds; if(!ds) return;
  var txt={first:'FILLET Selecione o primeiro objeto ou [Desfazer/Polilinha/Raio/Aparar/Múltiplo]:',
    second:'Selecione o segundo objeto, ou Shift+clique para canto vivo, ou [Raio]:',
    radius:'Especifique o raio de concordância <'+gNum(S.filletR)+'> (valor ou dois pontos):',
    trim:'Modo de aparar [Aparar/Não aparar] <'+(S.filletTrim?'Aparar':'Não aparar')+'>:',
    poly:'Selecione a polilinha 2D ou [Raio]:'}[ds.phase];
  logp(txt+(ds.multi&&ds.phase==='first'?'  (múltiplo)':''));
}
function filletStart(){
  S.ds={phase:'first',multi:false,done:0,ret:'first'};
  log('Configurações atuais: Modo = '+(S.filletTrim?'APARAR':'NÃO APARAR')+', Raio = '+gNum(S.filletR),'inf');
  filletPrompt(); renderAll();
}
function filletAfter(){
  var ds=S.ds; ds.done++; ds.e1=null; ds.phase='first'; renderAll(); updSelInfo();
  if(ds.multi) filletPrompt(); else setTool('select');
}
function filletClick(pt){
  var ds=S.ds; if(!ds){ filletStart(); return; }
  if(ds.phase==='radius'){
    if(!ds.rp){ ds.rp={x:pt.x,y:pt.y}; logp('Especifique o segundo ponto:'); return; }
    S.filletR=Math.hypot(pt.x-ds.rp.x,pt.y-ds.rp.y); ds.rp=null; log('Raio de concordância = '+gNum(S.filletR),'ok');
    ds.phase=ds.ret; filletPrompt(); renderAll(); return;
  }
  var h=filletHit(pt);
  if(ds.phase==='poly'){ if(!h){log('Nenhuma polilinha no ponto.','inf');return;} filletPolyline(h.e); filletAfter(); return; }
  if(!h){ log('Nenhum objeto válido no ponto (linha, arco, círculo, polilinha ou retângulo).','inf'); return; }
  if(ds.phase==='first'){ ds.e1=h; ds.phase='second'; filletPrompt(); renderAll(); return; }
  if(ds.phase==='second'){
    var R=S.shiftDown?0:S.filletR;
    if(filletApply(ds.e1,h,R)) filletAfter(); else renderAll();
  }
}
// Entradas digitadas (linha de comando ou Enter/Espaço). Retorna true se consumiu.
function filletInput(v){
  var ds=S.ds; if(!ds) return false;
  var u=String(v).trim().toUpperCase();
  if(ds.phase==='radius'){
    if(u===''){ ds.phase=ds.ret; filletPrompt(); return true; }
    var r=parseFloat(u.replace(',','.'));
    if(!isFinite(r)||r<0){ log('Requer um número não negativo ou dois pontos.','er'); return true; }
    S.filletR=r; ds.rp=null; log('Raio de concordância = '+gNum(r),'ok'); ds.phase=ds.ret; filletPrompt(); renderAll(); return true;
  }
  if(ds.phase==='trim'){
    if(u==='A'||u==='T'||u==='APARAR'||u==='TRIM') S.filletTrim=true;
    else if(u==='N'||u==='NAO'||u==='NÃO'||u==='NAO APARAR'||u==='NOTRIM') S.filletTrim=false;
    else if(u!==''){ log('Opção inválida: use A (Aparar) ou N (Não aparar).','er'); return true; }
    log('Modo = '+(S.filletTrim?'APARAR':'NÃO APARAR'),'ok'); ds.phase=ds.ret; filletPrompt(); return true;
  }
  if(u==='R'||u==='RAIO'||u==='RADIUS'){ ds.ret=ds.phase; ds.phase='radius'; ds.rp=null; filletPrompt(); return true; }
  if(ds.phase==='second'){
    if(u===''){ ds.e1=null; ds.phase='first'; if(ds.multi) filletPrompt(); else setTool('select'); renderAll(); return true; }
    log('Opção inválida. Selecione o segundo objeto ou digite R.','er'); return true;
  }
  if(ds.phase==='poly'){ if(u===''){ds.phase='first';filletPrompt();return true;} log('Selecione uma polilinha ou digite R.','er'); return true; }
  // fase 'first'
  if(u===''){ setTool('select'); return true; }
  if(u==='P'||u==='POLILINHA'||u==='POLYLINE'){ ds.phase='poly'; filletPrompt(); return true; }
  if(u==='T'||u==='A'||u==='APARAR'||u==='TRIM'){ ds.ret='first'; ds.phase='trim'; filletPrompt(); return true; }
  if(u==='M'||u==='MULTIPLO'||u==='MÚLTIPLO'||u==='MULTIPLE'){ ds.multi=true; log('Modo múltiplo: Enter encerra.','inf'); filletPrompt(); return true; }
  if(u==='U'||u==='D'||u==='DESFAZER'||u==='UNDO'){
    if(ds.done>0){ undo(); ds.done--; S.ds=ds; log('Última concordância desfeita.','ok'); filletPrompt(); }
    else log('Nada para desfazer neste comando.','inf');
    return true;
  }
  log('Opção inválida: [Desfazer/Polilinha/Raio/Aparar/Múltiplo].','er'); return true;
}
// Pré-visualização: destaca o 1º objeto e mostra o resultado ao passar sobre o 2º
function drawFilletPreview(ctx,hp){
  var ds=S.ds; if(!ds) return;
  function hi(e,col){ ctx.save();ctx.globalAlpha=.85;ctx.strokeStyle=col;ctx.lineWidth=2;ctx.setLineDash([]);drawE(ctx,e,false);ctx.restore(); }
  var h=(ds.phase==='first'||ds.phase==='second'||ds.phase==='poly')?filletHit(hp):null;
  if(ds.phase==='first'||ds.phase==='poly'){ if(h&&(ds.phase==='first'||h.e.tp==='pl'||h.e.tp==='rect')) hi(h.e,'#f5a623'); return; }
  if(ds.phase!=='second'||!ds.e1) return;
  hi(ds.e1.e,'#f5a623');
  var sp=w2s(hp.x,hp.y);
  if(!h){ ctx.save();ctx.fillStyle='#f5a623';ctx.font='bold 10px Consolas';ctx.fillText('R='+gNum(S.shiftDown?0:S.filletR),sp.x+15,sp.y-10);ctx.restore(); return; }
  var R=S.shiftDown?0:S.filletR,r=filletCompute(ds.e1,h,R);
  ctx.save();ctx.font='bold 10px Consolas';
  if(r.err){ ctx.fillStyle='#e85050'; ctx.fillText(r.err,sp.x+15,sp.y-10); ctx.restore(); return; }
  ctx.strokeStyle='#4ec87a';ctx.lineWidth=2;ctx.setLineDash([]);
  function seg(m,base){ if(!m) return; if(m.x1!==undefined){var a=w2s(m.x1,m.y1),b=w2s(m.x2,m.y2);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    else if(base&&base.kind==='circ'){var c=w2s(base.cx,base.cy);ctx.beginPath();ctx.arc(c.x,c.y,base.r*S.vp.sc,-m.sa,-m.ea,true);ctx.stroke();} }
  if(S.filletTrim){ seg(r.m1,ds.e1.curve); seg(r.m2,h.curve); }
  if(r.arc){ var c=w2s(r.arc.cx,r.arc.cy); ctx.beginPath(); ctx.arc(c.x,c.y,r.arc.r*S.vp.sc,-r.arc.sa,-r.arc.ea,true); ctx.stroke(); }
  ctx.fillStyle='#4ec87a'; ctx.fillText(r.parallel?'semicírculo':(R>0?'R='+gNum(R):'canto vivo'),sp.x+15,sp.y-10);
  ctx.restore();
}
var _setTool_v67=setTool;
setTool=function(tool){ _setTool_v67(tool); if(tool==='fillet') filletStart(); };


