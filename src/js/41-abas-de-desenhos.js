/* ═══════════════════════════════════════════════════════════════════
   v8.14 — ABAS DE DESENHOS (vários desenhos abertos, como no AutoCAD)
   • Barra de abas acima da área de desenho: uma aba por desenho, com o nome,
     o indicador de alterações não salvas (●) e o botão fechar (×).
   • Novo (modelo) e Abrir criam uma aba nova; a aba vazia do início é
     reaproveitada. Cada aba guarda o seu desenho inteiro: objetos, camadas,
     estilos, layouts e espaço ativo, desfazer/refazer, vista, unidades,
     escala de anotação, grade/snap, arquivo associado (Ctrl+S), cópia de
     segurança e histórico de zoom.
   • Fechar (×, botão do meio, CLOSE/FECHAR): pergunta Salvar / Não salvar /
     Cancelar quando há alterações. CLOSEALL/FECHARTODOS fecha todas.
   • Alt+PageDown / Alt+PageUp alternam as abas (Ctrl+Tab é do navegador).
   • Copiar e colar entre desenhos: Ctrl+C (COPYCLIP), Ctrl+Shift+C (COPYBASE,
     com ponto base) e Ctrl+V (PASTECLIP). Camadas, blocos e estilos de cota
     usados vão junto; a unidade é convertida (mm ↔ m).
   ═══════════════════════════════════════════════════════════════════ */
// chaves de S que são da interface/execução (não mudam com a aba)
var DOC_SKIP={ds:1,tool:1,hover:1,isPan:1,panFrom:1,isWin:1,winFrom:1,hoverId:1,grip:1,gripHover:1,gripDragFrom:1,snapOverride:1,
  cG:1,cD:1,cO:1,gG:1,gD:1,gO:1,wrap:1,W:1,H:1,dpr:1,printing:1,shiftDown:1,modes:1,lastTool:1,_typedPt:1};
