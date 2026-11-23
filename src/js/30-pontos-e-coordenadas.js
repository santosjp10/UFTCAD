/* ═══════════════════════════════════════════════════════════════════
   v8.3 — ENTRADA DE MUITOS PONTOS (etapa 1)
   1. Entidade PONTO (POINT / PO), exportada como POINT no DXF.
   2. Colar várias coordenadas na linha de comando: cada linha vale como um
      ponto digitado (PLINE, LINE, SPLINE…), como no AutoCAD. Aceita colunas
      copiadas do Excel/LibreOffice/Google Planilhas, inclusive em português
      (vírgula decimal, tabulação ou ponto e vírgula).
   3. Comando PONTOS: importa uma tabela de coordenadas (colar ou CSV/TXT),
      com escolha de colunas, unidade, deslocamento de origem (UTM), polilinha
      aberta ou polígono fechado, marcadores, rótulos, área e perímetro.
   ═══════════════════════════════════════════════════════════════════ */

// ── 1. ENTIDADE PONTO ───────────────────────────────────────────────────────
if(ENT_TYPES.indexOf('point')<0) ENT_TYPES.push('point');
TP_NAMES.point='Ponto';
function ptMarkPx(){ return S.printing&&S.paperPx?Math.max(3,1.2*S.paperPx):4; } // meia-largura do "×" (px)
(function(){
  var dE=drawE,hE=hitEnt,bb=bbox,sp=snapPts,tr=transl,xf=xformE,gg=getGrips,sg=stretchGrip,gf=geomFields,ep=entPrims;
  drawE=function(ctx,e,sel){
    if(e.tp!=='point') return dE(ctx,e,sel);
    ctx.save(); applyStyle(ctx,e,sel); ctx.setLineDash([]); var q=w2s(e.x,e.y),r=ptMarkPx();
    ctx.lineWidth=Math.max(1,ctx.lineWidth); ctx.beginPath(); ctx.moveTo(q.x-r,q.y-r); ctx.lineTo(q.x+r,q.y+r); ctx.moveTo(q.x+r,q.y-r); ctx.lineTo(q.x-r,q.y+r); ctx.stroke();
    if(sel){ ctx.strokeRect(q.x-r-2,q.y-r-2,2*r+4,2*r+4); } ctx.restore();
  };
  hitEnt=function(e,wx,wy){ if(e.tp!=='point') return hE(e,wx,wy); var ly=getLy(e.ly); if(ly&&(!ly.vis||ly.lock)) return false; return Math.hypot(wx-e.x,wy-e.y)<=8/S.vp.sc; };
  bbox=function(e){ return e.tp==='point'?{x:e.x,y:e.y,w:0,h:0}:bb(e); };
  snapPts=function(e){ return e.tp==='point'?[{x:e.x,y:e.y,st:'end'}]:sp(e); };
  transl=function(e,dx,dy){ if(e.tp==='point'){ e.x+=dx; e.y+=dy; return; } return tr(e,dx,dy); };
  xformE=function(e,fn,info){ if(e.tp==='point'){ var q=fn(e.x,e.y); e.x=q.x; e.y=q.y; return; } return xf(e,fn,info); };
  getGrips=function(e){ return e.tp==='point'?[{x:e.x,y:e.y,key:'p'}]:gg(e); };
  stretchGrip=function(e,key,base,pt){ if(e.tp==='point'){ e.x+=pt.x-base.x; e.y+=pt.y-base.y; return; } return sg(e,key,base,pt); };
  geomFields=function(e){ return e.tp==='point'?[{l:'X',k:'x'},{l:'Y',k:'y'}]:gf(e); };
  entPrims=function(e){ return e.tp==='point'?[{k:'point',x:e.x,y:e.y}]:ep(e); };
  if(typeof stretchEnt==='function'){ var se=stretchEnt; stretchEnt=function(e,wins,dx,dy,whole){ if(e.tp==='point'){ if(whole||inWins({x:e.x,y:e.y},wins)){ e.x+=dx; e.y+=dy; } return; } return se(e,wins,dx,dy,whole); }; }
})();
NC.point={init:function(ds){ ds.phase='pt'; ds.n=0; },
  prompt:function(ds){ return 'POINT Especifique um ponto (Enter conclui)'+(ds.n?' — '+ds.n+' criado(s)':'')+':'; },
  click:function(ds,pt){ snapshot(); addE({tp:'point',x:pt.x,y:pt.y},true); ds.n++; ds.done=(ds.done||0)+1; },
  input:function(ds,u,raw){ if(u===''){ ncEnd(); return true; } var p=parseCoord(raw); if(!p) return false; this.click(ds,p); return true; }};

