# Testes do salvamento automático e da recuperação (v7.7, R1 do parecer técnico).
# Usa o mesmo contexto do navegador entre recarregamentos, como um aluno que fecha e reabre o EduCAD.
# Uso: pip install playwright && playwright install chromium && python tests/test_autosave.py
import sys, os, json
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1400,'height':850},accept_downloads=True); pg=ctx.new_page()
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    def load():
        pg.goto('file://'+path); pg.wait_for_timeout(900)
    E=pg.evaluate
    def records(): return E("new Promise(r=>asOpen(()=>asList(L=>r(L.map(x=>({id:x.id,dirty:x.dirty,n:x.n,name:x.name}))))))")
    def dialog_open(): return E("document.getElementById('ov-recover').classList.contains('show')")
    load()
    ok('Armazenamento disponível (IndexedDB ou localStorage)',E("AS.mode") in ('idb','ls'),E("AS.mode"))
    ok('Indicador na barra de status',pg.locator('#sautosave').is_visible() and 'automático' in pg.locator('#sautosave').text_content())
    ok('Sem cópias ao abrir pela primeira vez',records()==[] and not dialog_open())
    # ── alteração → cópia 8 s depois (encurtado para o teste)
    E("()=>{AS.delay=150;S.modes.snap=false;}")
    pg.click('#cmdinput'); pg.keyboard.type('REC'); pg.keyboard.press('Enter'); pg.keyboard.type('0,0'); pg.keyboard.press('Enter'); pg.keyboard.type('100,50'); pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
    r=records(); ok('Cópia gravada logo após a alteração',len(r)==1 and r[0]['dirty'] and r[0]['n']==1,r)
    ok('Indicador mostra o horário da cópia','Cópia de segurança' in pg.locator('#sautosave').text_content(),pg.locator('#sautosave').text_content())
    # layout com carimbo também entra na cópia
    E("()=>{switchSpace('layout');titleBlockInsert();}"); pg.wait_for_timeout(400)
    ok('Conteúdo do layout entra na cópia',records()[0]['n']>5)
    # ── "fecha" sem salvar e reabre
    load()
    ok('Ao reabrir, oferece recuperar o desenho não salvo',dialog_open() and pg.locator('#rec-list .rec-row').count()==1)
    ok('Lista mostra data, quantidade e "não salvo"','não salvo em arquivo' in pg.locator('#rec-list').text_content())
    with pg.expect_download() as dl: pg.locator('#rec-list .rec-dl').first.click()
    d=dl.value; fn=d.suggested_filename; tmp=os.path.join(HERE,'_rec.json'); d.save_as(tmp); doc=json.load(open(tmp)); os.remove(tmp)
    ok('Baixar .json entrega o desenho completo',fn.endswith('.json') and len(doc['ents'])==1 and len(doc['layouts'])==1,fn)
    pg.locator('#rec-list .rec-ok').first.click(); pg.wait_for_timeout(300)
    ok('Recuperar restaura o modelo',E("S.space")=='model' and E("S.ents.length")==1 and E("S.ents[0].tp")=='rect')
    ok('…e os layouts com o carimbo',E("S.layouts.length")==1 and E("S.layouts[0].ents.some(e=>e.tp==='insert')"))
    ok('Título marcado como recuperado e desenho como não salvo','(recuperado)' in E("document.getElementById('ftitle').textContent") and E("S.dirty")==True)
    r=records(); ok('A cópia antiga dá lugar à desta sessão',len(r)==1 and r[0]['id']==E("AS.sid") and r[0]['dirty'],r)
    # ── salvar em arquivo → não oferece recuperação na próxima abertura
    E("()=>{const o=URL.createObjectURL;URL.createObjectURL=x=>'blob:x';try{saveDoc();}finally{URL.createObjectURL=o;}}"); pg.wait_for_timeout(300)
    ok('Salvar em arquivo marca a cópia como salva',records()[0]['dirty']==False)
    load()
    ok('Desenho salvo em arquivo: nada a recuperar ao reabrir',not dialog_open())
    # ── descartar
    E("()=>{AS.delay=100;addE({tp:'line',x1:0,y1:0,x2:10,y2:0});snapshot();}"); pg.wait_for_timeout(400)
    load(); ok('Nova alteração não salva é oferecida',dialog_open())
    pg.locator('#rec-list .rec-del').first.click(); pg.wait_for_timeout(200)
    ok('Descartar remove a cópia e fecha a janela',not dialog_open() and all(x['id']==E("AS.sid") or not x['dirty'] for x in records()))
    # ── fechar a página logo após a alteração (antes dos 8 s): cópia gravada ao sair
    E("()=>{AS.delay=60000;addE({tp:'circ',cx:0,cy:0,r:5});S.dirty=true;snapshot();}")
    load(); ok('Cópia gravada ao fechar/recarregar a página',dialog_open())
    pg.locator('#ov-recover .mact .btn').click()
    # ── comandos
    pg.click('#cmdinput'); pg.keyboard.type('RECUPERAR'); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    ok('RECUPERAR lista as cópias deste navegador',dialog_open() and 'Cópias de segurança' in pg.locator('#rec-title').text_content())
    pg.locator('#ov-recover .mact .btn').click()
    pg.click('#cmdinput'); pg.keyboard.type('SAVETIME'); pg.keyboard.press('Enter'); pg.keyboard.type('0'); pg.keyboard.press('Enter'); pg.wait_for_timeout(100)
    ok('SAVETIME 0 desliga',E("AS.minutes")==0 and 'desligado' in pg.locator('#sautosave').text_content())
    load(); ok('Configuração lembrada ao reabrir',E("AS.minutes")==0)
    if dialog_open(): pg.locator('#ov-recover .mact .btn').click()
    E("asSetMinutes(1)")
    pg.click('#cmdinput'); pg.keyboard.type('LIMPARRECUPERACAO'); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
    ok('LIMPARRECUPERACAO apaga todas as cópias (computador compartilhado)',records()==[])
    # ── limite de 5 cópias e reserva em localStorage
    E("()=>new Promise(res=>{var n=0;for(var i=0;i<7;i++){asPut({id:'old'+i,ts:Date.now()-100000+i,name:'x'+i,dirty:true,n:1,json:'{}'},()=>{if(++n==7){asPrune();setTimeout(res,300);}});}})")
    ok('Guarda no máximo as 5 cópias mais recentes',len(records())==5)
    E("()=>{AS.mode='ls';AS.lastJson=null;S.dirty=true;}"); E("new Promise(r=>asSaveNow('teste',r))")
    ok('Reserva em localStorage quando o IndexedDB não está disponível',E("asLsAll().some(r=>r.id===AS.sid)"))
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
fails=[n for n,c in R if not c]; print(f'\n{len(R)-len(fails)}/{len(R)} testes OK'); sys.exit(1 if fails else 0)
