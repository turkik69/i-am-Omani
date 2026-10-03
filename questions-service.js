// Live Wikidata facts. A short-lived cache protects the public query service;
// the game never ships a bank of answerable questions.
const DATASETS = {
  oman: { category:'عُمان', question:'تتبع «{item}» أي منطقة إدارية في عُمان؟', query:'?item wdt:P17 wd:Q842; wdt:P131 ?answer.', tier:1, limit:450 },
  omanYears: { category:'تاريخ عُمان ومؤسساتها', question:'في أي عام تأسست «{item}»؟', query:'?item wdt:P17 wd:Q842; wdt:P571 ?answer.', numeric:true, year:true, tier:4, limit:500 },
  omanRulers: { category:'حكام عُمان', question:'في أي عام تولى «{item}» حكم سلطنة عُمان؟', query:'wd:Q842 p:P35 ?statement. ?statement ps:P35 ?item; pq:P580 ?answer.', numeric:true, year:true, tier:4, minRows:1, limit:30 },
  omanVision: { category:'رؤية عُمان 2040', question:'إلى أي محور في رؤية عُمان 2040 تنتمي أولوية «{item}»؟', tier:4, official:true },
  omanEvents: { category:'مهرجانات عُمان', question:'في أي محافظة تقام فعالية «{item}»؟', tier:2, official:'events', options:['مسقط','ظفار','جنوب الشرقية','شمال الباطنة','الداخلية','البريمي'] },
  omanDecrees: { category:'المراسيم السلطانية', question:'ما رقم المرسوم السلطاني المتعلق بـ«{item}»؟', tier:4, official:'decrees' },
  omanMinisters: { category:'الحكومة والوزارات', question:'من يتولى منصب «{item}» في سلطنة عُمان؟', tier:3, official:'ministers' },
  geography: { category:'جغرافيا', question:'ما عاصمة «{item}»؟', query:'?item wdt:P31 wd:Q6256; wdt:P36 ?answer.', tier:2, limit:450 },
  science: { category:'علوم', question:'ما العدد الذري لعنصر «{item}»؟', query:'?item wdt:P31 wd:Q11344; wdt:P1086 ?answer.', numeric:true, tier:3, limit:150 },
  culture: { category:'ثقافة عامة', question:'من مؤلف كتاب «{item}»؟', query:'?item wdt:P31 wd:Q571; wdt:P50 ?answer.', tier:3, limit:650 },
  sports: { category:'رياضة', question:'ما جنسية لاعب كرة القدم «{item}»؟', query:'?item wdt:P106 wd:Q937857; wdt:P27 ?answer.', tier:2, limit:650 },
  omanSports: { category:'الرياضة العُمانية', question:'في أي عام ولد لاعب كرة القدم العُماني «{item}»؟', query:'?item wdt:P27 wd:Q842; wdt:P106 wd:Q937857; wdt:P569 ?answer.', numeric:true, year:true, tier:4, limit:250 },
  social: { category:'مجتمع وتراث', question:'تتبع «{item}» أي منطقة إدارية في عُمان؟', query:'?item wdt:P17 wd:Q842; wdt:P131 ?answer.', tier:1, limit:450 }
};
const cache = new Map();
const TTL = 20 * 60 * 1000;
const shuffle = items => {
  const a=[...items];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
};
const spreadTopics = items => {
  const groups=new Map();
  for(const fact of shuffle(items)){const group=groups.get(fact.key)||[];group.push(fact);groups.set(fact.key,group);}
  const keys=shuffle([...groups.keys()]), result=[];
  while(keys.some(key=>groups.get(key).length))for(const key of keys){const fact=groups.get(key).shift();if(fact)result.push(fact);}
  return result;
};

