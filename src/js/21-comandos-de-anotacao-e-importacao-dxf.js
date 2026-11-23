// ── Editor de texto (MTEXT, LEADER, edição de textos) ───────────────────────
var MTED={cb:null};
function mtEditorOpen(opts,cb){
  MTED.cb=cb;
  document.getElementById('mted-title').textContent=opts.title||'Editor de texto';
  document.getElementById('mted-txt').value=opts.txt||'';
  document.getElementById('mted-h').value=opts.h||2.5;
  document.getElementById('mted-att').value=String(opts.att||1);
  document.getElementById('mted-row-att').style.display=opts.noAtt?'none':'';
  document.getElementById('mted-row-h').style.display=opts.noH?'none':'';
  document.getElementById('mted-row-an').style.display=opts.noH?'none':'';
  document.getElementById('mted-annot').checked=opts.annot!==undefined?!!opts.annot:!!S.mtAnnot;
  document.getElementById('ov-mtext').classList.add('show');
  setTimeout(function(){ var t=document.getElementById('mted-txt'); t.focus(); t.select(); },30);
}
function mtEditorOK(){
  var txt=document.getElementById('mted-txt').value.replace(/\r/g,''),h=parseFloat(String(document.getElementById('mted-h').value).replace(',','.')),att=parseInt(document.getElementById('mted-att').value,10)||1;
  if(!(h>0)){ alert('Altura inválida.'); return; }
  closeOv('ov-mtext'); var cb=MTED.cb; MTED.cb=null; var an=document.getElementById('mted-annot').checked; if(document.getElementById('mted-row-an').style.display!=='none') S.mtAnnot=an; if(cb) cb({txt:txt,h:h,att:att,annot:an});
}
function mtEditorCancel(){ closeOv('ov-mtext'); MTED.cb=null; if(S.ds&&ncIs(S.tool)) ncEnd(false); }

// ── MTEXT (T / MT) ─────────────────────────────────────────────────────────
if(S.mtH===undefined) S.mtH=2.5;
NC.mtext={init:function(ds){ ds.phase='p1'; ds.att=1; },
  prompt:function(ds){ return {p1:'MTEXT Especifique o primeiro canto:',p2:'Especifique o canto oposto ou [Altura/Justificar/Rotação/Largura]:',h:'Especifique a altura <'+gNum(S.mtH)+'>:',j:'Justificação [TE/TC/TD/ME/MC/MD/BE/BC/BD] <'+['','TE','TC','TD','ME','MC','MD','BE','BC','BD'][ds.att]+'>:',r:'Ângulo de rotação <0>:',w:'Especifique a largura:',edit:'Digite o texto no editor (Ctrl+Enter = OK).'}[ds.phase]; },
  open:function(ds,box){
    var self=this; ds.phase='edit';
    mtEditorOpen({title:'MTEXT — texto múltiplo',h:S.mtH,att:ds.att},function(r){
      if(!r.txt.trim()){ log('MTEXT vazio: nada criado.','inf'); ncEnd(); return; }
      S.mtH=r.h; var att=r.att,col=(att-1)%3,row=Math.floor((att-1)/3),bx=box;
      var x=col===0?bx.x0:col===1?(bx.x0+bx.x1)/2:bx.x1,y=row===0?bx.y1:row===1?(bx.y0+bx.y1)/2:bx.y0;
      snapshot(); addE({tp:'mtext',x:x,y:y,w:r.annot?bx.w*annoK():bx.w,h:r.h,txt:r.txt,att:att,rot:ds.rot||0,annot:!!r.annot},true);
      log('MTEXT criado ('+mtLines(S.ents[S.ents.length-1]).length+' linha(s)).','ok'); ncEnd(); renderAll();
    });
  },
  click:function(ds,pt){
    if(ds.phase==='p1'){ ds.a={x:pt.x,y:pt.y}; ds.pts=[ds.a]; ds.phase='p2'; return; }
    if(ds.phase==='p2'){ var w=Math.abs(pt.x-ds.a.x); this.open(ds,{x0:Math.min(ds.a.x,pt.x),x1:Math.max(ds.a.x,pt.x),y0:Math.min(ds.a.y,pt.y),y1:Math.max(ds.a.y,pt.y),w:w}); }
  },
  input:function(ds,u,raw){
    var n=ncNum(u),J={TE:1,TC:2,TD:3,ME:4,MC:5,MD:6,BE:7,BC:8,BD:9,TL:1,TR:3,ML:4,MR:6,BL:7,BR:9};
    if(ds.phase==='p1'){ var p=parseCoord(raw); if(!p) return false; this.click(ds,p); return true; }
    if(ds.phase==='p2'){ if(u==='A'||u==='H'){ds.phase='h';return true;} if(u==='J'){ds.phase='j';return true;} if(u==='R'){ds.phase='r';return true;} if(u==='L'||u==='W'){ds.phase='w';return true;}
      var q=ncPointFrom(raw,ds.a); if(!q) return false; this.click(ds,q); return true; }
    if(ds.phase==='h'){ if(u!==''){ if(!(n>0)) return false; S.mtH=n; } ds.phase='p2'; return true; }
    if(ds.phase==='j'){ if(u!==''){ if(!J[u]) return false; ds.att=J[u]; } ds.phase='p2'; return true; }
    if(ds.phase==='r'){ if(u!==''){ if(n===null) return false; ds.rot=n*Math.PI/180; } ds.phase='p2'; return true; }
    if(ds.phase==='w'){ if(!(n>=0)) return false; this.open(ds,{x0:ds.a.x,x1:ds.a.x+n,y0:ds.a.y,y1:ds.a.y,w:n}); return true; }
    return false;
  },
  preview:function(ctx,ds,hp){ if(ds.phase!=='p2') return; var a=w2s(ds.a.x,ds.a.y),b=w2s(hp.x,hp.y); ctx.save(); ctx.setLineDash([4,3]); ctx.strokeStyle='#4d9ef7'; ctx.strokeRect(Math.min(a.x,b.x),Math.min(a.y,b.y),Math.abs(a.x-b.x),Math.abs(a.y-b.y)); ctx.restore(); }
};
// Edição de textos (ED / duplo clique)
function textEdit(e){
  if(e.tp==='txt'||e.tp==='mtext'||e.tp==='leader'){
    mtEditorOpen({title:'Editar texto',txt:e.txt,h:e.h||S.mtH,annot:!!e.annot,att:e.att||1,noAtt:e.tp!=='mtext',noH:e.tp==='leader'},function(r){
      snapshot(); e.txt=e.tp==='txt'?r.txt.split('\n')[0]:r.txt; if(e.tp!=='leader'){ if(!!r.annot!==!!e.annot&&e.w){ var _k=annoK(); e.w=r.annot?e.w*_k:e.w/_k; } e.h=r.h; e.annot=!!r.annot; } if(e.tp==='mtext') e.att=r.att; renderAll(); updSelInfo(); log('Texto atualizado.','ok');
      if(S.tool==='textedit') ncEnd(); });
    return true;
  }
  return false;
}
NC.textedit={init:function(ds){ds.phase='pick';},prompt:function(){return 'TEXTEDIT Selecione um texto, MTEXT ou linha de chamada:';},
  click:function(ds,pt){ for(var i=S.ents.length-1;i>=0;i--){ var e=S.ents[i]; if(['txt','mtext','leader'].indexOf(e.tp)>=0&&hitEnt(e,pt.x,pt.y)){ ds.phase='edit'; textEdit(e); return; } } log('Nenhum texto no ponto.','inf'); },
  input:function(ds,u){ if(u===''){ ncEnd(); return true; } return false; }};
