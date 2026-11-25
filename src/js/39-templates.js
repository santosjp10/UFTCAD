/* ═══════════════════════════════════════════════════════════════════
   v8.12 — TEMPLATES (MODELOS DE DESENHO)
   Novo (NEW, Ctrl+N) abre a biblioteca: Padrão (o desenho inicial de sempre),
   Mecânico, Arquitetônico e Topográfico — cada um com unidade, folha e
   orientação, escala da viewport e de anotação, camadas (cor, tipo e
   espessura de linha), estilo de cota, fonte, alturas de texto, hachura,
   grade/snap, blocos e carimbo preenchido. Tudo pode ser mudado depois.
   "Meus modelos": salvar o desenho atual como modelo (no navegador) ou usar
   qualquer arquivo .json do EduCAD como modelo.
   ═══════════════════════════════════════════════════════════════════ */
var UNITS_DEFAULT={lenType:'decimal',lenPrec:4,angType:'decimal_deg',angPrec:0,clockwise:false,insertScale:'mm'};
// ── unidades, escala de tipos de linha e template gravados no arquivo ──
(function(){ var bd=buildDoc,ad=applyDoc,nd=newDoc;
  buildDoc=function(){ var d=bd.apply(this,arguments); d.units=JSON.parse(JSON.stringify(S.units||UNITS_DEFAULT)); if(S.ltscale) d.ltscale=S.ltscale; if(S.template) d.template=S.template; d.grid={g:S.modes.gridSz,s:S.modes.snapSz}; return d; };
  applyDoc=function(d,name){ var u=d&&d.units,ok=u&&typeof u==='object'&&({mm:1,cm:1,m:1,'in':1,ft:1,km:1})[u.insertScale];
    S.units=JSON.parse(JSON.stringify(ok?Object.assign({},UNITS_DEFAULT,u):UNITS_DEFAULT));
    S.ltscale=(d&&d.ltscale>0)?d.ltscale:undefined; S.template=(d&&typeof d.template==='string')?d.template.slice(0,30):undefined;
    if(d&&d.grid&&d.grid.g>0){ S.modes.gridSz=d.grid.g; if(d.grid.s>0) S.modes.snapSz=d.grid.s; }
    return ad.apply(this,arguments); };
  var BASE=null; function base(){ var th=document.getElementById('th'),pu=document.getElementById('pt-unit');
    return {layers:JSON.parse(JSON.stringify(S.layers)),cur:S.curLy,font:S.textFont,th:th?th.value:null,mtH:S.mtH,ts:S.textSize,off:S.offDist,hp:S.hatchPat?JSON.parse(JSON.stringify(S.hatchPat)):S.hatchPat,pu:pu?pu.value:null}; }
  window.addEventListener('load',function(){ BASE=base(); });
  window.tplBaseRestore=function(){ if(!BASE) return; var B=JSON.parse(JSON.stringify(BASE)); S.layers=B.layers; S.curLy=B.cur; S.textFont=B.font; S.mtH=B.mtH; S.textSize=B.ts; S.offDist=B.off; S.hatchPat=B.hp;
    var th=document.getElementById('th'),pu=document.getElementById('pt-unit'); if(th&&B.th!==null) th.value=B.th; if(pu&&B.pu!==null) pu.value=B.pu; };
  newDoc=function(){ var n0=S.ents.length,wasT=!!S.template,r=nd.apply(this,arguments); if(!(n0&&S.ents.length)){ if(wasT) tplBaseRestore(); S.units=JSON.parse(JSON.stringify(UNITS_DEFAULT)); S.ltscale=undefined; S.template=undefined; S.annoScale=1; S.modes.gridSz=10; S.modes.snapSz=5; var s=document.getElementById('annoSel'); if(s) s.value='1'; } return r; };
})();
// ── biblioteca ──────────────────────────────────────────────────────────────
function tplLy(id,nm,col,ld,lw,plot){ return {id:id,nm:nm,col:col,vis:true,lock:false,ld:ld||'solid',lw:lw,plot:plot!==false}; }
function tplDim(base,over){ var s=JSON.parse(JSON.stringify(DS_DEFAULT)); if(base==='ABNT'){ s.decSep=','; s.zTrail=true; s.txtAlign='aligned'; s.txtPos='above'; s.baseInc=7; } Object.keys(over).forEach(function(k){ s[k]=over[k]; }); return s; }
var TEMPLATES=[
 {id:'padrao',nome:'Padrão',icone:'□',desc:'O desenho inicial de sempre do EduCAD: milímetros, camadas 0, Construção, Dimensão e Hachura, folha A4 paisagem.',padrao:true},
 {id:'mecanico',nome:'Desenho Mecânico',icone:'⚙',norma:'NBR 8403 (linhas) · NBR 10067 (vistas) · NBR 10126 (cotagem) · NBR 12298 (hachuras)',
  desc:'Peças e componentes: vistas ortográficas, cortes, cotagem ABNT e escalas de ampliação ou redução.',
  units:{insertScale:'mm',lenPrec:2,angType:'decimal_deg',angPrec:1},fmt:'A4',land:true,vp:1,anno:1,font:'ISOCPEUR',grid:[10,1],ltscale:0.5,txtPaper:3.5,hatch:'ANSI31',
  layers:[tplLy(0,'0','#ffffff','solid',.25),tplLy(10,'CONTORNO','#ffffff','solid',.5),tplLy(11,'OCULTA','#ffff00','hidden',.35),tplLy(12,'CENTRO','#ff4040','center',.18),
   tplLy(13,'CORTE-PLANO','#ff00ff','dashdot',.35),tplLy(14,'HACHURA','#00c8c8','solid',.18),tplLy(15,'COTAS','#40ff40','solid',.18),tplLy(16,'TEXTO','#ffffff','solid',.25),
   tplLy(17,'RUPTURA','#c0c0c0','solid',.18),tplLy(18,'FANTASMA','#8080ff','phantom',.18),tplLy(19,'AUXILIAR','#606878','solid',.13,false)],
  cur:10,dim:{name:'MECÂNICO ABNT',o:{base:'ABNT',font:'ISOCPEUR',txtH:3.5,arrowSize:3,arrowType:'filled',prec:2,unit:'mm',col:'#40ff40',extCol:'#40ff40',txtCol:'#40ff40',extOrigin:1,extDimline:2,baseInc:7,desc:'Cotagem mecânica ABNT: setas cheias, texto 3,5 mm, vírgula decimal.'}},
  blocks:['RUGOSIDADE','CORTE_SETA'],
  campos:{titulo:'PEÇA — VISTAS ORTOGRÁFICAS',disc:'Desenho Técnico Mecânico'},
  dicas:'Desenhe as arestas visíveis na camada CONTORNO, as ocultas em OCULTA e os eixos em CENTRO; cortes: plano em CORTE-PLANO e hachura ANSI31 na camada HACHURA. Símbolos (rugosidade, seta de corte, marca de centro, solda): Biblioteca de blocos (Ctrl+3).'},
 {id:'arquitetonico',nome:'Desenho Arquitetônico',icone:'⌂',norma:'NBR 6492 (representação de projetos de arquitetura) · NBR 8403',
  desc:'Plantas baixas, cortes e fachadas em metros (cotas 3,50), escala 1:50, cotas com traço oblíquo.',
  units:{insertScale:'m',lenPrec:2,angType:'decimal_deg',angPrec:0},fmt:'A3',land:true,vp:1/50,anno:1/50,font:'Arial',grid:[1,0.05],ltscale:null,txtPaper:2.5,hatch:'ANSI31',offset:0.15,
  layers:[tplLy(0,'0','#ffffff','solid',.25),tplLy(10,'ARQ-PAREDE','#ffffff','solid',.5),tplLy(11,'ARQ-PAREDE-HACH','#808080','solid',.09),tplLy(12,'ARQ-PORTA','#ffff00','solid',.25),
   tplLy(13,'ARQ-JANELA','#00ffff','solid',.25),tplLy(14,'ARQ-MOBILIARIO','#8080ff','solid',.18),tplLy(15,'ARQ-LOUCAS','#80c0ff','solid',.18),tplLy(16,'ARQ-PISO','#606060','solid',.09),
   tplLy(17,'ARQ-COTA','#40ff40','solid',.18),tplLy(18,'ARQ-EIXO','#ff4040','center',.13),tplLy(19,'ARQ-TEXTO','#ffffff','solid',.25),tplLy(20,'ARQ-NIVEL','#ffc040','solid',.18),
   tplLy(21,'ARQ-PROJECAO','#ff8000','hidden',.18),tplLy(22,'ARQ-CORTE','#ff00ff','dashdot',.35),tplLy(23,'ARQ-AUXILIAR','#606878','solid',.13,false)],
  cur:10,dim:{name:'ARQ 1:50',o:{font:'Arial',annot:true,txtH:2,arrowType:'tick',arrowSize:1.5,txtGap:0.8,extOrigin:1.5,extDimline:1.5,baseInc:6,unit:'m',prec:2,decSep:',',zTrail:false,col:'#40ff40',extCol:'#40ff40',txtCol:'#40ff40',lw:.18,extLw:.18,desc:'Cotas de arquitetura em metros (3,50), traço oblíquo, texto 2 mm no papel (anotativo).'}},
  blocks:['NORTE'],
  campos:{titulo:'PLANTA BAIXA',disc:'Desenho Arquitetônico'},norte:true,
  dicas:'Paredes: OFFSET 0.15 já configurado (desenhe uma face e faça o offset). Portas, janelas, louças, móveis, escadas e vegetação: Biblioteca de blocos (Ctrl+3), em tamanho real. Cotas no estilo ARQ 1:50.'},
 {id:'topografico',nome:'Desenho Topográfico',icone:'▲',norma:'NBR 13133 (levantamento topográfico) · convenções cartográficas',
  desc:'Levantamentos planialtimétricos em metros (UTM ou local), escala 1:1000, ângulos em graus, minutos e segundos.',
  units:{insertScale:'m',lenPrec:3,angType:'deg_min_sec',angPrec:4},fmt:'A3',land:true,vp:1/1000,anno:1/1000,font:'Arial',grid:[10,1],ltscale:null,txtPaper:2,hatch:'GRASS',offset:1,
  layers:[tplLy(0,'0','#ffffff','solid',.25),tplLy(10,'TOP-PONTOS','#ffff00','solid',.18),tplLy(11,'TOP-PONTOS-TEXTO','#e0e080','solid',.13),tplLy(12,'TOP-COTA-ALTIMETRICA','#00ffff','solid',.13),
   tplLy(13,'TOP-CURVA-MESTRA','#c87830','solid',.35),tplLy(14,'TOP-CURVA-INTERMEDIARIA','#d8b080','solid',.13),tplLy(15,'TOP-CURVA-TEXTO','#c87830','solid',.13),
   tplLy(16,'TOP-LIMITE','#ff2020','phantom',.5),tplLy(17,'TOP-CONFRONTANTE','#ff8080','solid',.18),tplLy(18,'TOP-EDIFICACAO','#ff00ff','solid',.35),tplLy(19,'TOP-VIA','#c0c0c0','solid',.25),
   tplLy(20,'TOP-HIDROGRAFIA','#2080ff','solid',.25),tplLy(21,'TOP-VEGETACAO','#40c040','solid',.18),tplLy(22,'TOP-CERCA','#b0b0b0','divide',.18),tplLy(23,'TOP-POLIGONAL','#00c0c0','dashed',.18),
   tplLy(24,'TOP-MALHA-COORD','#5a6478','solid',.13),tplLy(25,'TOP-COORDENADAS','#8a94a8','solid',.13),tplLy(26,'TOP-COTA','#40ff40','solid',.18),tplLy(27,'TOP-TEXTO','#ffffff','solid',.25),
   tplLy(28,'TOP-AUXILIAR','#606878','solid',.13,false)],
  cur:10,dim:{name:'TOPO 1:1000',o:{font:'Arial',annot:true,txtH:2,arrowType:'filled',arrowSize:2,unit:'m',prec:2,decSep:',',zTrail:false,col:'#40ff40',extCol:'#40ff40',txtCol:'#40ff40',lw:.18,extLw:.18,desc:'Distâncias em metros (2 casas), texto 2 mm no papel (anotativo).'}},
  blocks:['NORTE'],
  campos:{titulo:'LEVANTAMENTO PLANIALTIMÉTRICO',disc:'Topografia'},norte:true,pontosM:true,
  dicas:'Pontos: PONTOS (tabela em metros, com deslocamento UTM) ou POLIGONAL. Curvas mestras e intermediárias nas camadas TOP-CURVA-*. Marcos, vértices, RN, postes, drenagem e vegetação: Biblioteca de blocos (Ctrl+3), na escala de anotação.'}
];
function tplGet(id){ return TEMPLATES.filter(function(t){return t.id===id;})[0]; }
// cria um desenho novo a partir do template
function tplApply(id,opt){
  opt=opt||{}; var T=tplGet(id); if(!T) return false;
  var n0=S.ents.length; newDoc(); if(n0&&S.ents.length) return false; // o usuário desistiu (desenho não salvo)
  tplBaseRestore(); if(T.padrao){ if(typeof updLayerUI==='function'){ updLayerUI(); updLayerSel(); } renderAll(); log('Novo desenho (Padrão).','ok'); return true; }
  S.template=T.id;
  S.units=Object.assign(JSON.parse(JSON.stringify(UNITS_DEFAULT)),T.units);
  S.layers=JSON.parse(JSON.stringify(T.layers)); S.curLy=T.cur;
  S.textFont=T.font;
  S.modes.gridSz=T.grid[0]; S.modes.snapSz=T.grid[1];
  S.annoScale=T.anno; var as=document.getElementById('annoSel'); if(as) as.value=String(T.anno);
  var k=annoK(); // mm de papel por unidade do desenho
  S.ltscale=T.ltscale||Math.round(0.5/k*1e6)/1e6; // traços de ~6 mm no papel
  var st=tplDim(T.dim.o.base||'',T.dim.o); delete st.base; st.name=T.dim.name; S.dimStyles=dimDefaultStyles().concat([st]).map(normDimStyle); S.dimCurrent=st.name; if(typeof updDimStyleSel==='function') updDimStyleSel();
  var th=Math.round(T.txtPaper/k*10000)/10000; var thi=document.getElementById('th'); if(thi) thi.value=th; S.mtH=th; S.textSize=th;
  if(T.offset) S.offDist=T.offset;
  var P=HPAT_BY[T.hatch]; if(P) S.hatchPat={name:P.name,type:'pat',pname:P.id,ang:0,sp:Math.round(P.size/k*10000)/10000};
  S.blocks={}; (T.blocks||[]).forEach(function(b){ bibDefine(b); }); // v8.13: definições vindas da biblioteca de blocos
  if(T.pontosM){ var pu=document.getElementById('pt-unit'); if(pu) pu.value='m'; }
  // folha, viewport e carimbo
  ensureLayouts(); var L=S.layouts[0],f=NBR_FMT[T.fmt]||NBR_FMT.A4; L.fmt=T.fmt; L.paper={w:T.land?Math.max(f[0],f[1]):Math.min(f[0],f[1]),h:T.land?Math.min(f[0],f[1]):Math.max(f[0],f[1])}; L.margins=nbrMargins(T.fmt);
  switchSpace(L.id);
  titleBlockInsert({quiet:true,noSnap:true});
  var v=curViewport(); if(v){ v.k=unitMm()*T.vp; v.auto=false; v.cx=(v.w/2-20)/v.k; v.cy=(v.h/2-20)/v.k; } // origem do Model 20 mm (no papel) para dentro da viewport: espaço para cotas
  var C=cbFind(); if(C){ Object.keys(T.campos||{}).forEach(function(kf){ if(C.fields[kf]) C.fields[kf].txt=T.campos[kf]; }); if(C.fields.escala) C.fields.escala.txt=ratioLabel(T.vp); }
  if(T.norte){ var r=printableRect(L); S.ents.push({id:uid(),tp:'insert',name:'NORTE',x:r.x+r.w-14,y:r.y+r.h-16,s:1,rot:0,m:false,ly:0}); }
  syncLayoutPanel(); switchSpace('model');
  // vista do Model: a área da folha na escala do template
  if(v){ var w=v.w/v.k,h=v.h/v.k,W=cvW(),H=cvH(),x0=v.cx-w/2,y0=v.cy-h/2; S.vp.sc=Math.min(W/w,H/h)*0.9; S.vp.x=W/2-(x0+w/2)*S.vp.sc; S.vp.y=H/2+(y0+h/2)*S.vp.sc; }
  resetHistory(); S.dirty=false; updLayerUI(); updLayerSel(); updStatus(); renderAll();
  document.getElementById('ftitle').textContent='Sem título — '+T.nome;
  log('Template '+T.nome+': unidade '+({mm:'milímetro',cm:'centímetro',m:'metro'})[T.units.insertScale]+', '+T.fmt+(T.land?' paisagem':' retrato')+', escala '+ratioLabel(T.vp)+', '+T.layers.length+' camadas (atual: '+getLy(T.cur).nm+'), estilo de cota '+T.dim.name+', fonte '+fontLabel(T.font).split(' —')[0]+'.','ok');
  if(T.dicas) log(T.dicas,'inf');
  return true;
}
// ── modelos do usuário (no navegador) ──────────────────────────────────────
function tplUserList(){ try{ return JSON.parse(localStorage.getItem('educad-modelos')||'[]')||[]; }catch(e){ return []; } }
function tplUserSave(list){ try{ localStorage.setItem('educad-modelos',JSON.stringify(list)); return true; }catch(e){ log('Não foi possível guardar o modelo neste navegador (espaço cheio?).','er'); return false; } }
function tplUserAdd(){
  var nm=(document.getElementById('tpl-name').value||'').trim().slice(0,40); if(!nm){ log('Dê um nome ao modelo.','er'); document.getElementById('tpl-name').focus(); return; }
  if(typeof spaceSave==='function'&&S.space!=='model') spaceSave();
  var d=JSON.parse(JSON.stringify(buildDoc())); if(!document.getElementById('tpl-geo').checked){ d.ents=[]; }
  var L=tplUserList().filter(function(m){ return m.nome!==nm; }); L.unshift({nome:nm,data:new Date().toLocaleDateString('pt-BR'),doc:d}); if(L.length>20) L.length=20;
  if(tplUserSave(L)){ log('Modelo "'+nm+'" guardado neste navegador. Ele aparece em Novo → Meus modelos.','ok'); tplRender(); }
}
function tplUserApply(i){ var m=tplUserList()[i]; if(!m) return; tplDocApply(m.doc,m.nome); }
function tplDocApply(d,nome){
  var n0=S.ents.length; newDoc(); if(n0&&S.ents.length) return;
  var err=applyDoc(JSON.parse(JSON.stringify(d)),'Sem título'); if(err){ log('Modelo inválido: '+err,'er'); return; }
  closeOv('ov-novo'); resetHistory(); S.dirty=false; if(typeof FILEIO==='object') FILEIO.docHandle=null;
  document.getElementById('ftitle').textContent='Sem título — '+nome; log('Novo desenho a partir do modelo "'+nome+'".','ok');
}
function tplUserDel(i){ var L=tplUserList(),m=L[i]; if(!m||!confirm('Excluir o modelo "'+m.nome+'" deste navegador?')) return; L.splice(i,1); tplUserSave(L); tplRender(); }
function tplFile(ev){ var f=ev.target.files[0]; if(!f) return; var r=new FileReader();
  r.onload=function(e){ try{ var d=JSON.parse(e.target.result); tplDocApply(d,f.name.replace(/\.json$/i,'')); }catch(err){ log('Arquivo de modelo inválido: '+err.message,'er'); } ev.target.value=''; }; r.readAsText(f); }
