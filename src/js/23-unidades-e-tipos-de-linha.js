// ── UNITS ENGINE ─────────────────────────────────────────────────────────────
// Estado global de unidades do desenho
if(!S.units) S.units = {
  lenType:'decimal',   // decimal | engineering | architectural | fractional | scientific
  lenPrec:4,           // casas decimais
  angType:'decimal_deg', // decimal_deg | deg_min_sec | gradians | radians | surveyor
  angPrec:0,
  clockwise:false,
  insertScale:'mm'
};

function showUnits(){
  var u=S.units;
  document.getElementById('un-len-type').value = u.lenType;
  document.getElementById('un-len-prec').value = String(u.lenPrec);
  document.getElementById('un-ang-type').value = u.angType;
  document.getElementById('un-ang-prec').value = String(u.angPrec);
  document.getElementById('un-clockwise').checked = u.clockwise;
  document.getElementById('un-insert').value = u.insertScale;
  unUpdateSample();
  document.getElementById('ov-units').classList.add('show');
}

function unFormatLen(v){
  var type=document.getElementById('un-len-type').value;
  var prec=parseInt(document.getElementById('un-len-prec').value)||0;
  switch(type){
    case 'scientific': return v.toExponential(prec);
    case 'engineering':{
      // feet + decimal inches
      var ft=Math.floor(v/304.8), inch=(v-ft*304.8)/25.4;
      return ft+"'-"+inch.toFixed(prec)+'"';
    }
    case 'architectural':{
      var ft=Math.floor(v/304.8), rem=(v-ft*304.8)/25.4;
      var inInt=Math.floor(rem), fr=rem-inInt;
      var denoms=[2,4,8,16,32,64];
      var den=denoms[Math.min(prec,5)];
      var num=Math.round(fr*den);
      var fracStr=num>0?(inInt+' '+num+'/'+den+'"'):(inInt+'"');
      return ft+"'-"+fracStr;
    }
    case 'fractional':{
      var denoms=[1,2,4,8,16,32,64,128,256];
      var den=denoms[Math.min(prec,8)];
      var whole=Math.floor(v), fr=v-whole;
      var num=Math.round(fr*den);
      if(num===0) return String(whole);
      if(num===den) return String(whole+1);
      return whole+' '+num+'/'+den;
    }
    default: return v.toFixed(prec);
  }
}

function unFormatAng(deg){
  var type=document.getElementById('un-ang-type').value;
  var prec=parseInt(document.getElementById('un-ang-prec').value)||0;
  var cw=document.getElementById('un-clockwise').checked;
  if(cw) deg=-deg;
  deg=((deg%360)+360)%360;
  switch(type){
    case 'deg_min_sec':{
      var d=Math.floor(deg), m=Math.floor((deg-d)*60), s=((deg-d)*60-m)*60;
      return d+"d"+m+"'"+s.toFixed(prec)+'"';
    }
    case 'gradians': return (deg*400/360).toFixed(prec)+'g';
    case 'radians':  return (deg*Math.PI/180).toFixed(prec)+'r';
    case 'surveyor':{
      // N/S dd° mm' ss" E/W
      var ns=deg<=180?'N':'S', ew=(deg<=90||deg>270)?'E':'W';
      var sd=deg<=90?deg:deg<=180?180-deg:deg<=270?deg-180:360-deg;
      var d2=Math.floor(sd),m2=Math.floor((sd-d2)*60),s2=((sd-d2)*60-m2)*60;
      return ns+' '+d2+"d"+m2+"' "+s2.toFixed(prec)+'" '+ew;
    }
    default: return deg.toFixed(prec)+'°';
  }
}

function unUpdateSample(){
  var lenStr = unFormatLen(1.5)+', '+unFormatLen(2.0039)+', '+unFormatLen(0);
  var angStr = '3&lt;'+unFormatAng(45);
  document.getElementById('un-sample-len').innerHTML = lenStr;
  document.getElementById('un-sample-ang').innerHTML = angStr;
}

function unApply(){
  S.units.lenType  = document.getElementById('un-len-type').value;
  S.units.lenPrec  = parseInt(document.getElementById('un-len-prec').value)||0;
  S.units.angType  = document.getElementById('un-ang-type').value;
  S.units.angPrec  = parseInt(document.getElementById('un-ang-prec').value)||0;
  S.units.clockwise= document.getElementById('un-clockwise').checked;
  S.units.insertScale = document.getElementById('un-insert').value;
  renderAll();
  log('Unidades configuradas: '+S.units.lenType+' ('+S.units.lenPrec+' casas) | '+
      S.units.angType+' | '+S.units.insertScale,'ok');
  closeOv('ov-units');
}

