// ── COORD MATH ───────────────────────────────────────────────
function w2s(wx,wy){ return {x: wx*S.vp.sc + S.vp.x, y: -wy*S.vp.sc + S.vp.y}; }
function s2w(sx,sy){ return {x: (sx-S.vp.x)/S.vp.sc, y: -(sy-S.vp.y)/S.vp.sc}; }

// ── SNAP ─────────────────────────────────────────────────────
function snapPts(e) {
  var pts=[], ep=function(x,y){return{x:x,y:y,st:'end'};}, mp=function(x,y){return{x:x,y:y,st:'mid'};}, cp=function(x,y){return{x:x,y:y,st:'cen'};};
  switch(e.tp) {
    case 'line':  pts.push(ep(e.x1,e.y1),ep(e.x2,e.y2),mp((e.x1+e.x2)/2,(e.y1+e.y2)/2)); break;
    case 'circ':  pts.push(cp(e.cx,e.cy)); break; // quadrantes: OSNAP QUADRANT
    case 'arc':   pts.push(cp(e.cx,e.cy),ep(e.cx+e.r*Math.cos(e.sa),e.cy+e.r*Math.sin(e.sa)),ep(e.cx+e.r*Math.cos(e.ea),e.cy+e.r*Math.sin(e.ea))); break;
    case 'rect':  pts.push(ep(e.x,e.y),ep(e.x+e.w,e.y),ep(e.x,e.y+e.h),ep(e.x+e.w,e.y+e.h),mp(e.x+e.w/2,e.y),mp(e.x+e.w/2,e.y+e.h),mp(e.x,e.y+e.h/2),mp(e.x+e.w,e.y+e.h/2),cp(e.x+e.w/2,e.y+e.h/2)); break;
    case 'ell':   pts.push(cp(e.cx,e.cy)); break;
    case 'spline':case 'pl':
      for(var i=0;i<e.pts.length;i++){pts.push(ep(e.pts[i].x,e.pts[i].y));if(i>0)pts.push(mp((e.pts[i].x+e.pts[i-1].x)/2,(e.pts[i].y+e.pts[i-1].y)/2));}
      break;
  }
  return pts;
}

// ── HIT TEST ─────────────────────────────────────────────────
function hitEnt(e,wx,wy) {
  var ly=getLy(e.ly); if(ly&&(!ly.vis||ly.lock)) return false;
  var t=8/S.vp.sc;
  switch(e.tp) {
    case 'line': return segD(wx,wy,e.x1,e.y1,e.x2,e.y2)<t;
    case 'circ': return Math.abs(Math.hypot(wx-e.cx,wy-e.cy)-e.r)<t;
    case 'arc':  return Math.abs(Math.hypot(wx-e.cx,wy-e.cy)-e.r)<t && arcHas(Math.atan2(wy-e.cy,wx-e.cx),e.sa,e.ea);
    case 'rect': return (wx>=e.x&&wx<=e.x+e.w&&(Math.abs(wy-e.y)<t||Math.abs(wy-e.y-e.h)<t))||(wy>=e.y&&wy<=e.y+e.h&&(Math.abs(wx-e.x)<t||Math.abs(wx-e.x-e.w)<t));
    case 'ell':  var lp=ellLocal(e,wx,wy),nx=lp.x/e.rx,ny=lp.y/e.ry; return Math.abs(Math.sqrt(nx*nx+ny*ny)-1)*Math.min(e.rx,e.ry)<t;
    case 'pl':case 'spline': for(var i=0;i<e.pts.length-1;i++) if(segD(wx,wy,e.pts[i].x,e.pts[i].y,e.pts[i+1].x,e.pts[i+1].y)<t) return true; return false;
    case 'txt':  var lt=ellLocal({cx:e.x,cy:e.y,rot:e.rot},wx,wy); return lt.x>=-t&&lt.x<=String(e.txt).length*e.h*.6+t&&lt.y>=-t&&lt.y<=e.h+t;
    case 'dim':case 'dimr':case 'dimd':case 'dima': return dimHit(e,wx,wy,t);
    case 'hatch':return wx>=e.x&&wx<=e.x+e.w&&wy>=e.y&&wy<=e.y+e.h;
    default: return false;
  }
}
function segD(px,py,ax,ay,bx,by){var dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;if(l2===0)return Math.hypot(px-ax,py-ay);var t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/l2));return Math.hypot(px-ax-t*dx,py-ay-t*dy);}
// v6.1: helpers geométricos compartilhados (tela, exportação, layout)
function ellLocal(e,x,y){var r=-(e.rot||0),dx=x-e.cx,dy=y-e.cy;return{x:dx*Math.cos(r)-dy*Math.sin(r),y:dx*Math.sin(r)+dy*Math.cos(r)};}
function ellPt(e,t){var r=e.rot||0,lx=e.rx*Math.cos(t),ly=e.ry*Math.sin(t);return{x:e.cx+lx*Math.cos(r)-ly*Math.sin(r),y:e.cy+lx*Math.sin(r)+ly*Math.cos(r)};}
function ellPoints(e,n){n=n||72;var o=[];for(var i=0;i<=n;i++)o.push(ellPt(e,i/n*Math.PI*2));return o;}
// Amostra a spline (mesma Catmull-Rom→Bézier usada no desenho)
function splinePoints(e,k){
  k=k||10;var P=e.pts,o=[];if(!P||P.length<2)return P?P.slice():[];
  o.push({x:P[0].x,y:P[0].y});
  for(var i=0;i<P.length-1;i++){
    var p0=P[i>0?i-1:0],p1=P[i],p2=P[i+1],p3=P[i+2<P.length?i+2:i+1];
    var c1={x:p1.x+(p2.x-p0.x)/6,y:p1.y+(p2.y-p0.y)/6},c2={x:p2.x-(p3.x-p1.x)/6,y:p2.y-(p3.y-p1.y)/6};
    for(var j=1;j<=k;j++){var t=j/k,u=1-t;
      o.push({x:u*u*u*p1.x+3*u*u*t*c1.x+3*u*t*t*c2.x+t*t*t*p2.x,y:u*u*u*p1.y+3*u*u*t*c1.y+3*u*t*t*c2.y+t*t*t*p2.y});}
  }
  return o;
}
// Cantos do texto no mundo (base em (x,y), altura h, rotação rot)
function txtCorners(e){var w=String(e.txt).length*e.h*.6,h=e.h,r=e.rot||0,c=Math.cos(r),s=Math.sin(r);
  return [[0,0],[w,0],[w,h],[0,h]].map(function(p){return{x:e.x+p[0]*c-p[1]*s,y:e.y+p[0]*s+p[1]*c};});}
function ptsBox(pts){if(!pts.length)return null;var x0=1e18,y0=1e18,x1=-1e18,y1=-1e18;for(var i=0;i<pts.length;i++){var p=pts[i];if(p.x<x0)x0=p.x;if(p.y<y0)y0=p.y;if(p.x>x1)x1=p.x;if(p.y>y1)y1=p.y;}return{x:x0,y:y0,w:x1-x0,h:y1-y0};}
function arcHas(a,sa,ea){var n=function(v){return((v%(Math.PI*2))+(Math.PI*2))%(Math.PI*2);};a=n(a);sa=n(sa);ea=n(ea);return sa<=ea?a>=sa&&a<=ea:a>=sa||a<=ea;}

