/* ═══════════════════════════════════════════════════════════════════
   v7.0 — MOTOR DE COMANDOS NO ESTILO AUTOCAD
   Cada comando é uma máquina de fases com prompt "[opções] <padrão>",
   seleção de objetos dentro do comando (ou pré-seleção), pontos com OSNAP,
   ORTHO/POLAR, coordenadas digitadas e pré-visualização.
   Comandos: ERASE, MOVE, COPY, ROTATE, SCALE, MIRROR, OFFSET, CHAMFER.
   ═══════════════════════════════════════════════════════════════════ */
var NC={};
var NC_RAW={sel:1,selwin:1,pick:1,first:1,second:1,poly:1,join:1};
if(S.offDist===undefined) S.offDist=5;
if(S.offThrough===undefined) S.offThrough=false;
if(S.offErase===undefined) S.offErase=false;
if(S.offLayer===undefined) S.offLayer='source';
if(S.chamD1===undefined) S.chamD1=5;
if(S.chamD2===undefined) S.chamD2=5;
if(S.chamMethod===undefined) S.chamMethod='dist';
if(S.chamLen===undefined) S.chamLen=5;
if(S.chamAng===undefined) S.chamAng=45;

function ncIs(t){ return !!NC[t]; }
function ncEditable(e){ var ly=getLy(e.ly); return !(ly&&(!ly.vis||ly.lock)); }
function ncNum(u){ var s=String(u).trim(); if(!/^[-+]?[\d]*[.,]?\d+(e[-+]?\d+)?$/i.test(s)) return null; var v=parseFloat(s.replace(',','.')); return isFinite(v)?v:null; }
function ncPrompt(){ var ds=S.ds; if(!ds||!NC[ds.cmd]) return;
  if(ds.phase==='sel') return logp('Selecione objetos'+(ds.ids&&ds.ids.length?' ('+ds.ids.length+' encontrado'+(ds.ids.length>1?'s':'')+')':'')+' ou [Todos] — Enter conclui:');
  if(ds.phase==='selwin') return logp('Especifique o canto oposto (→ janela, ← cruzando):');
  logp(NC[ds.cmd].prompt(ds)); }
function ncStart(tool){
  var def=NC[tool],ds={cmd:tool,phase:null,done:0};
  S.ds=ds;
  if(def.init) def.init(ds);
  if(def.needSel){
    var pre=selEnts().filter(ncEditable);
    if(pre.length){ ds.ids=pre.map(function(e){return e.id;}); S.sel=ds.ids.slice(); log(ds.ids.length+' objeto(s) pré-selecionado(s).','inf'); def.afterSel(ds); }
    else { ds.phase='sel'; ds.ids=[]; S.sel=[]; }
  }
  if(S.ds===ds){ ncPrompt(); renderAll(); }
}
function ncEnd(clearSel){ if(clearSel!==false) S.sel=[]; setTool('select'); updSelInfo(); }
function ncSnapshotApply(fn){ snapshot(); fn(); if(S.ds) S.ds.done=(S.ds.done||0)+1; renderAll(); }
function ncClones(ids){ return ids.map(findE).filter(Boolean).map(function(e){return JSON.parse(JSON.stringify(e));}); }
function ncGhost(ctx,ids,fn){
  ctx.save(); ctx.globalAlpha=.75;
  ncClones(ids).forEach(function(c){ fn(c); drawE(ctx,c,true); });
  ctx.restore();
}
function ncRubber(ctx,a,b){ if(!a||!b) return; var p=w2s(a.x,a.y),q=w2s(b.x,b.y); ctx.save(); ctx.setLineDash([4,4]); ctx.strokeStyle='#e85050'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y); ctx.stroke(); ctx.restore(); }
function ncLabel(ctx,hp,txt,col){ var s=w2s(hp.x,hp.y); ctx.save(); ctx.fillStyle=col||'#e85050'; ctx.font='bold 10px Consolas'; ctx.fillText(txt,s.x+14,s.y+16); ctx.restore(); }
// Ponto digitado: coordenada (x,y @dx,dy @d<a) ou distância direta na direção do cursor
function ncPointFrom(v,base){
  if(/,/.test(String(v))){ var c=parseCoord(String(v).trim()); if(c) return c; } // v8.4: "10,10" é coordenada (como no AutoCAD), não a distância 10,1
  var n=ncNum(v);
  if(n!==null&&base){ var h=S.hover||{x:base.x+1,y:base.y},dx=h.x-base.x,dy=h.y-base.y,l=Math.hypot(dx,dy)||1; return {x:base.x+dx/l*n,y:base.y+dy/l*n}; }
  return parseCoord(v);
}
// ── seleção dentro do comando ──────────────────────────────────────────────
function ncSelClick(ds,pt){
  if(ds.phase==='selwin'){
    var a=ds.w1,win=pt.x>=a.x,r={x:Math.min(a.x,pt.x),y:Math.min(a.y,pt.y),w:Math.abs(a.x-pt.x),h:Math.abs(a.y-pt.y)},n=0;
    (ds.wins=ds.wins||[]).push(r);
    S.ents.forEach(function(e){ if(!ncEditable(e)) return; var b=bbox(e); if(!b) return;
      var inside=b.x>=r.x&&b.y>=r.y&&b.x+b.w<=r.x+r.w&&b.y+b.h<=r.y+r.h;
      var cross=!(b.x>r.x+r.w||b.x+b.w<r.x||b.y>r.y+r.h||b.y+b.h<r.y)&&(inside||entCrossesRect(e,r)); // v7.2: geometria real
      if((win?inside:cross)&&ds.ids.indexOf(e.id)<0){ ds.ids.push(e.id); n++; } });
    ds.phase='sel'; S.sel=ds.ids.slice(); log(n+' encontrado(s)'+(win?' (janela)':' (cruzando)')+', total '+ds.ids.length+'.','inf'); ncPrompt(); renderAll(); return;
  }
  var hit=null; for(var i=S.ents.length-1;i>=0;i--){ var e=S.ents[i]; if(ncEditable(e)&&hitEnt(e,pt.x,pt.y)){hit=e;break;} }
  if(!hit){ ds.w1={x:pt.x,y:pt.y}; ds.phase='selwin'; ncPrompt(); return; }
  var k=ds.ids.indexOf(hit.id);
  if(S.shiftDown){ if(k>=0) ds.ids.splice(k,1); } else if(k<0) ds.ids.push(hit.id);
  S.sel=ds.ids.slice(); ncPrompt(); renderAll();
}
function ncSelInput(ds,u){
  if(u===''){ if(!ds.ids.length){ log('Nenhum objeto selecionado.','inf'); ncEnd(); return true; } NC[ds.cmd].afterSel(ds); if(S.ds===ds){ ncPrompt(); renderAll(); } return true; }
  if(u==='TODOS'||u==='ALL'||u==='T'){ ds.ids=S.ents.filter(ncEditable).map(function(e){return e.id;}); S.sel=ds.ids.slice(); log(ds.ids.length+' encontrado(s).','inf'); ncPrompt(); renderAll(); return true; }
  log('Selecione objetos, digite Todos ou pressione Enter.','inf'); return true;
}
// ── despacho ────────────────────────────────────────────────────────────────
function ncClick(pt){
  var ds=S.ds; if(!ds){ ncStart(S.tool); return; }
  if(!ds.cmd) ds.cmd=S.tool;
  if(ds.phase==='sel'||ds.phase==='selwin'){ ncSelClick(ds,pt); return; }
  NC[ds.cmd].click(ds,pt); if(S.ds===ds){ ncPrompt(); renderAll(); }
}
function ncInput(v){
  var ds=S.ds; if(!ds||!NC[ds.cmd]) return false;
  var u=String(v).trim().toUpperCase();
  if(ds.phase==='sel'||ds.phase==='selwin'){ if(ds.phase==='selwin'&&u===''){ds.phase='sel';ncPrompt();return true;} return ncSelInput(ds,u); }
  var r=NC[ds.cmd].input(ds,u,String(v).trim());
  if(r===false) log('Opção ou valor inválido.','er');
  if(S.ds===ds){ ncPrompt(); renderAll(); }
  return true;
}
function ncPreview(ctx,hp){
  var ds=S.ds; if(!ds) return;
  if(ds.phase==='selwin'&&ds.w1){
    var a=w2s(ds.w1.x,ds.w1.y),b=w2s(hp.x,hp.y),win=hp.x>=ds.w1.x;
    ctx.save(); ctx.setLineDash(win?[]:[5,4]); ctx.strokeStyle=win?'#4d9ef7':'#4ec87a'; ctx.fillStyle=win?'rgba(77,158,247,.08)':'rgba(78,200,122,.08)';
    ctx.fillRect(Math.min(a.x,b.x),Math.min(a.y,b.y),Math.abs(a.x-b.x),Math.abs(a.y-b.y)); ctx.strokeRect(Math.min(a.x,b.x),Math.min(a.y,b.y),Math.abs(a.x-b.x),Math.abs(a.y-b.y)); ctx.restore(); return;
  }
  if(NC[ds.cmd].preview) NC[ds.cmd].preview(ctx,ds,hp);
}

