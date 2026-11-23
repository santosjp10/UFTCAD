// ── DYNAMIC INPUT ────────────────────────────────────────────
var DI = {
  el:    null,   // container
  inpX:  null, inpY: null, inpD: null, inpA: null,
  hint:  null,
  active: false,  // está visível
  mode:  'xy',    // 'xy' | 'da' (distance/angle)
  focusField: 'x', // campo com foco: x|y|d|a
  // posição do mouse na tela (pixels) para posicionar o painel
  sx: 0, sy: 0,
  // base point (último ponto da cadeia)
  base: null,
};

function diInit(){
  DI.el   = document.getElementById('dynInput');
  DI.inpX = document.getElementById('di-x');
  DI.inpY = document.getElementById('di-y');
  DI.inpD = document.getElementById('di-d');
  DI.inpA = document.getElementById('di-a');
  DI.hint = document.getElementById('di-hint');

  // Tab: circula entre campos
  [DI.inpX,DI.inpY,DI.inpD,DI.inpA].forEach(function(inp){
    inp.addEventListener('keydown', diKey);
    // Ao focar um campo, marcar modo
    inp.addEventListener('focus', function(){
      DI.focusField = this.id.replace('di-','');
      if(DI.focusField==='x'||DI.focusField==='y') DI.mode='xy';
      else DI.mode='da';
      diHighlight();
      // Ao focar campo de ângulo sem valor, pré-preencher com ângulo atual
      if(DI.focusField==='a'&&this.value===''&&DI.base&&S.hover){
        var preAng=(((Math.atan2(S.hover.y-DI.base.y,S.hover.x-DI.base.x)*180/Math.PI)+360)%360).toFixed(1);
        this.value=preAng;
        this.select();
      }
    });
    // Prevenir que clique no dynInput feche o foco do canvas
    inp.addEventListener('mousedown', function(e){ e.stopPropagation(); });
  });
}

function diKey(e){
  // Se o usuário digita ',' ou '<' dentro do DI, significa que está tentando
  // inserir uma coordenada no formato AutoCAD (x,y ou dist<ang).
  // Transferir o conteúdo atual do campo para o cmdinput e continuar lá.
  if(e.key===','||e.key==='<'){
    e.preventDefault();
    var ci=document.getElementById('cmdinput');
    var currentVal=document.activeElement?document.activeElement.value.trim():'';
    diClear();
    if(DI.el) DI.el.classList.remove('show');
    ci.value=currentVal+e.key;
    ci.focus();
    ci.setSelectionRange(ci.value.length,ci.value.length);
    return;
  }
  if(e.key==='Tab'){
    e.preventDefault();
    // Se há base (encadeamento): ciclo é L → A → L
    // Se não há base (primeiro ponto): ciclo é X → Y → X
    var hasBase=!!DI.base;
    var order=hasBase?['d','a']:['x','y'];
    var idx=order.indexOf(DI.focusField);
    if(idx<0) idx=0;
    var next=order[(idx+1)%order.length];
    DI.focusField=next;
    var inp=document.getElementById('di-'+next);
    inp.focus();inp.select();
    if(next==='x'||next==='y') DI.mode='xy'; else DI.mode='da';
    // Pré-preencher ângulo se vazio
    if(next==='a'&&inp.value===''&&DI.base&&S.hover){
      inp.value=(((Math.atan2(S.hover.y-DI.base.y,S.hover.x-DI.base.x)*180/Math.PI)+360)%360).toFixed(1);
      inp.select();
    }
    diHighlight();
    return;
  }
  if(e.key==='Escape'){
    e.stopPropagation();
    diHide();
    cancelTool();
    return;
  }
  if(e.key==='Enter'){
    e.preventDefault();
    e.stopPropagation();
    diConfirm();
    return;
  }
}

function diConfirm(){
  // Ler campos ativos e gerar ponto
  var pt=null;
  // Modo DA: distância + ângulo (tem prioridade se campo d ou a tem valor)
  var dv=DI.inpD.value.trim(), av=DI.inpA.value.trim();
  var xv=DI.inpX.value.trim(), yv=DI.inpY.value.trim();

  var useDA=(DI.mode==='da'&&DI.base)||(dv!==''&&DI.base);
  var useXY=(DI.mode==='xy')||(xv!==''||yv!='');

  if(useDA){
    var dn=parseFloat(dv), an=parseFloat(av);
    var base=DI.base;
    if(isNaN(dn)||dn===0){
      // sem distância — usar XY como fallback
      useDA=false; useXY=true;
    } else {
      if(isNaN(an)){
        // sem ângulo: usar direção atual do cursor
        if(S.hover&&base){
          an=Math.atan2(S.hover.y-base.y,S.hover.x-base.x)*180/Math.PI;
        } else an=0;
      }
      var rad=an*Math.PI/180;
      pt={x:base.x+dn*Math.cos(rad),y:base.y+dn*Math.sin(rad),st:null};
    }
  }
  if(!pt&&useXY&&(xv!==''||yv!=='')){
    var xn=parseFloat(xv), yn=parseFloat(yv);
    if(isNaN(xn)) xn=S.hover?S.hover.x:0;
    if(isNaN(yn)) yn=S.hover?S.hover.y:0;
    pt={x:xn,y:yn,st:null};
  }

  if(pt){
    handleClick(pt);
    diClear();
    // Após confirmar: se há base (encadeamento), focar em distância; senão X
    setTimeout(function(){
      if(!DI.active) return;
      var newBase=diGetBase();
      if(newBase){
        DI.focusField='d'; DI.mode='da';
        DI.inpD.focus();
      } else {
        DI.focusField='x'; DI.mode='xy';
        DI.inpX.focus();
      }
      diHighlight();
    },30);
  }
}

