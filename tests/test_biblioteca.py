# Biblioteca de blocos (v8.13): paleta visual por categorias, miniaturas, busca, itens paramétricos,
# escala automática (metros / mm de papel), camada automática, inserção com rotação/escala/espelho,
# blocos do desenho, Meus blocos e DXF.
# Uso: pip install playwright ezdxf && playwright install chromium && python tests/test_biblioteca.py
import sys, os
from playwright.sync_api import sync_playwright
import ezdxf
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
def near(a,b,t=1e-6): return a is not None and abs(a-b)<=t
def TMP(n): return os.path.join(HERE,'_'+n)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1440,'height':900})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.goto('file://'+path); pg.wait_for_timeout(500); E=pg.evaluate
    if E("document.getElementById('ov-recover').classList.contains('show')"): E("closeOv('ov-recover')")
    E("localStorage.removeItem('educad-blocos')")
    def ins(): return E("S.ents.filter(e=>e.tp==='insert'&&!/^CARIMBO|^NORTE$/.test(e.name)).map(e=>({n:e.name,x:e.x,y:e.y,s:e.s,r:Math.round(e.rot*180/Math.PI*1e6)/1e6,m:e.m,ly:getLy(e.ly).nm}))")
    def pick(key,src='bib'): E(f"bibPick('{src}','{key}',true)")
    # ── abrir
    E("tplApply('arquitetonico')")
    pg.click('#rb-bib'); pg.wait_for_timeout(80)
    ok('Botão Biblioteca abre a paleta',E("document.getElementById('bib-pal').classList.contains('show')"))
    ok('No desenho arquitetônico abre na aba Arquitetura',E("document.querySelector('.bib-tab.on').getAttribute('data-tab')")=='arq')
    pg.locator('#cw').click(position={'x':30,'y':30}); E("()=>{if(S.ds)ncEnd();}")
    pg.keyboard.press('Control+3'); pg.wait_for_timeout(50); ok('Ctrl+3 fecha a paleta',not E("document.getElementById('bib-pal').classList.contains('show')"))
    E("cmdSubmit('BIBLIOTECA')"); ok('Comando BIBLIOTECA abre a paleta',E("document.getElementById('bib-pal').classList.contains('show')"))
    # ── catálogo
    cnt=E("({arq:BIB.filter(i=>bibInGroup(i,'arq')).length,top:BIB.filter(i=>bibInGroup(i,'top')).length,mec:BIB.filter(i=>bibInGroup(i,'mec')).length,ids:new Set(BIB.map(i=>i.id)).size,n:BIB.length})")
    ok('Catálogo: ≥ 35 blocos de arquitetura, ≥ 30 de topografia e símbolos mecânicos; nomes únicos',cnt['arq']>=35 and cnt['top']>=30 and cnt['mec']>=3 and cnt['ids']==cnt['n'],cnt)
    cats=E("Array.from(new Set(BIB.filter(i=>bibInGroup(i,'arq')).map(i=>i.cat)))")
    ok('Arquitetura por categorias (portas, janelas, banheiro, cozinha, estar, dormitório, escadas, vegetação, veículos, símbolos)',{'Portas','Janelas','Banheiro e serviço','Cozinha','Estar e jantar','Dormitório','Escadas','Vegetação','Veículos','Símbolos','Orientação'}<=set(cats),cats)
    cats=E("Array.from(new Set(BIB.filter(i=>bibInGroup(i,'top')).map(i=>i.cat)))")
    ok('Topografia por categorias (marcos, infraestrutura e drenagem, hidrografia, vegetação, edificações, orientação)',{'Pontos e marcos','Infraestrutura e drenagem','Hidrografia','Vegetação','Edificações e cercas','Orientação'}<=set(cats),cats)
    need={'PORTA_ABRIR','JANELA_CORRER','VASO_SANITARIO','LAVATORIO','CAMA_CASAL','MESA_6','CADEIRA','ESCADA_RETA','NORTE','ARVORE_PLANTA','FOGAO_4','MARCO_GEODESICO','PONTO_LEV','VERTICE','POSTE','ARVORE','BOCA_LOBO','POCO_VISITA','RN','CASA'}
    ok('Itens pedidos presentes (portas, janelas, louças, móveis, escada, norte, vegetação, marcos, postes, boca de lobo, RN…)',need<=set(E("BIB.map(i=>i.id)")))
    ok('Todos os itens geram geometria e miniatura',E("BIB.every(it=>{var e=bibEnts(it);return e.length>0&&/<(line|circle|path|polyline|ellipse|text|rect)/.test(bibSvg(e,64,46));})"))
    ok('A aba mostra uma miniatura por item, com títulos de categoria',E("document.querySelectorAll('#bib-grid .bib-card').length")==cnt['arq'] and E("document.querySelectorAll('#bib-grid .bib-cat').length")>=10)
    # ── inserção em metros (arquitetônico 1:50)
    pg.click('#bib-grid .bib-card[data-key="PORTA_ABRIR"]'); pg.wait_for_timeout(30)
    ok('Clicar num bloco inicia a inserção (BIBINS)',E("S.ds&&S.ds.cmd")=='bibins' and 'Porta de abrir' in E("document.getElementById('bib-foot').textContent"))
    E("cmdSubmit('1,0')"); ok('Após o ponto, pede a rotação',E("S.ds.phase")=='rot')
    E("cmdSubmit('')"); I=ins()
    ok('Porta inserida como bloco PORTA_ABRIR_80, em tamanho real (fator 1 num desenho em metros)',len(I)==1 and I[0]['n']=='PORTA_ABRIR_80' and near(I[0]['s'],1) and I[0]['x']==1 and I[0]['r']==0,I)
    ok('Camada automática: ARQ-PORTA',I[0]['ly']=='ARQ-PORTA')
    ok('Bloco definido no desenho a partir da biblioteca',E("!!S.blocks.PORTA_ABRIR_80&&S.blocks.PORTA_ABRIR_80.bib==='PORTA_ABRIR'"))
    ok('Repete: continua pedindo o próximo ponto',E("S.ds&&S.ds.cmd==='bibins'&&S.ds.phase==='pt'"))
    E("cmdSubmit('3,0')"); E("cmdSubmit('3,2')"); I=ins()
    ok('Rotação pelo segundo ponto (90°)',len(I)==2 and near(I[1]['r'],90),I[-1])
    E("cmdSubmit('5,0')"); E("cmdSubmit('45')"); I=ins(); ok('Rotação digitada (45°)',near(I[-1]['r'],45))
    E("cmdSubmit('M')"); E("cmdSubmit('7,0')"); E("cmdSubmit('')"); I=ins(); ok('Opção Espelhar (M) e Enter mantém o último ângulo',I[-1]['m']==True and near(I[-1]['r'],45),I[-1])
    E("cmdSubmit('M')"); E("cmdSubmit('E')"); E("cmdSubmit('2')"); E("cmdSubmit('R')"); E("cmdSubmit('0')"); E("cmdSubmit('9,0')"); E("cmdSubmit('')"); I=ins()
    ok('Opções Escala (E) e Rotação (R) na linha de comando',near(I[-1]['s'],2) and near(I[-1]['r'],0) and I[-1]['m']==False,I[-1])
    ok('Paleta acompanha as opções digitadas',E("document.getElementById('bib-mult').value")=='2')
    E("cmdSubmit('')"); ok('Enter termina a inserção',not E("S.ds&&S.ds.cmd==='bibins'"))
    E("()=>{BIBST.mult=1;bibSyncInputs();}")
    # paramétrico
    pick('PORTA_ABRIR'); E("()=>{var i=document.getElementById('bib-par');i.value='0,9';i.dispatchEvent(new Event('change'));}")
    E("cmdSubmit('11,0')"); E("cmdSubmit('')"); I=ins(); ok('Item paramétrico: vão 0,90 → bloco PORTA_ABRIR_90',I[-1]['n']=='PORTA_ABRIR_90')
    E("()=>{var i=document.getElementById('bib-par');i.value='0.85';i.dispatchEvent(new Event('change'));}"); E("cmdSubmit('13,0')"); E("cmdSubmit('')"); I=ins()
    ok('Valor livre (0,85) também vale',I[-1]['n']=='PORTA_ABRIR_85' and near(E("bbox(S.blocks.PORTA_ABRIR_85.ents[1]).w"),0.85,1e-9))
    ok('Valores fora da faixa são limitados',E("bibParVal(bibItem('PORTA_ABRIR'),9)")==1.5 and E("bibParVal(bibItem('ESCADA_RETA'),7.4)")==7)
    E("cmdSubmit('')")
    # itens sem rotação (árvore): um clique só
    pick('ARVORE_PLANTA'); E("cmdSubmit('20,5')"); I=ins(); ok('Árvore: inserida no clique, sem pedir rotação',I[-1]['n']=='ARVORE_PLANTA_300' and E("S.ds.phase")=='pt' and I[-1]['ly']=='ARQ-PISO')
    E("cmdSubmit('')")
    # símbolo de papel no Model 1:50
    pick('NIVEL_PLANTA'); E("cmdSubmit('2,2')"); I=ins(); ok('Símbolo de papel no Model 1:50: fator 0,05 (5 mm impressos = 0,25 m)',near(I[-1]['s'],0.05),I[-1]); E("cmdSubmit('')")
    # undo
    n0=len(ins()); pick('CAMA_SOLTEIRO'); E("cmdSubmit('30,0')"); E("cmdSubmit('')"); E("cmdSubmit('')")
    ok('Cama inserida',len(ins())==n0+1 and E("!!S.blocks.CAMA_SOLTEIRO"))
    E("undo()"); ok('Ctrl+Z desfaz a inserção (a definição fica no desenho, como no AutoCAD)',len(ins())==n0 and E("!!S.blocks.CAMA_SOLTEIRO"))
    # camada automática desligada
    pick('CADEIRA'); E("()=>{var c=document.getElementById('bib-ly');c.checked=false;c.dispatchEvent(new Event('change'));}"); E("cmdSubmit('32,0')"); E("cmdSubmit('')"); I=ins()
    ok('Camada automática desligada: usa a camada atual',I[-1]['ly']==E("getLy(S.curLy).nm")); E("cmdSubmit('')"); E("()=>{BIBST.autoLy=true;}")
    # pré-visualização com o mouse e clique real
    pick('MESA_4'); box=pg.locator('#cw').bounding_box(); pg.mouse.move(box['x']+300,box['y']+300); pg.wait_for_timeout(40)
    E("()=>{S.modes.osnap=false;S.modes.snap=false;S.modes.grid=false;}")
    w=E(f"(()=>{{var r=document.getElementById('cw').getBoundingClientRect();return s2w({box['x']+300}-r.left,{box['y']+300}-r.top);}})()")
    pg.mouse.click(box['x']+300,box['y']+300); pg.wait_for_timeout(40); I=ins()
    ok('Clique no desenho insere no ponto clicado (com pré-visualização)',I[-1]['n']=='MESA_4' and near(I[-1]['x'],w['x'],0.05) and near(I[-1]['y'],w['y'],0.05),(I[-1],w))
    pg.keyboard.press('Escape'); E("()=>{if(S.ds)ncEnd();}")
    # busca
    E("()=>{var q=document.getElementById('bib-q');q.value='poste';q.dispatchEvent(new Event('input'));}")
    ok('Busca "poste" acha os postes da Topografia mesmo na aba Arquitetura',set(E("Array.from(document.querySelectorAll('#bib-grid .bib-card')).map(c=>c.dataset.key)"))>={'POSTE','POSTE_LUZ'})
    E("()=>{var q=document.getElementById('bib-q');q.value='agua';q.dispatchEvent(new Event('input'));}")
    ok('Busca sem acento ("agua" → caixa d’água)','CAIXA_DAGUA' in E("Array.from(document.querySelectorAll('#bib-grid .bib-card')).map(c=>c.dataset.key)"))
    E("()=>{var q=document.getElementById('bib-q');q.value='';q.dispatchEvent(new Event('input'));}")
    # papel (layout)
    E("()=>{switchSpace(S.layouts[0].id);}"); pick('NORTE_SETA'); E("cmdSubmit('100,100')"); E("cmdSubmit('')"); E("cmdSubmit('')")
    ok('No layout (folha), símbolos entram em mm de papel (fator 1)',E("(()=>{var e=S.ents.filter(e=>e.tp==='insert'&&e.name==='NORTE_SETA').pop();return e&&e.s;})()")==1)
    E("()=>{switchSpace('model');}")
    # ── topografia 1:1000 e desenho padrão (mm)
    E("tplApply('topografico')"); E("bibOpen()")
    ok('No desenho topográfico abre na aba Topografia',E("document.querySelector('.bib-tab.on').getAttribute('data-tab')")=='top')
    pick('MARCO_GEODESICO'); E("cmdSubmit('500,500')"); I=ins(); E("cmdSubmit('')")
    ok('Marco geodésico em 1:1000: fator 1 (3 mm impressos = 3 m), camada TOP-PONTOS',near(I[-1]['s'],1) and I[-1]['ly']=='TOP-PONTOS',I[-1])
    pick('BOCA_LOBO'); E("cmdSubmit('510,500')"); E("cmdSubmit('90')"); I=ins(); E("cmdSubmit('')")
    ok('Boca de lobo girada a 90°, camada TOP-HIDROGRAFIA',near(I[-1]['r'],90) and I[-1]['ly']=='TOP-HIDROGRAFIA')
    E("tplApply('padrao')"); pick('PORTA_ABRIR'); E("cmdSubmit('0,0')"); E("cmdSubmit('')"); I=ins(); E("cmdSubmit('')")
    ok('Desenho em milímetros: porta de 0,80 m entra com fator 1000',near(I[-1]['s'],1000) and I[-1]['ly']==E("getLy(S.curLy).nm"),I[-1])
    pick('POSTE'); E("cmdSubmit('0,0')"); I=ins(); E("cmdSubmit('')"); ok('Desenho padrão 1:1: símbolo de papel com fator 1',near(I[-1]['s'],1))
    # ── blocos do desenho e Meus blocos
    E("()=>{var a=addE({tp:'circ',cx:0,cy:0,r:100});S.blocks.MEU_PILAR={base:{x:0,y:0},ents:[{tp:'rect',x:-100,y:-100,w:200,h:200,ly:0},{tp:'line',x1:-100,y1:-100,x2:100,y2:100,ly:0}]};}")
    E("()=>{document.querySelector('.bib-tab[data-tab=dwg]').click();}")
    ok('Aba "Do desenho" mostra os blocos deste desenho',E("Array.from(document.querySelectorAll('#bib-grid .bib-card')).map(c=>c.dataset.key)").count('MEU_PILAR')==1 and not E("Array.from(document.querySelectorAll('#bib-grid .bib-card')).some(c=>/^CARIMBO/.test(c.dataset.key))"))
    pg.click('#bib-grid .bib-card[data-key="MEU_PILAR"]'); E("cmdSubmit('500,0')"); E("cmdSubmit('')"); I=ins(); E("cmdSubmit('')")
    ok('Inserir um bloco do desenho pela paleta (fator 1)',I[-1]['n']=='MEU_PILAR' and near(I[-1]['s'],1))
    pg.click('#bib-keep'); ok('Guardar em Meus blocos (com a unidade de origem)',E("bibUserList().length")==1 and E("bibUserList()[0].mm")==1)
    E("tplApply('arquitetonico')"); E("()=>{document.querySelector('.bib-tab[data-tab=user]').click();}")
    ok('Meus blocos aparece em outro desenho',E("document.querySelectorAll('#bib-grid .bib-card').length")==1)
    pg.click('#bib-grid .bib-card[data-key="MEU_PILAR"]'); E("cmdSubmit('1,1')"); E("cmdSubmit('')"); I=ins(); E("cmdSubmit('')")
    ok('Bloco guardado em mm entra num desenho em metros com fator 0,001',I[-1]['n']=='MEU_PILAR' and near(I[-1]['s'],0.001) and E("!!S.blocks.MEU_PILAR"),I[-1])
    pg.click('#bib-del'); ok('Excluir de Meus blocos',E("bibUserList().length")==0)
    # ── DXF com todos os itens
    E("tplApply('topografico')")
    n=E("""(()=>{var i=0;BIB.forEach(function(it){ BIBST.src='bib';BIBST.sel=it.id;BIBST.rot=0;BIBST.mult=1;BIBST.m=false;setTool('bibins');cmdSubmit((i%10)*20+','+Math.floor(i/10)*20); if(S.ds&&S.ds.phase==='rot') cmdSubmit('30'); cmdSubmit(''); i++; }); return S.ents.filter(e=>e.tp==='insert').length;})()""")
    ok('Todos os itens da biblioteca inseridos num desenho',n==cnt['n'],n)
    f=TMP('bib.dxf'); open(f,'wb').write(bytes(E("Array.from(cp1252Encode(buildDXF2000({})))"))); d=ezdxf.readfile(f); os.remove(f); a=d.audit()
    ok('DXF 2000: um BLOCK por item e um INSERT por inserção, sem erros de auditoria',len(d.modelspace().query('INSERT'))==n and all(nm in d.blocks for nm in E("Object.keys(S.blocks).filter(k=>!/^CARIMBO/.test(k))")) and not a.errors,(len(a.errors),))
    ok('DXF: norte com hachura cheia, vaso com elipses, geladeira com texto',any(e.dxftype()=='HATCH' for e in d.blocks.get('NORTE')) and sum(e.dxftype()=='ELLIPSE' for e in d.blocks.get('VASO_SANITARIO'))==2 and any(e.dxftype()=='TEXT' for e in d.blocks.get('GELADEIRA')))
    ins0=[e for e in d.modelspace().query('INSERT') if e.dxf.name=='SENTIDO_FLUXO'][0]
    ok('DXF: rotação da inserção preservada (30°)',abs(ins0.dxf.rotation-30)<1e-6)
    # salvar e abrir
    doc=E("JSON.stringify(buildDoc())"); f=TMP('bib.json'); open(f,'w').write(doc)
    E("tplApply('padrao')"); pg.set_input_files('#fileInput',f); pg.wait_for_timeout(250); os.remove(f)
    ok('Salvar e abrir mantém os blocos e as inserções',E("S.ents.filter(e=>e.tp==='insert').length")==n and E("!!S.blocks.MARCO_GEODESICO"))
    ok('Explodir uma inserção da biblioteca gera a geometria',E("(()=>{var e=S.ents.find(e=>e.tp==='insert'&&e.name==='VASO_SANITARIO');S.sel=[e.id];setTool('explode');var r=S.ents.filter(x=>x.tp==='ell').length;if(S.ds)ncEnd();return r;})()")>=2)
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
fails=[n for n,c in R if not c]; print(f'\n{len(R)-len(fails)}/{len(R)} testes OK'); sys.exit(1 if fails else 0)
