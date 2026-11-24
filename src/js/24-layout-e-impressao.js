/* ═══════════════════════════════════════════════════════════════════
   v7.4 — ESPAÇO DO PAPEL (LAYOUT) NO ESTILO AUTOCAD / ZWCAD — pacote L1
   • Vários layouts em abas (criar, renomear, duplicar, excluir), salvos no arquivo.
   • A folha é desenhada na própria área de desenho: tudo o que se desenha num
     layout (linhas, textos, MTEXT, cotas, blocos, hachuras) fica no PAPEL, em 1:1 (mm).
   • Viewports são objetos do papel: mostram o modelo numa escala (1:n), podem ser
     movidas e redimensionadas por grips; duplo clique entra no MSPACE (zoom/pan da vista).
   • Estilos de plotagem (Monocromático / Colorido / Tons de cinza) e espessuras
     reais em mm, na tela e na impressão.
   • Carimbo ABNT (NBR 16752 / NBR 10582) inserido no papel como bloco + campos editáveis.
   • Impressão em alta resolução (até 300 dpi).
   ═══════════════════════════════════════════════════════════════════ */
var LY={active:'model'}; // compatibilidade com módulos anteriores
if(!S.space) S.space='model';
if(!S.layouts) S.layouts=[];
var NBR_FMT={A0:[1189,841],A1:[841,594],A2:[594,420],A3:[420,297],A4:[297,210]};
// v8.8: margens da folha conforme a ABNT NBR 16752:2020 (substitui a NBR 10068): esquerda 20 mm (encadernação), demais 10 mm
var NBR_MARGINS={t:10,r:10,b:10,l:20};
function nbrMargins(fmt){ return {t:NBR_MARGINS.t,r:NBR_MARGINS.r,b:NBR_MARGINS.b,l:NBR_MARGINS.l}; }
// margens padrão das versões anteriores (NBR 10068): desenhos antigos que nunca mudaram as margens passam para a NBR 16752
function nbrOldDefault(m){ return !!m&&m.l===25&&((m.t===7&&m.r===7&&m.b===7)||(m.t===10&&m.r===10&&m.b===10)); }
var VP_SCALES=[['10:1',10],['5:1',5],['2:1',2],['1:1',1],['1:2',1/2],['1:5',1/5],['1:10',1/10],['1:20',1/20],['1:25',1/25],['1:50',1/50],['1:75',1/75],['1:100',1/100],
  ['1:200',1/200],['1:250',1/250],['1:500',1/500],['1:1000',1/1000],['1:2000',1/2000],['1:2500',1/2500],['1:5000',1/5000],['1:10000',1/10000]];
function unitMm(){ return ({mm:1,cm:10,m:1000,'in':25.4,ft:304.8,km:1e6})[(S.units&&S.units.insertScale)||'mm']||1; }
function ratioLabel(r){ if(!(r>0)) return '—'; if(r>=1){ var a=Math.round(r*100)/100; return (a===Math.round(a)?a:a.toFixed(2))+':1'; } var n=1/r; return '1:'+(Math.abs(n-Math.round(n))<1e-6?Math.round(n):n.toFixed(2)); }
function curLayout(){ for(var i=0;i<S.layouts.length;i++) if(S.layouts[i].id===S.space) return S.layouts[i]; return null; }
function modelEntsNow(){ return S.space==='model'?S.ents:(S.modelEnts||[]); }
function newLayoutObj(name,fmt,land){
  var f=NBR_FMT[fmt||'A4'],w=land!==false?Math.max(f[0],f[1]):Math.min(f[0],f[1]),h=land!==false?Math.min(f[0],f[1]):Math.max(f[0],f[1]);
  return {id:'L'+Date.now().toString(36)+Math.floor(Math.random()*1e4),name:name,fmt:fmt||'A4',paper:{w:w,h:h},margins:nbrMargins(fmt||'A4'),plotStyle:'mono',ents:[],undos:[],redos:[],view:null};
}
function printableRect(L){ var m=L.margins; return {x:m.l,y:m.b,w:L.paper.w-m.l-m.r,h:L.paper.h-m.t-m.b}; }
function modelExtents(){ var bs=modelEntsNow().map(bbox).filter(Boolean); if(!bs.length) return null; var p=[]; bs.forEach(function(b){p.push({x:b.x,y:b.y},{x:b.x+b.w,y:b.y+b.h});}); return ptsBox(p); }
function niceRatio(maxR){ var best=null; VP_SCALES.forEach(function(s){ if(s[1]<=maxR*1.0000001&&(best===null||s[1]>best)) best=s[1]; }); return best||maxR; }
function vpFit(v){ var ex=modelExtents(); if(!ex){ v.cx=0; v.cy=0; v.k=unitMm()/10; return; }
  var um=unitMm(),need=Math.min(v.w/Math.max(ex.w*um,1e-9),v.h/Math.max(ex.h*um,1e-9))*0.92; v.k=niceRatio(need)*um; v.cx=ex.x+ex.w/2; v.cy=ex.y+ex.h/2; }
function newViewport(r){ var v={id:uid(),tp:'viewport',x:r.x,y:r.y,w:r.w,h:r.h,cx:0,cy:0,k:unitMm()/10,ly:vpLayerId(),auto:true}; vpFit(v); return v; }
function vpRatio(v){ return v.k/unitMm(); }
function vpModelToPaper(v,x,y){ return {x:v.x+v.w/2+(x-v.cx)*v.k,y:v.y+v.h/2+(y-v.cy)*v.k}; }
function vpPaperToModel(v,x,y){ return {x:v.cx+(x-v.x-v.w/2)/v.k,y:v.cy+(y-v.y-v.h/2)/v.k}; }
function ensureLayouts(){ if(!S.layouts.length) S.layouts.push(newLayoutObj('Layout1','A4',true)); }
function resetLayouts(){ S.space='model'; S.layouts=[]; S.modelEnts=null; S.mspace=null; S.lastLayout=null; LY.active='model'; document.body.classList.remove('paper'); buildLayoutTabs(); syncLayoutPanel(); }

// ── troca de espaço (cada espaço tem sua lista de objetos, desfazer e vista) ──
// No modelo: S.ents = objetos do modelo. Num layout: S.ents = objetos do papel e S.modelEnts = modelo.
function spaceSave(){ if(S.space==='model'){ S.modelEnts=S.ents; S.modelUndo={u:S.undos,r:S.redos}; S.modelVp=S.vp; } else { var L=curLayout(); if(L){ L.ents=S.ents; L.undos=S.undos; L.redos=S.redos; L.view=S.vp; } } }
function switchSpace(target){
  if(target==='layout'){ ensureLayouts(); target=(S.lastLayout&&S.layouts.some(function(l){return l.id===S.lastLayout;}))?S.lastLayout:S.layouts[0].id; }
  if(target===S.space){ buildLayoutTabs(); syncLayoutPanel(); return; }
  if(target!=='model'&&!S.layouts.some(function(l){return l.id===target;})) return;
  if(S.tool!=='select') setTool('select');
  S.sel=[]; S.grip=null; S.mspace=null;
  spaceSave();
  if(target==='model'){ S.ents=S.modelEnts||[]; S.undos=(S.modelUndo||{}).u||[]; S.redos=(S.modelUndo||{}).r||[]; S.vp=S.modelVp||S.vp; S.modelEnts=null; }
  else { var L0=S.layouts.filter(function(l){return l.id===target;})[0]; S.ents=L0.ents; S.undos=L0.undos||[]; S.redos=L0.redos||[]; if(L0.view) S.vp=L0.view; }
  S.space=target; LY.active=target==='model'?'model':'layout';
  document.body.classList.toggle('paper',target!=='model');
  var L=curLayout();
  if(L){ S.lastLayout=L.id; vpMigrate(L);
    if(!L._init){ L._init=true; if(!L.ents.some(function(e){return e.tp==='viewport';})) L.ents.push(newViewport(printableRect(L))); }
    if(!L.view) paperFit();
  }
  buildLayoutTabs(); syncLayoutPanel(); renderAll(); updStatus(); updSelInfo();
  log(target==='model'?'Espaço do MODELO.':'Espaço do PAPEL: '+L.name+' — '+L.fmt+' '+(L.paper.w>L.paper.h?'paisagem':'retrato')+'. Desenhe, escreva e cote direto na folha (mm). Duplo clique numa viewport = MSPACE.','inf');
}
function paperFit(){ var L=curLayout(); if(!L) return; var W=cvW(),H=cvH()-56,sc=Math.min((W-50)/L.paper.w,(H-50)/L.paper.h);
  S.vp={x:(W-L.paper.w*sc)/2,y:(H+L.paper.h*sc)/2,sc:sc}; }