function diClear(){
  DI.inpX.value='';DI.inpY.value='';
  DI.inpD.value='';DI.inpA.value='';
}

function diHighlight(){
  [DI.inpX,DI.inpY,DI.inpD,DI.inpA].forEach(function(inp){
    inp.classList.toggle('active', inp===document.getElementById('di-'+DI.focusField));
  });
}

// Decide se o DI deve aparecer para o tool/fase atual
function diShouldShow(){
  var t=S.tool;
  // v7.0: nos comandos do motor novo, o DI só aparece nas fases que pedem um ponto
  if(typeof ncIs==='function'&&ncIs(t)){ var ph=S.ds&&S.ds.phase; return !!(S.ds&&['base','dest','p1','p2','arrpt','arrfit','dist2','newp1','newp2'].indexOf(ph)>=0); }
  if(t==='select'||t==='pan') return false;
  // Ferramentas de desenho com entrada de ponto
  if(t==='line'||t==='polyline'||t==='rectangle'||t==='circle'||
     t==='arc'||t==='ellipse'||t==='text'||t==='hatch'||t==='polygon'||t==='dimali'||t==='spline') return true;
  // Comandos de edição quando esperam ponto base ou destino
  if(t==='move'&&S.ds&&S.ds.pts) return true;
  if(t==='copy'&&S.ds&&S.ds.phase==='dest') return true;
  // Offset: fase side (definir ponto de distância não se aplica; pular)
  return false;
}

// Calcular base point (último ponto da cadeia ativa)
function diGetBase(){
  if(S.ds&&S.ds.pts&&S.ds.pts.length>0)
    return S.ds.pts[S.ds.pts.length-1];
  // COPY: base point (só quando na fase dest)
  if(S.tool==='copy'&&S.ds&&S.ds.phase==='dest'&&S.ds.base)
    return S.ds.base;
  return null;
}

// Atualizar o DI com as coordenadas atuais do cursor
function diUpdate(sx,sy){
  if(!diShouldShow()){
    if(DI.active) diHide();
    return;
  }

  // Mostrar
  DI.active=true;
  DI.el.classList.add('show');
  DI.sx=sx;DI.sy=sy;

  // Posicionar: offset do cursor
  var offX=22, offY=22;
  var rect=S.wrap.getBoundingClientRect();
  // Evitar sair pelos bordos direito/inferior
  var px=sx+offX, py=sy+offY;
  var panelW=176, panelH=110;
  if(px+panelW>S.wrap.clientWidth-10) px=sx-panelW-8;
  if(py+panelH>S.wrap.clientHeight-10) py=sy-panelH-8;
  DI.el.style.left=px+'px';
  DI.el.style.top=py+'px';

  // Base point
  var base=diGetBase();
  DI.base=base;

  // Atualizar campos que NÃO têm foco (não sobrescrever o que o usuário está digitando)
  var focused=document.activeElement;
  var hp=S.hover;
  if(!hp) return;

  if(focused!==DI.inpX) DI.inpX.value=hp.x.toFixed(3);
  if(focused!==DI.inpY) DI.inpY.value=hp.y.toFixed(3);

  if(base){
    var dx=hp.x-base.x, dy=hp.y-base.y;
    var dist=Math.hypot(dx,dy);
    var ang=((Math.atan2(dy,dx)*180/Math.PI)+360)%360;
    if(focused!==DI.inpD) DI.inpD.value=dist.toFixed(3);
    if(focused!==DI.inpA) DI.inpA.value=ang.toFixed(1);
    var fieldNames={x:'X abs',y:'Y abs',d:'Distância',a:'Ângulo°'};
    var hintBase=(fieldNames[DI.focusField]||'')+' · Tab · Enter';
    if(S.tool==='line'&&S.ds&&S.ds.segs>=1) hintBase+=' · U=undo · C=fechar';
    DI.hint.textContent=hintBase;
  } else {
    if(focused!==DI.inpD) DI.inpD.value='';
    if(focused!==DI.inpA) DI.inpA.value='';
    DI.hint.textContent='X, Y absoluto · Tab · Enter=ok';
  }

  // Visibilidade dos campos: base→L+A em destaque; sem base→X+Y em destaque
  var hasBase=!!base;
  var rows=DI.el.querySelectorAll('.di-row');
  // rows[0]=X, rows[1]=Y, rows[2]=L, rows[3]=A
  rows[0].style.opacity=hasBase?'0.3':'1';
  rows[1].style.opacity=hasBase?'0.3':'1';
  rows[2].style.opacity=hasBase?'1':'0.3';
  rows[3].style.opacity=hasBase?'1':'0.3';

  // Auto-definir campo padrão (sem roubar foco — só orienta a digitação)
  var focused2=document.activeElement;
  var inDI2=DI.el.contains(focused2);
  if(!inDI2 && focused2!==document.getElementById('cmdinput')){
    DI.focusField=hasBase?'d':'x';
    DI.mode=hasBase?'da':'xy';
    diHighlight();
  }
}

function diHide(){
  DI.active=false;
  DI.focusField=null;
  if(DI.el) DI.el.classList.remove('show');
  diClear();
  // Tirar foco dos campos do DI para não bloquear atalhos de teclado
  if(DI.el&&DI.el.contains(document.activeElement)){
    document.activeElement.blur();
  }
}

