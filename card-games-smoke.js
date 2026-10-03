const assert=require('node:assert/strict');
const register=require('./card-games-server');
global.__IAM_OMANI_VERIFY_ACCOUNT__=async token=>{
  if(!token)throw Error('سجل الدخول أولًا');
  return {uid:token,data:{username:token}};
};
const sockets=new Map();
const io={handlers:{},on(name,fn){this.handlers[name]=fn},to(id){return {emit(event,data){const s=sockets.get(id);if(s)s.events[event]=data}}}};
register(io);
function client(){const id=`s${sockets.size+1}`,s={id,handlers:{},events:{},on(name,fn){this.handlers[name]=fn}};sockets.set(id,s);io.handlers.connection(s);s.send=(name,data={})=>new Promise(resolve=>s.handlers[name](data,resolve));return s;}
async function main(){
  const h1=client(),h2=client();let a=await h1.send('cards:create',{mode:'hand',idToken:'hand-host'}),b=await h2.send('cards:join',{code:a.code,idToken:'hand-player'});
  assert(a.ok&&b.ok);assert.equal(h1.events['cards:state'].status,'lobby');assert.equal(h2.events['cards:state'].players.length,2);assert((await h1.send('cards:start',{...a})).ok);
  let s=h1.events['cards:state'];assert.equal(s.hand.length,15);assert.equal(h2.events['cards:state'].hand.length,14);
  assert((await h1.send('cards:discard',{...a,cardId:s.hand[0].id})).ok);
  assert.equal(h2.events['cards:state'].stage,'draw');assert((await h2.send('cards:draw',{...b,from:'stock'})).ok);
  assert.equal(h2.events['cards:state'].hand.length,15);
  const m=await h2.send('cards:meld',{...b,groups:[[h2.events['cards:state'].hand[0].id]]});assert.equal(m.ok,false);
  const replacement=client();
  assert.equal((await replacement.send('cards:reconnect',{...b,idToken:'wrong-user'})).ok,false);
  assert.equal((await replacement.send('cards:reconnect',{...b,idToken:'hand-player'})).ok,true);
  const players=Array.from({length:6},client),sessions=[];
  a=await players[0].send('cards:create',{mode:'sixtyone',idToken:'six-0',required:6});sessions.push(a);
  for(let i=1;i<6;i++)sessions.push(await players[i].send('cards:join',{code:a.code,idToken:'six-'+i}));
  assert((await players[0].send('cards:start',{...a})).ok);
  for(let n=0;n<36;n++){
    s=players[0].events['cards:state'];assert.equal(s.status,'playing');const active=players[s.turn],pstate=active.events['cards:state'];
    assert((await active.send('cards:play',{...sessions[s.turn],cardId:pstate.hand[0].id})).ok);
  }
  s=players[0].events['cards:state'];assert(['round-end','finished'].includes(s.status));assert.equal(s.teamMoney[0]+s.teamMoney[1],8);
  assert.equal(s.teamSecondary[0]+s.teamSecondary[1],40);
  const four=Array.from({length:4},client),tokens=[];
  const first=await four[0].send('cards:create',{mode:'sixtyone',idToken:'four-0',required:4});tokens.push(first);
  for(let i=1;i<4;i++)tokens.push(await four[i].send('cards:join',{code:first.code,idToken:'four-'+i}));
  assert((await four[0].send('cards:start',{...first})).ok);
  for(let n=0;n<36;n++){
    const table=four[0].events['cards:state'];const who=four[table.turn];
    assert((await who.send('cards:play',{...tokens[table.turn],cardId:who.events['cards:state'].hand[0].id})).ok);
  }
  const finished=four[0].events['cards:state'];assert.notEqual(finished.status,'playing');assert.equal(finished.teamMoney[0]+finished.teamMoney[1],8);
  console.log('Hand and 61 room, turn, draw, and complete-trick smoke checks passed');
}
main().catch(e=>{console.error(e);process.exitCode=1});
