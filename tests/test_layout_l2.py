# Testes das viewports como no AutoCAD (v7.5, pacote L2): MVIEW [Ajustar/Travar/Objeto/Poligonal/2/3/4],
# escala travada, camadas congeladas por viewport, camadas que não imprimem e camada VIEWPORTS.
# Uso: pip install playwright ezdxf && playwright install chromium && python tests/test_layout_l2.py
import sys, os, json
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
def near(a,b,t=1e-6): return abs(a-b)<t
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':850})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.goto('file://'+path); pg.wait_for_timeout(400); E=pg.evaluate
    box=pg.locator('#cw').bounding_box()
    def scr(x,y): s=E(f"w2s({x},{y})"); return box['x']+s['x'],box['y']+s['y']
    def click(x,y): pg.mouse.move(*scr(x,y)); pg.mouse.click(*scr(x,y)); pg.wait_for_timeout(30)
    def blur(): E("document.activeElement.blur()")
    def typ(t): blur(); pg.keyboard.type(t); pg.keyboard.press('Enter'); pg.wait_for_timeout(30)
    def VPS(): return E("S.ents.filter(e=>e.tp==='viewport').map(e=>JSON.parse(JSON.stringify(e)))")
    def fresh():
        E("()=>{var L=newLayoutObj(layoutUniqueName('T'),'A4',true);L._init=true;S.layouts.push(L);switchSpace(L.id);S.modes.snap=false;}")
    # modelo: retângulo na camada 0 e linha grossa horizontal na camada 1 (Construção)
    E("()=>{S.modes.snap=false;addE({tp:'rect',x:0,y:0,w:4000,h:2000,lw:.5});addE({tp:'line',x1:0,y1:1000,x2:4000,y2:1000,ly:1,lw:2,col:'#ff0000'});}")
    pg.click('#tab-layout1'); pg.wait_for_timeout(120)
    vl=E("S.layers.find(l=>l.nm==='VIEWPORTS')")
    ok('Camada VIEWPORTS criada, que não imprime, com a viewport nela',vl and vl['plot']==False and VPS()[0]['ly']==vl['id'])
    # ── MVIEW 4 / 2
    fresh(); typ('MV'); typ('4'); typ('')
    v=VPS(); ok('MVIEW 4 + Enter: quatro viewports na área imprimível',len(v)==4 and all(x['w']>100 for x in v),len(v))
    fresh(); typ('MV'); typ('2'); click(40,40); click(240,160)
    v=VPS(); ok('MVIEW 2 por dois cantos: duas viewports lado a lado',len(v)==2 and near(v[0]['y'],40,0.6) and v[1]['x']>v[0]['x']+v[0]['w'])
    # ── MVIEW Poligonal
    fresh(); typ('MV'); typ('P')
    for q in [(40,40),(200,40),(240,120),(120,170),(40,120)]: click(*q)
    typ('')
    v=VPS(); ok('MVIEW Poligonal: viewport com 5 vértices',len(v)==1 and len(v[0].get('clip',[]))==5,v)
    ok('Clique na borda poligonal seleciona a viewport',E("hitEnt(S.ents.find(e=>e.tp==='viewport'),120,40)") and not E("hitEnt(S.ents.find(e=>e.tp==='viewport'),120,100)"))
    m0=E("(()=>{var v=curViewport();return vpModelToPaper(v,2000,1000);})()")
    E("()=>{var v=curViewport();S.sel=[v.id];renderAll();}"); click(240,120); click(270,130); pg.keyboard.press('Escape'); pg.keyboard.press('Escape')
    m1=E("(()=>{var v=curViewport();return vpModelToPaper(v,2000,1000);})()")
    ok('Grip de vértice muda a forma sem mover o desenho no papel',near(m0['x'],m1['x'],1e-6) and near(m0['y'],m1['y'],1e-6) and near(E("curViewport().clip[2].x"),270,0.6))
    # ── MVIEW Objeto
    fresh(); E("addE({tp:'circ',cx:150,cy:100,r:60})"); typ('MV'); typ('O'); click(210,100)
    v=VPS(); ok('MVIEW Objeto: círculo vira viewport recortada',len(v)==1 and len(v[0]['clip'])>30 and not E("S.ents.some(e=>e.tp==='circ')"))
    # ── escala travada
    fresh(); typ('MV'); typ(''); E("()=>{S.sel=[curViewport().id];}"); typ('MV'); typ('T'); typ('')
    ok('MVIEW Travar: viewport travada',E("curViewport().lock")==True)
    k0=E("curViewport().k"); cx=E("curViewport().x+curViewport().w/2"); cy=E("curViewport().y+curViewport().h/2")
    pg.mouse.dblclick(*scr(cx,cy)); pg.wait_for_timeout(50); pg.mouse.move(*scr(cx,cy)); pg.mouse.wheel(0,-300); pg.wait_for_timeout(50)
    pg.mouse.down(); pg.mouse.move(*scr(cx+20,cy),steps=4); pg.mouse.up(); pg.wait_for_timeout(30)
    ok('Viewport travada: zoom e pan no MSPACE não mudam a vista',near(E("curViewport().k"),k0) and E("S.mspace")!=None)
    pg.keyboard.press('Escape')
    pg.select_option('#lc-scale','0.01'); pg.wait_for_timeout(30)
    ok('Viewport travada: a barra de escala não muda a escala',near(E("curViewport().k"),k0))
    E("()=>{S.sel=[curViewport().id];updSelInfo();}")
    pg.locator('#selinfo .geo-row', has_text='Escala travada').locator('input').uncheck(); pg.wait_for_timeout(30)
    pg.select_option('#lc-scale','0.01'); pg.wait_for_timeout(30)
    ok('Destravar pelas propriedades libera a escala',E("curViewport().lock")==False and near(E("vpRatio(curViewport())"),0.01))
    # ── congelar camada por viewport
    fresh(); typ('MV'); typ('2'); typ('')
    E("()=>{var vs=S.ents.filter(e=>e.tp==='viewport');S.sel=[vs[0].id];updSelInfo();}")
    pg.locator('#lylist .lyrow[data-id="1"] .vpfz').click(); pg.wait_for_timeout(40)
    v=VPS(); ok('❄ congela a camada só na viewport selecionada',v[0].get('frz')==[1] and not v[1].get('frz'),[(x.get('frz')) for x in v])
    def dark_at(i,mx,my):
        return E(f"(()=>{{var cv=renderSheet(4),c=cv.getContext('2d'),v=S.ents.filter(e=>e.tp==='viewport')[{i}],p=vpModelToPaper(v,{mx},{my}),x=Math.round(p.x*4),y=Math.round(cv.height-p.y*4),d=c.getImageData(x-1,y-1,3,3).data,m=255;for(var k=0;k<d.length;k+=4)m=Math.min(m,d[k]);return m;}})()")
    ok('Impressão: camada congelada some só daquela viewport',dark_at(0,2500,1000)>200 and dark_at(1,2500,1000)<100,(dark_at(0,2500,1000),dark_at(1,2500,1000)))
    # ── camada que não imprime
    pg.locator('#lylist .lyrow[data-id="1"] .lyico', has_text='🖨').click(); pg.wait_for_timeout(30)
    ok('🖨 marca a camada como "não imprime"',E("getLy(1).plot")==False)
    ok('Camada que não imprime fica fora da impressão (nas duas viewports)',dark_at(1,2500,1000)>200)
    ok('…mas continua visível na tela',E("getLy(1).vis")==True)
    bd=E("(()=>{var cv=renderSheet(4),c=cv.getContext('2d'),v=S.ents.filter(e=>e.tp==='viewport')[1],x=Math.round((v.x+v.w/2)*4),y=Math.round(cv.height-(v.y)*4),d=c.getImageData(x-1,y-2,3,5).data,m=255;for(var k=0;k<d.length;k+=4)m=Math.min(m,d[k]);return m;})()")
    ok('Borda da viewport (camada VIEWPORTS) não sai na impressão',bd>200,bd)
    E("togPlot(S.layers.find(l=>l.nm==='VIEWPORTS').id)")
    bd2=E("(()=>{var cv=renderSheet(4),c=cv.getContext('2d'),v=S.ents.filter(e=>e.tp==='viewport')[1],x=Math.round((v.x+v.w/2)*4),y=Math.round(cv.height-(v.y)*4),d=c.getImageData(x-1,y-2,3,5).data,m=255;for(var k=0;k<d.length;k+=4)m=Math.min(m,d[k]);return m;})()")
    ok('Com a camada VIEWPORTS imprimindo, a borda sai',bd2<180,bd2)
    # ── DXF e arquivo
    import ezdxf
    f=os.path.join(HERE,'_l2.dxf'); open(f,'wb').write(bytes(E("Array.from(cp1252Encode(buildDXF2000({})))")))
    d=ezdxf.readfile(f); os.remove(f); ln=[l for l in d.layers if l.dxf.name=='Construcao']
    ok('DXF: camada "não imprime" com o indicador de plotagem desligado',ln and ln[0].dxf.plot==0)
    doc=json.loads(E("()=>{let b=null;const o=URL.createObjectURL;URL.createObjectURL=x=>{b=x;return 'blob:x'};try{saveDoc();}finally{URL.createObjectURL=o;}return b.text();}"))
    allv=[e for L in doc['layouts'] for e in L['ents'] if e['tp']=='viewport']
    ok('Arquivo guarda forma poligonal, trava e camadas congeladas',any(e.get('clip') for e in allv) and any(e.get('frz') for e in allv) and any(l.get('plot') is False for l in doc['layers']))
    # ── migração de viewports antigas (camada 0)
    E("()=>{var L=newLayoutObj('Antigo','A4',true);L._init=true;L.ents=[{id:'vx',tp:'viewport',x:30,y:20,w:100,h:80,cx:0,cy:0,k:.1,ly:0}];S.layouts.push(L);switchSpace(L.id);}")
    ok('Viewport de arquivo antigo vai para a camada VIEWPORTS',E("S.ents[0].ly")==E("S.layers.find(l=>l.nm==='VIEWPORTS').id"))
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
fails=[n for n,c in R if not c]; print(f'\n{len(R)-len(fails)}/{len(R)} testes OK'); sys.exit(1 if fails else 0)
