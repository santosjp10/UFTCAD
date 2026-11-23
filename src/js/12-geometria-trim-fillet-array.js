// ── TRIM / EXTEND GEOMETRY ────────────────────────────────────

// Line-line intersection (parametric)
function lineLineInt(ax,ay,bx,by,cx,cy,dx,dy){
  var d1x=bx-ax,d1y=by-ay,d2x=dx-cx,d2y=dy-cy;
  var cross=d1x*d2y-d1y*d2x;
  if(Math.abs(cross)<1e-10)return null;
  var t=((cx-ax)*d2y-(cy-ay)*d2x)/cross;
  var u=((cx-ax)*d1y-(cy-ay)*d1x)/cross;
  return{t:t,u:u,x:ax+t*d1x,y:ay+t*d1y};
}

// line-circle intersections: returns array of {t, x, y}
function lineCircInt(ax,ay,bx,by,cx,cy,r){
  var dx=bx-ax,dy=by-ay;
  var fx=ax-cx,fy=ay-cy;
  var a=dx*dx+dy*dy,b=2*(fx*dx+fy*dy),c=fx*fx+fy*fy-r*r;
  var disc=b*b-4*a*c;
  if(disc<0)return[];
  var res=[],sq=Math.sqrt(disc);
  var t1=(-b-sq)/(2*a),t2=(-b+sq)/(2*a);
  var ix1=ax+t1*dx,iy1=ay+t1*dy,ix2=ax+t2*dx,iy2=ay+t2*dy;
  res.push({t:t1,x:ix1,y:iy1});
  if(Math.abs(disc)>1e-10)res.push({t:t2,x:ix2,y:iy2});
  return res;
}

// Get all intersections between entity e and cutting entities
function getIntersections(e,cutters){
  var pts=[];
  for(var i=0;i<cutters.length;i++){
    var c=findE(cutters[i]);
    if(!c||c.id===e.id)continue;
    var ips=entIntersect(e,c);
    for(var j=0;j<ips.length;j++)pts.push(ips[j]);
  }
  return pts;
}

function entIntersect(e1,e2){
  var pts=[];
  var EPS=1e-6;

  // ── helpers ──────────────────────────────────────────────────
  // normalizar e1/e2 para que e1 seja sempre 'line' quando um é linha
  // tratamos os dois sentidos (e1 vs e2 e e2 vs e1) onde necessário

  // ── LINE vs LINE ─────────────────────────────────────────────
  if(e1.tp==='line'&&e2.tp==='line'){
    var r=lineLineInt(e1.x1,e1.y1,e1.x2,e1.y2,e2.x1,e2.y1,e2.x2,e2.y2);
    // t = param na linha e1 (alvo), u = param na linha e2 (limite)
    // u deve estar dentro do segmento e2 (o limite existe)
    // t NÃO é clampado — o doTrim filtra os que estão fora de [0,1]
    if(r&&r.u>=-EPS&&r.u<=1+EPS)
      pts.push({t:r.t,x:r.x,y:r.y});
  }

  // ── LINE vs CIRC/ARC (e1=line, e2=circ/arc) ──────────────────
  function lineVsCirc(line,circ){
    var ips=lineCircInt(line.x1,line.y1,line.x2,line.y2,circ.cx,circ.cy,circ.r);
    for(var k=0;k<ips.length;k++){
      // se for arco, o ponto deve estar no arco
      if(circ.tp==='arc'&&!arcHas(Math.atan2(ips[k].y-circ.cy,ips[k].x-circ.cx),circ.sa,circ.ea)) continue;
      // t não é clampado — o doTrim filtra
      pts.push({t:ips[k].t,x:ips[k].x,y:ips[k].y});
    }
  }
  if(e1.tp==='line'&&(e2.tp==='circ'||e2.tp==='arc')) lineVsCirc(e1,e2);
  if(e2.tp==='line'&&(e1.tp==='circ'||e1.tp==='arc')) lineVsCirc(e2,e1);

  // ── LINE vs RECT ──────────────────────────────────────────────
  function lineVsRect(line,rect){
    var sides=[
      {x1:rect.x,        y1:rect.y,        x2:rect.x+rect.w, y2:rect.y},
      {x1:rect.x+rect.w, y1:rect.y,        x2:rect.x+rect.w, y2:rect.y+rect.h},
      {x1:rect.x,        y1:rect.y+rect.h, x2:rect.x+rect.w, y2:rect.y+rect.h},
      {x1:rect.x,        y1:rect.y,        x2:rect.x,        y2:rect.y+rect.h}
    ];
    for(var s=0;s<sides.length;s++){
      var r2=lineLineInt(line.x1,line.y1,line.x2,line.y2,sides[s].x1,sides[s].y1,sides[s].x2,sides[s].y2);
      if(r2&&r2.u>=-EPS&&r2.u<=1+EPS)
        pts.push({t:r2.t,x:r2.x,y:r2.y});
    }
  }
  if(e1.tp==='line'&&e2.tp==='rect') lineVsRect(e1,e2);
  if(e2.tp==='line'&&e1.tp==='rect') lineVsRect(e2,e1);

  // ── CIRC/ARC vs CIRC/ARC ─────────────────────────────────────
  if((e1.tp==='circ'||e1.tp==='arc')&&(e2.tp==='circ'||e2.tp==='arc')){
    var dx=e2.cx-e1.cx,dy=e2.cy-e1.cy,d=Math.hypot(dx,dy);
    if(d>EPS&&d<e1.r+e2.r&&d>Math.abs(e1.r-e2.r)){
      var aa=(e1.r*e1.r-e2.r*e2.r+d*d)/(2*d),h2=e1.r*e1.r-aa*aa;
      if(h2>=0){
        var h=Math.sqrt(h2);
        var mx=e1.cx+aa*dx/d,my=e1.cy+aa*dy/d;
        var candidates=[{x:mx+h*dy/d,y:my-h*dx/d},{x:mx-h*dy/d,y:my+h*dx/d}];
        for(var k=0;k<candidates.length;k++){
          var px=candidates[k].x,py=candidates[k].y;
          var a1=Math.atan2(py-e1.cy,px-e1.cx);
          var a2=Math.atan2(py-e2.cy,px-e2.cx);
          if(e1.tp==='arc'&&!arcHas(a1,e1.sa,e1.ea)) continue;
          if(e2.tp==='arc'&&!arcHas(a2,e2.sa,e2.ea)) continue;
          pts.push({t:a1,x:px,y:py,isAng:true});
        }
      }
    }
  }

  // ── CIRC/ARC vs LINE (via RECT handled above; cover circ vs rect) ─
  // arc/circ vs rect: check each side
  function circVsRect(circ,rect){
    var sides=[
      {tp:'line',x1:rect.x,        y1:rect.y,        x2:rect.x+rect.w, y2:rect.y},
      {tp:'line',x1:rect.x+rect.w, y1:rect.y,        x2:rect.x+rect.w, y2:rect.y+rect.h},
      {tp:'line',x1:rect.x,        y1:rect.y+rect.h, x2:rect.x+rect.w, y2:rect.y+rect.h},
      {tp:'line',x1:rect.x,        y1:rect.y,        x2:rect.x,        y2:rect.y+rect.h}
    ];
    for(var s=0;s<sides.length;s++) lineVsCirc(sides[s],circ);
  }
  if((e1.tp==='circ'||e1.tp==='arc')&&e2.tp==='rect') circVsRect(e1,e2);
  if((e2.tp==='circ'||e2.tp==='arc')&&e1.tp==='rect') circVsRect(e2,e1);

  return pts;
}

