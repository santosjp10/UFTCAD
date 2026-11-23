/* ═══════════════════════════════════════════════════════════════════
   v7.1 — PACOTE 2: POLILINHAS COM ARCOS, PEDIT, JOIN, BREAK, STRETCH
   Convenção (igual ao DXF/AutoCAD): pts[i].b = bulge do segmento i→i+1
   (b = tan(θ/4); b>0 anti-horário). Polilinha fechada guarda o 1º vértice
   repetido no fim (convenção já usada pelo EduCAD).
   ═══════════════════════════════════════════════════════════════════ */
function plHasArc(e){ return !!e&&e.tp==='pl'&&Array.isArray(e.pts)&&e.pts.some(function(p){return p.b&&Math.abs(p.b)>1e-12;}); }
function plIsDup(e){ var P=e.pts; return P.length>2&&Math.hypot(P[0].x-P[P.length-1].x,P[0].y-P[P.length-1].y)<1e-9; }
function bulgeArc(p1,p2,b){
  var dx=p2.x-p1.x,dy=p2.y-p1.y,d=Math.hypot(dx,dy); if(d<1e-12) return null;
  var k=d*(1-b*b)/(4*b),cx=(p1.x+p2.x)/2-dy/d*k,cy=(p1.y+p2.y)/2+dx/d*k;
  return {cx:cx,cy:cy,r:Math.hypot(p1.x-cx,p1.y-cy),a1:Math.atan2(p1.y-cy,p1.x-cx),th:4*Math.atan(b)};
}
// Segmentos: {kind:'line'|'arc', i, x1,y1,x2,y2, b, cx,cy,r,a1,th(sweep com sinal), sa,ea(anti-horário)}
function plSegs(e){
  var P=e.pts,n=P.length,o=[],last=(e.closed&&!plIsDup(e))?n:n-1;
  for(var i=0;i<last;i++){
    var a=P[i],c=P[(i+1)%n],b=a.b||0;
    if(Math.abs(b)>1e-12){ var A=bulgeArc(a,c,b); if(A){ var a2=A.a1+A.th;
      o.push({kind:'arc',i:i,x1:a.x,y1:a.y,x2:c.x,y2:c.y,b:b,cx:A.cx,cy:A.cy,r:A.r,a1:A.a1,th:A.th,sa:A.th>0?A.a1:a2,ea:A.th>0?a2:A.a1}); continue; } }
    o.push({kind:'line',i:i,x1:a.x,y1:a.y,x2:c.x,y2:c.y,b:0});
  }
  return o;
}
function segLen(s){ return s.kind==='arc'?Math.abs(s.r*s.th):Math.hypot(s.x2-s.x1,s.y2-s.y1); }
function segPt(s,t){ if(s.kind==='arc'){ var a=s.a1+s.th*t; return {x:s.cx+s.r*Math.cos(a),y:s.cy+s.r*Math.sin(a)}; } return {x:s.x1+(s.x2-s.x1)*t,y:s.y1+(s.y2-s.y1)*t}; }
function segParam(s,p){ // parâmetro local 0..1 do ponto mais próximo
  if(s.kind==='arc'){ var a=Math.atan2(p.y-s.cy,p.x-s.cx),d=(a-s.a1)*(s.th>0?1:-1); d=((d%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
    var t=d/Math.abs(s.th); if(t>1){ var over=(d-Math.abs(s.th)),under=2*Math.PI-d; t=over<under?1:0; } return t; }
  var dx=s.x2-s.x1,dy=s.y2-s.y1,l2=dx*dx+dy*dy; return l2<1e-18?0:Math.max(0,Math.min(1,((p.x-s.x1)*dx+(p.y-s.y1)*dy)/l2));
}
function segPart(s){ return s.kind==='arc'?{tp:'arc',cx:s.cx,cy:s.cy,r:s.r,sa:s.sa,ea:s.ea}:{tp:'line',x1:s.x1,y1:s.y1,x2:s.x2,y2:s.y2}; }
function plSample(e,k){ k=k||16; var o=[]; plSegs(e).forEach(function(s,j){ var m=s.kind==='arc'?Math.max(4,Math.ceil(k*Math.abs(s.th)/Math.PI)):1; for(var q=0;q<m;q++) o.push(segPt(s,q/m)); });
  var S2=plSegs(e); if(S2.length){ var L=S2[S2.length-1]; o.push({x:L.x2,y:L.y2}); } return o; }
function plLength(e){ return plSegs(e).reduce(function(a,s){return a+segLen(s);},0); }
function plArea(e){ var P=plSample(e,48),a=0; for(var i=0;i<P.length;i++){ var q=P[(i+1)%P.length]; a+=P[i].x*q.y-q.x*P[i].y; } return Math.abs(a/2); }
// Desenha o caminho com um mapeamento mundo→tela qualquer
function plTrace(ctx,e,map,scale){
  var S2=plSegs(e); if(!S2.length) return;
  ctx.beginPath(); var p0=map(S2[0].x1,S2[0].y1); ctx.moveTo(p0.x,p0.y);
  S2.forEach(function(s){ if(s.kind==='arc'){ var c=map(s.cx,s.cy); ctx.arc(c.x,c.y,s.r*scale,-s.a1,-(s.a1+s.th),s.th>0); } else { var q=map(s.x2,s.y2); ctx.lineTo(q.x,q.y); } });
  if(e.closed) ctx.closePath();
}
// Bulge de um arco que vai de A a B passando por M
function bulgeThrough(A,M,B){
  var ax=A.x,ay=A.y,bx=M.x,by=M.y,cx=B.x,cy=B.y,d=2*(ax*(by-cy)+bx*(cy-ay)+cx*(ay-by)); if(Math.abs(d)<1e-12) return 0;
  var ux=((ax*ax+ay*ay)*(by-cy)+(bx*bx+by*by)*(cy-ay)+(cx*cx+cy*cy)*(ay-by))/d,uy=((ax*ax+ay*ay)*(cx-bx)+(bx*bx+by*by)*(ax-cx)+(cx*cx+cy*cy)*(bx-ax))/d;
  var aA=Math.atan2(ay-uy,ax-ux),aB=Math.atan2(cy-uy,cx-ux),aM=Math.atan2(by-uy,bx-ux);
  var ccw=((aB-aA)%(2*Math.PI)+2*Math.PI)%(2*Math.PI),th=arcHas(aM,aA,aB)?ccw:-(2*Math.PI-ccw);
  return Math.tan(th/4);
}

// ── integrações com o restante do aplicativo (embrulhando as funções) ────────
var _p2={drawE:drawE,hitEnt:hitEnt,snapPts:snapPts,bbox:bbox,entSegs:entSegs,entIntersect:entIntersect,entIntersectSnap:entIntersectSnap,
  xformE:xformE,offsE:offsE,offsetSide:offsetSide,getGrips:getGrips,stretchGrip:stretchGrip,geomFields:geomFields,entPrims:entPrims,primsBox:primsBox,
  explodeToLines:explodeToLines,doTrim:doTrim,doExtend:doExtend,filletHit:filletHit,filletApply:filletApply,filletPolyline:filletPolyline,chamApply:chamApply};
drawE=function(ctx,e,sel){
  if(!plHasArc(e)) return _p2.drawE(ctx,e,sel);
  ctx.save(); applyStyle(ctx,e,sel); plTrace(ctx,e,w2s,S.vp.sc); ctx.stroke(); ctx.restore();
};
hitEnt=function(e,wx,wy){
  if(!plHasArc(e)) return _p2.hitEnt(e,wx,wy);
  var ly=getLy(e.ly); if(ly&&(!ly.vis||ly.lock)) return false;
  var t=8/S.vp.sc;
  return plSegs(e).some(function(s){ if(s.kind==='line') return segD(wx,wy,s.x1,s.y1,s.x2,s.y2)<t;
    return Math.abs(Math.hypot(wx-s.cx,wy-s.cy)-s.r)<t&&arcHas(Math.atan2(wy-s.cy,wx-s.cx),s.sa,s.ea); });
};
snapPts=function(e){
  if(!plHasArc(e)) return _p2.snapPts(e);
  var o=[]; e.pts.forEach(function(p){o.push({x:p.x,y:p.y,st:'end'});});
  plSegs(e).forEach(function(s){ var m=segPt(s,.5); o.push({x:m.x,y:m.y,st:'mid'}); if(s.kind==='arc') o.push({x:s.cx,y:s.cy,st:'cen'}); });
  return o;
};
bbox=function(e){ if(!plHasArc(e)) return _p2.bbox(e); return ptsBox(plSample(e,24)); };
entSegs=function(e){ if(!plHasArc(e)) return _p2.entSegs(e); var P=plSample(e,32),o=[]; for(var i=1;i<P.length;i++) o.push([P[i-1].x,P[i-1].y,P[i].x,P[i].y]); return o; };
function _p2Split(fn,a,b){
  if(plHasArc(a)){ var r=[]; plSegs(a).forEach(function(s){ r=r.concat(entIntersectSnap(segPart(s),b)||[]); }); return r; }
  if(plHasArc(b)){ var r2=[]; plSegs(b).forEach(function(s){ r2=r2.concat(fn(a,segPart(s))||[]); }); return r2; }
  return fn(a,b);
}
entIntersectSnap=function(a,b){ return _p2Split(_p2.entIntersectSnap,a,b); };
entIntersect=function(a,b){ if(plHasArc(a)) return entIntersectSnap(a,b); return _p2Split(_p2.entIntersect,a,b); };
xformE=function(e,fn,info){
  var bs=e.tp==='pl'?e.pts.map(function(p){return p.b||0;}):null;
  _p2.xformE(e,fn,info);
  if(bs) e.pts.forEach(function(p,i){ var b=bs[i]*(info.kind==='mir'?-1:1); if(Math.abs(b)>1e-12) p.b=b; else delete p.b; }); // bulges preservados (espelho inverte)
};
// Grips: meio de segmento em arco ajusta a curvatura (arco passa pelo ponto)
getGrips=function(e){
  if(!plHasArc(e)) return _p2.getGrips(e);
  var G=[],P=e.pts,n=P.length-(plIsDup(e)?1:0);
  for(var i=0;i<n;i++) G.push({x:P[i].x,y:P[i].y,key:'v'+i});
  plSegs(e).forEach(function(s){ var m=segPt(s,.5); G.push({x:m.x,y:m.y,key:'m'+s.i}); });
  return G;
};
stretchGrip=function(e,key,base,pt){
  if(e.tp==='pl'&&key[0]==='m'){ var i=parseInt(key.slice(1),10),s=plSegs(e).filter(function(q){return q.i===i;})[0];
    if(s&&s.kind==='arc'){ e.pts[i].b=bulgeThrough({x:s.x1,y:s.y1},pt,{x:s.x2,y:s.y2}); return; } }
  return _p2.stretchGrip(e,key,base,pt);
};
geomFields=function(e){
  var F=_p2.geomFields(e);
  if(e.tp==='pl'){ F.forEach(function(f){ if(f.l==='Comprimento') f.v=plLength(e); if(f.l==='Área'&&e.closed) f.v=plArea(e); });
    if(plHasArc(e)) F.push({l:'Segmentos em arco',v:plSegs(e).filter(function(s){return s.kind==='arc';}).length,ro:true}); }
  return F;
};
entPrims=function(e){
  if(!plHasArc(e)) return _p2.entPrims(e);
  var P=e.pts.map(function(p){return {x:p.x,y:p.y};}),B=e.pts.map(function(p){return p.b||0;});
  if(e.closed&&plIsDup(e)){ P.pop(); B.pop(); }
  return [{k:'poly',closed:!!e.closed,pts:P,b:B}];
};
primsBox=function(list){
  return _p2.primsBox(list.map(function(p){ if(p.k==='poly'&&p.b){ var tmp={tp:'pl',closed:p.closed,pts:p.pts.map(function(v,i){return {x:v.x,y:v.y,b:p.b[i]};})}; return {k:'poly',pts:plSample(tmp,24)}; } return p; }));
};
// SVG de polilinha com arcos
function plSvgPath(p,f){
  var tmp={tp:'pl',closed:p.closed,pts:p.pts.map(function(v,i){return {x:v.x,y:v.y,b:p.b[i]};})},S2=plSegs(tmp),d='M'+f(S2[0].x1)+' '+f(-S2[0].y1);
  S2.forEach(function(s){ d+=s.kind==='arc'?(' A'+f(s.r)+' '+f(s.r)+' 0 '+(Math.abs(s.th)>Math.PI?1:0)+' '+(s.th>0?0:1)+' '+f(s.x2)+' '+f(-s.y2)):(' L'+f(s.x2)+' '+f(-s.y2)); });
  return d+(p.closed?' Z':'');
}
// EXPLODE e FILLET/CHAMFER: um segmento por índice de vértice (linhas e arcos)
explodeToLines=function(e){
  if(e.tp!=='pl') return _p2.explodeToLines(e);
  return plSegs(e).map(function(s){ var base={id:uid(),ly:e.ly,col:e.col,lw:e.lw,ld:e.ld};
    return s.kind==='arc'?Object.assign(base,{tp:'arc',cx:s.cx,cy:s.cy,r:s.r,sa:s.sa,ea:s.ea}):Object.assign(base,{tp:'line',x1:s.x1,y1:s.y1,x2:s.x2,y2:s.y2}); });
};
filletHit=function(pt){
  var h=_p2.filletHit(pt); if(!h||h.e.tp!=='pl') return h;
  var S2=plSegs(h.e),bi=-1,bd=1e18;
  S2.forEach(function(s,k){ var q=segPt(s,segParam(s,pt)),d=Math.hypot(q.x-pt.x,q.y-pt.y); if(d<bd){bd=d;bi=k;} });
  var s=S2[bi]; h.seg=bi;
  h.curve=s.kind==='arc'?{kind:'circ',cx:s.cx,cy:s.cy,r:s.r,arc:{sa:s.sa,ea:s.ea}}:{kind:'line',x1:s.x1,y1:s.y1,x2:s.x2,y2:s.y2};
  return h;
};

// ── FILLET/CHAMFER nos vértices: a polilinha continua sendo um único objeto ───
function plUnique(e){ var P=e.pts.map(function(p){return {x:p.x,y:p.y,b:p.b||0};}); if(e.closed&&plIsDup(e)) P.pop(); return P; }
function plRebuild(e,V){ var P=V.map(function(p){var q={x:p.x,y:p.y}; if(p.b) q.b=p.b; return q;}); if(e.closed&&P.length>2) P.push({x:P[0].x,y:P[0].y}); e.pts=P; }
// mode: 'fillet' (R) | 'chamfer' (d1,d2 | len,ang). verts: índices (em V) a tratar. Retorna {ok,fail}.
function plCornerOps(e,verts,mode,o){
  var V=plUnique(e),m=V.length,closed=!!e.closed,ops={},ok=0,fail=0;
  verts.forEach(function(k){
    if(!closed&&(k<=0||k>=m-1)){ fail++; return; }
    var A=V[(k-1+m)%m],C=V[k],B=V[(k+1)%m];
    if(Math.abs(A.b||0)>1e-12||Math.abs(C.b||0)>1e-12){ fail++; return; } // só entre segmentos retos
    var l1=Math.hypot(C.x-A.x,C.y-A.y),l2=Math.hypot(B.x-C.x,B.y-C.y); if(l1<1e-9||l2<1e-9){ fail++; return; }
    var u1={x:(C.x-A.x)/l1,y:(C.y-A.y)/l1},u2={x:(B.x-C.x)/l2,y:(B.y-C.y)/l2},cr=u1.x*u2.y-u1.y*u2.x,dt=u1.x*u2.x+u1.y*u2.y;
    var defl=Math.atan2(cr,dt); if(Math.abs(defl)<1e-9){ fail++; return; }
    var t1,t2,b=0;
    if(mode==='fillet'){ if(!(o.R>1e-9)){ ok++; return; } t1=t2=o.R*Math.tan(Math.abs(defl)/2); b=Math.tan(defl/4); }
    else if(o.ang!==undefined){ var phi=Math.PI-Math.abs(defl),a=o.ang*Math.PI/180,den=Math.sin(Math.PI-a-phi); if(!(den>1e-9)){ fail++; return; } t1=o.len; t2=o.len*Math.sin(a)/den; }
    else { t1=o.d1; t2=o.d2; if(!(t1>1e-9||t2>1e-9)){ ok++; return; } }
    ops[k]={t1:t1,t2:t2,b:b,u1:u1,u2:u2,C:C};
  });
  // os segmentos precisam comportar os dois cortes vizinhos
  Object.keys(ops).forEach(function(ks){ var k=+ks,o2=ops[k],prev=ops[(k-1+m)%m],next=ops[(k+1)%m];
    var lIn=Math.hypot(V[k].x-V[(k-1+m)%m].x,V[k].y-V[(k-1+m)%m].y),lOut=Math.hypot(V[(k+1)%m].x-V[k].x,V[(k+1)%m].y-V[k].y);
    if(o2.t1+(prev&&prev!==o2?prev.t2:0)>lIn+1e-9||o2.t2+(next&&next!==o2?next.t1:0)>lOut+1e-9) o2.bad=true; });
  var out=[];
  for(var k=0;k<m;k++){ var q=ops[k];
    if(q&&!q.bad){ out.push({x:q.C.x-q.u1.x*q.t1,y:q.C.y-q.u1.y*q.t1,b:q.b}); out.push({x:q.C.x+q.u2.x*q.t2,y:q.C.y+q.u2.y*q.t2,b:V[k].b}); ok++; }
    else { if(q&&q.bad) fail++; out.push(V[k]); }
  }
  plRebuild(e,out);
  return {ok:ok,fail:fail};
}
function plAdjVertex(e,i,j){ // vértice compartilhado por dois segmentos (índices de plSegs), ou -1
  var m=plUnique(e).length;
  if(j===i+1) return i+1; if(i===j+1) return j+1;
  if(e.closed&&((i===0&&j===m-1)||(j===0&&i===m-1))) return 0;
  return -1;
}
function plSameObjCorner(h1,h2,mode,o){
  var e=h1.e; if(e.tp==='rect') rectToPl(e);
  var v=plAdjVertex(e,h1.seg,h2.seg); if(v<0) return null;
  var V=plUnique(e); v=v%V.length;
  return plCornerOps(e,[v],mode,o);
}
filletApply=function(h1,h2,R,noSnap){
  if(h1.e===h2.e&&h1.seg!==null&&h2.seg!==null&&h1.seg!==h2.seg&&(h1.e.tp==='pl'||h1.e.tp==='rect')&&h1.curve.kind==='line'&&h2.curve.kind==='line'){
    var test=JSON.parse(JSON.stringify(h1.e)),tv=plSameObjCorner({e:test,seg:h1.seg},{e:test,seg:h2.seg},'fillet',{R:R});
    if(tv){ if(tv.fail){ log('FILLET: raio muito grande para estes segmentos.','er'); return false; }
      if(!noSnap) snapshot(); plSameObjCorner(h1,h2,'fillet',{R:R});
      log('FILLET: concordância R='+gNum(R)+' na polilinha (continua um único objeto).','ok'); return true; }
  }
  return _p2.filletApply(h1,h2,R,noSnap);
};
filletPolyline=function(e){
  if(e.tp!=='pl'&&e.tp!=='rect'){ log('FILLET: o objeto não é uma polilinha nem um retângulo.','er'); return; }
  snapshot(); if(e.tp==='rect') rectToPl(e);
  var V=plUnique(e),idx=[]; for(var k=0;k<V.length;k++) idx.push(k);
  var r=plCornerOps(e,idx,'fillet',{R:S.filletR});
  log('FILLET Polilinha: '+r.ok+' vértice(s) concordado(s)'+(r.fail?', '+r.fail+' não (segmento curto, arco ou ponta)':'')+'. A polilinha continua um único objeto.',r.ok?'ok':'er');
  renderAll();
};
function chamOpts(zero){ return zero?{d1:0,d2:0}:(S.chamMethod==='angle'?{len:S.chamLen,ang:S.chamAng}:{d1:S.chamD1,d2:S.chamD2}); }
chamApply=function(h1,h2,zero,noSnap){
  if(h1.e===h2.e&&h1.seg!==null&&h2.seg!==null&&h1.seg!==h2.seg&&(h1.e.tp==='pl'||h1.e.tp==='rect')){
    var test=JSON.parse(JSON.stringify(h1.e)),tv=plSameObjCorner({e:test,seg:h1.seg},{e:test,seg:h2.seg},'chamfer',chamOpts(zero));
    if(tv){ if(tv.fail){ log('CHAMFER: distância grande demais para estes segmentos.','er'); return false; }
      if(!noSnap) snapshot(); plSameObjCorner(h1,h2,'chamfer',chamOpts(zero));
      log('CHAMFER: chanfro na polilinha (continua um único objeto).','ok'); return true; }
  }
  return _p2.chamApply(h1,h2,zero,noSnap);
};
(function(){ var c0=NC.chamfer.click;
  NC.chamfer.click=function(ds,pt){
    if(ds.phase!=='poly') return c0.call(this,ds,pt);
    var h=filletHit(pt); if(!h||(h.e.tp!=='pl'&&h.e.tp!=='rect')){ log('Selecione uma polilinha ou retângulo.','inf'); return; }
    var e=h.e; snapshot(); if(e.tp==='rect') rectToPl(e);
    var V=plUnique(e),idx=[]; for(var k=0;k<V.length;k++) idx.push(k);
    var r=plCornerOps(e,idx,'chamfer',chamOpts(false));
    log('CHAMFER Polilinha: '+r.ok+' vértice(s) chanfrado(s)'+(r.fail?', '+r.fail+' não':'')+'. A polilinha continua um único objeto.',r.ok?'ok':'er');
    this.after(ds);
  };
})();

// ── OFFSET de polilinhas com arcos ──────────────────────────────────────────
function plOffsetArcs(e,d){
  var S2=plSegs(e); if(!S2.length) return null;
  var off=[];
  for(var i=0;i<S2.length;i++){ var s=S2[i];
    if(s.kind==='line'){ var l=Math.hypot(s.x2-s.x1,s.y2-s.y1),nx=-(s.y2-s.y1)/l*d,ny=(s.x2-s.x1)/l*d; off.push({kind:'line',x1:s.x1+nx,y1:s.y1+ny,x2:s.x2+nx,y2:s.y2+ny}); }
    else { var r2=s.r+(s.th>0?-d:d); if(r2<=1e-9) return null; var a2=s.a1+s.th;
      off.push({kind:'arc',cx:s.cx,cy:s.cy,r:r2,th:s.th,x1:s.cx+r2*Math.cos(s.a1),y1:s.cy+r2*Math.sin(s.a1),x2:s.cx+r2*Math.cos(a2),y2:s.cy+r2*Math.sin(a2)}); }
  }
  function cv(o){ return o.kind==='line'?{kind:'line',x1:o.x1,y1:o.y1,x2:o.x2,y2:o.y2}:{kind:'circ',cx:o.cx,cy:o.cy,r:o.r}; }
  function join(a,b){ var I=_curveInt(cv(a),cv(b)),ref={x:a.x2,y:a.y2}; if(!I.length) return null;
    I.sort(function(p,q){return Math.hypot(p.x-ref.x,p.y-ref.y)-Math.hypot(q.x-ref.x,q.y-ref.y);}); return I[0]; }
  var closed=!!e.closed,n=off.length,J=[];
  for(var k=0;k<n;k++){ if(!closed&&k===n-1) break; var a=off[k],b=off[(k+1)%n],p=join(a,b); J.push(p||{x:a.x2,y:a.y2,gap:{x:b.x1,y:b.y1}}); }
  function bul(o,S0,E0){ if(o.kind!=='arc') return 0; var aS=Math.atan2(S0.y-o.cy,S0.x-o.cx),aE=Math.atan2(E0.y-o.cy,E0.x-o.cx),th;
    if(o.th>0){ th=((aE-aS)%(2*Math.PI)+2*Math.PI)%(2*Math.PI); if(th<1e-9&&Math.abs(o.th)>Math.PI) th=2*Math.PI; } else { th=-(((aS-aE)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)); }
    return Math.tan(th/4); }
  var V=[];
  for(var k2=0;k2<n;k2++){
    var o=off[k2],start=closed?J[(k2-1+n)%n]:(k2===0?{x:o.x1,y:o.y1}:J[k2-1]),end=closed?J[k2]:(k2===n-1?{x:o.x2,y:o.y2}:J[k2]);
    var st=start.gap?{x:start.gap.x,y:start.gap.y}:start;
    V.push({x:st.x,y:st.y,b:bul(o,st,{x:end.x,y:end.y})});
    if(end.gap) V.push({x:end.x,y:end.y,b:0}); // degrau entre segmentos sem interseção
  }
  if(!closed){ var lo=off[n-1]; V.push({x:lo.x2,y:lo.y2,b:0}); }
  return V;
}
offsE=function(e,d){
  if(!plHasArc(e)) return _p2.offsE(e,d);
  var V=plOffsetArcs(e,d); if(!V) return false;
  var P=V.map(function(p){var q={x:p.x,y:p.y}; if(Math.abs(p.b)>1e-12) q.b=p.b; return q;});
  if(e.closed) P.push({x:P[0].x,y:P[0].y});
  e.pts=P; return true;
};
offsetSide=function(e,mx,my,d){
  if(!plHasArc(e)) return _p2.offsetSide(e,mx,my,d);
  var best=null,bd=1e18; plSegs(e).forEach(function(s){ var q=segPt(s,segParam(s,{x:mx,y:my})),dd=Math.hypot(q.x-mx,q.y-my); if(dd<bd){bd=dd;best=s;} });
  if(best.kind==='arc'){ var inside=Math.hypot(mx-best.cx,my-best.cy)<best.r; return (inside===(best.th>0))?d:-d; }
  return ((mx-best.x1)*(-(best.y2-best.y1))+(my-best.y1)*(best.x2-best.x1))>=0?d:-d;
};

// ── parâmetros ao longo da polilinha (TRIM, BREAK) ──────────────────────────
function plParamAt(e,p){ var S2=plSegs(e),bi=0,bd=1e18,bt=0; S2.forEach(function(s,k){ var t=segParam(s,p),q=segPt(s,t),d=Math.hypot(q.x-p.x,q.y-p.y); if(d<bd){bd=d;bi=k;bt=t;} }); return bi+bt; }
function plPointAt(S2,u){ var k=Math.min(S2.length-1,Math.floor(u)); return segPt(S2[k],u-k); }
// Trecho da polilinha entre os parâmetros u0<u1 → vértices com bulge
function plSubVerts(S2,u0,u1){
  var V=[],k0=Math.floor(u0),k1=Math.min(S2.length-1,Math.floor(u1-1e-12));
  for(var k=k0;k<=k1;k++){ var s=S2[k],ta=k===k0?u0-k:0,tb=k===k1?u1-k:1; if(tb-ta<1e-12) continue;
    var a=segPt(s,ta); V.push({x:a.x,y:a.y,b:s.kind==='arc'?Math.tan(s.th*(tb-ta)/4):0}); }
  var e1=plPointAt(S2,u1); V.push({x:e1.x,y:e1.y,b:0}); return V;
}
function plFromVerts(src,V,keepId){
  var P=V.map(function(p){var q={x:p.x,y:p.y}; if(Math.abs(p.b||0)>1e-12) q.b=p.b; return q;});
  return {id:keepId?src.id:uid(),tp:'pl',closed:false,pts:P,ly:src.ly,col:src.col,lw:src.lw,ld:src.ld};
}
// Remove o trecho (ua,ub) de uma polilinha; fechada vira aberta. Substitui no desenho.
function plRemoveRange(e,ua,ub){
  var S2=plSegs(e),N=S2.length,pieces=[];
  if(e.closed){ var V=plSubVerts(S2,ub,N).concat(plSubVerts(S2,0,ua).slice(1)); if(V.length>=2) pieces.push(plFromVerts(e,V,true)); }
  else { if(ua>1e-9){ var A=plSubVerts(S2,0,ua); if(A.length>=2) pieces.push(plFromVerts(e,A,true)); }
    if(ub<N-1e-9){ var B=plSubVerts(S2,ub,N); if(B.length>=2) pieces.push(plFromVerts(e,B,!pieces.length)); } }
  var i=S.ents.indexOf(e); if(i<0) return;
  S.ents.splice.apply(S.ents,[i,1].concat(pieces));
}
function plTrimArcs(tgt,pick,cutters){
  var S2=plSegs(tgt),N=S2.length,us=[];
  cutters.forEach(function(id){ var c=findE(id); if(!c||c.id===tgt.id) return;
    S2.forEach(function(s,k){ (_p2.entIntersectSnap(segPart(s),c)||[]).forEach(function(q){ us.push(k+segParam(s,q)); }); }); });
  if(!us.length) return false;
  us.sort(function(a,b){return a-b;});
  var up=plParamAt(tgt,pick),lo=null,hi=null;
  us.forEach(function(u){ if(u<up-1e-9) lo=u; else if(u>up+1e-9&&hi===null) hi=u; });
  snapshot();
  if(tgt.closed){
    if(us.length<2){ S.undos.pop(); return false; }
    if(lo===null) lo=us[us.length-1]-N; if(hi===null) hi=us[0]+N;
    var a0=((hi%N)+N)%N,len=(((lo-hi)%N)+N)%N;
    var V=a0+len<=N?plSubVerts(S2,a0,a0+len):plSubVerts(S2,a0,N).concat(plSubVerts(S2,0,a0+len-N).slice(1));
    var i=S.ents.indexOf(tgt); S.ents.splice(i,1,plFromVerts(tgt,V,true));
  } else plRemoveRange(tgt,lo===null?0:lo,hi===null?N:hi);
  renderAll(); return true;
}
doTrim=function(tgt,pick,cutters){ if(plHasArc(tgt)) return plTrimArcs(tgt,pick,cutters); return _p2.doTrim(tgt,pick,cutters); };
doExtend=function(tgt,pick,bounds){
  if(plHasArc(tgt)){ var S2=plSegs(tgt),first=S2[0],last=S2[S2.length-1],atStart=Math.hypot(pick.x-first.x1,pick.y-first.y1)<Math.hypot(pick.x-last.x2,pick.y-last.y2);
    if((atStart?first:last).kind==='arc'){ log('EXTEND: estender ponta em arco de polilinha ainda não é suportado.','inf'); return false; } }
  return _p2.doExtend(tgt,pick,bounds);
};

// ── conversões ─────────────────────────────────────────────────────────────
function toPlPiece(e){ // linha, arco ou polilinha aberta → vértices com bulge
  if(e.tp==='line') return [{x:e.x1,y:e.y1,b:0},{x:e.x2,y:e.y2,b:0}];
  if(e.tp==='arc'){ var sw=((e.ea-e.sa)%(2*Math.PI)+2*Math.PI)%(2*Math.PI); if(sw<1e-9) return null;
    return [{x:e.cx+e.r*Math.cos(e.sa),y:e.cy+e.r*Math.sin(e.sa),b:Math.tan(sw/4)},{x:e.cx+e.r*Math.cos(e.ea),y:e.cy+e.r*Math.sin(e.ea),b:0}]; }
  if(e.tp==='pl'&&!e.closed) return e.pts.map(function(p){return {x:p.x,y:p.y,b:p.b||0};});
  return null;
}
function revPiece(V){ var n=V.length,o=[]; for(var i=n-1;i>=0;i--) o.push({x:V[i].x,y:V[i].y,b:i>0?-(V[i-1].b||0):0}); return o; }
var JOIN_TOL=1e-6;
function ptEq(a,b){ return Math.hypot(a.x-b.x,a.y-b.y)<=JOIN_TOL*Math.max(1,Math.abs(a.x)+Math.abs(a.y)); }
// Encadeia peças a partir de uma fonte. Retorna {verts, used:[ids], closed}
function chainJoin(src,others){
  var V=toPlPiece(src); if(!V) return null;
  var used=[],pool=others.slice(),grew=true;
  while(grew){ grew=false;
    for(var i=0;i<pool.length;i++){ var o=pool[i],P=toPlPiece(o); if(!P) continue;
      var head=V[0],tail=V[V.length-1],ph=P[0],pt=P[P.length-1],add=null,front=false;
      if(ptEq(tail,ph)) add=P; else if(ptEq(tail,pt)) add=revPiece(P); else if(ptEq(head,pt)){ add=P; front=true; } else if(ptEq(head,ph)){ add=revPiece(P); front=true; }
      if(add){ if(front){ V=add.slice(0,-1).concat(V); } else { V[V.length-1].b=add[0].b; V=V.concat(add.slice(1)); }
        used.push(o.id); pool.splice(i,1); grew=true; break; } } }
  var closed=V.length>2&&ptEq(V[0],V[V.length-1]);
  if(closed) V[V.length-1]={x:V[0].x,y:V[0].y,b:0};
  return {verts:V,used:used,closed:closed};
}
function applyChain(src,res){
  var P=res.verts.map(function(p){var q={x:p.x,y:p.y}; if(Math.abs(p.b||0)>1e-12) q.b=p.b; return q;});
  var pl={id:src.id,tp:'pl',closed:res.closed,pts:P,ly:src.ly,col:src.col,lw:src.lw,ld:src.ld};
  var i=S.ents.indexOf(src); S.ents[i]=pl;
  S.ents=S.ents.filter(function(e){return res.used.indexOf(e.id)<0;});
  return pl;
}

// ── JOIN (J) ───────────────────────────────────────────────────────────────
function joinCollinear(list){
  if(!list.every(function(e){return e.tp==='line';})) return null;
  var a=list[0],dx=a.x2-a.x1,dy=a.y2-a.y1,l=Math.hypot(dx,dy),ux=dx/l,uy=dy/l,tol=1e-6*(1+l);
  var ts=[];
  for(var i=0;i<list.length;i++){ var e=list[i];
    var d1=Math.abs((e.x1-a.x1)*uy-(e.y1-a.y1)*ux),d2=Math.abs((e.x2-a.x1)*uy-(e.y2-a.y1)*ux); if(d1>tol||d2>tol) return null;
    ts.push((e.x1-a.x1)*ux+(e.y1-a.y1)*uy,(e.x2-a.x1)*ux+(e.y2-a.y1)*uy); }
  var t0=Math.min.apply(null,ts),t1=Math.max.apply(null,ts);
  return {x1:a.x1+ux*t0,y1:a.y1+uy*t0,x2:a.x1+ux*t1,y2:a.y1+uy*t1};
}
function joinConcentric(list){
  if(!list.every(function(e){return e.tp==='arc';})) return null;
  var a=list[0],tol=1e-6*(1+a.r);
  if(!list.every(function(e){return Math.hypot(e.cx-a.cx,e.cy-a.cy)<tol&&Math.abs(e.r-a.r)<tol;})) return null;
  var iv=list.map(function(e){var s=((e.sa%(2*Math.PI))+2*Math.PI)%(2*Math.PI),w=((e.ea-e.sa)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);return [s,s+w];}).sort(function(p,q){return p[0]-q[0];});
  var m=[iv[0].slice()]; iv.slice(1).forEach(function(v){ var L=m[m.length-1]; if(v[0]<=L[1]+1e-9) L[1]=Math.max(L[1],v[1]); else m.push(v.slice()); });
  if(m.length>1&&m[m.length-1][1]>=m[0][0]+2*Math.PI-1e-9){ var L2=m.pop(); m[0]=[L2[0],m[0][1]+2*Math.PI]; }
  var cov=m.reduce(function(s,v){return s+v[1]-v[0];},0);
  if(cov>=2*Math.PI-1e-9) return {full:true};
  var big=0,gi=0; for(var k=0;k<m.length;k++){ var nx=m[(k+1)%m.length],g=((nx[0]-m[k][1])%(2*Math.PI)+2*Math.PI)%(2*Math.PI); if(g>big){big=g;gi=k;} }
  return {sa:m[(gi+1)%m.length][0],ea:m[gi][1]};
}
NC.join={needSel:true,prompt:function(){return '';},click:function(){},input:function(){return true;},
  afterSel:function(ds){
    var list=ds.ids.map(findE).filter(Boolean);
    if(list.length<2){ log('JOIN: selecione pelo menos dois objetos.','er'); ncEnd(); return; }
    var src=list[0];
    var L=joinCollinear(list);
    if(L){ snapshot(); src.x1=L.x1;src.y1=L.y1;src.x2=L.x2;src.y2=L.y2; S.ents=S.ents.filter(function(e){return e===src||ds.ids.indexOf(e.id)<0;}); log('JOIN: '+list.length+' linhas colineares unidas em uma.','ok'); ncEnd(); return; }
    var A=joinConcentric(list);
    if(A){ snapshot(); if(A.full){ var c={id:src.id,tp:'circ',cx:src.cx,cy:src.cy,r:src.r,ly:src.ly,col:src.col,lw:src.lw,ld:src.ld}; S.ents[S.ents.indexOf(src)]=c; }
      else { src.sa=A.sa; src.ea=A.ea; }
      S.ents=S.ents.filter(function(e){return e.id===src.id||ds.ids.indexOf(e.id)<0;}); log('JOIN: '+list.length+' arcos unidos'+(A.full?' em um círculo':'')+'.','ok'); ncEnd(); return; }
    var srcPiece=list.filter(function(e){return toPlPiece(e);})[0]; if(!srcPiece){ log('JOIN: objetos não podem ser unidos.','er'); ncEnd(); return; }
    var res=chainJoin(srcPiece,list.filter(function(e){return e!==srcPiece;}));
    if(!res||!res.used.length){ log('JOIN: nenhuma extremidade coincidente; nada unido.','er'); ncEnd(); return; }
    snapshot(); applyChain(srcPiece,res);
    log('JOIN: '+(res.used.length+1)+' objeto(s) unido(s) em uma polilinha'+(res.closed?' fechada':'')+(list.length-res.used.length-1>0?' ('+(list.length-res.used.length-1)+' sem conexão)':'')+'.','ok');
    ncEnd();
  }};

// ── PEDIT (PE) ─────────────────────────────────────────────────────────────
NC.pedit={
  init:function(ds){ ds.phase='pick'; },
  prompt:function(ds){ var e=ds.id&&findE(ds.id);
    return {pick:'PEDIT Selecione a polilinha:',conv:'O objeto selecionado não é uma polilinha. Deseja transformá-lo em uma? <S>:',
      opt:'Insira uma opção ['+(e&&e.closed?'Abrir':'Fechar')+'/Unir(J)/Decurvar/Inverter/Desfazer] <Sair>:',join:'Selecione objetos a unir (Enter conclui):'}[ds.phase]; },
  click:function(ds,pt){
    if(ds.phase==='pick'){
      var h=null; for(var i=S.ents.length-1;i>=0;i--){ var e=S.ents[i]; if(['pl','rect','line','arc'].indexOf(e.tp)>=0&&ncEditable(e)&&hitEnt(e,pt.x,pt.y)){h=e;break;} }
      if(!h){ log('Selecione uma polilinha, retângulo, linha ou arco.','inf'); return; }
      ds.id=h.id; S.sel=[h.id];
      if(h.tp==='rect'){ snapshot(); rectToPl(h); ds.done++; }
      ds.phase=(h.tp==='line'||h.tp==='arc')?'conv':'opt'; return;
    }
    if(ds.phase==='join'){ var hj=null; for(var j=S.ents.length-1;j>=0;j--){ var o=S.ents[j]; if(o.id!==ds.id&&toPlPiece(o)&&ncEditable(o)&&hitEnt(o,pt.x,pt.y)){hj=o;break;} }
      if(hj&&ds.jids.indexOf(hj.id)<0){ ds.jids.push(hj.id); S.sel=[ds.id].concat(ds.jids); } }
  },
  input:function(ds,u){
    var e=findE(ds.id);
    if(ds.phase==='pick') return u===''?(ncEnd(),true):false;
    if(ds.phase==='conv'){ if(u===''||u==='S'||u==='Y'||u==='SIM'){ snapshot(); var V=toPlPiece(e); var pl=applyChain(e,{verts:V,used:[],closed:false}); ds.done++; ds.id=pl.id; ds.phase='opt'; log('Convertido em polilinha.','ok'); return true; }
      if(u==='N'||u==='NAO'||u==='NÃO'){ ncEnd(); return true; } return false; }
    if(ds.phase==='join'){
      if(u!=='') return false;
      if(!ds.jids.length){ ds.phase='opt'; return true; }
      if(e.closed){ log('PEDIT Unir: a polilinha está fechada.','er'); ds.phase='opt'; return true; }
      var res=chainJoin(e,ds.jids.map(findE).filter(Boolean));
      if(res&&res.used.length){ snapshot(); applyChain(e,res); ds.done++; log(res.used.length+' segmento(s) adicionado(s) à polilinha.','ok'); } else log('Nenhum objeto com extremidade coincidente.','er');
      ds.phase='opt'; S.sel=[ds.id]; return true;
    }
    // opções
    if(u===''||u==='X'||u==='S'||u==='SAIR'){ ncEnd(); return true; }
    if((u==='F'||u==='C'||u==='FECHAR'||u==='CLOSE')&&!e.closed){ snapshot(); e.closed=true; if(!plIsDup(e)) e.pts.push({x:e.pts[0].x,y:e.pts[0].y}); ds.done++; log('Polilinha fechada.','ok'); return true; }
    if((u==='A'||u==='O'||u==='ABRIR'||u==='OPEN')&&e.closed){ snapshot(); if(plIsDup(e)) e.pts.pop(); e.closed=false; ds.done++; log('Polilinha aberta.','ok'); return true; }
    if(u==='J'||u==='UNIR'||u==='JOIN'){ ds.phase='join'; ds.jids=[]; return true; }
    if(u==='D'||u==='DECURVAR'||u==='DECURVE'){ snapshot(); e.pts.forEach(function(p){delete p.b;}); ds.done++; log('Arcos removidos (segmentos retos).','ok'); return true; }
    if(u==='I'||u==='R'||u==='INVERTER'||u==='REVERSE'){ snapshot(); var dup=e.closed&&plIsDup(e),V=e.pts.map(function(p){return {x:p.x,y:p.y,b:p.b||0};}),Rv=revPiece(V);
      e.pts=Rv.map(function(p){var q={x:p.x,y:p.y}; if(Math.abs(p.b)>1e-12) q.b=p.b; return q;}); ds.done++; log('Sentido da polilinha invertido.','ok'); return true; }
    if(u==='U'||u==='DESFAZER'||u==='UNDO'){ if(ds.done>0){ undo(); ds.done--; S.ds=ds; if(!findE(ds.id)){ ncEnd(); } } else log('Nada para desfazer.','inf'); return true; }
    return false;
  },
  preview:function(ctx,ds,hp){ if(ds.phase==='pick'){ for(var i=S.ents.length-1;i>=0;i--){ var e=S.ents[i]; if(['pl','rect','line','arc'].indexOf(e.tp)>=0&&hitEnt(e,hp.x,hp.y)){ var c=JSON.parse(JSON.stringify(e)); c.col='#f5a623'; c.lw=2; drawE(ctx,c,false); break; } } } }
};

// ── BREAK (BR) ─────────────────────────────────────────────────────────────
function breakApply(e,p1,p2){
  var same=Math.hypot(p1.x-p2.x,p1.y-p2.y)<1e-9,i=S.ents.indexOf(e),out=null;
  if(e.tp==='line'){ var dx=e.x2-e.x1,dy=e.y2-e.y1,l2=dx*dx+dy*dy,tp=function(p){return Math.max(0,Math.min(1,((p.x-e.x1)*dx+(p.y-e.y1)*dy)/l2));},t1=tp(p1),t2=tp(p2),a=Math.min(t1,t2),b=Math.max(t1,t2);
    out=[]; if(a>1e-9) out.push(Object.assign(JSON.parse(JSON.stringify(e)),{x2:e.x1+dx*a,y2:e.y1+dy*a}));
    if(b<1-1e-9) out.push(Object.assign(JSON.parse(JSON.stringify(e)),{id:out.length?uid():e.id,x1:e.x1+dx*b,y1:e.y1+dy*b})); }
  else if(e.tp==='circ'){ if(same) return 'Um círculo não pode ser interrompido em um único ponto.';
    var a1=Math.atan2(p1.y-e.cy,p1.x-e.cx),a2=Math.atan2(p2.y-e.cy,p2.x-e.cx);
    out=[{id:e.id,tp:'arc',cx:e.cx,cy:e.cy,r:e.r,sa:a2,ea:a1,ly:e.ly,col:e.col,lw:e.lw,ld:e.ld}]; }
  else if(e.tp==='arc'){ var sw=((e.ea-e.sa)%(2*Math.PI)+2*Math.PI)%(2*Math.PI),pr=function(p){var d=((Math.atan2(p.y-e.cy,p.x-e.cx)-e.sa)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);return Math.min(d,sw);};
    var u1=pr(p1),u2=pr(p2),lo=Math.min(u1,u2),hi=Math.max(u1,u2); out=[];
    if(lo>1e-9) out.push(Object.assign(JSON.parse(JSON.stringify(e)),{ea:e.sa+lo}));
    if(hi<sw-1e-9) out.push(Object.assign(JSON.parse(JSON.stringify(e)),{id:out.length?uid():e.id,sa:e.sa+hi})); }
  else if(e.tp==='pl'||e.tp==='rect'){ if(e.tp==='rect') rectToPl(e);
    var ua=plParamAt(e,p1),ub=plParamAt(e,p2),N=plSegs(e).length;
    if(e.closed&&same) return 'Use dois pontos para interromper uma polilinha fechada.';
    var lo2=Math.min(ua,ub),hi2=Math.max(ua,ub);
    if(e.closed){ plRemoveRange(e,lo2,hi2); return null; }
    if(same){ var S2=plSegs(e),A=plSubVerts(S2,0,ua),B=plSubVerts(S2,ua,N); out=[]; if(A.length>=2) out.push(plFromVerts(e,A,true)); if(B.length>=2) out.push(plFromVerts(e,B,!out.length)); }
    else { plRemoveRange(e,lo2,hi2); return null; } }
  else return 'Tipo de objeto não suportado pelo BREAK.';
  S.ents.splice.apply(S.ents,[i,1].concat(out||[]));
  return null;
}
function nearOn(e,p){ if(e.tp==='pl'||e.tp==='rect'){ var tmp=e.tp==='rect'?(function(){var c=JSON.parse(JSON.stringify(e));rectToPl(c);return c;})():e,S2=plSegs(tmp),u=plParamAt(tmp,p); return plPointAt(S2,u); } return nearestOn(e,p.x,p.y)||p; }
NC['break']={
  init:function(ds){ ds.phase='pick'; },
  prompt:function(ds){ return {pick:'BREAK Selecione o objeto:',p2:'Especifique o segundo ponto de interrupção ou [Primeiro ponto] (@ = mesmo ponto):',p1:'Especifique o primeiro ponto de interrupção:',p2b:'Especifique o segundo ponto de interrupção (@ = mesmo ponto):'}[ds.phase]; },
  click:function(ds,pt){
    if(ds.phase==='pick'){ var h=null; for(var i=S.ents.length-1;i>=0;i--){ var e=S.ents[i]; if(['line','arc','circ','pl','rect'].indexOf(e.tp)>=0&&ncEditable(e)&&hitEnt(e,pt.x,pt.y)){h=e;break;} }
      if(!h){ log('Selecione linha, arco, círculo, polilinha ou retângulo.','inf'); return; } ds.id=h.id; S.sel=[h.id]; ds.p1=nearOn(h,pt); ds.phase='p2'; return; }
    if(ds.phase==='p1'){ ds.p1=nearOn(findE(ds.id),pt); ds.phase='p2b'; return; }
    if(ds.phase==='p2'||ds.phase==='p2b'){ this.apply(ds,nearOn(findE(ds.id),pt)); }
  },
  apply:function(ds,p2){ var e=findE(ds.id); snapshot(); var err=breakApply(e,ds.p1,p2); if(err){ S.undos.pop(); log('BREAK: '+err,'er'); return; } log('BREAK: objeto interrompido.','ok'); ncEnd(); },
  input:function(ds,u,raw){
    if(ds.phase==='pick'){ if(u===''){ ncEnd(); return true; } return false; }
    if(ds.phase==='p2'&&(u==='P'||u==='F'||u==='PRIMEIRO'||u==='FIRST')){ ds.phase='p1'; return true; }
    if((ds.phase==='p2'||ds.phase==='p2b')&&(u==='@'||u==='')){ this.apply(ds,ds.p1); return true; }
    var p=parseCoord(raw); if(!p) return false; this.click(ds,p); return true;
  },
  preview:function(ctx,ds,hp){
    var e=ds.id&&findE(ds.id); if(!e) return;
    var m=function(p,col){ var s=w2s(p.x,p.y); ctx.save(); ctx.fillStyle=col; ctx.fillRect(s.x-4,s.y-4,8,8); ctx.restore(); };
    if(ds.p1) m(ds.p1,'#e85050'); if(ds.phase==='p2'||ds.phase==='p2b'||ds.phase==='p1') m(nearOn(e,hp),'#f5a623');
  }
};

// ── STRETCH (S) ────────────────────────────────────────────────────────────
function inWins(p,wins){ return wins.some(function(r){return p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;}); }
function stretchEnt(e,wins,dx,dy,whole){
  if(whole){ transl(e,dx,dy); return; }
  var mv=function(o,kx,ky){ if(inWins({x:o[kx],y:o[ky]},wins)){ o[kx]+=dx; o[ky]+=dy; return true; } return false; };
  switch(e.tp){
    case 'line': mv(e,'x1','y1'); mv(e,'x2','y2'); break;
    case 'rect': case 'hatch': { var c=[[e.x,e.y],[e.x+e.w,e.y],[e.x+e.w,e.y+e.h],[e.x,e.y+e.h]].filter(function(q){return inWins({x:q[0],y:q[1]},wins);}).length;
      if(c===4) transl(e,dx,dy); else if(c>0&&e.tp==='rect'){ rectToPl(e); stretchEnt(e,wins,dx,dy,false); } break; }
    case 'pl': case 'spline': { var dup=e.tp==='pl'&&plIsDup(e),P=e.pts; for(var i=0;i<P.length;i++){ if(dup&&i===P.length-1) continue; if(inWins(P[i],wins)){ P[i].x+=dx;P[i].y+=dy; if(dup&&i===0){P[P.length-1].x+=dx;P[P.length-1].y+=dy;} } } break; }
    case 'circ': case 'ell': if(inWins({x:e.cx,y:e.cy},wins)) transl(e,dx,dy); break;
    case 'arc': { var a={x:e.cx+e.r*Math.cos(e.sa),y:e.cy+e.r*Math.sin(e.sa)},b={x:e.cx+e.r*Math.cos(e.ea),y:e.cy+e.r*Math.sin(e.ea)};
      if(inWins(a,wins)&&inWins(b,wins)) transl(e,dx,dy); break; }
    case 'txt': if(inWins({x:e.x,y:e.y},wins)) transl(e,dx,dy); break;
    case 'dim': normDimLegacy(e); mv(e,'x1','y1'); mv(e,'x2','y2'); mv(e,'px','py'); break;
    case 'dimr': case 'dimd': mv(e,'cx','cy'); mv(e,'ex','ey'); break;
    case 'dima': mv(e,'vx','vy'); mv(e,'x1','y1'); mv(e,'x2','y2'); if(e.px!==undefined) mv(e,'px','py'); break;
  }
}
NC.stretch={needSel:true,afterSel:function(ds){ ds.wins=ds.wins||[]; ds.phase='base'; if(!ds.wins.length) log('STRETCH: sem janela cruzando, os objetos serão apenas movidos.','inf'); },
  prompt:function(ds){ return {base:'STRETCH Especifique o ponto base ou [Deslocamento] <Deslocamento>:',dest:'Especifique o segundo ponto ou <usar o primeiro ponto como deslocamento>:',disp:'Especifique o deslocamento <0,0>:'}[ds.phase]; },
  apply:function(ds,dx,dy){ ncSnapshotApply(function(){ var whole=!ds.wins.length; ds.ids.map(findE).forEach(function(e){ if(e) stretchEnt(e,ds.wins,dx,dy,whole); }); }); log('STRETCH: '+ds.ids.length+' objeto(s) esticado(s)/movido(s).','ok'); ncEnd(); },
  click:function(ds,pt){ if(ds.phase==='base'){ ds.base={x:pt.x,y:pt.y}; ds.pts=[ds.base]; ds.phase='dest'; return; } if(ds.phase==='dest') this.apply(ds,pt.x-ds.base.x,pt.y-ds.base.y); },
  input:function(ds,u,raw){
    if(ds.phase==='base'){ if(u===''||u==='D'){ ds.phase='disp'; return true; } var p=parseCoord(raw); if(!p) return false; this.click(ds,p); return true; }
    if(ds.phase==='disp'){ if(u===''){ ncEnd(); return true; } var d=mcDispVec(raw); if(!d) return false; this.apply(ds,d.x,d.y); return true; }
    if(ds.phase==='dest'){ if(u===''){ this.apply(ds,ds.base.x,ds.base.y); return true; } var q=ncPointFrom(raw,ds.base); if(!q) return false; this.click(ds,q); return true; }
    return false;
  },
  preview:function(ctx,ds,hp){ if(ds.phase!=='dest') return; ncRubber(ctx,ds.base,hp); var whole=!ds.wins.length;
    ncGhost(ctx,ds.ids,function(c){ stretchEnt(c,ds.wins,hp.x-ds.base.x,hp.y-ds.base.y,whole); }); }
};

// ── PLINE com arcos: opções [Arco/Linha/Fechar/Desfazer] ────────────────────
function plineTangent(ds){
  var P=ds.pts,n=P.length; if(n<2) return {x:1,y:0};
  var a=P[n-2],c=P[n-1],b=a.b||0;
  if(Math.abs(b)<1e-12){ var dx=c.x-a.x,dy=c.y-a.y,l=Math.hypot(dx,dy)||1; return {x:dx/l,y:dy/l}; }
  var A=bulgeArc(a,c,b),a2=A.a1+A.th; return A.th>0?{x:-Math.sin(a2),y:Math.cos(a2)}:{x:Math.sin(a2),y:-Math.cos(a2)};
}
function plineArcBulge(ds,pt){
  var P0=ds.pts[ds.pts.length-1],t=plineTangent(ds),cx=pt.x-P0.x,cy=pt.y-P0.y;
  var ang=Math.atan2(t.x*cy-t.y*cx,t.x*cx+t.y*cy); return Math.tan(ang/2);
}
function plinePrompt(ds){ logp('PLINE Especifique o próximo ponto ou [Arco/Linha/Fechar/Desfazer] — modo '+(ds.arcMode?'ARCO':'LINHA')+' (Enter conclui):'); }
function plineClick(pt){
  var ds=S.ds,P0=ds.pts[ds.pts.length-1]; if(Math.hypot(pt.x-P0.x,pt.y-P0.y)<1e-9) return;
  P0.b=plineArcBulge(ds,pt); if(Math.abs(P0.b)<1e-12) delete P0.b;
  ds.pts.push({x:pt.x,y:pt.y}); plinePrompt(ds); renderAll();
}
function plineOption(v){
  var ds=S.ds,u=String(v).trim().toUpperCase();
  if(u==='A'||u==='ARCO'||u==='ARC'){ ds.arcMode=true; plinePrompt(ds); return true; }
  if(u==='L'||u==='LINHA'||u==='LINE'){ ds.arcMode=false; plinePrompt(ds); return true; }
  if(u==='U'||u==='DESFAZER'||u==='UNDO'){ if(ds.pts.length>1){ ds.pts.pop(); delete ds.pts[ds.pts.length-1].b; } plinePrompt(ds); renderAll(); return true; }
  if(u==='F'||u==='C'||u==='FECHAR'||u==='CLOSE'){
    if(ds.pts.length<2){ log('São necessários pelo menos 2 pontos.','er'); return true; }
    var first=ds.pts[0]; if(ds.arcMode){ var b=plineArcBulge(ds,first); if(Math.abs(b)>1e-12) ds.pts[ds.pts.length-1].b=b; }
    ds.pts.push({x:first.x,y:first.y});
    addE({tp:'pl',pts:ds.pts.slice(),closed:true}); S.lastTool='polyline'; log('Polilinha fechada com '+(ds.pts.length-1)+' vértices.','ok'); S.ds=null; renderAll(); logp('PLINE: 1° ponto:'); return true;
  }
  return false;
}
function drawPlinePreview(ctx,hp){
  var ds=S.ds,P=ds.pts.map(function(p){return {x:p.x,y:p.y,b:p.b};});
  var last=P[P.length-1]; if(ds.arcMode){ var b=plineArcBulge(ds,hp); if(Math.abs(b)>1e-12) last.b=b; }
  P.push({x:hp.x,y:hp.y});
  ctx.save(); ctx.strokeStyle='#4d9ef7'; ctx.lineWidth=1.5; ctx.setLineDash([]); plTrace(ctx,{tp:'pl',pts:P,closed:false},w2s,S.vp.sc); ctx.stroke(); ctx.restore();
}


