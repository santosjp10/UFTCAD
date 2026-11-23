/* ═══════════════════════════════════════════════════════════════════
   v7.2 — PACOTE 3: HACHURA POR CONTORNO, BLOCOS, MTEXT, LEADER,
   IMPORTAÇÃO DE DXF E SELEÇÃO CRUZANDO PELA GEOMETRIA REAL
   ═══════════════════════════════════════════════════════════════════ */
if(!S.blocks) S.blocks={};
var _p3={drawE:drawE,hitEnt:hitEnt,snapPts:snapPts,bbox:bbox,transl:transl,xformE:xformE,getGrips:getGrips,stretchGrip:stretchGrip,
  entPrims:entPrims,geomFields:geomFields,explodeSel:explodeSel,collectExport:collectExport,buildDXF2000:buildDXF2000,buildDXF:buildDXF,buildSVG:buildSVG};
var TP_NAMES_EXTRA={mtext:'Texto múltiplo (MTEXT)',insert:'Bloco (INSERT)',leader:'Linha de chamada (LEADER)'};
for(var _k in TP_NAMES_EXTRA) TP_NAMES[_k]=TP_NAMES_EXTRA[_k];

// ── Segmentos aproximados de qualquer objeto (seleção cruzando, contornos) ───
function arcPts(cx,cy,r,sa,sw,step){ var n=Math.max(2,Math.ceil(Math.abs(sw)/(step||Math.PI/32))),o=[]; for(var i=0;i<=n;i++){ var a=sa+sw*i/n; o.push({x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)}); } return o; }
function polySegs(P,closed){ var o=[]; for(var i=1;i<P.length;i++) o.push([P[i-1].x,P[i-1].y,P[i].x,P[i].y]); if(closed&&P.length>2) o.push([P[P.length-1].x,P[P.length-1].y,P[0].x,P[0].y]); return o; }
function geoSegs(e,depth){
  depth=depth||0;
  switch(e.tp){
    case 'line': return [[e.x1,e.y1,e.x2,e.y2]];
    case 'circ': return polySegs(arcPts(e.cx,e.cy,e.r,0,2*Math.PI),false);
    case 'arc': return polySegs(arcPts(e.cx,e.cy,e.r,e.sa,((e.ea-e.sa)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)||2*Math.PI),false);
    case 'ell': return polySegs(ellPoints(e,72),false);
    case 'spline': return polySegs(splinePoints(e,12),false);
    case 'pl': return polySegs(plHasArc(e)?plSample(e,24):e.pts,!!e.closed&&!plIsDup(e));
    case 'rect': return polySegs([{x:e.x,y:e.y},{x:e.x+e.w,y:e.y},{x:e.x+e.w,y:e.y+e.h},{x:e.x,y:e.y+e.h}],true);
    case 'txt': return polySegs(txtCorners(e),true);
    case 'mtext': return polySegs(mtCorners(e),true);
    case 'hatch': return e.loops?[].concat.apply([],e.loops.map(function(L){return polySegs(L,true);})):polySegs([{x:e.x,y:e.y},{x:e.x+e.w,y:e.y},{x:e.x+e.w,y:e.y+e.h},{x:e.x,y:e.y+e.h}],true);
    case 'insert': return depth>8?[]:[].concat.apply([],insertExpand(e,depth).map(function(c){return geoSegs(c,depth+1);}));
    case 'leader': case 'dim': case 'dimr': case 'dimd': case 'dima': {
      var P=e.tp==='leader'?leaderPrims(e):dimPrims(e),o=[];
      P.forEach(function(p){ if(p.k==='line') o.push([p.x1,p.y1,p.x2,p.y2]); else if(p.k==='text') o=o.concat(polySegs(txtCorners({x:p.x,y:p.y,h:p.h,rot:p.rot,txt:p.txt}),true)); else if(p.k==='arc') o=o.concat(polySegs(arcPts(p.cx,p.cy,p.r,p.sa,((p.ea-p.sa)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)),false)); });
      return o; }
  }
  var b=bbox(e); return b?polySegs([{x:b.x,y:b.y},{x:b.x+b.w,y:b.y},{x:b.x+b.w,y:b.y+b.h},{x:b.x,y:b.y+b.h}],true):[];
}
function entCrossesRect(e,r){ return geoSegs(e).some(function(s){ return !!clipSegRect(s[0],s[1],s[2],s[3],r); }); }

