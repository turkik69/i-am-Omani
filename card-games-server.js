'use strict';
const { randomUUID } = require('crypto');

module.exports = function registerCardGames(io) {
  const rooms = new Map();
  const suits = ['♠','♥','♦','♣'];
  const clean = (v, n=28) => String(v || '').trim().replace(/[<>]/g, '').slice(0,n);
  const shuffle = a => { a=[...a]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
  const code = () => { let c; do { c=String(Math.floor(100000+Math.random()*900000)); } while(rooms.has(c)); return c; };
  const normalDeck = (copies=1,jokers=0) => { const d=[];for(let k=0;k<copies;k++)for(const s of suits)for(let v=1;v<=13;v++)d.push({id:randomUUID(),s,v});for(let k=0;k<jokers;k++)d.push({id:randomUUID(),s:'★',v:0});return shuffle(d); };
  const sixtyDeck = () => shuffle(suits.flatMap(s=>[3,4,5,6,7,11,12,13,1].map(v=>({id:randomUUID(),s,v}))));
  const handPoints = c => c.v===0?15:c.v===1?11:Math.min(c.v,10);
  function publicState(r,p){
    const base={code:r.code,mode:r.mode,status:r.status,hostId:r.hostId,selfId:p.id,players:r.players.map(x=>({id:x.id,name:x.name,count:x.hand.length,score:x.score,laid:x.laid})),hand:p.hand,turn:r.turn,round:r.round,required:r.required};
    if(r.mode==='hand')return {...base,stage:r.stage,stock:r.stock.length,top:r.discard.at(-1)||null,melds:r.melds,roundResult:r.result,drawnFromDiscard:r.drawnFromDiscard};
    return {...base,top:r.trumpCard,stock:r.stock.length,trump:r.trump,trick:r.trick,teamMoney:r.teamMoney,teamSecondary:r.teamSecondary,external:r.external,result:r.result};
  }
  function emit(r){for(const p of r.players)if(p.socket)io.to(p.socket).emit('cards:state',publicState(r,p));}
  const auth=(socket,d)=>{const r=rooms.get(String(d?.code||''));return [r,r?.players.find(p=>p.token===d?.token&&p.socket===socket.id)];};
  const fail=(cb,message)=>cb({ok:false,error:message});
  function drawHand(r,p,fromDiscard=false){
    if(fromDiscard){if(!r.discard.length)return false;p.hand.push(r.discard.pop());r.drawnFromDiscard=true;return true;}
    if(!r.stock.length&&r.discard.length>1){const top=r.discard.pop();r.stock=shuffle(r.discard);r.discard=[top];}
    if(!r.stock.length)return false;p.hand.push(r.stock.pop());r.drawnFromDiscard=false;return true;
  }
  function startHand(r){r.round++;r.status='playing';r.result=null;r.stock=normalDeck(2,2);r.discard=[];r.melds=[];r.players.forEach(p=>{p.hand=r.stock.splice(-14);p.laid=false;p.laidThisTurn=false;p.handCandidate=false});r.turn=(r.round-1)%r.players.length;r.players[r.turn].hand.push(r.stock.pop());r.stage='discard';r.drawnFromDiscard=false;emit(r);}
  function group(cards){
    if(cards.length<3||cards.length>13)return null;
    const regular=cards.filter(c=>c.v!==0),jokers=cards.length-regular.length;
    if(!regular.length)return null;
    const same=regular.every(c=>c.v===regular[0].v)&&new Set(regular.map(c=>c.s)).size===regular.length&&cards.length<=4;
    if(same)return {kind:'set',value:regular[0].v,points:cards.length*handPoints(regular[0])};
    if(!regular.every(c=>c.s===regular[0].s)||new Set(regular.map(c=>c.v)).size!==regular.length)return null;
    const values=regular.map(c=>c.v===1?14:c.v).sort((a,b)=>a-b);
    const gaps=values.at(-1)-values[0]+1-values.length;
    if(gaps>jokers||values.at(-1)-values[0]+jokers-gaps>12)return null;
    const sequence=[];for(let v=values[0];v<=values.at(-1);v++)sequence.push(v);
    let extra=jokers-gaps,next=values.at(-1)+1;while(extra>0&&next<=14){sequence.push(next++);extra--;}
    let before=values[0]-1;while(extra>0&&before>=2){sequence.unshift(before--);extra--;}
    if(extra>0)return null;
    return {kind:'run',suit:regular[0].s,points:sequence.reduce((n,v)=>n+(v===14?11:Math.min(v,10)),0)};
  }
  function endHand(r,winner){
    const special=!!winner.handCandidate;
    const scores=r.players.map(p=>{const delta=p===winner?(special?-60:-30):p.laid?p.hand.reduce((n,c)=>n+handPoints(c),0)*(special?2:1):100*(special?2:1);p.score+=delta;return {name:p.name,delta,total:p.score};});
    r.result={winner:winner.name,scores};r.status=r.round>=5?'finished':'round-end';emit(r);
  }
  const sixtyRank=v=>({1:9,7:8,13:7,11:6,12:5,6:4,5:3,4:2,3:1})[v]||0;
  const sixtySecondary=v=>({1:1,13:4,11:3,12:2})[v]||0;
  function startSixty(r){
    r.round++;r.status='playing';r.result=null;const d=sixtyDeck();r.players.forEach(p=>p.hand=d.splice(-3));r.trumpCard=d.pop();r.trump=r.trumpCard.s;r.stock=d;r.stock.unshift(r.trumpCard);r.trick=[];r.turn=(r.round-1)%r.players.length;r.teamMoney=[0,0];r.teamSecondary=[0,0];emit(r);
  }
  function completeSixty(r){
    const [a,b]=r.teamMoney, [sa,sb]=r.teamSecondary;let winner=a>b?0:b>a?1:sa>sb?0:sb>sa?1:null;
    if(winner===null){r.result={message:'تعادل؛ الجولة القادمة مضاعفة',money:[a,b],secondary:[sa,sb],external:[...r.external]};r.carry*=2;}
    else {const m=r.teamMoney[winner],loserScore=r.teamSecondary[1-winner];let amount=m===8?(loserScore<=10?r.external[winner]:3):m===6?(loserScore<=10?3:1):m===5||m===7?(loserScore<=20?3:1):1;
      amount=Math.min(amount*r.carry,r.external[winner]);r.external[winner]-=amount;r.external[1-winner]+=amount;r.carry=1;
      r.result={message:`فاز الفريق ${winner+1} وتخلّص من ${amount} ورقة خارجية`,winner,money:[a,b],secondary:[sa,sb],external:[...r.external]};}
    r.status=r.external.includes(0)?'finished':'round-end';emit(r);
  }
  function resolveSixty(r){
    const first=r.trick[0],lead=first.card.s;let best=first;
    for(const play of r.trick.slice(1)){const c=play.card,b=best.card;if(c.s===r.trump&&b.s!==r.trump||c.s===b.s&&sixtyRank(c.v)>sixtyRank(b.v))best=play;}
    r.teamMoney[best.seat%2]+=r.trick.filter(x=>x.card.v===1||x.card.v===7).length;
    r.teamSecondary[best.seat%2]+=r.trick.reduce((sum,x)=>sum+sixtySecondary(x.card.v),0);
    r.turn=best.seat;r.trick=[];
    for(let n=0;n<r.players.length&&r.stock.length;n++){const seat=(best.seat+n)%r.players.length;r.players[seat].hand.push(r.stock.pop());}
    if(r.players.every(p=>p.hand.length===0))completeSixty(r);else emit(r);
  }
  io.on('connection',socket=>{
    socket.on('cards:create',(d={},cb=()=>{})=>{if(!['hand','sixtyone'].includes(d.mode))return fail(cb,'نوع اللعبة غير معروف');const name=clean(d.name);if(!name)return fail(cb,'اكتب اسمك');const p={id:randomUUID(),token:randomUUID(),name,socket:socket.id,hand:[],score:0,laid:false};const r={code:code(),mode:d.mode,required:d.mode==='sixtyone'?(Number(d.required)===4?4:6):null,players:[p],hostId:p.id,status:'lobby',round:0,turn:0,external:[8,8],carry:1};rooms.set(r.code,r);cb({ok:true,code:r.code,token:p.token});emit(r);});
    socket.on('cards:join',(d={},cb=()=>{})=>{const r=rooms.get(String(d.code||'')),name=clean(d.name);if(!r||r.status!=='lobby')return fail(cb,'الغرفة غير متاحة');if(!name)return fail(cb,'اكتب اسمك');if(r.players.length>=(r.mode==='hand'?5:r.required))return fail(cb,'اكتمل عدد اللاعبين');const p={id:randomUUID(),token:randomUUID(),name,socket:socket.id,hand:[],score:0,laid:false};r.players.push(p);cb({ok:true,code:r.code,token:p.token});emit(r);});
    socket.on('cards:reconnect',(d={},cb=()=>{})=>{const r=rooms.get(String(d.code||'')),p=r?.players.find(x=>x.token===d.token);if(!p)return fail(cb,'انتهت الغرفة');clearTimeout(p.leaveTimer);p.leaveTimer=null;p.socket=socket.id;cb({ok:true});emit(r);});
    socket.on('cards:start',(d={},cb=()=>{})=>{const [r,p]=auth(socket,d);if(!r||p?.id!==r.hostId||!['lobby','round-end'].includes(r.status))return fail(cb,'المضيف وحده يبدأ الجولة');if(r.mode==='hand'&&r.players.length<2||r.mode==='sixtyone'&&r.players.length!==r.required)return fail(cb,'عدد اللاعبين غير مكتمل');r.mode==='hand'?startHand(r):startSixty(r);cb({ok:true});});
    socket.on('cards:draw',(d={},cb=()=>{})=>{const [r,p]=auth(socket,d);if(!p||r.mode!=='hand'||r.status!=='playing'||r.players[r.turn]!==p||r.stage!=='draw')return fail(cb,'ليس وقت السحب');if(!drawHand(r,p,d.from==='discard'))return fail(cb,'لا توجد أوراق للسحب');r.stage='meld';p.laidThisTurn=false;cb({ok:true});emit(r);});
    socket.on('cards:meld',(d={},cb=()=>{})=>{const [r,p]=auth(socket,d);if(!p||r.mode!=='hand'||r.status!=='playing'||r.players[r.turn]!==p||!['meld','discard'].includes(r.stage))return fail(cb,'ليس دورك');const groups=d.groups;if(!Array.isArray(groups)||!groups.length||groups.length>6)return fail(cb,'اختر مجموعات صحيحة');const ids=groups.flat(),cards=ids.map(id=>p.hand.find(c=>c.id===id));if(new Set(ids).size!==ids.length||cards.some(c=>!c))return fail(cb,'الورق غير متاح');let score=0;for(const idsOfGroup of groups){const valid=group(idsOfGroup.map(id=>p.hand.find(c=>c.id===id)));if(!valid)return fail(cb,'المجموعة تحتاج ثلاث أوراق متسلسلة أو متشابهة');score+=valid.points;}if(!p.laid&&score<51)return fail(cb,'أول نزول يحتاج 51 نقطة أو أكثر');const firstLay=!p.laid;p.hand=p.hand.filter(c=>!ids.includes(c.id));p.laid=true;p.laidThisTurn=true;p.handCandidate=firstLay&&p.hand.length<=1;r.melds.push(...groups.map(idsOfGroup=>({owner:p.id,cards:idsOfGroup.map(id=>cards.find(c=>c.id===id))})));r.stage='meld';cb({ok:true});if(!p.hand.length)endHand(r,p);else emit(r);});
    socket.on('cards:attach',(d={},cb=()=>{})=>{const [r,p]=auth(socket,d);if(!p||r.mode!=='hand'||r.status!=='playing'||r.players[r.turn]!==p||!p.laid||!['meld','discard'].includes(r.stage))return fail(cb,'نزّل مجموعاتك أولًا');const target=r.melds[Number(d.index)],card=p.hand.find(c=>c.id===d.cardId);if(!target||!card||!group([...target.cards,card]))return fail(cb,'لا يمكن تركيب هذه الورقة');target.cards.push(card);p.hand=p.hand.filter(c=>c.id!==card.id);p.laidThisTurn=true;p.handCandidate=false;r.stage='meld';cb({ok:true});if(!p.hand.length)endHand(r,p);else emit(r);});
    socket.on('cards:discard',(d={},cb=()=>{})=>{const [r,p]=auth(socket,d);if(!p||r.mode!=='hand'||r.status!=='playing'||r.players[r.turn]!==p||!['discard','meld'].includes(r.stage))return fail(cb,'ليس وقت الرمي');if(r.drawnFromDiscard&&!p.laidThisTurn)return fail(cb,'عند السحب من النار يجب تنزيل مجموعة قبل الرمي');const i=p.hand.findIndex(c=>c.id===d.cardId);if(i<0)return fail(cb,'الورقة غير موجودة');r.discard.push(p.hand.splice(i,1)[0]);cb({ok:true});if(!p.hand.length)return endHand(r,p);r.turn=(r.turn+1)%r.players.length;r.stage='draw';r.drawnFromDiscard=false;emit(r);});
    socket.on('cards:play',(d={},cb=()=>{})=>{const [r,p]=auth(socket,d);if(!p||r.mode!=='sixtyone'||r.status!=='playing'||r.players[r.turn]!==p||r.trick.length===r.players.length)return fail(cb,'ليس دورك');const i=p.hand.findIndex(c=>c.id===d.cardId);if(i<0)return fail(cb,'الورقة غير موجودة');r.trick.push({seat:r.turn,card:p.hand.splice(i,1)[0]});r.turn=(r.turn+1)%r.players.length;cb({ok:true});if(r.trick.length===r.players.length)resolveSixty(r);else emit(r);});
    socket.on('disconnect',()=>{for(const r of rooms.values()){const p=r.players.find(x=>x.socket===socket.id);if(!p)continue;p.socket=null;if(r.status==='lobby'){p.leaveTimer=setTimeout(()=>{if(p.socket||r.status!=='lobby')return;r.players=r.players.filter(x=>x!==p);if(!r.players.length){rooms.delete(r.code);return;}if(r.hostId===p.id)r.hostId=r.players[0].id;emit(r);},60000);p.leaveTimer.unref?.();}}});
  });
};
