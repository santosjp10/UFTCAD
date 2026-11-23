/* ═══════════════════════════════════════════════════════════════════
   v8.6 — ZOOM COM OPÇÕES E HISTÓRICO DE VISTAS (R5 do parecer técnico)
   ZOOM / Z: [Tudo/Centro/Extensão/Anterior/Escala/Janela/Objeto], ponto =
   canto da janela, nX (relativo à vista atual), nXP (escala da viewport no
   MSPACE: 1/50XP = 1:50) e n (relativo à extensão do desenho).
   Histórico de até 10 vistas por espaço (Model, cada layout, cada viewport):
   roda do mouse e arrastes seguidos contam como uma única mudança.
   Duplo clique no botão do meio = Extensão (como no AutoCAD).
   ═══════════════════════════════════════════════════════════════════ */
var ZH={st:{},seen:{},t:{},force:false,restoring:false,MAX:10,GAP:700};
function zhVp(){ return S.space!=='model'&&S.mspace?findE(S.mspace):null; }
function zhKey(){ var v=zhVp(); return v?'V:'+v.id:(S.space==='model'?'M':'L:'+S.space); }
function zhGet(){ var v=zhVp(); return v?{k:v.k,cx:v.cx,cy:v.cy}:{x:S.vp.x,y:S.vp.y,sc:S.vp.sc}; }
function zhSet(s){ var v=zhVp(); if(v){ if(s.k===undefined) return false; v.k=s.k; v.cx=s.cx; v.cy=s.cy; v.auto=false; S.dirty=true; if(typeof syncLayoutPanel==='function') syncLayoutPanel(); }
  else { if(s.sc===undefined) return false; S.vp={x:s.x,y:s.y,sc:s.sc}; } return true; }
function zhEq(a,b){ for(var k in a) if(Math.abs(a[k]-b[k])>1e-9*Math.max(1,Math.abs(a[k]))) return false; return true; }
function zhForce(){ ZH.force=true; }
function zhPrevCount(){ return (ZH.st[zhKey()]||[]).length; }
(function(){
  var ra=renderAll;
  renderAll=function(){
    var r=ra.apply(this,arguments);
    try{ var k=zhKey(),cur=zhGet(),prev=ZH.seen[k],now=Date.now();
      if(prev&&!zhEq(prev,cur)){
        if(!ZH.restoring&&(ZH.force||now-(ZH.t[k]||0)>ZH.GAP)){ var L=ZH.st[k]||(ZH.st[k]=[]); L.push(prev); if(L.length>ZH.MAX) L.shift(); }
        ZH.t[k]=now; ZH.force=false; }
      ZH.seen[k]=cur; ZH.restoring=false;
    }catch(e){}
    return r;
  };
  var rh=resetHistory; resetHistory=function(){ ZH.st={}; ZH.seen={}; ZH.t={}; try{ var k=zhKey(); ZH.seen[k]=zhGet(); ZH.t[k]=Date.now(); }catch(e){} return rh.apply(this,arguments); };
})();
function zhPrevious(){ var L=ZH.st[zhKey()]; if(!L||!L.length){ log('ZOOM Anterior: não há vista anterior guardada.','inf'); return false; }
  var s=L.pop(); ZH.restoring=true; ZH.seen[zhKey()]=s; zhSet(s); renderAll(); updStatus(); log('Vista anterior restaurada ('+L.length+' ainda no histórico).','inf'); return true; }
// enquadra um retângulo do desenho (no MSPACE, em coordenadas do Model)
function zvBox(b,m){
  m=m||0.95; var w=Math.max(b.w,1e-9),h=Math.max(b.h,1e-9),v=zhVp(); zhForce();
  if(v){ if(v.lock){ vpLockedMsg(v); return; } v.k=Math.min(v.w/w,v.h/h)*m; v.cx=b.x+b.w/2; v.cy=b.y+b.h/2; v.auto=false; S.dirty=true; syncLayoutPanel(); }
  else { var W=cvW(),H=cvH(); S.vp.sc=Math.max(.02,Math.min(200,Math.min(W/w,H/h)*m)); S.vp.x=W/2-(b.x+b.w/2)*S.vp.sc; S.vp.y=H/2+(b.y+b.h/2)*S.vp.sc; }
  renderAll(); updStatus();
}
function zvExtents(){ var v=zhVp(); zhForce(); if(v){ if(v.lock){ vpLockedMsg(v); return; } vpFit(v); v.auto=false; S.dirty=true; syncLayoutPanel(); renderAll(); } else zoomFit(); updStatus(); }
function zvAll(){ var v=zhVp(); if(v||S.space!=='model') return zvExtents();
  var b=null; S.ents.forEach(function(e){ var q=bbox(e); if(!q) return; b=b?ptsBox([{x:b.x,y:b.y},{x:b.x+b.w,y:b.y+b.h},{x:q.x,y:q.y},{x:q.x+q.w,y:q.y+q.h}]):q; });
  if(!b) return zvExtents(); var B=ptsBox([{x:b.x,y:b.y},{x:b.x+b.w,y:b.y+b.h},{x:0,y:0}]); zvBox(B,0.8); }