function unDirection(){
  // Diálogo simples de direção de ângulo base
  var dirs=['East (0°)','North (90°)','West (180°)','South (270°)'];
  var cur=S.units.angBase||0;
  var res=prompt('Base angle direction (0=East, 90=North, 180=West, 270=South):',cur);
  if(res!==null){S.units.angBase=parseFloat(res)||0;log('Direção base do ângulo: '+S.units.angBase+'°','ok');}
}

// Formatar comprimento respeitando as unidades configuradas (usado em logs e DI)
function fmtLen(v){
  if(!S.units) return v.toFixed(2)+'mm';
  return unFormatLen_val(v, S.units.lenType, S.units.lenPrec);
}
function unFormatLen_val(v,type,prec){
  switch(type){
    case 'scientific': return v.toExponential(prec);
    case 'fractional':{
      var denoms=[1,2,4,8,16,32,64,128,256];
      var den=denoms[Math.min(prec,8)];
      var whole=Math.floor(v),fr=v-whole,num=Math.round(fr*den);
      if(num===0) return String(whole);
      if(num===den) return String(whole+1);
      return whole+' '+num+'/'+den;
    }
    default: return v.toFixed(prec);
  }
}



// ── LINETYPE ENGINE ──────────────────────────────────────────────────────────

// Padrões de dash para cada tipo de linha (em pixels base)
var LT_DASH = {
  solid:    [],
  dashed:   [10,4],
  dotted:   [1.5,4],
  center:   [18,4,4,4],
  phantom:  [18,4,4,4,4,4],
  divide:   [18,4,4,4,4,4],
  hidden:   [5,4],
  dashdot:  [12,3,3,3],
};

// Biblioteca de tipos de linha do desenho
if(!S.lineTypes) S.lineTypes = [
  {id:'lt_continuous', name:'Continuous',  ld:'solid',   col:'#dce4f5', lw:0.7,  builtin:true},
  {id:'lt_center',     name:'Center',      ld:'center',  col:'#556688', lw:0.35, builtin:true},
  {id:'lt_hidden',     name:'Hidden',      ld:'dashed',  col:'#557799', lw:0.35, builtin:true},
  {id:'lt_phantom',    name:'Phantom',     ld:'phantom', col:'#668866', lw:0.35, builtin:true},
  {id:'lt_dotted',     name:'Dotted',      ld:'dotted',  col:'#888866', lw:0.25, builtin:true},
  {id:'lt_dashdot',    name:'Dash Dot',    ld:'dashdot', col:'#887766', lw:0.35, builtin:true},
];
if(!S.ltCurrent) S.ltCurrent = 'lt_continuous';

var _ltSel = null; // id do tipo selecionado no manager

function getLT(id){ return S.lineTypes.find(function(t){return t.id===id;})||S.lineTypes[0]; }

function showLineType(){
  _ltSel = S.ltCurrent;
  ltRenderList();
  ltLoadEditor(_ltSel);
  document.getElementById('ov-linetype').classList.add('show');
}

// ── Renderizar a lista ────────────────────────────────────────
function ltRenderList(){
  var el=document.getElementById('lt-list');
  el.innerHTML='';
  S.lineTypes.forEach(function(lt){
    var row=document.createElement('div');
    row.className='lt-row'+(lt.id===_ltSel?' active':'')+(lt.id===S.ltCurrent?' current':'');
    // Preview canvas inline
    var cvs=document.createElement('canvas');
    cvs.width=120; cvs.height=18;
    cvs.style.cssText='display:block;width:120px;height:18px;';
    ltDrawPreviewCanvas(cvs, lt);
    // Montar células
    row.innerHTML=
      '<span class="lt-cur">'+(lt.id===S.ltCurrent?'★':'')+'</span>'+
      '<span class="lt-name">'+escHTML(lt.name)+'</span>'+
      '<span class="lt-prev"></span>'+
      '<span style="display:flex;align-items:center;gap:3px;"><span class="lt-col-dot" style="background:'+safeCol(lt.col)+'"></span></span>'+
      '<span class="lt-lw-badge">'+parseFloat(lt.lw).toFixed(2)+'</span>';
    row.querySelector('.lt-prev').appendChild(cvs);
    row.addEventListener('click',function(){
      _ltSel=lt.id; ltRenderList(); ltLoadEditor(lt.id);
    });
    el.appendChild(row);
  });
}

// ── Preview de linha num canvas ───────────────────────────────
function ltDrawPreviewCanvas(cvs, lt){
  var ctx=cvs.getContext('2d');
  var W=cvs.width, H=cvs.height;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#08090f'; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle=lt.col;
  ctx.lineWidth=Math.max(0.5, Math.min(3, (lt.lw||0.7)*1.5));
  var dash=LT_DASH[lt.ld]||[];
  ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(6, H/2); ctx.lineTo(W-6, H/2); ctx.stroke();
  ctx.setLineDash([]);
}

