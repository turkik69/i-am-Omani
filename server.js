const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const { Server } = require('socket.io');
const admin = require('firebase-admin');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { transports: ['websocket', 'polling'] });

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Public web configuration is served to the browser. Admin credentials stay on Render.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  appId: process.env.FIREBASE_APP_ID
};
let firebaseAdmin = null;
try {
  const secretsDir = '/etc/secrets';
  const secretNames = fs.existsSync(secretsDir) ? fs.readdirSync(secretsDir) : [];
  const preferred = ['firebase-service-account.json', ...secretNames];
  let serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    : null;
  if (!serviceAccount) {
    for (const name of new Set(preferred)) {
      const candidate = `${secretsDir}/${name}`;
      if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) continue;
      try {
        const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8').replace(/^\uFEFF/, ''));
        if (parsed.type === 'service_account' && parsed.project_id === firebaseConfig.projectId) {
          serviceAccount = parsed;
          break;
        }
      } catch { /* Another secret file is not a Firebase service account. */ }
    }
  }
  if (serviceAccount) {
    if (serviceAccount.type !== 'service_account' || serviceAccount.project_id !== firebaseConfig.projectId) {
      throw new Error('Firebase service account does not match the configured project');
    }
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    console.warn(`Firebase Admin credentials not found (${secretNames.length} secret file(s) mounted)`);
  }
} catch (error) { console.error('Firebase Admin initialization failed:', error.message); }

app.get('/api/firebase-config', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  if (Object.values(firebaseConfig).some(v => !v)) return res.status(503).json({ configured: false });
  res.json(firebaseConfig);
});

const loginAttempts = new Map();
app.post('/api/auth/username-login', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!firebaseAdmin || !firebaseConfig.apiKey) return res.status(503).json({ error: 'خدمة الحسابات غير متاحة حاليًا' });
  const ip = req.ip || req.socket.remoteAddress;
  const now = Date.now();
  const attempts = (loginAttempts.get(ip) || []).filter(t => now - t < 15 * 60 * 1000);
  attempts.push(now);
  loginAttempts.set(ip, attempts);
  if (attempts.length > 15) return res.status(429).json({ error: 'محاولات كثيرة. حاول بعد قليل.' });
  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = req.body?.password;
  if (!/^[a-z0-9_]{3,24}$/.test(username) || typeof password !== 'string' || !password || password.length > 1024)
    return res.status(400).json({ error: 'بيانات الدخول غير صحيحة' });
  try {
    const nameDoc = await admin.firestore().collection('usernames').doc(username).get();
    if (!nameDoc.exists) throw new Error('Unknown username');
    const account = await admin.auth().getUser(nameDoc.data().uid);
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(firebaseConfig.apiKey)}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: account.email, password, returnSecureToken: true })
    });
    if (!response.ok) throw new Error('Invalid password');
    const tokens = await response.json();
    if (tokens.localId !== account.uid) throw new Error('UID mismatch');
    res.json({ token: await admin.auth().createCustomToken(account.uid) });
  } catch (error) {
    console.warn('Username login failed:', error.message);
    res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  }
});
setInterval(() => {
  const cutoff = Date.now() - 15 * 60 * 1000;
  for (const [ip, times] of loginAttempts) {
    const recent = times.filter(time => time > cutoff);
    if (recent.length) loginAttempts.set(ip, recent);
    else loginAttempts.delete(ip);
  }
}, 15 * 60 * 1000).unref();