// ── MTEXT ──────────────────────────────────────────────────────────────────
var MT_CW=0.6, MT_LS=1.6667;
function mtLines(e){
  var out=[],maxc=e.w>0?Math.max(1,Math.floor(e.w/(MT_CW*e.h))):1e9;
  String(e.txt||'').split('\n').forEach(function(par){
    if(par.length<=maxc){ out.push(par); return; }
    var words=par.split(' '),cur='';
    words.forEach(function(w){ while(w.length>maxc){ if(cur){out.push(cur);cur='';} out.push(w.slice(0,maxc)); w=w.slice(maxc); }
      if(!cur) cur=w; else if((cur+' '+w).length<=maxc) cur+=' '+w; else { out.push(cur); cur=w; } });
    out.push(cur);
  });
  return out;
}
function mtLayout(e){ // linhas em coordenadas locais (antes da rotação), relativas ao ponto de inserção
  var L=mtLines(e),h=e.h,ls=MT_LS*h,n=L.length,H=(n-1)*ls+h,W=e.w>0?e.w:Math.max.apply(null,L.map(function(s){return s.length;}).concat([1]))*MT_CW*h;
  var att=e.att||1,col=(att-1)%3,row=Math.floor((att-1)/3);
  var y0=row===0?-h:row===1?H/2-h:(n-1)*ls; // linha de base da 1ª linha
  var align=['left','center','right'][col];
  var left=col===0?0:col===1?-W/2:-W,top=row===0?0:row===1?H/2:H;
  return {lines:L.map(function(t,i){return {txt:t,lx:0,ly:y0-i*ls,align:align};}),W:W,H:H,left:left,top:top};
}
function mtLocalToWorld(e,lx,ly){ var r=e.rot||0,c=Math.cos(r),s=Math.sin(r); return {x:e.x+lx*c-ly*s,y:e.y+lx*s+ly*c}; }
function mtCorners(e){ var Lo=mtLayout(e); return [[Lo.left,Lo.top],[Lo.left+Lo.W,Lo.top],[Lo.left+Lo.W,Lo.top-Lo.H],[Lo.left,Lo.top-Lo.H]].map(function(q){return mtLocalToWorld(e,q[0],q[1]);}); }
function mtPrims(e){ var Lo=mtLayout(e); return Lo.lines.filter(function(l){return l.txt;}).map(function(l){ var p=mtLocalToWorld(e,l.lx,l.ly); return {k:'text',x:p.x,y:p.y,h:e.h,rot:e.rot||0,txt:l.txt,align:l.align}; }); }
function drawTextPrims(ctx,prims,col,map,sc,minPx){
  prims.forEach(function(p){ var q=map(p.x,p.y),fs=Math.max(minPx||0,p.h*sc); if(fs<1) return;
    ctx.save(); ctx.translate(q.x,q.y); ctx.rotate(-(p.rot||0)); ctx.fillStyle=col; ctx.font=fs+'px Consolas,monospace'; ctx.textAlign=p.align||'left'; ctx.textBaseline='alphabetic'; ctx.fillText(p.txt,0,0); ctx.restore(); });
}

// ── LEADER ─────────────────────────────────────────────────────────────────
function leaderPrims(e,stO){
  var st=stO||dimStyleOf(e),ds=st.annot?1/annoK():(st.dimscale||1),o=[],P=e.pts; if(!P||P.length<2) return o;
  for(var i=1;i<P.length;i++) o.push({k:'line',role:'dim',x1:P[i-1].x,y1:P[i-1].y,x2:P[i].x,y2:P[i].y});
  var dx=P[0].x-P[1].x,dy=P[0].y-P[1].y,l=Math.hypot(dx,dy)||1; dimArrow(o,P[0].x,P[0].y,dx/l,dy/l,st,ds);
  if(e.txt){
    var last=P[P.length-1],prev=P[P.length-2],dir=last.x>=prev.x?1:-1,land=st.arrowSize*ds,gap=st.txtGap*ds,h=e.h||st.txtH*ds;
    o.push({k:'line',role:'dim',x1:last.x,y1:last.y,x2:last.x+dir*land,y2:last.y});
    String(e.txt).split('\n').forEach(function(t,i){ if(t) o.push({k:'text',role:'text',x:last.x+dir*(land+gap),y:last.y-h/2-i*MT_LS*h,h:h,rot:0,txt:t,align:dir>0?'left':'right'}); });
  }
  return o;
}

