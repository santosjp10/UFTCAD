# Testes da saída profissional do layout (v7.6, pacote L3): PDF vetorial em escala exata,
# configuração de página, anotação escalável e layouts/viewports no DXF.
# Uso: pip install playwright ezdxf pypdf && playwright install chromium && python tests/test_layout_l3.py
import sys, os, re, json, io
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
def near(a,b,t=1e-6): return abs(a-b)<t
PT=72/25.4
try:
    import pypdf
except ImportError:
    pypdf=None
def pdf_pages(b):
    r=pypdf.PdfReader(io.BytesIO(bytes(b))); return r
def pdf_lines(content):
    # pares "x y m x y l" (segmentos retos) do fluxo de conteúdo
    return [tuple(map(float,m)) for m in re.findall(r'(-?[\d.]+) (-?[\d.]+) m (-?[\d.]+) (-?[\d.]+) l S',content)]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':850},accept_downloads=True)
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.goto('file://'+path); pg.wait_for_timeout(400); E=pg.evaluate
    # modelo em mm: linha de 6000 mm (vira 120 mm em 1:50)
    E("()=>{S.modes.snap=false;addE({tp:'line',x1:0,y1:0,x2:6000,y2:0,lw:.5});addE({tp:'rect',x:0,y:0,w:6000,h:3000});addE({tp:'line',x1:0,y1:1500,x2:6000,y2:1500,ly:1});addE({tp:'circ',cx:1500,cy:1500,r:500});}")
    E("()=>{switchSpace('layout');var v=curViewport();v.k=1/50;v.cx=3000;v.cy=1500;v.auto=false;titleBlockInsert();}")
    # ── PDF vetorial
    bts=E("Array.from(buildPDF([curLayout()]))"); raw=bytes(bts).decode('latin1')
    ok('PDF gerado pelo aplicativo (cabeçalho e trailer)',raw.startswith('%PDF-1.4') and raw.rstrip().endswith('%%EOF'))
    if pypdf:
        rd=pdf_pages(bts); pg0=rd.pages[0]; mb=pg0.mediabox
        ok('Página A4 paisagem em tamanho exato (297×210 mm)',near(float(mb.width),297*PT,0.01) and near(float(mb.height),210*PT,0.01),(float(mb.width),float(mb.height)))
        txt=pg0.extract_text()
        ok('Textos do carimbo como texto real no PDF (não imagem)','UNIVERSIDADE FEDERAL DO TOCANTINS' in txt and 'Desenho' in txt,txt[:120])
        ok('Sem imagens no PDF (vetorial)','/Image' not in raw and '/XObject' not in raw)
    content=raw[raw.index('stream\n')+7:raw.index('\nendstream')]
    L=[l for l in pdf_lines(content) if abs(l[1]-l[3])<1e-6]
    lens=sorted(round(abs(l[2]-l[0])/PT,3) for l in L)
    ok('Escala exata: 6000 mm a 1:50 = 120,000 mm no PDF',any(abs(x-120)<0.002 for x in lens),lens[-6:])
    ok('Arcos e círculos como curvas Bézier',re.search(r'\d c( |$)',content,re.M) is not None)
    E("()=>{getLy(1).plot=false;}"); c2=bytes(E("Array.from(buildPDF([curLayout()]))")).decode('latin1')
    ok('Camada que não imprime fica fora do PDF',len(pdf_lines(c2[c2.index('stream\n'):]))<len(pdf_lines(content)))
    E("()=>{getLy(1).plot=true;}")
    # ── vários layouts
    E("()=>{var L2=layoutNew();var f=document.getElementById('lc-paper');f.value='A3';layoutApply();}")
    bts2=E("Array.from(expPDF(true))")
    if pypdf:
        rd2=pdf_pages(bts2); sz=[(round(float(q.mediabox.width)/PT),round(float(q.mediabox.height)/PT)) for q in rd2.pages]
        ok('PDF de todos os layouts: uma página por layout no tamanho de cada folha',sz==[(297,210),(420,297)],sz)
    # ── configurar página
    E("()=>{var p=plotCfg(curLayout());p.out='A4';p.fit=true;p.center=true;p.area='paper';}")
    g=E("plotGeom(curLayout())")
    ok('Ajustar A3 numa folha A4',near(g['Wo'],297) and near(g['Ho'],210) and near(g['sc'],min(297/420,210/297),1e-9),g)
    if pypdf:
        r3=pdf_pages(E("Array.from(buildPDF([curLayout()]))")); ok('PDF ajustado sai em A4',round(float(r3.pages[0].mediabox.width)/PT)==297)
    E("()=>{var p=plotCfg(curLayout());p.out='same';p.fit=false;p.area='window';p.win={x:50,y:40,w:100,h:60};p.center=false;p.ox=10;p.oy=20;}")
    g=E("plotGeom(curLayout())"); c3=bytes(E("Array.from(buildPDF([curLayout()]))")).decode('latin1')
    ok('Área por janela com deslocamento',near(g['R']['w'],100) and near(g['ox'],10) and ' W n' in c3)
    E("()=>{switchSpace(S.layouts[0].id);}")
    E("pageSetupOpen()"); ok('Diálogo Configurar página abre',E("document.getElementById('ov-pagesetup').classList.contains('show')")); E("closeOv('ov-pagesetup')")
    # ── anotação escalável
    E("()=>{var st=dspGetStyle('ABNT');st.annot=true;switchSpace('model');addE({tp:'dim',subtp:'linear',dimDir:'h',x1:0,y1:3000,x2:6000,y2:3000,px:3000,py:3400,dimStyle:'ABNT',ly:2});switchSpace(S.layouts[0].id);}")
    h=E("(()=>{var d=S.modelEnts.find(e=>e.tp==='dim'),o={};[1/50,1/25].forEach(function(k){S.annoK=k;var t=dimPrims(d).find(p=>p.k==='text');o[k]=t.h*k;});S.annoK=null;return o;})()")
    ok('Cota anotativa: 2,5 mm no papel em 1:50 e em 1:25',all(near(v,2.5,1e-9) for v in h.values()),h)
    E("()=>{switchSpace('model');}")
    pg.select_option('#annoSel',str(1/50)); pg.wait_for_timeout(30)
    ok('Escala de anotação do modelo na barra de status',near(E("S.annoScale"),0.02))
    th=E("dimPrims(S.ents.find(e=>e.tp==='dim')).find(p=>p.k==='text').h")
    ok('No Model, a cota anotativa segue a escala de anotação (2,5 × 50)',near(th,125,1e-6),th)
    E("()=>{addE({tp:'mtext',x:0,y:-500,w:0,h:3.5,txt:'Nota',att:1,rot:0,annot:true});}")
    bh=E("bbox(S.ents[S.ents.length-1]).h")
    ok('Texto anotativo: 3,5 mm no papel = 175 mm no modelo a 1:50',near(bh,175,1e-6),bh)
    E("()=>{S.sel=[S.ents[S.ents.length-1].id];updSelInfo();}")
    ok('Painel de seleção mostra "Anotativo"',E("Array.from(document.querySelectorAll('#selinfo .geo-row')).some(r=>/Anotativo/.test(r.textContent))"))
    E("()=>{S.sel=[];setTool('mtext');}"); E("()=>{handleClick({x:0,y:-1000});handleClick({x:2000,y:-1500});}")
    ok('Editor de MTEXT tem a opção Anotativo',pg.locator('#mted-annot').is_visible()); E("mtEditorCancel()")
    # ── DXF com layouts e viewports
    import ezdxf
    E("()=>{switchSpace(S.layouts[0].id);var v=curViewport();v.lock=true;v.frz=[1];var Q=[{x:200,y:150},{x:260,y:150},{x:240,y:190}];var v2=vpMakePoly(Q);S.ents.push(v2);addE({tp:'line',x1:30,y1:30,x2:60,y2:30});}")
    f=os.path.join(HERE,'_l3.dxf'); open(f,'wb').write(bytes(E("Array.from(cp1252Encode(buildDXF2000({})))")))
    d=ezdxf.readfile(f); a=d.audit(); os.remove(f)
    names=[l.name for l in d.layouts]
    ok('DXF: layouts exportados com os nomes do EduCAD',names[:3]==['Model','Layout1','Layout2'],names)
    ok('DXF sem erros de auditoria',not a.errors,[x.message for x in a.errors][:3])
    L1=d.layouts.get('Layout1'); vps=[e for e in L1 if e.dxftype()=='VIEWPORT']
    ok('Viewport principal + viewports do usuário',len(vps)>=3 and vps[0].dxf.id==1,len(vps))
    u=vps[1]
    ok('Viewport com centro e altura da vista em escala (1:50)',near(u.dxf.view_center_point[0],3000,1e-6) and near(u.dxf.view_height,u.dxf.height*50,1e-6))
    ok('Escala travada e camada congelada no DXF',bool(u.dxf.flags&16384) and len(u.frozen_layers)==1)
    ok('Viewport poligonal com contorno de recorte',any(bool(v.dxf.flags&65536) and v.dxf.hasattr('clipping_boundary_handle') for v in vps))
    _ins=[e for e in L1 if e.dxftype()=='INSERT']; _blk=d.blocks.get(_ins[0].dxf.name) if _ins else []
    ok('Objetos do papel no espaço do papel (linha + carimbo como bloco, v8.6)',len([e for e in L1 if e.dxftype()=='LINE'])>=1 and len(_ins)==1 and len([e for e in _blk if e.dxftype()=='LINE'])>=4 and len([e for e in _blk if e.dxftype()=='MTEXT'])>=8)
    ok('Modelo continua no Model',len([e for e in d.modelspace() if e.dxftype()=='LINE'])==2)
    ok('Estilo de cota anotativo sai com DIMSCALE 0',d.dimstyles.get('ABNT').dxf.dimscale==0)
    # ── arquivo
    doc=json.loads(E("()=>{let b=null;const o=URL.createObjectURL;URL.createObjectURL=x=>{b=x;return 'blob:x'};try{saveDoc();}finally{URL.createObjectURL=o;}return b.text();}"))
    ok('Arquivo guarda configuração de página e escala de anotação',doc.get('annoScale')==0.02 and doc['layouts'][1].get('plot',{}).get('area')=='window')
    ok('Diálogo Exportar oferece PDF vetorial',E("!!document.querySelector('#ef option[value=pdf]')"))
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
fails=[n for n,c in R if not c]; print(f'\n{len(R)-len(fails)}/{len(R)} testes OK'); sys.exit(1 if fails else 0)
