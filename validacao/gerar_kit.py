#!/usr/bin/env python3
# Kit de validação externa do EduCAD (R9 do parecer técnico).
# Gera, a partir do próprio aplicativo, 5 desenhos de teste em DXF 2000 e R12, a folha de calibração em PDF,
# o roteiro com os valores esperados (conferidos no próprio arquivo com o ezdxf) e o relatório de pré-validação
# com leitores independentes (ezdxf, dxfgrabber e, se houver Node.js com os pacotes dxf-parser e dxf, também esses dois).
#
# Uso:  pip install playwright ezdxf pypdf dxfgrabber && playwright install chromium
#       python validacao/gerar_kit.py                    (gera em validacao/)
#       python validacao/gerar_kit.py --saida /tmp/kit --node-modules /caminho/node_modules
import sys, os, io, re, json, math, argparse, subprocess, datetime, shutil
from playwright.sync_api import sync_playwright
import ezdxf, pypdf
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
ap=argparse.ArgumentParser()
ap.add_argument('--saida',default=HERE); ap.add_argument('--alvo',default=os.path.join(ROOT,'index.html'))
ap.add_argument('--node-modules',default=os.environ.get('EDUCAD_NODE_MODULES','')); ap.add_argument('--sem-previas',action='store_true')
A=ap.parse_args(); OUT=os.path.abspath(A.saida); os.makedirs(OUT,exist_ok=True)
def P(*a): return os.path.join(OUT,*a)

# ── geometria de referência (fonte única para o desenho e para os valores esperados) ──
HEX=[(450+30*math.cos(math.radians(90+60*i)),50+30*math.sin(math.radians(90+60*i))) for i in range(6)]
ISL=[(50+15*math.cos(2*math.pi*i/72),-50+15*math.sin(2*math.pi*i/72)) for i in range(72)]
def poly_area(Q): return abs(sum(Q[i][0]*Q[(i+1)%len(Q)][1]-Q[(i+1)%len(Q)][0]*Q[i][1] for i in range(len(Q))))/2
R45=25/math.sqrt(2)

JS_RESET="""()=>{var cf=window.confirm;window.confirm=()=>true;try{if(S.space!=='model')switchSpace('model');newDoc();}finally{window.confirm=cf;}
  S.units=S.units||{};S.units.insertScale='mm';S.modes.snap=false;S.dimCurrent='Standard';S.layers=S.layers.filter(l=>l.id===0);S.curLy=0;S.blocks={};updLayerUI();}"""
