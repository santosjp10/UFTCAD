# Testes do DDIM / motor de cotas (v6.2) no Chromium (Playwright).
# Uso: pip install playwright ezdxf && playwright install chromium && python tests/test_cotas.py
import sys, os, json, math
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__))
path=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(HERE,'..','index.html')); R=[]
def ok(n,c,i=''):
    R.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+('  '+str(i) if i!='' else ''))
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':850},accept_downloads=True)
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); PROMPT=[None]
    pg.on('dialog',lambda d:d.accept(PROMPT[0]) if PROMPT[0] is not None else d.accept())
    pg.goto('file://'+path); pg.wait_for_timeout(400); E=pg.evaluate
    ok('Início com área de desenho vazia',E("S.ents.length")==0 and E("document.getElementById('ftitle').textContent")=='Sem título' and E("S.undos.length")==0)
    ok('Estilos padrão Standard e ABNT',E("S.dimStyles.map(s=>s.name)")==['Standard','ABNT'])
    # formatação
    r=E("""()=>{var st=normDimStyle({prec:2,decSep:',',zTrail:true});var a=dimLinearText(1234.5,st).main;
      var st2=normDimStyle({prec:3,zLead:true});var b2=dimLinearText(0.5,st2).main;
      var st3=normDimStyle({tolMethod:'symmetric',tolUpper:0.05,prec:1});var c=dimLinearText(20,st3).main;
      var st4=normDimStyle({tolMethod:'deviation',tolUpper:0.1,tolLower:0.05});var d=dimLinearText(20,st4);
      var st5=normDimStyle({tolMethod:'limits',tolUpper:0.1,tolLower:0.2});var e=dimLinearText(20,st5);
      var st6=normDimStyle({unit:'cm',prec:1,suffix:' cm'});var f=dimLinearText(125,st6).main;
      var st7=normDimStyle({altOn:true,altMult:0.0393701,altPrec:2});var g=dimLinearText(25.4,st7).alt;
      var st8=normDimStyle({scale:100,prec:0});var h=dimLinearText(12.34,st8).main;
      var st9=normDimStyle({angFmt:'dms',angPrec:4});var i=dimAngText(30.5125,st9);
      var st10=normDimStyle({round:0.5,prec:1});var j=dimLinearText(12.26,st10).main;
      return [a,b2,c,[d.main,d.tolUp,d.tolLow],[e.tolUp,e.tolLow],f,g,h,i,j];}""")
    exp=['1234,5','.500','20.0±0.05',['20.00','+0.10','-0.05'],['20.10','19.80'],'12.5 cm','[1.00 in]','1234','30°30\'45"','12.5']
    ok('Formatação: separador, zeros, tolerâncias, unidades, alternativas, DIMLFAC, DMS, arredondamento',r==exp,r)
    # DDIM pela linha de comando
    pg.click('#cmdinput'); pg.keyboard.type('DDIM'); pg.keyboard.press('Enter'); pg.wait_for_timeout(150)
    ok('DDIM abre o gerenciador',E("document.getElementById('ov-dimstyle').classList.contains('show')") and E("document.querySelectorAll('#ddim-list .ddim-item').length")==2)
    
    # Novo estilo
    pg.click("text=Novo…"); pg.wait_for_timeout(100)
    pg.fill('#ddimn-name','Projeto 1:50'); pg.select_option('#ddimn-base','ABNT'); pg.check('#ddimn-cur'); pg.click("text=Continuar…"); pg.wait_for_timeout(150)
    ok('Editor abre com 7 abas',E("document.getElementById('ov-dimedit').classList.contains('show')") and E("document.querySelectorAll('#ddime-tabs .ddim-tab').length")==7)
    # aba Texto: altura
    pg.click("#ddime-tabs .ddim-tab:nth-child(3)"); pg.fill('#ddf-txtH','3.5'); pg.select_option('#ddf-txtAlign','horizontal')
    pg.click("#ddime-tabs .ddim-tab:nth-child(4)"); pg.fill('#ddf-dimscale','2')
    pg.click("#ddime-tabs .ddim-tab:nth-child(5)"); pg.select_option('#ddf-prec','1'); pg.click('#ddf-prefix'); pg.keyboard.type('L=lcz')
    ok('Digitar no editor não dispara atalhos',E("S.tool")=='select')
    pg.click("#ddime-tabs .ddim-tab:nth-child(7)"); pg.select_option('#ddf-tolMethod','symmetric'); pg.fill('#ddf-tolUpper','0.2')
    pg.click("#ddime-tabs .ddim-tab:nth-child(2)"); pg.fill('#ddf-arrowSize','-3')
    ok('Valor inválido é sinalizado',E("document.getElementById('ddf-arrowSize').classList.contains('bad')"))
    pg.fill('#ddf-arrowSize','3'); pg.wait_for_timeout(80)
    
    pg.click("#ov-dimedit >> text=OK"); pg.wait_for_timeout(150)
    st=E("dspGetStyle('Projeto 1:50')")
    ok('Novo estilo salvo com os valores editados e definido como atual',st and st['txtH']==3.5 and st['dimscale']==2 and st['prec']==1 and st['decSep']==',' and st['prefix']=='L=lcz' and st['tolMethod']=='symmetric' and st['arrowSize']==3 and E("S.dimCurrent")=='Projeto 1:50',st and {k:st[k] for k in ['txtH','dimscale','prec','decSep','prefix','tolMethod','arrowSize']})
    pg.click("#ov-dimstyle >> text=Fechar")
    # Cotar com o estilo: linear horizontal de 50 mm
    E("""()=>{setTool('dim');handleClick({x:0,y:0});handleClick({x:50,y:0});S.hover={x:25,y:-20};S.ds.dimDir='h';handleClick({x:25,y:-20});}""")
    r=E("()=>{var e=S.ents[0];return {tp:e.tp,st:e.dimStyle,txt:dimPrims(e).filter(p=>p.k==='text').map(p=>p.txt)};}")
    ok('Cota criada com o estilo atual e texto formatado',r['st']=='Projeto 1:50' and r['txt']==['L=lcz50±0,2'],r)
    # cancelar edição não altera
    E("()=>{DDIM.sel='Projeto 1:50';ddimModify();DDIM.edit.txtH=99;ddimEditCancel();}")
    ok('Cancelar no editor descarta alterações',E("dspGetStyle('Projeto 1:50').txtH")==3.5)
    # modificar estilo atualiza cotas existentes
    E("()=>{DDIM.sel='Projeto 1:50';ddimModify();DDIM.edit.prefix='';DDIM.edit.tolMethod='none';DDIM.edit.prec=2;ddimEditOK();}")
    ok('Modificar estilo atualiza cotas existentes (associativo ao estilo)',E("dimPrims(S.ents[0]).filter(p=>p.k==='text').map(p=>p.txt)")==['50'])
    # tamanho real: texto = txtH*dimscale
    ok('Altura do texto = altura × escala global (mm do desenho)',abs(E("dimPrims(S.ents[0]).find(p=>p.k==='text').h")-7)<1e-9)
    # medida associativa ao objeto: escalar
    E("()=>{S.sel=[S.ents[0].id];scalE(S.ents[0],{x:0,y:0},2);}")
    ok('Escalar a cota atualiza o valor medido',E("dimPrims(S.ents[0]).filter(p=>p.k==='text').map(p=>p.txt)")==['100'])
    # ajuste: cota curta → setas para fora
    r=E("""()=>{var st=normDimStyle({arrowSize:2.5,txtH:2.5});var e={tp:'dim',subtp:'linear',dimDir:'h',x1:0,y1:0,x2:4,y2:0,px:2,py:-5};
      var P=dimPrims(e,st).filter(q=>q.k==='solid');return P.map(q=>q.pts[1].x);}""")
    ok('Ajuste: cota curta leva setas para fora',len(r)==2 and min(r)<0 and max(r)>4,r)
    r=E("""()=>{var st=normDimStyle({arrowSize:2.5,txtH:2.5,fit:'inside'});var e={tp:'dim',subtp:'linear',dimDir:'h',x1:0,y1:0,x2:4,y2:0,px:2,py:-5};
      var P=dimPrims(e,st).filter(q=>q.k==='solid');return P.map(q=>q.pts[1].x);}""")
    ok('Ajuste "manter dentro" respeitado',len(r)==2 and min(r)>0 and max(r)<4,r)
    # supressões e marca de centro
    r=E("""()=>{var st=normDimStyle({se1:true,sd1:true});var e={tp:'dim',subtp:'aligned',x1:0,y1:0,x2:50,y2:0,px:25,py:10};
      var P=dimPrims(e,st);return [P.filter(q=>q.role==='ext').length,P.filter(q=>q.k==='solid').length];}""")
    ok('Supressão de extensão 1 e 1ª metade da linha',r==[1,1],r)
    r=E("""()=>{var st=normDimStyle({centerMark:'line'});var e={tp:'dimd',cx:0,cy:0,ex:5,ey:0,val:'40'};return dimPrims(e,st).filter(q=>q.role==='cen').length;}""")
    ok('Marca de centro tipo linha',r==6,r)
    # angular: valor e escolha do setor pelo cursor
    r=E("""()=>{var e={tp:'dima',vx:0,vy:0,x1:10,y1:0,x2:0,y2:10,px:5,py:5};var a=dimMeasure(e);e.px=-5;e.py=-5;var b=dimMeasure(e);return [a,b];}""")
    ok('Cota angular: 90° ou 270° conforme o lado do cursor',abs(r[0]-90)<1e-9 and abs(r[1]-270)<1e-9,r)
    # excluir em uso bloqueado / renomear propaga
    E("()=>{DDIM.sel='Projeto 1:50';ddimDelete();}")
    ok('Estilo em uso não pode ser excluído',E("!!dspGetStyle('Projeto 1:50')"))
    PROMPT[0]='Escala 1:50'
    E("()=>{S.dimCurrent='Standard';DDIM.sel='Projeto 1:50';ddimRename();}"); PROMPT[0]=None
    ok('Renomear propaga para as cotas',E("S.ents[0].dimStyle")=='Escala 1:50' and E("!!dspGetStyle('Escala 1:50')"))
    # aplicar estilo à seleção (com undo)
    E("()=>{S.sel=[S.ents[0].id];DDIM.sel='ABNT';ddimApplySel();}")
    ok('Aplicar à seleção',E("S.ents[0].dimStyle")=='ABNT'); E("undo()")
    ok('Aplicar à seleção pode ser desfeito',E("S.ents[0].dimStyle")=='Escala 1:50')
    # salvar/abrir com estilos
    doc={'v':'6.2','ents':E("S.ents"),'layers':E("S.layers"),'dimStyles':E("S.dimStyles"),'dimCurrent':'Escala 1:50'}
    open(os.path.join(HERE,'_d62.json'),'w').write(json.dumps(doc))
    E("()=>{S.dimStyles=dimDefaultStyles();S.dimCurrent='Standard';}")
    pg.set_input_files('#fileInput',os.path.join(HERE,'_d62.json')); pg.wait_for_timeout(250)
    ok('Estilos salvos e restaurados com o arquivo',E("S.dimCurrent")=='Escala 1:50' and E("dspGetStyle('Escala 1:50').txtH")==3.5 and E("document.getElementById('propDS').value")=='Escala 1:50')
    old={'ents':[{'id':'e1001','tp':'dim','x1':0,'y1':0,'x2':60,'y2':0,'off':-20,'val':'60.00','dimStyle':'Standard','ly':2}],'layers':E("S.layers")}
    open(os.path.join(HERE,'_old.json'),'w').write(json.dumps(old)); pg.set_input_files('#fileInput',os.path.join(HERE,'_old.json')); pg.wait_for_timeout(250)
    ok('Arquivo antigo (sem estilos, cota legada) abre com padrões',E("S.dimStyles.map(s=>s.name)")==['Standard','ABNT'] and E("dimPrims(S.ents[0]).filter(p=>p.k==='text').map(p=>p.txt)")==['60.00'])
    # novo documento redefine estilos
    E("()=>{S.dimStyles.push(normDimStyle({name:'X'}));S.ents=[];newDoc();}")
    ok('Novo documento usa estilos padrão',E("S.dimStyles.map(s=>s.name)")==['Standard','ABNT'])
    # painel de propriedades
    E("()=>{addE({tp:'dimr',cx:0,cy:0,ex:30,ey:10,val:'20',dimStyle:'Standard',ly:2});S.sel=[S.ents[0].id];propDimStyleChange('ABNT');}")
    ok('Painel de propriedades aplica estilo às cotas selecionadas',E("S.ents[0].dimStyle")=='ABNT' and E("S.dimCurrent")=='ABNT')
    # seleção por clique na cota (texto)
    r=E("()=>{var t=dimPrims(S.ents[0]).find(p=>p.k==='text');return dimHit(S.ents[0],t.x+0.5,t.y+0.5,0.5);}")
    ok('Clique no texto da cota seleciona a cota',r)
    # exportação com cotas
    E("""()=>{S.ents=[];S.dimCurrent='ABNT';var st=dspGetStyle('ABNT');st.tolMethod='deviation';st.altOn=true;st.txtFill=true;
      addE({tp:'line',x1:0,y1:0,x2:80,y2:0});addE({tp:'dim',subtp:'linear',dimDir:'h',x1:0,y1:0,x2:80,y2:0,px:40,py:-15,dimStyle:'ABNT',ly:2});
      addE({tp:'dimd',cx:0,cy:40,ex:30,ey:60,val:'30',dimStyle:'ABNT',ly:2});addE({tp:'dima',vx:0,vy:0,x1:20,y1:0,x2:10,y2:17,px:12,py:6,dimStyle:'ABNT',ly:2});}""")
    open(os.path.join(HERE,'_d.dxf'),'w').write(E("buildDXF()")); svg=E("buildSVG()"); open(os.path.join(HERE,'_d.svg'),'w').write(svg)
    from ezdxf import recover
    d,a=recover.readfile(os.path.join(HERE,'_d.dxf')); txts=[e.dxf.text for e in d.modelspace().query('TEXT')]
    ok('DXF com cotas válido e com textos formatados',not a.errors and '80 [3,15 in]' in txts and '+0,1' in txts and any(t.startswith('%%c30') for t in txts),txts)
    import xml.dom.minidom; xml.dom.minidom.parseString(svg.encode()); ok('SVG com cotas bem-formado',True)
    E("switchSpace('layout')"); pg.wait_for_timeout(300); E("switchSpace('model')")
    E("()=>{zoomFit();}"); pg.wait_for_timeout(100); 
    ok('Sem erros JavaScript',not errs,errs)
    b.close()
for _f in ('_d62.json','_old.json','_d.dxf','_d.svg'):
    try: os.remove(os.path.join(HERE,_f))
    except OSError: pass
f=[n for n,c in R if not c]; print(f'\n{len(R)-len(f)}/{len(R)} testes OK'); sys.exit(1 if f else 0)
