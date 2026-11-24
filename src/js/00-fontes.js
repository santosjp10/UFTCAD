/* ═══════════════════════════════════════════════════════════════════
   v8.10 — CATÁLOGO DE FONTES (tela, PDF, SVG e DXF)
   Cada fonte tem: nome na tela (CSS, com alternativas livres quando a fonte
   não estiver instalada), arquivo para o estilo de texto do DXF (o AutoCAD
   procura esse arquivo: .ttf do Windows ou .shx do próprio AutoCAD), fonte
   equivalente no PDF e largura média de caractere (para diagramar).
   ═══════════════════════════════════════════════════════════════════ */
var FONTS=[
 // chave, rótulo, CSS, arquivo DXF, família TrueType (''=SHX), fonte PDF, largura média, grupo
 ['Arial','Arial',"Arial,'Liberation Sans',Helvetica,sans-serif",'arial.ttf','Arial','Helvetica',0.55,'Convencionais'],
 ['Arial Narrow','Arial Narrow',"'Arial Narrow','Liberation Sans Narrow',Arial,sans-serif",'arialn.ttf','Arial Narrow','Helvetica',0.46,'Convencionais'],
 ['Calibri','Calibri',"Calibri,Carlito,'Segoe UI',sans-serif",'calibri.ttf','Calibri','Helvetica',0.5,'Convencionais'],
 ['Verdana','Verdana',"Verdana,'DejaVu Sans',sans-serif",'verdana.ttf','Verdana','Helvetica',0.62,'Convencionais'],
 ['Times New Roman','Times New Roman',"'Times New Roman','Liberation Serif',Times,serif",'times.ttf','Times New Roman','Times-Roman',0.5,'Convencionais'],
 ['Courier New','Courier New',"'Courier New','Liberation Mono',Courier,monospace",'cour.ttf','Courier New','Courier',0.6,'Convencionais'],
 ['Consolas','Consolas',"Consolas,'Liberation Mono',monospace",'consola.ttf','Consolas','Courier',0.55,'Convencionais'],
 ['ISOCPEUR','ISOCPEUR — letra técnica ISO/ABNT',"ISOCPEUR,ISOCP,osifont,'Arial Narrow','Liberation Sans Narrow',sans-serif",'isocpeur.ttf','ISOCPEUR','Helvetica',0.5,'CAD'],
 ['romans','romans.shx — Roman Simplex (AutoCAD)',"'Arial Narrow','Liberation Sans Narrow',Arial,sans-serif",'romans.shx','','Helvetica',0.55,'CAD'],
 ['simplex','simplex.shx (AutoCAD)',"'Arial Narrow','Liberation Sans Narrow',Arial,sans-serif",'simplex.shx','','Helvetica',0.55,'CAD'],
 ['txt','txt.shx (padrão antigo do AutoCAD)',"Consolas,'Liberation Mono',monospace",'txt.shx','','Courier',0.6,'CAD']
];
var FONT_BY={}; FONTS.forEach(function(f){ FONT_BY[f[0].toLowerCase()]={key:f[0],label:f[1],css:f[2],file:f[3],family:f[4],ttf:!!f[4],pdf:f[5],cw:f[6],grp:f[7]}; });
var FONT_DEFAULT='Arial';
// aceita a chave, um nome de arquivo ou uma lista CSS antiga ("Consolas,monospace") e devolve a chave do catálogo
function fontKey(v){
  if(!v){ return (typeof S!=='undefined'&&S.textFont&&FONT_BY[String(S.textFont).toLowerCase()])?FONT_BY[String(S.textFont).toLowerCase()].key:FONT_DEFAULT; }
  var s=String(v).trim(),k=s.toLowerCase(); if(FONT_BY[k]) return FONT_BY[k].key;
  var first=k.split(',')[0].replace(/['"]/g,'').trim(); if(FONT_BY[first]) return FONT_BY[first].key;
  for(var i=0;i<FONTS.length;i++){ if(FONTS[i][3]===k||FONTS[i][3].replace(/\.(ttf|shx)$/,'')===k.replace(/\.(ttf|shx)$/,'')) return FONTS[i][0]; }
  if(/sans|system/.test(k)) return 'Arial'; if(/serif/.test(k)) return 'Times New Roman'; if(/mono/.test(k)) return 'Consolas';
  return fontKey(null);
}
function fontInfo(v){ return FONT_BY[fontKey(v).toLowerCase()]; }
function fontCss(v){ return fontInfo(v).css; }
function fontCW(v){ return fontInfo(v).cw; }
function fontLabel(v){ return fontInfo(v).label; }
function fontStyleName(v){ var k=fontKey(v); return k===fontKey(null)?'Standard':k; }      // estilo de texto do DXF
function fontFromDxf(file,family){ var f=String(file||'').toLowerCase().replace(/^.*[\\/]/,''); if(family&&FONT_BY[String(family).toLowerCase()]) return FONT_BY[String(family).toLowerCase()].key;
  for(var i=0;i<FONTS.length;i++){ if(FONTS[i][3]===f||FONTS[i][3].replace(/\.(ttf|shx)$/,'')===f.replace(/\.(ttf|shx)$/,'')) return FONTS[i][0]; } return null; }
function fontOptions(){ return FONTS.map(function(f){ return [f[0],f[1]]; }); }
function fontSelectHTML(id,cls){ var g={},h='<select id="'+id+'"'+(cls?' class="'+cls+'"':'')+'>'; FONTS.forEach(function(f){ (g[f[7]]=g[f[7]]||[]).push(f); });
  Object.keys(g).forEach(function(gr){ h+='<optgroup label="'+(gr==='CAD'?'Fontes de CAD':'Fontes convencionais (Windows)')+'">'; g[gr].forEach(function(f){ h+='<option value="'+f[0]+'">'+f[1]+'</option>'; }); h+='</optgroup>'; });
  return h+'</select>'; }
// espessuras de linha do AutoCAD (mm)
var LW_ACAD=[0,0.05,0.09,0.13,0.15,0.18,0.2,0.25,0.3,0.35,0.4,0.5,0.53,0.6,0.7,0.8,0.9,1,1.06,1.2,1.4,1.58,2,2.11];
function lwLabel(v){ return Number(v).toFixed(2).replace('.',','); }
// largura real do texto com a fonte da tela (para encadear trechos de tamanhos diferentes na mesma linha)
var FONT_MC=null,FONT_MW={};
function fontMeasure(t,key,h){ t=String(t); if(!t) return 0; var k=fontKey(key),ck=k+'|'+t;
  if(FONT_MW[ck]===undefined){ try{ if(!FONT_MC) FONT_MC=document.createElement('canvas').getContext('2d'); FONT_MC.font='100px '+fontCss(k); FONT_MW[ck]=FONT_MC.measureText(t).width/100; }catch(e){ FONT_MW[ck]=t.length*fontCW(k); } }
  return FONT_MW[ck]*h; }
if(typeof document!=='undefined'&&document.fonts&&document.fonts.addEventListener) document.fonts.addEventListener('loadingdone',function(){ FONT_MW={}; });
