/* ═══════════════════════════════════════════════════════════════════
   v8.9 — COTA COM DISTÂNCIA DIGITADA (DLI e DAL)
   Depois dos dois pontos da medida, em vez de clicar a posição da linha de
   cota, digite a distância entre a linha de cota e o 2º ponto (ex.: 10).
   O lado é o do cursor (o número negativo inverte); no DLI, H ou V fixa a
   cota horizontal ou vertical antes da distância. Sem cursor (scripts,
   toque), a cota vai para baixo (horizontal) ou para a esquerda (vertical).
   ═══════════════════════════════════════════════════════════════════ */
function dimDistPoint(tool,ds,n){
  var p1=ds.pts[0],p2=ds.pts[1],h=S.hover,s;
  if(tool==='dimali'){
    var dx=p2.x-p1.x,dy=p2.y-p1.y,L=Math.hypot(dx,dy); if(L<1e-9) return null;
    var nx=-dy/L,ny=dx/L; s=h?Math.sign((h.x-p2.x)*nx+(h.y-p2.y)*ny):0; if(!s) s=dx>=0?-1:1; // sem cursor: "por fora" (abaixo/à esquerda do segmento)
    if(n<0){ s=-s; n=-n; } return {x:p2.x+nx*s*n,y:p2.y+ny*s*n};
  }
  var dir=ds.forceDir||(h&&ds.dirHover&&ds.dimDir)||(Math.abs(p2.x-p1.x)>=Math.abs(p2.y-p1.y)?'h':'v');
  ds.forceDir=dir;
  if(dir==='h'){ s=h?Math.sign(h.y-p2.y):0; if(!s) s=-1; if(n<0){ s=-s; n=-n; } return {x:(p1.x+p2.x)/2,y:p2.y+s*n}; }
  s=h?Math.sign(h.x-p2.x):0; if(!s) s=-1; if(n<0){ s=-s; n=-n; } return {x:p2.x+s*n,y:(p1.y+p2.y)/2};
}
(function(){ var ok0=onCmdKey;
  onCmdKey=function(e){
    if(e&&e.key==='Enter'&&(S.tool==='dim'||S.tool==='dimali')&&S.ds&&S.ds.phase==='pos'&&S.ds.pts&&S.ds.pts.length===2){
      var ci=document.getElementById('cmdinput'),raw=ci.value.trim(),u=raw.toUpperCase(),ds=S.ds;
      if(S.tool==='dim'&&/^(H|HOR|HORIZONTAL|V|VER|VERTICAL)$/.test(u)){
        ci.value=''; log('> '+raw); ds.forceDir=u[0]==='H'?'h':'v'; e.preventDefault&&e.preventDefault();
        logp('DIMLINEAR '+(ds.forceDir==='h'?'horizontal':'vertical')+': clique na posição ou digite a distância ao 2º ponto:'); renderAll(); return; }
      if(/^[-+]?(\d+(\.\d*)?|\.\d+)$/.test(raw)){
        var n=parseFloat(raw); ci.value=''; log('> '+raw); e.preventDefault&&e.preventDefault();
        if(n===0){ log('A distância da linha de cota precisa ser diferente de zero.','er'); return; }
        var pt=dimDistPoint(S.tool,ds,n); if(!pt){ log('Os dois pontos da cota coincidem.','er'); return; }
        var was=S._typedPt; S._typedPt=true;
        try{ handleClick(pt); } finally { S._typedPt=was; }
        log('Linha de cota a '+gNum(Math.abs(n))+' do 2º ponto.','inf'); return; }
    }
    return ok0.apply(this,arguments);
  };
})();
