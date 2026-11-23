/* ═══════════════════════════════════════════════════════════════════
   v7.3 — PACOTE 4: ALTA RESOLUÇÃO, TOQUE E TELAS PEQUENAS
   • Canvas na resolução física da tela (devicePixelRatio): linhas e textos nítidos.
   • Toque (tablet/celular): toque = clique; arrastar com 1 dedo = PAN;
     pinça com 2 dedos = ZOOM; toque duplo = duplo clique; toque longo = Enter.
   • Barra de toque: Enter, Esc, Desfazer, Shift e teclado.
   • Telas estreitas: painel lateral recolhível (☰).
   ═══════════════════════════════════════════════════════════════════ */
function cvW(){ return S.W||(S.wrap&&S.wrap.clientWidth)||S.cD.width; }
function cvH(){ return S.H||(S.wrap&&S.wrap.clientHeight)||S.cD.height; }
var TCH={pts:{},mode:null,start:null,moved:false,pinch:null,lastTap:null,lp:null,shift:false};
function tchFake(x,y){ return {target:document.elementFromPoint(x,y)||S.cO,currentTarget:S.wrap,clientX:x,clientY:y,button:0,buttons:1,shiftKey:TCH.shift,ctrlKey:false,altKey:false,metaKey:false,pointerType:'touch',preventDefault:function(){},stopPropagation:function(){}}; }
function tchCount(){ return Object.keys(TCH.pts).length; }
function tchPinchInfo(){ var k=Object.keys(TCH.pts),a=TCH.pts[k[0]],b=TCH.pts[k[1]]; return {d:Math.hypot(a.x-b.x,a.y-b.y),mx:(a.x+b.x)/2,my:(a.y+b.y)/2}; }
function tchEnter(){ onKey({key:'Enter',code:'Enter',preventDefault:function(){},stopPropagation:function(){},ctrlKey:false,altKey:false,shiftKey:false,metaKey:false}); }
function tchDown(e){
  if(e.pointerType!=='touch') return;
  e.preventDefault(); document.body.classList.add('touch');
  try{ S.wrap.setPointerCapture(e.pointerId); }catch(err){}
  TCH.pts[e.pointerId]={x:e.clientX,y:e.clientY};
  var n=tchCount();
  if(n===1){ TCH.mode='tap'; TCH.moved=false; TCH.start={x:e.clientX,y:e.clientY,t:Date.now()};
    clearTimeout(TCH.lp); TCH.lp=setTimeout(function(){ if(TCH.mode==='tap'&&!TCH.moved){ TCH.mode='done'; tchEnter(); if(navigator.vibrate) try{navigator.vibrate(15);}catch(err){} } },600);
    onMM(tchFake(e.clientX,e.clientY)); }
  else if(n===2){ clearTimeout(TCH.lp); var r=S.wrap.getBoundingClientRect(),P=tchPinchInfo(); TCH.mode='pinch';
    TCH.pinch={d0:P.d||1,mx0:P.mx-r.left,my0:P.my-r.top,vp:{x:S.vp.x,y:S.vp.y,sc:S.vp.sc}}; }
}
function tchMove(e){
  if(e.pointerType!=='touch'||!TCH.pts[e.pointerId]) return;
  e.preventDefault();
  var prev=TCH.pts[e.pointerId]; TCH.pts[e.pointerId]={x:e.clientX,y:e.clientY};
  if(TCH.mode==='pinch'&&tchCount()>=2){
    var r=S.wrap.getBoundingClientRect(),P=tchPinchInfo(),pz=TCH.pinch,f=P.d/pz.d0,sc=Math.max(0.01,Math.min(5000,pz.vp.sc*f));
    var wx=(pz.mx0-pz.vp.x)/pz.vp.sc,wy=-(pz.my0-pz.vp.y)/pz.vp.sc,mx=P.mx-r.left,my=P.my-r.top;
    S.vp.sc=sc; S.vp.x=mx-wx*sc; S.vp.y=my+wy*sc; renderAll(); updStatus(); return;
  }
  if(TCH.mode==='tap'||TCH.mode==='pan'){
    if(TCH.mode==='tap'&&Math.hypot(e.clientX-TCH.start.x,e.clientY-TCH.start.y)>10){ TCH.mode='pan'; TCH.moved=true; clearTimeout(TCH.lp); prev=TCH.start; } // o pan inclui o trecho inicial
    if(TCH.mode==='pan'){ S.vp.x+=e.clientX-prev.x; S.vp.y+=e.clientY-prev.y; renderAll(); }
    else onMM(tchFake(e.clientX,e.clientY));
  }
}
function tchUp(e){
  if(e.pointerType!=='touch'||!TCH.pts[e.pointerId]) return;
  e.preventDefault();
  var p=TCH.pts[e.pointerId]; delete TCH.pts[e.pointerId]; clearTimeout(TCH.lp);
  if(TCH.mode==='tap'&&!TCH.moved&&tchCount()===0){
    var f=tchFake(p.x,p.y),now=Date.now(),dbl=TCH.lastTap&&now-TCH.lastTap.t<350&&Math.hypot(p.x-TCH.lastTap.x,p.y-TCH.lastTap.y)<25;
    onMM(f); onMD(f); onMU(f);
    if(dbl){ S.wrap.dispatchEvent(new MouseEvent('dblclick',{clientX:p.x,clientY:p.y,bubbles:true})); TCH.lastTap=null; }
    else TCH.lastTap={t:now,x:p.x,y:p.y};
    if(TCH.shift){ TCH.shift=false; var sb=document.getElementById('tb-shift'); if(sb) sb.classList.remove('on'); }
  }
  if(tchCount()===0) TCH.mode=null; else if(TCH.mode==='pinch') TCH.mode='done';
}
function touchBarAction(a){
  if(a==='enter') tchEnter();
  else if(a==='esc') onKey({key:'Escape',code:'Escape',preventDefault:function(){},stopPropagation:function(){},ctrlKey:false,altKey:false,shiftKey:false,metaKey:false});
  else if(a==='undo') undo();
  else if(a==='shift'){ TCH.shift=!TCH.shift; document.getElementById('tb-shift').classList.toggle('on',TCH.shift); }
  else if(a==='kbd'){ var ci=document.getElementById('cmdinput'); ci.focus(); }
  else if(a==='fit') zoomFit();
}
function buildTouchUI(){
  var bar=document.createElement('div'); bar.id='touchbar';
  [['enter','⏎','Enter (confirma / repete o comando)'],['esc','Esc','Cancelar'],['undo','↶','Desfazer'],['shift','⇧','Shift no próximo toque'],['fit','⤢','Zoom extensão'],['kbd','⌨','Digitar comando']].forEach(function(b){
    var el=document.createElement('button'); el.className='tb-touch'; el.id='tb-'+b[0]; el.textContent=b[1]; el.title=b[2];
    el.addEventListener('click',function(ev){ ev.preventDefault(); touchBarAction(b[0]); }); bar.appendChild(el); });
  document.body.appendChild(bar);
  var fs=document.getElementById('btn-fs');
  if(fs){ var pb=document.createElement('button'); pb.className='tb-btn'; pb.id='btn-panel'; pb.textContent='☰ Painéis'; pb.title='Mostrar/ocultar o painel lateral';
    pb.addEventListener('click',function(){ document.body.classList.toggle('rp-open'); setTimeout(resize,30); }); fs.parentNode.insertBefore(pb,fs); }
  try{ if(window.matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch'); }catch(err){}
}
window.addEventListener('load',function(){
  var w=S.wrap||document.getElementById('cw'); if(!w) return;
  w.style.touchAction='none';
  w.addEventListener('pointerdown',tchDown,{passive:false});
  w.addEventListener('pointermove',tchMove,{passive:false});
  w.addEventListener('pointerup',tchUp,{passive:false});
  w.addEventListener('pointercancel',tchUp,{passive:false});
  buildTouchUI();
  // mudança de resolução (monitor diferente ou zoom do navegador)
  var mq=null; function watchDpr(){ try{ if(mq) mq.removeEventListener('change',onDpr); mq=window.matchMedia('(resolution: '+(window.devicePixelRatio||1)+'dppx)'); mq.addEventListener('change',onDpr); }catch(err){} }
  function onDpr(){ resize(); watchDpr(); }
  watchDpr();
});