DESENHOS={
 '01-geometria':("""()=>{
  addE({tp:'line',x1:0,y1:0,x2:100,y2:0}); addE({tp:'line',x1:0,y1:0,x2:60,y2:80});
  addE({tp:'circ',cx:150,cy:50,r:25}); addE({tp:'arc',cx:250,cy:50,r:30,sa:0,ea:2*Math.PI/3});
  addE({tp:'ell',cx:350,cy:50,rx:40,ry:20,rot:Math.PI/6});
  addE({tp:'pl',closed:true,pts:[{x:0,y:120},{x:80,y:120},{x:80,y:170,b:1},{x:0,y:170}]});
  addE({tp:'spline',pts:[{x:150,y:120},{x:180,y:160},{x:220,y:130},{x:260,y:170}]});
  [[300,120],[320,120],[340,120]].forEach(p=>addE({tp:'point',x:p[0],y:p[1]}));
  addE({tp:'rect',x:380,y:120,w:40,h:30});
  addE({tp:'pl',closed:true,pts:%s});
  addE({tp:'txt',x:0,y:-15,h:4,txt:'01 - Geometria (mm)',rot:0}); }""" % json.dumps([{'x':x,'y':y} for x,y in HEX]),
  'Linhas, círculo, arco, elipse inclinada, polilinha com arco, spline, pontos, retângulo e hexágono.'),
 '02-texto-e-cotas':("""()=>{
  addE({tp:'rect',x:0,y:0,w:120,h:80}); addE({tp:'circ',cx:200,cy:40,r:25});
  addE({tp:'txt',x:0,y:110,h:5,txt:'Ação de irrigação — 25 °C ± 0,5 ⌀ 50',rot:0});
  addE({tp:'mtext',x:0,y:100,w:0,h:3.5,txt:'Linha 1\\nLinha 2 com acentuação',att:1,rot:0});
  addE({tp:'dim',subtp:'linear',dimDir:'h',x1:0,y1:0,x2:120,y2:0,px:60,py:-15,dimStyle:'Standard'});
  addE({tp:'dim',subtp:'linear',dimDir:'v',x1:120,y1:0,x2:120,y2:80,px:140,py:40,dimStyle:'ABNT'});
  addE({tp:'dim',subtp:'aligned',x1:0,y1:0,x2:120,y2:80,px:-8,py:12,dimStyle:'ABNT'});
  addE({tp:'dimr',cx:200,cy:40,ex:%f,ey:%f,val:'25',dimStyle:'ABNT'});
  addE({tp:'dimd',cx:200,cy:40,ex:%f,ey:%f,val:'50',dimStyle:'ABNT'});
  addE({tp:'dima',vx:0,vy:0,x1:120,y1:0,x2:120,y2:80,px:45,py:12,dimStyle:'ABNT'});
  addE({tp:'leader',pts:[{x:%f,y:%f},{x:240,y:85},{x:255,y:85}],txt:'Furo Ø50',dimStyle:'ABNT'});
  addE({tp:'txt',x:0,y:-35,h:4,txt:'02 - Texto e cotas',rot:0}); }""" % (200+R45,40+R45,200+25*math.cos(math.radians(-30)),40+25*math.sin(math.radians(-30)),200+R45,40+R45),
  'Texto com acentos e símbolos, texto múltiplo, cotas linear, vertical, alinhada, raio, diâmetro e angular, estilos Standard e ABNT, linha de chamada.'),
 '03-hachuras':("""()=>{
  var L=[['ANSI31',1,0],['BRICK',2,0],['EARTH',1,30],['GRASS',0.5,0],['SOLID',1,0],['EDU_CULTIVO',2,0]];
  L.forEach(function(p,i){ var x=i*80,R=[{x:x,y:0},{x:x+60,y:0},{x:x+60,y:40},{x:x,y:40}]; addE({tp:'rect',x:x,y:0,w:60,h:40});
    var e={tp:'hatch',loops:[R],htype:'pat',pname:p[0],ang:p[2],sp:HPAT_BY[p[0]].size*p[1]}; hatchSync(e); addE(e);
    addE({tp:'txt',x:x,y:45,h:3.5,txt:p[0]+' esc. '+p[1]+(p[2]?' ang. '+p[2]+'°':''),rot:0}); });
  addE({tp:'rect',x:0,y:-80,w:100,h:60}); addE({tp:'circ',cx:50,cy:-50,r:15});
  var e={tp:'hatch',loops:[[{x:0,y:-80},{x:100,y:-80},{x:100,y:-20},{x:0,y:-20}],%s],htype:'pat',pname:'ANSI37',ang:0,sp:HPAT_BY.ANSI37.size}; hatchSync(e); addE(e);
  addE({tp:'txt',x:110,y:-50,h:3.5,txt:'ANSI37 com ilha (furo sem hachura)',rot:0});
  addE({tp:'txt',x:0,y:-95,h:4,txt:'03 - Hachuras',rot:0}); }""" % json.dumps([{'x':x,'y':y} for x,y in ISL]),
  'Seis padrões (ANSI31, BRICK escala 2, EARTH a 30°, GRASS escala 0,5, sólido e padrão próprio EDU_CULTIVO) e uma hachura com ilha.'),
 '04-camadas-e-blocos':("""()=>{
  var C=[['Paredes','#ff0000','solid',.5,true,false,true],['Eixos','#00a0ff','center',.18,true,false,true],['Ocultas','#00ff00','hidden',.25,true,false,true],
         ['NaoImprime','#808080','solid',.25,true,false,false],['Travada','#ffff00','solid',.25,true,true,true],['Desligada','#ff00ff','solid',.25,false,false,true]];
  C.forEach(function(c,i){ var L={id:10+i,nm:c[0],col:c[1],ld:c[2],lw:c[3],vis:c[4],lock:c[5],plot:c[6]}; S.layers.push(L);
    addE({tp:'line',x1:0,y1:i*15,x2:150,y2:i*15,ly:L.id,col:null,lw:null,ld:null}); addE({tp:'txt',x:155,y:i*15-1.5,h:3.5,txt:c[0],rot:0,ly:0}); });
  addE({tp:'line',x1:0,y1:95,x2:150,y2:95,ly:0,col:'#ff8000',lw:.7,ld:'dashed'}); addE({tp:'txt',x:155,y:93.5,h:3.5,txt:'Cor, espessura e tipo próprios (não ByLayer)',rot:0,ly:0});
  S.blocks.MARCO={base:{x:0,y:0},ents:[{tp:'circ',cx:0,cy:0,r:5,ly:0},{tp:'line',x1:-7,y1:0,x2:7,y2:0,ly:0},{tp:'line',x1:0,y1:-7,x2:0,y2:7,ly:0}]};
  addE({tp:'insert',name:'MARCO',x:0,y:-40,s:1,rot:0,m:false}); addE({tp:'insert',name:'MARCO',x:40,y:-40,s:2,rot:Math.PI/4,m:false}); addE({tp:'insert',name:'MARCO',x:90,y:-40,s:1,rot:0,m:true});
  addE({tp:'txt',x:0,y:-65,h:4,txt:'04 - Camadas e blocos',rot:0}); updLayerUI(); }""",
  'Camadas com cores ACI e RGB, tipos de linha, espessuras, camada que não imprime, travada e desligada; propriedades próprias; bloco MARCO inserido 3 vezes (escala 2, rotação 45°, espelhado).'),
 '05-layout-escala':("""()=>{
  S.layers.push({id:20,nm:'Terreno',col:'#00ff00',ld:'solid',lw:.5,vis:true,lock:false,plot:true});
  addE({tp:'rect',x:0,y:0,w:20000,h:15000,ly:20}); addE({tp:'rect',x:4000,y:3000,w:8000,h:6000,ly:0});
  addE({tp:'dim',subtp:'linear',dimDir:'h',x1:0,y1:0,x2:20000,y2:0,px:10000,py:-1200,dimStyle:'ABNT'});
  addE({tp:'txt',x:4500,y:9500,h:350,txt:'Casa 8 x 6 m',rot:0});
  switchSpace('layout'); var f=document.getElementById('lc-paper'); f.value='A3'; layoutApply();
  var L=curLayout(); L.name='Prancha A3'; buildLayoutTabs(); var v=curViewport(); v.k=unitMm()/100; v.cx=10000; v.cy=7000; v.auto=false; titleBlockInsert(); switchSpace('model'); }""",
  'Terreno de 20 × 15 m no Model e o layout "Prancha A3" com viewport em 1:100 e carimbo ABNT.'),
}
JS_CAL="""()=>{
  addE({tp:'line',x1:0,y1:0,x2:100,y2:0,lw:.35}); addE({tp:'line',x1:0,y1:0,x2:0,y2:100,lw:.35}); addE({tp:'rect',x:30,y:20,w:50,h:50}); addE({tp:'circ',cx:120,cy:45,r:25});
  addE({tp:'txt',x:30,y:3,h:3,txt:'100 mm',rot:0}); addE({tp:'txt',x:3,y:85,h:3,txt:'100 mm',rot:0}); addE({tp:'txt',x:32,y:73,h:3,txt:'50 x 50 mm',rot:0}); addE({tp:'txt',x:106,y:74,h:3,txt:'Ø50 mm',rot:0});
  addE({tp:'line',x1:0,y1:-3000,x2:5000,y2:-3000,lw:.35}); addE({tp:'txt',x:0,y:-2700,h:150,txt:'5 m',rot:0});
  switchSpace('layout'); var f=document.getElementById('lc-paper'); f.value='A4'; layoutApply(); var L=curLayout(); L.name='Calibracao'; buildLayoutTabs();
  S.ents=S.ents.filter(e=>e.tp!=='viewport');
  var v1=newViewport({x:15,y:20,w:160,h:150}); v1.k=unitMm()*1; v1.cx=65; v1.cy=50; v1.auto=false; S.ents.push(v1);
  var v2=newViewport({x:180,y:60,w:110,h:40}); v2.k=unitMm()/50; v2.cx=2500; v2.cy=-2850; v2.auto=false; S.ents.push(v2);
  addE({tp:'txt',x:15,y:195,h:5,txt:'EduCAD - FOLHA DE CALIBRAÇÃO (A4 paisagem)',rot:0});
  addE({tp:'txt',x:15,y:186,h:3,txt:'Imprima em tamanho real (100%), sem "ajustar à página". Meça com régua:',rot:0});
  addE({tp:'txt',x:15,y:180,h:3,txt:'linhas de 100,0 mm, quadrado de 50 x 50 mm, círculo de 50 mm e, em 1:50, 5 m = 100 mm.',rot:0});
  addE({tp:'txt',x:180,y:105,h:3.5,txt:'Escala 1:50 - a linha mede 100 mm',rot:0}); addE({tp:'txt',x:15,y:12,h:3,txt:'Escala 1:1',rot:0}); }"""