// ── coordenadas no formato brasileiro na linha de comando: "10,5;20,25" ─────
(function(){ var pc=parseCoord;
  parseCoord=function(raw){
    var r=pc(raw); if(r) return r;
    var m=String(raw).trim().match(/^(@?)\s*(-?\d+(?:[.,]\d+)?)\s*;\s*(-?\d+(?:[.,]\d+)?)$/);
    if(m){ var x=parseFloat(m[2].replace(',','.')),y=parseFloat(m[3].replace(',','.'));
      if(m[1]==='@'){ var b=cmdRefPt()||S.hover||{x:0,y:0}; return {x:b.x+x,y:b.y+y,st:null}; } return {x:x,y:y,st:null}; }
    return null;
  };
})();

// ── leitura de tabelas de coordenadas ───────────────────────────────────────
function ptDetect(lines){
  var s=lines.join('\n'),sep;
  if(/\t/.test(s)) sep='\t';
  else if(/;/.test(s)) sep=';';
  else if(lines.some(function(l){ return /^\s*\S+\s*,\s*\S+/.test(l); })&&!lines.some(function(l){ return /\d,\d+\s*,/.test(l)&&!/\d\.\d/.test(l); })) sep=',';
  else sep=' ';
  var dec='.';
  if(sep!==','){ var nums=s.match(/-?\d[\d.,]*/g)||[];
    var c=nums.filter(function(t){ return /^-?\d+(\.\d{3})*,\d+$/.test(t); }).length,d=nums.filter(function(t){ return /^-?\d+(,\d{3})*\.\d+$/.test(t); }).length;
    if(c>d) dec=','; }
  return {sep:sep,dec:dec};
}
function ptNum(t,dec){
  t=String(t==null?'':t).trim().replace(/^"(.*)"$/,'$1').replace(/\s+/g,'');
  if(t==='') return NaN;
  if(dec===','){ if(/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t=t.replace(/\./g,''); t=t.replace(',','.'); }
  else { if(/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) t=t.replace(/,/g,''); }
  if(!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(t)) return NaN;
  return parseFloat(t);
}
function ptSplit(line,sep){ return sep===' '?line.trim().split(/\s+/):line.split(sep).map(function(c){ return c.trim().replace(/^"(.*)"$/,'$1'); }); }
// Lê o texto e devolve linhas, colunas, cabeçalho e sugestão de colunas
function ptParseTable(text){
  var lines=String(text||'').replace(/\r/g,'').split('\n').map(function(l){ return l.replace(/\s+$/,''); }).filter(function(l){ return l.trim()!==''&&!/^\s*#/.test(l); });
  var f=ptDetect(lines),rows=lines.map(function(l){ return ptSplit(l,f.sep); });
  var ncol=rows.reduce(function(m,r){ return Math.max(m,r.length); },0);
  var header=null;
  if(rows.length&&rows[0].filter(function(c){ return isNaN(ptNum(c,f.dec)); }).length>=Math.max(1,rows[0].length-1)&&rows.length>1) header=rows.shift();
  // colunas numéricas (pelo menos 80% das linhas)
  var numeric=[]; for(var c=0;c<ncol;c++){ var ok=rows.filter(function(r){ return !isNaN(ptNum(r[c],f.dec)); }).length; numeric.push(rows.length&&ok>=0.8*rows.length); }
  function find(re){ if(!header) return -1; for(var i=0;i<header.length;i++) if(re.test(String(header[i]).trim())) return i; return -1; }
  var cx=find(/^(x|e|este|leste|easting|coord\.?\s*x|abscissa)$/i),cy=find(/^(y|n|norte|northing|coord\.?\s*y|ordenada)$/i),cid=find(/^(id|pt|ponto|nome|n[ºo°]?|esta[cç][aã]o|v[ée]rtice|marco|name|point)$/i),cd=find(/^(desc|descri[cç][aã]o|obs|observa[cç][aã]o|c[oó]digo|code)$/i);
  var cz=find(/^(z|cota|altitude|h|elev(a[cç][aã]o)?)$/i);
  if(cx<0||cy<0){ var nc=[]; for(var k=0;k<ncol;k++) if(numeric[k]&&k!==cz) nc.push(k);
    // 3+ colunas numéricas com a primeira inteira sequencial → ID, X, Y
    if(cid<0&&nc.length>=3&&rows.every(function(r){ return /^\d+$/.test(String(r[nc[0]]).trim()); })){ cid=nc[0]; nc=nc.slice(1); }
    if(cx<0) cx=nc[0]!==undefined?nc[0]:-1; if(cy<0) cy=nc[1]!==undefined?nc[1]:-1; }
  if(cid<0){ for(var j=0;j<ncol;j++) if(!numeric[j]&&j!==cd){ cid=j; break; } }
  // sem cabeçalho e com cara de UTM "Norte, Este" (N ~ milhões, E ~ centenas de milhares): X = Este
  var utmSwap=false;
  if(!header&&cx>=0&&cy>=0&&rows.length){ var big=function(c,lo,hi){ return rows.filter(function(r){ var v=Math.abs(ptNum(r[c],f.dec)); return v>=lo&&v<hi; }).length>=0.8*rows.length; };
    if(big(cx,1e6,1e7)&&big(cy,1e5,1e6)){ var t=cx; cx=cy; cy=t; utmSwap=true; } }
  return {utmSwap:utmSwap,sep:f.sep,dec:f.dec,header:header,rows:rows,ncol:ncol,numeric:numeric,cx:cx,cy:cy,cid:cid,cdesc:cd};
}
// Aplica a escolha de colunas: pontos válidos e linhas rejeitadas (com o motivo)
function ptExtract(T,cx,cy,cid){
  var pts=[],bad=[];
  T.rows.forEach(function(r,i){ var n=i+1+(T.header?1:0),x=ptNum(r[cx],T.dec),y=ptNum(r[cy],T.dec);
    if(cx<0||cy<0) return bad.push({n:n,msg:'escolha as colunas X e Y'});
    if(isNaN(x)||isNaN(y)) return bad.push({n:n,msg:'"'+(r[cx]===undefined?'':r[cx])+'" / "'+(r[cy]===undefined?'':r[cy])+'" não é um par de números',raw:r});
    pts.push({x:x,y:y,id:cid>=0&&r[cid]!==undefined?String(r[cid]).trim():String(pts.length+1),n:n}); });
  return {pts:pts,bad:bad};
}
function ptArea(P){ var a=0; for(var i=0;i<P.length;i++){ var q=P[(i+1)%P.length]; a+=P[i].x*q.y-q.x*P[i].y; } return Math.abs(a)/2; }
function ptPerim(P,closed){ var s=0; for(var i=1;i<P.length;i++) s+=Math.hypot(P[i].x-P[i-1].x,P[i].y-P[i-1].y); if(closed&&P.length>2) s+=Math.hypot(P[0].x-P[P.length-1].x,P[0].y-P[P.length-1].y); return s; }
var PT_UNITS={mm:1,cm:10,m:1000,km:1e6};
function ptBR(v,d){ return Number(v).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}); }
function ptFmtArea(aMm2){ var m2=aMm2/1e6; if(m2<0.01) return ptBR(aMm2,2)+' mm²'; return ptBR(m2,2)+' m²'+(m2>=1000?' ('+ptBR(m2/1e4,4)+' ha)':''); }
function ptFmtLen(lMm){ return lMm>=1000?ptBR(lMm/1000,3)+' m':ptBR(lMm,3)+' mm'; }

// ── 2. COLAR VÁRIAS COORDENADAS NA LINHA DE COMANDO ─────────────────────────
function ptLineToToken(l,T){
  var s=l.trim(); if(!s) return '';
  if(/^@?-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(s)||/^@?-?\d+(\.\d+)?<-?\d+(\.\d+)?$/.test(s)) return s; // já no formato do AutoCAD
  var c=ptSplit(s.replace(/^@/,''),T.sep),rel=s[0]==='@';
  if(c.length>=2){ var x=ptNum(c[T.cx>=0?T.cx:0],T.dec),y=ptNum(c[T.cy>=0?T.cy:1],T.dec); if(!isNaN(x)&&!isNaN(y)) return (rel?'@':'')+x+','+y; }
  return s; // comandos e opções (F, C, U, Enter...) passam como estão
}
function cmdSubmit(v){ var ci=document.getElementById('cmdinput'); ci.value=v; onCmdKey({key:'Enter',code:'Enter',stopPropagation:function(){},preventDefault:function(){}}); }
function ptPasteLines(text){
  var raw=String(text).replace(/\r/g,'').split('\n'); while(raw.length&&raw[raw.length-1].trim()==='') raw.pop();
  if(raw.length<2&&!/\t/.test(text)) return false;
  var T=ptParseTable(text);
  function isCoord(l){ return /^@?-?[\d.]+[,<]/.test(ptLineToToken(l,T)); }
  var first=raw.filter(function(l){ return l.trim()!==''; }),skip=T.header&&T.header.length>=2?1:0;
  // sem comando ativo: uma lista de coordenadas abre o importador; uma lista de comandos é executada
  if((S.tool==='select'||S.tool==='pan')&&!S.ds&&first.length&&(isCoord(first[skip]||'')||skip)){ ptOpen(text); return true; }
  var n=0,seen=0;
  raw.forEach(function(l){ if(!l.trim()) return; if(seen++<skip) return; var tk=ptLineToToken(l,T); cmdSubmit(tk); if(/^@?-?[\d.]+[,<]/.test(tk)) n++; });
  log('Colados '+n+' ponto(s) na linha de comando'+(S.ds?'. Enter conclui o comando.':'.'),'ok');
  return true;
}
window.addEventListener('load',function(){
  var ci=document.getElementById('cmdinput');
  function onPaste(ev){
    var t=(ev.clipboardData||window.clipboardData); if(!t) return; var txt=t.getData('text/plain')||t.getData('text'); if(!txt) return;
    var a=document.activeElement; if(a&&a!==ci&&a!==document.body&&isTypingTarget&&isTypingTarget(a)) return; // colar em outros campos: normal
    if(document.querySelector('.ov.show')) return;
    if(ptPasteLines(txt)){ ev.preventDefault(); ev.stopPropagation(); }
  }
  ci.addEventListener('paste',onPaste,true);
  document.addEventListener('paste',function(ev){ if(document.activeElement===ci) return; onPaste(ev); });
});

// ── 3. COMANDO PONTOS (importar coordenadas) ────────────────────────────────
var PTI={T:null};
function ptOpen(text){
  var ov=document.getElementById('ov-pontos'); if(!ov) return;
  if(S.tool!=='select') setTool('select');
  var ta=document.getElementById('pt-txt'); if(text!==undefined) ta.value=text;
  ov.classList.add('show'); ptRefresh(true); setTimeout(function(){ ta.focus(); },30);
}
function ptColOptions(sel,T,val,allowNone){
  sel.textContent=''; if(allowNone){ var o0=document.createElement('option'); o0.value='-1'; o0.textContent='(nenhuma)'; sel.appendChild(o0); }
  for(var c=0;c<T.ncol;c++){ var o=document.createElement('option'); o.value=String(c); o.textContent='Coluna '+(c+1)+(T.header&&T.header[c]?' — '+T.header[c]:''); sel.appendChild(o); }
  sel.value=String(val);
}
function ptRefresh(mode){ var redetect=mode===true;
  var T=ptParseTable(document.getElementById('pt-txt').value); PTI.T=T;
  var sx=document.getElementById('pt-cx'),sy=document.getElementById('pt-cy'),si=document.getElementById('pt-cid');
  if(redetect||sx.options.length!==T.ncol){ ptColOptions(sx,T,T.cx,false); ptColOptions(sy,T,T.cy,false); ptColOptions(si,T,T.cid,true); }
  var R=ptExtract(T,+sx.value,+sy.value,+si.value),f=PT_UNITS[document.getElementById('pt-unit').value]/unitMm();
  PTI.R=R;
  var info=document.getElementById('pt-info');
  info.textContent=(T.rows.length?('Separador: '+({'\t':'tabulação',';':'ponto e vírgula',',':'vírgula',' ':'espaço'})[T.sep]+' · decimal: '+(T.dec===','?'vírgula':'ponto')+(T.header?' · com cabeçalho':'')+(T.utmSwap?' · parece Norte/Este (UTM): X = 2ª coluna numérica':'')+' · '):'')+R.pts.length+' ponto(s) válido(s)'+(R.bad.length?' · '+R.bad.length+' linha(s) ignorada(s)':'');
  var bl=document.getElementById('pt-bad'); bl.textContent='';
  R.bad.slice(0,6).forEach(function(b){ var d=document.createElement('div'); d.textContent='Linha '+b.n+': '+b.msg; bl.appendChild(d); });
  if(R.bad.length>6){ var d2=document.createElement('div'); d2.textContent='… e mais '+(R.bad.length-6); bl.appendChild(d2); }
  // deslocamento sugerido (coordenadas grandes, como UTM)
  var P=R.pts.map(function(p){ return {x:p.x*f,y:p.y*f}; }),big=P.some(function(p){ return Math.abs(p.x)>1e7||Math.abs(p.y)>1e7; });
  var off=document.getElementById('pt-off'); if(redetect||mode==='unit') off.checked=big;
  // relatório prévio
  var closed=document.getElementById('pt-closed').checked,rep=document.getElementById('pt-rep');
  if(P.length>=2){ var per=ptPerim(P,closed)*unitMm(),ar=P.length>=3?ptArea(P)*unitMm()*unitMm():0;
    rep.textContent='Perímetro '+ptFmtLen(per)+(closed&&P.length>=3?' · Área '+ptFmtArea(ar):''); } else rep.textContent='';
  if(redetect||mode==='unit'){ var bb=P.length?ptsBox(P):null,auto=bb?Math.max(bb.w,bb.h)/60:2.5; document.getElementById('pt-lh').value=ptBR(Math.max(0.5,auto>100?Math.round(auto):Math.round(auto*10)/10),auto>100?0:1).replace(/\./g,''); }
  ptPreview(P,closed);
  document.getElementById('pt-ok').disabled=R.pts.length<(document.getElementById('pt-pl').checked?2:1);
}
function ptPreview(P,closed){
  var cv=document.getElementById('pt-cv'),ctx=cv.getContext('2d'),W=cv.width,H=cv.height; ctx.fillStyle='#0a0a1a'; ctx.fillRect(0,0,W,H); if(!P.length) return;
  var b=ptsBox(P),sc=Math.min((W-30)/Math.max(b.w,1e-9),(H-30)/Math.max(b.h,1e-9)); if(!isFinite(sc)||b.w===0&&b.h===0) sc=1;
  function m(p){ return {x:15+(p.x-b.x)*sc+((W-30)-b.w*sc)/2,y:H-15-(p.y-b.y)*sc-((H-30)-b.h*sc)/2}; }
  if(document.getElementById('pt-pl').checked&&P.length>1){ ctx.strokeStyle='#4ec87a'; ctx.lineWidth=1.5; ctx.beginPath(); P.forEach(function(p,i){ var q=m(p); if(i) ctx.lineTo(q.x,q.y); else ctx.moveTo(q.x,q.y); }); if(closed) ctx.closePath(); ctx.stroke(); }
  ctx.fillStyle='#f5c860'; ctx.font='9px Consolas'; var lab=P.length<=60;
  P.forEach(function(p,i){ var q=m(p); ctx.fillRect(q.x-1.5,q.y-1.5,3,3); if(lab) ctx.fillText(PTI.R.pts[i].id,q.x+3,q.y-3); });
}
function ptInsert(){
  var R=PTI.R; if(!R||!R.pts.length) return;
  var f=PT_UNITS[document.getElementById('pt-unit').value]/unitMm(),pl=document.getElementById('pt-pl').checked,closed=document.getElementById('pt-closed').checked;
  var mk=document.getElementById('pt-mk').checked,lb=document.getElementById('pt-lb').checked,lh=ptNum(document.getElementById('pt-lh').value,',');
  if(!(lh>0)) lh=ptNum(document.getElementById('pt-lh').value,'.'); if(!(lh>0)) lh=2.5;
  var P=R.pts.map(function(p){ return {x:p.x*f,y:p.y*f,id:p.id}; }),ox=0,oy=0;
  if(document.getElementById('pt-off').checked&&P.length){ var b=ptsBox(P),g=Math.pow(10,Math.max(0,Math.floor(Math.log10(Math.max(b.w,b.h,1)))+1)); ox=Math.floor(b.x/g)*g; oy=Math.floor(b.y/g)*g; P.forEach(function(p){ p.x-=ox; p.y-=oy; }); }
  // tira pontos repetidos em sequência da polilinha (o fechamento repetido também)
  var V=P.filter(function(p,i){ return i===0||Math.hypot(p.x-P[i-1].x,p.y-P[i-1].y)>1e-9; });
  if(closed&&V.length>2&&Math.hypot(V[0].x-V[V.length-1].x,V[0].y-V[V.length-1].y)<1e-9) V.pop();
  snapshot(); var made=0,ptLy=null;
  if(mk||lb){ var L=S.layers.filter(function(l){ return l.nm==='Pontos'; })[0]; if(!L){ L={id:nextLayerId(),nm:'Pontos',col:'#f5c860',vis:true,lock:false,ld:'solid',lw:.18}; S.layers.push(L); updLayerUI(); updLayerSel(); } ptLy=L.id; }
  if(pl&&V.length>=2){ var pts=V.map(function(p){ return {x:p.x,y:p.y}; }); if(closed&&pts.length>2) pts.push({x:pts[0].x,y:pts[0].y}); addE({tp:'pl',closed:closed&&V.length>2,pts:pts},true); made++; }
  P.forEach(function(p){ if(mk){ addE({tp:'point',x:p.x,y:p.y,ly:ptLy},true); made++; } if(lb){ addE({tp:'txt',x:p.x+lh*0.4,y:p.y+lh*0.4,h:lh,txt:String(p.id),rot:0,ly:ptLy},true); made++; } });
  var um=unitMm(); closeOv('ov-pontos'); S.dirty=true; zoomFit(); renderAll(); updLayerUI(); updStatus();
  log('PONTOS: '+R.pts.length+' ponto(s) importado(s)'+(pl?', '+(closed&&V.length>2?'polígono fechado':'polilinha')+' com '+V.length+' vértices':'')+'.'+(ox||oy?' Origem deslocada: X − '+gNum(ox)+', Y − '+gNum(oy)+' (unidades do desenho'+(unitMm()!==1000?'; = E '+ptBR(ox*um/1000,3)+' m, N '+ptBR(oy*um/1000,3)+' m':'')+'). Some esses valores para voltar às coordenadas originais.':''),'ok');
  if(V.length>=2) log('Perímetro '+ptFmtLen(ptPerim(V,closed)*um)+(closed&&V.length>=3?' · Área '+ptFmtArea(ptArea(V)*um*um):''),'ok');
  if(R.bad.length) log(R.bad.length+' linha(s) da tabela ignorada(s) (sem par de números X e Y).','inf');
  return made;
}
function ptLoadFile(ev){ var f=ev.target.files[0]; if(!f) return; var r=new FileReader();
  r.onload=function(e){ var buf=new Uint8Array(e.target.result),txt; try{ txt=new TextDecoder('utf-8',{fatal:true}).decode(buf); }catch(err){ txt=new TextDecoder('windows-1252').decode(buf); }
    document.getElementById('pt-txt').value=txt.replace(/^﻿/,''); ptRefresh(true); ev.target.value=''; };
  r.readAsArrayBuffer(f); }
window.addEventListener('load',function(){
  var ov=document.createElement('div'); ov.className='ov'; ov.id='ov-pontos';
  ov.innerHTML='<div class="modal pt-modal"><h3>Importar pontos — tabela de coordenadas</h3>'+
   '<div class="pt-grid"><div class="pt-left">'+
   '<label class="pt-lbl">Cole as coordenadas (Excel, LibreOffice, Google Planilhas, CSV ou TXT) ou <button class="btn s" type="button" id="pt-file-btn">abra um arquivo…</button></label>'+
   '<textarea id="pt-txt" spellcheck="false" placeholder="Ponto&#9;X&#9;Y&#10;P1&#9;0&#9;0&#10;P2&#9;120,5&#9;0&#10;P3&#9;120,5&#9;80"></textarea>'+
   '<div id="pt-info" class="pt-info"></div><div id="pt-bad" class="pt-bad"></div></div>'+
   '<div class="pt-right"><canvas id="pt-cv" width="260" height="180"></canvas><div id="pt-rep" class="pt-rep"></div>'+
   '<div class="pt-opts">'+
   '<label>X (Este)</label><select id="pt-cx"></select><label>Y (Norte)</label><select id="pt-cy"></select><label>Nome do ponto</label><select id="pt-cid"></select>'+
   '<label>Unidade da tabela</label><select id="pt-unit"><option value="mm">mm</option><option value="cm">cm</option><option value="m">m</option><option value="km">km</option></select>'+
   '</div><div class="pt-chk">'+
   '<label><input type="checkbox" id="pt-pl" checked> Ligar os pontos (polilinha)</label>'+
   '<label><input type="checkbox" id="pt-closed"> Fechar (polígono)</label>'+
   '<label><input type="checkbox" id="pt-mk" checked> Marcar os pontos (camada Pontos)</label>'+
   '<label><input type="checkbox" id="pt-lb"> Rótulos com o nome, altura <input id="pt-lh" class="pt-lh"></label>'+
   '<label title="Subtrai um valor redondo de X e Y para trabalhar perto da origem (útil para coordenadas UTM)"><input type="checkbox" id="pt-off"> Deslocar para perto da origem (UTM)</label>'+
   '</div></div></div>'+
   '<input type="file" id="pt-file" accept=".csv,.txt,.tsv,.xyz,.prn" style="display:none">'+
   '<div class="mact"><button class="btn s" type="button" onclick="closeOv(\'ov-pontos\')">Cancelar</button><button class="btn p" type="button" id="pt-ok">Inserir</button></div></div>';
  document.body.appendChild(ov);
  var ta=document.getElementById('pt-txt'),t=null;
  ta.addEventListener('input',function(){ clearTimeout(t); t=setTimeout(function(){ ptRefresh(true); },250); });
  ['pt-cx','pt-cy','pt-cid','pt-unit','pt-pl','pt-closed','pt-mk','pt-lb','pt-off'].forEach(function(id){ document.getElementById(id).addEventListener('change',function(){ ptRefresh(id==='pt-unit'?'unit':false); }); });
  document.getElementById('pt-ok').addEventListener('click',ptInsert);
  document.getElementById('pt-file-btn').addEventListener('click',function(){ document.getElementById('pt-file').click(); });
  document.getElementById('pt-file').addEventListener('change',ptLoadFile);
  ['keydown','keyup','keypress'].forEach(function(k){ ov.addEventListener(k,function(ev){ ev.stopPropagation(); }); });
});
