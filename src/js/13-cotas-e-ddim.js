// v6.2 — MOTOR DE COTAS + DIMSTYLE (DDIM)
// Um único gerador de geometria (dimPrims) alimenta: tela, pré-visualização,
// Layout, seleção, DXF e SVG. Assim, qualquer ajuste no estilo aparece igual
// em todos os lugares. Tamanhos em mm do desenho × Escala global (DIMSCALE),
// como no AutoCAD.
// ═══════════════════════════════════════════════════════════════════════════

var DIM_TYPES=['dim','dimr','dimd','dima'];
function isDim(e){ return !!e && DIM_TYPES.indexOf(e.tp)>=0; }

// Estilo padrão. Entre parênteses, a variável equivalente do AutoCAD.
var DS_DEFAULT = {
  name:'Standard', desc:'',
  // Linhas
  col:'#f0c040',      // cor da linha de cota (DIMCLRD)
  lw:0.25,            // espessura da linha de cota, mm (DIMLWD)
  sd1:false, sd2:false, // suprimir 1ª/2ª metade da linha de cota (DIMSD1/DIMSD2)
  extCol:'#f0c040',   // cor das linhas de extensão (DIMCLRE)
  extLw:0.25,         // espessura das linhas de extensão (DIMLWE)
  se1:false, se2:false, // suprimir 1ª/2ª linha de extensão (DIMSE1/DIMSE2)
  extDimline:1.25,    // prolongamento além da linha de cota (DIMEXE)
  extOrigin:0.625,    // afastamento da origem (DIMEXO)
  baseInc:3.75,       // espaçamento entre linhas de cota de base (DIMDLI)
  extFixed:false, extFixLen:1, // extensões de comprimento fixo (DIMFXLON/DIMFXL)
  // Símbolos e setas
  arrowType:'filled', // tipo de seta (DIMBLK)
  arrowSize:2.5,      // tamanho da seta (DIMASZ)
  centerMark:'mark',  // marca de centro: none | mark | line (DIMCEN)
  centerSize:2.5,
  // Texto
  font:'Consolas,monospace', // estilo do texto (DIMTXSTY)
  txtCol:'#f0c040',   // cor do texto (DIMCLRT)
  txtH:2.5,           // altura do texto (DIMTXT)
  txtFill:false,      // fundo do texto (DIMTFILL)
  txtPos:'above',     // vertical: above | center | below (DIMTAD)
  txtJust:'center',   // horizontal: center | ext1 | ext2 (DIMJUST)
  txtGap:0.625,       // afastamento texto–linha (DIMGAP)
  txtAlign:'aligned', // horizontal | aligned | iso (DIMTIH/DIMTOH)
  // Ajuste
  dimscale:1,         // escala global (DIMSCALE)
  fit:'best',         // best | inside (DIMATFIT simplificado)
  forceLine:true,     // linha de cota entre extensões mesmo com texto fora (DIMTOFL)
  // Unidades primárias
  unitFmt:'decimal',  // decimal | scientific (DIMLUNIT)
  unit:'mm',          // unidade exibida: mm | cm | m | in
  prec:2,             // casas decimais (DIMDEC)
  decSep:'.',         // separador decimal (DIMDSEP)
  round:0,            // arredondamento (DIMRND)
  prefix:'', suffix:'', // prefixo/sufixo (DIMPOST)
  scale:1,            // fator de escala das medidas (DIMLFAC)
  zLead:false, zTrail:false, // supressão de zeros (DIMZIN)
  angFmt:'deg',       // deg | dms | grad | rad (DIMAUNIT)
  angPrec:1,          // (DIMADEC)
  angZTrail:false,
  // Unidades alternativas
  altOn:false,        // (DIMALT)
  altMult:0.0393701,  // (DIMALTF) — padrão: mm → polegadas
  altPrec:3,          // (DIMALTD)
  altPrefix:'', altSuffix:' in',
  altPos:'after',     // after | below
  // Tolerâncias
  tolMethod:'none',   // none | symmetric | deviation | limits | basic (DIMTOL/DIMLIM)
  tolUpper:0.1,       // (DIMTP)
  tolLower:0.1,       // (DIMTM)
  tolPrec:2,          // (DIMTDEC)
  tolScale:0.7        // altura relativa (DIMTFAC)
};

function dimDefaultStyles(){
  var std=JSON.parse(JSON.stringify(DS_DEFAULT));
  std.desc='Estilo padrão do EduCAD.';
  var abnt=JSON.parse(JSON.stringify(DS_DEFAULT));
  abnt.name='ABNT'; abnt.decSep=','; abnt.zTrail=true; abnt.txtAlign='aligned'; abnt.txtPos='above'; abnt.baseInc=7;
  abnt.col=abnt.extCol=abnt.txtCol='#f0c040';
  abnt.desc='Separador decimal vírgula e zeros finais suprimidos (convenção brasileira). Ajuste tamanhos e escala à folha usada.';
  return [std,abnt];
}

// Completa campos ausentes e converte nomes antigos (v6.0/v6.1)
function normDimStyle(st){
  var o={};
  for(var k in DS_DEFAULT) o[k]=DS_DEFAULT[k];
  if(st) for(var k2 in st) if(st[k2]!==undefined) o[k2]=st[k2];
  if(st){
    if(st.extDimline===undefined && st.extBeyond!==undefined) o.extDimline=st.extBeyond;
    if(st.extOrigin===undefined && st.extOffset!==undefined) o.extOrigin=st.extOffset;
    if(st.extCol===undefined) o.extCol=o.col;
    if(st.txtCol===undefined) o.txtCol=o.col;
    if(st.extLw===undefined && st.lw!==undefined) o.extLw=st.lw;
  }
  delete o.extBeyond; delete o.extOffset;
  o.name=String(o.name||'Estilo');
  ['lw','extLw','extDimline','extOrigin','extFixLen','arrowSize','centerSize','txtH','txtGap','dimscale','prec','round','scale','angPrec','altMult','altPrec','tolUpper','tolLower','tolPrec','tolScale']
    .forEach(function(k){ var v=parseFloat(o[k]); o[k]=isFinite(v)?v:DS_DEFAULT[k]; });
  ['col','extCol','txtCol'].forEach(function(k){ o[k]=safeCol(o[k]); });
  if(!(o.dimscale>0)) o.dimscale=1;
  if(!(o.scale>0)) o.scale=1;
  return o;
}

if(!S.dimStyles) S.dimStyles=dimDefaultStyles();
if(!S.dimCurrent) S.dimCurrent='Standard';

function dspGetStyle(name){
  for(var i=0;i<S.dimStyles.length;i++) if(S.dimStyles[i].name===name) return S.dimStyles[i];
  return null;
}
function curDimStyle(){ return dspGetStyle(S.dimCurrent)||S.dimStyles[0]||normDimStyle(DS_DEFAULT); }
function dimStyleOf(e){ return (e&&e.dimStyle&&dspGetStyle(e.dimStyle))||curDimStyle(); }

