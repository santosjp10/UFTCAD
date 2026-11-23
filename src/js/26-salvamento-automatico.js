/* ═══════════════════════════════════════════════════════════════════
   v7.7 — SALVAMENTO AUTOMÁTICO E RECUPERAÇÃO (R1 do parecer técnico)
   • Uma cópia do desenho (modelo + layouts + blocos + estilos) é gravada no
     próprio navegador: 8 s depois de cada alteração e a cada SAVETIME minutos
     (padrão 1), ao trocar de aba/janela e ao fechar a página.
   • Ao abrir o EduCAD, se houver desenho com alterações não salvas em arquivo,
     aparece "Recuperar desenhos" (recuperar, baixar .json ou descartar).
   • Armazenamento: IndexedDB; se o navegador não permitir, localStorage.
   • Comandos: RECUPERAR (RECOVER), SAVETIME, LIMPARRECUPERACAO.
   ═══════════════════════════════════════════════════════════════════ */
var AS={db:null,mode:null,sid:'s'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),timer:null,iv:null,
  lastJson:null,lastDirty:null,lastTs:0,delay:8000,keep:5,minutes:1,started:Date.now(),LS:'educad-as:'};
try{ var _st=localStorage.getItem('educad-savetime'); if(_st!==null&&!isNaN(+_st)) AS.minutes=Math.max(0,Math.min(120,+_st)); }catch(e){}

// ── armazenamento (IndexedDB, com localStorage como reserva) ────────────────
function asLsOk(){ try{ localStorage.setItem('educad-as-test','1'); localStorage.removeItem('educad-as-test'); return true; }catch(e){ return false; } }
function asOpen(cb){
  if(AS.mode){ cb(); return; }
  var done=false; function fin(m){ if(done) return; done=true; AS.mode=m; cb(); }
  try{
    if(!window.indexedDB) return fin(asLsOk()?'ls':'none');
    var rq=indexedDB.open('educad-autosave',1);
    rq.onupgradeneeded=function(){ try{ rq.result.createObjectStore('docs',{keyPath:'id'}); }catch(e){} };
    rq.onsuccess=function(){ AS.db=rq.result; fin('idb'); };
    rq.onerror=function(){ fin(asLsOk()?'ls':'none'); };
    rq.onblocked=function(){ fin(asLsOk()?'ls':'none'); };
    setTimeout(function(){ fin(asLsOk()?'ls':'none'); },3000);
  }catch(e){ fin(asLsOk()?'ls':'none'); }
}
function asLsPut(rec){ try{ localStorage.setItem(AS.LS+rec.id,JSON.stringify(rec)); return true; }catch(e){ return false; } }
function asLsAll(){ var o=[]; try{ for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(k&&k.indexOf(AS.LS)===0){ try{ o.push(JSON.parse(localStorage.getItem(k))); }catch(e){} } } }catch(e){} return o; }
function asPut(rec,cb){
  cb=cb||function(){};
  if(AS.mode==='idb'&&AS.db){ try{ var tx=AS.db.transaction('docs','readwrite'); tx.objectStore('docs').put(rec); tx.oncomplete=function(){ cb(true); }; tx.onerror=function(){ cb(asLsPut(rec)); }; return; }catch(e){} }
  if(AS.mode==='ls'||AS.mode==='idb') return cb(asLsPut(rec));
  cb(false);
}
function asList(cb){
  var ls=asLsAll();
  function merge(a){ var m={}; a.concat(ls).forEach(function(r){ if(r&&r.id&&(!m[r.id]||r.ts>m[r.id].ts)) m[r.id]=r; }); cb(Object.keys(m).map(function(k){return m[k];}).sort(function(x,y){return y.ts-x.ts;})); }
  if(AS.mode==='idb'&&AS.db){ try{ var rq=AS.db.transaction('docs','readonly').objectStore('docs').getAll(); rq.onsuccess=function(){ merge(rq.result||[]); }; rq.onerror=function(){ merge([]); }; return; }catch(e){} }
  merge([]);
}
function asDel(id,cb){
  try{ localStorage.removeItem(AS.LS+id); }catch(e){}
  if(AS.mode==='idb'&&AS.db){ try{ var tx=AS.db.transaction('docs','readwrite'); tx.objectStore('docs').delete(id); tx.oncomplete=function(){ (cb||function(){})(); }; tx.onerror=function(){ (cb||function(){})(); }; return; }catch(e){} }
  (cb||function(){})();
}
function asPrune(){ asList(function(L){ L.slice(AS.keep).forEach(function(r){ asDel(r.id); }); }); }