// ── estilos de plotagem e espessuras em mm ───────────────────────────────────
function hexRGB(h){ var m=/^#?([0-9a-f]{6})/i.exec(h||''); if(!m) return null; var n=parseInt(m[1],16); return [n>>16&255,n>>8&255,n&255]; }
function plotCol(c){
  var L=curLayout(); if(!L) return c; var rgb=hexRGB(c); if(!rgb) return c;
  var lum=(0.299*rgb[0]+0.587*rgb[1]+0.114*rgb[2])/255;
  if(L.plotStyle==='mono') return '#000000';
  if(L.plotStyle==='gray'){ var g=lum>0.82?0:Math.round(lum*170); var hx=('0'+g.toString(16)).slice(-2); return '#'+hx+hx+hx; }
  return lum>0.82?'#000000':c;
}
var _effCol_L1=effCol;
effCol=function(e){ var c=_effCol_L1(e); return S.space!=='model'?plotCol(c):c; };
var _applyStyle_L1=applyStyle;
applyStyle=function(ctx,e,sel){ _applyStyle_L1(ctx,e,sel); if(S.space!=='model'&&S.paperPx){ ctx.lineWidth=Math.max(S.printing?0.5:0.6,effLw(e)*S.paperPx); } };

// ── objeto VIEWPORT (no papel) ──────────────────────────────────────────────
var _L1={drawE:drawE,hitEnt:hitEnt,bbox:bbox,snapPts:snapPts,transl:transl,xformE:xformE,getGrips:getGrips,stretchGrip:stretchGrip,geomFields:geomFields,entPrims:entPrims,drawGrid:drawGrid,zoomFit:zoomFit};
// v7.5 (L2): viewport retangular ou poligonal (v.clip), escala travada (v.lock), camadas congeladas por viewport (v.frz)
function vpShape(v){ return v.clip&&v.clip.length>=3?v.clip:[{x:v.x,y:v.y},{x:v.x+v.w,y:v.y},{x:v.x+v.w,y:v.y+v.h},{x:v.x,y:v.y+v.h}]; }
function vpCorners(v){ return vpShape(v); }
function vpSyncBox(v,keepContent){ if(!v.clip) return; var b=ptsBox(v.clip),oc={x:v.x+v.w/2,y:v.y+v.h/2}; v.x=b.x; v.y=b.y; v.w=Math.max(b.w,1e-6); v.h=Math.max(b.h,1e-6);
  if(keepContent){ var nc={x:v.x+v.w/2,y:v.y+v.h/2}; v.cx+=(nc.x-oc.x)/v.k; v.cy+=(nc.y-oc.y)/v.k; } }
function vpFrozen(v,lyId){ return !!(v.frz&&v.frz.some(function(id){return String(id)===String(lyId);})); }
function layerPlots(id){ var l=getLy(id); return !(l&&l.plot===false); }
function drawViewport(ctx,v,sel){
  var P=vpShape(v).map(function(p){return w2s(p.x,p.y);});
  var paperSc=S.vp.sc,pc={x:v.x+v.w/2,y:v.y+v.h/2},comp={x:S.vp.x+(pc.x-v.cx*v.k)*paperSc,y:S.vp.y-(pc.y-v.cy*v.k)*paperSc,sc:v.k*paperSc};
  function path(){ ctx.beginPath(); P.forEach(function(q,i){ if(i) ctx.lineTo(q.x,q.y); else ctx.moveTo(q.x,q.y); }); ctx.closePath(); }
  ctx.save(); path(); ctx.clip();
  var sv=S.vp,sak=S.annoK; S.vp=comp; S.annoK=v.k;
  try{ (S.modelEnts||[]).forEach(function(m){ var ly=getLy(m.ly); if(ly&&!ly.vis) return; if(vpFrozen(v,m.ly)) return; if(S.printing&&!layerPlots(m.ly)) return; drawE(ctx,m,false); }); }
  finally{ S.vp=sv; S.annoK=sak; ctx.restore(); }
  var act=S.mspace===v.id;
  if(S.printing){ if(layerPlots(v.ly)){ ctx.save(); ctx.strokeStyle=plotCol(effCol(v)); ctx.lineWidth=Math.max(0.5,effLw(v)*(S.paperPx||1)); ctx.setLineDash([]); path(); ctx.stroke(); ctx.restore(); } return; }
  ctx.save(); ctx.setLineDash(act?[]:[6,3]); ctx.lineWidth=act?2.5:1; ctx.strokeStyle=sel?'#60b8ff':(act?'#1f6fd6':'#7a8699'); path(); ctx.stroke();
  var tl=P.reduce(function(a,q){ return (q.y<a.y-1e-9||(Math.abs(q.y-a.y)<1e-9&&q.x<a.x))?q:a; },P[0]);
  ctx.fillStyle=act?'#1f6fd6':'#7a8699'; ctx.font='10px Consolas';
  ctx.fillText((act?'MSPACE  ':'')+ratioLabel(vpRatio(v))+(v.lock?'  🔒':'')+(v.frz&&v.frz.length?'  ❄'+v.frz.length:''),Math.min.apply(null,P.map(function(q){return q.x;}))+4,Math.min.apply(null,P.map(function(q){return q.y;}))+12);
  ctx.restore();
}
drawE=function(ctx,e,sel){ if(e.tp==='viewport') return drawViewport(ctx,e,sel); return _L1.drawE(ctx,e,sel); };
hitEnt=function(e,wx,wy){ if(e.tp!=='viewport') return _L1.hitEnt(e,wx,wy); var ly=getLy(e.ly); if(ly&&(!ly.vis||ly.lock)) return false; var t=8/S.vp.sc; return polySegs(vpShape(e),true).some(function(s){return segD(wx,wy,s[0],s[1],s[2],s[3])<t;}); };
bbox=function(e){ return e.tp==='viewport'?{x:e.x,y:e.y,w:e.w,h:e.h}:_L1.bbox(e); };
snapPts=function(e){ if(e.tp!=='viewport') return _L1.snapPts(e); return vpShape(e).map(function(p){return {x:p.x,y:p.y,st:'end'};}); };
transl=function(e,dx,dy){ if(e.tp==='viewport'){ e.x+=dx; e.y+=dy; if(e.clip) e.clip.forEach(function(p){p.x+=dx;p.y+=dy;}); e.auto=false; return; } return _L1.transl(e,dx,dy); };
xformE=function(e,fn,info){
  if(e.tp!=='viewport') return _L1.xformE(e,fn,info);
  var oc={x:e.x+e.w/2,y:e.y+e.h/2},c=fn(oc.x,oc.y);
  if(info.kind==='scl'){ if(e.clip){ e.clip=e.clip.map(function(p){return fn(p.x,p.y);}); vpSyncBox(e,false); } else { e.w*=info.f; e.h*=info.f; e.x=c.x-e.w/2; e.y=c.y-e.h/2; } e.k*=info.f; }
  else { transl(e,c.x-oc.x,c.y-oc.y); }
  e.auto=false;
};
getGrips=function(e){ if(e.tp!=='viewport') return _L1.getGrips(e); var G=(e.clip&&e.clip.length>16)?[]:vpShape(e).map(function(p,i){return {x:p.x,y:p.y,key:(e.clip?'p':'c')+i};}); /* recortes curvos (círculo/elipse): só o grip de mover */ G.push({x:e.x+e.w/2,y:e.y+e.h/2,key:'mv'}); return G; };
stretchGrip=function(e,key,base,pt){
  if(e.tp!=='viewport') return _L1.stretchGrip(e,key,base,pt);
  var dx=pt.x-base.x,dy=pt.y-base.y; if(key==='mv'){ transl(e,dx,dy); return; }
  if(key[0]==='p'&&e.clip){ var i=parseInt(key.slice(1),10); e.clip[i].x+=dx; e.clip[i].y+=dy; vpSyncBox(e,true); e.auto=false; return; }
  var x0=e.x,y0=e.y,x1=e.x+e.w,y1=e.y+e.h,oc={x:(x0+x1)/2,y:(y0+y1)/2};
  if(key==='c0'){x0+=dx;y0+=dy;} if(key==='c1'){x1+=dx;y0+=dy;} if(key==='c2'){x1+=dx;y1+=dy;} if(key==='c3'){x0+=dx;y1+=dy;}
  e.x=Math.min(x0,x1); e.y=Math.min(y0,y1); e.w=Math.max(1,Math.abs(x1-x0)); e.h=Math.max(1,Math.abs(y1-y0));
  // o desenho fica parado no papel ao redimensionar (como no AutoCAD)
  var nc={x:e.x+e.w/2,y:e.y+e.h/2}; e.cx+=(nc.x-oc.x)/e.k; e.cy+=(nc.y-oc.y)/e.k; e.auto=false;
};
geomFields=function(e){
  if(e.tp!=='viewport') return _L1.geomFields(e);
  var F=[{l:'Escala (1:n)',v:1/vpRatio(e),set:function(e,v){ if(!(v>0)) return false; if(e.lock){ log('Viewport travada: destrave para mudar a escala.','er'); return false; } e.k=unitMm()/v; }},
    {l:'Escala travada',chk:1,v:!!e.lock,set:function(e,v){ e.lock=!!v; }}];
  if(!e.clip) F.push({l:'Largura (mm)',k:'w',pos:1},{l:'Altura (mm)',k:'h',pos:1});
  F.push({l:'Centro X (modelo)',k:'cx'},{l:'Centro Y (modelo)',k:'cy'},{l:'Forma',v:e.clip?'poligonal ('+e.clip.length+' vértices)':'retangular',ro:true},
    {l:'Camadas congeladas',v:(e.frz||[]).map(function(id){var l=getLy(id);return l?l.nm:id;}).join(', ')||'nenhuma',ro:true});
  return F;
};
TP_NAMES.viewport='Viewport';
entPrims=function(e){ return e.tp==='viewport'?[]:_L1.entPrims(e); };
if(ENT_TYPES.indexOf('viewport')<0) ENT_TYPES.push('viewport');

// ── folha na tela ───────────────────────────────────────────────────────────
drawGrid=function(){
  if(S.space==='model') return _L1.drawGrid();
  var ctx=S.gG,W=cvW(),H=cvH(),L=curLayout(); ctx.fillStyle='#2b2e36'; ctx.fillRect(0,0,W,H); if(!L) return;
  S.paperPx=S.vp.sc;
  var a=w2s(0,L.paper.h),b=w2s(L.paper.w,0);
  ctx.save(); ctx.shadowColor='rgba(0,0,0,.6)'; ctx.shadowBlur=18; ctx.shadowOffsetY=4; ctx.fillStyle='#ffffff'; ctx.fillRect(a.x,a.y,b.x-a.x,b.y-a.y); ctx.restore();
  if(S.modes.grid){ ctx.save(); ctx.strokeStyle='#f2f4f8'; ctx.lineWidth=1; ctx.beginPath(); var st=10;
    for(var x=st;x<L.paper.w;x+=st){ var p=w2s(x,0); ctx.moveTo(p.x,a.y); ctx.lineTo(p.x,b.y); }
    for(var y=st;y<L.paper.h;y+=st){ var q=w2s(0,y); ctx.moveTo(a.x,q.y); ctx.lineTo(b.x,q.y); } ctx.stroke(); ctx.restore(); }
  var r=printableRect(L),c1=w2s(r.x,r.y+r.h),c2=w2s(r.x+r.w,r.y);
  ctx.save(); ctx.setLineDash([4,4]); ctx.strokeStyle='#b8c0cc'; ctx.lineWidth=1; ctx.strokeRect(c1.x,c1.y,c2.x-c1.x,c2.y-c1.y); ctx.restore();
};
zoomFit=function(){ if(S.space!=='model'){ paperFit(); renderAll(); return; } return _L1.zoomFit(); };

// ── MSPACE: zoom e pan da vista dentro da viewport ──────────────────────────
function vpAt(p){ var hit=null; S.ents.forEach(function(e){ if(e.tp==='viewport'&&p.x>=e.x&&p.x<=e.x+e.w&&p.y>=e.y&&p.y<=e.y+e.h) hit=e; }); return hit; }
function mspaceEnter(v){ if(!v){ v=S.ents.filter(function(e){return e.tp==='viewport';})[0]; } if(!v){ log('Não há viewport neste layout (use MVIEW).','er'); return; }
  S.mspace=v.id; S.sel=[]; log('MSPACE: roda do mouse = zoom, arrastar = mover a vista. Duplo clique fora ou PS/Esc = voltar ao papel. Para editar o desenho, use a aba Model.','inf'); syncLayoutPanel(); renderAll(); }
function mspaceExit(){ if(!S.mspace) return; S.mspace=null; syncLayoutPanel(); renderAll(); log('PSPACE (papel).','inf'); }
function lyToggleMspace(){ if(S.space==='model') return; if(S.mspace) mspaceExit(); else { var v=S.sel.map(findE).filter(function(e){return e&&e.tp==='viewport';})[0]; mspaceEnter(v); } }
window.addEventListener('load',function(){
  var w=document.getElementById('cw'); if(!w) return;
  function P(ev){ var r=w.getBoundingClientRect(); return s2w(ev.clientX-r.left,ev.clientY-r.top); }
  var drag=null;
  w.addEventListener('wheel',function(ev){ if(S.space==='model'||!S.mspace) return; var v=findE(S.mspace); if(!v) return; ev.preventDefault(); ev.stopImmediatePropagation(); if(v.lock){ vpLockedMsg(v); return; }
    var p=P(ev),m=vpPaperToModel(v,p.x,p.y),f=ev.deltaY<0?1.15:1/1.15; v.k*=f; v.cx=m.x-(p.x-v.x-v.w/2)/v.k; v.cy=m.y-(p.y-v.y-v.h/2)/v.k; v.auto=false; S.dirty=true; renderAll(); syncLayoutPanel(); },{capture:true,passive:false});
  w.addEventListener('mousedown',function(ev){ if(S.space==='model'||!S.mspace||ev.button!==0) return; var v=findE(S.mspace),p=P(ev); if(!v) return;
    if(!(p.x>=v.x&&p.x<=v.x+v.w&&p.y>=v.y&&p.y<=v.y+v.h)) return; ev.stopImmediatePropagation(); if(v.lock){ vpLockedMsg(v); return; } drag={x:ev.clientX,y:ev.clientY,v:v}; },true);
  window.addEventListener('mousemove',function(ev){ if(!drag) return; var v=drag.v,sc=S.vp.sc; v.cx-=(ev.clientX-drag.x)/sc/v.k; v.cy+=(ev.clientY-drag.y)/sc/v.k; drag.x=ev.clientX; drag.y=ev.clientY; v.auto=false; S.dirty=true; renderAll(); },true);
  window.addEventListener('mouseup',function(){ drag=null; },true);
  w.addEventListener('dblclick',function(ev){ if(S.space==='model'||S.tool!=='select') return; var p=P(ev),v=vpAt(p);
    if(S.mspace&&(!v||v.id!==S.mspace)){ mspaceExit(); return; }
    if(!S.mspace&&v&&!S.ents.some(function(e){return (e.tp==='txt'||e.tp==='mtext'||e.tp==='leader')&&hitEnt(e,p.x,p.y);})) mspaceEnter(v); },true);
  document.addEventListener('keydown',function(ev){ if(ev.key==='Escape'&&S.mspace){ mspaceExit(); } },true);
});

// ── abas de layout ──────────────────────────────────────────────────────────
function buildLayoutTabs(){
  var bar=document.getElementById('tabbar'); if(!bar) return;
  bar.textContent='';
  function tab(id,label,active,isLayout){ var d=document.createElement('div'); d.className='tbtab'+(isLayout?' layout-tab':'')+(active?' active':''); d.id=id==='model'?'tab-model':'tab-'+id;
    var dot=document.createElement('div'); dot.className='tb-dot'; d.appendChild(dot); d.appendChild(document.createTextNode(label));
    d.addEventListener('click',function(){ switchSpace(id); });
    if(isLayout){ d.title='Duplo clique: renomear · Botão direito: mais opções'; d.addEventListener('dblclick',function(){ layoutRename(id); }); d.addEventListener('contextmenu',function(ev){ ev.preventDefault(); layoutMenu(id,ev.clientX,ev.clientY); }); }
    bar.appendChild(d); return d; }
  tab('model','Model',S.space==='model',false);
  if(!S.layouts.length){ var t=tab('layout','Layout1',false,true); t.id='tab-layout1'; }
  S.layouts.forEach(function(L,i){ var t=tab(L.id,L.name,S.space===L.id,true); if(i===0&&!document.getElementById('tab-layout1')) t.setAttribute('data-first','1'); });
  var add=document.createElement('button'); add.className='tb-add'; add.title='Novo layout — LAYOUT'; add.setAttribute('data-cmd','LAYOUT'); add.textContent='＋'; add.addEventListener('click',function(){ layoutNew(); }); bar.appendChild(add);
  if(!document.getElementById('tab-layout1')){ var f=bar.querySelector('[data-first]'); if(f) f.id='tab-layout1'; }
}
function layoutUniqueName(base){ var n=1,nm; do{ nm=base+n; n++; }while(S.layouts.some(function(l){return l.name===nm;})); return nm; }
function layoutNew(copyOf){
  ensureLayouts(); var src=copyOf||curLayout()||S.layouts[0];
  var L=newLayoutObj(layoutUniqueName('Layout'),src.fmt,src.paper.w>=src.paper.h); L.margins=JSON.parse(JSON.stringify(src.margins)); L.plotStyle=src.plotStyle;
  if(copyOf){ L.name=layoutUniqueName(copyOf.name+' (2) ').replace(/ (\d+)$/,'$1'); var ents=copyOf.id===S.space?S.ents:copyOf.ents; L.ents=JSON.parse(JSON.stringify(ents)); L.ents.forEach(function(e){e.id=uid();}); L._init=true; }
  S.layouts.push(L); S.dirty=true; switchSpace(L.id); log('Layout "'+L.name+'" criado.','ok'); return L;
}
function layoutRename(id){ var L=S.layouts.filter(function(l){return l.id===id;})[0]; if(!L) return; var nm=prompt('Nome do layout:',L.name); if(nm===null) return; nm=nm.trim().slice(0,40);
  if(!nm) return; if(S.layouts.some(function(l){return l!==L&&l.name===nm;})){ alert('Já existe um layout com esse nome.'); return; } L.name=nm; S.dirty=true; buildLayoutTabs(); syncLayoutPanel(); }
function layoutDelete(id){ if(S.layouts.length<=1){ alert('O desenho precisa de pelo menos um layout.'); return; } var L=S.layouts.filter(function(l){return l.id===id;})[0]; if(!L) return;
  if(!confirm('Excluir o layout "'+L.name+'" e tudo o que foi desenhado nele?')) return;
  if(S.space===id) switchSpace('model'); S.layouts=S.layouts.filter(function(l){return l!==L;}); S.dirty=true; buildLayoutTabs(); log('Layout excluído.','ok'); }
function layoutMenu(id,x,y){
  var old=document.getElementById('ly-menu'); if(old) old.remove();
  var m=document.createElement('div'); m.id='ly-menu'; m.style.left=x+'px'; m.style.top=(y-130)+'px';
  [['Novo layout',function(){layoutNew();}],['Renomear…',function(){layoutRename(id);}],['Duplicar',function(){ var L=S.layouts.filter(function(l){return l.id===id;})[0]; if(S.space===id) spaceSave(); layoutNew(L); }],['Excluir',function(){layoutDelete(id);}]].forEach(function(it){
    var b=document.createElement('div'); b.className='ly-mi'; b.textContent=it[0]; b.addEventListener('click',function(){ m.remove(); it[1](); }); m.appendChild(b); });
  document.body.appendChild(m); setTimeout(function(){ document.addEventListener('click',function rm(){ m.remove(); document.removeEventListener('click',rm); }); },0);
}

// ── barra de configuração da página ─────────────────────────────────────────
function curViewport(){ var s=S.sel.map(findE).filter(function(e){return e&&e.tp==='viewport';})[0]; return s||(S.mspace&&findE(S.mspace))||S.ents.filter(function(e){return e.tp==='viewport';})[0]||null; }
function syncLayoutPanel(){
  var panel=document.getElementById('layoutPanel'); if(!panel) return;
  panel.classList.toggle('show',S.space!=='model');
  var L=curLayout(); if(!L) return;
  var ps=document.getElementById('lc-paper'); ps.value=L.fmt;
  document.getElementById('lc-orient').value=L.paper.w>=L.paper.h?'land':'port';
  ['t','r','b','l'].forEach(function(k){ document.getElementById('lc-m'+k).value=L.margins[k]; });
  var st=document.getElementById('lc-plot'); if(st) st.value=L.plotStyle;
  var v=curViewport(),sc=document.getElementById('lc-scale');
  if(v){ var r=vpRatio(v),opt=VP_SCALES.filter(function(s){return Math.abs(s[1]-r)<1e-9*Math.max(1,r);})[0]; sc.value=opt?String(opt[1]):'custom';
    var co=sc.querySelector('option[value="custom"]'); co.textContent=opt?'Outra…':ratioLabel(r); }
  var mb=document.getElementById('btn-mspace'); if(mb) mb.textContent=S.mspace?'⬛ MSPACE':'⬜ PSPACE';
  var info=document.getElementById('lc-info'); if(info) info.textContent=L.name+' · '+L.fmt+(L.paper.w>=L.paper.h?' paisagem':' retrato')+' · '+(v?'viewport '+ratioLabel(vpRatio(v)):'sem viewport')+' · '+({mono:'Monocromático',color:'Colorido',gray:'Tons de cinza'})[L.plotStyle];
}
function layoutApply(){
  var L=curLayout(); if(!L) return;
  var fmt=document.getElementById('lc-paper').value,land=document.getElementById('lc-orient').value!=='port',f=NBR_FMT[fmt]||NBR_FMT.A4;
  var fmtChanged=fmt!==L.fmt;
  L.fmt=fmt; L.paper={w:land?Math.max(f[0],f[1]):Math.min(f[0],f[1]),h:land?Math.min(f[0],f[1]):Math.max(f[0],f[1])};
  if(fmtChanged){ L.margins=nbrMargins(fmt); } else ['t','r','b','l'].forEach(function(k){ var v=parseFloat(document.getElementById('lc-m'+k).value); if(v>=0&&v<200) L.margins[k]=v; });
  var st=document.getElementById('lc-plot'); if(st) L.plotStyle=st.value;
  S.ents.forEach(function(e){ if(e.tp==='viewport'&&e.auto){ var r=printableRect(L); e.x=r.x; e.y=r.y; e.w=r.w; e.h=r.h; vpFit(e); } });
  S.dirty=true; paperFit(); syncLayoutPanel(); renderAll();
}
function layoutOrient(){ layoutApply(); }
function layoutScaleChange(val){
  var v=curViewport(); if(!v){ log('Não há viewport neste layout.','er'); return; }
  if(vpLockedMsg(v)){ syncLayoutPanel(); return; }
  snapshot();
  if(val==='0'){ vpFit(v); }
  else if(val==='custom'){ var n=prompt('Escala da viewport: digite n para 1:n (ex.: 150) ou n:1 (ex.: 3:1)','100'); if(n===null){ S.undos.pop(); syncLayoutPanel(); return; }
    var m=/^\s*(\d+(?:[.,]\d+)?)\s*:\s*1\s*$/.exec(n),r=m?parseFloat(m[1].replace(',','.')):1/parseFloat(String(n).replace(',','.').replace(/^1\s*:\s*/,'')); if(!(r>0)){ S.undos.pop(); alert('Escala inválida.'); return; } v.k=r*unitMm(); }
  else v.k=parseFloat(val)*unitMm();
  v.auto=false; syncLayoutPanel(); renderAll(); log('Viewport em '+ratioLabel(vpRatio(v))+'.','ok');
}
function layoutFit(){ var v=curViewport(); if(!v) return; if(vpLockedMsg(v)) return; snapshot(); vpFit(v); syncLayoutPanel(); renderAll(); log('Viewport ajustada ao desenho: '+ratioLabel(vpRatio(v))+'.','ok'); }
function layoutRender(){ renderAll(); }
function lyZoom(d){ doZoom(d>0?1.25:0.8,cvW()/2,cvH()/2); }
function lyZoomFit(){ zoomFit(); }

// ── carimbo ABNT e tabela (no papel) ─────────────────────────────────────────
function titleBlockInsert(){
  if(S.space==='model'){ log('O carimbo é inserido num layout (espaço do papel).','er'); return; }
  var L=curLayout(),r=printableRect(L),W=Math.min(178,r.w),H=40,x0=r.x+r.w-W,y0=r.y,name='CARIMBO_ABNT_'+Math.round(W);
  var d=new Date(),dt=('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear();
  var rows=[8,8,12,12],ys=[H],L2=[];
  rows.forEach(function(h){ ys.push(ys[ys.length-1]-h); });
  function ln(a,b,c,e2){ L2.push({tp:'line',x1:a,y1:b,x2:c,y2:e2,ly:0,lw:.25}); }
  L2.push({tp:'pl',closed:true,pts:[{x:0,y:0},{x:W,y:0},{x:W,y:H},{x:0,y:H},{x:0,y:0}],ly:0,lw:.5});
  ys.slice(1,-1).forEach(function(y){ ln(0,y,W,y); });
  ln(W*0.5,ys[1],W*0.5,ys[2]); [0.45,0.65,0.82].forEach(function(f){ ln(W*f,ys[3],W*f,ys[4]); });
  var lab=[[1,ys[1]+5.2,'INSTITUIÇÃO'],[1,ys[2]+5.2,'CURSO'],[W*0.5+1,ys[2]+5.2,'DISCIPLINA'],[1,ys[3]+9.2,'TÍTULO DO DESENHO'],[1,ys[4]+9.2,'DESENHISTA'],[W*0.45+1,ys[4]+9.2,'DATA'],[W*0.65+1,ys[4]+9.2,'ESCALA'],[W*0.82+1,ys[4]+9.2,'FOLHA']];
  lab.forEach(function(t){ L2.push({tp:'mtext',x:t[0],y:t[1],w:0,h:1.6,txt:t[2],att:7,rot:0,ly:0}); });
  S.blocks[name]={base:{x:0,y:0},ents:L2.map(function(e){ e.id='cb'+Math.random().toString(36).slice(2,8); return e; })};
  snapshot();
  // a viewport automática passa a ficar acima do carimbo (antes de ler a escala)
  S.ents.forEach(function(e){ if(e.tp==='viewport'&&e.auto){ var top=y0+H+3; e.h=r.y+r.h-top-2; e.y=top; e.x=r.x+2; e.w=r.w-4; vpFit(e); } });
  var v=curViewport(),esc=v?ratioLabel(vpRatio(v)):'1:1';
  var frame={id:uid(),tp:'pl',closed:true,pts:[{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h},{x:r.x,y:r.y}],ly:0,lw:.7};
  S.ents.push(frame);
  S.ents.push({id:uid(),tp:'insert',name:name,x:x0,y:y0,s:1,rot:0,m:false,ly:0});
  function fld(x,y,txt,h){ S.ents.push({id:uid(),tp:'mtext',x:x0+x,y:y0+y,w:0,h:h||2.5,txt:txt,att:7,rot:0,ly:0}); }
  fld(14,ys[1]+1.6,'UNIVERSIDADE FEDERAL DO TOCANTINS – Câmpus de Gurupi',2.5);
  fld(9,ys[2]+1.6,'Agronomia',2.5); fld(W*0.5+15,ys[2]+1.6,'Desenho Técnico',2.5);
  fld(2,ys[3]+2.5,'TÍTULO DO DESENHO',3.5);
  fld(2,ys[4]+2.5,'Nome do aluno',2.5); fld(W*0.45+2,ys[4]+2.5,dt,2.5); fld(W*0.65+2,ys[4]+2.5,esc,2.5); fld(W*0.82+2,ys[4]+2.5,'01/01',2.5);
  S.dirty=true; renderAll(); syncLayoutPanel();
  log('Carimbo ABNT inserido (margem + legenda '+Math.round(W)+'×'+H+' mm). Duplo clique nos campos para editar.','ok');
}
function showLegendEditor(){ // "Legenda": tabela simples no papel (campos editáveis por duplo clique)
  if(S.space==='model') return;
  var L=curLayout(),r=printableRect(L),cw=[12,60,25,40],rh=6,cols=['Nº','Descrição','Quant.','Observação'],nrow=4,x0=r.x+3,y0=r.y+r.h-3,W=cw.reduce(function(a,b){return a+b;},0);
  snapshot();
  S.ents.push({id:uid(),tp:'pl',closed:true,pts:[{x:x0,y:y0},{x:x0+W,y:y0},{x:x0+W,y:y0-rh*(nrow+1)},{x:x0,y:y0-rh*(nrow+1)},{x:x0,y:y0}],ly:0,lw:.5});
  for(var i=1;i<=nrow;i++) S.ents.push({id:uid(),tp:'line',x1:x0,y1:y0-rh*i,x2:x0+W,y2:y0-rh*i,ly:0,lw:i===1?.35:.18});
  var cx=x0; cw.slice(0,-1).forEach(function(w){ cx+=w; S.ents.push({id:uid(),tp:'line',x1:cx,y1:y0,x2:cx,y2:y0-rh*(nrow+1),ly:0,lw:.18}); });
  cx=x0; cols.forEach(function(c,ci){ S.ents.push({id:uid(),tp:'mtext',x:cx+1.5,y:y0-rh+1.6,w:0,h:2.5,txt:c,att:7,rot:0,ly:0});
    for(var ri=1;ri<nrow+1;ri++) S.ents.push({id:uid(),tp:'mtext',x:cx+1.5,y:y0-rh*(ri+1)+1.6,w:0,h:2.5,txt:ci===0?String(ri):'…',att:7,rot:0,ly:0}); cx+=cw[ci]; });
  S.dirty=true; renderAll(); log('Tabela de legenda inserida no papel. Duplo clique nas células para editar.','ok');
}

// ── impressão em alta resolução ─────────────────────────────────────────────
function renderSheet(ppm){
  var L=curLayout(),G=plotGeom(L),W=Math.round(G.Wo*ppm),H=Math.round(G.Ho*ppm),cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var ctx=cv.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
  withLayout(L,function(){ renderPlot(ctx,L,ppm,H); });
  return cv;
}
function layoutPrint(){
  if(S.space==='model'){ switchSpace('layout'); }
  var L=curLayout(),G=plotGeom(L),ppm=Math.min(300/25.4,Math.sqrt(36e6/(G.Wo*G.Ho))),cv=renderSheet(ppm),url=cv.toDataURL('image/png');
  var w=window.open('','_blank'); if(!w){ log('O navegador bloqueou a janela de impressão. Permita pop-ups para este site.','er'); return; }
  w.document.write('<html><head><title>'+escHTML(L.name)+' — EduCAD</title><style>*{margin:0;padding:0}body{background:#fff}@page{margin:0;size:'+G.Wo+'mm '+G.Ho+'mm}img{width:'+G.Wo+'mm;height:'+G.Ho+'mm;display:block}</style></head><body><img src="'+url+'"></body></html>');
  w.document.close(); w.focus(); setTimeout(function(){ w.print(); },400);
  log('Layout "'+L.name+'" enviado para impressão ('+Math.round(ppm*25.4)+' dpi, '+G.Wo+'×'+G.Ho+' mm). Para escala exata e vetorial, prefira 📄 PDF.','ok');
}

// ── arquivo: salvar/abrir layouts; exportações usam o modelo ────────────────
function layoutsForSave(){ return S.layouts.map(function(L){ return {id:L.id,name:L.name,fmt:L.fmt,paper:L.paper,margins:L.margins,plotStyle:L.plotStyle,plot:L.plot||null,ents:L.id===S.space?S.ents:L.ents}; }); }
function loadLayouts(d){
  S.space='model'; S.modelEnts=null; S.mspace=null; LY.active='model'; document.body.classList.remove('paper');
  S.layouts=Array.isArray(d.layouts)?d.layouts.filter(function(L){return L&&L.paper&&Array.isArray(L.ents);}).map(function(L){
    return {id:String(L.id||('L'+Math.random().toString(36).slice(2,8))),name:String(L.name||'Layout').slice(0,40),fmt:NBR_FMT[L.fmt]?L.fmt:'A4',paper:{w:+L.paper.w||297,h:+L.paper.h||210},
      margins:(!L.margins||nbrOldDefault(L.margins))?nbrMargins(L.fmt):L.margins,_migr:nbrOldDefault(L.margins),plotStyle:['mono','color','gray'].indexOf(L.plotStyle)>=0?L.plotStyle:'mono',ents:L.ents,plot:(L.plot&&typeof L.plot==='object')?L.plot:null,undos:[],redos:[],view:null,_init:true}; }):[];
  // viewports automáticas dos layouts migrados acompanham a nova área útil
  var mig=S.layouts.filter(function(L){ return L._migr; });
  mig.forEach(function(L){ var r=printableRect(L); L.ents.forEach(function(e){ if(e.tp==='viewport'&&e.auto){ e.x=r.x; e.y=r.y; e.w=r.w; e.h=r.h; if(typeof vpFit==='function') vpFit(e); } }); delete L._migr; });
  S.layouts.forEach(function(L){ delete L._migr; });
  if(mig.length) setTimeout(function(){ log('Margens do(s) layout(s) atualizadas para a ABNT NBR 16752:2020 (esquerda 20 mm, demais 10 mm). A moldura e o carimbo já inseridos não mudam: insira o carimbo de novo, se quiser.','inf'); },0);
  buildLayoutTabs(); syncLayoutPanel();
}
function layoutMarginsNBR(){ var L=curLayout(); if(!L) return; L.margins=nbrMargins(L.fmt); ['t','r','b','l'].forEach(function(k){ document.getElementById('lc-m'+k).value=L.margins[k]; }); layoutApply(); log('Margens ABNT NBR 16752:2020: esquerda 20 mm, superior, direita e inferior 10 mm.','ok'); }
function withModel(fn){ if(S.space==='model') return fn(); var e=S.ents; S._curPaper={id:S.space,ents:e}; S.ents=S.modelEnts||[]; var sp=S.space; S.space='model'; try{ return fn(); } finally { S.ents=e; S.space=sp; S._curPaper=null; } }
(function(){ var a=buildDXF2000,b=buildDXF,c=buildSVG,d=collectExport,sv=saveDoc;
  buildDXF2000=function(o){ return withModel(function(){ return a(o); }); };
  buildDXF=function(){ return withModel(function(){ return b(); }); };
  buildSVG=function(){ return withModel(function(){ return c(); }); };
  collectExport=function(v){ return withModel(function(){ return d(v); }); };
  saveDoc=function(){ if(S.space==='model') return sv(); spaceSave(); var e=S.ents,vp=S.vp,sp=S.space; S.ents=S.modelEnts; S.vp=S.modelVp||S.vp; S.space='model';
    try{ return sv(); } finally { S.ents=e; S.vp=vp; S.space=sp; } };
  var dx=dxfIn; dxfIn=function(m){ if(S.space!=='model') switchSpace('model'); return dx(m); };
})();
window.addEventListener('load',function(){
  // controles da página
  var sc=document.getElementById('lc-scale');
  if(sc){ sc.textContent=''; sc.removeAttribute('onchange'); sc.onchange=function(){ layoutScaleChange(sc.value); };
    VP_SCALES.forEach(function(s){ var o=document.createElement('option'); o.value=String(s[1]); o.textContent=s[0]; sc.appendChild(o); });
    var c=document.createElement('option'); c.value='custom'; c.textContent='Outra…'; sc.appendChild(c); var f=document.createElement('option'); f.value='0'; f.textContent='Ajustar ao desenho'; sc.appendChild(f); }
  var ps=document.getElementById('lc-paper');
  if(ps){ ps.textContent=''; ['A4','A3','A2','A1','A0'].forEach(function(k){ var o=document.createElement('option'); o.value=k; o.textContent=k+' ('+NBR_FMT[k][0]+'×'+NBR_FMT[k][1]+')'; ps.appendChild(o); }); }
  var lbl=document.querySelector('#layoutControls .lc-grp:nth-child(3) .lc-lbl'); if(lbl) lbl.textContent='ESCALA DA VIEWPORT';
  var leg=Array.prototype.filter.call(document.querySelectorAll('#layoutControls .lc-btn'),function(b){return /Legenda/.test(b.textContent);})[0];
  if(leg){ leg.textContent='📋 Tabela';
    var cb=document.createElement('button'); cb.className='lc-btn'; cb.textContent='🗂 Carimbo ABNT'; cb.title='Margem + legenda (NBR 16752 / NBR 10582) no papel — CARIMBO'; cb.setAttribute('data-cmd','CARIMBO'); cb.onclick=function(){ titleBlockInsert(); }; leg.parentNode.insertBefore(cb,leg);
    var g=document.createElement('div'); g.className='lc-grp'; g.innerHTML='<span class="lc-lbl">PLOTAGEM</span>';
    var s2=document.createElement('select'); s2.className='lc-sel'; s2.id='lc-plot'; [['mono','Monocromático'],['color','Colorido'],['gray','Tons de cinza']].forEach(function(o){ var op=document.createElement('option'); op.value=o[0]; op.textContent=o[1]; s2.appendChild(op); });
    s2.onchange=layoutApply; g.appendChild(s2); cb.parentNode.insertBefore(g,cb); var sep=document.createElement('div'); sep.className='lc-sep'; cb.parentNode.insertBefore(sep,cb); }
  buildLayoutTabs();
});

// Diálogo antigo de legenda (substituído pela tabela no papel): funções mantidas por compatibilidade
function lgAddRow(){} function lgAddCol(){} function lgDelRow(){} function lgDelCol(){} function lgPreviewUpdate(){}
function lgRemove(){ closeOv('ov-legend'); } function lgSave(){ closeOv('ov-legend'); }

// ═══ v7.5 (L2): camada VIEWPORTS (não imprime), camadas que não imprimem, congelar por viewport, MVIEW completo ═══
function nextLayerId(){ var m=0; S.layers.forEach(function(l){ var n=+l.id; if(isFinite(n)&&n>m&&n<1e9) m=n; }); return m+1; }
function vpLayerId(){ var l=S.layers.filter(function(x){return x.nm==='VIEWPORTS';})[0];
  if(!l){ l={id:nextLayerId(),nm:'VIEWPORTS',col:'#7a8699',vis:true,lock:false,ld:'solid',lw:.25,plot:false}; S.layers.push(l); if(typeof updLayerUI==='function'&&document.getElementById('lylist')){ updLayerUI(); updLayerSel(); } }
  return l.id; }
function vpMigrate(L){ (L?L.ents:S.ents).forEach(function(e){ if(e.tp==='viewport'&&(e.ly===0||e.ly===undefined)) e.ly=vpLayerId(); }); }
function togPlot(id){ var l=getLy(id); if(!l) return; l.plot=l.plot===false?true:false; S.dirty=true; updLayerUI(); renderAll(); log('Camada "'+l.nm+'": '+(l.plot===false?'não imprime':'imprime')+'.','ok'); }
function vpFreezeToggle(lyId){
  if(S.space==='model'){ log('Congelar por viewport: abra um layout.','er'); return; }
  var v=curViewport(); if(!v){ log('Não há viewport neste layout.','er'); return; }
  snapshot(); v.frz=v.frz||[]; var k=v.frz.map(String).indexOf(String(lyId));
  if(k>=0) v.frz.splice(k,1); else v.frz.push(lyId);
  var l=getLy(lyId); log('Camada "'+(l?l.nm:lyId)+'" '+(k>=0?'descongelada':'congelada')+' na viewport '+ratioLabel(vpRatio(v))+'.','ok');
  renderAll(); updLayerUI(); updSelInfo();
}
(function(){ var u0=updLayerUI;
  updLayerUI=function(){ u0(); var v=(S.space!=='model'&&typeof curViewport==='function')?curViewport():null;
    Array.prototype.forEach.call(document.querySelectorAll('#lylist .lyrow'),function(row){
      var id=row.getAttribute('data-id'),l=getLy(isNaN(+id)?id:+id); if(!l) return;
      var pr=document.createElement('span'); pr.className='lyico'+(l.plot===false?' dim':''); pr.textContent='🖨'; pr.title=l.plot===false?'Não imprime (clique para imprimir)':'Imprime (clique para não imprimir)';
      pr.addEventListener('click',function(ev){ ev.stopPropagation(); togPlot(l.id); }); row.appendChild(pr);
      if(v){ var fz=document.createElement('span'),on=vpFrozen(v,l.id); fz.className='lyico vpfz'+(on?' on':' dim'); fz.textContent='❄';
        fz.title=on?'Congelada na viewport atual (clique para descongelar)':'Congelar só na viewport atual'; fz.addEventListener('click',function(ev){ ev.stopPropagation(); vpFreezeToggle(l.id); }); row.appendChild(fz); }
    });
  };
  var s0=updSelInfo; updSelInfo=function(){ s0(); if(S.space!=='model') updLayerUI(); };
})();
function vpLockedMsg(v){ if(v&&v.lock){ var t=Date.now(); if(!S._lkt||t-S._lkt>1500){ S._lkt=t; log('Viewport travada (🔒): destrave nas propriedades ou com MVIEW > Travar.','er'); } return true; } return false; }
// divisão de uma área em 2, 3 ou 4 viewports
function vpSplit(r,n){ var g=3,o=[];
  if(n===2){ var w=(r.w-g)/2; o=[{x:r.x,y:r.y,w:w,h:r.h},{x:r.x+w+g,y:r.y,w:w,h:r.h}]; }
  else if(n===3){ var w3=(r.w-g)/2,h3=(r.h-g)/2; o=[{x:r.x,y:r.y+h3+g,w:w3,h:h3},{x:r.x,y:r.y,w:w3,h:h3},{x:r.x+w3+g,y:r.y,w:w3,h:r.h}]; }
  else { var w4=(r.w-g)/2,h4=(r.h-g)/2; o=[{x:r.x,y:r.y+h4+g,w:w4,h:h4},{x:r.x+w4+g,y:r.y+h4+g,w:w4,h:h4},{x:r.x,y:r.y,w:w4,h:h4},{x:r.x+w4+g,y:r.y,w:w4,h:h4}]; }
  return o; }
function vpFromObject(e){
  var Q=null;
  if(e.tp==='circ') Q=arcPts(e.cx,e.cy,e.r,0,2*Math.PI).slice(0,-1);
  else if(e.tp==='ell') Q=ellPoints(e,72).slice(0,-1);
  else if(e.tp==='rect') Q=[{x:e.x,y:e.y},{x:e.x+e.w,y:e.y},{x:e.x+e.w,y:e.y+e.h},{x:e.x,y:e.y+e.h}];
  else if(e.tp==='pl'&&e.closed){ Q=plHasArc(e)?plSample(e,24):e.pts.slice(); if(Q.length>3&&Math.hypot(Q[0].x-Q[Q.length-1].x,Q[0].y-Q[Q.length-1].y)<1e-9) Q.pop(); }
  return Q&&Q.length>=3?Q.map(function(p){return {x:p.x,y:p.y};}):null;
}
function vpMakePoly(Q){ var b=ptsBox(Q),v=newViewport(b); v.clip=Q; v.auto=false; vpSyncBox(v,false); vpFit(v); return v; }
NC.mview={
  init:function(ds){ if(S.space==='model'){ log('MVIEW funciona num layout.','er'); ds.phase='none'; ncEnd(); return; } ds.phase='p1'; ds.poly=[]; },
  prompt:function(ds){ return {p1:'MVIEW Especifique o canto da viewport ou [Ajustar/Travar/Objeto/Poligonal/2/3/4] <Ajustar>:',p2:'Especifique o canto oposto:',
    lockq:'Travar a escala da viewport? [Sim/Não] <Sim>:',locksel:'Selecione as viewports (Enter conclui):',obj:'Selecione o objeto fechado para recortar a viewport (polilinha fechada, círculo, elipse, retângulo):',
    poly:ds.poly.length?'Especifique o próximo ponto ou [Desfazer] (Enter fecha):':'Especifique o ponto inicial:',n1:'Especifique o primeiro canto da área ou [Ajustar] <Ajustar>:',n2:'Especifique o canto oposto:'}[ds.phase]||''; },
  make:function(list){ snapshot(); list.forEach(function(v){ S.ents.push(v); }); log(list.length+' viewport(s) criada(s) em '+list.map(function(v){return ratioLabel(vpRatio(v));}).join(', ')+'.','ok'); ncEnd(); syncLayoutPanel(); renderAll(); },
  rectVp:function(r){ var v=newViewport(r); v.auto=false; return v; },
  click:function(ds,pt){
    if(ds.phase==='p1'){ ds.a={x:pt.x,y:pt.y}; ds.pts=[ds.a]; ds.phase='p2'; return; }
    if(ds.phase==='p2'||ds.phase==='n2'){ var r={x:Math.min(ds.a.x,pt.x),y:Math.min(ds.a.y,pt.y),w:Math.abs(pt.x-ds.a.x),h:Math.abs(pt.y-ds.a.y)}; if(r.w<2||r.h<2) return;
      if(ds.phase==='p2') this.make([this.rectVp(r)]); else this.make(vpSplit(r,ds.n).map(this.rectVp)); return; }
    if(ds.phase==='n1'){ ds.a={x:pt.x,y:pt.y}; ds.pts=[ds.a]; ds.phase='n2'; return; }
    if(ds.phase==='locksel'){ var h=null; for(var i=S.ents.length-1;i>=0;i--){ var e=S.ents[i]; if(e.tp==='viewport'&&hitEnt(e,pt.x,pt.y)){h=e;break;} }
      if(h&&ds.lk.indexOf(h.id)<0){ ds.lk.push(h.id); S.sel=ds.lk.slice(); } return; }
    if(ds.phase==='obj'){ var o=null; for(var j=S.ents.length-1;j>=0;j--){ var e2=S.ents[j]; if(e2.tp!=='viewport'&&hitEnt(e2,pt.x,pt.y)){o=e2;break;} }
      var Q=o&&vpFromObject(o); if(!Q){ log('Selecione uma polilinha fechada, círculo, elipse ou retângulo.','er'); return; }
      snapshot(); S.ents=S.ents.filter(function(x){return x!==o;}); var v=vpMakePoly(Q); S.ents.push(v); log('Viewport recortada pelo objeto ('+ratioLabel(vpRatio(v))+').','ok'); ncEnd(); syncLayoutPanel(); renderAll(); return; }
    if(ds.phase==='poly'){ ds.poly.push({x:pt.x,y:pt.y}); ds.pts=[ds.poly[ds.poly.length-1]]; return; }
  },
  input:function(ds,u,raw){
    if(ds.phase==='p1'){
      if(u===''||u==='A'||u==='F'||u==='AJUSTAR'){ this.make([this.rectVp(printableRect(curLayout()))]); return true; }
      if(u==='T'||u==='L'||u==='TRAVAR'||u==='LOCK'){ ds.phase='lockq'; return true; }
      if(u==='O'||u==='OBJETO'||u==='OBJECT'){ ds.phase='obj'; return true; }
      if(u==='P'||u==='POLIGONAL'||u==='POLYGONAL'){ ds.phase='poly'; ds.poly=[]; return true; }
      if(u==='2'||u==='3'||u==='4'){ ds.n=+u; ds.phase='n1'; return true; }
      var p=parseCoord(raw); if(!p) return false; this.click(ds,p); return true; }
    if(ds.phase==='n1'){ if(u===''||u==='A'||u==='F'){ this.make(vpSplit(printableRect(curLayout()),ds.n).map(this.rectVp)); return true; } var q=parseCoord(raw); if(!q) return false; this.click(ds,q); return true; }
    if(ds.phase==='lockq'){ if(u===''||u==='S'||u==='Y'||u==='SIM') ds.lockOn=true; else if(u==='N'||u==='NAO'||u==='NÃO') ds.lockOn=false; else return false;
      var pre=S.sel.map(findE).filter(function(e){return e&&e.tp==='viewport';}); if(pre.length){ ds.lk=pre.map(function(e){return e.id;}); return this.input(Object.assign(ds,{phase:'locksel'}),'',''); }
      ds.lk=[]; ds.phase='locksel'; return true; }
    if(ds.phase==='locksel'){ if(u!=='') return false; if(!ds.lk.length){ ncEnd(); return true; } snapshot(); ds.lk.forEach(function(id){ var v=findE(id); if(v) v.lock=ds.lockOn; });
      log(ds.lk.length+' viewport(s) '+(ds.lockOn?'travada(s) 🔒':'destravada(s)')+'.','ok'); ncEnd(); renderAll(); syncLayoutPanel(); return true; }
    if(ds.phase==='poly'){ if(u==='D'||u==='U'||u==='DESFAZER'){ ds.poly.pop(); return true; }
      if(u===''){ if(ds.poly.length<3){ log('São necessários pelo menos 3 pontos.','er'); return true; } var v=vpMakePoly(ds.poly.slice()); this.make([v]); return true; }
      var r2=ncPointFrom(raw,ds.poly.length?ds.poly[ds.poly.length-1]:null); if(!r2) return false; this.click(ds,r2); return true; }
    if(ds.phase==='obj'){ if(u===''){ ncEnd(); return true; } return false; }
    var p2=parseCoord(raw); if(!p2) return false; this.click(ds,p2); return true;
  },
  preview:function(ctx,ds,hp){
    ctx.save(); ctx.setLineDash([6,3]); ctx.strokeStyle='#1f6fd6'; ctx.lineWidth=1.2;
    if((ds.phase==='p2'||ds.phase==='n2')&&ds.a){ var r={x:Math.min(ds.a.x,hp.x),y:Math.min(ds.a.y,hp.y),w:Math.abs(hp.x-ds.a.x),h:Math.abs(hp.y-ds.a.y)};
      (ds.phase==='p2'?[r]:vpSplit(r,ds.n)).forEach(function(q){ var a=w2s(q.x,q.y+q.h),b=w2s(q.x+q.w,q.y); ctx.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y); }); }
    if(ds.phase==='poly'&&ds.poly.length){ ctx.beginPath(); ds.poly.concat([hp]).forEach(function(p,i){ var q=w2s(p.x,p.y); if(i) ctx.lineTo(q.x,q.y); else ctx.moveTo(q.x,q.y); }); ctx.closePath(); ctx.stroke(); }
    ctx.restore();
  }
};
