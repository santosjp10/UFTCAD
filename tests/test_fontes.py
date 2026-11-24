# Testes da v8.10: fontes dos textos (editor, propriedades, ESTILO, DXF, PDF, SVG, importação)
# e espessuras de linha compatíveis com o AutoCAD (camadas padrão, LWDISPLAY, listas, migração).
# Uso: pip install playwright ezdxf pypdf && playwright install chromium && python tests/test_fontes.py
import sys, os, json
from playwright.sync_api import sync_playwright
import ezdxf
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
def TMP(n): return os.path.join(HERE,'_'+n)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':850})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.goto('file://'+path); pg.wait_for_timeout(500); E=pg.evaluate
    if E("document.getElementById('ov-recover').classList.contains('show')"): E("closeOv('ov-recover')")
    def reset(): E("()=>{document.querySelectorAll('.ov.show').forEach(o=>o.classList.remove('show'));S.ents=[];S.sel=[];S.ds=null;S.textFont='Arial';resetHistory();setTool('select');S.modes.snap=false;S.vp={x:300,y:300,sc:4};renderAll();}")
    def dxf(opt='{}'):
        f=TMP('f.dxf'); open(f,'wb').write(bytes(E(f"Array.from(cp1252Encode(buildDXF2000({opt})))"))); d=ezdxf.readfile(f); os.remove(f); return d
    box=pg.locator('#cw').bounding_box()
    # ── catálogo
    v=E("[fontKey('Consolas,monospace'),fontKey(\"'Times New Roman',serif\"),fontKey('isocpeur.ttf'),fontKey('ROMANS.SHX'),fontKey(null),fontInfo('ISOCPEUR').file,fontFromDxf('times.ttf'),fontFromDxf('x.ttf','Calibri'),fontFromDxf('desconhecida.ttf')]")
    ok('Catálogo: nomes antigos, arquivos e famílias reconhecidos',v==['Consolas','Times New Roman','ISOCPEUR','romans','Arial','isocpeur.ttf','Times New Roman','Calibri',None],v)
    ok('Fontes convencionais e de CAD disponíveis',set(E("FONTS.map(f=>f[0])"))>={'Arial','Times New Roman','Calibri','Courier New','ISOCPEUR','romans','simplex','txt'})
    # ── editor: fonte do texto
    reset(); E("setTool('text')"); s=E("w2s(0,0)"); pg.mouse.click(box['x']+s['x'],box['y']+s['y']); pg.wait_for_timeout(80)
    ok('Editor de texto tem a escolha da fonte (padrão: Arial)',pg.locator('#mted-font').is_visible() and E("document.getElementById('mted-font').value")=='Arial')
    pg.select_option('#mted-font','Times New Roman')
    ok('A fonte escolhida aparece no próprio editor','Times' in E("document.getElementById('mted-txt').style.fontFamily"))
    pg.click('#mted-txt'); pg.keyboard.press('Control+A'); pg.keyboard.type('Título'); pg.keyboard.press('Control+Enter'); pg.wait_for_timeout(60)
    ok('Texto criado com a fonte escolhida',E("S.ents[0].tp")=='txt' and E("S.ents[0].font")=='Times New Roman')
    E("setTool('text')"); s=E("w2s(0,-20)"); pg.mouse.click(box['x']+s['x'],box['y']+s['y']); pg.wait_for_timeout(60)
    ok('Editor lembra a última fonte usada',E("document.getElementById('mted-font').value")=='Times New Roman')
    pg.select_option('#mted-font','Arial'); pg.click('#mted-txt'); pg.keyboard.press('Control+A'); pg.keyboard.type('padrão'); pg.keyboard.press('Control+Enter'); pg.wait_for_timeout(60)
    ok('Texto na fonte padrão não guarda fonte própria (acompanha o estilo Standard)',E("S.ents[1].font===undefined||S.ents[1].font===null"))
    E("textEdit(S.ents[0])"); pg.wait_for_timeout(40); ok('Editar texto mostra a fonte dele',E("document.getElementById('mted-font').value")=='Times New Roman')
    pg.select_option('#mted-font','ISOCPEUR'); pg.click('#ov-mtext .btn.p'); pg.wait_for_timeout(50); ok('Trocar a fonte ao editar',E("S.ents[0].font")=='ISOCPEUR')
    E("()=>{S.sel=[S.ents[1].id];updSelInfo();}"); pg.wait_for_timeout(50)
    ok('Painel de propriedades mostra a fonte',E("(()=>{var t=Array.from(document.querySelectorAll('#selinfo select, .ppanel select, select')).find(s=>Array.from(s.options).some(o=>o.text.indexOf('ISOCPEUR')===0));return !!t;})()"))
    E("()=>{var F=geomFields(S.ents[1]);var f=F.find(x=>x.l==='Fonte');snapshot();f.set(S.ents[1],'Courier New');renderAll();}")
    ok('Fonte alterada pelo campo do painel',E("S.ents[1].font")=='Courier New')
    # ── comando ESTILO
    E("cmdSubmit('ST')"); ok('Comando ST/ESTILO abre a janela de estilo de texto',E("document.getElementById('ov-style').classList.contains('show')"))
    pg.select_option('#sty-font','romans'); ok('Janela mostra o arquivo que o AutoCAD vai usar','romans.shx' in E("document.getElementById('sty-file').textContent"))
    pg.click('#sty-def'); ok('Definir a fonte padrão do desenho',E("S.textFont")=='romans')
    reset(); E("()=>{addE({tp:'txt',x:0,y:0,h:3,txt:'a',rot:0});addE({tp:'txt',x:0,y:10,h:3,txt:'b',rot:0});S.sel=[S.ents[0].id];}")
    E("styleOpen()"); pg.select_option('#sty-font','Calibri'); pg.click('#sty-sel'); ok('Aplicar a fonte aos selecionados',E("[S.ents[0].font,S.ents[1].font||null]")==['Calibri',None])
    E("styleOpen()"); pg.select_option('#sty-font','Verdana'); pg.click('#sty-all'); ok('Aplicar a todos os textos',E("S.ents.every(e=>e.font==='Verdana')"))
    # ── DXF
    reset(); E("""()=>{addE({tp:'txt',x:0,y:0,h:5,txt:'Arial',rot:0});addE({tp:'txt',x:0,y:10,h:5,txt:'Times',rot:0,font:'Times New Roman'});
       addE({tp:'mtext',x:0,y:30,w:0,h:3,txt:'{\\\\H2x;ISO}\\nlinha',att:1,rot:0,font:'ISOCPEUR'});addE({tp:'txt',x:0,y:40,h:5,txt:'shx',rot:0,font:'romans'});
       addE({tp:'dim',subtp:'linear',dimDir:'h',x1:0,y1:0,x2:50,y2:0,px:25,py:-10,dimStyle:'ABNT'});}""")
    d=dxf(); st={s.dxf.name:s for s in d.styles}
    ok('DXF: estilo Standard com Arial (antes txt.shx)',st['Standard'].dxf.font=='arial.ttf' and st['Standard'].get_extended_font_data()[0]=='Arial')
    ok('DXF: um estilo de texto por fonte usada, com o arquivo da fonte',st['Times New Roman'].dxf.font=='times.ttf' and st['ISOCPEUR'].dxf.font=='isocpeur.ttf' and st['romans'].dxf.font=='romans.shx',sorted(st))
    T={x.dxf.text:x.dxf.style for x in d.modelspace().query('TEXT')}; M=d.modelspace().query('MTEXT')[0]
    ok('DXF: cada TEXT/MTEXT aponta para o estilo da sua fonte',T.get('Arial')=='Standard' and T.get('Times')=='Times New Roman' and T.get('shx')=='romans' and M.dxf.style=='ISOCPEUR',T)
    ok('DXF: auditoria sem erros',not d.audit().errors)
    ok('DXF: cota no estilo Standard (Arial)',d.dimstyles.get('ABNT').dxf.dimtxsty=='Standard')
    E("()=>{dspGetStyle('ABNT').font='ISOCPEUR';}"); d=dxf()
    ok('DXF: fonte do estilo de cota vira o DIMTXSTY',d.dimstyles.get('ABNT').dxf.dimtxsty=='ISOCPEUR')
    dm=d.modelspace().query('DIMENSION')[0]; tb=[x for x in d.blocks.get(dm.dxf.geometry) if x.dxftype()=='TEXT']
    ok('DXF: texto da cota (bloco) com o estilo da fonte da cota',tb and tb[0].dxf.style=='ISOCPEUR')
    E("()=>{dspGetStyle('ABNT').font='Arial';}")
    f=TMP('r12.dxf'); open(f,'wb').write(bytes(E("Array.from(cp1252Encode(buildDXF()))"))); d12=ezdxf.readfile(f); os.remove(f)
    ok('DXF R12: STANDARD com a fonte padrão (não mais txt)',d12.styles.get('STANDARD').dxf.font=='arial.ttf')
    E("()=>{S.textFont='Times New Roman';}"); d=dxf(); ok('Fonte padrão Times: Standard = times.ttf',d.styles.get('Standard').dxf.font=='times.ttf'); E("()=>{S.textFont='Arial';}")
    # importação
    d2=ezdxf.new('R2000'); d2.header['$INSUNITS']=4; d2.styles.add('Titulo',font='times.ttf'); d2.styles.add('Tec',font='isocpeur.ttf')
    m=d2.modelspace(); m.add_text('Importado',dxfattribs={'style':'Titulo','height':5}); m.add_mtext('Nota',dxfattribs={'style':'Tec','char_height':3}); m.add_text('Sem estilo',dxfattribs={'height':5})
    f=TMP('i.dxf'); d2.saveas(f); reset(); pg.set_input_files('#fileInput',f); pg.wait_for_timeout(300); os.remove(f)
    imp={e['txt']:e.get('font') for e in E("S.ents.map(e=>({txt:e.txt,font:e.font}))")}
    ok('Importar DXF: a fonte do estilo de texto é mantida',imp.get('Importado')=='Times New Roman' and imp.get('Nota')=='ISOCPEUR' and imp.get('Sem estilo')=='txt',imp)  # Standard do ezdxf = txt
    # PDF e SVG
    reset(); E("()=>{addE({tp:'txt',x:20,y:150,h:5,txt:'Helv',rot:0});addE({tp:'txt',x:20,y:140,h:5,txt:'Tim',rot:0,font:'Times New Roman'});addE({tp:'txt',x:20,y:130,h:5,txt:'Cou',rot:0,font:'Courier New'});switchSpace('layout');}")
    raw=bytes(E("Array.from(buildPDF([curLayout()]))")).decode('latin1'); E("()=>{switchSpace('model');}")
    ok('PDF: Helvetica, Times e Courier conforme a fonte de cada texto','/BaseFont /Helvetica' in raw and '/BaseFont /Times-Roman' in raw and '/F2' in raw and '/F3' in raw and '(Tim) Tj' in raw)
    svg=E("buildSVG()"); ok('SVG: font-family de cada texto','Times New Roman' in svg and 'Arial' in svg)
    # salvar/abrir
    E("()=>{S.textFont='ISOCPEUR';}"); doc=E("JSON.stringify(buildDoc())"); ok('Fonte padrão salva no desenho',json.loads(doc)['textFont']=='ISOCPEUR')
    f=TMP('d.json'); open(f,'w').write(doc); E("()=>{S.textFont='Arial';}"); pg.set_input_files('#fileInput',f); pg.wait_for_timeout(250); os.remove(f)
    ok('…e restaurada ao abrir',E("S.textFont")=='ISOCPEUR'); E("()=>{S.textFont='Arial';}")
    # ── espessuras
    pg.reload(); pg.wait_for_timeout(500)
    if E("document.getElementById('ov-recover').classList.contains('show')"): E("closeOv('ov-recover')")
    reset(); L=E("S.layers.filter(l=>l.id<=3).map(l=>[l.nm,l.lw])")
    ok('Camadas padrão: 0 = 0,35 mm; Construção, Dimensão e Hachura = 0,18 mm',L==[['0',0.35],['Construção',0.18],['Dimensão',0.18],['Hachura',0.18]],L)
    E("addE({tp:'line',x1:0,y1:0,x2:10,y2:0})"); d=dxf()
    ok('DXF: botão LWT desligado ao abrir ($LWDISPLAY=0) e espessura padrão 0,25',d.header['$LWDISPLAY']==0 and d.header['$LWDEFAULT']==25)
    ok('DXF: espessuras das camadas gravadas (35 e 18)',[l.dxf.lineweight for l in d.layers if l.dxf.name in ('0','Dimensao')]==[35,18])
    d=dxf("{lwDisplay:true}"); ok('Opção para abrir com o LWT ligado',d.header['$LWDISPLAY']==1)
    ok('Opção "Mostrar as espessuras ao abrir no AutoCAD" na exportação',E("!!document.getElementById('dxf-lwt')&&!document.getElementById('dxf-lwt').checked"))
    o=E("Array.from(document.getElementById('propLW').options).map(o=>o.value)")
    ok('Lista de espessuras com os valores do AutoCAD (0,05 a 2,11)',o[0]=='' and '0.05' in o and '0.09' in o and '0.53' in o and '2.11' in o and len(o)==24,o)
    ok('Estilo de cota oferece as mesmas espessuras',E("(()=>{showDimStyle();ddimModify();var tabs=document.querySelectorAll('#ov-dimedit [class*=tab]');var found=false;for(var i=0;i<12&&!found;i++){ if(typeof DDIM!=='undefined'){ DDIM.tab=i; try{ddimBuildPane();}catch(e){} } found=Array.from(document.querySelectorAll('#ov-dimedit select')).some(s=>Array.from(s.options).some(o=>o.value==='2.11')); }closeOv('ov-dimedit');closeOv('ov-dimstyle');return found;})()"))
    old={'ents':[],'layers':[{'id':0,'nm':'0','col':'#dce4f5','vis':True,'lock':False,'ld':'solid','lw':0.7},{'id':1,'nm':'Construção','col':'#556688','vis':True,'lock':False,'ld':'center','lw':0.35},{'id':2,'nm':'Dimensão','col':'#f0c040','vis':True,'lock':False,'ld':'solid','lw':0.5},{'id':3,'nm':'Hachura','col':'#6080a0','vis':True,'lock':False,'ld':'solid','lw':0.35},{'id':4,'nm':'Paredes','col':'#ff0000','vis':True,'lock':False,'ld':'solid','lw':0.7}]}
    f=TMP('o.json'); open(f,'w').write(json.dumps(old)); pg.set_input_files('#fileInput',f); pg.wait_for_timeout(250)
    ok('Desenho antigo com as espessuras padrão antigas: camadas padrão atualizadas',E("S.layers.map(l=>l.lw)")==[0.35,0.18,0.18,0.18,0.7],E("S.layers.map(l=>l.lw)"))
    ok('…camadas criadas pelo usuário mantêm a espessura','Espessuras das camadas padrão atualizadas' in ' '.join(E("Array.from(document.querySelectorAll('#cmdlog .cl')).slice(-3).map(d=>d.textContent)")))
    old['layers'][0]['lw']=0.5; open(f,'w').write(json.dumps(old)); pg.set_input_files('#fileInput',f); pg.wait_for_timeout(250); os.remove(f)
    ok('Camadas padrão já alteradas pelo usuário não mudam',E("S.layers.map(l=>l.lw)")==[0.5,0.35,0.5,0.35,0.7])
    v=E("dimStyleOf({tp:'dim',dimStyle:'X'})&&normDimStyle({font:'Consolas,monospace'}).font"); ok('Estilos de cota antigos (Consolas) passam a Arial',v=='Arial',v)
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
fails=[n for n,c in R if not c]; print(f'\n{len(R)-len(fails)}/{len(R)} testes OK'); sys.exit(1 if fails else 0)