var DOCS={list:[],cur:0,seq:0,fresh:null,closeAll:false};
function docTitleEl(){ return document.getElementById('ftitle'); }
function docCapture(){
  var st={S:{}},th=document.getElementById('th'),pu=document.getElementById('pt-unit');
  Object.keys(S).forEach(function(k){ if(!DOC_SKIP[k]) st.S[k]=S[k]; });
  st.gsz=S.modes.gridSz; st.ssz=S.modes.snapSz; st.title=docTitleEl().textContent; st.th=th?th.value:null; st.pu=pu?pu.value:null;
  st.handle=(typeof FILEIO==='object')?FILEIO.docHandle:null;
  st.as={sid:AS.sid,lastJson:AS.lastJson,lastDirty:AS.lastDirty,lastTs:AS.lastTs};
  st.zh={st:ZH.st,seen:ZH.seen,t:ZH.t};
  return st;
}
function docRestore(st){
  Object.keys(S).forEach(function(k){ if(!DOC_SKIP[k]) delete S[k]; });
  Object.keys(st.S).forEach(function(k){ S[k]=st.S[k]; });
  S.modes.gridSz=st.gsz; S.modes.snapSz=st.ssz; S.sel=[]; S.ds=null; S.grip=null; S.hover=null;
  docTitleEl().textContent=st.title; var th=document.getElementById('th'),pu=document.getElementById('pt-unit'); if(th&&st.th!==null) th.value=st.th; if(pu&&st.pu!==null) pu.value=st.pu;
  if(typeof FILEIO==='object') FILEIO.docHandle=st.handle||null;
  AS.sid=st.as.sid; AS.lastJson=st.as.lastJson; AS.lastDirty=st.as.lastDirty; AS.lastTs=st.as.lastTs;
  ZH.st=st.zh.st; ZH.seen=st.zh.seen; ZH.t=st.zh.t;
  if(typeof TE_CACHE==='object'){ TE_CACHE.key=null; TE_CACHE.res=null; }
  LY.active=S.space==='model'?'model':'layout'; document.body.classList.toggle('paper',S.space!=='model');
  var as=document.getElementById('annoSel'); if(as) as.value=String(S.annoScale||1);
  [updLayerUI,updLayerSel,updDimStyleSel,buildLayoutTabs,syncLayoutPanel,updPropsPanel,updStatus,updSelInfo].forEach(function(f){ try{ if(typeof f==='function') f(); }catch(e){} });
  renderAll(); if(document.getElementById('bib-pal')&&document.getElementById('bib-pal').classList.contains('show')&&typeof bibRender==='function') bibRender();
}
function docFreshState(){
  var st=JSON.parse(JSON.stringify(DOCS.fresh)); st.S.vp={x:cvW()/2,y:cvH()/2,sc:2}; st.handle=null;
  st.as={sid:'s'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),lastJson:null,lastDirty:null,lastTs:0};
  st.zh={st:{},seen:{},t:{}}; return st;
}
function docModelEmpty(){ var m=S.space==='model'?S.ents:(S.modelEnts||[]); return !m.length; }
// desenho vazio e intocado (pode ser reaproveitado por Novo/Abrir)
function docPristine(){ return !S.dirty&&docModelEmpty()&&!S.template&&!(S.undos&&S.undos.length)&&!FILEIO.docHandle&&/^Sem título$/.test(docTitleEl().textContent.trim()); }
function docLeave(){ if(S.ds||S.tool!=='select') setTool('select'); if(typeof asFlush==='function') try{ asFlush(); }catch(e){} }
function docNew(){
  docLeave(); DOCS.list[DOCS.cur].st=docCapture();
  var T={id:++DOCS.seq,st:null}; DOCS.list.splice(DOCS.cur+1,0,T); DOCS.cur=DOCS.cur+1; docRestore(docFreshState()); docTabsRender(); return T;
}
function docNewIfNeeded(){ if(!docPristine()) docNew(); }
function docSwitch(i){
  if(i<0||i>=DOCS.list.length||i===DOCS.cur) return;
  docLeave(); DOCS.list[DOCS.cur].st=docCapture(); DOCS.cur=i; var st=DOCS.list[i].st; DOCS.list[i].st=null; docRestore(st); docTabsRender();
  log('Desenho: '+docTitleEl().textContent+'.','inf');
}
function docNext(d){ if(DOCS.list.length>1) docSwitch((DOCS.cur+d+DOCS.list.length)%DOCS.list.length); }
function docDirtyAt(i){ return i===DOCS.cur?!!S.dirty:!!(DOCS.list[i].st&&DOCS.list[i].st.S.dirty); }
function docTitleAt(i){ return i===DOCS.cur?docTitleEl().textContent:(DOCS.list[i].st?DOCS.list[i].st.title:''); }
function docLabel(i){ var t=(docTitleAt(i)||'Sem título').trim(),m=/^Sem título(?: — (?:Desenho )?(.+))?$/.exec(t);
  if(m){ var n=DOCS.list[i]?DOCS.list[i].id:1; return 'Sem título'+(n>1?' '+n:'')+(m[1]?' · '+m[1]:''); }
  return t.replace(/\.(json|dxf)$/i,''); }
