# ARC como no AutoCAD (v8.17): 3 pontos; Centro; Fim; Ângulo; comprimento da Corda; Direção; Raio; Enter = continuar
# tangente; pré-visualização; mensagens de erro; e o modo Didático desligado ao abrir.
# Uso: pip install playwright ezdxf && playwright install chromium && python tests/test_arco.py
import sys, os, math
from playwright.sync_api import sync_playwright
import ezdxf
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
def near(a,b,t=1e-3): return a is not None and abs(a-b)<=t
def same(A,B,t=1e-3):
    if A is None: return False
    if any(not near(A[i],B[i],t) for i in range(3)): return False
    da=lambda x,y: min(abs(x-y)%360,360-abs(x-y)%360)
    return da(A[3],B[3])<1e-2 and da(A[4],B[4])<1e-2
def TMP(n): return os.path.join(HERE,'_'+n)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1440,'height':900})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.goto('file://'+path); pg.wait_for_timeout(500); E=pg.evaluate
    if E("document.getElementById('ov-recover').classList.contains('show')"): E("closeOv('ov-recover')")
    # ── modo didático
    ok('O modo Didático começa desligado',E("S.modes.didactic")==False and not E("document.getElementById('rb-didactic').classList.contains('on')"))
    E("()=>{S.ents=[];addE({tp:'line',x1:0,y1:0,x2:100,y2:0});renderAll();}")
    calls=E("(()=>{var n=0,f=drawDidactic;drawDidactic=function(){n++;return f.apply(this,arguments);};renderAll();drawDidactic=f;return n;})()")
    ok('Desligado: nenhum rótulo didático é desenhado',calls==0,calls)
    pg.click('#rtab1'); pg.click('#rb-didactic'); pg.wait_for_timeout(50)
    calls=E("(()=>{var n=0,f=drawDidactic;drawDidactic=function(){n++;return f.apply(this,arguments);};renderAll();drawDidactic=f;return n;})()")
    ok('O botão Didático liga o modo (rótulos aparecem e o botão fica aceso)',E("S.modes.didactic") and calls>=1 and E("document.getElementById('rb-didactic').classList.contains('on')"))
    pg.click('#rb-didactic'); ok('Clicar de novo desliga',not E("S.modes.didactic") and not E("document.getElementById('rb-didactic').classList.contains('on')"))
    ok('O botão explica o modo',"Começa desligado" in (E("document.getElementById('rb-didactic').title") or ''))
    pg.click('#rtab0')
    # ── ARC
    def run(seq):
        E("()=>{S.ents=[];if(S.ds)ncEnd();}"); E("setTool('arc')")
        for t in seq: E("cmdSubmit("+repr(t)+")")
        return E("(()=>{var a=S.ents.filter(e=>e.tp==='arc').pop();return a?[a.cx,a.cy,a.r,a.sa*180/Math.PI,a.ea*180/Math.PI]:null;})()")
    ok('A abre o ARC com a pergunta do AutoCAD ([Centro], Enter continua)',E("(()=>{setTool('arc');var t=document.getElementById('cmdinput').placeholder||'';return S.ds&&S.ds.cmd==='arc'&&S.ds.phase==='s';})()"))
    E("()=>{if(S.ds)ncEnd();}")
    ok('3 pontos na ordem do AutoCAD: início, segundo ponto (passagem), fim',same(run(['0,0','10,10','20,0']),[10,0,10,0,180]))
    ok('3 pontos: o arco passa pelo segundo ponto (embaixo)',same(run(['0,0','10,-10','20,0']),[10,0,10,180,0]))
    ok('Início, Centro, Fim',same(run(['10,0','C','0,0','0,10']),[0,0,10,0,90]))
    ok('Início, Centro, Ângulo +90° (anti-horário)',same(run(['10,0','C','0,0','A','90']),[0,0,10,0,90]))
    ok('Início, Centro, Ângulo −90° (horário)',same(run(['10,0','C','0,0','A','-90']),[0,0,10,270,0]))
    ok('Ângulo em graus, minutos e segundos (45°30\')',same(run(['10,0','C','0,0','A',"45d30'"]),[0,0,10,0,45.5]))
    ok('Início, Centro, comprimento da Corda (arco menor)',same(run(['10,0','C','0,0','L','14.142135624']),[0,0,10,0,90]))
    ok('Corda negativa = arco maior',same(run(['10,0','C','0,0','L','-14.142135624']),[0,0,10,0,270]))
    ok('Início, Fim, Centro',same(run(['10,0','F','0,10','0,0']),[0,0,10,0,90]))
    ok('Início, Fim (também E, de End), Ângulo 180°',same(run(['10,0','E','-10,0','A','180']),[0,0,10,0,180]))
    ok('Início, Fim, Ângulo −90° (horário)',same(run(['10,0','F','0,10','A','-90']),[10,10,10,180,270]))
    ok('Início, Fim, Raio (arco menor)',same(run(['10,0','F','0,10','R','10']),[0,0,10,0,90]))
    ok('Raio negativo = arco maior',same(run(['10,0','F','0,10','R','-10']),[10,10,10,270,180]))
    ok('Início, Fim, Direção da tangente (90°)',same(run(['0,0','F','10,0','D','90']),[5,0,5,0,180]))
    ok('Direção dada por um ponto',same(run(['0,0','F','10,0','D','0,5']),[5,0,5,0,180]))
    ok('Centro, Início, Fim (opção na primeira pergunta)',same(run(['C','0,0','10,0','0,-10']),[0,0,10,0,270]))
    ok('Centro, Início, Ângulo',same(run(['C','0,0','10,0','A','45']),[0,0,10,0,45]))
    ok('Centro, Início, Corda',same(run(['C','0,0','10,0','L','10']),[0,0,10,0,60]))
    ok('Opções em inglês (CE, EN, R)',same(run(['10,0','EN','0,10','RADIUS','10']),[0,0,10,0,90]) and same(run(['CENTER','0,0','10,0','ANGLE','90']),[0,0,10,0,90]))
    ok('Coordenadas relativas e polares',same(run(['10,0','C','@-10,0','@10<90']),[0,0,10,0,90]))
    # continuar
    E("()=>{S.ents=[];if(S.ds)ncEnd();}"); E("setTool('line')"); E("cmdSubmit('0,0')"); E("cmdSubmit('10,0')"); E("cmdSubmit('')")
    E("setTool('arc')"); E("cmdSubmit('')"); E("cmdSubmit('20,10')")
    a=E("(()=>{var a=S.ents.filter(e=>e.tp==='arc').pop();return [a.cx,a.cy,a.r,a.sa*180/Math.PI,a.ea*180/Math.PI];})()")
    ok('Enter na primeira pergunta continua tangente à última linha',same(a,[10,10,10,270,0]),a)
    E("setTool('arc')"); E("cmdSubmit('')"); E("cmdSubmit('10,20')")
    a=E("(()=>{var a=S.ents.filter(e=>e.tp==='arc').pop();return [a.cx,a.cy,a.r,a.sa*180/Math.PI,a.ea*180/Math.PI];})()")
    ok('…e tangente ao último arco (mesmo círculo, seguindo o sentido do traçado)',same(a,[10,10,10,0,90]),a)
    E("()=>{S.ents=[];S.ents.push({id:'c1',tp:'circ',cx:0,cy:0,r:5});}"); E("setTool('arc')"); E("cmdSubmit('')")
    ok('Sem linha ou arco antes: avisa e continua pedindo o ponto inicial','Não há linha ou arco' in E("document.getElementById('cmdlog').innerText") and E("S.ds&&S.ds.phase")=='s')
    # erros
    E("()=>{if(S.ds)ncEnd();}"); n0=E("S.ents.length")
    run(['0,0','10,0','20,0']); ok('Três pontos alinhados: mensagem de erro e nenhum arco','alinhados' in E("document.getElementById('cmdlog').innerText") and not E("S.ents.some(e=>e.tp==='arc')"))
    run(['0,0','F','10,0','R','2']); ok('Raio pequeno demais: mensagem de erro','metade da distância' in E("document.getElementById('cmdlog').innerText") and not E("S.ents.some(e=>e.tp==='arc')"))
    run(['10,0','C','0,0','L','30']); ok('Corda maior que o diâmetro: mensagem de erro','diâmetro' in E("document.getElementById('cmdlog').innerText"))
    ok('Após o erro, o comando continua esperando o valor',E("S.ds&&S.ds.cmd==='arc'&&S.ds.phase==='len'")); E("cmdSubmit('10')"); ok('…e aceita um valor válido',E("S.ents.some(e=>e.tp==='arc')"))
    # mensagem e desfazer
    run(['10,0','C','0,0','A','90']); ok('Informa raio, ângulo e comprimento do arco','raio 10, ângulo 90°, comprimento 15.708' in E("document.getElementById('cmdlog').innerText"))
    ok('Um Ctrl+Z desfaz o arco',E("(()=>{undo();return S.ents.filter(e=>e.tp==='arc').length;})()")==0)
    # pré-visualização e clique
    E("()=>{S.ents=[];if(S.ds)ncEnd();S.modes.osnap=false;S.modes.snap=false;S.modes.grid=false;S.vp={x:400,y:400,sc:4};renderAll();}")
    box=pg.locator('#cw').bounding_box(); X=lambda wx: box['x']+400+wx*4; Y=lambda wy: box['y']+400-wy*4
    E("setTool('arc')"); pg.mouse.click(X(10),Y(0)); E("cmdSubmit('C')"); pg.mouse.click(X(0),Y(0)); pg.mouse.move(X(0),Y(10)); pg.wait_for_timeout(50)
    ghost=E("(()=>{var n=0,f=drawE;drawE=function(c,e){ if(e&&e.id==='arcghost') n++; return f.apply(this,arguments); };renderAll();drawE=f;return n;})()")
    ok('Pré-visualização do arco enquanto o cursor se move',ghost>=1)
    pg.mouse.click(X(0),Y(10)); a=E("(()=>{var a=S.ents.filter(e=>e.tp==='arc').pop();return a?[a.cx,a.cy,a.r,a.sa*180/Math.PI,a.ea*180/Math.PI]:null;})()")
    ok('Com cliques no desenho: início, Centro, fim',same(a,[0,0,10,0,90],0.3),a)
    # DXF e scripts
    E("()=>{S.ents=[];if(S.ds)ncEnd();}"); run(['10,0','C','0,0','A','-90'])
    f=TMP('arc.dxf'); open(f,'wb').write(bytes(E("Array.from(cp1252Encode(buildDXF2000({})))"))); d=ezdxf.readfile(f); os.remove(f)
    A=[e for e in d.modelspace() if e.dxftype()=='ARC'][0]
    ok('DXF: arco horário sai com início/fim corretos (270° → 0°)',near(A.dxf.radius,10) and near(A.dxf.start_angle%360,270) and near(A.dxf.end_angle%360,0))
    E("()=>{S.ents=[];}"); E("scrRun('ARC 10,0 C 0,0 A 90\\nARC C 0,0 20,0 0,20\\n')")
    ok('Scripts (.scr) usam as mesmas opções',E("S.ents.filter(e=>e.tp==='arc').length")==2)
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
fails=[n for n,c in R if not c]; print(f'\n{len(R)-len(fails)}/{len(R)} testes OK'); sys.exit(1 if fails else 0)