// ── ERASE ───────────────────────────────────────────────────────────────────
NC.erase={needSel:true,prompt:function(){return '';},
  afterSel:function(ds){ var ids=ds.ids.slice(); snapshot(); S.ents=S.ents.filter(function(e){return ids.indexOf(e.id)<0;}); log('ERASE: '+ids.length+' objeto(s) apagado(s).','ok'); ncEnd(); },
  click:function(){},input:function(){return true;}};

// ── MOVE / COPY ─────────────────────────────────────────────────────────────
function mcAfterSel(ds){ ds.phase='base'; }
function mcBaseInput(ds,u,raw){
  if(u===''||u==='D'||u==='DESLOCAMENTO'){ ds.phase='disp'; return true; }
  var p=parseCoord(raw); if(!p) return false; ds.base=p; ds.pts=[p]; ds.phase='dest'; return true;
}
function mcDispVec(raw){ var m=/^@?\s*(-?[\d.,]+)\s*[;,]\s*(-?[\d.,]+)\s*$/.exec(raw.replace(/,(?=\d+\s*[;,])/,'.')); if(m){ return {x:parseFloat(m[1].replace(',','.')),y:parseFloat(m[2].replace(',','.'))}; }
  var p=parseCoord(raw); return p?{x:p.x,y:p.y}:null; }
