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
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
    });
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

const OMAN_LOCATIONS = [
  {
    wilayat: 'بركاء',
    villages: [
      'الحرادي','مزرع الحرادي','المراغ','الباسط','الصومحان','الجحيلة','حلة الفوارس','حلة العجم',
      'قرحة البلوش','الجنينة','الثرامد','حفري الجنوبية','الخويرات','مزرع الحرث','المذرية','حرادي الساحل',
      'الهرم','السلاحة','وادي آمون','حي عاصم','مزغيو','الرميس','أبو النخيل','الشخاخيط'
    ]
  },
  {
    wilayat: 'صحار',
    villages: [
      'الهمبار','الحجرة','صلان','الطريف','الوقيبة','عوتب','الصويحرة','مجز الكبرى','غيل الشبول','العوينات',
      'العوهي','فلج القبائل','العفيفة','مجيس','الجفرة','الملعب','الخويرية','حلة الشيزاو','حلة الصبارة',
      'حلة الشيخ حسان','حيبي','الحجال','شام','السهيلة','الخان','الجاهلي'
    ]
  },
  { wilayat: 'السيب', villages: [] },
  { wilayat: 'المصنعة', villages: [] },
  { wilayat: 'السويق', villages: [] },
  { wilayat: 'نزوى', villages: [] },
  { wilayat: 'بهلاء', villages: [] },
  { wilayat: 'مطرح', villages: [] },
  { wilayat: 'بوشر', villages: [] },
  { wilayat: 'قريات', villages: [] },
  { wilayat: 'صور', villages: [] },
  { wilayat: 'إبراء', villages: [] },
  { wilayat: 'الرستاق', villages: [] },
  { wilayat: 'نخل', villages: [] },
  { wilayat: 'العوابي', villages: [] },
  { wilayat: 'صلالة', villages: [] },
  { wilayat: 'خصب', villages: [] },
  { wilayat: 'البريمي', villages: [] }
];

const rooms = new Map();
const roomCode = () => String(Math.floor(100000 + Math.random() * 900000));
const clean = (v='', max=180) => String(v).trim().replace(/[<>]/g,'').slice(0, max);
const sanitizeName = v => clean(v, 28);

function findLocation(wilayat, village) {
  const w = clean(wilayat, 40);
  const v = clean(village, 50);
  const entry = OMAN_LOCATIONS.find(x => x.wilayat === w);
  if (!entry || !v) return null;
  return { wilayat: entry.wilayat, village: v };
}

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
    players: [...room.players.values()].map(p => ({ ...p })),
    pendingCount: room.pending.size,
    leaderboard: [...room.players.values()].sort((a,b)=>b.score-a.score).map((p,i)=>({...p,rank:i+1}))
  };
}

