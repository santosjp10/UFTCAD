# Testes do pacote 2 da v7 (v7.1): polilinhas com arcos, PLINE Arco, PEDIT, JOIN, BREAK, STRETCH,
# OFFSET/TRIM/EXPLODE de polilinhas com arcos e exportação. Mouse e teclado reais no Chromium.
# Uso: pip install playwright ezdxf && playwright install chromium && python tests/test_polilinhas.py
import sys, os, math
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__))
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(HERE,'..','index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
def near(a,b,t=1e-6): return abs(a-b)<t
B45=math.tan(math.pi/8)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':850})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.goto('file://'+path); pg.wait_for_timeout(400); E=pg.evaluate
    box=pg.locator('#cw').bounding_box()
    def scr(x,y):
        s=E(f"w2s({x},{y})"); return box['x']+s['x'], box['y']+s['y']
    def click(x,y): pg.mouse.move(*scr(x,y)); pg.mouse.click(*scr(x,y)); pg.wait_for_timeout(30)
    def blur(): E("document.activeElement.blur()")
    def typ(t): blur(); pg.keyboard.type(t); pg.keyboard.press('Enter'); pg.wait_for_timeout(30)
    def reset():
        E("()=>{S.ents=[];S.sel=[];S.grip=null;S.ds=null;resetHistory();setTool('select');S.modes.snap=false;S.vp={x:Math.round(S.cD.width/2)-200,y:Math.round(S.cD.height/2)+150,sc:4};renderAll();}")
    def L(): return E("S.ents.map(e=>JSON.parse(JSON.stringify(e)))")
    ARCPL="addE({tp:'pl',closed:false,pts:[{x:0,y:0},{x:20,y:0,b:%r},{x:40,y:20},{x:40,y:40}]})"%B45
    # ── PLINE com arco tangente
    reset(); typ('PL'); click(0,0); click(20,0); typ('A'); click(40,20); typ('L'); click(40,40); typ('')
    e=L()
    ok('PLINE Arco: arco tangente com bulge correto (90°)',len(e)==1 and e[0]['tp']=='pl' and near(e[0]['pts'][1].get('b',0),B45,1e-9),e[0]['pts'] if e else e)
    ok('Linha depois do arco (opção Linha)',len(e[0]['pts'])==4 and not e[0]['pts'][2].get('b'))
    reset(); typ('PL'); click(0,0); click(30,0); typ('A'); click(30,30); typ('F')
    e=L(); ok('PLINE Fechar em modo arco',len(e)==1 and e[0]['closed'] and len(e[0]['pts'])==4)
    # ── geometria
    reset(); E(ARCPL)
    bb=E("bbox(S.ents[0])"); ok('BBOX considera o arco',near(bb['x']+bb['w'],40) and near(bb['y'],0))
    ok('Clique no meio do arco seleciona',E("hitEnt(S.ents[0],20+20*Math.cos(-Math.PI/4),20+20*Math.sin(-Math.PI/4))"))
    sp=E("snapPts(S.ents[0])"); ok('OSNAP centro e meio do arco',any(q['st']=='cen' and near(q['x'],20) and near(q['y'],20) for q in sp) and any(q['st']=='mid' and near(q['x'],20+20*math.cos(-math.pi/4)) for q in sp))
    E("()=>{S.sel=[S.ents[0].id];updSelInfo();}")
    ln=E("geomFields(S.ents[0]).find(f=>f.l==='Comprimento').v"); ok('Comprimento inclui o arco',near(ln,20+math.pi*10+20,1e-6),ln)
    # ── grip no meio do arco ajusta a curvatura
    E("()=>{S.sel=[S.ents[0].id];renderAll();}")
    mx,my=20+20*math.cos(-math.pi/4),20+20*math.sin(-math.pi/4)
    click(mx,my); click(mx+5,my-5); bv=L()[0]['pts'][1].get('b',0)
    ok('Grip do meio do arco muda o bulge e mantém as pontas',bv>B45 and near(L()[0]['pts'][2]['x'],40),bv)
    pg.keyboard.press('Escape'); pg.keyboard.press('Escape')
    # ── MIRROR inverte o bulge
    reset(); E(ARCPL); E("mirr(S.ents[0],{x:0,y:-50},{x:0,y:50})")
    ok('Espelhar inverte o sentido do arco',near(L()[0]['pts'][1]['b'],-B45,1e-9))
    # ── OFFSET de polilinha com arco
    reset(); E(ARCPL); typ('O'); typ('5'); click(10,0); click(10,3); typ('')
    e=L(); q=e[1]['pts'] if len(e)==2 else []
    ok('OFFSET de polilinha com arco (lado interno)',len(q)==4 and near(q[0]['y'],5) and near(q[1]['x'],20) and near(q[2]['x'],35) and near(q[2]['y'],20) and near(q[3]['x'],35) and q[1].get('b',0)>0,q)
    # ── TRIM de polilinha com arco
    reset(); E(ARCPL); E("addE({tp:'line',x1:30,y1:-10,x2:30,y2:30})")
    typ('TR'); click(10,0); typ('')
    e=[x for x in L() if x['tp']=='pl']
    ok('TRIM remove o trecho até o corte (dentro do arco)',len(e)==1 and near(e[0]['pts'][0]['x'],30) and near(e[0]['pts'][0]['y'],20-math.sqrt(300)) and e[0]['pts'][0].get('b',0)>0,e[0]['pts'][0] if e else e)
    # ── EXPLODE em linhas e arco
    reset(); E(ARCPL); E("S.sel=[S.ents[0].id]"); typ('X')
    ok('EXPLODE gera linha + arco + linha',[x['tp'] for x in L()]==['line','arc','line'])
    # ── BREAK
    reset(); E("addE({tp:'line',x1:0,y1:0,x2:40,y2:0})"); typ('BR'); click(10,0); click(25,0)
    e=sorted([(x['x1'],x['x2']) for x in L()]); ok('BREAK em linha remove o trecho entre os pontos',len(e)==2 and near(e[0][1],10) and near(e[1][0],25),e)
    reset(); E("addE({tp:'line',x1:0,y1:0,x2:40,y2:0})"); typ('BR'); click(10,0); typ('@')
    ok('BREAK no ponto (@) divide em dois',len(L())==2)
    reset(); E("addE({tp:'circ',cx:0,cy:0,r:10})"); typ('BR'); click(10,0); click(0,10)
    e=L(); ok('BREAK em círculo vira arco',len(e)==1 and e[0]['tp']=='arc')
    reset(); E(ARCPL); typ('BR'); click(mx,my); typ('@')
    e=L(); ok('BREAK de polilinha no arco gera duas polilinhas com arcos',len(e)==2 and all(x['tp']=='pl' for x in e) and all(any(p_.get('b') for p_ in x['pts']) for x in e))
    # ── JOIN
    reset(); E("()=>{addE({tp:'line',x1:0,y1:0,x2:20,y2:0});addE({tp:'arc',cx:20,cy:20,r:20,sa:-Math.PI/2,ea:0});addE({tp:'line',x1:40,y1:20,x2:40,y2:40});}")
    typ('J'); typ('TODOS'); typ('')
    e=L(); ok('JOIN linha + arco + linha → polilinha com arco',len(e)==1 and e[0]['tp']=='pl' and near(e[0]['pts'][1].get('b',0),B45,1e-9),e)
    reset(); E("()=>{addE({tp:'line',x1:0,y1:0,x2:10,y2:0});addE({tp:'line',x1:15,y1:0,x2:30,y2:0});}")
    typ('J'); typ('TODOS'); typ('')
    e=L(); ok('JOIN de linhas colineares → uma linha',len(e)==1 and e[0]['tp']=='line' and near(e[0]['x2'],30))
    reset(); E("()=>{addE({tp:'arc',cx:0,cy:0,r:10,sa:0,ea:Math.PI});addE({tp:'arc',cx:0,cy:0,r:10,sa:Math.PI,ea:2*Math.PI});}")
    typ('J'); typ('TODOS'); typ('')
    ok('JOIN de arcos que fecham a volta → círculo',[x['tp'] for x in L()]==['circ'])
    reset(); E("()=>{addE({tp:'line',x1:0,y1:0,x2:20,y2:0});addE({tp:'line',x1:20,y1:0,x2:20,y2:20});addE({tp:'line',x1:20,y1:20,x2:0,y2:0});}")
    typ('J'); typ('TODOS'); typ('')
    e=L(); ok('JOIN fecha a polilinha quando as pontas se encontram',len(e)==1 and e[0]['closed'])
    # ── PEDIT
    reset(); E("()=>{addE({tp:'line',x1:0,y1:0,x2:20,y2:0});addE({tp:'line',x1:20,y1:0,x2:20,y2:20});}")
    typ('PE'); click(10,0); ok('PEDIT em linha pergunta se converte',E("S.ds.phase")=='conv')
    typ(''); ok('Linha convertida em polilinha',L()[0]['tp']=='pl' and E("S.ds.phase")=='opt')
    typ('J'); click(20,10); typ(''); ok('PEDIT Unir adiciona a linha conectada',len(L())==1 and len(L()[0]['pts'])==3)
    typ('F'); ok('PEDIT Fechar',L()[0]['closed'] and len(L()[0]['pts'])==4)
    typ('A'); ok('PEDIT Abrir',not L()[0]['closed'] and len(L()[0]['pts'])==3)
    typ('I'); ok('PEDIT Inverter',near(L()[0]['pts'][0]['x'],20) and near(L()[0]['pts'][0]['y'],20))
    typ(''); ok('Enter encerra o PEDIT',E("S.tool")=='select')
    reset(); E(ARCPL); typ('PE'); click(5,0); typ('D'); typ('')
    ok('PEDIT Decurvar remove os arcos',not any(q_.get('b') for q_ in L()[0]['pts']))
    reset(); E("addE({tp:'rect',x:0,y:0,w:20,h:10})"); typ('PE'); click(10,0)
    ok('PEDIT em retângulo o trata como polilinha',L()[0]['tp']=='pl' and E("S.ds.phase")=='opt'); typ('')
    # ── STRETCH
    reset(); E("()=>{addE({tp:'rect',x:0,y:0,w:40,h:20});addE({tp:'line',x1:0,y1:30,x2:40,y2:30});}")
    typ('S'); click(50,35); click(30,-5); typ(''); click(0,0); click(10,0)
    e=L(); pts=e[0]['pts']
    ok('STRETCH estica só os vértices dentro da janela cruzando',e[0]['tp']=='pl' and near(max(q_['x'] for q_ in pts),50) and near(min(q_['x'] for q_ in pts),0) and near(e[1]['x2'],50) and near(e[1]['x1'],0),pts)
    E("undo()"); ok('STRETCH desfeito em um passo',L()[0]['tp']=='rect')
    # ── exportação
    reset(); E(ARCPL)
    _f=os.path.join(HERE,'_pl.dxf'); open(_f,'wb').write(bytes(E("Array.from(cp1252Encode(buildDXF2000({})))")))
    import ezdxf
    d=ezdxf.readfile(_f); lw=d.modelspace().query('LWPOLYLINE')[0]; bl=[pt[4] for pt in lw.get_points('xyseb')]; os.remove(_f)
    ok('DXF 2000: LWPOLYLINE com bulge',near(bl[1],B45,1e-6) and not d.audit().errors,bl)
    ok('SVG desenha o arco com comando A',' A' in E("buildSVG()"))
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
f=[n for n,c in R if not c]; print(f'\n{len(R)-len(f)}/{len(R)} testes OK'); sys.exit(1 if f else 0)
