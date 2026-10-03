(() => {
  const stage=document.querySelector('#practiceStage');
  const start=document.querySelector('#practiceStartBtn');
  const picker=document.querySelector('#practiceCategory');
  if(!stage||!start)return;
  let questions=[],position=0,correct=0,timer=null,remaining=0,session=0;
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stop=()=>{clearInterval(timer);timer=null;};
  const seen=()=>{try{return JSON.parse(localStorage.getItem('iamOmaniOnlineSeen')||'[]')}catch{return []}};
  const mark=items=>{try{localStorage.setItem('iamOmaniOnlineSeen',JSON.stringify([...new Set([...seen(),...items])].slice(-180)))}catch{}};
  function open(){show('practice');stage.innerHTML='';start.hidden=false;start.disabled=false;}
  function close(){session++;stop();questions=[];show('home');}
  document.querySelector('#practiceOpenBtn')?.addEventListener('click',open);
  document.querySelector('#practiceBackBtn')?.addEventListener('click',close);
  window.IAM_OMANI_PRACTICE={open};
  function next(){
    stop();
    if(position>=questions.length){stage.innerHTML=`<div class="practice-finish"><h3>انتهى التدريب 🎯</h3><p>أجبت إجابة صحيحة عن ${correct} من ${questions.length}.</p><small>النتيجة للتجربة فقط ولا تدخل في المستوى أو التصنيف.</small></div>`;start.hidden=false;start.textContent='تدريب جديد';return;}
    const q=questions[position];remaining=q.time||15;
    stage.innerHTML=`<div class="practice-meta"><span>السؤال ${position+1} من ${questions.length}</span><span>${escape(q.category)}</span><b id="practiceClock">${remaining}</b></div><h3>${escape(q.question)}</h3><div class="practice-options">${q.options.map((answer,i)=>`<button type="button" data-answer="${i}">${escape(answer)}</button>`).join('')}</div><div id="practiceFeedback" aria-live="polite"></div>`;
    stage.querySelectorAll('[data-answer]').forEach(b=>b.addEventListener('click',()=>answer(Number(b.dataset.answer))));
    timer=setInterval(()=>{remaining--;const clock=stage.querySelector('#practiceClock');if(clock)clock.textContent=Math.max(0,remaining);if(remaining<=0)answer(-1);},1000);
  }
  function answer(choice){
    if(!timer)return;
    stop();const q=questions[position];if(choice===q.correct)correct++;
    stage.querySelectorAll('[data-answer]').forEach(b=>{b.disabled=true;if(Number(b.dataset.answer)===q.correct)b.classList.add('right');if(Number(b.dataset.answer)===choice&&choice!==q.correct)b.classList.add('wrong')});
    stage.querySelector('#practiceFeedback').innerHTML=`<p>${choice===q.correct?'إجابة صحيحة!':'الإجابة الصحيحة: '+escape(q.options[q.correct])}</p><a href="${escape(q.source)}" target="_blank" rel="noopener noreferrer">مصدر المعلومة</a><button type="button" id="practiceNextBtn" class="primary-btn">${position+1===questions.length?'عرض نتيجة التدريب':'السؤال التالي'}</button>`;
    stage.querySelector('#practiceNextBtn').onclick=()=>{position++;next()};
  }
  start.onclick=async()=>{
    session++;const current=session;stop();start.disabled=true;start.textContent='جارٍ جلب الأسئلة…';stage.innerHTML='<p>نتصل بمصدر الأسئلة المباشر…</p>';
    try {
      const params=new URLSearchParams({category:picker.value,count:'8',exclude:seen().slice(-80).join(',')});
      const response=await fetch(`/api/questions?${params}`,{cache:'no-store'});
      const data=await response.json();
      if(!response.ok||!Array.isArray(data.questions)||data.questions.length<4)throw Error(data.error||'تعذر تحميل الأسئلة');
      if(current!==session)return;
      questions=data.questions;position=0;correct=0;mark(questions.map(q=>q.id));start.hidden=true;next();
    }catch(error){if(current!==session)return;stage.innerHTML=`<p role="alert">${escape(error.message||'تعذر الاتصال بمصدر الأسئلة. حاول مجددًا.')}</p>`;start.textContent='إعادة المحاولة';}
    finally{if(current===session)start.disabled=false;}
  };
})();
