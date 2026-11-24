# Carimbo (legenda) ajustado à largura útil da folha (v8.11): A4 retrato ocupa toda a base entre as margens,
# folhas largas ficam com 178 mm no canto inferior direito; acompanha margens/formato/orientação; carimbos antigos
# são corrigidos ao abrir o layout, mantendo o que foi escrito nos campos.
# Uso: pip install playwright && playwright install chromium && python tests/test_carimbo.py
import sys, os, json
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
def near(a,b,t=1e-6): return abs(a-b)<=t
INFO="""(()=>{var C=cbFind(),r=printableRect(curLayout());if(!C)return null;var b=bbox(C.ins),f=C.frame?ptsBox(C.frame.pts):null;
  return {W:C.W,x0:b.x,x1:b.x+b.w,y0:b.y,h:b.h,r:r,frame:f,n:S.ents.filter(e=>e.tp==='insert'&&/^CARIMBO/.test(e.name)).length,
  nf:S.ents.filter(e=>e.tp==='pl'&&e.closed&&e.lw>=.7).length,fields:Object.keys(C.fields).length,tit:C.fields.titulo&&C.fields.titulo.txt,esc:C.fields.escala&&C.fields.escala.txt};})()"""
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':900})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.goto('file://'+path); pg.wait_for_timeout(500); E=pg.evaluate
    if E("document.getElementById('ov-recover').classList.contains('show')"): E("closeOv('ov-recover')")
    E("()=>{addE({tp:'rect',x:0,y:0,w:6000,h:8000});}"); pg.click('#tab-layout1'); pg.wait_for_timeout(150)
    def setup(fmt,orient):
        E(f"()=>{{document.getElementById('lc-paper').value='{fmt}';document.getElementById('lc-orient').value='{orient}';layoutApply();}}")
    # A4 retrato
    setup('A4','port'); E("titleBlockInsert()"); i=E(INFO)
    ok('A4 retrato: legenda com toda a largura útil (180 mm, de 20 a 200)',near(i['W'],180) and near(i['x0'],20) and near(i['x1'],200) and near(i['y0'],10) and near(i['h'],40),i)
    ok('A4 retrato: moldura nas margens (20/10/10/10)',i['frame']=={'x':20,'y':10,'w':180,'h':277},i['frame'])
    ok('Todos os 8 campos da legenda criados',i['fields']==8)
    ok('Viewport automática acima da legenda',E("curViewport().y")>=10+40)
    # paisagem e folhas grandes: 178 mm no canto
    setup('A4','land'); i=E(INFO)
    ok('Mudar para A4 paisagem: legenda ajustada sozinha (178 mm no canto inferior direito)',near(i['W'],178) and near(i['x1'],287) and i['frame']=={'x':20,'y':10,'w':267,'h':190} and i['n']==1 and i['nf']==1,i)
    setup('A3','land'); i=E(INFO); ok('A3 paisagem: 178 mm no canto inferior direito',near(i['W'],178) and near(i['x1'],410) and i['n']==1,i)
    setup('A3','port'); i=E(INFO); ok('A3 retrato (267 mm úteis): 178 mm no canto',near(i['W'],178) and near(i['x1'],287),i)
    setup('A4','port'); i=E(INFO); ok('De volta ao A4 retrato: toda a largura útil de novo',near(i['W'],180) and near(i['x0'],20) and i['n']==1 and i['nf']==1,i)
    # campos editados são mantidos
    E("()=>{var C=cbFind();C.fields.titulo.txt='PLANTA DA HORTA';C.fields.desenhista.txt='Maria';}")
    E("()=>{document.getElementById('lc-ml').value='25';layoutApply();}"); i=E(INFO)
    ok('Mudar a margem esquerda: legenda e moldura acompanham',near(i['x0'],25) and near(i['W'],175) and i['frame']['x']==25,i)
    ok('…e os textos escritos nos campos são mantidos',i['tit']=='PLANTA DA HORTA' and E("cbFind().fields.desenhista.txt")=='Maria')
    pg.click('#lc-mnbr'); i=E(INFO); ok('Botão NBR: volta às margens da norma, legenda com 180 mm',near(i['W'],180) and near(i['x0'],20))
    E("titleBlockInsert()"); i=E(INFO); ok('Inserir o carimbo de novo não duplica e mantém os textos',i['n']==1 and i['nf']==1 and i['tit']=='PLANTA DA HORTA',i)
    E("undo()"); ok('Desfazer funciona',E("cbFind()!==null"))
    # carimbo de versão antiga (v8.10: 178 mm deslocado 2 mm, campos sem marcação)
    E("()=>{switchSpace('model');}")
    doc=json.loads(E("JSON.stringify(buildDoc())"))
    L=doc['layouts'][0]; L['fmt']='A4'; L['paper']={'w':210,'h':297}; L['margins']={'t':10,'r':10,'b':10,'l':20}
    blk={'base':{'x':0,'y':0},'ents':[{'tp':'pl','closed':True,'pts':[{'x':0,'y':0},{'x':178,'y':0},{'x':178,'y':40},{'x':0,'y':40},{'x':0,'y':0}],'ly':0,'lw':.5}]}
    doc['blocks']={'CARIMBO_ABNT_178':blk}
    x0=22; ents=[e for e in L['ents'] if e['tp']=='viewport']
    ents+= [{'id':'fr','tp':'pl','closed':True,'pts':[{'x':20,'y':10},{'x':200,'y':10},{'x':200,'y':287},{'x':20,'y':287},{'x':20,'y':10}],'ly':0,'lw':.7},
            {'id':'cb','tp':'insert','name':'CARIMBO_ABNT_178','x':x0,'y':10,'s':1,'rot':0,'m':False,'ly':0},
            {'id':'t1','tp':'mtext','x':x0+2,'y':10+12+2.5,'w':0,'h':3.5,'txt':'CORTE AA','att':7,'rot':0,'ly':0},
            {'id':'t2','tp':'mtext','x':x0+2,'y':10+2.5,'w':0,'h':2.5,'txt':'João','att':7,'rot':0,'ly':0},
            {'id':'t3','tp':'mtext','x':x0+178*0.65+2,'y':10+2.5,'w':0,'h':2.5,'txt':'1:25','att':7,'rot':0,'ly':0},
            {'id':'nota','tp':'mtext','x':40,'y':200,'w':0,'h':3,'txt':'Nota fora do carimbo','att':1,'rot':0,'ly':0}]
    L['ents']=ents; f=os.path.join(HERE,'_cb.json'); open(f,'w').write(json.dumps(doc)); pg.set_input_files('#fileInput',f); pg.wait_for_timeout(250); os.remove(f)
    pg.click('#tab-layout1' if E("!!document.getElementById('tab-layout1')") else '.layout-tab'); pg.wait_for_timeout(250)
    i=E(INFO)
    ok('Desenho antigo (A4 retrato, legenda 178 mm deslocada): corrigido ao abrir o layout',i and near(i['W'],180) and near(i['x0'],20) and i['n']==1 and i['nf']==1,i)
    ok('…mantendo título, desenhista e escala escritos',i['tit']=='CORTE AA' and E("cbFind().fields.desenhista.txt")=='João' and i['esc']=='1:25',(i['tit'],i['esc']))
    ok('…sem mexer em textos fora da legenda',E("S.ents.filter(e=>e.txt==='Nota fora do carimbo').length")==1)
    ok('…e com aviso na linha de comando','Carimbo ajustado' in ' '.join(E("Array.from(document.querySelectorAll('#cmdlog .cl')).slice(-4).map(d=>d.textContent)")))
    # DXF: o carimbo sai como bloco com a largura certa
    E("()=>{switchSpace('model');}")
    import ezdxf
    f=os.path.join(HERE,'_cb.dxf'); open(f,'wb').write(bytes(E("Array.from(cp1252Encode(buildDXF2000({})))"))); d=ezdxf.readfile(f); os.remove(f)
    lay=[d.layouts.get(n) for n in d.layouts.names() if n!='Model'][0]; ins=[e for e in lay.query('INSERT') if e.dxf.name.startswith('CARIMBO')]
    ok('DXF: legenda de 180 mm no papel, alinhada à margem esquerda',len(ins)==1 and ins[0].dxf.name=='CARIMBO_ABNT_180' and near(ins[0].dxf.insert.x,20),[(e.dxf.name,e.dxf.insert) for e in ins])
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
fails=[n for n,c in R if not c]; print(f'\n{len(R)-len(fails)}/{len(R)} testes OK'); sys.exit(1 if fails else 0)
