/* ═══════════════════════════════════════════════════════════════════
   v6.1 — EXPORTAÇÃO
   Cada entidade é convertida em primitivas no MUNDO (mm):
   line | poly | circle | arc | text | solid | point
   O mesmo conjunto alimenta o DXF R12 e o SVG, garantindo que todos os
   tipos (retângulo, polilinha, polígono, elipse, spline, hachura e cotas)
   sejam exportados.
   ═══════════════════════════════════════════════════════════════════ */
function clipSegRect(x1,y1,x2,y2,r){ // Liang–Barsky
  var dx=x2-x1,dy=y2-y1,t0=0,t1=1,p=[-dx,dx,-dy,dy],q=[x1-r.x,r.x+r.w-x1,y1-r.y,r.y+r.h-y1];
  for(var i=0;i<4;i++){ if(Math.abs(p[i])<1e-15){ if(q[i]<0) return null; } else { var t=q[i]/p[i]; if(p[i]<0){ if(t>t1) return null; if(t>t0) t0=t; } else { if(t<t0) return null; if(t<t1) t1=t; } } }
  return [x1+t0*dx,y1+t0*dy,x1+t1*dx,y1+t1*dy];
}
function hatchLines(r,angDeg,sp){
  var out=[]; if(!(sp>0)) return out;
  var a=angDeg*Math.PI/180,ux=Math.cos(a),uy=Math.sin(a),nx=-uy,ny=ux;
  var cs=[[r.x,r.y],[r.x+r.w,r.y],[r.x,r.y+r.h],[r.x+r.w,r.y+r.h]].map(function(c){return c[0]*nx+c[1]*ny;});
  var mn=Math.min.apply(null,cs),mx=Math.max.apply(null,cs),L=Math.hypot(r.w,r.h)+1,cx=r.x+r.w/2,cy=r.y+r.h/2;
  var c0=cx*nx+cy*ny;
  if((mx-mn)/sp>5000) return out; // proteção contra espaçamento minúsculo
  for(var k=Math.ceil((mn-c0)/sp);k<=Math.floor((mx-c0)/sp);k++){
    var ox=cx+nx*k*sp,oy=cy+ny*k*sp;
    var sg=clipSegRect(ox-ux*L,oy-uy*L,ox+ux*L,oy+uy*L,r); if(sg) out.push(sg);
  }
  return out;
}
function entPrims(e){
  var o=[];
  switch(e.tp){
    case 'line': o.push({k:'line',x1:e.x1,y1:e.y1,x2:e.x2,y2:e.y2}); break;
    case 'circ': o.push({k:'circle',cx:e.cx,cy:e.cy,r:e.r}); break;
    case 'arc':  o.push({k:'arc',cx:e.cx,cy:e.cy,r:e.r,sa:e.sa,ea:e.ea}); break;
    case 'rect': o.push({k:'poly',closed:true,pts:[{x:e.x,y:e.y},{x:e.x+e.w,y:e.y},{x:e.x+e.w,y:e.y+e.h},{x:e.x,y:e.y+e.h}]}); break;
    case 'ell':  var ep=ellPoints(e,72);ep.pop(); o.push({k:'poly',closed:true,pts:ep}); break;
    case 'pl':{
      var P=e.pts.map(function(p){return{x:p.x,y:p.y};});
      if(e.closed&&P.length>2&&Math.hypot(P[0].x-P[P.length-1].x,P[0].y-P[P.length-1].y)<1e-9) P.pop();
      if(P.length>=2) o.push({k:'poly',closed:!!e.closed,pts:P});
    } break;
    case 'spline': var sp=splinePoints(e,10); if(sp.length>=2) o.push({k:'poly',closed:false,pts:sp}); break;
    case 'txt':  o.push({k:'text',x:e.x,y:e.y,h:e.h||10,rot:e.rot||0,txt:String(e.txt),align:'left',font:e.font}); break;
    case 'hatch':{
      var r={x:e.x,y:e.y,w:e.w,h:e.h},ht=e.htype||'lines',spc=e.sp||5;
      o.push({k:'poly',closed:true,pts:[{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h}]});
      var segs=[];
      if(ht==='cross'||ht==='grid'){ segs=hatchLines(r,0,spc).concat(hatchLines(r,90,spc)); }
      else if(ht==='dots'){ for(var xi=r.x+spc/2;xi<r.x+r.w;xi+=spc) for(var yi=r.y+spc/2;yi<r.y+r.h;yi+=spc) o.push({k:'point',x:xi,y:yi}); }
      else if(ht!=='zigzag'){ segs=hatchLines(r,e.ang||45,spc); }
      segs.forEach(function(g){o.push({k:'line',x1:g[0],y1:g[1],x2:g[2],y2:g[3],ld:(ht==='dashed'?'dashed':ht==='dotted'?'dotted':'solid')});});
    } break;
    case 'dim':case 'dimr':case 'dimd':case 'dima':
      dimPrims(e).forEach(function(p){
        if(p.k==='box'){o.push({k:'poly',closed:true,pts:p.pts,role:p.role});}
        else o.push(p);
      }); break;
  }
  return o;
}
function primsBox(list){
  var pts=[];
  list.forEach(function(p){
    if(p.k==='line'){pts.push({x:p.x1,y:p.y1},{x:p.x2,y:p.y2});}
    else if(p.k==='poly'||p.k==='solid'||p.k==='box'||p.k==='fillbox'){pts=pts.concat(p.pts);}
    else if(p.k==='circle'||p.k==='arc'){pts.push({x:p.cx-p.r,y:p.cy-p.r},{x:p.cx+p.r,y:p.cy+p.r});}
    else if(p.k==='text'){
      var w=String(p.txt).length*p.h*.6,sh=p.align==='center'?w/2:p.align==='right'?w:0;
      pts=pts.concat(txtCorners({x:p.x-Math.cos(p.rot||0)*sh,y:p.y-Math.sin(p.rot||0)*sh,h:p.h,rot:p.rot,txt:p.txt}));}
    else if(p.k==='point'){pts.push({x:p.x,y:p.y});}
  });
  return ptsBox(pts);
}
// Coleta todas as primitivas com estilo resolvido
function collectExport(onlyVisible){
  var items=[];
  for(var i=0;i<S.ents.length;i++){
    var e=S.ents[i],ly=getLy(e.ly);
    if(onlyVisible&&ly&&!ly.vis) continue;
    var col=e.col||(ly&&ly.col)||'#dce4f5',lw=e.lw||(ly&&ly.lw)||.35,ld=e.ld||(ly&&ly.ld)||'solid';
    if(e.tp==='hatch') ld='solid';
    if(isDim(e)){
      var st=dimStyleOf(e);
      entPrims(e).forEach(function(p){
        var c=p.role==='ext'?st.extCol:p.role==='text'?st.txtCol:st.col;
        items.push({p:p,e:e,ly:ly,col:c,lw:(p.role==='ext'?st.extLw:st.lw),ld:'solid',txtCol:st.txtCol,font:st.font});
      });
      continue;
    }
    entPrims(e).forEach(function(p){items.push({p:p,e:e,ly:ly,col:col,lw:lw,ld:p.ld||ld,txtCol:col});});
  }
  return items;
}
function downloadBlob(content,type,name){var b=new Blob([content],{type:type});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1000);}