def esperado(nome,d):
    """Valores que o professor confere no AutoCAD/ZWCAD; cada um é conferido aqui no arquivo gerado (ezdxf)."""
    msp=d.modelspace(); C=[]
    def chk(o,valor,ok):
        try: v=bool(ok() if callable(ok) else ok)
        except Exception as ex: v=False; valor=valor+'  [erro na conferência: '+str(ex)[:80]+']'
        C.append({'o':o,'v':valor,'ok':v})
    if nome=='01-geometria':
        L=msp.query('LINE'); l2=[l for l in L if abs(l.dxf.end.x-60)<1e-6][0]
        chk('LIST na linha inclinada (de 0,0 a 60,80)','comprimento 100.0000, ângulo 53.1301°',abs(math.dist((l2.dxf.start.x,l2.dxf.start.y),(l2.dxf.end.x,l2.dxf.end.y))-100)<1e-9)
        c=msp.query('CIRCLE')[0]; chk('LIST no círculo','centro 150,50; raio 25.0000; área 1963.4954; circunferência 157.0796',abs(c.dxf.radius-25)<1e-9 and tuple(c.dxf.center)[:2]==(150,50))
        a=msp.query('ARC')[0]; chk('LIST no arco','centro 250,50; raio 30; ângulo inicial 0°, final 120°; comprimento 62.8319',abs(a.dxf.radius-30)<1e-9 and abs(a.dxf.start_angle)<1e-9 and abs(a.dxf.end_angle-120)<1e-6)
        el=msp.query('ELLIPSE')[0]; maj=el.dxf.major_axis; chk('LIST na elipse','centro 350,50; eixo maior 80 (raio 40) a 30°; razão 0.5 (eixo menor 40)',abs(math.hypot(maj.x,maj.y)-40)<1e-6 and abs(el.dxf.ratio-0.5)<1e-9 and abs(math.degrees(math.atan2(maj.y,maj.x))-30)<1e-6)
        pls=msp.query('LWPOLYLINE'); arcpl=[p for p in pls if any(abs(b)>0 for *_,b in p.get_points('xyseb'))][0]
        V=list(arcpl.get_points('xyb')); ar=poly_area([(x,y) for x,y,_ in V])
        for i,(x,y,bu) in enumerate(V):
            if bu: x2,y2,_=V[(i+1)%len(V)]; c=math.hypot(x2-x,y2-y); th=4*math.atan(bu); r=c/(2*math.sin(abs(th)/2)); ar+=math.copysign(r*r/2*(abs(th)-math.sin(abs(th))),bu)
        chk('LIST na polilinha com arco (canto 0,120)','fechada; área 6513.2741; perímetro 305.6637',abs(ar-(4000+math.pi*800))<0.01 and arcpl.closed)
        rc=[p for p in pls if abs(p.get_points('xy')[0][0]-380)<1e-6][0]; chk('LIST no retângulo (canto 380,120)','área 1200.0000; perímetro 140.0000',abs(poly_area(rc.get_points('xy'))-1200)<1e-9)
        hx=[p for p in pls if len(p)==6][0]; chk('LIST no hexágono (centro 450,50)','área 2338.2686; perímetro 180.0000',abs(poly_area(hx.get_points('xy'))-2338.2686)<1e-4)
        sp=msp.query('SPLINE')[0]; cp=sp.control_points; chk('Clicar na spline e conferir as extremidades','começa em 150,120 e termina em 260,170 (passa pelos 4 pontos)',tuple(cp[0])[:2]==(150,120) and tuple(cp[-1])[:2]==(260,170))
        chk('Contar os pontos (QSELECT tipo Ponto)','3 pontos em 300,120 · 320,120 · 340,120',len(msp.query('POINT'))==3)
    if nome=='02-texto-e-cotas':
        t=[x for x in msp.query('TEXT') if 'irriga' in x.dxf.text][0]; chk('Ler o texto de altura 5','"Ação de irrigação — 25 °C ± 0,5 ⌀ 50" (acentos, °, ± e ⌀ corretos; no arquivo, °, ± e ⌀ vão como %%d, %%p e %%c, os códigos do AutoCAD)',t.dxf.text.replace('%%d','°').replace('%%p','±').replace('%%c','⌀')=='Ação de irrigação — 25 °C ± 0,5 ⌀ 50')
        mt=msp.query('MTEXT'); chk('Ler o texto múltiplo','duas linhas: "Linha 1" / "Linha 2 com acentuação"',any('acentua' in m.plain_text() for m in mt))
        D=msp.query('DIMENSION'); meas={round(float(x.get_measurement()),4) for x in D}
        chk('Conferir as cotas (clicar e ver Propriedades → Medida)','120 (Standard) · 80 · 144.2221 (alinhada) · R25 · Ø50 · 33.69° (ABNT)',len(D)==6 and {120.0,80.0,round(math.hypot(120,80),4),25.0,50.0,round(math.degrees(math.atan2(80,120)),4)}==meas)
        st=set(x.dxf.dimstyle for x in D); chk('Estilos de cota (DIMSTYLE)','Standard e ABNT existem e são usados',{'Standard','ABNT'}<=st)
        chk('Mover um ponto de definição de uma cota (grip)','o valor da cota acompanha: são cotas associativas/editáveis, não linhas soltas',all(x.dxf.geometry for x in D))
        chk('Linha de chamada com o texto','seta apontando o círculo e o texto "Furo Ø50" (no DXF, a linha de chamada vai como linhas, seta e texto)',any(x.dxf.text.replace('%%c','⌀')=='Furo ⌀50' for x in msp.query('TEXT')) and len(msp.query('SOLID'))>=1)
    if nome=='03-hachuras':
        H=msp.query('HATCH'); nm=[h.dxf.pattern_name for h in H]
        chk('Propriedades de cada hachura → Padrão','ANSI31 · BRICK · EARTH · GRASS · SOLID · EDU_CULTIVO · ANSI37',nm==['ANSI31','BRICK','EARTH','GRASS','SOLID','EDU_CULTIVO','ANSI37'])
        h=dict(zip(nm,H)); chk('Escala e ângulo (Propriedades)','BRICK escala 2 · GRASS escala 0.5 · EARTH ângulo 30°',abs(h['BRICK'].dxf.pattern_scale-2)<1e-9 and abs(h['GRASS'].dxf.pattern_scale-0.5)<1e-9 and abs(h['EARTH'].dxf.pattern_angle-30)<1e-9)
        isl=h['ANSI37']; chk('LIST na hachura com ilha','2 contornos; área %.4f (retângulo 6000 − furo %.4f); o furo fica sem hachura'%(6000-poly_area(ISL),poly_area(ISL)),len(isl.paths)==2)
        chk('Sólido','SOLID preenchido (cor cheia)',h['SOLID'].dxf.solid_fill==1)
        chk('Padrão próprio EDU_CULTIVO','aparece desenhado (linhas guardadas no arquivo, sem precisar do .pat)',h['EDU_CULTIVO'].pattern is not None and len(h['EDU_CULTIVO'].pattern.lines)>0)
    if nome=='04-camadas-e-blocos':
        Ly={l.dxf.name:l for l in d.layers}
        def lw(n): return Ly[n].dxf.lineweight
        chk('LAYER: Paredes','cor 1 (vermelho), Continuous, 0.50 mm',Ly['Paredes'].color==1 and lw('Paredes')==50)
        chk('LAYER: Eixos','cor RGB 0,160,255, CENTER, 0.18 mm',Ly['Eixos'].rgb==(0,160,255) and Ly['Eixos'].dxf.linetype=='CENTER' and lw('Eixos')==18)
        chk('LAYER: Ocultas','cor 3 (verde), HIDDEN, 0.25 mm',Ly['Ocultas'].color==3 and Ly['Ocultas'].dxf.linetype=='HIDDEN')
        chk('LAYER: NaoImprime','não plotável (ícone da impressora desligado)',Ly['NaoImprime'].dxf.plot==0)
        chk('LAYER: Travada e Desligada','Travada com cadeado; Desligada apagada (lâmpada desligada)',Ly['Travada'].is_locked() and Ly['Desligada'].is_off())
        ln=[x for x in msp.query('LINE') if abs(x.dxf.start.y-95)<1e-9][0]
        chk('Propriedades da linha laranja tracejada','cor própria RGB 255,128,0 · DASHED · 0.70 mm (não ByLayer)',ln.rgb==(255,128,0) and ln.dxf.linetype=='DASHED' and ln.dxf.lineweight==70)
        I=msp.query('INSERT'); chk('Bloco MARCO (INSERT / BEDIT)','definição com 3 objetos; 3 inserções',len(I)==3 and len(d.blocks.get('MARCO'))==3)
        i2=[x for x in I if abs(x.dxf.insert.x-40)<1e-9][0]; i3=[x for x in I if abs(x.dxf.insert.x-90)<1e-9][0]
        chk('Propriedades das inserções','em 40,-40: escala 2, rotação 45° · em 90,-40: espelhado (escala X −1)',abs(i2.dxf.xscale-2)<1e-9 and abs(i2.dxf.rotation-45)<1e-6 and (i3.dxf.xscale<0 or i3.dxf.yscale<0 or abs(abs(i3.dxf.rotation)-180)<1e-6))
    if nome=='05-layout-escala':
        L=[x for x in d.layouts.names() if x!='Model']; chk('Abas de layout','existe a aba "Prancha A3"','Prancha A3' in L)
        lay=d.layouts.get('Prancha A3'); pw,ph=lay.dxf.paper_width,lay.dxf.paper_height
        chk('PAGESETUP do layout','papel A3 (420 × 297 mm)',{round(pw),round(ph)}=={420,297})
        V=[v for v in lay.query('VIEWPORT') if v.dxf.id!=1 and v.dxf.status!=1] or list(lay.query('VIEWPORT'))[1:]
        v=V[0]; k=v.dxf.height/v.dxf.view_height
        chk('Propriedades da viewport → Escala padrão','1:100',abs(k-0.01)<1e-9)
        chk('No papel, DIST de um canto a outro do terreno (OSNAP através da viewport)','200.0000 mm (20 m em 1:100)',abs(20000*k-200)<1e-9)
        chk('Carimbo ABNT no layout','bloco do carimbo inserido no papel, com o título',len(lay.query('INSERT'))>=1 or len(lay.query('TEXT MTEXT'))>3)
        chk('No Model, cota da frente do terreno','20000 (estilo ABNT)',any(abs(x.get_measurement()-20000)<1e-6 for x in msp.query('DIMENSION')))
    return C

