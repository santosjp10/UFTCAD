# Testes das cotas em série (DIMCONTINUE / DCO) e de base (DIMBASELINE / DBA) — v8.0, R6 do parecer.
# Mouse e teclado reais no Chromium; o DXF é conferido com o ezdxf.
# Uso: pip install playwright ezdxf && playwright install chromium && python tests/test_cotas_serie.py
import sys, os
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
def near(a,b,t=1e-6): return abs(a-b)<t
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':850})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.goto('file://'+path); pg.wait_for_timeout(500); E=pg.evaluate
    if E("document.getElementById('ov-recover').classList.contains('show')"): E("closeOv('ov-recover')")
    box=pg.locator('#cw').bounding_box()
    def scr(x,y): s=E(f"w2s({x},{y})"); return box['x']+s['x'],box['y']+s['y']
    def click(x,y): pg.mouse.move(*scr(x,y)); pg.mouse.click(*scr(x,y)); pg.wait_for_timeout(30)
    def blur(): E("document.activeElement.blur()")
    def typ(t): blur(); pg.keyboard.type(t); pg.keyboard.press('Enter'); pg.wait_for_timeout(30)
    def reset(style='Standard'):
        E(f"()=>{{S.ents=[];S.sel=[];S.ds=null;resetHistory();setTool('select');S.modes.snap=false;S.dimCurrent='{style}';S.vp={{x:Math.round(S.W/2)-250,y:Math.round(S.H/2)+80,sc:4}};renderAll();}}")
    def D(): return E("S.ents.filter(e=>e.tp==='dim').map(e=>{var g=dimLinePoints(e);return {x1:e.x1,y1:e.y1,x2:e.x2,y2:e.y2,dir:e.dimDir,st:e.subtp,ly:e.ly,sty:e.dimStyle,m:dimMeasure(e),d1x:g.d1x,d1y:g.d1y,d2x:g.d2x,d2y:g.d2y};})")
    def base_dim(): # cota linear horizontal 0→30, linha de cota em y=-10 (clicada pelo DLI)
        typ('DLI'); click(0,0); click(30,0); click(15,-10)
    # ── DCO
    reset(); base_dim()
    ok('Cota de partida criada pelo DLI',len(D())==1 and near(D()[0]['m'],30))
    typ('DCO'); ok('DCO parte da última cota e pede a próxima origem',E("S.tool")=='dimcontinue' and E("S.ds.phase")=='pt')
    pg.mouse.move(*scr(50,0)); pg.wait_for_timeout(40)
    ok('Pré-visualização da próxima cota',E("!!dcNext(S.ds,{x:50,y:0})"))
    click(50,0); click(80,5)
    d=D(); ok('Três cotas em série',len(d)==3,len(d))
    ok('Cada cota começa onde a anterior termina',near(d[1]['x1'],30) and near(d[1]['x2'],50) and near(d[2]['x1'],50) and near(d[2]['x2'],80))
    ok('Medidas 20 e 30 (horizontais, mesmo com o ponto fora da linha)',near(d[1]['m'],20) and near(d[2]['m'],30))
    ok('Todas na mesma linha de cota (y = -10)',all(near(x['d1y'],-10) for x in d))
    ok('Mesma camada, estilo e direção da cota de partida',all(x['ly']==d[0]['ly'] and x['sty']==d[0]['sty'] and x['dir']=='h' for x in d))
    ok('Comando continua ativo',E("S.tool")=='dimcontinue')
    typ('U'); ok('U desfaz só a última cota da série',len(D())==2)
    click(70,0); ok('A série continua da cota anterior após desfazer',near(D()[2]['x1'],50) and near(D()[2]['x2'],70))
    typ(''); ok('Enter encerra',E("S.tool")=='select')
    E("undo()"); ok('Ctrl+Z fora do comando desfaz uma cota por vez',len(D())==2)
    # ── DBA
    reset(); base_dim()
    typ('DBA'); click(50,0); click(80,0)
    d=D(); ok('Três cotas de base',len(d)==3)
    ok('Todas partem da mesma origem (x = 0)',all(near(x['x1'],0) for x in d))
    ok('Medidas 30, 50 e 80',[round(x['m'],6) for x in d]==[30,50,80])
    ok('Cada linha de cota 3,75 mais longe (DIMDLI do estilo Standard)',near(d[1]['d1y'],-13.75) and near(d[2]['d1y'],-17.5),[x['d1y'] for x in d])
    typ('')
    reset('ABNT'); base_dim(); typ('DBA'); click(50,0); typ('')
    d=D(); ok('Estilo ABNT: espaçamento 7',near(d[1]['d1y'],-17),d[1]['d1y'])
    # ── vertical e Selecionar
    reset(); typ('DLI'); click(0,0); click(0,20); click(-10,10)
    typ('DCO'); click(0,45); typ('')
    d=D(); ok('Série vertical',d[1]['dir']=='v' and near(d[1]['y1'],20) and near(d[1]['y2'],45) and near(d[1]['d1x'],-10))
    reset(); base_dim(); E("()=>{addE({tp:'line',x1:0,y1:40,x2:10,y2:40});}")
    typ('DBA'); typ('S'); ok('Opção Selecionar pede a cota de base',E("S.ds.phase")=='pick')
    click(28,-10); click(60,0); typ('')
    d=D(); ok('Selecionar perto da 2ª extensão: a base passa a ser x = 30',near(d[1]['x1'],30) and near(d[1]['x2'],60),d[1])
    # ── cota alinhada em série
    reset(); typ('DAL'); click(0,0); click(30,30); click(10,20)
    typ('DCO'); click(60,60); typ('')
    d=D(); ok('Série de cota alinhada',d[1]['st']=='aligned' and near(d[1]['x1'],30) and near(d[1]['m'],30*2**0.5,1e-6))
    off0=(d[0]['d1x']-0)*(-0.70710678)+(d[0]['d1y']-0)*0.70710678; off1=(d[1]['d1x']-30)*(-0.70710678)+(d[1]['d1y']-30)*0.70710678
    ok('…com o mesmo afastamento da linha de cota',near(off0,off1,1e-6),(off0,off1))
    # ── sem cota
    reset(); typ('DCO'); ok('Sem cota no desenho: pede para selecionar',E("S.ds.phase")=='pick'); pg.keyboard.press('Escape')
    # ── botões, DDIM e DXF
    ok('Botões Contínua (DCO) e De base (DBA) na faixa Cotar',pg.locator('#rb-dimcont').is_visible() and pg.locator('#rb-dimbase').is_visible())
    E("showDimStyle()"); pg.get_by_text('Modificar…').click(); pg.wait_for_timeout(100)
    ok('DDIM > Modificar mostra "Espaçamento da linha de base" (DIMDLI)',E("Array.from(document.querySelectorAll('.ov.show')).some(o=>/Espaçamento da linha de base/.test(o.textContent)&&/DIMDLI/.test(o.textContent))"))
    E("document.querySelectorAll('.ov.show').forEach(o=>o.classList.remove('show'))")
    reset(); base_dim(); typ('DBA'); click(50,0); typ('')
    import ezdxf
    f=os.path.join(HERE,'_dba.dxf'); open(f,'wb').write(bytes(E("Array.from(cp1252Encode(buildDXF2000({})))")))
    dx=ezdxf.readfile(f); os.remove(f)
    ok('DXF: DIMDLI do estilo exportado',near(dx.dimstyles.get('Standard').dxf.dimdli,3.75))
    ok('DXF: as cotas de base saem como DIMENSION',len(dx.modelspace().query('DIMENSION'))==2)
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
fails=[n for n,c in R if not c]; print(f'\n{len(R)-len(fails)}/{len(R)} testes OK'); sys.exit(1 if fails else 0)
