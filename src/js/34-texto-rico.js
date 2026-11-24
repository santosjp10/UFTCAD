/* ═══════════════════════════════════════════════════════════════════
   v8.7 — TEXTO COM VÁRIAS LINHAS E VÁRIOS TAMANHOS
   • A ferramenta Texto (DT) e o MTEXT usam o mesmo editor: Enter quebra a
     linha e a barra de tamanhos (Título, Subtítulo, Normal, Nota ou altura em
     mm) muda o tamanho do trecho selecionado — ou da linha inteira, se nada
     estiver selecionado.
   • Os tamanhos ficam gravados com os códigos do próprio AutoCAD no MTEXT:
     {\H2x;Título} = duas vezes a altura base. Saem assim no DXF e voltam na
     importação. Texto de uma linha e um tamanho continua sendo um TEXT comum.
   ═══════════════════════════════════════════════════════════════════ */

// ── 1. CÓDIGOS ↔ MODELO (parágrafos de trechos {t, k}; k = fator da altura base) ──
var RT_M0='',RT_M1='',RT_BASE=15;
function rtParse(txt,h){
  var s=String(txt==null?'':txt),paras=[[]],stack=[],k=1,buf='';
  function flush(){ if(!buf) return; var P=paras[paras.length-1],l=P[P.length-1]; if(l&&Math.abs(l.k-k)<1e-9) l.t+=buf; else P.push({t:buf,k:k}); buf=''; }
  for(var i=0;i<s.length;i++){
    var c=s[i];
    if(c==='\n'){ flush(); paras.push([]); continue; }
    if(c==='{'){ flush(); stack.push(k); continue; }
    if(c==='}'){ flush(); k=stack.length?stack.pop():1; continue; }
    if(c==='\\'){
      var nx=s[i+1],rest=s.slice(i),m;
      if(nx==='\\'||nx==='{'||nx==='}'){ buf+=nx; i++; continue; }
      if(nx==='P'){ flush(); paras.push([]); i++; continue; }
      if(nx==='~'){ buf+=' '; i++; continue; }
      if((m=/^\\[Hh](\d+(?:\.\d+)?|\.\d+)(x?);/.exec(rest))){ flush(); var v=parseFloat(m[1]); if(v>0) k=m[2]?k*v:v/(h||1); i+=m[0].length-1; continue; }
      if((m=/^\\S([^;]*);/.exec(rest))){ buf+=m[1].replace(/[\^#]/,'/'); i+=m[0].length-1; continue; }
      if((m=/^\\[AaCcFfQTtWw][^;]*;/.exec(rest))){ i+=m[0].length-1; continue; }
      if(/^\\[LlOoKkNX]/.test(rest)){ i++; continue; }
    }
    buf+=c;
  }
  flush(); return paras;
}
function rtNum(k){ var r=Math.round(k*1000)/1000; return String(r); }
function rtEsc(t){ return String(t).replace(/\\/g,'\\\\').replace(/\{/g,'\\{').replace(/\}/g,'\\}'); }
function rtSerialize(paras){
  return paras.map(function(P){ return P.map(function(r){ if(!r.t) return ''; return Math.abs(r.k-1)<1e-6?rtEsc(r.t):'{\\H'+rtNum(r.k)+'x;'+rtEsc(r.t)+'}'; }).join(''); }).join('\n');
}
function rtPlain(txt){ return rtParse(txt,1).map(function(P){ return P.map(function(r){return r.t;}).join(''); }).join('\n'); }
function rtIsRich(txt){ var P=rtParse(txt,1); return P.length>1||P.some(function(p){ return p.some(function(r){ return Math.abs(r.k-1)>1e-6; }); }); }
function rtKmax(P){ var m=0; P.forEach(function(r){ if(r.t&&r.k>m) m=r.k; }); return m||(P.length?P[P.length-1].k:1)||1; }

// ── 2. DIAGRAMAÇÃO DO MTEXT ─────────────────────────────────────────────────
// linhas: [{runs:[{t,k}], w (largura em unidades), km}]
function rtLines(e){
  var h=e.h,paras=rtParse(e.txt,h),out=[],maxW=e.w>0?e.w:Infinity,MT_CW=fontCW(e.font);
  paras.forEach(function(P){
    var ch=[]; P.forEach(function(r){ for(var i=0;i<r.t.length;i++) ch.push({c:r.t[i],k:r.k}); });
    function cw(a){ return a.reduce(function(s,q){ return s+MT_CW*h*q.k; },0); }
    function emit(a){ while(a.length&&a[a.length-1].c===' ') a.pop(); var runs=[]; a.forEach(function(q){ var l=runs[runs.length-1]; if(l&&l.k===q.k) l.t+=q.c; else runs.push({t:q.c,k:q.k}); });
      out.push({runs:runs,w:cw(a),km:runs.length?rtKmax(runs):(P.length?P[0].k:1)}); }
    if(!isFinite(maxW)||cw(ch)<=maxW){ emit(ch.slice()); return; }
    // quebra por palavras (e por caracteres, se a palavra não couber)
    var words=[],cur=[]; ch.forEach(function(q){ cur.push(q); if(q.c===' '){ words.push(cur); cur=[]; } }); if(cur.length) words.push(cur);
    var line=[];
    words.forEach(function(w){
      var trimmed=w.filter(function(q,i){ return !(q.c===' '&&i===w.length-1); });
      if(line.length&&cw(line)+cw(trimmed)>maxW){ emit(line); line=[]; }
      while(cw(trimmed)>maxW&&trimmed.length>1){ var n=0,acc=0; while(n<trimmed.length&&acc+MT_CW*h*trimmed[n].k<=maxW){ acc+=MT_CW*h*trimmed[n].k; n++; } n=Math.max(1,n);
        if(line.length){ emit(line); line=[]; } emit(trimmed.slice(0,n)); trimmed=trimmed.slice(n); w=trimmed; }
      line=line.concat(w); });
    if(line.length) emit(line);
  });
  return out;
}
mtLines=function(e){ return rtLines(e).map(function(l){ return l.runs.map(function(r){return r.t;}).join(''); }); };
mtLayout=function(e){
  var MT_CW=fontCW(e.font),L=rtLines(e),h=e.h,n=L.length,bl=[],y=0;
  L.forEach(function(l,i){ y=i===0?-h*l.km:y-MT_LS*h*l.km; bl.push(y); });
  var H=n?-bl[n-1]:h,W=e.w>0?e.w:Math.max.apply(null,L.map(function(l){return l.w;}).concat([MT_CW*h]));
  var att=e.att||1,col=(att-1)%3,row=Math.floor((att-1)/3),top=row===0?0:row===1?H/2:H;
  var align=['left','center','right'][col],left=col===0?0:col===1?-W/2:-W;
  return {lines:L.map(function(l,i){ return {txt:l.runs.map(function(r){return r.t;}).join(''),runs:l.runs,w:l.w,lx:0,ly:top+bl[i],align:align}; }),W:W,H:H,left:left,top:top};
};
mtPrims=function(e){
  var Lo=mtLayout(e),o=[],h=e.h,rot=e.rot||0,MT_CW=fontCW(e.font),fk=e.font;
  Lo.lines.forEach(function(l){
    if(!l.txt.trim()&&!l.txt) return;
    if(l.runs.length===1){ var p=mtLocalToWorld(e,l.lx,l.ly); o.push({k:'text',x:p.x,y:p.y,h:h*l.runs[0].k,rot:rot,txt:l.runs[0].t,align:l.align,font:fk}); return; }
    var ws=l.runs.map(function(r){ return fontMeasure(r.t,fk,h*r.k); }),lw=ws.reduce(function(a,b){return a+b;},0); // v8.10: largura real da fonte
    var x=l.align==='left'?0:l.align==='center'?-lw/2:-lw;
    l.runs.forEach(function(r,i){ if(r.t){ var q=mtLocalToWorld(e,x,l.ly); o.push({k:'text',x:q.x,y:q.y,h:h*r.k,rot:rot,txt:r.t,align:'left',font:fk}); } x+=ws[i]; });
  });
  return o;
};
(function(){ var lp=leaderPrims; leaderPrims=function(e,st){ if(e&&e.txt&&/[\\{}]/.test(e.txt)){ var c=Object.assign({},e); c.txt=rtPlain(e.txt); return lp(c,st); } return lp.apply(this,arguments); }; })();
// importação de DXF: mantém quebras de linha e tamanhos (\H) do MTEXT
function mtextRich(s,h){ var t=String(s).replace(/%%[dD]/g,'°').replace(/%%[cC]/g,'⌀').replace(/%%[pP]/g,'±').replace(/%%[uUoO]/g,''); t=(typeof dxfTxt==='function')?dxfTxt(t):t; return rtSerialize(rtParse(t,h)).replace(/\n+$/,''); }

// ── 3. EDITOR VISUAL ────────────────────────────────────────────────────────
var RTE={root:null,range:null};
function rtRender(root,paras){
  root.textContent='';
  (paras.length?paras:[[]]).forEach(function(P){ var d=document.createElement('div');
    var has=P.some(function(r){return r.t;});
    if(!has){ d.appendChild(document.createElement('br')); if(P.length) d.style.fontSize=(RT_BASE*P[0].k)+'px'; }
    P.forEach(function(r){ if(!r.t) return; var sp=document.createElement('span'); sp.style.fontSize=(RT_BASE*r.k)+'px'; sp.setAttribute('data-k',rtNum(r.k)); sp.textContent=r.t; d.appendChild(sp); });
    root.appendChild(d); });
}
function rtRead(root){
  var paras=[],cur=null;
  function kOf(el){ var fs=parseFloat(getComputedStyle(el).fontSize)||RT_BASE; return Math.round(fs/RT_BASE*1000)/1000; }
  function push(t,k){ if(!cur){ cur=[]; paras.push(cur); } var l=cur[cur.length-1]; if(l&&Math.abs(l.k-k)<1e-3) l.t+=t; else cur.push({t:t,k:k}); }
  function block(n){ return /^(DIV|P|LI|H[1-6]|UL|OL|BLOCKQUOTE)$/.test(n.nodeName); }
  (function walk(n){
    Array.prototype.forEach.call(n.childNodes,function(c){
      if(c.nodeType===3){ var t=c.nodeValue.replace(/ /g,' ').replace(/[\r\n]/g,''); if(t) push(t,kOf(c.parentElement)); }
      else if(c.nodeName==='BR'){ if(!cur){ cur=[{t:'',k:kOf(n)}]; paras.push(cur); } if(c.nextSibling||n===root) cur=null; }
      else if(c.nodeType===1&&block(c)){ cur=[]; paras.push(cur); walk(c); if(!cur.length) cur.push({t:'',k:kOf(c)}); cur=null; }
      else if(c.nodeType===1) walk(c);
    });
  })(root);
  if(!paras.length) paras=[[]];
  return paras.map(function(P){ return P.filter(function(r,i){ return r.t||P.length===1; }); });
}
function rtSaveRange(){ var r=RTE.root,s=window.getSelection(); if(r&&s.rangeCount&&r.contains(s.getRangeAt(0).commonAncestorContainer)) RTE.range=s.getRangeAt(0).cloneRange(); }
// aplica o fator k ao trecho selecionado (ou à linha do cursor, se nada estiver selecionado)
function rtApply(k){
  var root=RTE.root; if(!root||!(k>0)) return;
  var r=RTE.range;
  if(!r||!root.contains(r.commonAncestorContainer)){ r=document.createRange(); r.selectNodeContents(root); }
  var collapsed=r.collapsed;
  var m1=document.createTextNode(RT_M1),m0=document.createTextNode(RT_M0);
  if(!collapsed){ var re=r.cloneRange(); re.collapse(false); re.insertNode(m1); }
  r.collapse(true); r.insertNode(m0);
  var paras=rtRead(root),pos={};
  // localiza os marcadores e retira do texto
  paras.forEach(function(P,pi){ var off=0; P.forEach(function(run){ var t=run.t,j;
      while((j=t.search(/[]/))>=0){ pos[t[j]]={p:pi,c:off+j}; t=t.slice(0,j)+t.slice(j+1); } run.t=t; off+=t.length; }); });
  var a=pos[RT_M0]||{p:0,c:0},b=pos[RT_M1]||a;
  paras=paras.map(function(P,pi){
    var ch=[]; P.forEach(function(run){ for(var i=0;i<run.t.length;i++) ch.push({c:run.t[i],k:run.k}); });
    if(collapsed){ if(pi===a.p){ ch.forEach(function(q){ q.k=k; }); if(!ch.length) return [{t:'',k:k}]; } }
    else ch.forEach(function(q,i){ var after=pi>a.p||(pi===a.p&&i>=a.c),before=pi<b.p||(pi===b.p&&i<b.c); if(after&&before) q.k=k; });
    var runs=[]; ch.forEach(function(q){ var l=runs[runs.length-1]; if(l&&Math.abs(l.k-q.k)<1e-9) l.t+=q.c; else runs.push({t:q.c,k:q.k}); });
    return runs.length?runs:(P.length?[{t:'',k:P[0].k}]:[]);
  });
  rtRender(root,paras);
  // seleção restaurada sobre o mesmo trecho
  try{ var divs=root.children,sel=window.getSelection(),nr=document.createRange();
    function place(pt,setter){ var d=divs[pt.p]; if(!d) return; var off=pt.c,spans=d.querySelectorAll('span');
      for(var i=0;i<spans.length;i++){ var tn=spans[i].firstChild,L=tn.nodeValue.length; if(off<=L){ nr[setter](tn,off); return; } off-=L; } nr[setter](d,d.childNodes.length); }
    if(collapsed){ place({p:a.p,c:a.c},'setStart'); nr.collapse(true); } else { place(a,'setStart'); place(b,'setEnd'); }
    sel.removeAllRanges(); sel.addRange(nr); RTE.range=nr.cloneRange(); }catch(err){}
  root.focus(); rtHint();
}
function rtBaseH(){ var v=parseFloat(String(document.getElementById('mted-h').value).replace(',','.')); return v>0?v:2.5; }
function rtHint(){ var hs=document.getElementById('rt-info'); if(!hs||!RTE.root) return; var P=rtRead(RTE.root),ks={}; P.forEach(function(p){ p.forEach(function(r){ if(r.t) ks[rtNum(r.k)]=1; }); });
  var b=rtBaseH(),L=Object.keys(ks).map(Number).sort(function(x,y){return y-x;}).map(function(k){ return gNum(Math.round(b*k*100)/100)+' mm'; });
  hs.textContent=P.length+' linha(s)'+(L.length>1?' · tamanhos: '+L.join(', '):''); }
window.addEventListener('load',function(){
  var old=document.getElementById('mted-txt'); if(!old) return;
  var bar=document.createElement('div'); bar.className='rt-bar'; bar.id='rt-bar';
  [['Título',2,'rt-t1'],['Subtítulo',1.5,'rt-t2'],['Normal',1,'rt-t3'],['Nota',0.75,'rt-t4']].forEach(function(b){
    var bt=document.createElement('button'); bt.type='button'; bt.className='btn s rt-sz'; bt.id=b[2]; bt.textContent=b[0]+' ×'+String(b[1]).replace('.',','); bt.title='Tamanho do trecho selecionado (ou da linha do cursor): '+String(b[1]).replace('.',',')+' × a altura base';
    bt.addEventListener('mousedown',function(ev){ ev.preventDefault(); rtSaveRange(); }); bt.addEventListener('click',function(){ rtApply(b[1]); }); bar.appendChild(bt); });
  var lb=document.createElement('label'); lb.className='rt-mm'; lb.textContent='ou altura '; var inp=document.createElement('input'); inp.id='rt-mm'; inp.placeholder='mm'; lb.appendChild(inp);
  var ap=document.createElement('button'); ap.type='button'; ap.className='btn s'; ap.id='rt-ap'; ap.textContent='Aplicar'; ap.addEventListener('mousedown',function(ev){ ev.preventDefault(); });
  ap.addEventListener('click',function(){ var v=parseFloat(String(inp.value).replace(',','.')); if(v>0) rtApply(v/rtBaseH()); });
  inp.addEventListener('keydown',function(ev){ if(ev.key==='Enter'){ ev.preventDefault(); ap.click(); } });
  lb.appendChild(ap); bar.appendChild(lb);
  var ed=document.createElement('div'); ed.id='mted-txt'; ed.className='rt-ed'; ed.contentEditable='true'; ed.spellcheck=false; ed.setAttribute('role','textbox'); ed.setAttribute('aria-multiline','true');
  ed.style.fontSize=RT_BASE+'px';
  var info=document.createElement('div'); info.id='rt-info'; info.className='rt-info';
  old.parentNode.insertBefore(bar,old); old.parentNode.insertBefore(ed,old); old.parentNode.insertBefore(info,old); old.remove();
  RTE.root=ed;
  Object.defineProperty(ed,'value',{get:function(){ return rtSerialize(rtRead(ed)).replace(/\n+$/,''); },set:function(v){ rtRender(ed,rtParse(v,rtBaseH())); rtHint(); }});
  ed.select=function(){ var r=document.createRange(); r.selectNodeContents(ed); var s=window.getSelection(); s.removeAllRanges(); s.addRange(r); RTE.range=r.cloneRange(); };
  ed.addEventListener('keydown',function(ev){ if(ev.key==='Enter'&&(ev.ctrlKey||ev.metaKey)){ ev.preventDefault(); mtEditorOK(); } else if(ev.key==='Escape'){ ev.preventDefault(); mtEditorCancel(); } });
  ed.addEventListener('paste',function(ev){ ev.preventDefault(); var t=(ev.clipboardData||window.clipboardData).getData('text/plain'); document.execCommand('insertText',false,t); });
  ed.addEventListener('input',rtHint); ed.addEventListener('keyup',rtSaveRange); ed.addEventListener('mouseup',rtSaveRange);
  document.addEventListener('selectionchange',rtSaveRange);
  document.getElementById('mted-h').addEventListener('input',rtHint);
  var tip=document.querySelector('#ov-mtext .modal > div[style*="font-size:9px"]'); if(tip) tip.textContent='Enter quebra a linha · selecione um trecho (ou ponha o cursor na linha) e escolha o tamanho · Ctrl+Enter confirma';
});
(function(){ var op=mtEditorOpen,cn=mtEditorCancel;
  mtEditorOpen=function(opts,cb){ var r=op.apply(this,arguments); var ed=document.getElementById('mted-txt'); ed.value=opts.txt||''; // altura base já preenchida
    var bar=document.getElementById('rt-bar'); if(bar) bar.style.display=opts.noH?'none':''; RTE.range=null; rtHint(); return r; };
  mtEditorCancel=function(){ if(S.tool==='text'&&S.ds) S.ds=null; return cn.apply(this,arguments); };
})();

// ── 4. FERRAMENTA TEXTO (DT): o mesmo editor, com várias linhas e tamanhos ──
(function(){ var hc=handleClick;
  handleClick=function(pt){
    if(S.tool==='text'&&!S.ds){
      var r=hc.apply(this,arguments); closeOv('ov-text'); var p0=S.ds&&S.ds.pts?S.ds.pts[0]:{x:pt.x,y:pt.y};
      var h0=parseFloat(document.getElementById('th').value)||10;
      mtEditorOpen({title:'Texto — Enter quebra a linha; os botões mudam o tamanho',h:h0,att:1},function(res){
        var paras=rtParse(res.txt,res.h),plain=rtPlain(res.txt);
        if(!plain.trim()){ S.ds=null; log('Texto vazio: nada criado.','inf'); return; }
        document.getElementById('th').value=res.h;
        if(!rtIsRich(res.txt)&&res.att===1&&!res.annot){ S.ds={pts:[p0]}; document.getElementById('tv').value=plain; confirmText(); log('Texto criado.','ok'); return; }
        var k0=rtKmax(paras[0]||[]),y=res.att===1?p0.y+res.h*k0:p0.y;
        snapshot(); addE({tp:'mtext',x:p0.x,y:y,w:0,h:res.h,txt:res.txt,att:res.att,rot:0,annot:!!res.annot},true); S.ds=null;
        log('Texto criado: '+paras.length+' linha(s)'+(rtIsRich(res.txt)&&paras.length===1?' com tamanhos diferentes':'')+'.','ok'); renderAll();
      });
      return r;
    }
    return hc.apply(this,arguments);
  };
})();

// ── v8.7: ponto digitado na linha de comando é marcado (a cota linear usa a posição digitada, não a do mouse) ──
(function(){ var ok0=onCmdKey; onCmdKey=function(e){ if(e&&e.key==='Enter'){ var was=S._typedPt; S._typedPt=true; try{ return ok0.apply(this,arguments); } finally { S._typedPt=was; } } return ok0.apply(this,arguments); }; })();