def node_check(paths):
    nm=A.node_modules
    if not nm or not os.path.isdir(os.path.join(nm,'dxf-parser')) or not shutil.which('node'): return None
    js=r"""
const fs=require('fs'),DxfParser=require('dxf-parser'),{Helper}=require('dxf');const out={};
for(const f of process.argv.slice(1).filter(a=>a.endsWith('.dxf'))){const t=fs.readFileSync(f,'latin1');const r={};
 try{const d=new DxfParser().parseSync(t);const c={};(d.entities||[]).forEach(e=>c[e.type]=(c[e.type]||0)+1);r.parser={ok:true,count:c,layers:Object.keys((d.tables&&d.tables.layer&&d.tables.layer.layers)||{}).length};}catch(e){r.parser={ok:false,err:String(e)};}
 try{const h=new Helper(t);const svg=h.toSVG();fs.writeFileSync(f+'.svg',svg);r.svg={ok:svg.length>200,n:(svg.match(/<(path|circle|ellipse|line|polyline|text)/g)||[]).length};}catch(e){r.svg={ok:false,err:String(e)};}
 out[f]=r;}
console.log(JSON.stringify(out));"""
    env=dict(os.environ,NODE_PATH=nm); r=subprocess.run(['node','-e',js]+paths,capture_output=True,text=True,env=env,timeout=300)
    try: return json.loads(r.stdout)
    except Exception: return {'_erro':r.stderr[-400:]}

