# Testes de regressão da v6.1 no Chromium (Playwright).
# Uso: pip install playwright && playwright install chromium && python tests/test_navegador.py
import sys, json, math
from playwright.sync_api import sync_playwright
import os
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(os.path.dirname(__file__),'..','index.html')); R=[]
def ok(name,cond,info=''):
    R.append((name,bool(cond),info)); print(('PASS ' if cond else 'FAIL ')+name+('  '+str(info) if info else ''))
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':850},accept_downloads=True)
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.on('dialog',lambda d:d.accept())
    DOCJ=os.path.join(os.path.dirname(os.path.abspath(__file__)),'_doc.json')
    pg.goto('file://'+path); pg.wait_for_timeout(400)
    E=pg.evaluate
    def reset(): E("()=>{S.ents=[];S.sel=[];resetHistory();S.ds=null;setTool('select');S.vp={x:Math.round(S.cD.width/2),y:Math.round(S.cD.height/2),sc:2};renderAll();}")
    box=pg.locator('#cw').bounding_box()
    def scr(wx,wy):
        s=E(f"w2s({wx},{wy})"); return box['x']+s['x'], box['y']+s['y']
    # 1 undo/redo
    reset()
    r=E("""()=>{addE({tp:'line',x1:0,y1:0,x2:10,y2:0});addE({tp:'line',x1:0,y1:0,x2:0,y2:10});addE({tp:'line',x1:0,y1:0,x2:10,y2:10});
      var o=[S.ents.length];undo();o.push(S.ents.length);undo();o.push(S.ents.length);redo();o.push(S.ents.length);redo();o.push(S.ents.length);
      S.sel=[S.ents[0].id];setTool('move');handleClick({x:0,y:0});handleClick({x:5,y:5});o.push(S.ents[0].x1);undo();o.push(S.ents[0].x1);redo();o.push(S.ents[0].x1);return o;}""")
    ok('C1 undo/redo sequência',r==[3,2,1,2,3,5,0,5],r)
    # 2 texto em diálogo
    reset(); E("addE({tp:'line',x1:0,y1:0,x2:40,y2:0})"); E("()=>{S.sel=[S.ents[0].id];setTool('text');}")
    x,y=scr(20,20); pg.mouse.move(x,y); pg.mouse.click(x,y); pg.wait_for_timeout(80)
    pg.fill('#tv',''); pg.click('#tv'); pg.keyboard.type('Cota da área 12'); pg.keyboard.press('Backspace'); pg.keyboard.type('5'); pg.keyboard.press('Enter')
    r=E("()=>({n:S.ents.length,t:S.ents.filter(e=>e.tp==='txt').map(e=>e.txt),tool:S.tool,ov:document.getElementById('ov-text').classList.contains('show')})")
    ok('C2 TEXT digitado no diálogo',r['n']==2 and r['t']==['Cota da área 15'] and r['tool']=='text' and not r['ov'],r)
    # 2b diálogo de camada: Backspace não apaga seleção
    E("()=>{setTool('select');S.sel=[S.ents[0].id];showAddLayer();}"); pg.click('#ml-name'); pg.keyboard.press('Backspace'); pg.keyboard.type('lzx')
    ok('C2 diálogo camada não dispara atalhos',E("S.ents.length")==2 and E("S.tool")=='select'); E("closeOv('ov-layer')")
    # 3 LINE U
    reset(); E("setTool('line')"); pg.mouse.click(*scr(0,0)); pg.mouse.click(*scr(30,0)); pg.mouse.click(*scr(30,30)); pg.mouse.click(*scr(0,30))
    pg.locator('#cw').focus() if False else None
    E("document.activeElement.blur()"); pg.keyboard.press('u'); pg.keyboard.press('Enter')  # v7: opções exigem Enter, como no AutoCAD
    r=E("()=>({n:S.ents.length,base:S.ds&&S.ds.pts[0]})")
    ok('LINE U desfaz 1 segmento e retoma do ponto certo',r['n']==2 and abs(r['base']['x']-30)<1e-6 and abs(r['base']['y']-30)<1e-6,r)
    pg.keyboard.press('Escape')
    # 4 arco 3P horário
    reset(); r=E("()=>{setTool('arc');handleClick({x:-10,y:0});handleClick({x:0,y:10});handleClick({x:10,y:0});var a=S.ents[0];return [arcHas(Math.PI/2,a.sa,a.ea),arcHas(-Math.PI/2,a.sa,a.ea)];}")
    ok('ARC 3P em sentido horário passa pelo 2º ponto',r==[True,False],r)
    reset(); r=E("()=>{setTool('arc');handleClick({x:10,y:0});handleClick({x:0,y:10});handleClick({x:-10,y:0});var a=S.ents[0];return [arcHas(Math.PI/2,a.sa,a.ea),arcHas(-Math.PI/2,a.sa,a.ea)];}")
    ok('ARC 3P em sentido anti-horário (regressão)',r==[True,False],r)
    # 5 elipse inclinada
    reset(); r=E("()=>{setTool('ellipse');handleClick({x:0,y:0});handleClick({x:20,y:20});handleClick({x:-5,y:5});var e=S.ents[0];return [e.rot*180/Math.PI,e.rx,e.ry,hitEnt(e,20,20),hitEnt(e,20,0)];}")
    ok('ELLIPSE com eixo a 45°',abs(r[0]-45)<1e-6 and abs(r[1]-math.hypot(20,20))<1e-6 and abs(r[2]-math.hypot(5,5))<1e-6 and r[3] and not r[4],r)
    # 6 rotate arco
    reset(); r=E("()=>{addE({tp:'arc',cx:10,cy:0,r:5,sa:0,ea:Math.PI/2});rotat(S.ents[0],{x:0,y:0},Math.PI/2);var a=S.ents[0];return [a.cx,a.cy,a.sa*180/Math.PI,a.ea*180/Math.PI];}")
    ok('ROTATE arco 90°',abs(r[0])<1e-9 and abs(r[1]-10)<1e-9 and abs(r[2]-90)<1e-6 and abs(r[3]-180)<1e-6,r)
    # 7 rotate/mirror rect
    reset(); r=E("()=>{addE({tp:'rect',x:0,y:0,w:20,h:10});rotat(S.ents[0],{x:0,y:0},Math.PI/6);var e=S.ents[0];return [e.tp,e.pts.length,e.closed,e.pts[1].x,e.pts[1].y];}")
    ok('ROTATE retângulo vira polilinha girada',r[0]=='pl' and r[1]==5 and r[2] and abs(r[3]-20*math.cos(math.pi/6))<1e-9 and abs(r[4]-10)<1e-9,r)
    reset(); r=E("()=>{addE({tp:'rect',x:10,y:0,w:20,h:10});mirr(S.ents[0],{x:0,y:0},{x:0,y:1});var b=bbox(S.ents[0]);return [b.x,b.y,b.w,b.h];}")
    ok('MIRROR retângulo no eixo Y',[round(v,9) for v in r]==[-30,0,20,10],r)
    # 8 mirror arco
    reset(); r=E("()=>{addE({tp:'arc',cx:10,cy:0,r:5,sa:0,ea:Math.PI/2});mirr(S.ents[0],{x:0,y:0},{x:0,y:1});var a=S.ents[0];var m=Math.atan2(5*Math.sin(Math.PI/4),-5*Math.cos(Math.PI/4));return [a.cx,arcHas(m,a.sa,a.ea),arcHas(-Math.PI/4,a.sa,a.ea)];}")
    ok('MIRROR arco',abs(r[0]+10)<1e-9 and r[1] and not r[2],r)
    # 9 spline/dim/ellipse transformam
    reset(); r=E("()=>{addE({tp:'spline',pts:[{x:0,y:0},{x:10,y:5},{x:20,y:0}]});scalE(S.ents[0],{x:0,y:0},2);rotat(S.ents[0],{x:0,y:0},Math.PI);return S.ents[0].pts[2];}")
    ok('SCALE/ROTATE spline',abs(r['x']+40)<1e-9 and abs(r['y'])<1e-9,r)
    reset(); r=E("()=>{addE({tp:'dim',subtp:'linear',dimDir:'h',x1:0,y1:0,x2:50,y2:0,px:25,py:10,val:'50.00'});rotat(S.ents[0],{x:0,y:0},Math.PI/2);var d=S.ents[0];var a=[d.dimDir,d.x2,d.y2];addE({tp:'dim',subtp:'linear',dimDir:'h',x1:0,y1:0,x2:50,y2:0,px:25,py:10,val:'50.00'});rotat(S.ents[1],{x:0,y:0},Math.PI/6);a.push(S.ents[1].subtp,S.ents[1].val);scalE(S.ents[1],{x:0,y:0},2);a.push(S.ents[1].val);return a;}")
    ok('ROTATE/SCALE cotas',r[0]=='v' and abs(r[1])<1e-9 and abs(r[2]-50)<1e-9 and r[3]=='aligned' and r[4]=='50.00' and r[5]=='100.00',r)
    # 10 offset
    reset(); r=E("()=>{addE({tp:'pl',closed:true,pts:[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10},{x:0,y:0}]});var c=clon(S.ents[0]);offsE(c,offsetSide(c,20,20,2));return bbox(c);}")
    ok('OFFSET polilinha fechada para fora',[round(v,9) for v in (r['x'],r['y'],r['w'],r['h'])]==[-2,-2,14,14],r)
    reset(); r=E("()=>{addE({tp:'pl',closed:false,pts:[{x:0,y:0},{x:10,y:0},{x:10,y:10}]});var c=clon(S.ents[0]);offsE(c,offsetSide(c,5,1,1));return c.pts;}")
    ok('OFFSET polilinha aberta (lado interno)',abs(r[1]['x']-9)<1e-9 and abs(r[1]['y']-1)<1e-9,r)
    reset(); r=E("()=>{addE({tp:'spline',pts:[{x:0,y:0},{x:10,y:5},{x:20,y:0}]});setTool('offset');S.ds={phase:'pick',dist:2};handleClick({x:10,y:3.9});return [S.ents.length,S.ds.phase];}")
    ok('OFFSET spline recusado sem duplicar',r==[1,'pick'],r)
    # 11 fillet/chamfer extremidade correta
    reset(); r=E("()=>{addE({tp:'line',x1:0,y1:0,x2:100,y2:0});addE({tp:'line',x1:100,y1:0,x2:100,y2:100});var a=S.ents[0],b=S.ents[1];doFillet(a,b,10,{x:10,y:0},{x:100,y:90});return [a.x1,a.x2,b.y1,b.y2,S.ents.length];}")
    ok('FILLET clique longe do canto mantém a parte clicada',[round(v,9) for v in r]==[0,90,10,100,3],r)
    reset(); r=E("()=>{addE({tp:'line',x1:0,y1:0,x2:100,y2:0});addE({tp:'line',x1:100,y1:0,x2:100,y2:100});var a=S.ents[0],b=S.ents[1];doChamfer(a,b,5,5,{x:10,y:0},{x:100,y:90});var n=S.ents.length;undo();return [a.x2,b.y1,n,S.ents.length,S.ents[0].x2];}")
    ok('CHAMFER extremidade correta + undo em 1 passo',r==[95,5,3,2,100],r)
    reset(); r=E("()=>{addE({tp:'line',x1:0,y1:0,x2:100,y2:0});addE({tp:'line',x1:80,y1:-20,x2:80,y2:100});var a=S.ents[0],b=S.ents[1];doFillet(a,b,0,{x:10,y:0},{x:80,y:90});return [a.x1,a.x2,b.y1,b.y2,S.ents.length];}")
    ok('FILLET r=0 em linhas que se cruzam (canto vivo, sem arco)',r==[0,80,0,100,2],r)
    # 12 IDs e XSS no carregamento
    reset()
    doc={'v':'5','ents':[{'id':'e1001','tp':'line','x1':0,'y1':0,'x2':1,'y2':1,'ly':0},{'id':'e1002','tp':'line','x1':0,'y1':0,'x2':2,'y2':1,'ly':7}],
         'layers':[{'id':0,'nm':'0','col':'#ffffff','vis':True,'lock':False},{'id':7,'nm':'<img src=x onerror="window.__xss=1">','col':'red;background:url(x)','vis':True,'lock':False}]}
    open(DOCJ,'w').write(json.dumps(doc))
    pg.set_input_files('#fileInput',DOCJ); pg.wait_for_timeout(300)
    r=E("()=>{addE({tp:'line',x1:5,y1:5,x2:6,y2:6});var ids=S.ents.map(e=>e.id);return {ids:ids,xss:window.__xss||0,img:document.querySelectorAll('#lylist img').length};}")
    ok('IDs únicos após carregar arquivo',len(set(r['ids']))==3,r['ids'])
    ok('XSS por nome de camada bloqueado',r['xss']==0 and r['img']==0,r)
    pg.set_input_files('#fileInput',{'name':'bad.json','mimeType':'application/json','buffer':b'{"ents":[{"tp":"virus"}]}'}); pg.wait_for_timeout(200)
    ok('JSON inválido rejeitado sem alterar o desenho',E("S.ents.length")==3)
    # 13 snap: OSNAP vence ORTHO
    reset(); E("()=>{addE({tp:'line',x1:30,y1:20,x2:60,y2:40});S.modes.ortho=true;setTool('line');handleClick({x:0,y:0});}")
    sx,sy=E("w2s(30.5,20.5)").values()
    r=E(f"doSnap({sx},{sy})"); E("()=>{S.modes.ortho=false;cancelTool();}")
    ok('OSNAP endpoint prevalece sobre ORTHO',r['st']=='end' and abs(r['x']-30)<1e-9,r)
    # 14 COPY coordenada relativa
    reset(); r=E("()=>{addE({tp:'circ',cx:0,cy:0,r:5});S.sel=[S.ents[0].id];setTool('copy');handleClick({x:0,y:0});S.hover={x:300,y:300};return 1;}")
    pg.click('#cmdinput'); pg.keyboard.type('@50,0'); pg.keyboard.press('Enter'); pg.keyboard.type('25'); pg.keyboard.press('Enter')
    r=E("S.ents.map(e=>[e.cx,e.cy])")
    ok('COPY @dx,dy relativo ao ponto base',len(r)>=2 and r[1]==[50,0],r)
    # 15 seleção por janela pega texto e cota; zoomFit considera
    reset(); r=E("()=>{addE({tp:'txt',x:10,y:10,txt:'ABC',h:5});addE({tp:'dimr',cx:0,cy:0,ex:5,ey:0,val:'5'});S.winFrom={x:-20,y:-20};S.hover={x:50,y:50};S.isWin=true;finishWin();return S.sel.length;}")
    ok('Janela seleciona texto e cota',r==2,r)
    # 16 Espaço repete último comando
    reset(); E("()=>{setTool('circle');setTool('select');document.activeElement.blur();}"); pg.keyboard.press(' ')
    ok('Espaço = Enter (repete último comando)',E("S.tool")=='circle'); pg.keyboard.press('Escape')
    # 17 excluir camada move objetos
    reset(); r=E("()=>{S.layers.push({id:99,nm:'Tmp',col:'#ff0000',vis:true,lock:false,ld:'solid',lw:.5});S.curLy=99;addE({tp:'line',x1:0,y1:0,x2:1,y2:0});delLayer();return [S.ents.length,S.ents[0].ly,!!getLy(99)];}")
    ok('Excluir camada move objetos para a 0',r==[1,0,False],r)
    # 18 desempenho do snap
    r=E("()=>{S.ents=[];for(var i=0;i<2000;i++){var a=Math.random()*1000,b=Math.random()*1000;S.ents.push({id:'p'+i,tp:'line',x1:a,y1:b,x2:a+Math.random()*50,y2:b+Math.random()*50,ly:0});}var t=performance.now();for(var k=0;k<20;k++)doSnap(400+k,300);return (performance.now()-t)/20;}")
    ok('doSnap com 2000 linhas < 16 ms',r<16,f'{r:.2f} ms/movimento')
    # 19 exportações
    reset()
    E("""()=>{loadDemo();addE({tp:'rect',x:100,y:0,w:30,h:20});addE({tp:'pl',closed:true,pts:[{x:0,y:100},{x:20,y:100},{x:10,y:120},{x:0,y:100}]});
      addE({tp:'ell',cx:200,cy:0,rx:20,ry:10,rot:0.5});addE({tp:'spline',pts:[{x:0,y:200},{x:20,y:220},{x:40,y:200}]});
      addE({tp:'hatch',x:300,y:0,w:40,h:30,ang:45,sp:5,htype:'lines'});addE({tp:'hatch',x:350,y:0,w:40,h:30,ang:0,sp:5,htype:'dots'});
      addE({tp:'arc',cx:0,cy:-100,r:10,sa:0,ea:2});addE({tp:'txt',x:0,y:-150,txt:'Ação ° Ø <&>',h:5,rot:0.3});
      addE({tp:'dim',subtp:'aligned',x1:0,y1:0,x2:30,y2:30,px:0,py:30,val:'42.43'});addE({tp:'dimd',cx:0,cy:0,ex:28,ey:0,val:'56.00'});
      addE({tp:'dima',x1:10,y1:0,vx:0,vy:0,x2:0,y2:10,val:'90.0'});}""")
    dxf=E("buildDXF()"); open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'_saida.dxf'),'w',encoding='ascii',errors='strict').write(dxf)
    svg=E("buildSVG()"); open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'_saida.svg'),'w').write(svg)
    nE=E("S.ents.length")
    try:
        from ezdxf import recover
        _d,_a=recover.readfile(os.path.join(os.path.dirname(os.path.abspath(__file__)),'_saida.dxf'))
        _tipos=set(x.dxftype() for x in _d.modelspace())
        ok('DXF R12 válido (ezdxf) com polilinhas, sólidos e textos',_d.dxfversion=='AC1009' and not _a.errors and {'POLYLINE','SOLID','TEXT','ARC','CIRCLE','LINE'}<=_tipos,sorted(_tipos))
    except ImportError:
        print('(ezdxf não instalado: validação do DXF ignorada — pip install ezdxf)')
    import xml.dom.minidom
    xml.dom.minidom.parseString(svg.encode('utf8')); ok('SVG bem-formado',True)
    with pg.expect_download() as dl: E("expPNG()")
    ok('PNG exporta sem erro',dl.value.suggested_filename=='educad.png')
    print('entidades no desenho:',nE)
    ok('Sem erros JavaScript na página',not errs,errs)
    b.close()
for _f in ('_doc.json','_saida.dxf','_saida.svg'):
    try: os.remove(os.path.join(os.path.dirname(os.path.abspath(__file__)),_f))
    except OSError: pass
fails=[n for n,c,_ in R if not c]; print(f'\n{len(R)-len(fails)}/{len(R)} testes OK'); sys.exit(1 if fails else 0)
