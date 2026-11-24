/* ═══════════════════════════════════════════════════════════════════
   v6.4 — EDIÇÃO E PRECISÃO
   1) ByLayer: cor, espessura e tipo de linha nulos = herdados da camada.
   2) Painel de propriedades contextual: sem seleção define os valores dos
      novos objetos; com seleção, edita os objetos selecionados (com undo).
   3) Geometria editável do objeto selecionado (painel SELEÇÃO).
   4) OSNAP: quadrante, perpendicular, tangente e próximo; F3 liga/desliga;
      substituições pela linha de comando (END, MID, CEN, INT, QUA, PER, TAN, NEA, NON).
   5) Grips (alças) no estilo AutoCAD: STRETCH → MOVE → ROTATE → SCALE → MIRROR
      (Espaço/Enter alterna), opções Base, Copiar e Sair.
   ═══════════════════════════════════════════════════════════════════ */

// ── 1. ByLayer ────────────────────────────────────────────────────────────
function isByLayer(v){ return v===null||v===undefined||v===''||v==='BYLAYER'; }
function effCol(e){ var ly=getLy(e.ly); return !isByLayer(e.col)?e.col:(ly&&ly.col)||'#dce4f5'; }
function effLw(e){ var ly=getLy(e.ly); return !isByLayer(e.lw)?e.lw:(ly&&ly.lw)||.25; }
function effLd(e){ var ly=getLy(e.ly); return !isByLayer(e.ld)?e.ld:(ly&&ly.ld)||'solid'; }

// ── 2. Painel de propriedades contextual ────────────────────────────────────
var PROP_VARIES='__varies__';
function selEnts(){ return S.sel.map(findE).filter(Boolean); }
function commonVal(list,fn){ if(!list.length) return undefined; var v=fn(list[0]); for(var i=1;i<list.length;i++){ if(fn(list[i])!==v) return PROP_VARIES; } return v; }
function setSelectVal(sel,v,variesLabel){
  var old=sel.querySelector('option[data-varies]'); if(old) old.remove();
  if(v===PROP_VARIES){ var o=document.createElement('option');o.value=PROP_VARIES;o.textContent=variesLabel||'*VARIA*';o.setAttribute('data-varies','1');sel.insertBefore(o,sel.firstChild);sel.value=PROP_VARIES;return; }
  sel.value=(v===null||v===undefined)?'':String(v);
  if(sel.selectedIndex<0&&v!==null&&v!==undefined){ var o2=document.createElement('option');o2.value=String(v);o2.textContent=String(v);sel.appendChild(o2);sel.value=String(v); }
}
function updPropsPanel(){
  var ents=selEnts(),has=ents.length>0;
  var hdr=document.getElementById('prop-hdr');
  if(hdr) hdr.textContent=has?('⚙ PROPRIEDADES — '+ents.length+' selecionado'+(ents.length>1?'s':'')):'⚙ PROPRIEDADES — novos objetos';
  var panel=document.getElementById('prop-panel'); if(panel) panel.classList.toggle('editing-sel',has);
  updLayerSel();
  var ly=document.getElementById('propLy'),cm=document.getElementById('propColMode'),cp=document.getElementById('propCol'),lw=document.getElementById('propLW'),ld=document.getElementById('propLD');
  if(!ly||!cm) return;
  if(has){
    setSelectVal(ly,commonVal(ents,function(e){return e.ly;}));
    var cv=commonVal(ents,function(e){return isByLayer(e.col)?'':e.col;});
    setSelectVal(cm,cv===PROP_VARIES?PROP_VARIES:(cv===''?'':'custom'));
    cp.value=safeCol(cv&&cv!==PROP_VARIES?cv:effCol(ents[0]));
    setSelectVal(lw,commonVal(ents,function(e){return isByLayer(e.lw)?'':String(e.lw);}));
    setSelectVal(ld,commonVal(ents,function(e){return isByLayer(e.ld)?'':e.ld;}));
  } else {
    setSelectVal(ly,S.curLy);
    setSelectVal(cm,isByLayer(S.style.col)?'':'custom');
    var cl=getLy(S.curLy); cp.value=safeCol(isByLayer(S.style.col)?(cl&&cl.col):S.style.col);
    setSelectVal(lw,isByLayer(S.style.lw)?'':String(S.style.lw));
    setSelectVal(ld,isByLayer(S.style.ld)?'':S.style.ld);
  }
  cp.classList.toggle('bylayer',cm.value==='');
}
// Aplica uma propriedade à seleção (com undo) ou ao estilo dos novos objetos
function propSet(key,val){
  if(val===PROP_VARIES) return;
  var ents=selEnts();
  if(ents.length){
    snapshot();
    ents.forEach(function(e){ if(key==='ly') e.ly=val; else e[key]=val; });
    log('Propriedade alterada em '+ents.length+' objeto(s).','ok');
    renderAll(); if(LY&&LY.active==='layout') layoutRender();
  } else {
    if(key==='ly'){ S.curLy=val; updStatus(); }
    else S.style[key]=val;
  }
  updPropsPanel();
}
function propLayerChange(v){ if(v===PROP_VARIES) return; var id=isNaN(parseInt(v,10))?v:parseInt(v,10); propSet('ly',id); }
function propColModeChange(v){ if(v===PROP_VARIES) return; if(v===''){ propSet('col',null); } else { propSet('col',document.getElementById('propCol').value); } }
function propColChange(v){ document.getElementById('propColMode').value='custom'; propSet('col',v); }
function propLwChange(v){ if(v===PROP_VARIES) return; propSet('lw',v===''?null:parseFloat(v)); }
function propLdChange(v){ if(v===PROP_VARIES) return; propSet('ld',v===''?null:v); }