with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':850}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.goto('file://'+os.path.abspath(A.alvo)); pg.wait_for_timeout(500); E=pg.evaluate
    if E("document.getElementById('ov-recover')&&document.getElementById('ov-recover').classList.contains('show')"): E("closeOv('ov-recover')")
    versao=E("(document.title.match(/v[\\d.]+/)||['?'])[0]")
    arquivos=[]
    for nome,(js,desc) in DESENHOS.items():
        E(JS_RESET); E(js); E("()=>{if(S.space!=='model')switchSpace('model');zoomFit();}")
        f20=P(nome+'.dxf'); open(f20,'wb').write(bytes(E("Array.from(cp1252Encode(buildDXF2000({})))")))
        f12=P(nome+'-R12.dxf'); open(f12,'wb').write(bytes(E("Array.from(cp1252Encode(buildDXF()))")))
        arquivos.append((nome,desc,f20,f12))
    E(JS_RESET); E(JS_CAL); E("()=>{}")
    pdf=bytes(E("Array.from(buildPDF([curLayout()]))")); open(P('06-calibracao.pdf'),'wb').write(pdf)
    E("()=>{switchSpace('model');}")
    b.close()

# ── pré-validação ────────────────────────────────────────────────────────────
rel=[]; todos_ok=True; exp={}
try:
    import dxfgrabber