// Interseções entre dois segmentos para uso no snap: ambos t e u devem estar em [0,1]
function entIntersectSnap(e1,e2){
  var pts=[], EPS=1e-6;

  // LINE vs LINE — ambos os parâmetros dentro do segmento
  if(e1.tp==='line'&&e2.tp==='line'){
    var r=lineLineInt(e1.x1,e1.y1,e1.x2,e1.y2,e2.x1,e2.y1,e2.x2,e2.y2);
    if(r&&r.t>=-EPS&&r.t<=1+EPS&&r.u>=-EPS&&r.u<=1+EPS)
      pts.push({x:r.x,y:r.y});
    return pts;
  }

  // LINE vs CIRC/ARC — t deve estar em [0,1]
  function lineVsCircSnap(line,circ){
    var ips=lineCircInt(line.x1,line.y1,line.x2,line.y2,circ.cx,circ.cy,circ.r);
    for(var k=0;k<ips.length;k++){
      var ip=ips[k];
      if(ip.t<-EPS||ip.t>1+EPS) continue;
      if(circ.tp==='arc'&&!arcHas(Math.atan2(ip.y-circ.cy,ip.x-circ.cx),circ.sa,circ.ea)) continue;
      pts.push({x:ip.x,y:ip.y});
    }
  }
  if(e1.tp==='line'&&(e2.tp==='circ'||e2.tp==='arc')){lineVsCircSnap(e1,e2);return pts;}
  if(e2.tp==='line'&&(e1.tp==='circ'||e1.tp==='arc')){lineVsCircSnap(e2,e1);return pts;}

  // LINE vs RECT — cada lado como segmento
  function lineVsRectSnap(line,rect){
    var sides=[
      {tp:'line',x1:rect.x,        y1:rect.y,        x2:rect.x+rect.w, y2:rect.y},
      {tp:'line',x1:rect.x+rect.w, y1:rect.y,        x2:rect.x+rect.w, y2:rect.y+rect.h},
      {tp:'line',x1:rect.x,        y1:rect.y+rect.h, x2:rect.x+rect.w, y2:rect.y+rect.h},
      {tp:'line',x1:rect.x,        y1:rect.y,        x2:rect.x,        y2:rect.y+rect.h}
    ];
    for(var s=0;s<sides.length;s++){
      var r2=lineLineInt(line.x1,line.y1,line.x2,line.y2,sides[s].x1,sides[s].y1,sides[s].x2,sides[s].y2);
      if(r2&&r2.t>=-EPS&&r2.t<=1+EPS&&r2.u>=-EPS&&r2.u<=1+EPS) pts.push({x:r2.x,y:r2.y});
    }
  }
  if(e1.tp==='line'&&e2.tp==='rect'){lineVsRectSnap(e1,e2);return pts;}
  if(e2.tp==='line'&&e1.tp==='rect'){lineVsRectSnap(e2,e1);return pts;}

  // CIRC/ARC vs CIRC/ARC
  if((e1.tp==='circ'||e1.tp==='arc')&&(e2.tp==='circ'||e2.tp==='arc')){
    var dx=e2.cx-e1.cx,dy=e2.cy-e1.cy,d=Math.hypot(dx,dy);
    if(d>EPS&&d<e1.r+e2.r&&d>Math.abs(e1.r-e2.r)){
      var aa=(e1.r*e1.r-e2.r*e2.r+d*d)/(2*d),h2=e1.r*e1.r-aa*aa;
      if(h2>=0){
        var h=Math.sqrt(h2),mx=e1.cx+aa*dx/d,my=e1.cy+aa*dy/d;
        var cands=[{x:mx+h*dy/d,y:my-h*dx/d},{x:mx-h*dy/d,y:my+h*dx/d}];
        for(var k=0;k<cands.length;k++){
          var px=cands[k].x,py=cands[k].y;
          var a1=Math.atan2(py-e1.cy,px-e1.cx),a2=Math.atan2(py-e2.cy,px-e2.cx);
          if(e1.tp==='arc'&&!arcHas(a1,e1.sa,e1.ea)) continue;
          if(e2.tp==='arc'&&!arcHas(a2,e2.sa,e2.ea)) continue;
          pts.push({x:px,y:py});
        }
      }
    }
    return pts;
  }

  // CIRC/ARC vs RECT
  function circVsRectSnap(circ,rect){
    var sides=[
      {tp:'line',x1:rect.x,        y1:rect.y,        x2:rect.x+rect.w, y2:rect.y},
      {tp:'line',x1:rect.x+rect.w, y1:rect.y,        x2:rect.x+rect.w, y2:rect.y+rect.h},
      {tp:'line',x1:rect.x,        y1:rect.y+rect.h, x2:rect.x+rect.w, y2:rect.y+rect.h},
      {tp:'line',x1:rect.x,        y1:rect.y,        x2:rect.x,        y2:rect.y+rect.h}
    ];
    for(var s=0;s<sides.length;s++) lineVsCircSnap(sides[s],circ);
  }
  if((e1.tp==='circ'||e1.tp==='arc')&&e2.tp==='rect'){circVsRectSnap(e1,e2);return pts;}
  if((e2.tp==='circ'||e2.tp==='arc')&&e1.tp==='rect'){circVsRectSnap(e2,e1);return pts;}

  // POLYLINE vs qualquer — tratar cada segmento
  function plVsEnt(pl,other){
    for(var s=0;s<pl.pts.length-1;s++){
      var seg={tp:'line',x1:pl.pts[s].x,y1:pl.pts[s].y,x2:pl.pts[s+1].x,y2:pl.pts[s+1].y};
      var sub=entIntersectSnap(seg,other);
      for(var k=0;k<sub.length;k++) pts.push(sub[k]);
    }
  }
  if(e1.tp==='pl'){plVsEnt(e1,e2);return pts;}
  if(e2.tp==='pl'){plVsEnt(e2,e1);return pts;}

  return pts;
}

