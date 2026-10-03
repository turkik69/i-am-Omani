'use strict';

module.exports = function registerBaloot(io) {
  const rooms = new Map();
  const code = () => String(Math.floor(100000 + Math.random() * 900000));
  const clean = (v='', n=40) => String(v).trim().replace(/[<>]/g,'').slice(0,n);
  const suits=['♠','♥','♦','♣'];
  const ranks=['7','8','9','10','J','Q','K','A'];
  const sunOrder=['7','8','9','J','Q','K','10','A'];
  const trumpOrder=['7','8','Q','K','10','A','9','J'];
  const sunPoints={A:11,'10':10,K:4,Q:3,J:2};
  const trumpPoints={A:11,'10':10,K:4,Q:3,J:20,'9':14};
  const cardId=(s,r)=>`${s}${r}`;
  const makeDeck=()=>suits.flatMap(s=>ranks.map(r=>({id:cardId(s,r),suit:s,rank:r})));
  const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a};

  function roomPublic(r){
    return {code:r.code,title:r.title,wilayat:r.wilayat,village:r.village,variant:r.variant,status:r.status,
      players:[...r.players.values()].map(p=>({id:p.id,uid:p.uid,name:p.name,avatar:p.avatar,hasPhoto:p.hasPhoto,approved:p.approved,score:p.score||0})),
      pending:[...r.pending.values()].map(p=>({id:p.id,uid:p.uid,name:p.name,avatar:p.avatar,hasPhoto:p.hasPhoto})),round:r.round||0,
      tables:[...r.tables.values()].map(t=>({id:t.id,names:t.seats.map(id=>r.players.get(id)?.name||'—'),teamScore:t.teamScore,trump:t.trump,variant:t.variant,stage:t.stage,finished:t.finished}))};
  }
  function emitRoom(r){io.to(`baloot:${r.code}`).emit('baloot:room',roomPublic(r));if(r.hostSocket)io.to(r.hostSocket).emit('baloot:pending',[...r.pending.values()].map(p=>({id:p.id,uid:p.uid,name:p.name,avatar:p.avatar,hasPhoto:p.hasPhoto})));broadcast();}
  function broadcast(){io.emit('baloot:rooms',[...rooms.values()].filter(r=>r.status==='lobby').map(roomPublic));}
  function hostOk(socket,r,token){return r && r.hostSocket===socket.id && token===r.hostToken;}

  function tableView(r,t,playerId){
    const seat=t.seats.indexOf(playerId); const p=seat>=0?r.players.get(playerId):null;
    return {room:r.code,table:t.id,round:r.round,variant:t.variant,trump:t.trump,seat,turn:t.turn,stage:t.stage,
      buyCard:t.buyCard,bidRound:t.bidRound,buyer:t.buyer,provisional:!!t.provisional,allowedVariant:r.variant,
      leadSuit:t.leadSuit,teamScore:t.teamScore,tricks:t.tricks.map(x=>({seat:x.seat,card:x.card})),
      players:t.seats.map((id,i)=>({seat:i,name:r.players.get(id)?.name||'—',cards:t.hands.get(id)?.length||0})),
      hand:p?[...(t.hands.get(playerId)||[])]:[],finished:t.finished,winnerTeam:t.winnerTeam,resultScore:t.resultScore||null};
  }
  function emitTable(r,t){for(const id of t.seats){const p=r.players.get(id);if(p?.socket)io.to(p.socket).emit('baloot:table',tableView(r,t,id));}}
  function compareCards(a,b,lead,trump){
    const aTrump=trump&&a.suit===trump,bTrump=trump&&b.suit===trump;
    if(aTrump!==bTrump)return aTrump?1:-1;
    if(a.suit!==b.suit){if(a.suit===lead)return 1;if(b.suit===lead)return -1;return 0;}
    const order=aTrump?trumpOrder:sunOrder;
    return order.indexOf(a.rank)-order.indexOf(b.rank);
  }
  const value=(c,t)=>((t.trump&&c.suit===t.trump?trumpPoints:sunPoints)[c.rank]||0);
  function dealFive(t){
    const deck=shuffle(makeDeck());t.hands=new Map();t.seats.forEach((id,s)=>t.hands.set(id,deck.slice(s*5,s*5+5)));
    t.buyCard=deck[20];t.tail=deck.slice(21);t.trump=null;t.variant=null;t.buyer=null;t.bidRound=1;t.bidCount=0;t.provisional=null;t.turn=1;t.stage='bidding';t.tricks=[];t.leadSuit=null;t.teamScore=[0,0];t.trickCount=[0,0];t.finished=false;t.winnerTeam=null;
  }
  function acceptBid(r,t,seat,variant,trump){
    t.variant=variant;t.trump=variant==='hokm'?trump:null;t.buyer=seat;t.stage='playing';t.turn=seat;
    let tail=0;t.seats.forEach((id,s)=>{if(s===seat){t.hands.get(id).push(t.buyCard,...t.tail.slice(tail,tail+2));tail+=2;}else{t.hands.get(id).push(...t.tail.slice(tail,tail+3));tail+=3;}});
    t.tail=[];emitTable(r,t);emitRoom(r);
  }
  function finishTable(r,t){
    t.finished=true;t.stage='finished';const buyerTeam=t.buyer%2;
    const total=t.variant==='sun'?26:16;
    const won=t.teamScore[buyerTeam]>t.teamScore[1-buyerTeam];
    const rounded=t.teamScore.map(n=>Math.round(n/10)*(t.variant==='sun'?2:1));
    t.resultScore=won?rounded:buyerTeam===0?[0,total]:[total,0];
    t.winnerTeam=t.resultScore[0]===t.resultScore[1]?null:(t.resultScore[0]>t.resultScore[1]?0:1);
    t.seats.forEach((id,seat)=>{const p=r.players.get(id);if(p)p.score=(p.score||0)+t.resultScore[seat%2];});
    emitTable(r,t); emitRoom(r);
    if([...r.tables.values()].every(x=>x.finished)){r.status='round-result';io.to(`baloot:${r.code}`).emit('baloot:round-finished',{round:r.round,leaderboard:[...r.players.values()].sort((a,b)=>(b.score||0)-(a.score||0)).map((p,i)=>({rank:i+1,uid:p.uid,name:p.name,avatar:p.avatar,hasPhoto:p.hasPhoto,score:p.score||0}))});emitRoom(r);}
  }
  function resolveTrick(r,t){
    let best=t.tricks[0];for(const x of t.tricks.slice(1))if(compareCards(x.card,best.card,t.leadSuit,t.trump)>0)best=x;
    t.teamScore[best.seat%2]+=t.tricks.reduce((sum,x)=>sum+value(x.card,t),0);
    t.trickCount[best.seat%2]++;
    t.turn=best.seat; t.tricks=[]; t.leadSuit=null;
    if(t.seats.every(id=>(t.hands.get(id)||[]).length===0))t.teamScore[best.seat%2]+=10;
    const empty=t.seats.every(id=>(t.hands.get(id)||[]).length===0);if(empty)return finishTable(r,t);emitTable(r,t);
  }
  function buildTables(r){
    r.tables.clear();const ids=[...r.players.values()].filter(p=>p.approved).map(p=>p.id);
    const active=ids.slice(0,Math.floor(ids.length/4)*4); r.waiting=ids.slice(active.length);
    for(let i=0;i<active.length;i+=4){
      const seats=active.slice(i,i+4);
      const t={id:`T${i/4+1}`,seats};dealFive(t);
      r.tables.set(t.id,t);
    }
  }

  io.on('connection',socket=>{
    socket.on('baloot:list',()=>socket.emit('baloot:rooms',[...rooms.values()].filter(r=>r.status==='lobby').map(roomPublic)));
    socket.on('baloot:create',(d={},cb=()=>{})=>{
      let c=code();while(rooms.has(c))c=code();const token=require('crypto').randomUUID();
      const r={code:c,hostSocket:socket.id,hostToken:token,title:clean(d.title||'الورقة • البلوت',60),wilayat:clean(d.wilayat||'مسقط'),village:clean(d.village||'المجلس'),variant:['sun','hokm','mixed'].includes(d.variant)?d.variant:'mixed',status:'lobby',players:new Map(),pending:new Map(),tables:new Map(),round:0,waiting:[]};
      rooms.set(c,r);socket.join(`baloot:${c}`);cb({ok:true,code:c,hostToken:token,room:roomPublic(r)});emitRoom(r);
    });
    socket.on('baloot:join-request',async(d={},cb=()=>{})=>{
      const r=rooms.get(String(d.code||''));if(!r||r.status!=='lobby')return cb({ok:false,error:'المجلس غير متاح حاليًا'});
      let identity;try{identity=global.__IAM_OMANI_VERIFY_ACCOUNT__?await global.__IAM_OMANI_VERIFY_ACCOUNT__(d.idToken):{uid:null,data:{username:d.name}};}catch(e){return cb({ok:false,error:e.message});}
      const name=clean(identity.data.nickname||identity.data.username,28);if(!name)return cb({ok:false,error:'أكمل ملفك الشخصي أولًا'});
      if([...r.pending.values(),...r.players.values()].some(x=>x.uid&&x.uid===identity.uid))return cb({ok:false,error:'طلبك موجود في المجلس'});
      const id=require('crypto').randomUUID();const p={id,uid:identity.uid,name,avatar:clean(d.avatar||'OM1',8),hasPhoto:!!identity.data.photoData,socket:socket.id,approved:false,score:0};r.pending.set(id,p);socket.data.balootPending={code:r.code,id};cb({ok:true,pending:true});emitRoom(r);
    });
    socket.on('baloot:approve',(d={},cb=()=>{})=>{
      const r=rooms.get(String(d.code||''));if(!hostOk(socket,r,d.hostToken))return cb({ok:false});const p=r.pending.get(d.playerId);if(!p)return cb({ok:false});r.pending.delete(p.id);p.approved=true;r.players.set(p.id,p);io.sockets.sockets.get(p.socket)?.join(`baloot:${r.code}`);io.to(p.socket).emit('baloot:approved',{code:r.code,playerId:p.id,room:roomPublic(r)});cb({ok:true});emitRoom(r);
    });
    socket.on('baloot:reject',(d={},cb=()=>{})=>{const r=rooms.get(String(d.code||''));if(!hostOk(socket,r,d.hostToken))return cb({ok:false});const p=r.pending.get(d.playerId);if(p)io.to(p.socket).emit('baloot:rejected');r.pending.delete(d.playerId);cb({ok:true});emitRoom(r);});
    socket.on('baloot:start',(d={},cb=()=>{})=>{
      const r=rooms.get(String(d.code||''));if(!hostOk(socket,r,d.hostToken))return cb({ok:false});if(r.players.size<4)return cb({ok:false,error:'تحتاج 4 لاعبين على الأقل'});r.round++;r.status='playing';buildTables(r);cb({ok:true,tables:r.tables.size,waiting:r.waiting.length});
      for(const t of r.tables.values())emitTable(r,t);emitRoom(r);
    });
    socket.on('baloot:bid',(d={},cb=()=>{})=>{
      const r=rooms.get(String(d.code||'')),t=r?.tables.get(d.table),seat=t?.seats.indexOf(d.playerId),p=r?.players.get(d.playerId);
      if(!t||t.stage!=='bidding'||seat!==t.turn||p?.socket!==socket.id)return cb({ok:false,error:'ليس دورك في الشراء'});
      const choice=d.choice;if(!['pass','sun','hokm'].includes(choice))return cb({ok:false,error:'عرض غير معروف'});
      if(choice!=='pass'&&r.variant!=='mixed'&&r.variant!==choice)return cb({ok:false,error:'هذا النمط غير متاح في المجلس'});
      if(choice==='sun'){cb({ok:true});return acceptBid(r,t,seat,'sun',null);}
      if(choice==='hokm'){
        if(t.provisional)return cb({ok:false,error:'تم طلب الحكم؛ يمكنك اختيار صن أو تمرير الدور'});
        const trump=t.bidRound===1?t.buyCard.suit:d.suit;
        if(!suits.includes(trump)||t.bidRound===2&&trump===t.buyCard.suit)return cb({ok:false,error:'اختر نوع حكم مختلفًا عن ورقة المشترى'});
        t.provisional={seat,trump};
      }
      t.bidCount++;t.turn=(t.turn+1)%4;cb({ok:true});
      if(t.bidCount===4){
        if(t.provisional)return acceptBid(r,t,t.provisional.seat,'hokm',t.provisional.trump);
        if(t.bidRound===2){dealFive(t);emitTable(r,t);return;}
        t.bidRound=2;t.bidCount=0;t.turn=1;
      }
      emitTable(r,t);
    });
    socket.on('baloot:play',(d={},cb=()=>{})=>{
      const r=rooms.get(String(d.code||'')),t=r?.tables.get(d.table);if(!r||!t||t.finished||t.stage!=='playing'||t.tricks.length===4)return cb({ok:false,error:'الطاولة غير متاحة'});const seat=t.seats.indexOf(d.playerId);if(seat<0||seat!==t.turn||r.players.get(d.playerId)?.socket!==socket.id)return cb({ok:false,error:'ليس دورك'});
      const hand=t.hands.get(d.playerId)||[],idx=hand.findIndex(c=>c.id===d.cardId);if(idx<0)return cb({ok:false,error:'الورقة غير موجودة'});const card=hand[idx];if(t.leadSuit&&card.suit!==t.leadSuit&&hand.some(c=>c.suit===t.leadSuit))return cb({ok:false,error:'يجب اتباع النوع المفتوح'});
      hand.splice(idx,1);if(!t.leadSuit)t.leadSuit=card.suit;t.tricks.push({seat,card});t.turn=(t.turn+1)%4;cb({ok:true});if(t.tricks.length===4)setTimeout(()=>resolveTrick(r,t),650);else emitTable(r,t);
    });
    socket.on('baloot:next-round',(d={},cb=()=>{})=>{const r=rooms.get(String(d.code||''));if(!hostOk(socket,r,d.hostToken))return cb({ok:false});if(r.status!=='round-result')return cb({ok:false});r.status='lobby';r.tables.clear();cb({ok:true});emitRoom(r);});
    socket.on('disconnect',()=>{
      for(const r of rooms.values()){
        if(r.hostSocket===socket.id)r.hostSocket=null;
        for(const p of r.players.values())if(p.socket===socket.id)p.socket=null;
        for(const [id,p] of r.pending)if(p.socket===socket.id)r.pending.delete(id);
        emitRoom(r);
      }
    });
  });
};
