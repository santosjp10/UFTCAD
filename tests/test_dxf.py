# Testes da exportação DXF 2000 / DWG (v6.3) no Chromium (Playwright) + validação com ezdxf.
# Uso: pip install playwright ezdxf && playwright install chromium && python tests/test_dxf.py
import sys, os, collections, math
from playwright.sync_api import sync_playwright
import ezdxf
HERE=os.path.dirname(os.path.abspath(__file__))
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(HERE,'..','index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
TMP=lambda f: os.path.join(HERE,'_'+f)
DRAW="""()=>{
  S.layers.push({id:5,nm:'Eixos de simetria',col:'#ff4040',vis:true,lock:false,ld:'center',lw:.18});
  S.layers.push({id:6,nm:'Oculta',col:'#40c0ff',vis:false,lock:true,ld:'hidden',lw:.25});
  addE({tp:'pl',closed:true,pts:[{x:0,y:0},{x:120,y:0},{x:120,y:50},{x:90,y:80},{x:0,y:80},{x:0,y:0}],lw:.7,col:'#ffffff',ly:0});
  addE({tp:'circ',cx:40,cy:40,r:15,lw:.5,col:'#dce4f5'});
  addE({tp:'line',x1:20,y1:40,x2:60,y2:40,ly:5,ld:'center',col:'#ff4040',lw:.18});
  addE({tp:'arc',cx:100,cy:20,r:10,sa:0,ea:Math.PI});
  addE({tp:'rect',x:140,y:0,w:40,h:25,col:'#00ff80'});
  addE({tp:'ell',cx:160,cy:60,rx:10,ry:20,rot:0.5,col:'#ffaa00'});
  addE({tp:'spline',pts:[{x:140,y:90},{x:155,y:110},{x:170,y:90},{x:185,y:110}],col:'#ff66ff'});
  addE({tp:'txt',x:0,y:-40,txt:'Peça nº 1 — Ação ° Ø',h:5});
  addE({tp:'txt',x:140,y:-20,txt:'Texto girado',h:4,rot:0.5});
  addE({tp:'hatch',x:200,y:0,w:40,h:30,ang:45,sp:4,htype:'lines',col:'#8090b0'});
  addE({tp:'hatch',x:200,y:40,w:40,h:30,ang:0,sp:5,htype:'grid',col:'#8090b0'});
  addE({tp:'hatch',x:250,y:0,w:30,h:30,ang:0,sp:4,htype:'zigzag',col:'#8090b0'});
  addE({tp:'line',x1:250,y1:40,x2:280,y2:70,ly:6,ld:'hidden'});
  var st=normDimStyle(JSON.parse(JSON.stringify(dspGetStyle('ABNT'))));st.name='Escala 1:50 ç';st.arrowType='tick';S.dimStyles.push(st);
  addE({tp:'dim',subtp:'linear',dimDir:'h',x1:0,y1:0,x2:120,y2:0,px:60,py:-15,dimStyle:'ABNT',ly:2});
  addE({tp:'dim',subtp:'linear',dimDir:'v',x1:0,y1:0,x2:0,y2:80,px:-15,py:40,dimStyle:'ABNT',ly:2});
  addE({tp:'dim',subtp:'aligned',x1:120,y1:50,x2:90,y2:80,px:115,py:75,dimStyle:'Escala 1:50 ç',ly:2});
  addE({tp:'dimd',cx:40,cy:40,ex:70,ey:62,val:'30',dimStyle:'ABNT',ly:2});
  addE({tp:'dimr',cx:100,cy:20,ex:120,ey:-5,val:'10',dimStyle:'Standard',ly:2});
  addE({tp:'dima',vx:120,vy:50,x1:120,y1:0,x2:90,y2:80,px:110,py:45,dimStyle:'ABNT',ly:2});
  S.dimCurrent='ABNT';updDimStyleSel();
}"""
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':850},accept_downloads=True)
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.goto('file://'+path); pg.wait_for_timeout(400); E=pg.evaluate
    E(DRAW)
    def export(fmt,setup=None):
        E("showExport()"); pg.select_option('#ef',fmt)
        if setup: setup()
        with pg.expect_download() as dl: pg.click("#ov-export .btn.p")
        f=TMP(dl.value.suggested_filename); dl.value.save_as(f); return f, dl.value.suggested_filename
    f,name=export('dxf')
    ok('Diálogo exporta DXF 2000 com nome do desenho',name=='educad.dxf',name)
    d=ezdxf.readfile(f); a=d.audit()
    ok('DXF 2000 (AC1015) válido em leitura estrita e auditoria sem erros',d.dxfversion=='AC1015' and not a.errors and not a.fixes,[x.message for x in a.errors+a.fixes][:3])
    msp=d.modelspace(); c=collections.Counter(e.dxftype() for e in msp)
    ok('Entidades nativas preservadas',c['LWPOLYLINE']>=2 and c['ELLIPSE']==1 and c['SPLINE']==1 and c['HATCH']==2 and c['DIMENSION']==6 and c['CIRCLE']==1 and c['ARC']==1 and c['TEXT']==2,dict(c))
    ok('Unidades em milímetros ($INSUNITS=4) e estilo de cota atual',d.header['$INSUNITS']==4 and d.header['$DIMSTYLE']=='ABNT')
    L={l.dxf.name:l for l in d.layers}
    ok('Camadas com nome, cor RGB, tipo e espessura',L['Eixos_de_simetria'].rgb==(255,64,64) and L['Eixos_de_simetria'].dxf.linetype=='CENTER' and L['Eixos_de_simetria'].dxf.lineweight==18)
    ok('Camada desligada e bloqueada preservadas',(not L['Oculta'].is_on()) and L['Oculta'].is_locked())
    ln=[e for e in msp.query('LINE') if e.dxf.layer=='Eixos_de_simetria'][0]
    ok('Objeto com cor RGB, tipo e espessura próprios',ln.rgb==(255,64,64) and ln.dxf.linetype=='CENTER' and ln.dxf.lineweight==18)
    pl=[e for e in msp.query('LWPOLYLINE') if e.closed and len(e)==5]
    ok('Polilinha fechada sem vértice duplicado e espessura 0,70',len(pl)==1 and pl[0].dxf.lineweight==70)
    el=msp.query('ELLIPSE')[0]
    ok('Elipse: eixo maior, razão e rotação corretos',abs(el.dxf.major_axis.magnitude-20)<1e-9 and abs(el.dxf.ratio-0.5)<1e-9)
    sp=msp.query('SPLINE')[0]; pts=list(sp.control_points)
    ok('Spline passa pelos pontos do EduCAD',abs(pts[0][0]-140)<1e-9 and abs(pts[-1][0]-185)<1e-9 and abs(pts[3][1]-110)<1e-9)
    t=[x.plain_text() for x in msp.query('TEXT')]
    ok('Textos com acentos (Windows-1252), símbolos e rotação',t[0]=='Peça nº 1 — Ação ° Ø' and abs(msp.query('TEXT')[1].dxf.rotation-math.degrees(0.5))<1e-6,t)
    H=msp.query('HATCH')
    ok('Hachuras com padrão predefinido escalado',sorted(h.dxf.pattern_name for h in H)==['ANSI31','NET'])
    ds=[s.dxf.name for s in d.dimstyles]
    ok('Estilos do DDIM viram DIMSTYLE (nomes válidos no AutoCAD)',ds==['Standard','ABNT','Escala 1_50 c'],ds)
    abnt=d.dimstyles.get('ABNT')
    ok('DIMSTYLE com separador vírgula, zeros suprimidos, texto 2,5',abnt.dxf.dimdsep==44 and abnt.dxf.dimzin==8 and abs(abnt.dxf.dimtxt-2.5)<1e-9)
    ok('Seta traço oblíquo vira DIMTSZ',d.dimstyles.get('Escala 1_50 c').dxf.dimtsz>0)
    m=[round(x.get_measurement(),2) for x in msp.query('DIMENSION')]
    ok('Cotas medem o mesmo que no EduCAD',m==[120.0,80.0,42.43,30.0,10.0,135.0],m)
    ok('Cada cota tem seu bloco de geometria (*D)',all(d.blocks.get(x.dxf.geometry) is not None and len(d.blocks.get(x.dxf.geometry))>0 for x in msp.query('DIMENSION')))
    # opções: cotas e hachuras explodidas
    def opt_off():
        pg.uncheck('#dxf-dims'); pg.uncheck('#dxf-hatch')
    f2,_=export('dxf',opt_off); d2=ezdxf.readfile(f2); c2=collections.Counter(e.dxftype() for e in d2.modelspace())
    ok('Opção: cotas e hachuras explodidas',c2['DIMENSION']==0 and c2['HATCH']==0 and c2['SOLID']>0 and not d2.audit().errors,dict(c2))
    E("()=>{document.getElementById('dxf-dims').checked=true;document.getElementById('dxf-hatch').checked=true;}")
    # DWG
    f3,name3=export('dwg'); pg.wait_for_timeout(100)
    ok('DWG: gera DXF 2000 e mostra instruções de conversão',name3=='educad_para_DWG.dxf' and E("document.getElementById('ov-dwg').classList.contains('show')") and ezdxf.readfile(f3).dxfversion=='AC1015')
    E("closeOv('ov-dwg')")
    # R12 continua disponível
    f4,name4=export('dxf12'); d4=ezdxf.readfile(f4)
    ok('DXF R12 continua disponível',d4.dxfversion=='AC1009' and name4=='educad_R12.dxf')
    # comando DXFOUT
    with pg.expect_download() as dl:
        pg.click('#cmdinput'); pg.keyboard.type('DXFOUT'); pg.keyboard.press('Enter')
    ok('Comando DXFOUT',dl.value.suggested_filename=='educad.dxf')
    # desenho vazio exporta arquivo válido
    E("()=>{S.ents=[];}")
    f5,_=export('dxf'); d5=ezdxf.readfile(f5)
    ok('Desenho vazio gera DXF válido',not d5.audit().errors)
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
for fn in os.listdir(HERE):
    if fn.startswith('_') and (fn.endswith('.dxf')): os.remove(os.path.join(HERE,fn))
f=[n for n,c in R if not c]; print(f'\n{len(R)-len(f)}/{len(R)} testes OK'); sys.exit(1 if f else 0)
