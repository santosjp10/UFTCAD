/* ═══════════════════════════════════════════════════════════════════
   v8.10 — FONTES DOS TEXTOS E ESPESSURAS DE LINHA (compatibilidade com o AutoCAD)
   • Fonte por texto (TEXT/MTEXT) no editor e no painel de propriedades; fonte
     padrão do desenho (estilo Standard) pelo comando ESTILO/STYLE. No DXF, cada
     fonte vira um estilo de texto com o arquivo real (arial.ttf, isocpeur.ttf,
     romans.shx…), e as cotas usam o estilo da fonte do seu estilo de cota.
   • Espessuras: camadas padrão 0,35 (contorno) e 0,18 (construção, cotas e
     hachuras); o DXF sai com o botão LWT desligado ($LWDISPLAY=0), como os
     desenhos novos do AutoCAD; listas com as espessuras-padrão do AutoCAD.
   ═══════════════════════════════════════════════════════════════════ */
if(!S.textFont) S.textFont=FONT_DEFAULT;
var LW_OLD={'0':0.7,'1':0.35,'2':0.5,'3':0.35},LW_NEW={'0':0.35,'1':0.18,'2':0.18,'3':0.18};
// ── documento: fonte padrão e migração das espessuras padrão antigas ──
(function(){ var bd=buildDoc,ad=applyDoc;
  buildDoc=function(){ var d=bd.apply(this,arguments); d.textFont=S.textFont; return d; };
  applyDoc=function(d,name){ var r=ad.apply(this,arguments); if(r) return r;
    S.textFont=(d&&d.textFont&&FONT_BY[String(d.textFont).toLowerCase()])?FONT_BY[String(d.textFont).toLowerCase()].key:FONT_DEFAULT;
    var L=S.layers,old=['0','1','2','3'].every(function(id){ var l=L.filter(function(x){return String(x.id)===id;})[0]; return l&&Math.abs((+l.lw||0)-LW_OLD[id])<1e-9; });
    if(old){ L.forEach(function(l){ if(LW_NEW[String(l.id)]!==undefined) l.lw=LW_NEW[String(l.id)]; }); updLayerUI(); renderAll();
      setTimeout(function(){ log('Espessuras das camadas padrão atualizadas (0: 0,35 mm; Construção, Dimensão e Hachura: 0,18 mm), mais próximas do AutoCAD e da NBR 8403.','inf'); },0); }
    return r; };
  var nd=newDoc; newDoc=function(){ var n0=S.ents.length,r=nd.apply(this,arguments); if(!S.ents.length&&(n0||!S.dirty)) S.textFont=FONT_DEFAULT; return r; };
})();
// ── DXF: fontes usadas no desenho (além da padrão) viram estilos de texto ──
function fontDxfStyles(){
  var seen={},out=[],def=fontKey(null);
  function add(k){ k=fontKey(k); if(k===def||seen[k]) return; seen[k]=1; out.push({key:k,name:k}); }
  function scan(list,depth){ (list||[]).forEach(function(e){ if(!e) return;
    if(e.tp==='txt'||e.tp==='mtext'){ if(e.font) add(e.font); }
    else if(typeof isDim==='function'&&(isDim(e)||e.tp==='leader')){ try{ add(dimStyleOf(e).font); }catch(err){} }
    else if(e.tp==='insert'&&(depth||0)<8&&S.blocks&&S.blocks[e.name]) scan(S.blocks[e.name].ents,(depth||0)+1); }); }
  scan(S.ents); scan(S.modelEnts); (S.layouts||[]).forEach(function(L){ scan(L.ents); }); if(S._curPaper) scan(S._curPaper.ents);
  Object.keys(S.blocks||{}).forEach(function(k){ scan(S.blocks[k].ents,1); });
  (S.dimStyles||[]).forEach(function(st){ add(st.font); });
  return out;
}
// ── editor de texto: escolha da fonte ──
window.addEventListener('load',function(){
  var hrow=document.getElementById('mted-row-h'); if(!hrow) return;
  var lab=document.createElement('label'); lab.id='mted-row-font'; lab.style.cssText='display:flex;align-items:center;gap:6px';
  lab.innerHTML='Fonte '+fontSelectHTML('mted-font'); hrow.parentNode.insertBefore(lab,hrow);
  var sel=document.getElementById('mted-font'); sel.style.cssText='width:auto;max-width:240px;margin:0';
  sel.addEventListener('change',function(){ var ed=document.getElementById('mted-txt'); if(ed) ed.style.fontFamily=fontCss(sel.value); });
  sel.addEventListener('keydown',function(ev){ ev.stopPropagation(); });
});
(function(){ var op=mtEditorOpen;
  mtEditorOpen=function(opts,cb){
    var sel=document.getElementById('mted-font'),row=document.getElementById('mted-row-font');
    var wrapped=function(r){ if(sel&&row&&row.style.display!=='none'){ r.font=sel.value; S.lastTextFont=r.font; } return cb&&cb(r); };
    var res=op.call(this,opts,wrapped);
    if(sel){ sel.value=fontKey(opts.font||S.lastTextFont||S.textFont); row.style.display=opts.noH?'none':''; var ed=document.getElementById('mted-txt'); if(ed) ed.style.fontFamily=fontCss(sel.value); }
    return res;
  };
})();
// fonte gravada no texto criado/editado (DT, MTEXT, edição). Só guarda fonte própria se for diferente da padrão
// (como no AutoCAD: os demais textos acompanham o estilo Standard).
function fontChosen(){ var sel=document.getElementById('mted-font'),row=document.getElementById('mted-row-font'); if(!sel||!row||row.style.display==='none') return undefined; return sel.value; }
(function(){ var ae=addE;
  addE=function(e,noSnap){ if(e&&(e.tp==='txt'||e.tp==='mtext')&&!e.font&&MTED._font&&MTED._font!==fontKey(null)) e.font=MTED._font; return ae.apply(this,arguments); };
  var te=textEdit;
  textEdit=function(e){ var r=te.apply(this,arguments); if(e&&(e.tp==='txt'||e.tp==='mtext')){ var sel=document.getElementById('mted-font'); if(sel){ sel.value=fontKey(e.font); var ed=document.getElementById('mted-txt'); if(ed) ed.style.fontFamily=fontCss(sel.value); } MTED._editing=e; } return r; };
  var ok=mtEditorOK;
  mtEditorOK=function(){ var k=fontChosen(),e=MTED._editing; MTED._font=k||null; MTED._editing=null;
    try{ var r=ok.apply(this,arguments);
      if(e&&k&&S.ents.indexOf(e)>=0){ if(k===fontKey(null)) delete e.font; else e.font=k; renderAll(); if(typeof updSelInfo==='function') updSelInfo(); }
      return r; } finally { MTED._font=null; } };
  var cn=mtEditorCancel; mtEditorCancel=function(){ MTED._editing=null; return cn.apply(this,arguments); };
})();
// ── painel de propriedades: Fonte ──
(function(){ var gf=geomFields;
  geomFields=function(e){ var F=gf.apply(this,arguments);
    if(e&&(e.tp==='txt'||e.tp==='mtext')&&Array.isArray(F)){
      F.unshift({l:'Fonte',sel:FONTS.map(function(f){return f[1];}),v:fontLabel(e.font),set:function(o,v){ var f=FONTS.filter(function(x){return x[1]===v;})[0]; if(!f) return false; o.font=f[0]; }}); }
    return F; };
})();
// ── comando ESTILO / STYLE: fonte padrão do desenho (estilo Standard) ──
function styleOpen(){
  var ov=document.getElementById('ov-style'); if(!ov) return; document.getElementById('sty-font').value=fontKey(S.textFont);
  var n=S.sel.map(findE).filter(function(e){return e&&(e.tp==='txt'||e.tp==='mtext');}).length; document.getElementById('sty-sel').disabled=!n; document.getElementById('sty-sel').textContent='Aplicar aos '+n+' texto(s) selecionado(s)';
  styPreview(); ov.classList.add('show'); }