// ── Carregar campos do editor ─────────────────────────────────
function ltLoadEditor(id){
  var lt=getLT(id);
  if(!lt){ document.getElementById('lt-ed-title').textContent='Selecione um tipo'; return; }
  document.getElementById('lt-ed-title').textContent='Editando: '+lt.name;
  document.getElementById('lt-name').value=lt.name;
  document.getElementById('lt-ld').value=lt.ld;
  document.getElementById('lt-col').value=lt.col;
  document.getElementById('lt-lw').value=String(lt.lw);
  // Desabilitar nome para builtins
  document.getElementById('lt-name').disabled=!!lt.builtin;
  ltDrawPreviewBig();
}

function ltEdChange(){
  var lt=getLT(_ltSel); if(!lt) return;
  // Atualizar o objeto com os valores do editor
  if(!lt.builtin) lt.name=document.getElementById('lt-name').value.trim()||lt.name;
  lt.ld  = document.getElementById('lt-ld').value;
  lt.col = document.getElementById('lt-col').value;
  lt.lw  = parseFloat(document.getElementById('lt-lw').value)||0.7;
  ltRenderList();
  ltDrawPreviewBig();
  renderAll();
}

function ltDrawPreviewBig(){
  var cvs=document.getElementById('lt-prev-canvas'); if(!cvs) return;
  var lt=getLT(_ltSel); if(!lt) return;
  cvs.width=174; cvs.height=28;
  ltDrawPreviewCanvas(cvs, lt);
}

// ── CRUD ──────────────────────────────────────────────────────
function ltNew(){
  var name=prompt('Nome do novo tipo de linha:', 'Tipo '+(S.lineTypes.length+1));
  if(!name||!name.trim()) return;
  var id='lt_'+Date.now();
  S.lineTypes.push({id:id, name:name.trim(), ld:'solid', col:'#dce4f5', lw:0.7, builtin:false});
  _ltSel=id;
  ltRenderList(); ltLoadEditor(id);
}

function ltDelete(){
  var lt=getLT(_ltSel);
  if(!lt){ return; }
  if(lt.builtin){ alert('Tipos de linha padrão não podem ser excluídos.'); return; }
  if(!confirm('Excluir "'+lt.name+'"?')) return;
  S.lineTypes=S.lineTypes.filter(function(t){return t.id!==_ltSel;});
  if(S.ltCurrent===_ltSel) S.ltCurrent=S.lineTypes[0].id;
  _ltSel=S.ltCurrent;
  ltRenderList(); ltLoadEditor(_ltSel);
}

function ltSetCurrent(){
  if(!_ltSel) return;
  S.ltCurrent=_ltSel;
  // Aplicar ao estilo de desenho atual
  var lt=getLT(_ltSel);
  S.style.col=lt.col; S.style.lw=lt.lw; S.style.ld=lt.ld;
  // Atualizar painel de propriedades
  var el;
  el=document.getElementById('propCol'); if(el) el.value=lt.col;
  el=document.getElementById('propLW');  if(el) el.value=String(lt.lw);
  el=document.getElementById('propLD');  if(el) el.value=lt.ld;
  ltRenderList();
  log('Tipo de linha padrão: '+lt.name+' ('+lt.ld+', '+lt.col+', '+lt.lw+'mm)','ok');
}

function ltApply(){
  ltEdChange();     // gravar campos atuais
  ltSetCurrent();   // definir como padrão
  renderAll();
  closeOv('ov-linetype');
  log('Configuração de linha aplicada.','ok');
}

// ── Aplicar tipo de linha a objeto(s) selecionado(s) ─────────
function ltApplyToSel(){
  if(!S.sel.length){ log('Selecione objetos primeiro.','er'); return; }
  var lt=getLT(_ltSel); if(!lt) return;
  snapshot();
  S.sel.forEach(function(id){
    var e=findE(id); if(!e) return;
    e.col=lt.col; e.lw=lt.lw; e.ld=lt.ld;
  });
  renderAll();
  log('Tipo "'+lt.name+'" aplicado a '+S.sel.length+' objeto(s).','ok');
}

// ── setDash atualizado para suportar novos tipos ──────────────
// (substitui a função existente)


function ltQuickApply(id){
  S.ltCurrent=id;
  var lt=getLT(id); if(!lt) return;
  S.style.col=lt.col; S.style.lw=lt.lw; S.style.ld=lt.ld;
  var el;
  el=document.getElementById('propCol'); if(el) el.value=lt.col;
  el=document.getElementById('propLW');  if(el) el.value=String(lt.lw);
  el=document.getElementById('propLD');  if(el) el.value=lt.ld;
  log('Tipo de linha: '+lt.name,'ok');
}


