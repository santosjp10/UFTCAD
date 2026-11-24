// ── CLICK HANDLER ────────────────────────────────────────────
function handleClick(pt) {
  var ds=S.ds, tool=S.tool;
  if(ncIs(tool)){ ncClick(pt); return; } // v7.0: motor de comandos
  if(tool==='polyline'&&ds&&ds.arcMode&&ds.pts&&ds.pts.length){ plineClick(pt); return; } // v7.1
  switch(tool) {

    /* ─── DRAW TOOLS ─────────────────────── */
    case 'line':
      if(!ds){
        // Primeiro ponto: iniciar cadeia
        S.ds={pts:[{x:pt.x,y:pt.y}],segs:0,firstPt:{x:pt.x,y:pt.y}};
        log('LINE: P1=('+pt.x.toFixed(2)+','+pt.y.toFixed(2)+')  Próximo ponto, dist ou @dx,dy:','ok');
        logp('Especifique o próximo ponto:');
      } else {
        // Próximos pontos: encadear a partir do ÚLTIMO ponto
        var lp=ds.pts[ds.pts.length-1];
        var ld=Math.hypot(pt.x-lp.x,pt.y-lp.y);
        if(ld<0.001) break;
        addE({tp:'line',x1:lp.x,y1:lp.y,x2:pt.x,y2:pt.y});
        ds.segs=(ds.segs||0)+1;
        var ang=((Math.atan2(pt.y-lp.y,pt.x-lp.x)*180/Math.PI)+360)%360;
        log('L='+ld.toFixed(2)+'mm  ∠'+ang.toFixed(1)+'°  ('+pt.x.toFixed(2)+','+pt.y.toFixed(2)+')','ok');
        // Manter firstPt para permitir fechar com C
        var fp=ds.firstPt;
        ds.hist=(ds.hist||[]);ds.hist.push({x:lp.x,y:lp.y});
        ds.pts=[{x:pt.x,y:pt.y}];
        ds.firstPt=fp;
        logp('Próximo ponto ('+ds.segs+' seg) | U=desfazer | C=fechar | Enter=fim:');
      }
      break;

    case 'polyline':
      if(!ds){S.ds={pts:[{x:pt.x,y:pt.y}]};logp('Próximo ponto (Enter=fim):');}
      else{ds.pts.push({x:pt.x,y:pt.y});logp('Ponto '+(ds.pts.length)+' (Enter=fim):');}
      break;

    case 'rectangle':
      if(!ds){S.ds={pts:[{x:pt.x,y:pt.y}]};logp('Canto oposto:');}
      else{
        var p1=ds.pts[0],x=Math.min(p1.x,pt.x),y=Math.min(p1.y,pt.y);
        addE({tp:'rect',x:x,y:y,w:Math.abs(pt.x-p1.x),h:Math.abs(pt.y-p1.y)});
        log('Retângulo '+Math.abs(pt.x-p1.x).toFixed(2)+'×'+Math.abs(pt.y-p1.y).toFixed(2)+'mm','ok');
        S.ds=null; logp('Primeiro canto:');
      }
      break;

    case 'circle':
      if(!ds){S.ds={pts:[{x:pt.x,y:pt.y}]};logp('Ponto no raio:');}
      else{
        var c=ds.pts[0],r=Math.hypot(pt.x-c.x,pt.y-c.y);
        addE({tp:'circ',cx:c.x,cy:c.y,r:r});
        log('Círculo r='+r.toFixed(3)+'mm  ⌀='+(r*2).toFixed(3)+'mm','ok');
        S.ds=null; logp('Centro:');
      }
      break;

    case 'arc':
      if(!ds){S.ds={pts:[{x:pt.x,y:pt.y}]};logp('Ponto final:');}
      else if(ds.pts.length===1){ds.pts.push({x:pt.x,y:pt.y});logp('Ponto de passagem:');}
      else{
        var p1=ds.pts[0],p2=ds.pts[1],p3=pt;
        var D=2*(p1.x*(p2.y-p3.y)+p2.x*(p3.y-p1.y)+p3.x*(p1.y-p2.y));
        if(Math.abs(D)>1e-8){
          var a1=p1.x*p1.x+p1.y*p1.y,a2=p2.x*p2.x+p2.y*p2.y,a3=p3.x*p3.x+p3.y*p3.y;
          var cx=(a1*(p2.y-p3.y)+a2*(p3.y-p1.y)+a3*(p1.y-p2.y))/D;
          var cy=(a1*(p3.x-p2.x)+a2*(p1.x-p3.x)+a3*(p2.x-p1.x))/D;
          var r=Math.hypot(p1.x-cx,p1.y-cy);
          // v6.1: o arco passa pelo 2º ponto — se os pontos estão em sentido horário, inverter
          var _sa=Math.atan2(p1.y-cy,p1.x-cx),_ea=Math.atan2(p3.y-cy,p3.x-cx);
          var _cr=(p2.x-p1.x)*(p3.y-p2.y)-(p2.y-p1.y)*(p3.x-p2.x);
          if(_cr<0){var _t=_sa;_sa=_ea;_ea=_t;}
          addE({tp:'arc',cx:cx,cy:cy,r:r,sa:_sa,ea:_ea});
          log('Arco r='+r.toFixed(3),'ok');
        }
        S.ds=null;
      }
      break;

    case 'ellipse':
      if(!ds){S.ds={pts:[{x:pt.x,y:pt.y}]};logp('Eixo maior:');}
      else if(ds.pts.length===1){ds.pts.push({x:pt.x,y:pt.y});logp('Semi-eixo menor:');}
      else{
        // v6.1: eixo maior com qualquer inclinação; 3º ponto = distância ao outro eixo
        var c=ds.pts[0],ax=ds.pts[1].x-c.x,ay=ds.pts[1].y-c.y,rx=Math.hypot(ax,ay);
        if(rx<1e-9) break;
        var ry=Math.abs((pt.x-c.x)*(-ay/rx)+(pt.y-c.y)*(ax/rx));
        if(ry<1e-9) break;
        addE({tp:'ell',cx:c.x,cy:c.y,rx:rx,ry:ry,rot:Math.atan2(ay,ax)});
        log('Elipse '+rx.toFixed(2)+'×'+ry.toFixed(2),'ok'); S.ds=null;
      }
      break;

    case 'text':
      S.ds={pts:[{x:pt.x,y:pt.y}]};
      document.getElementById('ov-text').classList.add('show');
      break;

    case 'polygon':
      if(!ds){
        // Não deve chegar aqui normalmente (o modal faz o setup)
        startPolygon(); break;
      }
      if(ds.method==='edge'){
        if(!ds.p1){
          ds.p1={x:pt.x,y:pt.y};
          logp('POL: 2º vértice da aresta:');
        } else {
          // Gerar polígono a partir dos dois pontos da aresta
          var sides=ds.sides;
          var ex=pt.x-ds.p1.x, ey=pt.y-ds.p1.y;
          var edgeLen=Math.hypot(ex,ey);
          // Centro está perpendicular ao meio da aresta
          var mx=(ds.p1.x+pt.x)/2, my=(ds.p1.y+pt.y)/2;
          // ângulo da aresta e ângulo para o centro
          var edgeAng=Math.atan2(ey,ex);
          // Para polígono regular: distância do centro ao meio da aresta
          var r=edgeLen/(2*Math.tan(Math.PI/sides)); // apótema
          // o centro fica perpendicular à aresta, 90° à esquerda
          var cx2=mx-r*Math.sin(edgeAng), cy2=my+r*Math.cos(edgeAng);
          // raio para vértices = circunraio
          var R=edgeLen/(2*Math.sin(Math.PI/sides));
          // ângulo do 1º vértice (p1)
          var startAng=Math.atan2(ds.p1.y-cy2,ds.p1.x-cx2);
          var pts2=[];
          for(var i=0;i<sides;i++){
            var a=startAng+i*(2*Math.PI/sides);
            pts2.push({x:cx2+R*Math.cos(a),y:cy2+R*Math.sin(a)});
          }
          pts2.push({x:pts2[0].x,y:pts2[0].y}); // fechar
          addE({tp:'pl',pts:pts2,closed:true});
          log('Polígono '+sides+' lados (aresta='+edgeLen.toFixed(2)+'mm).','ok');
          S.ds=null; logp('POL: 1º vértice da aresta:');
        }
      } else {
        // Centro definido → usar distância do cursor como raio
        if(!ds.center){
          ds.center={x:pt.x,y:pt.y};
          logp('POL: raio (clique ou digite valor):');
        } else {
          var r2=Math.hypot(pt.x-ds.center.x,pt.y-ds.center.y);
          if(r2<0.001) break;
          polyBuild(ds.center,r2,ds.sides,ds.method,
                    Math.atan2(pt.y-ds.center.y,pt.x-ds.center.x));
          S.ds=null; logp('POL: centro:');
        }
      }
      break;

    case 'spline':
      if(!ds){
        S.ds={pts:[{x:pt.x,y:pt.y}]};
        logp('SPLINE: próximo ponto (Enter=finalizar, mín. 2 pts):');
      } else {
        ds.pts.push({x:pt.x,y:pt.y});
        logp('SPLINE: ponto '+(ds.pts.length)+' (Enter=finalizar):');
      }
      break;

    case 'hatch':
      if(!ds){S.ds={pts:[{x:pt.x,y:pt.y}]};logp('HATCH: canto oposto:');}
      else{
        var p1=ds.pts[0];
        var pat=S.hatchPat||{ang:45,sp:5,type:'lines'};
        addE({tp:'hatch',x:Math.min(p1.x,pt.x),y:Math.min(p1.y,pt.y),
              w:Math.abs(pt.x-p1.x),h:Math.abs(pt.y-p1.y),
              ang:pat.ang,sp:pat.sp,htype:pat.type,col:S.style.col});
        log('Hachura "'+pat.name+'" inserida','ok'); S.ds=null;
      }
      break;

    /* ─── ARRAY POLAR/PATH CLICK ─────────────────────────────── */
    case '_arrayPolar':
      doArrayPolar(pt);
      break;
    case '_arrayPath':
      // click on path entity
      var pathHit=null;for(var i=S.ents.length-1;i>=0;i--){var e=S.ents[i];if(['line','pl','arc','circ'].indexOf(e.tp)>=0&&S.ds.sel.indexOf(e.id)<0&&hitEnt(e,pt.x,pt.y)){pathHit=e;break;}}
      if(pathHit){doArrayPath(pathHit);}
      else log('Clique em um objeto de caminho (linha/polilinha/arco/círculo).','inf');
      break;

    /* ─── DIM TOOLS ──────────────────────── */
    /* ─── COTAS ─────────────────────────────────────────────────
       Fluxo: p1 → p2 → mover cursor para posicionar → clique confirma
       O preview completo (linhas, setas, valor) acompanha o cursor
    ─────────────────────────────────────────────────────────────── */
    case 'dim':
      // ── COTA LINEAR (DIMLINEAR) ─────────────────────────────
      // Mede a distância horizontal OU vertical conforme posição do cursor
      if(!ds){
        S.ds={pts:[{x:pt.x,y:pt.y}],phase:'p2'};
        logp('DIMLINEAR: 2º ponto (ou Enter para selecionar objeto):');
      } else if(ds.phase==='p2'){
        ds.pts.push({x:pt.x,y:pt.y});
        ds.phase='pos';
        // Pré-calcular direção H/V com base no cursor atual — será atualizada no hover
        ds.dimDir=dimLinearDir(ds.pts[0],ds.pts[1],pt);
        var d0=Math.hypot(ds.pts[1].x-ds.pts[0].x,ds.pts[1].y-ds.pts[0].y);
        log('DIMLINEAR: '+d0.toFixed(2)+'mm — mova para posicionar (H ou V segue o cursor):','ok');
        logp('DIMLINEAR: clique na posição da linha de cota, ou digite a distância ao 2º ponto (ex.: 10) [H/V]:');
      } else if(ds.phase==='pos'){
        var p1=ds.pts[0],p2=ds.pts[1];
        // Usar a direção já fixada pelo preview (ds.dimDir), não recalcular aqui.
        // Isso garante que o clique confirma exatamente o que o usuário viu no preview.
        // v8.1: ponto digitado (sem pré-visualização pelo cursor) decide a direção pela posição digitada
        var dir=ds.forceDir||((ds.dirHover&&ds.dimDir&&!S._typedPt)?ds.dimDir:dimLinearDir(p1,p2,pt)); // v8.9: H/V forçado // v8.7: ponto digitado sempre decide pela posição digitada
        // Valor medido: horizontal mede |Δx|, vertical mede |Δy|
        var measuredVal=dir==='h'?Math.abs(p2.x-p1.x):Math.abs(p2.y-p1.y);
        addE({tp:'dim',subtp:'linear',dimDir:dir,
              x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,
              px:pt.x,py:pt.y,
              val:measuredVal.toFixed(2),unit:'mm',
              col:curDimStyle().col,dimStyle:S.dimCurrent,ly:2});
        log('DIMLINEAR: '+measuredVal.toFixed(2)+'mm ('+(dir==='h'?'horizontal':'vertical')+')','ok');
        S.ds=null; logp('DIMLINEAR: 1º ponto:');
      }
      break;

    case 'dimali':
      // ── COTA ALINHADA (DIMALIGNED) ──────────────────────────
      // A linha de cota fica paralela ao segmento real, mede comprimento real
      if(!ds){
        S.ds={pts:[{x:pt.x,y:pt.y}],phase:'p2'};
        logp('DIMALIGNED: 2º ponto:');
      } else if(ds.phase==='p2'){
        ds.pts.push({x:pt.x,y:pt.y});
        ds.phase='pos';
        var d0=Math.hypot(ds.pts[1].x-ds.pts[0].x,ds.pts[1].y-ds.pts[0].y);
        log('DIMALIGNED: '+d0.toFixed(2)+'mm — mova para posicionar:','ok');
        logp('DIMALIGNED: clique na posição da linha de cota, ou digite a distância ao 2º ponto (ex.: 10):');
      } else if(ds.phase==='pos'){
        var p1=ds.pts[0],p2=ds.pts[1];
        var d=Math.hypot(p2.x-p1.x,p2.y-p1.y);
        addE({tp:'dim',subtp:'aligned',
              x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,
              px:pt.x,py:pt.y,
              val:d.toFixed(2),unit:'mm',
              col:curDimStyle().col,dimStyle:S.dimCurrent,ly:2});
        log('DIMALIGNED: '+d.toFixed(2)+'mm','ok');
        S.ds=null; logp('DIMALIGNED: 1º ponto:');
      }
      break;

    case 'dimr':
      if(!ds){
        S.ds={pts:[{x:pt.x,y:pt.y}],phase:'p2'};
        logp('DIMR: ponto no círculo/arco:');
      } else if(ds.phase==='p2'){
        var c=ds.pts[0],r=Math.hypot(pt.x-c.x,pt.y-c.y);
        if(r<0.001) break;
        ds.pts.push({x:pt.x,y:pt.y});
        ds.phase='pos';
        log('DIMR: R='+r.toFixed(2)+'mm — mova para posicionar:','ok');
        logp('DIMR: clique para confirmar:');
      } else if(ds.phase==='pos'){
        var c=ds.pts[0],ep=ds.pts[1];
        var r=Math.hypot(ep.x-c.x,ep.y-c.y);
        addE({tp:'dimr',cx:c.x,cy:c.y,ex:pt.x,ey:pt.y,val:r.toFixed(2),unit:'mm',col:curDimStyle().col,dimStyle:S.dimCurrent,ly:2});
        log('DIMR: R'+r.toFixed(2),'ok'); S.ds=null; logp('DIMR: centro:');
      }
      break;

    case 'dimd':
      if(!ds){
        S.ds={pts:[{x:pt.x,y:pt.y}],phase:'p2'};
        logp('DIMD: ponto no círculo:');
      } else if(ds.phase==='p2'){
        var c=ds.pts[0],r=Math.hypot(pt.x-c.x,pt.y-c.y);
        if(r<0.001) break;
        ds.pts.push({x:pt.x,y:pt.y});
        ds.phase='pos';
        log('DIMD: ⌀='+(r*2).toFixed(2)+'mm — mova para posicionar:','ok');
        logp('DIMD: clique para confirmar:');
      } else if(ds.phase==='pos'){
        var c=ds.pts[0],ep=ds.pts[1];
        var r=Math.hypot(ep.x-c.x,ep.y-c.y);
        addE({tp:'dimd',cx:c.x,cy:c.y,ex:pt.x,ey:pt.y,val:(r*2).toFixed(2),unit:'mm',col:curDimStyle().col,dimStyle:S.dimCurrent,ly:2});
        log('DIMD: ⌀'+(r*2).toFixed(2),'ok'); S.ds=null; logp('DIMD: centro:');
      }
      break;

    case 'dima':
      if(!ds){
        S.ds={pts:[{x:pt.x,y:pt.y}],phase:'p2'};
        logp('DIMA: 1º ponto do ângulo:');
      } else if(ds.phase==='p2'){
        ds.pts.push({x:pt.x,y:pt.y});
        ds.phase='p3';
        logp('DIMA: 2º ponto do ângulo:');
      } else if(ds.phase==='p3'){
        ds.pts.push({x:pt.x,y:pt.y});
        ds.phase='pos';
        var v2=ds.pts[0],pa=ds.pts[1],pb=ds.pts[2];
        var ang2=Math.abs((Math.atan2(pb.y-v2.y,pb.x-v2.x)-Math.atan2(pa.y-v2.y,pa.x-v2.x))*180/Math.PI);
        if(ang2>180) ang2=360-ang2;
        ds.angVal=ang2.toFixed(1);
        log('DIMA: '+ang2.toFixed(1)+'° — mova para posicionar:','ok');
        logp('DIMA: clique para confirmar:');
      } else if(ds.phase==='pos'){
        var v2=ds.pts[0],pa=ds.pts[1],pb=ds.pts[2];
        var _ae={tp:'dima',x1:pa.x,y1:pa.y,vx:v2.x,vy:v2.y,x2:pb.x,y2:pb.y,px:pt.x,py:pt.y,unit:'°',col:curDimStyle().col,dimStyle:S.dimCurrent,ly:2};
        _ae.val=dimMeasure(_ae).toFixed(4);
        addE(_ae);
        log('DIMA: '+dimAngText(parseFloat(_ae.val),curDimStyle()),'ok'); S.ds=null; logp('DIMA: vértice:');
      }
      break;

    /* ─── MEASURE TOOLS ─────────────────────── */
    case 'dist':
      if(!ds){
        S.ds={pts:[{x:pt.x,y:pt.y}]};
        logp('DIST: 2º ponto:');
      } else {
        var p1=ds.pts[0],dx=pt.x-p1.x,dy=pt.y-p1.y;
        var dist=Math.hypot(dx,dy);
        var ang=((Math.atan2(dy,dx)*180/Math.PI)+360)%360;
        log('DISTÂNCIA: '+dist.toFixed(4)+'mm  |  ΔX='+Math.abs(dx).toFixed(4)+'mm  ΔY='+Math.abs(dy).toFixed(4)+'mm  ∠='+ang.toFixed(2)+'°','ok');
        S.ds=null;logp('DIST: 1º ponto:');
      }
      break;

    case 'area':
      if(!ds){
        S.ds={pts:[{x:pt.x,y:pt.y}]};
        logp('ÁREA: próximo ponto (Enter=calcular, mín 3 pts):');
      } else {
        ds.pts.push({x:pt.x,y:pt.y});
        if(ds.pts.length>=3)
          logp('ÁREA: ponto '+ds.pts.length+' (Enter=calcular):');
        else
          logp('ÁREA: ponto '+ds.pts.length+' (mais 1 ponto p/ calcular):');
      }
      break;

    /* ─── EDIT TOOLS ─────────────────────── */
    case 'move':
      if(!ds){
        if(!S.sel.length){log('Selecione objetos antes de mover (Esc→sel→M).','er');break;}
        S.ds={pts:[{x:pt.x,y:pt.y}]}; logp('Ponto de destino:');
      } else {
        snapshot(); var dx=pt.x-ds.pts[0].x,dy=pt.y-ds.pts[0].y;
        for(var i=0;i<S.sel.length;i++){var e=findE(S.sel[i]);if(e)transl(e,dx,dy);}
        log('Movido Δ('+dx.toFixed(2)+','+dy.toFixed(2)+')','ok'); S.ds=null; renderAll();
      }
      break;
    case 'copy':
      if(!ds){
        // Sem estado: primeiro clique define seleção OU ponto base
        if(!S.sel.length){
          // Sem seleção: clicar num objeto para selecioná-lo
          var hit=null;
          for(var i=S.ents.length-1;i>=0;i--){if(hitEnt(S.ents[i],pt.x,pt.y)){hit=S.ents[i];break;}}
          if(hit){
            S.sel=[hit.id];
            S.ds={phase:'pickbase',copies:0};
            log('COPY: 1 objeto selecionado. Clique no ponto base:','ok');
            logp('COPY: ponto base:');
          } else {
            log('COPY: clique em um objeto para selecioná-lo.','inf');
          }
        } else {
          // Com seleção prévia: este clique é o ponto base
          S.ds={phase:'pickbase',copies:0};
          log('COPY: '+S.sel.length+' obj. Clique no ponto base:','ok');
          logp('COPY: ponto base:');
        }
      } else if(ds.phase==='pickbase'){
        // Aguardando ponto base
        S.ds.phase='dest';
        S.ds.base={x:pt.x,y:pt.y};
        log('COPY: base=('+pt.x.toFixed(2)+','+pt.y.toFixed(2)+')','ok');
        logp('COPY: ponto de destino (múltiplos cliques=várias cópias | Enter=fim):');
      } else if(ds.phase==='dest'){
        // Cada clique gera uma cópia mantendo o mesmo ponto base
        snapshot();
        var dx=pt.x-ds.base.x, dy=pt.y-ds.base.y;
        var dist=Math.hypot(dx,dy);
        var ang=((Math.atan2(dy,dx)*180/Math.PI)+360)%360;
        var copies=[];
        for(var i=0;i<S.sel.length;i++){
          var e=findE(S.sel[i]);
          if(e){var c=clon(e);transl(c,dx,dy);copies.push(c);}
        }
        for(var i=0;i<copies.length;i++) S.ents.push(copies[i]);
        ds.copies=(ds.copies||0)+1;
        log('Cópia '+ds.copies+': L='+dist.toFixed(2)+'mm  ∠'+ang.toFixed(1)+'°','ok');
        logp('COPY: próximo destino ('+ds.copies+' cópia(s)) | Enter=fim:');
        renderAll();
      }
      break;
    case 'rotate':
      if(!S.sel.length){log('Selecione objetos primeiro.','er');break;}
      var ag=prompt('Ângulo de rotação (graus):','90');
      if(ag!==null){snapshot();var rad=parseFloat(ag)*Math.PI/180;for(var i=0;i<S.sel.length;i++){var e=findE(S.sel[i]);if(e)rotat(e,pt,rad);}log('Rotacionado '+ag+'°','ok');renderAll();}
      break;
    case 'mirror':
      if(!ds){
        if(!S.sel.length){log('Selecione objetos primeiro.','er');break;}
        S.ds={pts:[{x:pt.x,y:pt.y}]}; logp('Segundo ponto do eixo:');
      } else {
        snapshot();var p1=ds.pts[0];var copies=[];
        for(var i=0;i<S.sel.length;i++){var e=findE(S.sel[i]);if(e){var c=clon(e);mirr(c,p1,pt);copies.push(c);}}
        for(var i=0;i<copies.length;i++) S.ents.push(copies[i]);
        log('Espelhado '+copies.length+' obj.','ok'); S.ds=null; renderAll();
      }
      break;
    case 'scale':
      if(!S.sel.length){log('Selecione objetos primeiro.','er');break;}
      var f=parseFloat(prompt('Fator de escala:','2'));
      if(!isNaN(f)&&f>0){snapshot();for(var i=0;i<S.sel.length;i++){var e=findE(S.sel[i]);if(e)scalE(e,pt,f);}log('Escala ×'+f,'ok');renderAll();}
      break;
    case 'offset':
      if(!S.ds){
        log('OFFSET: informe a distância na linha de comando e pressione Enter.','inf');
      } else if(S.ds.phase==='pick'){
        // Fase 2: selecionar o objeto base
        var hit=null;
        for(var i=S.ents.length-1;i>=0;i--){
          if(hitEnt(S.ents[i],pt.x,pt.y)){hit=S.ents[i];break;}
        }
        if(!hit){log('Nenhum objeto no ponto clicado. Tente novamente.','inf');break;}
        if(OFFSET_TYPES.indexOf(hit.tp)<0){log('OFFSET: tipo "'+hit.tp+'" não suportado (linha, círculo, arco, retângulo, elipse, polilinha).','er');break;}
        S.ds.phase='side';
        S.ds.base=hit;
        log('[OFFSET] Objeto: '+hit.tp+' selecionado.','ok');
        logp('OFFSET: clique no lado para deslocar (Esc=cancelar objeto):');
      } else if(S.ds.phase==='side'){
        // Fase 3: clique define o lado → gera o offset
        var hit=S.ds.base;
        var d=S.ds.dist;
        var dSigned=offsetSide(hit,pt.x,pt.y,d);
        var c=clon(hit);
        if(!offsE(c,dSigned)){log('OFFSET: distância maior que o raio/dimensão do objeto.','er');S.ds.phase='pick';S.ds.base=null;break;}
        snapshot();
        S.ents.push(c);
        renderAll();
        log('Offset '+d.toFixed(2)+'mm criado.','ok');
        // voltar para fase pick (selecionar próximo objeto)
        S.ds.phase='pick';
        S.ds.base=null;
        logp('OFFSET d='+d.toFixed(2)+'mm: selecione o próximo objeto (Enter=nova dist, Esc=sair):');
      }
      break;

    /* ─── TRIM / EXTEND (v6.8: modo Rápido do AutoCAD) ────────── */
    case 'trim':case 'extend': teClick(pt); break;

    /* ─── FILLET (v6.7: fluxo do AutoCAD) ─────────────────────── */
    case 'fillet': filletClick(pt); break;

    /* ─── CHAMFER ────────────────────────────────────────────── */
    case 'chamfer':
      if(!S.ds){
        S.ds={phase:'l1',d1:S.chamferD1||5,d2:S.chamferD2||5};
        document.getElementById('fillet-title').textContent='Chamfer — d1='+S.ds.d1+' d2='+S.ds.d2+'mm';
        document.getElementById('fillet-lbl').textContent='Distância 1 (mm):';
        document.getElementById('fillet-note').textContent='Após OK, clique na 1ª linha depois na 2ª.';
        document.getElementById('ov-fillet').classList.add('show');
      } else if(S.ds.phase==='l1'){
        var hit=null;for(var i=S.ents.length-1;i>=0;i--){var e=S.ents[i];if(e.tp==='line'&&hitEnt(e,pt.x,pt.y)){hit=e;break;}}
        if(hit){S.ds.e1=hit;S.ds.pt1={x:pt.x,y:pt.y};S.ds.phase='l2';log('[CHAMFER] 1ª linha: '+hit.id,'ok');logp('CHAMFER: clique na 2ª linha:');}
        else log('Clique em uma linha.','inf');
      } else if(S.ds.phase==='l2'){
        var hit=null;for(var i=S.ents.length-1;i>=0;i--){var e=S.ents[i];if(e.tp==='line'&&e.id!==S.ds.e1.id&&hitEnt(e,pt.x,pt.y)){hit=e;break;}}
        if(hit){doChamfer(S.ds.e1,hit,S.ds.d1,S.ds.d2,S.ds.pt1,{x:pt.x,y:pt.y});S.ds=null;logp('CHAMFER: 1ª linha:');}
        else log('Clique em uma 2ª linha diferente.','inf');
      }
      break;
  }
  renderAll();
}