function mcApply(ds,dx,dy,copy){
  ncSnapshotApply(function(){
    if(copy){ ncClones(ds.ids).forEach(function(c){ c.id=uid(); transl(c,dx,dy); S.ents.push(c); }); }
    else ds.ids.map(findE).forEach(function(e){ if(e) transl(e,dx,dy); });
  });
}
NC.move={needSel:true,afterSel:mcAfterSel,
  prompt:function(ds){ return {base:'MOVE Especifique o ponto base ou [Deslocamento] <Deslocamento>:',dest:'Especifique o segundo ponto ou <usar o primeiro ponto como deslocamento>:',disp:'Especifique o deslocamento <0,0>:'}[ds.phase]; },
  click:function(ds,pt){
    if(ds.phase==='base'){ ds.base={x:pt.x,y:pt.y}; ds.pts=[ds.base]; ds.phase='dest'; return; }
    if(ds.phase==='dest'){ mcApply(ds,pt.x-ds.base.x,pt.y-ds.base.y,false); log('MOVE: '+ds.ids.length+' objeto(s) movido(s).','ok'); ncEnd(); }
  },
  input:function(ds,u,raw){
    if(ds.phase==='base') return mcBaseInput(ds,u,raw);
    if(ds.phase==='disp'){ if(u===''){ ncEnd(); return true; } var d=mcDispVec(raw); if(!d) return false; mcApply(ds,d.x,d.y,false); log('MOVE: deslocamento '+gNum(d.x)+','+gNum(d.y)+'.','ok'); ncEnd(); return true; }
    if(ds.phase==='dest'){
      if(u===''){ mcApply(ds,ds.base.x,ds.base.y,false); ncEnd(); return true; }
      var p=ncPointFrom(raw,ds.base); if(!p) return false; this.click(ds,p); return true;
    }
    return false;
  },
  preview:function(ctx,ds,hp){ if(ds.phase!=='dest') return; ncRubber(ctx,ds.base,hp); ncGhost(ctx,ds.ids,function(c){transl(c,hp.x-ds.base.x,hp.y-ds.base.y);}); }
};
NC.copy={needSel:true,afterSel:mcAfterSel,
  prompt:function(ds){ return {base:'COPY Especifique o ponto base ou [Deslocamento/mOdo] <Deslocamento>:',dest:'Especifique o segundo ponto ou [Matriz/Sair/Desfazer] <Sair>:',disp:'Especifique o deslocamento <0,0>:',arrn:'Número de itens da matriz <2>:',arrpt:'Especifique o segundo ponto (espaçamento) ou [Ajustar]:',arrfit:'Especifique o último ponto (itens distribuídos até ele):'}[ds.phase]; },
  click:function(ds,pt){
    if(ds.phase==='base'){ ds.base={x:pt.x,y:pt.y}; ds.pts=[ds.base]; ds.phase='dest'; return; }
    if(ds.phase==='dest'){ mcApply(ds,pt.x-ds.base.x,pt.y-ds.base.y,true); log('COPY: cópia '+ds.done+'.','ok'); return; }
    if(ds.phase==='arrpt'||ds.phase==='arrfit'){
      var n=ds.arrN,dx=pt.x-ds.base.x,dy=pt.y-ds.base.y; if(ds.phase==='arrfit'){ dx/=(n-1); dy/=(n-1); }
      ncSnapshotApply(function(){ for(var k=1;k<n;k++) ncClones(ds.ids).forEach(function(c){ c.id=uid(); transl(c,dx*k,dy*k); S.ents.push(c); }); });
      log('COPY Matriz: '+(n-1)+' cópia(s).','ok'); ds.phase='dest'; return;
    }
  },
  input:function(ds,u,raw){
    if(ds.phase==='base'){ if(u==='O'||u==='MODO') { log('Modo de cópia: Múltiplo (padrão do AutoCAD).','inf'); return true; } return mcBaseInput(ds,u,raw); }
    if(ds.phase==='disp'){ if(u===''){ ncEnd(); return true; } var d=mcDispVec(raw); if(!d) return false; mcApply(ds,d.x,d.y,true); ncEnd(); return true; }
    if(ds.phase==='dest'){
      if(u===''||u==='S'||u==='SAIR'||u==='X'||u==='E'||u==='EXIT'){ log('COPY: '+ds.done+' cópia(s).','ok'); ncEnd(); return true; }
      if(u==='U'||u==='D'||u==='DESFAZER'){ if(ds.done>0){ undo(); ds.done--; S.ds=ds; S.sel=ds.ids.slice(); log('Última cópia desfeita.','ok'); } else log('Nada para desfazer.','inf'); return true; }
      if(u==='M'||u==='A'||u==='MATRIZ'||u==='ARRAY'){ ds.phase='arrn'; return true; }
      var p=ncPointFrom(raw,ds.base); if(!p) return false; this.click(ds,p); return true;
    }
    if(ds.phase==='arrn'){ var n=u===''?2:ncNum(u); if(!(n>=2)||n!==Math.floor(n)) return false; ds.arrN=n; ds.phase='arrpt'; return true; }
    if(ds.phase==='arrpt'||ds.phase==='arrfit'){
      if(ds.phase==='arrpt'&&(u==='A'||u==='F'||u==='AJUSTAR'||u==='FIT')){ ds.phase='arrfit'; return true; }
      var p2=ncPointFrom(raw,ds.base); if(!p2) return false; this.click(ds,p2); return true;
    }
    return false;
  },
  preview:function(ctx,ds,hp){
    if(ds.phase==='dest'){ ncRubber(ctx,ds.base,hp); ncGhost(ctx,ds.ids,function(c){transl(c,hp.x-ds.base.x,hp.y-ds.base.y);}); }
    if(ds.phase==='arrpt'||ds.phase==='arrfit'){ var n=ds.arrN,dx=hp.x-ds.base.x,dy=hp.y-ds.base.y; if(ds.phase==='arrfit'){dx/=(n-1);dy/=(n-1);}
      ncRubber(ctx,ds.base,hp); for(var k=1;k<n;k++) ncGhost(ctx,ds.ids,function(c){transl(c,dx*k,dy*k);}); }
  }
};