// ── FORMATAÇÃO NUMÉRICA ────────────────────────────────────────────────────
function dimFmtNum(v,prec,sep,zLead,zTrail,round){
  if(round>0) v=Math.round(v/round)*round;
  prec=Math.max(0,Math.min(8,prec|0));
  var s=v.toFixed(prec);
  if(/^-0\.?0*$/.test(s)) s=s.slice(1);
  if(zTrail && s.indexOf('.')>=0) s=s.replace(/0+$/,'').replace(/\.$/,'');
  if(zLead) s=s.replace(/^(-?)0\./,'$1.');
  return s.replace('.',sep||'.');
}
function dimUnitConv(v,st){
  if(st.unit==='cm') return v/10;
  if(st.unit==='m') return v/1000;
  if(st.unit==='in') return v/25.4;
  return v;
}
function dimFmtLinearNum(v,st){
  if(st.unitFmt==='scientific') return v.toExponential(Math.max(0,Math.min(8,st.prec|0))).replace('.',st.decSep||'.');
  return dimFmtNum(v,st.prec,st.decSep,st.zLead,st.zTrail,st.round);
}
// Retorna {main, tolUp, tolLow, alt, basic}: o texto principal e partes empilhadas
function dimLinearText(rawMM,st,pre){
  var v=dimUnitConv(rawMM*(st.scale||1),st);
  var r={main:'',tolUp:null,tolLow:null,alt:null,basic:st.tolMethod==='basic'};
  var tp=st.tolPrec;
  var num=dimFmtLinearNum(v,st);
  if(st.tolMethod==='limits'){
    r.tolUp=dimFmtNum(v+st.tolUpper,tp,st.decSep,st.zLead,st.zTrail,0);
    r.tolLow=dimFmtNum(v-st.tolLower,tp,st.decSep,st.zLead,st.zTrail,0);
    r.main=st.prefix?st.prefix:(pre||'');
  } else {
    r.main=(st.prefix?st.prefix:(pre||''))+num+(st.suffix||'');
    if(st.tolMethod==='symmetric') r.main+='±'+dimFmtNum(st.tolUpper,tp,st.decSep,false,st.zTrail,0);
    if(st.tolMethod==='deviation'){
      r.tolUp='+'+dimFmtNum(st.tolUpper,tp,st.decSep,false,st.zTrail,0);
      r.tolLow=(st.tolLower===0?'':'-')+dimFmtNum(Math.abs(st.tolLower),tp,st.decSep,false,st.zTrail,0);
    }
  }
  if(st.altOn){
    var av=rawMM*(st.scale||1)*(st.altMult||1);
    r.alt='['+(st.altPrefix||'')+dimFmtNum(av,st.altPrec,st.decSep,st.zLead,st.zTrail,0)+(st.altSuffix||'')+']';
  }
  return r;
}
function dimAngText(deg,st){
  var sep=st.decSep||'.',p=st.angPrec|0,zt=st.angZTrail;
  if(st.angFmt==='rad') return dimFmtNum(deg*Math.PI/180,p,sep,false,zt,0)+'r';
  if(st.angFmt==='grad') return dimFmtNum(deg*400/360,p,sep,false,zt,0)+'g';
  if(st.angFmt==='dms'){
    var tot=Math.round(deg*3600),d=Math.floor(tot/3600),m=Math.floor((tot%3600)/60),s=tot%60;
    if(p<=0) return Math.round(deg)+'°';
    if(p<=2) return d+'°'+Math.round(m+s/60)+"'";
    return d+'°'+m+"'"+s+'"';
  }
  return dimFmtNum(deg,p,sep,false,zt,0)+'°';
}
// Compatibilidade com código anterior
function dimValStr(rawMM,st){ return dimLinearText(rawMM,st||curDimStyle()).main; }

// ── MEDIDAS (calculadas da geometria: cota acompanha o objeto) ───────────────
function dimMeasure(e){
  switch(e.tp){
    case 'dim':
      if(e.subtp==='aligned') return Math.hypot(e.x2-e.x1,e.y2-e.y1);
      if(e.px===undefined) return Math.abs(e.x2-e.x1);
      return e.dimDir==='v'?Math.abs(e.y2-e.y1):Math.abs(e.x2-e.x1);
    case 'dimr': case 'dimd': return Math.abs(parseFloat(e.val))||0;
    case 'dima': return dimAngGeom(e).sweep*180/Math.PI;
  }
  return 0;
}
function dimAngGeom(e){
  var a1=Math.atan2(e.y1-e.vy,e.x1-e.vx),a2=Math.atan2(e.y2-e.vy,e.x2-e.vx);
  var TWO=Math.PI*2,d=((a2-a1)%TWO+TWO)%TWO,sa=a1,sw=d;
  if(e.px!==undefined){
    var ap=Math.atan2(e.py-e.vy,e.px-e.vx),rel=((ap-a1)%TWO+TWO)%TWO;
    if(rel>d){ sa=a2; sw=TWO-d; }
  } else if(d>Math.PI){ sa=a2; sw=TWO-d; }
  var L1=Math.hypot(e.x1-e.vx,e.y1-e.vy),L2=Math.hypot(e.x2-e.vx,e.y2-e.vy);
  var R=e.px!==undefined?Math.hypot(e.px-e.vx,e.py-e.vy):0.6*Math.min(L1,L2);
  return {sa:sa,sweep:sw,R:R};
}

