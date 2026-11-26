/* ═══════════════════════════════════════════════════════════════════
   v8.15 — MAPA BASE E GEORREFERENCIAMENTO (como o GEOMAP do AutoCAD / QGIS)
   Arquitetura: não é um ambiente à parte. O desenho ganha um sistema de
   referência (SIRGAS 2000 / UTM, ou WGS 84 / UTM) e as coordenadas do Model
   passam a ser E/N reais (em metros, ou mm/cm com conversão automática).
   O mapa base é pintado no fundo do Model (camada de tela da grade), por
   baixo dos objetos: todas as ferramentas do EduCAD desenham sobre ele e o
   que se desenha já é CAD editável, em UTM. Desligado, não custa nada.
   • Ladrilhos XYZ (Web Mercator) reprojetados para UTM na hora, por quadros
     afins (sub-divididos em zoom baixo); cache em memória, sem download em lote.
   • Fontes: Esri World Imagery (permite traçar feições, uso não comercial),
     Sentinel-2 sem nuvens (EOX), OpenStreetMap, OpenTopoMap, Esri Topo,
     camada de vias/rótulos, e fontes do usuário (XYZ ou WMS: INDE, IBGE,
     ortomosaico de drone…). Google Maps/Earth: os termos do Google não
     permitem usar o conteúdo para criar dados de mapeamento — use a
     exportação KML para ver o desenho no Google Earth.
   • Ir para (lat/lon, GMS ou UTM) e "Minha localização"; coordenadas
     geográficas e UTM do cursor; GeoJSON e KML (exportar e importar);
     PNG georreferenciado com world file (.pgw) para o QGIS.
   ═══════════════════════════════════════════════════════════════════ */
// ── elipsoides e Transversa de Mercator (série de Krüger, ordem n⁴: < 1 mm na zona) ──
var GEO_ELL={GRS80:{a:6378137,f:1/298.257222101},WGS84:{a:6378137,f:1/298.257223563}};
function tmConst(ell){ var E=GEO_ELL[ell]||GEO_ELL.GRS80; if(E._c) return E._c; var n=E.f/(2-E.f),n2=n*n,n3=n2*n,n4=n3*n;
  E._c={n:n,A:E.a/(1+n)*(1+n2/4+n4/64),
   al:[0,n/2-2/3*n2+5/16*n3+41/180*n4,13/48*n2-3/5*n3+557/1440*n4,61/240*n3-103/140*n4,49561/161280*n4],
   be:[0,n/2-2/3*n2+37/96*n3-1/360*n4,1/48*n2+1/15*n3-437/1440*n4,17/480*n3-37/840*n4,4397/161280*n4],
   de:[0,2*n-2/3*n2-2*n3+116/45*n4,7/3*n2-8/5*n3-227/45*n4,56/15*n3-136/35*n4,4279/630*n4]}; return E._c; }
function utmFwd(lat,lon,zone,south,ell){
  var C=tmConst(ell),k0=0.9996,D=Math.PI/180,ph=lat*D,lam=(lon-(zone*6-183))*D,n=C.n,s=Math.sin(ph),r=2*Math.sqrt(n)/(1+n);
  var t=Math.sinh(Math.atanh(s)-r*Math.atanh(r*s)),xi=Math.atan2(t,Math.cos(lam)),eta=Math.atanh(Math.sin(lam)/Math.sqrt(1+t*t)),X=xi,Y=eta;
  for(var j=1;j<=4;j++){ X+=C.al[j]*Math.sin(2*j*xi)*Math.cosh(2*j*eta); Y+=C.al[j]*Math.cos(2*j*xi)*Math.sinh(2*j*eta); }
  return {E:500000+k0*C.A*Y,N:(south?10000000:0)+k0*C.A*X}; }
function utmInv(E,N,zone,south,ell){
  var C=tmConst(ell),k0=0.9996,xi=(N-(south?10000000:0))/(k0*C.A),eta=(E-500000)/(k0*C.A),x=xi,y=eta;
  for(var j=1;j<=4;j++){ x-=C.be[j]*Math.sin(2*j*xi)*Math.cosh(2*j*eta); y-=C.be[j]*Math.cos(2*j*xi)*Math.sinh(2*j*eta); }
  var chi=Math.asin(Math.sin(x)/Math.cosh(y)),ph=chi; for(var k=1;k<=4;k++) ph+=C.de[k]*Math.sin(2*k*chi);
  return {lat:ph*180/Math.PI,lon:(zone*6-183)+Math.atan2(Math.sinh(y),Math.cos(x))*180/Math.PI}; }
function utmZoneOf(lon){ return Math.max(1,Math.min(60,Math.floor((lon+180)/6)+1)); }
// ── sistemas de referência ─────────────────────────────────────────────────
function geoEpsg(datum,zone,south){ if(datum==='SIRGAS 2000'){ if(south&&zone>=17&&zone<=25) return 31960+zone; if(!south&&zone>=11&&zone<=22) return 31954+zone; return null; } return (south?32700:32600)+zone; }
function geoCrsName(G){ G=G||S.geo; if(!G) return 'sem sistema de referência'; return G.datum+' / UTM zona '+G.zone+(G.south?'S':'N')+(G.epsg?' (EPSG:'+G.epsg+')':''); }
function geoMake(datum,zone,south,E0,N0){ var d=datum==='WGS 84'?'WGS 84':'SIRGAS 2000',ep=geoEpsg(d,zone,south); if(d==='SIRGAS 2000'&&!ep) d='WGS 84',ep=geoEpsg(d,zone,south);
  return {datum:d,ell:d==='WGS 84'?'WGS84':'GRS80',zone:zone,south:!!south,epsg:ep,E0:+E0||0,N0:+N0||0}; }
