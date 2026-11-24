/* ═══════════════════════════════════════════════════════════════════
   v8.11 — CARIMBO (LEGENDA) AJUSTADO À LARGURA ÚTIL DA FOLHA
   • Folhas estreitas (A4 retrato: 210 − 20 − 10 = 180 mm úteis): a legenda
     ocupa toda a base entre as margens. Folhas largas: 178 mm no canto
     inferior direito, como na norma. Altura 40 mm.
   • A moldura e a legenda acompanham as margens, o formato e a orientação
     (Configurar página / painel do layout) automaticamente.
   • Inserir o carimbo de novo substitui o anterior e mantém o que já foi
     escrito nos campos (também nos carimbos inseridos por versões antigas).
   ═══════════════════════════════════════════════════════════════════ */
var CB_H=40,CB_STD=178,CB_FULL_MAX=200;
function cbWidth(r){ return r.w<=CB_FULL_MAX?r.w:Math.min(CB_STD,r.w); }
// campos da legenda: posição (relativa ao canto inferior esquerdo da legenda), altura e texto padrão
function cbSlots(W){
  var ys=[CB_H],rows=[8,8,12,12]; rows.forEach(function(h){ ys.push(ys[ys.length-1]-h); });
  var d=new Date(),dt=('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear();
  return {ys:ys,f:[
    ['inst',14,ys[1]+1.6,2.5,'UNIVERSIDADE FEDERAL DO TOCANTINS – Câmpus de Gurupi'],
    ['curso',9,ys[2]+1.6,2.5,'Agronomia'],
    ['disc',W*0.5+15,ys[2]+1.6,2.5,'Desenho Técnico'],
    ['titulo',2,ys[3]+2.5,3.5,'TÍTULO DO DESENHO'],
    ['desenhista',2,ys[4]+2.5,2.5,'Nome do aluno'],
    ['data',W*0.45+2,ys[4]+2.5,2.5,dt],
    ['escala',W*0.65+2,ys[4]+2.5,2.5,null],
    ['folha',W*0.82+2,ys[4]+2.5,2.5,'01/01']]};
}
function cbBlock(W){
  var name='CARIMBO_ABNT_'+Math.round(W*10)/10; if(S.blocks[name]) return name;
  var sl=cbSlots(W),ys=sl.ys,L2=[];
  function ln(a,b,c,e2){ L2.push({tp:'line',x1:a,y1:b,x2:c,y2:e2,ly:0,lw:.25}); }
  L2.push({tp:'pl',closed:true,pts:[{x:0,y:0},{x:W,y:0},{x:W,y:CB_H},{x:0,y:CB_H},{x:0,y:0}],ly:0,lw:.5});
  ys.slice(1,-1).forEach(function(y){ ln(0,y,W,y); });
  ln(W*0.5,ys[1],W*0.5,ys[2]); [0.45,0.65,0.82].forEach(function(f){ ln(W*f,ys[3],W*f,ys[4]); });
  [[1,ys[1]+5.2,'INSTITUIÇÃO'],[1,ys[2]+5.2,'CURSO'],[W*0.5+1,ys[2]+5.2,'DISCIPLINA'],[1,ys[3]+9.2,'TÍTULO DO DESENHO'],[1,ys[4]+9.2,'DESENHISTA'],[W*0.45+1,ys[4]+9.2,'DATA'],[W*0.65+1,ys[4]+9.2,'ESCALA'],[W*0.82+1,ys[4]+9.2,'FOLHA']]
    .forEach(function(t){ L2.push({tp:'mtext',x:t[0],y:t[1],w:0,h:1.6,txt:t[2],att:7,rot:0,ly:0}); });
  S.blocks[name]={base:{x:0,y:0},ents:L2.map(function(e){ e.id='cb'+Math.random().toString(36).slice(2,8); return e; })};
  return name;
}
// carimbo existente no papel atual: referência, moldura e campos (com ou sem marcação de versões antigas)
function cbFind(ents){
  ents=ents||S.ents;
  var ins=ents.filter(function(e){ return e.tp==='insert'&&/^CARIMBO/.test(e.name); })[0]; if(!ins) return null;
  var B=S.blocks[ins.name],W=0; if(B) B.ents.forEach(function(c){ if(c.tp==='pl'&&c.closed) c.pts.forEach(function(p){ if(p.x>W) W=p.x; }); });
  if(!W){ var m=/_(\d+(?:\.\d+)?)$/.exec(ins.name); W=m?parseFloat(m[1]):CB_STD; }
  var fields={},frame=ents.filter(function(e){ return e.cbf==='frame'; })[0];
  ents.forEach(function(e){ if(e.cbf&&e.cbf!=='frame') fields[e.cbf]=e; });
  if(!Object.keys(fields).length){ // carimbo antigo: campos = textos dentro da legenda, pelo campo mais próximo
    var sl=cbSlots(W).f;
    ents.forEach(function(e){ if(e.tp!=='mtext'||e===ins) return; var lx=e.x-ins.x,ly=e.y-ins.y; if(lx<-0.5||ly<-0.5||lx>W+0.5||ly>CB_H+0.5) return;
      var best=null,bd=1e9; sl.forEach(function(s){ var d=Math.hypot(lx-s[1],ly-s[2]); if(d<bd&&!fields[s[0]]){ bd=d; best=s[0]; } }); if(best&&bd<6) fields[best]=e; });
  }
  if(!frame){ frame=ents.filter(function(e){ if(e.tp!=='pl'||!e.closed||!(e.lw>=0.7)) return false; var b=ptsBox(e.pts); return b.x<=ins.x+1e-6&&b.y<=ins.y+1e-6&&b.x+b.w>=ins.x+W-1e-6; })[0]; }
  return {ins:ins,W:W,frame:frame,fields:fields};
}
function cbFits(L,C){ var r=printableRect(L),W=cbWidth(r),e=1e-6; if(!C) return true;
  var fb=C.frame?ptsBox(C.frame.pts):null;
  return Math.abs(C.W-W)<e&&Math.abs(C.ins.x-(r.x+r.w-W))<e&&Math.abs(C.ins.y-r.y)<e&&(!fb||(Math.abs(fb.x-r.x)<e&&Math.abs(fb.y-r.y)<e&&Math.abs(fb.w-r.w)<e&&Math.abs(fb.h-r.h)<e)); }
titleBlockInsert=function(opt){
  opt=opt||{};
  if(S.space==='model'){ log('O carimbo é inserido num layout (espaço do papel).','er'); return; }
  var L=curLayout(),r=printableRect(L),W=cbWidth(r),x0=r.x+r.w-W,y0=r.y,old=cbFind(S.ents),vals={};
  if(!opt.noSnap) snapshot();
  if(old){ Object.keys(old.fields).forEach(function(k){ vals[k]={txt:old.fields[k].txt,font:old.fields[k].font}; });
    var rm=[old.ins,old.frame].concat(Object.keys(old.fields).map(function(k){return old.fields[k];})).filter(Boolean);
    S.ents=S.ents.filter(function(e){ return rm.indexOf(e)<0; }); }
  var name=cbBlock(W),sl=cbSlots(W);
  // a viewport automática fica acima do carimbo
  S.ents.forEach(function(e){ if(e.tp==='viewport'&&e.auto){ var top=y0+CB_H+3; e.h=r.y+r.h-top-2; e.y=top; e.x=r.x+2; e.w=r.w-4; vpFit(e); } });
  var v=curViewport(),esc=v?ratioLabel(vpRatio(v)):'1:1';
  S.ents.push({id:uid(),tp:'pl',closed:true,pts:[{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h},{x:r.x,y:r.y}],ly:0,lw:.7,cbf:'frame'});
  S.ents.push({id:uid(),tp:'insert',name:name,x:x0,y:y0,s:1,rot:0,m:false,ly:0});
  sl.f.forEach(function(s){ var o=vals[s[0]],e={id:uid(),tp:'mtext',x:x0+s[1],y:y0+s[2],w:0,h:s[3],txt:o?o.txt:(s[4]===null?esc:s[4]),att:7,rot:0,ly:0,cbf:s[0]}; if(o&&o.font) e.font=o.font; S.ents.push(e); });
  S.dirty=true; renderAll(); syncLayoutPanel();
  if(!opt.quiet) log('Carimbo ABNT '+(old?'ajustado':'inserido')+' (moldura nas margens + legenda '+gNum(Math.round(W*10)/10)+' × '+CB_H+' mm'+(W===r.w?', toda a largura útil':', canto inferior direito')+').'+(old?' Os textos dos campos foram mantidos.':' Duplo clique nos campos para editar.'),'ok');
};
// acompanha margens, formato e orientação; corrige carimbos desalinhados ao abrir o layout
function cbRefit(msg){ if(S.space==='model') return false; var L=curLayout(); if(!L) return false; var C=cbFind(S.ents); if(!C||cbFits(L,C)) return false;
  titleBlockInsert({quiet:!msg,noSnap:false}); if(msg) log('Carimbo ajustado às margens e à largura útil da folha ('+L.fmt+(L.paper.w>=L.paper.h?' paisagem':' retrato')+'). Os textos dos campos foram mantidos.','inf'); return true; }
(function(){ var la=layoutApply,sw=switchSpace;
  layoutApply=function(){ var r=la.apply(this,arguments); cbRefit(false); return r; };
  switchSpace=function(t){ var r=sw.apply(this,arguments); if(S.space!=='model') setTimeout(function(){ cbRefit(true); },0); return r; };
})();