function pendingList(room) {
  return [...room.pending.values()].map(r => ({
    id:r.id, name:r.name, avatar:r.avatar, requestedAt:r.requestedAt
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
function emitRoom(room) {
  io.to(room.code).emit('room:update', publicRoom(room));
  if (room.hostSocketId) io.to(room.hostSocketId).emit('host:pending', pendingList(room));
  broadcastCouncils();
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
  room.answers.clear();
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

  room.status = 'result';
  const podium = correct.map(([id,a],rank)=>{
    const p=room.players.get(id);
    return p ? {rank:rank+1,name:p.name,avatar:p.avatar,points:p.lastPoints,time:(a.elapsed/1000).toFixed(2)} : null;
  }).filter(Boolean);

  io.to(room.code).emit('quiz:result', {
    correctIndex:q.correct,
    correctText:q.options[q.correct],
    podium,
    leaderboard:publicRoom(room).leaderboard
  });
  emitRoom(room);
}

function finishQuiz(room) {
  if (!room) return;
  clearTimeout(room.timer);
  const board = publicRoom(room).leaderboard;
  if (room.status === 'finished' && room.persisted) {
    io.to(room.code).emit('quiz:finished', board);
    return;
  }
  room.status = 'finished';

  if (!room.persisted) {
    const now = new Date().toISOString();
    board.forEach(p => {
      const key = p.name.toLowerCase();
      const s = persistent.players[key] || { name:p.name, avatar:p.avatar, games:0, wins:0, totalScore:0, bestScore:0, correct:0 };
      s.name=p.name; s.avatar=p.avatar; s.games++; s.totalScore+=p.score; s.bestScore=Math.max(s.bestScore,p.score); s.correct+=p.correct; if(p.rank===1)s.wins++;
      persistent.players[key]=s;
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

function requestJoin(socket, payload={}, ack=()=>{}) {
  const room=getRoom(payload.code);
  if(!room) return ack({ok:false,error:'المجلس غير موجود أو لم يعد متاحًا'});
  if(room.status!=='lobby') return ack({ok:false,error:'بدأت المسابقة بالفعل، اختر مجلسًا آخر'});
  const name=sanitizeName(payload.name);
  if(!name) return ack({ok:false,error:'اكتب اسم اللاعب'});
  const duplicatePlayer=[...room.players.values()].some(p=>p.name.toLowerCase()===name.toLowerCase());
  const duplicatePending=[...room.pending.values()].some(p=>p.name.toLowerCase()===name.toLowerCase());
  if(duplicatePlayer||duplicatePending) return ack({ok:false,error:'هذا الاسم مستخدم في المجلس'});
  if(socket.data.pendingRoomCode) return ack({ok:false,error:'لديك طلب انضمام قيد الانتظار بالفعل'});

  const req={
    id:randomUUID(), socketId:socket.id, name,
    avatar:clean(payload.avatar||'🇴🇲',8), requestedAt:Date.now()
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
      currentQuestionIndex:0, players:new Map(), pending:new Map(), answers:new Map(), timer:null,
      startedAt:null, persisted:false
    };
    rooms.set(code, room); socket.join(code); socket.data.roomCode=code; socket.data.role='host';
    ack({ok:true, code, hostToken, room:publicRoom(room)}); emitRoom(room);
  });

  socket.on('host:reconnect', ({code,hostToken}={}, ack=()=>{}) => {
    const room=getRoom(code);
    if(!room || room.hostToken!==hostToken) return ack({ok:false,error:'تعذر استعادة جلسة المضيف'});
    room.hostSocketId=socket.id; socket.join(room.code); socket.data.roomCode=room.code; socket.data.role='host';
    ack({ok:true,room:publicRoom(room),pending:pendingList(room)}); emitRoom(room);
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

    const player={id:req.socketId,name:req.name,avatar:req.avatar,score:0,correct:0,answered:false,lastPoints:0};
    room.players.set(req.socketId,player); room.pending.delete(requestId);
    playerSocket.join(room.code); playerSocket.data.roomCode=room.code; playerSocket.data.role='player';
    playerSocket.data.pendingRoomCode=null; playerSocket.data.pendingRequestId=null;
    io.to(req.socketId).emit('join:approved',{player,room:publicRoom(room)});
    io.to(room.code).emit('fx:join',{name:player.name,avatar:player.avatar});
    ack({ok:true}); emitRoom(room);
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
    for(const p of room.players.values()){p.score=0;p.correct=0;}
    ack({ok:true}); sendQuestion(room);
  });

  socket.on('host:reveal', () => {
    const room=getRoom(socket.data.roomCode); if(isHost(socket,room)) revealAnswer(room);
  });
  socket.on('host:next', () => {
    const room=getRoom(socket.data.roomCode);
    if(!isHost(socket,room)||room.status!=='result')return;
    room.currentQuestionIndex++; sendQuestion(room);
  });
  socket.on('host:finish', () => {
    const room=getRoom(socket.data.roomCode); if(isHost(socket,room)) finishQuiz(room);
  });
  socket.on('host:reset', () => {
    const room=getRoom(socket.data.roomCode); if(!isHost(socket,room))return;
    clearTimeout(room.timer); room.status='lobby'; room.currentQuestionIndex=0; room.answers.clear(); room.persisted=false;
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
    if(socket.data.role==='player'){ room.players.delete(socket.id); room.answers.delete(socket.id); emitRoom(room); }
    if(room.players.size===0 && room.status==='finished') setTimeout(()=>{
      if(rooms.get(room.code)===room) rooms.delete(room.code);
    }, 30*60*1000);
  });
});

app.get('/api/health', (req,res)=>res.json({ok:true,rooms:rooms.size,time:new Date().toISOString()}));
app.get('/api/leaderboard', (req,res)=>res.json(Object.values(persistent.players).sort((a,b)=>b.totalScore-a.totalScore).slice(0,50)));
app.get('/api/oman-locations', (req,res)=>res.json(OMAN_LOCATIONS));
app.get('/api/active-councils', (req,res)=>res.json(activeCouncils()));
app.get('*', (req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));

const PORT=process.env.PORT||3000;
server.listen(PORT,'0.0.0.0',()=>console.log(`🇴🇲 I Am Omani running on ${PORT}`));