function zvScale(f){ var v=zhVp(); zhForce(); if(v){ if(v.lock){ vpLockedMsg(v); return; } v.k*=f; v.auto=false; S.dirty=true; syncLayoutPanel(); renderAll(); } else doZoom(f); updStatus(); }
function zvCenter(c,hgt){ var v=zhVp(); zhForce();
  if(v){ if(v.lock){ vpLockedMsg(v); return; } v.cx=c.x; v.cy=c.y; if(hgt) v.k=v.h/hgt; v.auto=false; S.dirty=true; syncLayoutPanel(); }
  else { if(hgt) S.vp.sc=Math.max(.02,Math.min(200,cvH()/hgt)); S.vp.x=cvW()/2-c.x*S.vp.sc; S.vp.y=cvH()/2+c.y*S.vp.sc; }
  renderAll(); updStatus(); }
function zvHeight(){ var v=zhVp(); return v?v.h/v.k:cvH()/S.vp.sc; }
function zvCenterNow(){ var v=zhVp(); return v?{x:v.cx,y:v.cy}:s2w(cvW()/2,cvH()/2); }
// fator digitado: "2X", "0.5x", "1/50XP", "2" → {f, kind:'X'|'XP'|''}
function zvFactor(u){ var m=/^(\d+(?:[.,]\d+)?)(?:\/(\d+(?:[.,]\d+)?))?\s*(XP|X)?$/.exec(String(u).trim().toUpperCase()); if(!m) return null;
  var f=parseFloat(m[1].replace(',','.'))/(m[2]?parseFloat(m[2].replace(',','.')):1); if(!(f>0)||!isFinite(f)) return null; return {f:f,kind:m[3]||''}; }
