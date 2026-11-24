# Testes da v8.9: janela Salvar como / Exportar (nome, formato, pasta pela janela do sistema, confirmação;
# Ctrl+S regrava o mesmo arquivo; Abrir guarda o arquivo) e cota com distância digitada (DLI e DAL).
# A janela do sistema (showSaveFilePicker) é simulada: num teste automático ninguém pode clicar nela.
# Uso: pip install playwright ezdxf pypdf && playwright install chromium && python tests/test_arquivos.py
import sys, os, json
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
def near(a,b,t=1e-6): return abs(a-b)<=t
FAKE="""()=>{window.__w=[];window.__opts=[];window.__cancel=false;window.showSaveFilePicker=async(o)=>{window.__opts.push(o);if(window.__cancel){var e=new Error('x');e.name='AbortError';throw e;}
  var nm=o.suggestedName.replace(/^(.*?)(\\.[a-z0-9]+)$/i,'pasta/$1$2');return {name:o.suggestedName,createWritable:async()=>({write:async(b)=>{window.__w.push({name:o.suggestedName,type:b.type,size:b.size,text:(b.type.indexOf('json')>=0||b.type.indexOf('dxf')>=0||b.type.indexOf('svg')>=0)?await b.text():''});},close:async()=>{}}),queryPermission:async()=>'granted'};};}"""
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':850},accept_downloads=True)
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.goto('file://'+path); pg.wait_for_timeout(500); E=pg.evaluate
    if E("document.getElementById('ov-recover').classList.contains('show')"): E("closeOv('ov-recover')")
    E(FAKE); E("()=>{addE({tp:'rect',x:0,y:0,w:100,h:50});addE({tp:'circ',cx:50,cy:25,r:10});}")
    def last(k=1): return ' | '.join(E(f"Array.from(document.querySelectorAll('#cmdlog .cl')).map(d=>d.textContent).slice(-{k})"))
    # ── Salvar
    pg.click('div.rb[data-cmd="SAVE"]'); pg.wait_for_timeout(80)
    ok('Salvar abre a janela "Salvar como"',E("document.getElementById('ov-export').classList.contains('show')") and E("document.getElementById('sv-title').textContent")=='Salvar como')
    ok('Formato padrão do Salvar: Desenho EduCAD (.json)',E("document.getElementById('ef').value")=='json' and E("document.getElementById('sv-ext').textContent")=='.json')
    ok('Opções de local e de confirmação visíveis',pg.locator('#sv-pick').is_visible() and E("document.querySelector('#ov-export .btn.p').textContent")=='Salvar…')
    n=E("document.querySelectorAll('#ef option').length"); ok('Todos os formatos do EduCAD na lista',n>=8,n)
    pg.fill('#sv-name','Planta: horta/escola'); pg.click('#ov-export .btn.p'); pg.wait_for_timeout(250)
    o=E("window.__opts[0]")
    ok('Janela do sistema recebe o nome (sem caracteres proibidos) e o tipo de arquivo',o['suggestedName']=='Planta_ horta_escola.json' and o['types'][0]['accept']=={'application/json':['.json']} and o['id']=='educad',o)
    w=E("window.__w"); ok('Arquivo gravado na pasta escolhida, com o desenho inteiro',len(w)==1 and len(json.loads(w[0]['text'])['ents'])==2)
    ok('Título passa a ser o nome do arquivo e o desenho fica "salvo"',E("document.getElementById('ftitle').textContent")=='Planta_ horta_escola.json' and not E("S.dirty"))
    # Ctrl+S regrava
    E("addE({tp:'line',x1:0,y1:0,x2:10,y2:10})"); pg.locator('#cw').click(position={'x':20,'y':20}); pg.keyboard.press('Control+s'); pg.wait_for_timeout(200)
    w=E("window.__w"); ok('Ctrl+S grava de novo no mesmo arquivo, sem perguntar',len(w)==2 and E("window.__opts.length")==1 and len(json.loads(w[1]['text'])['ents'])==3 and not E("S.dirty"))
    E("cmdSubmit('QSAVE')"); pg.wait_for_timeout(150); ok('Comando QSAVE = Ctrl+S',len(E("window.__w"))==3)
    pg.click('div.rb[data-cmd="SAVE"]'); pg.wait_for_timeout(60)
    ok('Salvar mostra o arquivo atual e a opção de substituí-lo',pg.locator('#sv-replace').is_visible() and E("document.getElementById('sv-curname').textContent")=='Planta_ horta_escola.json')
    pg.click('#sv-replace'); pg.wait_for_timeout(150); ok('Substituir este arquivo grava sem nova janela do sistema',len(E("window.__w"))==4 and E("window.__opts.length")==1)
    # cancelar na janela do sistema
    E("()=>{window.__cancel=true;}"); E("cmdSubmit('SAVEAS')"); pg.wait_for_timeout(60); pg.click('#ov-export .btn.p'); pg.wait_for_timeout(150)
    ok('Cancelar na janela do sistema: nada é gravado e o usuário é avisado',len(E("window.__w"))==4 and 'cancelada' in last(),last())
    E("()=>{window.__cancel=false;}")
    # ── Exportar
    E("showExport()"); pg.wait_for_timeout(50)
    ok('Exportar abre a mesma janela, em modo Exportar, com DXF 2000',E("document.getElementById('sv-title').textContent")=='Exportar' and E("document.getElementById('ef').value")=='dxf')
    ok('Nome sugerido a partir do desenho',E("document.getElementById('sv-name').value")=='Planta_ horta_escola',E("document.getElementById('sv-name').value"))
    pg.select_option('#ef','dxf12'); ok('Trocar o formato ajusta o nome e a extensão (R12)',E("document.getElementById('sv-name').value")=='Planta_ horta_escola_R12' and E("document.getElementById('sv-ext').textContent")=='.dxf')
    pg.select_option('#ef','svg'); pg.fill('#sv-name','vista'); pg.select_option('#ef','png')
    ok('Nome digitado pelo usuário é mantido ao trocar o formato',E("document.getElementById('sv-name').value")=='vista' and E("document.getElementById('sv-ext').textContent")=='.png')
    pg.select_option('#ef','dxf'); pg.click('#ov-export .btn.p'); pg.wait_for_timeout(200)
    w=E("window.__w")[-1]; ok('Exportar DXF: grava o arquivo DXF escolhido',w['name']=='vista.dxf' and 'AC1015' in w['text'],w['name'])
    ok('Exportar não muda o título nem o estado do desenho',E("document.getElementById('ftitle').textContent")=='Planta_ horta_escola.json')
    for fmt,ext,mime in [('pdf','.pdf','application/pdf'),('svg','.svg','image/svg+xml'),('png','.png','image/png')]:
        E("showExport()"); pg.select_option('#ef',fmt); pg.fill('#sv-name','saida'); pg.click('#ov-export .btn.p'); pg.wait_for_timeout(250)
        w=E("window.__w")[-1]; ok(f'Exportar {fmt.upper()} pela janela do sistema',w['name']=='saida'+ext and w['type']==mime and w['size']>100,(w['name'],w['type'],w['size']))
    E("showExport()"); pg.select_option('#ef','dwg'); pg.fill('#sv-name','para_converter'); pg.click('#ov-export .btn.p'); pg.wait_for_timeout(200)
    ok('DWG: grava o DXF e mostra como converter',E("window.__w")[-1]['name']=='para_converter.dxf' and E("document.getElementById('ov-dwg').classList.contains('show')")); E("closeOv('ov-dwg')")
    E("cmdSubmit('SAVE')"); pg.select_option('#ef','dxf'); ok('Salvar em DXF avisa que só o .json guarda tudo','.json' in E("document.getElementById('sv-warn').textContent") and pg.locator('#sv-warn').is_visible()); E("closeOv('ov-export')")
    # ── sem a API (Firefox, Safari, celular): download com o nome escolhido
    E("()=>{FILEIO.noPicker=true;}"); E("showExport()"); pg.wait_for_timeout(40)
    ok('Sem a janela do sistema: aviso sobre a pasta de downloads',pg.locator('#sv-dlnote').is_visible() and not pg.locator('#sv-pickrow').is_visible() and E("document.querySelector('#ov-export .btn.p').textContent")=='Exportar')
    pg.select_option('#ef','svg'); pg.fill('#sv-name','corte A')
    with pg.expect_download() as dl: pg.click('#ov-export .btn.p')
    ok('…o download usa o nome digitado',dl.value.suggested_filename=='corte A.svg',dl.value.suggested_filename)
    E("cmdSubmit('SAVE')"); pg.fill('#sv-name','meu desenho')
    with pg.expect_download() as dl: pg.keyboard.press('Enter')
    ok('Enter no nome confirma; desenho baixado como .json',dl.value.suggested_filename=='meu desenho.json' and E("document.getElementById('ftitle').textContent")=='meu desenho.json')
    E("()=>{FILEIO.noPicker=false;}")
    # ── Abrir guarda o arquivo para o Ctrl+S
    doc=json.loads(E("window.__w[0].text")); doc['ents'].append({'id':'zz','tp':'line','x1':0,'y1':0,'x2':5,'y2':0,'ly':0})
    E("""(d)=>{window.showOpenFilePicker=async()=>[{name:'aberto.json',getFile:async()=>new File([JSON.stringify(d)],'aberto.json',{type:'application/json'}),createWritable:async()=>({write:async(b)=>{window.__w.push({name:'aberto.json',text:await b.text()});},close:async()=>{}}),queryPermission:async()=>'granted'}];}""",doc)
    E("openDoc()"); pg.wait_for_timeout(300)
    ok('Abrir pela janela do sistema carrega o desenho',E("S.ents.length")==3 and E("document.getElementById('ftitle').textContent")=='aberto.json',E("S.ents.length"))
    E("addE({tp:'point',x:1,y:1})"); n0=len(E("window.__w")); E("qsaveCmd()"); pg.wait_for_timeout(200)
    ok('Ctrl+S depois de Abrir grava no mesmo arquivo aberto',E("window.__w")[-1]['name']=='aberto.json' and len(E("window.__w"))==n0+1)
    E("()=>{var c=window.confirm;window.confirm=()=>true;newDoc();window.confirm=c;}"); ok('Novo desenho esquece o arquivo anterior',E("FILEIO.docHandle")is None)
    # ── cota com distância digitada
    def dim(tool,p1,p2,hover,typed,extra=None):
        E("()=>{S.ents=[];S.ds=null;S.modes.snap=false;setTool('"+tool+"');}")
        E(f"cmdSubmit('{p1}')"); E(f"cmdSubmit('{p2}')")
        if hover is not None: E(f"()=>{{S.hover={{x:{hover[0]},y:{hover[1]}}};renderAll();}}")
        else: E("()=>{S.hover=null;}")
        if extra: E(f"cmdSubmit('{extra}')")
        E(f"cmdSubmit('{typed}')"); return E("S.ents.filter(e=>e.tp==='dim').map(e=>JSON.parse(JSON.stringify(e)))")
    d=dim('dim','0,0','100,0',(50,-30),'10'); ok('DLI: "10" põe a linha de cota a 10 do 2º ponto, do lado do cursor (abaixo)',len(d)==1 and d[0]['dimDir']=='h' and near(d[0]['py'],-10),d)
    d=dim('dim','0,0','100,0',(50,30),'10'); ok('…cursor acima: linha de cota a 10 acima',near(d[0]['py'],10))
    d=dim('dim','0,0','100,40',(50,-30),'12.5'); ok('Distância medida a partir do 2º ponto (y = 40 − 12,5)',near(d[0]['py'],40-12.5) and d[0]['dimDir']=='h',d)
    d=dim('dim','0,80','0,0',(-30,40),'15'); ok('Cota vertical feita de cima para baixo: 15 à esquerda',d[0]['dimDir']=='v' and near(d[0]['px'],-15),d)
    d=dim('dim','0,0','100,0',(50,-30),'-10'); ok('Número negativo inverte o lado',near(d[0]['py'],10))
    d=dim('dim','0,0','100,60',(200,30),'20','H'); ok('H fixa a cota horizontal mesmo com o cursor do lado',d[0]['dimDir']=='h' and near(abs(d[0]['py']-60),20),d)
    d=dim('dim','0,0','100,60',(50,200),'20','V'); ok('V fixa a cota vertical',d[0]['dimDir']=='v' and near(abs(d[0]['px']-100),20),d)
    d=dim('dim','0,0','100,0',None,'8'); ok('Sem cursor (script/toque): horizontal abaixo',near(d[0]['py'],-8))
    v=E("(()=>{var e=S.ents.find(e=>e.tp==='dim');return dimMeasure(e);})()"); ok('O valor medido não muda (100)',near(v,100),v)
    d=dim('dimali','0,0','30,40',(0,50),'10')
    ok('DAL: linha de cota paralela, a 10 do segmento, do lado do cursor',len(d)==1 and near(abs((d[0]['px']-30)*(-0.8)+(d[0]['py']-40)*0.6),10,1e-6) and ((d[0]['px']-30)*(-0.8)+(d[0]['py']-40)*0.6)>0,d)
    d=dim('dim','0,0','100,0',(50,-30),'0'); ok('Distância zero é recusada com mensagem',len(d)==0 and 'diferente de zero' in last(2))
    ok('Coordenada continua aceita na posição da cota',len(dim('dim','0,0','100,0',(50,-30),'50,-25'))==1 and near(E("S.ents.find(e=>e.tp==='dim').py"),-25))
    ok('Script: DLI 0,0 100,0 10 (distância como 3ª entrada)',E("(()=>{S.ents=[];setTool('select');scrRun('DLI 0,0 100,0 10\\n');var d=S.ents.find(e=>e.tp==='dim');return !!d&&Math.abs(d.py+10)<1e-9;})()"))
    ok('Prompt explica a distância','distância ao 2º ponto' in E("(()=>{S.ents=[];setTool('dim');cmdSubmit('0,0');cmdSubmit('10,0');return document.getElementById('cmdlbl').textContent;})()"))
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
fails=[n for n,c in R if not c]; print(f'\n{len(R)-len(fails)}/{len(R)} testes OK'); sys.exit(1 if fails else 0)