// ── GEOMETRIA DAS COTAS (primitivas no mundo, em mm) ───────────────────────
// Primitivas: line | arc | solid | circle(fill) | text | fillbox | box
// role: 'dim' (linha de cota/setas), 'ext' (extensões), 'cen' (marca de centro), 'text'
function dimTextW(txt,h,st){ var f=(st.font||'').toLowerCase(),k=/consolas|courier|mono/.test(f)?0.6:0.55; return String(txt).length*h*k; }
function dimArrow(out,tx,ty,dx,dy,st,ds){
  var AW=st.arrowSize*ds,AH=AW*0.3,t=st.arrowType,px=-dy,py=dx;
  if(t==='none'||AW<=0) return;
  if(t==='tick'){ var k=AW*0.5; out.push({k:'line',role:'dim',x1:tx-k*(dx+px),y1:ty-k*(dy+py),x2:tx+k*(dx+px),y2:ty+k*(dy+py),bold:true}); return; }
  if(t==='dot'){ out.push({k:'circle',role:'dim',cx:tx,cy:ty,r:AW*0.25,fill:true}); return; }
  var b1={x:tx-dx*AW+px*AH,y:ty-dy*AW+py*AH},b2={x:tx-dx*AW-px*AH,y:ty-dy*AW-py*AH};
  if(t==='open'){ out.push({k:'line',role:'dim',x1:b1.x,y1:b1.y,x2:tx,y2:ty},{k:'line',role:'dim',x1:tx,y1:ty,x2:b2.x,y2:b2.y}); return; }
  if(t==='open90'){ var c=AW*0.7071; b1={x:tx-dx*c+px*c,y:ty-dy*c+py*c};b2={x:tx-dx*c-px*c,y:ty-dy*c-py*c};
    out.push({k:'line',role:'dim',x1:b1.x,y1:b1.y,x2:tx,y2:ty},{k:'line',role:'dim',x1:tx,y1:ty,x2:b2.x,y2:b2.y}); return; }
  out.push({k:'solid',role:'dim',pts:[{x:tx,y:ty},b1,b2]});
}
// Bloco de texto: texto principal + tolerâncias empilhadas + alternativas.
// (cx,cy) = centro horizontal do bloco na linha de base; ang = rotação; retorna largura.
function dimTextBlock(out,cx,cy,ang,T,st,ds,vAlign){
  var H=st.txtH*ds,Hs=H*(st.tolScale||0.7),gap=st.txtGap*ds;
  var main=T.main+(T.alt&&st.altPos!=='below'?' '+T.alt:'');
  var wm=main?dimTextW(main,H,st):0, stack=(T.tolUp!==null||T.tolLow!==null);
  var ws=stack?Math.max(dimTextW(T.tolUp||'',Hs,st),dimTextW(T.tolLow||'',Hs,st)):0;
  var W=wm+(stack?(wm?gap*0.5:0)+ws:0);
  var c=Math.cos(ang),s=Math.sin(ang),nx=-s,ny=c;
  // deslocamento vertical da linha de base
  var off=vAlign==='above'?gap:vAlign==='below'?-(gap+H):-H/2;
  var bx=cx+nx*off,by=cy+ny*off;
  var x0=bx-c*W/2,y0=by-s*W/2; // início do bloco
  if(st.txtFill){
    var pad=gap*0.5,p1={x:x0-c*pad-nx*pad,y:y0-s*pad-ny*pad},L=W+2*pad,Hh=H+2*pad;
    out.push({k:'fillbox',role:'text',pts:[p1,{x:p1.x+c*L,y:p1.y+s*L},{x:p1.x+c*L+nx*Hh,y:p1.y+s*L+ny*Hh},{x:p1.x+nx*Hh,y:p1.y+ny*Hh}]});
  }
  if(main) out.push({k:'text',role:'text',x:x0+c*wm/2,y:y0+s*wm/2,h:H,rot:ang,txt:main,align:'center'});
  if(T.basic&&main){
    var q=gap*0.5,a={x:x0-c*q-nx*q,y:y0-s*q-ny*q},Lw=wm+2*q,Hb=H+2*q;
    out.push({k:'box',role:'dim',pts:[a,{x:a.x+c*Lw,y:a.y+s*Lw},{x:a.x+c*Lw+nx*Hb,y:a.y+s*Lw+ny*Hb},{x:a.x+nx*Hb,y:a.y+ny*Hb}]});
  }
  if(stack){
    var sx=x0+c*(W-ws),sy=y0+s*(W-ws);
    if(T.tolUp) out.push({k:'text',role:'text',x:sx+nx*(H-Hs),y:sy+ny*(H-Hs),h:Hs,rot:ang,txt:T.tolUp,align:'left'});
    if(T.tolLow) out.push({k:'text',role:'text',x:sx-nx*(Hs*0.15),y:sy-ny*(Hs*0.15),h:Hs,rot:ang,txt:T.tolLow,align:'left'});
  }
  if(T.alt&&st.altPos==='below'){
    var boff=-(gap+H)-(vAlign==='below'?H+gap:0);
    out.push({k:'text',role:'text',x:cx+nx*boff,y:cy+ny*boff,h:H,rot:ang,txt:T.alt,align:'center'});
  }
  return W;
}
// v8.7: faixa (−90°, +90°] — texto vertical sempre lido pela direita da folha, à esquerda da linha de cota (ABNT),
// qualquer que seja o sentido em que a cota foi feita (antes, de cima para baixo dava −90°: texto à direita e de cabeça para baixo)
function readableAng(a){ while(a>Math.PI/2+1e-9) a-=Math.PI; while(a<=-Math.PI/2+1e-9) a+=Math.PI; return a; }
function dimCenterMark(out,cx,cy,r,st,ds){
  if(st.centerMark==='none') return;
  var m=st.centerSize*ds;
  out.push({k:'line',role:'cen',x1:cx-m,y1:cy,x2:cx+m,y2:cy},{k:'line',role:'cen',x1:cx,y1:cy-m,x2:cx,y2:cy+m});
  if(st.centerMark==='line'&&r>2*m){
    var e=r+m;
    out.push({k:'line',role:'cen',x1:cx+2*m,y1:cy,x2:cx+e,y2:cy},{k:'line',role:'cen',x1:cx-2*m,y1:cy,x2:cx-e,y2:cy},
             {k:'line',role:'cen',x1:cx,y1:cy+2*m,x2:cx,y2:cy+e},{k:'line',role:'cen',x1:cx,y1:cy-2*m,x2:cx,y2:cy-e});
  }
}
function dimPrims(e,stOverride){
  var st=stOverride||dimStyleOf(e),ds=st.annot?1/annoK():(st.dimscale||1),o=[];
  var asz=st.arrowSize*ds,gap=st.txtGap*ds,H=st.txtH*ds;
  if(e.tp==='dim'){
    var g=dimLinePoints(e); if(!g) return o;
    var d1={x:g.d1x,y:g.d1y},d2={x:g.d2x,y:g.d2y};
    var L=Math.hypot(d2.x-d1.x,d2.y-d1.y); if(L<1e-9) return o;
    var ux=(d2.x-d1.x)/L,uy=(d2.y-d1.y)/L;
    // linhas de extensão
    var exo=st.extOrigin*ds,exe=st.extDimline*ds;
    [[e.x1,e.y1,d1,st.se1],[e.x2,e.y2,d2,st.se2]].forEach(function(q){
      if(q[3]) return;
      var dx=q[2].x-q[0],dy=q[2].y-q[1],l=Math.hypot(dx,dy),vx,vy;
      if(l<1e-9){ vx=-uy; vy=ux; } else { vx=dx/l; vy=dy/l; }
      var sx=st.extFixed?q[2].x-vx*st.extFixLen*ds:q[0]+vx*exo, sy=st.extFixed?q[2].y-vy*st.extFixLen*ds:q[1]+vy*exo;
      if(l>1e-9||st.extFixed) o.push({k:'line',role:'ext',x1:sx,y1:sy,x2:q[2].x+vx*exe,y2:q[2].y+vy*exe});
    });
    // texto e ajuste (Fit)
    var T=dimLinearText(dimMeasure(e),st);
    var Wt=dimTextW(T.main+(T.alt&&st.altPos!=='below'?' '+T.alt:''),H,st)+((T.tolUp||T.tolLow)?dimTextW(T.tolUp||T.tolLow,H*st.tolScale,st)+gap*0.5:0);
    var arrowsIn=true,textIn=true;
    if(st.fit!=='inside'&&L<2*asz+Wt+2*gap){
      if(L>=Wt+2*gap){ arrowsIn=false; }            // só o texto cabe: setas para fora
      else if(L>=2*asz+gap){ textIn=false; }         // só as setas cabem: texto para fora
      else { arrowsIn=false; textIn=false; }
    }
    var horizTxt=st.txtAlign==='horizontal'||(st.txtAlign==='iso'&&!textIn);
    var ta=horizTxt?0:readableAng(Math.atan2(uy,ux));
    var lineHoriz=Math.abs(uy)<1e-6;
    var vAl=st.txtPos;
    if(horizTxt&&!lineHoriz) vAl='center';
    // posição do texto ao longo da linha (parâmetro "along" a partir de d1)
    var along;
    if(textIn){
      along=L/2;
      if(st.txtJust==='ext1') along=Math.min(L/2,(arrowsIn?asz:0)+gap+Wt/2);
      if(st.txtJust==='ext2') along=Math.max(L/2,L-((arrowsIn?asz:0)+gap+Wt/2));
    } else along=L+(arrowsIn?0:2*asz)+gap+Wt/2;
    var tc={x:d1.x+ux*along,y:d1.y+uy*along};
    // linha de cota
    var lo=arrowsIn?0:-2*asz, hi=arrowsIn?L:L+2*asz;
    var segs=(arrowsIn||st.forceLine)?[[lo,hi]]:[[lo,0],[L,hi]];
    var half=(horizTxt&&!lineHoriz)?(Math.abs(ux)>1e-6?Math.min(Wt/2/Math.abs(ux),H/2/Math.abs(uy)):H/2/Math.abs(uy)):Wt/2;
    if(!textIn){
      var last=segs[segs.length-1];
      last[1]=Math.max(last[1],vAl==='center'?along-half-gap:along+Wt/2);
    } else if(vAl==='center'){
      var ns=[];
      segs.forEach(function(sg){ if(along-half-gap>sg[0]) ns.push([sg[0],Math.min(sg[1],along-half-gap)]); if(along+half+gap<sg[1]) ns.push([Math.max(sg[0],along+half+gap),sg[1]]); });
      segs=ns;
    }
    segs.forEach(function(sg){
      var a0=st.sd1?Math.max(sg[0],L/2):sg[0], a1=st.sd2?Math.min(sg[1],L/2):sg[1];
      if(a1-a0>1e-9) o.push({k:'line',role:'dim',x1:d1.x+ux*a0,y1:d1.y+uy*a0,x2:d1.x+ux*a1,y2:d1.y+uy*a1});
    });
    if(!st.sd1) dimArrow(o,d1.x,d1.y,arrowsIn?-ux:ux,arrowsIn?-uy:uy,st,ds);
    if(!st.sd2) dimArrow(o,d2.x,d2.y,arrowsIn?ux:-ux,arrowsIn?uy:-uy,st,ds);
    dimTextBlock(o,tc.x,tc.y,ta,T,st,ds,vAl);
    return o;
  }
  if(e.tp==='dimr'||e.tp==='dimd'){
    var isD=e.tp==='dimd',val=Math.abs(parseFloat(e.val))||0,r=isD?val/2:val;
    var dx=e.ex-e.cx,dy=e.ey-e.cy,dl=Math.hypot(dx,dy),ux2=dl>1e-9?dx/dl:1,uy2=dl>1e-9?dy/dl:0;
    var P={x:e.cx+ux2*r,y:e.cy+uy2*r},Q={x:e.cx-ux2*r,y:e.cy-uy2*r};
    var T2=dimLinearText(val,st,isD?'⌀':'R');
    var Wt2=dimTextW(T2.main,H,st);
    dimCenterMark(o,e.cx,e.cy,r,st,ds);
    var outside=dl>r+1e-9;
    if(!outside){
      // texto dentro do círculo
      var A=isD?Q:{x:e.cx,y:e.cy};
      o.push({k:'line',role:'dim',x1:A.x,y1:A.y,x2:P.x,y2:P.y});
      dimArrow(o,P.x,P.y,ux2,uy2,st,ds);
      if(isD) dimArrow(o,Q.x,Q.y,-ux2,-uy2,st,ds);
      var mid={x:(A.x+P.x)/2,y:(A.y+P.y)/2};
      var ta2=st.txtAlign==='horizontal'?0:readableAng(Math.atan2(uy2,ux2));
      dimTextBlock(o,mid.x,mid.y,ta2,T2,st,ds,st.txtAlign==='horizontal'?'center':st.txtPos);
    } else {
      // texto fora: seta apontando para o contorno + linha até o texto
      var start=isD?(st.forceLine?Q:P):(st.forceLine?{x:e.cx,y:e.cy}:P);
      o.push({k:'line',role:'dim',x1:start.x,y1:start.y,x2:e.ex,y2:e.ey});
      if(isD&&st.forceLine){ dimArrow(o,P.x,P.y,ux2,uy2,st,ds); dimArrow(o,Q.x,Q.y,-ux2,-uy2,st,ds); }
      else dimArrow(o,P.x,P.y,-ux2,-uy2,st,ds);
      if(st.txtAlign==='aligned'){
        var ta3=readableAng(Math.atan2(uy2,ux2)),flip=Math.abs(ta3-Math.atan2(uy2,ux2))>1e-6;
        var tcx=e.ex+ux2*(gap+Wt2/2),tcy=e.ey+uy2*(gap+Wt2/2);
        o.push({k:'line',role:'dim',x1:e.ex,y1:e.ey,x2:e.ex+ux2*(2*gap+Wt2),y2:e.ey+uy2*(2*gap+Wt2)});
        dimTextBlock(o,tcx,tcy,ta3,T2,st,ds,st.txtPos==='center'?'above':st.txtPos);
      } else {
        var sgn=ux2>=0?1:-1,land=asz;
        o.push({k:'line',role:'dim',x1:e.ex,y1:e.ey,x2:e.ex+sgn*land,y2:e.ey});
        dimTextBlock(o,e.ex+sgn*(land+gap+Wt2/2),e.ey,0,T2,st,ds,'center');
      }
    }
    return o;
  }
  if(e.tp==='dima'){
    var G=dimAngGeom(e); if(G.R<1e-9||G.sweep<1e-9) return o;
    var v={x:e.vx,y:e.vy},R=G.R,sa=G.sa,ea=G.sa+G.sweep;
    // extensões (quando o arco passa além das pernas)
    var exo2=st.extOrigin*ds,exe2=st.extDimline*ds;
    [[e.x1,e.y1,st.se1],[e.x2,e.y2,st.se2]].forEach(function(q){
      if(q[2]) return;
      var dx=q[0]-v.x,dy=q[1]-v.y,l=Math.hypot(dx,dy); if(l<1e-9) return;
      var ax=dx/l,ay=dy/l;
      if(R>l+exo2) o.push({k:'line',role:'ext',x1:q[0]+ax*exo2,y1:q[1]+ay*exo2,x2:v.x+ax*(R+exe2),y2:v.y+ay*(R+exe2)});
    });
    o.push({k:'arc',role:'dim',cx:v.x,cy:v.y,r:R,sa:sa,ea:ea});
    var aSz=asz,arcLen=R*G.sweep;
    var inside=st.fit==='inside'||arcLen>=2*aSz+gap;
    var t1={x:v.x+R*Math.cos(sa),y:v.y+R*Math.sin(sa)},t2={x:v.x+R*Math.cos(ea),y:v.y+R*Math.sin(ea)};
    var tg1={x:Math.sin(sa),y:-Math.cos(sa)},tg2={x:-Math.sin(ea),y:Math.cos(ea)}; // para fora do arco
    dimArrow(o,t1.x,t1.y,inside?tg1.x:-tg1.x,inside?tg1.y:-tg1.y,st,ds);
    dimArrow(o,t2.x,t2.y,inside?tg2.x:-tg2.x,inside?tg2.y:-tg2.y,st,ds);
    var ma=sa+G.sweep/2,T3={main:dimAngText(G.sweep*180/Math.PI,st),tolUp:null,tolLow:null,alt:null,basic:st.tolMethod==='basic'};
    var mx=v.x+R*Math.cos(ma),my=v.y+R*Math.sin(ma);
    if(st.txtAlign==='horizontal'){
      var Wt3=dimTextW(T3.main,H,st),k3=gap+Math.abs(Math.cos(ma))*Wt3/2+Math.abs(Math.sin(ma))*H/2;
      dimTextBlock(o,mx+Math.cos(ma)*k3,my+Math.sin(ma)*k3,0,T3,st,ds,'center');
    } else {
      var tang=readableAng(ma-Math.PI/2),outward=Math.abs(tang-(ma-Math.PI/2))<1e-6||Math.abs(tang-(ma-Math.PI/2)+2*Math.PI)<1e-6;
      var vA=st.txtPos;
      if(!outward){ vA=vA==='above'?'below':vA==='below'?'above':vA; }
      dimTextBlock(o,mx,my,tang,T3,st,ds,vA);
    }
    return o;
  }
  return o;
}