except Exception: dxfgrabber=None
for nome,desc,f20,f12 in arquivos:
    r={'nome':nome,'desc':desc,'v':{}}
    for ver,f in (('2000',f20),('R12',f12)):
        d=ezdxf.readfile(f); au=d.audit(); cnt={}
        for e in d.modelspace(): cnt[e.dxftype()]=cnt.get(e.dxftype(),0)+1
        g=None
        if dxfgrabber:
            try: gd=dxfgrabber.readfile(f); g={'ok':True,'n':len(gd.entities)}
            except Exception as ex: g={'ok':False,'err':str(ex)[:120]}
        r['v'][ver]={'arquivo':os.path.basename(f),'versao':d.dxfversion,'audit_erros':len(au.errors),'audit_correcoes':len(au.fixes),'entidades':cnt,'dxfgrabber':g}
        if au.errors: todos_ok=False
    C=esperado(nome,ezdxf.readfile(f20)); r['checks']=C; exp[nome]=C
    if not all(c['ok'] for c in C): todos_ok=False
    rel.append(r)
nd=node_check([a[2] for a in arquivos]+[a[3] for a in arquivos])
# PDF de calibração: página A4 e traços de 100 mm (283,46 pt)
rd=pypdf.PdfReader(P('06-calibracao.pdf')); pgp=rd.pages[0]; mb=pgp.mediabox; content=pgp.get_contents().get_data().decode('latin1')
segs=[tuple(map(float,m)) for m in re.findall(r'(-?[\d.]+) (-?[\d.]+) m (-?[\d.]+) (-?[\d.]+) l',content)]
L100=[s for s in segs if abs(math.hypot(s[2]-s[0],s[3]-s[1])-100/25.4*72)<0.05]
pdfinfo={'pagina_mm':(round(float(mb.width)/72*25.4,1),round(float(mb.height)/72*25.4,1)),'tracos_100mm':len(L100)}
if not (sorted(pdfinfo['pagina_mm'])==[210.0,297.0] and len(L100)>=3): todos_ok=False
# prévias (renderizador independente: pacote npm "dxf")
previas=[]
if nd and not A.sem_previas and '_erro' not in nd:
    os.makedirs(P('previas'),exist_ok=True)
    with sync_playwright() as pw:
        b=pw.chromium.launch(); pg=b.new_page(viewport={'width':900,'height':560})
        for nome,desc,f20,f12 in arquivos:
            s=f20+'.svg'
            if os.path.exists(s):
                svg=open(s,encoding='utf8',errors='replace').read()
                pg.set_content('<html><body style="margin:0;background:#ffffff"><div style="width:900px;height:560px;display:flex;align-items:center;justify-content:center">'+re.sub(r'<svg ','<svg style="max-width:880px;max-height:540px;width:880px;height:540px" ',svg,1)+'</div></body></html>')
                pg.screenshot(path=P('previas',nome+'.png')); previas.append(nome)
        b.close()
