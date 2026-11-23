# Testes do ZOOM com opções e do histórico de vistas (v8.6, R5 do parecer técnico)
# e da exportação de blocos nativos no DXF 2000 (v8.6, achado da pré-validação do R9).
# Uso: pip install playwright ezdxf && playwright install chromium && python tests/test_zoom.py
import sys, os, math
from playwright.sync_api import sync_playwright
import ezdxf
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
def near(a,b,t=1e-6): return abs(a-b)<=t*max(1,abs(b))
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':850})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.goto('file://'+path); pg.wait_for_timeout(500); E=pg.evaluate
    if E("document.getElementById('ov-recover').classList.contains('show')"): E("closeOv('ov-recover')")
    def reset():
        E("()=>{if(S.space!=='model')switchSpace('model');S.ents=[];S.sel=[];S.ds=null;S.blocks={};resetHistory();setTool('select');S.modes.snap=false;"
          "addE({tp:'rect',x:0,y:0,w:200,h:100});addE({tp:'circ',cx:400,cy:300,r:20});S.vp={x:700,y:425,sc:1};renderAll();}")
    def cmd(*t):
        for x in t: E(f"cmdSubmit({x!r})"); pg.wait_for_timeout(5)
    def vis():  # retângulo visível do desenho
        return E("(()=>{var a=s2w(0,cvH()),b=s2w(cvW(),0);return [a.x,a.y,b.x,b.y];})()")
    def vp(): return E("[S.vp.x,S.vp.y,S.vp.sc]")
    def tick(): pg.wait_for_timeout(760)   # passa o intervalo que agrupa mudanças seguidas
    reset(); cmd('Z'); ok('Z pergunta as opções (antes ia direto para a extensão)','Tudo/Centro/Extensão/Anterior/Escala/Janela/Objeto' in E("document.getElementById('cmdlbl').textContent"))
    cmd('E'); v=vis(); ok('ZOOM E: desenho inteiro visível',v[0]<=0 and v[1]<=0 and v[2]>=420 and v[3]>=320,v)
    reset(); cmd('Z',''); v=vis(); ok('Z + Enter = Extensão',v[2]>=420 and v[3]>=320)
    reset(); cmd('ZOOM','J','0,0','200,100'); v=vis()
    ok('ZOOM Janela por coordenadas: a janela 200×100 preenche a tela',v[0]<=0.01 and v[2]>=199.99 and (abs(v[0])<1 or abs(v[1])<1) and v[2]-v[0]<260,v)
    reset(); cmd('Z','0,0','100,50'); v=vis(); ok('Ponto direto na pergunta inicia a janela (como no AutoCAD)',v[2]-v[0]<140 and v[2]>=99.9,v)
    reset(); cmd('ZOOM','C','400,300','50'); v=vis(); ok('ZOOM Centro com altura 50',near((v[1]+v[3])/2,300,1e-3) and near(v[3]-v[1],50,1e-3),v)
    reset(); s0=vp()[2]; cmd('ZOOM','2X'); ok('ZOOM 2X (relativo à vista)',near(vp()[2],2*s0)); cmd('ZOOM','S','0.5x'); ok('ZOOM Escala 0.5X',near(vp()[2],s0))
    reset(); cmd('ZOOM','E'); sE=vp()[2]; cmd('ZOOM','2'); ok('ZOOM 2 (sem X): relativo à extensão',near(vp()[2],2*sE,1e-6))
    reset(); cmd('ZOOM','O','420,300',''); v=vis(); ok('ZOOM Objeto: enquadra o círculo selecionado',v[0]<380 and v[2]>420 and v[2]-v[0]<200,v)
    reset(); cmd('ZOOM','T'); v=vis(); ok('ZOOM Tudo: inclui a origem e os objetos',v[0]<=0 and v[1]<=0 and v[2]>=420)
    # histórico
    reset(); E("resetHistory()"); a=vp(); tick(); cmd('ZOOM','2X'); b_=vp(); tick(); cmd('ZOOM','J','0,0','50,50'); tick()
    cmd('ZOOM','P'); ok('ZOOM Anterior volta à vista anterior',all(near(x,y) for x,y in zip(vp(),b_)),(vp(),b_))
    cmd('ZP'); ok('ZP de novo: mais uma vista para trás',all(near(x,y) for x,y in zip(vp(),a)),(vp(),a))
    cmd('ZP'); ok('Sem vista guardada: aviso, nada muda','não há vista anterior' in E("Array.from(document.querySelectorAll('#cmdlog .cl')).slice(-2).map(d=>d.textContent).join('|')"))
    reset(); E("resetHistory()"); a=vp(); tick()
    box=pg.locator('#cw').bounding_box(); pg.mouse.move(box['x']+600,box['y']+400)
    for i in range(6): pg.mouse.wheel(0,-120); pg.wait_for_timeout(40)
    tick(); ok('Giros seguidos da roda contam como uma única mudança',E("zhPrevCount()")==1,E("zhPrevCount()"))
    cmd('ZP'); ok('…e ZP desfaz o zoom da roda de uma vez',all(near(x,y) for x,y in zip(vp(),a)))
    E("()=>{for(var i=0;i<15;i++){zhForce();doZoom(1.1);}}"); ok('Histórico limitado a 10 vistas',E("zhPrevCount()")==10)
    E("resetHistory()"); ok('Novo desenho / abrir arquivo limpa o histórico',E("zhPrevCount()")==0)
    # duplo clique no botão do meio
    reset(); E("()=>{S.vp={x:0,y:0,sc:9};renderAll();}"); pg.locator('#cw').dispatch_event('auxclick',{'button':1,'detail':2}); pg.wait_for_timeout(50)
    v=vis(); ok('Duplo clique no botão do meio = Extensão',v[2]>=420 and v[3]>=320,v)
    # botões
    reset(); pg.click('#rb-zoomwin'); ok('Botão Janela inicia ZOOM J','canto' in E("document.getElementById('cmdlbl').textContent").lower())
    cmd('0,0','100,100'); tick(); pg.click('#rb-zoomprev'); ok('Botão Anterior = ZP',E("S.tool")=='select')
    # MSPACE: escala da viewport
    reset(); E("()=>{switchSpace('layout');}"); E("()=>{var v=curViewport();mspaceEnter(v);}")
    cmd('ZOOM','1/50XP'); k=E("vpRatio(findE(S.mspace))"); ok('No MSPACE: ZOOM 1/50XP define a escala 1:50',near(k,1/50),k)
    cmd('Z','1/100xp'); ok('…e 1/100XP = 1:100',near(E("vpRatio(findE(S.mspace))"),1/100))
    tick(); cmd('Z','P'); ok('Anterior também dentro da viewport',near(E("vpRatio(findE(S.mspace))"),1/50))
    cmd('Z','E'); ok('ZOOM E dentro da viewport enquadra o Model',E("(()=>{var v=findE(S.mspace),a=vpModelToPaper(v,0,0),b=vpModelToPaper(v,420,320);return a.x>=v.x-1e-6&&b.x<=v.x+v.w+1e-6&&a.y>=v.y-1e-6&&b.y<=v.y+v.h+1e-6;})()"))
    E("mspaceExit()"); cmd('Z','2XP'); ok('Fora da viewport, nXP explica que é preciso entrar nela','MSPACE' in E("Array.from(document.querySelectorAll('#cmdlog .cl')).slice(-3).map(d=>d.textContent).join('|')"))
    E("()=>{var v=curViewport();v.lock=true;mspaceEnter(v);}"); kk=E("vpRatio(findE(S.mspace))"); cmd('Z','1/20XP'); ok('Viewport travada não muda de escala',near(E("vpRatio(findE(S.mspace))"),kk))
    E("()=>{findE(S.mspace).lock=false;mspaceExit();switchSpace('model');}")
    ok('Script: ZOOM em linhas separadas',E("(()=>{scrRun('ZOOM\\nJ\\n0,0\\n10,10\\n');var a=s2w(0,0),b=s2w(cvW(),cvH());return Math.abs(b.x-a.x)<40;})()"))
    # ── blocos nativos no DXF 2000
    E("()=>{S.ents=[];S.blocks={};S.blocks['MARCO']={base:{x:0,y:0},ents:[{tp:'circ',cx:0,cy:0,r:5,ly:0},{tp:'line',x1:-7,y1:0,x2:7,y2:0,ly:0},{tp:'dim',subtp:'linear',dimDir:'h',x1:-5,y1:0,x2:5,y2:0,px:0,py:-8,val:'10'}]};"
      "S.blocks['Mesa ç']={base:{x:0,y:0},ents:[{tp:'rect',x:0,y:0,w:10,h:5,ly:0},{tp:'insert',name:'MARCO',x:5,y:2.5,s:0.2,rot:0,m:false}]};"
      "addE({tp:'insert',name:'MARCO',x:10,y:20,s:2,rot:Math.PI/2,m:false});addE({tp:'insert',name:'MARCO',x:50,y:0,s:1,rot:0,m:true});addE({tp:'insert',name:'Mesa ç',x:100,y:0,s:1,rot:0,m:false});}")
    f=os.path.join(HERE,'_b.dxf'); open(f,'wb').write(bytes(E("Array.from(cp1252Encode(buildDXF2000({})))")))
    d=ezdxf.readfile(f); au=d.audit(); I=d.modelspace().query('INSERT')
    ok('DXF 2000: blocos como BLOCK + INSERT (antes saíam explodidos)',len(I)==3 and 'MARCO' in d.blocks and not au.errors,[x.dxf.name for x in I])
    i1=[x for x in I if abs(x.dxf.insert.x-10)<1e-9][0]; i2=[x for x in I if abs(x.dxf.insert.x-50)<1e-9][0]
    ok('INSERT: escala e rotação',near(i1.dxf.xscale,2) and near(i1.dxf.rotation,90),(i1.dxf.xscale,i1.dxf.rotation))
    ok('INSERT espelhado: escala Y negativa',near(i2.dxf.yscale,-1) and near(i2.dxf.xscale,1))
    ok('Bloco aninhado (Mesa com MARCO dentro) e nome com acento',any(x.dxftype()=='INSERT' for x in d.blocks.get('Mesa_c' if 'Mesa_c' in d.blocks else [b_.name for b_ in d.blocks if b_.name.startswith('Mesa')][0])))
    ok('Cota dentro de bloco sai como geometria (sem quebrar o arquivo)',len(d.blocks.get('MARCO'))>3)
    ok('Geometria igual à explodida (círculo do 1º MARCO com raio 10 após escala 2)',any(near(e.dxf.radius*2,10) for e in d.blocks.get('MARCO').query('CIRCLE')))
    open(f,'wb').write(bytes(E("Array.from(cp1252Encode(buildDXF2000({blocks:'exploded'})))"))); d=ezdxf.readfile(f)
    ok('Opção "blocos explodidos" continua disponível',len(d.modelspace().query('INSERT'))==0 and len(d.modelspace().query('CIRCLE'))>=3)
    open(f,'wb').write(bytes(E("Array.from(cp1252Encode(buildDXF()))"))); d=ezdxf.readfile(f); os.remove(f)
    ok('DXF R12: blocos explodidos (como antes)',len(d.modelspace().query('INSERT'))==0 and len(d.modelspace().query('CIRCLE'))>=3)
    ok('Caixa "Blocos como BLOCK e INSERT" na exportação',E("!!document.getElementById('dxf-blocks')&&document.getElementById('dxf-blocks').checked"))
    E("()=>{S.ents=[];addE({tp:'dimr',cx:0,cy:0,ex:30,ey:0});}"); f=os.path.join(HERE,'_r.dxf'); open(f,'wb').write(bytes(E("Array.from(cp1252Encode(buildDXF2000({})))")))
    d=ezdxf.readfile(f); os.remove(f); ok('Cota de raio sem valor gravado: raio vem da geometria (antes saía 0)',near(d.modelspace().query('DIMENSION')[0].get_measurement(),30))
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
fails=[n for n,c in R if not c]; print(f'\n{len(R)-len(fails)}/{len(R)} testes OK'); sys.exit(1 if fails else 0)
