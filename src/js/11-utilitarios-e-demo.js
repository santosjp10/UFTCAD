// ── TEMPLATE ─────────────────────────────────────────────────
function showTemplate(){document.getElementById('ov-template').classList.add('show');}
function doTemplate(){var fs=document.getElementById('tf').value.split(',').map(Number),sc=parseFloat(document.getElementById('ts').value)||1,w=fs[0]*sc,h=fs[1]*sc,lb=25,m=5;snapshot();S.ents.unshift({id:uid(),tp:'rect',x:-w/2,y:-h/2,w:w,h:h,col:'#dce4f5',lw:1,ld:'solid',ly:0},{id:uid(),tp:'rect',x:-w/2+lb,y:-h/2+m,w:w-lb-m,h:h-2*m,col:'#4d9ef7',lw:.35,ld:'solid',ly:0},{id:uid(),tp:'line',x1:-w/2+lb,y1:-h/2+m+30,x2:w/2-m,y2:-h/2+m+30,col:'#4d9ef7',lw:.35,ld:'solid',ly:0},{id:uid(),tp:'txt',x:-w/2+lb+5,y:-h/2+m+20,txt:'EduCAD 2D | '+fs[0]+'×'+fs[1]+'mm | ABNT NBR 10068',h:6,col:'#8b97b8',lw:.35,ld:'solid',ly:0});zoomFit();closeOv('ov-template');log('Template '+fs[0]+'×'+fs[1]+'mm inserido.','ok');}

// ── TEXT CONFIRM ─────────────────────────────────────────────
function confirmText(){var txt=document.getElementById('tv').value||'Texto',h=parseFloat(document.getElementById('th').value)||10,wp=document.getElementById('twipeout')&&document.getElementById('twipeout').checked;if(S.ds&&S.ds.pts&&S.ds.pts[0]){addE({tp:'txt',x:S.ds.pts[0].x,y:S.ds.pts[0].y,txt:txt,h:h,wipeout:wp});}S.ds=null;closeOv('ov-text');}

// ── EDUCATIONAL SHORTCUTS ────────────────────────────────────
function lineCenter(){S.style.ld='center';S.style.col='#556688';S.style.lw=.35;document.getElementById('propLD').value='center';document.getElementById('propCol').value='#556688';setTool('line');}
function lineHidden(){S.style.ld='dashed';S.style.col='#557799';S.style.lw=.35;document.getElementById('propLD').value='dashed';document.getElementById('propCol').value='#557799';setTool('line');}

// ── MODALS ───────────────────────────────────────────────────
function closeOv(id){document.getElementById(id).classList.remove('show');}
function switchTab(n){for(var i=0;i<2;i++){document.getElementById('rtab'+i).classList.toggle('on',i===n);document.getElementById('tab'+i).classList.toggle('hide',i!==n);}}

// ── LOG ──────────────────────────────────────────────────────
function log(msg,type){var el=document.getElementById('cmdlog'),d=document.createElement('div');d.className='cl'+(type?' '+type:'');d.textContent=msg;el.appendChild(d);el.scrollTop=el.scrollHeight;if(el.children.length>80)el.removeChild(el.firstChild);}
function logp(msg){log(msg,'p');document.getElementById('cmdlbl').textContent=msg;}

