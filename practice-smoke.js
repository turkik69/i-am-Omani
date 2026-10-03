const assert=require('node:assert/strict');
const nativeTimeout=global.setTimeout;
global.setTimeout=(fn,ms,...args)=>nativeTimeout(fn,ms===650?2:ms,...args);
global.__IAM_OMANI_VERIFY_ACCOUNT__=async token=>({uid:token,data:{username:token}});
const wait=ms=>new Promise(resolve=>nativeTimeout(resolve,ms));
function harness(register,kind){
  const sockets=new Map(),io={handlers:{},sockets:{sockets},on(n,f){this.handlers[n]=f},emit(){},to(id){return {emit(n,d){if(id.startsWith('baloot:')){for(const s of sockets.values())if(s.rooms.has(id))s.events[n]=d;}else if(sockets.has(id))sockets.get(id).events[n]=d;}}}};
  register(io);
  const client=()=>{const id=kind+(sockets.size+1),s={id,handlers:{},events:{},data:{},rooms:new Set(),join(room){this.rooms.add(room)},on(n,f){this.handlers[n]=f}};sockets.set(id,s);io.handlers.connection(s);s.send=(n,d={})=>new Promise(resolve=>s.handlers[n](d,resolve));return s;};
  return client();
}
async function until(fn,max=200){for(let i=0;i<max;i++){const result=await fn();if(result)return result;await wait(5)}throw Error('Practice game stalled')}
async function uno(){const h=harness(require('./uno-server'),'u'),a=await h.send('uno:create',{idToken:'uno'});assert((await h.send('uno:practice',a)).ok);
  await until(async()=>{let s=h.events['uno:state'];if(s.status!=='playing')return s;if(s.pending?.target===s.selfId){assert((await h.send('uno:penalty',{...a,challenge:false})).ok);return false}
    if(s.pending)return false;
    if(s.players[s.turn].id!==s.selfId)return false;
    const legal=s.hand.filter(c=>c.color==='wild'||c.color===s.color||c.value===s.top.value).filter(c=>!s.drawnId||c.id===s.drawnId);
    if(legal.length){const c=legal[0];assert((await h.send('uno:play',{...a,cardId:c.id,color:c.color==='wild'?'red':undefined,uno:true})).ok)}else if(s.drawnId)assert((await h.send('uno:keep',a)).ok);else assert((await h.send('uno:draw',a)).ok);return false},800);
  assert(h.events['uno:state'].practice);console.log('UNO practice completed');}
async function baloot(){const h=harness(require('./baloot-server'),'b'),a=await h.send('baloot:create',{idToken:'baloot'});assert((await h.send('baloot:practice',{code:a.code,hostToken:a.hostToken})).ok);
  await until(async()=>{const t=h.events['baloot:table'];if(!t)return false;if(t.finished)return t;
    if(t.turn!==t.seat)return false;
    if(t.stage==='bidding'){assert((await h.send('baloot:bid',{code:a.code,table:t.table,playerId:h.events['baloot:room'].players[0].id,choice:'sun'})).ok);return false}
    const c=t.hand.find(c=>!t.leadSuit||c.suit===t.leadSuit)||t.hand[0];
    assert((await h.send('baloot:play',{code:a.code,table:t.table,playerId:h.events['baloot:room'].players[0].id,cardId:c.id})).ok);return false},800);
  assert(h.events['baloot:room'].practice);console.log('Baloot practice completed');}
async function sixty(){const h=harness(require('./card-games-server'),'c'),a=await h.send('cards:create',{mode:'sixtyone',required:4,idToken:'sixty'});assert((await h.send('cards:practice',a)).ok);
  await until(async()=>{const s=h.events['cards:state'];if(s.status!=='playing')return s;if(s.players[s.turn].id!==s.selfId)return false;
    assert((await h.send('cards:play',{...a,cardId:s.hand[0].id})).ok);return false},800);
  assert(h.events['cards:state'].practice);console.log('61 practice completed');}
async function hand(){const h=harness(require('./card-games-server'),'h'),a=await h.send('cards:create',{mode:'hand',idToken:'hand'});assert((await h.send('cards:practice',a)).ok);
  await until(async()=>{const s=h.events['cards:state'];if(s.status!=='playing')return s;if(s.players[s.turn].id!==s.selfId)return false;
    if(s.stage==='draw')assert((await h.send('cards:draw',{...a,from:'stock'})).ok);
    else assert((await h.send('cards:discard',{...a,cardId:s.hand[0].id})).ok);return false},800);
  assert(h.events['cards:state'].practice);console.log('Hand practice completed');}
(async()=>{await uno();await baloot();await sixty();await hand()})().catch(e=>{console.error(e);process.exitCode=1});