// remove a aba ativa (sem perguntar)
function docDrop(){
  var i=DOCS.cur; if(DOCS.list.length===1){ DOCS.seq=0; DOCS.list[0]={id:++DOCS.seq,st:null}; docRestore(docFreshState()); docTabsRender(); return; }
  DOCS.list.splice(i,1); var j=Math.min(i,DOCS.list.length-1); DOCS.cur=j; var st=DOCS.list[j].st; DOCS.list[j].st=null; docRestore(st); docTabsRender();
}
function docClose(i){
  if(i===undefined) i=DOCS.cur; if(i!==DOCS.cur) docSwitch(i);
  docLeave();
  if(!S.dirty){ var nm=docTitleEl().textContent; docDrop(); log('Desenho "'+nm+'" fechado.','ok'); docCloseAllStep(); return; }
  document.getElementById('dt-close-msg').textContent='Salvar as alterações em "'+docTitleEl().textContent+'" antes de fechar?';
  document.getElementById('ov-fechar').classList.add('show');
}
function docCloseAnswer(a){
  closeOv('ov-fechar');
  if(a==='cancel'){ DOCS.closeAll=false; log('Fechamento cancelado.','inf'); return; }
  if(a==='discard'){ var nm=docTitleEl().textContent; docDrop(); log('Desenho "'+nm+'" fechado sem salvar.','ok'); docCloseAllStep(); return; }
  // salvar: fecha quando a gravação terminar (Ctrl+S no mesmo arquivo ou janela Salvar)
  var T=DOCS.list[DOCS.cur]; T.closeAfterSave=Date.now(); qsaveCmd();
}
function docCloseAllStep(){ if(!DOCS.closeAll) return; if(DOCS.list.length===1&&docPristine()){ DOCS.closeAll=false; return; } setTimeout(function(){ if(DOCS.closeAll) docCloseAll(true); },0); }
function docCloseAll(cont){
  if(!cont){ DOCS.closeAll=true; }
  // primeiro os que não têm alterações
  for(var i=DOCS.list.length-1;i>=0;i--){ if(!docDirtyAt(i)&&!(DOCS.list.length===1&&docPristine())){ if(i!==DOCS.cur) docSwitch(i); docLeave(); docDrop(); } }
  var d=-1; for(var k=0;k<DOCS.list.length;k++) if(docDirtyAt(k)){ d=k; break; }
  if(d<0){ DOCS.closeAll=false; log('Todos os desenhos foram fechados.','ok'); return; }
  docClose(d);
}
// vigia: atualiza as abas e conclui "Salvar e fechar"
function docTick(){
  AS.keep=Math.max(5,DOCS.list.length+2);
  if(DOCS.closeAll&&!document.getElementById('ov-fechar').classList.contains('show')&&!(DOCS.list[DOCS.cur]&&DOCS.list[DOCS.cur].closeAfterSave)) DOCS.closeAll=false;
  var T=DOCS.list[DOCS.cur];
  if(T&&T.closeAfterSave){ var ovs=document.getElementById('ov-export'),open=ovs&&ovs.classList.contains('show');
    if(!S.dirty){ T.closeAfterSave=0; var nm=docTitleEl().textContent; docDrop(); log('Desenho "'+nm+'" salvo e fechado.','ok'); docCloseAllStep(); }
    else if(!open&&Date.now()-T.closeAfterSave>1500){ T.closeAfterSave=0; DOCS.closeAll=false; log('O desenho não foi salvo; a aba continua aberta.','inf'); } }
  docTabsRender(true);
}
// ── barra de abas ──────────────────────────────────────────────────────────
var DT_LAST='';
function docTabsRender(lazy){
  var bar=document.getElementById('dt-list'); if(!bar) return;
  var sig=DOCS.list.map(function(t,i){ return t.id+'|'+docLabel(i)+'|'+docDirtyAt(i)+'|'+(i===DOCS.cur); }).join('/');
  if(lazy&&sig===DT_LAST) return; DT_LAST=sig; bar.textContent='';
  DOCS.list.forEach(function(t,i){
    var el=document.createElement('div'); el.className='dt-tab'+(i===DOCS.cur?' on':'')+(docDirtyAt(i)?' dirty':''); el.setAttribute('data-i',i); el.setAttribute('role','tab');
    var lab=docLabel(i); el.title=lab+(docDirtyAt(i)?' — alterações não salvas':'')+'\nClique: ativar · botão do meio ou ×: fechar · botão direito: menu';
    var ic=document.createElement('span'); ic.className='dt-ico'; ic.textContent='▱'; el.appendChild(ic);
    var nm=document.createElement('span'); nm.className='dt-nm'; nm.textContent=lab; el.appendChild(nm);
    var dt=document.createElement('span'); dt.className='dt-dot'; dt.textContent='●'; el.appendChild(dt);
    var x=document.createElement('button'); x.type='button'; x.className='dt-x'; x.textContent='×'; x.title='Fechar — CLOSE'; x.addEventListener('click',function(ev){ ev.stopPropagation(); docClose(i); }); el.appendChild(x);
    el.addEventListener('mousedown',function(ev){ if(ev.button===1){ ev.preventDefault(); docClose(i); } });
    el.addEventListener('click',function(){ docSwitch(i); });
    el.addEventListener('contextmenu',function(ev){ ev.preventDefault(); docMenu(i,ev.clientX,ev.clientY); });
    bar.appendChild(el); });
  var on=bar.querySelector('.dt-tab.on'); if(on&&on.scrollIntoView) try{ on.scrollIntoView({block:'nearest',inline:'nearest'}); }catch(e){}
}
function docMenu(i,x,y){
  var m=document.getElementById('dt-menu'); m.textContent='';
  [['Fechar',function(){ docClose(i); }],['Fechar os outros',function(){ docCloseOthers(i); }],['Fechar todos',function(){ docCloseAll(); }],['Salvar',function(){ docSwitch(i); qsaveCmd(); }],['Novo desenho…',function(){ tplOpen(); }]].forEach(function(o){
    var b=document.createElement('button'); b.type='button'; b.textContent=o[0]; b.addEventListener('click',function(){ m.classList.remove('show'); o[1](); }); m.appendChild(b); });
  m.style.left=Math.min(x,window.innerWidth-180)+'px'; m.style.top=y+'px'; m.classList.add('show');
}
function docCloseOthers(i){ var keep=DOCS.list[i]; if(DOCS.cur!==i) docSwitch(i);
  // fecha os sem alterações; os com alterações ficam (avisados)
  var n=0,d=0; for(var k=DOCS.list.length-1;k>=0;k--){ if(DOCS.list[k]===keep) continue; if(docDirtyAt(k)){ d++; continue; } DOCS.list.splice(k,1); n++; }
  DOCS.cur=DOCS.list.indexOf(keep); docTabsRender(); log(n+' desenho(s) fechado(s)'+(d?'; '+d+' com alterações não salvas continuam abertos (feche-os pelo × para salvar).':'.'),'ok'); }
