# Testes do espaço do papel (v7.4, pacote L1): abas de layout, objetos no papel, viewports,
# MSPACE, estilos de plotagem, espessuras em mm, carimbo ABNT, salvar/abrir e impressão.
# Uso: pip install playwright && playwright install chromium && python tests/test_layout.py
import sys, os, json
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
def near(a,b,t=1e-6): return abs(a-b)<t
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':850})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept(PROMPT[0]) if PROMPT[0] is not None else d.accept())
    PROMPT=[None]
    pg.goto('file://'+path); pg.wait_for_timeout(400); E=pg.evaluate
    box=pg.locator('#cw').bounding_box()
    def scr(x,y): s=E(f"w2s({x},{y})"); return box['x']+s['x'],box['y']+s['y']
    def click(x,y): pg.mouse.move(*scr(x,y)); pg.mouse.click(*scr(x,y)); pg.wait_for_timeout(30)
    def blur(): E("document.activeElement.blur()")
    def typ(t): blur(); pg.keyboard.type(t); pg.keyboard.press('Enter'); pg.wait_for_timeout(30)
    E("()=>{S.modes.snap=false;addE({tp:'rect',x:0,y:0,w:6000,h:3500,lw:.7,col:'#ff0000'});addE({tp:'circ',cx:1500,cy:1750,r:600});}")
    # ── abrir o layout
    pg.click('#tab-layout1'); pg.wait_for_timeout(150)
    ok('Aba Layout abre o espaço do papel',E("S.space")!='model' and E("document.body.classList.contains('paper')"))
    ok('Layout1 criado com uma viewport',E("S.ents.length")==1 and E("S.ents[0].tp")=='viewport')
    ok('Escala da viewport ajustada a uma escala da NBR 8196',E("ratioLabel(vpRatio(curViewport()))") in ['1:20','1:25','1:50','1:75','1:100'],E("ratioLabel(vpRatio(curViewport()))"))
    ok('Margens ABNT da A4 (esquerda 25, demais 7)',E("JSON.stringify(curLayout().margins)")=='{"t":7,"r":7,"b":7,"l":25}')
    a=E("w2s(0,curLayout().paper.h)"); c=E("w2s(curLayout().paper.w,0)")
    ok('Folha inteira visível ao abrir',a['x']>=0 and a['y']>=0 and c['x']<=E("S.W") and c['y']<=E("S.H")-40,(a,c))
    v=E("(()=>{var v=curViewport();return vpModelToPaper(v,3000,1750);})()"); vc=E("(()=>{var v=curViewport();return {x:v.x+v.w/2,y:v.y+v.h/2};})()")
    ok('Viewport centrada no desenho',near(v['x'],vc['x'],1e-6) and near(v['y'],vc['y'],1e-6))
    # ── desenhar no papel
    typ('L'); click(30,20); click(80,20); pg.keyboard.press('Escape')
    ok('Linha desenhada fica no papel',E("S.ents.filter(e=>e.tp==='line').length")==1 and near(E("S.ents.find(e=>e.tp==='line').x2"),80,0.6))
    pg.click('#tab-model'); pg.wait_for_timeout(80)
    ok('O modelo não recebe a linha do papel',E("S.space")=='model' and E("S.ents.length")==2)
    E("undo()"); ok('Desfazer no modelo não mexe no papel',E("S.ents.length")==1)
    E("redo()"); pg.click('#tab-layout1'); pg.wait_for_timeout(80)
    ok('Voltando ao layout, a linha continua lá',E("S.ents.filter(e=>e.tp==='line').length")==1)
    # ── estilos de plotagem e espessura
    ok('Monocromático: vermelho sai preto no papel',E("plotCol('#ff0000')")=='#000000')
    E("()=>{curLayout().plotStyle='color';}")
    ok('Colorido: vermelho continua vermelho e branco vira preto',E("plotCol('#ff0000')")=='#ff0000' and E("plotCol('#dce4f5')")=='#000000')
    E("()=>{curLayout().plotStyle='gray';}"); g=E("plotCol('#ff0000')")
    ok('Tons de cinza',g.startswith('#') and g[1:3]==g[3:5]==g[5:7],g); E("()=>{curLayout().plotStyle='mono';}")
    lw=E("(()=>{var c=document.createElement('canvas').getContext('2d');renderAll();applyStyle(c,{tp:'line',lw:.5,ly:0},false);return c.lineWidth/S.paperPx;})()")
    ok('Espessura em mm reais na folha (0,50 mm)',near(lw,0.5,1e-6),lw)
    # ── escala da viewport pela barra
    pg.select_option('#lc-scale','0.01'); pg.wait_for_timeout(50)
    ok('Barra de página muda a escala da viewport (1:100)',E("ratioLabel(vpRatio(curViewport()))")=='1:100')
    # ── grips da viewport
    E("()=>{var v=curViewport();S.sel=[v.id];renderAll();}")
    m0=E("(()=>{var v=curViewport();return vpModelToPaper(v,1500,1750);})()")
    vv=E("(()=>{var v=curViewport();return [v.x+v.w,v.y];})()")
    click(vv[0],vv[1]); click(vv[0]-20,vv[1]+10)
    m1=E("(()=>{var v=curViewport();return vpModelToPaper(v,1500,1750);})()")
    ok('Redimensionar a viewport pelo grip não move o desenho no papel',near(m0['x'],m1['x'],1e-6) and near(m0['y'],m1['y'],1e-6) and near(E("curViewport().w"),E("printableRect(curLayout()).w")-20,0.6))
    pg.keyboard.press('Escape'); pg.keyboard.press('Escape')
    # ── MSPACE
    vcx=E("curViewport().x+curViewport().w/2"); vcy=E("curViewport().y+curViewport().h/2")
    pg.mouse.dblclick(*scr(vcx,vcy)); pg.wait_for_timeout(60)
    ok('Duplo clique na viewport entra no MSPACE',E("S.mspace")==E("curViewport().id"))
    k0=E("curViewport().k"); pg.mouse.move(*scr(vcx,vcy)); pg.mouse.wheel(0,-200); pg.wait_for_timeout(60)
    ok('Roda do mouse no MSPACE muda a escala da vista',E("curViewport().k")>k0)
    cx0=E("curViewport().cx"); pg.mouse.move(*scr(vcx,vcy)); pg.mouse.down(); pg.mouse.move(*scr(vcx+20,vcy),steps=5); pg.mouse.up(); pg.wait_for_timeout(40)
    ok('Arrastar no MSPACE move a vista do modelo',E("curViewport().cx")<cx0)
    ok('MSPACE não cria objetos no papel',E("S.ents.filter(e=>e.tp==='line').length")==1)
    pg.keyboard.press('Escape'); ok('Esc volta ao PSPACE',E("S.mspace")==None)
    # ── carimbo ABNT
    E("layoutFit()"); vy0=E("curViewport().y"); typ('CARIMBO')
    tps=E("S.ents.map(e=>e.tp)")
    ok('CARIMBO insere margem, bloco da legenda e campos editáveis',tps.count('insert')==1 and tps.count('mtext')>=8 and tps.count('pl')==1,tps)
    esc=E("S.ents.filter(e=>e.tp==='mtext').map(e=>e.txt)"); lbl=E("ratioLabel(vpRatio(curViewport()))")
    ok('Campo ESCALA do carimbo = escala da viewport',lbl in esc,(lbl,esc))
    ok('Viewport ajustada pelo usuário não é mexida pelo carimbo',near(E("curViewport().y"),vy0))
    E("()=>{var L=newLayoutObj('T','A4',true);S.layouts.push(L);switchSpace(L.id);titleBlockInsert();}")
    ok('Viewport automática de layout novo fica acima do carimbo',E("curViewport().y")>=E("printableRect(curLayout()).y")+40)
    E("()=>{var id=S.space;switchSpace(S.layouts[0].id);S.layouts=S.layouts.filter(l=>l.id!==id);buildLayoutTabs();}")
    # ── MVIEW
    typ('MV'); click(200,150); click(260,190)
    ok('MVIEW cria uma segunda viewport',E("S.ents.filter(e=>e.tp==='viewport').length")==2)
    # ── vários layouts
    pg.click('#tabbar .tb-add'); pg.wait_for_timeout(80)
    ok('Botão + cria Layout2',E("S.layouts.length")==2 and E("curLayout().name")=='Layout2')
    PROMPT[0]='Planta – A3'; E("layoutRename(curLayout().id)"); PROMPT[0]=None
    pg.select_option('#lc-paper','A3'); pg.wait_for_timeout(40)
    ok('Renomear e mudar a folha para A3 (margens NBR)',E("curLayout().name")=='Planta – A3' and E("curLayout().paper.w")==420 and E("curLayout().margins.l")==25)
    E("()=>{var L=S.layouts[0];layoutNew(L);}")
    ok('Duplicar layout copia o conteúdo',E("S.layouts.length")==3 and E("S.ents.filter(e=>e.tp==='viewport').length")==2)
    E("layoutDelete(curLayout().id)"); ok('Excluir layout',E("S.layouts.length")==2)
    # ── salvar e abrir
    doc=E("()=>{let b=null;const o=URL.createObjectURL;URL.createObjectURL=x=>{b=x;return 'blob:x'};try{saveDoc();}finally{URL.createObjectURL=o;}return b.text();}")
    d=json.loads(doc)
    ok('Arquivo salvo contém o modelo e os layouts',len(d['ents'])==2 and len(d['layouts'])==2 and any(e['tp']=='insert' for e in d['layouts'][0]['ents']))
    f=os.path.join(HERE,'_lay.json'); open(f,'w').write(doc)
    E("newDoc()"); ok('Novo documento: sem layouts personalizados',E("S.layouts.length")==0 and E("S.space")=='model')
    pg.set_input_files('#fileInput',f); pg.wait_for_timeout(250); os.remove(f)
    ok('Abrir restaura modelo, abas e conteúdo dos layouts',E("S.ents.length")==2 and E("S.layouts.map(l=>l.name).join('|')")=='Layout1|Planta – A3' and E("document.querySelectorAll('#tabbar .layout-tab').length")==2)
    E("switchSpace(S.layouts[0].id)")
    ok('Conteúdo do layout reaberto',E("S.ents.filter(e=>e.tp==='viewport').length")==2 and E("S.ents.some(e=>e.tp==='line')"))
    # ── exportações continuam sendo do modelo
    dxf=E("buildDXF2000({})"); ok('DXF exportado de dentro do layout contém o modelo',dxf.count('LWPOLYLINE')>=1 and 'CIRCLE' in dxf)
    # ── impressão em alta resolução
    r=E("(()=>{var L=curLayout(),cv=renderSheet(300/25.4),c=cv.getContext('2d'),v=curViewport(),p=vpModelToPaper(v,0,1750),x=Math.round(p.x*300/25.4),y=Math.round(cv.height-p.y*300/25.4),d=c.getImageData(x-3,y-3,7,7).data,m=255;for(var i=0;i<d.length;i+=4)m=Math.min(m,d[i]);return [cv.width,cv.height,m];})()")
    ok('Folha renderizada a 300 dpi com o desenho em preto',r[0]==round(297*300/25.4) and r[2]<80,r)
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
fails=[n for n,c in R if not c]; print(f'\n{len(R)-len(fails)}/{len(R)} testes OK'); sys.exit(1 if fails else 0)
