// ── MODES ────────────────────────────────────────────────────
function toggleMode(m){
  S.modes[m]=!S.modes[m];
  var el=document.getElementById('tg-'+m)||document.getElementById('rb-'+m);
  if(el){if(S.modes[m])el.classList.add('on');else el.classList.remove('on');}
  document.getElementById('sortho').textContent='ORTHO '+(S.modes.ortho?'ON':'OFF');
  document.getElementById('sortho').style.color=S.modes.ortho?'var(--grn)':'var(--t2)';
  log(m.toUpperCase()+': '+(S.modes[m]?'ON':'OFF'));
  renderAll();
}

// ── TOOL ─────────────────────────────────────────────────────
function setTool(tool){
  // Rastrear último comando para repetição com Enter
  if(tool!=='select'&&tool!=='pan') S.lastTool=tool;
  // Ao trocar de ferramenta, manter a seleção existente (padrão AutoCAD)
  var keepSel=S.sel.slice();
  S.tool=tool;S.ds=null;
  // Limpar seleção visual apenas ao ir para select ou pan
  if(tool!=='select'&&tool!=='pan') S.sel=keepSel;
  document.querySelectorAll('.rb').forEach(function(b){b.classList.remove('on');});
  var rb=document.getElementById('rb-'+tool);if(rb)rb.classList.add('on');
  document.getElementById('stool').textContent=tool.toUpperCase();
  S.wrap.style.cursor=tool==='pan'?'grab':tool==='select'?'default':'crosshair';
  // Offset usa cursor quadrado customizado quando fase pick está ativa — atualizado dinamicamente em onMM
  var prmpts={line:'LINE: 1º ponto | clique | coord (x,y) | @dx,dy | @dist<ang:',polyline:'PLINE Especifique o ponto inicial — depois [Arco/Linha/Fechar/Desfazer] (Enter conclui):',rectangle:'RECTANG: 1° canto:',circle:'CIRCLE: centro:',arc:'ARC: 1° ponto (3-pontos):',ellipse:'ELLIPSE: centro:',text:'TEXT: ponto de inserção:',hatch:'HATCH: 1° canto:',dim:'DIMLINEAR: 1º ponto:',dimali:'DIMALIGNED: 1º ponto:',dimr:'DIMRADIUS: centro:',dimd:'DIMDIAMETER: centro:',dima:'DIMANGULAR: vértice:',move:'MOVE: sel obj → base point:',copy:'COPY: clique no ponto base (ou selecione objetos primeiro):',rotate:'ROTATE: sel obj → pivot:',mirror:'MIRROR: 1° ponto do eixo:',scale:'SCALE: sel obj → base:',offset:'OFFSET: informe a distância na linha de comando:',select:'SELECT: clique ou janela.',pan:'PAN: arraste | scroll=zoom',trim:'TRIM',extend:'EXTEND',fillet:'FILLET: clique para configurar raio, depois 2 linhas:',polygon:'POLYGON: configure no diálogo que abriu:',chamfer:'CHAMFER: clique para configurar distâncias, depois 2 linhas:'};
  logp(prmpts[tool]||tool);
  // Offset: focar cmd input imediatamente
  if(tool==='offset'){
    setTimeout(function(){document.getElementById('cmdinput').focus();},50);
  }
  // Esconder DI ao trocar ferramenta para select/pan
  if(tool==='select'||tool==='pan'){DI.active=false;diHide();}
}