// ── ROTATE ──────────────────────────────────────────────────────────────────
function angOf(a,b){ return Math.atan2(b.y-a.y,b.x-a.x); }
NC.rotate={needSel:true,afterSel:function(ds){ ds.phase='base'; ds.copy=false; },
  prompt:function(ds){ return {base:'ROTATE Especifique o ponto base:',ang:'Especifique o ângulo de rotação ou [Cópia/Referência] <0>:'+(ds.copy?' (cópia)':''),
    refa:ds.rp?'Especifique o segundo ponto:':'Especifique o ângulo de referência <0>:',newa:'Especifique o novo ângulo ou [Pontos] <0>:',newp1:'Especifique o primeiro ponto:',newp2:'Especifique o segundo ponto:'}[ds.phase]; },
  apply:function(ds,rad){
    ncSnapshotApply(function(){
      if(ds.copy) ncClones(ds.ids).forEach(function(c){ c.id=uid(); rotat(c,ds.base,rad); S.ents.push(c); });
      else ds.ids.map(findE).forEach(function(e){ if(e) rotat(e,ds.base,rad); });
    });
    log('ROTATE: '+gNum(rad*180/Math.PI)+'°'+(ds.copy?' (cópia)':'')+'.','ok'); ncEnd();
  },
  click:function(ds,pt){
    if(ds.phase==='base'){ ds.base={x:pt.x,y:pt.y}; ds.pts=[ds.base]; ds.phase='ang'; return; }
    if(ds.phase==='ang'){ this.apply(ds,angOf(ds.base,pt)); return; }
    if(ds.phase==='refa'){ if(!ds.rp){ ds.rp={x:pt.x,y:pt.y}; return; } ds.ref=angOf(ds.rp,pt); ds.rp=null; ds.phase='newa'; return; }
    if(ds.phase==='newa'){ this.apply(ds,angOf(ds.base,pt)-ds.ref); return; }
    if(ds.phase==='newp1'){ ds.np={x:pt.x,y:pt.y}; ds.phase='newp2'; return; }
    if(ds.phase==='newp2'){ this.apply(ds,angOf(ds.np,pt)-ds.ref); return; }
  },
  input:function(ds,u,raw){
    var n=ncNum(u);
    if(ds.phase==='base'){ var p=parseCoord(raw); if(!p) return false; this.click(ds,p); return true; }
    if(ds.phase==='ang'){
      if(u===''){ log('Rotação 0°: nada alterado.','inf'); ncEnd(); return true; }
      if(u==='C'||u==='COPIA'||u==='CÓPIA'||u==='COPY'){ ds.copy=!ds.copy; log(ds.copy?'Girando uma cópia dos objetos selecionados.':'Girando os próprios objetos.','inf'); return true; }
      if(u==='R'||u==='REFERENCIA'||u==='REFERÊNCIA'||u==='REFERENCE'){ ds.phase='refa'; ds.rp=null; return true; }
      if(n===null) return false; this.apply(ds,n*Math.PI/180); return true;
    }
    if(ds.phase==='refa'){ if(u===''){ ds.ref=0; ds.phase='newa'; return true; } if(n===null) return false; ds.ref=n*Math.PI/180; ds.phase='newa'; return true; }
    if(ds.phase==='newa'){ if(u==='P'||u==='PONTOS'||u==='POINTS'){ ds.phase='newp1'; return true; } if(u===''){ this.apply(ds,-ds.ref); return true; } if(n===null) return false; this.apply(ds,n*Math.PI/180-ds.ref); return true; }
    if(ds.phase==='newp1'||ds.phase==='newp2'){ var q=parseCoord(raw); if(!q) return false; this.click(ds,q); return true; }
    return false;
  },
  preview:function(ctx,ds,hp){
    var a=null;
    if(ds.phase==='ang') a=angOf(ds.base,hp);
    if(ds.phase==='newa') a=angOf(ds.base,hp)-ds.ref;
    if(ds.phase==='newp2') a=angOf(ds.np,hp)-ds.ref;
    if(a===null) return;
    ncRubber(ctx,ds.base,hp); ncGhost(ctx,ds.ids,function(c){rotat(c,ds.base,a);}); ncLabel(ctx,hp,gNum(a*180/Math.PI)+'°');
  }
};

// ── SCALE ───────────────────────────────────────────────────────────────────
NC.scale={needSel:true,afterSel:function(ds){ ds.phase='base'; ds.copy=false; },
  prompt:function(ds){ return {base:'SCALE Especifique o ponto base:',fac:'Especifique o fator de escala ou [Cópia/Referência] <1>:'+(ds.copy?' (cópia)':''),
    refl:ds.rp?'Especifique o segundo ponto:':'Especifique o comprimento de referência <1>:',newl:'Especifique o novo comprimento ou [Pontos] <1>:',newp1:'Especifique o primeiro ponto:',newp2:'Especifique o segundo ponto:'}[ds.phase]; },
  apply:function(ds,f){
    if(!(f>0)){ log('O fator de escala deve ser positivo.','er'); return; }
    ncSnapshotApply(function(){
      if(ds.copy) ncClones(ds.ids).forEach(function(c){ c.id=uid(); scalE(c,ds.base,f); S.ents.push(c); });
      else ds.ids.map(findE).forEach(function(e){ if(e) scalE(e,ds.base,f); });
    });
    log('SCALE: fator '+gNum(f)+(ds.copy?' (cópia)':'')+'.','ok'); ncEnd();
  },
  click:function(ds,pt){
    var d=function(a,b){return Math.hypot(b.x-a.x,b.y-a.y);};
    if(ds.phase==='base'){ ds.base={x:pt.x,y:pt.y}; ds.pts=[ds.base]; ds.phase='fac'; return; }
    if(ds.phase==='fac'){ this.apply(ds,d(ds.base,pt)); return; }
    if(ds.phase==='refl'){ if(!ds.rp){ ds.rp={x:pt.x,y:pt.y}; return; } ds.ref=d(ds.rp,pt); ds.rp=null; if(!(ds.ref>0)){log('Comprimento de referência inválido.','er');return;} ds.phase='newl'; return; }
    if(ds.phase==='newl'){ this.apply(ds,d(ds.base,pt)/ds.ref); return; }
    if(ds.phase==='newp1'){ ds.np={x:pt.x,y:pt.y}; ds.phase='newp2'; return; }
    if(ds.phase==='newp2'){ this.apply(ds,d(ds.np,pt)/ds.ref); return; }
  },
  input:function(ds,u,raw){
    var n=ncNum(u);
    if(ds.phase==='base'){ var p=parseCoord(raw); if(!p) return false; this.click(ds,p); return true; }
    if(ds.phase==='fac'){
      if(u===''){ log('Fator 1: nada alterado.','inf'); ncEnd(); return true; }
      if(u==='C'||u==='COPIA'||u==='CÓPIA'||u==='COPY'){ ds.copy=!ds.copy; log(ds.copy?'Escalando uma cópia.':'Escalando os próprios objetos.','inf'); return true; }
      if(u==='R'||u==='REFERENCIA'||u==='REFERÊNCIA'||u==='REFERENCE'){ ds.phase='refl'; ds.rp=null; return true; }
      if(n===null) return false; this.apply(ds,n); return true;
    }
    if(ds.phase==='refl'){ if(u===''){ ds.ref=1; ds.phase='newl'; return true; } if(!(n>0)) return false; ds.ref=n; ds.phase='newl'; return true; }
    if(ds.phase==='newl'){ if(u==='P'||u==='PONTOS'||u==='POINTS'){ ds.phase='newp1'; return true; } if(u===''){ this.apply(ds,1/ds.ref); return true; } if(!(n>0)) return false; this.apply(ds,n/ds.ref); return true; }
    if(ds.phase==='newp1'||ds.phase==='newp2'){ var q=parseCoord(raw); if(!q) return false; this.click(ds,q); return true; }
    return false;
  },
  preview:function(ctx,ds,hp){
    if(!ds.base) return; var f=null,d=Math.hypot(hp.x-ds.base.x,hp.y-ds.base.y);
    if(ds.phase==='fac') f=d;
    if(ds.phase==='newl') f=d/ds.ref;
    if(ds.phase==='newp2') f=Math.hypot(hp.x-ds.np.x,hp.y-ds.np.y)/ds.ref;
    if(!(f>0)) return;
    ncRubber(ctx,ds.base,hp); ncGhost(ctx,ds.ids,function(c){scalE(c,ds.base,f);}); ncLabel(ctx,hp,'×'+gNum(f));
  }
};

