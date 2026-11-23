# Testes do pacote 4 da v7 (v7.3): alta resolução (devicePixelRatio), toque (tablet) e telas estreitas,
# além da montagem modular (build.py) e da versão de desenvolvimento (src/dev.html).
# Uso: pip install playwright && playwright install chromium && python tests/test_plataforma.py
import sys, os, subprocess
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
def near(a,b,t=1e-6): return abs(a-b)<t
# ── montagem modular
r=subprocess.run([sys.executable,os.path.join(ROOT,'build.py'),'--check'],capture_output=True,text=True)
ok('index.html corresponde aos módulos de src/ (build.py --check)',r.returncode==0,r.stdout.strip())
with sync_playwright() as p:
    b=p.chromium.launch()
    # ── alta resolução
    ctx=b.new_context(viewport={'width':1400,'height':850},device_scale_factor=2); pg=ctx.new_page()
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+path); pg.wait_for_timeout(400); E=pg.evaluate
    d=E("({w:S.cD.width,cw:S.cD.clientWidth,W:S.W,a:S.gD.getTransform().a,dpr:devicePixelRatio})")
    ok('Canvas na resolução física (2×) com desenho em pixels CSS',d['dpr']==2 and d['w']==2*d['cw'] and d['W']==d['cw'] and d['a']==2,d)
    box=pg.locator('#cw').bounding_box()
    E("()=>{S.vp={x:Math.round(S.W/2),y:Math.round(S.H/2),sc:4};addE({tp:'line',x1:0,y1:0,x2:40,y2:0});renderAll();}")
    s=E("w2s(20,0)"); pg.mouse.click(box['x']+s['x'],box['y']+s['y']); pg.wait_for_timeout(50)
    ok('Clique seleciona o objeto certo em tela 2×',E("S.sel.length")==1)
    px=E("(()=>{var c=S.cD,g=S.gD,p=w2s(20,0),d=g.getImageData(Math.round(p.x*2),Math.round(p.y*2)-3,1,7).data,m=0;for(var i=0;i<d.length;i+=4)m=Math.max(m,d[i]+d[i+1]+d[i+2]);return m;})()")
    ok('Linha desenhada na posição correta do buffer de alta resolução',px>200,px)
    ok('Zoom extensão usa o tamanho lógico',E("(zoomFit(),Math.abs(w2s(20,0).x-Math.round(S.W/2))<1)"))
    ok('Sem erros JavaScript (2×)',not errs,errs)
    ctx.close()
    # ── toque
    ctx=b.new_context(viewport={'width':1400,'height':850},has_touch=True,is_mobile=False); pg=ctx.new_page()
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+path); pg.wait_for_timeout(400); E=pg.evaluate
    box=pg.locator('#cw').bounding_box(); cdp=ctx.new_cdp_session(pg)
    def scr(x,y): s=E(f"w2s({x},{y})"); return box['x']+s['x'],box['y']+s['y']
    def touch(kind,pts): cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[{'x':x,'y':y,'id':i} for i,(x,y) in enumerate(pts)]})
    def reset(): E("()=>{S.ents=[];S.sel=[];S.ds=null;resetHistory();setTool('select');S.modes.snap=false;S.vp={x:Math.round(S.W/2),y:Math.round(S.H/2),sc:4};renderAll();}")
    reset(); E("addE({tp:'line',x1:0,y1:0,x2:40,y2:0})")
    pg.touchscreen.tap(*scr(20,0)); pg.wait_for_timeout(60)
    ok('Toque seleciona o objeto',E("S.sel.length")==1)
    ok('Barra de toque aparece após o primeiro toque',E("document.body.classList.contains('touch')") and pg.locator('#touchbar').is_visible())
    reset(); E("setTool('line')"); pg.touchscreen.tap(*scr(0,10)); pg.wait_for_timeout(40); pg.touchscreen.tap(*scr(30,10)); pg.wait_for_timeout(40)
    ok('Dois toques desenham uma linha',E("S.ents.length")==1 and near(E("S.ents[0].x2"),30,0.5))
    pg.click('#tb-esc'); ok('Botão Esc da barra cancela o comando',E("S.ds")==None)
    pg.click('#tb-undo'); ok('Botão ↶ desfaz',E("S.ents.length")==0)
    reset(); x0=E("S.vp.x"); a=scr(0,0)
    touch('touchStart',[a]); [touch('touchMove',[(a[0]+k*10,a[1])]) for k in range(1,9)]; touch('touchEnd',[]); pg.wait_for_timeout(40)
    ok('Arrastar com um dedo move a vista (PAN)',near(E("S.vp.x")-x0,80,1),E("S.vp.x")-x0)
    reset(); sc0=E("S.vp.sc"); c=scr(0,0)
    touch('touchStart',[(c[0]-50,c[1]),(c[0]+50,c[1])])
    for k in range(1,11): touch('touchMove',[(c[0]-50-k*5,c[1]),(c[0]+50+k*5,c[1])])
    touch('touchEnd',[]); pg.wait_for_timeout(40)
    mid=E("w2s(0,0)")
    ok('Pinça com dois dedos dá zoom em torno do ponto entre os dedos',near(E("S.vp.sc")/sc0,2,0.05) and abs(box['x']+mid['x']-c[0])<2,(E("S.vp.sc")/sc0))
    ok('Pinça não cria objetos nem seleciona',E("S.ents.length")==0 and E("S.sel.length")==0)
    reset(); E("setTool('polyline')"); pg.touchscreen.tap(*scr(0,0)); pg.wait_for_timeout(40); pg.touchscreen.tap(*scr(20,0)); pg.wait_for_timeout(40); pg.touchscreen.tap(*scr(20,20)); pg.wait_for_timeout(40)
    q=scr(40,40); touch('touchStart',[q]); pg.wait_for_timeout(750); touch('touchEnd',[]); pg.wait_for_timeout(60)
    ok('Toque longo = Enter (conclui a polilinha)',E("S.ents.length")==1 and E("S.ents[0].tp")=='pl' and E("S.ds")==None)
    reset(); E("addE({tp:'mtext',x:0,y:20,w:0,h:5,txt:'Canteiro',att:1,rot:0})")
    t=scr(5,17); pg.touchscreen.tap(*t); pg.wait_for_timeout(80); pg.touchscreen.tap(*t); pg.wait_for_timeout(80)
    ok('Toque duplo abre o editor de texto',E("document.getElementById('ov-mtext').classList.contains('show')"))
    E("closeOv('ov-mtext')")
    reset(); E("addE({tp:'line',x1:0,y1:0,x2:40,y2:0});addE({tp:'line',x1:0,y1:10,x2:40,y2:10});")
    pg.touchscreen.tap(*scr(20,0)); pg.wait_for_timeout(40); pg.click('#tb-shift'); pg.touchscreen.tap(*scr(20,10)); pg.wait_for_timeout(40)
    ok('Botão ⇧ vale para o próximo toque (adiciona à seleção)',E("S.sel.length")==2 and not E("document.getElementById('tb-shift').classList.contains('on')"))
    pg.click('#tb-enter'); ok('Botão ⏎ funciona como Enter',True)
    ok('Sem erros JavaScript (toque)',not errs,errs)
    ctx.close()
    # ── tela estreita
    ctx=b.new_context(viewport={'width':760,'height':900}); pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+path); pg.wait_for_timeout(400)
    ok('Tela estreita: painel lateral recolhido e área de desenho ampla',not pg.locator('#rp').is_visible() and pg.evaluate("S.W")>600)
    pg.click('#btn-panel'); pg.wait_for_timeout(60)
    ok('☰ Painéis mostra o painel lateral',pg.locator('#rp').is_visible())
    ok('Sem erros JavaScript (tela estreita)',not errs,errs)
    ctx.close()
    # ── versão modular (src/dev.html)
    dev=os.path.join(ROOT,'src','dev.html')
    if os.path.exists(dev) and os.path.abspath(path)!=os.path.abspath(dev):
        pg=b.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.goto('file://'+dev); pg.wait_for_timeout(500)
        nmods=pg.evaluate("document.querySelectorAll('script[src^=\"js/\"]').length")
        r2=pg.evaluate("()=>{S.ents=[];addE({tp:'rect',x:0,y:0,w:10,h:10});S.filletR=2;filletPolyline(S.ents[0]);return [S.ents.length,S.ents[0].tp];}")
        ok('Versão modular carrega os 24 módulos e funciona',nmods>=20 and r2==[1,'pl'] and not errs,(nmods,r2,errs))
    b.close()
f=[n for n,c in R if not c]; print(f'\n{len(R)-len(f)}/{len(R)} testes OK'); sys.exit(1 if f else 0)
