// ── UNDO / REDO ──────────────────────────────────────────────
// v6.1: modelo único — snapshot() é chamado ANTES de cada mutação e guarda o estado anterior.
// undo() troca o estado atual pelo topo da pilha; redo() faz o inverso.
var UNDO_MAX=100;
function snapshot(){S.undos.push(JSON.stringify(S.ents));if(S.undos.length>UNDO_MAX)S.undos.shift();S.redos=[];S.dirty=true;}
function resetHistory(){S.undos=[];S.redos=[];}
function undo(){if(!S.undos.length){log('Nada para desfazer.','er');return;}S.redos.push(JSON.stringify(S.ents));S.ents=JSON.parse(S.undos.pop());S.sel=[];S.dirty=true;log('Desfeito.');renderAll();updStatus();updSelInfo();}
function redo(){if(!S.redos.length){log('Nada para refazer.','er');return;}S.undos.push(JSON.stringify(S.ents));S.ents=JSON.parse(S.redos.pop());S.sel=[];S.dirty=true;log('Refeito.');renderAll();updStatus();updSelInfo();}

// ── SELECTION ────────────────────────────────────────────────
function delSel(){if(!S.sel.length)return;snapshot();var set=S.sel;S.ents=S.ents.filter(function(e){return set.indexOf(e.id)<0;});S.sel=[];log('Apagado.','ok');renderAll();updStatus();updSelInfo();}
function selAll(){S.sel=S.ents.map(function(e){return e.id;});renderAll();updSelInfo();}
function finishSpline(){S.lastTool='spline';
  if(!S.ds||!S.ds.pts||S.ds.pts.length<2){S.ds=null;return;}
  addE({tp:'spline',pts:S.ds.pts.map(function(p){return{x:p.x,y:p.y};})});
  log('SPLINE: '+S.ds.pts.length+' pontos','ok');
  S.ds=null;logp('SPLINE: 1º ponto:');
}


function showHatchDlg(){
  document.getElementById('ov-hatch').classList.add('show');
}
function hpUpdate(){
  var sel=document.getElementById('hpat-sel');
  var val=sel.value.split('|');
  document.getElementById('hpat-ang').value=val[1]||45;
  document.getElementById('hpat-sp').value=val[2]||5;
}
function confirmHatch(){
  var sel=document.getElementById('hpat-sel');
  if(sel.selectedIndex<0) sel.selectedIndex=0; // v7.8: OK sem escolher um padrão usava um item inexistente
  var parts=sel.value.split('|');
  var name=sel.options[sel.selectedIndex].text;
  S.hatchPat={
    name:name,
    type:parts[0]||'lines',
    ang:parseInt(document.getElementById('hpat-ang').value)||45,
    sp:parseFloat(document.getElementById('hpat-sp').value)||5
  };
  closeOv('ov-hatch');
  setTool('hatch');
}

function showAbout(){
  document.getElementById('ov-about').classList.add('show');
}

function cancelTool(){
  if(S.grip){ gripEnd(); return; }  // 1º Esc cancela o grip; o 2º limpa a seleção
  S.ds=null;S.sel=[];S.isWin=false;S.winFrom=null;
  document.getElementById('cmdinput').removeAttribute('tabindex');
  DI.active=false; // forçar DI inativo antes de diHide para evitar re-trigger
  diHide();
  // Retornar ao modo SELECT (padrão AutoCAD)
  S.tool='select';
  document.querySelectorAll('.rb').forEach(function(b){b.classList.remove('on');});
  var rb=document.getElementById('rb-select');if(rb)rb.classList.add('on');
  document.getElementById('stool').textContent='SELECT';
  S.wrap.style.cursor='default';
  renderAll();updSelInfo();
}

// ── VIEWPORT ─────────────────────────────────────────────────
function zoomFit(){
  if(!S.ents.length){S.vp={x:cvW()/2,y:cvH()/2,sc:2};renderAll();return;}
  var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(var i=0;i<S.ents.length;i++){var bb=bbox(S.ents[i]);if(bb){x0=Math.min(x0,bb.x);y0=Math.min(y0,bb.y);x1=Math.max(x1,bb.x+bb.w);y1=Math.max(y1,bb.y+bb.h);}}
  var ew=x1-x0||100,eh=y1-y0||100,W=cvW(),H=cvH();
  S.vp.sc=Math.min(W/ew,H/eh)*.8;
  S.vp.x=W/2-(x0+ew/2)*S.vp.sc;
  S.vp.y=H/2+(y0+eh/2)*S.vp.sc;
  renderAll();
}
function doZoom(f,sx,sy){
  sx=sx||cvW()/2;sy=sy||cvH()/2;
  var wb=s2w(sx,sy);
  S.vp.sc=Math.max(.02,Math.min(200,S.vp.sc*f));
  var wa=w2s(wb.x,wb.y);
  S.vp.x+=sx-wa.x;S.vp.y+=sy-wa.y;
  renderAll();
  document.getElementById('szoom').textContent=(S.vp.sc*50).toFixed(0)+'%';
}
function bbox(e){
  switch(e.tp){
    case 'line': return{x:Math.min(e.x1,e.x2),y:Math.min(e.y1,e.y2),w:Math.abs(e.x2-e.x1),h:Math.abs(e.y2-e.y1)};
    case 'circ': return{x:e.cx-e.r,y:e.cy-e.r,w:e.r*2,h:e.r*2};
    case 'arc':{var ap=[{x:e.cx+e.r*Math.cos(e.sa),y:e.cy+e.r*Math.sin(e.sa)},{x:e.cx+e.r*Math.cos(e.ea),y:e.cy+e.r*Math.sin(e.ea)}];
      for(var q=0;q<4;q++){var qa=q*Math.PI/2;if(arcHas(qa,e.sa,e.ea))ap.push({x:e.cx+e.r*Math.cos(qa),y:e.cy+e.r*Math.sin(qa)});}return ptsBox(ap);}
    case 'rect':case 'hatch': return{x:e.x,y:e.y,w:e.w,h:e.h};
    case 'ell': return ptsBox(ellPoints(e,36));
    case 'txt': return ptsBox(txtCorners(e));
    case 'dim':case 'dimr':case 'dimd':case 'dima': return dimBox(e);
    case 'spline':case 'pl': if(!e.pts.length)return null;var mx=e.pts[0].x,my=e.pts[0].y,Mx=mx,My=my;for(var i=0;i<e.pts.length;i++){mx=Math.min(mx,e.pts[i].x);my=Math.min(my,e.pts[i].y);Mx=Math.max(Mx,e.pts[i].x);My=Math.max(My,e.pts[i].y);}return{x:mx,y:my,w:Mx-mx,h:My-my};
    default: return null;
  }
}

