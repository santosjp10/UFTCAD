# Testes das dicas da interface (v7.8, R2 do parecer técnico).
# Garante que a dica (title) de cada botão mostra o comando digitável certo, e que clicar no botão
# e digitar esse comando na linha de comando produzem o MESMO resultado.
# Uso: pip install playwright && playwright install chromium && python tests/test_dicas.py
import sys, os, re, json
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
src=open(path,encoding='utf8').read()
if 'js/' in src and '<script src="js/' in src:   # versão modular: ler a tabela de comandos do módulo
    src=open(os.path.join(os.path.dirname(path),'js','07-eventos-e-linha-de-comando.js'),encoding='utf8').read()
m=re.search(r"var map=\{(.*?)\};",src,re.S)
ALIAS=dict(re.findall(r"'([A-Z0-9?]+)':'([a-z0-9]+)'",m.group(1)))
ok('Tabela de comandos lida',len(ALIAS)>150,len(ALIAS))
# ── a tabela de comandos no padrão AutoCAD (o que as dicas antigas contradiziam)
for a,act in [('REC','rectangle'),('EL','ellipse'),('T','mtext'),('MT','mtext'),('DT','text'),('S','stretch'),('E','erase'),('R','redraw')]:
    ok(f'Comando {a} = {act}',ALIAS.get(a)==act,ALIAS.get(a))
TOKEN=re.compile(r'(?<![\w+])([A-Z][A-Z0-9]{0,15})(?![\w+])')
FORMATS={'PDF','DXF','DWG','SVG','PNG','JSON'}
def alias_tokens(title):
    out=[]
    for mm in TOKEN.finditer(title):
        t=mm.group(1); pre=title[max(0,mm.start()-5):mm.start()]
        if pre.endswith('Ctrl+') or re.fullmatch(r'F\d+',t): continue
        if t in FORMATS: continue   # nomes de formato de arquivo ("Exportar PDF, DXF…")
        if t in ALIAS: out.append(t)
    return out
RESET="""(paper)=>{
  document.querySelectorAll('.ov.show').forEach(o=>o.classList.remove('show'));
  if(document.body.classList.contains('clean')) toggleCleanScreen();
  if(S.tool!=='select') setTool('select'); S.ds=null; S.grip=null;
  if(S.space!=='model') switchSpace('model');
  resetLayouts(); S.ents=[]; resetHistory(); S.modes.snap=false;
  addE({tp:'line',x1:0,y1:0,x2:100,y2:0},true); snapshot(); addE({tp:'line',x1:0,y1:20,x2:100,y2:20},true);
  S.sel=[S.ents[0].id]; S.vp={x:100,y:300,sc:1}; renderAll();
  if(paper){ switchSpace('layout'); S.sel=[]; }
  document.getElementById('cmdinput').value=''; window.__calls=[];
  Array.from(document.querySelectorAll('.rb,.tb-btn,.lc-btn,.tb-add,.tb-touch')).forEach((el,i)=>el.setAttribute('data-ti',i));
}"""
SIG="""()=>({tool:S.tool,ovs:Array.from(document.querySelectorAll('.ov.show')).map(o=>o.id).sort(),
  paper:S.space!=='model',ms:!!S.mspace,nlay:S.layouts.length,clean:document.body.classList.contains('clean'),
  vp:[+S.vp.x.toFixed(2),+S.vp.y.toFixed(2),+S.vp.sc.toFixed(5)],n:S.ents.length,sel:S.sel.length,calls:window.__calls.slice()})"""
