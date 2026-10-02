(() => {
  const add=()=>{
    const picker=document.querySelector('#competitionCategory');
    if(!picker||picker.querySelector('[data-uno-entry]'))return;
    const baloot=picker.querySelector('[data-baloot-entry],.baloot-category-choice');
    const u=document.createElement('button');
    u.type='button';u.className='category-choice uno-category-choice';u.dataset.unoEntry='1';
    u.innerHTML='<span class="uno-entry-icon" aria-hidden="true"></span><b>UNO • أونو</b><small>ألوان، +2، +4، عكس الدور وتخطي</small>';
    u.addEventListener('click',()=>{window.IAMSFX?.play?.('select');window.IAM_OMANI_UNO?.openHost?.()});
    if(baloot)baloot.insertAdjacentElement('afterend',u);else picker.appendChild(u);
  };
  add();new MutationObserver(add).observe(document.documentElement,{subtree:true,childList:true});
})();