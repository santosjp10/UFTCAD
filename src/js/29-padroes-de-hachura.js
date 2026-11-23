/* ═══════════════════════════════════════════════════════════════════
   v8.2 — CATÁLOGO DE PADRÕES DE HACHURA
   Motor genérico no formato das famílias de linhas do AutoCAD (.pat):
     ângulo, origem (x0,y0), deslocamento entre linhas (dx ao longo, dy perpendicular),
     traços (positivo = traço, negativo = espaço, 0 = ponto).
   Cada padrão é definido numa unidade "u"; o tamanho escolhido pelo usuário (mm)
   multiplica a definição por tamanho/u. A rotação soma ao ângulo de cada família.
   Os mesmos segmentos alimentam tela, Layout, PDF, SVG e DXF (HATCH nativo com
   as linhas do padrão, como exige o formato).
   ═══════════════════════════════════════════════════════════════════ */
// Família por vetores de rede (garante que o padrão "feche" ao se repetir):
// V = vetor da rede ao longo do traço, T = outro vetor da rede, o = origem, d = traços (soma = |V|)
function hpLat(V,T,o,dash){ var L=Math.hypot(V[0],V[1]),dx=V[0]/L,dy=V[1]/L; return [Math.atan2(V[1],V[0])*180/Math.PI,o[0],o[1],T[0]*dx+T[1]*dy,-T[0]*dy+T[1]*dx].concat(dash); }
var H3=Math.sqrt(3)/2;
var HPAT=[
 // grupo, id, nome, u (unidade da definição), tamanho padrão (mm), nome no AutoCAD (ou ''), famílias
 ['Gerais','ANSI31','Linhas 45° (uso geral, ferro fundido)',.125,3.175,'ANSI31',[[45,0,0,0,.125]]],
 ['Gerais','LINE','Linhas horizontais',.125,3.175,'LINE',[[0,0,0,0,.125]]],
 ['Gerais','NET','Malha quadrada',.125,3.175,'NET',[[0,0,0,0,.125],[90,0,0,0,.125]]],
 ['Gerais','ANSI37','Malha 45° (chumbo, zinco, isolante)',.125,3.175,'ANSI37',[[45,0,0,0,.125],[135,0,0,0,.125]]],
 ['Gerais','SQUARE','Quadrados tracejados',.125,3.175,'SQUARE',[[0,0,0,0,.125,.125,-.125],[90,0,0,0,.125,.125,-.125]]],
 ['Gerais','DOTS','Pontos',.0625,1.5875,'DOTS',[[0,0,0,.03125,.0625,0,-.0625]]],
 ['Gerais','CROSS','Cruzes',.25,6.35,'CROSS',[[0,0,0,.25,.25,.125,-.375],[90,.0625,-.0625,.25,.25,.125,-.375]]],
 ['Gerais','HONEY','Colmeia (hexágonos)',.1875,4.7625,'HONEY',[[0,0,0,.1875,.108253175,.125,-.25],[120,0,0,.1875,.108253175,.125,-.25],[60,0,0,.1875,.108253175,-.25,.125]]],
 ['Gerais','SOLID','Sólido (preenchimento)',1,1,'SOLID',[]],
 ['Materiais (ANSI)','ANSI32','Aço',.375,9.525,'ANSI32',[[45,0,0,0,.375],[45,.176776695,0,0,.375]]],
 ['Materiais (ANSI)','ANSI33','Bronze, latão, cobre',.25,6.35,'ANSI33',[[45,0,0,0,.25],[45,.176776695,0,0,.25,.125,-.0625]]],
 ['Materiais (ANSI)','ANSI34','Plástico, borracha',.75,19.05,'ANSI34',[[45,0,0,0,.75],[45,.176776695,0,0,.75],[45,.353553391,0,0,.75],[45,.530330086,0,0,.75]]],
 ['Materiais (ANSI)','ANSI35','Tijolo refratário',.25,6.35,'ANSI35',[[45,0,0,0,.25],[45,.176776695,0,0,.25,.3125,-.0625,0,-.0625]]],
 ['Materiais (ANSI)','ANSI36','Mármore, ardósia, vidro',.125,3.175,'ANSI36',[[45,0,0,.21875,.125,.3125,-.0625,0,-.0625]]],
 ['Materiais (ANSI)','ANSI38','Alumínio',.125,3.175,'ANSI38',[[45,0,0,0,.125],[135,0,0,.25,.125,.3125,-.1875]]],
 ['Construção','EDU_CONCRETO','Concreto',1,6,'',[[0,0,0,.37,.61,0,-.83,0,-.6],[0,.21,.3,.53,.67,0,-1.21],hpLat([1,0],[.5,.62],[.1,.15],[.12,-.88]),hpLat([.5,.62],[1,0],[.18,.4],[.11,-.686]),hpLat([-.5,.62],[1,0],[.62,.08],[.1,-.696])]],
 ['Construção','SACNCR','Concreto (pontos e linhas)',.09375,2.38125,'SACNCR',[[45,0,0,0,.09375],[45,.066291261,0,0,.09375,0,-.09375]]],
 ['Construção','BRICK','Tijolo / alvenaria',.25,6.35,'BRICK',[[0,0,0,0,.25],[90,0,0,.25,.25,.25,-.25],[90,.25,0,.25,.25,-.25,.25]]],
 ['Construção','EDU_MADEIRA','Madeira (corte longitudinal)',1,3,'',[[0,0,0,1.3,.35,2.6,-.4,1.1,-.3],[0,.6,.18,1.9,.35,.9,-.5]]],
 ['Construção','EDU_VIDRO','Vidro / translúcido',1,6,'',[[45,0,0,0,1,.55,-.45],[45,.04,.09,0,1,.4,-.6],[45,.08,.18,0,1,.25,-.75]]],
 ['Solos e terreno','EARTH','Terra / solo natural',.25,6.35,'EARTH',[[0,0,0,.25,.25,.25,-.25],[0,0,.09375,.25,.25,.25,-.25],[0,0,.1875,.25,.25,.25,-.25],[90,.03125,.21875,.25,.25,.25,-.25],[90,.125,.21875,.25,.25,.25,-.25],[90,.21875,.21875,.25,.25,.25,-.25]]],
 ['Solos e terreno','EDU_COMPACTADO','Solo compactado / aterro',1,5,'',[[45,0,0,0,1],[45,.354,0,0,1,0,-.3]]],
 ['Solos e terreno','EDU_AREIA','Areia',1,3,'',[[0,0,0,.41,.53,0,-.79,0,-1.27],[0,.27,.19,.61,.47,0,-1.13],[60,.13,.41,.83,.71,0,-1.37]]],
 ['Solos e terreno','EDU_BRITA','Brita / cascalho',1,4,'',[hpLat([1,0],[.5,H3],[0,0],[.35,-.65]),hpLat([.5,H3],[1,0],[0,0],[.35,-.65]),hpLat([-.5,H3],[1,0],[.35,0],[.35,-.65]),hpLat([1,0],[.5,H3],[.62,.48],[0,-1])]],
 ['Solos e terreno','EDU_ROCHA','Rocha',1,8,'',[[30,0,0,1.6,1.1,1.4,-.9],[100,.4,0,1.7,1.3,1,-1.3],[160,.2,.6,1.5,1.2,.9,-1.2]]],
 ['Solos e terreno','EDU_AGUA','Água / líquido',1,4,'',[[0,0,0,.7,.55,1.4,-.6,.6,-1.4],[0,.35,.27,1.1,.55,.5,-2.5]]],
 ['Vegetação e cultivo','GRASS','Grama / pastagem',1,25.4,'GRASS',[[90,0,0,.707106781,.707106781,.1875,-1.226713563],[45,0,0,0,1,.1875,-.8125],[135,0,0,0,1,.1875,-.8125]]],
 ['Vegetação e cultivo','EDU_SOLO_VEG','Solo vegetal (terra com cobertura)',1,8,'',[[0,0,0,.5,.5,.32,-.68],hpLat([.3,.6],[1,0],[.25,.25],[.12,-.551]),hpLat([-.3,.6],[1,0],[.25,.25],[.12,-.551])]],
 ['Vegetação e cultivo','EDU_CULTIVO','Lavoura em linhas (plantio)',1,8,'',[hpLat([.3,.6],[.6,0],[0,0],[.2,-.4708]),hpLat([-.3,.6],[.6,0],[0,0],[.2,-.4708])]],
 ['Vegetação e cultivo','EDU_MATA','Mata / vegetação densa',1,10,'',[hpLat([1,0],[.5,.8],[0,0],[0,-.15,.3,-.55]),hpLat([.25,.4],[1,0],[0,0],[.18,-.2917]),hpLat([-.25,.4],[1,0],[.3,0],[.18,-.2917])]]
];
var HPAT_BY={}; HPAT.forEach(function(p){ HPAT_BY[p[1]]={grp:p[0],id:p[1],name:p[2],u:p[3],size:p[4],acad:p[5],fam:p[6]}; });
var HPAT_OLD=[['lines','Linhas'],['cross','Grade'],['dots','Pontos (antigo)'],['zigzag','Zigue-zague / vegetal'],['dashed','Tracejado']];
function hpIsPat(e){ return e&&e.htype==='pat'&&(HPAT_BY[e.pname]||e.pdef); }
function hpName(e){ if(e.htype==='pat') return e.pdef&&!HPAT_BY[e.pname]?(e.pname||'Importado'):(HPAT_BY[e.pname]||{}).name; var o=HPAT_OLD.filter(function(x){return x[0]===(e.htype||'lines');})[0]; return o?o[1]:'Linhas'; }