// Param t on line [0..1] = within segment, outside = extension
function paramOnLine(e,x,y){
  var dx=e.x2-e.x1,dy=e.y2-e.y1,l2=dx*dx+dy*dy;
  if(l2<1e-12)return 0;
  return((x-e.x1)*dx+(y-e.y1)*dy)/l2;
}

// v6.1: extremidade a substituir num FILLET/CHAMFER.
// ti = parâmetro da interseção na linha; s = lado mantido (+1/-1, onde o usuário clicou).
function endToTrim(ti,s){
  var o0=0-ti,o1=1-ti;
  if(o0*o1<0) return (o1*s>0)?1:2;           // linha atravessa o canto: troca a ponta do lado oposto ao clique
  return Math.abs(o0)<=Math.abs(o1)?1:2;      // linha não alcança o canto: troca a ponta mais próxima dele
}
// Which end of a line is closer to a point?
function nearerEnd(e,px,py){
  var d1=Math.hypot(px-e.x1,py-e.y1),d2=Math.hypot(px-e.x2,py-e.y2);
  return d1<=d2?1:2;
}

// Retorna o segmento (ou arco) que seria removido pelo trim, para preview
// Retorna null se não há interseção
function getTrimPreview(tgt,clickPt,cutters){
  if(tgt.tp==='line'){
    var ips=getIntersections(tgt,cutters);
    if(!ips.length) return null;
    var ts=ips.map(function(p){return{t:p.t,x:p.x,y:p.y};});
    ts=ts.filter(function(v){return v.t>1e-6&&v.t<1-1e-6;});
    ts.sort(function(a,b){return a.t-b.t;});
    ts=ts.filter(function(v,i){return i===0||Math.abs(v.t-ts[i-1].t)>1e-6;});
    var tc=paramOnLine(tgt,clickPt.x,clickPt.y);
    var seg=findTrimSeg(ts,tc,tgt);
    if(!seg) return null;
    // Trecho a REMOVER:
    // - começa em seg.from (se existe) ou no início da linha (tgt.x1)
    // - termina em seg.to (se existe) ou no fim da linha (tgt.x2)
    var x1=seg.from?seg.from.x:tgt.x1, y1=seg.from?seg.from.y:tgt.y1;
    var x2=seg.to  ?seg.to.x  :tgt.x2, y2=seg.to  ?seg.to.y  :tgt.y2;
    return {type:'line',x1:x1,y1:y1,x2:x2,y2:y2};
  } else if(tgt.tp==='arc'||tgt.tp==='circ'){
    var ips=getIntersections(tgt,cutters);
    if(ips.length<2) return null;
    var TWO_PI=Math.PI*2;
    var norm=function(v){return((v%TWO_PI)+TWO_PI)%TWO_PI;};
    var angs=ips.map(function(p){return norm(Math.atan2(p.y-tgt.cy,p.x-tgt.cx));});
    angs.sort(function(a,b){return a-b;});
    // deduplicate
    angs=angs.filter(function(v,i){return i===0||Math.abs(v-angs[i-1])>1e-6;});
    // Para arcos, filtrar apenas interseções dentro do arco
    if(tgt.tp==='arc'){
      angs=angs.filter(function(a){return arcHas(a,tgt.sa,tgt.ea);});
      if(angs.length<2) return null;
    }
    var ca=norm(Math.atan2(clickPt.y-tgt.cy,clickPt.x-tgt.cx));
    var seg=findArcTrimSeg(angs,ca);
    if(!seg) return null;
    // O preview mostra o trecho que será REMOVIDO (seg.sa → seg.ea)
    return {type:'arc',cx:tgt.cx,cy:tgt.cy,r:tgt.r,sa:seg.sa,ea:seg.ea};
  }
  return null;
}

// Encontra o segmento [from,to] que contém tc
function findTrimSeg(ts,tc,tgt){
  if(!ts.length) return null;
  if(tc<=ts[0].t)  return {from:null,      to:ts[0]};
  if(tc>=ts[ts.length-1].t) return {from:ts[ts.length-1], to:null};
  for(var k=0;k<ts.length-1;k++){
    if(tc>=ts[k].t&&tc<=ts[k+1].t) return {from:ts[k],to:ts[k+1]};
  }
  return null;
}

// Encontra o arco [sa,ea] CCW que contém o ângulo ca (para arcos/círculos)
// angs já está ordenado de 0..2PI. O circle/arc é dividido em N fatias CCW.
function findArcTrimSeg(angs,ca){
  var TWO_PI=Math.PI*2;
  var norm=function(v){return((v%TWO_PI)+TWO_PI)%TWO_PI;};
  ca=norm(ca);
  var n=angs.length;
  for(var k=0;k<n;k++){
    var sa=norm(angs[k]);
    var ea=norm(angs[(k+1)%n]);
    // verifica se ca está no intervalo CCW de sa→ea
    var span=(ea-sa+TWO_PI)%TWO_PI; // comprimento CCW do arco
    var dist=(ca-sa+TWO_PI)%TWO_PI; // distância CCW de sa até ca
    if(dist<=span+1e-9) return {sa:sa,ea:ea};
  }
  return null;
}

// Desenha um segmento preview (linha ou arco parcial) no ctx em screen coords
function drawSegment(ctx,seg){
  var sc=S.vp.sc;
  if(seg.type==='line'){
    var a=w2s(seg.x1,seg.y1),b=w2s(seg.x2,seg.y2);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  } else if(seg.type==='arc'){
    var c=w2s(seg.cx,seg.cy);
    // usar mesma convenção do render principal: ângulos negados, sentido horário no canvas (= CCW no espaço world)
    ctx.beginPath();ctx.arc(c.x,c.y,seg.r*sc,-seg.sa,-seg.ea,true);ctx.stroke();
  }
}

