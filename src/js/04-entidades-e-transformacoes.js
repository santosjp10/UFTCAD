// ── ENTITY MANAGEMENT ────────────────────────────────────────
var _id=1000;
function uid(){ var id; do{ id='e'+(++_id); }while(findE(id)); return id; }
// v6.1: após carregar um documento, continuar a numeração acima dos IDs existentes
function syncIdCounter(){ for(var i=0;i<S.ents.length;i++){ var m=/^e(\d+)$/.exec(S.ents[i].id||''); if(m) _id=Math.max(_id,parseInt(m[1],10)); } }
function escHTML(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
function safeCol(c){ return /^#[0-9a-fA-F]{3,8}$/.test(String(c))?c:'#dce4f5'; }
function getLy(id){ for(var i=0;i<S.layers.length;i++) if(S.layers[i].id===id) return S.layers[i]; return null; }
function findE(id){ for(var i=0;i<S.ents.length;i++) if(S.ents[i].id===id) return S.ents[i]; return null; }

function addE(e,noSnap) {
  if(!e.id) e.id=uid();
  if(e.ly===undefined) e.ly=S.curLy;
  if(!e.col) e.col=S.style.col;
  if(!e.lw)  e.lw =S.style.lw;
  if(!e.ld)  e.ld =S.style.ld;
  if(!noSnap) snapshot();
  S.ents.push(e);
  renderAll();
  document.getElementById('scount').textContent=S.ents.length;
}

// transforms
function transl(e,dx,dy){
  switch(e.tp){
    case 'line': e.x1+=dx;e.y1+=dy;e.x2+=dx;e.y2+=dy; break;
    case 'circ':case 'arc':case 'ell': e.cx+=dx;e.cy+=dy; break;
    case 'rect':case 'hatch': e.x+=dx;e.y+=dy; break;
    case 'pl':case 'spline': for(var i=0;i<e.pts.length;i++){e.pts[i].x+=dx;e.pts[i].y+=dy;} break;
    case 'txt': e.x+=dx;e.y+=dy; break;
    case 'dim': e.x1+=dx;e.y1+=dy;e.x2+=dx;e.y2+=dy;if(e.px!==undefined){e.px+=dx;e.py+=dy;}else{e.off+=dy;}break;
    case 'dimr':case 'dimd': e.cx+=dx;e.cy+=dy;e.ex+=dx;e.ey+=dy; break;
    case 'dima': e.x1+=dx;e.y1+=dy;e.vx+=dx;e.vy+=dy;e.x2+=dx;e.y2+=dy;if(e.px!==undefined){e.px+=dx;e.py+=dy;} break;
  }
}

/* ── v6.1: TRANSFORMAÇÕES GENÉRICAS ───────────────────────────────
   Todas as transformações (rotate, mirror, scale) passam por xformE(e,fn,info),
   onde fn mapeia um ponto do mundo e info descreve a transformação:
   {kind:'rot',rad} | {kind:'mir',axisAng} | {kind:'scl',f}.
   Corrige: arcos (ângulos), retângulos (viram polilinha ao girar/espelhar),
   elipses (rotação), splines e cotas (antes ignoradas).                  */
function rectToPl(e){
  var x=e.x,y=e.y,w=e.w,h=e.h;
  e.tp='pl'; e.pts=[{x:x,y:y},{x:x+w,y:y},{x:x+w,y:y+h},{x:x,y:y+h},{x:x,y:y}]; e.closed=true;
  delete e.x; delete e.y; delete e.w; delete e.h;
}
function normDimLegacy(e){
  if(e.tp==='dim'&&e.px===undefined){ e.px=(e.x1+e.x2)/2; e.py=e.off; if(!e.subtp)e.subtp='linear'; if(!e.dimDir)e.dimDir='h'; delete e.off; }
}
// Cota linear (H/V) que sofre rotação não múltipla de 90° vira cota alinhada,
// preservando a grandeza medida (projeta o 2º ponto na direção medida).
function dimLinearToAligned(e){
  if(e.dimDir==='h'){ e.y2=e.y1; } else { e.x2=e.x1; }
  e.subtp='aligned'; delete e.dimDir;
}
function xformE(e,fn,info){
  function P(x,y){return fn(x,y);}
  switch(e.tp){
    case 'line':{var a=P(e.x1,e.y1),b=P(e.x2,e.y2);e.x1=a.x;e.y1=a.y;e.x2=b.x;e.y2=b.y;}break;
    case 'circ':{var c=P(e.cx,e.cy);e.cx=c.x;e.cy=c.y;if(info.kind==='scl')e.r*=info.f;}break;
    case 'arc':{
      var c=P(e.cx,e.cy);
      var ps=P(e.cx+e.r*Math.cos(e.sa),e.cy+e.r*Math.sin(e.sa));
      var pe=P(e.cx+e.r*Math.cos(e.ea),e.cy+e.r*Math.sin(e.ea));
      if(info.kind==='scl')e.r*=info.f;
      var sa=Math.atan2(ps.y-c.y,ps.x-c.x), ea=Math.atan2(pe.y-c.y,pe.x-c.x);
      if(info.kind==='mir'){var t=sa;sa=ea;ea=t;}   // espelhar inverte o sentido
      e.cx=c.x;e.cy=c.y;e.sa=sa;e.ea=ea;
    }break;
    case 'ell':{
      var c=P(e.cx,e.cy);e.cx=c.x;e.cy=c.y;
      var rot=e.rot||0;
      if(info.kind==='rot') rot+=info.rad;
      else if(info.kind==='mir') rot=2*info.axisAng-rot;
      else {e.rx*=info.f;e.ry*=info.f;}
      e.rot=rot;
    }break;
    case 'rect':
      if(info.kind==='scl'){var a=P(e.x,e.y);e.x=a.x;e.y=a.y;e.w*=info.f;e.h*=info.f;break;}
      rectToPl(e); // fallthrough para 'pl'
    case 'pl':case 'spline':{var np=[];for(var i=0;i<e.pts.length;i++)np.push(P(e.pts[i].x,e.pts[i].y));e.pts=np;}break;
    case 'txt':{
      var a=P(e.x,e.y);e.x=a.x;e.y=a.y;
      if(info.kind==='rot') e.rot=(e.rot||0)+info.rad;
      else if(info.kind==='scl') e.h*=info.f;
      // espelhamento: texto permanece legível (equivalente a MIRRTEXT=0 no AutoCAD)
    }break;
    case 'hatch':{
      // Hachura v6.1 é retangular: preserva-se a orientação do contorno,
      // move-se o centro e gira-se o padrão. Contorno arbitrário: previsto para v7.
      var cx=e.x+e.w/2,cy=e.y+e.h/2,c=P(cx,cy);
      if(info.kind==='scl'){e.w*=info.f;e.h*=info.f;}
      if(info.kind==='rot') e.ang=((e.ang||45)+info.rad*180/Math.PI)%360;
      if(info.kind==='mir') e.ang=(2*info.axisAng*180/Math.PI-(e.ang||45))%360;
      e.x=c.x-e.w/2;e.y=c.y-e.h/2;
    }break;
    case 'dim':{
      normDimLegacy(e);
      if(e.subtp!=='aligned'){
        var q=0;
        if(info.kind==='rot'){var k=info.rad/(Math.PI/2);q=Math.abs(k-Math.round(k))<1e-9?Math.round(k):null;}
        if(info.kind==='mir'){var k2=info.axisAng/(Math.PI/2);q=Math.abs(k2-Math.round(k2))<1e-9?0:null;}
        if(q===null) dimLinearToAligned(e);
        else if(Math.abs(q)%2===1) e.dimDir=(e.dimDir==='h'?'v':'h');
      }
      var a=P(e.x1,e.y1),b=P(e.x2,e.y2),p=P(e.px,e.py);
      e.x1=a.x;e.y1=a.y;e.x2=b.x;e.y2=b.y;e.px=p.x;e.py=p.y;
      if(info.kind==='scl') e.val=(parseFloat(e.val)*info.f).toFixed(2);
    }break;
    case 'dimr':case 'dimd':{
      var c=P(e.cx,e.cy),q2=P(e.ex,e.ey);e.cx=c.x;e.cy=c.y;e.ex=q2.x;e.ey=q2.y;
      if(info.kind==='scl') e.val=(parseFloat(e.val)*info.f).toFixed(2);
    }break;
    case 'dima':{
      var a=P(e.x1,e.y1),v=P(e.vx,e.vy),b=P(e.x2,e.y2);
      if(info.kind==='mir'){var t2=a;a=b;b=t2;}
      e.x1=a.x;e.y1=a.y;e.vx=v.x;e.vy=v.y;e.x2=b.x;e.y2=b.y;
      if(e.px!==undefined){var pp=P(e.px,e.py);e.px=pp.x;e.py=pp.y;}
    }break;
  }
}
function rotat(e,c,rad){
  var k=Math.cos(rad),s=Math.sin(rad);
  xformE(e,function(x,y){var dx=x-c.x,dy=y-c.y;return{x:c.x+dx*k-dy*s,y:c.y+dx*s+dy*k};},{kind:'rot',rad:rad});
}
function mirr(e,p1,p2){
  var dx=p2.x-p1.x,dy=p2.y-p1.y,l2=dx*dx+dy*dy; if(l2<1e-18) return;
  xformE(e,function(x,y){var t=((x-p1.x)*dx+(y-p1.y)*dy)/l2;return{x:2*(p1.x+t*dx)-x,y:2*(p1.y+t*dy)-y};},{kind:'mir',axisAng:Math.atan2(dy,dx)});
}
function scalE(e,c,f){
  xformE(e,function(x,y){return{x:c.x+(x-c.x)*f,y:c.y+(y-c.y)*f};},{kind:'scl',f:f});
}

/* ── OFFSET ──────────────────────────────────────────────────────────
   d com sinal: positivo = lado esquerdo (normal à esquerda do sentido p1→p2).
   v6.1: polilinhas (abertas e fechadas, com junção em quina viva) e retângulos
   negativos protegidos. Retorna false se o tipo não suporta offset.        */
var OFFSET_TYPES=['line','circ','arc','rect','ell','pl'];
function plOffsetPts(pts,closed,d){
  var P=pts.slice();
  if(closed&&P.length>2&&Math.hypot(P[0].x-P[P.length-1].x,P[0].y-P[P.length-1].y)<1e-9) P.pop();
  var n=P.length; if(n<2) return null;
  var segs=[];
  var m=closed?n:n-1;
  for(var i=0;i<m;i++){
    var a=P[i],b=P[(i+1)%n],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy);
    if(l<1e-12) continue;
    var nx=-dy/l*d,ny=dx/l*d;
    segs.push({ax:a.x+nx,ay:a.y+ny,bx:b.x+nx,by:b.y+ny});
  }
  if(!segs.length) return null;
  function join(s1,s2){
    var r=lineLineInt(s1.ax,s1.ay,s1.bx,s1.by,s2.ax,s2.ay,s2.bx,s2.by);
    return r?{x:r.x,y:r.y}:{x:s1.bx,y:s1.by};
  }
  var out=[];
  if(closed){
    for(var j=0;j<segs.length;j++) out.push(join(segs[(j-1+segs.length)%segs.length],segs[j]));
    out.push({x:out[0].x,y:out[0].y});
  } else {
    out.push({x:segs[0].ax,y:segs[0].ay});
    for(var j2=1;j2<segs.length;j2++) out.push(join(segs[j2-1],segs[j2]));
    var L=segs[segs.length-1]; out.push({x:L.bx,y:L.by});
  }
  return out;
}
function plSignedArea(pts){var a=0;for(var i=0;i<pts.length-1;i++)a+=pts[i].x*pts[i+1].y-pts[i+1].x*pts[i].y;return a/2;}
function offsE(e,d){
  switch(e.tp){
    case 'line':{var dx=e.x2-e.x1,dy=e.y2-e.y1,l=Math.hypot(dx,dy);var nx=-dy/l*d,ny=dx/l*d;e.x1+=nx;e.y1+=ny;e.x2+=nx;e.y2+=ny;}return true;
    case 'circ':case 'arc': if(e.r+d<=1e-9) return false; e.r+=d; return true;
    case 'rect': if(e.w+2*d<=1e-9||e.h+2*d<=1e-9) return false; e.x-=d;e.y-=d;e.w+=2*d;e.h+=2*d; return true;
    case 'ell': if(e.rx+d<=1e-9||e.ry+d<=1e-9) return false; e.rx+=d;e.ry+=d; return true; // aproximação (offset exato de elipse não é elipse)
    case 'pl':{var np=plOffsetPts(e.pts,!!e.closed,d); if(!np) return false; e.pts=np; return true;}
  }
  return false;
}

// Retorna a distância com sinal correto para o offset ficar do mesmo lado do cursor
function offsetSide(e,mx,my,d){
  switch(e.tp){
    case 'line':{
      var dx=e.x2-e.x1,dy=e.y2-e.y1,l=Math.hypot(dx,dy);
      if(l<1e-9)return d;
      var nx=-dy/l,ny=dx/l;
      var dot=(mx-e.x1)*nx+(my-e.y1)*ny;
      return dot>=0?d:-d;
    }
    case 'circ':case 'arc':{
      var dist=Math.hypot(mx-e.cx,my-e.cy);
      return dist>=e.r?d:-d;
    }
    case 'rect':{
      var inside=(mx>e.x&&mx<e.x+e.w&&my>e.y&&my<e.y+e.h);
      return inside?-d:d;
    }
    case 'ell':{
      var rr=e.rot||0,lx=(mx-e.cx)*Math.cos(-rr)-(my-e.cy)*Math.sin(-rr),ly2=(mx-e.cx)*Math.sin(-rr)+(my-e.cy)*Math.cos(-rr);
      return (lx*lx/(e.rx*e.rx)+ly2*ly2/(e.ry*e.ry))>=1?d:-d;
    }
    case 'pl':{
      // lado do segmento mais próximo do cursor
      var best=1e18,sg=1,P=e.pts;
      for(var i=0;i<P.length-1;i++){
        var ax=P[i].x,ay=P[i].y,bx=P[i+1].x,by=P[i+1].y,sd=segD(mx,my,ax,ay,bx,by);
        if(sd<best){best=sd;var ddx=bx-ax,ddy=by-ay;sg=((mx-ax)*(-ddy)+(my-ay)*ddx)>=0?1:-1;}
      }
      return sg*d;
    }
    default: return d;
  }
}
function clon(e){var c=JSON.parse(JSON.stringify(e));c.id=uid();return c;}