// ── LAYERS UI ────────────────────────────────────────────────
function updLayerUI(){
  var el=document.getElementById('lylist');el.innerHTML='';
  for(var i=0;i<S.layers.length;i++){
    var l=S.layers[i],d=document.createElement('div');
    d.className='lyrow'+(l.id===S.curLy?' cur':'');
    d.setAttribute('data-id',l.id);
    d.innerHTML='<div class="lydot" style="background:'+safeCol(l.col)+'"></div><div class="lyname">'+escHTML(l.nm)+'</div>'+'<span class="lyico'+(l.vis?'':' dim')+'" onclick="event.stopPropagation();togVis('+l.id+')">'+(l.vis?'👁':'🚫')+'</span>'+'<span class="lyico'+(l.lock?'':' dim')+'" onclick="event.stopPropagation();togLock('+l.id+')">'+(l.lock?'🔒':'🔓')+'</span>';
    d.onclick=function(){var id=parseInt(this.getAttribute('data-id'));S.curLy=id;updLayerUI();updLayerSel();updStatus();updPropsPanel();};
    (function(id){var dot=d.querySelector('.lydot');dot.title='Clique para mudar a cor da camada';dot.style.cursor='pointer';dot.addEventListener('click',function(ev){ev.stopPropagation();layerColorEdit(id);});})(l.id);
    el.appendChild(d);
  }
}
function updLayerSel(){
  var sel=document.getElementById('propLy');
  sel.innerHTML=S.layers.map(function(l){return'<option value="'+escHTML(l.id)+'"'+(l.id===S.curLy?' selected':'')+'>'+escHTML(l.nm)+'</option>';}).join('');
}
function togVis(id){var l=getLy(id);if(l){l.vis=!l.vis;updLayerUI();renderAll();}}
function togLock(id){var l=getLy(id);if(l){l.lock=!l.lock;updLayerUI();}}
function showAddLayer(){document.getElementById('ml-name').value='Camada '+(S.layers.length+1);var cs=['#4d9ef7','#4ec87a','#e85050','#f0c040','#c849e0','#ff8c00'];document.getElementById('ml-col').value=cs[S.layers.length%cs.length];document.getElementById('ov-layer').classList.add('show');}
function confirmLayer(){var nm=document.getElementById('ml-name').value||'Layer',col=document.getElementById('ml-col').value,ld=document.getElementById('ml-ld').value,id=Date.now();S.layers.push({id:id,nm:nm,col:col,vis:true,lock:false,ld:ld,lw:.7});S.curLy=id;updLayerUI();updLayerSel();updStatus();closeOv('ov-layer');log('Camada "'+nm+'" criada.','ok');}
function delLayer(){if(S.curLy===0){log('Não é possível remover a camada 0.','er');return;}var _ly=getLy(S.curLy),_n=S.ents.filter(function(e){return e.ly===S.curLy;}).length;if(!confirm('Remover a camada "'+(_ly?_ly.nm:S.curLy)+'"?'+(_n?'\n'+_n+' objeto(s) serão movidos para a camada 0.':'')))return;if(_n){snapshot();S.ents.forEach(function(e){if(e.ly===S.curLy)e.ly=0;});}S.layers=S.layers.filter(function(l){return l.id!==S.curLy;});S.curLy=0;updLayerUI();updLayerSel();renderAll();updStatus();log('Camada removida.','ok');}

// ── STATUS ───────────────────────────────────────────────────
function updStatus(){document.getElementById('scount').textContent=S.ents.length;var l=getLy(S.curLy);document.getElementById('slayer').textContent=l?l.nm:S.curLy;}