// Famílias do padrão em coordenadas do mundo (ângulo em radianos, origem, deslocamento e traços em mm)
function hpFamilies(e,z){
  z=z||1; var out=[],rot=(e.ang||0)*Math.PI/180;
  if(e.pdef){ e.pdef.forEach(function(f){ var a=f.a+rot,c=Math.cos(rot),s=Math.sin(rot),k=(e.sp||1)*z;
      out.push({a:a,ox:(f.ox*c-f.oy*s)*k,oy:(f.ox*s+f.oy*c)*k,dx:f.dx*k,dy:f.dy*k,d:f.d.map(function(x){return x*k;})}); }); return out; }
  var P=HPAT_BY[e.pname]; if(!P) return out;
  var k=(e.sp||P.size)/P.u*z;
  P.fam.forEach(function(f){ var a=f[0]*Math.PI/180+rot,c=Math.cos(rot),s=Math.sin(rot);
    out.push({a:a,ox:(f[1]*c-f[2]*s)*k,oy:(f[1]*s+f[2]*c)*k,dx:f[3]*k,dy:f[4]*k,d:f.slice(5).map(function(x){return x*k;})}); });
  return out;
}
// Segmentos e pontos do padrão, recortados pelos laços (regra par/ímpar). lim = máximo de linhas por família
function hpGeometry(loops,fams,lim){
  var segs=[],dots=[],B=hatchLoopsBox(loops),C=[{x:B.x,y:B.y},{x:B.x+B.w,y:B.y},{x:B.x,y:B.y+B.h},{x:B.x+B.w,y:B.y+B.h}],dense=false;
  fams.forEach(function(F){
    var d={x:Math.cos(F.a),y:Math.sin(F.a)},n={x:-d.y,y:d.x},dy=F.dy; if(Math.abs(dy)<1e-12) return;
    var t=C.map(function(q){return (q.x-F.ox)*n.x+(q.y-F.oy)*n.y;}),i0=Math.ceil(Math.min.apply(null,t)/dy),i1=Math.floor(Math.max.apply(null,t)/dy);
    if(i0>i1){ var tt=i0; i0=i1; i1=tt; i0=Math.ceil(Math.max.apply(null,t)/dy); i1=Math.floor(Math.min.apply(null,t)/dy); if(i0>i1){ tt=i0;i0=i1;i1=tt; } }
    if(i1-i0>(lim||5000)){ dense=true; return; }
    var P=F.d.reduce(function(s,x){return s+Math.abs(x);},0);
    for(var i=i0;i<=i1;i++){
      var p0={x:F.ox+i*(F.dx*d.x+F.dy*n.x),y:F.oy+i*(F.dx*d.y+F.dy*n.y)},ts=[];
      loops.forEach(function(L){ for(var j=0;j<L.length;j++){ var a=L[j],b=L[(j+1)%L.length],ex=b.x-a.x,ey=b.y-a.y,den=d.x*ey-d.y*ex; if(Math.abs(den)<1e-14) continue;
        var ax=a.x-p0.x,ay=a.y-p0.y,tp=(ax*ey-ay*ex)/den,u=(ax*d.y-ay*d.x)/den; if(u>=0&&u<1) ts.push(tp); } });
      if(ts.length<2) continue; ts.sort(function(x,y){return x-y;});
      for(var m=0;m+1<ts.length;m+=2){ var u0=ts[m],u1=ts[m+1]; if(u1-u0<1e-9) continue;
        if(!F.d.length||P<1e-12){ segs.push([p0.x+d.x*u0,p0.y+d.y*u0,p0.x+d.x*u1,p0.y+d.y*u1]); continue; }
        var kk=Math.floor(u0/P)-1,guard=0;
        for(var s0=kk*P;s0<u1&&guard<100000;s0+=P,guard++){ var s=s0;
          for(var q=0;q<F.d.length;q++){ var len=F.d[q];
            if(len>0){ var a1=Math.max(s,u0),b1=Math.min(s+len,u1); if(b1-a1>1e-9) segs.push([p0.x+d.x*a1,p0.y+d.y*a1,p0.x+d.x*b1,p0.y+d.y*b1]); s+=len; }
            else if(len===0){ if(s>=u0&&s<=u1) dots.push({x:p0.x+d.x*s,y:p0.y+d.y*s}); }
            else s+=-len; } } }
    }
  });
  return {segs:segs,dots:dots,dense:dense};
}
var HP_CACHE=typeof WeakMap!=='undefined'?new WeakMap():null;
function hpStamp(e,z){ var L=e.loops[0]||[],p=L[0]||{x:0,y:0}; return [e.pname,e.sp,e.ang,z,e.x,e.y,e.w,e.h,e.loops.length,L.length,p.x,p.y,!!e.pdef].join('|'); }
function hpCached(e,z){ var st=hpStamp(e,z),c=HP_CACHE&&HP_CACHE.get(e); if(c&&c.st===st) return c.g;
  var g=hpGeometry(e.loops,hpFamilies(e,z),4000); if(HP_CACHE) HP_CACHE.set(e,{st:st,g:g}); return g; }