// ── DXF R12 (AC1009): o formato de maior compatibilidade (AutoCAD, LibreCAD, QGIS, BricsCAD...)
var DXF_LT={
  solid:null,
  dashed:{n:'DASHED',d:'Dashed __ __ __',p:[12.7,-6.35]},
  hidden:{n:'HIDDEN',d:'Hidden _ _ _ _',p:[6.35,-3.175]},
  center:{n:'CENTER',d:'Center ____ _ ____',p:[31.75,-6.35,6.35,-6.35]},
  phantom:{n:'PHANTOM',d:'Phantom ____ _ _ ____',p:[31.75,-6.35,6.35,-6.35,6.35,-6.35]},
  dotted:{n:'DOT',d:'Dot . . . .',p:[0,-6.35]},
  dashdot:{n:'DASHDOT',d:'Dash dot __ . __',p:[12.7,-6.35,0,-6.35]},
  divide:{n:'DIVIDE',d:'Divide __ . . __',p:[12.7,-6.35,0,-6.35,0,-6.35]}
};
function hex2aci(h){
  var m=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(h||''); if(!m) return 7;
  var r=parseInt(m[1],16),g=parseInt(m[2],16),b=parseInt(m[3],16);
  var pal={1:[255,0,0],2:[255,255,0],3:[0,255,0],4:[0,255,255],5:[0,0,255],6:[255,0,255],7:[255,255,255],8:[128,128,128],9:[192,192,192],30:[255,127,0],40:[255,191,0],140:[0,127,255],150:[0,63,255],250:[51,51,51]};
  var best=7,bd=1e18; for(var k in pal){var p=pal[k],d=(p[0]-r)*(p[0]-r)+(p[1]-g)*(p[1]-g)+(p[2]-b)*(p[2]-b);if(d<bd){bd=d;best=+k;}}
  return best;
}
function dxfStr(s){
  return String(s).replace(/[\r\n]+/g,' ').replace(/°/g,'%%d').replace(/[⌀Ø]/g,'%%c').replace(/±/g,'%%p')
    .replace(/[^\x20-\x7e]/g,function(c){var h=c.charCodeAt(0).toString(16).toUpperCase();while(h.length<4)h='0'+h;return '\\U+'+h;});
}
function dxfLayerNames(){
  var used={},map={};
  S.layers.forEach(function(l){
    var n=String(l.nm).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_\-$]/g,'_')||('L'+l.id);
    var base=n,i=2; while(used[n.toUpperCase()]){n=base+'_'+(i++);} used[n.toUpperCase()]=1; map[l.id]=n;
  });
  return map;
}
function buildDXF(){
  var NL='\r\n',out=[];
  function g(code,val){out.push(String(code),String(val));}
  function n(v){return String(Math.round(v*1e6)/1e6);}
  var items=collectExport(false),lmap=dxfLayerNames(),bb=primsBox(items.map(function(it){return it.p;}))||{x:0,y:0,w:0,h:0};
  g(0,'SECTION');g(2,'HEADER');
  g(9,'$ACADVER');g(1,'AC1009');
  g(9,'$INSBASE');g(10,0);g(20,0);g(30,0);
  g(9,'$EXTMIN');g(10,n(bb.x));g(20,n(bb.y));g(30,0);
  g(9,'$EXTMAX');g(10,n(bb.x+bb.w));g(20,n(bb.y+bb.h));g(30,0);
  g(9,'$LTSCALE');g(40,1);
  g(0,'ENDSEC');
  g(0,'SECTION');g(2,'TABLES');
  var lts=Object.keys(DXF_LT).filter(function(k){return DXF_LT[k];});
  g(0,'TABLE');g(2,'LTYPE');g(70,lts.length+1);
  g(0,'LTYPE');g(2,'CONTINUOUS');g(70,0);g(3,'Solid line');g(72,65);g(73,0);g(40,0);
  lts.forEach(function(k){var t=DXF_LT[k],tot=t.p.reduce(function(a,b){return a+Math.abs(b);},0);
    g(0,'LTYPE');g(2,t.n);g(70,0);g(3,t.d);g(72,65);g(73,t.p.length);g(40,n(tot));t.p.forEach(function(v){g(49,n(v));});});
  g(0,'ENDTAB');
  g(0,'TABLE');g(2,'LAYER');g(70,S.layers.length);
  S.layers.forEach(function(l){var lt=DXF_LT[l.ld];g(0,'LAYER');g(2,lmap[l.id]);g(70,l.lock?4:0);g(62,(l.vis?1:-1)*hex2aci(l.col));g(6,lt?lt.n:'CONTINUOUS');});
  g(0,'ENDTAB');
  g(0,'TABLE');g(2,'STYLE');g(70,1);
  g(0,'STYLE');g(2,'STANDARD');g(70,0);g(40,0);g(41,1);g(50,0);g(71,0);g(42,2.5);g(3,fontInfo(S.textFont).file);g(4,'');
  g(0,'ENDTAB');
  g(0,'ENDSEC');
  g(0,'SECTION');g(2,'ENTITIES');
  items.forEach(function(it){
    var p=it.p,lay=lmap[it.e.ly]!==undefined?lmap[it.e.ly]:'0',lt=DXF_LT[it.ld];
    function common(){g(8,lay);if(lt)g(6,lt.n);g(62,hex2aci(p.k==='text'?it.txtCol:it.col));}
    switch(p.k){
      case 'line': g(0,'LINE');common();g(10,n(p.x1));g(20,n(p.y1));g(30,0);g(11,n(p.x2));g(21,n(p.y2));g(31,0);break;
      case 'circle':
        if(p.fill){g(0,'SOLID');common();var q=p.r*0.7071;g(10,n(p.cx-q));g(20,n(p.cy-q));g(30,0);g(11,n(p.cx+q));g(21,n(p.cy-q));g(31,0);g(12,n(p.cx-q));g(22,n(p.cy+q));g(32,0);g(13,n(p.cx+q));g(23,n(p.cy+q));g(33,0);}
        g(0,'CIRCLE');common();g(10,n(p.cx));g(20,n(p.cy));g(30,0);g(40,n(p.r));break;
      case 'arc': g(0,'ARC');common();g(10,n(p.cx));g(20,n(p.cy));g(30,0);g(40,n(p.r));
        g(50,n(((p.sa*180/Math.PI)%360+360)%360));g(51,n(((p.ea*180/Math.PI)%360+360)%360));break;
      case 'poly': g(0,'POLYLINE');common();g(66,1);g(10,0);g(20,0);g(30,0);g(70,p.closed?1:0);
        p.pts.forEach(function(v,vi){g(0,'VERTEX');g(8,lay);g(10,n(v.x));g(20,n(v.y));g(30,0);if(p.b&&Math.abs(p.b[vi]||0)>1e-12)g(42,n(p.b[vi]));});
        g(0,'SEQEND');g(8,lay);break;
      case 'solid': g(0,'SOLID');common();var s0=p.pts[0],s1=p.pts[1],s2=p.pts[2];
        g(10,n(s0.x));g(20,n(s0.y));g(30,0);g(11,n(s1.x));g(21,n(s1.y));g(31,0);g(12,n(s2.x));g(22,n(s2.y));g(32,0);g(13,n(s2.x));g(23,n(s2.y));g(33,0);break;
      case 'point': g(0,'POINT');common();g(10,n(p.x));g(20,n(p.y));g(30,0);break;
      case 'text': g(0,'TEXT');g(8,lay);g(62,hex2aci(it.txtCol));g(10,n(p.x));g(20,n(p.y));g(30,0);g(40,n(p.h));g(1,dxfStr(p.txt));
        if(p.rot)g(50,n(p.rot*180/Math.PI));g(7,'STANDARD');
        if(p.align==='center'){g(72,1);g(11,n(p.x));g(21,n(p.y));g(31,0);}
        break;
    }
  });
  g(0,'ENDSEC');g(0,'EOF');
  return out.join(NL)+NL;
}
// Exportação DXF: ver='2000' (padrão, AutoCAD/ZWCAD) ou '12' (compatibilidade máxima)
function dxfExportOpts(){
  var d=document.getElementById('dxf-dims'),h=document.getElementById('dxf-hatch'),bk=document.getElementById('dxf-blocks'),lt=document.getElementById('dxf-lwt');
  return {dims:d&&!d.checked?'exploded':'native',hatch:h&&!h.checked?'exploded':'native',blocks:bk&&!bk.checked?'exploded':'native',lwDisplay:!!(lt&&lt.checked)};
}
function dxfBaseName(){
  var t=(document.getElementById('ftitle').textContent||'').replace(/\.(json|dxf|dwg)$/i,'').trim();
  if(!t||/^sem t[ií]tulo/i.test(t)) t='educad';
  return t.replace(/[\\/:*?"<>|]+/g,'_');
}
function expDXF(ver,opt,fname){
  ver=ver||'2000';
  var d=ver==='12'?buildDXF():cp1252Encode(buildDXF2000(opt||dxfExportOpts()));
  var name=fname||(dxfBaseName()+(ver==='12'?'_R12':'')+'.dxf');
  downloadBlob(d,'application/dxf',name);
  var nd=S.ents.filter(isDim).length;
  log('DXF '+(ver==='12'?'R12':'2000 (AC1015)')+' exportado: '+name+' — '+S.ents.length+' objeto(s)'+(ver!=='12'&&nd?', '+nd+' cota(s) editável(is)':'')+'.','ok');
  return name;
}
// DWG: formato fechado. Gera-se um DXF 2000 e orienta-se a conversão no CAD de destino.
function expDWG(){
  var name=expDXF('2000',dxfExportOpts(),dxfBaseName()+'_para_DWG.dxf');
  document.getElementById('dwg-file').textContent=name;
  document.getElementById('ov-dwg').classList.add('show');
}
/* ═══════════════════════════════════════════════════════════════════
   v6.3 — DXF 2000 (AC1015)
   Formato lido por AutoCAD 2000 ou superior, ZWCAD, BricsCAD, DraftSight,
   LibreCAD, QCAD e QGIS. Diferente do R12, preserva:
   - entidades nativas: LWPOLYLINE, ELLIPSE, SPLINE, HATCH e DIMENSION;
   - cor verdadeira (RGB), espessura de linha e tipo de linha por objeto;
   - estilos de cota (tabela DIMSTYLE) e cotas editáveis no CAD de destino;
   - unidades do desenho (milímetros) e vista inicial ajustada ao desenho.
   Textos com acentos usam a notação \U+XXXX (independe da página de código).
   ═══════════════════════════════════════════════════════════════════ */
var DXF_LW=[0,5,9,13,15,18,20,25,30,35,40,50,53,60,70,80,90,100,106,120,140,158,200,211];
function dxfLw(mm){ var v=Math.round((parseFloat(mm)||0)*100),b=DXF_LW[0],bd=1e9; DXF_LW.forEach(function(w){var d=Math.abs(w-v);if(d<bd){bd=d;b=w;}}); return b; }
function dxfTrueColor(h){ var m=/^#?([0-9a-f]{6})/i.exec(h||''); return m?parseInt(m[1],16):null; }
// Nomes de tabela (estilos de cota) aceitos pelo AutoCAD: sem < > / \ " : ; ? * | = `
function dxfSymName(nm){ return String(nm).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[<>\/\\":;?*|=`]/g,'_').replace(/[^\x20-\x7e]/g,'_').trim()||'Estilo'; }
// Página de código Windows-1252 (declarada em $DWGCODEPAGE): acentos do português gravados
// diretamente; caracteres fora dela vão como \U+XXXX (notação do próprio AutoCAD).
var CP1252_EXTRA={0x20AC:0x80,0x201A:0x82,0x0192:0x83,0x201E:0x84,0x2026:0x85,0x2020:0x86,0x2021:0x87,0x02C6:0x88,0x2030:0x89,0x0160:0x8A,0x2039:0x8B,0x0152:0x8C,0x017D:0x8E,0x2018:0x91,0x2019:0x92,0x201C:0x93,0x201D:0x94,0x2022:0x95,0x2013:0x96,0x2014:0x97,0x02DC:0x98,0x2122:0x99,0x0161:0x9A,0x203A:0x9B,0x0153:0x9C,0x017E:0x9E,0x0178:0x9F};
function cp1252Byte(code){ if(code<0x80) return code; if(code>=0xA0&&code<=0xFF) return code; return CP1252_EXTRA[code]; }
function dxfStrCP(s){
  return String(s).replace(/[\r\n]+/g,' ').replace(/°/g,'%%d').replace(/[⌀Ø]/g,'%%c').replace(/±/g,'%%p')
    .replace(/[^\x20-\x7e]/g,function(c){var k=c.charCodeAt(0);if(cp1252Byte(k)!==undefined)return c;var h=k.toString(16).toUpperCase();while(h.length<4)h='0'+h;return '\\U+'+h;});
}
function cp1252Encode(str){ var b=new Uint8Array(str.length); for(var i=0;i<str.length;i++){ var v=cp1252Byte(str.charCodeAt(i)); b[i]=v===undefined?63:v; } return b; }
function dxfInsUnits(){ var u=(S.units&&S.units.insertScale)||'mm'; return {mm:4,cm:5,m:6,'in':1,ft:2,km:7}[u]||4; }

function buildDXF2000(opt){
  opt=opt||{};
  var dimsNative=opt.dims!=='exploded', hatchNative=opt.hatch!=='exploded';
  var NL='\r\n',out=[];
  function g(c,v){out.push(String(c),String(v));}
  function n(v){var r=Math.round(v*1e8)/1e8;if(!isFinite(r))r=0;var s=String(r);return s.indexOf('.')<0&&s.indexOf('e')<0?s+'.0':s;}
  var hnd=0x30; function H(){return (hnd++).toString(16).toUpperCase();}
  var lmap=dxfLayerNames();
  // ── handles fixos das tabelas e objetos
  var hT={vport:H(),ltype:H(),layer:H(),style:H(),view:H(),ucs:H(),appid:H(),dimstyle:H(),brec:H()};
  var hO={root:H(),group:H(),layout:H(),mlstyle:H(),plotset:H(),pstyle:H(),pnormal:H(),mlStd:H(),layModel:H(),layPaper:H()};
  var hB={msRec:H(),psRec:H(),msBlk:H(),msEnd:H(),psBlk:H(),psEnd:H()};
  // v7.6: layouts (espaço do papel)
  var PL=(typeof dxfPaperLayouts==='function')?dxfPaperLayouts():[];
  PL.forEach(function(L,i){ L.rec=i?H():hB.psRec; L.blk=i?H():hB.psBlk; L.end=i?H():hB.psEnd; L.lay=i?H():hO.layPaper; L.bname=i?'*Paper_Space'+(i-1):'*Paper_Space'; });
  var hStd=H(), hVp=H(), hApp=H();
  // tipos de linha usados
  var LTH={ByBlock:H(),ByLayer:H(),Continuous:H()};
  Object.keys(DXF_LT).forEach(function(k){ if(DXF_LT[k]) LTH[DXF_LT[k].n]=H(); });
  function ltName(ld){ var t=DXF_LT[ld]; return t?t.n:'Continuous'; }
  // camadas
  var layers=S.layers.slice(); if(!layers.some(function(l){return l.id===0;})) layers.unshift({id:0,nm:'0',col:'#ffffff',vis:true,lock:false,ld:'solid',lw:.25});
  var LYH={}; layers.forEach(function(l){LYH[l.id]=H();}); var hDefp=H();
  // estilos de cota
  var DSH={},DSN={},usedDS={}; S.dimStyles.forEach(function(st){DSH[st.name]=H();var b=dxfSymName(st.name),nm=b,i=2;while(usedDS[nm.toUpperCase()])nm=b+'_'+(i++);usedDS[nm.toUpperCase()]=1;DSN[st.name]=nm;});
  // blocos das cotas (*D1, *D2, ...)
  var dimEnts=dimsNative?S.ents.filter(isDim):[];
  var dimBlk=dimEnts.map(function(e,i){return {e:e,name:'*D'+(i+1),rec:H(),blk:H(),end:H()};});
  // v8.6: blocos do usuário como BLOCK + INSERT (antes saíam explodidos)
  var UBK={},ubUsed={},userBlk=(S._nb?Object.keys(S.blocks||{}):[]).map(function(k){ var nm=dxfSymName(k).replace(/^\*+/,'')||'Bloco',b=nm,i=2; while(ubUsed[nm.toUpperCase()]||/^\*?(MODEL|PAPER)_SPACE/i.test(nm)) nm=b+'_'+(i++); ubUsed[nm.toUpperCase()]=1;
    var o={key:k,name:nm,rec:H(),blk:H(),end:H()}; UBK[k]=o; return o; });
  var bb=primsBox(collectExport(false).map(function(it){return it.p;}))||{x:0,y:0,w:100,h:100};
  var W=Math.max(bb.w,1),Hh=Math.max(bb.h,1),cx=bb.x+bb.w/2,cy=bb.y+bb.h/2;

  // ── HEADER
  g(0,'SECTION');g(2,'HEADER');
  g(9,'$ACADVER');g(1,'AC1015');
  g(9,'$DWGCODEPAGE');g(3,'ANSI_1252');
  g(9,'$INSBASE');g(10,'0.0');g(20,'0.0');g(30,'0.0');
  g(9,'$EXTMIN');g(10,n(bb.x));g(20,n(bb.y));g(30,'0.0');
  g(9,'$EXTMAX');g(10,n(bb.x+bb.w));g(20,n(bb.y+bb.h));g(30,'0.0');
  g(9,'$LIMMIN');g(10,'0.0');g(20,'0.0');
  g(9,'$LIMMAX');g(10,'420.0');g(20,'297.0');
  g(9,'$LTSCALE');g(40,n(S.ltscale||1)); g(9,'$PSLTSCALE');g(70,S.ltscale?0:1); // v8.12: escala de tipos de linha do template
  g(9,'$CELTSCALE');g(40,'1.0');
  g(9,'$TEXTSTYLE');g(7,'Standard');
  g(9,'$CLAYER');g(8,'0');
  g(9,'$CELTYPE');g(6,'ByLayer');
  g(9,'$DIMSTYLE');g(2,DSN[S.dimCurrent]||'Standard');
  g(9,'$LUNITS');g(70,2);
  g(9,'$LUPREC');g(70,4);
  g(9,'$AUNITS');g(70,0);
  g(9,'$INSUNITS');g(70,dxfInsUnits());
  g(9,'$MEASUREMENT');g(70,1);
  g(9,'$LWDISPLAY');g(290,opt.lwDisplay?1:0); g(9,'$LWDEFAULT');g(70,25); // v8.10: espessuras gravadas, mas o botão LWT do AutoCAD começa desligado (como no AutoCAD)
  g(9,'$PSTYLEMODE');g(290,1);
  g(9,'$HANDSEED');var seedIdx=out.length;g(5,'FFFF');
  g(0,'ENDSEC');
  g(0,'SECTION');g(2,'CLASSES');g(0,'ENDSEC');

  // ── TABLES
  g(0,'SECTION');g(2,'TABLES');
  function tbl(name,h,count,extra){g(0,'TABLE');g(2,name);g(5,h);g(330,0);g(100,'AcDbSymbolTable');g(70,count);if(extra)g(100,extra);}
  function rec(type,h,owner,sub){g(0,type);g(type==='DIMSTYLE'?105:5,h);g(330,owner);g(100,'AcDbSymbolTableRecord');g(100,sub);}
  // VPORT: vista inicial enquadrando o desenho
  tbl('VPORT',hT.vport,1);
  rec('VPORT',hVp,hT.vport,'AcDbViewportTableRecord');
  g(2,'*Active');g(70,0);g(10,'0.0');g(20,'0.0');g(11,'1.0');g(21,'1.0');g(12,n(cx));g(22,n(cy));
  g(13,'0.0');g(23,'0.0');g(14,'10.0');g(24,'10.0');g(15,'10.0');g(25,'10.0');
  g(16,'0.0');g(26,'0.0');g(36,'1.0');g(17,'0.0');g(27,'0.0');g(37,'0.0');
  g(40,n(Math.max(Hh,W/1.6)*1.15));g(41,'1.6');g(42,'50.0');g(43,'0.0');g(44,'0.0');g(50,'0.0');g(51,'0.0');
  g(71,0);g(72,1000);g(73,1);g(74,3);g(75,0);g(76,0);g(77,0);g(78,0);g(281,0);g(65,1);
  g(0,'ENDTAB');
  // LTYPE
  var ltKeys=Object.keys(LTH);
  tbl('LTYPE',hT.ltype,ltKeys.length);
  ltKeys.forEach(function(nm){
    rec('LTYPE',LTH[nm],hT.ltype,'AcDbLinetypeTableRecord');
    g(2,nm);g(70,0);
    var def=null;Object.keys(DXF_LT).forEach(function(k){if(DXF_LT[k]&&DXF_LT[k].n===nm)def=DXF_LT[k];});
    if(!def){g(3,nm==='Continuous'?'Solid line':'');g(72,65);g(73,0);g(40,'0.0');return;}
    var tot=def.p.reduce(function(a,b){return a+Math.abs(b);},0);
    g(3,def.d);g(72,65);g(73,def.p.length);g(40,n(tot));
    def.p.forEach(function(v){g(49,n(v));g(74,0);});
  });
  g(0,'ENDTAB');
  // LAYER
  tbl('LAYER',hT.layer,layers.length+1);
  layers.forEach(function(l){
    rec('LAYER',LYH[l.id],hT.layer,'AcDbLayerTableRecord');
    g(2,lmap[l.id]||'0');g(70,l.lock?4:0);g(62,(l.vis===false?-1:1)*hex2aci(l.col));
    var tc=dxfTrueColor(l.col);if(tc!==null)g(420,tc);
    g(6,ltName(l.ld));if(l.plot===false)g(290,0);g(370,dxfLw(l.lw||.25));g(390,hO.pnormal);
  });
  rec('LAYER',hDefp,hT.layer,'AcDbLayerTableRecord');
  g(2,'Defpoints');g(70,0);g(62,7);g(6,'Continuous');g(290,0);g(370,-3);g(390,hO.pnormal);
  g(0,'ENDTAB');
  // STYLE
  // v8.10: estilos de texto com a fonte escolhida (antes: só Standard com txt.shx)
  var FST=fontDxfStyles();
  tbl('STYLE',hT.style,1+FST.length);
  function styleRec(h,name,key){ var F=fontInfo(key); rec('STYLE',h,hT.style,'AcDbTextStyleTableRecord');
    g(2,name);g(70,0);g(40,'0.0');g(41,'1.0');g(50,'0.0');g(71,0);g(42,'2.5');g(3,F.file);g(4,'');
    if(F.ttf){ g(1001,'ACAD');g(1000,F.family);g(1071,0); } }
  styleRec(hStd,'Standard',S.textFont);
  FST.forEach(function(s){ s.h=H(); styleRec(s.h,s.name,s.key); });
  function styleHandleOf(key){ var nm=fontStyleName(key); if(nm==='Standard') return hStd; var f=FST.filter(function(s){return s.name===nm;})[0]; return f?f.h:hStd; }
  g(0,'ENDTAB');
  tbl('VIEW',hT.view,0);g(0,'ENDTAB');
  tbl('UCS',hT.ucs,0);g(0,'ENDTAB');
  tbl('APPID',hT.appid,1);
  rec('APPID',hApp,hT.appid,'AcDbRegAppTableRecord');g(2,'ACAD');g(70,0);
  g(0,'ENDTAB');
  // DIMSTYLE: cada estilo do DDIM vira um estilo de cota do AutoCAD
  tbl('DIMSTYLE',hT.dimstyle,S.dimStyles.length,'AcDbDimStyleTable');
  S.dimStyles.forEach(function(st){
    rec('DIMSTYLE',DSH[st.name],hT.dimstyle,'AcDbDimStyleTableRecord');
    var lfac=(st.scale||1)*({cm:0.1,m:0.001,'in':1/25.4}[st.unit]||1);
    var post=(st.prefix||st.suffix)?(st.prefix||'')+'<>'+(st.suffix||''):'';
    var apost=(st.altPrefix||st.altSuffix)?(st.altPrefix||'')+'[]'+(st.altSuffix||''):'';
    var zin=(st.zLead?4:0)+(st.zTrail?8:0);
    var tol=st.tolMethod==='symmetric'||st.tolMethod==='deviation';
    g(2,DSN[st.name]);g(70,0);g(3,dxfStrCP(post));g(4,dxfStrCP(apost));
    g(40,n(st.annot?0:(st.dimscale||1)));g(41,n(st.arrowSize));g(42,n(st.extOrigin));g(43,n(st.baseInc!==undefined?st.baseInc:3.75));g(44,n(st.extDimline));
    g(45,n(st.round||0));g(46,'0.0');g(47,n(st.tolUpper));g(48,n(st.tolMethod==='symmetric'?st.tolUpper:st.tolLower));
    g(140,n(st.txtH));g(141,n(st.centerMark==='none'?0:st.centerMark==='line'?-st.centerSize:st.centerSize));
    g(142,n(st.arrowType==='tick'?st.arrowSize*0.5:0));g(143,n(st.altMult));g(144,n(lfac));g(145,'0.0');
    g(146,n(st.tolScale||0.7));g(147,n(st.tolMethod==='basic'?-st.txtGap:st.txtGap));g(148,'0.0');
    g(71,tol?1:0);g(72,st.tolMethod==='limits'?1:0);
    g(73,st.txtAlign==='horizontal'?1:0);g(74,st.txtAlign==='aligned'?0:1);
    g(75,st.se1?1:0);g(76,st.se2?1:0);g(77,st.txtPos==='above'?1:st.txtPos==='below'?4:0);g(78,zin);g(79,st.angZTrail?2:0);
    g(170,st.altOn?1:0);g(171,st.altPrec|0);g(172,st.forceLine?1:0);g(173,0);g(174,0);g(175,0);
    g(176,hex2aci(st.col));g(177,hex2aci(st.extCol));g(178,hex2aci(st.txtCol));g(179,st.angPrec|0);
    g(271,st.prec|0);g(272,st.tolPrec|0);g(273,2);g(274,st.tolPrec|0);
    g(275,{deg:0,dms:1,grad:2,rad:3}[st.angFmt]||0);g(276,0);g(277,st.unitFmt==='scientific'?1:2);
    g(278,(st.decSep||'.').charCodeAt(0));g(279,0);g(280,{center:0,ext1:1,ext2:2}[st.txtJust]||0);
    g(281,st.sd1?1:0);g(282,st.sd2?1:0);g(283,1);g(284,zin);g(285,zin);g(286,zin);g(288,0);g(289,st.fit==='inside'?0:3);
    g(340,styleHandleOf(st.font));g(371,dxfLw(st.lw));g(372,dxfLw(st.extLw));
  });
  g(0,'ENDTAB');
  // BLOCK_RECORD
  tbl('BLOCK_RECORD',hT.brec,2+dimBlk.length+userBlk.length+Math.max(0,PL.length-1));
  rec('BLOCK_RECORD',hB.msRec,hT.brec,'AcDbBlockTableRecord');g(2,'*Model_Space');g(340,hO.layModel);
  rec('BLOCK_RECORD',hB.psRec,hT.brec,'AcDbBlockTableRecord');g(2,'*Paper_Space');g(340,hO.layPaper);
  PL.slice(1).forEach(function(L){ rec('BLOCK_RECORD',L.rec,hT.brec,'AcDbBlockTableRecord');g(2,L.bname);g(340,L.lay); });
  dimBlk.forEach(function(d){rec('BLOCK_RECORD',d.rec,hT.brec,'AcDbBlockTableRecord');g(2,d.name);});
  userBlk.forEach(function(d){rec('BLOCK_RECORD',d.rec,hT.brec,'AcDbBlockTableRecord');g(2,d.name);});
  g(0,'ENDTAB');
  g(0,'ENDSEC');

  // ── auxiliares de entidade
  var PAPER67=false;
  function ent(type,owner,lay,sub,st){
    g(0,type);g(5,H());g(330,owner);g(100,'AcDbEntity');if(PAPER67)g(67,1);g(8,lay);
    if(st){ if(st.lt)g(6,st.lt); if(st.col){g(62,hex2aci(st.col));var tc=dxfTrueColor(st.col);if(tc!==null)g(420,tc);} if(st.lw!==undefined)g(370,dxfLw(st.lw)); }
    g(100,sub);
  }
  function primToDxf(p,owner,lay,sty){
    switch(p.k){
      case 'line': ent('LINE',owner,lay,'AcDbLine',sty);g(10,n(p.x1));g(20,n(p.y1));g(30,'0.0');g(11,n(p.x2));g(21,n(p.y2));g(31,'0.0');break;
      case 'arc': ent('ARC',owner,lay,'AcDbCircle',sty);g(10,n(p.cx));g(20,n(p.cy));g(30,'0.0');g(40,n(p.r));g(100,'AcDbArc');
        g(50,n(((p.sa*180/Math.PI)%360+360)%360));g(51,n(((p.ea*180/Math.PI)%360+360)%360));break;
      case 'circle':
        if(p.fill){ // ponto cheio: polilinha com largura (técnica do comando DONUT)
          ent('LWPOLYLINE',owner,lay,'AcDbPolyline',sty);g(90,2);g(70,1);g(43,n(p.r));
          g(10,n(p.cx-p.r/2));g(20,n(p.cy));g(42,'1.0');g(10,n(p.cx+p.r/2));g(20,n(p.cy));g(42,'1.0');
        } else { ent('CIRCLE',owner,lay,'AcDbCircle',sty);g(10,n(p.cx));g(20,n(p.cy));g(30,'0.0');g(40,n(p.r)); }
        break;
      case 'solid': ent('SOLID',owner,lay,'AcDbTrace',sty);var a=p.pts[0],b=p.pts[1],c=p.pts[2];
        g(10,n(a.x));g(20,n(a.y));g(30,'0.0');g(11,n(b.x));g(21,n(b.y));g(31,'0.0');g(12,n(c.x));g(22,n(c.y));g(32,'0.0');g(13,n(c.x));g(23,n(c.y));g(33,'0.0');break;
      case 'poly': case 'box': ent('LWPOLYLINE',owner,lay,'AcDbPolyline',sty);g(90,p.pts.length);g(70,(p.closed||p.k==='box')?1:0);
        p.pts.forEach(function(v,vi){g(10,n(v.x));g(20,n(v.y));if(p.b&&Math.abs(p.b[vi]||0)>1e-12)g(42,n(p.b[vi]));});break;
      case 'point': ent('POINT',owner,lay,'AcDbPoint',sty);g(10,n(p.x));g(20,n(p.y));g(30,'0.0');break;
      case 'text': ent('TEXT',owner,lay,'AcDbText',sty);g(10,n(p.x));g(20,n(p.y));g(30,'0.0');g(40,n(p.h));g(1,dxfStrCP(p.txt));
        if(p.rot)g(50,n(p.rot*180/Math.PI));g(7,dxfStrCP(fontStyleName(p.font))); // v8.10: estilo com a fonte do texto
        if(p.align==='center'||p.align==='right'){g(72,p.align==='center'?1:2);g(11,n(p.x));g(21,n(p.y));g(31,'0.0');}
        g(100,'AcDbText');break;
      // 'fillbox' (fundo do texto) não tem equivalente simples em DXF 2000: omitido
    }
  }
  function dimPrimStyle(p,st){
    var c=p.role==='ext'?st.extCol:p.role==='text'?st.txtCol:st.col;
    return {col:c,lw:p.role==='ext'?st.extLw:st.lw,lt:'Continuous'};
  }

  // v7.6: escrita do espaço do papel (viewports + objetos), usada em BLOCKS e ENTITIES
  function writeVp(v,own,id){
    var lay=v.main?'0':(lmap[v.ly]!==undefined?lmap[v.ly]:'0'),clipH=null;
    if(v.clip&&v.clip.length>=3){ clipH=hnd.toString(16).toUpperCase(); primToDxf({k:'poly',closed:true,pts:v.clip},own,lay,{}); }
    ent('VIEWPORT',own,lay,'AcDbViewport',{});
    g(10,n(v.x+v.w/2));g(20,n(v.y+v.h/2));g(30,'0.0');g(40,n(v.w));g(41,n(v.h));g(68,id===1?1:2);g(69,id);
    g(12,n(v.cx));g(22,n(v.cy));g(13,'0.0');g(23,'0.0');g(14,'10.0');g(24,'10.0');g(15,'10.0');g(25,'10.0');
    g(16,'0.0');g(26,'0.0');g(36,'1.0');g(17,'0.0');g(27,'0.0');g(37,'0.0');g(42,'50.0');g(43,'0.0');g(44,'0.0');
    g(45,n(v.h/v.k));g(50,'0.0');g(51,'0.0');g(72,100);
    (v.frz||[]).forEach(function(fid){ if(LYH[fid]) g(331,LYH[fid]); });
    g(90,(v.lock?16384:0)|(clipH?65536:0));
    if(clipH) g(340,clipH);
    g(1,'');g(281,0);g(71,1);g(74,0);g(110,'0.0');g(120,'0.0');g(130,'0.0');g(111,'1.0');g(121,'0.0');g(131,'0.0');g(112,'0.0');g(122,'1.0');g(132,'0.0');g(79,0);g(146,'0.0');g(170,0);
  }
  function writePaper(L){
    writeVp({main:true,x:0,y:0,w:L.paper.w,h:L.paper.h,cx:L.paper.w/2,cy:L.paper.h/2,k:1},L.rec,1);
    L.vps.forEach(function(v,j){ writeVp(v,L.rec,j+2); });
    L.ents.forEach(function(e){ writeEnt(e,L.rec,true); });
  }
  // ── BLOCKS
  g(0,'SECTION');g(2,'BLOCKS');
  function blockBegin(h,rec,name,anon){g(0,'BLOCK');g(5,h);g(330,rec);g(100,'AcDbEntity');g(8,'0');g(100,'AcDbBlockBegin');g(2,name);g(70,anon?1:0);g(10,'0.0');g(20,'0.0');g(30,'0.0');g(3,name);g(1,'');}
  function blockEnd(h,rec){g(0,'ENDBLK');g(5,h);g(330,rec);g(100,'AcDbEntity');g(8,'0');g(100,'AcDbBlockEnd');}
  blockBegin(hB.msBlk,hB.msRec,'*Model_Space');blockEnd(hB.msEnd,hB.msRec);
  blockBegin(hB.psBlk,hB.psRec,'*Paper_Space');blockEnd(hB.psEnd,hB.psRec);
  PL.slice(1).forEach(function(L){ blockBegin(L.blk,L.rec,L.bname); PAPER67=true; writePaper(L); PAPER67=false; blockEnd(L.end,L.rec); });
  userBlk.forEach(function(d){ var B=S.blocks[d.key]; blockBegin(d.blk,d.rec,d.name,false);
    (B.ents||[]).forEach(function(c){ if(isDim(c)){ var s2=dimStyleOf(c); dimPrims(c,s2).forEach(function(p){ primToDxf(p,d.rec,lmap[c.ly]!==undefined?lmap[c.ly]:'0',dimPrimStyle(p,s2)); }); } else writeEnt(c,d.rec,false); });
    blockEnd(d.end,d.rec); });
  dimBlk.forEach(function(d){
    var st=dimStyleOf(d.e);
    blockBegin(d.blk,d.rec,d.name,true);
    dimPrims(d.e,st).forEach(function(p){ if(p.k==='text'&&!p.font) p.font=st.font; primToDxf(p,d.rec,'0',dimPrimStyle(p,st));});
    blockEnd(d.end,d.rec);
  });
  g(0,'ENDSEC');

  // ── ENTITIES
  g(0,'SECTION');g(2,'ENTITIES');
  var dimIdx=0;
  function writeEnt(e,OW,paper){
    var ly=getLy(e.ly),lay=lmap[e.ly]!==undefined?lmap[e.ly]:'0';
    var sty={col:isByLayer(e.col)?undefined:e.col,lw:isByLayer(e.lw)?undefined:e.lw,lt:isByLayer(e.ld)?undefined:ltName(e.ld)}; // ByLayer = grupos omitidos
    switch(e.tp){
      case 'insert':{
        var ub=UBK[e.name];
        if(!ub){ insertExpand(e,0).forEach(function(c){ writeEnt(c,OW,paper); }); break; }
        var s=e.s||1; ent('INSERT',OW,lay,'AcDbBlockReference',sty); g(2,ub.name);
        g(10,n(e.x));g(20,n(e.y));g(30,'0.0');g(41,n(s));g(42,n(e.m?-s:s));g(43,n(s));g(50,n((e.rot||0)*180/Math.PI));
      } break;
      case 'line': case 'circ': case 'arc': case 'point':
        entPrims(e).forEach(function(p){primToDxf(p,OW,lay,sty);}); break;
      case 'rect': case 'pl':
        entPrims(e).forEach(function(p){primToDxf(p,OW,lay,sty);}); break;
      case 'ell':{
        var rx=e.rx,ry=e.ry,rot=e.rot||0;
        if(ry>rx){var t=rx;rx=ry;ry=t;rot+=Math.PI/2;}
        ent('ELLIPSE',OW,lay,'AcDbEllipse',sty);
        g(10,n(e.cx));g(20,n(e.cy));g(30,'0.0');g(11,n(rx*Math.cos(rot)));g(21,n(rx*Math.sin(rot)));g(31,'0.0');
        g(40,n(rx>0?ry/rx:1));g(41,'0.0');g(42,n(Math.PI*2));
      } break;
      case 'spline':{
        // Catmull-Rom (como desenhado no EduCAD) convertida exatamente em B-spline cúbica
        var P=e.pts; if(!P||P.length<2) break;
        var cp=[{x:P[0].x,y:P[0].y}],kn=[0,0,0,0];
        for(var i=0;i<P.length-1;i++){
          var p0=P[i>0?i-1:0],p1=P[i],p2=P[i+1],p3=P[i+2<P.length?i+2:i+1];
          cp.push({x:p1.x+(p2.x-p0.x)/6,y:p1.y+(p2.y-p0.y)/6},{x:p2.x-(p3.x-p1.x)/6,y:p2.y-(p3.y-p1.y)/6},{x:p2.x,y:p2.y});
          if(i<P.length-2) kn.push(i+1,i+1,i+1);
        }
        kn.push(P.length-1,P.length-1,P.length-1,P.length-1);
        ent('SPLINE',OW,lay,'AcDbSpline',sty);
        g(210,'0.0');g(220,'0.0');g(230,'1.0');g(70,8);g(71,3);g(72,kn.length);g(73,cp.length);g(74,0);
        g(42,'0.0000001');g(43,'0.0000001');
        kn.forEach(function(k){g(40,n(k));});
        cp.forEach(function(q){g(10,n(q.x));g(20,n(q.y));g(30,'0.0');});
      } break;
      case 'txt':
        entPrims(e).forEach(function(p){primToDxf(p,OW,lay,sty);}); break;
      case 'hatch':{
        var ht=e.htype||'lines',spc=e.sp||5,ang=e.ang!==undefined?e.ang:45;
        var hs={col:sty.col,lw:0.18,lt:'Continuous'};
        // contorno (linha) como no EduCAD
        if(!e.loops) primToDxf({k:'poly',closed:true,pts:[{x:e.x,y:e.y},{x:e.x+e.w,y:e.y},{x:e.x+e.w,y:e.y+e.h},{x:e.x,y:e.y+e.h}]},OW,lay,{col:sty.col,lw:sty.lw,lt:'Continuous'});
        // v8.2: padrões do catálogo e importados → HATCH nativo com as linhas do padrão
        if(ht==='pat'&&e.loops&&typeof HPAT_BY!=='undefined'&&(HPAT_BY[e.pname]||e.pdef)&&(hatchNative||e.pname==='SOLID')){
          var PP=HPAT_BY[e.pname],isSol=e.pname==='SOLID'&&!e.pdef,FAM=isSol?[]:hpFamilies(e,1);
          ent('HATCH',OW,lay,'AcDbHatch',hs);
          g(10,'0.0');g(20,'0.0');g(30,'0.0');g(210,'0.0');g(220,'0.0');g(230,'1.0');
          g(2,isSol?'SOLID':(PP&&PP.acad?PP.acad:String(e.pname||'EDU').toUpperCase().replace(/[^A-Z0-9_\-]/g,'_')));g(70,isSol?1:0);g(71,0);
          g(91,e.loops.length);
          e.loops.forEach(function(Lp,li){ g(92,li===0?3:2);g(72,0);g(73,1);g(93,Lp.length); Lp.forEach(function(v){g(10,n(v.x));g(20,n(v.y));}); g(97,0); });
          g(75,1);g(76,isSol||(PP&&PP.acad)?1:2);
          if(!isSol){
            g(52,n((((e.ang||0)%360)+360)%360));g(41,n(PP&&!e.pdef?(e.sp||PP.size)/PP.u/25.4:(e.sp||1)));g(77,0);g(78,FAM.length);
            FAM.forEach(function(F){ var cA=Math.cos(F.a),sA=Math.sin(F.a);
              g(53,n(((F.a*180/Math.PI)%360+360)%360));g(43,n(F.ox));g(44,n(F.oy));g(45,n(F.dx*cA-F.dy*sA));g(46,n(F.dx*sA+F.dy*cA));
              g(79,F.d.length);F.d.forEach(function(d){g(49,n(d));}); });
          }
          g(98,0);
          break;
        }
        if(!hatchNative||ht==='zigzag'){ (e.loops?entPrims(e):entPrims(e).slice(1)).forEach(function(p){primToDxf(p,OW,lay,hs);}); break; }
        // Padrões predefinidos do AutoCAD/ZWCAD (acadiso.pat), escalados para o espaçamento do EduCAD.
        // As linhas do padrão também são gravadas, como exige o formato.
        var pat,rot=0,kS,lines;
        if(ht==='cross'||ht==='grid'){pat='NET';kS=spc/3.175;lines=[[0,[]],[90,[]]];}
        else if(ht==='dots'){pat='DOTS';kS=spc/0.79375;lines=[[0,[0,-spc]]];}
        else if(ht==='dotted'){pat='DOTS';kS=spc/0.79375;rot=ang;lines=[[ang,[0,-spc]]];}
        else if(ht==='dashed'){pat='DASH';kS=spc/3.175;rot=ang;lines=[[ang,[spc,-spc]]];}
        else {pat='ANSI31';kS=spc/3.175;rot=ang-45;lines=[[ang,[]]];}
        ent('HATCH',OW,lay,'AcDbHatch',hs);
        g(10,'0.0');g(20,'0.0');g(30,'0.0');g(210,'0.0');g(220,'0.0');g(230,'1.0');
        g(2,pat);g(70,0);g(71,0);
        var LPS=e.loops||[[{x:e.x,y:e.y},{x:e.x+e.w,y:e.y},{x:e.x+e.w,y:e.y+e.h},{x:e.x,y:e.y+e.h}]];
        g(91,LPS.length);
        LPS.forEach(function(Lp,li){ g(92,li===0?3:2);g(72,0);g(73,1);g(93,Lp.length); Lp.forEach(function(v){g(10,n(v.x));g(20,n(v.y));}); g(97,0); });g(75,1);g(76,1);g(52,n(((rot%360)+360)%360));g(41,n(kS));g(77,0);
        g(78,lines.length);
        lines.forEach(function(L){
          var a=L[0]*Math.PI/180,bx=0,by=0;
          if(ht==='dots'){bx=spc/2;by=spc/2;}
          g(53,n(L[0]));g(43,n(bx));g(44,n(by));g(45,n(-Math.sin(a)*spc));g(46,n(Math.cos(a)*spc));
          g(79,L[1].length);L[1].forEach(function(d){g(49,n(d));});
        });
        g(98,0);
      } break;
      case 'mtext':{ ent('MTEXT',OW,lay,'AcDbMText',sty); g(10,n(e.x));g(20,n(e.y));g(30,'0.0');g(40,n(e.h));g(41,n(e.w||0));g(71,e.att||1);g(72,1);
        var mtx=dxfStrCP(String(e.txt||'').replace(/\n/g,'\\P')); while(mtx.length>250){ g(3,mtx.slice(0,250)); mtx=mtx.slice(250); } g(1,mtx); g(7,dxfStrCP(fontStyleName(e.font))); if(e.rot) g(50,n(e.rot)); } break;
      case 'leader':{ var lst=dimStyleOf(e); leaderPrims(e,lst).forEach(function(p){ primToDxf(p,OW,lay,dimPrimStyle(p,lst)); }); } break;
      case 'dim':case 'dimr':case 'dimd':case 'dima':{
        var st=dimStyleOf(e);
        if(!dimsNative||paper){ dimPrims(e,st).forEach(function(p){primToDxf(p,OW,lay,dimPrimStyle(p,st));}); break; }
        var D=dimBlk[dimIdx++],pr=dimPrims(e,st),tx=null;
        for(var j=0;j<pr.length;j++) if(pr[j].k==='text'){tx=pr[j];break;}
        var tm=tx?{x:tx.x-Math.sin(tx.rot||0)*tx.h/2,y:tx.y+Math.cos(tx.rot||0)*tx.h/2}:{x:0,y:0};
        var type,defp,sub=[],kind;
        if(e.tp==='dim'){
          var gl=dimLinePoints(e)||{d2x:e.x2,d2y:e.y2};
          defp={x:gl.d2x,y:gl.d2y};
          if(e.subtp==='aligned'){type=1;kind='aligned';}
          else {type=0;kind='rotated';}
        } else if(e.tp==='dimr'||e.tp==='dimd'){
          var dx=e.ex-e.cx,dy=e.ey-e.cy,dl=Math.hypot(dx,dy)||1,val=Math.abs(parseFloat(e.val))||(e.tp==='dimd'?2*dl:dl),rr=e.tp==='dimd'?val/2:val; // v8.6: sem valor gravado, o raio vem da geometria (antes saía 0)
          var Pp={x:e.cx+dx/dl*rr,y:e.cy+dy/dl*rr};
          if(e.tp==='dimr'){type=4;defp={x:e.cx,y:e.cy};kind='radial';D.p15=Pp;D.lead=Math.max(0,dl-rr);}
          else {type=3;defp={x:2*e.cx-Pp.x,y:2*e.cy-Pp.y};kind='diam';D.p15=Pp;D.lead=Math.max(0,dl-rr);}
        } else {
          var G=dimAngGeom(e);
          type=5;kind='ang3';
          defp={x:e.vx+G.R*Math.cos(G.sa+G.sweep/2),y:e.vy+G.R*Math.sin(G.sa+G.sweep/2)};
        }
        ent('DIMENSION',OW,lay,'AcDbDimension',{col:st.col});
        g(2,D.name);g(3,DSN[DSH[e.dimStyle]?e.dimStyle:S.dimCurrent]||'Standard');
        g(10,n(defp.x));g(20,n(defp.y));g(30,'0.0');g(11,n(tm.x));g(21,n(tm.y));g(31,'0.0');
        g(70,type+32+128);g(71,5);g(1,'<>');
        if(kind==='rotated'||kind==='aligned'){
          g(100,'AcDbAlignedDimension');g(13,n(e.x1));g(23,n(e.y1));g(33,'0.0');g(14,n(e.x2));g(24,n(e.y2));g(34,'0.0');
          if(kind==='rotated'){g(50,e.dimDir==='v'?'90.0':'0.0');g(100,'AcDbRotatedDimension');}
          else g(50,n(Math.atan2(e.y2-e.y1,e.x2-e.x1)*180/Math.PI)); // ângulo também na cota alinhada (leitores que medem pelo ângulo)
        } else if(kind==='radial'){g(100,'AcDbRadialDimension');g(15,n(D.p15.x));g(25,n(D.p15.y));g(35,'0.0');g(40,n(D.lead));}
        else if(kind==='diam'){g(100,'AcDbDiametricDimension');g(15,n(D.p15.x));g(25,n(D.p15.y));g(35,'0.0');g(40,n(D.lead));}
        else {
          var G2=dimAngGeom(e),p1=(Math.abs(G2.sa-Math.atan2(e.y1-e.vy,e.x1-e.vx))<1e-9)?[e.x1,e.y1,e.x2,e.y2]:[e.x2,e.y2,e.x1,e.y1];
          g(100,'AcDb3PointAngularDimension');g(13,n(p1[0]));g(23,n(p1[1]));g(33,'0.0');g(14,n(p1[2]));g(24,n(p1[3]));g(34,'0.0');
          g(15,n(e.vx));g(25,n(e.vy));g(35,'0.0');g(16,'0.0');g(26,'0.0');g(36,'0.0');
        }
      } break;
    }
  }
  S.ents.forEach(function(e){ writeEnt(e,hB.msRec,false); });
  if(PL.length){ PAPER67=true; writePaper(PL[0]); PAPER67=false; }
  g(0,'ENDSEC');

  // ── OBJECTS (dicionários mínimos exigidos pelo AutoCAD 2000+)
  g(0,'SECTION');g(2,'OBJECTS');
  g(0,'DICTIONARY');g(5,hO.root);g(330,0);g(100,'AcDbDictionary');g(281,1);
  g(3,'ACAD_GROUP');g(350,hO.group);g(3,'ACAD_LAYOUT');g(350,hO.layout);g(3,'ACAD_MLINESTYLE');g(350,hO.mlstyle);
  g(3,'ACAD_PLOTSETTINGS');g(350,hO.plotset);g(3,'ACAD_PLOTSTYLENAME');g(350,hO.pstyle);
  g(0,'DICTIONARY');g(5,hO.group);g(330,hO.root);g(100,'AcDbDictionary');g(281,1);
  g(0,'DICTIONARY');g(5,hO.layout);g(330,hO.root);g(100,'AcDbDictionary');g(281,1);g(3,'Model');g(350,hO.layModel);(PL.length?PL:[{name:'Layout1',lay:hO.layPaper}]).forEach(function(L){g(3,L.name);g(350,L.lay);});
  g(0,'DICTIONARY');g(5,hO.mlstyle);g(330,hO.root);g(100,'AcDbDictionary');g(281,1);g(3,'Standard');g(350,hO.mlStd);
  g(0,'DICTIONARY');g(5,hO.plotset);g(330,hO.root);g(100,'AcDbDictionary');g(281,1);
  g(0,'ACDBDICTIONARYWDFLT');g(5,hO.pstyle);g(330,hO.root);g(100,'AcDbDictionary');g(281,1);g(3,'Normal');g(350,hO.pnormal);g(100,'AcDbDictionaryWithDefault');g(340,hO.pnormal);
  g(0,'ACDBPLACEHOLDER');g(5,hO.pnormal);g(330,hO.pstyle);
  g(0,'MLINESTYLE');g(5,hO.mlStd);g(102,'{ACAD_REACTORS');g(330,hO.mlstyle);g(102,'}');g(330,hO.mlstyle);g(100,'AcDbMlineStyle');
  g(2,'Standard');g(70,0);g(3,'');g(62,256);g(51,'90.0');g(52,'90.0');g(71,2);g(49,'0.5');g(62,256);g(6,'BYLAYER');g(49,'-0.5');g(62,256);g(6,'BYLAYER');
  function layout(h,name,tab,brec,isModel,pw,ph,fmt){
    g(0,'LAYOUT');g(5,h);g(330,hO.layout);g(100,'AcDbPlotSettings');g(1,'');g(4,fmt||'A4');g(6,'');
    g(40,'7.5');g(41,'20.0');g(42,'7.5');g(43,'20.0');g(44,n(pw||297));g(45,n(ph||210));g(46,'0.0');g(47,'0.0');g(48,'0.0');g(49,'0.0');
    g(140,'0.0');g(141,'0.0');g(142,'1.0');g(143,'1.0');g(70,isModel?1024:0);g(72,1);g(73,0);g(74,5);g(7,'');g(75,16);g(76,0);g(77,2);g(78,300);
    g(147,'1.0');g(148,'0.0');g(149,'0.0');
    g(100,'AcDbLayout');g(1,name);g(70,1);g(71,tab);g(10,'0.0');g(20,'0.0');g(11,n(pw||420));g(21,n(ph||297));g(12,'0.0');g(22,'0.0');g(32,'0.0');
    g(14,n(bb.x));g(24,n(bb.y));g(34,'0.0');g(15,n(bb.x+bb.w));g(25,n(bb.y+bb.h));g(35,'0.0');g(146,'0.0');
    g(13,'0.0');g(23,'0.0');g(33,'0.0');g(16,'1.0');g(26,'0.0');g(36,'0.0');g(17,'0.0');g(27,'1.0');g(37,'0.0');g(76,1);g(330,brec);
  }
  layout(hO.layModel,'Model',0,hB.msRec,true);
  if(PL.length) PL.forEach(function(L,i){ layout(L.lay,L.name,i+1,L.rec,false,L.paper.w,L.paper.h,L.fmt); }); else layout(hO.layPaper,'Layout1',1,hB.psRec,false);
  g(0,'ENDSEC');
  g(0,'EOF');
  out[seedIdx+1]=(hnd).toString(16).toUpperCase();
  return out.join(NL)+NL;
}


// ── SVG: unidades em mm (abre em escala 1:1 no Inkscape/Illustrator)
function buildSVG(){
  var items=collectExport(true),bb=primsBox(items.map(function(it){return it.p;}))||{x:-50,y:-50,w:100,h:100};
  var m=Math.max(bb.w,bb.h)*0.03+1,X=bb.x-m,Y=-(bb.y+bb.h)-m,W=bb.w+2*m,H=bb.h+2*m;
  function f(v){return (Math.round(v*1000)/1000).toString();}
  var DASH={dashed:'12.7,6.35',hidden:'6.35,3.175',center:'31.75,6.35,6.35,6.35',phantom:'31.75,6.35,6.35,6.35,6.35,6.35',dotted:'0.5,6.35',dashdot:'12.7,6.35,0.5,6.35',divide:'12.7,6.35,0.5,6.35,0.5,6.35'};
  var b=[];
  items.forEach(function(it){
    var p=it.p,st='stroke="'+escHTML(safeCol(it.col))+'" stroke-width="'+f(it.lw)+'" fill="none"'+(DASH[it.ld]?' stroke-dasharray="'+DASH[it.ld]+'"':'');
    switch(p.k){
      case 'line': b.push('<line x1="'+f(p.x1)+'" y1="'+f(-p.y1)+'" x2="'+f(p.x2)+'" y2="'+f(-p.y2)+'" '+st+'/>');break;
      case 'circle': b.push('<circle cx="'+f(p.cx)+'" cy="'+f(-p.cy)+'" r="'+f(p.r)+'" '+(p.fill?'fill="'+escHTML(safeCol(it.col))+'" stroke="none"':st)+'/>');break;
      case 'arc':{var d=((p.ea-p.sa)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);if(d<1e-9)d=2*Math.PI;
        var x1=p.cx+p.r*Math.cos(p.sa),y1=p.cy+p.r*Math.sin(p.sa),x2=p.cx+p.r*Math.cos(p.sa+d),y2=p.cy+p.r*Math.sin(p.sa+d);
        b.push('<path d="M'+f(x1)+' '+f(-y1)+' A'+f(p.r)+' '+f(p.r)+' 0 '+(d>Math.PI?1:0)+' 0 '+f(x2)+' '+f(-y2)+'" '+st+'/>');}break;
      case 'poly': if(p.b&&p.b.some(function(x){return Math.abs(x||0)>1e-12;})){ b.push('<path d="'+plSvgPath(p,f)+'" '+st+'/>'); break; }
        b.push('<'+(p.closed?'polygon':'polyline')+' points="'+p.pts.map(function(v){return f(v.x)+','+f(-v.y);}).join(' ')+'" '+st+'/>');break;
      case 'fillpath': b.push('<path d="'+p.loops.map(function(L){return 'M'+L.map(function(v){return f(v.x)+' '+f(-v.y);}).join(' L')+' Z';}).join(' ')+'" fill="'+escHTML(safeCol(it.col))+'" fill-rule="evenodd" stroke="none"/>');break;
      case 'solid': b.push('<polygon points="'+p.pts.map(function(v){return f(v.x)+','+f(-v.y);}).join(' ')+'" fill="'+escHTML(safeCol(it.col))+'" stroke="none"/>');break;
      case 'fillbox': b.push('<polygon points="'+p.pts.map(function(v){return f(v.x)+','+f(-v.y);}).join(' ')+'" fill="#0a0a1a" stroke="none"/>');break;
      case 'point': b.push('<circle cx="'+f(p.x)+'" cy="'+f(-p.y)+'" r="0.3" fill="'+escHTML(safeCol(it.col))+'"/>');break;
      case 'text': b.push('<text x="0" y="0" transform="translate('+f(p.x)+' '+f(-p.y)+') rotate('+f(-(p.rot||0)*180/Math.PI)+')" fill="'+escHTML(safeCol(it.txtCol))+'" font-size="'+f(p.h)+'" font-family="'+escHTML(fontCss(p.font||it.font))+'"'+(p.align==='center'?' text-anchor="middle"':'')+'>'+escHTML(p.txt)+'</text>');break;
    }
  });
  return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="'+f(W)+'mm" height="'+f(H)+'mm" viewBox="'+f(X)+' '+f(Y)+' '+f(W)+' '+f(H)+'">\n'+
    '<rect x="'+f(X)+'" y="'+f(Y)+'" width="'+f(W)+'" height="'+f(H)+'" fill="#0a0a1a"/>\n'+b.join('\n')+'\n</svg>\n';
}
function expSVG(){ downloadBlob(buildSVG(),'image/svg+xml','educad.svg'); log('SVG exportado (unidades em mm).','ok'); }

// ── PNG: fundo preservado, sem pré-visualização nem anotações didáticas
function expPNG(){
  var W=cvW(),H=cvH(),cv=document.createElement('canvas');cv.width=W*2;cv.height=H*2;
  var ctx=cv.getContext('2d');ctx.scale(2,2);
  var saved={gD:S.gD,ds:S.ds,sel:S.sel,hov:S.hoverId,win:S.isWin,did:S.modes.didactic,sc:S.modes.showcoords};
  S.gD=ctx;S.ds=null;S.sel=[];S.hoverId=null;S.isWin=false;S.modes.didactic=false;S.modes.showcoords=false;
  try{ drawScene(); } finally {
    S.gD=saved.gD;S.ds=saved.ds;S.sel=saved.sel;S.hoverId=saved.hov;S.isWin=saved.win;S.modes.didactic=saved.did;S.modes.showcoords=saved.sc;
  }
  ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#0a0a1a';ctx.fillRect(0,0,W,H);
  var du=cv.toDataURL('image/png'),bin=atob(du.split(',')[1]),u8=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);downloadBlob(u8,'image/png','educad.png');log('PNG exportado.','ok');
}