for f in os.listdir(OUT):
    if f.endswith('.dxf.svg'): os.remove(P(f))

# ── documentos ───────────────────────────────────────────────────────────────
hoje=datetime.date.today().strftime('%d/%m/%Y')
json.dump({'versao':versao,'data':hoje,'arquivos':{k:[{'o':c['o'],'esperado':c['v']} for c in v] for k,v in exp.items()},'pdf':pdfinfo},open(P('esperado.json'),'w',encoding='utf8'),ensure_ascii=False,indent=1)
R=['# Roteiro de validação externa — EduCAD 2D '+versao,'',
 'Este roteiro confere, em programas de CAD de mercado, os arquivos que o EduCAD gera (R9 do parecer técnico). Leva cerca de 40 minutos por programa.','',
 '**Arquivos do kit** (nesta pasta): `01` a `05` em DXF 2000 (e as versões `-R12.dxf`, para programas antigos), `06-calibracao.pdf`, este roteiro e a planilha `RESULTADOS.md`.','',
 '## 1. AutoCAD e ZWCAD (cada arquivo DXF 2000)','',
 '1. Abra o arquivo (OPEN). Anote se apareceu alguma mensagem de erro ou de recuperação.',
 '2. Digite `AUDIT` e responda **Sim** para corrigir. **Esperado: 0 erros encontrados.**',
 '3. `ZOOM` `E` e compare o desenho com a prévia em `previas/` (quando existir) ou com o próprio EduCAD.',
 '4. Faça as conferências da tabela do arquivo e marque ✓ ou ✗ em `RESULTADOS.md`.',
 '5. Salve como DWG (SAVEAS), feche, reabra o DWG e confira de novo o item 1 da tabela.','']
for r in rel:
    R+=['### '+r['nome']+'.dxf','',r['desc'],'','| # | O que fazer | Valor esperado |','|---|---|---|']
    for i,c in enumerate(r['checks'],1): R.append('| %d | %s | %s |'%(i,c['o'],c['v']))
    R.append('')
R+=['Versões R12 (`-R12.dxf`): basta abrir, rodar `AUDIT` e conferir se o desenho aparece. Em R12 as cotas, hachuras, textos múltiplos e layouts saem simplificados (explodidos) por limitação do formato.','',
 '## 2. PDF medido com régua','',
 '1. Abra `06-calibracao.pdf` e imprima em **tamanho real (100%)**, desmarcando "Ajustar à página" (A4 paisagem).',
 '2. Meça com régua ou paquímetro: a linha horizontal e a vertical (**100,0 mm**), o quadrado (**50 × 50 mm**), o círculo (**Ø 50 mm**) e a linha da viewport 1:50 (**100,0 mm** = 5 m).',
 '3. Tolerância: ±0,5 mm. Diferença maior costuma ser a impressora reduzindo a página; confira a opção de escala.',
 '4. Gere um PDF do layout "Prancha A3" do `05-layout-escala` no EduCAD (aba Layout → PDF) e meça o terreno: **200 mm** em A3.','',
 '## 3. Tablet Android','',
 '1. No Chrome do tablet, abra o endereço do EduCAD no GitHub Pages e use "Instalar aplicativo" (ou "Adicionar à tela inicial").',
 '2. Abra pelo ícone, desligue o Wi-Fi e confirme que o aplicativo abre sem internet.',
 '3. Desenhe com o dedo: um retângulo (REC), um círculo e uma linha; use pinça para zoom e dois dedos para mover.',
 '4. Use os botões da barra de toque (Enter, Esc, Desfazer) e a linha de comando com o teclado virtual (`REC 0,0 @100,50`).',
 '5. Salve o desenho, feche, reabra e use RECUPERAR para conferir o salvamento automático.',
 '6. Exporte um DXF e um PDF e confira se os arquivos aparecem em Downloads.','',
 '## 4. Como registrar','',
 'Preencha `RESULTADOS.md` (uma linha por arquivo e programa) e envie pelo GitHub: edite o arquivo e faça um commit, ou abra uma *issue* com o modelo **Resultado de validação**. Informe a versão do programa (ex.: AutoCAD 2024, ZWCAD 2025) e anexe uma captura de tela quando algo não conferir.','',
 '*Gerado automaticamente por `validacao/gerar_kit.py` em '+hoje+'. Os valores esperados foram conferidos no próprio arquivo antes de entrar neste roteiro.*','']