// ── MIRROR ──────────────────────────────────────────────────────────────────
NC.mirror={needSel:true,afterSel:function(ds){ ds.phase='p1'; },
  prompt:function(ds){ return {p1:'MIRROR Especifique o primeiro ponto da linha de espelhamento:',p2:'Especifique o segundo ponto da linha de espelhamento:',del:'Apagar os objetos de origem? [Sim/Não] <Não>:'}[ds.phase]; },
  apply:function(ds,erase){
    ncSnapshotApply(function(){
      ncClones(ds.ids).forEach(function(c){ c.id=uid(); mirr(c,ds.a,ds.b); S.ents.push(c); });
      if(erase) S.ents=S.ents.filter(function(e){return ds.ids.indexOf(e.id)<0;});
    });
    log('MIRROR: '+ds.ids.length+' objeto(s) espelhado(s)'+(erase?', originais apagados':'')+'.','ok'); ncEnd();
  },
  click:function(ds,pt){
    if(ds.phase==='p1'){ ds.a={x:pt.x,y:pt.y}; ds.pts=[ds.a]; ds.phase='p2'; return; }
    if(ds.phase==='p2'){ if(Math.hypot(pt.x-ds.a.x,pt.y-ds.a.y)<1e-9){log('Os pontos devem ser diferentes.','er');return;} ds.b={x:pt.x,y:pt.y}; ds.phase='del'; return; }
  },
  input:function(ds,u,raw){
    if(ds.phase==='del'){ if(u===''||u==='N'||u==='NAO'||u==='NÃO'||u==='NO'){ this.apply(ds,false); return true; } if(u==='S'||u==='SIM'||u==='Y'||u==='YES'){ this.apply(ds,true); return true; } return false; }
    var p=ncPointFrom(raw,ds.phase==='p2'?ds.a:null); if(!p) return false; this.click(ds,p); return true;
  },
  preview:function(ctx,ds,hp){
    var b=ds.phase==='p2'?hp:(ds.phase==='del'?ds.b:null); if(!b||Math.hypot(b.x-ds.a.x,b.y-ds.a.y)<1e-9) return;
    ncRubber(ctx,ds.a,b); ncGhost(ctx,ds.ids,function(c){mirr(c,ds.a,b);});
  }
};