// ── conteúdo do desenho (sempre a partir do modelo, como o Salvar) ──────────
function asDocJson(){
  if(S.space==='model') return JSON.stringify(buildDoc());
  spaceSave(); var e=S.ents,vp=S.vp,sp=S.space; S.ents=S.modelEnts; S.vp=S.modelVp||S.vp; S.space='model';
  try{ return JSON.stringify(buildDoc()); } finally { S.ents=e; S.vp=vp; S.space=sp; }
}
function asCount(){ var n=(S.space==='model'?S.ents:(S.modelEnts||[])).length; (S.layouts||[]).forEach(function(L){ var ents=L.id===S.space?S.ents:L.ents; n+=ents.filter(function(x){return x.tp!=='viewport';}).length; }); return n; }
function asSaveNow(reason,cb){
  cb=cb||function(){};
  if(!AS.minutes&&reason!=='arquivo'&&reason!=='novo') return cb(false);
  asOpen(function(){
    if(AS.mode==='none'){ asStatus(); return cb(false); }
    var json; try{ json=asDocJson(); }catch(e){ return cb(false); }
    var dirty=!!S.dirty;
    if(json===AS.lastJson&&dirty===AS.lastDirty) return cb(true);
    var rec={id:AS.sid,ts:Date.now(),name:(document.getElementById('ftitle')||{}).textContent||'Sem título',dirty:dirty,n:asCount(),v:'7.7',json:json};
    asPut(rec,function(ok){ if(ok){ AS.lastJson=json; AS.lastDirty=dirty; AS.lastTs=rec.ts; AS.pending=false; asPrune(); } asStatus(); cb(ok); });
  });
}
function asSchedule(){ if(!AS.minutes) return; AS.pending=true; clearTimeout(AS.timer); AS.timer=setTimeout(function(){ asSaveNow('alteração'); },AS.delay); asStatus(); }
function asAfterLoad(){ AS.lastJson=null; setTimeout(function(){ asSaveNow('arquivo'); },0); }
function asRestartInterval(){ clearInterval(AS.iv); AS.iv=null; if(AS.minutes>0) AS.iv=setInterval(function(){ if(S.dirty) asSaveNow('intervalo'); },AS.minutes*60000); asStatus(); }
function hhmm(ts){ var d=new Date(ts); return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2); }
function dmy(ts){ var d=new Date(ts); return ('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear()+' '+hhmm(ts); }
function asStatus(){
  var el=document.getElementById('sautosave'); if(!el) return;
  var t,c;
  if(AS.mode==='none'){ t='● Salvamento automático indisponível neste navegador'; c='#e85050'; }
  else if(!AS.minutes){ t='○ Salvamento automático desligado (SAVETIME)'; c='var(--t2)'; }
  else if(AS.pending||(S.dirty&&AS.lastJson===null)){ t='● Guardando cópia de segurança…'; c='#f5a623'; }
  else if(AS.lastTs){ t='● Cópia de segurança '+hhmm(AS.lastTs); c='#4ec87a'; }
  else { t='● Salvamento automático ativo'; c='#4ec87a'; }
  el.textContent=t; el.style.color=c;
}

// ── ganchos: alterações, salvar, novo, fechar ───────────────────────────────
(function(){
  var sn=snapshot,un=undo,re=redo,sv=saveDoc,nd=newDoc;
  snapshot=function(){ var r=sn.apply(this,arguments); asSchedule(); return r; };
  undo=function(){ var r=un.apply(this,arguments); asSchedule(); return r; };
  redo=function(){ var r=re.apply(this,arguments); asSchedule(); return r; };
  saveDoc=function(){ var r=sv.apply(this,arguments); if(!S.dirty) asSaveNow('arquivo'); return r; };
  newDoc=function(){ var r=nd.apply(this,arguments); if(!S.dirty){ AS.lastJson=null; asSaveNow('novo'); } return r; };
})();
function asFlush(){ if(!AS.minutes||!S.dirty) return; try{ var json=asDocJson(); var rec={id:AS.sid,ts:Date.now(),name:(document.getElementById('ftitle')||{}).textContent||'Sem título',dirty:true,n:asCount(),v:'7.7',json:json};
  asLsPut(rec); if(AS.mode==='idb') asPut(rec); AS.lastJson=json; AS.lastDirty=true; AS.lastTs=rec.ts; }catch(e){} }
document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden') asFlush(); });
window.addEventListener('pagehide',asFlush);
window.addEventListener('beforeunload',asFlush);

// ── recuperação ─────────────────────────────────────────────────────────────
function asRecover(rec){
  var d; try{ d=JSON.parse(rec.json); }catch(e){ log('Recuperação: cópia corrompida.','er'); return false; }
  var nm=String(rec.name||'Sem título').replace(/ \(recuperado\)$/,'')+' (recuperado)';
  var err=applyDoc(d,nm); if(err){ log('Recuperação: '+err,'er'); return false; }
  S.dirty=true; AS.lastJson=null; asDel(rec.id); asSaveNow('recuperado');
  renderAll(); updStatus(); log('Desenho recuperado de '+dmy(rec.ts)+' ('+rec.n+' objeto(s)). Salve em arquivo com Ctrl+S.','ok');
  return true;
}
function asDownload(rec){ var nm=String(rec.name||'educad').replace(/\.json$/i,'').replace(/[\\/:*?"<>|]+/g,'_')+' - recuperado '+dmy(rec.ts).replace(/[\/: ]/g,'-')+'.json';
  var pretty; try{ pretty=JSON.stringify(JSON.parse(rec.json),null,2); }catch(e){ pretty=rec.json; } downloadBlob(pretty,'application/json',nm); }
function asDialog(list,all){
  var ov=document.getElementById('ov-recover'); if(!ov) return;
  var box=document.getElementById('rec-list'); box.textContent='';
  document.getElementById('rec-title').textContent=all?'Cópias de segurança neste navegador':'Recuperar desenhos';
  document.getElementById('rec-lead').textContent=all?'Cópias guardadas automaticamente (as 5 mais recentes).':'O EduCAD foi fechado com alterações que não foram salvas em arquivo. Escolha o que fazer com cada cópia:';
  if(!list.length){ var p=document.createElement('div'); p.className='rec-empty'; p.textContent='Nenhuma cópia de segurança.'; box.appendChild(p); }
  list.forEach(function(r){
    var row=document.createElement('div'); row.className='rec-row';
    var info=document.createElement('div'); info.className='rec-info';
    var t=document.createElement('div'); t.className='rec-name'; t.textContent=r.name||'Sem título';
    var m=document.createElement('div'); m.className='rec-meta'; m.textContent=dmy(r.ts)+' · '+r.n+' objeto(s)'+(r.dirty?' · não salvo em arquivo':' · já salvo em arquivo')+(r.id===AS.sid?' · esta sessão':'');
    info.appendChild(t); info.appendChild(m); row.appendChild(info);
    function btn(txt,cls,fn){ var b=document.createElement('button'); b.className='btn '+cls; b.type='button'; b.textContent=txt; b.addEventListener('click',fn); row.appendChild(b); return b; }
    if(r.id!==AS.sid) btn('Recuperar','p rec-ok',function(){ if(S.dirty&&asCount()&&!confirm('O desenho atual tem alterações não salvas. Substituí-lo pela cópia recuperada?')) return; closeOv('ov-recover'); asRecover(r); });
    btn('Baixar .json','s rec-dl',function(){ asDownload(r); });
    if(r.id!==AS.sid) btn('Descartar','s rec-del',function(){ asDel(r.id,function(){ row.remove(); if(!box.querySelector('.rec-row')) closeOv('ov-recover'); }); });
    box.appendChild(row);
  });
  ov.classList.add('show');
}
function asCheckOnStart(){
  asOpen(function(){
    asStatus(); if(AS.mode==='none') return;
    asList(function(L){ var c=L.filter(function(r){ return r.id!==AS.sid&&r.dirty&&r.n>0; }); if(c.length) asDialog(c,false); });
  });
}
function asShowAll(){ asOpen(function(){ asList(function(L){ asDialog(L,true); }); }); }
function asClearAll(){ if(!confirm('Apagar todas as cópias de segurança guardadas neste navegador?')) return; asOpen(function(){ asList(function(L){ L.forEach(function(r){ asDel(r.id); }); AS.lastJson=null; AS.lastTs=0; asStatus(); log(L.length+' cópia(s) de segurança apagada(s) deste navegador.','ok'); }); }); }
function asSetMinutes(m){ AS.minutes=Math.max(0,Math.min(120,m)); try{ localStorage.setItem('educad-savetime',String(AS.minutes)); }catch(e){} asRestartInterval(); log(AS.minutes?'Salvamento automático: a cada '+AS.minutes+' min e 8 s após cada alteração.':'Salvamento automático desligado.',AS.minutes?'ok':'inf'); }
NC.savetime={init:function(ds){ ds.phase='m'; },prompt:function(){ return 'SAVETIME Intervalo do salvamento automático em minutos (0 = desligado) <'+AS.minutes+'>:'; },
  click:function(){},input:function(ds,u){ if(u===''){ ncEnd(); return true; } var n=ncNum(u); if(n===null||n<0) return false; asSetMinutes(Math.round(n)); ncEnd(); return true; }};

window.addEventListener('load',function(){
  var ov=document.createElement('div'); ov.className='ov'; ov.id='ov-recover';
  ov.innerHTML='<div class="modal" style="min-width:460px;max-width:94vw"><h3 id="rec-title">Recuperar desenhos</h3><div id="rec-lead" style="font-size:11px;color:var(--t1);margin-bottom:8px"></div>'+
    '<div id="rec-list"></div><div style="font-size:9px;color:var(--t2);margin-top:8px">As cópias ficam só neste navegador, neste computador. Em computadores compartilhados, use LIMPARRECUPERACAO ao terminar.</div>'+
    '<div class="mact"><button class="btn s" type="button" onclick="closeOv(\'ov-recover\')">Agora não</button></div></div>';
  document.body.appendChild(ov);
  var sb=document.getElementById('sbar'); if(sb){ var sp=document.createElement('span'); sp.className='ssep'; sb.appendChild(sp); var s=document.createElement('span'); s.id='sautosave'; s.style.cursor='pointer'; s.title='Cópias de segurança (RECUPERAR)'; s.addEventListener('click',asShowAll); sb.appendChild(s); }
  asRestartInterval(); asStatus();
  setTimeout(asCheckOnStart,500);
});
