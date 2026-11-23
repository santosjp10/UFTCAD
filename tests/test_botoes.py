# Testes dos botões dos comandos da v7 (v7.9, R3 do parecer técnico): cada comando que antes só existia
# na linha de comando tem botão, e o botão leva o aluno pelo fluxo completo do comando, com mouse real.
# Uso: pip install playwright && playwright install chromium && python tests/test_botoes.py
import sys, os
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
def near(a,b,t=1e-6): return abs(a-b)<t
NEW={'rb-mtext':'T','rb-leader':'LE','rb-textedit':'ED','rb-block':'B','rb-insert':'I','rb-pedit':'PE','rb-join':'J',
     'rb-break':'BR','rb-stretch':'S','rb-explode':'X','rb-recover':'RECUPERAR','btn-mview':'MV'}
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1366,'height':768})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.goto('file://'+path); pg.wait_for_timeout(500); E=pg.evaluate
    if E("document.getElementById('ov-recover').classList.contains('show')"): E("closeOv('ov-recover')")
    box=pg.locator('#cw').bounding_box()
    def scr(x,y): s=E(f"w2s({x},{y})"); return box['x']+s['x'],box['y']+s['y']
    def click(x,y): pg.mouse.move(*scr(x,y)); pg.mouse.click(*scr(x,y)); pg.wait_for_timeout(30)
    def blur(): E("document.activeElement.blur()")
    def typ(t): blur(); pg.keyboard.type(t); pg.keyboard.press('Enter'); pg.wait_for_timeout(30)
    def reset():
        E("()=>{document.querySelectorAll('.ov.show').forEach(o=>o.classList.remove('show'));if(S.space!=='model')switchSpace('model');S.ents=[];S.sel=[];S.ds=null;S.blocks={};resetHistory();setTool('select');S.modes.snap=false;S.vp={x:Math.round(S.W/2)-150,y:Math.round(S.H/2)+100,sc:4};renderAll();}")
    def L(): return E("S.ents.map(e=>JSON.parse(JSON.stringify(e)))")
    def btn(i): pg.click('#'+i); pg.wait_for_timeout(40)
    # ── presença e visibilidade
    for i,c in NEW.items():
        if i=='btn-mview': continue
        el=pg.locator('#'+i)
        ok(f'Botão {c} visível na faixa de opções (1366×768)',el.is_visible() and el.get_attribute('data-cmd')==c)
    hs={}
    for w in (1920,1600,1440,1366,1280,1024):
        pg.set_viewport_size({'width':w,'height':768}); pg.wait_for_timeout(80)
        hs[w]=round(E("document.getElementById('ribbon').getBoundingClientRect().height"))
    pg.set_viewport_size({'width':1366,'height':768}); pg.wait_for_timeout(80); box=pg.locator('#cw').bounding_box()
    ok('Faixa de opções com no máximo duas linhas de botões (≤ 160 px) de 1024 a 1920 px',all(h<=160 for h in hs.values()),hs)
    # ── MTEXT pelo botão
    reset(); btn('rb-mtext'); click(0,40); click(50,20)
    ok('Texto M: dois cantos abrem o editor',E("document.getElementById('ov-mtext').classList.contains('show')"))
    pg.fill('#mted-txt','Canteiro A'); pg.click('#ov-mtext .btn.p'); pg.wait_for_timeout(30)
    ok('Texto M cria o MTEXT',[e['tp'] for e in L()]==['mtext'])
    # ── Editar texto
    btn('rb-textedit'); click(2,37)
    ok('Editar texto abre o editor no texto clicado',E("document.getElementById('ov-mtext').classList.contains('show')") and E("document.getElementById('mted-txt').value")=='Canteiro A')
    pg.fill('#mted-txt','Canteiro B'); pg.click('#ov-mtext .btn.p'); pg.wait_for_timeout(30)
    ok('Texto alterado',L()[0]['txt']=='Canteiro B')
    # ── Chamada
    reset(); btn('rb-leader'); click(0,0); click(20,15); typ('')
    pg.fill('#mted-txt','Dreno'); pg.click('#ov-mtext .btn.p'); pg.wait_for_timeout(30)
    ok('Chamada cria a linha de chamada com texto',L() and L()[0]['tp']=='leader' and L()[0]['txt']=='Dreno')
    # ── Criar bloco e Inserir
    reset(); E("()=>{addE({tp:'line',x1:0,y1:0,x2:10,y2:0});addE({tp:'line',x1:10,y1:0,x2:10,y2:5});}")
    btn('rb-block'); typ('Aspersor'); click(0,0); click(-2,-2); click(12,7); typ(''); typ('')
    ok('Criar bloco converte a seleção em referência',[e['tp'] for e in L()]==['insert'] and 'Aspersor' in E("Object.keys(S.blocks)"))
    btn('rb-insert'); typ('Aspersor'); click(40,0); typ(''); typ('')
    ok('Inserir coloca outra referência',[e['tp'] for e in L()]==['insert','insert'] and near(L()[1]['x'],40,0.6))
    # ── Explodir (pede seleção quando não há)
    btn('rb-explode'); ok('Explodir sem seleção pede "Selecione objetos"',E("S.tool")=='explode' and E("S.ds&&S.ds.phase")=='sel')
    click(45,0); typ('')
    ok('Explodir a referência devolve as linhas',sorted(e['tp'] for e in L())==['insert','line','line'] and E("S.tool")=='select')
    reset(); E("()=>{addE({tp:'rect',x:0,y:0,w:20,h:10});S.sel=[S.ents[0].id];}"); btn('rb-explode')
    ok('Explodir com pré-seleção age na hora',[e['tp'] for e in L()]==['line']*4)
    # ── Editar PL, Unir, Interromper, Esticar
    reset(); E("()=>{addE({tp:'line',x1:0,y1:0,x2:20,y2:0});addE({tp:'line',x1:20,y1:0,x2:20,y2:20});}")
    btn('rb-pedit'); click(10,0); typ(''); typ('J'); click(20,10); typ(''); typ('F'); typ('')
    e=L(); ok('Editar PL: converte, une e fecha',len(e)==1 and e[0]['tp']=='pl' and e[0]['closed'])
    reset(); E("()=>{addE({tp:'line',x1:0,y1:0,x2:10,y2:0});addE({tp:'line',x1:15,y1:0,x2:30,y2:0});}")
    btn('rb-join'); click(5,0); click(20,0); typ('')
    ok('Unir: linhas colineares viram uma',len(L())==1 and near(L()[0]['x2'],30))
    btn('rb-break'); click(10,0); click(20,0)
    ok('Interromper: remove o trecho entre os pontos',len(L())==2)
    reset(); E("addE({tp:'rect',x:0,y:0,w:40,h:20})")
    btn('rb-stretch'); click(50,25); click(30,-5); typ(''); click(0,0); click(10,0)
    pts=L()[0].get('pts',[])
    ok('Esticar: janela cruzando estica só o lado direito',pts and near(max(q['x'] for q in pts),50,0.01) and near(min(q['x'] for q in pts),0,0.01),(L(),E('S.tool'),E('S.ds&&S.ds.phase')))
    # ── Recuperar
    btn('rb-recover'); pg.wait_for_timeout(200)
    ok('Recuperar abre a lista de cópias de segurança',E("document.getElementById('ov-recover').classList.contains('show')"))
    E("closeOv('ov-recover')")
    # ── Viewports (barra do layout)
    reset(); E("()=>{addE({tp:'rect',x:0,y:0,w:4000,h:2000});switchSpace('layout');}")
    ok('Botão Viewports aparece na barra do layout',pg.locator('#btn-mview').is_visible())
    btn('btn-mview'); typ('2'); typ('')
    ok('Viewports → 2 cria duas viewports',E("S.ents.filter(e=>e.tp==='viewport').length")==3)
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
fails=[n for n,c in R if not c]; print(f'\n{len(R)-len(fails)}/{len(R)} testes OK'); sys.exit(1 if fails else 0)
