# Margens da folha conforme a ABNT NBR 16752:2020 (v8.8): esquerda 20 mm, superior, direita e inferior 10 mm,
# aplicadas ao Layout 1, aos layouts novos, à troca de formato, à moldura do carimbo, à viewport automática e ao PDF.
# Uso: pip install playwright pypdf && playwright install chromium && python tests/test_margens.py
import sys, os, json, io, re
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
NBR={'t':10,'r':10,'b':10,'l':20}
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':850})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.goto('file://'+path); pg.wait_for_timeout(500); E=pg.evaluate
    if E("document.getElementById('ov-recover').classList.contains('show')"): E("closeOv('ov-recover')")
    E("()=>{addE({tp:'rect',x:0,y:0,w:6000,h:3000});}")
    pg.click('#tab-layout1'); pg.wait_for_timeout(100)
    M=E("curLayout().margins"); ok('Layout 1 abre com as margens da NBR 16752 (esquerda 20, demais 10)',M==NBR,M)
    ok('Campos do painel mostram 10 · 10 · 10 · 20',[E(f"document.getElementById('lc-m{k}').value") for k in 'trbl']==['10','10','10','20'])
    r=E("printableRect(curLayout())"); ok('Área útil da A4 paisagem: 267 × 190 mm a partir de (20, 10)',r=={'x':20,'y':10,'w':267,'h':190},r)
    v=E("(()=>{var v=curViewport();return [v.x,v.y,v.w,v.h];})()"); ok('Viewport automática ocupa a área útil',v==[20,10,267,190],v)
    for fmt in ['A0','A1','A2','A3']:
        E(f"()=>{{document.getElementById('lc-paper').value='{fmt}';layoutApply();}}"); ok(f'Formato {fmt}: mesmas margens da NBR 16752',E("curLayout().margins")==NBR)
    E("()=>{document.getElementById('lc-paper').value='A4';layoutApply();}")
    E("()=>{document.getElementById('lc-ml').value='30';layoutApply();}"); ok('Margem alterada pelo usuário é respeitada',E("curLayout().margins.l")==30)
    pg.click('#lc-mnbr'); ok('Botão NBR volta às margens da norma',E("curLayout().margins")==NBR and E("document.getElementById('lc-ml').value")=='20')
    E("titleBlockInsert()"); fr=E("(()=>{var f=S.ents.filter(e=>e.tp==='pl'&&e.closed&&e.lw>=.7)[0];return f?f.pts.slice(0,3):null;})()")
    ok('Moldura do carimbo nas margens da norma',fr and fr[0]=={'x':20,'y':10} and fr[2]=={'x':287,'y':200},fr)
    ib=E("(()=>{var i=S.ents.filter(e=>e.tp==='insert'&&/^CARIMBO/.test(e.name))[0];var b=bbox(i);return [Math.round((b.x+b.w)*1e6)/1e6,Math.round(b.y*1e6)/1e6];})()")
    ok('Carimbo encostado no canto inferior direito da área útil',ib==[287,10],ib)
    E("layoutNew()"); ok('Layout novo (+) também nasce com as margens da norma',E("curLayout().margins")==NBR)
    # PDF: plotagem da área útil
    E("()=>{var L=S.layouts[0];switchSpace(L.id);}")
    E("()=>{var L=curLayout();L.plot=Object.assign({},L.plot||{},{area:'margins'});}")
    # desenho antigo (v8.7) com margens antigas → migra; margens personalizadas → mantém
    doc={'v':'8.7','ents':[{'id':'a','tp':'rect','x':0,'y':0,'w':6000,'h':3000,'ly':0}],'layers':[{'id':0,'nm':'0','col':'#ffffff','vis':True,'lock':False,'ld':'solid','lw':.25}],
         'layouts':[{'id':'L1','name':'Layout1','fmt':'A4','paper':{'w':297,'h':210},'margins':{'t':7,'r':7,'b':7,'l':25},'plotStyle':'mono','ents':[{'id':'v1','tp':'viewport','x':25,'y':7,'w':265,'h':196,'cx':3000,'cy':1500,'k':0.04,'auto':True,'ly':0}]},
                    {'id':'L2','name':'Minhas margens','fmt':'A3','paper':{'w':420,'h':297},'margins':{'t':15,'r':5,'b':15,'l':30},'plotStyle':'mono','ents':[]}]}
    f=os.path.join(HERE,'_m.json'); open(f,'w').write(json.dumps(doc)); pg.set_input_files('#fileInput',f); pg.wait_for_timeout(300); os.remove(f)
    ok('Desenho antigo com as margens padrão antigas (25/7) passa para a NBR 16752',E("S.layouts[0].margins")==NBR,E("S.layouts[0].margins"))
    ok('…e a viewport automática acompanha a nova área útil',E("(()=>{var v=S.layouts[0].ents[0];return [v.x,v.y,v.w,v.h];})()")==[20,10,267,190])
    ok('Margens personalizadas de um desenho antigo são mantidas',E("S.layouts[1].margins")=={'t':15,'r':5,'b':15,'l':30})
    ok('Aviso da atualização na linha de comando','NBR 16752' in E("Array.from(document.querySelectorAll('#cmdlog .cl')).slice(-4).map(d=>d.textContent).join('|')"))
    # Template (Model)
    E("()=>{switchSpace('model');S.ents=[];document.getElementById('tf').value='297,210';document.getElementById('ts').value='1';doTemplate();}")
    t=E("S.ents.filter(e=>e.tp==='rect').map(e=>[e.x,e.y,e.w,e.h])"); ok('Template A4: moldura com 20 mm à esquerda e 10 mm nos demais lados',[-148.5+20,-105+10,297-30,210-20] in t,t)
    ok('Template cita a NBR 16752',any('16752' in e.get('txt','') for e in E("S.ents")))
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
fails=[n for n,c in R if not c]; print(f'\n{len(R)-len(fails)}/{len(R)} testes OK'); sys.exit(1 if fails else 0)
