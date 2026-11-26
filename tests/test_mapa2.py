# Mapa base v8.16: zoom profundo da Esri pelo mapa de disponibilidade (tilemap), Esri Clarity, data/resolução/precisão
# da imagem (metadados da Esri) e serviços de terceiros (Google) com aviso de responsabilidade — servidores simulados.
# Uso: pip install playwright && playwright install chromium && python tests/test_mapa2.py
import sys, os, re, json, zlib, struct
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
def png(rgb):
    raw=b''.join(b'\x00'+bytes(rgb)*256 for _ in range(256))
    def ch(t,d): c=struct.pack('>I',len(d))+t+d; return c+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+ch(b'IHDR',struct.pack('>IIBBBBB',256,256,8,2,0,0,0))+ch(b'IDAT',zlib.compress(raw))+ch(b'IEND',b'')
T_ESRI=png((30,90,40)); T_G=png((120,30,30)); T_CL=png((40,40,90))
seen=[]; CENTER={}
def J(route,obj,status=200): route.fulfill(status=status,headers={'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body=json.dumps(obj))
def handler(route):
    u=route.request.url; seen.append(u)
    m=re.search(r'/tilemap/(\d+)/(\d+)/(\d+)/(\d+)/(\d+)',u)
    if m:
        z,r0,c0,w,h=map(int,m.groups())
        if z>=22: return J(route,{'error':{'code':422,'message':'Tile bundle does not exist'}})
        data=[1]*(w*h)
        if z==21:  # só o ladrilho do centro existe no nível 21
            data=[0]*(w*h); cx,cy=CENTER.get(21,(-1,-1))
            if c0<=cx<c0+w and r0<=cy<r0+h: data[(cy-r0)*w+(cx-c0)]=1
        return J(route,{'adjusted':False,'location':{'left':c0,'top':r0,'width':w,'height':h},'data':data})
    if 'waybackconfig.json' in u:
        return J(route,{'10':{'itemTitle':'World Imagery (Wayback 2025-05-29)','metadataLayerUrl':'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2025_r05/MapServer'},
                        '20':{'itemTitle':'World Imagery (Wayback 2026-02-26)','metadataLayerUrl':'https://metadata.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Metadata_2026_r02/MapServer'}})
    if '/identify' in u:
        nm='Maxar Clarity' if 'Clarity' in u else 'Maxar Vivid'
        return J(route,{'results':[{'layerId':4,'attributes':{'NICE_NAME':nm,'SRC_DATE2':1684022400000,'SRC_DATE':20230514,'SRC_RES':0.5,'SRC_ACC':5,'SRC_DESC':'WV03'}}]})
    body=T_G if 'google.com' in u else T_CL if 'clarity' in u else T_ESRI
    route.fulfill(status=200,headers={'Access-Control-Allow-Origin':'*','Content-Type':'image/png'},body=body)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1440,'height':900})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.route(re.compile(r'https://(server\.arcgisonline\.com|clarity\.maptiles\.arcgis\.com|metadata\.maptiles\.arcgis\.com|s3-us-west-2\.amazonaws\.com|mt\d\.google\.com)/.*'),handler)
    pg.goto('file://'+path); pg.wait_for_timeout(500); E=pg.evaluate
    if E("document.getElementById('ov-recover').classList.contains('show')"): E("closeOv('ov-recover')")
    E("localStorage.removeItem('educad-terceiros-aceito')")
    E("()=>{window._dl=[];downloadBlob=function(c,t,n){_dl.push({n:n});};}")
    E("tplCreate('topografico')"); E("geoOpen()"); E("geoGoTo('-11.7286, -49.0681')"); pg.wait_for_timeout(600)
    # ── fontes
    names=E("Array.from(document.querySelectorAll('#geo-src label')).map(l=>l.textContent.trim())")
    ok('Fonte nova: Esri World Imagery (Clarity)',any('Clarity' in n for n in names))
    ok('Seção de serviços de terceiros com Google Satélite, Híbrido e Terreno',all(any(k in n for n in names) for k in ['Google — Satélite','Google — Híbrido','Google — Terreno']) and 'QuickMapServices' in E("document.getElementById('geo-src').textContent"))
    ok('Aviso permanente: direitos autorais são responsabilidade do usuário','responsabilidade do usuário' in E("document.querySelector('.geo-terc-n').textContent"))
    # ── zoom profundo (tilemap)
    z0=E("GEO.last.z"); ok('Esri agora vai até o nível 22',E("GEO_SRC.esri.max")==22 and E("GEO_SRC.clarity.max")==22)
    CENTER[21]=(E("Math.floor(lon2tx(-49.0681,21))"),E("Math.floor(lat2ty(-11.7286,21))"))
    n0=len(seen); E("()=>{var d=ll2d(-11.7286,-49.0681);geoView(d,30);}"); pg.wait_for_timeout(900); E("renderAll()"); pg.wait_for_timeout(600)
    tiles=[u for u in seen[n0:] if '/tile/' in u and 'tilemap' not in u]
    lv=lambda u: int(re.search(r'/tile/(\d+)/',u).group(1))
    ok('Consulta o mapa de disponibilidade (tilemap) antes de pedir os níveis profundos',any('/tilemap/22/' in u for u in seen[n0:]) and any('/tilemap/21/' in u for u in seen[n0:]))
    ok('Nível 22 inexistente: nenhum ladrilho z22 pedido',not any(lv(u)==22 for u in tiles))
    cx,cy=CENTER[21]
    ok('Nível 21 só onde existe (o ladrilho do centro)',any(u.endswith(f'/tile/21/{cy}/{cx}') for u in tiles) and all(u.endswith(f'/tile/21/{cy}/{cx}') for u in tiles if lv(u)==21),[u.split('/tile/')[1] for u in tiles if lv(u)==21][:5])
    ok('Onde não existe, usa o nível 20 (sem "Map data not yet available")',any(lv(u)==20 for u in tiles))
    px=E("Array.from(S.gG.getImageData(Math.round(cvW()/2*S.dpr),Math.round(cvH()/2*S.dpr),1,1).data).slice(0,3)")
    ok('Imagem desenhada no zoom profundo',px==[30,90,40],px)
    # ── metadados
    pg.wait_for_timeout(1200); meta=E("document.getElementById('geo-meta').textContent")
    ok('Data, resolução e precisão da imagem no centro (Esri)',meta=='Imagem no centro: Maxar Vivid · 14/05/2023 · resolução 0,5 m · precisão de posição ±5 m',meta)
    idf=[u for u in seen if '/identify' in u]
    ok('Usa o serviço de metadados da versão Wayback mais recente',idf and 'World_Imagery_Metadata_2026_r02' in idf[-1])
    q=parse_qs(urlparse(idf[-1]).query); ok('Consulta identify em EPSG:3857 com extensão e tamanho da tela',q['sr']==['3857'] and len(q['mapExtent'][0].split(','))==4 and q['imageDisplay'][0].endswith(',96'))
    def src(v): E(f"()=>{{var r=document.querySelector('#geo-src input[value=\"{v}\"]');r.checked=true;r.dispatchEvent(new Event('change'));}}"); pg.wait_for_timeout(300)
    n0=len(seen); src('clarity'); pg.wait_for_timeout(1300)
    ok('Clarity: ladrilhos do clarity.maptiles e metadados próprios',any('clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/' in u for u in seen[n0:]) and any('World_Imagery_Clarity_Metadata/MapServer/identify' in u for u in seen[n0:]) and 'Maxar Clarity' in E("document.getElementById('geo-meta').textContent"))
    # ── terceiros: aviso
    E("()=>{var d=ll2d(-11.7286,-49.0681);geoView(d,600);}"); src('esri')
    n0=len(seen); src('gsat')
    ok('Escolher o Google abre o aviso de responsabilidade',E("document.getElementById('ov-terc').classList.contains('show')") and 'responsabilidade do usuário' in E("document.querySelector('#ov-terc .terc-txt').textContent"))
    ok('O botão só libera depois de marcar "assumo a responsabilidade"',E("document.getElementById('terc-ok').disabled"))
    pg.click('#terc-no'); pg.wait_for_timeout(100)
    ok('Cancelar: continua na Esri e nada é pedido ao Google',E("geoMapCfg().src")=='esri' and E("document.querySelector('#geo-src input[value=esri]').checked") and not any('google.com' in u for u in seen[n0:]))
    src('gsat'); pg.check('#terc-chk'); ok('Marcado o aceite, o botão libera',not E("document.getElementById('terc-ok').disabled"))
    pg.click('#terc-ok'); pg.wait_for_timeout(500)
    g=[u for u in seen[n0:] if 'google.com' in u]
    ok('Google Satélite ativo: ladrilhos mt0–mt3, lyrs=s, x/y/z',E("geoMapCfg().src")=='gsat' and g and all(re.match(r'https://mt[0-3]\.google\.com/vt/lyrs=s&x=\d+&y=\d+&z=\d+$',u) for u in g))
    ok('Aceite guardado neste navegador',E("!!localStorage.getItem('educad-terceiros-aceito')"))
    at=E("document.getElementById('geo-attr').textContent"); ok('Atribuição "© Google" com a responsabilidade do usuário','© Google' in at and 'responsabilidade do usuário' in at,at)
    ok('Aviso em destaque no painel','responsabilidade é do usuário' in E("document.getElementById('geo-note').textContent"))
    px=E("Array.from(S.gG.getImageData(Math.round(cvW()/2*S.dpr),Math.round(cvH()/2*S.dpr),1,1).data).slice(0,3)"); ok('Imagem do serviço desenhada no fundo',px==[120,30,30],px)
    ok('Sem metadados da Esri para o Google',E("document.getElementById('geo-meta').textContent")=='')
    pg.click('#geo-xpng'); pg.wait_for_timeout(100)
    ok('PNG: o fundo de terceiros não é gravado (aviso no log)',any(d['n'].endswith('.png') for d in E("_dl")) and 'não é gravado no PNG' in E("document.getElementById('cmdlog').textContent"))
    n0=len(seen); src('ghyb'); ok('Híbrido sem novo aviso (já aceito)',not E("document.getElementById('ov-terc').classList.contains('show')") and any('lyrs=y' in u for u in seen[n0:]))
    D=json.loads(E("JSON.stringify(buildDoc())")); ok('A escolha fica gravada no desenho',D['geoMap']['src']=='ghyb')
    E("localStorage.removeItem('educad-terceiros-aceito')"); E("()=>{GEO.tercSess=false;geoPanelSync();renderAll();}")
    ok('Em navegador sem o aceite, o serviço de terceiro não é carregado e o painel pede o aceite',not E("geoActive()") and 'aceite' in E("document.getElementById('geo-note').textContent"))
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
fails=[n for n,c in R if not c]; print(f'\n{len(R)-len(fails)}/{len(R)} testes OK'); sys.exit(1 if fails else 0)