// ── pontos de entrada: Novo (modelo) e Abrir criam aba ─────────────────────
// o Abrir com seletor do sistema grava o arquivo escolhido em FILEIO.docHandle antes da leitura terminar:
// ele pertence ao desenho que vai abrir, não à aba de onde se abriu
function docOpenTab(){ var h=FILEIO.docHandle; FILEIO.docHandle=DOCS.prevHandle||null; var made=!docPristine(); if(made) docNew(); FILEIO.docHandle=h; DOCS.prevHandle=null; return made; }
function tplCreate(id){ docNewIfNeeded(); return tplApply(id); }
(function(){
  // Abrir: a aba nova só é criada quando o arquivo é válido
  var lf=loadFile; loadFile=function(ev){ var f=ev&&ev.target&&ev.target.files&&ev.target.files[0]; if(f&&!S.dxfMerge){ DOCS.opening=true; DOCS.prevHandle=FILEIO.docHandle; } return lf.apply(this,arguments); };
  var ad=applyDoc; applyDoc=function(d){ if(DOCS.opening){ DOCS.opening=false; if(!validateDoc(d)) docOpenTab(); } return ad.apply(this,arguments); };
  var ib=importDxfBuffer; importDxfBuffer=function(buf,name,merge){ if(merge||!DOCS.opening) return ib.apply(this,arguments); DOCS.opening=false;
    var prev=DOCS.cur,made=docOpenTab(); var ok=ib.apply(this,arguments);
    if(!ok&&made){ DOCS.list.splice(DOCS.cur,1); DOCS.cur=prev; var st=DOCS.list[prev].st; DOCS.list[prev].st=null; docRestore(st); docTabsRender(); } return ok; };
  var td=tplDocApply; tplDocApply=function(){ docNewIfNeeded(); return td.apply(this,arguments); };
  var ar=asRecover; asRecover=function(){ docNewIfNeeded(); return ar.apply(this,arguments); };
})();
// ── copiar e colar entre desenhos ──────────────────────────────────────────
var DOCCLIP=null;
function clipMm(){ return S.space==='model'?unitMm():1; }
function clipBlocksUsed(ents,acc){ acc=acc||{}; ents.forEach(function(e){ if(e.tp==='insert'&&S.blocks[e.name]&&!acc[e.name]){ acc[e.name]=JSON.parse(JSON.stringify(S.blocks[e.name])); clipBlocksUsed(S.blocks[e.name].ents,acc); } }); return acc; }
function clipCopy(ids,base){
  var ents=ids.map(findE).filter(function(e){ return e&&e.tp!=='viewport'; }); if(!ents.length){ log('Nada para copiar.','er'); return false; }
  if(!base){ var bs=ents.map(bbox).filter(Boolean),x=Infinity,y=Infinity; bs.forEach(function(b){ x=Math.min(x,b.x); y=Math.min(y,b.y); }); base={x:isFinite(x)?x:0,y:isFinite(y)?y:0}; }
  var lys={}; ents.forEach(function(e){ var L=getLy(e.ly); if(L) lys[e.ly]=JSON.parse(JSON.stringify(L)); });
  var blk=clipBlocksUsed(ents); Object.keys(blk).forEach(function(k){ blk[k].ents.forEach(function(c){ if(c.ly!==0&&c.ly!==undefined){ var L=getLy(c.ly); if(L) lys[c.ly]=JSON.parse(JSON.stringify(L)); } }); });
  var dsn={}; ents.forEach(function(e){ if(e.dimStyle&&!dsn[e.dimStyle]){ var st=(S.dimStyles||[]).filter(function(s){return s.name===e.dimStyle;})[0]; if(st) dsn[e.dimStyle]=JSON.parse(JSON.stringify(st)); } });
  DOCCLIP={id:'clip'+Date.now().toString(36),ents:JSON.parse(JSON.stringify(ents)),base:base,mm:clipMm(),layers:lys,blocks:blk,dim:dsn,from:docTitleEl().textContent,n:ents.length};
  log(ents.length+' objeto(s) copiado(s) para a área de transferência do EduCAD. Ctrl+V cola neste ou em outro desenho (aba).','ok');
  return true;
}
function clipMarker(){ return DOCCLIP?'[EduCAD] '+DOCCLIP.n+' objeto(s) de "'+DOCCLIP.from+'" — cole com Ctrl+V num desenho do EduCAD #'+DOCCLIP.id:''; }
function clipBuild(p){ // devolve as entidades prontas para o desenho atual (ainda sem camadas criadas)
  var C=DOCCLIP,f=C.mm/clipMm(); return C.ents.map(function(e){ var c=JSON.parse(JSON.stringify(e)); if(f!==1) scalE(c,C.base,f); transl(c,p.x-C.base.x,p.y-C.base.y); return c; });
}
function clipPaste(p){
  var C=DOCCLIP; if(!C) return; snapshot();
  // camadas: pelo nome; as que faltam são criadas com as mesmas propriedades
  var map={},novas=[]; Object.keys(C.layers).forEach(function(id){ var L=C.layers[id],t=S.layers.filter(function(x){return x.nm===L.nm;})[0];
    if(!t){ t=JSON.parse(JSON.stringify(L)); t.id=nextLayerId(); t.lock=false; S.layers.push(t); novas.push(t.nm); } map[id]=t.id; });
  var nb=[]; Object.keys(C.blocks).forEach(function(k){ if(!S.blocks[k]){ var B=JSON.parse(JSON.stringify(C.blocks[k])); B.ents.forEach(function(c){ if(map[c.ly]!==undefined) c.ly=map[c.ly]; }); S.blocks[k]=B; nb.push(k); } });
  Object.keys(C.dim).forEach(function(k){ if(!(S.dimStyles||[]).some(function(s){return s.name===k;})) S.dimStyles.push(normDimStyle(JSON.parse(JSON.stringify(C.dim[k])))); });
  var ids=[]; clipBuild(p).forEach(function(c){ c.id=uid(); if(map[c.ly]!==undefined) c.ly=map[c.ly]; S.ents.push(c); ids.push(c.id); });
  S.sel=ids; S.dirty=true; updLayerUI(); updLayerSel(); if(typeof updDimStyleSel==='function') updDimStyleSel(); renderAll(); updStatus(); updSelInfo();
  var f=C.mm/clipMm();
  log('Colado(s) '+ids.length+' objeto(s)'+(f!==1?' (unidades convertidas, fator '+gNum(f)+')':'')+(novas.length?'; camadas criadas: '+novas.join(', '):'')+(nb.length?'; blocos: '+nb.join(', '):'')+'.','ok');
}
NC.copyclip={needSel:true,prompt:function(){return '';},click:function(){},input:function(){return true;},
  afterSel:function(ds){ clipCopy(ds.ids); S.sel=ds.ids.slice(); ncEnd(false); renderAll(); }};
