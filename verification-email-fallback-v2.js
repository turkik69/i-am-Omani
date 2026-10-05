'use strict';
const { getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

module.exports = function startVerificationEmailFallbackV2(){
  if(!process.env.RESEND_API_KEY){ console.warn('Resend verification v2 waiting for key'); return; }
  const app=getApps()[0]; if(!app){ console.warn('Resend verification v2 disabled: no Firebase Admin'); return; }
  const auth=getAuth(app), db=getFirestore(app); let running=false;
  async function send(user){
    if(!user.email || user.emailVerified) return;
    const created=Date.parse(user.metadata?.creationTime||'')||0;
    if(!created || Date.now()-created<10000 || Date.now()-created>3600000) return;
    const ref=db.collection('users').doc(user.uid); const snap=await ref.get(); const data=snap.data()||{};
    if(data.verificationDelivery?.resendSentAt) return;
    const link=await auth.generateEmailVerificationLink(user.email);
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${process.env.RESEND_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({from:process.env.RESEND_FROM||'أنا عُماني <verify@byyassmin.com>',to:[user.email],subject:'تأكيد حسابك في أنا عُماني',text:`لتأكيد حسابك افتح الرابط التالي:\n${link}`})});
    const body=await response.json().catch(()=>({})); if(!response.ok) throw new Error(body.message||`Resend ${response.status}`);
    await ref.set({verificationDelivery:{channel:'resend',resendSentAt:FieldValue.serverTimestamp(),messageId:body.id||null}},{merge:true});
    console.log('Verification v2 sent via Resend');
  }
  async function tick(){
    if(running)return; running=true;
    try{ let token; do{ const page=await auth.listUsers(1000,token); for(const user of page.users){ try{await send(user)}catch(e){console.warn('Verification v2 send failed:',e.message)} } token=page.pageToken; }while(token); }
    catch(e){console.warn('Verification v2 scan failed:',e.message)} finally{running=false}
  }
  setTimeout(tick,5000).unref(); setInterval(tick,15000).unref(); console.log('Resend verification v2 enabled');
};
