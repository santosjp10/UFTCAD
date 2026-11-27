/* ═══════════════════════════════════════════════════════════════════
   v7.6 — LAYOUT, PACOTE L3: SAÍDA PROFISSIONAL
   • PDF VETORIAL gerado pelo próprio aplicativo, em escala exata (1 mm = 1 mm),
     uma página por layout, com estilos de plotagem e espessuras em mm.
   • Configurar página (PAGESETUP): folha de saída, área de plotagem
     (folha / área imprimível / janela), escala (1:1 ou ajustar), centralizar
     ou deslocar.
   • Anotação escalável: cotas, linhas de chamada e textos "anotativos" têm a
     mesma altura no papel em qualquer viewport (como o ANNOTATIVE / DIMSCALE 0).
   ═══════════════════════════════════════════════════════════════════ */
if(S.annoScale===undefined) S.annoScale=1;
function annoK(){ return S.annoK||(S.annoScale||1)*unitMm(); } // mm de papel por unidade do modelo

// ── anotação: textos anotativos usam a altura no papel ──────────────────────
function annoClone(e){ if(!e||!e.annot||(e.tp!=='txt'&&e.tp!=='mtext')) return e; var c=JSON.parse(JSON.stringify(e)),k=annoK(); c.h=e.h/k; if(e.tp==='mtext'&&e.w) c.w=e.w/k; c.annot=false; return c; }
(function(){ var d=drawE,h=hitEnt,b=bbox,p=entPrims;
  drawE=function(ctx,e,sel){ return d(ctx,annoClone(e),sel); };
  hitEnt=function(e,x,y){ return h(annoClone(e),x,y); };
  bbox=function(e){ return b(annoClone(e)); };
  entPrims=function(e){ return p(annoClone(e)); };
  var gf=geomFields;
  geomFields=function(e){ var F=gf(e);
    if(e.tp==='txt'||e.tp==='mtext') F.push({l:'Anotativo (altura no papel)',chk:1,v:!!e.annot,set:function(e,v){ var k=annoK(); if(v&&!e.annot){ e.h=e.h*k; if(e.w) e.w=e.w*k; } if(!v&&e.annot){ e.h=e.h/k; if(e.w) e.w=e.w/k; } e.annot=!!v; }});
    return F; };
})();
function annoScaleSet(r){ if(!(r>0)) return; S.annoScale=r; S.dirty=true; var s=document.getElementById('annoSel'); if(s) s.value=String(r); renderAll(); log('Escala de anotação do modelo: '+ratioLabel(r)+' (cotas e textos anotativos).','ok'); }