// ── DEMO ─────────────────────────────────────────────────────
// v6.2: o aplicativo inicia com um desenho novo e vazio (o exemplo continua disponível pelo comando DEMO)
function startBlank(){
  resetLayouts();
  S.ents=[];S.sel=[];resetHistory();S.dirty=false;
  S.vp={x:cvW()/2,y:cvH()/2,sc:2};
  document.getElementById('ftitle').textContent='Sem título';
  updStatus();renderAll();
}
function loadDemo(){
  S.ents=[
    {id:'d1',tp:'rect',  x:-60,y:-40,w:120,h:80, col:'#dce4f5',lw:.7, ld:'solid', ly:0},
    {id:'d2',tp:'circ',  cx:0,cy:0,r:28,          col:'#dce4f5',lw:.7, ld:'solid', ly:0},
    {id:'d3',tp:'circ',  cx:0,cy:0,r:12,           col:'#dce4f5',lw:.35,ld:'dashed',ly:0},
    {id:'d4',tp:'line',  x1:-80,y1:0,x2:80,y2:0,  col:'#556688',lw:.35,ld:'center',ly:1},
    {id:'d5',tp:'line',  x1:0,y1:-55,x2:0,y2:55,  col:'#556688',lw:.35,ld:'center',ly:1},
    {id:'d6',tp:'dim',   x1:-60,y1:-40,x2:60,y2:-40,off:-58,val:'120.00',unit:'mm',col:'#f0c040',lw:.5,ld:'solid',ly:2},
    {id:'d7',tp:'dimr',  cx:0,cy:0,ex:28,ey:0,val:'28.00',unit:'mm',col:'#f0c040',lw:.5,ld:'solid',ly:2},
    {id:'d8',tp:'txt',   x:-55,y:-68,txt:'EduCAD 2D v8.7 — HELP = comandos. Enter=fim e clique na área de desenho',h:7,col:'#556688',lw:.35,ld:'solid',ly:0},
  ];
  resetHistory();S.dirty=false;syncIdCounter();zoomFit();updStatus();
}
// ── POLYGON ──────────────────────────────────────────────────
function startPolygon(){
  document.getElementById('ov-polygon').classList.add('show');
  // Atualizar hint no modal conforme seleção do método
  document.getElementById('pol-method').onchange=function(){
    var m=this.value;
    var hint=document.getElementById('pol-hint');
    var rrow=document.getElementById('pol-radius-row');
    if(m==='ic'){
      hint.textContent='Após OK, clique no centro. O raio vai do centro ao VÉRTICE.';
      rrow.style.display='';
      document.getElementById('pol-radius-lbl').textContent='Raio circunscrito (mm):';
    } else if(m==='cc'){
      hint.textContent='Após OK, clique no centro. O raio vai do centro ao MEIO DO LADO.';
      rrow.style.display='';
      document.getElementById('pol-radius-lbl').textContent='Apótema / raio inscrito (mm):';
    } else {
      hint.textContent='Após OK, clique em dois pontos que definem uma aresta do polígono.';
      rrow.style.display='none';
    }
  };
}

function confirmPolygon(){
  var sides=parseInt(document.getElementById('pol-sides').value)||6;
  sides=Math.max(3,Math.min(1024,sides));
  var method=document.getElementById('pol-method').value;
  closeOv('ov-polygon');
  S.tool='polygon';
  document.querySelectorAll('.rb').forEach(function(b){b.classList.remove('on');});
  var rb=document.getElementById('rb-polygon');if(rb)rb.classList.add('on');
  document.getElementById('stool').textContent='POLYGON';
  S.wrap.style.cursor='crosshair';

  if(method==='edge'){
    S.ds={sides:sides,method:'edge',p1:null};
    logp('POL '+sides+' lados — 1º vértice da aresta:');
  } else {
    var r=parseFloat(document.getElementById('pol-radius').value)||25;
    S.ds={sides:sides,method:method,center:null,radius:r};
    logp('POL '+sides+' lados ('+( method==='ic'?'Inscrito':'Circunscrito')+') — centro:');
  }
}

// Gera e adiciona o polígono ao modelo
function polyBuild(center,r,sides,method,startAng){
  // method 'ic': r = circunraio (centro ao vértice)
  // method 'cc': r = apótema (centro ao meio do lado) → circunraio = r/cos(PI/n)
  var R=method==='cc'?r/Math.cos(Math.PI/sides):r;
  var pts=[];
  for(var i=0;i<sides;i++){
    var a=startAng+i*(2*Math.PI/sides);
    pts.push({x:center.x+R*Math.cos(a),y:center.y+R*Math.sin(a)});
  }
  pts.push({x:pts[0].x,y:pts[0].y}); // fechar
  addE({tp:'pl',pts:pts,closed:true});
  var mt=method==='ic'?'inscrito':'circunscrito';
  log('Polígono '+sides+' lados ('+mt+') R='+r.toFixed(2)+'mm.','ok');
}

// ── DIM HELPERS ──────────────────────────────────────────────