// ── DESENHO DAS PRIMITIVAS (tela, Layout, pré-visualização) ────────────────
// map(x,y) → {x,y} em pixels; pxmm = pixels por mm; opt.sel destaca; opt.minTxt = altura mínima
function renderDimPrims(ctx,prims,st,map,pxmm,opt){
  opt=opt||{};
  ctx.save();ctx.setLineDash([]);ctx.shadowBlur=opt.sel?8:0;ctx.shadowColor=opt.sel?'#4d9ef7':'transparent';
  if(opt.alpha) ctx.globalAlpha=opt.alpha;
  function colOf(role){ if(opt.sel) return '#60b8ff'; if(opt.color) return opt.color; var c0=role==='ext'?st.extCol:role==='text'?st.txtCol:st.col; return (S.space!=='model'&&typeof plotCol==='function')?plotCol(c0):c0; }
  function lwOf(role){ var pm=(S.space!=='model'&&S.paperPx)?S.paperPx:pxmm; return Math.max(opt.minLw||0.6,(role==='ext'?st.extLw:st.lw)*pm); }
  for(var i=0;i<prims.length;i++){
    var p=prims[i],c=colOf(p.role);
    ctx.strokeStyle=c;ctx.fillStyle=c;ctx.lineWidth=lwOf(p.role)*(p.bold?1.6:1);
    switch(p.k){
      case 'line':{var a=map(p.x1,p.y1),b=map(p.x2,p.y2);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();break;}
      case 'arc':{var cc=map(p.cx,p.cy);ctx.beginPath();ctx.arc(cc.x,cc.y,p.r*pxmm,-p.sa,-p.ea,true);ctx.stroke();break;}
      case 'solid':case 'fillbox':case 'box':{
        if(p.k==='fillbox'){ if(opt.noFill) break; ctx.fillStyle=opt.bg||'#0a0a1a'; }
        ctx.beginPath();for(var j=0;j<p.pts.length;j++){var q=map(p.pts[j].x,p.pts[j].y);if(j)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);}ctx.closePath();
        if(p.k==='box') ctx.stroke(); else ctx.fill(); break;}
      case 'circle':{var c2=map(p.cx,p.cy);ctx.beginPath();ctx.arc(c2.x,c2.y,Math.max(1,p.r*pxmm),0,Math.PI*2);if(p.fill)ctx.fill();else ctx.stroke();break;}
      case 'text':{
        var tp=map(p.x,p.y),fs=Math.max(opt.minTxt||0,p.h*pxmm);
        if(fs<0.5) break;
        ctx.save();ctx.translate(tp.x,tp.y);ctx.rotate(-p.rot);
        ctx.font=fs+'px '+(st.font||'Consolas,monospace');ctx.textAlign=p.align||'center';ctx.textBaseline='alphabetic';
        ctx.fillText(p.txt,0,0);ctx.restore();break;}
    }
  }
  ctx.restore();
}
function drawDimEnt(ctx,e,sel){
  var st=dimStyleOf(e);
  renderDimPrims(ctx,dimPrims(e,st),st,w2s,S.vp.sc,{sel:sel,minTxt:S.printing?0:6});
}
// Pré-visualização durante a criação de uma cota (mesma geometria da cota final)
function drawDimTemp(ctx,e){
  var st=curDimStyle();
  renderDimPrims(ctx,dimPrims(e,st),st,w2s,S.vp.sc,{alpha:0.85,minTxt:6});
}
// Seleção pelo desenho real da cota (linhas, arcos e texto)
function dimHit(e,wx,wy,t){
  var P=dimPrims(e);
  for(var i=0;i<P.length;i++){
    var p=P[i];
    if(p.k==='line'&&segD(wx,wy,p.x1,p.y1,p.x2,p.y2)<t) return true;
    if(p.k==='arc'&&Math.abs(Math.hypot(wx-p.cx,wy-p.cy)-p.r)<t&&arcHas(Math.atan2(wy-p.cy,wx-p.cx),p.sa,p.ea)) return true;
    if(p.k==='text'){
      var w=dimTextW(p.txt,p.h,dimStyleOf(e)),x0=p.align==='center'?-w/2:0,lp=ellLocal({cx:p.x,cy:p.y,rot:p.rot},wx,wy);
      if(lp.x>=x0-t&&lp.x<=x0+w+t&&lp.y>=-t&&lp.y<=p.h+t) return true;
    }
    if(p.k==='solid'&&segD(wx,wy,p.pts[0].x,p.pts[0].y,(p.pts[1].x+p.pts[2].x)/2,(p.pts[1].y+p.pts[2].y)/2)<t) return true;
  }
  return false;
}
function dimBox(e){ return primsBox(dimPrims(e)); }
function dimUseCount(name){ return S.ents.filter(function(e){return isDim(e)&&(e.dimStyle||S.dimCurrent)===name;}).length; }

