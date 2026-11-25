# Biblioteca de modelos (v8.12): Novo abre Padrão, Mecânico, Arquitetônico e Topográfico, cada um com unidades,
# folha, escala, camadas, estilo de cota, fonte, blocos e carimbo; modelos do usuário; DXF e salvar/abrir.
# Uso: pip install playwright ezdxf && playwright install chromium && python tests/test_templates.py
import sys, os, json
from playwright.sync_api import sync_playwright
import ezdxf
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
def near(a,b,t=1e-6): return abs(a-b)<=t
def TMP(n): return os.path.join(HERE,'_'+n)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1440,'height':900})
    errs=[]; dlg=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    def on_dialog(d):
        dlg.append(d.message); (d.dismiss() if 'NAO' in os.environ.get('_RESP','') else d.accept())
    pg.on('dialog',on_dialog)
    pg.goto('file://'+path); pg.wait_for_timeout(500); E=pg.evaluate
    if E("document.getElementById('ov-recover').classList.contains('show')"): E("closeOv('ov-recover')")
    E("localStorage.removeItem('educad-modelos')")
    def info(): return E("""(()=>{ensureLayouts();var L=S.layouts[0],C=null;switchSpace(L.id);var v=S.ents.find(e=>e.tp==='viewport');C=cbFind();var f={};if(C)Object.keys(C.fields).forEach(k=>f[k]=C.fields[k].txt);var nor=S.ents.some(e=>e.tp==='insert'&&e.name==='NORTE');switchSpace('model');
      return {u:S.units.insertScale,ang:S.units.angType,fmt:L.fmt,w:L.paper.w,h:L.paper.h,vp:v?vpRatio(v):null,anno:S.annoScale,lys:S.layers.map(l=>l.nm),cur:getLy(S.curLy).nm,dim:S.dimCurrent,font:S.textFont,
      blocks:Object.keys(S.blocks),campos:f,norte:nor,grid:[S.modes.gridSz,S.modes.snapSz],th:+document.getElementById('th').value,lt:S.ltscale,tpl:S.template,title:document.getElementById('ftitle').textContent,dirty:S.dirty,n:S.ents.length};})()""")
    # ── janela
    pg.click('div.rb[data-cmd="NEW"]'); pg.wait_for_timeout(80)
    ok('Novo abre a biblioteca de modelos',E("document.getElementById('ov-novo').classList.contains('show')"))
    ok('Quatro modelos: Padrão, Mecânico, Arquitetônico e Topográfico',E("Array.from(document.querySelectorAll('#tpl-grid .tpl-nome')).map(e=>e.textContent)")==['Padrão','Desenho Mecânico','Desenho Arquitetônico','Desenho Topográfico'])
    E("closeOv('ov-novo')"); pg.locator('#cw').click(position={'x':30,'y':30}); pg.keyboard.press('Control+n'); pg.wait_for_timeout(50)
    ok('Ctrl+N também abre a biblioteca',E("document.getElementById('ov-novo').classList.contains('show')")); E("closeOv('ov-novo')")
    E("cmdSubmit('NEW')"); ok('Comando NEW abre a biblioteca',E("document.getElementById('ov-novo').classList.contains('show')"))
    # ── Mecânico
    pg.click('#tpl-mecanico .btn.p'); pg.wait_for_timeout(200); i=info()
    ok('Mecânico: milímetro, A4 paisagem, viewport 1:1',i['u']=='mm' and i['fmt']=='A4' and i['w']==297 and near(i['vp'],1),i)
    ok('Mecânico: camadas da NBR 8403 (contorno, oculta, centro, corte, hachura, cotas…)',{'CONTORNO','OCULTA','CENTRO','CORTE-PLANO','HACHURA','COTAS','TEXTO','AUXILIAR'}<=set(i['lys']) and i['cur']=='CONTORNO',i['lys'])
    L=E("Object.fromEntries(S.layers.map(l=>[l.nm,[l.ld,l.lw,l.plot!==false]]))")
    ok('Mecânico: tipos e espessuras de linha (contorno 0,50; oculta tracejada 0,35; centro traço-ponto 0,18; auxiliar não imprime)',L['CONTORNO']==['solid',0.5,True] and L['OCULTA']==['hidden',0.35,True] and L['CENTRO']==['center',0.18,True] and L['AUXILIAR'][2]==False,L)
    ok('Mecânico: estilo de cota MECÂNICO ABNT (3,5 mm, vírgula) e fonte ISOCPEUR',i['dim']=='MECÂNICO ABNT' and i['font']=='ISOCPEUR' and E("dimStyleOf({tp:'dim',dimStyle:'MECÂNICO ABNT'}).txtH")==3.5)
    ok('Mecânico: carimbo preenchido e blocos de corte e rugosidade',i['campos'].get('titulo')=='PEÇA — VISTAS ORTOGRÁFICAS' and i['campos'].get('escala')=='1:1' and {'CORTE_SETA','RUGOSIDADE'}<=set(i['blocks']),i['campos'])
    ok('Mecânico: grade 10 / snap 1, texto 3,5 mm, escala de tipos de linha 0,5',i['grid']==[10,1] and near(i['th'],3.5) and near(i['lt'],0.5),(i['grid'],i['th'],i['lt']))
    ok('Desenho novo, sem alterações e com o nome do modelo no título',not i['dirty'] and 'Mecânico' in i['title'] and E("S.undos.length")==0)
    E("()=>{addE({tp:'dim',subtp:'linear',dimDir:'h',x1:0,y1:0,x2:60,y2:0,px:30,py:-10,dimStyle:S.dimCurrent});}")
    ok('Mecânico: cota de 60 mm mostra "60"',E("dimLinearText(60,dimStyleOf(S.ents[0])).main")=='60')
    # ── Arquitetônico (com desenho não salvo: confirmação)
    os.environ['_RESP']='NAO'; E("tplApply('arquitetonico')"); os.environ['_RESP']=''
    ok('Desenho com alterações: cancelar a confirmação mantém o desenho',E("S.ents.length")==1 and E("S.template")=='mecanico')
    E("tplApply('arquitetonico')"); pg.wait_for_timeout(150); i=info()
    ok('Arquitetônico: metro, A3 paisagem, viewport e anotação 1:50',i['u']=='m' and i['fmt']=='A3' and i['w']==420 and near(i['vp'],1/50) and near(i['anno'],1/50),i)
    ok('Arquitetônico: camadas de paredes, portas, janelas, mobiliário, louças, cotas, eixos, textos…',{'ARQ-PAREDE','ARQ-PORTA','ARQ-JANELA','ARQ-MOBILIARIO','ARQ-LOUCAS','ARQ-COTA','ARQ-EIXO','ARQ-TEXTO','ARQ-NIVEL','ARQ-PROJECAO','ARQ-CORTE'}<=set(i['lys']) and i['cur']=='ARQ-PAREDE',i['lys'])
    st=E("dimStyleOf({tp:'dim',dimStyle:'ARQ 1:50'})")
    ok('Arquitetônico: cota com traço oblíquo, anotativa, em metros com vírgula',st['arrowType']=='tick' and st['annot'] and st['unit']=='m' and st['decSep']==',')
    E("()=>{addE({tp:'dim',subtp:'linear',dimDir:'h',x1:0,y1:0,x2:3.5,y2:0,px:1.75,py:-0.6,dimStyle:S.dimCurrent});}")
    ok('Arquitetônico: parede de 3,50 m cotada como "3,50"',E("dimLinearText(3.5,dimStyleOf(S.ents[0])).main")=='3,50')
    ok('Arquitetônico: texto padrão 2,5 mm no papel (0,125 m) e offset de parede 0,15',near(i['th'],0.125) and near(E("S.offDist"),0.15))
    ok('Arquitetônico: blocos de portas, janela e norte; norte no layout',{'PORTA_80','PORTA_70','JANELA_120','NORTE'}<=set(i['blocks']) and i['norte'] and i['campos'].get('titulo')=='PLANTA BAIXA' and i['campos'].get('escala')=='1:50')
    hp=E("S.hatchPat"); ok('Arquitetônico: hachura ajustada à escala (ANSI31 ~3 mm no papel)',hp['pname']=='ANSI31' and near(hp['sp']*20,3.175,0.01),hp)
    # DXF do arquitetônico
    E("()=>{addE({tp:'insert',name:'PORTA_80',x:1,y:0,s:1,rot:0,m:false});}")
    f=TMP('a.dxf'); open(f,'wb').write(bytes(E("Array.from(cp1252Encode(buildDXF2000({})))"))); d=ezdxf.readfile(f); os.remove(f)
    ok('DXF: unidades em metros ($INSUNITS=6) e escala de tipos de linha 0,025',d.header['$INSUNITS']==6 and near(d.header['$LTSCALE'],0.025),(d.header['$INSUNITS'],d.header['$LTSCALE']))
    ly={l.dxf.name:l for l in d.layers}
    ok('DXF: camadas com cor, tipo e espessura (ARQ-EIXO CENTER 0,13; ARQ-PAREDE 0,50; ARQ-AUXILIAR não imprime)',ly['ARQ-EIXO'].dxf.linetype=='CENTER' and ly['ARQ-EIXO'].dxf.lineweight==13 and ly['ARQ-PAREDE'].dxf.lineweight==50 and ly['ARQ-AUXILIAR'].dxf.plot==0)
    lay=d.layouts.get([n for n in d.layouts.names() if n!='Model'][0]); vps=[v for v in lay.query('VIEWPORT') if v.dxf.id!=1]
    ok('DXF: viewport em 1:50 (1 m = 20 mm no papel)',vps and near(vps[0].dxf.height/vps[0].dxf.view_height,20,1e-6))
    ok('DXF: bloco PORTA_80 com o arco da porta',any(e.dxftype()=='ARC' for e in d.blocks.get('PORTA_80')) and len(d.modelspace().query('INSERT'))==1)
    # salvar e reabrir mantém as configurações
    doc=E("JSON.stringify(buildDoc())"); f=TMP('a.json'); open(f,'w').write(doc)
    E("()=>{var c=window.confirm;window.confirm=()=>true;newDoc();window.confirm=c;}")
    ok('Novo desenho comum volta a milímetros e 1:1',E("[S.units.insertScale,S.annoScale,S.ltscale||null,S.template||null]")==['mm',1,None,None])
    pg.set_input_files('#fileInput',f); pg.wait_for_timeout(250); os.remove(f)
    ok('Abrir o arquivo restaura unidade, escala, camadas, estilo e template',E("[S.units.insertScale,S.annoScale,S.dimCurrent,S.template,S.layers.length,S.ltscale]")==['m',0.02,'ARQ 1:50','arquitetonico',16,0.025],E("[S.units.insertScale,S.annoScale,S.dimCurrent,S.template,S.layers.length,S.ltscale]"))
    # ── Topográfico
    E("tplApply('topografico')"); pg.wait_for_timeout(150); i=info()
    ok('Topográfico: metro, ângulos em GMS, A3 paisagem, 1:1000',i['u']=='m' and i['ang']=='deg_min_sec' and i['fmt']=='A3' and near(i['vp'],1/1000),i)
    ok('Topográfico: camadas de pontos, curvas de nível, limites, edificações, vias, hidrografia, coordenadas, cotas altimétricas…',{'TOP-PONTOS','TOP-CURVA-MESTRA','TOP-CURVA-INTERMEDIARIA','TOP-LIMITE','TOP-EDIFICACAO','TOP-VIA','TOP-HIDROGRAFIA','TOP-COORDENADAS','TOP-COTA-ALTIMETRICA','TOP-VEGETACAO','TOP-MALHA-COORD','TOP-TEXTO'}<=set(i['lys']) and i['cur']=='TOP-PONTOS',i['lys'])
    L=E("Object.fromEntries(S.layers.map(l=>[l.nm,[l.ld,l.lw]]))"); ok('Topográfico: curva mestra 0,35 e intermediária 0,13; limite em linha fantasma 0,50',L['TOP-CURVA-MESTRA'][1]==0.35 and L['TOP-CURVA-INTERMEDIARIA'][1]==0.13 and L['TOP-LIMITE']==['phantom',0.5])
    ok('Topográfico: blocos MARCO, RN, ÁRVORE e NORTE; carimbo do levantamento',{'MARCO','RN','ARVORE','NORTE'}<=set(i['blocks']) and i['campos'].get('titulo')=='LEVANTAMENTO PLANIALTIMÉTRICO' and i['campos'].get('escala')=='1:1000')
    ok('Topográfico: texto 2 mm no papel = 2 m; grade 10 m; tabela de PONTOS em metros',near(i['th'],2) and i['grid']==[10,1] and E("document.getElementById('pt-unit').value")=='m')
    ok('Topográfico: POLIGONAL desenha em metros (85,24 m = 85,24 unidades)',E("(()=>{var R=poAulaR();return Math.abs(R.pts[1].E-R.pts[0].E-84.6258557751676)<1e-6&&1000/unitMm()===1;})()"))
    # ── Padrão
    E("tplApply('padrao')"); i=info()
    ok('Padrão: o desenho inicial de sempre (mm, 4 camadas, Standard)',i['u']=='mm' and i['lys'][:4]==['0','Construção','Dimensão','Hachura'] and i['dim']=='Standard' and i['tpl'] is None and near(i['anno'],1),i)
    # ── Meus modelos
    E("tplApply('arquitetonico')"); E("()=>{S.layers.push({id:40,nm:'MINHA-CAMADA',col:'#ff0000',vis:true,lock:false,ld:'solid',lw:.35});addE({tp:'rect',x:0,y:0,w:1,h:1});}")
    E("tplOpen()"); pg.fill('#tpl-name','Planta da turma'); pg.click('#tpl-add'); pg.wait_for_timeout(50)
    ok('Guardar o desenho atual como modelo (no navegador)',E("tplUserList().length")==1 and 'Planta da turma' in E("document.getElementById('tpl-user').textContent"))
    ok('Sem "incluir objetos", o modelo guarda só as configurações',E("tplUserList()[0].doc.ents.length")==0)
    E("()=>{var c=window.confirm;window.confirm=()=>true;try{tplUserApply(0);}finally{window.confirm=c;}}"); pg.wait_for_timeout(150)
    ok('Criar a partir do modelo próprio: camada e unidade guardadas, sem objetos',E("S.layers.some(l=>l.nm==='MINHA-CAMADA')") and E("S.units.insertScale")=='m' and E("S.ents.length")==0 and 'Planta da turma' in E("document.getElementById('ftitle').textContent"))
    E("tplOpen()"); pg.click('#tpl-user .btn.s'); pg.wait_for_timeout(50); ok('Excluir o modelo próprio',E("tplUserList().length")==0)
    E("closeOv('ov-novo')")
    jf=TMP('m.json'); E("tplApply('topografico')"); open(jf,'w').write(E("JSON.stringify(buildDoc())")); E("tplApply('padrao')")
    E("tplOpen()"); pg.set_input_files('#tpl-file',jf); pg.wait_for_timeout(250); os.remove(jf)
    ok('Usar um arquivo .json como modelo',E("S.template")=='topografico' and E("S.units.insertScale")=='m' and 'Sem título' in E("document.getElementById('ftitle').textContent"))
    # Aula guiada continua em milímetros
    E("()=>{aulaOpen();exSelect(0);exStart();aulaClose();}"); ok('Aula guiada começa num desenho em milímetros',E("[S.units.insertScale,S.annoScale]")==['mm',1])
    ok('Botão antigo "Template" agora se chama Moldura (moldura no Model)',E("Array.from(document.querySelectorAll('.rb')).some(b=>b.textContent.trim()==='Moldura')"))
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
fails=[n for n,c in R if not c]; print(f'\n{len(R)-len(fails)}/{len(R)} testes OK'); sys.exit(1 if fails else 0)