NC.copybase={
  init:function(ds){ ds.phase='base'; ds.pre=S.sel.slice(); },
  prompt:function(ds){ return 'COPYBASE Especifique o ponto base:'; },
  click:function(ds,pt){ if(ds.phase==='base'){ ds.base={x:pt.x,y:pt.y}; if(ds.pre.length){ ds.ids=ds.pre; this.afterSel(ds); } else { ds.phase='sel'; ds.ids=[]; S.sel=[]; } } },
  afterSel:function(ds){ clipCopy(ds.ids,ds.base); S.sel=ds.ids.slice(); ncEnd(false); renderAll(); },
  input:function(ds,u,raw){ if(ds.phase==='base'){ var p=parseCoord(raw); if(!p) return false; this.click(ds,p); return true; } return false; }
};
NC.pasteclip={
  init:function(ds){ ds.phase='pt'; if(!DOCCLIP){ log('A área de transferência do EduCAD está vazia. Selecione objetos e use Ctrl+C.','er'); setTimeout(function(){ if(S.ds===ds) ncEnd(); },0); } },
  prompt:function(){ return 'PASTECLIP Especifique o ponto de inserção ('+(DOCCLIP?DOCCLIP.n:0)+' objeto(s) de "'+(DOCCLIP?DOCCLIP.from:'')+'"):'; },
  click:function(ds,pt){ clipPaste(pt); ncEnd(false); },
  input:function(ds,u,raw){ if(u===''){ ncEnd(); return true; } var p=parseCoord(raw); if(!p) return false; this.click(ds,p); return true; },
  preview:function(ctx,ds,hp){ if(!DOCCLIP||!hp) return; ctx.save(); ctx.globalAlpha=.7; clipBuild(hp).forEach(function(c){ try{ drawE(ctx,c,true); }catch(e){} }); ctx.restore(); }
};
// atalhos: os eventos copy/paste do navegador (Ctrl+C / Ctrl+V)
function clipCanUse(){ var a=document.activeElement,ci=document.getElementById('cmdinput');
  if(document.querySelector('.ov.show')) return false;
  if(a===ci) return ci.selectionStart===ci.selectionEnd; // sem texto selecionado no campo de comando
  return !(a&&isTypingTarget(a)); }
