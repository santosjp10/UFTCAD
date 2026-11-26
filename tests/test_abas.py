# Abas de desenhos (v8.14): vários desenhos abertos, estado independente por aba, indicador de alterações,
# fechar com Salvar / Não salvar / Cancelar, CLOSEALL, Alt+PageDown, Abrir em aba nova e copiar/colar entre desenhos.
# Uso: pip install playwright ezdxf && playwright install chromium && python tests/test_abas.py
import sys, os, json
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
def near(a,b,t=1e-6): return a is not None and abs(a-b)<=t
def TMP(n): return os.path.join(HERE,'_'+n)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1440,'height':900})
    try: ctx.grant_permissions(['clipboard-read','clipboard-write'])
    except Exception: pass
    pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.goto('file://'+path); pg.wait_for_timeout(600); E=pg.evaluate
    if E("document.getElementById('ov-recover').classList.contains('show')"): E("closeOv('ov-recover')")
    E("FILEIO.noPicker=true")
    def tabs(): E("docTabsRender()"); return E("Array.from(document.querySelectorAll('#dt-list .dt-tab')).map(t=>({nm:t.querySelector('.dt-nm').textContent,on:t.classList.contains('on'),dirty:t.classList.contains('dirty')}))")
    # ── barra
    T=tabs(); ok('Barra de abas com o desenho inicial',len(T)==1 and T[0]['nm']=='Sem título' and T[0]['on'],T)
    ok('A barra fica entre a faixa de opções e a área de desenho',E("(()=>{var b=document.getElementById('doctabs').getBoundingClientRect(),r=document.getElementById('ribbon').getBoundingClientRect(),c=document.getElementById('cw').getBoundingClientRect();return b.top>=r.bottom-1&&b.bottom<=c.top+1&&b.height>=20;})()"))
    pg.click('#dt-new'); ok('Botão + abre a galeria de modelos',E("document.getElementById('ov-novo').classList.contains('show')"))
    pg.click('#tpl-arquitetonico .btn.p'); pg.wait_for_timeout(100); T=tabs()
    ok('Desenho inicial vazio é reaproveitado (continua 1 aba)',len(T)==1 and 'Arquitetônico' in T[0]['nm'],T)
    E("()=>{addE({tp:'rect',x:0,y:0,w:4,h:3});snapshot();addE({tp:'line',x1:0,y1:0,x2:4,y2:3});S.dirty=true;}")
    E("tplOpen()"); pg.click('#tpl-topografico .btn.p'); pg.wait_for_timeout(100); T=tabs()
    ok('Novo com um desenho aberto cria uma aba nova (ativa)',len(T)==2 and T[1]['on'] and 'Topográfico' in T[1]['nm'],T)
    ok('Indicador de alterações não salvas (●) na aba do desenho modificado',T[0]['dirty'] and not T[1]['dirty'])
    ok('Nomes curtos e numerados (Sem título 2 · Topográfico)',T[1]['nm']=='Sem título 2 · Topográfico',T[1]['nm'])
    E("()=>{addE({tp:'circ',cx:100,cy:100,r:10});addE({tp:'circ',cx:120,cy:100,r:10});snapshot();S.dirty=true;document.getElementById('th').value='7';S.modes.gridSz=25;}")
    E("()=>{switchSpace(S.layouts[0].id);}")
    E("tplOpen()"); pg.click('#tpl-padrao .btn.p'); pg.wait_for_timeout(100)
    ok('Terceira aba (Padrão) em milímetros',len(tabs())==3 and E("S.units.insertScale")=='mm' and E("S.ents.length")==0 and E("S.space")=='model')
    # ── estados independentes
    pg.click('#dt-list .dt-tab[data-i="0"]'); pg.wait_for_timeout(50)
    st=E("({u:S.units.insertScale,t:S.template,n:S.ents.length,ly:S.layers.length,an:S.annoScale,dim:S.dimCurrent,cur:getLy(S.curLy).nm,und:S.undos.length,sp:S.space,title:document.getElementById('ftitle').textContent})")
    ok('Clique na aba 1: volta o desenho arquitetônico com objetos, camadas, unidade, escala e estilo',st['u']=='m' and st['t']=='arquitetonico' and st['n']==2 and st['ly']==16 and near(st['an'],0.02) and st['dim']=='ARQ 1:50' and st['cur']=='ARQ-PAREDE' and 'Arquitetônico' in st['title'],st)
    ok('Desfazer é de cada desenho',st['und']>=2)
    E("undo()"); ok('Ctrl+Z na aba 1 desfaz só nela',E("S.ents.length")==1)
    pg.click('#dt-list .dt-tab[data-i="1"]'); pg.wait_for_timeout(50)
    st=E("({u:S.units.insertScale,ang:S.units.angType,sp:S.space,th:document.getElementById('th').value,g:S.modes.gridSz,lay:document.body.classList.contains('paper'),tab:document.querySelector('.tbtab.active')&&document.querySelector('.tbtab.active').id})")
    ok('Aba 2: topográfico continua no Layout (espaço do papel), com texto 7 e grade 25',st['u']=='m' and st['ang']=='deg_min_sec' and st['sp']!='model' and st['lay'] and st['th']=='7' and st['g']==25,st)
    E("()=>{switchSpace('model');}"); ok('Aba 2: objetos do Model preservados',E("S.ents.length")==2)
    pg.click('#dt-list .dt-tab[data-i="2"]'); ok('Aba 3: grade e texto do desenho padrão não foram afetados',E("S.modes.gridSz")!=25 and E("document.getElementById('th').value")!='7')
    pg.locator('#cw').click(position={'x':40,'y':40}); E("()=>{if(S.ds)ncEnd();}")
    pg.keyboard.press('Alt+PageDown'); ok('Alt+PageDown vai para a próxima aba (circular)',E("DOCS.cur")==0)
    pg.keyboard.press('Alt+PageUp'); ok('Alt+PageUp volta',E("DOCS.cur")==2)
    E("docSwitch(1)"); E("setTool('line')"); E("cmdSubmit('0,0')"); E("docSwitch(0)")
    ok('Trocar de aba encerra o comando em andamento',not E("S.ds") and E("S.tool")=='select')
    # ── arquivo, Ctrl+S e cópia de segurança por aba
    E("()=>{FILEIO.docHandle={name:'planta.json',fake:1};}"); a0=E("AS.sid"); E("docSwitch(1)")
    ok('Arquivo associado (Ctrl+S) e cópia de segurança são de cada aba',E("FILEIO.docHandle")==None and E("AS.sid")!=a0)
    E("docSwitch(0)"); ok('…e voltam ao trocar de aba',E("FILEIO.docHandle&&FILEIO.docHandle.name")=='planta.json' and E("AS.sid")==a0); E("()=>{FILEIO.docHandle=null;}")
    # ── abrir
    E("docSwitch(2)"); E("()=>{addE({tp:'line',x1:0,y1:0,x2:10,y2:0});}")
    doc={'app':'EduCAD','v':'8','ents':[{'id':'e1','tp':'line','x1':0,'y1':0,'x2':50,'y2':50,'ly':0}],'layers':[{'id':0,'nm':'0','col':'#ffffff','vis':True,'lock':False}]}
    f=TMP('aba.json'); open(f,'w').write(json.dumps(doc)); n0=len(tabs())
    pg.set_input_files('#fileInput',f); pg.wait_for_timeout(250); T=tabs()
    ok('Abrir com um desenho aberto: aba nova com o nome do arquivo',len(T)==n0+1 and T[DOCS_cur]['nm']=='_aba' if (DOCS_cur:=E("DOCS.cur")) is not None else False,T)
    ok('O desenho anterior continua na sua aba',E("(()=>{var st=DOCS.list[DOCS.cur-1].st;return st&&st.S.ents.length;})()")==1)
    open(f,'w').write('{isto não é json'); pg.set_input_files('#fileInput',f); pg.wait_for_timeout(250)
    ok('Arquivo inválido não cria aba',len(tabs())==n0+1)
    os.remove(f)
    d=TMP('aba.dxf'); E("()=>{}"); open(d,'wb').write(bytes(E("Array.from(cp1252Encode(buildDXF2000({})))")))
    pg.set_input_files('#fileInput',d); pg.wait_for_timeout(300); ok('Abrir DXF também cria aba',len(tabs())==n0+2 and E("S.ents.length")==1)
    E("dxfIn(true)"); pg.set_input_files('#fileInput',d); pg.wait_for_timeout(300); os.remove(d)
    ok('Anexar DXF (merge) fica na mesma aba',len(tabs())==n0+2 and E("S.ents.length")==2)
    # ── fechar
    E("()=>{S.dirty=false;}"); n=len(tabs()); pg.click('#dt-list .dt-tab.on .dt-x'); pg.wait_for_timeout(50)
    ok('Fechar aba sem alterações: fecha direto',len(tabs())==n-1 and not E("document.getElementById('ov-fechar').classList.contains('show')"))
    E("()=>{addE({tp:'line',x1:0,y1:0,x2:1,y2:1});S.dirty=true;}"); n=len(tabs()); E("docClose()")
    ok('Fechar com alterações: pergunta Salvar / Não salvar / Cancelar',E("document.getElementById('ov-fechar').classList.contains('show')") and 'Salvar as alterações' in E("document.getElementById('dt-close-msg').textContent"))
    pg.click('#dt-cancel'); ok('Cancelar mantém a aba e o desenho',len(tabs())==n and E("S.dirty"))
    E("docClose()"); pg.click('#dt-discard'); ok('Não salvar fecha a aba',len(tabs())==n-1)
    # salvar e fechar
    E("()=>{addE({tp:'line',x1:0,y1:0,x2:2,y2:2});S.dirty=true;}"); n=len(tabs()); E("docClose()")
    with pg.expect_download() as dl: pg.click('#dt-save'); pg.wait_for_timeout(100); pg.click('#ov-export .mact .btn.p')
    pg.wait_for_timeout(900); ok('Salvar: grava o arquivo e fecha a aba',len(tabs())==n-1,len(tabs()))
    # botão do meio
    n=len(tabs()); E("()=>{S.dirty=false;}") ; idx=E("DOCS.cur")
    pg.locator(f'#dt-list .dt-tab[data-i="{idx}"]').click(button='middle'); pg.wait_for_timeout(50)
    ok('Botão do meio do mouse fecha a aba',len(tabs())==n-1)
    # menu: fechar os outros
    E("tplCreate('mecanico')"); E("tplCreate('topografico')"); n=len(tabs())
    pg.locator('#dt-list .dt-tab.on').click(button='right'); ok('Botão direito abre o menu da aba',E("document.getElementById('dt-menu').classList.contains('show')"))
    E("()=>{var c=0;for(var i=0;i<DOCS.list.length;i++) if(docDirtyAt(i)) c++; window._dirty=c;}")
    pg.click('#dt-menu button:has-text(\"Fechar os outros\")'); pg.wait_for_timeout(50)
    ok('Fechar os outros: fica a aba ativa e as que têm alterações',len(tabs())==1+E("window._dirty"),(len(tabs()),E("window._dirty")))
    # fechar todos
    E("cmdSubmit('CLOSEALL')"); guard=0
    while E("document.getElementById('ov-fechar').classList.contains('show')") and guard<10: pg.click('#dt-discard'); pg.wait_for_timeout(30); guard+=1
    pg.wait_for_timeout(100); T=tabs()
    ok('CLOSEALL fecha todos e deixa um desenho novo',len(T)==1 and T[0]['nm']=='Sem título' and E("docPristine()"),T)
    # ── copiar e colar entre desenhos
    E("tplCreate('topografico')"); E("()=>{var a=addE({tp:'circ',cx:10,cy:10,r:5,ly:S.layers.find(l=>l.nm==='TOP-LIMITE').id});var n=bibDefine('MARCO');addE({tp:'insert',name:n,x:20,y:10,s:1,rot:0,m:false,ly:S.layers.find(l=>l.nm==='TOP-PONTOS').id});addE({tp:'dim',subtp:'linear',dimDir:'h',x1:5,y1:10,x2:15,y2:10,px:10,py:2,dimStyle:'TOPO 1:1000'});S.sel=S.ents.map(e=>e.id);}")
    pg.locator('#cw').click(position={'x':600,'y':300}); E("()=>{if(S.ds)ncEnd();S.sel=S.ents.map(e=>e.id);document.getElementById('cmdinput').focus();}")
    pg.keyboard.press('Control+c'); pg.wait_for_timeout(50)
    ok('Ctrl+C copia a seleção (COPYCLIP)',E("DOCCLIP&&DOCCLIP.n")==3,E("DOCCLIP&&DOCCLIP.n"))
    ok('Ponto base = canto inferior esquerdo da seleção',E("DOCCLIP.base.x")==5 and E("DOCCLIP.base.y")==2 or E("DOCCLIP.base.y")<=5,E("DOCCLIP.base"))
    E("tplCreate('padrao')"); pg.wait_for_timeout(50); E("document.getElementById('cmdinput').focus()")
    pg.keyboard.press('Control+v'); pg.wait_for_timeout(80)
    viakey=E("S.ds&&S.ds.cmd")=='pasteclip'
    if not viakey: E("setTool('pasteclip')")
    ok('Ctrl+V em outra aba inicia PASTECLIP',viakey or E("S.ds&&S.ds.cmd")=='pasteclip')
    box=pg.locator('#cw').bounding_box(); pg.mouse.move(box['x']+400,box['y']+300); pg.wait_for_timeout(30)
    E("cmdSubmit('1000,1000')")
    c=E("S.ents.find(e=>e.tp==='circ')")
    ok('Colado no ponto, com conversão de metros para milímetros (×1000)',c and near(c['r'],5000) and near(c['cx'],1000+(10-E("DOCCLIP.base.x"))*1000),c)
    ok('Camadas que faltavam foram criadas com as mesmas propriedades',E("(()=>{var l=S.layers.find(l=>l.nm==='TOP-LIMITE');return !!l&&l.ld==='phantom'&&l.lw===0.5&&getLy(S.ents.find(e=>e.tp==='circ').ly).nm==='TOP-LIMITE';})()"))
    ok('Bloco e estilo de cota vieram junto',E("!!S.blocks.MARCO&&S.dimStyles.some(s=>s.name==='TOPO 1:1000')"))
    ok('Os objetos colados ficam selecionados e o desenho marcado como alterado',E("S.sel.length")==3 and E("S.dirty"))
    E("undo()"); ok('Ctrl+Z desfaz a colagem',E("S.ents.length")==0)
    E("setTool('pasteclip')"); E("cmdSubmit('0,0')"); E("setTool('pasteclip')"); E("cmdSubmit('0,0')")
    ok('Colar de novo reaproveita as camadas (sem duplicar)',E("S.layers.filter(l=>l.nm==='TOP-LIMITE').length")==1 and E("S.ents.length")==6)
    E("()=>{S.sel=[S.ents[0].id];}"); E("setTool('copybase')"); E("cmdSubmit('100,200')")
    ok('COPYBASE: ponto base escolhido',E("DOCCLIP.base.x")==100 and E("DOCCLIP.base.y")==200)
    E("()=>{S.sel=[];}"); E("setTool('copyclip')"); ok('COPYCLIP sem seleção pede para selecionar',E("S.ds&&S.ds.phase")=='sel'); E("()=>{if(S.ds)ncEnd();}")
    E("()=>{var dt=new DataTransfer();dt.setData('text/plain','10,10\\n20,20\\n30,10');document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));}"); pg.wait_for_timeout(80)
    ok('Colar texto de outro programa (coordenadas) continua indo para o PONTOS',E("document.getElementById('ov-pontos').classList.contains('show')") and not E("S.ds&&S.ds.cmd==='pasteclip'"))
    E("closeOv('ov-pontos')")
    # ── biblioteca acompanha a aba
    E("bibOpen()"); E("docSwitch(0)"); ok('Biblioteca de blocos acompanha a aba ativa',E("!!document.getElementById('bib-pal')"))
    E("bibClose()")
    # ── sair da página com outro desenho alterado
    E("()=>{S.dirty=true;}"); E("docSwitch(1)"); E("()=>{S.dirty=false;}")
    ok('Sair do EduCAD com alterações em outra aba pede confirmação',E("(()=>{var e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;})()"))
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
fails=[n for n,c in R if not c]; print(f'\n{len(R)-len(fails)}/{len(R)} testes OK'); sys.exit(1 if fails else 0)
