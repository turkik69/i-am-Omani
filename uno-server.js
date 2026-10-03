'use strict';
const {randomUUID}=require('crypto');

module.exports=function registerUno(io){
  const rooms=new Map(), colors=['red','yellow','green','blue'];
  const clean=(s,n=30)=>String(s||'').trim().replace(/[<>]/g,'').slice(0,n);
  const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
  function deck(){const d=[];let id=0;for(const color of colors){d.push({id:++id,color,value:'0'});for(let copy=0;copy<2;copy++)for(const value of ['1','2','3','4','5','6','7','8','9','skip','reverse','draw2'])d.push({id:++id,color,value})}for(let i=0;i<4;i++){d.push({id:++id,color:'wild',value:'wild'});d.push({id:++id,color:'wild',value:'draw4'})}return shuffle(d)}
  const next=(r,steps=1)=>{let i=r.turn;for(let n=0;n<steps;n++)i=(i+r.direction+r.players.length)%r.players.length;return i};
  const points=c=>c.value==='wild'||c.value==='draw4'?50:['skip','reverse','draw2'].includes(c.value)?20:Number(c.value);
  function draw(r,p,count){for(let n=0;n<count;n++){if(!r.draw.length){const top=r.discard.pop();r.draw=shuffle(r.discard);r.discard=[top]}if(r.draw.length)p.hand.push(r.draw.pop())}}
  const match=(r,c)=>c.color==='wild'||c.color===r.color||c.value===r.discard.at(-1)?.value;
  const lobby=r=>({code:r.code,status:r.status,practice:!!r.practice,hostId:r.hostId,players:r.players.map(p=>({id:p.id,uid:p.uid,name:p.name,bot:!!p.bot,count:p.hand.length,score:p.score})),turn:r.turn,direction:r.direction,color:r.color,top:r.discard.at(-1)||null,pending:r.pending?{type:r.pending.type,target:r.pending.target}:null,uno:r.unoOpportunity,round:r.round,winner:r.winner||null});
  function emit(r){for(const p of r.players)if(p.socket)io.to(p.socket).emit('uno:state',{...lobby(r),selfId:p.id,hand:p.hand,drawnId:r.drawnId&&r.players[r.turn]?.id===p.id?r.drawnId:null});scheduleBot(r)}
  function scheduleBot(r){
    if(!r.practice||r.status!=='playing'||r.botTimer)return;
    const pendingVictim=r.pending&&r.players.find(x=>x.id===r.pending.target);
    if(r.pending?!pendingVictim?.bot:!r.players[r.turn]?.bot)return;
    r.botTimer=setTimeout(()=>{r.botTimer=null;if(rooms.get(r.code)!==r||r.status!=='playing')return;
      if(r.pending){const victim=r.players.find(x=>x.id===r.pending.target);
        if(!victim?.bot)return;
        const pending=r.pending,attacker=r.players.find(x=>x.id===pending.attacker);
        draw(r,victim,4);r.pending=null;r.unoOpportunity=null;r.turn=next(r,2);
        if(pending.finisher&&!pending.illegal)finish(r,attacker);else emit(r);
        return;
      }
      const p=r.players[r.turn];if(!p?.bot)return;
      let options=p.hand.filter(c=>match(r,c));if(r.drawnId)options=options.filter(c=>c.id===r.drawnId);
      const card=options.find(c=>c.color!=='wild')||options[0];
      if(!card){if(r.drawnId){advance(r);return}r.unoOpportunity=null;draw(r,p,1);const drawn=p.hand.at(-1);if(drawn&&match(r,drawn)){r.drawnId=drawn.id;emit(r)}else advance(r);return;}
      const priorColor=r.color,illegal=card.value==='draw4'&&p.hand.some(c=>c.id!==card.id&&c.color===priorColor);
      p.hand.splice(p.hand.indexOf(card),1);r.drawnId=null;r.discard.push(card);
      r.color=card.color==='wild'?(colors.map(c=>({c,n:p.hand.filter(x=>x.color===c).length})).sort((a,b)=>b.n-a.n)[0].c):card.color;
      r.unoOpportunity=null;if(card.value==='reverse')r.direction*=-1;
      const victim=next(r);
      if(card.value==='draw4')r.pending={type:'draw4',target:r.players[victim].id,attacker:p.id,illegal,finisher:p.hand.length===0};
      else if(card.value==='draw2'){draw(r,r.players[victim],2);r.turn=next(r,2)}
      else if(card.value==='skip'||card.value==='reverse'&&r.players.length===2)r.turn=next(r,2);
      else r.turn=victim;
      if(!p.hand.length&&!r.pending)finish(r,p);else emit(r);
    },650);r.botTimer.unref?.();
  }
  const auth=(socket,r,token)=>r?.players.find(p=>p.socket===socket.id&&p.token===token);
  function finish(r,p){const reward=r.players.filter(x=>x!==p).flatMap(x=>x.hand).reduce((sum,c)=>sum+points(c),0);p.score+=reward;r.winner={name:p.name,reward,score:p.score,champion:p.score>=500};r.status=p.score>=500?'finished':'round-end';r.pending=null;emit(r)}
  function advance(r,steps=1){r.drawnId=null;r.unoOpportunity=null;r.turn=next(r,steps);emit(r)}
  function begin(r){r.draw=deck();r.discard=[];r.players.forEach(p=>{p.hand=[];draw(r,p,7)});r.direction=1;r.turn=Math.floor(Math.random()*r.players.length);r.pending=null;r.unoOpportunity=null;r.drawnId=null;r.winner=null;r.round++;r.status='playing';let first;do{first=r.draw.pop();if(first.value==='draw4')r.draw.unshift(first)}while(first.value==='draw4');r.discard=[first];r.color=first.color;
    if(first.value==='wild')r.color=colors[Math.floor(Math.random()*4)];
    if(first.value==='reverse'){r.direction=-1;if(r.players.length===2)r.turn=next(r)}
    if(first.value==='skip')r.turn=next(r);
    if(first.value==='draw2'){const target=r.players[r.turn];draw(r,target,2);r.turn=next(r)}
    emit(r);
  }
  io.on('connection',socket=>{
    socket.on('uno:create',async(d={},cb=()=>{})=>{let account;try{account=global.__IAM_OMANI_VERIFY_ACCOUNT__?await global.__IAM_OMANI_VERIFY_ACCOUNT__(d.idToken):{uid:null,data:{username:d.name}};}catch(e){return cb({ok:false,error:e.message})}let code;do{code=String(Math.floor(100000+Math.random()*900000))}while(rooms.has(code));const p={id:randomUUID(),token:randomUUID(),uid:account.uid,name:clean(account.data.nickname||account.data.username)||'المضيف',socket:socket.id,hand:[],score:0};const r={code,players:[p],hostId:p.id,status:'lobby',round:0,draw:[],discard:[],turn:0,direction:1,color:null,pending:null};rooms.set(code,r);socket.join(`uno:${code}`);cb({ok:true,code,token:p.token,id:p.id});emit(r)});
    socket.on('uno:join',async(d={},cb=()=>{})=>{const r=rooms.get(String(d.code||''));if(!r||r.practice||r.status!=='lobby'||r.players.length>=10)return cb({ok:false,error:'الغرفة غير متاحة أو مكتملة'});let account;try{account=global.__IAM_OMANI_VERIFY_ACCOUNT__?await global.__IAM_OMANI_VERIFY_ACCOUNT__(d.idToken):{uid:null,data:{username:d.name}};}catch(e){return cb({ok:false,error:e.message})}const name=clean(account.data.nickname||account.data.username);if(!name)return cb({ok:false,error:'أكمل ملفك الشخصي'});if(r.players.some(p=>p.uid&&p.uid===account.uid))return cb({ok:false,error:'أنت موجود في الغرفة'});const p={id:randomUUID(),token:randomUUID(),uid:account.uid,name,socket:socket.id,hand:[],score:0};r.players.push(p);socket.join(`uno:${r.code}`);cb({ok:true,code:r.code,token:p.token,id:p.id});emit(r)});
    socket.on('uno:practice',(d={},cb=()=>{})=>{const r=rooms.get(String(d.code||'')),p=auth(socket,r,d.token);if(!r||p?.id!==r.hostId||r.status!=='lobby'||r.players.length!==1)return cb({ok:false,error:'التدريب متاح عندما تكون وحدك في الغرفة'});r.practice=true;for(let i=1;i<=2;i++)r.players.push({id:randomUUID(),uid:null,name:`متدرّب ${i}`,bot:true,socket:null,hand:[],score:0});begin(r);cb({ok:true});});
    socket.on('uno:reconnect',async(d={},cb=()=>{})=>{const r=rooms.get(String(d.code||'')),p=r?.players.find(x=>x.token===d.token);if(!p)return cb({ok:false});let account;try{account=await global.__IAM_OMANI_VERIFY_ACCOUNT__(d.idToken)}catch{return cb({ok:false})}if(p.uid!==account.uid)return cb({ok:false});clearTimeout(r.cleanupTimer);r.cleanupTimer=null;p.socket=socket.id;socket.join(`uno:${r.code}`);cb({ok:true,id:p.id});emit(r)});
    socket.on('uno:start',(d={},cb=()=>{})=>{const r=rooms.get(String(d.code||'')),p=auth(socket,r,d.token);if(!p||p.id!==r.hostId||!['lobby','round-end'].includes(r.status))return cb({ok:false});if(r.players.length<2)return cb({ok:false,error:'تحتاج لاعبين على الأقل'});begin(r);cb({ok:true})});
    socket.on('uno:play',(d={},cb=()=>{})=>{const r=rooms.get(String(d.code||'')),p=auth(socket,r,d.token);if(!p||r.status!=='playing'||r.players[r.turn]!==p||r.pending)return cb({ok:false,error:'ليس دورك'});const index=p.hand.findIndex(c=>c.id===d.cardId),card=p.hand[index];if(!card||r.drawnId&&card.id!==r.drawnId||!match(r,card))return cb({ok:false,error:'الورقة لا تطابق اللون أو الرقم'});const priorColor=r.color,illegal=card.value==='draw4'&&p.hand.some(c=>c.id!==card.id&&c.color===priorColor);if(card.color==='wild'&&!colors.includes(d.color))return cb({ok:false,error:'اختر اللون'});p.hand.splice(index,1);r.drawnId=null;r.discard.push(card);r.color=card.color==='wild'?d.color:card.color;r.unoOpportunity=p.hand.length===1&&!d.uno?p.id:null;
      if(card.value==='reverse')r.direction*=-1;
      const victim=next(r);if(card.value==='draw4')r.pending={type:'draw4',target:r.players[victim].id,attacker:p.id,illegal,finisher:p.hand.length===0};
      else if(card.value==='draw2'){draw(r,r.players[victim],2);r.turn=next(r,2)}
      else if(card.value==='skip'||card.value==='reverse'&&r.players.length===2)r.turn=next(r,2);
      else r.turn=victim;
      cb({ok:true});if(p.hand.length===0&&!r.pending)finish(r,p);else emit(r);
    });
    socket.on('uno:draw',(d={},cb=()=>{})=>{const r=rooms.get(String(d.code||'')),p=auth(socket,r,d.token);if(!p||r.status!=='playing'||r.players[r.turn]!==p||r.pending||r.drawnId)return cb({ok:false});r.unoOpportunity=null;draw(r,p,1);const card=p.hand.at(-1);if(card&&match(r,card)){r.drawnId=card.id;emit(r)}else advance(r);cb({ok:true})});
    socket.on('uno:keep',(d={},cb=()=>{})=>{const r=rooms.get(String(d.code||'')),p=auth(socket,r,d.token);if(!p||r.players[r.turn]!==p||!r.drawnId)return cb({ok:false});advance(r);cb({ok:true})});
    socket.on('uno:call',(d={},cb=()=>{})=>{const r=rooms.get(String(d.code||'')),p=auth(socket,r,d.token);if(!p||r.status!=='playing')return cb({ok:false});if(r.unoOpportunity===p.id){r.unoOpportunity=null;emit(r);return cb({ok:true})}return cb({ok:false})});
    socket.on('uno:catch',(d={},cb=()=>{})=>{const r=rooms.get(String(d.code||'')),p=auth(socket,r,d.token),target=r?.players.find(x=>x.id===r.unoOpportunity);if(!p||!target||target===p)return cb({ok:false});draw(r,target,2);r.unoOpportunity=null;emit(r);cb({ok:true})});
    socket.on('uno:penalty',(d={},cb=()=>{})=>{const r=rooms.get(String(d.code||'')),p=auth(socket,r,d.token),pending=r?.pending;if(!p||r.status!=='playing'||!pending||pending.target!==p.id)return cb({ok:false});const attacker=r.players.find(x=>x.id===pending.attacker);if(d.challenge){if(pending.illegal){draw(r,attacker,4);r.turn=r.players.indexOf(p)}else{draw(r,p,6);r.turn=next(r,2)} }else{draw(r,p,4);r.turn=next(r,2)}r.pending=null;r.unoOpportunity=null;cb({ok:true});if(pending.finisher&&!pending.illegal)finish(r,attacker);else emit(r)});
    socket.on('disconnect',()=>{for(const r of rooms.values()){const p=r.players.find(x=>x.socket===socket.id);if(p)p.socket=null;if(r.practice&&p&&!r.players.some(x=>!x.bot&&x.socket)){r.cleanupTimer=setTimeout(()=>{if(!r.players.some(x=>!x.bot&&x.socket))rooms.delete(r.code)},5*60*1000);r.cleanupTimer.unref?.()}if(r.status==='lobby'&&p){r.players=r.players.filter(x=>x!==p);if(!r.players.length){rooms.delete(r.code);continue}if(r.hostId===p.id)r.hostId=r.players[0].id;emit(r)}}});
  });
};
