/* ═══════════════════════════════════════════════════════════════════
   v8.5 — TOPOGRAFIA E SCRIPTS COM VARIÁVEIS (etapa 3)
   1. Ângulos em graus, minutos e segundos; azimutes e rumos (NE, SE, SO, NO).
      Coordenada polar topográfica na linha de comando: @85.24<AZ96d56'30"
      e @48.12<N45d30'E (também em scripts).
   2. POLIGONAL: cálculo de poligonal fechada ou aberta a partir da caderneta
      (ângulos horários/anti-horários + azimute de partida, ou azimutes/rumos),
      erro angular e linear, tolerâncias, compensação (ângulos em partes iguais,
      coordenadas proporcionais às distâncias), área (Gauss), planilha e desenho.
   3. Scripts com variáveis e repetição: #SET, #FOR…#END, #REPEAT, #IF/#ELSE e
      expressões {…} (sem eval; só aritmética e funções matemáticas).
   4. Exercício 4 da Aula guiada: poligonal fechada de um talhão.
   ═══════════════════════════════════════════════════════════════════ */

// ── 1. ÂNGULOS, AZIMUTES E RUMOS ────────────────────────────────────────────
function poNum(t){ t=String(t).trim().replace(',','.'); return /^[-+]?(\d+\.?\d*|\.\d+)$/.test(t)?parseFloat(t):NaN; }
// "114°06'00\"", "114 06 00", "114d06'00\"", "114:06:00", "114,1" → graus decimais
function poAngParse(s){
  var t=String(s==null?'':s).trim().replace(/[º°dD:]/g,' ').replace(/[′’']{2}|[″"]/g,' ').replace(/[′’']/g,' ').trim();
  if(!t) return NaN; var p=t.split(/\s+/); if(p.length>3) return NaN;
  var v=p.map(poNum); if(v.some(isNaN)) return NaN;
  if(p.length===1) return v[0];
  if(v[1]<0||v[1]>=60||(p.length===3&&(v[2]<0||v[2]>=60))) return NaN;
  var sg=String(s).trim()[0]==='-'?-1:1; return sg*(Math.abs(v[0])+v[1]/60+(p.length===3?v[2]/3600:0));
}
// rumo: "N 45°30' E", "N45d30'E", "45°30' NE", "45 30 SO", "S12d30'W" → azimute
function poRumoParse(s){
  var u=String(s).toUpperCase().replace(/\s+/g,' ').trim(),m,q,a;
  if((m=/^([NS])\s*(.+?)\s*([ELWO])$/.exec(u))){ q=m[1]+m[3]; a=m[2]; }
  else if((m=/^(.+?)\s*([NS])\s*([ELWO])$/.exec(u))){ q=m[2]+m[3]; a=m[1]; }
  else return NaN;
  var r=poAngParse(a); if(isNaN(r)||r<0||r>90) return NaN; q=q.replace(/[LE]$/,'E').replace(/[OW]$/,'W');
  return ({NE:r,SE:180-r,SW:180+r,NW:360-r})[q]%360;
}
// direção: rumo (tem N/S) ou azimute (opcionalmente com "Az")
function poDirParse(s){ var u=String(s).trim(); if(/[NS]/i.test(u.replace(/^AZ/i,''))) return poRumoParse(u); var a=poAngParse(u.replace(/^AZ\s*/i,'')); return isNaN(a)?NaN:((a%360)+360)%360; }
function poNorm(a){ a%=360; return a<0?a+360:a; }
function poDMS(deg,dec){ dec=dec||0; var sg=deg<0?'-':'',k=Math.pow(10,dec),t=Math.round(Math.abs(deg)*3600*k)/k,d=Math.floor(t/3600),m=Math.floor((t-d*3600)/60),s=t-d*3600-m*60;
  var ss=dec?s.toFixed(dec).replace('.',','):String(Math.round(s)); if(s<10) ss='0'+ss; return sg+d+'°'+('0'+m).slice(-2)+"'"+ss+'"'; }
function poRumo(az){ az=poNorm(az); var q,r; if(az<=90){q='NE';r=az;} else if(az<=180){q='SE';r=180-az;} else if(az<=270){q='SO';r=az-180;} else {q='NO';r=360-az;} return poDMS(r)+' '+q; }
function poSec(deg){ var s=deg*3600; return (Math.abs(s)<0.05?'0':(s>0?'+':'')+s.toFixed(1).replace('.',','))+'"'; }

// coordenada polar topográfica: @dist<AZ… (azimute) ou @dist<N…E (rumo); @dist<45d30' (ângulo em GMS a partir do eixo X)
(function(){ var pc=parseCoord;
  parseCoord=function(raw){
    var r=pc(raw); if(r) return r;
    var m=/^(@?)\s*(\d+(?:[.,]\d+)?)\s*<\s*(.+)$/.exec(String(raw).trim()); if(!m) return null;
    var d=parseFloat(m[2].replace(',','.')),a=m[3].trim(),th;
    if(/^AZ/i.test(a)||/[NS]/i.test(a)){ var az=poDirParse(a); if(isNaN(az)) return null; th=(90-az)*Math.PI/180; }
    else { var g=poAngParse(a); if(isNaN(g)) return null; th=g*Math.PI/180; }
    var b=m[1]==='@'?(cmdRefPt()||S.hover||{x:0,y:0}):{x:0,y:0};
    return {x:b.x+d*Math.cos(th),y:b.y+d*Math.sin(th),st:null};
  };
})();