// menor espaçamento entre linhas do padrão (mm), para não desenhar padrões densos demais na tela
function hpMinStep(e){ var m=Infinity; hpFamilies(e,1).forEach(function(f){ if(Math.abs(f.dy)>1e-12) m=Math.min(m,Math.abs(f.dy)); }); return m; }

// ── desenho (tela, Layout, PDF) ─────────────────────────────────────────────
(function(){ var d0=drawHatchLoops;
  drawHatchLoops=function(ctx,e,map,sc,col){
    if(!(e.htype==='pat'&&(HPAT_BY[e.pname]||e.pdef))) return d0(ctx,e,map,sc,col);
    ctx.save(); ctx.beginPath();
    e.loops.forEach(function(L){ L.forEach(function(p,i){ var q=map(p.x,p.y); if(i) ctx.lineTo(q.x,q.y); else ctx.moveTo(q.x,q.y); }); ctx.closePath(); });
    ctx.fillStyle=col; ctx.strokeStyle=col; ctx.setLineDash([]);
    if(e.pname==='SOLID'&&!e.pdef){ ctx.fill('evenodd'); ctx.restore(); return; }
    ctx.clip('evenodd');
    var z=1,st=hpMinStep(e); if(!S.printing&&st*sc<2.5) z=Math.ceil(2.5/(st*sc));
    var G=hpCached(e,z);
    ctx.lineWidth=(S.printing&&S.paperPx)?Math.max(.5,.18*S.paperPx):.8;
    ctx.beginPath(); G.segs.forEach(function(s){ var a=map(s[0],s[1]),b=map(s[2],s[3]); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); }); ctx.stroke();
    var r=(S.printing&&S.paperPx)?Math.max(.6,.25*S.paperPx):.8; G.dots.forEach(function(p){ var q=map(p.x,p.y); ctx.fillRect(q.x-r,q.y-r,2*r,2*r); });
    ctx.restore();
  };
})();
// ── primitivas (SVG, DXF explodido, R12) ────────────────────────────────────
(function(){ var p0=entPrims;
  entPrims=function(e){
    if(!(e.tp==='hatch'&&e.loops&&e.htype==='pat'&&(HPAT_BY[e.pname]||e.pdef))) return p0(e);
    if(e.pname==='SOLID'&&!e.pdef) return [{k:'fillpath',loops:e.loops}];
    var G=hpGeometry(e.loops,hpFamilies(e,1),20000);
    return G.segs.map(function(s){return {k:'line',x1:s[0],y1:s[1],x2:s[2],y2:s[3]};}).concat(G.dots.map(function(p){return {k:'point',x:p.x,y:p.y};}));
  };
})();
// ── transformações: ângulo do padrão acompanha ROTATE/MIRROR ────────────────
(function(){ var x0=xformE;
  xformE=function(e,fn,info){
    if(!(e.tp==='hatch'&&e.htype==='pat')) return x0(e,fn,info);
    var a=e.ang||0,sp=e.sp; x0(e,fn,info);
    if(info.kind==='rot') e.ang=((a+info.rad*180/Math.PI)%360+360)%360;
    else if(info.kind==='mir') e.ang=((2*info.axisAng*180/Math.PI-a)%360+360)%360;
    else { e.ang=a; e.sp=(sp||(HPAT_BY[e.pname]||{size:1}).size)*info.f; }
  };
})();
// ── painel de propriedades: padrão, rotação e tamanho ───────────────────────
function hpOptions(){ return HPAT_OLD.map(function(o){return o[1];}).concat(HPAT.map(function(p){return p[2];})); }
function hpSetByName(e,v){
  var old=HPAT_OLD.filter(function(o){return o[1]===v;})[0],P=HPAT.filter(function(p){return p[2]===v;})[0];
  var oldDef=e.htype==='pat'&&HPAT_BY[e.pname]?HPAT_BY[e.pname].size:5,f=(e.sp||oldDef)/oldDef;
  if(old){ if(e.htype==='pat'){ e.ang=45; } e.htype=old[0]; delete e.pname; delete e.pdef; e.sp=5*f; }
  else if(P){ if(e.htype!=='pat') e.ang=0; e.htype='pat'; e.pname=P[1]; delete e.pdef; e.sp=P[4]*f; }
  else return false;
}
(function(){ var g0=geomFields;
  geomFields=function(e){
    var F=g0(e); if(!(e.tp==='hatch'&&e.loops)) return F;
    var pat=e.htype==='pat';
    F.forEach(function(f){ if(f.k==='ang'&&pat) f.l='Rotação do padrão (°)'; if(f.k==='sp') f.l=pat?'Tamanho do padrão (mm)':'Espaçamento (mm)'; });
    F.unshift({l:'Padrão',sel:hpOptions(),v:hpName(e),set:hpSetByName});
    return F;
  };
})();
// ── diálogo: galeria com miniaturas ─────────────────────────────────────────
function hpThumb(cv,val){
  var parts=val.split('|'),t=parts[0],W=cv.width,H=cv.height,ctx=cv.getContext('2d');
  ctx.fillStyle='#0a0a1a'; ctx.fillRect(0,0,W,H);
  var e={tp:'hatch',loops:[[{x:0,y:0},{x:W,y:0},{x:W,y:H},{x:0,y:H}]],ang:parseFloat(parts[1])||0,sp:parseFloat(parts[2])||5};
  if(t.indexOf('pat:')===0){ e.htype='pat'; e.pname=t.slice(4); var P=HPAT_BY[e.pname]; e.sp=P.size;
    var mn=Infinity,mx=0; hpFamilies(e,1).forEach(function(q){ var v=Math.abs(q.dy); if(v>1e-12){ mn=Math.min(mn,v); mx=Math.max(mx,v); } });
    if(isFinite(mn)) e.sp=P.size*Math.max(4/mn,Math.min(16/mx,9/mn)); /* miniatura legível, com várias repetições */ }
  else { e.htype=t; e.sp=Math.max(4,e.sp*1.2); }
  hatchSync(e); var sv=S.printing; S.printing=false;
  try{ drawHatchLoops(ctx,e,function(x,y){return {x:x,y:H-y};},1,'#c8d4ec'); } finally { S.printing=sv; }
}
function hpBuildDialog(){
  var sel=document.getElementById('hpat-sel'); if(!sel||document.getElementById('hpat-gal')) return;
  // lista completa no seletor (compatível com versões anteriores)
  HPAT.forEach(function(p){ var o=document.createElement('option'); o.value='pat:'+p[1]+'|0|'+p[4]; o.textContent=p[2]+(p[5]?' ('+p[5]+')':''); sel.appendChild(o); });
  var gal=document.createElement('div'); gal.id='hpat-gal';
  var groups=[['Básicos (anteriores)',Array.prototype.map.call(sel.options,function(o){return o;}).filter(function(o){return o.value.indexOf('pat:')!==0;})]];
  var gnames=[]; HPAT.forEach(function(p){ if(gnames.indexOf(p[0])<0) gnames.push(p[0]); });
  gnames.forEach(function(g){ groups.push([g,Array.prototype.filter.call(sel.options,function(o){ var id=o.value.indexOf('pat:')===0?o.value.slice(4).split('|')[0]:null; return id&&HPAT_BY[id].grp===g; })]); });
  groups.forEach(function(G){
    var h=document.createElement('div'); h.className='hpat-grp'; h.textContent=G[0]; gal.appendChild(h);
    var row=document.createElement('div'); row.className='hpat-row';
    G[1].filter(function(o){ return !/^pat:(LINE|DOTS)\|/.test(o.value); }).forEach(function(o){ var it=document.createElement('div'); it.className='hpat-it'; it.title=o.textContent; it.setAttribute('data-v',o.value);
      var cv=document.createElement('canvas'); cv.width=64; cv.height=44; it.appendChild(cv);
      var lb=document.createElement('span'); lb.textContent=o.textContent.replace(/\s*\([A-Z0-9_]+\)$/,''); it.appendChild(lb);
      it.addEventListener('click',function(){ sel.value=o.value; hpUpdate(); hpMark(); });
      it.addEventListener('dblclick',function(){ sel.value=o.value; hpUpdate(); confirmHatch(); });
      row.appendChild(it); try{ hpThumb(cv,o.value); }catch(err){} });
    gal.appendChild(row); });
  sel.parentNode.insertBefore(gal,sel); sel.style.display='none';
  var lbl=sel.previousElementSibling; if(lbl&&/Selecione/.test(lbl.textContent)) lbl.textContent='Escolha o padrão (duplo clique escolhe e fecha):';
  var la=document.getElementById('hpat-ang').previousElementSibling; if(la) la.textContent='Ângulo / rotação (°):';
  var ls=document.getElementById('hpat-sp'); ls.removeAttribute('max'); ls.setAttribute('min','0.01'); ls.setAttribute('step','any'); if(ls.previousElementSibling) ls.previousElementSibling.textContent='Espaçamento / tamanho (mm):';
  var md=sel.closest('.modal'); if(md){ md.style.minWidth='min(640px,94vw)'; md.style.maxWidth='94vw'; }
  var h3=md&&md.querySelector('h3'); if(h3) h3.textContent='Padrão de hachura';
  hpMark();
}
function hpMark(){ var v=document.getElementById('hpat-sel').value; Array.prototype.forEach.call(document.querySelectorAll('#hpat-gal .hpat-it'),function(it){ it.classList.toggle('on',it.getAttribute('data-v')===v); });
  var o=document.getElementById('hpat-sel').selectedOptions[0],nm=document.getElementById('hpat-cur'); if(nm&&o) nm.textContent=o.textContent; }
