# Testes da etapa 3 (v8.5): ângulos/azimutes/rumos, POLIGONAL (erros, tolerâncias, compensação, área, desenho),
# coordenada polar topográfica, scripts com variáveis e repetição (#SET, #FOR, #REPEAT, #IF, {expressões})
# e o exercício 4 da Aula guiada. O cálculo é conferido com uma implementação independente em Python.
# Uso: pip install playwright && playwright install chromium && python tests/test_poligonal.py
import sys, os, math
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
def near(a,b,t=1e-6): return abs(a-b)<t
def dms(d,m=0,s=0): return d+m/60+s/3600
# ── referência independente: ângulos horários, compensação angular igual e linear proporcional (Bowditch)
CAD=[('P1',dms(114,6,0),85.24),('P2',dms(106,49,59),68.92),('P3',dms(97,30,27),74.54),('P4',dms(112,50,30),77.67),('P5',dms(108,43,43),48.12)]
def ref(cad,az0,E0,N0):
    n=len(cad); s=sum(a for _,a,_ in cad); ea=s-(n-2)*180; A=[a-ea/n for _,a,_ in cad]
    az=[az0]
    for i in range(1,n): az.append((az[-1]+180+A[i])%360)
    D=[d for *_,d in cad]; dE=[d*math.sin(math.radians(z)) for d,z in zip(D,az)]; dN=[d*math.cos(math.radians(z)) for d,z in zip(D,az)]
    eE,eN,P=sum(dE),sum(dN),sum(D); pts=[(E0,N0)]
    for i in range(n-1): pts.append((pts[-1][0]+dE[i]-eE*D[i]/P,pts[-1][1]+dN[i]-eN*D[i]/P))
    ar=abs(sum(pts[i][0]*pts[(i+1)%n][1]-pts[(i+1)%n][0]*pts[i][1] for i in range(n)))/2
    return dict(ea=ea*3600,eE=eE,eN=eN,e=math.hypot(eE,eN),P=P,pts=pts,area=ar)