function doTrim(tgt,clickPt,cutters){
  if(tgt.tp==='line'){
    var ips=getIntersections(tgt,cutters);
    if(!ips.length) return false;
    var ts=ips.map(function(p){return{t:p.t,x:p.x,y:p.y};});
    // filtrar apenas interseções DENTRO do segmento alvo [0,1]
    ts=ts.filter(function(v){return v.t>1e-6&&v.t<1-1e-6;});
    ts.sort(function(a,b){return a.t-b.t;});
    // deduplicar
    ts=ts.filter(function(v,i){return i===0||Math.abs(v.t-ts[i-1].t)>1e-6;});
    var tc=paramOnLine(tgt,clickPt.x,clickPt.y);
    var seg=findTrimSeg(ts,tc,tgt);
    if(!seg) return false;
    snapshot();
    var idx=S.ents.indexOf(tgt);
    var newE=[];
    if(seg.from&&seg.to){
      // Clique entre dois limites: remover trecho do meio, manter as duas pontas
      // Ponta 1: do início (x1,y1) até seg.from
      var e1=clon(tgt);e1.x2=seg.from.x;e1.y2=seg.from.y;
      // Ponta 2: de seg.to até o fim (x2,y2)
      var e2=clon(tgt);e2.x1=seg.to.x;e2.y1=seg.to.y;
      newE=[e1,e2];
    } else if(seg.from&&!seg.to){
      // Clique após o último limite: remover de seg.from até o fim — manter início até seg.from
      var e1=clon(tgt);e1.x2=seg.from.x;e1.y2=seg.from.y;newE=[e1];
    } else if(!seg.from&&seg.to){
      // Clique antes do primeiro limite: remover do início até seg.to — manter seg.to até o fim
      var e1=clon(tgt);e1.x1=seg.to.x;e1.y1=seg.to.y;newE=[e1];
    }
    if(newE.length) S.ents.splice(idx,1,...newE); else S.ents.splice(idx,1);
    log('Trim concluído.','ok');renderAll();return true;

  } else if(tgt.tp==='arc'||tgt.tp==='circ'){
    var ips=getIntersections(tgt,cutters);
    if(ips.length<2) return false;
    var TWO_PI=Math.PI*2;
    var norm=function(v){return((v%TWO_PI)+TWO_PI)%TWO_PI;};
    var angs=ips.map(function(p){return norm(Math.atan2(p.y-tgt.cy,p.x-tgt.cx));});
    angs.sort(function(a,b){return a-b;});
    // deduplicar
    angs=angs.filter(function(v,i){return i===0||Math.abs(v-angs[i-1])>1e-6;});
    var ca=norm(Math.atan2(clickPt.y-tgt.cy,clickPt.x-tgt.cx));

    // Para arcos (não círculos), limitar os pontos de corte apenas aos que
    // estão dentro do arco existente
    if(tgt.tp==='arc'){
      angs=angs.filter(function(a){return arcHas(a,tgt.sa,tgt.ea);});
      if(angs.length<2) return false;
    }

    var seg=findArcTrimSeg(angs,ca);
    if(!seg) return false;

    snapshot();
    var idx=S.ents.indexOf(tgt);

    if(tgt.tp==='circ'){
      // Círculo: o trecho clicado (seg.sa→seg.ea) é REMOVIDO.
      // O resultado é um arco que vai de seg.ea → seg.sa (o complemento CCW).
      var ne=clon(tgt);
      ne.tp='arc';
      ne.sa=seg.ea;   // começa onde termina o trecho removido
      ne.ea=seg.sa;   // termina onde começa o trecho removido
      S.ents.splice(idx,1,ne);
      log('Trim círculo → arco.','ok');renderAll();return true;

    } else {
      // Arco existente: remover o trecho seg.sa→seg.ea (CCW).
      // Pode gerar até 2 arcos residuais.
      var origSa=norm(tgt.sa), origEa=norm(tgt.ea);
      var remSa=seg.sa, remEa=seg.ea; // trecho a remover (CCW)

      // Verificar se ca realmente cai dentro do arco existente
      if(!arcHas(ca,origSa,origEa)) return false;

      var newE=[];

      // Arco 1: de origSa até remSa (se span > 0)
      var span1=(remSa-origSa+TWO_PI)%TWO_PI;
      if(span1>1e-6){
        var e1=clon(tgt);e1.sa=origSa;e1.ea=remSa;newE.push(e1);
      }
      // Arco 2: de remEa até origEa (se span > 0)
      var span2=(origEa-remEa+TWO_PI)%TWO_PI;
      if(span2>1e-6){
        var e2=clon(tgt);e2.sa=remEa;e2.ea=origEa;newE.push(e2);
      }

      if(newE.length) S.ents.splice(idx,1,...newE);
      else S.ents.splice(idx,1);
      log('Trim arco.','ok');renderAll();return true;
    }

  } else if(tgt.tp==='pl'){
    // polilinha: tratar cada segmento individualmente
    var ips=getIntersections(tgt,cutters);
    if(!ips.length) return false;
    // encontrar segmento da polilinha clicado e aplicar trim nele
    var pts=tgt.pts,bestSeg=-1,bestD=1e9;
    for(var i=0;i<pts.length-1;i++){
      var d=segD(clickPt.x,clickPt.y,pts[i].x,pts[i].y,pts[i+1].x,pts[i+1].y);
      if(d<bestD){bestD=d;bestSeg=i;}
    }
    if(bestSeg<0) return false;
    // criar linha temporária para esse segmento
    var fake={tp:'line',x1:pts[bestSeg].x,y1:pts[bestSeg].y,x2:pts[bestSeg+1].x,y2:pts[bestSeg+1].y,id:'__fake__'};
    var fips=getIntersections(fake,cutters);
    if(!fips.length) return false;
    var ts2=fips.map(function(p){return{t:paramOnLine(fake,p.x,p.y),x:p.x,y:p.y};});
    ts2.sort(function(a,b){return a.t-b.t;});
    var tc2=paramOnLine(fake,clickPt.x,clickPt.y);
    var seg2=findTrimSeg(ts2,tc2,fake);
    if(!seg2) return false;
    snapshot();
    var idx=S.ents.indexOf(tgt);
    // construir novas polilinhas
    var p1pts=pts.slice(0,bestSeg+1);
    if(seg2.from) p1pts.push({x:seg2.from.x,y:seg2.from.y});
    var p2pts=[];
    if(seg2.to) p2pts.push({x:seg2.to.x,y:seg2.to.y});
    p2pts=p2pts.concat(pts.slice(bestSeg+1));
    var newE=[];
    if(p1pts.length>=2){var e1=clon(tgt);e1.pts=p1pts;newE.push(e1);}
    if(p2pts.length>=2){var e2=clon(tgt);e2.pts=p2pts;newE.push(e2);}
    if(newE.length) S.ents.splice(idx,1,...newE); else S.ents.splice(idx,1);
    log('Trim polilinha.','ok');renderAll();return true;
  }
  return false;
}

