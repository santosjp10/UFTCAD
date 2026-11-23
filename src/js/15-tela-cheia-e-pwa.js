/* ═══════════════════════════════════════════════════════════════════
   v6.5 — TELA CHEIA, TELA LIMPA E APLICATIVO INSTALÁVEL
   Por segurança, nenhum navegador permite que uma página entre em tela cheia
   sozinha: é preciso um clique ou tecla do usuário. Por isso o EduCAD abre
   com uma tela inicial cujo botão faz exatamente isso.
   No Chrome/Edge a tecla Esc é "travada" (Keyboard Lock) durante a tela
   cheia, para continuar cancelando comandos; para sair, segura-se o Esc.
   ═══════════════════════════════════════════════════════════════════ */
var APP={installEvt:null,escLocked:false};
function fsSupported(){var d=document.documentElement;return !!(d.requestFullscreen||d.webkitRequestFullscreen);}
function isFullscreen(){return !!(document.fullscreenElement||document.webkitFullscreenElement);}
function isStandalone(){try{return window.matchMedia('(display-mode: standalone)').matches||window.matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;}catch(e){return false;}}
function enterFullscreen(){
  var d=document.documentElement,p;
  try{ p=d.requestFullscreen?d.requestFullscreen({navigationUI:'hide'}):(d.webkitRequestFullscreen&&d.webkitRequestFullscreen()); }
  catch(err){ log('Tela cheia não permitida: '+err.message,'er'); return; }
  if(p&&p.then) p.then(lockEsc).catch(function(err){log('O navegador recusou a tela cheia ('+err.message+'). Use F11.','er');});
  else lockEsc();
}
function exitFullscreen(){
  try{ if(navigator.keyboard&&navigator.keyboard.unlock) navigator.keyboard.unlock(); }catch(e){}
  APP.escLocked=false;
  if(document.exitFullscreen) document.exitFullscreen().catch(function(){}); else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
}
function toggleFullscreen(){ if(!fsSupported()){log('Este navegador não oferece tela cheia por botão. Use F11.','er');return;} if(isFullscreen()) exitFullscreen(); else enterFullscreen(); }
function lockEsc(){
  if(navigator.keyboard&&navigator.keyboard.lock){
    navigator.keyboard.lock(['Escape']).then(function(){APP.escLocked=true;fsMsg();}).catch(function(){APP.escLocked=false;fsMsg();});
  } else fsMsg();
}
function fsMsg(){
  if(!isFullscreen()) return;
  log(APP.escLocked?'Tela cheia. Esc continua cancelando comandos; para sair, mantenha Esc pressionado ou use o botão ⛶ / comando TELACHEIA.'
                    :'Tela cheia. Neste navegador a tecla Esc também sai da tela cheia; para cancelar comandos use o botão direito do mouse.','inf');
}
function onFsChange(){
  var on=isFullscreen(),b=document.getElementById('btn-fs');
  if(b){b.classList.toggle('on',on);b.textContent=on?'⛶ Sair da tela cheia':'⛶ Tela cheia';}
  if(!on){ APP.escLocked=false; try{ if(navigator.keyboard&&navigator.keyboard.unlock) navigator.keyboard.unlock(); }catch(e){} }
  setTimeout(resize,60);
}
document.addEventListener('fullscreenchange',onFsChange);
document.addEventListener('webkitfullscreenchange',onFsChange);
// Tela limpa (como CLEANSCREENON/Ctrl+0 do AutoCAD): oculta faixa de opções e painel direito
function toggleCleanScreen(){
  var on=document.body.classList.toggle('clean');
  var b=document.getElementById('btn-clean'); if(b) b.classList.toggle('on',on);
  resize();
  log(on?'Tela limpa: faixa de opções e painéis ocultos (Ctrl+0 ou comando LIMPA para voltar). Os comandos continuam pela linha de comando.':'Tela limpa desativada.','inf');
}
// Tela de abertura
function startPref(){ try{return localStorage.getItem('educad.inicio');}catch(e){return null;} }
function showStartScreen(force){
  var q=/[?&](fullscreen|telacheia)=1/.test(location.search);
  if(!force){
    if(navigator.webdriver) return false;          // testes automatizados
    if(isStandalone()) return false;               // já instalado como aplicativo
    if(!fsSupported()) return false;
    if(startPref()==='janela'&&!q) return false;
  }
  var n=document.getElementById('ss-note');
  n.textContent=(isStandalone()?'':'Dica: no Chrome ou no Edge, use “⬇ Instalar” na barra superior para ter o EduCAD como um aplicativo do computador, em janela própria e com ícone na área de trabalho. ')+'Na tela cheia, o F11 do navegador e o botão ⛶ também alternam o modo.';
  document.getElementById('startscr').style.display='flex';
  setTimeout(function(){var g=document.getElementById('ss-go');if(g)g.focus();},50);
  return true;
}
function startApp(full){
  try{ if(document.getElementById('ss-skip').checked) localStorage.setItem('educad.inicio','janela'); }catch(e){}
  document.getElementById('startscr').style.display='none';
  if(full) enterFullscreen();
  setTimeout(resize,60);
}
// Instalação como aplicativo (Chrome/Edge em https ou localhost)
window.addEventListener('beforeinstallprompt',function(e){ e.preventDefault(); APP.installEvt=e; var b=document.getElementById('btn-install'); if(b) b.style.display=''; });
window.addEventListener('appinstalled',function(){ APP.installEvt=null; var b=document.getElementById('btn-install'); if(b) b.style.display='none'; log('EduCAD instalado como aplicativo. Abra pelo ícone na área de trabalho ou no menu Iniciar.','ok'); });
function appInstall(){
  if(!APP.installEvt){ log('Instalação: use o menu do navegador (⋮ → Instalar EduCAD / Aplicativos → Instalar este site).','inf'); return; }
  APP.installEvt.prompt(); APP.installEvt.userChoice.then(function(){ APP.installEvt=null; });
}
function registerSW(){
  if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
    navigator.serviceWorker.register('sw.js').catch(function(err){ console.warn('Service worker não registrado:',err); });
  }
}