// ── OFFSET ──────────────────────────────────────────────────────────────────
function offThroughDist(e,p){
  if(e.tp==='circ'||e.tp==='arc') return Math.abs(Math.hypot(p.x-e.cx,p.y-e.cy)-e.r);
  if(e.tp==='line'){ var dx=e.x2-e.x1,dy=e.y2-e.y1,l=Math.hypot(dx,dy); return Math.abs((p.x-e.x1)*dy-(p.y-e.y1)*dx)/l; }
  var q=nearestOn(e,p.x,p.y); return q?Math.hypot(p.x-q.x,p.y-q.y):0;
}
function offMake(src,pt){
  var d=S.offThrough?offThroughDist(src,pt):S.offDist; if(!(d>1e-9)) return null;
  var c=clon(src); if(!offsE(c,offsetSide(src,pt.x,pt.y,d))) return null;
  if(S.offLayer==='current'){ c.ly=S.curLy; }
  return c;
}
NC.offset={
  init:function(ds){ ds.phase='dist'; ds.multi=false; log('Configurações atuais: Apagar origem='+(S.offErase?'Sim':'Não')+'  Camada='+(S.offLayer==='current'?'Atual':'Origem'),'inf'); },
  prompt:function(ds){ return {dist:'OFFSET Especifique a distância de deslocamento ou [Através/apaGar/Camada] <'+(S.offThrough?'Através':gNum(S.offDist))+'>:',
    dist2:'Especifique o segundo ponto:',ers:'Apagar o objeto de origem após o deslocamento? [Sim/Não] <'+(S.offErase?'Sim':'Não')+'>:',lay:'Opção de camada para os objetos deslocados [Atual/Origem] <'+(S.offLayer==='current'?'Atual':'Origem')+'>:',
    pick:'Selecione o objeto a deslocar ou [Sair/Desfazer] <Sair>:',side:(S.offThrough?'Especifique o ponto de passagem':'Especifique um ponto no lado a deslocar')+' ou [Sair/Múltiplo/Desfazer] <Sair>:'+(ds.multi?' (múltiplo)':'')}[ds.phase]; },
  click:function(ds,pt){
    if(ds.phase==='dist'){ ds.dp={x:pt.x,y:pt.y}; ds.pts=[ds.dp]; ds.phase='dist2'; return; }
    if(ds.phase==='dist2'){ var d=Math.hypot(pt.x-ds.dp.x,pt.y-ds.dp.y); if(!(d>0)) return; S.offDist=d; S.offThrough=false; ds.pts=null; ds.phase='pick'; log('Distância = '+gNum(d),'ok'); return; }
    if(ds.phase==='pick'){
      var h=null; for(var i=S.ents.length-1;i>=0;i--){ var e=S.ents[i]; if(OFFSET_TYPES.indexOf(e.tp)>=0&&ncEditable(e)&&hitEnt(e,pt.x,pt.y)){h=e;break;} }
      if(!h){ log('Selecione linha, círculo, arco, retângulo, elipse ou polilinha.','inf'); return; }
      ds.src=h.id; S.sel=[h.id]; ds.phase='side'; return;
    }
    if(ds.phase==='side'){
      var src=findE(ds.src); if(!src){ ds.phase='pick'; return; }
      var c=offMake(src,pt); if(!c){ log('Não é possível deslocar com essa distância ou nesse lado.','er'); return; }
      ncSnapshotApply(function(){ S.ents.push(c); if(S.offErase) S.ents=S.ents.filter(function(e){return e.id!==src.id;}); });
      if(ds.multi){ ds.src=c.id; S.sel=[c.id]; } else { ds.phase='pick'; S.sel=[]; }
      return;
    }
  },
  input:function(ds,u,raw){
    var n=ncNum(u);
    if(ds.phase==='dist'){
      if(u===''){ ds.phase='pick'; return true; }
      if(u==='A'||u==='T'||u==='ATRAVES'||u==='ATRAVÉS'||u==='THROUGH'){ S.offThrough=true; ds.phase='pick'; return true; }
      if(u==='G'||u==='E'||u==='APAGAR'||u==='ERASE'){ ds.phase='ers'; return true; }
      if(u==='C'||u==='L'||u==='CAMADA'||u==='LAYER'){ ds.phase='lay'; return true; }
      if(!(n>0)) return false; S.offDist=n; S.offThrough=false; ds.phase='pick'; return true;
    }
    if(ds.phase==='dist2'){ var p=parseCoord(raw); if(!p) return false; this.click(ds,p); return true; }
    if(ds.phase==='ers'){ if(u==='S'||u==='Y'||u==='SIM') S.offErase=true; else if(u==='N'||u==='NAO'||u==='NÃO') S.offErase=false; else if(u!=='') return false; ds.phase='dist'; return true; }
    if(ds.phase==='lay'){ if(u==='A'||u==='C'||u==='ATUAL'||u==='CURRENT') S.offLayer='current'; else if(u==='O'||u==='S'||u==='ORIGEM'||u==='SOURCE') S.offLayer='source'; else if(u!=='') return false; ds.phase='dist'; return true; }
    if(u===''||u==='S'||u==='SAIR'||u==='X'||u==='E'||u==='EXIT'){ ncEnd(); return true; }
    if(u==='U'||u==='D'||u==='DESFAZER'||u==='UNDO'){ if(ds.done>0){ undo(); ds.done--; S.ds=ds; ds.phase='pick'; S.sel=[]; log('Último deslocamento desfeito.','ok'); } else log('Nada para desfazer.','inf'); return true; }
    if(ds.phase==='side'&&(u==='M'||u==='MULTIPLO'||u==='MÚLTIPLO'||u==='MULTIPLE')){ ds.multi=true; return true; }
    if(ds.phase==='side'){ var q=parseCoord(raw); if(!q) return false; this.click(ds,q); return true; }
    return false;
  },
  preview:function(ctx,ds,hp){
    if(ds.phase==='dist2'){ ncRubber(ctx,ds.dp,hp); ncLabel(ctx,hp,gNum(Math.hypot(hp.x-ds.dp.x,hp.y-ds.dp.y))); return; }
    if(ds.phase==='pick'){ for(var i=S.ents.length-1;i>=0;i--){ var e=S.ents[i]; if(OFFSET_TYPES.indexOf(e.tp)>=0&&ncEditable(e)&&hitEnt(e,hp.x,hp.y)){ var c0=JSON.parse(JSON.stringify(e)); c0.col='#f5a623'; c0.lw=2; drawE(ctx,c0,false); break; } } return; }
    if(ds.phase==='side'){ var src=findE(ds.src); if(!src) return; var c=offMake(src,hp); if(!c) return;
      c.col='#4ec87a'; c.ld='dashed'; drawE(ctx,c,false); if(S.offThrough) ncLabel(ctx,hp,'d='+gNum(offThroughDist(src,hp)),'#4ec87a'); }
  }
};

