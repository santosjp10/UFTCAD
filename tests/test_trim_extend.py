# Testes de TRIM e EXTEND no estilo do AutoCAD 2021+ (v6.8), com mouse e teclado reais no Chromium.
# Uso: pip install playwright && playwright install chromium && python tests/test_trim_extend.py
import sys, os
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__))
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(HERE,'..','index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
def near(a,b,t=1e-6): return abs(a-b)<t
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':850})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.goto('file://'+path); pg.wait_for_timeout(400); E=pg.evaluate
    box=pg.locator('#cw').bounding_box()
    def scr(x,y):
        s=E(f"w2s({x},{y})"); return box['x']+s['x'], box['y']+s['y']
    def click(x,y,shift=False):
        pg.mouse.move(*scr(x,y))
        if shift: pg.keyboard.down('Shift')
        pg.mouse.click(*scr(x,y))
        if shift: pg.keyboard.up('Shift')
        pg.wait_for_timeout(30)
    def drag(pts):
        pg.mouse.move(*scr(*pts[0])); pg.mouse.down()
        for q in pts[1:]: pg.mouse.move(*scr(*q),steps=6)
        pg.mouse.up(); pg.wait_for_timeout(40)
    def blur(): E("document.activeElement.blur()")
    def typ(t): blur(); pg.keyboard.type(t); pg.keyboard.press('Enter'); pg.wait_for_timeout(30)
    def reset(mode='quick'):
        E(f"()=>{{S.ents=[];S.sel=[];S.grip=null;S.ds=null;resetHistory();setTool('select');S.teMode='{mode}';S.vp={{x:Math.round(S.cD.width/2)-200,y:Math.round(S.cD.height/2)+150,sc:4}};renderAll();}}")
    def L(): return E("S.ents.map(e=>Object.assign({},e))")
    def cross():  # horizontal cortada por duas verticais
        E("()=>{addE({tp:'line',x1:0,y1:0,x2:100,y2:0});addE({tp:'line',x1:30,y1:-20,x2:30,y2:20});addE({tp:'line',x1:70,y1:-20,x2:70,y2:20});}")
    # ── TRIM rápido: sem selecionar arestas
    reset(); cross()
    pg.click('#cmdinput'); pg.keyboard.type('TR'); pg.keyboard.press('Enter'); pg.wait_for_timeout(50)
    ok('TR inicia direto em "Selecione o objeto a aparar" (modo Rápido)',E("S.tool")=='trim' and E("S.ds.phase")=='main' and E("S.ds.mode")=='quick')
    pg.mouse.move(*scr(50,0)); pg.wait_for_timeout(60)
    ok('Pré-visualização do trecho a remover',E("!!TE_CACHE.res"))
    click(50,0); e=L(); hs=sorted([(x['x1'],x['x2']) for x in e if x['y1']==0 and x['y2']==0])
    ok('Clique remove só o trecho entre as duas arestas',hs==[(0,30),(70,100)],hs)
    ok('Continua no comando após aparar',E("S.tool")=='trim')
    click(85,0); hs=sorted([(x['x1'],x['x2']) for x in L() if x['y1']==0 and x['y2']==0])
    ok('Ponta livre aparada até a aresta',hs==[(0,30)],hs)
    typ('U'); hs=sorted([(x['x1'],x['x2']) for x in L() if x['y1']==0 and x['y2']==0])
    ok('U desfaz a última operação dentro do comando',hs==[(0,30),(70,100)],hs)
    # ── objeto sem interseções é apagado (modo Rápido)
    E("()=>{addE({tp:'line',x1:0,y1:50,x2:40,y2:50});}"); n=len(L())
    click(20,50); ok('Objeto sem interseções é apagado (modo Rápido)',len(L())==n-1)
    # ── cerca à mão livre
    reset(); E("()=>{for(var i=0;i<5;i++)addE({tp:'line',x1:i*10,y1:0,x2:i*10,y2:40});addE({tp:'line',x1:-10,y1:20,x2:50,y2:20});setTool('trim');}")
    drag([(-5,35),(15,33),(45,35)])
    vs=[x for x in L() if x['x1']==x['x2']]
    ok('Arrastar (cerca) apara todos os objetos cruzados de uma vez',len(vs)==5 and all(max(x['y1'],x['y2'])<=20+1e-9 for x in vs),[(x['y1'],x['y2']) for x in vs])
    E("undo()"); vs=[x for x in L() if x['x1']==x['x2']]
    ok('Cerca desfeita em um único Ctrl+Z',all(max(x['y1'],x['y2'])==40 for x in vs))
    E("setTool('trim')")
    # ── janela Cruzando (clique em área vazia + canto oposto)
    click(-3,28); ok('Clique em área vazia inicia janela Cruzando',E("S.ds.phase")=='crossing')
    click(43,38); vs=[x for x in L() if x['x1']==x['x2']]
    ok('Janela Cruzando apara os objetos que ela cruza',all(max(x['y1'],x['y2'])<=20+1e-9 for x in vs))
    # ── Shift inverte (TRIM → EXTEND)
    reset(); E("()=>{addE({tp:'line',x1:0,y1:0,x2:50,y2:0});addE({tp:'line',x1:80,y1:-20,x2:80,y2:20});setTool('trim');}")
    click(45,0,shift=True); e=L()
    ok('Shift+clique no TRIM estende até a aresta',near(e[0]['x2'],80),e[0])
    # ── círculo e arco
    reset(); E("()=>{addE({tp:'circ',cx:0,cy:0,r:20});addE({tp:'line',x1:-30,y1:0,x2:30,y2:0});setTool('trim');}")
    click(0,20); e=L(); a=[x for x in e if x['tp']=='arc']
    ok('Círculo aparado vira arco (parte de baixo mantida)',len(a)==1 and near(a[0]['r'],20) and not any(x['tp']=='circ' for x in e))
    # ── EXTEND rápido
    reset(); E("()=>{addE({tp:'line',x1:0,y1:0,x2:40,y2:0});addE({tp:'line',x1:60,y1:-20,x2:60,y2:20});addE({tp:'line',x1:90,y1:-20,x2:90,y2:20});}")
    pg.click('#cmdinput'); pg.keyboard.type('EX'); pg.keyboard.press('Enter'); pg.wait_for_timeout(50)
    ok('EX inicia direto em "Selecione o objeto a estender"',E("S.tool")=='extend' and E("S.ds.phase")=='main')
    click(35,0); ok('Estende até a aresta mais próxima',near(L()[0]['x2'],60))
    click(55,0); ok('Clique de novo estende até a próxima aresta',near(L()[0]['x2'],90))
    click(85,0,shift=True); ok('Shift+clique no EXTEND apara',near(L()[0]['x2'],60) or near(L()[0]['x2'],90) and False,L()[0])
    reset(); E("()=>{for(var i=0;i<4;i++)addE({tp:'line',x1:i*10,y1:0,x2:i*10,y2:20});addE({tp:'line',x1:-10,y1:40,x2:50,y2:40});setTool('extend');}")
    drag([(-5,15),(35,15)])
    ok('Cerca no EXTEND estende todos os cruzados',all(max(x['y1'],x['y2'])==40 for x in L() if x['x1']==x['x2']))
    # ── modo Padrão (arestas selecionadas)
    reset(); cross(); E("setTool('trim')")
    typ('O'); typ('P'); ok('mOdo Padrão pede as arestas de corte',E("S.ds.phase")=='edges' and E("S.teMode")=='standard')
    click(30,15); typ('')
    click(85,0); hs=sorted([(x['x1'],x['x2']) for x in L() if x['y1']==0 and x['y2']==0])
    ok('Modo Padrão usa só a aresta escolhida',hs==[(0,30)],hs)
    E("setTool('select')"); E("setTool('trim')"); ok('Modo escolhido é lembrado',E("S.ds.phase")=='edges'); typ('O'); typ('R')
    ok('Volta ao modo Rápido',E("S.teMode")=='quick' and E("S.ds.phase")=='main')
    # ── apagaR
    reset(); cross(); E("setTool('trim')"); typ('R'); click(30,10); typ('')
    ok('Opção apagaR remove objetos sem sair do TRIM',len(L())==2 and E("S.ds.phase")=='main')
    # ── Enter encerra
    blur(); pg.keyboard.press('Enter'); pg.wait_for_timeout(30)
    ok('Enter encerra o comando',E("S.tool")=='select')
    # ── objetos em camada bloqueada não são alterados
    reset(); cross(); E("()=>{S.layers.push({id:9,nm:'Trava',col:'#fff',vis:true,lock:true,ld:'solid',lw:.5});S.ents[0].ly=9;setTool('trim');}")
    click(50,0); ok('Camada bloqueada protege o objeto',len(L())==3)
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
f=[n for n,c in R if not c]; print(f'\n{len(R)-len(f)}/{len(R)} testes OK'); sys.exit(1 if f else 0)
