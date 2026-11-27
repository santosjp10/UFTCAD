/* ═══════════════════════════════════════════════════════════════════
   v8.17 — ARC COMO NO AUTOCAD
   Sequência e opções iguais às do AutoCAD (inglês ou português):
     ARC  ponto inicial ou [Centro]  (Enter = continuar tangente à última linha/arco)
       inicial → segundo ponto ou [Centro/Fim]
          segundo ponto → ponto final ............................ 3 pontos
          Centro → centro → ponto final ou [Ângulo/comprimento da Corda]
          Fim → ponto final → centro ou [Ângulo/Direção/Raio]
       Centro → centro → ponto inicial → ponto final ou [Ângulo/comprimento da Corda]
   Convenções do AutoCAD: o arco é traçado no sentido anti-horário a partir do
   ponto inicial; ângulo incluído negativo = sentido horário; corda ou raio
   negativos = arco maior. Pré-visualização em todas as etapas; coordenadas
   absolutas, relativas (@) e polares, e OSNAP, como nos outros comandos.
   ═══════════════════════════════════════════════════════════════════ */
var ARC_EPS=1e-9;
function arcAng(c,p){ return Math.atan2(p.y-c.y,p.x-c.x); }
function arcNorm(a){ a%=2*Math.PI; return a<0?a+2*Math.PI:a; }
function arcMk(C,r,sa,ea,cw,E){ if(!(r>ARC_EPS)||!isFinite(r)) return null; return {cx:C.x,cy:C.y,r:r,sa:arcNorm(sa),ea:arcNorm(ea),cw:!!cw,E:E}; }
// 3 pontos (início, passagem, fim)
function arc3P(S,M,E){
  var D=2*(S.x*(M.y-E.y)+M.x*(E.y-S.y)+E.x*(S.y-M.y)); if(Math.abs(D)<ARC_EPS) return {err:'Os três pontos estão alinhados: não há arco que passe por eles.'};
  var a1=S.x*S.x+S.y*S.y,a2=M.x*M.x+M.y*M.y,a3=E.x*E.x+E.y*E.y;
  var C={x:(a1*(M.y-E.y)+a2*(E.y-S.y)+a3*(S.y-M.y))/D,y:(a1*(E.x-M.x)+a2*(S.x-E.x)+a3*(M.x-S.x))/D},r=Math.hypot(S.x-C.x,S.y-C.y);
  var cw=(M.x-S.x)*(E.y-M.y)-(M.y-S.y)*(E.x-M.x)<0;
  return cw?arcMk(C,r,arcAng(C,E),arcAng(C,S),true,E):arcMk(C,r,arcAng(C,S),arcAng(C,E),false,E);
}
// início, centro, fim (o fim só dá a direção)
function arcSCE(S,C,E){ var r=Math.hypot(S.x-C.x,S.y-C.y); if(r<ARC_EPS) return {err:'O centro coincide com o ponto inicial.'}; if(Math.hypot(E.x-C.x,E.y-C.y)<ARC_EPS) return {err:'O ponto final coincide com o centro.'};
  var a=arcAng(C,E); return arcMk(C,r,arcAng(C,S),a,false,{x:C.x+r*Math.cos(a),y:C.y+r*Math.sin(a)}); }
// início, centro, ângulo incluído (graus; + anti-horário, − horário)
function arcSCA(S,C,deg){ var r=Math.hypot(S.x-C.x,S.y-C.y); if(r<ARC_EPS) return {err:'O centro coincide com o ponto inicial.'};
  if(!(Math.abs(deg)>1e-7)||Math.abs(deg)>=360) return {err:'O ângulo incluído deve estar entre −360° e 360° (e não ser zero).'};
  var sa=arcAng(C,S),t=deg*Math.PI/180,ea=sa+t,E={x:C.x+r*Math.cos(ea),y:C.y+r*Math.sin(ea)};
  return t>0?arcMk(C,r,sa,ea,false,E):arcMk(C,r,ea,sa,true,E); }
