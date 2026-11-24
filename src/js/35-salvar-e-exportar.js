/* ═══════════════════════════════════════════════════════════════════
   v8.9 — SALVAR E EXPORTAR COM JANELA (nome, formato, pasta, confirmação)
   • Salvar (SAVE/SAVEAS) e Exportar (EXPORT) abrem a mesma janela: nome do
     arquivo, formato (todos os que o EduCAD grava), opções do formato e o
     local. No Chrome e no Edge do computador, "Salvar…" abre a janela do
     sistema para escolher a pasta e confirmar (File System Access API). Nos
     outros navegadores, o arquivo vai para a pasta de downloads com o nome
     escolhido.
   • Ctrl+S / QSAVE: depois do primeiro salvamento numa pasta escolhida, grava
     de novo no mesmo arquivo, sem perguntar (como nos CADs).
   • Abrir (OPEN), quando o navegador permite, também guarda o arquivo aberto
     para o Ctrl+S gravar por cima dele.
   ═══════════════════════════════════════════════════════════════════ */
var FILEIO={sink:null,name:null,docHandle:null,lastHandle:null,mode:'export',userName:false,lastFmt:'dxf'};
function fioCanPick(){ return typeof window.showSaveFilePicker==='function'&&!FILEIO.noPicker; }
(function(){ var dl=downloadBlob;
  downloadBlob=function(content,type,name){
    if(FILEIO.sink){ FILEIO.sink({content:content,type:type,name:name}); return; }
    return dl(content,type,FILEIO.name||name);
  };
})();
var FIO_FMT={
  json:{ext:'.json',mime:'application/json',desc:'Desenho EduCAD',run:function(){ saveDoc(); }},
  dxf:{ext:'.dxf',mime:'application/dxf',desc:'DXF 2000',run:function(){ expDXF('2000'); },suf:''},
  dxf12:{ext:'.dxf',mime:'application/dxf',desc:'DXF R12',run:function(){ expDXF('12'); },suf:'_R12'},
  dwg:{ext:'.dxf',mime:'application/dxf',desc:'DXF 2000 para converter em DWG',run:function(){ expDWG(); },suf:'_para_DWG'},
  pdf:{ext:'.pdf',mime:'application/pdf',desc:'PDF',run:function(){ expPDF(false); },layout:true},
  pdfall:{ext:'.pdf',mime:'application/pdf',desc:'PDF (todos os layouts)',run:function(){ expPDF(true); }},
  svg:{ext:'.svg',mime:'image/svg+xml',desc:'SVG',run:function(){ expSVG(); }},
  png:{ext:'.png',mime:'image/png',desc:'Imagem PNG',run:function(){ expPNG(); }}
};
function fioBase(){ var t=(document.getElementById('ftitle').textContent||'').replace(/^Aula guiada — /,'').replace(/\.(json|dxf|dwg|pdf|svg|png)$/i,'').trim();
  if(!t||/^sem t[ií]tulo/i.test(t)) t='educad'; return t.replace(/[\\/:*?"<>|]+/g,'_'); }
function fioSuggest(fmt){ var F=FIO_FMT[fmt]||FIO_FMT.dxf;
  if(F.layout){ var L=(typeof curLayout==='function'&&curLayout())||(S.layouts||[]).filter(function(l){return l.id===S.lastLayout;})[0]||(S.layouts||[])[0]; return ((L&&L.name)||'Layout1').replace(/[\\/:*?"<>|]+/g,'_'); }
  return fioBase()+(F.suf||''); }
function fioName(){ var fmt=document.getElementById('ef').value,F=FIO_FMT[fmt]||FIO_FMT.dxf,b=document.getElementById('sv-name').value.trim().replace(/[\\/:*?"<>|]+/g,'_').replace(/\.(json|dxf|dwg|pdf|svg|png)$/i,'');
  return (b||fioSuggest(fmt))+F.ext; }
function fioSync(keepName){
  var fmt=document.getElementById('ef').value,F=FIO_FMT[fmt]||FIO_FMT.dxf;
  if(!keepName&&!FILEIO.userName) document.getElementById('sv-name').value=fioSuggest(fmt);
  document.getElementById('sv-ext').textContent=F.ext;
  var pick=document.getElementById('sv-pick'),can=fioCanPick();
  document.getElementById('sv-pickrow').style.display=can?'':'none';
  document.getElementById('sv-dlnote').style.display=can&&pick.checked?'none':'';
  var ok=document.querySelector('#ov-export .btn.p'); ok.textContent=(FILEIO.mode==='save'?'Salvar':'Exportar')+(can&&pick.checked?'…':'');
  var cur=document.getElementById('sv-cur'),h=FILEIO.docHandle;
  cur.style.display=FILEIO.mode==='save'&&h&&fmt==='json'?'':'none'; if(h) document.getElementById('sv-curname').textContent=h.name;
  var w=document.getElementById('sv-warn'); w.textContent=FILEIO.mode==='save'&&fmt!=='json'?'Atenção: só o formato "Desenho EduCAD (.json)" guarda tudo para continuar editando aqui (layouts, estilos, blocos e ajustes). Os outros formatos servem para levar o desenho a outros programas.':''; w.style.display=w.textContent?'':'none';
  if(typeof expFmtChange==='function') expFmtChange();
}
function svOpen(mode){
  FILEIO.mode=mode==='save'?'save':'export'; FILEIO.userName=false;
  var ef=document.getElementById('ef'); ef.value=FILEIO.mode==='save'?'json':(FILEIO.lastFmt||'dxf'); if(!ef.value) ef.selectedIndex=0;
  document.getElementById('sv-title').textContent=FILEIO.mode==='save'?'Salvar como':'Exportar';
  fioSync(); document.getElementById('ov-export').classList.add('show');
  setTimeout(function(){ var n=document.getElementById('sv-name'); n.focus(); n.select(); },30);
}
// produz o arquivo do formato sem baixar (captura o que o exportador geraria)
function fioProduce(fmt){ var got=null; FILEIO.sink=function(o){ got=o; }; try{ FIO_FMT[fmt].run(); } finally { FILEIO.sink=null; } return got; }
function fioBlob(o){ return o.content instanceof Blob?o.content:new Blob([o.content],{type:o.type}); }
async function fioWrite(handle,o){ var w=await handle.createWritable(); await w.write(fioBlob(o)); await w.close(); }
async function svGo(){
  var fmt=document.getElementById('ef').value,F=FIO_FMT[fmt]; if(!F) return;
  var name=fioName(),pick=fioCanPick()&&document.getElementById('sv-pick').checked;
  FILEIO.lastFmt=FILEIO.mode==='export'?fmt:FILEIO.lastFmt;
  if(pick){
    var handle,acc={}; acc[F.mime]=[F.ext];
    var opts={suggestedName:name,types:[{description:F.desc+' ('+F.ext+')',accept:acc}],id:'educad'};
    if(FILEIO.lastHandle) opts.startIn=FILEIO.lastHandle;
    try{ handle=await window.showSaveFilePicker(opts); }
    catch(err){ if(err&&err.name==='AbortError'){ log('Operação cancelada: nenhum arquivo foi gravado.','inf'); return; } log('A janela do sistema não pôde ser aberta ('+(err&&err.message||err)+'). O arquivo será baixado.','inf'); pick=false; }
    if(pick){
      closeOv('ov-export'); var wasDirty=S.dirty,o=fioProduce(fmt); if(!o){ log('Nada a gravar.','er'); return; }
      try{ await fioWrite(handle,o); }
      catch(err){ if(fmt==='json') S.dirty=wasDirty||true; log('Não foi possível gravar "'+handle.name+'": '+(err&&err.message||err),'er'); return; }
      FILEIO.lastHandle=handle;
      if(fmt==='json'){ FILEIO.docHandle=handle; document.getElementById('ftitle').textContent=handle.name; S.dirty=false; }
      log((fmt==='json'?'Desenho salvo':'Exportado')+' em "'+handle.name+'" — '+F.desc+', na pasta escolhida.','ok');
      return;
    }
  }
  closeOv('ov-export'); FILEIO.name=name;
  try{ F.run(); } finally { FILEIO.name=null; }
  if(fmt==='json') document.getElementById('ftitle').textContent=name;
  log('"'+name+'" baixado ('+F.desc+'). O navegador grava na pasta de downloads — ou pergunta onde salvar, se essa opção estiver ligada nas configurações dele.','inf');
}
// Ctrl+S / QSAVE: grava no mesmo arquivo, se houver; senão, abre a janela
async function qsaveCmd(){
  var h=FILEIO.docHandle;
  if(!h){ svOpen('save'); return; }
  try{ if(h.queryPermission&&(await h.queryPermission({mode:'readwrite'}))!=='granted'&&h.requestPermission&&(await h.requestPermission({mode:'readwrite'}))!=='granted'){ svOpen('save'); return; }
    var o=fioProduce('json'); await fioWrite(h,o); document.getElementById('ftitle').textContent=h.name; S.dirty=false; log('Salvo em "'+h.name+'".','ok'); }
  catch(err){ log('Não foi possível gravar em "'+h.name+'" ('+(err&&err.message||err)+'). Escolha o local de novo.','er'); svOpen('save'); }
}
// Abrir: guarda o arquivo escolhido (para o Ctrl+S gravar nele)
(function(){ var od=openDoc;
  openDoc=async function(){
    if(typeof window.showOpenFilePicker!=='function'||FILEIO.noPicker) return od.apply(this,arguments);
    var hs; try{ hs=await window.showOpenFilePicker({id:'educad',types:[{description:'Desenhos (EduCAD, DXF)',accept:{'application/json':['.json'],'application/dxf':['.dxf']}}],multiple:false}); }
    catch(err){ if(err&&err.name==='AbortError') return; return od.apply(this,arguments); }
    var h=hs[0],f=await h.getFile(); loadFile({target:{files:[f],value:''}});
    FILEIO.lastHandle=h; FILEIO.docHandle=/\.json$/i.test(f.name)?h:null;
  };
  var nd=newDoc; newDoc=function(){ var r=nd.apply(this,arguments); if(!S.ents.length&&!S.dirty) FILEIO.docHandle=null; return r; };
})();
showExport=function(){ svOpen('export'); };
doExport=function(){ return svGo(); };
function saveCmd(){ svOpen('save'); }
window.addEventListener('load',function(){
  var ov=document.getElementById('ov-export'); if(!ov) return; var md=ov.querySelector('.modal'),h3=md.querySelector('h3'),ef=document.getElementById('ef');
  md.style.maxWidth='520px'; h3.id='sv-title';
  var top=document.createElement('div'); top.className='sv-row';
  top.innerHTML='<label for="sv-name">Nome do arquivo:</label><div class="sv-namebox"><input id="sv-name" spellcheck="false" autocomplete="off"><span id="sv-ext">.dxf</span></div>';
  h3.parentNode.insertBefore(top,h3.nextSibling);
  var lf=md.querySelector('label[for="ef"]'); if(lf) lf.textContent='Formato:';
  var jo=ef.querySelector('option[value="json"]'); if(jo){ jo.textContent='Desenho EduCAD (.json) — guarda tudo para continuar editando'; }
  var loc=document.createElement('div'); loc.className='sv-loc';
  loc.innerHTML='<div class="sv-lbl">Local:</div>'+
   '<div id="sv-pickrow"><label class="ef-chk"><input type="checkbox" id="sv-pick" checked> Escolher a pasta e confirmar na janela do sistema</label></div>'+
   '<div id="sv-dlnote" class="sv-note">O arquivo vai para a pasta de downloads do navegador. Para escolher a pasta a cada vez, ative "Perguntar onde salvar cada arquivo" nas configurações do navegador — ou use o Chrome ou o Edge no computador.</div>'+
   '<div id="sv-cur" class="sv-note" style="display:none">Arquivo atual: <b id="sv-curname"></b> · <button type="button" class="btn s" id="sv-replace">Substituir este arquivo</button></div>'+
   '<div id="sv-warn" class="sv-warn" style="display:none"></div>';
  var note=document.getElementById('ef-note'); note.parentNode.insertBefore(loc,note.nextSibling);
  var ok=md.querySelector('.btn.p'); ok.removeAttribute('onclick'); ok.addEventListener('click',function(){ svGo(); });
  ef.addEventListener('change',function(){ fioSync(); });
  document.getElementById('sv-pick').addEventListener('change',function(){ fioSync(true); });
  document.getElementById('sv-name').addEventListener('input',function(){ FILEIO.userName=true; });
  document.getElementById('sv-name').addEventListener('keydown',function(ev){ if(ev.key==='Enter'){ ev.preventDefault(); svGo(); } else if(ev.key==='Escape'){ closeOv('ov-export'); } ev.stopPropagation(); });
  document.getElementById('sv-replace').addEventListener('click',function(){ closeOv('ov-export'); qsaveCmd(); });
});