// ── janela ──────────────────────────────────────────────────────────────────
function tplOpen(){ tplRender(); document.getElementById('ov-novo').classList.add('show'); }
function tplRender(){
  var g=document.getElementById('tpl-grid'); g.textContent='';
  TEMPLATES.forEach(function(T){ var c=document.createElement('div'); c.className='tpl-card'+(T.padrao?' tpl-std':''); c.id='tpl-'+T.id;
    var info=T.padrao?['Milímetro · A4 paisagem · 1:1','4 camadas · estilos Standard e ABNT · Arial']:[({mm:'Milímetro',m:'Metro',cm:'Centímetro'})[T.units.insertScale]+' · '+T.fmt+(T.land?' paisagem':' retrato')+' · '+ratioLabel(T.vp),T.layers.length+' camadas · cota '+T.dim.name+' · '+fontLabel(T.font).split(' —')[0]];
    c.innerHTML='<div class="tpl-ico">'+T.icone+'</div><div class="tpl-body"><div class="tpl-nome"></div><div class="tpl-desc"></div><div class="tpl-info"></div><div class="tpl-norma"></div></div>';
    c.querySelector('.tpl-nome').textContent=T.nome; c.querySelector('.tpl-desc').textContent=T.desc; c.querySelector('.tpl-info').textContent=info.join(' · '); c.querySelector('.tpl-norma').textContent=T.norma||'';
    var b=document.createElement('button'); b.className='btn p'; b.type='button'; b.textContent='Criar'; b.addEventListener('click',function(){ closeOv('ov-novo'); tplApply(T.id); }); c.querySelector('.tpl-body').appendChild(b);
    c.addEventListener('dblclick',function(){ closeOv('ov-novo'); tplApply(T.id); });
    g.appendChild(c); });
  var u=document.getElementById('tpl-user'); u.textContent=''; var L=tplUserList();
  if(!L.length){ var p=document.createElement('div'); p.className='tpl-none'; p.textContent='Nenhum modelo próprio ainda. Configure um desenho (camadas, estilos, layout…) e guarde-o como modelo abaixo.'; u.appendChild(p); }
  L.forEach(function(m,i){ var r=document.createElement('div'); r.className='tpl-urow'; var s=document.createElement('span'); s.textContent=m.nome+' · '+m.data+' · '+((m.doc.layers||[]).length)+' camadas'; r.appendChild(s);
    var a=document.createElement('button'); a.className='btn p'; a.type='button'; a.textContent='Criar'; a.addEventListener('click',function(){ tplUserApply(i); }); r.appendChild(a);
    var d=document.createElement('button'); d.className='btn s'; d.type='button'; d.textContent='Excluir'; d.addEventListener('click',function(){ tplUserDel(i); }); r.appendChild(d); u.appendChild(r); });
}
window.addEventListener('load',function(){
  var ov=document.createElement('div'); ov.className='ov'; ov.id='ov-novo';
  ov.innerHTML='<div class="modal tpl-modal"><h3>Novo desenho — escolha um modelo</h3><div id="tpl-grid" class="tpl-grid"></div>'+
   '<div class="tpl-sec">Meus modelos</div><div id="tpl-user"></div>'+
   '<div class="tpl-save"><input id="tpl-name" placeholder="Nome do modelo (ex.: Planta 1:100 da turma)"><label class="ef-chk"><input type="checkbox" id="tpl-geo"> incluir os objetos do Model</label>'+
   '<button class="btn s" type="button" id="tpl-add">Guardar o desenho atual como modelo</button><button class="btn s" type="button" id="tpl-open">Usar um arquivo .json como modelo…</button></div>'+
   '<input type="file" id="tpl-file" accept=".json" style="display:none">'+
   '<div class="mact"><button class="btn s" type="button" onclick="closeOv(\'ov-novo\')">Cancelar</button></div></div>';
  document.body.appendChild(ov);
  document.getElementById('tpl-add').addEventListener('click',tplUserAdd);
  document.getElementById('tpl-open').addEventListener('click',function(){ document.getElementById('tpl-file').click(); });
  document.getElementById('tpl-file').addEventListener('change',tplFile);
  ['keydown','keyup','keypress'].forEach(function(k){ ov.addEventListener(k,function(ev){ if(ev.key!=='Escape') ev.stopPropagation(); }); });
});