function styPreview(){ var c=document.getElementById('sty-prev'); c.style.fontFamily=fontCss(document.getElementById('sty-font').value);
  var i=fontInfo(document.getElementById('sty-font').value); document.getElementById('sty-file').textContent='No AutoCAD: '+i.file+(i.ttf?' (TrueType do Windows)':' (fonte SHX do AutoCAD)')+' · no PDF: '+i.pdf; }
function styApply(which){
  var k=document.getElementById('sty-font').value,n=0; snapshot();
  if(which==='default'){ S.textFont=k; log('Fonte padrão (estilo Standard): '+fontLabel(k)+'. Textos sem fonte própria e cotas no estilo Standard passam a usá-la.','ok'); }
  else { var list=which==='sel'?S.sel.map(findE):S.ents.concat(S.modelEnts||[]); list.forEach(function(e){ if(e&&(e.tp==='txt'||e.tp==='mtext')){ e.font=k; n++; } });
    (S.layouts||[]).forEach(function(L){ if(which==='all'&&L.ents!==S.ents) L.ents.forEach(function(e){ if(e.tp==='txt'||e.tp==='mtext'){ e.font=k; n++; } }); });
    log('Fonte '+fontLabel(k)+' aplicada a '+n+' texto(s).','ok'); }
  S.dirty=true; closeOv('ov-style'); renderAll(); updSelInfo();
}
window.addEventListener('load',function(){
  var ov=document.createElement('div'); ov.className='ov'; ov.id='ov-style';
  ov.innerHTML='<div class="modal" style="min-width:min(440px,94vw)"><h3>Estilo de texto — fonte</h3>'+
   '<label>Fonte:</label>'+fontSelectHTML('sty-font')+
   '<div id="sty-prev" class="sty-prev">Desenho Técnico — Agronomia · 0123456789 · Ø ± °</div><div id="sty-file" class="sv-note"></div>'+
   '<div class="sv-note" style="margin-top:8px">A <b>fonte padrão</b> é a do estilo <b>Standard</b> no DXF: vale para todos os textos sem fonte própria. As fontes de CAD (ISOCPEUR, romans, simplex, txt) aparecem certas no AutoCAD; aqui na tela, sem a fonte instalada, são mostradas com uma fonte parecida.</div>'+
   '<div class="mact" style="flex-wrap:wrap;gap:6px"><button class="btn s" type="button" onclick="closeOv(\'ov-style\')">Cancelar</button>'+
   '<button class="btn s" type="button" id="sty-sel" onclick="styApply(\'sel\')">Aplicar aos selecionados</button>'+
   '<button class="btn s" type="button" id="sty-all" onclick="styApply(\'all\')">Aplicar a todos os textos</button>'+
   '<button class="btn p" type="button" id="sty-def" onclick="styApply(\'default\')">Definir como padrão</button></div></div>';
  document.body.appendChild(ov);
  document.getElementById('sty-font').addEventListener('change',styPreview);
  ['keydown','keyup','keypress'].forEach(function(k){ ov.addEventListener(k,function(ev){ if(ev.key!=='Escape') ev.stopPropagation(); }); });
  // exportação DXF: botão LWT
  var opts=document.getElementById('ef-dxfopts'); if(opts){ var l=document.createElement('label'); l.className='ef-chk';
    l.innerHTML='<input type="checkbox" id="dxf-lwt"> Mostrar as espessuras de linha ao abrir no AutoCAD (botão LWT ligado)'; opts.appendChild(l); }
  // listas de espessura com os valores do AutoCAD
  function fill(id,first){ var s=document.getElementById(id); if(!s) return; var v=s.value; s.textContent='';
    (first||[]).forEach(function(o){ var op=document.createElement('option'); op.value=o[0]; op.textContent=o[1]; s.appendChild(op); });
    LW_ACAD.filter(function(x){return x>0;}).forEach(function(x){ var op=document.createElement('option'); op.value=String(x); op.textContent=lwLabel(x)+(x===0.25?' (padrão)':''); s.appendChild(op); });
    if(v!==undefined) s.value=String(parseFloat(v)||v); }
  fill('propLW',[['','ByLayer']]); fill('lt-lw');
});
(function(){ var sync=function(){ var s=document.getElementById('propLW'); if(!s) return; var o=Array.prototype.some.call(s.options,function(x){return x.value===s.value;}); if(!o&&s.value!==''){ var v=parseFloat(s.value); if(v>0) s.value=String(v); } };
  if(typeof updPropsPanel==='function'){ var up=updPropsPanel; updPropsPanel=function(){ var r=up.apply(this,arguments); sync(); return r; }; } })();
