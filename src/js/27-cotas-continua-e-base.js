/* ═══════════════════════════════════════════════════════════════════
   v8.0 — COTAS EM SÉRIE (DIMCONTINUE) E DE BASE (DIMBASELINE) — R6 do parecer
   • DCO: cada nova cota começa na 2ª linha de extensão da anterior, na mesma
     linha de cota (cotagem em série / em cadeia).
   • DBA: todas as cotas partem da 1ª linha de extensão da cota de base; cada
     nova linha de cota fica DIMDLI ("Espaçamento da linha de base") mais longe.
   • Partem da última cota linear ou alinhada criada; [Selecionar] escolhe outra
     (a linha de extensão mais próxima do clique vira a origem, como no AutoCAD).
   • Opções: [Selecionar/Desfazer]; Enter ou Esc encerra; um Ctrl+Z por cota.
   ═══════════════════════════════════════════════════════════════════ */
function dcDimOk(e){ return e&&e.tp==='dim'&&(e.subtp==='linear'||e.subtp==='aligned'||!e.subtp)&&dimLinePoints(e); }
function dcLastDim(){ for(var i=S.ents.length-1;i>=0;i--) if(dcDimOk(S.ents[i])) return S.ents[i]; return null; }
function dcScale(st){ return st.annot?1/annoK():(st.dimscale||1); }
// Dados geométricos de uma cota: origens, linha de cota, direção, normal e afastamento
function dcFrame(e){
  normDimLegacy(e);
  var g=dimLinePoints(e),o1={x:e.x1,y:e.y1},o2={x:e.x2,y:e.y2},u,n,off;
  if(e.subtp==='aligned'){ var L=Math.hypot(o2.x-o1.x,o2.y-o1.y); u={x:(o2.x-o1.x)/L,y:(o2.y-o1.y)/L}; n={x:-u.y,y:u.x}; off=(g.d1x-o1.x)*n.x+(g.d1y-o1.y)*n.y; }
  else if(e.dimDir==='v'){ u={x:0,y:1}; n={x:1,y:0}; off=g.d1x; }
  else { u={x:1,y:0}; n={x:0,y:1}; off=g.d1y; }
  return {g:g,o1:o1,o2:o2,u:u,n:n,off:off};
}
// Cria a nova cota de o (origem) até p, com a linha de cota em "line" (coordenada absoluta ou afastamento)
function dcMake(B,o,p,lineAbs,lineSide){
  var st=dimStyleOf(B),e={tp:'dim',subtp:B.subtp||'linear',x1:o.x,y1:o.y,x2:p.x,y2:p.y,dimStyle:B.dimStyle,ly:B.ly,col:B.col,unit:'mm'};
  if(e.subtp==='aligned'){
    var L=Math.hypot(p.x-o.x,p.y-o.y); if(L<1e-9) return null;
    var u={x:(p.x-o.x)/L,y:(p.y-o.y)/L},n={x:-u.y,y:u.x},f=dcFrame(B);
    if(n.x*f.n.x+n.y*f.n.y<0){ n={x:-n.x,y:-n.y}; } // mesmo lado da cota de origem
    e.px=(o.x+p.x)/2+n.x*lineSide; e.py=(o.y+p.y)/2+n.y*lineSide;
  } else {
    e.dimDir=B.dimDir||'h';
    if(e.dimDir==='h'){ if(Math.abs(p.x-o.x)<1e-9) return null; e.px=(o.x+p.x)/2; e.py=lineAbs; }
    else { if(Math.abs(p.y-o.y)<1e-9) return null; e.px=lineAbs; e.py=(o.y+p.y)/2; }
  }
  e.val=dimMeasure(e).toFixed(2);
  return e;
}
function dcNext(ds,p){
  var B=findE(ds.base); if(!B) return null;
  var f=dcFrame(B),st=dimStyleOf(B);
  if(ds.cmd==='dimcontinue') return dcMake(B,f.o2,p,f.off,f.off);
  // linha de base: origem fixa (o1 da primeira cota) e linha de cota afastada DIMDLI da última
  var inc=(st.baseInc!==undefined?st.baseInc:3.75)*dcScale(st);
  var R=findE(ds.root)||B,fr=dcFrame(R),side;
  if(B.subtp==='aligned'){ side=f.off>=0?1:-1; return dcMake(B,ds.origin,p,null,f.off+side*inc); }
  var ref=B.dimDir==='v'?fr.o1.x:fr.o1.y; side=(f.off-ref)>=0?1:-1; if(Math.abs(f.off-ref)<1e-9) side=-1;
  return dcMake(B,ds.origin,p,f.off+side*inc,null);
}
function dcSetBase(ds,B,pick){
  normDimLegacy(B);
  if(pick){ // a linha de extensão mais próxima do clique vira a origem da série / da base
    var d1=Math.hypot(pick.x-B.x1,pick.y-B.y1),d2=Math.hypot(pick.x-B.x2,pick.y-B.y2),nearFirst=d1<d2;
    var swapNeeded=ds.cmd==='dimcontinue'?nearFirst:!nearFirst;
    if(swapNeeded){ snapshot(); var t; t=B.x1;B.x1=B.x2;B.x2=t; t=B.y1;B.y1=B.y2;B.y2=t; ds.done=(ds.done||0)+1; ds.swaps=(ds.swaps||0)+1; }
  }
  ds.base=B.id; ds.root=B.id; ds.origin={x:B.x1,y:B.y1}; ds.chain=[]; ds.phase='pt'; S.sel=[]; renderAll();
}
function dcCommand(name){
  return {
    init:function(ds){ var B=dcLastDim(); if(B) dcSetBase(ds,B,null); else { ds.phase='pick'; log(name+': não há cota linear ou alinhada; selecione uma.','inf'); } ds.chain=ds.chain||[]; },
    prompt:function(ds){ return ds.phase==='pick'?(name==='DIMCONTINUE'?'Selecione a cota contínua:':'Selecione a cota de base:')
      :name+' Especifique a origem da segunda linha de extensão ou [Selecionar/Desfazer] <Selecionar>:'; },
    click:function(ds,pt){
      if(ds.phase==='pick'){ var h=null; for(var i=S.ents.length-1;i>=0;i--){ var e=S.ents[i]; if(dcDimOk(e)&&hitEnt(e,pt.x,pt.y)){ h=e; break; } }
        if(!h){ log('Selecione uma cota linear ou alinhada.','inf'); return; } dcSetBase(ds,h,pt); return; }
      var ne=dcNext(ds,pt); if(!ne){ log(name+': o ponto coincide com a origem; nada a cotar.','er'); return; }
      snapshot(); addE(ne,true); var c=S.ents[S.ents.length-1]; ds.chain.push(c.id); ds.done=(ds.done||0)+1;
      ds.base=c.id; if(ds.cmd==='dimcontinue') ds.root=c.id;
      log(name+': '+dimLinearText(dimMeasure(c),dimStyleOf(c)).main+'.','ok');
    },
    input:function(ds,u,raw){
      if(ds.phase==='pick'){ if(u===''){ ncEnd(); return true; } return false; }
      if(u===''){ if(!ds.chain.length&&!ds.picked){ ds.picked=true; ds.phase='pick'; return true; } ncEnd(); return true; }
      if(u==='S'||u==='SELECIONAR'||u==='SELECT'){ ds.phase='pick'; ds.picked=true; return true; }
      if(u==='U'||u==='D'||u==='DESFAZER'||u==='UNDO'){
        if(!ds.chain.length){ log('Nada para desfazer neste comando.','inf'); return true; }
        undo(); ds.done--; S.ds=ds; ds.chain.pop();
        ds.base=ds.chain.length?ds.chain[ds.chain.length-1]:ds.root0||ds.base; if(!findE(ds.base)){ var B=dcLastDim(); ds.base=B?B.id:null; }
        if(ds.cmd==='dimcontinue') ds.root=ds.base;
        log('Última cota desfeita.','ok'); return true; }
      var p=parseCoord(raw); if(!p) return false; this.click(ds,p); return true;
    },
    preview:function(ctx,ds,hp){
      if(ds.phase==='pick'){ for(var i=S.ents.length-1;i>=0;i--){ var e=S.ents[i]; if(dcDimOk(e)&&hitEnt(e,hp.x,hp.y)){ ctx.save(); ctx.globalAlpha=.9; drawDimTemp(ctx,e); ctx.restore(); break; } } return; }
      var ne=dcNext(ds,hp); if(ne){ ctx.save(); ctx.globalAlpha=.75; drawDimTemp(ctx,ne); ctx.restore(); }
    }
  };
}
NC.dimcontinue=dcCommand('DIMCONTINUE');
NC.dimbaseline=dcCommand('DIMBASELINE');
(function(){ var i0=NC.dimcontinue.init,i1=NC.dimbaseline.init;
  NC.dimcontinue.init=function(ds){ i0.call(this,ds); ds.root0=ds.base; };
  NC.dimbaseline.init=function(ds){ i1.call(this,ds); ds.root0=ds.base; };
})();
