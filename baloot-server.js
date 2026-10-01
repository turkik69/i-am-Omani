'use strict';

module.exports = function registerBaloot(io) {
  const rooms = new Map();
  const code = () => String(Math.floor(100000 + Math.random() * 900000));
  const clean = (v='', n=40) => String(v).trim().replace(/[<>]/g,'').slice(0,n);
  const suits=['♠','♥','♦','♣'];
  const ranks=['7','8','9','10','J','Q','K','A'];
  const rankValue=Object.fromEntries(ranks.map((r,i)=>[r,i]));
  const cardId=(s,r)=>`${s}${r}`;
  const makeDeck=()=>suits.flatMap(s=>ranks.map(r=>({id:cardId(s,r),suit:s,rank:r})));
  const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a};

  function roomPublic(r){
    return {code:r.code,title:r.title,wilayat:r.wilayat,village:r.village,variant:r.variant,status:r.status,
      players:[...r.players.values()].map(p=>({id:p.id,name:p.name,avatar:p.avatar,approved:p.approved,score:p.score||0})),
      pending:[...r.pending.values()].map(p=>({id:p.id,name:p.name,avatar:p.avatar})),round:r.round||0,
      tables:[...r.tables.values()].map(t=>({id:t.id,names:t.seats.map(id=>r.players.get(id)?.name||'—'),teamScore:t.teamScore,trump:t.trump,variant:t.variant,finished:t.finished}))};
  }
  function emitRoom(r){io.to(`baloot:${r.code}`).emit('baloot:room',roomPublic(r));if(r.hostSocket)io.to(r.hostSocket).emit('baloot:pending',[...r.pending.values()].map(p=>({id:p.id,name:p.name,avatar:p.avatar})));broadcast();}
  function broadcast(){io.emit('baloot:rooms',[...rooms.values()].filter(r=>r.status==='lobby').map(roomPublic));}
  function hostOk(socket,r,token){return r && r.hostSocket===socket.id && token===r.hostToken;}

  function tableView(r,t,playerId){
    const seat=t.seats.indexOf(playerId); const p=seat>=0?r.players.get(playerId):null;
    return {room:r.code,table:t.id,round:r.round,variant:t.variant,trump:t.trump,seat,turn:t.turn,
      leadSuit:t.leadSuit,teamScore:t.teamScore,tricks:t.tricks.map(x=>({seat:x.seat,card:x.card})),
      players:t.seats.map((id,i)=>({seat:i,name:r.players.get(id)?.name||'—',cards:t.hands.get(id)?.length||0})),
      hand:p?[...(t.hands.get(playerId)||[])]:[],finished:t.finished,winnerTeam:t.winnerTeam};
  }
  function emitTable(r,t){for(const id of t.seats){const p=r.players.get(id);if(p?.socket)io.to(p.socket).emit('baloot:table',tableView(r,t,id));}}
  function compareCards(a,b,lead,trump){
    const aTrump=trump&&a.suit===trump,bTrump=trump&&b.suit===trump;
    if(aTrump!==bTrump)return aTrump?1:-1;
    if(a.suit!==b.suit){if(a.suit===lead)return 1;if(b.suit===lead)return -1;return 0;}
    return rankValue[a.rank]-rankValue[b.rank];
  }
  function finishTable(r,t){
    t.finished=true; t.winnerTeam=t.teamScore[0]===t.teamScore[1]?null:(t.teamScore[0]>t.teamScore[1]?0:1);
    t.seats.forEach((id,seat)=>{const p=r.players.get(id);if(!p)return;if(t.winnerTeam===null)p.score=(p.score||0)+1;else if(seat%2===t.winnerTeam)p.score=(p.score||0)+3;});
    emitTable(r,t); emitRoom(r);
    if([...r.tables.values()].every(x=>x.finished)){r.status='round-result';io.to(`baloot:${r.code}`).emit('baloot:round-finished',{round:r.round,leaderboard:[...r.players.values()].sort((a,b)=>(b.score||0)-(a.score||0)).map((p,i)=>({rank:i+1,name:p.name,avatar:p.avatar,score:p.score||0}))});emitRoom(r);}
  }
  function resolveTrick(r,t){
    let best=t.tricks[0];for(const x of t.tricks.slice(1))if(compareCards(x.card,best.card,t.leadSuit,t.trump)>0)best=x;
    t.teamScore[best.seat%2]++; t.turn=best.seat; t.tricks=[]; t.leadSuit=null;
    const empty=t.seats.every(id=>(t.hands.get(id)||[]).length===0);if(empty)return finishTable(r,t);emitTable(r,t);
  }
  function buildTables(r){
    r.tables.clear();const ids=[...r.players.values()].filter(p=>p.approved).map(p=>p.id);
    const active=ids.slice(0,Math.floor(ids.length/4)*4); r.waiting=ids.slice(active.length);
    for(let i=0;i<active.length;i+=4){
      const seats=active.slice(i,i+4),deck=shuffle(makeDeck()),hands=new Map();seats.forEach((id,s)=>hands.set(id,deck.slice(s*8,s*8+8)));
      const variant=r.variant==='mixed'?(Math.random()<.5?'sun':'hokm'):r.variant;
      const t={id:`T${i/4+1}`,seats,hands,variant,trump:variant==='sun'?null:null,turn:0,leadSuit:null,tricks:[],teamScore:[0,0],finished:false,winnerTeam:null};
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
    socket.on('baloot:join-request',(d={},cb=()=>{})=>{
      const r=rooms.get(String(d.code||''));if(!r||r.status!=='lobby')return cb({ok:false,error:'المجلس غير متاح حاليًا'});
      const name=clean(d.name,28);if(!name)return cb({ok:false,error:'اكتب اسم اللاعب'});
      const id=require('crypto').randomUUID();const p={id,name,avatar:clean(d.avatar||'🂡',8),socket:socket.id,approved:false,score:0};r.pending.set(id,p);socket.data.balootPending={code:r.code,id};cb({ok:true,pending:true});emitRoom(r);
    });
    socket.on('baloot:approve',(d={},cb=()=>{})=>{
      const r=rooms.get(String(d.code||''));if(!hostOk(socket,r,d.hostToken))return cb({ok:false});const p=r.pending.get(d.playerId);if(!p)return cb({ok:false});r.pending.delete(p.id);p.approved=true;r.players.set(p.id,p);io.sockets.sockets.get(p.socket)?.join(`baloot:${r.code}`);io.to(p.socket).emit('baloot:approved',{code:r.code,playerId:p.id,room:roomPublic(r)});cb({ok:true});emitRoom(r);
    });
    socket.on('baloot:reject',(d={},cb=()=>{})=>{const r=rooms.get(String(d.code||''));if(!hostOk(socket,r,d.hostToken))return cb({ok:false});const p=r.pending.get(d.playerId);if(p)io.to(p.socket).emit('baloot:rejected');r.pending.delete(d.playerId);cb({ok:true});emitRoom(r);});
    socket.on('baloot:start',(d={},cb=()=>{})=>{
      const r=rooms.get(String(d.code||''));if(!hostOk(socket,r,d.hostToken))return cb({ok:false});if(r.players.size<4)return cb({ok:false,error:'تحتاج 4 لاعبين على الأقل'});r.round++;r.status='playing';buildTables(r);cb({ok:true,tables:r.tables.size,waiting:r.waiting.length});
      for(const t of r.tables.values()){if(t.variant==='hokm'){const chooser=r.players.get(t.seats[0]);io.to(chooser.socket).emit('baloot:choose-trump',{table:t.id,suits});}emitTable(r,t);}emitRoom(r);
    });
    socket.on('baloot:trump',(d={},cb=()=>{})=>{
      const r=rooms.get(String(d.code||'')),t=r?.tables.get(d.table);if(!r||!t||t.variant!=='hokm'||t.trump)return cb({ok:false});if(t.seats[t.turn]!==d.playerId||!suits.includes(d.suit))return cb({ok:false});t.trump=d.suit;cb({ok:true});emitTable(r,t);
    });
    socket.on('baloot:play',(d={},cb=()=>{})=>{
      const r=rooms.get(String(d.code||'')),t=r?.tables.get(d.table);if(!r||!t||t.finished)return cb({ok:false,error:'الطاولة غير متاحة'});const seat=t.seats.indexOf(d.playerId);if(seat<0||seat!==t.turn)return cb({ok:false,error:'ليس دورك'});if(t.variant==='hokm'&&!t.trump)return cb({ok:false,error:'اختر الحكم أولًا'});
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