// início, centro, comprimento da corda (− = arco maior)
function arcSCL(S,C,L){ var r=Math.hypot(S.x-C.x,S.y-C.y); if(r<ARC_EPS) return {err:'O centro coincide com o ponto inicial.'};
  if(!(Math.abs(L)>ARC_EPS)||Math.abs(L)>2*r+1e-9) return {err:'A corda deve ser maior que zero e no máximo o diâmetro ('+gNum(2*r)+').'};
  var t=2*Math.asin(Math.min(1,Math.abs(L)/(2*r)))*180/Math.PI; return arcSCA(S,C,L>0?t:360-t); }
// início, fim, centro (anti-horário do início ao fim)
function arcSEC(S,E,C){ var r=Math.hypot(S.x-C.x,S.y-C.y); if(r<ARC_EPS) return {err:'O centro coincide com o ponto inicial.'}; if(Math.hypot(E.x-C.x,E.y-C.y)<ARC_EPS) return {err:'O centro coincide com o ponto final.'};
  var a=arcAng(C,E); return arcMk(C,r,arcAng(C,S),a,false,{x:C.x+r*Math.cos(a),y:C.y+r*Math.sin(a)}); }
function arcChord(S,E){ var c=Math.hypot(E.x-S.x,E.y-S.y); if(c<ARC_EPS) return null; return {c:c,M:{x:(S.x+E.x)/2,y:(S.y+E.y)/2},n:{x:-(E.y-S.y)/c,y:(E.x-S.x)/c}}; }
// início, fim, ângulo incluído
function arcSEA(S,E,deg){ if(!(Math.abs(deg)>1e-7)||Math.abs(deg)>=360) return {err:'O ângulo incluído deve estar entre −360° e 360° (e não ser zero).'};
  if(deg<0){ var R=arcSEA(E,S,-deg); if(R&&!R.err){ R.cw=true; R.E=E; } return R; }
  var K=arcChord(S,E); if(!K) return {err:'O ponto final coincide com o inicial.'};
  var d=(K.c/2)/Math.tan(deg*Math.PI/360),C={x:K.M.x+K.n.x*d,y:K.M.y+K.n.y*d}; return arcSEC(S,E,C); }
// início, fim, raio (− = arco maior)
function arcSER(S,E,R){ var K=arcChord(S,E); if(!K) return {err:'O ponto final coincide com o inicial.'};
  if(!(Math.abs(R)>=K.c/2-1e-9)) return {err:'O raio deve ser pelo menos a metade da distância entre os pontos ('+gNum(K.c/2)+').'};
  var h=Math.sqrt(Math.max(0,R*R-K.c*K.c/4))*(R>0?1:-1); return arcSEC(S,E,{x:K.M.x+K.n.x*h,y:K.M.y+K.n.y*h}); }
// início, fim, direção da tangente no início (graus)
function arcSED(S,E,deg){ var t=deg*Math.PI/180,n={x:-Math.sin(t),y:Math.cos(t)},v={x:E.x-S.x,y:E.y-S.y},nv=n.x*v.x+n.y*v.y;
  if(Math.hypot(v.x,v.y)<ARC_EPS) return {err:'O ponto final coincide com o inicial.'};
  if(Math.abs(nv)<1e-9*Math.max(1,Math.hypot(v.x,v.y))) return {err:'O ponto final está na própria direção da tangente: seria uma reta, não um arco.'};
  var k=(v.x*v.x+v.y*v.y)/(2*nv),C={x:S.x+n.x*k,y:S.y+n.y*k},r=Math.abs(k);
  return k>0?arcMk(C,r,arcAng(C,S),arcAng(C,E),false,E):arcMk(C,r,arcAng(C,E),arcAng(C,S),true,E); }