// ═══════════════════════════════════════════════════════════════════════════
// DIÁLOGOS DDIM: Gerenciador (lista + pré-visualização) e Editor (abas)
// ═══════════════════════════════════════════════════════════════════════════
var DDIM={ sel:null, edit:null, editName:null, isNew:false, tab:0, filter:'all' };

// Esquema do editor: cada campo indica a variável equivalente do AutoCAD
var DDIM_TABS=[
  {t:'Linhas',sec:[
    {h:'Linhas de cota',f:[
      {k:'col',l:'Cor',ty:'color',v:'DIMCLRD'},
      {k:'lw',l:'Espessura (mm)',ty:'sel',o:[['0.13','0,13'],['0.18','0,18'],['0.25','0,25'],['0.35','0,35'],['0.5','0,50'],['0.7','0,70'],['1','1,00']],num:1,v:'DIMLWD'},
      {k:'sd1',l:'Suprimir 1ª metade',ty:'chk',v:'DIMSD1'},
      {k:'sd2',l:'Suprimir 2ª metade',ty:'chk',v:'DIMSD2'},
      {k:'baseInc',l:'Espaçamento da linha de base',ty:'num',min:0,max:100,st:0.25,v:'DIMDLI',hint:'Distância entre as linhas de cota sucessivas do DIMBASELINE (DBA).'}]},
    {h:'Linhas de extensão',f:[
      {k:'extCol',l:'Cor',ty:'color',v:'DIMCLRE'},
      {k:'extLw',l:'Espessura (mm)',ty:'sel',o:[['0.13','0,13'],['0.18','0,18'],['0.25','0,25'],['0.35','0,35'],['0.5','0,50'],['0.7','0,70']],num:1,v:'DIMLWE'},
      {k:'se1',l:'Suprimir extensão 1',ty:'chk',v:'DIMSE1'},
      {k:'se2',l:'Suprimir extensão 2',ty:'chk',v:'DIMSE2'},
      {k:'extDimline',l:'Além da linha de cota',ty:'num',min:0,max:50,st:0.125,v:'DIMEXE'},
      {k:'extOrigin',l:'Afastamento da origem',ty:'num',min:0,max:50,st:0.125,v:'DIMEXO'},
      {k:'extFixed',l:'Comprimento fixo',ty:'chk',v:'DIMFXLON'},
      {k:'extFixLen',l:'Comprimento',ty:'num',min:0.1,max:100,st:0.5,v:'DIMFXL',dep:'extFixed'}]}]},
  {t:'Símbolos e setas',sec:[
    {h:'Pontas de seta',f:[
      {k:'arrowType',l:'Tipo',ty:'sel',o:[['filled','Preenchida fechada'],['open','Aberta'],['open90','Aberta 90°'],['tick','Traço oblíquo (arquitetônico)'],['dot','Ponto'],['none','Nenhuma']],v:'DIMBLK'},
      {k:'arrowSize',l:'Tamanho',ty:'num',min:0,max:50,st:0.25,v:'DIMASZ'}]},
    {h:'Marca de centro (raio/diâmetro)',f:[
      {k:'centerMark',l:'Tipo',ty:'sel',o:[['none','Nenhuma'],['mark','Marca'],['line','Linha de centro']],v:'DIMCEN'},
      {k:'centerSize',l:'Tamanho',ty:'num',min:0.1,max:50,st:0.25,v:'DIMCEN'}]}]},
  {t:'Texto',sec:[
    {h:'Aparência',f:[
      {k:'font',l:'Fonte',ty:'sel',o:[['Consolas,monospace','Consolas'],['Arial,sans-serif','Arial'],["'Courier New',monospace",'Courier New'],["'Times New Roman',serif",'Times New Roman'],['system-ui,sans-serif','Sistema']],v:'DIMTXSTY'},
      {k:'txtCol',l:'Cor do texto',ty:'color',v:'DIMCLRT'},
      {k:'txtH',l:'Altura do texto',ty:'num',min:0.1,max:100,st:0.25,v:'DIMTXT'},
      {k:'txtFill',l:'Fundo sob o texto',ty:'chk',v:'DIMTFILL'}]},
    {h:'Posicionamento',f:[
      {k:'txtPos',l:'Vertical',ty:'sel',o:[['above','Acima da linha'],['center','Centralizado'],['below','Abaixo da linha']],v:'DIMTAD'},
      {k:'txtJust',l:'Horizontal',ty:'sel',o:[['center','Centralizado'],['ext1','Junto à extensão 1'],['ext2','Junto à extensão 2']],v:'DIMJUST'},
      {k:'txtGap',l:'Afastamento da linha',ty:'num',min:0,max:20,st:0.125,v:'DIMGAP'}]},
    {h:'Alinhamento',f:[
      {k:'txtAlign',l:'Texto',ty:'sel',o:[['horizontal','Horizontal'],['aligned','Alinhado à linha de cota'],['iso','Padrão ISO']],v:'DIMTIH/DIMTOH'}]}]},
  {t:'Ajuste',sec:[
    {h:'Quando não houver espaço entre as extensões',f:[
      {k:'fit',l:'Opção',ty:'sel',o:[['best','Melhor ajuste (setas e/ou texto para fora)'],['inside','Manter sempre dentro']],v:'DIMATFIT'},
      {k:'forceLine',l:'Linha de cota entre extensões',ty:'chk',v:'DIMTOFL'}]},
    {h:'Escala dos elementos',f:[
      {k:'annot',l:'Anotativo (tamanho no papel)',ty:'chk',v:'ANNOTATIVE',hint:'Setas e textos com o tamanho definido aqui no papel, em qualquer escala de viewport (como DIMSCALE 0). No Model, segue a escala de anotação da barra de status.'},
      {k:'dimscale',l:'Escala global',ty:'num',min:0.001,max:10000,st:0.5,v:'DIMSCALE',hint:'Multiplica setas, textos e afastamentos. Ex.: desenho em 1:50 → 50.'}]}]},
  {t:'Unidades primárias',sec:[
    {h:'Cotas lineares',f:[
      {k:'unitFmt',l:'Formato',ty:'sel',o:[['decimal','Decimal'],['scientific','Científico']],v:'DIMLUNIT'},
      {k:'unit',l:'Unidade exibida',ty:'sel',o:[['mm','mm (sem conversão)'],['cm','cm (÷10)'],['m','m (÷1000)'],['in','pol. (÷25,4)']],v:''},
      {k:'prec',l:'Precisão',ty:'sel',o:[['0','0'],['1','0.0'],['2','0.00'],['3','0.000'],['4','0.0000'],['5','0.00000'],['6','0.000000']],num:1,v:'DIMDEC'},
      {k:'decSep',l:'Separador decimal',ty:'sel',o:[['.','Ponto ( . )'],[',','Vírgula ( , )'],[' ','Espaço']],v:'DIMDSEP'},
      {k:'round',l:'Arredondar para',ty:'num',min:0,max:1000,st:0.05,v:'DIMRND'},
      {k:'prefix',l:'Prefixo',ty:'txt',v:'DIMPOST'},
      {k:'suffix',l:'Sufixo',ty:'txt',v:'DIMPOST'},
      {k:'scale',l:'Fator de escala da medida',ty:'num',min:0.0001,max:100000,st:0.1,v:'DIMLFAC',hint:'Ex.: desenho feito em escala 1:100 com medidas reais → 100.'},
      {k:'zLead',l:'Suprimir zero à esquerda',ty:'chk',v:'DIMZIN'},
      {k:'zTrail',l:'Suprimir zeros à direita',ty:'chk',v:'DIMZIN'}]},
    {h:'Cotas angulares',f:[
      {k:'angFmt',l:'Formato',ty:'sel',o:[['deg','Graus decimais'],['dms','Graus/min/seg'],['grad','Grados'],['rad','Radianos']],v:'DIMAUNIT'},
      {k:'angPrec',l:'Precisão',ty:'sel',o:[['0','0'],['1','0.0'],['2','0.00'],['3','0.000'],['4','0.0000']],num:1,v:'DIMADEC'},
      {k:'angZTrail',l:'Suprimir zeros à direita',ty:'chk',v:'DIMAZIN'}]}]},
  {t:'Unidades alternativas',sec:[
    {h:'Exibição',f:[
      {k:'altOn',l:'Mostrar unidades alternativas',ty:'chk',v:'DIMALT'},
      {k:'altMult',l:'Multiplicador',ty:'num',min:0.000001,max:100000,st:0.001,v:'DIMALTF',dep:'altOn',hint:'0,03937 = mm → pol.; 0,1 = mm → cm.'},
      {k:'altPrec',l:'Precisão',ty:'sel',o:[['0','0'],['1','0.0'],['2','0.00'],['3','0.000'],['4','0.0000']],num:1,v:'DIMALTD',dep:'altOn'},
      {k:'altPrefix',l:'Prefixo',ty:'txt',v:'DIMAPOST',dep:'altOn'},
      {k:'altSuffix',l:'Sufixo',ty:'txt',v:'DIMAPOST',dep:'altOn'},
      {k:'altPos',l:'Posição',ty:'sel',o:[['after','Após o valor primário'],['below','Abaixo do valor primário']],v:'',dep:'altOn'}]}]},
  {t:'Tolerâncias',sec:[
    {h:'Formato da tolerância (cotas lineares, raio e diâmetro)',f:[
      {k:'tolMethod',l:'Método',ty:'sel',o:[['none','Nenhuma'],['symmetric','Simétrica (±)'],['deviation','Desvio (+/−)'],['limits','Limites (máx./mín.)'],['basic','Básica (em caixa)']],v:'DIMTOL/DIMLIM'},
      {k:'tolPrec',l:'Precisão',ty:'sel',o:[['0','0'],['1','0.0'],['2','0.00'],['3','0.000'],['4','0.0000']],num:1,v:'DIMTDEC',dep:'tolMethod'},
      {k:'tolUpper',l:'Valor superior',ty:'num',min:0,max:1000,st:0.01,v:'DIMTP',dep:'tolMethod'},
      {k:'tolLower',l:'Valor inferior',ty:'num',min:0,max:1000,st:0.01,v:'DIMTM',dep:'tolMethod'},
      {k:'tolScale',l:'Altura relativa',ty:'num',min:0.1,max:2,st:0.05,v:'DIMTFAC',dep:'tolMethod'}]}]}
];