// ── SAVE / LOAD / EXPORT ─────────────────────────────────────
function buildDoc(){return {v:'8.16',annoScale:S.annoScale,layouts:layoutsForSave(),blocks:S.blocks,offDist:S.offDist,chamD1:S.chamD1,chamD2:S.chamD2,teMode:S.teMode,ts:new Date().toISOString(),ents:S.ents,layers:S.layers,vp:S.vp,dimStyles:S.dimStyles,dimCurrent:S.dimCurrent,filletR:S.filletR,filletTrim:S.filletTrim};}
function saveDoc(){var d=buildDoc();downloadBlob(JSON.stringify(d,null,2),'application/json','educad.json');document.getElementById('ftitle').textContent='educad.json';S.dirty=false;log('Salvo.','ok');} // v8.9: passa por downloadBlob (janela Salvar como)
// v6.1: validação mínima do JSON carregado
var ENT_TYPES=['line','circ','arc','rect','ell','pl','spline','txt','hatch','dim','dimr','dimd','dima','mtext','insert','leader'];
function validateDoc(d){
  if(!d||typeof d!=='object') return 'conteúdo não é um objeto JSON';
  var ents=d.ents||d.entities;
  if(!Array.isArray(ents)) return 'lista de entidades ausente';
  for(var i=0;i<ents.length;i++){
    var e=ents[i];
    if(!e||ENT_TYPES.indexOf(e.tp)<0) return 'entidade '+i+' com tipo desconhecido';
    if((e.tp==='pl'||e.tp==='spline')&&!Array.isArray(e.pts)) return 'entidade '+i+' sem vértices';
    if(e.tp==='txt') e.txt=String(e.txt==null?'':e.txt);
  }
  if(d.dimStyles!==undefined){
    if(!Array.isArray(d.dimStyles)) return 'estilos de cota inválidos';
    for(var k=0;k<d.dimStyles.length;k++){ if(!d.dimStyles[k]||typeof d.dimStyles[k]!=='object') return 'estilo de cota '+k+' inválido'; }
  }
  if(d.layers){
    if(!Array.isArray(d.layers)) return 'camadas inválidas';
    var has0=false;
    for(var j=0;j<d.layers.length;j++){var l=d.layers[j];if(!l||l.id===undefined) return 'camada '+j+' inválida';l.nm=String(l.nm==null?l.id:l.nm);l.col=safeCol(l.col);if(l.id===0)has0=true;}
    if(!has0) d.layers.unshift({id:0,nm:'0',col:'#dce4f5',vis:true,lock:false,ld:'solid',lw:.7});
  }
  return null;
}
// v6.2: estilos de cota do arquivo (arquivos antigos mantêm os padrões)
function loadDimStyles(d){
  var list=Array.isArray(d.dimStyles)&&d.dimStyles.length?d.dimStyles.map(normDimStyle):dimDefaultStyles();
  var seen={};list=list.filter(function(st){if(seen[st.name])return false;seen[st.name]=1;return true;});
  if(!list.some(function(st){return st.name==='Standard';})) list.unshift(normDimStyle(DS_DEFAULT));
  S.dimStyles=list;
  S.dimCurrent=(d.dimCurrent&&list.some(function(st){return st.name===d.dimCurrent;}))?d.dimCurrent:'Standard';
  S.ents.forEach(function(e){ if(isDim(e)&&e.dimStyle&&!dspGetStyle(e.dimStyle)) e.dimStyle='Standard'; });
  updDimStyleSel();
}
function openDoc(){document.getElementById('fileInput').click();}
function loadFile(ev){var f=ev.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(e){try{var d=JSON.parse(e.target.result);var v=applyDoc(d,f.name);if(v){log('Arquivo inválido: '+v,'er');return;}log('Carregado: '+S.ents.length+' obj.','ok');}catch(ex){log('Erro: '+ex.message,'er');}};r.readAsText(f);ev.target.value='';}
// v7.7: aplica um documento já lido (arquivo ou recuperação); devolve a mensagem de erro ou ''
function applyDoc(d,name){var v=validateDoc(d);if(v)return v;if(S.space!=='model'){S.space='model';S.modelEnts=null;}S.ents=d.ents||d.entities||[];if(d.layers)S.layers=d.layers;S.curLy=0;loadDimStyles(d);loadLayouts(d);S.annoScale=(typeof d.annoScale==='number'&&d.annoScale>0)?d.annoScale:1;(function(){var _as=document.getElementById('annoSel');if(_as)_as.value=String(S.annoScale);})();S.blocks=(d.blocks&&typeof d.blocks==='object'&&!Array.isArray(d.blocks))?d.blocks:{};if(typeof d.filletR==='number'&&d.filletR>=0)S.filletR=d.filletR;if(typeof d.filletTrim==='boolean')S.filletTrim=d.filletTrim;if(d.vp)S.vp=d.vp;S.sel=[];resetHistory();S.dirty=false;syncIdCounter();updLayerUI();updLayerSel();zoomFit();updStatus();document.getElementById('ftitle').textContent=name;if(typeof asAfterLoad==='function')asAfterLoad();return '';}
function newDoc(){if(S.ents.length&&!confirm('Criar novo documento? Alterações não salvas serão perdidas.'))return;S.ents=[];S.sel=[];resetHistory();S.dirty=false;S.vp={x:cvW()/2,y:cvH()/2,sc:2};loadDimStyles({});S.blocks={};resetLayouts();renderAll();updStatus();document.getElementById('ftitle').textContent='Sem título';log('Novo documento.','ok');}
function showExport(){expFmtChange();document.getElementById('ov-export').classList.add('show');}
function doExport(){var fmt=document.getElementById('ef').value;closeOv('ov-export');switch(fmt){case 'pdf':expPDF(false);break;case 'pdfall':expPDF(true);break;case 'json':saveDoc();break;case 'svg':expSVG();break;case 'dxf':case 'dxf2k':expDXF('2000');break;case 'dxf12':expDXF('12');break;case 'dwg':expDWG();break;case 'png':expPNG();break;}}
var EXP_NOTES={
  dxf:'Abre no AutoCAD 2000 ou superior, ZWCAD, BricsCAD, DraftSight, LibreCAD e QGIS. Preserva camadas, cores RGB, espessuras e tipos de linha, polilinhas, elipses, splines, hachuras e cotas editáveis. Unidades: milímetros.',
  dwg:'O DWG é um formato fechado: o EduCAD gera um DXF 2000 completo e mostra como convertê-lo em DWG no AutoCAD, no ZWCAD ou no conversor gratuito ODA File Converter.',
  dxf12:'Formato antigo, aceito por praticamente qualquer programa (incluindo máquinas CNC e cortadoras). Elipses e splines viram polilinhas; cotas e hachuras viram linhas e textos; cores aproximadas à paleta padrão.',
  json:'Formato nativo do EduCAD: guarda tudo (inclusive estilos de cota) para continuar editando aqui.',
  svg:'Vetorial em milímetros (escala 1:1), para Inkscape, relatórios e páginas web.',
  png:'Imagem da área de desenho atual.'
};
function expFmtChange(){var f=document.getElementById('ef').value;document.getElementById('ef-dxfopts').style.display=(f==='dxf'||f==='dwg')?'block':'none';var n=document.getElementById('ef-note');n.textContent=EXP_NOTES[f]||'';n.style.display='block';}