// ── configuração de página ──────────────────────────────────────────────────
function plotCfg(L){ L.plot=L.plot||{}; var p=L.plot; if(!p.area) p.area='paper'; if(p.center===undefined) p.center=true; if(!p.out) p.out='same'; if(p.fit===undefined) p.fit=false; if(p.ox===undefined){ p.ox=0; p.oy=0; } return p; }
function plotGeom(L){
  var p=plotCfg(L),land=L.paper.w>=L.paper.h,Wo,Ho;
  if(p.out==='same'||!NBR_FMT[p.out]){ Wo=L.paper.w; Ho=L.paper.h; } else { var f=NBR_FMT[p.out]; Wo=land?Math.max(f[0],f[1]):Math.min(f[0],f[1]); Ho=land?Math.min(f[0],f[1]):Math.max(f[0],f[1]); }
  var R=p.area==='margins'?printableRect(L):(p.area==='window'&&p.win)?p.win:{x:0,y:0,w:L.paper.w,h:L.paper.h};
  var sc=p.fit?Math.min(Wo/R.w,Ho/R.h):1;
  var ox=p.center?(Wo-R.w*sc)/2:p.ox,oy=p.center?(Ho-R.h*sc)/2:p.oy;
  return {Wo:Wo,Ho:Ho,R:R,sc:sc,ox:ox,oy:oy};
}
// Desenha um layout num contexto (canvas ou PDF): ppm = unidades do contexto por mm da folha de saída
function withLayout(L,fn){
  var sv={space:S.space,ents:S.ents,modelEnts:S.modelEnts,vp:S.vp,mspace:S.mspace,pp:S.paperPx,pr:S.printing};
  if(S.space==='model') S.modelEnts=S.ents;
  S.ents=(L.id===sv.space)?sv.ents:L.ents; S.space=L.id; S.mspace=null;
  try{ return fn(); } finally { S.space=sv.space; S.ents=sv.ents; S.modelEnts=sv.modelEnts; S.vp=sv.vp; S.mspace=sv.mspace; S.paperPx=sv.pp; S.printing=sv.pr; }
}
function renderPlot(ctx,L,ppm,Hpx){
  var G=plotGeom(L);
  S.vp={x:(G.ox-G.R.x*G.sc)*ppm,y:Hpx-(G.oy-G.R.y*G.sc)*ppm,sc:G.sc*ppm}; S.paperPx=ppm; S.printing=true;
  ctx.save();
  if(plotCfg(L).area!=='paper'){ var a=w2s(G.R.x,G.R.y+G.R.h),b=w2s(G.R.x+G.R.w,G.R.y); ctx.beginPath(); ctx.rect(a.x,a.y,b.x-a.x,b.y-a.y); ctx.clip(); }
  S.ents.forEach(function(e){ var ly=getLy(e.ly); if(ly&&!ly.vis) return; if(ly&&ly.plot===false&&e.tp!=='viewport') return; drawE(ctx,e,false); });
  ctx.restore();
  return G;
}