// Calcula a interseção da linha infinita de tgt com todos os bounds,
// retornando o ponto mais próximo do end clicado que esteja ALÉM do end
function calcExtendPoint(tgt,end,bounds){
  // end=1 → estender p1 (t<0), end=2 → estender p2 (t>1)
  // Comportamento AutoCAD: estende até o PRÓXIMO limite na direção da extensão,
  // passando por linhas intermediárias a cada clique sucessivo.
  var ex=end===1?tgt.x1:tgt.x2, ey=end===1?tgt.y1:tgt.y2;

  // Coleta TODAS as interseções além do extremo, em todas as fronteiras
  var allIntersections=[];
  for(var i=0;i<bounds.length;i++){
    var b=findE(bounds[i]);if(!b||b.id===tgt.id)continue;
    var ips2=[];
    if(b.tp==='line'){
      var r=lineLineInt(tgt.x1,tgt.y1,tgt.x2,tgt.y2,b.x1,b.y1,b.x2,b.y2);
      // limite deve ser cruzado dentro do seu próprio segmento (u em [0,1])
      if(r&&r.u>=-1e-6&&r.u<=1+1e-6) ips2.push({t:r.t,x:r.x,y:r.y});
    } else if(b.tp==='circ'||b.tp==='arc'){
      var rs=lineCircInt(tgt.x1,tgt.y1,tgt.x2,tgt.y2,b.cx,b.cy,b.r);
      for(var j=0;j<rs.length;j++){
        if(b.tp==='arc'&&!arcHas(Math.atan2(rs[j].y-b.cy,rs[j].x-b.cx),b.sa,b.ea))continue;
        ips2.push(rs[j]);
      }
    } else if(b.tp==='rect'){
      var sides=[
        {x1:b.x,y1:b.y,x2:b.x+b.w,y2:b.y},{x1:b.x+b.w,y1:b.y,x2:b.x+b.w,y2:b.y+b.h},
        {x1:b.x,y1:b.y+b.h,x2:b.x+b.w,y2:b.y+b.h},{x1:b.x,y1:b.y,x2:b.x,y2:b.y+b.h}
      ];
      for(var s=0;s<sides.length;s++){
        var r2=lineLineInt(tgt.x1,tgt.y1,tgt.x2,tgt.y2,sides[s].x1,sides[s].y1,sides[s].x2,sides[s].y2);
        if(r2&&r2.u>=-1e-6&&r2.u<=1+1e-6) ips2.push({t:r2.t,x:r2.x,y:r2.y});
      }
    } else if(b.tp==='pl'){
      for(var s=0;s<b.pts.length-1;s++){
        var r3=lineLineInt(tgt.x1,tgt.y1,tgt.x2,tgt.y2,b.pts[s].x,b.pts[s].y,b.pts[s+1].x,b.pts[s+1].y);
        if(r3&&r3.u>=-1e-6&&r3.u<=1+1e-6) ips2.push({t:r3.t,x:r3.x,y:r3.y});
      }
    }
    for(var k=0;k<ips2.length;k++){
      var ip=ips2[k];
      // Ponto deve estar ALÉM do extremo na direção de extensão
      // end=1: estender p1, interseções com t < -1e-6 (antes de p1 na reta)
      // end=2: estender p2, interseções com t > 1+1e-6 (depois de p2 na reta)
      var beyondEnd1=(end===1&&ip.t<-1e-6);
      var beyondEnd2=(end===2&&ip.t>1+1e-6);
      if(!beyondEnd1&&!beyondEnd2) continue;
      allIntersections.push({t:ip.t,x:ip.x,y:ip.y});
    }
  }
  if(allIntersections.length===0) return null;

  // Seleciona a interseção MAIS PRÓXIMA do extremo na direção de extensão
  // (menor distância absoluta do t=0 ou t=1 respectivamente)
  // Isso garante comportamento igual ao AutoCAD: para em cada limite intermediário
  var best=null, bd=1e9;
  for(var m=0;m<allIntersections.length;m++){
    var ip=allIntersections[m];
    var dist=Math.hypot(ip.x-ex,ip.y-ey);
    if(dist<bd){bd=dist;best=ip;}
  }
  return best;
}

// Retorna preview da extensão como segmento {type,x1,y1,x2,y2}
function getExtendPreview(tgt,clickPt,bounds){
  if(tgt.tp==='line'){
    var end=nearerEnd(tgt,clickPt.x,clickPt.y);
    var best=calcExtendPoint(tgt,end,bounds);
    if(!best) return null;
    if(end===1) return {type:'line',x1:best.x,y1:best.y,x2:tgt.x1,y2:tgt.y1};
    else        return {type:'line',x1:tgt.x2,y1:tgt.y2,x2:best.x,y2:best.y};
  }
  return null;
}

function doExtend(tgt,clickPt,bounds){
  if(tgt.tp==='line'){
    var end=nearerEnd(tgt,clickPt.x,clickPt.y);
    var best=calcExtendPoint(tgt,end,bounds);
    if(!best) return false;
    snapshot();
    if(end===1){tgt.x1=best.x;tgt.y1=best.y;}
    else       {tgt.x2=best.x;tgt.y2=best.y;}
    log('Extend concluído.','ok');renderAll();return true;

  } else if(tgt.tp==='arc'){
    // Estender arco: ampliar o ângulo start ou end mais próximo do clique
    var ca=Math.atan2(clickPt.y-tgt.cy,clickPt.x-tgt.cx);
    var norm=function(v){return((v%(Math.PI*2))+(Math.PI*2))%(Math.PI*2);};
    var can=norm(ca);
    var san=norm(tgt.sa), ean=norm(tgt.ea);
    var dSa=Math.min(Math.abs(can-san),Math.PI*2-Math.abs(can-san));
    var dEa=Math.min(Math.abs(can-ean),Math.PI*2-Math.abs(can-ean));
    var extendStart=dSa<dEa;
    // encontrar interseção do arco estendido com os bounds
    var best2=null,bd2=1e9;
    var refAng=extendStart?tgt.sa:tgt.ea;
    for(var i=0;i<bounds.length;i++){
      var b=findE(bounds[i]);if(!b||b.id===tgt.id)continue;
      // linha fake tangente ao arco no ponto extremo
      var refX=tgt.cx+tgt.r*Math.cos(refAng),refY=tgt.cy+tgt.r*Math.sin(refAng);
      // usar interseção arco vs borda
      var ips3=entIntersect(tgt,b);
      for(var j=0;j<ips3.length;j++){
        var ang=norm(Math.atan2(ips3[j].y-tgt.cy,ips3[j].x-tgt.cx));
        // deve estar fora do arco atual
        var inArc=arcHas(ang,tgt.sa,tgt.ea);
        if(inArc) continue;
        var dist=Math.hypot(ips3[j].x-refX,ips3[j].y-refY);
        if(dist<bd2){bd2=dist;best2={ang:ang,x:ips3[j].x,y:ips3[j].y};}
      }
    }
    if(!best2) return false;
    snapshot();
    if(extendStart) tgt.sa=best2.ang; else tgt.ea=best2.ang;
    log('Extend arco.','ok');renderAll();return true;

  } else if(tgt.tp==='pl'){
    // Polilinha: estender o primeiro ou último segmento
    if(tgt.pts.length<2) return false;
    var p1=tgt.pts[0],p2=tgt.pts[1];
    var pn=tgt.pts[tgt.pts.length-1],pn1=tgt.pts[tgt.pts.length-2];
    var dStart=Math.hypot(clickPt.x-p1.x,clickPt.y-p1.y);
    var dEnd=Math.hypot(clickPt.x-pn.x,clickPt.y-pn.y);
    var extendStart2=dStart<dEnd;
    var fakeLine=extendStart2
      ?{tp:'line',x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,id:'__fake__'}
      :{tp:'line',x1:pn1.x,y1:pn1.y,x2:pn.x,y2:pn.y,id:'__fake__'};
    var fend=extendStart2?1:2;
    var best3=calcExtendPoint(fakeLine,fend,bounds);
    if(!best3) return false;
    snapshot();
    if(extendStart2){tgt.pts[0]={x:best3.x,y:best3.y};}
    else{tgt.pts[tgt.pts.length-1]={x:best3.x,y:best3.y};}
    log('Extend polilinha.','ok');renderAll();return true;
  }
  return false;
}