// ── BLOCOS ─────────────────────────────────────────────────────────────────
function insertXform(c,e){ if(e.m) mirr(c,{x:0,y:0},{x:1,y:0}); var s=e.s||1; if(s!==1) scalE(c,{x:0,y:0},s); if(e.rot) rotat(c,{x:0,y:0},e.rot); transl(c,e.x,e.y); }
function insertExpand(e,depth){
  var B=S.blocks[e.name]; if(!B||(depth||0)>8) return [];
  return B.ents.map(function(c0){ var c=JSON.parse(JSON.stringify(c0)); c.id='blk_'+e.id+'_'+(c0.id||''); if(c.ly===0||c.ly===undefined) c.ly=e.ly;
    if(c.col===null||c.col===undefined) c.col=e.col; insertXform(c,e); return c; });
}
function flattenEnts(list,depth){
  depth=depth||0; var out=[];
  list.forEach(function(e){ if(e.tp==='insert'&&depth<8) out=out.concat(flattenEnts(insertExpand(e,depth).map(function(c){c.id=uid();return c;}),depth+1)); else out.push(e); });
  return out;
}

// ── HACHURA POR CONTORNO ───────────────────────────────────────────────────
function pointInPoly(p,P){ var c=false; for(var i=0,j=P.length-1;i<P.length;j=i++){ var a=P[i],b=P[j]; if(((a.y>p.y)!==(b.y>p.y))&&(p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)) c=!c; } return c; }
function pointInLoops(p,loops){ var c=false; loops.forEach(function(L){ if(pointInPoly(p,L)) c=!c; }); return c; }
function polyArea(P){ var a=0; for(var i=0;i<P.length;i++){ var q=P[(i+1)%P.length]; a+=P[i].x*q.y-q.x*P[i].y; } return a/2; }
var BOUNDARY_SKIP=['txt','mtext','hatch','dim','dimr','dimd','dima','leader'];
function boundaryFind(P){
  var segs=[];
  S.ents.forEach(function(e){ var ly=getLy(e.ly); if(ly&&!ly.vis) return; if(BOUNDARY_SKIP.indexOf(e.tp)>=0) return; geoSegs(e).forEach(function(s){ if(Math.hypot(s[2]-s[0],s[3]-s[1])>1e-9) segs.push(s); }); });
  if(!segs.length) return {err:'Nenhum objeto de contorno no desenho.'};
  // dividir nas interseções
  var bb=segs.map(function(s){return [Math.min(s[0],s[2]),Math.min(s[1],s[3]),Math.max(s[0],s[2]),Math.max(s[1],s[3])];}),T=segs.map(function(){return [0,1];});
  for(var i=0;i<segs.length;i++) for(var j=i+1;j<segs.length;j++){
    var A=bb[i],B=bb[j]; if(A[0]>B[2]+1e-9||B[0]>A[2]+1e-9||A[1]>B[3]+1e-9||B[1]>A[3]+1e-9) continue;
    var s=segs[i],q=segs[j],r=lineLineInt(s[0],s[1],s[2],s[3],q[0],q[1],q[2],q[3]);
    if(r&&r.t>-1e-9&&r.t<1+1e-9&&r.u>-1e-9&&r.u<1+1e-9){ T[i].push(Math.max(0,Math.min(1,r.t))); T[j].push(Math.max(0,Math.min(1,r.u))); }
  }
  var ext=0; segs.forEach(function(s){ ext=Math.max(ext,Math.abs(s[0]),Math.abs(s[1]),Math.abs(s[2]),Math.abs(s[3])); });
  var eps=Math.max(1e-7,ext*1e-9),nodes=[],key={},adj=[];
  function node(x,y){ var k=Math.round(x/eps)+','+Math.round(y/eps); if(key[k]===undefined){ key[k]=nodes.length; nodes.push({x:x,y:y}); adj.push([]); } return key[k]; }
  var edges=[];
  segs.forEach(function(s,i){ var ts=T[i].sort(function(a,b){return a-b;});
    for(var k=1;k<ts.length;k++){ if(ts[k]-ts[k-1]<1e-12) continue;
      var a=node(s[0]+(s[2]-s[0])*ts[k-1],s[1]+(s[3]-s[1])*ts[k-1]),b=node(s[0]+(s[2]-s[0])*ts[k],s[1]+(s[3]-s[1])*ts[k]);
      if(a!==b&&adj[a].indexOf(b)<0){ adj[a].push(b); adj[b].push(a); edges.push([a,b]); } } });
  // raio horizontal a partir do ponto
  var py=P.y+eps*7.123,best=null,bx=Infinity;
  edges.forEach(function(E){ var a=nodes[E[0]],b=nodes[E[1]]; if((a.y-py)*(b.y-py)>0||a.y===b.y) return; var x=a.x+(b.x-a.x)*(py-a.y)/(b.y-a.y); if(x>P.x&&x<bx){bx=x;best=E;} });
  if(!best) return {err:'Nenhum contorno fechado em volta do ponto.'};
  var a0=best[0],b0=best[1],A0=nodes[a0],B0=nodes[b0];
  if((B0.x-A0.x)*(P.y-A0.y)-(B0.y-A0.y)*(P.x-A0.x)<0){ var t=a0;a0=b0;b0=t; }
  var loop=[a0],u=a0,v=b0,steps=0;
  while(steps++<200000){
    loop.push(v);
    var din={x:nodes[v].x-nodes[u].x,y:nodes[v].y-nodes[u].y},cand=adj[v].filter(function(w){return w!==u;});
    if(!cand.length) cand=[u];
    var bw=cand[0],bt=-Infinity;
    cand.forEach(function(w){ var d={x:nodes[w].x-nodes[v].x,y:nodes[w].y-nodes[v].y},tu=Math.atan2(din.x*d.y-din.y*d.x,din.x*d.x+din.y*d.y); if(tu>bt){bt=tu;bw=w;} });
    u=v; v=bw;
    if(u===a0&&v===b0) break;
  }
  loop.pop();
  var poly=loop.map(function(k){return {x:nodes[k].x,y:nodes[k].y};});
  if(steps>=200000||poly.length<3||polyArea(poly)<=1e-12||!pointInPoly(P,poly)) return {err:'Contorno não fechado: verifique se as linhas se encontram (use OSNAP extremidade/interseção).'};
  // ilhas: objetos fechados inteiramente dentro, que não contêm o ponto
  var islands=[];
  S.ents.forEach(function(e){ var ly=getLy(e.ly); if(ly&&!ly.vis) return; var Q=null;
    if(e.tp==='circ') Q=arcPts(e.cx,e.cy,e.r,0,2*Math.PI).slice(0,-1);
    else if(e.tp==='ell') Q=ellPoints(e,72).slice(0,-1);
    else if(e.tp==='rect') Q=[{x:e.x,y:e.y},{x:e.x+e.w,y:e.y},{x:e.x+e.w,y:e.y+e.h},{x:e.x,y:e.y+e.h}];
    else if(e.tp==='pl'&&e.closed){ Q=plHasArc(e)?plSample(e,24):e.pts.slice(); if(plIsDup(e)||Q.length&&Math.hypot(Q[0].x-Q[Q.length-1].x,Q[0].y-Q[Q.length-1].y)<1e-9) Q.pop(); }
    if(!Q||Q.length<3||pointInPoly(P,Q)) return;
    if(Q.every(function(q){return pointInPoly(q,poly);})) islands.push(Q);
  });
  return {loops:[poly].concat(islands)};
}
function hatchLoopsBox(L){ return ptsBox([].concat.apply([],L)); }
function hatchSegsIn(e){ // linhas do padrão recortadas pelos laços (par-ímpar)
  var r=hatchLoopsBox(e.loops),ht=e.htype||'lines',sp=e.sp||5,angs=(ht==='cross'||ht==='grid')?[e.ang||0,(e.ang||0)+90]:[e.ang!==undefined?e.ang:45],out=[];
  angs.forEach(function(ag){ hatchLines(r,ag,sp).forEach(function(s){
    var ts=[]; e.loops.forEach(function(L){ for(var i=0;i<L.length;i++){ var a=L[i],b=L[(i+1)%L.length],q=lineLineInt(s[0],s[1],s[2],s[3],a.x,a.y,b.x,b.y); if(q&&q.u>=0&&q.u<1&&q.t>=0&&q.t<=1) ts.push(q.t); } });
    ts.sort(function(x,y){return x-y;});
    for(var k=0;k+1<ts.length;k+=2) out.push([s[0]+(s[2]-s[0])*ts[k],s[1]+(s[3]-s[1])*ts[k],s[0]+(s[2]-s[0])*ts[k+1],s[1]+(s[3]-s[1])*ts[k+1]]);
  }); });
  return out;
}
function drawHatchLoops(ctx,e,map,sc,col){
  ctx.save(); ctx.beginPath();
  e.loops.forEach(function(L){ L.forEach(function(p,i){ var q=map(p.x,p.y); if(i) ctx.lineTo(q.x,q.y); else ctx.moveTo(q.x,q.y); }); ctx.closePath(); });
  ctx.clip('evenodd');
  ctx.strokeStyle=col; ctx.fillStyle=col; ctx.lineWidth=0.8; var ht=e.htype||'lines';
  ctx.setLineDash(ht==='dashed'?[4,3]:ht==='dotted'?[1,3]:[]);
  var r=hatchLoopsBox(e.loops),sp=Math.max(e.sp||5,1/sc);
  if(ht==='dots'){ for(var x=r.x+sp/2;x<r.x+r.w;x+=sp) for(var y=r.y+sp/2;y<r.y+r.h;y+=sp){ var q=map(x,y); ctx.fillRect(q.x-.8,q.y-.8,1.6,1.6); } }
  else { var angs=(ht==='cross'||ht==='grid')?[e.ang||0,(e.ang||0)+90]:[e.ang!==undefined?e.ang:45];
    if(ht==='zigzag') angs=[45,-45];
    ctx.beginPath(); angs.forEach(function(ag){ hatchLines(r,ag,sp).forEach(function(s){ var a=map(s[0],s[1]),b=map(s[2],s[3]); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); }); }); ctx.stroke(); }
  ctx.restore();
}
function hatchSync(e){ var b=hatchLoopsBox(e.loops); e.x=b.x; e.y=b.y; e.w=b.w; e.h=b.h; }

