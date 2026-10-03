// Live Wikidata facts. A short-lived cache protects the public query service;
// the game never ships a bank of answerable questions.
const DATASETS = {
  oman: { category:'عُمان', question:'تتبع «{item}» أي منطقة إدارية في عُمان؟', query:'?item wdt:P17 wd:Q842; wdt:P131 ?answer.', limit:450 },
  geography: { category:'جغرافيا', question:'ما عاصمة «{item}»؟', query:'?item wdt:P31 wd:Q6256; wdt:P36 ?answer.', limit:450 },
  science: { category:'علوم', question:'ما العدد الذري لعنصر «{item}»؟', query:'?item wdt:P31 wd:Q11344; wdt:P1086 ?answer.', numeric:true, limit:150 },
  culture: { category:'ثقافة عامة', question:'من مؤلف كتاب «{item}»؟', query:'?item wdt:P31 wd:Q571; wdt:P50 ?answer.', limit:650 },
  sports: { category:'رياضة', question:'في أي رياضة اشتهر «{item}»؟', query:'?item wdt:P106 wd:Q2066131; wdt:P641 ?answer.', limit:550 },
  social: { category:'مجتمع وتراث', question:'تتبع «{item}» أي منطقة إدارية في عُمان؟', query:'?item wdt:P17 wd:Q842; wdt:P131 ?answer.', limit:450 }
};
const cache = new Map();
const TTL = 20 * 60 * 1000;
const shuffle = items => {
  const a=[...items];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
};

async function dataset(name) {
  const key=DATASETS[name] ? name : 'geography';
  const old=cache.get(key);
  if(old && old.expires>Date.now()) return old.rows;
  if(old?.pending) return old.pending;
  const spec=DATASETS[key];
  const label=spec.numeric ? '?item rdfs:label ?itemLabel. FILTER(LANG(?itemLabel)="ar")' : '?item rdfs:label ?itemLabel. ?answer rdfs:label ?answerLabel. FILTER(LANG(?itemLabel)="ar" && LANG(?answerLabel)="ar")';
  const query=`SELECT DISTINCT ?item ?itemLabel ?answer ${spec.numeric?'':'?answerLabel'} WHERE { ${spec.query} ${label} } LIMIT ${spec.limit}`;
  const url=`https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;
  const pending=(async()=>{
    const response=await fetch(url,{headers:{Accept:'application/sparql-results+json','User-Agent':'IAmOmaniGame/1.0 (https://github.com/turkik69/i-am-Omani)'},signal:AbortSignal.timeout(12000)});
    if(!response.ok) throw Error(`Wikidata ${response.status}`);
    const data=await response.json();
    const rows=(data.results?.bindings||[]).map(b=>({
      id:b.item?.value?.split('/').pop(),
      item:b.itemLabel?.value?.trim(),
      answer:(spec.numeric ? b.answer?.value : b.answerLabel?.value)?.trim(),
      answerId:b.answer?.value?.split('/').pop()
    })).filter(r=>r.id && r.item && r.answer && r.item!==r.answer && r.item.length<85 && r.answer.length<65 && (spec.numeric || /^Q\d+$/.test(r.answerId)));
    if(rows.length<8 || new Set(rows.map(r=>r.answer)).size<4) throw Error(`Too few online facts for ${key}`);
    cache.set(key,{rows,expires:Date.now()+TTL});
    return rows;
  })();
  cache.set(key,{pending});
  try{return await pending;}catch(error){cache.delete(key);throw error;}
}

async function onlineQuestions({category='mixed',count=8,exclude=[]}={}) {
  const names=category==='mixed' ? ['oman','geography','science','culture','sports'] : [DATASETS[category] ? category : 'geography'];
  const results=await Promise.allSettled(names.map(dataset));
  const facts=results.flatMap((result,index)=>result.status==='fulfilled' ? result.value.map(row=>({row,spec:DATASETS[names[index]],key:names[index],pool:result.value})) : []);
  if(!facts.length) throw Error('Live question sources unavailable');
  const excluded=new Set(exclude);
  const unique=new Map();
  for(const fact of shuffle(facts)) unique.set(`${fact.key}:${fact.row.id}`,fact);
  const eligible=[...unique.values()].filter(f=>new Set(f.pool.map(x=>x.answer)).size>=4);
  const ordered=[...shuffle(eligible.filter(f=>!excluded.has(`${f.key}:${f.row.id}`))),...shuffle(eligible.filter(f=>excluded.has(`${f.key}:${f.row.id}`)))];
  const selected=ordered.slice(0,Math.min(Math.max(1,count),12));
  if(selected.length<Math.min(count,4)) throw Error('Too few live questions');
  return selected.map(({row,spec,key,pool})=>{
    const distractors=shuffle([...new Set(pool.map(x=>x.answer))].filter(answer=>answer!==row.answer)).slice(0,3);
    const options=shuffle([row.answer,...distractors]);
    return {id:`${key}:${row.id}`,question:spec.question.replace('{item}',row.item),options,correct:options.indexOf(row.answer),category:spec.category,difficulty:'متوسط',time:15,source:`https://www.wikidata.org/wiki/${row.id}`};
  });
}
module.exports={onlineQuestions};