(function(){ var s0=showHatchDlg,c0=confirmHatch;
  showHatchDlg=function(){ hpBuildDialog(); var r=s0.apply(this,arguments); hpMark(); return r; };
  confirmHatch=function(){
    var sel=document.getElementById('hpat-sel'); if(sel.selectedIndex<0) sel.selectedIndex=0;
    var v=sel.value,parts=v.split('|'),a=parseFloat(String(document.getElementById('hpat-ang').value).replace(',','.')),s=parseFloat(String(document.getElementById('hpat-sp').value).replace(',','.'));
    var r=c0.apply(this,arguments);
    S.hatchPat.ang=isFinite(a)?a:45; // v8.2: ângulo 0 era trocado por 45 ("Linhas horizontais" saía a 45°)
    if(isFinite(s)&&s>0) S.hatchPat.sp=s;
    if(parts[0].indexOf('pat:')===0){ S.hatchPat.type='pat'; S.hatchPat.pname=parts[0].slice(4); } else delete S.hatchPat.pname;
    return r;
  };
})();
// ── importação: padrões do catálogo pelo nome; outros pelas linhas gravadas no DXF ──
(function(){ var h0=hatchFromDxf;
  hatchFromDxf=function(E){
    var e=h0(E); if(!e) return e;
    var nm=String((E.c.filter(function(q){return q[0]===2;})[0]||[0,''])[1]).toUpperCase().trim(),solid=E.c.some(function(q){return q[0]===70&&+q[1]===1;});
    if(nm==='SOLID'||solid){ e.htype='pat'; e.pname='SOLID'; e.ang=0; e.sp=1; return e; }
    var k=-1; for(var i=0;i<E.c.length;i++) if(E.c[i][0]===78){ k=i; break; } if(k<0) return e;
    var nf=parseInt(E.c[k][1],10),fams=[],j=k+1;
    for(var f=0;f<nf&&j<E.c.length;f++){ var F={a:0,ox:0,oy:0,vx:0,vy:0,d:[]};
      while(j<E.c.length&&E.c[j][0]!==53) j++; if(j>=E.c.length) break;
      F.a=parseFloat(E.c[j][1])*Math.PI/180; j++;
      while(j<E.c.length&&[43,44,45,46,79,49].indexOf(E.c[j][0])>=0){ var cd=E.c[j][0],v=parseFloat(E.c[j][1]);
        if(cd===43) F.ox=v; else if(cd===44) F.oy=v; else if(cd===45) F.vx=v; else if(cd===46) F.vy=v; else if(cd===49) F.d.push(v); j++; }
      var dx=Math.cos(F.a),dy=Math.sin(F.a); fams.push({a:F.a,ox:F.ox,oy:F.oy,dx:F.vx*dx+F.vy*dy,dy:-F.vx*dy+F.vy*dx,d:F.d}); }
    if(!fams.length) return e;
    var P=HPAT_BY[nm]||HPAT_BY['EDU_'+nm.replace(/^EDU_/,'')];
    if(P&&P.fam.length===fams.length&&P.fam[0][4]){
      var s=Math.abs(fams[0].dy)/Math.abs(P.fam[0][4]/P.u),rot=(fams[0].a*180/Math.PI-P.fam[0][0]);
      e.htype='pat'; e.pname=P.id; e.sp=s; e.ang=((rot%360)+360)%360; delete e.pdef; return e; }
    e.htype='pat'; e.pname=nm||'Importado'; e.pdef=fams; e.ang=0; e.sp=1; return e;
  };
})();
