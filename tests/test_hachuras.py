# Testes do catálogo de padrões de hachura (v8.2): galeria, criação pelo HATCH, recorte pelos contornos e ilhas,
# transformações, painel de propriedades, PDF/SVG e DXF (exportar, reabrir e importar padrões do AutoCAD).
# Uso: pip install playwright ezdxf && playwright install chromium && python tests/test_hachuras.py
import sys, os, json
from playwright.sync_api import sync_playwright
import ezdxf
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,'index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
def near(a,b,t=1e-6): return abs(a-b)<t
TMP=lambda f: os.path.join(HERE,'_'+f)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':850})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.goto('file://'+path); pg.wait_for_timeout(500); E=pg.evaluate
    if E("document.getElementById('ov-recover').classList.contains('show')"): E("closeOv('ov-recover')")
    def cmd(*seq):
        for t in seq:
            E(f"document.getElementById('cmdinput').value={t!r}"); pg.press('#cmdinput','Enter'); pg.wait_for_timeout(15)
    def reset():
        E("()=>{document.querySelectorAll('.ov.show').forEach(o=>o.classList.remove('show'));if(S.space!=='model')switchSpace('model');S.ents=[];S.sel=[];S.ds=null;resetHistory();setTool('select');S.modes.snap=false;S.vp={x:Math.round(S.W/2)-300,y:Math.round(S.H/2)+150,sc:4};renderAll();}")
    def H(): return E("S.ents.filter(e=>e.tp==='hatch').map(e=>({htype:e.htype,pname:e.pname,ang:e.ang,sp:e.sp,n:e.loops.length,pdef:!!e.pdef}))")
    # ── catálogo e galeria
    n=E("HPAT.length"); ok('Catálogo com pelo menos 28 padrões novos',n>=28,n)
    pg.click('#rb-hatch'); pg.wait_for_timeout(150)
    nit=E("document.querySelectorAll('#hpat-gal .hpat-it').length"); ok('Galeria com miniaturas (básicos + novos)',nit>=37,nit)
    grp=E("Array.from(document.querySelectorAll('#hpat-gal .hpat-grp')).map(g=>g.textContent)")
    ok('Grupos por material',all(g in grp for g in ['Gerais','Materiais (ANSI)','Construção','Solos e terreno','Vegetação e cultivo']),grp)
    blank=E("""Array.from(document.querySelectorAll('#hpat-gal canvas')).filter(c=>{var d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,n=0;for(var i=0;i<d.length;i+=4) if(d[i]>60) n++;return n<20;}).map(c=>c.parentNode.title)""")
    ok('Todas as miniaturas desenham o padrão',not blank,blank)
    pg.click('#hpat-gal .hpat-it[data-v^="pat:BRICK"]'); pg.wait_for_timeout(30)
    ok('Clique na miniatura escolhe o padrão e o tamanho',E("document.getElementById('hpat-sel').value").startswith('pat:BRICK') and E("document.getElementById('hpat-sp').value")=='6.35' and E("document.querySelector('#hpat-gal .hpat-it.on').title").startswith('Tijolo'))
    # ── criação pelo HATCH (ponto interno), com ilha
    reset(); E("()=>{addE({tp:'rect',x:0,y:0,w:120,h:60});addE({tp:'circ',cx:60,cy:30,r:12});}")
    pg.click('#rb-hatch'); pg.wait_for_timeout(80); pg.dblclick('#hpat-gal .hpat-it[data-v^="pat:BRICK"]'); pg.wait_for_timeout(60)
    ok('Duplo clique escolhe e inicia o HATCH',E("S.tool")=='hatch')
    E("handleClick({x:5,y:5})"); cmd('')
    h=H(); ok('Hachura Tijolo criada com ilha',len(h)==1 and h[0]['htype']=='pat' and h[0]['pname']=='BRICK' and h[0]['n']==2 and near(h[0]['ang'],0),h)
    g=E("(()=>{var e=S.ents.find(e=>e.tp==='hatch'),G=hpGeometry(e.loops,hpFamilies(e,1));var out=G.segs.filter(s=>{var m={x:(s[0]+s[2])/2,y:(s[1]+s[3])/2};return !pointInLoops(m,e.loops);}).length;return {n:G.segs.length,out:out};})()")
    ok('Segmentos recortados: nenhum fora da área nem dentro da ilha',g['n']>50 and g['out']==0,g)
    # ── todos os padrões geram geometria numa área típica
    bad=E("""HPAT.filter(p=>p[1]!=='SOLID').map(p=>{var e={tp:'hatch',htype:'pat',pname:p[1],ang:0,sp:p[4],loops:[[{x:0,y:0},{x:150,y:0},{x:150,y:100},{x:0,y:100}]]};var G=hpGeometry(e.loops,hpFamilies(e,1));return [p[1],G.segs.length+G.dots.length,G.dense];}).filter(r=>r[1]<5||r[2])""")
    ok('Cada padrão gera traços/pontos numa área de 150 × 100 mm',not bad,bad)
    # padrões em rede (brita, lavoura) se repetem sem acumular deslocamento
    tri=E("(()=>{var e={htype:'pat',pname:'EDU_BRITA',ang:0,sp:10,loops:[[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]]};var G=hpGeometry(e.loops,hpFamilies(e,1));var L=G.segs.map(s=>Math.hypot(s[2]-s[0],s[3]-s[1])).filter(l=>l>3.4);return L.every(l=>Math.abs(l-3.5)<1e-6);})()")
    ok('Brita: todos os lados de triângulo inteiros medem 3,5 mm (padrão fecha)',tri)
    # ── ângulo 0 não vira 45 (correção) e "Linhas horizontais"
    reset(); E("addE({tp:'rect',x:0,y:0,w:50,h:30})")
    E("showHatchDlg()"); pg.click('#hpat-gal .hpat-it[data-v="lines|0|4"]'); E("confirmHatch()"); E("handleClick({x:5,y:5})"); cmd('')
    ok('"Linhas Horizontais" sai com 0° (antes virava 45°)',H()[0]['ang']==0,H())
    # ── transformações
    reset(); E("()=>{addE({tp:'rect',x:0,y:0,w:50,h:30});S.hatchPat={name:'x',type:'pat',pname:'ANSI32',ang:0,sp:9.525};setTool('hatch');handleClick({x:5,y:5});}"); cmd('')
    E("()=>{var e=S.ents.find(e=>e.tp==='hatch');S.sel=[e.id];}"); cmd('RO','0,0','90')
    ok('ROTATE 90° gira o padrão (0° → 90°)',near(H()[0]['ang'],90),H())
    E("()=>{var e=S.ents.find(e=>e.tp==='hatch');S.sel=[e.id];}"); cmd('SC','0,0','2')
    ok('SCALE 2 dobra o tamanho do padrão',near(H()[0]['sp'],19.05),H())
    # ── painel de propriedades
    E("()=>{var e=S.ents.find(e=>e.tp==='hatch');S.sel=[e.id];updSelInfo();}")
    sel=pg.locator('#selinfo .geo-row',has_text='Padrão').locator('select')
    ok('Painel mostra o padrão atual',sel.input_value()=='Aço')
    sel.select_option('Areia'); pg.wait_for_timeout(60)
    ok('Trocar o padrão pelo painel mantém a escala relativa (×2)',H()[0]['pname']=='EDU_AREIA' and near(H()[0]['sp'],6),H())
    ok('Rótulos do painel: rotação e tamanho do padrão',pg.locator('#selinfo',has_text='Rotação do padrão').count()==1 and pg.locator('#selinfo',has_text='Tamanho do padrão (mm)').count()==1)
    # ── sólido
    reset(); E("()=>{addE({tp:'rect',x:0,y:0,w:50,h:30});S.hatchPat={type:'pat',pname:'SOLID',ang:0,sp:1};setTool('hatch');handleClick({x:5,y:5});}"); cmd('')
    px=E("(()=>{var p=w2s(25,15),d=S.gD.getImageData(Math.round(p.x*S.dpr),Math.round(p.y*S.dpr),1,1).data;return d[0]+d[1]+d[2];})()")
    ok('Sólido preenche a área',px>300,px)
    ok('SVG: sólido com preenchimento par/ímpar','fill-rule="evenodd"' in E("buildSVG()"))
    # ── DXF: exportar, auditar e reabrir
    reset()
    E("""()=>{var specs=[['ANSI31',0,3.175],['BRICK',30,10],['EARTH',0,6.35],['GRASS',0,25.4],['EDU_CULTIVO',15,8],['EDU_BRITA',0,4],['SOLID',0,1]];
      specs.forEach(function(s,i){var x=i*70;addE({tp:'rect',x:x,y:0,w:60,h:40});var e={tp:'hatch',htype:'pat',pname:s[0],ang:s[1],sp:s[2],loops:[[{x:x,y:0},{x:x+60,y:0},{x:x+60,y:40},{x:x,y:40}]]};hatchSync(e);addE(e);});}""")
    f=TMP('h.dxf'); open(f,'wb').write(bytes(E("Array.from(cp1252Encode(buildDXF2000({})))")))
    d=ezdxf.readfile(f); a=d.audit(); hs=list(d.modelspace().query('HATCH'))
    ok('DXF sem erros de auditoria',not a.errors,[x.message for x in a.errors][:3])
    names=[x.dxf.pattern_name for x in hs]
    ok('Nomes no DXF: padrões do AutoCAD pelo nome; os do EduCAD com prefixo EDU_',names==['ANSI31','BRICK','EARTH','GRASS','EDU_CULTIVO','EDU_BRITA','SOLID'],names)
    ok('Padrões do AutoCAD marcados como predefinidos; os do EduCAD como personalizados',[x.dxf.pattern_type for x in hs[:6]]==[1,1,1,1,2,2])
    ok('Sólido como preenchimento sólido',hs[6].dxf.solid_fill==1)
    br=hs[1].pattern.lines
    ok('Linhas do padrão gravadas (Tijolo: 3 famílias, girado 30°)',len(br)==3 and near(br[0].angle,30,1e-6))
    E("()=>{S.ents=[];}")
    E(f"()=>{{importDxfBuffer(new Uint8Array({json.dumps(list(open(f,'rb').read()))}).buffer,'h.dxf',false);}}"); os.remove(f)
    h=H(); got=[(x['pname'],round(x['ang'],6),round(x['sp'],4)) for x in h]
    ok('Ida e volta: padrão, rotação e tamanho preservados',got==[('ANSI31',0,3.175),('BRICK',30,10),('EARTH',0,6.35),('GRASS',0,25.4),('EDU_CULTIVO',15,8),('EDU_BRITA',0,4),('SOLID',0,1)],got)
    # ── DXF do AutoCAD/ezdxf: padrão predefinido e padrão fora do catálogo
    d2=ezdxf.new('R2000'); d2.header['$INSUNITS']=4; m=d2.modelspace()
    h1=m.add_hatch(); h1.set_pattern_fill('BRICK',scale=2); h1.paths.add_polyline_path([(0,0),(100,0),(100,50),(0,50)],is_closed=True)
    h2=m.add_hatch(); h2.set_pattern_fill('AR-PARQ1',scale=0.1); h2.paths.add_polyline_path([(200,0),(300,0),(300,50),(200,50)],is_closed=True)
    f2=TMP('i.dxf'); d2.saveas(f2)
    reset(); pg.set_input_files('#fileInput',f2); pg.wait_for_timeout(400); os.remove(f2)
    h=H(); ok('Tijolo (BRICK escala 2) reconhecido do catálogo, tamanho 12,7 mm',h and h[0]['pname']=='BRICK' and near(h[0]['sp'],12.7,1e-3),h)
    ok('Padrão fora do catálogo (AR-PARQ1) mantido pelas linhas do arquivo',len(h)>1 and h[1]['pname']=='AR-PARQ1' and h[1]['pdef'],h)
    seg=E("(()=>{var e=S.ents.filter(e=>e.tp==='hatch')[1];var G=hpGeometry(e.loops,hpFamilies(e,1));return G.segs.length;})()")
    ok('…e desenhado na tela',seg>20,seg)
    # ── PDF
    E("()=>{switchSpace('layout');}")
    raw=bytes(E("Array.from(buildPDF([curLayout()]))")).decode('latin1')
    ok('PDF vetorial: hachura em vetor, recortada pelo contorno (par/ímpar)','W* n' in raw and raw.count(' l')>=40,raw.count(' l'))
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
for fn in os.listdir(HERE):
    if fn.startswith('_'): os.remove(os.path.join(HERE,fn))
fails=[n for n,c in R if not c]; print(f'\n{len(R)-len(fails)}/{len(R)} testes OK'); sys.exit(1 if fails else 0)