// ── FILLET ────────────────────────────────────────────────────
function doFillet(e1,e2,r,pt1,pt2){
  if(e1.tp!=='line'||e2.tp!=='line'){log('Fillet: apenas entre duas linhas.','er');return;}

  var len1=Math.hypot(e1.x2-e1.x1,e1.y2-e1.y1);
  var len2=Math.hypot(e2.x2-e2.x1,e2.y2-e2.y1);
  if(len1<1e-9||len2<1e-9){log('Fillet: linha de comprimento zero.','er');return;}

  // Vetores unitários — orientados da p1 para p2
  var u1x=(e1.x2-e1.x1)/len1, u1y=(e1.y2-e1.y1)/len1;
  var u2x=(e2.x2-e2.x1)/len2, u2y=(e2.y2-e2.y1)/len2;

  // Interseção das linhas (infinitas)
  var res=lineLineInt(e1.x1,e1.y1,e1.x2,e1.y2,e2.x1,e2.y1,e2.x2,e2.y2);
  if(!res){log('Fillet: linhas paralelas.','er');return;}
  var ix=res.x, iy=res.y;

  // Ângulo entre as direções (pode ser obtuso — usar o suplemento)
  var cosA=u1x*u2x+u1y*u2y;
  cosA=Math.max(-1,Math.min(1,cosA));
  // Ângulo interno do canto = PI - acos(|dot|) se linhas se cruzam
  // A distância da interseção ao ponto de tangência = r / tan(ângulo/2)
  // Onde ângulo é o ângulo ENTRE as direções apontando PARA FORA do canto
  // Determinamos as direções "para fora" (saindo da interseção) baseado no lado clicado
  var ti1=paramOnLine(e1,ix,iy);
  var ti2=paramOnLine(e2,ix,iy);
  var tc1=paramOnLine(e1,pt1.x,pt1.y);
  var tc2=paramOnLine(e2,pt2.x,pt2.y);
  // s1/s2: +1 se o clique está "acima" da interseção no param, -1 se abaixo
  var s1=(tc1>=ti1)?1:-1;
  var s2=(tc2>=ti2)?1:-1;

  // Direções unitárias saindo da interseção em direção ao lado clicado
  var v1x=s1*u1x, v1y=s1*u1y;
  var v2x=s2*u2x, v2y=s2*u2y;

  // Ângulo entre os dois vetores "saindo"
  var dot2=v1x*v2x+v1y*v2y;
  dot2=Math.max(-1,Math.min(1,dot2));
  var alpha=Math.acos(dot2); // ângulo entre as duas direções saindo

  // O ângulo do setor do fillet = PI - alpha
  var filletAngle=Math.PI-alpha;
  if(filletAngle<1e-6){log('Fillet: ângulo muito pequeno.','er');return;}

  // Distância da interseção ao ponto de tangência
  var dist=r/Math.tan(filletAngle/2);

  // Pontos de tangência
  var tp1x=ix+v1x*dist, tp1y=iy+v1y*dist;
  var tp2x=ix+v2x*dist, tp2y=iy+v2y*dist;

  // Centro do arco: perpendicular a v1 em tp1, distância r
  // Dois candidatos — escolher o que está equidistante r de tp2
  var perp1ax=tp1x+(-v1y)*r, perp1ay=tp1y+v1x*r;
  var perp1bx=tp1x+v1y*r,    perp1by=tp1y+(-v1x)*r;
  var da=Math.abs(Math.hypot(perp1ax-tp2x,perp1ay-tp2y)-r);
  var db=Math.abs(Math.hypot(perp1bx-tp2x,perp1by-tp2y)-r);
  var cx,cy;
  if(da<db){cx=perp1ax;cy=perp1ay;}else{cx=perp1bx;cy=perp1by;}

  // Ângulos no espaço mundo (Y normal, não invertido)
  var sa=Math.atan2(tp1y-cy,tp1x-cx);
  var ea=Math.atan2(tp2y-cy,tp2x-cx);

  // O drawE usa ctx.arc(cx,cy,r,-sa,-ea,true) → anticlockwise no canvas
  // = clockwise no mundo. Precisamos que o arco vá de sa→ea no sentido
  // que passa pelo interior do canto (perto de ix,iy).
  // Testar os dois sentidos e escolher o que tem o ponto médio mais próximo da interseção.
  function arcMidWorld(startA,endA,clockwise){
    // ponto médio do arco no mundo
    var diff=endA-startA;
    if(clockwise){ diff = diff>0 ? diff-Math.PI*2 : diff; }
    else          { diff = diff<0 ? diff+Math.PI*2 : diff; }
    var midA=startA+diff/2;
    return{x:cx+r*Math.cos(midA),y:cy+r*Math.sin(midA)};
  }
  // No canvas: arc(-sa,-ea,true) = clockwise no canvas = sentido horário no canvas
  // No mundo (Y invertido): isso equivale a sentido ANTI-horário no mundo
  // Então arc(sa,ea) no mundo vai no sentido horário do mundo = anti-horário canvas
  // ctx.arc com anticlockwise=true vai de startAngle para endAngle no sentido anti-horário do canvas
  // = sentido horário no mundo
  // Vamos só testar os dois e escolher:
  var mid1=arcMidWorld(sa,ea,false); // CCW mundo (CW canvas = anticlockwise=false)
  var mid2=arcMidWorld(sa,ea,true);  // CW mundo
  var dist1=Math.hypot(mid1.x-ix,mid1.y-iy);
  var dist2=Math.hypot(mid2.x-ix,mid2.y-iy);
  // O arco correto tem o ponto médio MAIS PERTO da interseção (no interior do canto)
  var arcSa,arcEa;
  if(dist1<dist2){
    // CCW mundo → no drawE (que usa -sa,-ea,true=anticlockwise-canvas = CW-canvas = CCW-mundo): usar sa,ea
    arcSa=sa; arcEa=ea;
  } else {
    // CW mundo → inverter
    arcSa=ea; arcEa=sa;
  }

  snapshot();
  // Aparar as linhas nos pontos de tangência
  var end1=endToTrim(ti1,s1), end2=endToTrim(ti2,s2);
  if(end1===1){e1.x1=tp1x;e1.y1=tp1y;}else{e1.x2=tp1x;e1.y2=tp1y;}
  if(end2===1){e2.x1=tp2x;e2.y1=tp2y;}else{e2.x2=tp2x;e2.y2=tp2y;}

  if(r>1e-9) addE({tp:'arc',cx:cx,cy:cy,r:r,sa:arcSa,ea:arcEa},true);
  log('Fillet r='+r.toFixed(2)+'mm.','ok');
  renderAll();
}