// ── embrulhos das funções gerais para os novos tipos ───────────────────────
drawE=function(ctx,e,sel){
  if(e.tp==='mtext'){ ctx.save(); applyStyle(ctx,e,sel); drawTextPrims(ctx,mtPrims(e),sel?'#60b8ff':effCol(e),w2s,S.vp.sc,S.printing?0:4); ctx.restore(); return; }
  if(e.tp==='leader'){ var st=dimStyleOf(e); renderDimPrims(ctx,leaderPrims(e,st),st,w2s,S.vp.sc,{sel:sel,minTxt:S.printing?0:5}); return; }
  if(e.tp==='insert'){ var C=insertExpand(e,0); if(!C.length){ ctx.save(); var p=w2s(e.x,e.y); ctx.strokeStyle='#e85050'; ctx.beginPath(); ctx.moveTo(p.x-6,p.y-6); ctx.lineTo(p.x+6,p.y+6); ctx.moveTo(p.x+6,p.y-6); ctx.lineTo(p.x-6,p.y+6); ctx.stroke(); ctx.restore(); return; }
    C.forEach(function(c){ drawE(ctx,c,sel); }); return; }
  if(e.tp==='hatch'&&e.loops){ ctx.save(); applyStyle(ctx,e,sel); drawHatchLoops(ctx,e,w2s,S.vp.sc,sel?'#60b8ff':effCol(e)); ctx.restore(); return; }
  return _p3.drawE(ctx,e,sel);
};
hitEnt=function(e,wx,wy){
  if(['mtext','leader','insert'].indexOf(e.tp)<0&&!(e.tp==='hatch'&&e.loops)) return _p3.hitEnt(e,wx,wy);
  var ly=getLy(e.ly); if(ly&&(!ly.vis||ly.lock)) return false;
  var t=8/S.vp.sc;
  if(e.tp==='mtext') return pointInPoly({x:wx,y:wy},mtCorners(e))||polySegs(mtCorners(e),true).some(function(s){return segD(wx,wy,s[0],s[1],s[2],s[3])<t;});
  if(e.tp==='hatch') return pointInLoops({x:wx,y:wy},e.loops);
  if(e.tp==='insert') return insertExpand(e,0).some(function(c){ return hitEnt(c,wx,wy); });
  return geoSegs(e).some(function(s){return segD(wx,wy,s[0],s[1],s[2],s[3])<t;})||leaderPrims(e).some(function(p){ return p.k==='text'&&pointInPoly({x:wx,y:wy},txtCorners({x:p.align==='right'?p.x-String(p.txt).length*p.h*.6:p.x,y:p.y,h:p.h,rot:0,txt:p.txt})); });
};
snapPts=function(e){
  if(e.tp==='mtext') return [{x:e.x,y:e.y,st:'end'}];
  if(e.tp==='leader') return e.pts.map(function(p){return {x:p.x,y:p.y,st:'end'};});
  if(e.tp==='insert') return [{x:e.x,y:e.y,st:'end'}].concat([].concat.apply([],insertExpand(e,0).map(snapPts)));
  if(e.tp==='hatch'&&e.loops) return [];
  return _p3.snapPts(e);
};
bbox=function(e){
  if(e.tp==='mtext') return ptsBox(mtCorners(e));
  if(e.tp==='leader'){ var pts=[]; geoSegs(e).forEach(function(s){pts.push({x:s[0],y:s[1]},{x:s[2],y:s[3]});}); return ptsBox(pts); }
  if(e.tp==='insert'){ var C=insertExpand(e,0),bs=C.map(bbox).filter(Boolean); if(!bs.length) return {x:e.x,y:e.y,w:0,h:0};
    var p=[]; bs.forEach(function(b){p.push({x:b.x,y:b.y},{x:b.x+b.w,y:b.y+b.h});}); return ptsBox(p); }
  if(e.tp==='hatch'&&e.loops) return hatchLoopsBox(e.loops);
  return _p3.bbox(e);
};
transl=function(e,dx,dy){
  if(e.tp==='mtext'||e.tp==='insert'){ e.x+=dx; e.y+=dy; return; }
  if(e.tp==='leader'){ e.pts.forEach(function(p){p.x+=dx;p.y+=dy;}); return; }
  if(e.tp==='hatch'&&e.loops){ e.loops.forEach(function(L){L.forEach(function(p){p.x+=dx;p.y+=dy;});}); hatchSync(e); return; }
  return _p3.transl(e,dx,dy);
};
xformE=function(e,fn,info){
  if(e.tp==='mtext'){ var q=fn(e.x,e.y); e.x=q.x; e.y=q.y; if(info.kind==='rot') e.rot=(e.rot||0)+info.rad; else if(info.kind==='scl'){ e.h*=info.f; e.w*=info.f; } return; }
  if(e.tp==='leader'){ e.pts=e.pts.map(function(p){return fn(p.x,p.y);}); if(info.kind==='scl'&&e.h) e.h*=info.f; return; }
  if(e.tp==='insert'){ var q2=fn(e.x,e.y); e.x=q2.x; e.y=q2.y;
    if(info.kind==='rot') e.rot=(e.rot||0)+info.rad; else if(info.kind==='scl') e.s=(e.s||1)*info.f; else { e.m=!e.m; e.rot=2*info.axisAng-(e.rot||0); } return; }
  if(e.tp==='hatch'&&e.loops){ e.loops=e.loops.map(function(L){return L.map(function(p){return fn(p.x,p.y);});});
    if(info.kind==='rot') e.ang=((e.ang||45)+info.rad*180/Math.PI)%360; else if(info.kind==='mir') e.ang=(2*info.axisAng*180/Math.PI-(e.ang||45))%360; else e.sp=(e.sp||5)*info.f;
    hatchSync(e); return; }
  return _p3.xformE(e,fn,info);
};
getGrips=function(e){
  if(e.tp==='mtext'||e.tp==='insert') return [{x:e.x,y:e.y,key:'p'}];
  if(e.tp==='leader') return e.pts.map(function(p,i){return {x:p.x,y:p.y,key:'v'+i};});
  if(e.tp==='hatch'&&e.loops){ var b=hatchLoopsBox(e.loops); return [{x:b.x+b.w/2,y:b.y+b.h/2,key:'c'}]; }
  return _p3.getGrips(e);
};
stretchGrip=function(e,key,base,pt){
  var dx=pt.x-base.x,dy=pt.y-base.y;
  if(e.tp==='mtext'||e.tp==='insert'||(e.tp==='hatch'&&e.loops)){ transl(e,dx,dy); return; }
  if(e.tp==='leader'){ var i=parseInt(key.slice(1),10); e.pts[i].x+=dx; e.pts[i].y+=dy; return; }
  return _p3.stretchGrip(e,key,base,pt);
};
entPrims=function(e){
  if(e.tp==='mtext') return mtPrims(e);
  if(e.tp==='leader') return leaderPrims(e).map(function(p){ return p.k==='box'?{k:'poly',closed:true,pts:p.pts,role:p.role}:p; });
  if(e.tp==='insert') return [].concat.apply([],flattenEnts([e]).map(entPrims));
  if(e.tp==='hatch'&&e.loops){ var ht=e.htype||'lines';
    if(ht==='dots'){ var r=hatchLoopsBox(e.loops),o=[],sp=e.sp||5; for(var x=r.x+sp/2;x<r.x+r.w;x+=sp) for(var y=r.y+sp/2;y<r.y+r.h;y+=sp) if(pointInLoops({x:x,y:y},e.loops)) o.push({k:'point',x:x,y:y}); return o; }
    return hatchSegsIn(e).map(function(s){return {k:'line',x1:s[0],y1:s[1],x2:s[2],y2:s[3],ld:ht==='dashed'?'dashed':'solid'};}); }
  return _p3.entPrims(e);
};
geomFields=function(e){
  var F=[],R=function(l,v){F.push({l:l,v:v,ro:true});};
  if(e.tp==='mtext'){ F.push({l:'Conteúdo',k:'txt',str:1},{l:'Altura',k:'h',pos:1},{l:'Largura (0=livre)',k:'w'},{l:'Rotação (°)',v:(e.rot||0)*180/Math.PI,set:function(e,v){e.rot=v*Math.PI/180;}},{l:'Posição X',k:'x'},{l:'Posição Y',k:'y'}); R('Linhas',mtLines(e).length); return F; }
  if(e.tp==='insert'){ R('Bloco',e.name); F.push({l:'Posição X',k:'x'},{l:'Posição Y',k:'y'},{l:'Escala',v:e.s||1,set:function(e,v){if(!(v>0))return false;e.s=v;}},{l:'Rotação (°)',v:(e.rot||0)*180/Math.PI,set:function(e,v){e.rot=v*Math.PI/180;}}); return F; }
  if(e.tp==='leader'){ F.push({l:'Texto',k:'txt',str:1}); R('Vértices',e.pts.length); return F; }
  if(e.tp==='hatch'&&e.loops){ F.push({l:'Ângulo (°)',k:'ang'},{l:'Espaçamento',k:'sp',pos:1}); var a=Math.abs(polyArea(e.loops[0]))-e.loops.slice(1).reduce(function(s,L){return s+Math.abs(polyArea(L));},0); R('Área',a); R('Ilhas',e.loops.length-1); return F; }
  return _p3.geomFields(e);
};
explodeSel=function(){
  var ids=S.sel.slice(),special=S.ents.filter(function(e){return ids.indexOf(e.id)>=0&&(e.tp==='insert'||e.tp==='mtext');});
  if(!special.length) return _p3.explodeSel();
  snapshot(); var nw=[];
  S.ents=[].concat.apply([],S.ents.map(function(e){
    if(special.indexOf(e)<0) return [e];
    var parts=e.tp==='insert'?insertExpand(e,0).map(function(c){c.id=uid();return c;}):mtPrims(e).map(function(p){return {id:uid(),tp:'txt',x:p.align==='left'?p.x:p.x-(p.align==='center'?.5:1)*String(p.txt).length*p.h*MT_CW,y:p.y,h:p.h,rot:p.rot,txt:p.txt,ly:e.ly,col:e.col};});
    nw=nw.concat(parts); return parts; }));
  S.sel=nw.map(function(e){return e.id;});
  var rest=ids.filter(function(id){var e=findE(id);return e&&(e.tp==='pl'||e.tp==='rect');});
  log('EXPLODE: '+special.length+' bloco(s)/texto(s) explodido(s) em '+nw.length+' objeto(s).','ok');
  if(rest.length){ S.sel=rest; S.undos.pop(); _p3.explodeSel(); }
  renderAll(); updSelInfo();
};
// Exportação: blocos explodidos (geometria idêntica)
function withFlat(fn){ var saved=S.ents; S.ents=flattenEnts(saved); try{ return fn(); } finally { S.ents=saved; } }
collectExport=function(v){ return withFlat(function(){ return _p3.collectExport(v); }); };
buildDXF2000=function(o){ return withFlat(function(){ return _p3.buildDXF2000(o); }); };
buildDXF=function(){ return withFlat(function(){ return _p3.buildDXF(); }); };
buildSVG=function(){ return withFlat(function(){ return _p3.buildSVG(); }); };

