(() => {
  const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const rect=element=>element?.getBoundingClientRect?.();
  function fly(from,target,card,kind='throw') {
    const start=from?.left===undefined?rect(from):from, end=rect(target);
    if (!start||!end||!card||reduced()) return;
    const ghost=card.cloneNode(true);
    ghost.removeAttribute('id');ghost.removeAttribute('data-card');ghost.disabled=true;
    ghost.setAttribute('aria-hidden','true');ghost.tabIndex=-1;
    ghost.classList.add('card-motion-ghost');
    Object.assign(ghost.style,{position:'fixed',left:`${start.left}px`,top:`${start.top}px`,width:`${start.width}px`,height:`${start.height}px`,margin:'0',zIndex:'11000',pointerEvents:'none'});
    document.body.appendChild(ghost);
    const dx=end.left+end.width/2-start.left-start.width/2,dy=end.top+end.height/2-start.top-start.height/2;
    const scale=Math.min(1.5,Math.max(.55,end.width/Math.max(1,start.width)));
    if(!ghost.animate){ghost.remove();return}
    const animation=ghost.animate([{transform:'translate(0,0) rotate(0deg)',opacity:.95},{transform:`translate(${dx*.54}px,${dy*.54-25}px) rotate(${kind==='draw'?-12:13}deg)`,opacity:1,offset:.55},{transform:`translate(${dx}px,${dy}px) rotate(${kind==='draw'?4:-8}deg) scale(${scale})`,opacity:.7}],{duration:kind==='draw'?320:370,easing:'cubic-bezier(.2,.7,.2,1)'});
    animation.finished.catch(()=>{}).finally(()=>ghost.remove());
    setTimeout(()=>ghost.remove(),600);
  }
  function deal(hand){if(!hand||reduced())return;hand.querySelectorAll('button').forEach((card,i)=>{if(i>=10)return;card.animate?.([{transform:'translateY(-24px) scale(.86)',opacity:.3},{transform:'translateY(0) scale(1)',opacity:1}],{duration:260,delay:i*42,easing:'ease-out'});});}
  window.CardMotion={fly,deal,rect,sound:type=>window.IAMSFX?.play(type)};
})();
