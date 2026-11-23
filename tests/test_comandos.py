# Testes do motor de comandos da v7.0 (ERASE, MOVE, COPY, ROTATE, SCALE, MIRROR, OFFSET, CHAMFER e aliases),
# com mouse e teclado reais no Chromium.
# Uso: pip install playwright && playwright install chromium && python tests/test_comandos.py
import sys, os, math
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__))
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(HERE,'..','index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
def near(a,b,t=1e-6): return abs(a-b)<t
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':850})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)+' | '+(e.stack or '').split('\n')[1:3].__str__())); pg.on('dialog',lambda d:d.accept())
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
    def blur(): E("document.activeElement.blur()")
    def typ(t,key='Enter'): blur(); pg.keyboard.type(t); pg.keyboard.press(key); pg.wait_for_timeout(30)
    def reset():
        E("()=>{S.ents=[];S.sel=[];S.grip=null;S.ds=null;resetHistory();setTool('select');S.modes.snap=false;S.vp={x:Math.round(S.cD.width/2)-200,y:Math.round(S.cD.height/2)+150,sc:4};renderAll();}")
    def L(): return E("S.ents.map(e=>Object.assign({},e))")
    def line(x1,y1,x2,y2): E(f"addE({{tp:'line',x1:{x1},y1:{y1},x2:{x2},y2:{y2}}})")
    # ── digitação vai para a linha de comando; Espaço executa
    reset()
    blur(); pg.keyboard.type('L'); ok('Letra digitada no desenho vai para a linha de comando',E("document.getElementById('cmdinput').value")=='L' and E("S.tool")=='select')
    pg.keyboard.press(' '); pg.wait_for_timeout(30); ok('Espaço executa o comando (LINE)',E("S.tool")=='line')
    pg.keyboard.press('Escape')
    for alias,tool in [('EL','ellipse'),('REC','rectangle'),('CP','copy'),('DLI','dim'),('DAN','dima')]:
        reset(); typ(alias); ok(f'Alias {alias} → {tool}',E("S.tool")==tool,E("S.tool")); pg.keyboard.press('Escape')
    reset(); typ('D'); ok('D abre o DIMSTYLE (como no AutoCAD)',E("document.getElementById('ov-dimstyle').classList.contains('show')")); E("closeOv('ov-dimstyle')")
    reset(); typ('S'); ok('S inicia o STRETCH (v7.1)',E("S.tool")=='stretch'); pg.keyboard.press('Escape')
    # ── ERASE
    reset(); line(0,0,20,0); line(0,10,20,10); E("S.sel=[S.ents[0].id]")
    typ('E'); ok('E com pré-seleção apaga direto',len(L())==1)
    typ('E'); ok('E sem seleção pede objetos',E("S.ds&&S.ds.phase")=='sel')
    click(10,10); typ(''); ok('Clique + Enter apaga o objeto',len(L())==0 and E("S.tool")=='select')
    # ── MOVE: seleção por janela e cruzando dentro do comando
    reset(); line(0,0,20,0); line(30,0,50,0); line(10,-5,10,5)
    typ('M'); ok('MOVE pede "Selecione objetos"',E("S.ds.phase")=='sel')
    click(-5,-8); click(25,8)
    ok('Janela (esquerda→direita) pega só o que está dentro',sorted(E("S.ds.ids.map(id=>findE(id).x1)"))==[0,10],E("S.ds.ids.length"))
    click(45,8,shift=True)
    click(28,3); click(-3,-3) if False else None
    ok('Shift+clique fora não altera',E("S.ds.ids.length")==2)
    typ('')
    ok('Enter conclui a seleção e pede o ponto base',E("S.ds.phase")=='base')
    click(0,0); typ('@10,5')
    e=L(); ok('MOVE com @dx,dy',near(e[0]['x1'],10) and near(e[0]['y1'],5) and near(e[2]['x1'],20) and near(e[1]['x1'],30))
    E("undo()"); ok('MOVE desfeito em um passo',near(L()[0]['x1'],0) and near(L()[2]['x1'],10))
    reset(); line(0,0,20,0); line(30,0,50,0)
    typ('M'); click(55,8); click(25,-3)
    ok('Cruzando (direita→esquerda) pega o que toca a janela',E("S.ds.ids.length")==1 and E("findE(S.ds.ids[0]).x1")==30)
    typ(''); typ(''); typ('5,5')
    ok('Opção Deslocamento (Enter no ponto base)',near(L()[1]['x1'],35) and near(L()[1]['y1'],5))
    # ── COPY múltiplo, Desfazer e Matriz
    reset(); line(0,0,10,0); E("S.sel=[S.ents[0].id]")
    typ('CO'); ok('COPY com pré-seleção pede o ponto base',E("S.ds.phase")=='base')
    click(0,0); click(20,0); click(40,0); ok('Cópias múltiplas',len(L())==3 and E("S.tool")=='copy')
    typ('U'); ok('U desfaz só a última cópia',len(L())==2)
    typ('M'); typ('4'); click(0,10)
    ok('Matriz: 4 itens com espaçamento pelo 2º ponto',len(L())==5 and near(L()[4]['y1'],30),[x['y1'] for x in L()])
    typ(''); ok('Enter encerra o COPY',E("S.tool")=='select')
    # ── ROTATE
    reset(); line(0,0,20,0); E("S.sel=[S.ents[0].id]")
    typ('RO'); click(0,0); typ('90')
    e=L()[0]; ok('ROTATE com ângulo digitado',near(e['x2'],0) and near(e['y2'],20))
    reset(); line(0,0,20,0); E("S.sel=[S.ents[0].id]")
    typ('RO'); click(0,0); typ('C'); typ('45'); ok('ROTATE Cópia mantém o original',len(L())==2 and near(L()[0]['y2'],0))
    reset(); line(0,0,10,10); E("S.sel=[S.ents[0].id]")
    typ('RO'); click(0,0); typ('R'); click(0,0); click(10,10); typ('0')
    e=L()[0]; ok('ROTATE Referência (alinha a linha inclinada com 0°)',near(e['y2'],0) and near(e['x2'],math.hypot(10,10)),e)
    # ── SCALE
    reset(); line(0,0,10,0); E("S.sel=[S.ents[0].id]")
    typ('SC'); click(0,0); typ('2'); ok('SCALE com fator digitado',near(L()[0]['x2'],20))
    reset(); line(0,0,10,0); E("S.sel=[S.ents[0].id]")
    typ('SC'); click(0,0); typ('R'); typ('10'); typ('25'); ok('SCALE Referência: 10 → 25',near(L()[0]['x2'],25))
    # ── MIRROR
    reset(); line(10,0,20,10); E("S.sel=[S.ents[0].id]")
    typ('MI'); click(0,-10); click(0,10); typ('')
    e=L(); ok('MIRROR mantém o original por padrão (Não)',len(e)==2 and near(e[1]['x1'],-10) and near(e[1]['x2'],-20))
    reset(); line(10,0,20,10); E("S.sel=[S.ents[0].id]")
    typ('MI'); click(0,-10); click(0,10); typ('S'); ok('MIRROR com "Sim" apaga o original',len(L())==1 and near(L()[0]['x1'],-10))
    # ── OFFSET
    reset(); line(0,0,40,0)
    typ('O'); ok('OFFSET pede a distância [Através/apaGar/Camada]',E("S.ds.phase")=='dist')
    typ('5'); click(20,0); click(20,8)
    e=L(); ok('OFFSET com distância e lado',len(e)==2 and near(e[1]['y1'],5))
    ok('Continua pedindo objeto',E("S.ds.phase")=='pick')
    click(20,5); typ('M'); click(20,9); click(20,12)
    ok('Opção Múltiplo encadeia deslocamentos',len(L())==4 and near(L()[3]['y1'],15),[x['y1'] for x in L()])
    typ(''); ok('Enter encerra o OFFSET',E("S.tool")=='select')
    reset(); line(0,0,40,0); E("addE({tp:'circ',cx:80,cy:0,r:10})")
    typ('O'); typ('A'); click(20,0); click(20,13)
    ok('OFFSET Através (ponto de passagem)',near(L()[2]['y1'],13))
    click(90,0); click(80,25); c=[x for x in L() if x['tp']=='circ']
    ok('OFFSET Através em círculo',len(c)==2 and near(c[1]['r'],25))
    typ('')
    reset(); line(0,0,40,0); typ('O'); typ('G'); typ('S'); typ('3'); click(20,0); click(20,5)
    ok('OFFSET apaGar origem',len(L())==1 and near(L()[0]['y1'],3)); typ('')
    E("()=>{S.offErase=false;}")
    # ── CHAMFER
    reset(); line(0,0,50,0); line(50,0,50,40)
    typ('CHA'); typ('D'); typ('5'); typ('10'); click(20,0); click(50,30)
    e=L(); ch=e[2]
    ok('CHAMFER com distâncias 5 e 10',len(e)==3 and near(max(e[0]['x1'],e[0]['x2']),45) and near(min(e[1]['y1'],e[1]['y2']),10) and near(min(ch['x1'],ch['x2']),45) and near(max(ch['y1'],ch['y2']),10),e)
    reset(); line(0,0,50,0); line(50,0,50,40)
    typ('CHA'); typ('A'); typ('10'); typ('45'); click(20,0); click(50,30)
    e=L(); ok('CHAMFER por Ângulo (10 e 45°)',near(max(e[0]['x1'],e[0]['x2']),40) and near(min(e[1]['y1'],e[1]['y2']),10,1e-9),[(x['x1'],x['y1'],x['x2'],x['y2']) for x in e])
    reset(); line(0,0,45,0); line(50,5,50,40); E("()=>{S.chamMethod='dist';}")
    typ('CHA'); click(20,0); click(50,30,shift=True)
    e=L(); ok('CHAMFER Shift+clique: canto vivo',len(e)==2 and near(max(e[0]['x1'],e[0]['x2']),50) and near(min(e[1]['y1'],e[1]['y2']),0),e)
    reset(); E("()=>{addE({tp:'rect',x:0,y:0,w:60,h:40});S.chamD1=5;S.chamD2=5;S.chamMethod='dist';}")
    typ('CHA'); typ('P'); click(30,0)
    e=L(); ok('CHAMFER Polilinha: 4 cantos, continua uma única polilinha (v7.1)',len(e)==1 and e[0]['tp']=='pl' and len(e[0]['pts'])==9,len(e))
    reset(); E("addE({tp:'circ',cx:0,cy:0,r:10})"); line(-20,20,20,20)
    typ('CHA'); click(10,0); ok('CHAMFER recusa círculo',E("S.ds.phase")=='first'); pg.keyboard.press('Escape')
    # ── Esc cancela
    reset(); line(0,0,10,0); E("S.sel=[S.ents[0].id]"); typ('M'); click(0,0)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(30)
    ok('Esc cancela o comando sem alterar',E("S.tool")=='select' and near(L()[0]['x1'],0))
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
f=[n for n,c in R if not c]; print(f'\n{len(R)-len(f)}/{len(R)} testes OK'); sys.exit(1 if f else 0)
