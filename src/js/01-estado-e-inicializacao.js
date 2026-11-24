
/* ═══════════════════════════════════════════════════════════
   EduCAD 2D v8.9 — Software Educacional Livre (Licença MIT)
   Estado 100% global em objeto S (state)
   ═══════════════════════════════════════════════════════════ */

// ── ESTADO GLOBAL ────────────────────────────────────────────
var S = {
  ents: [],
  layers: [
    {id:0,nm:'0',         col:'#dce4f5',vis:true,lock:false,ld:'solid', lw:.7},
    {id:1,nm:'Construção',col:'#556688',vis:true,lock:false,ld:'center',lw:.35},
    {id:2,nm:'Dimensão',  col:'#f0c040',vis:true,lock:false,ld:'solid', lw:.5},
    {id:3,nm:'Hachura',   col:'#6080a0',vis:true,lock:false,ld:'solid', lw:.35},
  ],
  curLy: 0,
  style: {col:null, lw:null, ld:null}, // null = ByLayer
  grip: null, gripHover: null, snapOverride: null,
  hatchPat: {name:'Linhas 45°',ang:45,sp:5,type:'lines'},
  vp: {x:0, y:0, sc:2},  // world→screen: sx = wx*sc + vp.x
  sel: [],
  undos: [], redos: [],
  tool: 'line',
  ds: null,        // draw state
  hover: null,     // snapped world point + snap type
  isPan: false, panFrom: null,
  isWin: false, winFrom: null,
  hoverId: null,
  lastTool: null,  // último comando para repetição (Enter)
  dimStyles: null,
  dimCurrent: 'Standard',
  units: null,    // inicializado pelo engine
  lineTypes: null, // inicializado pelo engine
  ltCurrent: 'lt_continuous',
  modes: {
    grid:true, snap:true, ortho:false, polar:true,
    gridSz:10, snapSz:5,
    osnap:true, end:true, mid:true, int:true, cen:true, quad:true, per:true, tan:false, nea:false, grips:true,
    didactic:true, showcoords:false, showangles:false,
  },
  // canvas refs (set in init)
  cG:null,cD:null,cO:null,
  gG:null,gD:null,gO:null,
  wrap:null,
};

// ── INIT ─────────────────────────────────────────────────────
window.addEventListener('beforeunload',function(ev){if(S.dirty){ev.preventDefault();ev.returnValue='';}});
window.addEventListener('load', function() {
  S.wrap = document.getElementById('cw');
  S.cG   = document.getElementById('cGrid');
  S.cD   = document.getElementById('cDraw');
  S.cO   = document.getElementById('cOver');
  S.gG   = S.cG.getContext('2d');
  S.gD   = S.cD.getContext('2d');
  S.gO   = S.cO.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  S.vp.x = cvW()/2;
  S.vp.y = cvH()/2;
  bindEv();
  diInit();
  startBlank();
  S.style={col:null,lw:null,ld:null}; updPropsPanel();
  registerSW(); showStartScreen(false);
  updLayerUI();
  updLayerSel();
  // Popular selector de tipos de linha no painel de propriedades
  function updLTSel(){
    var sel=document.getElementById('propLT'); if(!sel) return;
    sel.innerHTML=S.lineTypes.map(function(lt){
      return '<option value="'+escHTML(lt.id)+'"'+(lt.id===S.ltCurrent?' selected':'')+'>'+escHTML(lt.name)+'</option>';
    }).join('');
  }
  updLTSel();
  updDimStyleSel();
  log('EduCAD 2D v8.9 — Software Educacional Livre (Licença MIT)','inf');
  log('Uso educacional | Não afiliado ao AutoCAD® ou qualquer software comercial','inf');
  log('Modo SELECT ativo. Clique para selecionar. HELP = lista de comandos.','inf');
  log('Novo desenho em branco. DDIM = estilos de cota  |  DEMO = desenho de exemplo','inf');
  log('Comandos (digite + Enter/Espaço): L C REC A EL PL POL T H | E M CO RO SC MI O TR EX F CHA AR X | DLI DAL DRA DDI DAN  D=DDIM | F3=OSNAP F7=Grade F8=Ortho F9=Snap','inf');
  setTool('select');
});

function resize() {
  // v7.3: canvas na resolução física da tela; o desenho continua em pixels CSS (S.W x S.H)
  var W = S.wrap.clientWidth, H = S.wrap.clientHeight, dpr = window.devicePixelRatio || 1;
  S.W = W; S.H = H; S.dpr = dpr;
  [[S.cG,S.gG],[S.cD,S.gD],[S.cO,S.gO]].forEach(function(p){
    p[0].width = Math.round(W*dpr); p[0].height = Math.round(H*dpr);
    p[0].style.width = W+'px'; p[0].style.height = H+'px';
    p[1].setTransform(dpr,0,0,dpr,0,0);
  });
  renderAll();
}