window.addEventListener('load',function(){ var w=document.getElementById('cw'); if(!w) return;
  w.addEventListener('dblclick',function(ev){ if(S.tool!=='select') return; var r=w.getBoundingClientRect(),p=s2w(ev.clientX-r.left,ev.clientY-r.top);
    for(var i=S.ents.length-1;i>=0;i--){ var e=S.ents[i]; if(['txt','mtext','leader'].indexOf(e.tp)>=0&&hitEnt(e,p.x,p.y)){ textEdit(e); return; } } }); });

// ── LEADER (LE / MLD) ──────────────────────────────────────────────────────
NC.leader={init:function(ds){ ds.phase='tip'; ds.lpts=[]; },
  prompt:function(ds){ return {tip:'LEADER Especifique a posição da ponta da seta:',next:'Especifique o próximo ponto (Enter = digitar o texto):',edit:'Digite o texto no editor.'}[ds.phase]; },
  finish:function(ds){
    if(ds.lpts.length<2){ log('São necessários pelo menos dois pontos.','er'); return; }
    ds.phase='edit';
    mtEditorOpen({title:'LEADER — texto da chamada',noAtt:true,noH:true},function(r){
      snapshot(); addE({tp:'leader',pts:ds.lpts.map(function(p){return {x:p.x,y:p.y};}),txt:r.txt,dimStyle:S.dimCurrent,ly:S.curLy},true);
      log('Linha de chamada criada.','ok'); ncEnd(); renderAll(); });
  },
  click:function(ds,pt){ ds.lpts.push({x:pt.x,y:pt.y}); ds.pts=[ds.lpts[ds.lpts.length-1]]; ds.phase='next'; if(ds.lpts.length>=3) this.finish(ds); },
  input:function(ds,u,raw){ if(ds.phase==='next'&&u===''){ this.finish(ds); return true; } if(ds.phase==='tip'&&u===''){ ncEnd(); return true; }
    var p=ncPointFrom(raw,ds.lpts.length?ds.lpts[ds.lpts.length-1]:null); if(!p) return false; this.click(ds,p); return true; },
  preview:function(ctx,ds,hp){ if(ds.phase!=='next') return; var tmp={tp:'leader',pts:ds.lpts.concat([{x:hp.x,y:hp.y}]),txt:'',dimStyle:S.dimCurrent}; var st=dimStyleOf(tmp); renderDimPrims(ctx,leaderPrims(tmp,st),st,w2s,S.vp.sc,{alpha:.8}); }
};