// tangente (direção de percurso) no fim do último objeto: linha, arco ou polilinha aberta
function arcLastTangent(){
  var L=S.ents.length?S.ents[S.ents.length-1]:null; if(!L) return null;
  if(L.tp==='line'){ return {p:{x:L.x2,y:L.y2},deg:Math.atan2(L.y2-L.y1,L.x2-L.x1)*180/Math.PI}; }
  if(L.tp==='arc'){ var I=S._arcLast&&S._arcLast.id===L.id?S._arcLast:null,cw=I?I.cw:false,a=cw?L.sa:L.ea,P={x:L.cx+L.r*Math.cos(a),y:L.cy+L.r*Math.sin(a)};
    return {p:P,deg:(a*180/Math.PI)+(cw?-90:90)}; }
  if(L.tp==='pl'&&!L.closed&&L.pts&&L.pts.length>=2){ var q=L.pts,b=q[q.length-2],e=q[q.length-1],ch=Math.atan2(e.y-b.y,e.x-b.x)*180/Math.PI;
    return {p:{x:e.x,y:e.y},deg:ch+2*Math.atan(b.b||0)*180/Math.PI}; } // no fim de um trecho em arco, a tangente gira metade do ângulo do trecho
  return null;
}
function arcKw(u,list){ return list.indexOf(u)>=0; }
var ARC_K={centro:['C','CE','CEN','CENTRO','CENTER'],fim:['F','FIM','FINAL','E','EN','END'],ang:['A','ANG','ANGULO','ÂNGULO','ANGLE'],corda:['L','C','CO','CORDA','COMPRIMENTO','LENGTH'],dir:['D','DIR','DIRECAO','DIREÇÃO','DIRECTION'],raio:['R','RAIO','RADIUS']};
function arcDesc(A){ var sw=(A.ea-A.sa+2*Math.PI)%(2*Math.PI)||2*Math.PI; return 'raio '+gNum(+A.r.toFixed(4))+', ângulo '+gNum(+(sw*180/Math.PI).toFixed(4))+'°, comprimento '+gNum(+(A.r*sw).toFixed(4))+(A.cw?' (traçado no sentido horário)':''); }
NC.arc={
  init:function(ds){ ds.phase='s'; ds.pts=[]; },
  prompt:function(ds){ return {
    s:'ARC Especifique o ponto inicial do arco ou [Centro] (Enter = continuar tangente à última linha ou arco):',
    c0:'Especifique o centro do arco:',
    s2:'Especifique o ponto inicial do arco:',
    p2:'Especifique o segundo ponto do arco ou [Centro/Fim]:',
    e3:'Especifique o ponto final do arco:',
    cA:'Especifique o centro do arco:',
    eC:'Especifique o ponto final do arco ou [Ângulo/comprimento da Corda]:',
    ang:'Especifique o ângulo incluído (+ anti-horário, − horário):',
    len:'Especifique o comprimento da corda (negativo = arco maior):',
    eE:'Especifique o ponto final do arco:',
    cE:'Especifique o centro do arco ou [Ângulo/Direção/Raio]:',
    angE:'Especifique o ângulo incluído (+ anti-horário, − horário):',
    dirE:'Especifique a direção da tangente no ponto inicial (ângulo ou ponto):',
    radE:'Especifique o raio do arco (negativo = arco maior):',
    cont:'Especifique o ponto final do arco (tangente à última linha ou arco):'}[ds.phase]; },
  // resultado da etapa final, dado o próximo ponto/valor
  calc:function(ds,p,num){
    switch(ds.phase){
      case 'e3': return arc3P(ds.S,ds.M,p);
      case 'eC': return arcSCE(ds.S,ds.C,p);
      case 'cE': return arcSEC(ds.S,ds.E,p);
      case 'ang': return arcSCA(ds.S,ds.C,num!==undefined?num:arcNormDeg((arcAng(ds.C,p)-arcAng(ds.C,ds.S))*180/Math.PI));
      case 'len': return arcSCL(ds.S,ds.C,num!==undefined?num:Math.hypot(p.x-ds.S.x,p.y-ds.S.y));
      case 'angE': return arcSEA(ds.S,ds.E,num!==undefined?num:arcNormDeg(Math.atan2(p.y-ds.S.y,p.x-ds.S.x)*180/Math.PI));
      case 'radE': return arcSER(ds.S,ds.E,num!==undefined?num:Math.hypot(p.x-ds.S.x,p.y-ds.S.y));
      case 'dirE': return arcSED(ds.S,ds.E,num!==undefined?num:Math.atan2(p.y-ds.S.y,p.x-ds.S.x)*180/Math.PI);
      case 'cont': return arcSED(ds.S,p,ds.dir);
    } return null;
  },
  make:function(ds,A){
    if(!A) return false; if(A.err){ log(A.err,'er'); return true; }
    snapshot(); var e={tp:'arc',cx:A.cx,cy:A.cy,r:A.r,sa:A.sa,ea:A.ea}; addE(e,true); S._arcLast={id:e.id,cw:A.cw};
    log('Arco: '+arcDesc(A)+'.','ok'); ncEnd(); renderAll(); return true;
  },
  click:function(ds,pt){ var p={x:pt.x,y:pt.y};
    switch(ds.phase){
      case 's': ds.S=p; ds.pts=[p]; ds.phase='p2'; return;
      case 'c0': ds.C=p; ds.pts=[p]; ds.phase='s2'; return;
      case 's2': ds.S=p; ds.pts=[p]; ds.phase='eC'; return;
      case 'p2': ds.M=p; ds.pts=[p]; ds.phase='e3'; return;
      case 'cA': ds.C=p; ds.pts=[p]; ds.phase='eC'; return;
      case 'eE': ds.E=p; ds.pts=[p]; ds.phase='cE'; return;
    }
    this.make(ds,this.calc(ds,p));
  },
  input:function(ds,u,raw){
    var K=ARC_K,ph=ds.phase;
    if(ph==='s'){ if(u===''){ var T=arcLastTangent(); if(!T){ log('Não há linha ou arco para continuar. Especifique o ponto inicial.','er'); return true; } ds.S=T.p; ds.dir=T.deg; ds.pts=[T.p]; ds.phase='cont'; return true; }
      if(arcKw(u,K.centro)){ ds.phase='c0'; return true; } }
    else if(ph==='p2'){ if(arcKw(u,K.centro)){ ds.phase='cA'; return true; } if(arcKw(u,K.fim)){ ds.phase='eE'; return true; } }
    else if(ph==='eC'){ if(arcKw(u,K.ang)){ ds.phase='ang'; return true; } if(arcKw(u,K.corda)){ ds.phase='len'; return true; } }
    else if(ph==='cE'){ if(arcKw(u,K.ang)){ ds.phase='angE'; return true; } if(arcKw(u,K.dir)){ ds.phase='dirE'; return true; } if(arcKw(u,K.raio)){ ds.phase='radE'; return true; } }
    if(u==='') return false;
    if(ph==='ang'||ph==='angE'||ph==='dirE'){ if(!/^@|<|^-?[\d.]+,-?[\d.]+$/.test(String(raw).trim())){ var a=(typeof poAngParse==='function')?poAngParse(raw):ncNum(u); if(a!==null&&!isNaN(a)) return this.make(ds,this.calc(ds,null,a)); } } // com vírgula entre dois números é ponto (regra da v8.4)
    if(ph==='len'||ph==='radE'){ var n=ncNum(u); if(n!==null) return this.make(ds,this.calc(ds,null,n)); }
    var p=ncPointFrom(raw,ds.pts.length?ds.pts[ds.pts.length-1]:null); if(!p) return false; this.click(ds,p); return true;
  },
  preview:function(ctx,ds,hp){
    if(!hp) return; var ref=ds.pts&&ds.pts.length?ds.pts[ds.pts.length-1]:null,A=null;
    if(ds.phase==='p2'||ds.phase==='eE'||ds.phase==='cA'||ds.phase==='s2') ncRubber(ctx,ref,hp);
    else if(['e3','eC','cE','ang','len','angE','radE','dirE','cont'].indexOf(ds.phase)>=0){ A=this.calc(ds,hp); if(ds.C&&(ds.phase==='eC'||ds.phase==='ang'||ds.phase==='len')) ncRubber(ctx,ds.C,hp); else if(ds.phase!=='e3') ncRubber(ctx,ref,hp); }
    if(A&&!A.err){ ctx.save(); ctx.globalAlpha=.85; drawE(ctx,{id:'arcghost',tp:'arc',cx:A.cx,cy:A.cy,r:A.r,sa:A.sa,ea:A.ea,ly:S.curLy,col:S.style.col},true); ctx.restore();
      ncLabel(ctx,hp,'R '+gNum(+A.r.toFixed(3))); }
  }
};
function arcNormDeg(d){ d%=360; return d<=0?d+360:d; }
// o modo didático começa desligado (o usuário liga na aba Educacional); botões refletem o estado ao abrir
S.modes.didactic=false;
window.addEventListener('load',function(){ ['didactic','showcoords','showangles'].forEach(function(m){ var el=document.getElementById('rb-'+m); if(el) el.classList.toggle('on',!!S.modes[m]); }); });