// ── CHAMFER (mesma sequência do FILLET) ─────────────────────────────────────
function chamCompute(h1,h2,zero){
  if(h1.curve.kind!=='line'||h2.curve.kind!=='line') return {err:'CHAMFER funciona com linhas, polilinhas e retângulos.'};
  if(h1.e===h2.e&&(h1.seg===null||h1.seg===h2.seg)) return {err:'Não é possível chanfrar um objeto com ele mesmo.'};
  var c1=h1.curve,c2=h2.curve,I=lineLineInt(c1.x1,c1.y1,c1.x2,c1.y2,c2.x1,c2.y1,c2.x2,c2.y2);
  if(!I) return {err:'As linhas são paralelas.'};
  I={x:I.x,y:I.y};
  function side(c,p){ var dx=c.x2-c.x1,dy=c.y2-c.y1,l=Math.hypot(dx,dy),u={x:dx/l,y:dy/l},s=((p.x-I.x)*u.x+(p.y-I.y)*u.y)>=0?1:-1; u={x:u.x*s,y:u.y*s};
    var e1=(c.x1-I.x)*u.x+(c.y1-I.y)*u.y,e2=(c.x2-I.x)*u.x+(c.y2-I.y)*u.y,far=e1>=e2?{x:c.x1,y:c.y1,d:e1}:{x:c.x2,y:c.y2,d:e2}; return {u:u,far:far}; }
  var s1=side(c1,h1.pick),s2=side(c2,h2.pick),d1,d2;
  if(zero){ d1=0; d2=0; }
  else if(S.chamMethod==='angle'){
    d1=S.chamLen; var P1=I.x!==undefined?{x:I.x+s1.u.x*d1,y:I.y+s1.u.y*d1}:null,best=null;
    [1,-1].forEach(function(sg){ var a=S.chamAng*Math.PI/180*sg,bx=-s1.u.x,by=-s1.u.y,w={x:bx*Math.cos(a)-by*Math.sin(a),y:bx*Math.sin(a)+by*Math.cos(a)};
      var r=lineLineInt(P1.x,P1.y,P1.x+w.x,P1.y+w.y,I.x,I.y,I.x+s2.u.x,I.y+s2.u.y); if(r&&r.t>1e-9&&r.u>1e-9&&(best===null||r.u<best)) best=r.u; });
    if(best===null) return {err:'Ângulo de chanfro impossível para estas linhas.'}; d2=best;
  } else { d1=S.chamD1; d2=S.chamD2; }
  if(d1>s1.far.d+1e-9||d2>s2.far.d+1e-9) return {err:'Distância de chanfro grande demais.'};
  var P={x:I.x+s1.u.x*d1,y:I.y+s1.u.y*d1},Q={x:I.x+s2.u.x*d2,y:I.y+s2.u.y*d2};
  return {m1:{x1:P.x,y1:P.y,x2:s1.far.x,y2:s1.far.y},m2:{x1:Q.x,y1:Q.y,x2:s2.far.x,y2:s2.far.y},seg:(d1>1e-9||d2>1e-9)?{x1:P.x,y1:P.y,x2:Q.x,y2:Q.y}:null};
}
function chamApply(h1,h2,zero,noSnap){
  var r=chamCompute(h1,h2,zero); if(r.err){ log('CHAMFER: '+r.err,'er'); return false; }
  if(!noSnap) snapshot();
  var ex={};
  function tgt(h){ if(h.seg===null) return h.e; if(!ex[h.e.id]){ var L=explodeToLines(h.e),i=S.ents.indexOf(h.e); if(i>=0) S.ents.splice.apply(S.ents,[i,1].concat(L)); ex[h.e.id]=L; } return ex[h.e.id][h.seg]; }
  var t1=tgt(h1),t2=tgt(h2);
  if(S.filletTrim){ [[t1,r.m1],[t2,r.m2]].forEach(function(q){ if(q[0]){ q[0].x1=q[1].x1;q[0].y1=q[1].y1;q[0].x2=q[1].x2;q[0].y2=q[1].y2; } }); }
  if(r.seg){ var same=h1.e.ly===h2.e.ly,src=h1.e; addE({tp:'line',x1:r.seg.x1,y1:r.seg.y1,x2:r.seg.x2,y2:r.seg.y2,ly:same?src.ly:S.curLy,col:same?src.col:S.style.col,lw:same?src.lw:S.style.lw,ld:same?src.ld:S.style.ld},true); }
  log('CHAMFER: '+(r.seg?'chanfro criado':'canto vivo criado')+(S.filletTrim?'':' (sem aparar)')+(Object.keys(ex).length?' — polilinha/retângulo convertido em linhas':'')+'.','ok');
  return true;
}
NC.chamfer={
  init:function(ds){ ds.phase='first'; ds.multi=false;
    log('(Modo '+(S.filletTrim?'APARAR':'NÃO APARAR')+') '+(S.chamMethod==='angle'?'Comprimento = '+gNum(S.chamLen)+', Ângulo = '+gNum(S.chamAng)+'°':'Distância1 = '+gNum(S.chamD1)+', Distância2 = '+gNum(S.chamD2)),'inf'); },
  prompt:function(ds){ return {first:'CHAMFER Selecione a primeira linha ou [Desfazer/Polilinha/Distância/Ângulo/Aparar/mÉtodo/Múltiplo]:'+(ds.multi?' (múltiplo)':''),
    second:'Selecione a segunda linha, ou Shift+clique para canto vivo:',d1:'Especifique a primeira distância de chanfro <'+gNum(S.chamD1)+'>:',d2:'Especifique a segunda distância de chanfro <'+gNum(S.chamD1)+'>:',
    alen:'Especifique o comprimento do chanfro na primeira linha <'+gNum(S.chamLen)+'>:',aang:'Especifique o ângulo do chanfro a partir da primeira linha <'+gNum(S.chamAng)+'>:',
    trim:'Modo de aparar [Aparar/Não aparar] <'+(S.filletTrim?'Aparar':'Não aparar')+'>:',method:'Método [Distância/Ângulo] <'+(S.chamMethod==='angle'?'Ângulo':'Distância')+'>:',poly:'Selecione a polilinha 2D:'}[ds.phase]; },
  after:function(ds){ ds.done++; ds.e1=null; ds.phase='first'; if(!ds.multi) ncEnd(); },
  click:function(ds,pt){
    var h=filletHit(pt);
    if(ds.phase==='poly'){
      if(!h||(h.e.tp!=='pl'&&h.e.tp!=='rect')){ log('Selecione uma polilinha ou retângulo.','inf'); return; }
      var e=h.e,closed=e.tp==='rect'||!!e.closed; snapshot();
      var L=explodeToLines(e),i=S.ents.indexOf(e); S.ents.splice.apply(S.ents,[i,1].concat(L));
      var ok=0,n=L.length,pairs=closed?n:n-1,save=S.filletTrim; S.filletTrim=true;
      for(var k=0;k<pairs;k++){ var a=L[k],b=L[(k+1)%n];
        var ha={e:a,seg:null,pick:{x:(a.x1+a.x2)/2,y:(a.y1+a.y2)/2},curve:{kind:'line',x1:a.x1,y1:a.y1,x2:a.x2,y2:a.y2}};
        var hb={e:b,seg:null,pick:{x:(b.x1+b.x2)/2,y:(b.y1+b.y2)/2},curve:{kind:'line',x1:b.x1,y1:b.y1,x2:b.x2,y2:b.y2}};
        if(chamApply(ha,hb,false,true)) ok++; }
      S.filletTrim=save; log('CHAMFER Polilinha: '+ok+' vértice(s) chanfrado(s).',ok?'ok':'er'); this.after(ds); return;
    }
    if(!h){ log('Nenhuma linha no ponto.','inf'); return; }
    if(h.curve.kind!=='line'){ log('CHAMFER funciona com linhas, polilinhas e retângulos.','er'); return; }
    if(ds.phase==='first'){ ds.e1=h; ds.phase='second'; return; }
    if(ds.phase==='second'){ if(chamApply(ds.e1,h,!!S.shiftDown)) this.after(ds); }
  },
  input:function(ds,u,raw){
    var n=ncNum(u);
    if(ds.phase==='d1'){ if(u!==''){ if(!(n>=0)) return false; S.chamD1=n; } ds.phase='d2'; return true; }
    if(ds.phase==='d2'){ if(u===''){ S.chamD2=S.chamD1; } else { if(!(n>=0)) return false; S.chamD2=n; } S.chamMethod='dist'; ds.phase=ds.ret||'first'; return true; }
    if(ds.phase==='alen'){ if(u!==''){ if(!(n>=0)) return false; S.chamLen=n; } ds.phase='aang'; return true; }
    if(ds.phase==='aang'){ if(u!==''){ if(!(n>0&&n<180)) return false; S.chamAng=n; } S.chamMethod='angle'; ds.phase=ds.ret||'first'; return true; }
    if(ds.phase==='trim'){ if(u==='A'||u==='T') S.filletTrim=true; else if(u==='N') S.filletTrim=false; else if(u!=='') return false; ds.phase='first'; return true; }
    if(ds.phase==='method'){ if(u==='D') S.chamMethod='dist'; else if(u==='A') S.chamMethod='angle'; else if(u!=='') return false; ds.phase='first'; return true; }
    if(ds.phase==='poly'){ if(u===''){ ds.phase='first'; return true; } return false; }
    if(ds.phase==='second'){ if(u===''){ ds.e1=null; ds.phase='first'; if(!ds.multi) ncEnd(); return true; } return false; }
    if(u===''){ ncEnd(); return true; }
    if(u==='D'||u==='DISTANCIA'||u==='DISTÂNCIA'){ ds.ret='first'; ds.phase='d1'; return true; }
    if(u==='A'||u==='ANGULO'||u==='ÂNGULO'){ ds.ret='first'; ds.phase='alen'; return true; }
    if(u==='T'||u==='APARAR'){ ds.phase='trim'; return true; }
    if(u==='E'||u==='METODO'||u==='MÉTODO'){ ds.phase='method'; return true; }
    if(u==='M'||u==='MULTIPLO'||u==='MÚLTIPLO'){ ds.multi=true; return true; }
    if(u==='P'||u==='POLILINHA'){ ds.phase='poly'; return true; }
    if(u==='U'||u==='DESFAZER'){ if(ds.done>0){ undo(); ds.done--; S.ds=ds; log('Último chanfro desfeito.','ok'); } else log('Nada para desfazer.','inf'); return true; }
    return false;
  },
  preview:function(ctx,ds,hp){
    var h=filletHit(hp);
    function hi(e,col){ var c=JSON.parse(JSON.stringify(e)); c.col=col; c.lw=2; c.ld='solid'; drawE(ctx,c,false); }
    if(ds.phase==='first'||ds.phase==='poly'){ if(h&&(ds.phase==='first'?h.curve.kind==='line':(h.e.tp==='pl'||h.e.tp==='rect'))) hi(h.e,'#f5a623'); return; }
    if(ds.phase!=='second'||!ds.e1) return;
    hi(ds.e1.e,'#f5a623'); if(!h||h.curve.kind!=='line') return;
    var r=chamCompute(ds.e1,h,!!S.shiftDown);
    if(r.err){ ncLabel(ctx,hp,r.err); return; }
    ctx.save(); ctx.strokeStyle='#4ec87a'; ctx.lineWidth=2; ctx.setLineDash([]);
    [S.filletTrim?r.m1:null,S.filletTrim?r.m2:null,r.seg].forEach(function(m){ if(!m) return; var a=w2s(m.x1,m.y1),b=w2s(m.x2,m.y2); ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); });
    ctx.restore(); ncLabel(ctx,hp,r.seg?'chanfro':'canto vivo','#4ec87a');
  }
};

var _setTool_v70=setTool;
setTool=function(tool){ _setTool_v70(tool); if(ncIs(tool)) ncStart(tool); };


