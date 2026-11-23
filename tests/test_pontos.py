# Testes da entrada de muitos pontos (v8.3): entidade PONTO, colar coordenadas na linha de comando
# e comando PONTOS (tabela do Excel/CSV, formatos brasileiros, UTM, polígono, rótulos, área e perímetro).
# Uso: pip install playwright ezdxf && playwright install chromium && python tests/test_pontos.py
import sys, os, json, math
from playwright.sync_api import sync_playwright
import ezdxf
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
def near(a,b,t=1e-6): return abs(a-b)<t
def shoelace(P):
    s=0
    for i in range(len(P)):
        x1,y1=P[i]; x2,y2=P[(i+1)%len(P)]; s+=x1*y2-x2*y1
    return abs(s)/2
UTM=[('M1',512300.000,8701250.000),('M2',512500.000,8701250.000),('M3',512540.250,8701120.500),('M4',512380.000,8701050.000),('M5',512290.000,8701100.000)]
def br(v,d=3): return f"{v:,.{d}f}".replace(',','X').replace('.',',').replace('X','.')
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':850})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.goto('file://'+path); pg.wait_for_timeout(500); E=pg.evaluate
    if E("document.getElementById('ov-recover').classList.contains('show')"): E("closeOv('ov-recover')")
    def reset():
        E("()=>{document.querySelectorAll('.ov.show').forEach(o=>o.classList.remove('show'));S.ents=[];S.sel=[];S.ds=null;resetHistory();setTool('select');S.modes.snap=false;renderAll();}")
    def paste(txt,target='#cmdinput'):
        E("([sel,t])=>{var el=document.querySelector(sel);el.focus();var dt=new DataTransfer();dt.setData('text/plain',t);el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));}",[target,txt]); pg.wait_for_timeout(60)
    def cmd(*seq):
        for t in seq:
            E(f"document.getElementById('cmdinput').value={t!r}"); pg.press('#cmdinput','Enter'); pg.wait_for_timeout(15)
    def ents(): return E("S.ents.map(e=>JSON.parse(JSON.stringify(e)))")
    # ── leitura de tabelas
    T=E("(t=>{var x=ptParseTable(t);return [x.sep,x.dec,!!x.header,x.cx,x.cy,x.cid];})('Ponto\\tX\\tY\\nP1\\t0\\t0\\nP2\\t120,5\\t0')")
    ok('Excel em português (tabulação, vírgula decimal, cabeçalho)',T==['\t',',',True,1,2,0],T)
    T=E("(t=>{var x=ptParseTable(t);return [x.sep,x.dec,!!x.header,x.cx,x.cy];})('x,y\\n0,0\\n10.5,0')")
    ok('CSV internacional (vírgula separa, ponto decimal)',T==[',','.',True,0,1],T)
    T=E("(t=>{var x=ptParseTable(t);return [x.sep,x.dec];})('1;10,5;20,25\\n2;30,0;40,75')")
    ok('CSV brasileiro (ponto e vírgula, vírgula decimal)',T==[';',','],T)
    T=E("(t=>{var x=ptParseTable(t);return [x.sep,x.cx,x.cy];})('0 0\\n10.5 0\\n10.5 20')")
    ok('Lista separada por espaços',T==[' ',0,1],T)
    v=E("[ptNum('8.701.250,123',','),ptNum('1,234,567.5','.'),ptNum('-12,5',','),ptNum('abc',',')]")
    ok('Números com separador de milhar e negativos',v[0]==8701250.123 and v[1]==1234567.5 and v[2]==-12.5 and (v[3] is None or math.isnan(v[3])),v)
    T=E("(t=>{var x=ptParseTable(t);return [x.cx,x.cy,x.cid,x.utmSwap];})('1;8.700.123,45;512.345,10\\n2;8.700.200,00;512.400,00')")
    ok('UTM sem cabeçalho "Norte; Este": X = Este',T==[2,1,0,True],T)
    T=E("(t=>{var x=ptParseTable(t);return [x.cx,x.cy,x.cid];})('Estação;E;N;Cota\\nE1;100;200;30\\nE2;150;220;31')")
    ok('Cabeçalho com E/N e cota (a cota não vira coordenada)',T==[1,2,0],T)
    # ── colar na linha de comando durante a PLINE
    reset(); cmd('PL'); paste('0\t0\n120,5\t0\n120,5\t80\n0\t80\nF')
    e=ents(); pts=[(q['x'],q['y']) for q in e[0]['pts']] if e else []
    ok('Colar colunas do Excel durante a PLINE: 4 vértices e fechamento',len(e)==1 and e[0]['tp']=='pl' and e[0]['closed'] and pts[:4]==[(0,0),(120.5,0),(120.5,80),(0,80)],pts)
    reset(); cmd('PL'); paste('0,0\n@50,0\n@0,30\n@-50,0\n')
    pg.press('#cmdinput','Enter'); pg.wait_for_timeout(30)
    e=ents(); ok('Colar coordenadas no formato do AutoCAD (inclusive relativas @)',len(e)==1 and [(q['x'],q['y']) for q in e[0]['pts']]==[(0,0),(50,0),(50,30),(0,30)],e)
    reset(); cmd('L'); paste('X;Y\n0;0\n10,5;0\n10,5;7,25\n'); pg.press('#cmdinput','Enter')
    e=ents(); ok('Colar durante LINE: cabeçalho ignorado, 2 segmentos com vírgula decimal',len(e)==2 and near(e[1]['x2'],10.5) and near(e[1]['y2'],7.25),e)
    reset(); cmd('PL'); paste('PL\n0,0\n10,0\n10,10\nF') if False else None
    # sem comando: lista de coordenadas abre o importador; lista de comandos é executada
    reset(); paste('P1\t0\t0\nP2\t30\t0\nP3\t30\t20','#cw') if False else paste('P1\t0\t0\nP2\t30\t0\nP3\t30\t20')
    ok('Colar coordenadas sem comando ativo abre o importador com o texto',E("document.getElementById('ov-pontos').classList.contains('show')") and 'P3' in E("document.getElementById('pt-txt').value"))
    E("closeOv('ov-pontos')")
    reset(); paste('REC\n0,0\n@40,20\nC\n20,10\n5\n')
    e=ents(); ok('Colar uma sequência de comandos executa cada linha',[x['tp'] for x in e]==['rect','circ'] and near(e[1]['r'],5),e)
    reset(); E("document.activeElement.blur()"); paste('PL\n0,0\n10,0\n10,10\n','body'); pg.press('#cmdinput','Enter')
    ok('Colar com o foco no desenho (Ctrl+V) também funciona',len(ents())==1 and ents()[0]['tp']=='pl')
    # ── coordenadas brasileiras digitadas
    reset(); cmd('PL','10,5;20,25','@4,5;0','')
    e=ents(); ok('Digitar "10,5;20,25" (vírgula decimal) e "@4,5;0"',e and (e[0]['pts'][0]['x'],e[0]['pts'][0]['y'],e[0]['pts'][1]['x'])==(10.5,20.25,15.0),e)
    # ── comando PONTOS: tabela UTM em metros
    reset(); cmd('PONTOS'); ok('Comando PONTOS abre a janela',E("document.getElementById('ov-pontos').classList.contains('show')"))
    txt='Ponto\tNorte\tEste\tDescrição\n'+'\n'.join(f"{n}\t{br(N)}\t{br(Ee)}\tx" for n,Ee,N in UTM)+'\nxx\tabc\t\t'
    pg.fill('#pt-txt',txt); pg.wait_for_timeout(400)
    ok('Colunas X=Este e Y=Norte pelo cabeçalho',E("document.getElementById('pt-cx').value")=='2' and E("document.getElementById('pt-cy').value")=='1')
    ok('Linha inválida apontada com o número da linha','Linha 7' in E("document.getElementById('pt-bad').textContent"))
    pg.select_option('#pt-unit','m'); pg.check('#pt-closed'); pg.check('#pt-lb'); pg.wait_for_timeout(100)
    ok('Coordenadas grandes: deslocamento para a origem sugerido',E("document.getElementById('pt-off').checked"))
    area=shoelace([(Ee,N) for _,Ee,N in UTM]); rep=E("document.getElementById('pt-rep').textContent")
    ok('Área e perímetro na pré-visualização (m² e ha)',br(area,2)+' m²' in rep and ' ha)' in rep,(rep,br(area,2)))
    blank=E("(()=>{var c=document.getElementById('pt-cv'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,n=0;for(var i=0;i<d.length;i+=4) if(d[i+1]>150) n++;return n;})()")
    ok('Pré-visualização desenha o polígono',blank>100,blank)
    pg.click('#pt-ok'); pg.wait_for_timeout(150)
    e=ents(); pl=[x for x in e if x['tp']=='pl']; pts=[x for x in e if x['tp']=='point']; tx=[x for x in e if x['tp']=='txt']
    ok('Inserir: polígono fechado, 5 pontos e 5 rótulos',len(pl)==1 and pl[0]['closed'] and len(pl[0]['pts'])==6 and len(pts)==5 and len(tx)==5 and sorted(t['txt'] for t in tx)==['M1','M2','M3','M4','M5'])
    V=[(q['x'],q['y']) for q in pl[0]['pts'][:5]]
    dx=V[1][0]-V[0][0]; ok('Metros convertidos para mm (M1→M2 = 200 m = 200000 mm)',near(dx,200000,1e-3),dx)
    ok('Origem deslocada para perto de 0 (sem perder precisão)',max(abs(c) for q in V for c in q)<2e6 and near(V[2][0]-V[0][0],240250,1e-3))
    ok('Área exata do polígono inserido',near(E("plArea(S.ents.find(e=>e.tp==='pl'))")/1e6,area,1e-3))
    ok('Pontos e rótulos na camada Pontos',E("(()=>{var l=S.layers.find(l=>l.nm==='Pontos');return !!l&&S.ents.filter(e=>e.tp!=='pl').every(e=>e.ly===l.id);})()"))
    logt=E("Array.from(document.querySelectorAll('#cmdlog .cl')).map(d=>d.textContent).slice(-4).join(' | ')")
    ok('Relatório na linha de comando: deslocamento, perímetro e área','Origem deslocada' in logt and 'Área' in logt and 'ha' in logt,logt)
    E("undo()"); ok('Um único Ctrl+Z desfaz a importação inteira',len(ents())==0)
    # ── arquivo CSV (Windows-1252, ponto e vírgula) e polilinha aberta sem marcadores
    reset(); f=os.path.join(HERE,'_pts.csv')
    open(f,'wb').write('Estação;X;Y\nE1;0,0;0,0\nE2;10,5;0,0\nE3;10,5;5,25\n'.encode('cp1252'))
    E("ptOpen()"); pg.set_input_files('#pt-file',f); pg.wait_for_timeout(300); os.remove(f)
    ok('Abrir arquivo CSV (acentos em Windows-1252)','Estação' in E("document.getElementById('pt-txt').value") and E("PTI.R.pts.length")==3)
    pg.select_option('#pt-unit','mm'); pg.uncheck('#pt-mk'); pg.uncheck('#pt-closed'); pg.uncheck('#pt-lb'); pg.click('#pt-ok'); pg.wait_for_timeout(100)
    e=ents(); ok('Polilinha aberta, sem marcadores',[x['tp'] for x in e]==['pl'] and not e[0]['closed'] and near(e[0]['pts'][2]['y'],5.25),e)
    # ── entidade PONTO
    reset(); box=pg.locator('#cw').bounding_box()
    E("()=>{S.vp={x:Math.round(S.W/2),y:Math.round(S.H/2),sc:4};renderAll();}")
    cmd('PO','10,20','30,40'); s=E("w2s(50,10)"); pg.mouse.click(box['x']+s['x'],box['y']+s['y']); cmd('')
    e=ents(); ok('POINT: pontos digitados e clicados',[(x['tp'],x['x'],x['y']) for x in e]==[('point',10,20),('point',30,40),('point',50,10)],e)
    s=E("w2s(10,20)"); pg.mouse.click(box['x']+s['x'],box['y']+s['y']); pg.wait_for_timeout(40)
    ok('Clique seleciona o ponto',E("S.sel.length")==1)
    cmd('M','0,0','@5,5'); ok('MOVE desloca o ponto',(ents()[0]['x'],ents()[0]['y'])==(15,25))
    ok('OSNAP pega o ponto',E("snapPts(S.ents[1]).some(q=>q.x===30&&q.y===40)"))
    f=os.path.join(HERE,'_po.dxf'); open(f,'wb').write(bytes(E("Array.from(cp1252Encode(buildDXF2000({})))")))
    d=ezdxf.readfile(f); P=[(round(q.dxf.location.x,6),round(q.dxf.location.y,6)) for q in d.modelspace().query('POINT')]
    ok('DXF: exportado como POINT',P==[(15,25),(30,40),(50,10)] and not d.audit().errors,P)
    d2=ezdxf.new('R2000'); d2.header['$INSUNITS']=4; m=d2.modelspace(); [m.add_point(q) for q in [(1,2),(3,4),(5,6)]]; d2.saveas(f)
    reset(); pg.set_input_files('#fileInput',f); pg.wait_for_timeout(400); os.remove(f)
    ok('DXF: POINT importado (antes era ignorado)',[x['tp'] for x in ents()]==['point']*3)
    ok('Botões Ponto e Pontos XY na faixa Desenhar',pg.locator('#rb-point').is_visible() and pg.locator('#rb-pontos').is_visible())
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
fails=[n for n,c in R if not c]; print(f'\n{len(R)-len(fails)}/{len(R)} testes OK'); sys.exit(1 if fails else 0)