REF=ref(CAD,dms(96,56,30),1000,2000)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':850},accept_downloads=True)
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.goto('file://'+path); pg.wait_for_timeout(500); E=pg.evaluate
    if E("document.getElementById('ov-recover').classList.contains('show')"): E("closeOv('ov-recover')")
    def reset():
        E("()=>{document.querySelectorAll('.ov.show').forEach(o=>o.classList.remove('show'));S.ents=[];S.sel=[];S.ds=null;resetHistory();S.layers.forEach(l=>{l.vis=true;l.lock=false;});S.curLy=0;setTool('select');S.modes.snap=false;renderAll();}")
    def ents(): return E("S.ents.map(e=>JSON.parse(JSON.stringify(e)))")
    def lastlog(k=1): return ' | '.join(E(f"Array.from(document.querySelectorAll('#cmdlog .cl')).map(d=>d.textContent).slice(-{k})"))
    def run(t,**o): E("([t,o])=>scrRun(t,o)",[t,o]); pg.wait_for_timeout(40); return lastlog()
    # ── ângulos
    v=E("""[poAngParse("114°06'00\\""),poAngParse('114 06 00'),poAngParse("114d06'"),poAngParse('114:06:00'),poAngParse('114,1'),poAngParse('10 75 00')]""")
    ok('Ângulos em GMS: 114°06\'00", 114 06 00, 114d06\', 114:06:00 e decimal com vírgula',all(near(x,114.1) for x in v[:5]),v)
    ok('Minutos ≥ 60 rejeitados',v[5] is None or (isinstance(v[5],float) and math.isnan(v[5])),v[5])
    v=E("""[poRumoParse("45°00' NE"),poRumoParse("45 00 SE"),poRumoParse("S45d00'W"),poRumoParse("45°00' SO"),poRumoParse("N45d00'O"),poRumoParse("N30E"),poRumoParse("12 NL")]""")
    ok('Rumos → azimute (NE, SE, SO/SW, NO/NW, L/E)',[round(x,6) for x in v]==[45,135,225,225,315,30,12],v)
    v=E("""[poDMS(96.94166666666),poRumo(96.9416666666),poRumo(301.2777),poDMS(-0.0108333,1)]""")
    ok('Formatação: GMS e rumo',v[0]=='96°56\'30"' and v[1]=='83°03\'30" SE' and v[2].endswith('NO') and v[3].startswith('-0°00\'39'),v)
    # ── cálculo da poligonal (exercício 4)
    X=E("(()=>{var R=poAulaR();return {eAng:R.eAng*3600,kind:R.kind,eE:R.eE,eN:R.eN,e:R.eLin,P:R.P,area:R.area,pts:R.pts.map(p=>[p.E,p.N]),angOk:R.angOk,linOk:R.linOk,prec:R.prec,tol:R.tolAng*3600};})()")
    ok('Erro angular = Σ − (n−2)·180° (ângulos internos)',near(X['eAng'],REF['ea'],1e-6) and X['kind']=='internos',(X['eAng'],REF['ea']))
    ok('Tolerância angular 60"·√5 e precisão linear 1:P/e',near(X['tol'],60*math.sqrt(5),1e-9) and near(X['prec'],REF['P']/REF['e'],1e-6) and X['angOk'] and X['linOk'])
    ok('Erros de fechamento eE e eN iguais à referência',near(X['eE'],REF['eE'],1e-9) and near(X['eN'],REF['eN'],1e-9),(X['eE'],X['eN']))
    ok('Coordenadas compensadas iguais à referência (Bowditch)',all(near(a[0],b_[0],1e-9) and near(a[1],b_[1],1e-9) for a,b_ in zip(X['pts'],REF['pts'])),X['pts'])
    ok('Área pela fórmula de Gauss',near(X['area'],REF['area'],1e-6),X['area'])
    rows="P1\\t114°06'00\\\"\\t85,24\\nP2\\t106°49'59\\\"\\t68,92\\nP3\\t97°30'27\\\"\\t74,54\\nP4\\t112°50'30\\\"\\t77,67\\nP5\\t108°43'43\\\"\\t48,12"
    # mesma poligonal medida com ângulos anti-horários (360 − α) dá o mesmo resultado
    Y=E(f"""(()=>{{var X=poRows("{rows}"),r=X.rows.map(o=>({{id:o.id,a:String(360-poAngParse(o.a)),d:o.d,line:o.line}}));var R=poCompute(r,{{mode:'a',closed:true,az0:"96°56'30\\"",E0:1000,N0:2000,comp:true}});return [R.kind,R.pts.map(p=>[p.E,p.N])];}})()""")
    ok('Ângulos anti-horários: externos detectados e mesmas coordenadas',Y[0]=='externos' and all(near(a[0],b_[0],1e-6) and near(a[1],b_[1],1e-6) for a,b_ in zip(Y[1],REF['pts'])),Y[0])
    Z=E("""(()=>{var X=poRows("A 45°00' NE 100\\nB 45°00' SE 100\\nC 45°00' SO 100\\nD 45°00' NO 100");var R=poCompute(X.rows,{mode:'dir',closed:true,E0:0,N0:0,comp:true});return [R.ok,R.eLin,R.area,R.pts.length];})()""")
    ok('Poligonal por rumos (quadrado): fecha sem erro, área 10.000 m²',Z[0] and Z[1]<1e-9 and near(Z[2],10000,1e-6) and Z[3]==4,Z)
    Z=E("""(()=>{var X=poRows('E0 30 100\\nE1 120 50');var R=poCompute(X.rows,{mode:'dir',closed:false,E0:10,N0:20});var f=R.pts[R.pts.length-1];return [f.E,f.N,R.P];})()""")
    ok('Poligonal aberta por azimutes: ponto final',near(Z[0],10+100*math.sin(math.radians(30))+50*math.sin(math.radians(120)),1e-9) and near(Z[1],20+100*math.cos(math.radians(30))+50*math.cos(math.radians(120)),1e-9) and Z[2]==150,Z)
    Z=E("""(()=>{var R=poCompute(poRows("P1 114°06' 85,24\\nP2 1x6 68,92\\nP3 97 74,54").rows,{mode:'h',closed:true,az0:'0'});return R.err;})()""")
    ok('Ângulo inválido: erro com estação e linha','P2' in Z and 'linha 2' in Z,Z)
    # ── janela e desenho
    reset(); E("cmdSubmit('POLIGONAL')"); ok('Comando POLIGONAL abre a janela',E("document.getElementById('ov-poligonal').classList.contains('show')"))
    pg.select_option('#po-ex','0'); pg.wait_for_timeout(300)
    sm=E("document.getElementById('po-sum').textContent")
    ok('Resumo: erros, tolerâncias, precisão e área','Erro angular' in sm and 'Precisão' in sm and '8.438,40 m²' in sm and E("document.querySelectorAll('#po-sum .po-good').length")>=4,sm[:160])
    ok('Planilha de cálculo com 5 estações',E("document.querySelectorAll('#po-res tr').length")==6)
    with pg.expect_download() as d: pg.click('#po-csv')
    raw=open(d.value.path(),'rb').read().decode('cp1252')
    ok('CSV em português (ponto e vírgula, vírgula decimal, acentos)','Estação;Vante' in raw and '1.084,626' in raw and 'Área' in raw,raw[:80])
    pg.click('#po-ok'); pg.wait_for_timeout(200)
    e=ents(); pl=[x for x in e if x['tp']=='pl']; pt=[x for x in e if x['tp']=='point']; tx=[x['txt'] for x in e if x['tp']=='txt']
    ok('Desenhar: polilinha fechada com os vértices compensados (m → mm)',len(pl)==1 and pl[0]['closed'] and all(near(q['x'],a[0]*1000,1e-6) and near(q['y'],a[1]*1000,1e-6) for q,a in zip(pl[0]['pts'],REF['pts'])))
    ok('Marcos (pontos) e nomes P1…P5',len(pt)==5 and all(f'P{i}' in tx for i in range(1,6)))
    ok('Quadro de coordenadas com área e perímetro','QUADRO DE COORDENADAS' in tx and '1.112,417' in tx and any(t.startswith('Área = 8.438,40 m²') for t in tx) and any(t.startswith('Perímetro') for t in tx),[t for t in tx if 'Área' in t])
    ok('Camadas Pontos e Quadro',E("['Pontos','Quadro'].every(n=>S.layers.some(l=>l.nm===n))"))
    ok('Relatório na linha de comando','Erro linear' in lastlog(3) and 'dentro' in lastlog(3),lastlog(3))
    E("undo()"); ok('Um Ctrl+Z desfaz a poligonal inteira',len(ents())==0)
    reset(); E("poOpen()"); pg.select_option('#po-ex','0'); pg.uncheck('#po-comp'); pg.uncheck('#po-qd'); pg.wait_for_timeout(250); pg.click('#po-ok'); pg.wait_for_timeout(150)
    pl=[x for x in ents() if x['tp']=='pl'][0]; g=math.hypot(pl['pts'][-1]['x']-pl['pts'][0]['x'],pl['pts'][-1]['y']-pl['pts'][0]['y'])
    ok('Sem compensação: polilinha aberta mostra o erro de fechamento',not pl['closed'] and len(pl['pts'])==6 and near(g,1000*E("(()=>{var R=poCompute(PO_AULA.rows.map((r,i)=>({id:r[0],a:r[1],d:r[2],line:i+1})),{mode:'h',closed:true,az0:PO_AULA.az0,E0:0,N0:0,comp:false});return R.eLin;})()"),1e-6),g)
    E("()=>{document.getElementById('po-comp').checked=true;document.getElementById('po-qd').checked=true;}")
    reset(); E("poOpen()"); pg.select_option('#po-ex','0'); E("document.getElementById('po-kang').value='10'"); E("poRefresh()")
    ok('Tolerância apertada: erro angular fora da tolerância é apontado','FORA' in E("document.getElementById('po-sum').textContent").upper() or E("document.querySelectorAll('#po-sum .po-bad').length")>=2)
    E("document.getElementById('po-kang').value='60'"); E("closeOv('ov-poligonal')")
    # ── coordenada polar topográfica
    reset(); E("cmdSubmit('PL')");
    for t in ['0,0',"@100<AZ90","@100<N0d00'E","@100<S45d00'W","@50<180d00'"]: E(f"cmdSubmit({t!r})")
    E("cmdSubmit('')"); P_=[(round(q['x'],6),round(q['y'],6)) for q in ents()[0]['pts']]
    h=100/math.sqrt(2)
    ok('@d<AZ…, @d<N…E (rumo), @d<S…W e @d<180d00\' (GMS)',P_==[(0,0),(100,0),(100,100),(round(100-h,6),round(100-h,6)),(round(50-h,6),round(100-h,6))],P_)
    # ── scripts: variáveis e repetição
    reset(); run('#SET n = 4\n#SET d = 10\n#FOR i = 1 TO n\nCIRCLE {i*d},0 {i}\n#END\n')
    e=ents(); ok('#SET e #FOR com {expressões}',[(x['cx'],x['r']) for x in e]==[(10,1),(20,2),(30,3),(40,4)],e)
    reset(); run('#FOR i = 0 TO 2\n#FOR j = 0 TO 1\nPOINT {i*10},{j*5}\n\n#END\n#END\n')
    ok('#FOR aninhado',sorted((x['x'],x['y']) for x in ents())==sorted((i*10,j*5) for i in range(3) for j in range(2)))
    reset(); run('#FOR i = 10 TO 0 STEP -5\nPOINT {i},0\n\n#END\n'); ok('#FOR com passo negativo',[x['x'] for x in ents()]==[10,5,0])
    reset(); run('#REPEAT 3\nCIRCLE 0,0 1\n#END\n'); ok('#REPEAT',len(ents())==3)
    reset(); run('#FOR i = 1 TO 4\n#IF mod(i,2) == 0\nCIRCLE {i},0 1\n#ELSE\nRECTANG {i},0 @1,1\n#END\n#END\n')
    ok('#IF … #ELSE … #END',[x['tp'] for x in ents()]==['rect','circ','rect','circ'])
    reset(); run('#SET r = sqrt(2)*cos(45)*10\n#SET a = round(atan2(1,1),2)\nCIRCLE 0,0 {r}\nTEXT 0,0 2 0 ângulo {a}° e {{chaves}}\n\n')
    e=ents(); ok('Funções (graus), round e {{ }} literal',near(e[0]['r'],10,1e-6) and e[1]['txt']=='ângulo 45° e {chaves}',e[1]['txt'] if len(e)>1 else e)
    reset(); run('#PARA k = 1 ATE 2\nPOINT {k},{k}\n\n#FIM\n'); ok('Diretivas em português (#PARA … ATE … #FIM)',len(ents())==2)
    reset(); last=run('RECTANG 0,0 1,1\n#SET x = 1 +\nPOINT 0,0\n')
    ok('Erro de expressão: linha original informada e nada executado','linha 2' in last and len(ents())==0,last)
    reset(); last=run('#FOR i = 1 TO 3\nPOINT {i},0\n'); ok('#FOR sem #END: erro na linha do #FOR','linha 1' in last and 'sem #END' in last,last)
    reset(); last=run('#LOOP 3\n'); ok('Diretiva desconhecida','diretiva desconhecida' in last,last)
    reset(); last=run('#SET a = 1\nCIRCLE 0,0 {alert(1)}\n'); ok('Sem eval: função desconhecida é erro (segurança)','função desconhecida' in last and not errs,last)
    reset(); last=run('CIRCLE 0,0 {constructor}\n'); ok('Sem acesso a propriedades do JavaScript','não definida' in last,last)
    reset(); last=run('#SET n = 3\n; comentário com {nada}\n#FOR i = 1 TO n\nPOINT {i},0\n\n#END\nXYZ\n')
    ok('Erro em tempo de execução aponta a linha do arquivo original (7)','linha 7' in last and E("SCR.lastErr.line")==7,last)
    reset(); last=run('#FOR i = 1 TO 1000000\nPOINT 0,0\n#END\n'); ok('Limite de segurança contra repetições excessivas','demais' in last or 'passou' in last,last)
    # Salvar expandido
    reset(); E("scrOpen('#SET n = 2\\n#FOR i = 1 TO n\\nCIRCLE {i},0 1\\n#END\\n','m.scr')")
    with pg.expect_download() as d: pg.click('#scr-save-exp')
    raw=open(d.value.path(),'rb').read()
    ok('Salvar expandido: .scr comum (compatível com AutoCAD)',raw==b'CIRCLE 1,0 1\r\nCIRCLE 2,0 1\r\n' and d.value.suggested_filename=='m-expandido.scr',raw)
    E("closeOv('ov-script')")
    for i,nm in [(3,'covas'),(4,'quincôncio'),(5,'divisa')]:
        reset(); E("cmdSubmit('SCRIPT')"); pg.select_option('#scr-ex',str(i)); pg.click('#scr-run'); pg.wait_for_timeout(300)
        ok(f'Exemplo de script "{nm}" executa','concluído' in lastlog(),lastlog())
    e=ents(); pl=[x for x in e if x['tp']=='pl']
    ok('Exemplo "divisa": 4 lados por azimute/rumo; o fechamento (C) mede ~48,12 m',pl and pl[0]['closed'] and abs(math.hypot(pl[0]['pts'][4]['x']-pl[0]['pts'][0]['x'],pl[0]['pts'][4]['y']-pl[0]['pts'][0]['y'])-48120)<100,pl and pl[0]['pts'][4])
    reset(); E("cmdSubmit('SCRIPT')"); pg.select_option('#scr-ex','3'); pg.click('#scr-run'); pg.wait_for_timeout(300)
    ok('Exemplo "covas": 40 covas',len([x for x in ents() if x['tp']=='circ'])==40)
    # ── Aula guiada, exercício 4
    reset(); E("aulaOpen()"); E("exSelect(3)"); E("exStart()"); pg.wait_for_timeout(100)
    st=lambda: E("(()=>{var s=exState();return [s.cur,s.cur>=0?s.res[s.cur].msg:''];})()")
    ok('Exercício 4 (poligonal) disponível',E("EX_LIST[3].id")=='poligonal' and st()[0]==0,st())
    run('-LAYER M Poligonal\n\n'); ok('Passo 1: camada Poligonal atual',st()[0]==1,st())
    E("poOpen()"); pg.select_option('#po-ex','0'); E("()=>{document.getElementById('po-qd').checked=false;document.getElementById('po-lb').checked=false;}"); pg.wait_for_timeout(250); pg.click('#po-ok'); pg.wait_for_timeout(150)
    ok('Passo 2: poligonal compensada reconhecida',st()[0]==2,st())
    ok('Passo 3: sem nomes, a verificação explica o que falta','nome "P1"' in st()[1],st())
    E("()=>{S.ents=S.ents.filter(e=>e.tp!=='point');}")
    E("poOpen()"); E("()=>{document.getElementById('po-qd').checked=true;document.getElementById('po-lb').checked=true;}"); pg.wait_for_timeout(200); pg.click('#po-ok'); pg.wait_for_timeout(150)
    s=st(); ok('Passos 3 a 5: marcos, nomes, área e quadro → exercício concluído',s[0]==-1,s)
    reset(); E("exStart()"); run('-LAYER M Poligonal\n\nPLINE 1000000,2000000 @85240<AZ96d56\'30" @68920<N23d46\'21"E @74540<N58d43\'20"W @77670<S54d07\'03"W C\n')
    ok('Poligonal sem compensação não passa no passo 2 (explica a coordenada esperada)',st()[0]==1 and 'P3' in st()[1],st())
    E("aulaClose()")
    ok('Botão Poligonal na aba Educacional',E("!!document.querySelector('#tab1 #rb-poligonal')"))
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
fails=[n for n,c in R if not c]; print(f'\n{len(R)-len(fails)}/{len(R)} testes OK'); sys.exit(1 if fails else 0)