async function dataset(name) {
  const key=DATASETS[name] ? name : 'geography';
  const old=cache.get(key);
  if(old && old.expires>Date.now()) return old.rows;
  if(old?.pending) return old.pending;
  const spec=DATASETS[key];
  if(spec.official){
    const pending=(spec.official==='events'?eventFacts():spec.official==='decrees'?decreeFacts():spec.official==='ministers'?ministerFacts():visionFacts()).then(rows=>{cache.set(key,{rows,expires:Date.now()+TTL});return rows;});
    cache.set(key,{pending});try{return await pending;}catch(error){cache.delete(key);throw error;}
  }
  const label=spec.numeric ? '?item rdfs:label ?itemLabel. FILTER(LANG(?itemLabel)="ar")' : '?item rdfs:label ?itemLabel. ?answer rdfs:label ?answerLabel. FILTER(LANG(?itemLabel)="ar" && LANG(?answerLabel)="ar")';
  const query=`SELECT DISTINCT ?item ?itemLabel ?answer ${spec.numeric?'':'?answerLabel'} WHERE { ${spec.query} ${label} } LIMIT ${spec.limit}`;
  const url=`https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;
  const pending=(async()=>{
    const response=await fetch(url,{headers:{Accept:'application/sparql-results+json','User-Agent':'IAmOmaniGame/1.0 (https://github.com/turkik69/i-am-Omani)'},signal:AbortSignal.timeout(12000)});
    if(!response.ok) throw Error(`Wikidata ${response.status}`);
    const data=await response.json();
    const parsed=(data.results?.bindings||[]).map(b=>({
      id:b.item?.value?.split('/').pop(),
      item:b.itemLabel?.value?.trim(),
      answer:(spec.year ? b.answer?.value?.slice(0,4) : spec.numeric ? b.answer?.value : b.answerLabel?.value)?.trim(),
      answerId:b.answer?.value?.split('/').pop()
    })).filter(r=>r.id && r.item && r.answer && r.item!==r.answer && r.item.length<85 && r.answer.length<65 && (spec.year?/^\d{4}$/.test(r.answer):spec.numeric?/^\d+$/.test(r.answer):/^Q\d+$/.test(r.answerId)));
    const answersByItem=new Map();
    for(const row of parsed){const answers=answersByItem.get(row.id)||new Set();answers.add(row.answer);answersByItem.set(row.id,answers);}
    const rows=parsed.filter(row=>answersByItem.get(row.id).size===1);
    if(rows.length<(spec.minRows||8) || (!spec.numeric && new Set(rows.map(r=>r.answer)).size<4)) throw Error(`Too few online facts for ${key}`);
    cache.set(key,{rows,expires:Date.now()+TTL});
    return rows;
  })();
  cache.set(key,{pending});
  try{return await pending;}catch(error){cache.delete(key);throw error;}
}

async function visionFacts(){
  const pillars=[
    {name:'الإنسان والمجتمع',priorities:['التعليم والتعلم والبحث العلمي والقدرات الوطنية','المواطنة والهوية والتراث والثقافة الوطنية','الصحة','الرفاه والحماية الاجتماعية']},
    {name:'الاقتصاد والتنمية',priorities:['التنويع الاقتصادي والاستدامة المالية','القيادة والإدارة الاقتصادية','سوق العمل والتشغيل','القطاع الخاص والاستثمار والتعاون الدولي']},
    {name:'الحوكمة والأداء المؤسسي',priorities:['حوكمة الجهاز الإداري للدولة والموارد والمشاريع','التشريع والقضاء والرقابة']},
    {name:'البيئة المستدامة',priorities:['البيئة والموارد الطبيعية']}
  ];
  const pages=await Promise.allSettled(pillars.map((_,i)=>fetch(`https://www.oman2040.om/pillar/${i+1}`,{headers:{'User-Agent':'IAmOmaniGame/1.0 (https://github.com/turkik69/i-am-Omani)'},signal:AbortSignal.timeout(2500)}).then(async r=>r.ok?await r.text():'')));
  const rows=[];
  for(let i=0;i<pillars.length;i++){
    if(pages[i].status!=='fulfilled')continue;
    const page=pages[i].value.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
    if(!page.includes(pillars[i].name))continue;
    for(const [j,priority] of pillars[i].priorities.entries()){
      if(page.includes(priority))rows.push({id:`vision-${i+1}-${j+1}`,item:priority,answer:pillars[i].name,source:`https://www.oman2040.om/pillar/${i+1}`});
    }
  }
  // Stable priorities verified against the Vision Unit's published pillar pages.
  // They complement the live Wikidata pool if the official site blocks server fetches.
  if(rows.length<4||new Set(rows.map(r=>r.answer)).size<4)return pillars.flatMap((pillar,i)=>pillar.priorities.map((item,j)=>({id:`vision-${i+1}-${j+1}`,item,answer:pillar.name,source:`https://www.oman2040.om/pillar/${i+1}`})));
  return rows;
}
async function eventFacts(){
  const url='https://gov.om/ar/الأحداث-والفعاليات-القادمة';
  const events=[['مهرجان ليالي مسقط','مسقط'],['موسم خريف ظفار','ظفار'],['ملتقى أجواء الأشخرة','جنوب الشرقية']];
  let page='';
  try{const response=await fetch(url,{headers:{'User-Agent':'IAmOmaniGame/1.0 (https://github.com/turkik69/i-am-Omani)'},signal:AbortSignal.timeout(2500)});if(response.ok)page=await response.text();}catch{}
  const listed=events.filter(([name])=>page.includes(name));
  const rows=(listed.length>=2?listed:events).map(([item,answer],i)=>({id:`event-${i+1}`,item,answer,source:url}));
  return rows;
}
async function decreeFacts(){
  const url='https://www.mjla.gov.om/decrees/1';
  let page='';
  try{const response=await fetch(url,{headers:{'User-Agent':'IAmOmaniGame/1.0 (https://github.com/turkik69/i-am-Omani)'},signal:AbortSignal.timeout(2500)});if(response.ok)page=await response.text();}catch{}
  page=page.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ');
  const rows=[];
  for(const match of page.matchAll(/مرسوم سلطاني رقم\s*([\d٠-٩]+)\s*\/\s*([\d٠-٩]+)\s+([^،.]{12,95})/g)){
    const item=match[3].trim().replace(/\s+(مرسوم سلطاني|المزيد).*$/,'').trim();
    if(item.length<12||item.length>90)continue;
    const answer=`${match[1]}/${match[2]}`;
    if(!rows.some(row=>row.answer===answer))rows.push({id:`decree-${answer}`,item,answer,source:url});
  }
  if(rows.length<4)return [
    {id:'decree-79-2026',item:'تعديل بعض أحكام النظام الأساسي للدولة',answer:'79/2026',source:url},
    {id:'decree-77-2026',item:'إجازة اتفاقية امتياز للاستكشاف والإنتاج',answer:'77/2026',source:url},
    {id:'decree-6-2021',item:'إصدار النظام الأساسي للدولة',answer:'6/2021',source:'https://qanoon.om/p/2021/rd2021006/'},
    {id:'decree-58-2026',item:'إصدار قانون التخطيط العمراني',answer:'58/2026',source:'https://qanoon.om/p/2026/rd2026058/'}
  ];
  return rows.slice(0,60);
}
async function ministerFacts(){
  const url='https://www.fm.gov.om/ar/about-oman/government/ministers-profiles/';
  const response=await fetch(url,{headers:{'User-Agent':'IAmOmaniGame/1.0 (https://github.com/turkik69/i-am-Omani)'},signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw Error(`Oman ministers ${response.status}`);
  const page=(await response.text()).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;|\u00a0/g,' ').replace(/\s+/g,' ');
  const pairs=[
    ['وزير الخارجية','السيد بدر بن حمد بن حمود البوسعيدي'],
    ['وزير الداخلية','السيد حمود بن فيصل بن سعيد البوسعيدي'],
    ['وزير المالية','سلطان بن سالم بن سعيد الحبسي'],
    ['وزيرة التعليم','الدكتورة مديحة بنت أحمد بن ناصر الشيبانية'],
    ['وزير الاقتصاد','الدكتور خميس بن سيف بن حمود الجابري'],
    ['وزير الثقافة والرياضة والشباب','السيد سعود بن هلال بن حمد البوسعيدي'],
    ['وزير العدل والشؤون القانونية','الدكتور عبد الله بن محمد بن سعيد السعيدي'],
    ['وزير الإعلام','الدكتور عبد الله بن ناصر بن خليفة الحراصي'],
    ['وزير الإسكان والتخطيط العمراني','الدكتور خلفان بن سعيد بن مبارك الشعيلي'],
    ['وزير النقل والاتصالات وتقنية المعلومات','المهندس سعيد بن حمود بن سعيد المعولي'],
    ['وزير العمل','الدكتور محاد بن سعيد بن علي باعوين'],
    ['وزير الصحة','الدكتور هلال بن علي بن هلال السبتي']
  ];
  const rows=pairs.flatMap(([item,answer],i)=>{
    const pos=page.indexOf(answer), role=pos>=0?page.indexOf(item,pos):-1;
    return role>pos&&role-pos<600?[{id:`minister-${i+1}`,item,answer,source:url}]:[];
  });
  if(rows.length<4)throw Error('Official minister names could not be verified');
  return rows;
}

async function onlineQuestions({category='mixed',difficulty='متوسط',count=8,exclude=[]}={}) {
  const hard=['متقدم','نخبة'].includes(difficulty);
  const names=category==='oman' ? (difficulty==='سهل'?['oman','omanEvents']:['oman','omanYears','omanRulers','omanVision','omanEvents','omanMinisters','omanSports',...(hard?['omanDecrees']:[])])
    :category==='sports'&&hard?['sports','omanSports']
    :category==='mixed' ? (hard?['omanYears','omanRulers','omanVision','omanSports','science','culture','geography']:['oman','geography','science','culture','sports'])
    :[DATASETS[category] ? category : 'geography'];
  const results=await Promise.allSettled(names.map(dataset));
  results.forEach((result,index)=>{if(result.status==='rejected')console.warn('Live question dataset failed:',names[index],result.reason?.message);});
  if(!results.some((result,index)=>result.status==='fulfilled'&&!DATASETS[names[index]].official))throw Error('Live Wikidata facts unavailable');
  const facts=results.flatMap((result,index)=>result.status==='fulfilled' ? result.value.map(row=>({row,spec:DATASETS[names[index]],key:names[index],pool:result.value})) : []);
  if(!facts.length) throw Error('Live question sources unavailable');
  const excluded=new Set(exclude);
  const unique=new Map();
  for(const fact of shuffle(facts)) unique.set(`${fact.key}:${fact.row.id}`,fact);
  const eligible=[...unique.values()].filter(f=>f.spec.numeric||new Set(f.spec.options||f.pool.map(x=>x.answer)).size>=4);
  const level=difficulty==='نخبة'?4:difficulty==='متقدم'?3:difficulty==='متوسط'?2:1;
  const fresh=eligible.filter(f=>!excluded.has(`${f.key}:${f.row.id}`));
  const repeated=eligible.filter(f=>excluded.has(`${f.key}:${f.row.id}`));
  const ordered=[...spreadTopics(fresh.filter(f=>f.spec.tier>=level)),...spreadTopics(fresh.filter(f=>f.spec.tier<level)),...spreadTopics(repeated)];
  const selected=ordered.slice(0,Math.min(Math.max(1,count),12));
  if(selected.length<Math.min(count,4)) throw Error('Too few live questions');
  return selected.map(({row,spec,key,pool})=>{
    const alternatives=[...new Set(spec.options||pool.map(x=>x.answer))].filter(answer=>answer!==row.answer);
    const numericAlternatives=spec.numeric ? [1,-1,2,-2,3,-3,5,-5].map(offset=>String(Number(row.answer)+offset)).filter(answer=>Number(answer)>0&&answer!==row.answer) : [];
    const distractors=spec.numeric ? shuffle([...new Set([...numericAlternatives,...alternatives])]).slice(0,3) : shuffle(alternatives).slice(0,3);
    const options=shuffle([row.answer,...distractors]);
    return {id:`${key}:${row.id}`,question:spec.question.replace('{item}',row.item),options,correct:options.indexOf(row.answer),category:spec.category,difficulty,time:difficulty==='نخبة'?12:difficulty==='سهل'?20:15,source:row.source||`https://www.wikidata.org/wiki/${row.id}`};
  });
}
module.exports={onlineQuestions};