// ── 3. Geometria editável (painel SELEÇÃO) ──────────────────────────────────
function gNum(v){ if(!isFinite(v)) return ''; var s=(Math.round(v*10000)/10000).toString(); return s; }
var DEG=180/Math.PI;
function geomFields(e){
  var F=[],R=function(l,v){F.push({l:l,v:v,ro:true});};
  switch(e.tp){
    case 'line':{var L=Math.hypot(e.x2-e.x1,e.y2-e.y1),A=Math.atan2(e.y2-e.y1,e.x2-e.x1)*DEG;
      F.push({l:'Início X',k:'x1'},{l:'Início Y',k:'y1'},{l:'Fim X',k:'x2'},{l:'Fim Y',k:'y2'},
        {l:'Comprimento',v:L,set:function(e,v){if(!(v>0))return false;var a=Math.atan2(e.y2-e.y1,e.x2-e.x1);e.x2=e.x1+v*Math.cos(a);e.y2=e.y1+v*Math.sin(a);}},
        {l:'Ângulo (°)',v:A,set:function(e,v){var l=Math.hypot(e.x2-e.x1,e.y2-e.y1),a=v/DEG;e.x2=e.x1+l*Math.cos(a);e.y2=e.y1+l*Math.sin(a);}});}break;
    case 'circ':
      F.push({l:'Centro X',k:'cx'},{l:'Centro Y',k:'cy'},{l:'Raio',k:'r',pos:1},
        {l:'Diâmetro',v:2*e.r,set:function(e,v){if(!(v>0))return false;e.r=v/2;}});
      R('Perímetro',2*Math.PI*e.r);R('Área',Math.PI*e.r*e.r);break;
    case 'arc':{var sw=((e.ea-e.sa)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
      F.push({l:'Centro X',k:'cx'},{l:'Centro Y',k:'cy'},{l:'Raio',k:'r',pos:1},
        {l:'Âng. inicial (°)',v:e.sa*DEG,set:function(e,v){e.sa=v/DEG;}},{l:'Âng. final (°)',v:e.ea*DEG,set:function(e,v){e.ea=v/DEG;}});
      R('Ângulo total (°)',sw*DEG);R('Comprimento',e.r*sw);}break;
    case 'rect':
      F.push({l:'Canto X',k:'x'},{l:'Canto Y',k:'y'},{l:'Largura',k:'w',pos:1},{l:'Altura',k:'h',pos:1});
      R('Perímetro',2*(e.w+e.h));R('Área',e.w*e.h);break;
    case 'ell':
      F.push({l:'Centro X',k:'cx'},{l:'Centro Y',k:'cy'},{l:'Semieixo 1',k:'rx',pos:1},{l:'Semieixo 2',k:'ry',pos:1},
        {l:'Rotação (°)',v:(e.rot||0)*DEG,set:function(e,v){e.rot=v/DEG;}});
      R('Área',Math.PI*e.rx*e.ry);break;
    case 'txt':
      F.push({l:'Conteúdo',k:'txt',str:1},{l:'Altura',k:'h',pos:1},{l:'Rotação (°)',v:(e.rot||0)*DEG,set:function(e,v){e.rot=v/DEG;}},{l:'Posição X',k:'x'},{l:'Posição Y',k:'y'});break;
    case 'pl':case 'spline':{
      var P=e.tp==='spline'?splinePoints(e,10):e.pts,len=0;for(var i=1;i<P.length;i++)len+=Math.hypot(P[i].x-P[i-1].x,P[i].y-P[i-1].y);
      if(e.tp==='pl'&&e.closed&&P.length>2&&Math.hypot(P[0].x-P[P.length-1].x,P[0].y-P[P.length-1].y)>1e-9) len+=Math.hypot(P[0].x-P[P.length-1].x,P[0].y-P[P.length-1].y);
      R('Vértices',e.pts.length-((e.closed&&e.pts.length>2&&Math.hypot(e.pts[0].x-e.pts[e.pts.length-1].x,e.pts[0].y-e.pts[e.pts.length-1].y)<1e-9)?1:0));
      R('Comprimento',len);
      if(e.tp==='pl'){
        F.push({l:'Fechada',chk:1,v:!!e.closed,set:function(e,v){
          var P2=e.pts,dup=P2.length>2&&Math.hypot(P2[0].x-P2[P2.length-1].x,P2[0].y-P2[P2.length-1].y)<1e-9;
          if(v&&!dup) P2.push({x:P2[0].x,y:P2[0].y}); if(!v&&dup) P2.pop(); e.closed=!!v;}});
        if(e.closed) R('Área',Math.abs(plSignedArea(e.pts[e.pts.length-1].x===e.pts[0].x&&e.pts[e.pts.length-1].y===e.pts[0].y?e.pts:e.pts.concat([e.pts[0]]))));
      }
    }break;
    case 'hatch':
      F.push({l:'Ângulo (°)',k:'ang'},{l:'Espaçamento',k:'sp',pos:1},{l:'Largura',k:'w',pos:1},{l:'Altura',k:'h',pos:1});break;
    case 'dim':case 'dimr':case 'dimd':case 'dima':
      R('Medida',dimMeasure(e));
      F.push({l:'Estilo',sel:S.dimStyles.map(function(s){return s.name;}),v:e.dimStyle||S.dimCurrent,set:function(e,v){e.dimStyle=v;}});
      break;
  }
  return F;
}
var TP_NAMES={line:'Linha',circ:'Círculo',arc:'Arco',rect:'Retângulo',ell:'Elipse',pl:'Polilinha',spline:'Spline',txt:'Texto',hatch:'Hachura',dim:'Cota linear',dimr:'Cota de raio',dimd:'Cota de diâmetro',dima:'Cota angular'};
function updSelInfo(){
  var el=document.getElementById('selinfo');
  updPropsPanel();
  if(!S.sel.length){el.textContent='Nenhum objeto';return;}
  el.textContent='';
  var ents=selEnts();
  if(ents.length!==1){
    var t={};ents.forEach(function(e){t[e.tp]=(t[e.tp]||0)+1;});
    var b=document.createElement('b');b.style.color='var(--acc)';b.textContent=ents.length+' objetos';el.appendChild(b);
    Object.keys(t).forEach(function(k){var d=document.createElement('div');d.textContent=(TP_NAMES[k]||k)+': '+t[k];el.appendChild(d);});
    var h=document.createElement('div');h.className='geo-hint';h.textContent='Selecione um único objeto para editar a geometria.';el.appendChild(h);
    return;
  }
  var e=ents[0];
  var b2=document.createElement('b');b2.style.color='var(--acc)';b2.textContent=TP_NAMES[e.tp]||e.tp;el.appendChild(b2);
  var tbl=document.createElement('div');tbl.className='geo-tbl';
  geomFields(e).forEach(function(f){
    var row=document.createElement('div');row.className='geo-row';
    var lb=document.createElement('span');lb.className='geo-l';lb.textContent=f.l;row.appendChild(lb);
    var cur=f.k!==undefined?e[f.k]:f.v,inp;
    if(f.ro){inp=document.createElement('span');inp.className='geo-ro';inp.textContent=typeof cur==='number'?gNum(cur):String(cur);}
    else if(f.chk){inp=document.createElement('input');inp.type='checkbox';inp.checked=!!cur;}
    else if(f.sel){inp=document.createElement('select');inp.className='geo-in';f.sel.forEach(function(o){var op=document.createElement('option');op.value=o;op.textContent=o;inp.appendChild(op);});inp.value=cur;}
    else {inp=document.createElement('input');inp.className='geo-in';inp.type=f.str?'text':'text';inp.value=f.str?String(cur):gNum(cur);inp.inputMode=f.str?'text':'decimal';}
    if(!f.ro){
      var apply=function(){
        var v;
        if(f.chk) v=inp.checked; else if(f.sel||f.str) v=inp.value;
        else { v=parseFloat(String(inp.value).replace(',','.')); if(!isFinite(v)||(f.pos&&!(v>0))){inp.classList.add('bad');return;} }
        inp.classList.remove('bad');
        var test=JSON.parse(JSON.stringify(e));
        var r=f.set?f.set(test,v):(test[f.k]=v);
        if(r===false){inp.classList.add('bad');return;}
        snapshot();
        if(f.set) f.set(e,v); else e[f.k]=v;
        renderAll();updSelInfo();
      };
      inp.addEventListener('change',apply);
      if(!f.chk&&!f.sel) inp.addEventListener('keydown',function(ev){if(ev.key==='Enter'){ev.preventDefault();apply();}});
    }
    row.appendChild(inp);tbl.appendChild(row);
  });
  el.appendChild(tbl);
  var ly=getLy(e.ly),inf=document.createElement('div');inf.className='geo-hint';
  inf.textContent='Camada '+(ly?ly.nm:e.ly)+' · cor '+(isByLayer(e.col)?'ByLayer':e.col)+' · id '+e.id;
  el.appendChild(inf);
}

// ── 4. OSNAP: quadrante, perpendicular, tangente e próximo ──────────────────
var OSNAP_LABEL={end:'ENDPOINT',mid:'MIDPOINT',cen:'CENTER',int:'INTERSECTION',quad:'QUADRANT',per:'PERPENDICULAR',tan:'TANGENT',nea:'NEAREST',grip:'GRIP',grid:'GRID',polar:'POLAR',ortho:'ORTHO'};
var OSNAP_OVR={END:'end',ENDP:'end',MID:'mid',CEN:'cen',INT:'int',QUA:'quad',QUAD:'quad',PER:'per',PERP:'per',TAN:'tan',NEA:'nea',NEAR:'nea',NON:'none',NONE:'none'};
function quadPts(e){
  var o=[];
  if(e.tp==='circ'){ for(var k=0;k<4;k++) o.push({x:e.cx+e.r*Math.cos(k*Math.PI/2),y:e.cy+e.r*Math.sin(k*Math.PI/2)}); }
  else if(e.tp==='arc'){ for(var k2=0;k2<4;k2++){var a=k2*Math.PI/2;if(arcHas(a,e.sa,e.ea))o.push({x:e.cx+e.r*Math.cos(a),y:e.cy+e.r*Math.sin(a)});} }
  else if(e.tp==='ell'){ [0,Math.PI/2,Math.PI,1.5*Math.PI].forEach(function(t){o.push(ellPt(e,t));}); }
  return o;
}
// Segmentos retos de uma entidade (para perpendicular e próximo)
function entSegs(e){
  var s=[],P;
  switch(e.tp){
    case 'line': s.push([e.x1,e.y1,e.x2,e.y2]); break;
    case 'rect': P=[[e.x,e.y],[e.x+e.w,e.y],[e.x+e.w,e.y+e.h],[e.x,e.y+e.h]]; for(var i=0;i<4;i++){var a=P[i],b=P[(i+1)%4];s.push([a[0],a[1],b[0],b[1]]);} break;
    case 'pl': P=e.pts; for(var j=1;j<P.length;j++) s.push([P[j-1].x,P[j-1].y,P[j].x,P[j].y]);
      if(e.closed&&P.length>2&&Math.hypot(P[0].x-P[P.length-1].x,P[0].y-P[P.length-1].y)>1e-9) s.push([P[P.length-1].x,P[P.length-1].y,P[0].x,P[0].y]); break;
    case 'spline': P=splinePoints(e,12); for(var k=1;k<P.length;k++) s.push([P[k-1].x,P[k-1].y,P[k].x,P[k].y]); break;
    case 'ell': P=ellPoints(e,96); for(var m=1;m<P.length;m++) s.push([P[m-1].x,P[m-1].y,P[m].x,P[m].y]); break;
  }
  return s;
}
function footOnSeg(px,py,s,clamp){
  var dx=s[2]-s[0],dy=s[3]-s[1],l2=dx*dx+dy*dy; if(l2<1e-18) return null;
  var t=((px-s[0])*dx+(py-s[1])*dy)/l2;
  if(clamp) t=Math.max(0,Math.min(1,t)); else if(t<-1e-9||t>1+1e-9) return null;
  return {x:s[0]+t*dx,y:s[1]+t*dy};
}
function perPts(e,R){
  var o=[];
  if(e.tp==='circ'||e.tp==='arc'){
    var d=Math.hypot(R.x-e.cx,R.y-e.cy); if(d<1e-9) return o;
    [1,-1].forEach(function(sg){var a=Math.atan2(R.y-e.cy,R.x-e.cx)+(sg<0?Math.PI:0),q={x:e.cx+e.r*Math.cos(a),y:e.cy+e.r*Math.sin(a)};
      if(e.tp==='circ'||arcHas(a,e.sa,e.ea)) o.push(q);});
    return o;
  }
  if(e.tp==='spline'||e.tp==='ell') return o;
  entSegs(e).forEach(function(s){var f=footOnSeg(R.x,R.y,s,false);if(f&&Math.hypot(f.x-R.x,f.y-R.y)>1e-9)o.push(f);});
  return o;
}
function tanPts(e,R){
  var o=[];if(e.tp!=='circ'&&e.tp!=='arc') return o;
  var d=Math.hypot(R.x-e.cx,R.y-e.cy); if(d<=e.r+1e-9) return o;
  var base=Math.atan2(R.y-e.cy,R.x-e.cx),al=Math.acos(e.r/d);
  [base+al,base-al].forEach(function(a){ if(e.tp==='circ'||arcHas(a,e.sa,e.ea)) o.push({x:e.cx+e.r*Math.cos(a),y:e.cy+e.r*Math.sin(a)}); });
  return o;
}
function nearestOn(e,x,y){
  if(e.tp==='circ'||e.tp==='arc'){
    var a=Math.atan2(y-e.cy,x-e.cx);
    if(e.tp==='arc'&&!arcHas(a,e.sa,e.ea)){
      var p1={x:e.cx+e.r*Math.cos(e.sa),y:e.cy+e.r*Math.sin(e.sa)},p2={x:e.cx+e.r*Math.cos(e.ea),y:e.cy+e.r*Math.sin(e.ea)};
      return Math.hypot(p1.x-x,p1.y-y)<Math.hypot(p2.x-x,p2.y-y)?p1:p2;
    }
    return {x:e.cx+e.r*Math.cos(a),y:e.cy+e.r*Math.sin(a)};
  }
  var best=null,bd=1e18;
  entSegs(e).forEach(function(s){var f=footOnSeg(x,y,s,true);if(f){var d=Math.hypot(f.x-x,f.y-y);if(d<bd){bd=d;best=f;}}});
  return best;
}
function osnapOn(mode){ if(S.snapOverride) return S.snapOverride===mode; return S.modes.osnap!==false&&!!S.modes[mode]; }

function doSnap(sx,sy) {
  var raw = s2w(sx,sy);
  if(S.tool==='fillet'&&S.ds&&S.ds.phase!=='radius') return {x:raw.x,y:raw.y,st:null}; // seleção de objetos (pickbox)
  if((S.tool==='trim'||S.tool==='extend')&&S.ds) return {x:raw.x,y:raw.y,st:null};
  if(ncIs(S.tool)&&S.ds&&NC_RAW[S.ds.phase]) return {x:raw.x,y:raw.y,st:null};
  var best = {x:raw.x, y:raw.y, st:null};
  var objSnap = false;
  var tol = 12/S.vp.sc, bd=tol;
  function tryP(px,py,st) { var d=Math.hypot(px-raw.x,py-raw.y); if(d<bd){bd=d;best={x:px,y:py,st:st};} }
  // grips do objeto selecionado atraem o cursor (como no AutoCAD)
  if(S.tool==='select'&&S.gripHover&&!S.grip){ return {x:S.gripHover.x,y:S.gripHover.y,st:'grip'}; }
  var ovr=S.snapOverride;
  if(ovr!=='none' && (ovr || S.modes.osnap!==false)){
    var near=[];
    for(var i=0;i<S.ents.length;i++){
      var e=S.ents[i], ly=getLy(e.ly);
      if(ly&&!ly.vis) continue;
      var bb=bbox(e);
      if(bb && (raw.x<bb.x-tol||raw.x>bb.x+bb.w+tol||raw.y<bb.y-tol||raw.y>bb.y+bb.h+tol)) continue;
      near.push(e);
    }
    var R=cmdRefPt()||(S.grip?S.grip.base:null);
    for(var n=0;n<near.length;n++){
      var en=near[n],sps=snapPts(en);
      for(var j=0;j<sps.length;j++){ var sp=sps[j]; if(osnapOn(sp.st)) tryP(sp.x,sp.y,sp.st); }
      if(osnapOn('quad')) quadPts(en).forEach(function(q){tryP(q.x,q.y,'quad');});
      if(R&&osnapOn('per')) perPts(en,R).forEach(function(q){tryP(q.x,q.y,'per');});
      if(R&&osnapOn('tan')) tanPts(en,R).forEach(function(q){tryP(q.x,q.y,'tan');});
    }
    if(osnapOn('int')){
      for(var ii=0;ii<near.length;ii++){
        for(var jj=ii+1;jj<near.length;jj++){
          var ipts=entIntersectSnap(near[ii],near[jj]);
          for(var kk=0;kk<ipts.length;kk++) tryP(ipts[kk].x,ipts[kk].y,'int');
        }
      }
    }
    // NEAREST tem a menor prioridade: só vale se nenhum outro OSNAP foi encontrado
    if(best.st===null && osnapOn('nea')){
      for(var m=0;m<near.length;m++){ var q=nearestOn(near[m],raw.x,raw.y); if(q) tryP(q.x,q.y,'nea'); }
    }
    objSnap = best.st!==null;
  }
  if(!objSnap && !ovr && S.modes.snap && S.modes.grid){ var gs=S.modes.snapSz; tryP(Math.round(raw.x/gs)*gs, Math.round(raw.y/gs)*gs,'grid'); }
  // ORTHO/POLAR não sobrepõem um OSNAP ativo (comportamento AutoCAD)
  if(!objSnap && S.modes.ortho && S.ds && S.ds.pts && S.ds.pts.length>0){
    var ref=S.ds.pts[S.ds.pts.length-1];
    var adx=Math.abs(best.x-ref.x), ady=Math.abs(best.y-ref.y);
    best={x:(adx>ady?best.x:ref.x), y:(adx>ady?ref.y:best.y), st:'ortho'};
  }
  if(!objSnap && S.modes.polar && !S.modes.ortho && S.ds && S.ds.pts && S.ds.pts.length>0){
    var ref2=S.ds.pts[S.ds.pts.length-1];
    var ang=Math.atan2(best.y-ref2.y,best.x-ref2.x)*180/Math.PI;
    var snp=Math.round(ang/15)*15;
    if(Math.abs(ang-snp)<2.5){
      var r=Math.hypot(best.x-ref2.x,best.y-ref2.y), rad=snp*Math.PI/180;
      best={x:ref2.x+r*Math.cos(rad), y:ref2.y+r*Math.sin(rad), st:'polar'};
    }
  }
  return best;
}
function snapMarkerSVG(st,col){
  var a='fill="none" stroke="'+col+'" stroke-width="1.6"';
  switch(st){
    case 'end': return '<svg width="14" height="14" viewBox="-7 -7 14 14"><rect x="-5" y="-5" width="10" height="10" '+a+'/></svg>';
    case 'mid': return '<svg width="14" height="14" viewBox="-7 -7 14 14"><polygon points="0,-6 6,5 -6,5" '+a+'/></svg>';
    case 'cen': return '<svg width="16" height="16" viewBox="-8 -8 16 16"><circle r="5" '+a+'/><line x1="-7" y1="0" x2="7" y2="0" stroke="'+col+'"/><line x1="0" y1="-7" x2="0" y2="7" stroke="'+col+'"/></svg>';
    case 'int': return '<svg width="14" height="14" viewBox="-7 -7 14 14"><line x1="-6" y1="-6" x2="6" y2="6" stroke="'+col+'" stroke-width="1.8"/><line x1="6" y1="-6" x2="-6" y2="6" stroke="'+col+'" stroke-width="1.8"/></svg>';
    case 'quad': return '<svg width="16" height="16" viewBox="-8 -8 16 16"><polygon points="0,-6 6,0 0,6 -6,0" '+a+'/></svg>';
    case 'per': return '<svg width="16" height="16" viewBox="-8 -8 16 16"><polyline points="-6,-6 -6,6 6,6" '+a+'/><polyline points="-6,0 0,0 0,6" '+a+'/></svg>';
    case 'tan': return '<svg width="16" height="16" viewBox="-8 -8 16 16"><circle r="4.5" cy="1" '+a+'/><line x1="-7" y1="-4.5" x2="7" y2="-4.5" stroke="'+col+'" stroke-width="1.6"/></svg>';
    case 'nea': return '<svg width="16" height="16" viewBox="-8 -8 16 16"><polygon points="-5,-5 5,-5 -5,5 5,5" '+a+'/></svg>';
    case 'grip': return '<svg width="14" height="14" viewBox="-7 -7 14 14"><rect x="-5" y="-5" width="10" height="10" fill="'+col+'" stroke="#fff" stroke-width="1"/></svg>';
  }
  return '<svg width="12" height="12" viewBox="-6 -6 12 12"><circle r="4" '+a+'/></svg>';
}
function drawOver(){
  S.gO.clearRect(0,0,cvW(),cvH());
  var sm=document.getElementById('snapmark'),sl=document.getElementById('snaplbl');
  if(!S.hover||S.tool==='pan'||!S.hover.st||S.hover.st==='grid'){sm.style.display='none';sl.style.display='none';return;}
  var sp=w2s(S.hover.x,S.hover.y),st=S.hover.st;
  var col={end:'#4ec87a',mid:'#f0c040',cen:'#4d9ef7',int:'#ff9020',quad:'#4ec87a',per:'#c879ff',tan:'#c879ff',nea:'#58d6d6',grip:'#ff7aa0',polar:'#e85050',ortho:'#e85050'}[st]||'#4d9ef7';
  sm.style.left=sp.x+'px';sm.style.top=sp.y+'px';sm.style.display='block';
  sm.innerHTML=snapMarkerSVG(st,col);
  sl.textContent=(OSNAP_LABEL[st]||st.toUpperCase())+(S.snapOverride&&S.snapOverride!=='none'?' (forçado)':'');
  sl.style.left=(sp.x+14)+'px';sl.style.top=(sp.y-20)+'px';sl.style.display='block';sl.style.color=col;sl.style.borderColor=col;
}
// Substituição de OSNAP digitada na linha de comando (vale para o próximo ponto)
function trySnapOverride(v){
  var k=OSNAP_OVR[String(v).trim().toUpperCase()];
  if(!k) return false;
  var needsPoint=(S.tool!=='select'&&S.ds)||S.grip;
  if(!needsPoint){ log('Substituição de OSNAP só vale durante um comando que pede um ponto.','inf'); return true; }
  S.snapOverride=k;
  log(k==='none'?'OSNAP desativado para o próximo ponto.':'OSNAP forçado: '+OSNAP_LABEL[k]+' de','inf');
  return true;
}

// ── 5. GRIPS ────────────────────────────────────────────────────────────────
var GRIP_MAX=100, GRIP_MODES=['stretch','move','rotate','scale','mirror'];
var GRIP_PROMPT={stretch:'** STRETCH ** Especifique o ponto de estiramento ou [Base/Copiar/Desfazer/Sair]:',
  move:'** MOVE ** Especifique o ponto de destino ou [Base/Copiar/Desfazer/Sair]:',
  rotate:'** ROTATE ** Especifique o ângulo de rotação ou [Base/Copiar/Desfazer/Sair]:',
  scale:'** SCALE ** Especifique o fator de escala ou [Base/Copiar/Desfazer/Sair]:',
  mirror:'** MIRROR ** Especifique o segundo ponto do eixo ou [Base/Copiar/Desfazer/Sair]:'};
function plDup(e){ var P=e.pts; return e.closed&&P.length>2&&Math.hypot(P[0].x-P[P.length-1].x,P[0].y-P[P.length-1].y)<1e-9; }
function getGrips(e){
  var G=[],add=function(x,y,k){G.push({x:x,y:y,key:k});};
  switch(e.tp){
    case 'line': add(e.x1,e.y1,'p1');add((e.x1+e.x2)/2,(e.y1+e.y2)/2,'mid');add(e.x2,e.y2,'p2');break;
    case 'circ': add(e.cx,e.cy,'c');[0,1,2,3].forEach(function(k){add(e.cx+e.r*Math.cos(k*Math.PI/2),e.cy+e.r*Math.sin(k*Math.PI/2),'q');});break;
    case 'arc':{var sw=((e.ea-e.sa)%(2*Math.PI)+2*Math.PI)%(2*Math.PI),ma=e.sa+sw/2;
      add(e.cx,e.cy,'c');add(e.cx+e.r*Math.cos(e.sa),e.cy+e.r*Math.sin(e.sa),'s');add(e.cx+e.r*Math.cos(ma),e.cy+e.r*Math.sin(ma),'m');add(e.cx+e.r*Math.cos(e.ea),e.cy+e.r*Math.sin(e.ea),'e');}break;
    case 'rect':case 'hatch':
      add(e.x,e.y,'c0');add(e.x+e.w,e.y,'c1');add(e.x+e.w,e.y+e.h,'c2');add(e.x,e.y+e.h,'c3');
      add(e.x+e.w/2,e.y,'e0');add(e.x+e.w,e.y+e.h/2,'e1');add(e.x+e.w/2,e.y+e.h,'e2');add(e.x,e.y+e.h/2,'e3');break;
    case 'pl':case 'spline':{
      var P=e.pts,n=P.length-(e.tp==='pl'&&plDup(e)?1:0);
      for(var i=0;i<n;i++) add(P[i].x,P[i].y,'v'+i);
      if(e.tp==='pl') for(var j=1;j<P.length;j++) add((P[j-1].x+P[j].x)/2,(P[j-1].y+P[j].y)/2,'m'+(j-1));
    }break;
    case 'ell': add(e.cx,e.cy,'c');[0,Math.PI].forEach(function(t){var q=ellPt(e,t);add(q.x,q.y,'a');});[Math.PI/2,1.5*Math.PI].forEach(function(t){var q=ellPt(e,t);add(q.x,q.y,'b');});break;
    case 'txt': add(e.x,e.y,'p');break;
    case 'dim':{var g=dimLinePoints(e);add(e.x1,e.y1,'p1');add(e.x2,e.y2,'p2');if(g)add((g.d1x+g.d2x)/2,(g.d1y+g.d2y)/2,'dl');}break;
    case 'dimr':case 'dimd': add(e.cx,e.cy,'c');add(e.ex,e.ey,'t');break;
    case 'dima':{var G2=dimAngGeom(e),ma2=G2.sa+G2.sweep/2;add(e.vx,e.vy,'v');add(e.x1,e.y1,'p1');add(e.x2,e.y2,'p2');add(e.vx+G2.R*Math.cos(ma2),e.vy+G2.R*Math.sin(ma2),'a');}break;
  }
  return G;
}
function gripEnts(){
  if(S.tool!=='select'||S.modes.grips===false||!S.sel.length||S.sel.length>GRIP_MAX) return [];
  return selEnts().filter(function(e){var ly=getLy(e.ly);return !(ly&&(!ly.vis||ly.lock));});
}
function allGrips(){ var o=[]; gripEnts().forEach(function(e){getGrips(e).forEach(function(g){o.push({x:g.x,y:g.y,key:g.key,id:e.id});});}); return o; }
function gripAt(sx,sy){
  var best=null,bd=7;
  allGrips().forEach(function(g){var p=w2s(g.x,g.y),d=Math.max(Math.abs(p.x-sx),Math.abs(p.y-sy));if(d<=bd){bd=d;best=g;}});
  return best;
}
function drawGrips(ctx){
  var G=allGrips(); if(!G.length) return;
  ctx.save();ctx.setLineDash([]);ctx.shadowBlur=0;
  G.forEach(function(g){
    var p=w2s(g.x,g.y),hot=S.grip&&Math.hypot(g.x-S.grip.base.x,g.y-S.grip.base.y)<1e-9&&S.grip.targets.some(function(t){return t.id===g.id&&t.key===g.key;}),
        hov=!S.grip&&S.gripHover&&Math.hypot(g.x-S.gripHover.x,g.y-S.gripHover.y)<1e-9;
    ctx.fillStyle=hot?'#e85050':hov?'#ff7aa0':'#4d9ef7';ctx.strokeStyle='#0a0a1a';ctx.lineWidth=1;
    ctx.fillRect(p.x-4,p.y-4,8,8);ctx.strokeRect(p.x-4.5,p.y-4.5,9,9);
  });
  ctx.restore();
}
// Estira um grip de uma entidade (base → pt)
function stretchGrip(e,key,base,pt){
  var dx=pt.x-base.x,dy=pt.y-base.y;
  switch(e.tp){
    case 'line': if(key==='p1'){e.x1+=dx;e.y1+=dy;} else if(key==='p2'){e.x2+=dx;e.y2+=dy;} else transl(e,dx,dy); break;
    case 'circ': if(key==='c') transl(e,dx,dy); else e.r=Math.max(1e-6,Math.hypot(pt.x-e.cx,pt.y-e.cy)); break;
    case 'arc': if(key==='c') transl(e,dx,dy); else if(key==='m') e.r=Math.max(1e-6,Math.hypot(pt.x-e.cx,pt.y-e.cy));
      else if(key==='s') e.sa=Math.atan2(pt.y-e.cy,pt.x-e.cx); else if(key==='e') e.ea=Math.atan2(pt.y-e.cy,pt.x-e.cx); break;
    case 'rect':case 'hatch':{
      var x0=e.x,y0=e.y,x1=e.x+e.w,y1=e.y+e.h;
      if(key==='c0'){x0+=dx;y0+=dy;} if(key==='c1'){x1+=dx;y0+=dy;} if(key==='c2'){x1+=dx;y1+=dy;} if(key==='c3'){x0+=dx;y1+=dy;}
      if(key==='e0')y0+=dy; if(key==='e1')x1+=dx; if(key==='e2')y1+=dy; if(key==='e3')x0+=dx;
      e.x=Math.min(x0,x1);e.y=Math.min(y0,y1);e.w=Math.max(1e-6,Math.abs(x1-x0));e.h=Math.max(1e-6,Math.abs(y1-y0));
    }break;
    case 'pl':case 'spline':{
      var P=e.pts,dup=e.tp==='pl'&&plDup(e),mv=function(i){P[i].x+=dx;P[i].y+=dy;if(dup&&i===0){P[P.length-1].x+=dx;P[P.length-1].y+=dy;}};
      if(key[0]==='v') mv(parseInt(key.slice(1),10));
      else if(key[0]==='m'){var i2=parseInt(key.slice(1),10);mv(i2);if(!(dup&&i2+1===P.length-1))mv(i2+1);else if(i2+1===P.length-1){/* já movido via dup */}}
    }break;
    case 'ell': if(key==='c') transl(e,dx,dy); else if(key==='a') e.rx=Math.max(1e-6,Math.hypot(pt.x-e.cx,pt.y-e.cy)); else e.ry=Math.max(1e-6,Math.hypot(pt.x-e.cx,pt.y-e.cy)); break;
    case 'txt': transl(e,dx,dy); break;
    case 'dim': normDimLegacy(e); if(key==='p1'){e.x1+=dx;e.y1+=dy;} else if(key==='p2'){e.x2+=dx;e.y2+=dy;} else {e.px+=dx;e.py+=dy;} break;
    case 'dimr':case 'dimd': if(key==='c') transl(e,dx,dy); else {e.ex+=dx;e.ey+=dy;} break;
    case 'dima': if(key==='v'){e.vx+=dx;e.vy+=dy;} else if(key==='p1'){e.x1+=dx;e.y1+=dy;} else if(key==='p2'){e.x2+=dx;e.y2+=dy;}
      else { var G=dimAngGeom(e),ma=G.sa+G.sweep/2; if(e.px===undefined){e.px=e.vx+G.R*Math.cos(ma);e.py=e.vy+G.R*Math.sin(ma);} e.px+=dx;e.py+=dy; } break;
  }
}
// Calcula o resultado do grip para um ponto (ou valor digitado). Retorna lista de entidades novas/alteradas.
function gripCompute(pt,typed){
  var g=S.grip,base=g.base,out=[];
  var src=g.ids.map(findE).filter(Boolean).map(function(e){return JSON.parse(JSON.stringify(e));}); // cópia com o mesmo id
  if(g.mode==='stretch'){
    src.forEach(function(e,i){ g.targets.forEach(function(t){ if(t.id===g.ids[i]) stretchGrip(e,t.key,base,pt); }); out.push(e); });
    // somente as entidades que têm grip ativo mudam
    return out.filter(function(e,i){return g.targets.some(function(t){return t.id===g.ids[i];});}).map(function(e){return e;});
  }
  src.forEach(function(e){
    if(g.mode==='move') transl(e,pt.x-base.x,pt.y-base.y);
    else if(g.mode==='rotate'){ var a=typed!==undefined?typed/DEG:Math.atan2(pt.y-base.y,pt.x-base.x); rotat(e,base,a); }
    else if(g.mode==='scale'){ var f=typed!==undefined?typed:Math.hypot(pt.x-base.x,pt.y-base.y)/(g.refLen||1); if(!(f>0)) f=1e-6; scalE(e,base,f); }
    else if(g.mode==='mirror'){ if(Math.hypot(pt.x-base.x,pt.y-base.y)>1e-9) mirr(e,base,pt); }
    out.push(e);
  });
  return out;
}
function gripStart(g){
  var targets=[];
  allGrips().forEach(function(q){ if(Math.hypot(q.x-g.x,q.y-g.y)<1e-9*Math.max(1,Math.abs(g.x)+Math.abs(g.y))+1e-9) targets.push({id:q.id,key:q.key}); });
  S.grip={base:{x:g.x,y:g.y},targets:targets,ids:gripEnts().map(function(e){return e.id;}),mode:'stretch',copy:false,refLen:1,baseNext:false};
  S.ds={pts:[{x:g.x,y:g.y}],grip:true};
  S.gripHover=null;
  logp(GRIP_PROMPT.stretch);
  renderAll();
}
function gripCycle(){
  if(!S.grip) return;
  var i=GRIP_MODES.indexOf(S.grip.mode);S.grip.mode=GRIP_MODES[(i+1)%GRIP_MODES.length];
  if(S.grip.mode==='scale'){ var h=S.hover||S.grip.base; S.grip.refLen=Math.max(Math.hypot(h.x-S.grip.base.x,h.y-S.grip.base.y),10/S.vp.sc); }
  logp(GRIP_PROMPT[S.grip.mode]+(S.grip.copy?' (cópias múltiplas)':''));
  renderAll();
}
function gripCommit(pt,typed){
  var g=S.grip; if(!g) return;
  if(g.baseNext){ g.base={x:pt.x,y:pt.y}; g.baseNext=false; S.ds={pts:[g.base],grip:true}; logp(GRIP_PROMPT[g.mode]); S.snapOverride=null; renderAll(); return; }
  var res=gripCompute(pt,typed);
  snapshot();
  if(g.copy){ res.forEach(function(e){e.id=uid();S.ents.push(e);}); log('Grip '+g.mode.toUpperCase()+': '+res.length+' cópia(s).','ok'); }
  else {
    if(g.mode==='stretch'){ res.forEach(function(e){ for(var i=0;i<S.ents.length;i++) if(S.ents[i].id===e.id) S.ents[i]=e; }); }
    else res.forEach(function(e){ for(var i=0;i<S.ents.length;i++) if(S.ents[i].id===e.id) S.ents[i]=e; });
    log('Grip '+g.mode.toUpperCase()+' aplicado.','ok');
  }
  S.snapOverride=null;
  if(g.copy){ renderAll(); updSelInfo(); return; }  // continua em modo cópia até Esc/Sair
  gripEnd(); updSelInfo();
}
function gripEnd(){ S.grip=null; S.ds=null; S.gripHover=null; S.snapOverride=null; logp('SELECT: clique ou janela.'); renderAll(); updStatus(); }
function gripTyped(v){
  var g=S.grip,u=String(v).trim().toUpperCase();
  if(u==='C'||u==='COPIAR'||u==='COPY'){ g.copy=!g.copy; logp(GRIP_PROMPT[g.mode]+(g.copy?' (cópias múltiplas)':'')); return; }
  if(u==='B'||u==='BASE'){ g.baseNext=true; logp('Especifique o novo ponto base:'); return; }
  if(u==='X'||u==='SAIR'||u==='EXIT'){ gripEnd(); return; }
  if(u==='U'||u==='DESFAZER'){ if(g.copy){ undo(); } return; }
  var num=parseFloat(String(v).replace(',','.'));
  if(/^-?[\d.,]+$/.test(String(v).trim())&&isFinite(num)){
    if(g.mode==='rotate'||g.mode==='scale'){ if(g.mode==='scale'&&!(num>0)){log('Fator deve ser positivo.','er');return;} gripCommit(g.base,num); return; }
    var h=S.hover||{x:g.base.x+1,y:g.base.y},dx=h.x-g.base.x,dy=h.y-g.base.y,l=Math.hypot(dx,dy)||1;
    gripCommit({x:g.base.x+dx/l*num,y:g.base.y+dy/l*num}); return;
  }
  var pt=parseCoord(v); if(pt){ gripCommit(pt); return; }
  log('Entrada inválida para o grip.','er');
}
function drawGripPreview(ctx){
  var g=S.grip,h=S.hover; if(!g||!h) return;
  var b=w2s(g.base.x,g.base.y),c=w2s(h.x,h.y);
  ctx.save();ctx.setLineDash([4,4]);ctx.strokeStyle='#e85050';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.stroke();ctx.restore();
  if(g.baseNext) return;
  var res=gripCompute(h);
  ctx.save();ctx.globalAlpha=0.75;
  res.forEach(function(e){drawE(ctx,e,true);});
  ctx.restore();
  if(g.mode==='rotate'){ctx.save();ctx.fillStyle='#e85050';ctx.font='10px Consolas';ctx.fillText(gNum(Math.atan2(h.y-g.base.y,h.x-g.base.x)*DEG)+'°',c.x+12,c.y+14);ctx.restore();}
  if(g.mode==='scale'){ctx.save();ctx.fillStyle='#e85050';ctx.font='10px Consolas';ctx.fillText('×'+gNum(Math.hypot(h.x-g.base.x,h.y-g.base.y)/(g.refLen||1)),c.x+12,c.y+14);ctx.restore();}
}

// ── Edição da cor de camada (clique na bolinha) ─────────────────────────────
function layerColorEdit(id){
  var l=getLy(id); if(!l) return;
  var inp=document.createElement('input');inp.type='color';inp.value=safeCol(l.col);
  inp.style.position='fixed';inp.style.left='-100px';document.body.appendChild(inp);
  inp.addEventListener('change',function(){ l.col=inp.value; S.dirty=true; updLayerUI(); renderAll(); updPropsPanel(); log('Cor da camada "'+l.nm+'" alterada (objetos ByLayer atualizados).','ok'); inp.remove(); });
  inp.addEventListener('blur',function(){ setTimeout(function(){ if(inp.parentNode) inp.remove(); },500); });
  inp.click();
}