function geoInBrazil(lat,lon){ return lat>-35&&lat<7&&lon>-75&&lon<-28; }
// drawing ↔ UTM ↔ geográficas
function geoF(){ return unitMm()/1000; } // metros por unidade do desenho
function d2utm(x,y){ var G=S.geo,f=geoF(); return {E:G.E0+x*f,N:G.N0+y*f}; }
function utm2d(E,N){ var G=S.geo,f=geoF(); return {x:(E-G.E0)/f,y:(N-G.N0)/f}; }
function d2ll(x,y){ var G=S.geo,u=d2utm(x,y); return utmInv(u.E,u.N,G.zone,G.south,G.ell); }
function ll2d(lat,lon){ var G=S.geo,u=utmFwd(lat,lon,G.zone,G.south,G.ell); return utm2d(u.E,u.N); }
// ── Web Mercator (ladrilhos) ───────────────────────────────────────────────
function lon2tx(lon,z){ return (lon+180)/360*Math.pow(2,z); }
function lat2ty(lat,z){ var r=Math.max(-85.0511,Math.min(85.0511,lat))*Math.PI/180; return (1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*Math.pow(2,z); }
function tx2lon(x,z){ return x/Math.pow(2,z)*360-180; }
function ty2lat(y,z){ var n=Math.PI*(1-2*y/Math.pow(2,z)); return Math.atan(Math.sinh(n))*180/Math.PI; }
// ── fontes ─────────────────────────────────────────────────────────────────
var GEO_SRC={
 esri:{nome:'Satélite — Esri World Imagery',tipo:'Imagem de satélite e aérea (até ~30 cm em cidades)',url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',max:19,
   attr:'Imagens: Esri, Maxar, Earthstar Geographics e comunidade de usuários GIS',nota:'A Esri permite usar a imagem para traçar feições e criar dados vetoriais (uso não comercial, com atribuição).'},
 s2:{nome:'Satélite — Sentinel-2 sem nuvens 2024 (EOX)',tipo:'Mosaico Sentinel-2, 10 m (bom para áreas rurais grandes)',url:'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg',max:15,
   attr:'Sentinel-2 cloudless 2024 — s2maps.eu, EOX IT Services GmbH (contém dados Copernicus Sentinel modificados) · CC BY-NC-SA 4.0',nota:'Uso não comercial com atribuição.'},
 osm:{nome:'Ruas — OpenStreetMap',tipo:'Mapa de ruas colaborativo',url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',max:19,
   attr:'© colaboradores do OpenStreetMap — openstreetmap.org/copyright',nota:'Uso leve; não serve para baixar áreas inteiras.'},
 otm:{nome:'Topográfico — OpenTopoMap',tipo:'Curvas de nível (SRTM), relevo sombreado e estradas',url:'https://tile.opentopomap.org/{z}/{x}/{y}.png',max:17,
   attr:'Dados: © OpenStreetMap, SRTM · Estilo: © OpenTopoMap (CC-BY-SA)',nota:'Uso leve, com atribuição.'},
 esritopo:{nome:'Topográfico — Esri World Topo',tipo:'Base topográfica e de ruas',url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',max:19,
   attr:'Esri, HERE, Garmin, FAO, NOAA, USGS, © OpenStreetMap e comunidade de usuários GIS',nota:'Uso não comercial, com atribuição.'}
};
var GEO_OVL={url:'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',url2:'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',max:19,attr:'Vias e rótulos: Esri'};
function geoMapCfg(){ if(!S.geoMap) S.geoMap={src:'',op:1,gray:false,ovl:false,custom:'',cattr:'',wms:'',wlay:''}; return S.geoMap; }
function geoSrc(){ var M=geoMapCfg(); if(!M.src) return null;
  if(M.src==='custom'){ if(!M.custom) return null; return {nome:'Fonte do usuário (XYZ)',url:M.custom,max:22,attr:M.cattr||'Fonte definida pelo usuário'}; }
  if(M.src==='wms'){ if(!M.wms||!M.wlay) return null; return {nome:'WMS do usuário',wms:M.wms,lay:M.wlay,max:21,attr:M.cattr||'Serviço WMS definido pelo usuário'}; }
  return GEO_SRC[M.src]||null; }
function geoTileUrl(src,z,x,y){
  if(src.wms){ var n=Math.pow(2,z),R=20037508.342789244,w=2*R/n,x0=-R+x*w,y1=R-y*w,sep=src.wms.indexOf('?')>=0?'&':'?';
    return src.wms+sep+'SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=TRUE&STYLES=&SRS=EPSG:3857&WIDTH=256&HEIGHT=256&LAYERS='+encodeURIComponent(src.lay)+'&BBOX='+[x0,y1-w,x0+w,y1].map(function(v){return v.toFixed(3);}).join(','); }
  return src.url.replace('{z}',z).replace('{x}',x).replace('{y}',y).replace('{s}','abc'.charAt((x+y)%3)); }
// ── cache de ladrilhos ─────────────────────────────────────────────────────
var GEO={cache:new Map(),pend:0,MAX:500,raf:0,req:0,last:null};
function geoTile(url){
  var t=GEO.cache.get(url); if(t){ GEO.cache.delete(url); GEO.cache.set(url,t); return t; }
  if(GEO.pend>=24) return null;
  t={img:new Image(),ok:false,err:false,cors:true}; GEO.cache.set(url,t); GEO.pend++; GEO.req++;
  var img=t.img; img.crossOrigin='anonymous'; img.decoding='async';
  img.onload=function(){ t.ok=true; GEO.pend--; geoKick(); };
  img.onerror=function(){ if(t.cors){ t.cors=false; var i2=new Image(); t.img=i2; i2.onload=function(){ t.ok=true; GEO.pend--; geoKick(); }; i2.onerror=function(){ t.err=true; GEO.pend--; geoKick(); }; i2.src=url; return; } t.err=true; GEO.pend--; geoKick(); };
  img.src=url;
  if(GEO.cache.size>GEO.MAX){ var k=GEO.cache.keys().next().value; GEO.cache.delete(k); }
  return t;
}
function geoKick(){ if(GEO.raf) return; GEO.raf=requestAnimationFrame(function(){ GEO.raf=0; if(S.space==='model') drawGrid(); }); }
// ── desenho do mapa base ───────────────────────────────────────────────────
function geoActive(){ return S.space==='model'&&!!S.geo&&!!geoSrc(); }
// desenha os ladrilhos em ctx (pixels CSS; transformação w2s); devolve {z,n,clean}
function geoDrawBase(ctx,W,H,w2sf,opt){
  opt=opt||{}; var src=geoSrc(),M=geoMapCfg(); if(!S.geo||!src) return null;
  var sw=w2sf||w2s,inv=function(px,py){ return {x:(px-S.vp.x)/S.vp.sc,y:-(py-S.vp.y)/S.vp.sc}; };
  var lo=180,la=-90,hi=-180,lb=90,samp=[[0,0],[W/2,0],[W,0],[0,H/2],[W/2,H/2],[W,H/2],[0,H],[W/2,H],[W,H]];
  samp.forEach(function(p){ var d=inv(p[0],p[1]),g=d2ll(d.x,d.y); lo=Math.min(lo,g.lon); hi=Math.max(hi,g.lon); lb=Math.min(lb,g.lat); la=Math.max(la,g.lat); });
  if(!(isFinite(lo)&&isFinite(la))) return null;
  var c=inv(W/2,H/2),gc=d2ll(c.x,c.y),mpp=geoF()/S.vp.sc/(opt.dpr||window.devicePixelRatio||1);
  var z=Math.ceil(Math.log2(156543.03392*Math.cos(gc.lat*Math.PI/180)/Math.max(mpp,1e-6))); z=Math.max(1,Math.min(z,src.max));
  function range(z){ return {x0:Math.floor(lon2tx(Math.max(lo,-180),z)),x1:Math.floor(lon2tx(Math.min(hi,179.9999),z)),y0:Math.floor(lat2ty(la,z)),y1:Math.floor(lat2ty(lb,z))}; }
  var r=range(z); while(z>1&&(r.x1-r.x0+1)*(r.y1-r.y0+1)>(opt.maxTiles||160)){ z--; r=range(z); }
  var N=Math.pow(2,z),clean=true,count=0,layers=[{src:src,alpha:M.op}]; if(M.ovl&&!src.wms) layers.push({src:{url:GEO_OVL.url,max:19},alpha:1},{src:{url:GEO_OVL.url2,max:19},alpha:1});
  ctx.save(); if(M.gray) try{ ctx.filter='grayscale(1)'; }catch(e){}
  layers.forEach(function(Lr,li){ ctx.globalAlpha=Lr.alpha; if(li>0) try{ ctx.filter='none'; }catch(e){}
    for(var ty=Math.max(0,r.y0);ty<=Math.min(N-1,r.y1);ty++) for(var tx=r.x0;tx<=r.x1;tx++){
      var xx=((tx%N)+N)%N,t=opt.noFetch?GEO.cache.get(geoTileUrl(Lr.src,z,xx,ty)):geoTile(geoTileUrl(Lr.src,z,xx,ty)),img=null,sx=0,sy=0,ss=256;
      if(t&&t.ok){ img=t.img; if(!t.cors) clean=false; }
      else if(li===0){ for(var k=1;k<=6&&z-k>=0;k++){ var a=GEO.cache.get(geoTileUrl(Lr.src,z-k,xx>>k,ty>>k)); if(a&&a.ok){ img=a.img; if(!a.cors) clean=false; ss=256/Math.pow(2,k); sx=(xx-((xx>>k)<<k))*ss; sy=(ty-((ty>>k)<<k))*ss; break; } } }
      if(!img){ if(t&&!t.err) clean=clean&&!opt.needAll; continue; }
      count++; geoQuad(ctx,img,sx,sy,ss,tx,ty,z,sw);
    } });
  ctx.restore(); return {z:z,n:count,clean:clean};
}
// um ladrilho (ou parte dele) em quadros afins; subdivide em zoom baixo (curvatura da projeção)
function geoQuad(ctx,img,sx,sy,ss,tx,ty,z,sw){
  var n=z<7?8:z<11?4:z<14?2:1,P=[];
  for(var j=0;j<=n;j++){ P[j]=[]; for(var i=0;i<=n;i++){ var lat=ty2lat(ty+j/n,z),lon=tx2lon(tx+i/n,z),d=ll2d(lat,lon); P[j][i]=sw(d.x,d.y); } }
  var cs=ss/n;
  for(var j=0;j<n;j++) for(var i=0;i<n;i++){ var p0=P[j][i],p1=P[j][i+1],p2=P[j+1][i];
    ctx.save(); ctx.transform((p1.x-p0.x)/cs,(p1.y-p0.y)/cs,(p2.x-p0.x)/cs,(p2.y-p0.y)/cs,p0.x,p0.y);
    try{ ctx.drawImage(img,sx+i*cs,sy+j*cs,cs,cs,-0.02*cs,-0.02*cs,cs*1.04,cs*1.04); }catch(e){} ctx.restore(); }
}
(function(){ var dg=drawGrid; drawGrid=function(){ dg.apply(this,arguments); var on=geoActive(),A=document.getElementById('geo-attr');
  if(on){ var W=cvW(),H=cvH(),r=geoDrawBase(S.gG,W,H); GEO.last=r; }
  if(A){ var s=on?geoSrc():null; A.style.display=on?'block':'none'; if(on){ var t=s.attr+(geoMapCfg().ovl&&!s.wms?' · '+GEO_OVL.attr:''); if(A.textContent!==t) A.textContent=t; } } }; })();
// ── formatação ─────────────────────────────────────────────────────────────
function fmtDMS(v,pos,neg){ var s=v<0?neg:pos; v=Math.abs(v); var d=Math.floor(v),m=Math.floor((v-d)*60),sec=((v-d)*60-m)*60; if(sec>=59.995){ sec=0; m++; } if(m>=60){ m=0; d++; } return d+'°'+(m<10?'0':'')+m+"'"+(sec<10?'0':'')+sec.toFixed(2).replace('.',',')+'"'+s; }
function fmtMil(v,p){ var s=v.toFixed(p),i=s.split('.'),a=i[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.'); return a+(i[1]?','+i[1]:''); }
// "lat, lon" decimal · "11°43'45"S 49°04'10"W" · "E N" (UTM)
function geoParse(txt){
  var t=String(txt||'').trim(); if(!t) return null;
  var dms=t.match(/(-?\d+(?:[.,]\d+)?)\s*[°º]\s*(?:(\d+(?:[.,]\d+)?)\s*['′])?\s*(?:(\d+(?:[.,]\d+)?)\s*(?:["″]|''))?\s*([NSEWLO])?/gi);
  if(dms&&dms.length>=2&&/[°º]/.test(t)){ var v=dms.slice(0,2).map(function(s){ var m=/(-?\d+(?:[.,]\d+)?)\s*[°º]\s*(?:(\d+(?:[.,]\d+)?)\s*['′])?\s*(?:(\d+(?:[.,]\d+)?)\s*(?:["″]|''))?\s*([NSEWLO])?/i.exec(s);
      var x=Math.abs(parseFloat(m[1].replace(',','.')))+(m[2]?parseFloat(m[2].replace(',','.'))/60:0)+(m[3]?parseFloat(m[3].replace(',','.'))/3600:0),h=(m[4]||'').toUpperCase();
      if(/^-/.test(m[1])||h==='S'||h==='W'||h==='O') x=-x; return {v:x,h:h}; });
    var la=v[0],lo=v[1]; if(la.h==='E'||la.h==='W'||la.h==='L'||la.h==='O'){ var q=la; la=lo; lo=q; } return {lat:la.v,lon:lo.v}; }
  var nums=t.replace(/(\d),(\d)/g,'$1.$2').split(/[\s;,]+/).filter(Boolean).map(Number);
  if(nums.length>=2&&nums.every(isFinite)){ var a=nums[0],b=nums[1];
    if(Math.abs(a)<=90&&Math.abs(b)<=180) return {lat:a,lon:b};
    if(Math.abs(a)>1000&&Math.abs(b)>1000) return {E:a,N:b}; }
  return null;
}
// ── definir o sistema e ir para um lugar ───────────────────────────────────
function geoSet(G,quiet){ S.geo=G; S.dirty=true; geoPanelSync(); renderAll(); if(!quiet) log('Sistema de referência do desenho: '+geoCrsName(G)+'. As coordenadas do Model são E/N em '+(geoF()===1?'metros':'unidades do desenho convertidas para metros')+'.','ok'); }
function geoEnsure(lat,lon){
  if(S.geo) return false;
  var empty=!(S.space==='model'?S.ents:(S.modelEnts||[])).length;
  if(empty&&(S.units.insertScale!=='m')){ S.units.insertScale='m'; log('Unidade do desenho ajustada para metro (desenho georreferenciado em UTM).','inf'); }
  var z=utmZoneOf(lon),sth=lat<0; geoSet(geoMake(geoInBrazil(lat,lon)?'SIRGAS 2000':'WGS 84',z,sth,0,0),true);
  if(!geoMapCfg().src) geoMapCfg().src='esri'; geoPanelSync();
  log('Sistema definido automaticamente: '+geoCrsName()+'. Mapa base: satélite (pode trocar ou desligar no painel Mapa).','ok'); return true;
}
function geoGoTo(txt,width){
  var p=typeof txt==='object'?txt:geoParse(txt); if(!p){ log('Coordenada não reconhecida. Exemplos: -11.7286, -49.0681 · 11°43\'43"S 49°04\'05"W · 702345 8702111 (UTM).','er'); return false; }
  if(p.E!==undefined){ if(!S.geo){ log('Defina primeiro o sistema (zona UTM) para ir a uma coordenada E/N.','er'); return false; } var d=utm2d(p.E,p.N); geoView(d,width); return true; }
  if(!(Math.abs(p.lat)<=85&&Math.abs(p.lon)<=180)){ log('Latitude/longitude fora do intervalo.','er'); return false; }
  geoEnsure(p.lat,p.lon); var dd=ll2d(p.lat,p.lon); geoView(dd,width); if(!geoMapCfg().src){ geoMapCfg().src='esri'; geoPanelSync(); }
  if(S.space!=='model') switchSpace('model');
  log('Vista em '+fmtDMS(p.lat,'N','S')+'  '+fmtDMS(p.lon,'E','W')+'.','ok'); renderAll(); return true;
}
function geoView(d,width){ width=width||600; var f=geoF(),w=width/f; S.vp.sc=cvW()/w; S.vp.x=cvW()/2-d.x*S.vp.sc; S.vp.y=cvH()/2+d.y*S.vp.sc; renderAll(); }
function geoHere(){ if(!navigator.geolocation){ log('Este navegador não informa a localização.','er'); return; }
  log('Obtendo a sua localização (o navegador pede permissão)…','inf');
  navigator.geolocation.getCurrentPosition(function(p){ geoGoTo({lat:p.coords.latitude,lon:p.coords.longitude},Math.max(300,p.coords.accuracy*8)); log('Precisão informada pelo aparelho: ±'+Math.round(p.coords.accuracy)+' m.','inf'); },
    function(e){ log('Localização indisponível ('+e.message+').','er'); },{enableHighAccuracy:true,timeout:15000}); }
// ── GeoJSON / KML ──────────────────────────────────────────────────────────
function geoRing(pts,close){ var o=pts.map(function(p){ return [p.x,p.y]; }); if(close&&o.length&&(o[0][0]!==o[o.length-1][0]||o[0][1]!==o[o.length-1][1])) o.push(o[0].slice()); return o; }
function geoEntGeoms(e){ // → [{t:'Point'|'LineString'|'Polygon', c:[...] em desenho, p:{}}]
  var P=function(x,y){ return {x:x,y:y}; };
  switch(e.tp){
    case 'point': return [{t:'Point',c:[e.x,e.y]}];
    case 'insert': return [{t:'Point',c:[e.x,e.y],p:{bloco:e.name,rotacao:+(((e.rot||0)*180/Math.PI).toFixed(4)),escala:e.s||1}}];
    case 'txt': return [{t:'Point',c:[e.x,e.y],p:{texto:e.txt}}];
    case 'mtext': return [{t:'Point',c:[e.x,e.y],p:{texto:typeof rtPlain==='function'?rtPlain(e.txt).join('\n'):String(e.txt)}}];
    case 'line': return [{t:'LineString',c:[[e.x1,e.y1],[e.x2,e.y2]]}];
    case 'arc': return [{t:'LineString',c:geoRing(arcPts(e.cx,e.cy,e.r,e.sa,((e.ea-e.sa)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)||2*Math.PI,Math.PI/90))}];
    case 'circ': return [{t:'Polygon',c:[geoRing(arcPts(e.cx,e.cy,e.r,0,2*Math.PI,Math.PI/90),true)],p:{raio_m:+(e.r*geoF()).toFixed(3)}}];
    case 'ell': return [{t:'Polygon',c:[geoRing(ellPoints(e,120),true)]}];
    case 'spline': return [{t:'LineString',c:geoRing(splinePoints(e,16))}];
    case 'rect': return [{t:'Polygon',c:[geoRing([P(e.x,e.y),P(e.x+e.w,e.y),P(e.x+e.w,e.y+e.h),P(e.x,e.y+e.h)],true)]}];
    case 'pl': { var pts=plHasArc(e)?plSample(e,32):e.pts.slice(); if(e.closed&&plIsDup(e)&&!plHasArc(e)) pts.pop(); if(pts.length<2) return [];
      return e.closed&&pts.length>=3?[{t:'Polygon',c:[geoRing(pts,true)]}]:[{t:'LineString',c:geoRing(pts)}]; }
    case 'hatch': return e.loops?[{t:'Polygon',c:e.loops.filter(function(L){return L.length>=3;}).map(function(L){ return geoRing(L,true); }),p:{hachura:e.pname||e.htype||''}}]:[];
  }
  return null; // cotas, chamadas, viewports: não vão
}
function geoRingArea(R){ var a=0; for(var i=0;i+1<R.length;i++) a+=R[i][0]*R[i+1][1]-R[i+1][0]*R[i][1]; return a/2; }
function geoLen(L){ var s=0; for(var i=0;i+1<L.length;i++) s+=Math.hypot(L[i+1][0]-L[i][0],L[i+1][1]-L[i][1]); return s; }
function geoLL(c){ var g=d2ll(c[0],c[1]); return [+g.lon.toFixed(9),+g.lat.toFixed(9)]; }
function geoFeatures(ents){
  var f=geoF(),out=[],skip=0;
  ents.forEach(function(e){ var L=getLy(e.ly); if(L&&L.vis===false) return; var gs=geoEntGeoms(e); if(gs===null){ skip++; return; }
    gs.forEach(function(g){ var props={camada:L?L.nm:'0',cor:effCol(e),tipo:e.tp},c;
      if(g.p) Object.keys(g.p).forEach(function(k){ props[k]=g.p[k]; });
      if(g.t==='Point') c=geoLL(g.c);
      else if(g.t==='LineString'){ c=g.c.map(geoLL); props.comprimento_m=+(geoLen(g.c)*f).toFixed(3); }
      else { var rings=g.c.map(function(R,i){ var a=geoRingArea(R); if((i===0&&a<0)||(i>0&&a>0)) R=R.slice().reverse(); return R; });
        var A=Math.abs(geoRingArea(rings[0]))*f*f; for(var i=1;i<rings.length;i++) A-=Math.abs(geoRingArea(rings[i]))*f*f;
        props.area_m2=+A.toFixed(3); props.area_ha=+(A/10000).toFixed(4); props.perimetro_m=+(geoLen(rings[0])*f).toFixed(3); c=rings.map(function(R){ return R.map(geoLL); }); }
      out.push({type:'Feature',properties:props,geometry:{type:g.t,coordinates:c}}); }); });
  return {feats:out,skip:skip};
}
function geoExportEnts(){ var M=S.space==='model'?S.ents:(S.modelEnts||[]); var sel=S.space==='model'?S.sel.map(findE).filter(Boolean):[]; return sel.length?sel:M; }
function geoName(){ return (document.getElementById('ftitle').textContent||'educad').replace(/^Sem título — /,'').replace(/\.(json|dxf)$/i,'').replace(/[\\/:*?"<>|]+/g,'_').trim()||'educad'; }
function geoNeed(){ if(S.geo) return true; log('O desenho ainda não tem sistema de referência. Abra Mapa (MAPA) e defina a zona UTM ou use "Ir para".','er'); geoOpen(); return false; }
function geoBuildGeoJSON(){ var r=geoFeatures(geoExportEnts()); return {txt:JSON.stringify({type:'FeatureCollection',name:geoName(),
  crs_origem:geoCrsName()+' — coordenadas em longitude/latitude (RFC 7946; SIRGAS 2000 ≈ WGS 84)',features:r.feats},null,1),n:r.feats.length,skip:r.skip}; }
function geoExportGeoJSON(){ if(!geoNeed()) return; var r=geoBuildGeoJSON(); if(!r.n){ log('Nada para exportar (cotas e viewports não vão para o GeoJSON).','er'); return; }
  downloadBlob(r.txt,'application/geo+json',geoName()+'.geojson'); log('GeoJSON exportado: '+r.n+' feição(ões)'+(S.sel.length?' (seleção)':'')+(r.skip?'; '+r.skip+' cota(s)/chamada(s) não exportada(s)':'')+'. Abre no QGIS, no Google Earth Pro e em qualquer SIG.','ok'); }
function kmlCol(hex,a){ var m=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex||'#ffffff')||[0,'ff','ff','ff']; return (a||'ff')+m[3]+m[2]+m[1]; }
function xmlEsc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function geoBuildKML(){
  var r=geoFeatures(geoExportEnts()),sty={},pm=[];
  r.feats.forEach(function(F){ var p=F.properties,id='s'+p.cor.replace('#',''); sty[id]=p.cor;
    var crd=function(L){ return L.map(function(c){ return c[0]+','+c[1]+',0'; }).join(' '); },g=F.geometry,geo;
    if(g.type==='Point') geo='<Point><coordinates>'+g.coordinates[0]+','+g.coordinates[1]+',0</coordinates></Point>';
    else if(g.type==='LineString') geo='<LineString><tessellate>1</tessellate><coordinates>'+crd(g.coordinates)+'</coordinates></LineString>';
    else geo='<Polygon><tessellate>1</tessellate><outerBoundaryIs><LinearRing><coordinates>'+crd(g.coordinates[0])+'</coordinates></LinearRing></outerBoundaryIs>'+g.coordinates.slice(1).map(function(R){ return '<innerBoundaryIs><LinearRing><coordinates>'+crd(R)+'</coordinates></LinearRing></innerBoundaryIs>'; }).join('')+'</Polygon>';
    var nm=p.texto||p.bloco||p.camada,desc=Object.keys(p).filter(function(k){return k!=='cor';}).map(function(k){ return k+': '+p[k]; }).join('<br>');
    pm.push('<Placemark><name>'+xmlEsc(nm)+'</name><description><![CDATA['+desc+']]></description><styleUrl>#'+id+'</styleUrl>'+geo+'</Placemark>'); });
  var st=Object.keys(sty).map(function(id){ return '<Style id="'+id+'"><LineStyle><color>'+kmlCol(sty[id])+'</color><width>2</width></LineStyle><PolyStyle><color>'+kmlCol(sty[id],'40')+'</color></PolyStyle><IconStyle><color>'+kmlCol(sty[id])+'</color><scale>0.6</scale></IconStyle></Style>'; }).join('');
  return {txt:'<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>'+xmlEsc(geoName())+'</name><description>'+xmlEsc('EduCAD 2D — '+geoCrsName())+'</description>'+st+'\n'+pm.join('\n')+'\n</Document></kml>\n',n:r.feats.length};
}
function geoExportKML(){ if(!geoNeed()) return; var r=geoBuildKML(); if(!r.n){ log('Nada para exportar.','er'); return; } downloadBlob(r.txt,'application/vnd.google-earth.kml+xml',geoName()+'.kml'); log('KML exportado: '+r.n+' feição(ões). Abra no Google Earth para ver o desenho sobre as imagens do Google.','ok'); }
// importar
function geoParseKML(txt){ var doc=new DOMParser().parseFromString(txt,'application/xml'); if(doc.getElementsByTagName('parsererror').length) throw new Error('KML inválido');
  var out=[]; function crd(el){ return (el&&el.textContent||'').trim().split(/\s+/).filter(Boolean).map(function(s){ var a=s.split(','); return [+a[0],+a[1]]; }).filter(function(c){ return isFinite(c[0])&&isFinite(c[1]); }); }
  function tag(el,n){ return Array.prototype.slice.call(el.getElementsByTagName(n)); }
  tag(doc,'Placemark').forEach(function(P){ var nm=(tag(P,'name')[0]||{}).textContent||''; var fold=P.parentNode&&P.parentNode.nodeName==='Folder'?((tag(P.parentNode,'name')[0]||{}).textContent||''):'';
    tag(P,'Point').forEach(function(g){ var c=crd(tag(g,'coordinates')[0]); if(c.length) out.push({type:'Point',coordinates:c[0],name:nm,layer:fold}); });
    tag(P,'LineString').forEach(function(g){ out.push({type:'LineString',coordinates:crd(tag(g,'coordinates')[0]),name:nm,layer:fold}); });
    tag(P,'Polygon').forEach(function(g){ var rings=[]; tag(g,'outerBoundaryIs').concat(tag(g,'innerBoundaryIs')).forEach(function(b){ rings.push(crd(tag(b,'coordinates')[0])); }); out.push({type:'Polygon',coordinates:rings,name:nm,layer:fold}); }); });
  return out; }
function geoFlatGeo(obj,acc,props){ acc=acc||[]; if(!obj) return acc;
  if(obj.type==='FeatureCollection') (obj.features||[]).forEach(function(f){ geoFlatGeo(f,acc); });
  else if(obj.type==='Feature') geoFlatGeo(obj.geometry,acc,obj.properties||{});
  else if(obj.type==='GeometryCollection') (obj.geometries||[]).forEach(function(g){ geoFlatGeo(g,acc,props); });
  else if(/^Multi/.test(obj.type)) (obj.coordinates||[]).forEach(function(c){ geoFlatGeo({type:obj.type.slice(5),coordinates:c},acc,props); });
  else if(obj.type&&obj.coordinates){ var p=props||{}; acc.push({type:obj.type,coordinates:obj.coordinates,name:p.nome||p.name||p.texto||p.NOME||'',layer:p.camada||p.layer||''}); }
  return acc; }
function geoImport(text,fname){
  var geoms; try{ geoms=/^\s*</.test(text)?geoParseKML(text):geoFlatGeo(JSON.parse(text)); }catch(e){ log('Arquivo não reconhecido como GeoJSON/KML ('+e.message+').','er'); return false; }
  if(!geoms.length){ log('Nenhuma geometria encontrada no arquivo.','er'); return false; }
  var first=geoms[0].type==='Point'?geoms[0].coordinates:geoms[0].type==='LineString'?geoms[0].coordinates[0]:geoms[0].coordinates[0][0];
  if(!first||Math.abs(first[1])>90||Math.abs(first[0])>180){ log('As coordenadas do arquivo não são longitude/latitude (GeoJSON deve estar em graus, RFC 7946).','er'); return false; }
  if(S.space!=='model') switchSpace('model');
  snapshot(); geoEnsure(first[1],first[0]);
  var base=String(fname||'importado').replace(/\.(geo)?json$|\.kml$/i,'').slice(0,40)||'importado',lyCache={},pal=['#ffd000','#00e5ff','#ff5ad1','#7dff6b','#ff8a3d','#b48cff'];
  function lyFor(nm){ nm=(nm||base).trim()||base; if(lyCache[nm]!==undefined) return lyCache[nm]; var L=S.layers.filter(function(l){return l.nm===nm;})[0];
    if(!L){ L={id:nextLayerId(),nm:nm,col:pal[Object.keys(lyCache).length%pal.length],vis:true,lock:false,ld:'solid',lw:.25}; S.layers.push(L); } return (lyCache[nm]=L.id); }
  var D=function(c){ var d=ll2d(c[1],c[0]); return {x:d.x,y:d.y}; },n=0,th=2.5/annoK(),bb=null;
  function add(e){ e.id=uid(); S.ents.push(e); n++; var b=bbox(e); if(b) bb=bb?{x0:Math.min(bb.x0,b.x),y0:Math.min(bb.y0,b.y),x1:Math.max(bb.x1,b.x+b.w),y1:Math.max(bb.y1,b.y+b.h)}:{x0:b.x,y0:b.y,x1:b.x+b.w,y1:b.y+b.h}; }
  geoms.forEach(function(g){ var ly=lyFor(g.layer);
    if(g.type==='Point'){ var p=D(g.coordinates); add({tp:'point',x:p.x,y:p.y,ly:ly}); if(g.name) add({tp:'txt',x:p.x+th*0.6,y:p.y+th*0.4,h:th,txt:String(g.name).slice(0,80),rot:0,ly:ly}); }
    else if(g.type==='LineString'){ var pts=g.coordinates.map(D); if(pts.length>=2) add({tp:'pl',closed:false,pts:pts,ly:ly}); }
    else if(g.type==='Polygon'){ g.coordinates.forEach(function(R){ var pts=R.map(D); if(pts.length>1&&Math.hypot(pts[0].x-pts[pts.length-1].x,pts[0].y-pts[pts.length-1].y)<1e-9) pts.pop(); if(pts.length>=3) add({tp:'pl',closed:true,pts:pts,ly:ly}); }); } });
  syncIdCounter(); updLayerUI(); updLayerSel(); S.dirty=true;
  if(bb){ var w=Math.max(bb.x1-bb.x0,bb.y1-bb.y0)*1.3*geoF()||200; geoView({x:(bb.x0+bb.x1)/2,y:(bb.y0+bb.y1)/2},Math.max(w*cvW()/Math.max(cvH(),1)*0.8,50)); }
  log('Importado(s) '+n+' objeto(s) de '+fname+' ('+geoCrsName()+'). Pontos, linhas e polígonos viraram entidades editáveis.','ok'); renderAll(); updStatus(); return true;
}
// PNG georreferenciado + world file
function geoExportPNG(){
  if(!geoNeed()) return; var W=cvW(),H=cvH(),k=2,cv=document.createElement('canvas'); cv.width=W*k; cv.height=H*k; var ctx=cv.getContext('2d'); ctx.scale(k,k);
  ctx.fillStyle='#0a0a1a'; ctx.fillRect(0,0,W,H); var r=geoActive()?geoDrawBase(ctx,W,H,null,{noFetch:true,dpr:k}):{clean:true};
  var saved={gD:S.gD,ds:S.ds,sel:S.sel,hov:S.hoverId,did:S.modes.didactic,sc:S.modes.showcoords}; S.gD=ctx; S.ds=null; S.sel=[]; S.hoverId=null; S.modes.didactic=false; S.modes.showcoords=false;
  try{ drawScene(); } finally { S.gD=saved.gD; S.ds=saved.ds; S.sel=saved.sel; S.hoverId=saved.hov; S.modes.didactic=saved.did; S.modes.showcoords=saved.sc; }
  if(geoActive()){ var s=geoSrc(),t=s.attr; ctx.font='10px Arial'; var tw=ctx.measureText(t).width; ctx.fillStyle='rgba(255,255,255,.75)'; ctx.fillRect(W-tw-10,H-16,tw+10,16); ctx.fillStyle='#222'; ctx.fillText(t,W-tw-5,H-5); }
  var nm=geoName(),px=geoF()/S.vp.sc/k,ul=s2w(0,0),u=d2utm(ul.x,ul.y),wld=[px,0,0,-px,u.E+px/2,u.N-px/2].map(function(v){ return v.toFixed(6); }).join('\n')+'\n';
  var done=function(){ downloadBlob(wld,'text/plain',nm+'.pgw'); log('PNG georreferenciado exportado ('+nm+'.png + '+nm+'.pgw, '+geoCrsName()+', '+px.toFixed(3)+' m/pixel). No QGIS: arraste o PNG e defina o SRC EPSG:'+(S.geo.epsg||'?')+'.','ok'); };
  try{ var du=cv.toDataURL('image/png'),bin=atob(du.split(',')[1]),u8=new Uint8Array(bin.length); for(var i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i); downloadBlob(u8,'image/png',nm+'.png'); done(); }
  catch(e){ log('O servidor do mapa base não permite gravar a imagem (CORS). Exportando só o desenho, sem o fundo.','er'); var src=S.geoMap.src; S.geoMap.src=''; try{ geoExportPNG(); } finally { S.geoMap.src=src; } }
}
// ── coordenadas do cursor ──────────────────────────────────────────────────
function geoCursorText(x,y){ if(!S.geo) return ''; var u=d2utm(x,y),g=d2ll(x,y);
  return 'E '+fmtMil(u.E,2)+'  N '+fmtMil(u.N,2)+'\n'+fmtDMS(g.lat,'N','S')+'  '+fmtDMS(g.lon,'E','W'); }
// ── persistência ───────────────────────────────────────────────────────────
(function(){ var bd=buildDoc,ad=applyDoc,nd=newDoc;
  buildDoc=function(){ var d=bd.apply(this,arguments); if(S.geo) d.geo=JSON.parse(JSON.stringify(S.geo)); if(S.geoMap&&S.geoMap.src) d.geoMap=JSON.parse(JSON.stringify(S.geoMap)); return d; };
  applyDoc=function(d){ var r=ad.apply(this,arguments); if(!r){ var G=d&&d.geo; S.geo=(G&&G.zone>=1&&G.zone<=60)?geoMake(G.datum,G.zone,G.south,G.E0,G.N0):null; S.geoMap=d&&d.geoMap&&typeof d.geoMap==='object'?d.geoMap:undefined; geoPanelSync(); renderAll(); } return r; };
  newDoc=function(){ var n0=S.ents.length,r=nd.apply(this,arguments); if(!(n0&&S.ents.length)){ S.geo=null; S.geoMap=undefined; geoPanelSync(); renderAll(); } return r; };
})();
(function(){ if(typeof docRestore==='function'){ var dr=docRestore; docRestore=function(){ var r=dr.apply(this,arguments); geoPanelSync(); return r; }; } })();
// ── painel ─────────────────────────────────────────────────────────────────
function geoOpen(){ var P=document.getElementById('geo-pal'); P.classList.add('show'); geoPanelSync(); }
function geoClose(){ document.getElementById('geo-pal').classList.remove('show'); }
function geoToggle(){ var P=document.getElementById('geo-pal'); if(P.classList.contains('show')) geoClose(); else geoOpen(); }
function geoPanelSync(){
  var P=document.getElementById('geo-pal'); if(!P) return; var G=S.geo,M=geoMapCfg();
  document.getElementById('geo-crs').textContent=G?geoCrsName(G)+(G.E0||G.N0?' · origem local E0='+fmtMil(G.E0,2)+' N0='+fmtMil(G.N0,2):''):'Ainda não definido — use "Ir para" ou escolha a zona abaixo.';
  document.getElementById('geo-crs').className='geo-crs'+(G?' ok':'');
  var dz=document.getElementById('geo-datum'),zz=document.getElementById('geo-zone'),hs=document.getElementById('geo-hem');
  if(G){ dz.value=G.datum; zz.value=G.zone; hs.value=G.south?'S':'N'; document.getElementById('geo-e0').value=G.E0||0; document.getElementById('geo-n0').value=G.N0||0; }
  document.querySelectorAll('#geo-src input[name=geo-src]').forEach(function(r){ r.checked=r.value===(M.src||''); });
  document.getElementById('geo-op').value=Math.round((M.op||1)*100); document.getElementById('geo-opv').textContent=Math.round((M.op||1)*100)+'%';
  document.getElementById('geo-gray').checked=!!M.gray; document.getElementById('geo-ovl').checked=!!M.ovl;
  document.getElementById('geo-custom').value=M.custom||''; document.getElementById('geo-wms').value=M.wms||''; document.getElementById('geo-wlay').value=M.wlay||''; document.getElementById('geo-cattr').value=M.cattr||'';
  document.getElementById('geo-cbox').style.display=M.src==='custom'||M.src==='wms'?'flex':'none';
  document.getElementById('geo-xyzrow').style.display=M.src==='custom'?'flex':'none'; document.getElementById('geo-wmsrow').style.display=M.src==='wms'?'flex':'none';
  var s=geoSrc(); document.getElementById('geo-note').textContent=s?(s.tipo?s.tipo+'. ':'')+(s.nota||''):'Sem mapa base.';
  var u=document.getElementById('geo-unit'); if(u) u.textContent=S.units&&S.units.insertScale!=='m'?'Atenção: o desenho está em '+S.units.insertScale+' — cada unidade vale '+geoF()+' m em E/N.':'';
}
function geoApplyCrs(){ var G=geoMake(document.getElementById('geo-datum').value,+document.getElementById('geo-zone').value,document.getElementById('geo-hem').value==='S',+String(document.getElementById('geo-e0').value).replace(',','.'),+String(document.getElementById('geo-n0').value).replace(',','.'));
  snapshot(); geoSet(G); }
window.addEventListener('load',function(){
  var A=document.createElement('div'); A.id='geo-attr'; A.className='geo-attr'; document.getElementById('cw').appendChild(A);
  var gb=document.createElement('div'); gb.id='geobox'; gb.className='geobox'; var cb=document.getElementById('coordbox'); cb.parentNode.insertBefore(gb,cb.nextSibling);
  document.getElementById('cw').addEventListener('mousemove',function(){ if(!S.geo||S.space!=='model'||!S.hover){ if(gb.textContent) gb.textContent=''; return; } gb.textContent=geoCursorText(S.hover.x,S.hover.y); });
  var zo=''; for(var z=1;z<=60;z++) zo+='<option value="'+z+'">'+z+'</option>';
  var so=[['','Nenhum']].concat(Object.keys(GEO_SRC).map(function(k){ return [k,GEO_SRC[k].nome]; })).concat([['custom','Personalizado (XYZ)'],['wms','Serviço WMS (INDE, IBGE, órgão estadual…)']]);
  var P=document.createElement('div'); P.id='geo-pal'; P.className='bib-pal geo-pal';
  P.innerHTML='<div class="bib-head" id="geo-head"><span>🛰 Mapa e georreferenciamento</span><button type="button" class="bib-x" id="geo-close" title="Fechar (MAPA)">×</button></div><div class="geo-body">'+
   '<div class="geo-sec">Ir para</div><div class="geo-row"><input id="geo-go" placeholder="-11.7286, -49.0681 · 11°43\'43&quot;S 49°04\'05&quot;W · E N" autocomplete="off"><button class="btn p" type="button" id="geo-gobtn">Ir</button></div>'+
   '<div class="geo-row"><button class="btn s" type="button" id="geo-here">📍 Minha localização</button><button class="btn s" type="button" id="geo-ze">Zoom no desenho</button></div>'+
   '<div class="geo-sec">Sistema de referência (SRC)</div><div id="geo-crs" class="geo-crs"></div>'+
   '<div class="geo-row"><select id="geo-datum"><option>SIRGAS 2000</option><option>WGS 84</option></select><label>Zona <select id="geo-zone">'+zo+'</select></label><select id="geo-hem"><option value="S">Sul</option><option value="N">Norte</option></select></div>'+
   '<div class="geo-row"><label title="Some quando as coordenadas do desenho foram reduzidas (E = E0 + X)">E0 <input id="geo-e0" value="0"></label><label>N0 <input id="geo-n0" value="0"></label><button class="btn s" type="button" id="geo-apply">Aplicar</button></div>'+
   '<div id="geo-unit" class="geo-warn"></div>'+
   '<div class="geo-sec">Mapa base</div><div id="geo-src" class="geo-src">'+so.map(function(o){ return '<label><input type="radio" name="geo-src" value="'+o[0]+'"> '+o[1]+'</label>'; }).join('')+'</div>'+
   '<div id="geo-cbox" class="geo-row geo-col"><div class="geo-row" id="geo-xyzrow"><input id="geo-custom" placeholder="https://…/{z}/{x}/{y}.png"></div><div class="geo-row" id="geo-wmsrow"><input id="geo-wms" placeholder="URL do WMS (https://…/wms)"><input id="geo-wlay" placeholder="camada(s)" style="max-width:110px"></div><input id="geo-cattr" placeholder="Atribuição (fonte e licença)"></div>'+
   '<div class="geo-row"><label>Opacidade <input type="range" id="geo-op" min="10" max="100" step="5"></label><span id="geo-opv"></span><label><input type="checkbox" id="geo-gray"> Cinza</label><label title="Ruas, limites e nomes da Esri sobre a imagem"><input type="checkbox" id="geo-ovl"> Vias e rótulos</label></div>'+
   '<div id="geo-note" class="geo-note"></div>'+
   '<div class="geo-sec">Exportar e importar</div><div class="geo-row"><button class="btn s" type="button" id="geo-xgj">GeoJSON</button><button class="btn s" type="button" id="geo-xkml">KML (Google Earth)</button><button class="btn s" type="button" id="geo-xpng">PNG + .pgw</button></div>'+
   '<div class="geo-row"><button class="btn s" type="button" id="geo-imp">Importar GeoJSON / KML…</button><input type="file" id="geo-file" accept=".geojson,.json,.kml" style="display:none"></div>'+
   '<div class="geo-note">Exporta a seleção ou, sem seleção, todo o Model. DXF: as coordenadas já saem em UTM. Google Maps/Earth não podem ser usados como fundo para traçar (termos do Google); veja o resultado no Google Earth pelo KML.</div></div>';
  document.body.appendChild(P);
  var $=function(i){ return document.getElementById(i); };
  $('geo-close').addEventListener('click',geoClose);
  $('geo-gobtn').addEventListener('click',function(){ geoGoTo($('geo-go').value); });
  $('geo-go').addEventListener('keydown',function(ev){ if(ev.key==='Enter'){ ev.preventDefault(); geoGoTo($('geo-go').value); } });
  $('geo-here').addEventListener('click',geoHere); $('geo-ze').addEventListener('click',function(){ zoomFit(); renderAll(); });
  $('geo-apply').addEventListener('click',geoApplyCrs);
  P.querySelectorAll('input[name=geo-src]').forEach(function(r){ r.addEventListener('change',function(){ geoMapCfg().src=r.value; S.dirty=true; geoPanelSync(); renderAll(); if(r.value&&!S.geo) log('Defina onde fica o desenho: "Ir para" (lat/lon) ou zona UTM.','inf'); }); });
  $('geo-op').addEventListener('input',function(ev){ geoMapCfg().op=(+ev.target.value)/100; $('geo-opv').textContent=ev.target.value+'%'; renderAll(); });
  $('geo-gray').addEventListener('change',function(ev){ geoMapCfg().gray=ev.target.checked; renderAll(); });
  $('geo-ovl').addEventListener('change',function(ev){ geoMapCfg().ovl=ev.target.checked; renderAll(); });
  ['geo-custom','geo-wms','geo-wlay','geo-cattr'].forEach(function(id){ $(id).addEventListener('change',function(){ var M=geoMapCfg(); M.custom=$('geo-custom').value.trim(); M.wms=$('geo-wms').value.trim(); M.wlay=$('geo-wlay').value.trim(); M.cattr=$('geo-cattr').value.trim(); renderAll(); }); });
  $('geo-xgj').addEventListener('click',geoExportGeoJSON); $('geo-xkml').addEventListener('click',geoExportKML); $('geo-xpng').addEventListener('click',geoExportPNG);
  $('geo-imp').addEventListener('click',function(){ $('geo-file').click(); });
  $('geo-file').addEventListener('change',function(ev){ var f=ev.target.files[0]; if(!f) return; var r=new FileReader(); r.onload=function(e){ geoImport(e.target.result,f.name); ev.target.value=''; }; r.readAsText(f); });
  ['keydown','keyup','keypress'].forEach(function(k){ P.addEventListener(k,function(ev){ var t=ev.target; if(t&&(t.tagName==='INPUT'||t.tagName==='SELECT')){ if(ev.key==='Escape'&&k==='keydown') t.blur(); ev.stopPropagation(); } }); });
  var H=$('geo-head'),drag=null;
  H.addEventListener('pointerdown',function(ev){ if(ev.target.id==='geo-close') return; var r=P.getBoundingClientRect(); drag={dx:ev.clientX-r.left,dy:ev.clientY-r.top}; H.setPointerCapture(ev.pointerId); });
  H.addEventListener('pointermove',function(ev){ if(!drag) return; P.style.left=Math.max(0,Math.min(window.innerWidth-80,ev.clientX-drag.dx))+'px'; P.style.top=Math.max(0,Math.min(window.innerHeight-40,ev.clientY-drag.dy))+'px'; P.style.right='auto'; });
  H.addEventListener('pointerup',function(){ drag=null; });
  geoPanelSync();
});