// ── janela "fechar" e barra ────────────────────────────────────────────────
window.addEventListener('load',function(){
  var bar=document.createElement('div'); bar.id='doctabs'; bar.setAttribute('role','tablist');
  bar.innerHTML='<div id="dt-list" class="dt-list"></div><button type="button" class="dt-new" id="dt-new" title="Novo desenho — NEW (Ctrl+N): abre numa nova aba">+</button>';
  var ws=document.getElementById('ws'); ws.parentNode.insertBefore(bar,ws);
  document.getElementById('dt-new').addEventListener('click',function(){ tplOpen(); });
  var menu=document.createElement('div'); menu.id='dt-menu'; menu.className='dt-menu'; document.body.appendChild(menu);
  document.addEventListener('mousedown',function(ev){ if(!menu.contains(ev.target)) menu.classList.remove('show'); },true);
  var ov=document.createElement('div'); ov.className='ov'; ov.id='ov-fechar';
  ov.innerHTML='<div class="modal" style="max-width:440px"><h3>Fechar desenho</h3><p id="dt-close-msg" style="font-size:12px;line-height:1.5;margin:8px 0 14px"></p>'+
    '<div class="mact"><button class="btn s" type="button" id="dt-cancel">Cancelar</button><button class="btn s" type="button" id="dt-discard">Não salvar</button><button class="btn p" type="button" id="dt-save">Salvar</button></div></div>';
  document.body.appendChild(ov);
  document.getElementById('dt-save').addEventListener('click',function(){ docCloseAnswer('save'); });
  document.getElementById('dt-discard').addEventListener('click',function(){ docCloseAnswer('discard'); });
  document.getElementById('dt-cancel').addEventListener('click',function(){ docCloseAnswer('cancel'); });
  // teclas
  document.addEventListener('keydown',function(ev){
    if(ev.altKey&&!ev.ctrlKey&&(ev.key==='PageDown'||ev.key==='PageUp')){ if(document.querySelector('.ov.show')) return; ev.preventDefault(); docNext(ev.key==='PageDown'?1:-1); return; }
    if(ev.ctrlKey&&ev.shiftKey&&!ev.altKey&&(ev.key==='C'||ev.key==='c')&&clipCanUse()){ ev.preventDefault(); setTool('copybase'); }
  });
  document.addEventListener('copy',function(ev){
    if(!clipCanUse()) return;
    if(!S.sel.length){ if(S.tool==='select'&&!S.ds){ setTool('copyclip'); ev.preventDefault(); } return; }
    if(clipCopy(S.sel.slice())){ try{ ev.clipboardData.setData('text/plain',clipMarker()); }catch(e){} ev.preventDefault(); }
  },true);
  document.addEventListener('paste',function(ev){
    var t=ev.clipboardData,txt=''; try{ txt=t?t.getData('text/plain'):''; }catch(e){}
    if(!DOCCLIP||!clipCanUse()) return;
    var m=/#(clip[a-z0-9]+)\s*$/.exec(txt||''); if(txt&&!(m&&m[1]===DOCCLIP.id)) return; // texto de outro programa: segue o fluxo normal (coordenadas, comandos)
    ev.preventDefault(); ev.stopImmediatePropagation(); setTool('pasteclip');
  },true);
  window.addEventListener('beforeunload',function(ev){ for(var i=0;i<DOCS.list.length;i++) if(i!==DOCS.cur&&docDirtyAt(i)){ ev.preventDefault(); ev.returnValue=''; return; } });
  setTimeout(function(){ DOCS.fresh=docCapture(); DOCS.fresh.S=JSON.parse(JSON.stringify(DOCS.fresh.S)); DOCS.fresh.title='Sem título'; DOCS.fresh.handle=null; DOCS.fresh.zh={st:{},seen:{},t:{}};
    DOCS.fresh.S.ents=[]; DOCS.fresh.S.undos=[]; DOCS.fresh.S.redos=[]; DOCS.fresh.S.dirty=false; DOCS.fresh.S.sel=[];
    DOCS.list=[{id:++DOCS.seq,st:null}]; DOCS.cur=0; docTabsRender(); if(typeof resize==='function') resize(); renderAll(); setInterval(docTick,400); },0);
});