SPY="""()=>{ window.__calls=[]; window.open=function(){ window.__calls.push('window.open'); return null; };
  document.getElementById('fileInput').click=function(){ window.__calls.push('fileInput'); };
  Element.prototype.requestFullscreen=function(){ return Promise.resolve(); };
  ['zoomFit','undo','redo','toggleFullscreen','toggleCleanScreen','downloadBlob','expPDF','layoutPrint','appInstall','saveDoc','openDoc',
   'newDoc','layoutNew','titleBlockInsert','startPolygon','pageSetupOpen','showExport','showUnits','showLineType','showDimStyle','showArrayDlg','showHatchDlg'].forEach(function(n){
    var f=window[n]; if(typeof f!=='function') return;
    window[n]=function(){ window.__calls.push(n); return f.apply(this,arguments); }; });
  HTMLAnchorElement.prototype.click=function(){ window.__calls.push('download'); };
}"""
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':850})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.goto('file://'+path); pg.wait_for_timeout(500); E=pg.evaluate
    if E("document.getElementById('ov-recover')&&document.getElementById('ov-recover').classList.contains('show')"): E("closeOv('ov-recover')")
    E(SPY)
    BTN=E("""Array.from(document.querySelectorAll('.rb,.tb-btn,.lc-btn,.tb-add,.tb-touch')).map((el,i)=>{el.setAttribute('data-ti',i);
      return {i:i,title:el.title||'',cmd:el.getAttribute('data-cmd')||'',via:el.getAttribute('data-cmd-via')||'',onclick:el.getAttribute('onclick')||'',
        label:(el.textContent||'').trim().slice(0,24),paper:!!el.closest('#layoutPanel')};})""")
    ok('Botões encontrados na interface',len(BTN)>=50,len(BTN))
    # ── regra 1: todo comando citado numa dica é o comando declarado do botão
    bad=[]
    for x in BTN:
        toks=alias_tokens(x['title'])
        for t in toks:
            same=ALIAS.get(t)==ALIAS.get(x['cmd'])   # sinônimo (ex.: MV e MVIEW, D e DDIM)
            if not same and not (x['cmd']=='DT' and t in('T','MT')) and not (x['cmd']=='MSPACE' and t=='PS'):
                bad.append((x['label'],x['title'],t))
    ok('Nenhuma dica cita um comando diferente do que o botão executa',not bad,bad[:6])
    # ── regra 2: o comando declarado aparece na dica
    miss=[(x['label'],x['cmd']) for x in BTN if x['cmd'] and x['cmd'] not in alias_tokens(x['title']) and not (x['cmd'] in FORMATS and re.search(r'\b'+x['cmd']+r'\b',x['title']))]
    ok('A dica de cada botão mostra o seu comando',not miss,miss)
    unk=[(x['label'],x['cmd']) for x in BTN if x['cmd'] and x['cmd'] not in ALIAS]
    ok('Todo comando declarado existe na linha de comando',not unk,unk)
    # ── regra 3: botão de ferramenta com comando digitável precisa declarar o comando
    tools_with_alias=set(ALIAS.values())
    nodecl=[]
    for x in BTN:
        mm=re.fullmatch(r"setTool\('(\w+)'\)",x['onclick'])
        if mm and mm.group(1) in tools_with_alias and not x['cmd']: nodecl.append(x['label'])
    ok('Todo botão de ferramenta com comando digitável mostra o comando',not nodecl,nodecl)
    # ── as quatro dicas corrigidas no R2
    def find(onc): return next((x for x in BTN if x['onclick']==onc),None)
    for onc,cmd in [("setTool('rectangle')",'REC'),("setTool('ellipse')",'EL'),("setTool('text')",'DT'),("setTool('select')",'SELECT'),("setTool('erase')",'E')]:
        x=find(onc); ok(f'Botão {onc} mostra {cmd}',x and x['cmd']==cmd and 'S/' not in x['title'],x and x['title'])
    # ── regra 4: clicar no botão = digitar o comando (mesmo estado final)
    diffs=[]; checked=0
    for x in BTN:
        if not x['cmd']: continue
        E(RESET,x['paper'])
        E(f"document.querySelector('[data-ti=\"{x['i']}\"]').click()"); pg.wait_for_timeout(40)
        if x['via']=='dialog':
            E("(()=>{var o=document.querySelector('.ov.show');if(o){var b=o.querySelector('.btn.p');if(b)b.click();}})()"); pg.wait_for_timeout(30)
            sa=E(SIG); sa['calls']=[]
        else: sa=E(SIG)
        E(RESET,x['paper'])
        E(f"document.getElementById('cmdinput').value='{x['cmd']}'"); pg.press('#cmdinput','Enter'); pg.wait_for_timeout(40)
        sb=E(SIG)
        if x['via']=='dialog': sb['calls']=[]
        checked+=1
        if sa!=sb: diffs.append((x['label'],x['cmd'],{k:(sa[k],sb[k]) for k in sa if sa[k]!=sb[k]}))
    ok(f'Clicar no botão e digitar o comando dão o mesmo resultado ({checked} botões)',not diffs and checked>=40,diffs[:5])
    # ── HELP só cita comandos que existem e com o significado atual
    E(RESET,False); E("document.getElementById('cmdlog')&&(document.getElementById('cmdlog').innerHTML='')")
    E("document.getElementById('cmdinput').value='HELP'"); pg.press('#cmdinput','Enter'); pg.wait_for_timeout(60)
    txt=E("Array.from(document.querySelectorAll('#cmdlog div, #cmdhist div, .ll')).map(d=>d.textContent).join('\\n')")
    pairs=re.findall(r'(?<![\w+])([A-Z]{1,6})=',txt)
    badh=[t for t in pairs if t not in ALIAS]
    ok('HELP: todo "COMANDO=" existe',pairs and not badh,badh)
    ok('HELP mostra REC, EL, DT, S=Stretch e E=Apagar',all(k in txt for k in ['REC=Retângulo','EL=Elipse','DT=Texto','S=Stretch','E=Apagar']),txt[:200])
    ok('HELP sem as letras antigas (R=Retângulo, E=Elipse, T=Texto de uma linha)','R=Ret' not in txt and 'E=Elip' not in txt and 'L C R A E' not in txt)
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
fails=[n for n,c in R if not c]; print(f'\n{len(R)-len(fails)}/{len(R)} testes OK'); sys.exit(1 if fails else 0)