// ── 2. CÁLCULO DA POLIGONAL ─────────────────────────────────────────────────
// rows: [{id, a (texto do ângulo ou da direção), d (m)}]
// opt: {mode:'h'|'a'|'dir', closed, az0 (texto), E0, N0, kAng (" por √n), linN (1:N), comp}
function poCompute(rows,opt){
  var n=rows.length,R={ok:false,sides:[],pts:[],warn:[]};
  if(n<(opt.closed?3:1)) { R.err=opt.closed?'Uma poligonal fechada precisa de pelo menos 3 estações.':'Informe pelo menos uma estação.'; return R; }
  var ang=[],dist=[],dir=[];
  for(var i=0;i<n;i++){ var r=rows[i],d=poNum(r.d);
    if(!(d>0)){ R.err='Estação '+r.id+' (linha '+r.line+'): distância inválida "'+r.d+'".'; return R; } dist.push(d);
    if(opt.mode==='dir'){ var z=poDirParse(r.a); if(isNaN(z)){ R.err='Estação '+r.id+' (linha '+r.line+'): direção inválida "'+r.a+'". Use azimute (ex.: 96°56\'30") ou rumo (ex.: 83°03\'30" SE).'; return R; } dir.push(z); }
    else { var a=poAngParse(r.a); if((opt.closed||i>0)&&(isNaN(a)||a<0||a>=360)){ R.err='Estação '+r.id+' (linha '+r.line+'): ângulo inválido "'+r.a+'".'; return R; } ang.push(isNaN(a)?0:a); } }
  var P=dist.reduce(function(s,v){return s+v;},0); R.P=P; R.n=n;
  if(opt.mode!=='dir'){
    var az0=poDirParse(opt.az0); if(isNaN(az0)){ R.err='Azimute de partida inválido: "'+opt.az0+'".'; return R; }
    var corr=ang.slice();
    if(opt.closed){
      var sum=ang.reduce(function(s,v){return s+v;},0),ti=(n-2)*180,te=(n+2)*180,tgt=Math.abs(sum-ti)<=Math.abs(sum-te)?ti:te;
      R.kind=tgt===ti?'internos':'externos'; R.sumAng=sum; R.sumTgt=tgt; R.eAng=sum-tgt; R.tolAng=(opt.kAng||60)*Math.sqrt(n)/3600;
      R.angOk=Math.abs(R.eAng)<=R.tolAng+1e-9;
      if(opt.comp) corr=ang.map(function(a){ return a-R.eAng/n; });
    }
    var sg=opt.mode==='a'?-1:1; dir=[poNorm(az0)];
    for(var k=1;k<n;k++) dir.push(poNorm(dir[k-1]+180+sg*corr[k]));
    R.angCorr=corr;
  }
  var dE=[],dN=[]; for(var j=0;j<n;j++){ var t=dir[j]*Math.PI/180; dE.push(dist[j]*Math.sin(t)); dN.push(dist[j]*Math.cos(t)); }
  var cE=dE.map(function(){return 0;}),cN=cE.slice();
  if(opt.closed){
    R.eE=dE.reduce(function(s,v){return s+v;},0); R.eN=dN.reduce(function(s,v){return s+v;},0); R.eLin=Math.hypot(R.eE,R.eN);
    R.prec=R.eLin>1e-12?P/R.eLin:Infinity; R.linOk=R.prec>=(opt.linN||1000);
    if(opt.comp){ cE=dist.map(function(d){ return -R.eE*d/P; }); cN=dist.map(function(d){ return -R.eN*d/P; }); }
  }
  var E=+opt.E0||0,N=+opt.N0||0;
  for(var q=0;q<n;q++){ R.pts.push({id:rows[q].id,E:E,N:N});
    R.sides.push({id:rows[q].id,to:q<n-1?rows[q+1].id:(opt.closed?rows[0].id:'—'),ang:opt.mode==='dir'?null:ang[q],angC:opt.mode==='dir'?null:R.angCorr[q],az:dir[q],d:dist[q],dE:dE[q],dN:dN[q],cE:cE[q],cN:cN[q]});
    E+=dE[q]+cE[q]; N+=dN[q]+cN[q]; }
  if(!opt.closed) R.pts.push({id:'F',E:E,N:N}); // ponto final da poligonal aberta
  else R.endE=E,R.endN=N;
  if(opt.closed){ var A=0,L=R.pts; for(var z=0;z<L.length;z++){ var p1=L[z],p2=L[(z+1)%L.length]; A+=p1.E*p2.N-p2.E*p1.N; } R.area=Math.abs(A)/2; R.ccw=A>0; }
  R.ok=true; return R;
}
function poRows(text){
  var raw=String(text||'').replace(/\r/g,'').split('\n'),rows=[],bad=[];
  raw.forEach(function(l,i){ if(!l.trim()||/^\s*[#;]/.test(l)) return;
    var c=/\t/.test(l)?l.split('\t'):/;/.test(l)?l.split(';'):null;
    if(!c){ var m=/^\s*(\S+)\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s*$/.exec(l); c=m?[m[1],m[2],m[3]]:[l]; }
    c=c.map(function(x){ return x.trim(); });
    if(c.length<3){ bad.push(i+1); return; }
    if(i===0&&isNaN(poNum(c[2]))) return; // cabeçalho
    rows.push({id:c[0],a:c[1],d:c[2],line:i+1}); });
  return {rows:rows,bad:bad};
}
function poBR(v,d){ return ptBR(v,d); }
function poTable(R,opt){ // linhas da planilha de cálculo
  var H=['Estação','Vante'].concat(opt.mode==='dir'?[]:['Ângulo medido','Ângulo corrigido']).concat(['Azimute','Rumo','Distância (m)','ΔE (m)','ΔN (m)','Corr. E (m)','Corr. N (m)','E (m)','N (m)']);
  var B=R.sides.map(function(s,i){ var nx=R.pts[i+1]||R.pts[0]; return [s.id,s.to].concat(opt.mode==='dir'?[]:[poDMS(s.ang),poDMS(s.angC,1)]).concat([poDMS(s.az,1),poRumo(s.az),poBR(s.d,3),poBR(s.dE,3),poBR(s.dN,3),poBR(s.cE,3),poBR(s.cN,3),poBR(R.pts[i].E,3),poBR(R.pts[i].N,3)]); });
  return {H:H,B:B};
}
function poSummary(R,opt){
  var L=[];
  if(opt.closed&&opt.mode!=='dir') L.push(['Erro angular',poSec(R.eAng)+' (Σ = '+poDMS(R.sumAng)+'; deveria ser '+R.sumTgt+'° — ângulos '+R.kind+')',R.angOk],['Tolerância angular',poDMS(R.tolAng)+' = '+(opt.kAng||60)+'" × √'+R.n,R.angOk]);
  if(opt.closed) L.push(['Erro linear','eE = '+poBR(R.eE,3)+' m · eN = '+poBR(R.eN,3)+' m · e = '+poBR(R.eLin,3)+' m',R.linOk],['Precisão','1 : '+(isFinite(R.prec)?poBR(Math.round(R.prec),0):'∞')+' (mínima 1 : '+poBR(opt.linN||1000,0)+')',R.linOk],
    ['Perímetro',poBR(R.P,3)+' m',null],['Área',poBR(R.area,2)+' m² ('+poBR(R.area/1e4,4)+' ha)',null]);
  else L.push(['Comprimento',poBR(R.P,3)+' m',null],['Ponto final','E = '+poBR(R.pts[R.pts.length-1].E,3)+' · N = '+poBR(R.pts[R.pts.length-1].N,3),null]);
  return L;
}

// ── janela POLIGONAL ────────────────────────────────────────────────────────
var PO_EX=[
 ['Talhão — exercício 4 da Aula guiada (ângulos internos)',{mode:'h',closed:true,az0:'96°56\'30"',E0:'1000',N0:'2000'},
  'Estação\tÂngulo horário\tDistância (m)\nP1\t114°06\'00"\t85,24\nP2\t106°49\'59"\t68,92\nP3\t97°30\'27"\t74,54\nP4\t112°50\'30"\t77,67\nP5\t108°43\'43"\t48,12'],
 ['Divisa por rumos (fechada)',{mode:'dir',closed:true,E0:'0',N0:'0'},
  'Estação\tRumo\tDistância (m)\nA\t45°00\' NE\t100,00\nB\t45°00\' SE\t100,00\nC\t45°00\' SO\t100,00\nD\t45°00\' NO\t100,00'],
 ['Caminhamento aberto por azimutes (estrada)',{mode:'dir',closed:false,E0:'0',N0:'0'},
  'Estação\tAzimute\tDistância (m)\nE0\t30°\t120\nE1\t52°30\'\t85,5\nE2\t75°15\'30"\t140,2\nE3\t61°\t96,75']
];
var PO={R:null};
function poOpts(){ var g=function(id){ return document.getElementById(id); };
  return {mode:g('po-mode').value,closed:g('po-type').value==='f',az0:g('po-az0').value,E0:poNum(g('po-e0').value)||0,N0:poNum(g('po-n0').value)||0,kAng:poNum(g('po-kang').value)||60,linN:poNum(g('po-lin').value)||1000,comp:g('po-comp').checked}; }
function poOpen(){ var ov=document.getElementById('ov-poligonal'); if(!ov) return; if(S.tool!=='select') setTool('select'); ov.classList.add('show'); poRefresh(); setTimeout(function(){ document.getElementById('po-txt').focus(); },30); }
function poRefresh(){
  var o=poOpts(),X=poRows(document.getElementById('po-txt').value),R=poCompute(X.rows,o); PO.R=R; PO.o=o;
  document.getElementById('po-az0row').style.display=o.mode==='dir'?'none':'';
  document.getElementById('po-angtol').style.display=o.mode==='dir'||!o.closed?'none':'';
  var lab=o.mode==='dir'?'Azimute ou rumo':(o.mode==='h'?'Ângulo horário':'Ângulo anti-horário');
  document.getElementById('po-cols').textContent='Uma estação por linha: Estação · '+lab+' · Distância (m). Cole do Excel (colunas) ou separe por espaço ou ";".';
  var tb=document.getElementById('po-res'),sm=document.getElementById('po-sum'); tb.textContent=''; sm.textContent='';
  if(!R.ok){ var e=document.createElement('div'); e.className='po-err'; e.textContent=X.rows.length?R.err:'Digite ou cole a caderneta de campo.'; sm.appendChild(e); document.getElementById('po-ok').disabled=true; poPreview(null); return; }
  var T=poTable(R,o),tr=document.createElement('tr'); T.H.forEach(function(h){ var th=document.createElement('th'); th.textContent=h; tr.appendChild(th); }); tb.appendChild(tr);
  T.B.forEach(function(r){ var t=document.createElement('tr'); r.forEach(function(c){ var td=document.createElement('td'); td.textContent=c; t.appendChild(td); }); tb.appendChild(t); });
  poSummary(R,o).forEach(function(l){ var d=document.createElement('div'),b=document.createElement('b'); b.textContent=l[0]+': '; d.appendChild(b); d.appendChild(document.createTextNode(l[1])); if(l[2]===true) d.className='po-good'; else if(l[2]===false) d.className='po-bad'; sm.appendChild(d); });
  if(o.closed&&(R.angOk===false||R.linOk===false)){ var w=document.createElement('div'); w.className='po-bad'; w.textContent='⚠ Erro acima da tolerância: confira a caderneta (ou refaça a medição). Ainda é possível desenhar.'; sm.appendChild(w); }
  if(o.closed&&!o.comp){ var w2=document.createElement('div'); w2.className='po-note'; w2.textContent='Sem compensação: o último lado não chega ao ponto de partida (erro de fechamento visível no desenho).'; sm.appendChild(w2); }
  document.getElementById('po-ok').disabled=false; poPreview(R);
}
function poPreview(R){ var cv=document.getElementById('po-cv'),ctx=cv.getContext('2d'),W=cv.width,H=cv.height; ctx.fillStyle='#0a0a1a'; ctx.fillRect(0,0,W,H); if(!R) return;
  var P=R.pts.map(function(p){ return {x:p.E,y:p.N}; }); if(PO.o.closed&&!PO.o.comp) P.push({x:R.endE,y:R.endN});
  var b=ptsBox(P),sc=Math.min((W-30)/Math.max(b.w,1e-9),(H-30)/Math.max(b.h,1e-9));
  function m(p){ return {x:15+(p.x-b.x)*sc+((W-30)-b.w*sc)/2,y:H-15-(p.y-b.y)*sc-((H-30)-b.h*sc)/2}; }
  ctx.strokeStyle='#4ec87a'; ctx.lineWidth=1.5; ctx.beginPath(); P.forEach(function(p,i){ var q=m(p); if(i) ctx.lineTo(q.x,q.y); else ctx.moveTo(q.x,q.y); }); if(PO.o.closed&&PO.o.comp) ctx.closePath(); ctx.stroke();
  ctx.fillStyle='#f5c860'; ctx.font='10px Consolas'; R.pts.forEach(function(p){ var q=m({x:p.E,y:p.N}); ctx.fillRect(q.x-2,q.y-2,4,4); ctx.fillText(p.id,q.x+4,q.y-4); });
  var nq=m({x:b.x+b.w,y:b.y+b.h}); ctx.strokeStyle='#9fb3c8'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(W-14,30); ctx.lineTo(W-14,10); ctx.lineTo(W-18,17); ctx.moveTo(W-14,10); ctx.lineTo(W-10,17); ctx.stroke(); ctx.fillStyle='#9fb3c8'; ctx.fillText('N',W-17,42);
}
function poLayer(nm,col){ var L=scrLayer(nm); if(!L){ L=scrLayerNew(nm); L.col=col; } return L.id; }
function poInsert(){
  var R=PO.R,o=PO.o; if(!R||!R.ok) return;
  var g=function(id){ return document.getElementById(id).checked; },f=1000/unitMm(),ox=0,oy=0;
  var P=R.pts.map(function(p){ return {id:p.id,x:p.E*f,y:p.N*f}; });
  if(g('po-off')){ var b0=ptsBox(P),gg=Math.pow(10,Math.max(0,Math.floor(Math.log10(Math.max(b0.w,b0.h,1)))+1)); ox=Math.floor(b0.x/gg)*gg; oy=Math.floor(b0.y/gg)*gg; P.forEach(function(p){ p.x-=ox; p.y-=oy; }); }
  var b=ptsBox(P),ext=Math.max(b.w,b.h)||1,lh=Math.max(0.5,Math.round(ext/60*10)/10); if(lh>100) lh=Math.round(lh);
  snapshot(); var made=0;
  var V=P.map(function(p){ return {x:p.x,y:p.y}; });
  if(o.closed&&!o.comp) V.push({x:R.endE*f-ox,y:R.endN*f-oy});
  if(o.closed&&o.comp){ V.push({x:V[0].x,y:V[0].y}); addE({tp:'pl',closed:true,pts:V},true); } else addE({tp:'pl',closed:false,pts:V},true); made++;
  var ptLy=(g('po-mk')||g('po-lb'))?poLayer('Pontos','#f5c860'):null;
  P.forEach(function(p){ if(g('po-mk')){ addE({tp:'point',x:p.x,y:p.y,ly:ptLy},true); made++; } if(g('po-lb')){ addE({tp:'txt',x:p.x+lh*0.4,y:p.y+lh*0.4,h:lh,txt:String(p.id),rot:0,ly:ptLy},true); made++; } });
  if(g('po-qd')) made+=poQuadro(R,o,b,lh,ox,oy,f);
  closeOv('ov-poligonal'); S.dirty=true; zoomFit(); renderAll(); updLayerUI(); updStatus();
  log('POLIGONAL '+(o.closed?'fechada':'aberta')+': '+R.n+' estações, perímetro '+poBR(R.P,3)+' m'+(o.closed?', área '+poBR(R.area,2)+' m² ('+poBR(R.area/1e4,4)+' ha)':'')+'.','ok');
  if(o.closed&&o.mode!=='dir') log('Erro angular '+poSec(R.eAng)+' (tolerância '+poDMS(R.tolAng)+') — '+(R.angOk?'dentro':'FORA')+' da tolerância.',R.angOk?'ok':'inf');
  if(o.closed) log('Erro linear '+poBR(R.eLin,3)+' m, precisão 1:'+(isFinite(R.prec)?poBR(Math.round(R.prec),0):'∞')+' — '+(R.linOk?'dentro':'FORA')+' da tolerância'+(o.comp?'; coordenadas compensadas proporcionalmente às distâncias.':'; sem compensação.'),R.linOk?'ok':'inf');
  if(ox||oy) log('Origem deslocada: E − '+poBR(ox/f,3)+' m, N − '+poBR(oy/f,3)+' m.','inf');
  return made;
}
function poQuadro(R,o,b,lh,ox,oy,f){ // quadro de coordenadas à direita do desenho
  var Ly=poLayer('Quadro','#9fb3c8'),h=lh*0.8,rh=h*2,cw=[h*6,h*11,h*11],x0=b.x+b.w+lh*4,y0=b.y+b.h,n=0;
  var rows=[['Vértice','E (m)','N (m)']].concat(R.pts.map(function(p){ return [p.id,poBR(p.E,3),poBR(p.N,3)]; }));
  var W=cw[0]+cw[1]+cw[2],Hh=rows.length*rh;
  function ln(x1,y1,x2,y2){ addE({tp:'line',x1:x1,y1:y1,x2:x2,y2:y2,ly:Ly},true); n++; }
  function tx(x,y,t){ addE({tp:'txt',x:x,y:y,h:h,txt:t,rot:0,ly:Ly},true); n++; }
  tx(x0,y0+rh*0.5,'QUADRO DE COORDENADAS'+(o.closed?'':' (poligonal aberta)'));
  for(var i=0;i<=rows.length;i++) ln(x0,y0-i*rh,x0+W,y0-i*rh);
  var cx=x0; ln(cx,y0,cx,y0-Hh); cw.forEach(function(w){ cx+=w; ln(cx,y0,cx,y0-Hh); });
  rows.forEach(function(r,i){ var x=x0; r.forEach(function(c,j){ tx(x+h*0.5,y0-(i+1)*rh+h*0.55,c); x+=cw[j]; }); });
  var yy=y0-Hh-rh;
  if(o.closed){ tx(x0,yy,'Área = '+poBR(R.area,2)+' m² ('+poBR(R.area/1e4,4)+' ha)'); tx(x0,yy-rh,'Perímetro = '+poBR(R.P,3)+' m'); tx(x0,yy-2*rh,'Precisão linear 1:'+(isFinite(R.prec)?poBR(Math.round(R.prec),0):'∞')+(o.comp?' · compensada':'')); }
  else tx(x0,yy,'Comprimento = '+poBR(R.P,3)+' m');
  return n;
}
function poCSV(){ var R=PO.R,o=PO.o; if(!R||!R.ok) return ''; var T=poTable(R,o); return [T.H].concat(T.B).concat([[]]).concat(poSummary(R,o).map(function(l){ return [l[0],l[1]]; })).map(function(r){ return r.map(function(c){ c=String(c); return /[;"\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c; }).join(';'); }).join('\r\n')+'\r\n'; }
function poSaveCSV(){ var t=poCSV(); if(!t) return; var b=new Blob([cp1252Encode(t)],{type:'text/csv'}),a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='poligonal.csv'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },500); log('Planilha da poligonal salva (poligonal.csv, abre no Excel em português).','ok'); }
function poCopy(){ var R=PO.R,o=PO.o; if(!R||!R.ok) return; var T=poTable(R,o),t=[T.H].concat(T.B).map(function(r){ return r.join('\t'); }).join('\n');
  try{ navigator.clipboard.writeText(t).then(function(){ log('Planilha copiada: cole no Excel ou no LibreOffice.','ok'); },function(){ log('Não foi possível copiar; use Salvar CSV.','er'); }); }catch(e){ log('Não foi possível copiar; use Salvar CSV.','er'); } }
window.addEventListener('load',function(){
  var ov=document.createElement('div'); ov.className='ov'; ov.id='ov-poligonal';
  ov.innerHTML='<div class="modal po-modal"><h3>Poligonal topográfica — cálculo e desenho</h3>'+
   '<div class="po-top">'+
   '<label>Poligonal <select id="po-type"><option value="f">Fechada</option><option value="a">Aberta</option></select></label>'+
   '<label>Medidas <select id="po-mode"><option value="h">Ângulos horários (da ré para a vante)</option><option value="a">Ângulos anti-horários</option><option value="dir">Azimutes ou rumos</option></select></label>'+
   '<label id="po-az0row">Azimute de partida (1º lado) <input id="po-az0" value="0°00\'00&quot;"></label>'+
   '<label>E inicial (m) <input id="po-e0" value="0"></label><label>N inicial (m) <input id="po-n0" value="0"></label>'+
   '<select id="po-ex"><option value="">Exemplos…</option></select></div>'+
   '<div class="po-grid"><div><div id="po-cols" class="po-lbl"></div><textarea id="po-txt" spellcheck="false" wrap="off"></textarea>'+
   '<div class="po-tol"><span id="po-angtol">Tolerância angular <input id="po-kang" value="60">" × √n</span><span>Precisão mínima 1 : <input id="po-lin" value="1000"></span>'+
   '<label><input type="checkbox" id="po-comp" checked> Compensar erros</label></div><div id="po-sum" class="po-sum"></div></div>'+
   '<div><canvas id="po-cv" width="250" height="190"></canvas><div class="po-chk">'+
   '<label><input type="checkbox" id="po-mk" checked> Marcos (pontos)</label><label><input type="checkbox" id="po-lb" checked> Nomes dos vértices</label>'+
   '<label><input type="checkbox" id="po-qd" checked> Quadro de coordenadas, área e perímetro</label><label><input type="checkbox" id="po-off"> Deslocar para perto da origem (UTM)</label></div></div></div>'+
   '<div class="po-tabwrap"><table id="po-res" class="po-tab"></table></div>'+
   '<div class="mact"><button class="btn s" type="button" id="po-copy">Copiar planilha</button><button class="btn s" type="button" id="po-csv">Salvar CSV</button><span style="flex:1"></span>'+
   '<button class="btn s" type="button" onclick="closeOv(\'ov-poligonal\')">Cancelar</button><button class="btn p" type="button" id="po-ok">Desenhar</button></div></div>';
  document.body.appendChild(ov);
  var ex=document.getElementById('po-ex'); PO_EX.forEach(function(x,i){ var o=document.createElement('option'); o.value=String(i); o.textContent=x[0]; ex.appendChild(o); });
  ex.addEventListener('change',function(){ if(this.value==='') return; var x=PO_EX[+this.value],c=x[1]; document.getElementById('po-mode').value=c.mode; document.getElementById('po-type').value=c.closed?'f':'a';
    if(c.az0) document.getElementById('po-az0').value=c.az0; document.getElementById('po-e0').value=c.E0; document.getElementById('po-n0').value=c.N0; document.getElementById('po-txt').value=x[2]; this.value=''; poRefresh(); });
  var t=null; ['po-txt','po-az0','po-e0','po-n0','po-kang','po-lin'].forEach(function(id){ document.getElementById(id).addEventListener('input',function(){ clearTimeout(t); t=setTimeout(poRefresh,200); }); });
  ['po-type','po-mode','po-comp'].forEach(function(id){ document.getElementById(id).addEventListener('change',poRefresh); });
  document.getElementById('po-ok').addEventListener('click',poInsert); document.getElementById('po-csv').addEventListener('click',poSaveCSV); document.getElementById('po-copy').addEventListener('click',poCopy);
  ['keydown','keyup','keypress'].forEach(function(k){ ov.addEventListener(k,function(ev){ if(ev.key!=='Escape') ev.stopPropagation(); }); });
});

// ── 3. VARIÁVEIS E REPETIÇÃO NOS SCRIPTS ────────────────────────────────────
// Expressões seguras: números, variáveis, + - * / % ^, comparações, e/ou/não, funções matemáticas (graus)
var SX_FN={sin:function(a){return Math.sin(a*Math.PI/180);},cos:function(a){return Math.cos(a*Math.PI/180);},tan:function(a){return Math.tan(a*Math.PI/180);},
  sen:function(a){return Math.sin(a*Math.PI/180);},asin:function(v){return Math.asin(v)*180/Math.PI;},acos:function(v){return Math.acos(v)*180/Math.PI;},atan:function(v){return Math.atan(v)*180/Math.PI;},
  atan2:function(y,x){return Math.atan2(y,x)*180/Math.PI;},sqrt:Math.sqrt,raiz:Math.sqrt,abs:Math.abs,floor:Math.floor,ceil:Math.ceil,int:Math.trunc,min:Math.min,max:Math.max,
  round:function(v,n){ var k=Math.pow(10,n||0); return Math.round(v*k)/k; },mod:function(a,b){ return ((a%b)+b)%b; },hypot:Math.hypot};
function sxEval(src,vars){
  var s=String(src),i=0,tk=[],m;
  var re=/\s*(?:(\d+(?:\.\d*)?(?:[eE][-+]?\d+)?|\.\d+)|([A-Za-z_À-ú][\wÀ-ú]*)|(<=|>=|==|!=|<>|&&|\|\||[-+*\/%^(),<>!=]))/y;
  while(i<s.length){ re.lastIndex=i; m=re.exec(s); if(!m){ if(/^\s*$/.test(s.slice(i))) break; throw new Error('símbolo inválido em "'+s.slice(i,i+12)+'"'); }
    i=re.lastIndex; tk.push(m[1]!==undefined?{n:parseFloat(m[1])}:m[2]!==undefined?{id:m[2].toLowerCase()}:{op:m[3]}); }
  var p=0; function pk(o){ return tk[p]&&tk[p].op===o; } function ex(o){ if(!pk(o)) throw new Error('esperava "'+o+'"'); p++; }
  function wd(w){ return tk[p]&&tk[p].id&&w.indexOf(tk[p].id)>=0; }
  function or_(){ var v=and_(); while(pk('||')||wd(['ou','or'])){ p++; var r=and_(); v=(v||r)?1:0; } return v; }
  function and_(){ var v=not_(); while(pk('&&')||wd(['e','and'])){ p++; var r=not_(); v=(v&&r)?1:0; } return v; }
  function not_(){ if(pk('!')||wd(['nao','não','not'])){ p++; return not_()?0:1; } return cmp(); }
  function cmp(){ var v=add(); while(tk[p]&&tk[p].op&&/^(<=|>=|==|!=|<>|<|>|=)$/.test(tk[p].op)){ var o=tk[p++].op,r=add();
      v=({'<':v<r,'>':v>r,'<=':v<=r,'>=':v>=r,'==':Math.abs(v-r)<1e-9,'=':Math.abs(v-r)<1e-9,'!=':Math.abs(v-r)>=1e-9,'<>':Math.abs(v-r)>=1e-9})[o]?1:0; } return v; }
  function add(){ var v=mul(); while(pk('+')||pk('-')){ var o=tk[p++].op,r=mul(); v=o==='+'?v+r:v-r; } return v; }
  function mul(){ var v=una(); while(pk('*')||pk('/')||pk('%')){ var o=tk[p++].op,r=una(); v=o==='*'?v*r:o==='/'?v/r:v%r; } return v; }
  function una(){ if(pk('-')){ p++; return -una(); } if(pk('+')){ p++; return una(); } return pow(); }
  function pow(){ var v=pri(); if(pk('^')){ p++; v=Math.pow(v,una()); } return v; }
  function pri(){ var t=tk[p]; if(!t) throw new Error('expressão incompleta');
    if(t.n!==undefined){ p++; return t.n; }
    if(t.op==='('){ p++; var v=or_(); ex(')'); return v; }
    if(t.id){ p++; if(pk('(')){ p++; var a=[]; if(!pk(')')){ a.push(or_()); while(pk(',')){ p++; a.push(or_()); } } ex(')'); var fn=SX_FN[t.id]; if(!fn) throw new Error('função desconhecida: '+t.id); return fn.apply(null,a); }
      if(t.id==='pi') return Math.PI; if(Object.prototype.hasOwnProperty.call(vars,t.id)) return vars[t.id]; throw new Error('variável não definida: '+t.id); }
    throw new Error('"'+t.op+'" fora do lugar'); }
  var v=or_(); if(p<tk.length) throw new Error('sobrou "'+(tk[p].op||tk[p].id||tk[p].n)+'"');
  if(typeof v!=='number'||!isFinite(v)) throw new Error('resultado não é um número finito'); return v;
}
function sxFmt(v){ var r=Math.round(v*1e6)/1e6; if(Object.is(r,-0)) r=0; return String(r); }
// expande diretivas (#SET, #FOR, #REPEAT, #IF/#ELSE, #END) e {expressões}; devolve {text, map(linha expandida → linha original)} ou {err, line}
function scrExpand(text,lim){
  lim=lim||200000; var src=String(text).replace(/\r\n?/g,'\n').split('\n'),end=/\n$/.test(text); if(end) src.pop();
  var root={kids:[]},stack=[root],k;
  function D(l){ return /^\s*#/.test(l)?l.trim().slice(1).trim():null; }
  for(k=0;k<src.length;k++){ var d=D(src[k]),top=stack[stack.length-1],m;
    if(d===null){ top.kids.push({ln:k+1,txt:src[k]}); continue; }
    if((m=/^(SET|VAR|DEFINIR)\s+([A-Za-zÀ-ú_][\wÀ-ú]*)\s*=\s*(.+)$/i.exec(d))) top.kids.push({ln:k+1,set:m[2].toLowerCase(),ex:m[3]});
    else if((m=/^(FOR|PARA)\s+([A-Za-zÀ-ú_][\wÀ-ú]*)\s*=\s*(.+?)\s+(TO|ATE|ATÉ)\s+(.+?)(?:\s+(STEP|PASSO)\s+(.+))?$/i.exec(d))){ var b={ln:k+1,fv:m[2].toLowerCase(),a:m[3],b:m[5],s:m[7],kids:[]}; top.kids.push(b); stack.push(b); }
    else if((m=/^(REPEAT|REPETIR)\s+(.+)$/i.exec(d))){ var b2={ln:k+1,rep:m[2],kids:[]}; top.kids.push(b2); stack.push(b2); }
    else if((m=/^(IF|SE)\s+(.+)$/i.exec(d))){ var b3={ln:k+1,cond:m[2],kids:[],els:null}; top.kids.push(b3); stack.push(b3); }
    else if(/^(ELSE|SENAO|SENÃO)$/i.test(d)){ if(top.cond===undefined||top.inElse) return {err:'#ELSE sem #IF',line:k+1}; top.inElse=true; top.els=[]; top.kids0=top.kids; top.kids=top.els; }
    else if(/^(END|FIM|NEXT|PROXIMO|PRÓXIMO|ENDIF|FIMSE)\b/i.test(d)){ if(stack.length<2) return {err:'#END sem bloco aberto',line:k+1}; var c=stack.pop(); if(c.inElse){ c.els=c.kids; c.kids=c.kids0; } }
    else return {err:'diretiva desconhecida: #'+d.split(/\s+/)[0]+' (use #SET, #FOR, #REPEAT, #IF, #ELSE, #END)',line:k+1};
  }
  if(stack.length>1) return {err:'bloco #'+(stack[stack.length-1].fv!==undefined?'FOR':stack[stack.length-1].rep!==undefined?'REPEAT':'IF')+' sem #END',line:stack[stack.length-1].ln};
  var out=[],map=[],vars={},steps=0;
  function E(x,ln){ try{ return sxEval(x,vars); }catch(e){ throw {err:e.message+' (em "'+x.trim()+'")',line:ln}; } }
  function sub(t,ln){ return t.replace(/\{\{|\}\}|\{([^{}]*)\}/g,function(a,x){ if(a==='{{') return '{'; if(a==='}}') return '}'; return sxFmt(E(x,ln)); }); }
  function run(list){ list.forEach(function(n){
    if(++steps>lim*5) throw {err:'repetições demais (limite de segurança)',line:n.ln};
    if(n.txt!==undefined){ if(out.length>=lim) throw {err:'o script expandido passou de '+lim+' linhas',line:n.ln}; out.push(/^\s*;/.test(n.txt)?n.txt:sub(n.txt,n.ln)); map.push(n.ln); return; }
    if(n.set!==undefined){ vars[n.set]=E(n.ex,n.ln); return; }
    if(n.fv!==undefined){ var a=E(n.a,n.ln),b=E(n.b,n.ln),s=n.s?E(n.s,n.ln):(b>=a?1:-1); if(s===0||(b-a)*s<0&&Math.abs(b-a)>1e-9) { if(s===0) throw {err:'PASSO não pode ser 0',line:n.ln}; return; }
      var cnt=Math.floor((b-a)/s+1e-9)+1; if(cnt>lim) throw {err:'repetições demais',line:n.ln}; for(var j=0;j<cnt;j++){ vars[n.fv]=a+j*s; run(n.kids); } return; }
    if(n.rep!==undefined){ var r=Math.round(E(n.rep,n.ln)); if(r>lim) throw {err:'repetições demais',line:n.ln}; for(var q=0;q<r;q++) run(n.kids); return; }
    if(n.cond!==undefined){ if(E(n.cond,n.ln)) run(n.kids); else if(n.els) run(n.els); }
  }); }
  try{ run(root.kids); }catch(e){ if(e&&e.err) return e; throw e; }
  return {text:out.join('\n')+(end?'\n':''),map:map};
}
function scrHasMacros(t){ return /^\s*#/m.test(t)||/\{[^{}\n]*\}/.test(t); }
(function(){ var r0=scrRun;
  scrRun=function(text,opt){
    opt=opt||{}; var src=String(text||'').replace(/^﻿/,'');
    if(!scrHasMacros(src)) return r0(text,opt);
    var X=scrExpand(src);
    if(X.err){ SCR.lastErr={line:X.line,tok:'',msg:X.err}; SCR.lastText=src.replace(/\r\n?/g,'\n'); log('SCRIPT interrompido na linha '+X.line+': '+X.err+'.','er'); if(opt.onEnd) opt.onEnd(false); return false; }
    opt.lineMap=X.map; var ok=r0(X.text,opt); SCR.lastText=src.replace(/\r\n?/g,'\n'); return ok;
  };
})();
window.addEventListener('load',function(){
  var bar=document.querySelector('#ov-script .scr-bar'); if(!bar) return;
  var bt=document.createElement('button'); bt.className='btn s'; bt.type='button'; bt.id='scr-save-exp'; bt.textContent='Salvar expandido';
  bt.title='Salva o script com #SET/#FOR/#IF e {expressões} já calculados: um .scr comum, que roda também no AutoCAD e no ZWCAD';
  bt.addEventListener('click',function(){ var ta=document.getElementById('scr-txt'),X=scrExpand(ta.value); if(X.err){ log('SCRIPT: linha '+X.line+': '+X.err+'.','er'); return; }
    var keep=ta.value,nm=SCR.fname; ta.value=X.text; SCR.fname=(nm||'script.scr').replace(/\.scr$/i,'')+'-expandido.scr'; try{ scrSave(); } finally { ta.value=keep; SCR.fname=nm; } });
  bar.insertBefore(bt,document.getElementById('scr-ex'));
});
SCR_EX.push(
 ['Covas de plantio 3 × 2 m (repetição #FOR)','covas.scr',
  '; Exemplo 4 — malha de covas com #FOR (variáveis e repetição; unidades: mm)\n; {expressão} é calculada antes de executar. #SET define variáveis.\n'+
  '#SET ex = 3000\n#SET ey = 2000\n#SET linhas = 5\n#SET plantas = 8\n'+
  '-LAYER M Covas C verde Covas\n\n'+
  '#FOR i = 0 TO plantas-1\n#FOR j = 0 TO linhas-1\nCIRCLE {i*ex},{j*ey} 200\n#END\n#END\n'+
  '-LAYER M Talhao C 2 Talhao\n\nRECTANG {-ex/2},{-ey/2} {(plantas-0.5)*ex},{(linhas-0.5)*ey}\n'+
  'TEXT {-ex/2},{(linhas-0.5)*ey+300} 400 0 {plantas*linhas} covas — espaçamento {ex/1000} x {ey/1000} m\n\nZOOM E\n'],
 ['Plantio em quincôncio (#IF)','quinconcio.scr',
  '; Exemplo 5 — linhas alternadas deslocadas meia distância (#IF … #ELSE … #END)\n#SET e = 3000\n'+
  '#FOR j = 0 TO 5\n#FOR i = 0 TO 7\n#IF mod(j,2) == 0\nPOINT {i*e},{j*e*0.866}\n\n#ELSE\nPOINT {i*e+e/2},{j*e*0.866}\n\n#END\n#END\n#END\nZOOM E\n'],
 ['Divisa por azimutes e rumos (PLINE)','divisa.scr',
  '; Exemplo 6 — lados por azimute (AZ) e por rumo (N…E / S…O), distâncias em mm\n'+
  '; (mesmos lados do exercício 4 da Aula guiada; C fecha o último lado)\nPLINE 0,0 @85240<AZ96d56\'30" @68920<N23d46\'21"E @74540<N58d43\'20"W @77670<S54d07\'03"W C\nZOOM E\n']
);

// ── 4. AULA GUIADA: EXERCÍCIO DE TOPOGRAFIA ─────────────────────────────────
var PO_AULA={rows:[['P1','114°06\'00"','85,24'],['P2','106°49\'59"','68,92'],['P3','97°30\'27"','74,54'],['P4','112°50\'30"','77,67'],['P5','108°43\'43"','48,12']],az0:'96°56\'30"',E0:1000,N0:2000};
function poAulaR(){ return poCompute(PO_AULA.rows.map(function(r,i){ return {id:r[0],a:r[1],d:r[2],line:i+1}; }),{mode:'h',closed:true,az0:PO_AULA.az0,E0:PO_AULA.E0,N0:PO_AULA.N0,kAng:60,linN:1000,comp:true}); }
function poAulaV(){ var R=poAulaR(),f=1000/unitMm(); return R.pts.map(function(p){ return {id:p.id,x:p.E*f,y:p.N*f}; }); }
var PO_TOL=10; // mm (1 cm no terreno)
function poNear(a,b){ return Math.hypot(a.x-b.x,a.y-b.y)<=PO_TOL; }
function poTxtNums(){ var o=[]; exModel().forEach(function(e){ if((e.tp==='txt'||e.tp==='mtext')&&e.txt){ (String(e.tp==='mtext'&&typeof rtPlain==='function'?rtPlain(e.txt):e.txt).match(/\d[\d.]*(,\d+)?|\d+\.\d+/g)||[]).forEach(function(t){ var v=/,/.test(t)?parseFloat(t.replace(/\./g,'').replace(',','.')):parseFloat(t); if(isFinite(v)) o.push({v:v,txt:e.txt}); }); } }); return o; }
EX_LIST.push(
 {id:'poligonal',title:'4. Poligonal fechada de um talhão (topografia)',level:'Intermediário · 40 min',
  goal:'Caderneta de campo, erro angular e linear, tolerâncias, compensação, coordenadas, área e quadro de coordenadas.',
  norm:'NBR 13133 (levantamento topográfico)',view:{x:980000,y:1980000,w:170000,h:120000},
  intro:'Uma equipe levantou o contorno de um talhão com estação total, percorrendo a poligonal no sentido <b>anti-horário</b> e medindo os <b>ângulos horários da ré para a vante</b> (que, neste sentido, são os ângulos internos). Azimute de partida P1→P2 = <b>96°56\'30"</b>; coordenadas de P1: <b>E = 1000,000 m · N = 2000,000 m</b>. Desenho em mm (1 m = 1000).'+
   '<table class="aula-tab"><tr><th>Estação</th><th>Ângulo horário</th><th>Distância (m)</th></tr>'+PO_AULA.rows.map(function(r){ return '<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td></tr>'; }).join('')+'</table>',
  steps:[
   {t:'Camada da poligonal',i:'Crie a camada <b>Poligonal</b> e torne-a atual.',
    h:'No painel Camadas, <b>+ Nova</b> → Poligonal, e clique nela. Ou digite <code>-LAYER</code> Enter, <code>M</code> Enter, <code>Poligonal</code> Enter e Enter.',
    c:function(){ var l=getLy(S.curLy); return l&&/poligonal/i.test(l.nm)?{ok:true}:{ok:false,msg:'A camada atual é "'+(l?l.nm:'')+'". Crie a camada Poligonal e torne-a atual.'}; }},
   {t:'Calcular e desenhar a poligonal',i:'Na aba Educacional, clique em <b>Poligonal</b> e digite a caderneta. Confira se o erro angular e a precisão linear estão <b>dentro da tolerância</b> (60"·√n e 1:1000) e desenhe a poligonal <b>compensada</b>, na camada Poligonal.',
    h:'Medidas: <b>Ângulos horários</b>; azimute de partida <code>96°56\'30"</code>; E inicial 1000 e N inicial 2000. Digite uma estação por linha, por exemplo <code>P1 114°06\'00" 85,24</code>. O erro angular é distribuído igualmente entre os ângulos; o erro linear, proporcionalmente às distâncias.',
    c:function(){ var V=poAulaV(),PL=exModel().filter(function(e){ return e.tp==='pl'&&e.closed; });
      for(var i=0;i<PL.length;i++){ var Q=PL[i].pts; if(V.every(function(v){ return Q.some(function(q){ return poNear(q,v); }); })){
          if(!/poligonal/i.test(exLayerName(PL[i]))) return {ok:false,msg:'A poligonal está certa, mas não está na camada Poligonal. Selecione-a e troque a camada.'}; return {ok:true}; } }
      var open=exModel().filter(function(e){ return e.tp==='pl'&&!e.closed&&e.pts.length>=5; });
      if(open.length) return {ok:false,msg:'Encontrei uma poligonal aberta: desenhe a poligonal fechada e compensada (marque "Compensar erros").'};
      var R=poAulaR(); return {ok:false,msg:'Ainda não há uma polilinha fechada passando pelas coordenadas compensadas (ex.: P3 em E = '+poBR(R.pts[2].E,3)+' m). Confira a caderneta e o azimute de partida.'}; }},
   {t:'Marcos e nomes dos vértices',i:'Marque os cinco vértices com <b>pontos</b> e escreva os nomes <b>P1 a P5</b> junto de cada um.',
    h:'Na janela da Poligonal, deixe marcadas as opções "Marcos" e "Nomes dos vértices". Ou use <code>PO</code> e <code>DT</code>.',
    c:function(){ var V=poAulaV(),M=exModel(),pts=M.filter(function(e){return e.tp==='point';}),tx=M.filter(function(e){return e.tp==='txt'||e.tp==='mtext';});
      for(var i=0;i<V.length;i++){ var v=V[i]; if(!pts.some(function(p){ return poNear(p,v); })) return {ok:false,msg:'Falta o marco (ponto) do vértice '+v.id+'.'};
        if(!tx.some(function(t){ return String(t.txt).trim().toUpperCase()===v.id&&Math.hypot(t.x-v.x,t.y-v.y)<=10000; })) return {ok:false,msg:'Falta o nome "'+v.id+'" perto do vértice (até 10 m).'}; }
      return {ok:true}; }},
   {t:'Área do talhão',i:'Escreva no desenho a <b>área</b> do talhão, em m² (com duas casas) ou em hectares (com quatro casas).',
    h:'A área (fórmula de Gauss) aparece no resumo da janela e na linha de comando. Use <code>DT</code> e escreva, por exemplo, "Área = 0,8439 ha".',
    c:function(){ var A=poAulaR().area,N=poTxtNums(); if(N.some(function(o){ return Math.abs(o.v-A)<=0.01||Math.abs(o.v-A/1e4)<=0.00005; })) return {ok:true};
      return {ok:false,msg:'Não encontrei um texto com a área do talhão (em m² ou ha).'}; }},
   {t:'Quadro de coordenadas',i:'Coloque no desenho o <b>quadro de coordenadas</b> dos vértices (E e N em metros, com três casas).',
    h:'Marque "Quadro de coordenadas" na janela da Poligonal (ou desenhe a tabela com linhas e textos).',
    c:function(){ var R=poAulaR(),N=poTxtNums(); for(var i=0;i<R.pts.length;i++){ var p=R.pts[i];
        if(!N.some(function(o){ return Math.abs(o.v-p.E)<=0.0005; })) return {ok:false,msg:'No quadro, falta a coordenada E de '+p.id+' ('+poBR(p.E,3)+').'};
        if(!N.some(function(o){ return Math.abs(o.v-p.N)<=0.0005; })) return {ok:false,msg:'No quadro, falta a coordenada N de '+p.id+' ('+poBR(p.N,3)+').'}; }
      return {ok:true}; }}
  ]});
// modo Didático: sem medidas sobre as linhas da tabela do quadro de coordenadas
(function(){ var dd=drawDidactic; drawDidactic=function(ctx,e){ var l=getLy(e.ly); if(l&&l.nm==='Quadro') return; return dd.apply(this,arguments); }; })();