function showDimStyle(){
  S.dimStyles=S.dimStyles.map(normDimStyle);
  if(!DDIM.sel||!dspGetStyle(DDIM.sel)) DDIM.sel=S.dimCurrent;
  ddimRenderManager();
  document.getElementById('ov-dimstyle').classList.add('show');
  log('DDIM: Gerenciador de estilos de cota.','inf');
}
function ddimRenderManager(){
  var cur=document.getElementById('ddim-cur'); cur.textContent=S.dimCurrent;
  var list=document.getElementById('ddim-list'); list.textContent='';
  var flt=document.getElementById('ddim-filter').value;
  S.dimStyles.forEach(function(st){
    var n=dimUseCount(st.name);
    if(flt==='used'&&n===0&&st.name!==S.dimCurrent) return;
    var d=document.createElement('div');
    d.className='ddim-item'+(st.name===DDIM.sel?' active':'');
    var star=document.createElement('span');star.className='ddim-star';star.textContent=st.name===S.dimCurrent?'★':'';
    var nm=document.createElement('span');nm.className='ddim-nm';nm.textContent=st.name;
    var ct=document.createElement('span');ct.className='ddim-ct';ct.textContent=n?n+' cota'+(n>1?'s':''):'';
    d.appendChild(star);d.appendChild(nm);d.appendChild(ct);
    d.addEventListener('click',function(){DDIM.sel=st.name;ddimRenderManager();});
    d.addEventListener('dblclick',function(){DDIM.sel=st.name;ddimModify();});
    list.appendChild(d);
  });
  var st=dspGetStyle(DDIM.sel)||curDimStyle();
  document.getElementById('ddim-prev-title').textContent='Pré-visualização: '+st.name;
  document.getElementById('ddim-desc').textContent=ddimDescribe(st);
  ddimDrawPreview(document.getElementById('ddim-preview'),st);
  var nsel=S.sel.filter(function(id){return isDim(findE(id));}).length;
  var ap=document.getElementById('ddim-apply');ap.disabled=!nsel;ap.textContent='Aplicar à seleção'+(nsel?' ('+nsel+')':'');
  document.getElementById('ddim-del').disabled=(st.name==='Standard'||st.name===S.dimCurrent||dimUseCount(st.name)>0);
  document.getElementById('ddim-setcur').disabled=(st.name===S.dimCurrent);
}
function ddimDescribe(st){
  var arr={filled:'preenchidas',open:'abertas',open90:'abertas 90°',tick:'traço oblíquo',dot:'ponto',none:'sem seta'}[st.arrowType]||st.arrowType;
  var sep=st.decSep===','?'vírgula':st.decSep===' '?'espaço':'ponto';
  var tol={none:'sem tolerância',symmetric:'tolerância simétrica',deviation:'tolerância por desvio',limits:'limites',basic:'cota básica'}[st.tolMethod];
  return (st.desc?st.desc+'\n':'')+'Texto '+dimFmtNum(st.txtH,3,',',false,true,0)+' mm · setas '+arr+' '+dimFmtNum(st.arrowSize,3,',',false,true,0)+' mm · escala global '+dimFmtNum(st.dimscale,3,',',false,true,0)+
    '\nPrecisão '+(st.prec>0?'0.'+'0'.repeat(st.prec):'0')+' · separador '+sep+(st.unit!=='mm'?' · em '+st.unit:'')+' · ângulos '+dimAngText(45,st)+' · '+tol+(st.altOn?' · unidades alternativas':'');
}
// Pré-visualização: peça de exemplo com cotas linear, alinhada, raio, diâmetro e angular
function ddimSample(){
  var fil=[];for(var i=0;i<=12;i++){var t=-Math.PI/2+i/12*Math.PI/2;fil.push([51+9*Math.cos(t),9+9*Math.sin(t)]);}
  return {
    geom:[{k:'poly',pts:[[0,0],[51,0]].concat(fil).concat([[60,25],[45,40],[0,40],[0,0]])},{k:'circle',cx:18,cy:20,r:8}],
    dims:[
      {tp:'dim',subtp:'linear',dimDir:'h',x1:0,y1:0,x2:60,y2:9,px:30,py:-12},
      {tp:'dim',subtp:'linear',dimDir:'v',x1:0,y1:0,x2:0,y2:40,px:-12,py:20},
      {tp:'dim',subtp:'aligned',x1:60,y1:25,x2:45,y2:40,px:59,py:39},
      {tp:'dimd',cx:18,cy:20,ex:36,ey:33,val:'16'},
      {tp:'dimr',cx:51,cy:9,ex:68,ey:-6,val:'9'},
      {tp:'dima',vx:60,vy:25,x1:60,y1:9,x2:45,y2:40,px:54,py:24}
    ]};
}
function ddimDrawPreview(cv,st){
  if(!cv) return;
  var dpr=window.devicePixelRatio||1,W=cv.clientWidth||cv.width,H=cv.clientHeight||cv.height;
  cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
  var ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle='#080b18';ctx.fillRect(0,0,W,H);
  var smp=ddimSample(),ds=st.dimscale||1;
  // a pré-visualização mostra o estilo em escala relativa: tamanhos ÷ escala global
  var st2=JSON.parse(JSON.stringify(st));st2.dimscale=1;st2.annot=false;
  var all=[];smp.dims.forEach(function(d){all=all.concat(dimPrims(d,st2));});
  var bb=primsBox(all.concat([{k:'line',x1:0,y1:0,x2:60,y2:40}]))||{x:-10,y:-10,w:80,h:60};
  var k=Math.min((W-20)/bb.w,(H-20)/bb.h),ox=(W-bb.w*k)/2-bb.x*k,oy=(H+bb.h*k)/2+bb.y*k;
  function map(x,y){return{x:x*k+ox,y:-y*k+oy};}
  ctx.strokeStyle='#dce4f5';ctx.lineWidth=1.2;
  smp.geom.forEach(function(g){
    ctx.beginPath();
    if(g.k==='poly'){g.pts.forEach(function(p,i){var q=map(p[0],p[1]);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);});}
    if(g.k==='circle'){var c=map(g.cx,g.cy);ctx.arc(c.x,c.y,g.r*k,0,Math.PI*2);}
    if(g.k==='arc'){var c2=map(g.cx,g.cy);ctx.arc(c2.x,c2.y,g.r*k,-g.sa,-g.ea,true);}
    ctx.stroke();
  });
  smp.dims.forEach(function(d){renderDimPrims(ctx,dimPrims(d,st2),st2,map,k,{minLw:0.8,bg:'#080b18'});});
  if(ds!==1){ctx.fillStyle='#546e7a';ctx.font='9px Consolas';ctx.textAlign='right';ctx.fillText('escala global ×'+dimFmtNum(ds,3,',',false,true,0)+' aplicada no desenho',W-6,H-6);}
}
function ddimSetCurrent(){
  var st=dspGetStyle(DDIM.sel);if(!st) return;
  S.dimCurrent=st.name;S.dirty=true;updDimStyleSel();ddimRenderManager();
  log('DIMSTYLE: estilo atual = "'+st.name+'".','ok');
}
function ddimNew(){
  var base=document.getElementById('ddimn-base');base.textContent='';
  S.dimStyles.forEach(function(st){var o=document.createElement('option');o.value=st.name;o.textContent=st.name;if(st.name===DDIM.sel)o.selected=true;base.appendChild(o);});
  var i=1,nm;do{nm='Cópia de '+DDIM.sel+(i>1?' ('+i+')':'');i++;}while(dspGetStyle(nm));
  document.getElementById('ddimn-name').value=nm;
  document.getElementById('ddimn-cur').checked=false;
  document.getElementById('ov-ddimnew').classList.add('show');
  setTimeout(function(){var n=document.getElementById('ddimn-name');n.focus();n.select();},30);
}
function ddimNewContinue(){
  var nm=document.getElementById('ddimn-name').value.trim();
  if(!nm){alert('Informe um nome para o estilo.');return;}
  if(dspGetStyle(nm)){alert('Já existe um estilo chamado "'+nm+'".');return;}
  var base=dspGetStyle(document.getElementById('ddimn-base').value)||curDimStyle();
  DDIM.edit=normDimStyle(JSON.parse(JSON.stringify(base)));DDIM.edit.name=nm;DDIM.edit.desc='';
  DDIM.isNew=true;DDIM.editName=nm;DDIM.makeCur=document.getElementById('ddimn-cur').checked;
  closeOv('ov-ddimnew');ddimOpenEditor('Novo estilo de cota: '+nm);
}
function ddimModify(){
  var st=dspGetStyle(DDIM.sel);if(!st) return;
  DDIM.edit=normDimStyle(JSON.parse(JSON.stringify(st)));DDIM.isNew=false;DDIM.editName=st.name;DDIM.makeCur=false;
  ddimOpenEditor('Modificar estilo de cota: '+st.name);
}
function ddimOpenEditor(title){
  document.getElementById('ddime-title').textContent=title;
  DDIM.tab=DDIM.tab||0;ddimBuildTabs();ddimBuildPane();
  document.getElementById('ov-dimedit').classList.add('show');
  ddimEditPreview();
}
function ddimBuildTabs(){
  var tb=document.getElementById('ddime-tabs');tb.textContent='';
  DDIM_TABS.forEach(function(t,i){
    var d=document.createElement('div');d.className='ddim-tab'+(i===DDIM.tab?' on':'');d.textContent=t.t;
    d.addEventListener('click',function(){DDIM.tab=i;ddimBuildTabs();ddimBuildPane();});
    tb.appendChild(d);
  });
}
function ddimBuildPane(){
  var pane=document.getElementById('ddime-pane');pane.textContent='';
  var st=DDIM.edit,tab=DDIM_TABS[DDIM.tab];
  tab.sec.forEach(function(sec){
    var fs=document.createElement('fieldset');fs.className='ddim-sec';
    var lg=document.createElement('legend');lg.textContent=sec.h;fs.appendChild(lg);
    sec.f.forEach(function(f){
      var row=document.createElement('div');row.className='ddim-row';row.setAttribute('data-k',f.k);
      var lb=document.createElement('label');lb.textContent=f.l;lb.htmlFor='ddf-'+f.k;
      var inp;
      if(f.ty==='sel'){inp=document.createElement('select');f.o.forEach(function(o){var op=document.createElement('option');op.value=o[0];op.textContent=o[1];inp.appendChild(op);});inp.value=String(st[f.k]);
        if(inp.selectedIndex<0&&f.num){var op2=document.createElement('option');op2.value=String(st[f.k]);op2.textContent=String(st[f.k]);inp.appendChild(op2);inp.value=String(st[f.k]);}}
      else if(f.ty==='chk'){inp=document.createElement('input');inp.type='checkbox';inp.checked=!!st[f.k];}
      else if(f.ty==='color'){inp=document.createElement('input');inp.type='color';inp.value=safeCol(st[f.k]);}
      else if(f.ty==='txt'){inp=document.createElement('input');inp.type='text';inp.maxLength=20;inp.value=st[f.k]||'';}
      else {inp=document.createElement('input');inp.type='number';inp.min=f.min;inp.max=f.max;inp.step=f.st;inp.value=st[f.k];}
      inp.id='ddf-'+f.k;inp.className='ddim-inp';
      var ev=(f.ty==='sel'||f.ty==='chk'||f.ty==='color')?'change':'input';
      inp.addEventListener(ev,function(){
        var v;
        if(f.ty==='chk') v=inp.checked;
        else if(f.ty==='num'||f.num){v=parseFloat(String(inp.value).replace(',','.'));if(!isFinite(v)){inp.classList.add('bad');return;}
          if(f.min!==undefined&&v<f.min){inp.classList.add('bad');return;} if(f.max!==undefined&&v>f.max){inp.classList.add('bad');return;}}
        else v=inp.value;
        inp.classList.remove('bad');st[f.k]=v;ddimDeps();ddimEditPreview();
      });
      if(f.ty==='color') inp.addEventListener('input',function(){st[f.k]=inp.value;ddimEditPreview();});
      row.appendChild(lb);row.appendChild(inp);
      if(f.v){var vv=document.createElement('span');vv.className='ddim-var';vv.textContent=f.v;vv.title='Variável equivalente no AutoCAD';row.appendChild(vv);}
      if(f.hint) row.title=f.hint;
      fs.appendChild(row);
      if(f.hint){var hh=document.createElement('div');hh.className='ddim-hint';hh.textContent=f.hint;fs.appendChild(hh);}
    });
    pane.appendChild(fs);
  });
  ddimDeps();
}
// Campos dependentes ficam esmaecidos quando a opção-mãe está desligada
function ddimDeps(){
  var st=DDIM.edit;
  DDIM_TABS.forEach(function(t){t.sec.forEach(function(sec){sec.f.forEach(function(f){
    if(!f.dep) return;
    var row=document.querySelector('#ddime-pane .ddim-row[data-k="'+f.k+'"]');if(!row) return;
    var on=f.dep==='tolMethod'?(st.tolMethod!=='none'&&!(st.tolMethod==='symmetric'&&f.k==='tolLower')&&!(st.tolMethod==='basic'&&f.k!=='tolPrec')&&!((st.tolMethod==='symmetric')&&f.k==='tolScale')):!!st[f.dep];
    if(st.tolMethod==='basic'&&f.dep==='tolMethod') on=false;
    row.classList.toggle('off',!on);
  });});});
}
function ddimEditPreview(){ ddimDrawPreview(document.getElementById('ddime-preview'),DDIM.edit); }
function ddimEditOK(){
  var bad=document.querySelector('#ddime-pane .ddim-inp.bad');
  if(bad){alert('Corrija o valor destacado antes de salvar.');bad.focus();return;}
  var st=normDimStyle(DDIM.edit);
  if(DDIM.isNew){ S.dimStyles.push(st); if(DDIM.makeCur) S.dimCurrent=st.name; log('DIMSTYLE: estilo "'+st.name+'" criado.','ok'); }
  else { for(var i=0;i<S.dimStyles.length;i++) if(S.dimStyles[i].name===DDIM.editName) S.dimStyles[i]=st; log('DIMSTYLE: estilo "'+st.name+'" atualizado ('+dimUseCount(st.name)+' cota(s) redesenhada(s)).','ok'); }
  DDIM.sel=st.name;DDIM.edit=null;S.dirty=true;
  closeOv('ov-dimedit');updDimStyleSel();ddimRenderManager();renderAll();
  if(LY&&LY.active==='layout') layoutRender();
}
function ddimEditCancel(){ DDIM.edit=null; closeOv('ov-dimedit'); }
function ddimRename(){
  var st=dspGetStyle(DDIM.sel);if(!st) return;
  if(st.name==='Standard'){alert('O estilo Standard não pode ser renomeado.');return;}
  var nm=prompt('Novo nome para o estilo "'+st.name+'":',st.name);if(nm===null) return;nm=nm.trim();
  if(!nm||nm===st.name) return;
  if(dspGetStyle(nm)){alert('Já existe um estilo chamado "'+nm+'".');return;}
  S.ents.forEach(function(e){if(isDim(e)&&e.dimStyle===st.name) e.dimStyle=nm;});
  if(S.dimCurrent===st.name) S.dimCurrent=nm;
  st.name=nm;DDIM.sel=nm;S.dirty=true;updDimStyleSel();ddimRenderManager();
}
function ddimDelete(){
  var st=dspGetStyle(DDIM.sel);if(!st) return;
  if(st.name==='Standard'){alert('O estilo Standard não pode ser excluído.');return;}
  if(st.name===S.dimCurrent){alert('O estilo atual não pode ser excluído. Defina outro estilo como atual primeiro.');return;}
  var n=dimUseCount(st.name);
  if(n){alert('O estilo "'+st.name+'" está em uso por '+n+' cota(s) e não pode ser excluído.');return;}
  if(!confirm('Excluir o estilo "'+st.name+'"?')) return;
  S.dimStyles=S.dimStyles.filter(function(s){return s!==st;});DDIM.sel=S.dimCurrent;S.dirty=true;updDimStyleSel();ddimRenderManager();
}
function ddimApplySel(){
  var st=dspGetStyle(DDIM.sel);if(!st) return;
  var ids=S.sel.filter(function(id){return isDim(findE(id));});if(!ids.length) return;
  snapshot();ids.forEach(function(id){findE(id).dimStyle=st.name;});
  renderAll();ddimRenderManager();log('DIMSTYLE: "'+st.name+'" aplicado a '+ids.length+' cota(s).','ok');
}
// Seletor de estilo no painel de propriedades
function updDimStyleSel(){
  var sel=document.getElementById('propDS');if(!sel) return;
  sel.textContent='';
  S.dimStyles.forEach(function(st){var o=document.createElement('option');o.value=st.name;o.textContent=st.name;if(st.name===S.dimCurrent)o.selected=true;sel.appendChild(o);});
}
function propDimStyleChange(v){
  if(!dspGetStyle(v)) return;
  var ids=S.sel.filter(function(id){return isDim(findE(id));});
  if(ids.length){ snapshot(); ids.forEach(function(id){findE(id).dimStyle=v;}); log('Estilo "'+v+'" aplicado a '+ids.length+' cota(s) selecionada(s).','ok'); }
  S.dimCurrent=v;S.dirty=true;renderAll();
  log('Estilo de cota atual: '+v,'ok');
}


