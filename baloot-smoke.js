const assert=require('node:assert/strict');
const register=require('./baloot-server');
global.__IAM_OMANI_VERIFY_ACCOUNT__=async token=>{
  if(!token)throw Error('سجل الدخول أولًا');
  return {uid:token,data:{username:token}};
};
const sockets=new Map();const io={handlers:{},sockets:{sockets},on(n,f){this.handlers[n]=f},emit(){},to(id){return {emit(n,d){if(id.startsWith('baloot:'))for(const s of sockets.values()){if(s.rooms.has(id))s.events[n]=d;}else if(sockets.has(id))sockets.get(id).events[n]=d;}}}};
register(io);
function client(){const id=`b${sockets.size+1}`,s={id,handlers:{},events:{},rooms:new Set(),data:{},join(room){this.rooms.add(room)},on(n,f){this.handlers[n]=f}};sockets.set(id,s);io.handlers.connection(s);s.send=(n,d={})=>new Promise(resolve=>s.handlers[n](d,resolve));return s;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function game(variant){
  const host=client(),players=Array.from({length:4},client);
  assert.equal((await host.send('baloot:create',{variant})).ok,false);
  const created=await host.send('baloot:create',{variant,idToken:'host-'+variant});assert(created.ok);
  for(let i=0;i<4;i++){const p=players[i],request=await p.send('baloot:join-request',{code:created.code,idToken:'player-'+variant+'-'+i});assert(request.ok);const pending=host.events['baloot:pending'];assert((await host.send('baloot:approve',{code:created.code,hostToken:created.hostToken,playerId:pending.at(-1).id})).ok);}
  const replacement=client(),approval=players[0].events['baloot:approved'],token=approval.reconnectToken;
  assert.equal((await replacement.send('baloot:reconnect',{code:created.code,reconnectToken:token,idToken:'wrong-user'})).ok,false);
  assert.equal((await replacement.send('baloot:reconnect',{code:created.code,reconnectToken:token,idToken:'player-'+variant+'-0'})).ok,true);
  replacement.events['baloot:approved']=approval;players[0]=replacement;
  assert((await host.send('baloot:start',{code:created.code,hostToken:created.hostToken})).ok);
  let t=players[0].events['baloot:table'];assert.equal(t.stage,'bidding');assert.equal(t.hand.length,5);
  let bidder=t.turn;const ids=players.map(p=>p.events['baloot:approved'].playerId);
  const firstBid=await players[bidder].send('baloot:bid',{code:created.code,table:t.table,playerId:ids[bidder],choice:variant==='sun'?'sun':'hokm'});assert(firstBid.ok,JSON.stringify({variant,bidder,firstBid}));
  if(variant==='hokm')for(let j=0;j<3;j++){t=players[0].events['baloot:table'];bidder=t.turn;assert((await players[bidder].send('baloot:bid',{code:created.code,table:t.table,playerId:ids[bidder],choice:'pass'})).ok);}
  t=players[0].events['baloot:table'];assert.equal(t.stage,'playing');assert.equal(t.hand.length,8);
  for(let i=0;i<32;i++){
    t=players[0].events['baloot:table'];const seat=t.turn,p=players[seat],mine=p.events['baloot:table'];
    const playable=mine.hand.find(c=>!mine.leadSuit||c.suit===mine.leadSuit)||mine.hand[0];
    assert((await p.send('baloot:play',{code:created.code,table:t.table,playerId:ids[seat],cardId:playable.id})).ok);
    if(i%4===3)await sleep(680);
  }
  t=players[0].events['baloot:table'];assert(t.finished);assert.equal(t.teamScore[0]+t.teamScore[1],variant==='sun'?130:162);
}
(async()=>{await game('sun');await game('hokm');console.log('Baloot purchase, trick order, and raw points passed');})().catch(e=>{console.error(e);process.exitCode=1});