function zvApplyFactor(F){
  var v=zhVp();
  if(F.kind==='XP'){ if(!v){ log('ZOOM nXP define a escala de uma viewport: entre nela antes (MSPACE ou duplo clique na viewport).','er'); return false; }
    if(v.lock){ vpLockedMsg(v); return true; } zhForce(); v.k=F.f*unitMm(); v.auto=false; S.dirty=true; syncLayoutPanel(); renderAll(); updStatus(); log('Escala da viewport: '+(F.f>=1?gNum(F.f)+':1':'1:'+gNum(Math.round(1/F.f*1e6)/1e6))+'.','ok'); return true; }
  if(F.kind==='X') { zvScale(F.f); return true; }
  // n sozinho: relativo à extensão do desenho (1 = Extensão)
  zvExtents(); if(F.f!==1){ ZH.restoring=false; var c=zvCenterNow(); zvScaleAt(F.f,c); } return true;
}
function zvScaleAt(f,c){ var v=zhVp(); if(v){ v.k*=f; v.auto=false; renderAll(); return; } var s=w2s(c.x,c.y); doZoom(f,s.x,s.y); }
// ponto clicado no MSPACE → coordenadas do Model
function zvPick(pt,typed){ var v=zhVp(); return (v&&!typed)?vpPaperToModel(v,pt.x,pt.y):{x:pt.x,y:pt.y}; }
NC['-zoom']={
  init:function(ds){ ds.phase='opt'; },
  prompt:function(ds){ return ({
    opt:'ZOOM Canto da janela, fator (nX, nXP) ou [Tudo/Centro/Extensão/Anterior/Escala/Janela/Objeto] <Extensão>:',
    w1:'Primeiro canto da janela:',w2:'Canto oposto:',c1:'Ponto central:',c2:'Ampliação (nX) ou altura <'+gNum(Math.round(zvHeight()*1000)/1000)+'>:',
    s:'Fator de escala (nX = relativo à vista, nXP = escala da viewport, ex.: 1/50XP):'})[ds.phase]||''; },
  click:function(ds,pt){ this.pt(ds,zvPick(pt,false)); },
  pt:function(ds,p){
    if(ds.phase==='opt'||ds.phase==='w1'){ ds.a=p; ds.phase='w2'; return; }
    if(ds.phase==='w2'){ var a=ds.a; if(Math.abs(p.x-a.x)<1e-9&&Math.abs(p.y-a.y)<1e-9){ log('ZOOM Janela: os dois cantos são iguais.','er'); return; }
      zvBox({x:Math.min(a.x,p.x),y:Math.min(a.y,p.y),w:Math.abs(p.x-a.x),h:Math.abs(p.y-a.y)},1); ncEnd(false); return; }
    if(ds.phase==='c1'){ ds.c=p; ds.phase='c2'; return; }
    if(ds.phase==='c2'){ var hh=Math.abs(p.y-ds.c.y)*2; if(hh>0){ zvCenter(ds.c,hh); ncEnd(false); } } },
  input:function(ds,u,raw){
    var p=scrPt(raw);
    if(p&&ds.phase!=='c2'&&ds.phase!=='s'){ this.pt(ds,p); return true; }
    if(ds.phase==='opt'){
      if(u===''||/^(E|EXT|EXTENS[AÃ]O|EXTENTS|FIT)$/.test(u)){ zvExtents(); ncEnd(false); return true; }
      if(/^(T|TUDO|A|ALL)$/.test(u)){ zvAll(); ncEnd(false); return true; }
      if(/^(J|W|JANELA|WINDOW)$/.test(u)){ ds.phase='w1'; return true; }
      if(/^(P|ANTERIOR|PREVIOUS|PREV)$/.test(u)){ zhPrevious(); ncEnd(false); return true; }
      if(/^(C|CENTRO|CENTER|CEN)$/.test(u)){ ds.phase='c1'; return true; }
      if(/^(S|ESCALA|SCALE)$/.test(u)){ ds.phase='s'; return true; }
      if(/^(O|OBJETO|OBJECT)$/.test(u)){ if(zhVp()){ log('ZOOM Objeto: use no Model ou no papel (fora da viewport).','er'); ncEnd(false); return true; } ds.phase='sel'; ds.ids=[]; S.sel=[]; return true; }
      if(u==='+'||u==='IN'||u==='MAIS'){ zvScale(1.5); ncEnd(false); return true; }
      if(u==='-'||u==='OUT'||u==='MENOS'){ zvScale(1/1.5); ncEnd(false); return true; }
      var F=zvFactor(u); if(F){ zvApplyFactor(F); ncEnd(false); return true; }
      return false; }
    if(ds.phase==='s'){ var F2=zvFactor(u); if(!F2) return false; zvApplyFactor(F2); ncEnd(false); return true; }
    if(ds.phase==='c2'){ if(u===''){ zvCenter(ds.c,null); ncEnd(false); return true; } var F3=zvFactor(u); if(!F3||F3.kind==='XP') return false;
      zvCenter(ds.c,F3.kind==='X'?zvHeight()/F3.f:F3.f); ncEnd(false); return true; }
    return false; },
  afterSel:function(ds){ var b=null; ds.ids.map(findE).filter(Boolean).forEach(function(e){ var q=bbox(e); if(!q) return; b=b?ptsBox([{x:b.x,y:b.y},{x:b.x+b.w,y:b.y+b.h},{x:q.x,y:q.y},{x:q.x+q.w,y:q.y+q.h}]):q; });
    var n=ds.ids.length; S.sel=[]; ncEnd(); if(b){ var pad=Math.max(b.w,b.h)*0.05||1; zvBox({x:b.x-pad,y:b.y-pad,w:b.w+2*pad,h:b.h+2*pad},1); log('ZOOM Objeto: '+n+' objeto(s).','inf'); } },
  preview:function(ctx,ds,hp){ if(ds.phase!=='w2'||!ds.a) return; var v=zhVp(),a=v?vpModelToPaper(v,ds.a.x,ds.a.y):ds.a,A=w2s(a.x,a.y),B=w2s(hp.x,hp.y);
    ctx.save(); ctx.setLineDash([5,4]); ctx.strokeStyle='#4d9ef7'; ctx.strokeRect(Math.min(A.x,B.x),Math.min(A.y,B.y),Math.abs(A.x-B.x),Math.abs(A.y-B.y)); ctx.restore(); }
};
// atalhos: ZJ/ZW = janela, ZP = anterior, ZA = tudo, ZO = objeto (botões da faixa)
function zoomCmd(opt){ setTool('-zoom'); if(opt) cmdSubmit(opt); }
window.addEventListener('load',function(){
  var w=document.getElementById('cw'); if(!w) return;
  w.addEventListener('auxclick',function(e){ if(e.button===1&&e.detail===2){ e.preventDefault(); zvExtents(); } });
});

/* ── v8.6 (R9): blocos nativos no DXF 2000 ────────────────────────────────────
   A pré-validação do kit mostrou que os blocos saíam explodidos. Agora, por
   padrão, o DXF 2000 grava a definição (BLOCK) e as referências (INSERT), no
   Model e no papel (carimbo). O DXF R12 continua com os blocos explodidos. */
(function(){
  var fe=flattenEnts,ce=collectExport,bd=buildDXF2000;
  flattenEnts=function(list,depth){ if(S._nb&&!depth) return list.slice(); return fe.apply(this,arguments); };
  collectExport=function(){ var nb=S._nb; S._nb=false; try{ return ce.apply(this,arguments); } finally { S._nb=nb; } };
  buildDXF2000=function(o){ o=o||{}; if(o.blocks==='exploded') return bd(o); var nb=S._nb; S._nb=true; try{ return bd(o); } finally { S._nb=nb; } };
})();