// ── CHAMFER ───────────────────────────────────────────────────
function doChamfer(e1,e2,d1,d2,pt1,pt2){
  if(e1.tp!=='line'||e2.tp!=='line'){log('Chamfer: apenas linhas.','er');return;}
  var res=lineLineInt(e1.x1,e1.y1,e1.x2,e1.y2,e2.x1,e2.y1,e2.x2,e2.y2);
  if(!res){log('Chamfer: paralelas.','er');return;}
  var ix=res.x,iy=res.y;
  var len1=Math.hypot(e1.x2-e1.x1,e1.y2-e1.y1);
  var len2=Math.hypot(e2.x2-e2.x1,e2.y2-e2.y1);
  var d1x=(e1.x2-e1.x1)/len1,d1y=(e1.y2-e1.y1)/len1;
  var d2x=(e2.x2-e2.x1)/len2,d2y=(e2.y2-e2.y1)/len2;
  var t1=paramOnLine(e1,pt1.x,pt1.y),t2=paramOnLine(e2,pt2.x,pt2.y);
  var ti1=paramOnLine(e1,ix,iy),ti2=paramOnLine(e2,ix,iy);
  var s1=(t1>ti1)?1:-1,s2=(t2>ti2)?1:-1;
  var cp1x=ix+s1*d1x*d1,cp1y=iy+s1*d1y*d1;
  var cp2x=ix+s2*d2x*d2,cp2y=iy+s2*d2y*d2;
  snapshot();
  var end1=endToTrim(ti1,s1),end2=endToTrim(ti2,s2);
  if(end1===1){e1.x1=cp1x;e1.y1=cp1y;}else{e1.x2=cp1x;e1.y2=cp1y;}
  if(end2===1){e2.x1=cp2x;e2.y1=cp2y;}else{e2.x2=cp2x;e2.y2=cp2y;}
  addE({tp:'line',x1:cp1x,y1:cp1y,x2:cp2x,y2:cp2y},true);
  log('Chamfer d1='+d1+' d2='+d2+'mm.','ok');renderAll();
}

// ── ARRAY ─────────────────────────────────────────────────────
function arTypeChange(){
  var v=document.querySelector('input[name="artype"]:checked').value;
  document.getElementById('ar-rect-form').style.display=v==='rect'?'':'none';
  document.getElementById('ar-polar-form').style.display=v==='polar'?'':'none';
  document.getElementById('ar-path-form').style.display=v==='path'?'':'none';
}

function showArrayDlg(){S.lastTool='array';
  if(!S.sel.length){log('Selecione objetos antes de executar Array.','er');return;}
  document.getElementById('ov-array').classList.add('show');
}

function confirmArray(){
  var type=document.querySelector('input[name="artype"]:checked').value;
  if(!S.sel.length){log('Sem objetos selecionados para Array.','er');closeOv('ov-array');return;}
  if(type==='rect'){
    var rows=parseInt(document.getElementById('ar-rows').value)||3;
    var cols=parseInt(document.getElementById('ar-cols').value)||3;
    var rsp=parseFloat(document.getElementById('ar-rsp').value)||20;
    var csp=parseFloat(document.getElementById('ar-csp').value)||20;
    var ang=parseFloat(document.getElementById('ar-ang').value)||0;
    var rad=ang*Math.PI/180;
    doArrayRect(rows,cols,rsp,csp,rad);
  } else if(type==='polar'){
    var count=parseInt(document.getElementById('ar-pcount').value)||6;
    var totalAng=parseFloat(document.getElementById('ar-ptotal').value)||360;
    var fill=document.getElementById('ar-pfill').value==='1';
    var rotItems=document.getElementById('ar-prot').value==='1';
    // need center: prompt via command line after closing dialog
    closeOv('ov-array');
    S.tool='select';
    S.ds={arrayPolar:true,count:count,totalAng:totalAng,fill:fill,rotItems:rotItems,sel:S.sel.slice()};
    logp('ARRAY POLAR: clique no centro de rotação:');
    // override handleClick temporarily
    S.tool='_arrayPolar';
    return;
  } else if(type==='path'){
    var count=parseInt(document.getElementById('ar-pathcount').value)||5;
    var sp=parseFloat(document.getElementById('ar-pathsp').value)||0;
    var align=document.getElementById('ar-pathalign').value==='1';
    closeOv('ov-array');
    S.ds={arrayPath:true,count:count,sp:sp,align:align,sel:S.sel.slice()};
    S.tool='_arrayPath';
    logp('ARRAY PATH: clique no objeto de caminho (linha/polilinha/arco/círculo):');
    return;
  }
  closeOv('ov-array');
}

