// ── RENDER ───────────────────────────────────────────────────
function renderAll(){ drawGrid(); drawScene(); drawOver(); }

function drawGrid(){
  var ctx=S.gG,W=cvW(),H=cvH();
  ctx.fillStyle='#0a0a1a';ctx.fillRect(0,0,W,H);
  if(!S.modes.grid) return;
  var gs=S.modes.gridSz*S.vp.sc; if(gs<4)return;
  var ox=((S.vp.x%gs)+gs)%gs,oy=((S.vp.y%gs)+gs)%gs;
  ctx.strokeStyle='#151a2e';ctx.lineWidth=.5;
  for(var x=ox;x<W;x+=gs){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(var y=oy;y<H;y+=gs){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  var gM=gs*10;if(gM>10){
    var ox5=((S.vp.x%gM)+gM)%gM,oy5=((S.vp.y%gM)+gM)%gM;
    ctx.strokeStyle='#1a2545';ctx.lineWidth=1;
    for(var x=ox5;x<W;x+=gM){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(var y=oy5;y<H;y+=gM){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  }
  ctx.lineWidth=1.2;ctx.setLineDash([]);
  ctx.strokeStyle='#cc333360';ctx.beginPath();ctx.moveTo(0,S.vp.y);ctx.lineTo(W,S.vp.y);ctx.stroke();
  ctx.strokeStyle='#33cc3360';ctx.beginPath();ctx.moveTo(S.vp.x,0);ctx.lineTo(S.vp.x,H);ctx.stroke();
  ctx.setLineDash([]);
}

function drawScene(){
  var ctx=S.gD;ctx.clearRect(0,0,cvW(),cvH());
  for(var i=0;i<S.ents.length;i++){
    var e=S.ents[i],ly=getLy(e.ly);
    if(ly&&!ly.vis) continue;
    var sel=S.sel.indexOf(e.id)>=0;
    drawE(ctx,e,sel);
    // Hover highlight no SELECT: objeto sob cursor recebe destaque sutil
    if(S.tool==='select'&&!sel&&S.hoverId===e.id){
      ctx.save();
      ctx.strokeStyle='#4d9ef780';ctx.lineWidth=(e.lw||0.7)+1.5;
      ctx.setLineDash([]);ctx.shadowBlur=6;ctx.shadowColor='#4d9ef7';
      drawE(ctx,e,false);
      ctx.restore();
    }
    if(S.modes.didactic) drawDidactic(ctx,e);
    if(S.modes.showcoords) drawCoords(ctx,e);
  }
  if(S.tool==='select') drawGrips(ctx);
  if(S.grip) drawGripPreview(ctx);
  else if(S.ds) drawPreview(ctx);
  if(S.isWin&&S.winFrom&&S.hover) drawWinSel(ctx);
}

function applyStyle(ctx,e,sel){
  var ly=getLy(e.ly);
  ctx.strokeStyle=sel?'#60b8ff':effCol(e);
  ctx.fillStyle=ctx.strokeStyle;
  ctx.lineWidth=effLw(e);
  setDash(ctx,effLd(e));
  ctx.shadowBlur=sel?8:0;ctx.shadowColor=sel?'#4d9ef7':'transparent';
}
function setDash(ctx,ld){
  var sc=S.vp.sc||1, f=Math.max(0.5,Math.min(3,sc*0.5));
  switch(ld){
    case 'dashed':   ctx.setLineDash([10*f,4*f]);break;
    case 'dotted':   ctx.setLineDash([1.5,4*f]);break;
    case 'center':   ctx.setLineDash([18*f,4*f,4*f,4*f]);break;
    case 'phantom':  ctx.setLineDash([18*f,4*f,4*f,4*f,4*f,4*f]);break;
    case 'divide':   ctx.setLineDash([12*f,3*f,3*f,3*f,3*f,3*f]);break;
    case 'hidden':   ctx.setLineDash([5*f,4*f]);break;
    case 'dashdot':  ctx.setLineDash([12*f,3*f,3*f,3*f]);break;
    default:         ctx.setLineDash([]);
  }
}

function drawE(ctx,e,sel){
  ctx.save(); applyStyle(ctx,e,sel);
  var sc=S.vp.sc;
  switch(e.tp){
    case 'line':{var a=w2s(e.x1,e.y1),b=w2s(e.x2,e.y2);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();if(sel){drawH(ctx,a.x,a.y);drawH(ctx,b.x,b.y);}break;}
    case 'circ':{var c=w2s(e.cx,e.cy);ctx.beginPath();ctx.arc(c.x,c.y,e.r*sc,0,Math.PI*2);ctx.stroke();if(sel)drawH(ctx,c.x,c.y);break;}
    case 'arc':{var c=w2s(e.cx,e.cy);ctx.beginPath();ctx.arc(c.x,c.y,e.r*sc,-e.sa,-e.ea,true);ctx.stroke();if(sel)drawH(ctx,c.x,c.y);break;}
    case 'rect':{var a=w2s(e.x,e.y);ctx.beginPath();ctx.rect(a.x,a.y-e.h*sc,e.w*sc,e.h*sc);ctx.stroke();if(sel){drawH(ctx,a.x,a.y);drawH(ctx,a.x+e.w*sc,a.y);drawH(ctx,a.x,a.y-e.h*sc);drawH(ctx,a.x+e.w*sc,a.y-e.h*sc);}break;}
    case 'ell':{var c=w2s(e.cx,e.cy);ctx.beginPath();ctx.ellipse(c.x,c.y,e.rx*sc,e.ry*sc,-(e.rot||0),0,Math.PI*2);ctx.stroke();if(sel)drawH(ctx,c.x,c.y);break;}
    case 'spline':{
      if(!e.pts||e.pts.length<2) break;
      ctx.beginPath();
      var spts=e.pts;
      var p0=w2s(spts[0].x,spts[0].y); ctx.moveTo(p0.x,p0.y);
      for(var i=0;i<spts.length-1;i++){
        var p0c=w2s(i>0?spts[i-1].x:spts[0].x, i>0?spts[i-1].y:spts[0].y);
        var p1c=w2s(spts[i].x,spts[i].y);
        var p2c=w2s(spts[i+1].x,spts[i+1].y);
        var p3c=w2s(i+2<spts.length?spts[i+2].x:spts[i+1].x, i+2<spts.length?spts[i+2].y:spts[i+1].y);
        var cp1x=p1c.x+(p2c.x-p0c.x)/6, cp1y=p1c.y+(p2c.y-p0c.y)/6;
        var cp2x=p2c.x-(p3c.x-p1c.x)/6, cp2y=p2c.y-(p3c.y-p1c.y)/6;
        ctx.bezierCurveTo(cp1x,cp1y,cp2x,cp2y,p2c.x,p2c.y);
      }
      ctx.stroke();
      if(sel) for(var i=0;i<spts.length;i++){var s=w2s(spts[i].x,spts[i].y);drawH(ctx,s.x,s.y);}
      break;
    }
    case 'pl':{if(e.pts.length<2)break;ctx.beginPath();var p0=w2s(e.pts[0].x,e.pts[0].y);ctx.moveTo(p0.x,p0.y);for(var i=1;i<e.pts.length;i++){var p=w2s(e.pts[i].x,e.pts[i].y);ctx.lineTo(p.x,p.y);}if(e.closed)ctx.closePath();ctx.stroke();if(sel)for(var i=0;i<e.pts.length;i++){var s=w2s(e.pts[i].x,e.pts[i].y);drawH(ctx,s.x,s.y);}break;}
    case 'txt':{
      var p=w2s(e.x,e.y);ctx.setLineDash([]);ctx.shadowBlur=0;
      var fnt=Math.max(S.printing?0:8,e.h*sc)+'px '+(e.font||'Consolas,monospace');
      ctx.font=fnt;
      if(e.rot){ctx.translate(p.x,p.y);ctx.rotate(-e.rot);p={x:0,y:0};}
      if(e.wipeout){
        var tw2=ctx.measureText(e.txt).width;
        var th2=e.h*sc;
        var pad2=3;
        ctx.fillStyle='#ffffff';
        ctx.fillRect(p.x-pad2,p.y-th2-pad2,tw2+pad2*2,th2+pad2*2);
      }
      ctx.fillStyle=sel?'#60b8ff':effCol(e);
      ctx.fillText(e.txt,p.x,p.y);
      break;
    }
    case 'hatch':{
      var a=w2s(e.x,e.y),pw=e.w*sc,ph=e.h*sc;
      var hcol=sel?'#60b8ff':effCol(e);
      ctx.save();ctx.beginPath();ctx.rect(a.x,a.y-ph,pw,ph);ctx.clip();
      ctx.strokeStyle=hcol;ctx.lineWidth=.5;ctx.setLineDash([]);
      var sp2=Math.max(1,e.sp*sc),rad=(e.ang||45)*Math.PI/180;
      var ht=e.htype||'lines';
      function hLine(x1h,y1h,x2h,y2h){ctx.beginPath();ctx.moveTo(x1h,y1h);ctx.lineTo(x2h,y2h);ctx.stroke();}
      if(ht==='cross'||ht==='grid'){
        // Grade: linhas horizontais + verticais
        for(var xg=a.x;xg<a.x+pw;xg+=sp2) hLine(xg,a.y-ph,xg,a.y);
        for(var yg=a.y-ph;yg<a.y;yg+=sp2) hLine(a.x,yg,a.x+pw,yg);
      } else if(ht==='dots'){
        // Pontos
        for(var xi=a.x+sp2/2;xi<a.x+pw;xi+=sp2){
          for(var yi=a.y-ph+sp2/2;yi<a.y;yi+=sp2){
            ctx.beginPath();ctx.arc(xi,yi,0.8,0,Math.PI*2);ctx.fill();
          }
        }
      } else if(ht==='zigzag'){
        var step=sp2*2;
        for(var yzig=a.y-ph;yzig<a.y+step;yzig+=step){
          ctx.beginPath();
          for(var xzig=a.x;xzig<a.x+pw+step;xzig+=step){
            ctx.lineTo(xzig,yzig);ctx.lineTo(xzig+step/2,yzig-sp2);
          }
          ctx.stroke();
        }
      } else {
        // Linhas paralelas: ângulo medido no sentido anti-horário (como no AutoCAD e na exportação)
        var dashPat=ht==='dashed'?[4,3]:ht==='dotted'?[1,3]:[];
        ctx.setLineDash(dashPat);
        hatchLines({x:e.x,y:e.y,w:e.w,h:e.h},e.ang!==undefined?e.ang:45,Math.max(e.sp||5,1/sc)).forEach(function(q){var p1=w2s(q[0],q[1]),p2=w2s(q[2],q[3]);hLine(p1.x,p1.y,p2.x,p2.y);});
        ctx.setLineDash([]);
      }
      ctx.restore();
      // Borda
      ctx.strokeStyle=hcol;ctx.lineWidth=.6;ctx.setLineDash([]);
      ctx.beginPath();ctx.rect(a.x,a.y-ph,pw,ph);ctx.stroke();
      break;
    }
    case 'dim':case 'dimr':case 'dimd':case 'dima': drawDimEnt(ctx,e,sel); break;
  }
  ctx.restore();
}
function drawH(ctx,sx,sy){ /* v6.4: alças substituídas pelos grips (drawGrips) */ }
function dimLinePoints(e){
  // Retorna {d1x,d1y,d2x,d2y}: os dois extremos da linha de cota.
  // e.subtp: 'linear'(default) = cota ortogonal (H ou V)  |  'aligned' = paralela ao segmento

  var dx=e.x2-e.x1, dy=e.y2-e.y1, len=Math.hypot(dx,dy);
  if(len<0.001) return null;

  var aligned=(e.subtp==='aligned');
  var d1x,d1y,d2x,d2y;

  if(aligned){
    // ── COTA ALINHADA ──────────────────────────────────────────
    // Linha de cota paralela ao segmento p1-p2.
    var ux=dx/len, uy=dy/len;
    var nx=-uy, ny=ux;                      // normal perpendicular

    if(e.px!==undefined && e.py!==undefined){
      var dot=(e.px-e.x1)*nx+(e.py-e.y1)*ny;
      d1x=e.x1+nx*dot; d1y=e.y1+ny*dot;
      d2x=e.x2+nx*dot; d2y=e.y2+ny*dot;
    } else {
      // legado
      var midY=(e.y1+e.y2)/2;
      var dot2=ny!==0?(e.off-midY)/ny:0;
      d1x=e.x1+nx*dot2; d1y=e.y1+ny*dot2;
      d2x=e.x2+nx*dot2; d2y=e.y2+ny*dot2;
    }
  } else {
    // ── COTA LINEAR (ORTOGONAL) ────────────────────────────────
    // A linha de cota é sempre H ou V, escolhida pelo lado para o qual o
    // cursor foi deslocado. Se o cursor está mais afastado verticalmente
    // do segmento → cota horizontal (mede ΔX); afastado horiz → mede ΔY.
    // O comportamento espelha o DIMLINEAR do AutoCAD.
    if(e.px!==undefined && e.py!==undefined){
      // Determinar modo H ou V guardado em e.dimDir ('h' ou 'v')
      var horizontal=(e.dimDir==='h');
      if(horizontal){
        // Linha de cota é horizontal em y=py; projeta p1.x e p2.x sobre ela
        d1x=e.x1; d1y=e.py;
        d2x=e.x2; d2y=e.py;
      } else {
        // Linha de cota é vertical em x=px; projeta p1.y e p2.y sobre ela
        d1x=e.px; d1y=e.y1;
        d2x=e.px; d2y=e.y2;
      }
    } else {
      // legado (off = Y da linha)
      d1x=e.x1; d1y=e.off;
      d2x=e.x2; d2y=e.off;
    }
  }
  return {d1x:d1x,d1y:d1y,d2x:d2x,d2y:d2y};
}

// Decide H ou V para cota linear com base na posição do cursor.
// Critério AutoCAD: o cursor é projetado perpendicularmente nas duas
// retas de cota possíveis (horizontal passando pelos pontos, vertical
// passando pelos pontos). A que tiver menor distância à projeção vence.
//
// Simplificado: a cota H coloca a linha em y=cursor.y — a distância do
// cursor à linha de cota H é |cursor.y - clampado_entre_y1_y2|.
// A cota V coloca a linha em x=cursor.x — distância é |cursor.x - clampado_entre_x1_x2|.
// Quando o cursor está fora do intervalo (afastado), essa distância cresce
// linearmente → a que ficar menor indica para onde o usuário quer empurrar a cota.
function dimLinearDir(p1,p2,cursor){
  // Bounding box do segmento
  var minX=Math.min(p1.x,p2.x), maxX=Math.max(p1.x,p2.x);
  var minY=Math.min(p1.y,p2.y), maxY=Math.max(p1.y,p2.y);

  // Distância do cursor à faixa horizontal dos pontos (para cota V)
  var clampedY=Math.max(minY,Math.min(maxY,cursor.y));
  var distToV=Math.abs(cursor.y-clampedY);   // 0 se cursor entre y1 e y2

  // Distância do cursor à faixa vertical dos pontos (para cota H)
  var clampedX=Math.max(minX,Math.min(maxX,cursor.x));
  var distToH=Math.abs(cursor.x-clampedX);   // 0 se cursor entre x1 e x2

  // O cursor está mais afastado verticalmente → cota H (linha de cota horizontal)
  // O cursor está mais afastado horizontalmente → cota V (linha de cota vertical)
  var absOffH=Math.abs(cursor.y-(p1.y+p2.y)/2);  // quanto saiu do centro em Y
  var absOffV=Math.abs(cursor.x-(p1.x+p2.x)/2);  // quanto saiu do centro em X

  // Desempate: usa inclinação do segmento
  if(absOffH===absOffV){
    var dx=p2.x-p1.x, dy=p2.y-p1.y;
    return Math.abs(dx)>=Math.abs(dy)?'h':'v';
  }
  return absOffH>=absOffV?'h':'v';
}

function drawDidactic(ctx,e){
  ctx.save();ctx.font='9px Consolas';ctx.fillStyle='#4a5880';ctx.setLineDash([]);ctx.shadowBlur=0;
  switch(e.tp){
    case 'line':{var ms=w2s((e.x1+e.x2)/2,(e.y1+e.y2)/2),len=Math.hypot(e.x2-e.x1,e.y2-e.y1);ctx.fillText(len.toFixed(1),ms.x+3,ms.y-3);if(S.modes.showangles)ctx.fillText((Math.atan2(e.y2-e.y1,e.x2-e.x1)*180/Math.PI).toFixed(1)+'°',ms.x+3,ms.y+10);break;}
    case 'circ':{var cs=w2s(e.cx,e.cy);ctx.fillText('r'+e.r.toFixed(1),cs.x+4,cs.y-4);break;}
    case 'rect':{var ms=w2s(e.x+e.w/2,e.y+e.h/2);ctx.fillText(e.w.toFixed(1)+'×'+e.h.toFixed(1),ms.x,ms.y);break;}
    case 'ell':{var cs=w2s(e.cx,e.cy);ctx.fillText(e.rx.toFixed(1)+'×'+e.ry.toFixed(1),cs.x+4,cs.y-4);break;}
  }
  ctx.restore();
}
function drawCoords(ctx,e){
  ctx.save();ctx.font='8px Consolas';ctx.fillStyle='#3a5060';ctx.setLineDash([]);ctx.shadowBlur=0;
  var sps=snapPts(e);
  for(var i=0;i<sps.length;i++){if(sps[i].st==='end'){var s=w2s(sps[i].x,sps[i].y);ctx.fillText('('+sps[i].x.toFixed(0)+','+sps[i].y.toFixed(0)+')',s.x+4,s.y+10);}}
  ctx.restore();
}

function drawPreview(ctx){
  if((S.tool==='trim'||S.tool==='extend')&&S.ds){ drawTrimExtPreview(ctx,S.hover||{x:0,y:0}); return; } // v6.8
  if(ncIs(S.tool)&&S.ds){ ncPreview(ctx,S.hover||{x:0,y:0}); return; } // v7.0
  if(S.tool==='polyline'&&S.ds&&S.ds.pts&&S.ds.pts.length&&(S.ds.arcMode||S.ds.pts.some(function(p){return p.b;}))){ drawPlinePreview(ctx,S.hover||S.ds.pts[0]); return; } // v7.1
  if(!S.hover) return;
  var ds=S.ds,hp=S.hover,sc=S.vp.sc;
  ctx.save();ctx.strokeStyle='#4d9ef7';ctx.lineWidth=.7;ctx.setLineDash([5,4]);ctx.globalAlpha=.75;ctx.shadowBlur=0;
  switch(S.tool){
    case 'line':
      if(ds&&ds.pts&&ds.pts.length>=1){
        var base=ds.pts[ds.pts.length-1];
        var lp1=w2s(base.x,base.y), lp2=w2s(hp.x,hp.y);

        // ── Linha guia dinâmica (do último ponto ao cursor) ──
        ctx.strokeStyle='#00d4ff';ctx.lineWidth=1.2;ctx.setLineDash([8,4]);ctx.globalAlpha=.85;
        ctx.beginPath();ctx.moveTo(lp1.x,lp1.y);ctx.lineTo(lp2.x,lp2.y);ctx.stroke();
        ctx.setLineDash([]);ctx.globalAlpha=1;

        // Ponto base (verde) e ponto cursor (azul)
        ctx.fillStyle='#00e676';ctx.beginPath();ctx.arc(lp1.x,lp1.y,4,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#00d4ff';ctx.beginPath();ctx.arc(lp2.x,lp2.y,3,0,Math.PI*2);ctx.fill();

        // ── Indicador ortho/polar ──
        if(hp.st==='ortho'||hp.st==='polar'){
          var oCol=hp.st==='ortho'?'#ff5555':'#ffaa00';
          ctx.strokeStyle=oCol;ctx.lineWidth=.5;ctx.setLineDash([2,4]);ctx.globalAlpha=.6;
          // linha de rastreamento estendida
          var dx=hp.x-base.x,dy=hp.y-base.y,ext=3000/sc;
          var lext=w2s(base.x-dx*ext,base.y-dy*ext),rext=w2s(base.x+dx*ext,base.y+dy*ext);
          ctx.beginPath();ctx.moveTo(lext.x,lext.y);ctx.lineTo(rext.x,rext.y);ctx.stroke();
          ctx.setLineDash([]);ctx.globalAlpha=1;
          ctx.fillStyle=oCol;ctx.font='9px Consolas';
          ctx.fillText(hp.st.toUpperCase(),lp1.x+6,lp1.y-8);
        }

        // ── Tooltip de distância e ângulo junto ao cursor ──
        var llen=Math.hypot(hp.x-base.x,hp.y-base.y);
        var lang=((Math.atan2(hp.y-base.y,hp.x-base.x)*180/Math.PI)+360)%360;
        // só mostrar tooltip se o DI não estiver com campos focados
        var diHasFocus=DI.el&&DI.el.contains(document.activeElement);
        if(!diHasFocus){
          var tx=lp2.x+16, ty=lp2.y-8;
          if(tx+80>cvW()) tx=lp2.x-90;
          if(ty<16) ty=lp2.y+20;
          ctx.font='bold 10px Consolas';
          var ltxt=llen.toFixed(2)+'  mm';
          var atxt=lang.toFixed(1)+'°';
          var tw=Math.max(ctx.measureText(ltxt).width,ctx.measureText(atxt).width)+10;
          ctx.fillStyle='rgba(4,8,20,0.92)';
          ctx.beginPath();
          if(ctx.roundRect) ctx.roundRect(tx-3,ty-14,tw,30,3);
          else ctx.rect(tx-3,ty-14,tw,30);
          ctx.fill();
          ctx.fillStyle='#00e676';ctx.fillText(ltxt,tx+2,ty);
          ctx.fillStyle='#f5a623';ctx.font='9px Consolas';ctx.fillText(atxt,tx+2,ty+13);
        }
      }
      break;
    case 'dim':
      if(ds&&ds.phase==='p2'&&ds.pts){
        // Fase p2: linha de preview do 1º ao cursor
        var sp1=w2s(ds.pts[0].x,ds.pts[0].y),spc=w2s(hp.x,hp.y);
        ctx.strokeStyle='#f0c040';ctx.lineWidth=.8;ctx.setLineDash([4,3]);ctx.globalAlpha=.7;
        ctx.beginPath();ctx.moveTo(sp1.x,sp1.y);ctx.lineTo(spc.x,spc.y);ctx.stroke();
        ctx.setLineDash([]);ctx.globalAlpha=1;
        ctx.fillStyle='#f0c040';ctx.beginPath();ctx.arc(sp1.x,sp1.y,3,0,Math.PI*2);ctx.fill();
        var ld=Math.hypot(hp.x-ds.pts[0].x,hp.y-ds.pts[0].y);
        ctx.font='10px Consolas';ctx.fillText(ld.toFixed(2)+'mm',spc.x+8,spc.y-6);
      } else if(ds&&ds.phase==='pos'&&ds.pts&&ds.pts.length===2){
        // Fase pos: preview COMPLETO com cota linear ortogonal (H ou V)
        var p1=ds.pts[0],p2=ds.pts[1];
        // Atualizar direção em tempo real conforme cursor
        ds.dimDir=dimLinearDir(p1,p2,hp); ds.dirHover=true;
        drawDimTemp(ctx,{tp:'dim',subtp:'linear',dimDir:ds.dimDir,x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,px:hp.x,py:hp.y});
      }
      break;

    case 'dimali':
      if(ds&&ds.phase==='p2'&&ds.pts){
        var sp1=w2s(ds.pts[0].x,ds.pts[0].y),spc=w2s(hp.x,hp.y);
        ctx.strokeStyle='#4ec87a';ctx.lineWidth=.8;ctx.setLineDash([4,3]);ctx.globalAlpha=.7;
        ctx.beginPath();ctx.moveTo(sp1.x,sp1.y);ctx.lineTo(spc.x,spc.y);ctx.stroke();
        ctx.setLineDash([]);ctx.globalAlpha=1;
        ctx.fillStyle='#4ec87a';ctx.beginPath();ctx.arc(sp1.x,sp1.y,3,0,Math.PI*2);ctx.fill();
        var ld=Math.hypot(hp.x-ds.pts[0].x,hp.y-ds.pts[0].y);
        ctx.font='10px Consolas';ctx.fillText(ld.toFixed(2)+'mm',spc.x+8,spc.y-6);
      } else if(ds&&ds.phase==='pos'&&ds.pts&&ds.pts.length===2){
        // Cota alinhada: preview paralela ao segmento
        var p1=ds.pts[0],p2=ds.pts[1];
        drawDimTemp(ctx,{tp:'dim',subtp:'aligned',x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,px:hp.x,py:hp.y});
      }
      break;
    case 'dimr':case 'dimd':
      if(ds&&ds.phase==='p2'&&ds.pts){
        var sp1=w2s(ds.pts[0].x,ds.pts[0].y),spc=w2s(hp.x,hp.y);
        ctx.strokeStyle='#f0c040';ctx.lineWidth=.8;ctx.setLineDash([4,3]);ctx.globalAlpha=.7;
        ctx.beginPath();ctx.moveTo(sp1.x,sp1.y);ctx.lineTo(spc.x,spc.y);ctx.stroke();
        ctx.setLineDash([]);ctx.globalAlpha=1;
        var rd=Math.hypot(hp.x-ds.pts[0].x,hp.y-ds.pts[0].y);
        var prefix=S.tool==='dimd'?'⌀':'R';
        var val=S.tool==='dimd'?(rd*2).toFixed(2):rd.toFixed(2);
        ctx.fillStyle='#f0c040';ctx.font='10px Consolas';
        ctx.fillText(prefix+val+'mm',w2s(hp.x,hp.y).x+8,w2s(hp.x,hp.y).y-6);
      } else if(ds&&ds.phase==='pos'&&ds.pts&&ds.pts.length===2){
        // Pré-visualização com o estilo atual
        var c=ds.pts[0],ep2=ds.pts[1],r=Math.hypot(ep2.x-c.x,ep2.y-c.y);
        drawDimTemp(ctx,{tp:S.tool,cx:c.x,cy:c.y,ex:hp.x,ey:hp.y,val:String(S.tool==='dimd'?r*2:r)});
        ctx.globalAlpha=1;
      }
      break;
    case 'spline':
      if(ds&&ds.pts&&ds.pts.length>=1){
        // Pontos já confirmados + cursor atual
        var allpts=ds.pts.concat([{x:hp.x,y:hp.y}]);
        ctx.strokeStyle='#4ec87a';ctx.lineWidth=1;ctx.setLineDash([]);ctx.globalAlpha=.8;
        ctx.beginPath();
        var sp0=w2s(allpts[0].x,allpts[0].y);ctx.moveTo(sp0.x,sp0.y);
        for(var i=0;i<allpts.length-1;i++){
          var a0=w2s(i>0?allpts[i-1].x:allpts[0].x,i>0?allpts[i-1].y:allpts[0].y);
          var a1=w2s(allpts[i].x,allpts[i].y);
          var a2=w2s(allpts[i+1].x,allpts[i+1].y);
          var a3=w2s(i+2<allpts.length?allpts[i+2].x:allpts[i+1].x,i+2<allpts.length?allpts[i+2].y:allpts[i+1].y);
          var cx1=a1.x+(a2.x-a0.x)/6,cy1=a1.y+(a2.y-a0.y)/6;
          var cx2=a2.x-(a3.x-a1.x)/6,cy2=a2.y-(a3.y-a1.y)/6;
          ctx.bezierCurveTo(cx1,cy1,cx2,cy2,a2.x,a2.y);
        }
        ctx.stroke();
        // Pontos de controle
        ctx.fillStyle='#4ec87a';ctx.globalAlpha=1;
        for(var i=0;i<ds.pts.length;i++){var sp=w2s(ds.pts[i].x,ds.pts[i].y);ctx.beginPath();ctx.arc(sp.x,sp.y,3,0,Math.PI*2);ctx.fill();}
      }
      break;
    case 'polyline':
      if(ds.pts&&ds.pts.length>=1){ctx.beginPath();var p0=w2s(ds.pts[0].x,ds.pts[0].y);ctx.moveTo(p0.x,p0.y);for(var i=1;i<ds.pts.length;i++){var p=w2s(ds.pts[i].x,ds.pts[i].y);ctx.lineTo(p.x,p.y);}var pe=w2s(hp.x,hp.y);ctx.lineTo(pe.x,pe.y);ctx.stroke();}
      break;
    case 'rectangle':case 'hatch':
      if(ds.pts&&ds.pts.length>=1){var p1=w2s(ds.pts[0].x,ds.pts[0].y),p2=w2s(hp.x,hp.y);ctx.beginPath();ctx.rect(Math.min(p1.x,p2.x),Math.min(p1.y,p2.y),Math.abs(p2.x-p1.x),Math.abs(p2.y-p1.y));ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;ctx.font='10px Consolas';ctx.fillStyle='#4d9ef7';ctx.fillText(Math.abs(hp.x-ds.pts[0].x).toFixed(2)+'×'+Math.abs(hp.y-ds.pts[0].y).toFixed(2),p2.x+9,p2.y-8);}
      break;
    case 'circle':
      if(ds.pts&&ds.pts.length>=1){var c=w2s(ds.pts[0].x,ds.pts[0].y),r=Math.hypot(hp.x-ds.pts[0].x,hp.y-ds.pts[0].y)*sc;ctx.beginPath();ctx.arc(c.x,c.y,r,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;ctx.font='10px Consolas';ctx.fillStyle='#4d9ef7';ctx.fillText('r'+(r/sc).toFixed(2)+'mm',c.x+r+4,c.y);}
      break;
    case 'arc':
      var p1=w2s(ds.pts[0].x,ds.pts[0].y),p2=w2s(hp.x,hp.y);ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();
      if(ds.pts.length===2){var pa=ds.pts[0],pb=ds.pts[1],pc=hp,D=2*(pa.x*(pb.y-pc.y)+pb.x*(pc.y-pa.y)+pc.x*(pa.y-pb.y));if(Math.abs(D)>1e-6){var a1=pa.x*pa.x+pa.y*pa.y,a2=pb.x*pb.x+pb.y*pb.y,a3=pc.x*pc.x+pc.y*pc.y;var cx=(a1*(pb.y-pc.y)+a2*(pc.y-pa.y)+a3*(pa.y-pb.y))/D,cy=(a1*(pc.x-pb.x)+a2*(pa.x-pc.x)+a3*(pb.x-pa.x))/D;var r=Math.hypot(pa.x-cx,pa.y-cy);var cs=w2s(cx,cy);ctx.beginPath();ctx.arc(cs.x,cs.y,r*sc,-Math.atan2(pa.y-cy,pa.x-cx),-Math.atan2(pc.y-cy,pc.x-cx),true);ctx.stroke();}}
      break;
    case 'ellipse':
      if(ds.pts.length===1){var c=w2s(ds.pts[0].x,ds.pts[0].y),p2=w2s(hp.x,hp.y);ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();}
      else if(ds.pts.length===2){var c=w2s(ds.pts[0].x,ds.pts[0].y),_ax=ds.pts[1].x-ds.pts[0].x,_ay=ds.pts[1].y-ds.pts[0].y,_L=Math.hypot(_ax,_ay),rx=_L*sc,ry=_L>0?Math.abs((hp.x-ds.pts[0].x)*(-_ay/_L)+(hp.y-ds.pts[0].y)*(_ax/_L))*sc:0;if(rx>0&&ry>0){ctx.beginPath();ctx.ellipse(c.x,c.y,rx,ry,-Math.atan2(_ay,_ax),0,Math.PI*2);ctx.stroke();}}
      break;

    case 'dima':
      if(ds&&ds.phase==='p2'&&ds.pts&&ds.pts.length===1){
        var sv=w2s(ds.pts[0].x,ds.pts[0].y),spc=w2s(hp.x,hp.y);
        ctx.strokeStyle='#f0c040';ctx.lineWidth=.8;ctx.setLineDash([4,3]);ctx.globalAlpha=.7;
        ctx.beginPath();ctx.moveTo(sv.x,sv.y);ctx.lineTo(spc.x,spc.y);ctx.stroke();
        ctx.setLineDash([]);ctx.globalAlpha=1;
      } else if(ds&&ds.phase==='p3'&&ds.pts&&ds.pts.length===2){
        var sv=w2s(ds.pts[0].x,ds.pts[0].y),sa=w2s(ds.pts[1].x,ds.pts[1].y),spc=w2s(hp.x,hp.y);
        ctx.strokeStyle='#f0c040';ctx.lineWidth=.8;ctx.setLineDash([]);ctx.globalAlpha=.8;
        ctx.beginPath();ctx.moveTo(sv.x,sv.y);ctx.lineTo(sa.x,sa.y);ctx.stroke();
        ctx.beginPath();ctx.moveTo(sv.x,sv.y);ctx.lineTo(spc.x,spc.y);ctx.stroke();
        var a1=Math.atan2(sa.y-sv.y,sa.x-sv.x),a2=Math.atan2(spc.y-sv.y,spc.x-sv.x);
        var angD=Math.abs((a2-a1)*180/Math.PI);if(angD>180)angD=360-angD;
        ctx.beginPath();ctx.arc(sv.x,sv.y,30,a1,a2);ctx.stroke();
        ctx.fillStyle='#f0c040';ctx.font='10px Consolas';ctx.fillText(angD.toFixed(1)+'°',spc.x+8,spc.y-6);
        ctx.globalAlpha=1;
      } else if(ds&&ds.phase==='pos'&&ds.pts&&ds.pts.length===3){
        var v3=ds.pts[0],pa3=ds.pts[1],pb3=ds.pts[2];
        drawDimTemp(ctx,{tp:'dima',vx:v3.x,vy:v3.y,x1:pa3.x,y1:pa3.y,x2:pb3.x,y2:pb3.y,px:hp.x,py:hp.y});
      }
      break;
      break;
    case 'dist':
      if(ds&&ds.pts&&ds.pts.length===1){
        var sp1=w2s(ds.pts[0].x,ds.pts[0].y),spc=w2s(hp.x,hp.y);
        ctx.strokeStyle='#00e676';ctx.lineWidth=1;ctx.setLineDash([4,3]);ctx.globalAlpha=.8;
        ctx.beginPath();ctx.moveTo(sp1.x,sp1.y);ctx.lineTo(spc.x,spc.y);ctx.stroke();
        ctx.setLineDash([]);ctx.globalAlpha=1;
        ctx.fillStyle='#00e676';ctx.beginPath();ctx.arc(sp1.x,sp1.y,4,0,Math.PI*2);ctx.fill();
        var dd=Math.hypot(hp.x-ds.pts[0].x,hp.y-ds.pts[0].y);
        ctx.font='bold 10px Consolas';
        ctx.fillText(dd.toFixed(3)+'mm',spc.x+8,spc.y-6);
      }
      break;
    case 'area':
      if(ds&&ds.pts&&ds.pts.length>=1){
        ctx.strokeStyle='#f5a623';ctx.lineWidth=1;ctx.setLineDash([4,3]);ctx.globalAlpha=.7;
        ctx.beginPath();
        var ap=w2s(ds.pts[0].x,ds.pts[0].y);ctx.moveTo(ap.x,ap.y);
        for(var i=1;i<ds.pts.length;i++){var pi=w2s(ds.pts[i].x,ds.pts[i].y);ctx.lineTo(pi.x,pi.y);}
        ctx.lineTo(w2s(hp.x,hp.y).x,w2s(hp.x,hp.y).y);
        ctx.closePath();ctx.stroke();
        ctx.fillStyle='#f5a62318';ctx.fill();
        ctx.setLineDash([]);ctx.globalAlpha=1;
        if(ds.pts.length>=2){
          var ptsA=ds.pts.concat([{x:hp.x,y:hp.y}]),nA=ptsA.length,aA=0;
          for(var i=0;i<nA;i++){var j=(i+1)%nA;aA+=ptsA[i].x*ptsA[j].y-ptsA[j].x*ptsA[i].y;}
          ctx.fillStyle='#f5a623';ctx.font='bold 10px Consolas';
          ctx.fillText((Math.abs(aA)/2).toFixed(2)+' mm²',w2s(hp.x,hp.y).x+8,w2s(hp.x,hp.y).y-6);
        }
      }
      break;
    case 'move':
      if(ds&&ds.pts&&ds.pts.length>=1){
        var dx=hp.x-ds.pts[0].x,dy=hp.y-ds.pts[0].y;
        var bp=w2s(ds.pts[0].x,ds.pts[0].y),ep2=w2s(hp.x,hp.y);
        // Linha de referência base→destino
        ctx.strokeStyle='#f5a623';ctx.lineWidth=.7;ctx.setLineDash([4,3]);ctx.globalAlpha=.7;
        ctx.beginPath();ctx.moveTo(bp.x,bp.y);ctx.lineTo(ep2.x,ep2.y);ctx.stroke();
        ctx.setLineDash([]);
        // Preview dos objetos na posição destino
        ctx.globalAlpha=.55;ctx.strokeStyle='#f5a623';
        for(var i=0;i<S.sel.length;i++){var e=findE(S.sel[i]);if(e){var c=clon(e);transl(c,dx,dy);drawE(ctx,c,false);}}
        // Tooltip distância/ângulo
        ctx.globalAlpha=1;ctx.fillStyle='#f5a623';ctx.font='10px Consolas';
        var mdist=Math.hypot(dx,dy),mang=((Math.atan2(dy,dx)*180/Math.PI)+360)%360;
        ctx.fillText(mdist.toFixed(2)+'mm  '+mang.toFixed(1)+'°',ep2.x+10,ep2.y-8);
      }
      break;
    case 'copy':
      if(ds&&ds.phase==='dest'&&ds.base){
        var dx=hp.x-ds.base.x,dy=hp.y-ds.base.y;
        var bp=w2s(ds.base.x,ds.base.y),ep2=w2s(hp.x,hp.y);
        // Linha de referência
        ctx.strokeStyle='#00d4ff';ctx.lineWidth=.8;ctx.setLineDash([4,3]);ctx.globalAlpha=.7;
        ctx.beginPath();ctx.moveTo(bp.x,bp.y);ctx.lineTo(ep2.x,ep2.y);ctx.stroke();
        ctx.setLineDash([]);
        // Ponto base
        ctx.fillStyle='#00e676';ctx.globalAlpha=1;ctx.beginPath();ctx.arc(bp.x,bp.y,4,0,Math.PI*2);ctx.fill();
        // Preview fantasma das cópias
        ctx.globalAlpha=.55;ctx.strokeStyle='#00d4ff';
        for(var i=0;i<S.sel.length;i++){var e=findE(S.sel[i]);if(e){var c=clon(e);transl(c,dx,dy);drawE(ctx,c,false);}}
        // Tooltip
        ctx.globalAlpha=1;ctx.setLineDash([]);
        var cdist=Math.hypot(dx,dy),cang=((Math.atan2(dy,dx)*180/Math.PI)+360)%360;
        var tx=ep2.x+12,ty=ep2.y-8;
        ctx.font='bold 10px Consolas';
        var ct1=cdist.toFixed(2)+'mm', ct2=cang.toFixed(1)+'°';
        var cw=Math.max(ctx.measureText(ct1).width,ctx.measureText(ct2).width)+10;
        ctx.fillStyle='rgba(4,8,20,0.9)';
        if(ctx.roundRect) ctx.roundRect(tx-2,ty-14,cw,28,3); else ctx.rect(tx-2,ty-14,cw,28);
        ctx.fill();
        ctx.fillStyle='#00d4ff';ctx.fillText(ct1,tx+2,ty);
        ctx.fillStyle='#f5a623';ctx.font='9px Consolas';ctx.fillText(ct2,tx+2,ty+12);
      }
      break;
    case 'mirror':
      if(ds&&ds.pts.length>=1){var p1=w2s(ds.pts[0].x,ds.pts[0].y),p2=w2s(hp.x,hp.y);ctx.strokeStyle='#4ec87a';ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();}
      break;
    case 'polygon':
      if(ds&&ds.method==='edge'){
        if(!ds.p1){
          // Linha de preview da aresta
          var p1s=w2s(hp.x,hp.y);
          ctx.fillStyle='#00e676';ctx.beginPath();ctx.arc(p1s.x,p1s.y,3,0,Math.PI*2);ctx.fill();
        } else {
          // Preview do polígono completo pela aresta
          var ex2=hp.x-ds.p1.x,ey2=hp.y-ds.p1.y;
          var el=Math.hypot(ex2,ey2);if(el<0.01) break;
          var mx2=(ds.p1.x+hp.x)/2,my2=(ds.p1.y+hp.y)/2;
          var ea2=Math.atan2(ey2,ex2);
          var ra=el/(2*Math.tan(Math.PI/ds.sides));
          var cx3=mx2-ra*Math.sin(ea2),cy3=my2+ra*Math.cos(ea2);
          var Rv=el/(2*Math.sin(Math.PI/ds.sides));
          var sa3=Math.atan2(ds.p1.y-cy3,ds.p1.x-cx3);
          ctx.strokeStyle='#00d4ff';ctx.lineWidth=1.2;ctx.setLineDash([]);ctx.globalAlpha=.8;
          ctx.beginPath();
          for(var i=0;i<=ds.sides;i++){
            var a3=sa3+i*(2*Math.PI/ds.sides);
            var px3=w2s(cx3+Rv*Math.cos(a3),cy3+Rv*Math.sin(a3));
            i===0?ctx.moveTo(px3.x,px3.y):ctx.lineTo(px3.x,px3.y);
          }
          ctx.stroke();
          // Info
          ctx.setLineDash([]);ctx.globalAlpha=1;ctx.fillStyle='#00d4ff';ctx.font='10px Consolas';
          var pp2=w2s(hp.x,hp.y);ctx.fillText(ds.sides+' lados  aresta='+el.toFixed(2)+'mm',pp2.x+10,pp2.y-8);
        }
      } else if(ds&&ds.center){
        // Preview de inscrito/circunscrito com raio dinâmico
        var r3=Math.hypot(hp.x-ds.center.x,hp.y-ds.center.y);
        if(r3<0.01) break;
        var ang3=Math.atan2(hp.y-ds.center.y,hp.x-ds.center.x);
        var R3=ds.method==='cc'?r3/Math.cos(Math.PI/ds.sides):r3;
        ctx.strokeStyle='#00d4ff';ctx.lineWidth=1.2;ctx.setLineDash([]);ctx.globalAlpha=.8;
        ctx.beginPath();
        for(var i=0;i<=ds.sides;i++){
          var a4=ang3+i*(2*Math.PI/ds.sides);
          var pp3=w2s(ds.center.x+R3*Math.cos(a4),ds.center.y+R3*Math.sin(a4));
          i===0?ctx.moveTo(pp3.x,pp3.y):ctx.lineTo(pp3.x,pp3.y);
        }
        ctx.stroke();
        // Círculo de referência tracejado
        var cs=w2s(ds.center.x,ds.center.y);
        ctx.strokeStyle='#4d9ef750';ctx.lineWidth=.7;ctx.setLineDash([4,3]);
        ctx.beginPath();ctx.arc(cs.x,cs.y,r3*S.vp.sc,0,Math.PI*2);ctx.stroke();
        ctx.setLineDash([]);ctx.globalAlpha=1;
        // Info
        var mt=ds.method==='ic'?'Inscrito':'Circunscrito';
        ctx.fillStyle='#00d4ff';ctx.font='10px Consolas';
        var pp4=w2s(hp.x,hp.y);ctx.fillText(ds.sides+' lados  '+mt+'  r='+r3.toFixed(2)+'mm',pp4.x+10,pp4.y-8);
      } else if(ds&&!ds.center&&ds.method!=='edge'){
        // Aguardando centro: mostrar ponto de cursor
        var pp5=w2s(hp.x,hp.y);
        ctx.fillStyle='#00e676';ctx.beginPath();ctx.arc(pp5.x,pp5.y,4,0,Math.PI*2);ctx.fill();
      }
      break;
    case 'trim':
      if(ds&&ds.phase==='cut'){
        // Fase seleção de bordas: destacar objeto sob cursor como possível borda
        if(!ds.allMode){
          var tgt2=null;for(var i=S.ents.length-1;i>=0;i--){if(hitEnt(S.ents[i],hp.x,hp.y)){tgt2=S.ents[i];break;}}
          if(tgt2){ctx.globalAlpha=.7;ctx.strokeStyle='#00e676';ctx.lineWidth=2;ctx.setLineDash([]);drawE(ctx,tgt2,false);}
          // mostrar bordas já selecionadas em verde
          ctx.globalAlpha=.5;ctx.strokeStyle='#00e676';ctx.lineWidth=1.5;
          for(var i=0;i<ds.cutters.length;i++){var ce=findE(ds.cutters[i]);if(ce)drawE(ctx,ce,false);}
        }
      } else if(ds&&ds.phase==='trim'){
        // Fase corte: destacar bordas em verde e pré-visualizar trecho a remover em vermelho
        if(!ds.allMode){
          ctx.globalAlpha=.35;ctx.strokeStyle='#00e676';ctx.lineWidth=1.5;ctx.setLineDash([]);
          for(var i=0;i<ds.cutters.length;i++){var ce=findE(ds.cutters[i]);if(ce)drawE(ctx,ce,false);}
        }
        // encontrar objeto sob o cursor
        var tgt=null;for(var i=S.ents.length-1;i>=0;i--){
          var e=S.ents[i];
          if(ds.cutters.indexOf(e.id)<0&&(e.tp==='line'||e.tp==='arc'||e.tp==='circ'||e.tp==='pl')&&hitEnt(e,hp.x,hp.y)){tgt=e;break;}
        }
        if(tgt){
          // calcular preview do trecho que será removido
          var previewCutters=ds.allMode
            ? S.ents.filter(function(e){return e.id!==tgt.id;}).map(function(e){return e.id;})
            : ds.cutters;
          var preview=getTrimPreview(tgt,hp,previewCutters);
          if(preview){
            // desenhar o trecho a remover em vermelho tracejado
            ctx.globalAlpha=.85;ctx.strokeStyle='#ff3d3d';ctx.lineWidth=2.5;ctx.setLineDash([]);
            drawSegment(ctx,preview);
            ctx.setLineDash([]);
          } else {
            // sem interseção: destacar objeto todo em vermelho fraco
            ctx.globalAlpha=.4;ctx.strokeStyle='#ff3d3d';ctx.lineWidth=2;ctx.setLineDash([]);drawE(ctx,tgt,false);
          }
        }
      }
      break;
    case 'extend':
      if(ds&&ds.phase==='bnd'){
        // Fase seleção de limites: destacar objeto sob cursor como possível limite
        var tgt2=null;for(var i=S.ents.length-1;i>=0;i--){if(hitEnt(S.ents[i],hp.x,hp.y)){tgt2=S.ents[i];break;}}
        if(tgt2){ctx.globalAlpha=.7;ctx.strokeStyle='#00e676';ctx.lineWidth=2;ctx.setLineDash([]);drawE(ctx,tgt2,false);}
        // limites já selecionados em verde
        ctx.globalAlpha=.5;ctx.strokeStyle='#00e676';ctx.lineWidth=1.5;
        for(var i=0;i<ds.bounds.length;i++){var be=findE(ds.bounds[i]);if(be)drawE(ctx,be,false);}
      } else if(ds&&ds.phase==='ext'){
        // Fase extensão: limites em verde + preview ciano da extensão
        if(!ds.allMode){
          ctx.globalAlpha=.35;ctx.strokeStyle='#00e676';ctx.lineWidth=1.5;ctx.setLineDash([]);
          for(var i=0;i<ds.bounds.length;i++){var be=findE(ds.bounds[i]);if(be)drawE(ctx,be,false);}
        }
        // objeto sob o cursor
        var tgt=null;for(var i=S.ents.length-1;i>=0;i--){
          var e=S.ents[i];
          var isTargetType=(e.tp==='line'||e.tp==='arc'||e.tp==='pl');
          var ok=ds.allMode||ds.bounds.indexOf(e.id)<0;
          if(isTargetType&&ok&&hitEnt(e,hp.x,hp.y)){tgt=e;break;}
        }
        if(tgt){
          // destacar objeto base em amarelo
          ctx.globalAlpha=.7;ctx.strokeStyle='#f5a623';ctx.lineWidth=2;ctx.setLineDash([]);drawE(ctx,tgt,false);
          // calcular e desenhar preview da extensão em ciano tracejado
          var extBounds=ds.allMode
            ? S.ents.filter(function(e){return e.id!==tgt.id;}).map(function(e){return e.id;})
            : ds.bounds;
          var prev=getExtendPreview(tgt,hp,extBounds);
          if(prev){
            ctx.globalAlpha=.9;ctx.strokeStyle='#00d4ff';ctx.lineWidth=1.5;ctx.setLineDash([6,3]);
            drawSegment(ctx,prev);
            ctx.setLineDash([]);
          }
        }
      }
      break;
    case 'fillet': drawFilletPreview(ctx,hp); break;
    case 'chamfer':
      if(ds&&ds.phase==='l2'&&ds.e1){
        ctx.globalAlpha=.7;ctx.strokeStyle='#f5a623';ctx.lineWidth=1.5;drawE(ctx,ds.e1,false);
        ctx.setLineDash([]);ctx.globalAlpha=1;ctx.fillStyle='#f5a623';ctx.font='bold 10px Consolas';
        var sp3=w2s(hp.x,hp.y);ctx.fillText('d1='+ds.d1+' d2='+ds.d2,sp3.x+15,sp3.y-10);
      }
      break;
    case 'offset':
      if(ds&&ds.phase==='pick'){
        // Fase pick: destacar objeto sob o cursor
        var hit=null;for(var i=S.ents.length-1;i>=0;i--){if(hitEnt(S.ents[i],hp.x,hp.y)){hit=S.ents[i];break;}}
        if(hit){
          ctx.globalAlpha=.6;ctx.strokeStyle='#f5a623';ctx.lineWidth=2;ctx.setLineDash([]);drawE(ctx,hit,false);
        }
        ctx.setLineDash([]);ctx.globalAlpha=.8;ctx.fillStyle='#f5a623';ctx.font='bold 10px Consolas';
        var sp4=w2s(hp.x,hp.y);ctx.fillText('d='+ds.dist.toFixed(2),sp4.x+15,sp4.y-10);
      } else if(ds&&ds.phase==='side'&&ds.base){
        // Fase side: destacar objeto base + preview dinâmico do offset no lado do cursor
        ctx.globalAlpha=.8;ctx.strokeStyle='#f5a623';ctx.lineWidth=2;ctx.setLineDash([]);drawE(ctx,ds.base,false);
        // preview ghost no lado do cursor
        var dSigned=offsetSide(ds.base,hp.x,hp.y,ds.dist);
        var ghost=clon(ds.base);offsE(ghost,dSigned);
        ctx.globalAlpha=.85;ctx.strokeStyle='#00d4ff';ctx.lineWidth=1.5;ctx.setLineDash([6,3]);drawE(ctx,ghost,false);
        ctx.setLineDash([]);ctx.globalAlpha=1;ctx.fillStyle='#00d4ff';ctx.font='bold 10px Consolas';
        var sp6=w2s(hp.x,hp.y);ctx.fillText('d='+ds.dist.toFixed(2),sp6.x+15,sp6.y-10);
      }
      break;
  }
  // crosshair
  if(S.tool!=='select'&&S.tool!=='pan'){
    var sp=w2s(hp.x,hp.y),W=cvW(),H=cvH();
    ctx.setLineDash([]);ctx.globalAlpha=1;ctx.strokeStyle='#4d9ef750';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(sp.x,0);ctx.lineTo(sp.x,H);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,sp.y);ctx.lineTo(W,sp.y);ctx.stroke();
    ctx.strokeStyle='#4d9ef7';ctx.strokeRect(sp.x-12,sp.y-12,24,24);
  }
  ctx.restore();
}

function drawWinSel(ctx){
  var ws=w2s(S.winFrom.x,S.winFrom.y),we=w2s(S.hover.x,S.hover.y),isR=we.x>ws.x;
  var x=Math.min(ws.x,we.x),y=Math.min(ws.y,we.y),w=Math.abs(we.x-ws.x),h=Math.abs(we.y-ws.y);
  ctx.save();ctx.fillStyle=isR?'#4d9ef710':'#4ec87a10';ctx.strokeStyle=isR?'#4d9ef7':'#4ec87a';ctx.lineWidth=1;ctx.setLineDash(isR?[]:[4,3]);ctx.beginPath();ctx.rect(x,y,w,h);ctx.fill();ctx.stroke();ctx.restore();
}