// ── BLOCK (B) e INSERT (I) ─────────────────────────────────────────────────
function blockNameOk(n){ return /^[^<>\/\\":;?*|=`]{1,60}$/.test(n)&&n.trim()===n; }
NC.block={
  init:function(ds){ ds.phase='name'; ds.pre=selEnts().filter(ncEditable).map(function(e){return e.id;}); },
  prompt:function(ds){ return {name:'BLOCK Nome do bloco:',redef:'O bloco "'+ds.name+'" já existe. Redefinir? [Sim/Não] <Não>:',base:'Especifique o ponto base de inserção:',conv:'Objetos de origem [Manter/Converter em bloco/Apagar] <Converter>:'}[ds.phase]; },
  click:function(ds,pt){ if(ds.phase==='base'){ ds.base={x:pt.x,y:pt.y}; if(ds.pre.length){ ds.ids=ds.pre; S.sel=ds.ids.slice(); this.afterSel(ds); } else { ds.phase='sel'; ds.ids=[]; S.sel=[]; } } },
  afterSel:function(ds){ ds.phase='conv'; },
  input:function(ds,u,raw){
    if(ds.phase==='name'){ if(u===''){ ncEnd(); return true; } var nm=String(raw).trim(); if(!blockNameOk(nm)){ log('Nome inválido (sem < > / \\ " : ; ? * | = `).','er'); return true; }
      ds.name=nm; ds.phase=S.blocks[nm]?'redef':'base'; return true; }
    if(ds.phase==='redef'){ if(u==='S'||u==='SIM'||u==='Y'){ ds.phase='base'; return true; } ncEnd(); return true; }
    if(ds.phase==='base'){ var p=parseCoord(raw); if(!p) return false; this.click(ds,p); return true; }
    if(ds.phase==='conv'){
      var mode=u===''||u==='C'||u==='CONVERTER'?'conv':(u==='M'||u==='MANTER')?'keep':(u==='A'||u==='APAGAR')?'del':null; if(!mode) return false;
      var b=ds.base,list=ds.ids.map(findE).filter(Boolean);
      snapshot();
      S.blocks[ds.name]={base:{x:0,y:0},ents:list.map(function(e){ var c=JSON.parse(JSON.stringify(e)); transl(c,-b.x,-b.y); return c; })};
      if(mode!=='keep') S.ents=S.ents.filter(function(e){return ds.ids.indexOf(e.id)<0;});
      if(mode==='conv') addE({tp:'insert',name:ds.name,x:b.x,y:b.y,s:1,rot:0,m:false,ly:S.curLy},true);
      S.lastBlock=ds.name; log('BLOCK "'+ds.name+'" definido com '+list.length+' objeto(s)'+(mode==='conv'?' e convertido em referência':'')+'.','ok'); ncEnd(); return true;
    }
    return false;
  }
};
NC.insert={
  init:function(ds){ ds.phase='name'; ds.s=1; ds.rot=0; },
  prompt:function(ds){ return {name:'INSERT Nome do bloco ou [?] <'+(S.lastBlock||'')+'>:',pt:'Especifique o ponto de inserção ou [Escala/Rotação]:',ps:'Fator de escala <'+gNum(ds.s)+'>:',pr:'Ângulo de rotação <'+gNum(ds.rot*180/Math.PI)+'>:',s2:'Fator de escala <1>:',r2:'Ângulo de rotação <0>:'}[ds.phase]; },
  make:function(ds){ snapshot(); addE({tp:'insert',name:ds.name,x:ds.p.x,y:ds.p.y,s:ds.s,rot:ds.rot,m:false,ly:S.curLy},true); S.lastBlock=ds.name; log('INSERT "'+ds.name+'".','ok'); ncEnd(); renderAll(); },
  click:function(ds,pt){ if(ds.phase==='pt'){ ds.p={x:pt.x,y:pt.y}; ds.pts=[ds.p]; ds.phase='s2'; } else if(ds.phase==='r2'){ ds.rot=Math.atan2(pt.y-ds.p.y,pt.x-ds.p.x); this.make(ds); } },
  input:function(ds,u,raw){
    var n=ncNum(u);
    if(ds.phase==='name'){
      if(u==='?'){ var k=Object.keys(S.blocks); log(k.length?'Blocos: '+k.join(', '):'Nenhum bloco definido (use BLOCK).','inf'); return true; }
      var nm=u===''?S.lastBlock:String(raw).trim(); if(!nm){ ncEnd(); return true; }
      var real=Object.keys(S.blocks).filter(function(k){return k.toUpperCase()===nm.toUpperCase();})[0];
      if(!real){ log('Bloco "'+nm+'" não encontrado. Digite ? para listar.','er'); return true; } ds.name=real; ds.phase='pt'; return true; }
    if(ds.phase==='pt'){ if(u==='E'||u==='S'||u==='ESCALA'){ ds.phase='ps'; return true; } if(u==='R'||u==='ROTACAO'||u==='ROTAÇÃO'){ ds.phase='pr'; return true; } var p=parseCoord(raw); if(!p) return false; this.click(ds,p); return true; }
    if(ds.phase==='ps'){ if(u!==''){ if(!(n>0)) return false; ds.s=n; } ds.phase='pt'; return true; }
    if(ds.phase==='pr'){ if(u!==''){ if(n===null) return false; ds.rot=n*Math.PI/180; } ds.phase='pt'; return true; }
    if(ds.phase==='s2'){ if(u!==''){ if(!(n>0)) return false; ds.s=n; } ds.phase='r2'; return true; }
    if(ds.phase==='r2'){ if(u!==''){ if(n===null){ var q=parseCoord(raw); if(!q) return false; this.click(ds,q); return true; } ds.rot=n*Math.PI/180; } this.make(ds); return true; }
    return false;
  },
  preview:function(ctx,ds,hp){ if(ds.phase!=='pt'&&ds.phase!=='r2'&&ds.phase!=='s2') return; var p=ds.phase==='pt'?hp:ds.p,rot=ds.phase==='r2'?Math.atan2(hp.y-ds.p.y,hp.x-ds.p.x):ds.rot;
    ctx.save(); ctx.globalAlpha=.75; drawE(ctx,{id:'__prev',tp:'insert',name:ds.name,x:p.x,y:p.y,s:ds.s,rot:rot,ly:S.curLy},true); ctx.restore(); }
};

// ── HATCH por ponto interno ────────────────────────────────────────────────
NC.hatch={
  init:function(ds){ ds.phase='pick'; ds.regions=S.hatchPending||[]; S.hatchPending=null; var p=S.hatchPat||{name:'Linhas 45° (Genérico)'}; log('Padrão: '+(p.name||p.type)+' — digite C para mudar.','inf'); },
  prompt:function(ds){ return {pick:'HATCH Selecione um ponto interno ou [Selecionar objetos/Configurações/Desfazer] <Enter conclui>:'+(ds.regions.length?' ('+ds.regions.length+' área(s))':''),objs:'Selecione objetos fechados (círculo, polilinha fechada, retângulo, elipse) — Enter volta:'}[ds.phase]; },
  click:function(ds,pt){
    if(ds.phase==='objs'){ for(var i=S.ents.length-1;i>=0;i--){ var e=S.ents[i],Q=null; if(!hitEnt(e,pt.x,pt.y)) continue;
        if(e.tp==='circ') Q=arcPts(e.cx,e.cy,e.r,0,2*Math.PI).slice(0,-1); else if(e.tp==='ell') Q=ellPoints(e,72).slice(0,-1);
        else if(e.tp==='rect') Q=[{x:e.x,y:e.y},{x:e.x+e.w,y:e.y},{x:e.x+e.w,y:e.y+e.h},{x:e.x,y:e.y+e.h}];
        else if(e.tp==='pl'&&e.closed){ Q=plHasArc(e)?plSample(e,24):e.pts.slice(); if(Q.length>3&&Math.hypot(Q[0].x-Q[Q.length-1].x,Q[0].y-Q[Q.length-1].y)<1e-9) Q.pop(); }
        if(Q){ ds.regions.push([Q]); log('Objeto adicionado ao contorno.','ok'); } else log('O objeto não é fechado.','er'); return; }
      return; }
    var r=boundaryFind(pt); if(r.err){ log('HATCH: '+r.err,'er'); return; }
    ds.regions.push(r.loops); log('Contorno encontrado'+(r.loops.length>1?' com '+(r.loops.length-1)+' ilha(s)':'')+'.','ok');
  },
  input:function(ds,u){
    if(ds.phase==='objs'){ if(u===''){ ds.phase='pick'; return true; } return false; }
    if(u===''){
      if(!ds.regions.length){ ncEnd(); return true; }
      var p=S.hatchPat||{ang:45,sp:5,type:'lines'},loops=[].concat.apply([],ds.regions);
      var e={tp:'hatch',loops:loops,ang:p.ang,sp:p.sp,htype:p.type,col:S.style.col}; if(p.type==='pat') e.pname=p.pname; hatchSync(e);
      snapshot(); addE(e,true); log('Hachura criada ('+ds.regions.length+' área(s)).','ok'); ncEnd(); return true; }
    if(u==='S'||u==='O'||u==='SELECIONAR'){ ds.phase='objs'; return true; }
    if(u==='C'||u==='T'||u==='CONFIGURACOES'||u==='CONFIGURAÇÕES'){ S.hatchPending=ds.regions; showHatchDlg(); return true; }
    if(u==='U'||u==='D'||u==='DESFAZER'){ ds.regions.pop(); return true; }
    return false;
  },
  preview:function(ctx,ds,hp){
    ds.regions.forEach(function(L){ var tmp={loops:L,htype:(S.hatchPat||{}).type||'lines',ang:(S.hatchPat||{}).ang,sp:(S.hatchPat||{}).sp,pname:(S.hatchPat||{}).pname}; drawHatchLoops(ctx,tmp,w2s,S.vp.sc,'#4ec87a'); });
  }
};

// ── IMPORTAÇÃO DE DXF ──────────────────────────────────────────────────────
var ACI_BASE={1:'#ff0000',2:'#ffff00',3:'#00ff00',4:'#00ffff',5:'#0000ff',6:'#ff00ff',7:'#ffffff',8:'#808080',9:'#c0c0c0'};
function aciToHex(i){
  i=Math.abs(i|0); if(ACI_BASE[i]) return ACI_BASE[i];
  if(i>=250&&i<=255){ var g=Math.round(51+(i-250)*40.8); var h=('0'+g.toString(16)).slice(-2); return '#'+h+h+h; }
  if(i<10||i>249) return '#ffffff';
  var hue=Math.floor((i-10)/10)*15,v=i%10,lv=[1,1,.8,.8,.65,.65,.5,.5,.3,.3][v],sat=v%2?.5:1;
  function f(n){ var k=(n+hue/60)%6; return lv-lv*sat*Math.max(0,Math.min(k,4-k,1)); }
  return '#'+[f(5),f(3),f(1)].map(function(c){return ('0'+Math.round(c*255).toString(16)).slice(-2);}).join('');
}
function dxfTxt(s){ return String(s).replace(/\\U\+([0-9A-Fa-f]{4})/g,function(m,h){return String.fromCharCode(parseInt(h,16));}).replace(/%%[dD]/g,'°').replace(/%%[cC]/g,'⌀').replace(/%%[pP]/g,'±').replace(/%%[uUoO]/g,''); }
function mtextPlain(s){ return dxfTxt(String(s).replace(/\\P/g,'\n').replace(/\\[AaCcFfHhQTtWw][^;]*;/g,'').replace(/\\[LlOoKk]/g,'').replace(/\\S([^;]*);/g,function(m,a){return a.replace(/[\^#]/,'/');}).replace(/[{}]/g,'').replace(/\\~/g,' ')); }
function ltFromDxf(n){ if(!n) return null; var u=String(n).toUpperCase(); if(u==='BYLAYER'||u==='BYBLOCK') return null; if(u==='CONTINUOUS') return 'solid';
  var map=[['DASHDOT','dashdot'],['DIVIDE','divide'],['PHANTOM','phantom'],['CENTER','center'],['HIDDEN','hidden'],['DASH','dashed'],['DOT','dotted']]; for(var i=0;i<map.length;i++) if(u.indexOf(map[i][0])===0) return map[i][1]; return 'solid'; }
function parseDXFText(text){
  var L=text.split(/\r\n|\r|\n/),P=[];
  for(var i=0;i+1<L.length;i+=2){ var c=parseInt(L[i].trim(),10); if(isNaN(c)) { i--; continue; } P.push([c,L[i+1]]); }
  return P;
}
function dxfImport(text,merge){
  if(/^AutoCAD Binary DXF/.test(text)) return {err:'DXF binário não é suportado; salve como DXF ASCII.'};
  var P=parseDXFText(text),i=0,hdr={},layers={},blocks={},ents=[],skipped={},cnt={};
  function readEnt(){ var t=P[i][1].trim(),c=[]; i++; while(i<P.length&&P[i][0]!==0){ c.push(P[i]); i++; } return {t:t,c:c}; }
  function g(E,code,def){ for(var k=0;k<E.c.length;k++) if(E.c[k][0]===code) return E.c[k][1]; return def; }
  function gn(E,code,def){ var v=g(E,code); var n=parseFloat(v); return isFinite(n)?n:def; }
  // varre seções
  while(i<P.length){
    if(P[i][0]===0&&P[i][1].trim()==='SECTION'){ var name=(P[i+1]||[0,''])[1].trim(); i+=2;
      if(name==='HEADER'){ while(i<P.length&&!(P[i][0]===0&&P[i][1].trim()==='ENDSEC')){ if(P[i][0]===9){ var vn=P[i][1].trim(); i++; if(i<P.length) hdr[vn]=P[i][1].trim(); } i++; } }
      else if(name==='TABLES'){ while(i<P.length&&!(P[i][0]===0&&P[i][1].trim()==='ENDSEC')){
          if(P[i][0]===0&&P[i][1].trim()==='LAYER'){ var E=readEnt(),nm=g(E,2,'0'),col=parseInt(g(E,62,'7'),10),fl=parseInt(g(E,70,'0'),10),tc=g(E,420);
            layers[nm]={nm:nm,col:tc!==undefined?'#'+('000000'+parseInt(tc,10).toString(16)).slice(-6):aciToHex(col),vis:col>=0&&!(fl&1),lock:!!(fl&4),ld:ltFromDxf(g(E,6,'CONTINUOUS'))||'solid',lw:(function(w){w=parseInt(w,10);return w>0?w/100:.25;})(g(E,370,'-3'))}; continue; }
          i++; } }
      else if(name==='BLOCKS'||name==='ENTITIES'){
        var curBlock=null,buf=ents;
        while(i<P.length&&!(P[i][0]===0&&P[i][1].trim()==='ENDSEC')){
          if(P[i][0]!==0){ i++; continue; }
          var E2=readEnt();
          if(E2.t==='BLOCK'){ curBlock={name:g(E2,2,''),bx:gn(E2,10,0),by:gn(E2,20,0),ents:[]}; buf=curBlock.ents; continue; }
          if(E2.t==='ENDBLK'){ if(curBlock) blocks[curBlock.name]=curBlock; curBlock=null; buf=ents; continue; }
          if(E2.t==='POLYLINE'){ E2.verts=[]; while(i<P.length&&P[i][0]===0&&P[i][1].trim()==='VERTEX'){ E2.verts.push(readEnt()); } if(i<P.length&&P[i][1].trim()==='SEQEND') readEnt(); }
          buf.push(E2);
        }
      }
      continue;
    }
    i++;
  }
  var ver=hdr.$ACADVER||'',units=parseInt(hdr.$INSUNITS||'4',10),f={0:1,1:25.4,2:304.8,4:1,5:10,6:1000,14:100}[units]||1;
  // camadas
  var lyMap={};
  if(!merge){ S.layers=[{id:0,nm:'0',col:'#dce4f5',vis:true,lock:false,ld:'solid',lw:.25}]; }
  function layerId(nm){ nm=String(nm||'0'); if(lyMap[nm]!==undefined) return lyMap[nm];
    var ex=S.layers.filter(function(l){return String(l.nm)===nm;})[0];
    if(!ex){ var L0=layers[nm]||{nm:nm,col:'#dce4f5',vis:true,lock:false,ld:'solid',lw:.25}; ex={id:nm==='0'?0:Date.now()+Math.floor(Math.random()*1e6),nm:nm,col:L0.col,vis:L0.vis,lock:false,ld:L0.ld,lw:L0.lw}; S.layers.push(ex); }
    else if(nm==='0'&&layers['0']){ ex.col=layers['0'].col; }
    lyMap[nm]=ex.id; return ex.id; }
  Object.keys(layers).forEach(layerId);
  function props(E){ var o={ly:layerId(g(E,8,'0'))},c=g(E,62),tc=g(E,420),lt=g(E,6),lw=g(E,370);
    if(tc!==undefined) o.col='#'+('000000'+parseInt(tc,10).toString(16)).slice(-6); else if(c!==undefined&&+c!==256&&+c!==0) o.col=aciToHex(+c); else o.col=null;
    o.ld=lt!==undefined?ltFromDxf(lt):null; o.lw=lw!==undefined&&+lw>0?(+lw)/100:null; return o; }
  function conv(E,blockCtx){
    var t=E.t,o=null,pr=props(E),D=Math.PI/180;
    switch(t){
      case 'LINE': o={tp:'line',x1:gn(E,10,0),y1:gn(E,20,0),x2:gn(E,11,0),y2:gn(E,21,0)}; break;
      case 'CIRCLE': o={tp:'circ',cx:gn(E,10,0),cy:gn(E,20,0),r:gn(E,40,1)}; break;
      case 'ARC': o={tp:'arc',cx:gn(E,10,0),cy:gn(E,20,0),r:gn(E,40,1),sa:gn(E,50,0)*D,ea:gn(E,51,0)*D}; break;
      case 'LWPOLYLINE': { var pts=[],cur=null; E.c.forEach(function(q){ if(q[0]===10){ cur={x:parseFloat(q[1]),y:0}; pts.push(cur); } else if(q[0]===20&&cur) cur.y=parseFloat(q[1]); else if(q[0]===42&&cur){ var b=parseFloat(q[1]); if(Math.abs(b)>1e-12) cur.b=b; } });
        var cl=!!(parseInt(g(E,70,'0'),10)&1); if(cl&&pts.length>2) pts.push({x:pts[0].x,y:pts[0].y}); if(pts.length>=2) o={tp:'pl',closed:cl,pts:pts}; break; }
      case 'POLYLINE': { var fl=parseInt(g(E,70,'0'),10); if(fl&(16|64)){ skipped['POLYLINE 3D/malha']=(skipped['POLYLINE 3D/malha']||0)+1; return null; }
        var pts2=(E.verts||[]).map(function(V){ var p={x:gn(V,10,0),y:gn(V,20,0)},b=gn(V,42,0); if(Math.abs(b)>1e-12) p.b=b; return p; });
        var cl2=!!(fl&1); if(cl2&&pts2.length>2) pts2.push({x:pts2[0].x,y:pts2[0].y}); if(pts2.length>=2) o={tp:'pl',closed:cl2,pts:pts2}; break; }
      case 'TEXT': case 'ATTDEF': case 'ATTRIB': { if(t==='ATTDEF'){ return null; } var h=gn(E,40,2.5),tx=dxfTxt(g(E,1,'')),rot=gn(E,50,0)*D,hj=parseInt(g(E,72,'0'),10),vj=parseInt(g(E,73,'0'),10);
        if(!tx) return null;
        if(hj===0&&vj===0) o={tp:'txt',x:gn(E,10,0),y:gn(E,20,0),h:h,txt:tx,rot:rot};
        else { var att=(vj===3?1:vj===2?4:7)+(hj===1||hj===4?1:hj===2?2:0); o={tp:'mtext',x:gn(E,11,gn(E,10,0)),y:gn(E,21,gn(E,20,0)),h:h,w:0,txt:tx,att:att,rot:rot}; }
        break; }
      case 'MTEXT': { var s='';E.c.forEach(function(q){ if(q[0]===3) s+=q[1]; }); s+=g(E,1,''); var rx=gn(E,11,null),ry=gn(E,21,0),r50=gn(E,50,null);
        o={tp:'mtext',x:gn(E,10,0),y:gn(E,20,0),h:gn(E,40,2.5),w:gn(E,41,0),txt:mtextPlain(s),att:parseInt(g(E,71,'1'),10)||1,rot:r50!==null?r50:(rx!==null?Math.atan2(ry,rx):0)};
        if(!o.txt) return null; break; }
      case 'ELLIPSE': { var cx=gn(E,10,0),cy=gn(E,20,0),mx=gn(E,11,1),my=gn(E,21,0),ra=gn(E,40,1),p0=gn(E,41,0),p1=gn(E,42,2*Math.PI),rx2=Math.hypot(mx,my);
        if(Math.abs(Math.abs(p1-p0)-2*Math.PI)<1e-6) o={tp:'ell',cx:cx,cy:cy,rx:rx2,ry:rx2*ra,rot:Math.atan2(my,mx)};
        else { var tmpE={cx:cx,cy:cy,rx:rx2,ry:rx2*ra,rot:Math.atan2(my,mx)},sw=((p1-p0)%(2*Math.PI)+2*Math.PI)%(2*Math.PI),pp=[]; for(var k=0;k<=48;k++) pp.push(ellPt(tmpE,p0+sw*k/48)); o={tp:'pl',closed:false,pts:pp}; } break; }
      case 'SPLINE': { var fit=[],ctl=[],kn=[],cur2=null,cur3=null; E.c.forEach(function(q){ if(q[0]===11){cur2={x:parseFloat(q[1]),y:0};fit.push(cur2);} else if(q[0]===21&&cur2) cur2.y=parseFloat(q[1]); else if(q[0]===10){cur3={x:parseFloat(q[1]),y:0};ctl.push(cur3);} else if(q[0]===20&&cur3) cur3.y=parseFloat(q[1]); else if(q[0]===40) kn.push(parseFloat(q[1])); });
        if(fit.length>=2){ o={tp:'spline',pts:fit}; break; }
        var deg=parseInt(g(E,71,'3'),10); if(ctl.length<2){ return null; }
        if(kn.length!==ctl.length+deg+1){ o={tp:'pl',closed:false,pts:ctl}; break; }
        var sp=[],t0=kn[deg],t1=kn[ctl.length]; for(var s2=0;s2<=Math.max(20,ctl.length*8);s2++){ var tt=t0+(t1-t0)*s2/Math.max(20,ctl.length*8); sp.push(deBoor(deg,ctl,kn,Math.min(tt,t1-1e-12))); }
        o={tp:'pl',closed:false,pts:sp}; break; }
      case 'SOLID': case 'TRACE': { var q1={x:gn(E,10,0),y:gn(E,20,0)},q2={x:gn(E,11,0),y:gn(E,21,0)},q3={x:gn(E,12,0),y:gn(E,22,0)},q4={x:gn(E,13,q3.x),y:gn(E,23,q3.y)};
        o={tp:'pl',closed:true,pts:[q1,q2,q4,q3,{x:q1.x,y:q1.y}]}; break; }
      case 'INSERT': { var nm=g(E,2,''),sx=gn(E,41,1),sy=gn(E,42,1); o={tp:'insert',name:nm,x:gn(E,10,0),y:gn(E,20,0),s:Math.abs(sx)||1,m:sx*sy<0,rot:gn(E,50,0)*D}; if(sx<0){ o.rot+=Math.PI; } break; }
      case 'DIMENSION': { var bn=g(E,2,''); if(blocks[bn]){ var out=[]; blocks[bn].ents.forEach(function(B){ var c=conv(B,true); if(c){ if(c.ly===0) c.ly=pr.ly; out.push(c);} }); cnt.DIMENSION=(cnt.DIMENSION||0)+1; return out; } skipped.DIMENSION=(skipped.DIMENSION||0)+1; return null; }
      case 'LEADER': { var lp=[],c4=null; E.c.forEach(function(q){ if(q[0]===10){c4={x:parseFloat(q[1]),y:0};lp.push(c4);} else if(q[0]===20&&c4) c4.y=parseFloat(q[1]); }); if(lp.length>=2) o={tp:'leader',pts:lp,txt:''}; break; }
      case 'HATCH': { var res=hatchFromDxf(E); if(res) o=res; else { skipped.HATCH=(skipped.HATCH||0)+1; return null; } break; }
      case 'POINT': o={tp:'point',x:gn(E,10,0),y:gn(E,20,0)}; break;
      case 'VIEWPORT': case 'SEQEND': case 'IMAGE': case 'WIPEOUT': default:
        skipped[t]=(skipped[t]||0)+1; return null;
    }
    if(!o) return null;
    cnt[t]=(cnt[t]||0)+1;
    return Object.assign(o,pr);
  }
  // blocos (exceto anônimos de cota *D, usados só para explodir cotas)
  Object.keys(blocks).forEach(function(nm){ if(/^\*(D|Model_Space|Paper_Space)/i.test(nm)) return; var B=blocks[nm],list=[];
    B.ents.forEach(function(E){ var c=conv(E,true); if(!c) return; [].concat(c).forEach(function(x){ x.id='b'+Math.random().toString(36).slice(2,9); transl(x,-B.bx,-B.by); list.push(x); }); });
    S.blocks[nm.replace(/^\*/,'_')]={base:{x:0,y:0},ents:list}; });
  var added=[];
  ents.forEach(function(E){ var c=conv(E,false); if(!c) return; [].concat(c).forEach(function(x){ if(x.tp==='insert') x.name=x.name.replace(/^\*/,'_'); x.id=uid(); added.push(x); }); });
  if(f!==1){ added.forEach(function(e){ scalE(e,{x:0,y:0},f); }); Object.keys(S.blocks).forEach(function(k){ S.blocks[k].ents.forEach(function(e){ scalE(e,{x:0,y:0},f); }); }); }
  return {ents:added,counts:cnt,skipped:skipped,ver:ver,units:units,f:f};
}
function deBoor(k,C,T,t){
  var s=k; for(var j=k;j<T.length-k-1;j++) if(t>=T[j]&&t<T[j+1]){ s=j; break; }
  var d=[]; for(var j2=0;j2<=k;j2++){ var c=C[Math.min(C.length-1,Math.max(0,j2+s-k))]; d.push({x:c.x,y:c.y}); }
  for(var r=1;r<=k;r++) for(var j3=k;j3>=r;j3--){ var den=T[j3+1+s-r]-T[j3+s-k],a=den?(t-T[j3+s-k])/den:0; d[j3]={x:(1-a)*d[j3-1].x+a*d[j3].x,y:(1-a)*d[j3-1].y+a*d[j3].y}; }
  return d[k];
}
function hatchFromDxf(E){
  var c=E.c,k=0,loops=[],n=0;
  for(;k<c.length;k++) if(c[k][0]===91){ n=parseInt(c[k][1],10); k++; break; }
  for(var pth=0;pth<n&&k<c.length;pth++){
    while(k<c.length&&c[k][0]!==92) k++; if(k>=c.length) break;
    var fl=parseInt(c[k][1],10); k++; var L=[];
    if(fl&2){ var hb=0,nv=0; while(k<c.length&&c[k][0]!==93){ if(c[k][0]===72) hb=parseInt(c[k][1],10); k++; } nv=parseInt(c[k][1],10); k++;
      var V=[],cur=null; while(k<c.length&&V.length<=nv&&c[k][0]!==97&&c[k][0]!==92){ var q=c[k]; if(q[0]===10){ if(V.length===nv) break; cur={x:parseFloat(q[1]),y:0}; V.push(cur);} else if(q[0]===20&&cur) cur.y=parseFloat(q[1]); else if(q[0]===42&&cur) cur.b=parseFloat(q[1]); k++; }
      var tmp={tp:'pl',closed:true,pts:V.concat([{x:V[0].x,y:V[0].y}])}; L=plHasArc(tmp)?plSample(tmp,24):V;
      if(L.length>2&&Math.hypot(L[0].x-L[L.length-1].x,L[0].y-L[L.length-1].y)<1e-9) L=L.slice(0,-1);
    } else { var ne=0; while(k<c.length&&c[k][0]!==93) k++; ne=parseInt(c[k][1],10); k++;
      for(var ed=0;ed<ne&&k<c.length;ed++){ while(k<c.length&&c[k][0]!==72) k++; var et=parseInt(c[k][1],10); k++; var vals={},keys=[];
        while(k<c.length&&[72,97,92].indexOf(c[k][0])<0){ if(vals[c[k][0]]===undefined) vals[c[k][0]]=parseFloat(c[k][1]); k++; }
        if(et===1){ L.push({x:vals[10],y:vals[20]}); }
        else if(et===2){ var sa=vals[50]*Math.PI/180,ea=vals[51]*Math.PI/180,ccw=vals[73]!==0; if(!ccw){ sa=-sa; ea=-ea; } var sw=((ea-sa)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)||2*Math.PI;
          arcPts(vals[10],vals[20],vals[40],sa,ccw?sw:-sw).slice(0,-1).forEach(function(p){L.push(p);}); }
        else if(et===3){ var ex={cx:vals[10],cy:vals[20],rx:Math.hypot(vals[11],vals[21]),ry:Math.hypot(vals[11],vals[21])*vals[40],rot:Math.atan2(vals[21],vals[11])},a0=vals[50]*Math.PI/180,a1=vals[51]*Math.PI/180,sw2=((a1-a0)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)||2*Math.PI;
          for(var s3=0;s3<24;s3++) L.push(ellPt(ex,a0+sw2*s3/24)); }
      } }
    if(L.length>=3) loops.push(L);
  }
  if(!loops.length) return null;
  var nm=String((E.c.filter(function(q){return q[0]===2;})[0]||[0,''])[1]).toUpperCase(),ang=0,sc=1;
  E.c.forEach(function(q){ if(q[0]===52) ang=parseFloat(q[1]); if(q[0]===41) sc=parseFloat(q[1]); });
  var e={tp:'hatch',loops:loops,htype:'lines',ang:45+ang,sp:3.175*(sc||1)};
  if(nm==='NET'||nm.indexOf('BRICK')===0){ e.htype='cross'; e.ang=ang; } else if(nm==='DOTS'||nm==='AR-SAND'){ e.htype='dots'; e.sp=0.79375*(sc||1)*4; } else if(nm==='DASH'){ e.htype='dashed'; e.ang=ang; } else if(nm==='SOLID'){ e.htype='lines'; e.sp=0.8; e.ang=45; }
  else if(nm==='_USER'){ e.ang=ang; e.sp=sc||5; }
  hatchSync(e); return e;
}
function dxfDecode(buf){
  var latin=new TextDecoder('windows-1252').decode(buf),m=/\$ACADVER\s*\r?\n\s*1\s*\r?\n\s*(AC\d+)/.exec(latin),ver=m?m[1]:'AC1009';
  return parseInt(ver.slice(2),10)>=1021?new TextDecoder('utf-8').decode(buf):latin;
}
function importDxfBuffer(buf,name,merge){
  var text=dxfDecode(buf),saveBlocks=S.blocks;
  if(!merge){ S.blocks={}; }
  var r;
  try{ r=dxfImport(text,merge); }catch(err){ r={err:'Falha ao ler o DXF ('+err.message+').'}; }
  if(r.err){ S.blocks=saveBlocks; log('DXF: '+r.err,'er'); return false; }
  if(!merge){ resetLayouts(); S.ents=r.ents; S.sel=[]; resetHistory(); S.dirty=false; S.curLy=0; loadDimStyles({}); document.getElementById('ftitle').textContent=name; }
  else { snapshot(); S.ents=S.ents.concat(r.ents); }
  syncIdCounter(); updLayerUI(); updLayerSel(); zoomFit(); renderAll(); updStatus();
  var c=Object.keys(r.counts).map(function(k){return k+' '+r.counts[k];}).join(', '),sk=Object.keys(r.skipped).map(function(k){return k+' '+r.skipped[k];}).join(', ');
  log('DXF '+(r.ver||'')+(merge?' anexado':' aberto')+': '+r.ents.length+' objeto(s)'+(c?' ('+c+')':'')+(r.f!==1?' — unidades convertidas para mm (×'+r.f+')':'')+'.','ok');
  if(sk) log('Não importados: '+sk+'.','inf');
  return true;
}
var _loadFile_p3=loadFile;
loadFile=function(ev){
  var f=ev.target.files[0]; if(!f) return;
  if(/\.dxf$/i.test(f.name)){ var merge=!!S.dxfMerge; S.dxfMerge=false; var rd=new FileReader();
    rd.onload=function(e){ importDxfBuffer(e.target.result,f.name,merge); ev.target.value=''; }; rd.readAsArrayBuffer(f); return; }
  return _loadFile_p3(ev);
};
function dxfIn(merge){ S.dxfMerge=!!merge; var fi=document.getElementById('fileInput'); fi.click(); }



// ── v7.9: EXPLODE com seleção dentro do comando (como no AutoCAD) ──────────
NC.explode={needSel:true,prompt:function(){return '';},click:function(){},input:function(){return true;},
  afterSel:function(ds){ S.sel=ds.ids.slice(); explodeSel(); ncEnd(false); }};
