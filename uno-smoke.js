const assert=require('node:assert/strict');
const register=require('./uno-server');
global.__IAM_OMANI_VERIFY_ACCOUNT__=async token=>{
  if(!token)throw Error('سجل الدخول أولًا');
  return {uid:token,data:{username:token}};
};
const sockets=new Map();
const io={handlers:{},on(name,fn){this.handlers[name]=fn},to(id){return {emit(event,data){sockets.get(id).events[event]=data}}}};
register(io);
function client(){
  const id='u'+(sockets.size+1),s={id,handlers:{},events:{},rooms:new Set(),join(room){this.rooms.add(room)},on(name,fn){this.handlers[name]=fn}};
  sockets.set(id,s);io.handlers.connection(s);s.send=(name,data={})=>new Promise(resolve=>s.handlers[name](data,resolve));
  return s;
}
(async()=>{
  const host=client(),guest=client();
  assert.equal((await host.send('uno:create')).ok,false);
  const h=await host.send('uno:create',{idToken:'host'}),g=await guest.send('uno:join',{code:h.code,idToken:'guest'});
  assert(h.ok&&g.ok);
  assert.equal((await guest.send('uno:start',{...g})).ok,false);
  assert((await host.send('uno:start',{...h})).ok);
  const state=host.events['uno:state'];
  assert.equal(state.status,'playing');assert.equal(state.players.length,2);assert.equal(state.hand.length,7);
  const newcomer=client();
  assert.equal((await newcomer.send('uno:reconnect',{...g,idToken:'host'})).ok,false);
  assert.equal((await newcomer.send('uno:reconnect',{...g,idToken:'guest'})).ok,true);
  assert.equal(newcomer.events['uno:state'].hand.length,guest.events['uno:state'].hand.length);
  console.log('UNO auth, room, deal, and account-bound reconnect passed');
})().catch(e=>{console.error(e);process.exitCode=1});