// Array rectangular: copies in rows×cols grid, offset by (csp,rsp) rotated by ang
function doArrayRect(rows,cols,rsp,csp,ang){
  snapshot();
  var newEnts=[];
  // compute bounding box center of selection for angular rotation pivot
  var cx=0,cy=0,n=0;
  for(var i=0;i<S.sel.length;i++){var e=findE(S.sel[i]);if(!e)continue;var bb=bbox(e);if(bb){cx+=bb.x+bb.w/2;cy+=bb.y+bb.h/2;n++;}}
  if(n>0){cx/=n;cy/=n;}
  for(var r=0;r<rows;r++){
    for(var c=0;c<cols;c++){
      if(r===0&&c===0)continue;// skip original
      var dx0=c*csp,dy0=r*rsp;
      // rotate offset by ang
      var dx=dx0*Math.cos(ang)-dy0*Math.sin(ang);
      var dy=dx0*Math.sin(ang)+dy0*Math.cos(ang);
      for(var i=0;i<S.sel.length;i++){
        var e=findE(S.sel[i]);if(!e)continue;
        var ne=clon(e);transl(ne,dx,dy);newEnts.push(ne);
      }
    }
  }
  for(var i=0;i<newEnts.length;i++)S.ents.push(newEnts[i]);
  log('Array Ret '+rows+'×'+cols+' = '+((rows*cols-1)*S.sel.length)+' cópias.','ok');
  renderAll();updStatus();
}

// Array polar: executed in handleClick when tool='_arrayPolar'
function doArrayPolar(center){
  var ds=S.ds;
  var count=ds.count,totalAng=ds.totalAng,fill=ds.fill,rotItems=ds.rotItems,sel=ds.sel;
  var step=totalAng/(fill?count:count-1)*Math.PI/180;
  snapshot();var newEnts=[];
  for(var i=1;i<count;i++){
    var ang=step*i;
    for(var j=0;j<sel.length;j++){
      var e=findE(sel[j]);if(!e)continue;
      var ne=clon(e);
      // translate so center is origin, rotate, translate back
      transl(ne,-center.x,-center.y);
      if(rotItems)rotat(ne,{x:0,y:0},ang);
      else{var bb2=bbox(ne)||{x:0,y:0,w:0,h:0};var nx=Math.cos(ang),ny=Math.sin(ang),r2=Math.hypot(bb2.x+bb2.w/2,bb2.y+bb2.h/2);transl(ne,(Math.cos(ang)-1)*(bb2.x+bb2.w/2)-Math.sin(ang)*(bb2.y+bb2.h/2),(Math.sin(ang))*(bb2.x+bb2.w/2)+(Math.cos(ang)-1)*(bb2.y+bb2.h/2));}
      transl(ne,center.x,center.y);
      newEnts.push(ne);
    }
  }
  for(var i=0;i<newEnts.length;i++)S.ents.push(newEnts[i]);
  log('Array Polar '+count+' itens.','ok');renderAll();updStatus();
  S.ds=null;S.tool='select';setTool('select');
}

// Array along path
function doArrayPath(pathEnt){
  var ds=S.ds,sel=ds.sel,count=ds.count,align=ds.align;
  // compute total path length
  var pathPts=[];
  if(pathEnt.tp==='line'){pathPts=[{x:pathEnt.x1,y:pathEnt.y1},{x:pathEnt.x2,y:pathEnt.y2}];}
  else if(pathEnt.tp==='pl'){pathPts=pathEnt.pts.slice();}
  else if(pathEnt.tp==='arc'||pathEnt.tp==='circ'){
    var sa2=pathEnt.tp==='circ'?0:(pathEnt.sa||0),ea2=pathEnt.tp==='circ'?Math.PI*2:(pathEnt.ea||Math.PI*2);
    var steps=64,dA=(ea2-sa2)/steps;
    for(var k=0;k<=steps;k++)pathPts.push({x:pathEnt.cx+pathEnt.r*Math.cos(sa2+k*dA),y:pathEnt.cy+pathEnt.r*Math.sin(sa2+k*dA)});
  } else {log('Array Path: caminho inválido.','er');S.ds=null;setTool('select');return;}
  // total length
  var segs2=[];var totalL=0;
  for(var k=0;k<pathPts.length-1;k++){var segL=Math.hypot(pathPts[k+1].x-pathPts[k].x,pathPts[k+1].y-pathPts[k].y);segs2.push({dx:pathPts[k+1].x-pathPts[k].x,dy:pathPts[k+1].y-pathPts[k].y,len:segL,cum:totalL});totalL+=segL;}
  var step2=totalL/(count-1);
  // find bounding box center of selection
  var scx=0,scy=0,sn=0;
  for(var i=0;i<sel.length;i++){var e=findE(sel[i]);if(!e)continue;var bb=bbox(e);if(bb){scx+=bb.x+bb.w/2;scy+=bb.y+bb.h/2;sn++;}}
  if(sn>0){scx/=sn;scy/=sn;}
  snapshot();var newEnts=[];
  for(var pi=0;pi<count;pi++){
    var dist2=pi*step2;
    // find position on path at dist2
    var px=pathPts[0].x,py=pathPts[0].y,tang=0;
    if(pi===0){px=pathPts[0].x;py=pathPts[0].y;tang=segs2.length>0?Math.atan2(segs2[0].dy,segs2[0].dx):0;}
    else{
      var rem=dist2;
      for(var k=0;k<segs2.length;k++){
        if(rem<=segs2[k].len+1e-9){var t=rem/segs2[k].len;px=pathPts[k].x+t*segs2[k].dx;py=pathPts[k].y+t*segs2[k].dy;tang=Math.atan2(segs2[k].dy,segs2[k].dx);break;}
        rem-=segs2[k].len;
      }
    }
    if(pi===0)continue;// original stays
    var dx3=px-scx,dy3=py-scy;
    for(var i=0;i<sel.length;i++){
      var e=findE(sel[i]);if(!e)continue;
      var ne=clon(e);transl(ne,dx3,dy3);
      if(align)rotat(ne,{x:px,y:py},tang);
      newEnts.push(ne);
    }
  }
  for(var i=0;i<newEnts.length;i++)S.ents.push(newEnts[i]);
  log('Array Path: '+count+' itens.','ok');renderAll();updStatus();
  S.ds=null;S.tool='select';setTool('select');
}

// ── FILLET / CHAMFER DIALOG ───────────────────────────────────
function confirmFillet(){
  var v=parseFloat(document.getElementById('fillet-r').value);
  if(isNaN(v)||v<0)v=0;
  if(S.tool==='fillet'||!S.tool){
    S.filletR=v;
    S.ds={phase:'l1',r:v};
  } else if(S.tool==='chamfer'){
    S.chamferD1=v;
    var v2=parseFloat(prompt('Distância 2 (mm):',String(v)));
    if(isNaN(v2)||v2<0)v2=v;
    S.chamferD2=v2;
    S.ds={phase:'l1',d1:v,d2:v2};
  }
  closeOv('ov-fillet');
  logp((S.tool==='chamfer'?'CHAMFER':'FILLET')+': clique na 1ª linha:');
}


// ═══════════════════════════════════════════════════════════════════════════