// ── PDF vetorial: contexto que grava operadores PDF ─────────────────────────
function PdfCtx(Hpt){ this.H=Hpt; this.out=[]; this.p=[]; this.st={lw:1,ss:'#000000',fs:'#000000',dash:[],font:'10px Courier',ta:'left',tb:'alphabetic',m:[1,0,0,1,0,0]}; this.stack=[]; this.cur=null; this.gs={}; }
(function(P){
  function num(v){ v=Math.round(v*1000)/1000; return (Object.is(v,-0)?0:v).toString(); }
  function col(c){ var m,r=0,g=0,b=0; c=String(c||'#000');
    if((m=/^#([0-9a-f]{6})/i.exec(c))){ var n=parseInt(m[1],16); r=n>>16&255; g=n>>8&255; b=n&255; }
    else if((m=/^#([0-9a-f]{3})$/i.exec(c))){ r=parseInt(m[1][0]+m[1][0],16); g=parseInt(m[1][1]+m[1][1],16); b=parseInt(m[1][2]+m[1][2],16); }
    else if((m=/rgba?\(([^)]+)\)/i.exec(c))){ var q=m[1].split(',').map(parseFloat); r=q[0]; g=q[1]; b=q[2]; }
    return num(r/255)+' '+num(g/255)+' '+num(b/255); }
  ['lineWidth:lw','strokeStyle:ss','fillStyle:fs','font:font','textAlign:ta','textBaseline:tb'].forEach(function(d){ var a=d.split(':');
    Object.defineProperty(P,a[0],{get:function(){return this.st[a[1]];},set:function(v){this.st[a[1]]=v;}}); });
  ['globalAlpha','shadowBlur','shadowColor','shadowOffsetX','shadowOffsetY','lineCap','lineJoin','globalCompositeOperation','miterLimit','lineDashOffset','imageSmoothingEnabled'].forEach(function(k){ Object.defineProperty(P,k,{get:function(){return this['_'+k];},set:function(v){this['_'+k]=v;}}); });
  P.tx=function(x,y){ var m=this.st.m; return {x:m[0]*x+m[2]*y+m[4],y:m[1]*x+m[3]*y+m[5]}; };
  P.pt=function(x,y){ var q=this.tx(x,y); return num(q.x)+' '+num(this.H-q.y); };
  P.save=function(){ this.stack.push(JSON.parse(JSON.stringify(this.st))); this.out.push('q'); this.gs={}; };
  P.restore=function(){ if(this.stack.length){ this.st=this.stack.pop(); this.out.push('Q'); this.gs={}; } };
  P.setTransform=function(a,b,c,d,e,f){ if(typeof a==='object'&&a){ this.st.m=[a.a,a.b,a.c,a.d,a.e,a.f]; return; } this.st.m=[a,b,c,d,e,f]; };
  P.resetTransform=function(){ this.st.m=[1,0,0,1,0,0]; };
  P.getTransform=function(){ var m=this.st.m; return {a:m[0],b:m[1],c:m[2],d:m[3],e:m[4],f:m[5]}; };
  P.transform=function(a,b,c,d,e,f){ var m=this.st.m; this.st.m=[m[0]*a+m[2]*b,m[1]*a+m[3]*b,m[0]*c+m[2]*d,m[1]*c+m[3]*d,m[0]*e+m[2]*f+m[4],m[1]*e+m[3]*f+m[5]]; };
  P.translate=function(x,y){ this.transform(1,0,0,1,x,y); };
  P.rotate=function(a){ var c=Math.cos(a),s=Math.sin(a); this.transform(c,s,-s,c,0,0); };
  P.scale=function(x,y){ this.transform(x,0,0,y,0,0); };
  P.setLineDash=function(d){ this.st.dash=(d||[]).slice(); }; P.getLineDash=function(){ return this.st.dash.slice(); };
  P.beginPath=function(){ this.p=[]; this.cur=null; };
  P.moveTo=function(x,y){ this.p.push(this.pt(x,y)+' m'); this.cur={x:x,y:y}; this.start={x:x,y:y}; };
  P.lineTo=function(x,y){ if(!this.cur) return this.moveTo(x,y); this.p.push(this.pt(x,y)+' l'); this.cur={x:x,y:y}; };
  P.closePath=function(){ if(this.p.length) this.p.push('h'); if(this.start) this.cur={x:this.start.x,y:this.start.y}; };
  P.bezierCurveTo=function(a,b,c,d,e,f){ if(!this.cur) this.moveTo(a,b); this.p.push(this.pt(a,b)+' '+this.pt(c,d)+' '+this.pt(e,f)+' c'); this.cur={x:e,y:f}; };
  P.quadraticCurveTo=function(a,b,e,f){ var c=this.cur||{x:a,y:b}; this.bezierCurveTo(c.x+2/3*(a-c.x),c.y+2/3*(b-c.y),e+2/3*(a-e),f+2/3*(b-f),e,f); };
  P.rect=function(x,y,w,h){ this.moveTo(x,y); this.lineTo(x+w,y); this.lineTo(x+w,y+h); this.lineTo(x,y+h); this.closePath(); };
  P.curve=function(F,D,a0,a1,acw){
    var sw=a1-a0,TWO=2*Math.PI;
    if(!acw){ if(sw>=TWO) sw=TWO; else { sw=sw%TWO; if(sw<0) sw+=TWO; } } else { if(-sw>=TWO) sw=-TWO; else { sw=sw%TWO; if(sw>0) sw-=TWO; } }
    var p0=F(a0); if(this.cur) this.lineTo(p0.x,p0.y); else this.moveTo(p0.x,p0.y);
    var n=Math.max(1,Math.ceil(Math.abs(sw)/(Math.PI/2)-1e-9)),d=sw/n;
    for(var i=0;i<n;i++){ var t1=a0+d*i,t2=t1+d,k=4/3*Math.tan(d/4),A=F(t1),B=F(t2),dA=D(t1),dB=D(t2);
      this.bezierCurveTo(A.x+k*dA.x,A.y+k*dA.y,B.x-k*dB.x,B.y-k*dB.y,B.x,B.y); }
  };
  P.arc=function(cx,cy,r,a0,a1,acw){ this.curve(function(t){return {x:cx+r*Math.cos(t),y:cy+r*Math.sin(t)};},function(t){return {x:-r*Math.sin(t),y:r*Math.cos(t)};},a0,a1,!!acw); };
  P.ellipse=function(cx,cy,rx,ry,rot,a0,a1,acw){ var c=Math.cos(rot),s=Math.sin(rot);
    this.curve(function(t){var x=rx*Math.cos(t),y=ry*Math.sin(t);return {x:cx+x*c-y*s,y:cy+x*s+y*c};},function(t){var x=-rx*Math.sin(t),y=ry*Math.cos(t);return {x:x*c-y*s,y:x*s+y*c};},a0,a1,!!acw); };
  P.state=function(stroke){ var s=this.st,o=[];
    var lw=num(s.lw||1),ds='['+(s.dash||[]).map(num).join(' ')+'] 0 d',sc=col(stroke?s.ss:s.fs);
    if(stroke){ if(this.gs.lw!==lw){ o.push(lw+' w'); this.gs.lw=lw; } if(this.gs.d!==ds){ o.push(ds); this.gs.d=ds; } if(this.gs.ss!==sc){ o.push(sc+' RG'); this.gs.ss=sc; } }
    else if(this.gs.fs!==sc){ o.push(sc+' rg'); this.gs.fs=sc; }
    if(o.length) this.out.push(o.join(' ')); };
  P.stroke=function(){ if(!this.p.length) return; this.state(true); this.out.push(this.p.join(' ')+' S'); };
  P.fill=function(rule){ if(!this.p.length) return; this.state(false); this.out.push(this.p.join(' ')+(rule==='evenodd'?' f*':' f')); };
  P.clip=function(rule){ if(!this.p.length) return; this.out.push(this.p.join(' ')+(rule==='evenodd'?' W* n':' W n')); };
  P.fillRect=function(x,y,w,h){ var sv=this.p,c=this.cur; this.p=[]; this.cur=null; this.rect(x,y,w,h); this.fill(); this.p=sv; this.cur=c; };
  P.strokeRect=function(x,y,w,h){ var sv=this.p,c=this.cur; this.p=[]; this.cur=null; this.rect(x,y,w,h); this.stroke(); this.p=sv; this.cur=c; };
  P.clearRect=function(){};
  P.drawImage=function(){};
  P.fsize=function(){ var m=/([\d.]+)px/.exec(this.st.font||''); return m?parseFloat(m[1]):10; };
  // v8.10: três fontes do PDF (Helvetica, Times, Courier), escolhidas pela família do texto
  P.pfont=function(){ var fam=String(this.st.font||'').replace(/^.*?px\s*/,''),pf=(typeof fontInfo==='function')?fontInfo(fam).pdf:'Courier';
    return pf==='Times-Roman'?{id:'F3',w:0.47}:pf==='Helvetica'?{id:'F2',w:0.53}:{id:'F1',w:0.6}; };
  P.measureText=function(t){ return {width:String(t).length*this.pfont().w*this.fsize()}; };
  P.fillText=function(t,x,y){
    t=String(t); if(!t) return; var pf=this.pfont(),sz=this.fsize(),w=t.length*pf.w*sz,ta=this.st.ta,tb=this.st.tb;
    var dx=ta==='center'?-w/2:(ta==='right'||ta==='end')?-w:0,dy=tb==='middle'?0.32*sz:tb==='top'||tb==='hanging'?0.78*sz:tb==='bottom'||tb==='ideographic'?-0.22*sz:0;
    var o=this.tx(x+dx,y+dy),u=this.tx(x+dx+1,y+dy),ux=u.x-o.x,uy=u.y-o.y,L=Math.hypot(ux,uy)||1,sc=L,c=ux/L,s=-uy/L;
    var esc='';
    for(var i=0;i<t.length;i++){ var ch=t[i]; if(ch==='⌀') ch='Ø'; var b=cp1252Byte(ch.charCodeAt(0)); if(b===undefined) b=63;
      var cc=String.fromCharCode(b); esc+=(cc==='('||cc===')'||cc==='\\')?'\\'+cc:cc; }
    this.state(false);
    this.out.push('BT /'+pf.id+' '+num(sz*sc)+' Tf '+num(c)+' '+num(s)+' '+num(-s)+' '+num(c)+' '+num(o.x)+' '+num(this.H-o.y)+' Tm ('+esc+') Tj ET');
  };
  P.strokeText=P.fillText;
})(PdfCtx.prototype);
function pdfAssemble(pages,title){
  var objs=[],kids=[],n=3;
  pages.forEach(function(pg){ kids.push(n+' 0 R'); n+=2; });
  var fontId=n,infoId=n+3;
  objs[1]='<< /Type /Catalog /Pages 2 0 R >>';
  objs[2]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+pages.length+' >>';
  pages.forEach(function(pg,i){ var po=3+2*i,co=po+1,content=pg.content;
    objs[po]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+pg.w.toFixed(3)+' '+pg.h.toFixed(3)+'] /Resources << /Font << /F1 '+fontId+' 0 R /F2 '+(fontId+1)+' 0 R /F3 '+(fontId+2)+' 0 R >> >> /Contents '+co+' 0 R >>';
    objs[co]='<< /Length '+content.length+' >>\nstream\n'+content+'\nendstream'; });
  objs[fontId]='<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>';
  objs[fontId+1]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objs[fontId+2]='<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>';
  function pstr(s){ return '('+String(s).replace(/[\\()]/g,'\\$&').replace(/[^\x20-\x7e]/g,function(c){var b=cp1252Byte(c.charCodeAt(0));return b===undefined?'?':String.fromCharCode(b);})+')'; }
  objs[infoId]='<< /Title '+pstr(title||'EduCAD')+' /Creator (EduCAD 2D) /Producer (EduCAD 2D v8.17) >>';
  var s='%PDF-1.4\n%\xe2\xe3\xcf\xd3\n',off=[];
  for(var i=1;i<objs.length;i++){ off[i]=s.length; s+=i+' 0 obj\n'+objs[i]+'\nendobj\n'; }
  var xref=s.length; s+='xref\n0 '+objs.length+'\n0000000000 65535 f \n';
  for(var j=1;j<objs.length;j++) s+=('0000000000'+off[j]).slice(-10)+' 00000 n \n';
  s+='trailer\n<< /Size '+objs.length+' /Root 1 0 R /Info '+infoId+' 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
  var u=new Uint8Array(s.length); for(var k=0;k<s.length;k++) u[k]=s.charCodeAt(k)&255; return u;
}
var PT_MM=72/25.4;
function buildPDF(layouts){
  var pages=layouts.map(function(L){ return withLayout(L,function(){ var G=plotGeom(L),H=G.Ho*PT_MM,ctx=new PdfCtx(H); renderPlot(ctx,L,PT_MM,H); return {w:G.Wo*PT_MM,h:H,content:ctx.out.join('\n')}; }); });
  return pdfAssemble(pages,layouts.length===1?layouts[0].name:(document.getElementById('ftitle').textContent||'EduCAD'));
}
function expPDF(all){
  if(!S.layouts.length){ ensureLayouts(); var nl=S.layouts[0]; nl._init=true; nl.ents.push(newViewport(printableRect(nl))); }
  var cur=curLayout()||S.layouts.filter(function(l){return l.id===S.lastLayout;})[0]||S.layouts[0];
  if(S.space!=='model') spaceSave();
  var list=all?S.layouts.slice():[cur];
  var bytes=buildPDF(list),base=(all?dxfBaseName():(cur.name||'layout')).replace(/[\\/:*?"<>|]+/g,'_');
  downloadBlob(bytes,'application/pdf',base+'.pdf');
  log('PDF vetorial gerado: '+list.length+' página(s) — '+list.map(function(L){var G=plotGeom(L);return L.name+' '+Math.round(G.Wo)+'×'+Math.round(G.Ho)+' mm'+(G.sc!==1?' (ajustado '+Math.round(G.sc*100)+'%)':' (1:1)');}).join('; ')+'. Para imprimir em escala, use "Tamanho real / 100%".','ok');
  return bytes;
}

// ── diálogo Configurar página (PAGESETUP) ───────────────────────────────────
function pageSetupOpen(){
  var L=curLayout(); if(!L){ log('Configurar página: abra um layout.','er'); return; }
  var p=plotCfg(L),d=document.getElementById('ov-pagesetup');
  document.getElementById('ps-name').textContent=L.name+' — '+L.fmt+' '+(L.paper.w>=L.paper.h?'paisagem':'retrato');
  document.getElementById('ps-out').value=p.out; document.getElementById('ps-area').value=p.area;
  document.getElementById('ps-fit').value=p.fit?'fit':'1';
  document.getElementById('ps-center').checked=!!p.center; document.getElementById('ps-ox').value=p.ox; document.getElementById('ps-oy').value=p.oy;
  document.getElementById('ps-plot').value=L.plotStyle; pageSetupInfo(); d.classList.add('show');
}
function pageSetupRead(){ var L=curLayout(),p=plotCfg(L);
  p.out=document.getElementById('ps-out').value; p.area=document.getElementById('ps-area').value;
  if(p.area==='window'&&!p.win) p.area='paper';
  p.fit=document.getElementById('ps-fit').value==='fit'; p.center=document.getElementById('ps-center').checked;
  p.ox=parseFloat(document.getElementById('ps-ox').value)||0; p.oy=parseFloat(document.getElementById('ps-oy').value)||0;
  L.plotStyle=document.getElementById('ps-plot').value; S.dirty=true; }
function pageSetupInfo(){ var L=curLayout(); if(!L) return; var p=plotCfg(L),save=JSON.stringify(p); pageSetupRead(); var G=plotGeom(L);
  document.getElementById('ps-info').textContent='Saída: '+Math.round(G.Wo)+'×'+Math.round(G.Ho)+' mm · área '+Math.round(G.R.w)+'×'+Math.round(G.R.h)+' mm · escala de plotagem '+(G.sc===1?'1:1 (tamanho real)':Math.round(G.sc*1000)/10+'% (ajustada)')+' · origem '+(Math.round(G.ox*10)/10)+', '+(Math.round(G.oy*10)/10)+' mm';
  document.getElementById('ps-ox').disabled=document.getElementById('ps-center').checked; document.getElementById('ps-oy').disabled=document.getElementById('ps-center').checked;
  document.getElementById('ps-win').textContent=p.win?'Janela: '+Math.round(p.win.w)+'×'+Math.round(p.win.h)+' mm':'(nenhuma janela escolhida)'; }
function pageSetupOK(){ pageSetupRead(); closeOv('ov-pagesetup'); syncLayoutPanel(); renderAll(); log('Página configurada.','ok'); }
function pageSetupWindow(){ pageSetupRead(); closeOv('ov-pagesetup'); setTool('plotwin'); }
NC.plotwin={init:function(ds){ ds.phase='p1'; },prompt:function(ds){ return ds.phase==='p1'?'Janela de plotagem: especifique o primeiro canto:':'Especifique o canto oposto:'; },
  click:function(ds,pt){ if(ds.phase==='p1'){ ds.a={x:pt.x,y:pt.y}; ds.pts=[ds.a]; ds.phase='p2'; return; }
    var L=curLayout(),p=plotCfg(L); p.win={x:Math.min(ds.a.x,pt.x),y:Math.min(ds.a.y,pt.y),w:Math.abs(pt.x-ds.a.x),h:Math.abs(pt.y-ds.a.y)}; p.area='window'; S.dirty=true; ncEnd(); pageSetupOpen(); },
  input:function(ds,u,raw){ if(u===''){ ncEnd(); pageSetupOpen(); return true; } var p=parseCoord(raw); if(!p) return false; this.click(ds,p); return true; },
  preview:function(ctx,ds,hp){ if(ds.phase!=='p2') return; var a=w2s(ds.a.x,ds.a.y),b=w2s(hp.x,hp.y); ctx.save(); ctx.setLineDash([5,4]); ctx.strokeStyle='#e85050'; ctx.strokeRect(Math.min(a.x,b.x),Math.min(a.y,b.y),Math.abs(a.x-b.x),Math.abs(a.y-b.y)); ctx.restore(); }};
function drawPlotArea(){ // tracejado vermelho da área de plotagem (quando não é a folha inteira)
  var L=curLayout(); if(!L||S.space==='model') return; var p=plotCfg(L); if(p.area==='paper') return; var G=plotGeom(L),ctx=S.gG,a=w2s(G.R.x,G.R.y+G.R.h),b=w2s(G.R.x+G.R.w,G.R.y);
  ctx.save(); ctx.setLineDash([8,4]); ctx.strokeStyle='#e85050'; ctx.lineWidth=1; ctx.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y); ctx.restore(); }
(function(){ var dg=drawGrid; drawGrid=function(){ dg(); if(S.space!=='model') drawPlotArea(); }; })();

window.addEventListener('load',function(){
  // diálogo PAGESETUP
  var ov=document.createElement('div'); ov.className='ov'; ov.id='ov-pagesetup';
  var fmts=['same','A4','A3','A2','A1','A0'].map(function(k){return '<option value="'+k+'">'+(k==='same'?'Mesma do layout':k+' ('+NBR_FMT[k][0]+'×'+NBR_FMT[k][1]+')')+'</option>';}).join('');
  ov.innerHTML='<div class="modal" style="min-width:420px;max-width:94vw"><h3>Configurar página <span style="font-size:10px;color:var(--t2);font-weight:normal" id="ps-name"></span></h3>'+
    '<div class="ps-grid"><label>Folha de saída</label><select id="ps-out">'+fmts+'</select>'+
    '<label>Área de plotagem</label><span style="display:flex;gap:6px;align-items:center"><select id="ps-area"><option value="paper">Folha inteira</option><option value="margins">Área imprimível (margens)</option><option value="window">Janela</option></select><button class="btn s" id="ps-winbtn" type="button">Escolher janela…</button></span>'+
    '<label></label><span id="ps-win" style="font-size:9px;color:var(--t2)"></span>'+
    '<label>Escala de plotagem</label><select id="ps-fit"><option value="1">1:1 (tamanho real)</option><option value="fit">Ajustar à folha de saída</option></select>'+
    '<label>Deslocamento</label><span style="display:flex;gap:6px;align-items:center"><label style="display:flex;gap:4px;align-items:center;margin:0"><input type="checkbox" id="ps-center" style="width:auto;margin:0"> Centralizar</label> X <input id="ps-ox" style="width:60px;margin:0"> Y <input id="ps-oy" style="width:60px;margin:0"> mm</span>'+
    '<label>Estilo de plotagem</label><select id="ps-plot"><option value="mono">Monocromático</option><option value="color">Colorido</option><option value="gray">Tons de cinza</option></select></div>'+
    '<div class="ef-note" style="display:block" id="ps-info"></div>'+
    '<div class="mact"><button class="btn s" type="button" onclick="closeOv(\'ov-pagesetup\')">Cancelar</button><button class="btn s" type="button" id="ps-pdf">📄 Gerar PDF</button><button class="btn p" type="button" onclick="pageSetupOK()">OK</button></div></div>';
  document.body.appendChild(ov);
  ['ps-out','ps-area','ps-fit','ps-center','ps-ox','ps-oy','ps-plot'].forEach(function(id){ document.getElementById(id).addEventListener('change',pageSetupInfo); });
  document.getElementById('ps-winbtn').addEventListener('click',pageSetupWindow);
  document.getElementById('ps-pdf').addEventListener('click',function(){ pageSetupOK(); expPDF(false); });
  // botões na barra do layout
  var pr=Array.prototype.filter.call(document.querySelectorAll('#layoutControls .lc-btn'),function(b){return /Imprimir/.test(b.textContent);})[0];
  if(pr){ var pg=document.createElement('button'); pg.className='lc-btn'; pg.textContent='⚙ Página'; pg.title='Configurar página — PAGESETUP (ou PLOT)'; pg.setAttribute('data-cmd','PAGESETUP'); pg.onclick=function(){ pageSetupOpen(); }; pr.parentNode.insertBefore(pg,pr);
    var pd=document.createElement('button'); pd.className='lc-btn primary'; pd.textContent='📄 PDF'; pd.title='PDF vetorial em escala exata deste layout — PDF (Shift+clique: todos os layouts)'; pd.setAttribute('data-cmd','PDF'); pd.onclick=function(ev){ expPDF(!!ev.shiftKey); }; pr.parentNode.insertBefore(pd,pr);
    pr.classList.remove('primary'); }
  // escala de anotação do modelo (barra de status)
  var st=document.getElementById('stool'); if(st&&st.parentNode){ var wrap=document.createElement('span'); wrap.className='anno-wrap'; wrap.title='Escala de anotação do modelo: tamanho das cotas e textos anotativos no Model';
    wrap.innerHTML='Anotação '; var s=document.createElement('select'); s.id='annoSel'; VP_SCALES.forEach(function(q){ var o=document.createElement('option'); o.value=String(q[1]); o.textContent=q[0]; s.appendChild(o); }); s.value=String(S.annoScale);
    s.addEventListener('change',function(){ annoScaleSet(parseFloat(s.value)); }); wrap.appendChild(s); var sb=st.parentNode; sb.appendChild(wrap); }
  // opção PDF no diálogo Exportar
  var ef=document.getElementById('ef'); if(ef&&!ef.querySelector('option[value="pdf"]')){ var o=document.createElement('option'); o.value='pdf'; o.textContent='PDF vetorial — layout atual, escala exata'; ef.insertBefore(o,ef.firstChild); var o2=document.createElement('option'); o2.value='pdfall'; o2.textContent='PDF vetorial — todos os layouts'; ef.insertBefore(o2,o.nextSibling); }
  if(typeof EXP_NOTES==='object'){ EXP_NOTES.pdf='PDF vetorial gerado pelo EduCAD, em escala exata (imprima em "Tamanho real / 100%"). Usa a configuração de página e o estilo de plotagem do layout.'; EXP_NOTES.pdfall='Um PDF com uma página por layout, cada uma no seu tamanho de folha.'; }
});

// ── DXF: layouts com viewports e objetos do papel ───────────────────────────
function dxfPaperLayouts(){
  var used={};
  return S.layouts.map(function(L){
    var ents=(S._curPaper&&S._curPaper.id===L.id)?S._curPaper.ents:L.ents,nm=dxfSymName(L.name)||'Layout',b=nm,i=2;
    while(used[nm.toUpperCase()]||nm.toUpperCase()==='MODEL') nm=b+'_'+(i++); used[nm.toUpperCase()]=1;
    return {name:nm,fmt:L.fmt,paper:L.paper,vps:ents.filter(function(e){return e.tp==='viewport';}),ents:flattenEnts(ents.filter(function(e){return e.tp!=='viewport';})).map(annoClone)};
  });
}
