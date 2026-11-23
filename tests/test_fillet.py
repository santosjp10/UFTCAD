# Testes do comando FILLET no estilo AutoCAD (v6.7), com mouse e teclado reais no Chromium.
# Uso: pip install playwright && playwright install chromium && python tests/test_fillet.py
import sys, os, math, json
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
    def blur(): E("document.activeElement.blur()")
    def typ(t):  # digita no desenho (vai para a linha de comando) e confirma
        blur(); pg.keyboard.type(t); pg.keyboard.press('Enter'); pg.wait_for_timeout(30)
    def reset(r=10,trim=True):
        E(f"()=>{{S.ents=[];S.sel=[];S.grip=null;S.ds=null;resetHistory();setTool('select');S.vp={{x:Math.round(S.cD.width/2)-200,y:Math.round(S.cD.height/2)+150,sc:4}};S.filletR={r};S.filletTrim={'true' if trim else 'false'};renderAll();}}")
    def L(): return E("S.ents.map(e=>Object.assign({},e))")
    def corner():
        E("()=>{addE({tp:'line',x1:0,y1:0,x2:100,y2:0});addE({tp:'line',x1:100,y1:0,x2:100,y2:80});}")
    # ── prompts e fluxo
    reset(); corner()
    pg.click('#cmdinput'); pg.keyboard.type('F'); pg.keyboard.press('Enter'); pg.wait_for_timeout(50)
    ok('F inicia FILLET com o prompt do AutoCAD','primeiro objeto ou [Desfazer/Polilinha/Raio/Aparar/Múltiplo]' in E("document.getElementById('cmdinput').placeholder||''") or E("S.ds&&S.ds.phase")=='first',E("S.ds&&S.ds.phase"))
    click(20,0); ok('1º objeto selecionado, pede o 2º',E("S.ds.phase")=='second')
    pg.mouse.move(*scr(100,60)); pg.wait_for_timeout(50)
    ok('Pré-visualização ao passar sobre o 2º objeto',E("(()=>{var h=filletHit({x:100,y:60});return !!h&&!filletCompute(S.ds.e1,h,S.filletR).err;})()"))
    click(100,60); e=L()
    ok('Concordância R=10 entre linhas: apara e cria arco tangente',len(e)==3 and near(e[0]['x2'],90) and near(e[1]['y1'],10) and e[2]['tp']=='arc' and near(e[2]['r'],10) and near(e[2]['cx'],90) and near(e[2]['cy'],10),[(x['tp'],x.get('x2'),x.get('y1')) for x in e])
    ok('Comando termina após uma concordância (sem Múltiplo)',E("S.tool")=='select')
    E("undo()"); ok('Desfeito em um único Ctrl+Z',len(L())==2 and near(L()[0]['x2'],100))
    # ── opção Raio pela linha de comando (letras digitadas no desenho)
    reset(); corner(); E("setTool('fillet')")
    typ('R'); ok('R pede o raio',E("S.ds.phase")=='radius')
    typ('15'); ok('Raio definido e volta ao 1º objeto',near(E("S.filletR"),15) and E("S.ds.phase")=='first')
    click(20,0); click(100,60); ok('Usa o novo raio',near(L()[2]['r'],15))
    E("setTool('fillet')"); ok('Raio é lembrado na próxima execução',near(E("S.filletR"),15)); E("cancelTool()")
    # ── canto vivo com Shift
    reset(); E("()=>{addE({tp:'line',x1:0,y1:0,x2:90,y2:0});addE({tp:'line',x1:100,y1:10,x2:100,y2:80});setTool('fillet');}")
    click(20,0); click(100,60,shift=True); e=L()
    ok('Shift+clique: canto vivo (estende as duas linhas)',len(e)==2 and near(e[0]['x2'],100) and near(e[1]['y1'],0),e)
    # ── raio 0 em linhas que se cruzam: mantém os lados clicados
    reset(0); E("()=>{addE({tp:'line',x1:0,y1:50,x2:100,y2:50});addE({tp:'line',x1:50,y1:0,x2:50,y2:100});setTool('fillet');}")
    click(80,50); click(50,90); e=L()
    ok('Raio 0: apara no cruzamento mantendo os lados clicados',near(e[0]['x1'],50) and near(e[0]['x2'],100) and near(e[1]['y1'],50) and near(e[1]['y2'],100),e)
    # ── Múltiplo + Desfazer
    reset(5); E("()=>{addE({tp:'line',x1:0,y1:0,x2:100,y2:0});addE({tp:'line',x1:100,y1:0,x2:100,y2:80});addE({tp:'line',x1:100,y1:80,x2:0,y2:80});setTool('fillet');}")
    typ('M'); click(20,0); click(100,30)
    ok('Múltiplo: continua no comando',E("S.tool")=='fillet' and E("S.ds.phase")=='first' and len(L())==4)
    click(100,50); click(50,80); ok('Segunda concordância no modo múltiplo',len(L())==5)
    typ('U'); ok('U desfaz só a última concordância',len(L())==4)
    blur(); pg.keyboard.press('Enter'); pg.wait_for_timeout(30)
    ok('Enter encerra o modo múltiplo',E("S.tool")=='select')
    # ── Não aparar
    reset(10); corner(); E("setTool('fillet')"); typ('T'); typ('N')
    ok('Modo Não aparar',E("S.filletTrim")==False)
    click(20,0); click(100,60); e=L()
    ok('Sem aparar: linhas intactas e arco criado',len(e)==3 and near(e[0]['x2'],100) and near(e[1]['y1'],0) and e[2]['tp']=='arc')
    # ── linha + arco e linha + círculo
    reset(5); E("()=>{addE({tp:'line',x1:-50,y1:0,x2:50,y2:0});addE({tp:'circ',cx:0,cy:30,r:20});setTool('fillet');}")
    click(40,0); click(18,21.0); e=L()
    a=[x for x in e if x['tp']=='arc']
    ok('Linha + círculo: arco tangente aos dois',len(a)==1 and near(a[0]['r'],5) and near(a[0]['cy'],5) and near(math.hypot(a[0]['cx'],a[0]['cy']-30),25),a)
    ok('Círculo não é aparado (como no AutoCAD)',[x for x in e if x['tp']=='circ'][0]['r']==20)
    reset(5); E("()=>{addE({tp:'line',x1:-50,y1:0,x2:50,y2:0});addE({tp:'arc',cx:0,cy:30,r:20,sa:-Math.PI/2-1.2,ea:-Math.PI/2+1.2});setTool('fillet');}")
    s1=E("[S.ents[1].sa,S.ents[1].ea]")
    click(40,0); pt=E("[0+20*Math.cos(-Math.PI/2+0.8),30+20*Math.sin(-Math.PI/2+0.8)]"); click(pt[0],pt[1]); e=L()
    arcs=[x for x in e if x['tp']=='arc']
    ok('Linha + arco: arco original aparado e concordância criada',len(arcs)==2 and not (near(arcs[0]['sa'],s1[0]) and near(arcs[0]['ea'],s1[1])))
    # ── linhas paralelas
    reset(3); E("()=>{addE({tp:'line',x1:0,y1:0,x2:100,y2:0});addE({tp:'line',x1:0,y1:20,x2:80,y2:20});setTool('fillet');}")
    click(90,0); click(60,20); e=L()
    a=[x for x in e if x['tp']=='arc']
    ok('Linhas paralelas: semicírculo de diâmetro igual à distância',len(a)==1 and near(a[0]['r'],10) and near(a[0]['cx'],100) and near(a[0]['cy'],10) and near(e[1]['x2'],100),(a,e[1]))
    # ── retângulo: segmentos do mesmo objeto e opção Polilinha
    reset(5); E("()=>{addE({tp:'rect',x:0,y:0,w:60,h:40});setTool('fillet');}")
    click(30,0); click(60,20); e=L()
    ok('Dois lados do mesmo retângulo: continua uma única polilinha com 1 arco (v7.1)',len(e)==1 and e[0]['tp']=='pl' and sum(1 for p in e[0]['pts'] if p.get('b'))==1 and len(e[0]['pts'])==6,e)
    reset(5); E("()=>{addE({tp:'rect',x:0,y:0,w:60,h:40});setTool('fillet');}")
    typ('P'); click(30,0); e=L()
    a=[p for p in e[0]['pts'] if p.get('b')] if len(e)==1 else []
    ok('Opção Polilinha concorda os 4 cantos mantendo um único objeto (v7.1)',len(e)==1 and len(a)==4 and all(near(abs(x['b']),math.tan(math.pi/8)) for x in a) and E("S.tool")=='select',len(a))
    reset(50); E("()=>{addE({tp:'pl',closed:false,pts:[{x:0,y:0},{x:30,y:0},{x:30,y:30}]});setTool('fillet');}")
    typ('P'); click(15,0)
    ok('Polilinha: segmentos curtos demais são informados',len([x for x in L() if x['tp']=='arc'])==0)
    # ── erros
    reset(200); corner(); E("setTool('fillet')"); click(20,0); click(100,60)
    ok('Raio muito grande: avisa e não altera',len(L())==2 and near(L()[0]['x2'],100) and E("S.ds&&S.ds.phase")=='second')
    E("cancelTool()")
    reset(5); E("()=>{addE({tp:'line',x1:0,y1:0,x2:100,y2:0});setTool('fillet');}"); click(20,0); click(60,0)
    ok('Mesmo objeto duas vezes é recusado',len(L())==1)
    E("cancelTool()")
    # ── raio por dois pontos
    reset(5); corner(); E("setTool('fillet')"); typ('R'); click(0,40); click(0,55)
    ok('Raio definido por dois pontos',near(E("S.filletR"),15),E("S.filletR"))
    E("cancelTool()")
    # ── EXPLODE
    reset(); E("()=>{addE({tp:'rect',x:0,y:0,w:20,h:10});S.sel=[S.ents[0].id];}")
    pg.click('#cmdinput'); pg.keyboard.type('X'); pg.keyboard.press('Enter')
    ok('X (EXPLODE) converte retângulo em 4 linhas',[x['tp'] for x in L()]==['line']*4)
    # ── persistência
    doc=json.loads(E("()=>{let b=null;const o=URL.createObjectURL;URL.createObjectURL=x=>{b=x;return 'blob:x'};try{saveDoc();}finally{URL.createObjectURL=o;}return b.text();}"))
    ok('Raio e modo de aparar são salvos no arquivo','filletR' in doc and 'filletTrim' in doc)
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
f=[n for n,c in R if not c]; print(f'\n{len(R)-len(f)}/{len(R)} testes OK'); sys.exit(1 if f else 0)