open(P('ROTEIRO.md'),'w',encoding='utf8').write('\n'.join(R))
if not os.path.exists(P('RESULTADOS.md')):
    T=['# Resultados da validação externa','','Preencha uma linha por arquivo e programa. Resultado: ✓ (tudo conferiu), ⚠ (diferença pequena; descreva) ou ✗ (não abriu ou valor errado).','',
       '| Data | Responsável | Programa e versão | Arquivo | AUDIT (erros) | Conferências ✓ | Resultado | Observações |','|---|---|---|---|---|---|---|---|']
    for r in rel:
        for sw in ('AutoCAD','ZWCAD'): T.append('|  |  | %s ____ | %s.dxf |  | __ de %d |  |  |'%(sw,r['nome'],len(r['checks'])))
    T+=['|  |  | Impressora ____ | 06-calibracao.pdf | — | __ de 5 medidas |  |  |','|  |  | Tablet ____ / Android __ | aplicativo | — | __ de 6 passos |  |  |','']
    open(P('RESULTADOS.md'),'w',encoding='utf8').write('\n'.join(T))
V=['# Pré-validação automática — EduCAD 2D '+versao,'','Feita em '+hoje+' com leitores de DXF independentes do EduCAD, antes da conferência no AutoCAD e no ZWCAD (que só pode ser feita por uma pessoa, com as licenças da instituição).','',
   'Leitores: **ezdxf** '+ezdxf.__version__+' (auditoria completa, igual em espírito ao AUDIT do AutoCAD)'+(', **dxfgrabber** '+str(getattr(dxfgrabber,'VERSION','')) if dxfgrabber else '')+(', **dxf-parser** e **dxf** (Node.js, usados por visualizadores web; o segundo também desenha o arquivo)' if nd and '_erro' not in nd else '')+'.','',
   '| Arquivo | Versão | ezdxf: erros / correções | dxfgrabber | dxf-parser | dxf (desenho) | Entidades no Model |','|---|---|---|---|---|---|---|']
for r in rel:
    for ver in ('2000','R12'):
        x=r['v'][ver]; g=x['dxfgrabber']; n=(nd or {}).get(os.path.join(OUT,x['arquivo'])) if nd else None
        ent=', '.join('%s %d'%(k,v) for k,v in sorted(x['entidades'].items()))
        V.append('| %s | %s | %d / %d | %s | %s | %s | %s |'%(x['arquivo'],x['versao'],x['audit_erros'],x['audit_correcoes'],('lido ('+str(g['n'])+')' if g and g['ok'] else ('falhou: '+g['err'] if g else '—')),
          ('lido' if n and n['parser']['ok'] else ('falhou' if n else '—')),('desenhado ('+str(n['svg'].get('n',0))+' elementos)' if n and n['svg'].get('ok') else ('falhou' if n else '—')),ent))
V+=['','**Valores esperados conferidos no arquivo:** '+str(sum(c['ok'] for r in rel for c in r['checks']))+' de '+str(sum(len(r['checks']) for r in rel))+'.','']
for r in rel:
    bad=[c for c in r['checks'] if not c['ok']]
    if bad: V+=['- ⚠ '+r['nome']+': '+'; '.join(c['o'] for c in bad)]
V+=['','**PDF de calibração:** página %s × %s mm; %d traços de exatamente 100,0 mm encontrados no arquivo.'%(pdfinfo['pagina_mm'][0],pdfinfo['pagina_mm'][1],pdfinfo['tracos_100mm']),'']
if previas: V+=['**Prévias** desenhadas pelo pacote independente `dxf` (não pelo EduCAD), em `previas/`: '+', '.join('`'+p+'.png`' for p in previas)+'.','']
V+=['**Resultado geral:** '+('✓ todos os arquivos foram lidos sem erros e todos os valores esperados conferem.' if todos_ok else '✗ há problemas acima.'),'',
    'O que esta pré-validação **não** substitui: abrir no AutoCAD e no ZWCAD reais, medir a impressão em papel e testar num tablet. Siga `ROTEIRO.md`.','']
open(P('PRE-VALIDACAO.md'),'w',encoding='utf8').write('\n'.join(V))
print('\n'.join(V)); print('Kit gerado em',OUT)
if errs: print('Erros JavaScript:',errs); todos_ok=False
sys.exit(0 if todos_ok else 1)