const DATA_DIR = path.join(__dirname, 'data');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadStats() {
  try { return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')); }
  catch { return { players: {}, games: [] }; }
}
let persistent = loadStats();
function saveStats() {
  try { fs.writeFileSync(STATS_FILE, JSON.stringify(persistent, null, 2)); }
  catch (e) { console.error('stats save failed', e.message); }
}

const DEFAULT_QUESTIONS = [
  { id: 1, question: 'كم عدد محافظات سلطنة عُمان؟', options: ['9','10','11','12'], correct: 2, category: 'عُمان', difficulty: 'متوسط', time: 15 },
  { id: 2, question: 'ما أكبر دولة في العالم من حيث المساحة؟', options: ['كندا','الصين','روسيا','الولايات المتحدة'], correct: 2, category: 'جغرافيا', difficulty: 'سهل', time: 15 },
  { id: 3, question: 'ما الكوكب المعروف بالكوكب الأحمر؟', options: ['الزهرة','المريخ','عطارد','المشتري'], correct: 1, category: 'علوم', difficulty: 'سهل', time: 12 },
  { id: 4, question: 'من كتب رواية الحرب والسلام؟', options: ['تولستوي','دوستويفسكي','تشيخوف','بوشكين'], correct: 0, category: 'أدب', difficulty: 'متوسط', time: 15 },
  { id: 5, question: 'في أي عام سقط جدار برلين؟', options: ['1987','1988','1989','1990'], correct: 2, category: 'تاريخ', difficulty: 'متوسط', time: 15 },
  { id: 6, question: 'ما أكبر حيوان حي على الأرض؟', options: ['الفيل','الحوت الأزرق','الزرافة','فرس النهر'], correct: 1, category: 'طبيعة', difficulty: 'سهل', time: 12 }
];

const OMAN_LOCATIONS = require('./config/oman-locations.json');

const rooms = new Map();
const roomCode = () => String(Math.floor(100000 + Math.random() * 900000));
const clean = (v='', max=180) => String(v).trim().replace(/[<>]/g,'').slice(0, max);
const sanitizeName = v => clean(v, 28);

function findLocation(wilayat, village) {
  const w = clean(wilayat, 40);
  const v = clean(village, 50);
  const entry = OMAN_LOCATIONS.find(x => x.wilayat === w);
  if (!entry || !v) return null;
  return { governorate: entry.governorate, wilayat: entry.wilayat, village: v };
}

async function verifiedAccount(token) {
  if (!firebaseAdmin || typeof token !== 'string' || !token) throw new Error('سجل الدخول أولًا');
  const identity = await admin.auth().verifyIdToken(token);
  if (!identity.email_verified) throw new Error('أكد بريدك الإلكتروني أولًا');
  const ref = admin.firestore().collection('users').doc(identity.uid);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('الملف الشخصي غير موجود');
  return { uid: identity.uid, ref, data: snap.data() };
}
global.__IAM_OMANI_VERIFY_ACCOUNT__ = verifiedAccount;
function publicAccount(uid, data) {
  const stats = data.publicStats || {};
  const categories = stats.categories || {};
  const strengths = Object.entries(categories)
    .sort((a,b) => (b[1].correct || 0) - (a[1].correct || 0))
    .slice(0, 5).map(([name, value]) => ({name, correct:value.correct || 0, answered:value.answered || 0}));
  return { uid, username:data.username, nickname:data.nickname || '', name:data.nickname || data.username,
    avatar:data.avatar || 'OM1', hasPhoto:!!data.photoData,
    level:Math.max(1,Number(data.level)||1), xp:Math.max(0,Number(data.xp)||0),
    stats:{games:stats.games||0,wins:stats.wins||0,correct:stats.correct||0,
      totalScore:stats.totalScore||0,bestScore:stats.bestScore||0,lastPlayedAt:stats.lastPlayedAt||null}, strengths };
}
const authToken = req => (req.get('authorization') || '').replace(/^Bearer\s+/i,'');
app.get('/api/profile/me', async (req,res) => {
  res.set('Cache-Control','no-store');
  try { const a=await verifiedAccount(authToken(req));res.json({...publicAccount(a.uid,a.data),photoData:a.data.photoData||null}); }
  catch(e){res.status(401).json({error:e.message});}
});
app.put('/api/profile/me', async (req,res) => {
  res.set('Cache-Control','no-store');
  try {
    const a=await verifiedAccount(authToken(req));
    const nickname=clean(req.body?.nickname,28).replace(/[\x00-\x1f]/g,'').trim();
    if(nickname && nickname.length<2) return res.status(400).json({error:'اللقب من حرفين إلى 28 حرفًا'});
    const patch={nickname};
    if(req.body?.photoData !== undefined) {
      const photo=req.body.photoData;
      if(photo!==null && (typeof photo!=='string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo) || photo.length>180000))
        return res.status(400).json({error:'الصورة غير مدعومة أو كبيرة جدًا'});
      patch.photoData=photo;
    }
    await a.ref.set(patch,{merge:true});
    res.json({...publicAccount(a.uid,{...a.data,...patch}),photoData:patch.photoData===undefined?a.data.photoData||null:patch.photoData});
  } catch(e){res.status(401).json({error:e.message});}
});
app.get('/api/profile/:uid/photo', async (req,res) => {
  try {
    const snap=await admin.firestore().collection('users').doc(req.params.uid).get();
    const match=snap.data()?.photoData?.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if(!match) return res.sendStatus(404);
    res.set('Cache-Control','public,max-age=300');
    res.type('image/'+match[1]).send(Buffer.from(match[2],'base64'));
  } catch {res.sendStatus(404);}
});
app.get('/api/profile/:uid', async (req,res) => {
  res.set('Cache-Control','no-store');
  if(!firebaseAdmin || !/^[A-Za-z0-9_-]{10,128}$/.test(req.params.uid)) return res.sendStatus(404);
  try { const snap=await admin.firestore().collection('users').doc(req.params.uid).get();
    if(!snap.exists)return res.sendStatus(404);
    res.json(publicAccount(req.params.uid,snap.data()));
  } catch {res.sendStatus(503);}
});

function locationKey(location) {
  return `${location?.wilayat || ''}:${location?.village || ''}`;
}

function formatRoomIdentity(location) {
  return `مجلس ${location.village} – ساحة ${location.wilayat}`;
}

function publicRoom(room) {
  return {
    code: room.code,
    title: room.title,
    roomIdentity: room.roomIdentity,
    wilayat: room.location?.wilayat || null,
    village: room.location?.village || null,
    status: room.status,
    currentQuestionIndex: room.currentQuestionIndex,
    totalQuestions: room.questions.length,
    players: [...room.players.values()].map(p => ({id:p.id,uid:p.uid,name:p.name,avatar:p.avatar,hasPhoto:p.hasPhoto,score:p.score,correct:p.correct,answered:p.answered,lastPoints:p.lastPoints})),
    pendingCount: room.pending.size,
    leaderboard: [...room.players.values()].sort((a,b)=>b.score-a.score).map((p,i)=>({id:p.id,uid:p.uid,name:p.name,avatar:p.avatar,hasPhoto:p.hasPhoto,score:p.score,correct:p.correct,rank:i+1}))
  };
}

function pendingList(room) {
  return [...room.pending.values()].map(r => ({
    id:r.id, uid:r.uid, name:r.name, avatar:r.avatar, hasPhoto:r.hasPhoto, requestedAt:r.requestedAt
  }));
}

function activeCouncils() {
  return [...rooms.values()]
    .filter(r => r.status === 'lobby')
    .map(r => ({
      code:r.code,
      title:r.title,
      roomIdentity:r.roomIdentity,
      wilayat:r.location.wilayat,
      village:r.location.village,
      players:r.players.size,
      pending:r.pending.size
    }))
    .sort((a,b) => b.players - a.players || b.pending - a.pending || a.roomIdentity.localeCompare(b.roomIdentity,'ar'));
}

function broadcastCouncils() { io.emit('councils:update', activeCouncils()); }
function activityRanking(){
  const groups={governorates:new Map(),wilayats:new Map(),villages:new Map()};
  for(const room of rooms.values()){
    if(room.status==='finished')continue;
    const n=room.players.size,loc=room.location;
    for(const [map,label] of [[groups.governorates,loc.governorate],[groups.wilayats,loc.wilayat],[groups.villages,loc.village]]){
      const item=map.get(label)||{name:label,players:0,rooms:0};
      item.players+=n;item.rooms++;map.set(label,item);
    }
  }
  return Object.fromEntries(Object.entries(groups).map(([kind,map])=>[kind,[...map.values()].sort((a,b)=>b.players-a.players||b.rooms-a.rooms||a.name.localeCompare(b.name,'ar')).slice(0,10)]));
}
function emitRoom(room) {
  io.to(room.code).emit('room:update', publicRoom(room));
  if (room.hostSocketId) io.to(room.hostSocketId).emit('host:pending', pendingList(room));
  broadcastCouncils();
  io.emit('activity:update',activityRanking());
}
function getRoom(code) { return rooms.get(String(code || '').trim()); }
function isHost(socket, room) { return room && room.hostSocketId === socket.id; }

function scoreAnswer(elapsedMs, limitMs, rank) {
  const speed = Math.max(0, 1 - elapsedMs / limitMs);
  return Math.round(500 + speed * 500 + Math.max(0, 150 - rank * 50));
}

function sendQuestion(room) {
  if (!room || room.currentQuestionIndex >= room.questions.length) return finishQuiz(room);
  clearTimeout(room.timer);
  clearTimeout(room.resultTimer);
  room.answers.clear();
  room.lastResult = null;
  room.status = 'question';
  room.startedAt = Date.now();
  const q = room.questions[room.currentQuestionIndex];
  for (const p of room.players.values()) { p.answered = false; p.lastPoints = 0; }
  io.to(room.code).emit('quiz:question', {
    number: room.currentQuestionIndex + 1,
    total: room.questions.length,
    question: q.question,
    options: q.options,
    category: q.category,
    difficulty: q.difficulty,
    timeLimit: q.time * 1000,
    startedAt: room.startedAt
  });
  emitRoom(room);
  room.timer = setTimeout(() => revealAnswer(room), q.time * 1000);
}
function restoreQuizState(socket,room){
  if(room.status==='question'){
    const q=room.questions[room.currentQuestionIndex];
    socket.emit('quiz:question',{number:room.currentQuestionIndex+1,total:room.questions.length,question:q.question,options:q.options,category:q.category,difficulty:q.difficulty,timeLimit:q.time*1000,startedAt:room.startedAt,alreadyAnswered:room.players.get(socket.id)?.answered||false});
    socket.emit('quiz:progress',{answered:room.answers.size,total:room.players.size});
  }else if(room.status==='result'&&room.lastResult)socket.emit('quiz:result',room.lastResult);
  else if(room.status==='finished')socket.emit('quiz:finished',publicRoom(room).leaderboard);
}

function revealAnswer(room) {
  if (!room || room.status !== 'question') return;
  clearTimeout(room.timer);
  const q = room.questions[room.currentQuestionIndex];
  const correct = [...room.answers.entries()]
    .filter(([,a]) => a.answer === q.correct)
    .sort((a,b)=>a[1].elapsed-b[1].elapsed);

  correct.forEach(([id,a], rank) => {
    const p = room.players.get(id); if (!p) return;
    const pts = scoreAnswer(a.elapsed, q.time * 1000, rank);
    p.score += pts; p.correct += 1; p.lastPoints = pts;
  });
  for(const [id,p] of room.players) {
    const item=p.categories[q.category]||(p.categories[q.category]={answered:0,correct:0});
    if(room.answers.has(id)){item.answered++;if(room.answers.get(id).answer===q.correct)item.correct++;}
  }

  room.status = 'result';
  const podium = correct.map(([id,a],rank)=>{
    const p=room.players.get(id);
    return p ? {rank:rank+1,uid:p.uid,name:p.name,avatar:p.avatar,hasPhoto:p.hasPhoto,points:p.lastPoints,time:(a.elapsed/1000).toFixed(2)} : null;
  }).filter(Boolean);

  room.lastResult = {
    correctIndex:q.correct,
    correctText:q.options[q.correct],
    podium,
    leaderboard:publicRoom(room).leaderboard,
    nextAt:Date.now()+8000
  };
  io.to(room.code).emit('quiz:result', room.lastResult);
  emitRoom(room);
  room.resultTimer = setTimeout(() => advanceQuestion(room), 8000);
}

function advanceQuestion(room) {
  if (!room || room.status !== 'result') return false;
  clearTimeout(room.resultTimer);
  room.resultTimer = null;
  room.currentQuestionIndex++;
  sendQuestion(room);
  return true;
}

function finishQuiz(room) {
  if (!room) return;
  clearTimeout(room.timer);
  clearTimeout(room.resultTimer);
  room.resultTimer = null;
  const board = publicRoom(room).leaderboard;
  if (room.status === 'finished' && room.persisted) {
    io.to(room.code).emit('quiz:finished', board);
    return;
  }
  room.status = 'finished';

  if (!room.persisted) {
    const now = new Date().toISOString();
    board.forEach(p => {
      const key = p.uid||p.name.toLowerCase();
      const s = persistent.players[key] || { name:p.name, avatar:p.avatar, games:0, wins:0, totalScore:0, bestScore:0, correct:0 };
      s.uid=p.uid;s.name=p.name; s.avatar=p.avatar; s.games++; s.totalScore+=p.score; s.bestScore=Math.max(s.bestScore,p.score); s.correct+=p.correct; if(p.rank===1)s.wins++;
      persistent.players[key]=s;
      if(firebaseAdmin&&p.uid){
        const categories=room.players.get(p.id)?.categories||{};
        const increments={};
        for(const [category,value] of Object.entries(categories)){
          const safeCategory=category.replace(/[.\[\]*/]/g,'_').slice(0,30);
          increments[`publicStats.categories.${safeCategory}.answered`]=admin.firestore.FieldValue.increment(value.answered);
          increments[`publicStats.categories.${safeCategory}.correct`]=admin.firestore.FieldValue.increment(value.correct);
        }
        admin.firestore().collection('users').doc(p.uid).update({
          'publicStats.games':admin.firestore.FieldValue.increment(1),
          'publicStats.wins':admin.firestore.FieldValue.increment(p.rank===1?1:0),
          'publicStats.correct':admin.firestore.FieldValue.increment(p.correct),
          'publicStats.totalScore':admin.firestore.FieldValue.increment(p.score),
          'publicStats.bestScore':admin.firestore.FieldValue.increment(0),
          'publicStats.lastPlayedAt':now,
          ...increments
        }).then(async()=>{if(p.score)await admin.firestore().runTransaction(async tx=>{
          const ref=admin.firestore().collection('users').doc(p.uid),snap=await tx.get(ref);
          tx.update(ref,{'publicStats.bestScore':Math.max(p.score,snap.data()?.publicStats?.bestScore||0)});
        })}).catch(e=>console.error('Stats save failed:',e.message));
      }
    });
    persistent.games.unshift({
      id:randomUUID(), room:room.code, title:room.title, roomIdentity:room.roomIdentity,
      wilayat:room.location?.wilayat || null, village:room.location?.village || null,
      date:now, players:board.length, winner:board[0]?.name || null
    });
    persistent.games = persistent.games.slice(0,100);
    room.persisted = true;
    saveStats();
  }

  io.to(room.code).emit('quiz:finished', board);
  emitRoom(room);
}

function rejectAllPending(room, message='بدأت المسابقة قبل قبول الطلب') {
  for (const req of room.pending.values()) io.to(req.socketId).emit('join:rejected', { message });
  room.pending.clear();
}

async function requestJoin(socket, payload={}, ack=()=>{}) {
  const room=getRoom(payload.code);
  if(!room) return ack({ok:false,error:'المجلس غير موجود أو لم يعد متاحًا'});
  if(room.status!=='lobby') return ack({ok:false,error:'بدأت المسابقة بالفعل، اختر مجلسًا آخر'});
  let account;
  try{account=await verifiedAccount(payload.idToken);}
  catch(e){return ack({ok:false,error:e.message});}
  const name=sanitizeName(account.data.nickname||account.data.username);
  if(!name)return ack({ok:false,error:'أكمل ملفك الشخصي أولًا'});
  const duplicatePlayer=[...room.players.values()].some(p=>p.uid===account.uid);
  const duplicatePending=[...room.pending.values()].some(p=>p.uid===account.uid);
  if(duplicatePlayer||duplicatePending) return ack({ok:false,error:'طلبك موجود في المجلس'});
  if(socket.data.pendingRoomCode) return ack({ok:false,error:'لديك طلب انضمام قيد الانتظار بالفعل'});

  const req={
    id:randomUUID(), socketId:socket.id,uid:account.uid,name,
    avatar:clean(account.data.avatar||payload.avatar||'OM1',8),hasPhoto:!!account.data.photoData,requestedAt:Date.now()
  };
  room.pending.set(req.id,req);
  socket.data.pendingRoomCode=room.code;
  socket.data.pendingRequestId=req.id;
  ack({ok:true,pending:true,requestId:req.id,room:{code:room.code,roomIdentity:room.roomIdentity,title:room.title}});
  if(room.hostSocketId) io.to(room.hostSocketId).emit('host:pending',pendingList(room));
  broadcastCouncils();
}

io.on('connection', socket => {
  socket.emit('councils:update', activeCouncils());
  socket.emit('activity:update',activityRanking());

  socket.on('councils:list', (ack=()=>{}) => ack({ok:true,councils:activeCouncils()}));

  socket.on('host:create', (payload={}, ack=()=>{}) => {
    let code; do { code = roomCode(); } while (rooms.has(code));
    const customTitle = sanitizeName(payload.title);
    const location = findLocation(payload.wilayat, payload.village);
    if(!location) return ack({ok:false,error:'اختر الولاية واكتب اسم المجلس أو القرية'});
    const busy=[...rooms.values()].some(r=>r.status!=='finished'&&locationKey(r.location)===locationKey(location));
    if(busy) return ack({ok:false,error:'هذا المجلس لديه مسابقة نشطة الآن، اختر مجلسًا آخر'});

    const roomIdentity = formatRoomIdentity(location);
    const title = customTitle ? `${roomIdentity} | ${customTitle}` : roomIdentity;
    const hostToken = randomUUID();
    const room = {
      code, title, roomIdentity, location, hostToken, hostSocketId:socket.id,
      status:'lobby', questions:DEFAULT_QUESTIONS.map(q=>({...q, options:[...q.options]})),
      currentQuestionIndex:0, players:new Map(), pending:new Map(), answers:new Map(), timer:null, resultTimer:null,
      startedAt:null, persisted:false
    };
    rooms.set(code, room); socket.join(code); socket.data.roomCode=code; socket.data.role='host';
    ack({ok:true, code, hostToken, room:publicRoom(room)}); emitRoom(room);
  });

  socket.on('host:reconnect', ({code,hostToken}={}, ack=()=>{}) => {
    const room=getRoom(code);
    if(!room || room.hostToken!==hostToken) return ack({ok:false,error:'تعذر استعادة جلسة المضيف'});
    clearTimeout(room.hostDisconnectTimer);
    room.hostDisconnectTimer=null;
    room.hostSocketId=socket.id; socket.join(room.code); socket.data.roomCode=room.code; socket.data.role='host';
    ack({ok:true,room:publicRoom(room),pending:pendingList(room)}); emitRoom(room);restoreQuizState(socket,room);
  });

  socket.on('player:requestJoin', (payload={},ack=()=>{}) => requestJoin(socket,payload,ack));
  socket.on('player:join', (payload={},ack=()=>{}) => requestJoin(socket,payload,ack));

  socket.on('player:cancelJoin', (_,ack=()=>{}) => {
    const room=getRoom(socket.data.pendingRoomCode);
    const requestId=socket.data.pendingRequestId;
    if(room&&requestId) room.pending.delete(requestId);
    socket.data.pendingRoomCode=null; socket.data.pendingRequestId=null;
    if(room) emitRoom(room);
    ack({ok:true});
  });

  socket.on('host:approveJoin', ({requestId}={},ack=()=>{}) => {
    const room=getRoom(socket.data.roomCode);
    if(!isHost(socket,room)) return ack({ok:false,error:'غير مصرح'});
    if(room.status!=='lobby') return ack({ok:false,error:'لا يمكن قبول لاعبين بعد بدء المسابقة'});
    const req=room.pending.get(requestId);
    if(!req) return ack({ok:false,error:'الطلب لم يعد متاحًا'});
    const playerSocket=io.sockets.sockets.get(req.socketId);
    if(!playerSocket){ room.pending.delete(requestId); emitRoom(room); return ack({ok:false,error:'اللاعب غير متصل الآن'}); }

    const player={id:req.socketId,uid:req.uid,name:req.name,avatar:req.avatar,hasPhoto:req.hasPhoto,score:0,correct:0,categories:{},answered:false,lastPoints:0,reconnectToken:randomUUID()};
    room.players.set(req.socketId,player); room.pending.delete(requestId);
    playerSocket.join(room.code); playerSocket.data.roomCode=room.code; playerSocket.data.role='player';
    playerSocket.data.pendingRoomCode=null; playerSocket.data.pendingRequestId=null;
    io.to(req.socketId).emit('join:approved',{player,room:publicRoom(room),reconnectToken:player.reconnectToken});
    io.to(room.code).emit('fx:join',{name:player.name,avatar:player.avatar});
    ack({ok:true}); emitRoom(room);
  });

  socket.on('player:reconnect',({code,reconnectToken}={},ack=()=>{})=>{
    const room=getRoom(code),entry=room&&[...room.players.entries()].find(([,p])=>p.reconnectToken===reconnectToken);
    if(!entry)return ack({ok:false,error:'انتهت جلسة اللاعب'});
    const [oldId,p]=entry;clearTimeout(p.leaveTimer);p.leaveTimer=null;
    room.players.delete(oldId);room.players.set(socket.id,p);
    if(room.answers.has(oldId)){room.answers.set(socket.id,room.answers.get(oldId));room.answers.delete(oldId)}
    p.id=socket.id;socket.join(room.code);socket.data.roomCode=room.code;socket.data.role='player';
    ack({ok:true,player:p,room:publicRoom(room)});emitRoom(room);restoreQuizState(socket,room);
  });

  socket.on('host:rejectJoin', ({requestId}={},ack=()=>{}) => {
    const room=getRoom(socket.data.roomCode);
    if(!isHost(socket,room)) return ack({ok:false,error:'غير مصرح'});
    const req=room.pending.get(requestId);
    if(!req) return ack({ok:false,error:'الطلب لم يعد متاحًا'});
    room.pending.delete(requestId);
    const playerSocket=io.sockets.sockets.get(req.socketId);
    if(playerSocket){ playerSocket.data.pendingRoomCode=null; playerSocket.data.pendingRequestId=null; }
    io.to(req.socketId).emit('join:rejected',{message:'لم يوافق مشرف المجلس على طلب الانضمام'});
    ack({ok:true}); emitRoom(room);
  });

  socket.on('display:join', ({code}={},ack=()=>{}) => {
    const room=getRoom(code);
    if(!room) return ack({ok:false,error:'الغرفة غير موجودة'});
    socket.join(room.code); socket.data.roomCode=room.code; socket.data.role='display';
    ack({ok:true,room:publicRoom(room)});
  });

  socket.on('host:setQuestions', ({questions}={},ack=()=>{}) => {
    const room=getRoom(socket.data.roomCode);
    if(!isHost(socket,room)||room.status!=='lobby') return ack({ok:false,error:'لا يمكن تعديل الأسئلة بعد بدء المسابقة'});
    if(!Array.isArray(questions)||questions.length<1||questions.length>50) return ack({ok:false,error:'عدد الأسئلة يجب أن يكون بين 1 و50'});

    const cleaned=questions.map((q,i)=>({
      id:i+1,
      question:clean(q.question,180),
      options:(q.options||[]).map(x=>clean(x,100)).filter(Boolean).slice(0,6),
      correct:Number(q.correct),
      category:clean(q.category,30)||'عام',
      difficulty:clean(q.difficulty,20)||'متوسط',
      time:Math.min(60,Math.max(5,Number(q.time)||15))
    })).filter(q=>q.question&&q.options.length>=2&&q.correct>=0&&q.correct<q.options.length);

    if(!cleaned.length) return ack({ok:false,error:'لم يتم العثور على أسئلة صالحة'});
    room.questions=cleaned; ack({ok:true,count:cleaned.length}); emitRoom(room);
  });

  socket.on('host:start', (_,ack=()=>{}) => {
    const room=getRoom(socket.data.roomCode);
    if(!isHost(socket,room)) return ack({ok:false,error:'غير مصرح'});
    if(room.status!=='lobby') return ack({ok:false,error:'المسابقة قيد التشغيل'});
    if(room.players.size<1) return ack({ok:false,error:'يلزم لاعب واحد على الأقل'});
    rejectAllPending(room);
    room.currentQuestionIndex=0; room.persisted=false;
    for(const p of room.players.values()){p.score=0;p.correct=0;p.categories={};}
    ack({ok:true}); sendQuestion(room);
  });

  socket.on('host:reveal', () => {
    const room=getRoom(socket.data.roomCode); if(isHost(socket,room)) revealAnswer(room);
  });
  socket.on('host:next', (ack=()=>{}) => {
    const room=getRoom(socket.data.roomCode);
    if(!isHost(socket,room)||room.status!=='result')return ack({ok:false,error:'تعذر المتابعة. انتظر استعادة الاتصال بالمجلس'});
    ack({ok:true});advanceQuestion(room);
  });
  socket.on('host:finish', () => {
    const room=getRoom(socket.data.roomCode); if(isHost(socket,room)) finishQuiz(room);
  });
  socket.on('host:reset', () => {
    const room=getRoom(socket.data.roomCode); if(!isHost(socket,room))return;
    clearTimeout(room.timer); clearTimeout(room.resultTimer); room.resultTimer=null; room.status='lobby'; room.currentQuestionIndex=0; room.answers.clear(); room.persisted=false;
    for(const p of room.players.values()){p.score=0;p.correct=0;p.answered=false;p.lastPoints=0;}
    io.to(room.code).emit('quiz:reset'); emitRoom(room);
  });

  socket.on('player:answer', ({answer}={},ack=()=>{}) => {
    const room=getRoom(socket.data.roomCode); const p=room?.players.get(socket.id);
    if(!room||!p||room.status!=='question'||p.answered) return ack({ok:false});
    const q=room.questions[room.currentQuestionIndex]; const idx=Number(answer);
    if(!Number.isInteger(idx)||idx<0||idx>=q.options.length)return ack({ok:false});
    const elapsed=Math.max(0,Date.now()-room.startedAt);
    p.answered=true; room.answers.set(socket.id,{answer:idx,elapsed});
    ack({ok:true}); io.to(room.code).emit('quiz:progress',{answered:room.answers.size,total:room.players.size}); emitRoom(room);
    if(room.answers.size===room.players.size) setTimeout(()=>revealAnswer(room),450);
  });

  socket.on('disconnect', () => {
    const pendingRoom=getRoom(socket.data.pendingRoomCode);
    if(pendingRoom&&socket.data.pendingRequestId){
      pendingRoom.pending.delete(socket.data.pendingRequestId); emitRoom(pendingRoom);
    }
    const room=getRoom(socket.data.roomCode); if(!room)return;
    if(socket.data.role==='host' && room.hostSocketId===socket.id){
      room.hostSocketId=null;
      if(room.status==='lobby'){
        room.hostDisconnectTimer=setTimeout(()=>{
          if(room.hostSocketId || rooms.get(room.code)!==room || room.status!=='lobby') return;
          for(const request of room.pending.values()) io.to(request.socketId).emit('join:rejected',{message:'أُغلق المجلس لغياب مشرفه'});
          io.to(room.code).emit('room:closed',{message:'أُغلق المجلس لغياب مشرفه'});
          rooms.delete(room.code);
          broadcastCouncils();
          io.emit('activity:update',activityRanking());
        },5*60*1000);
        room.hostDisconnectTimer.unref?.();
      }
    }
    if(socket.data.role==='player'){
      const p=room.players.get(socket.id);
      if(p){p.leaveTimer=setTimeout(()=>{if(room.players.get(socket.id)!==p)return;room.players.delete(socket.id);room.answers.delete(socket.id);emitRoom(room);},2*60*1000);p.leaveTimer.unref?.();}
    }
    if(room.players.size===0 && room.status==='finished') setTimeout(()=>{
      if(rooms.get(room.code)===room) rooms.delete(room.code);
    }, 30*60*1000);
  });
});

app.get('/api/health', (req,res)=>res.json({ok:true,rooms:rooms.size,time:new Date().toISOString()}));
app.get('/api/leaderboard', (req,res)=>res.json(Object.values(persistent.players).sort((a,b)=>b.totalScore-a.totalScore).slice(0,50)));
app.get('/api/activity', (req,res)=>res.json(activityRanking()));
app.get('/api/oman-locations', (req,res)=>res.json(OMAN_LOCATIONS));
app.get('/api/active-councils', (req,res)=>res.json(activeCouncils()));
app.get('*', (req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));

const PORT=process.env.PORT||3000;
server.listen(PORT,'0.0.0.0',()=>console.log(`🇴🇲 I Am Omani running on ${PORT}`));
