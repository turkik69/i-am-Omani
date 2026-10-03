const assert=require('node:assert/strict');
const Module=require('node:module');
const original=Module._load;
const sockets=new Map(),handlers={},routes={};let io;
const accounts=new Map(['host','player','other'].map(uid=>[uid,{username:uid}]));
accounts.set('host',{username:'host',xp:1000000,level:8,publicStats:{totalScore:0}});
const firestore={collection(name){return {doc(uid){return {async get(){const data=name==='users'?accounts.get(uid):null;return {exists:!!data,data:()=>data}},async update(){},async set(){}}}}}};
function express(){return {use(){},set(){},get(path,fn){routes['GET '+path]=fn},post(){},put(){},delete(){}}}
express.json=()=>()=>{};express.static=()=>()=>{};
class MockIO{constructor(){io=this;this.sockets={sockets};}on(name,fn){handlers[name]=fn}emit(){}to(id){return {emit(name,data){if(sockets.has(id))sockets.get(id).events[name]=data;}}}}
process.env.FIREBASE_API_KEY='test';process.env.FIREBASE_AUTH_DOMAIN='test';process.env.FIREBASE_PROJECT_ID='test';process.env.FIREBASE_APP_ID='test';process.env.FIREBASE_SERVICE_ACCOUNT_JSON=JSON.stringify({type:'service_account',project_id:'test'});
Module._load=function(name,parent,main){
  if(name==='express')return express;
  if(name==='http')return {createServer:()=>({listen(){}})};
  if(name==='socket.io')return {Server:MockIO};
  if(name==='firebase-admin/app')return {initializeApp:()=>({}),cert:()=>({})};
  if(name==='firebase-admin/auth')return {getAuth:()=>({verifyIdToken:async token=>{if(!accounts.has(token))throw Error('bad token');return {uid:token,email_verified:true}}})};
  if(name==='firebase-admin/firestore')return {getFirestore:()=>firestore,FieldValue:{increment:n=>n,delete:()=>null}};
  return original.apply(this,arguments);
};
try{require('./server.js')}finally{Module._load=original}
function client(){const id='s'+(sockets.size+1),s={id,data:{},events:{},handlers:{},join(){},emit(name,data){this.events[name]=data},on(name,fn){this.handlers[name]=fn}};sockets.set(id,s);handlers.connection(s);s.send=(name,data={})=>new Promise(resolve=>s.handlers[name](data,resolve));return s;}
(async()=>{
  const host=client(),player=client(),attacker=client();
  const room=await host.send('host:create',{idToken:'host',wilayat:'مسقط',village:'السيب'});assert(room.ok,JSON.stringify(room));
  assert.equal((await attacker.send('host:reconnect',{code:room.code,hostToken:room.hostToken,idToken:'other'})).ok,false);
  assert.equal((await attacker.send('host:reconnect',{code:room.code,hostToken:room.hostToken,idToken:'host'})).ok,true);
  const join=await player.send('player:requestJoin',{code:room.code,idToken:'player'});assert(join.ok);
  const approved=await attacker.send('host:approveJoin',{requestId:join.requestId});assert(approved.ok);
  const token=player.events['join:approved'].reconnectToken;
  assert.equal((await host.send('player:reconnect',{code:room.code,reconnectToken:token,idToken:'other'})).ok,false);
  assert.equal((await host.send('player:reconnect',{code:room.code,reconnectToken:token,idToken:'player'})).ok,true);
  let publicProfile;await routes['GET /api/profile/me']({get:()=> 'Bearer host'},
    {set(){},json(data){publicProfile=data},status(){return this}});
  assert.equal(publicProfile.xp,0);assert.equal(publicProfile.level,1);
  console.log('Quiz room reconnect bound to original account');
})().catch(error=>{console.error(error);process.exitCode=1});
