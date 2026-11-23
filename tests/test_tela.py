# Testes de tela cheia, tela limpa, tela de abertura e aplicativo instalável (v6.5).
# Uso: pip install playwright && playwright install chromium && python tests/test_tela.py
import sys, os, threading, http.server, socketserver, functools, json
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(os.path.join(HERE,'..'))
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=socketserver.TCPServer(('127.0.0.1',0),functools.partial(Q,directory=os.path.dirname(path))); port=srv.server_address[1]
threading.Thread(target=srv.serve_forever,daemon=True).start()
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1400,'height':850}); pg=ctx.new_page()
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+path); pg.wait_for_timeout(400); E=pg.evaluate
    ok('Testes automatizados não veem a tela de abertura',E("document.getElementById('startscr').style.display")=='none')
    E("showStartScreen(true)")
    ok('Tela de abertura com botão de tela cheia',pg.locator('#ss-go').is_visible() and 'tela cheia' in pg.locator('#ss-go').inner_text())
    w0=E("S.cD.width")
    pg.click('#ss-go'); pg.wait_for_timeout(400)
    ok('Clique em "Abrir aplicativo CAD em tela cheia" entra em tela cheia',E("isFullscreen()") and E("document.getElementById('startscr').style.display")=='none')
    ok('Botão mostra "Sair da tela cheia"','Sair' in E("document.getElementById('btn-fs').textContent"))
    E("document.activeElement.blur()")
    pg.click('#cmdinput'); pg.keyboard.type('TELACHEIA'); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    ok('Comando TELACHEIA sai da tela cheia',not E("isFullscreen()"))
    E("showStartScreen(true)"); pg.focus('#ss-go'); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    ok('Enter na tela de abertura aciona o botão',E("isFullscreen()"))
    pg.click('#btn-fs'); pg.wait_for_timeout(300); ok('Botão ⛶ alterna a tela cheia',not E("isFullscreen()"))
    E("showStartScreen(true)"); pg.check('#ss-skip'); pg.click("text=Continuar na janela do navegador"); pg.wait_for_timeout(100)
    ok('"Não mostrar novamente" é lembrado',E("startPref()")=='janela' and not E("isFullscreen()"))
    w1=E("S.cD.width"); h1=E("S.cD.height")
    E("document.activeElement.blur()"); pg.keyboard.press('Control+0'); pg.wait_for_timeout(100)
    ok('Ctrl+0 (tela limpa) oculta faixa de opções e painel',E("document.body.classList.contains('clean')") and not pg.locator('#ribbon').is_visible() and not pg.locator('#rp').is_visible())
    ok('Área de desenho cresce na tela limpa',E("S.cD.width")>w1 and E("S.cD.height")>h1,(w1,h1,E("S.cD.width"),E("S.cD.height")))
    pg.click('#cmdinput'); pg.keyboard.type('LIMPA'); pg.keyboard.press('Enter'); pg.wait_for_timeout(100)
    ok('Comando LIMPA restaura a interface',not E("document.body.classList.contains('clean')") and E("S.cD.width")==w1)
    ok('Sem erros JavaScript (arquivo local)',not errs,errs)
    # ── servido por HTTP, como no GitHub Pages
    pg2=ctx.new_page(); errs2=[]; pg2.on('pageerror',lambda e:errs2.append(str(e)))
    url=f'http://127.0.0.1:{port}/index.html'; pg2.goto(url); pg2.wait_for_timeout(500)
    man=pg2.evaluate("fetch(document.querySelector('link[rel=manifest]').href).then(r=>r.json())")
    ok('Manifesto do aplicativo válido',man['display']=='standalone' and man['start_url']=='./index.html' and len(man['icons'])==3)
    st=pg2.evaluate("Promise.all(['icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','sw.js'].map(u=>fetch(u).then(r=>r.status)))")
    ok('Ícones e service worker publicados',st==[200,200,200,200],st)
    ok('Service worker ativo',pg2.evaluate("navigator.serviceWorker.ready.then(r=>!!r.active)"))
    pg2.wait_for_timeout(500)
    cdp=ctx.new_cdp_session(pg2); ie=cdp.send('Page.getInstallabilityErrors')['installabilityErrors']
    ok('Chrome considera o EduCAD instalável',ie==[],ie)
    pg2.reload(); pg2.wait_for_timeout(400)
    ctx.set_offline(True); pg2.reload(); pg2.wait_for_timeout(400)
    ok('Abre sem internet depois da primeira visita',pg2.evaluate("typeof S==='object'&&!!document.getElementById('cw')"))
    ctx.set_offline(False)
    ok('Sem erros JavaScript (HTTP)',not errs2,errs2)
    b.close()
srv.shutdown()
f=[n for n,c in R if not c]; print(f'\n{len(R)-len(f)}/{len(R)} testes OK'); sys.exit(1 if f else 0)
