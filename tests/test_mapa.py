# Mapa base e georreferenciamento (v8.15): projeção UTM SIRGAS 2000 (conferida com o PROJ/pyproj), Ir para,
# ladrilhos reprojetados (servidor simulado), fontes e WMS, coordenadas do cursor, GeoJSON/KML (exportar e importar),
# PNG + world file, persistência e abas.
# Uso: pip install playwright pillow && playwright install chromium && python tests/test_mapa.py
import sys, os, re, io, json
import xml.etree.ElementTree as ET
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
def near(a,b,t=1e-6): return a is not None and abs(a-b)<=t
def TMP(n): return os.path.join(HERE,'_'+n)
# ladrilho PNG 256×256 de cor sólida (sem dependências)
import zlib, struct
def png(rgb):
    raw=b''.join(b'\x00'+bytes(rgb)*256 for _ in range(256))
    def ch(t,d): c=struct.pack('>I',len(d))+t+d; return c+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+ch(b'IHDR',struct.pack('>IIBBBBB',256,256,8,2,0,0,0))+ch(b'IDAT',zlib.compress(raw))+ch(b'IEND',b'')
COL={'World_Imagery':(30,90,40),'openstreetmap':(200,190,170),'eox':(60,60,120),'opentopomap':(150,120,80),'World_Topo':(180,170,150),'meuservidor':(10,10,200),'wms':(200,10,10),'Reference':(0,0,0)}
TILES={k:png(v) for k,v in COL.items()}
seen=[]
def handler(route):
    u=route.request.url; seen.append(u); key=next((k for k in COL if k in u),'World_Imagery')
    route.fulfill(status=200,headers={'Access-Control-Allow-Origin':'*','Content-Type':'image/png'},body=TILES[key])
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1440,'height':900})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.route(re.compile(r'https://(server\.arcgisonline\.com|tile\.openstreetmap\.org|tiles\.maps\.eox\.at|tile\.opentopomap\.org|meuservidor\.exemplo|wms\.exemplo)/.*'),handler)
    pg.goto('file://'+path); pg.wait_for_timeout(500); E=pg.evaluate
    if E("document.getElementById('ov-recover').classList.contains('show')"): E("closeOv('ov-recover')")
    E("()=>{window._dl=[];downloadBlob=function(c,t,n){_dl.push({n:n,t:t,c:typeof c==='string'?c:null,len:c.length});};}")
    # ── projeção (valores de referência do PROJ 9 / pyproj, EPSG:4674 → EPSG:31982)
    r=E("utmFwd(-11.7286,-49.0681,22,true,'GRS80')")
    ok('UTM SIRGAS 2000 (Gurupi, 22S) igual ao PROJ < 1 mm',near(r['E'],710549.7647544299,1e-3) and near(r['N'],8702735.192870308,1e-3),r)
    q=E("utmInv(710100,8700100,22,true,'GRS80')")
    ok('Inversa (E/N → lat/lon) igual ao PROJ < 1 mm',near(q['lon'],-49.07205963425889,1e-8) and near(q['lat'],-11.752445775979124,1e-8),q)
    r=E("utmFwd(38.7223,-9.1393,29,false,'WGS84')"); ok('WGS 84 / UTM 29N (Lisboa) igual ao PROJ',near(r['E'],487890.75808079174,1e-3) and near(r['N'],4285969.858869498,1e-3))
    ok('Ida e volta em 100 pontos do Brasil < 1 mm',E("(()=>{var mx=0;for(var i=0;i<100;i++){var la=-33+i*0.38,lo=-73+i*0.42,z=utmZoneOf(lo),u=utmFwd(la,lo,z,la<0,'GRS80'),g=utmInv(u.E,u.N,z,la<0,'GRS80'),v=utmFwd(g.lat,g.lon,z,la<0,'GRS80');mx=Math.max(mx,Math.hypot(u.E-v.E,u.N-v.N));}return mx;})()")<1e-3)
    ok('Códigos EPSG: SIRGAS 2000 18S–25S = 31978–31985, 22N = 31976; WGS 84 22S = 32722',[E(f"geoEpsg('SIRGAS 2000',{z},true)") for z in range(18,26)]==list(range(31978,31986)) and E("geoEpsg('SIRGAS 2000',22,false)")==31976 and E("geoEpsg('WGS 84',22,true)")==32722)
    # ── leitura de coordenadas
    P=lambda t: E("geoParse("+json.dumps(t)+")")
    ok('Ir para aceita decimal, vírgula decimal, GMS com hemisfério e UTM',near(P('-11.7286, -49.0681')['lat'],-11.7286) and near(P('-11,7286; -49,0681')['lon'],-49.0681) and near(P('11°43\'42,96"S 49°04\'05,16"W')['lat'],-11.72860,1e-6) and near(P('11°43\'42.96"S 49°04\'05.16"W')['lon'],-49.06810,1e-6) and P('710549.76 8702735.19')['E']==710549.76)
    ok('Texto inválido é recusado',P('rua tal')==None)
    # ── painel
    E("tplCreate('topografico')"); pg.click('#rb-geo'); ok('Botão Mapa abre o painel',E("document.getElementById('geo-pal').classList.contains('show')"))
    E("geoClose()"); E("cmdSubmit('MAPA')"); ok('Comando MAPA abre o painel',E("document.getElementById('geo-pal').classList.contains('show')"))
    ok('Sem sistema definido: o painel avisa e não há mapa',not E("geoActive()") and 'Ainda não definido' in E("document.getElementById('geo-crs').textContent"))
    n0=len(seen); pg.fill('#geo-go','-11.7286, -49.0681'); pg.click('#geo-gobtn'); pg.wait_for_timeout(700)
    ok('Ir para define SIRGAS 2000 / UTM 22S (EPSG:31982) sozinho',E("geoCrsName()")=='SIRGAS 2000 / UTM zona 22S (EPSG:31982)')
    c=E("(()=>{var d=s2w(cvW()/2,cvH()/2);return d2ll(d.x,d.y);})()")
    ok('A vista fica centrada no ponto (< 1 m)',near(c['lat'],-11.7286,1e-5) and near(c['lon'],-49.0681,1e-5),c)
    ok('Mapa de satélite (Esri) ligado e ladrilhos pedidos',E("geoMapCfg().src")=='esri' and len(seen)>n0 and all('World_Imagery/MapServer/tile/' in u for u in seen[n0:]))
    z=E("GEO.last.z"); tx=E(f"Math.floor(lon2tx(-49.0681,{z}))"); ty=E(f"Math.floor(lat2ty(-11.7286,{z}))")
    ok('Pediu o ladrilho que contém o ponto (z/y/x da Esri)',any(u.endswith(f'/tile/{z}/{ty}/{tx}') for u in seen),(z,tx,ty))
    ok('Zoom do ladrilho adequado à escala da tela (z ≥ 17 para 600 m de largura)',z>=17,z)
    px=E("Array.from(S.gG.getImageData(Math.round(cvW()/2*S.dpr),Math.round(cvH()/2*S.dpr),1,1).data).slice(0,3)")
    ok('A imagem aparece no fundo do Model (pixel do centro = cor do ladrilho)',px==[30,90,40],px)
    ok('Atribuição exibida (Esri, Maxar…)','Esri, Maxar' in E("document.getElementById('geo-attr').textContent") and E("getComputedStyle(document.getElementById('geo-attr')).display")!='none')
    E("()=>{var s=document.getElementById('geo-op');s.value=50;s.dispatchEvent(new Event('input'));}"); pg.wait_for_timeout(50)
    px2=E("Array.from(S.gG.getImageData(Math.round(cvW()/2*S.dpr),Math.round(cvH()/2*S.dpr),1,1).data).slice(0,3)")
    ok('Opacidade 50% mistura com o fundo',px2!=px and px2[1]<px[1],px2)
    E("()=>{var s=document.getElementById('geo-op');s.value=100;s.dispatchEvent(new Event('input'));var g=document.getElementById('geo-gray');g.checked=true;g.dispatchEvent(new Event('change'));}"); pg.wait_for_timeout(50)
    px3=E("Array.from(S.gG.getImageData(Math.round(cvW()/2*S.dpr),Math.round(cvH()/2*S.dpr),1,1).data).slice(0,3)")
    ok('Tons de cinza',max(px3)-min(px3)<=2,px3); E("()=>{var g=document.getElementById('geo-gray');g.checked=false;g.dispatchEvent(new Event('change'));}")
    # fontes
    def src(v): E(f"()=>{{var r=document.querySelector('#geo-src input[value=\"{v}\"]');r.checked=true;r.dispatchEvent(new Event('change'));}}"); pg.wait_for_timeout(250)
    n0=len(seen); src('osm'); ok('OpenStreetMap: URL {z}/{x}/{y} e atribuição',any(re.search(r'tile\.openstreetmap\.org/\d+/\d+/\d+\.png$',u) for u in seen[n0:]) and 'OpenStreetMap' in E("document.getElementById('geo-attr').textContent"))
    n0=len(seen); src('s2'); ok('Sentinel-2 sem nuvens (EOX), limitado ao zoom 15',any('s2cloudless-2024_3857' in u for u in seen[n0:]) and E("GEO.last.z")<=15)
    n0=len(seen); src('otm'); ok('OpenTopoMap (topográfico)',any('opentopomap' in u for u in seen[n0:]))
    src('custom'); E("()=>{var i=document.getElementById('geo-custom');i.value='https://meuservidor.exemplo/orto/{z}/{x}/{y}.png';i.dispatchEvent(new Event('change'));}"); pg.wait_for_timeout(250)
    ok('Fonte XYZ personalizada (ex.: ortomosaico de drone)',any('meuservidor.exemplo/orto/' in u for u in seen))
    src('wms'); E("()=>{var i=document.getElementById('geo-wms');i.value='https://wms.exemplo/geoserver/wms';i.dispatchEvent(new Event('change'));var l=document.getElementById('geo-wlay');l.value='car:imoveis';l.dispatchEvent(new Event('change'));}"); pg.wait_for_timeout(250)
    w=[u for u in seen if 'wms.exemplo' in u]
    ok('WMS: GetMap em EPSG:3857 com BBOX do ladrilho e a camada',w and 'REQUEST=GetMap' in w[0] and 'SRS=EPSG:3857' in w[0] and 'LAYERS=car%3Aimoveis' in w[0] and re.search(r'BBOX=-?\d+\.\d+,-?\d+\.\d+,-?\d+\.\d+,-?\d+\.\d+',w[0]))
    src('esri'); E("()=>{var o=document.getElementById('geo-ovl');o.checked=true;o.dispatchEvent(new Event('change'));}"); pg.wait_for_timeout(250)
    ok('Vias e rótulos sobre a imagem',any('Reference/World_Transportation' in u for u in seen) and 'Vias e rótulos' in E("document.getElementById('geo-attr').textContent"))
    E("()=>{var o=document.getElementById('geo-ovl');o.checked=false;o.dispatchEvent(new Event('change'));}")
    n0=len(seen); src(''); pg.wait_for_timeout(100); ok('Mapa desligado: nenhum ladrilho pedido e sem atribuição',len(seen)==n0 and E("getComputedStyle(document.getElementById('geo-attr')).display")=='none')
    src('esri')
    E("()=>{switchSpace(S.layouts[0].id);}"); ok('No layout (folha) o mapa não é desenhado',not E("geoActive()") and E("getComputedStyle(document.getElementById('geo-attr')).display")=='none'); E("()=>{switchSpace('model');}")
    # ── desenhar sobre a imagem (coordenadas UTM)
    E("()=>{if(S.ds)ncEnd();}"); E("setTool('polyline')"); [E(f"cmdSubmit('{t}')") for t in ['710000,8700000','710100,8700000','710100,8700100','710000,8700100','C']]
    pl=E("S.ents.find(e=>e.tp==='pl')"); ok('Polilinha digitada em E,N fica nas coordenadas UTM reais',pl and pl['pts'][0]['x']==710000 and pl['pts'][2]['y']==8700100,pl and pl['pts'][:2])
    box=pg.locator('#cw').bounding_box(); pg.mouse.move(box['x']+700,box['y']+300); pg.wait_for_timeout(50)
    gb=E("document.getElementById('geobox').textContent"); ok('Coordenadas do cursor em E/N e em graus, minutos e segundos',re.search(r'E 7\d\d\.\d{3},\d\d  N 8\.7\d\d\.\d{3},\d\d',gb) and re.search(r'11°\d\d\'\d\d,\d\d"S  49°\d\d\'\d\d,\d\d"W',gb),gb)
    # ── GeoJSON
    E("()=>{addE({tp:'point',x:710549.7647544299,y:8702735.192870308});var n=bibDefine('MARCO');addE({tp:'insert',name:n,x:710010,y:8700010,s:1,rot:0,m:false});addE({tp:'txt',x:710050,y:8700050,h:2,txt:'Sede',rot:0});addE({tp:'line',x1:710000,y1:8699900,x2:710300,y2:8699900});addE({tp:'dim',subtp:'linear',dimDir:'h',x1:710000,y1:8700000,x2:710100,y2:8700000,px:710050,py:8699980,dimStyle:S.dimCurrent});S.sel=[];}")
    pg.click('#geo-xgj'); d=E("_dl.pop()"); G=json.loads(d['c'])
    ok('GeoJSON baixado com nome .geojson',d['n'].endswith('.geojson') and G['type']=='FeatureCollection')
    poly=[f for f in G['features'] if f['geometry']['type']=='Polygon'][0]; ring=poly['geometry']['coordinates'][0]
    ref=[(-49.07297061515863,-11.753355811409293),(-49.07205334488255,-11.753349615339141),(-49.07205963425889,-11.752445775979124),(-49.072976901547165,-11.752451971559681)]
    ok('Polígono em lon/lat igual ao PROJ (< 1 cm), anel fechado no sentido anti-horário',all(near(ring[i][0],ref[i][0],1e-7) and near(ring[i][1],ref[i][1],1e-7) for i in range(4)) and ring[0]==ring[-1],ring[:2])
    ok('Área 10 000 m² = 1 ha e perímetro 400 m nas propriedades',near(poly['properties']['area_m2'],10000,1e-3) and near(poly['properties']['area_ha'],1) and near(poly['properties']['perimetro_m'],400,1e-3) and poly['properties']['camada']=='TOP-PONTOS')
    pts=[f for f in G['features'] if f['geometry']['type']=='Point']
    ok('Ponto, bloco e texto viram Point (com nome do bloco e texto)',any(near(f['geometry']['coordinates'][0],-49.0681,1e-8) and near(f['geometry']['coordinates'][1],-11.7286,1e-8) for f in pts) and any(f['properties'].get('bloco')=='MARCO' for f in pts) and any(f['properties'].get('texto')=='Sede' for f in pts))
    ok('Linha vira LineString com comprimento 300 m; cotas ficam de fora',any(f['geometry']['type']=='LineString' and near(f['properties']['comprimento_m'],300,1e-6) for f in G['features']) and not any(f['properties']['tipo']=='dim' for f in G['features']))
    E("()=>{S.sel=[S.ents.find(e=>e.tp==='pl').id];}"); pg.click('#geo-xgj'); G2=json.loads(E("_dl.pop()")['c'])
    ok('Com seleção, exporta só a seleção',len(G2['features'])==1); E("()=>{S.sel=[];}")
    # KML
    pg.click('#geo-xkml'); d=E("_dl.pop()"); k=ET.fromstring(d['c'].encode('utf8')); ns={'k':'http://www.opengis.net/kml/2.2'}
    pms=k.findall('.//k:Placemark',ns); poly=k.find('.//k:Polygon//k:coordinates',ns).text.split()
    ok('KML (Google Earth): placemarks, estilos e coordenadas lon,lat',d['n'].endswith('.kml') and len(pms)==len(G['features']) and near(float(poly[0].split(',')[0]),ref[0][0],1e-7) and k.find('.//k:Style',ns) is not None)
    # PNG + pgw
    pg.click('#geo-xpng'); pg.wait_for_timeout(100); a=E("_dl.slice(-2)")
    ok('PNG georreferenciado com world file (.pgw)',a[0]['n'].endswith('.png') and a[1]['n'].endswith('.pgw') and a[0]['len']>1000)
    W=[float(v) for v in a[1]['c'].split()]; ul=E("(()=>{var w=s2w(0,0);return d2utm(w.x,w.y);})()"); pxs=E("geoF()/S.vp.sc/2")
    ok('World file: tamanho do pixel e canto superior esquerdo em UTM',near(W[0],pxs,1e-6) and near(W[3],-pxs,1e-6) and near(W[4],ul['E']+pxs/2,1e-3) and near(W[5],ul['N']-pxs/2,1e-3),W)
    # ── importar
    gj={'type':'FeatureCollection','features':[
      {'type':'Feature','properties':{'nome':'Marco 1','camada':'LIMITE CAR'},'geometry':{'type':'Point','coordinates':[-49.0681,-11.7286]}},
      {'type':'Feature','properties':{'camada':'LIMITE CAR'},'geometry':{'type':'Polygon','coordinates':[[list(c) for c in ref]+[list(ref[0])]]}},
      {'type':'Feature','properties':{},'geometry':{'type':'MultiLineString','coordinates':[[[-49.07,-11.75],[-49.06,-11.74]],[[-49.05,-11.75],[-49.04,-11.74]]]}}]}
    f=TMP('imovel.geojson'); open(f,'w').write(json.dumps(gj))
    E("tplCreate('padrao')"); E("geoOpen()"); pg.set_input_files('#geo-file',f); pg.wait_for_timeout(300); os.remove(f)
    ok('Importar GeoJSON num desenho novo: SRC automático e unidade em metros',E("geoCrsName()")=='SIRGAS 2000 / UTM zona 22S (EPSG:31982)' and E("S.units.insertScale")=='m')
    imp=E("S.ents.map(e=>({tp:e.tp,ly:getLy(e.ly).nm,txt:e.txt||null,closed:e.closed||false,n:e.pts?e.pts.length:0}))")
    ok('Ponto + rótulo, polígono fechado e duas linhas, nas camadas do arquivo',sum(1 for e in imp if e['tp']=='point')==1 and any(e['txt']=='Marco 1' for e in imp) and sum(1 for e in imp if e['tp']=='pl' and e['closed'] and e['n']==4)==1 and sum(1 for e in imp if e['tp']=='pl' and not e['closed'])==2 and any(e['ly']=='LIMITE CAR' for e in imp) and any(e['ly']=='_imovel' for e in imp),imp)
    ok('Polígono importado volta às coordenadas UTM (< 1 cm)',E("(()=>{var p=S.ents.find(e=>e.tp==='pl'&&e.closed);return Math.abs(p.pts[0].x-710000)<0.01&&Math.abs(p.pts[2].y-8700100)<0.01;})()"))
    ok('Importar é desfeito com um Ctrl+Z',E("(()=>{undo();var n=S.ents.length;redo();return n;})()")==0)
    kml='<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><Folder><name>Talhões</name><Placemark><name>Talhão A</name><Polygon><outerBoundaryIs><LinearRing><coordinates>-49.073,-11.7534,0 -49.072,-11.7534,0 -49.072,-11.7524,0 -49.073,-11.7534,0</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></Folder></Document></kml>'
    f=TMP('talhoes.kml'); open(f,'w').write(kml); pg.set_input_files('#geo-file',f); pg.wait_for_timeout(300); os.remove(f)
    ok('Importar KML (pasta vira camada)',E("S.ents.some(e=>e.tp==='pl'&&e.closed&&getLy(e.ly).nm==='Talhões'&&e.pts.length===3)"))
    f=TMP('ruim.geojson'); open(f,'w').write('{"type":"Point","coordinates":[710000,8700000]}'); n=E("S.ents.length"); pg.set_input_files('#geo-file',f); pg.wait_for_timeout(200); os.remove(f)
    ok('Coordenadas que não são lon/lat são recusadas',E("S.ents.length")==n)
    # ── persistência e abas
    doc=E("JSON.stringify(buildDoc())"); D=json.loads(doc); ok('O arquivo guarda o SRC e o mapa base',D['geo']['epsg']==31982 and D['geoMap']['src']=='esri')
    f=TMP('geo.json'); open(f,'w').write(doc); E("tplCreate('padrao')"); ok('Desenho novo (outra aba) sem SRC',E("S.geo")==None and not E("geoActive()"))
    pg.set_input_files('#fileInput',f); pg.wait_for_timeout(300); os.remove(f); ok('Abrir restaura SRC e mapa',E("S.geo&&S.geo.epsg")==31982 and E("geoMapCfg().src")=='esri')
    k0=E("DOCS.cur"); E("tplCreate('mecanico')"); sem=E("S.geo"); E(f"docSwitch({k0})")
    ok('Cada aba com o seu SRC (aba nova sem SRC; a anterior continua 22S)',sem==None and E("S.geo&&S.geo.epsg")==31982 and E("geoActive()"))
    # ── origem local e desenho em milímetros
    E("tplCreate('padrao')"); E("()=>{addE({tp:'line',x1:0,y1:0,x2:1,y2:1});}"); E("geoOpen()")
    E("()=>{document.getElementById('geo-zone').value='22';document.getElementById('geo-hem').value='S';document.getElementById('geo-e0').value='700000';document.getElementById('geo-n0').value='8700000';}"); pg.click('#geo-apply')
    u=E("d2utm(10591000,2754000)"); ok('Desenho em mm com origem local: E = E0 + X·0,001',near(u['E'],710591,1e-6) and near(u['N'],8702754,1e-6) and E("S.units.insertScale")=='mm',u)
    ok('O painel avisa que o desenho está em mm','mm' in E("document.getElementById('geo-unit').textContent"))
    ok('Ir para fora do Brasil usa WGS 84',E("(()=>{S.geo=null;geoGoTo('38.7223, -9.1393');return geoCrsName();})()")=='WGS 84 / UTM zona 29N (EPSG:32629)')
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
fails=[n for n,c in R if not c]; print(f'\n{len(R)-len(fails)}/{len(R)} testes OK'); sys.exit(1 if fails else 0)
