(()=>{
  const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const disabled=localStorage.getItem('backend-kpi-motion')==='off';
  document.documentElement.classList.toggle('motion-off',reduce||disabled);
  if(reduce||disabled)return;
  let frame=0,targetX=0,targetY=0,currentX=0,currentY=0;
  const update=()=>{currentX+=(targetX-currentX)*.08;currentY+=(targetY-currentY)*.08;document.documentElement.style.setProperty('--parallax-x',currentX.toFixed(2));document.documentElement.style.setProperty('--parallax-y',currentY.toFixed(2));frame=requestAnimationFrame(update)};
  window.addEventListener('pointermove',event=>{if(event.pointerType==='touch')return;targetX=(event.clientX/window.innerWidth-.5)*2;targetY=(event.clientY/window.innerHeight-.5)*2},{passive:true});
  window.addEventListener('pointerleave',()=>{targetX=0;targetY=0},{passive:true});
  update();
  window.addEventListener('pagehide',()=>cancelAnimationFrame(frame),{once:true});
})();
