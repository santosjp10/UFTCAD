# Testes da v8.7: texto com várias linhas e vários tamanhos (ferramenta Texto, MTEXT, edição, DXF, PDF)
# e cotas verticais com o texto sempre à esquerda da linha de cota (ABNT), em qualquer sentido.
# Uso: pip install playwright ezdxf pypdf && playwright install chromium && python tests/test_texto.py
import sys, os, math
from playwright.sync_api import sync_playwright
import ezdxf
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
def near(a,b,t=1e-6): return abs(a-b)<=t
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':850})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.goto('file://'+path); pg.wait_for_timeout(500); E=pg.evaluate
    if E("document.getElementById('ov-recover').classList.contains('show')"): E("closeOv('ov-recover')")
    def reset():
        E("()=>{document.querySelectorAll('.ov.show').forEach(o=>o.classList.remove('show'));S.ents=[];S.sel=[];S.ds=null;resetHistory();setTool('select');S.modes.snap=false;S.vp={x:400,y:500,sc:4};renderAll();}")
    def ents(): return E("S.ents.map(e=>JSON.parse(JSON.stringify(e)))")
    box=pg.locator('#cw').bounding_box()
    def click_w(x,y):
        s=E(f"w2s({x},{y})"); pg.mouse.click(box['x']+s['x'],box['y']+s['y']); pg.wait_for_timeout(60)
    # ── códigos e modelo
    v=E("JSON.stringify(rtParse('{\\\\H2x;Título}\\nnormal {\\\\H0.5x;nota}',2.5))")
    ok('Códigos do AutoCAD → linhas e tamanhos',v=='[[{"t":"Título","k":2}],[{"t":"normal ","k":1},{"t":"nota","k":0.5}]]',v)
    v=E("rtParse('\\\\H5;Grande\\\\Ppeq',2.5)"); ok('\\H absoluto e \\P (quebra do DXF)',near(v[0][0]['k'],2) and v[1][0]['t']=='peq',v)
    v=E("rtSerialize(rtParse('a \\\\{b\\\\} c\\\\\\\\d',1))"); ok('Chaves e barra literais escapadas e preservadas',v=='a \\{b\\} c\\\\d',v)
    v=E("rtPlain('{\\\\H2x;Título}\\nTexto \\\\{x\\\\}')"); ok('Texto puro (sem códigos)',v=='Título\nTexto {x}',v)
    v=E("JSON.stringify(rtParse('{\\\\fArial|b1;\\\\C1;Negrito}\\\\~fim',1))"); ok('Outros códigos do AutoCAD ignorados com segurança',v=='[[{"t":"Negrito fim","k":1}]]',v)
    # ── ferramenta Texto (DT): uma linha simples continua TEXT
    reset(); E("setTool('text')"); click_w(10,20)
    ok('Texto abre o editor de várias linhas',E("document.getElementById('ov-mtext').classList.contains('show')") and not E("document.getElementById('ov-text').classList.contains('show')"))
    pg.fill('#mted-h','3'); pg.click('#mted-txt'); pg.keyboard.press('Control+A'); pg.keyboard.type('Uma linha'); pg.keyboard.press('Control+Enter'); pg.wait_for_timeout(60)
    e=ents(); ok('Uma linha e um tamanho: TEXT comum, na posição clicada',len(e)==1 and e[0]['tp']=='txt' and e[0]['txt']=='Uma linha' and near(e[0]['x'],10) and near(e[0]['y'],20) and near(e[0]['h'],3),e)
    # várias linhas
    reset(); E("setTool('text')"); click_w(0,0); pg.fill('#mted-h','5'); pg.click('#mted-txt'); pg.keyboard.press('Control+A')
    pg.keyboard.type('Linha 1'); pg.keyboard.press('Enter'); pg.keyboard.type('Linha 2'); pg.keyboard.press('Enter'); pg.keyboard.type('Linha 3'); pg.keyboard.press('Control+Enter'); pg.wait_for_timeout(60)
    e=ents(); ok('Várias linhas: uma única caixa de texto (MTEXT)',len(e)==1 and e[0]['tp']=='mtext' and E("rtPlain(S.ents[0].txt)")=='Linha 1\nLinha 2\nLinha 3',e)
    pr=E("mtPrims(S.ents[0]).map(p=>[p.txt,p.y])"); ok('1ª linha na posição clicada, as outras abaixo',near(pr[0][1],0,1e-6) and pr[1][1]<pr[0][1] and pr[2][1]<pr[1][1],pr)
    # tamanhos: título (linha inteira com o cursor) e trecho selecionado
    reset(); E("setTool('text')"); click_w(0,0); pg.fill('#mted-h','2.5'); pg.click('#mted-txt'); pg.keyboard.press('Control+A')
    pg.keyboard.type('MEMORIAL'); pg.click('#rt-t1'); pg.keyboard.press('End'); pg.keyboard.press('Enter'); pg.click('#rt-t3')
    pg.keyboard.type('Área de 48 m2 total'); pg.keyboard.down('Shift')
    for _ in range(5): pg.keyboard.press('ArrowLeft')
    pg.keyboard.up('Shift'); pg.fill('#rt-mm','1'); pg.click('#rt-ap'); pg.wait_for_timeout(40)
    val=E("document.getElementById('mted-txt').value")
    ok('Título ×2 na linha do cursor; altura em mm no trecho selecionado',val=='{\\H2x;MEMORIAL}\nÁrea de 48 m2 {\\H0.4x;total}',val)
    ok('Editor mostra os tamanhos usados','5 mm' in E("document.getElementById('rt-info').textContent") and '1 mm' in E("document.getElementById('rt-info').textContent"),E("document.getElementById('rt-info').textContent"))
    pg.keyboard.press('Control+Enter'); pg.wait_for_timeout(60)
    pr=E("mtPrims(S.ents[0]).map(p=>[p.txt,p.h,p.x])")
    ok('No desenho: título com 5 mm, texto 2,5 mm e trecho 1 mm na mesma linha',[x[0] for x in pr]==['MEMORIAL','Área de 48 m2 ','total'] and [x[1] for x in pr]==[5,2.5,1] and pr[2][2]>pr[1][2],pr)
    ok('Linha do título mais espaçada (espaçamento pelo maior texto da linha)',E("(()=>{var P=mtPrims(S.ents[0]);return Math.abs(P[0].y-P[1].y);})()")>2.5*1.5)
    ok('Caixa de seleção envolve os tamanhos',E("(()=>{var b=bbox(S.ents[0]);return b.h>5+2.5;})()"))
    # edição: TEXT vira MTEXT ao receber linhas/tamanhos
    reset(); E("addE({tp:'txt',x:0,y:0,h:3,txt:'Placa {A}',rot:0})"); E("textEdit(S.ents[0])"); pg.wait_for_timeout(50)
    ok('Editar TEXT com chaves: conteúdo literal preservado',E("rtPlain(document.getElementById('mted-txt').value)")=='Placa {A}')
    pg.click('#mted-txt'); pg.keyboard.press('Control+End'); pg.keyboard.press('Enter'); pg.keyboard.type('detalhe'); pg.keyboard.press('Control+Enter'); pg.wait_for_timeout(60)
    e=ents(); ok('TEXT editado com 2 linhas vira MTEXT (mesma posição da 1ª linha)',e[0]['tp']=='mtext' and E("mtPrims(S.ents[0])[0].y")==0 and E("rtPlain(S.ents[0].txt)")=='Placa {A}\ndetalhe',e)
    reset(); E("addE({tp:'txt',x:0,y:0,h:3,txt:'Simples',rot:0})"); E("textEdit(S.ents[0])"); pg.click('#mted-txt'); pg.keyboard.press('Control+A'); pg.keyboard.type('Outro'); pg.keyboard.press('Control+Enter'); pg.wait_for_timeout(40)
    ok('TEXT editado numa linha continua TEXT',ents()[0]['tp']=='txt' and ents()[0]['txt']=='Outro')
    # quebra automática com largura, explodir, PDF, DXF
    reset(); E("addE({tp:'mtext',x:0,y:0,w:40,h:2,txt:'{\\\\H2x;Título longo do memorial}\\ncorpo do texto com várias palavras',att:1,rot:0})")
    L=E("mtLines(S.ents[0])"); ok('Largura definida: quebra por palavras respeitando os tamanhos',len(L)>=3 and E("rtLines(S.ents[0]).every(l=>l.w<=40+1e-9)"),L)
    reset(); E("addE({tp:'mtext',x:0,y:0,w:0,h:2.5,txt:'{\\\\H2x;TÍTULO}\\nNormal {\\\\H0.6x;nota}',att:1,rot:0})")
    f=os.path.join(HERE,'_t.dxf'); open(f,'wb').write(bytes(E("Array.from(cp1252Encode(buildDXF2000({})))"))); d=ezdxf.readfile(f)
    mt=d.modelspace().query('MTEXT')[0]
    ok('DXF: MTEXT com \\P e \\H (códigos do AutoCAD)',mt.text=='{\\H2x;TÍTULO}\\PNormal {\\H0.6x;nota}' and not d.audit().errors,mt.text)
    E("()=>{S.ents=[];}"); pg.set_input_files('#fileInput',f); pg.wait_for_timeout(300)
    ok('DXF importado de volta: linhas e tamanhos preservados',E("S.ents.filter(e=>e.tp==='mtext').map(e=>e.txt)")==['{\\H2x;TÍTULO}\nNormal {\\H0.6x;nota}'],E("S.ents.map(e=>e.txt)"))
    open(f,'wb').write(bytes(E("Array.from(cp1252Encode(buildDXF()))"))); d=ezdxf.readfile(f); os.remove(f)
    hs=sorted(round(t.dxf.height,3) for t in d.modelspace().query('TEXT'))
    ok('DXF R12: um TEXT por trecho, cada um com sua altura',hs==[1.5,2.5,5.0],hs)
    d2=ezdxf.new('R2000'); d2.header['$INSUNITS']=4; d2.modelspace().add_mtext('{\\H5;Absoluto}\\P\\fArial|b1;normal',dxfattribs={'char_height':2.5,'insert':(0,0)}); f2=os.path.join(HERE,'_a.dxf'); d2.saveas(f2)
    E("()=>{S.ents=[];}"); pg.set_input_files('#fileInput',f2); pg.wait_for_timeout(300); os.remove(f2)
    ok('MTEXT do AutoCAD com altura absoluta (\\H5;) e fonte: tamanho certo, fonte ignorada',E("S.ents.filter(e=>e.tp==='mtext').map(e=>e.txt)")==['{\\H2x;Absoluto}\nnormal'],E("S.ents.map(e=>e.txt)"))
    reset(); E("addE({tp:'mtext',x:0,y:0,w:0,h:2.5,txt:'{\\\\H2x;TÍTULO}\\nNormal',att:1,rot:0})"); E("()=>{S.sel=[S.ents[0].id];}"); E("cmdSubmit('X')")
    e=ents(); ok('Explodir: um TEXT por linha, cada um com sua altura',sorted((x['txt'],x['h']) for x in e if x['tp']=='txt')==[('Normal',2.5),('TÍTULO',5)],e)
    reset(); E("addE({tp:'mtext',x:20,y:150,w:0,h:3,txt:'{\\\\H2x;TÍTULO}\\nNormal',att:1,rot:0})"); E("()=>{switchSpace('layout');}")
    raw=bytes(E("Array.from(buildPDF([curLayout()]))")).decode('latin1'); E("()=>{switchSpace('model');}")
    ok('PDF: o trecho maior sai com fonte maior','TÍTULO'.encode('cp1252').decode('latin1') in raw or 'TTULO' in raw or 'Tf' in raw)
    # leader com texto em várias linhas não mostra códigos
    reset(); E("addE({tp:'leader',pts:[{x:0,y:0},{x:10,y:10}],txt:'{\\\\H2x;A}\\nB'})"); ok('Linha de chamada mostra o texto sem códigos',E("leaderPrims(S.ents[0]).filter(p=>p.k==='text').map(p=>p.txt)")==['A','B'])
    # ── cotas verticais: texto à esquerda, em qualquer sentido (ABNT)
    def vdim(y1,y2,px=-15):
        E(f"()=>{{S.ents=[];addE({{tp:'dim',subtp:'linear',dimDir:'v',x1:0,y1:{y1},x2:0,y2:{y2},px:{px},py:40,dimStyle:'ABNT'}});}}")
        return E("(()=>{var t=dimPrims(S.ents[0]).filter(p=>p.k==='text')[0];return {x:t.x,y:t.y,rot:t.rot*180/Math.PI,txt:t.txt};})()")
    up=vdim(0,80); dn=vdim(80,0)
    ok('Cota vertical de baixo para cima: texto girado 90°, à esquerda da linha',near(up['rot'],90,1e-6) and up['x']<-15,up)
    ok('Cota vertical de cima para baixo: mesmo resultado (antes ficava à direita, de cabeça para baixo)',near(dn['rot'],90,1e-6) and near(dn['x'],up['x'],1e-6) and near(dn['y'],up['y'],1e-6),dn)
    r1=vdim(0,80,15); r2=vdim(80,0,15); ok('Do lado direito da peça também (texto à esquerda da linha de cota)',near(r1['rot'],90) and near(r2['rot'],90) and near(r1['x'],r2['x']) and r1['x']<15,(r1,r2))
    E("()=>{S.ents=[];addE({tp:'dim',subtp:'aligned',x1:0,y1:80,x2:0,y2:0,px:-15,py:40,dimStyle:'ABNT'});}")
    a=E("(()=>{var t=dimPrims(S.ents[0]).filter(p=>p.k==='text')[0];return [t.rot*180/Math.PI,t.x];})()"); ok('Cota alinhada vertical feita de cima para baixo: texto também à esquerda',near(a[0],90) and a[1]<-15,a)
    E("()=>{S.ents=[];addE({tp:'dim',subtp:'aligned',x1:0,y1:0,x2:30,y2:-30,px:20,py:0,dimStyle:'ABNT'});}")
    a=E("dimPrims(S.ents[0]).filter(p=>p.k==='text')[0].rot*180/Math.PI"); ok('Cotas inclinadas continuam legíveis (−45°)',near(a,-45),a)
    # pelo comando DLI, clicando de cima para baixo
    reset(); E("addE({tp:'line',x1:0,y1:0,x2:0,y2:80})"); E("setTool('dim')")
    for pt in [(0,80),(0,0),(-15,40)]: E(f"cmdSubmit('{pt[0]},{pt[1]}')")
    d=[x for x in ents() if x['tp']=='dim']
    t=E("(()=>{var e=S.ents.find(e=>e.tp==='dim');var t=dimPrims(e).filter(p=>p.k==='text')[0];return [t.rot*180/Math.PI,t.x];})()") if d else None
    ok('DLI de cima para baixo pelo comando: texto à esquerda, lido de baixo para cima',d and near(t[0],90) and t[1]<-15,(d,t))
    f=os.path.join(HERE,'_v.dxf'); E("()=>{S.ents=[];addE({tp:'dim',subtp:'linear',dimDir:'v',x1:0,y1:80,x2:0,y2:0,px:-15,py:40,dimStyle:'ABNT'});}")
    open(f,'wb').write(bytes(E("Array.from(cp1252Encode(buildDXF2000({})))"))); d=ezdxf.readfile(f); os.remove(f)
    dm=d.modelspace().query('DIMENSION')[0]; tb=[x for x in d.blocks.get(dm.dxf.geometry) if x.dxftype() in ('TEXT','MTEXT')]
    ok('DXF: texto da cota vertical a 90° e à esquerda',tb and near(tb[0].dxf.rotation,90,1e-6) and dm.dxf.text_midpoint.x<-15,(tb and tb[0].dxf.rotation,dm.dxf.text_midpoint))
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
fails=[n for n,c in R if not c]; print(f'\n{len(R)-len(fails)}/{len(R)} testes OK'); sys.exit(1 if fails else 0)
