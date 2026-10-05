'use strict';

const { getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');

const POLL_MS = 30 * 1000;
const MIN_ACCOUNT_AGE_MS = 45 * 1000;
const LOOKBACK_MS = 30 * 60 * 1000;

function escapeHtml(value='') {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

async function sendWithResend({ to, username, link }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');
  const from = process.env.RESEND_FROM || 'أنا عُماني <verify@byyassmin.com>';
  const safeName = escapeHtml(username || 'لاعب أنا عُماني');
  const safeLink = escapeHtml(link);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'تأكيد حسابك في أنا عُماني',
      text: `مرحبًا ${username || ''}\n\nلتأكيد حسابك في أنا عُماني افتح الرابط التالي:\n${link}\n\nإذا لم تطلب إنشاء الحساب فتجاهل هذه الرسالة.`,
      html: `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge"></head><body style="margin:0;background-color:#070d2d;font-family:Arial,Helvetica,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#070d2d"><tr><td align="center" style="padding-top:28px;padding-right:16px;padding-bottom:28px;padding-left:16px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#10184b;border-radius:20px;"><tr><td align="center" bgcolor="#10184b" style="padding-top:30px;padding-right:26px;padding-bottom:12px;padding-left:26px;font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:40px;color:#ffffff;font-weight:700;">أنا عُماني</td></tr><tr><td align="center" bgcolor="#10184b" style="padding-top:6px;padding-right:26px;padding-bottom:8px;padding-left:26px;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:30px;color:#ffffff;">مرحبًا ${safeName}</td></tr><tr><td align="center" bgcolor="#10184b" style="padding-top:8px;padding-right:26px;padding-bottom:22px;padding-left:26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:26px;color:#cbd3ff;">اضغط الزر التالي لتأكيد بريدك الإلكتروني وتفعيل حسابك.</td></tr><tr><td align="center" bgcolor="#10184b" style="padding-top:6px;padding-right:26px;padding-bottom:28px;padding-left:26px;"><table cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#7048ff" style="border-radius:12px;"><a href="${safeLink}" style="display:inline-block;padding-top:14px;padding-right:28px;padding-bottom:14px;padding-left:28px;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:22px;color:#ffffff;text-decoration:none;font-weight:700;">تأكيد الحساب</a></td></tr></table></td></tr><tr><td align="center" bgcolor="#10184b" style="padding-top:0;padding-right:26px;padding-bottom:30px;padding-left:26px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:20px;color:#8893c7;">إذا لم تطلب إنشاء هذا الحساب، تجاهل الرسالة.</td></tr></table></td></tr></table></body></html>`,
      tags: [{ name: 'purpose', value: 'email-verification' }]
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || `Resend HTTP ${response.status}`);
  return body?.id || null;
}

module.exports = function startVerificationEmailFallback() {
  if (!process.env.RESEND_API_KEY) {
    console.warn('Resend verification fallback is waiting for RESEND_API_KEY');
    return;
  }
  const app = getApps()[0];
  if (!app) {
    console.warn('Resend verification fallback disabled: Firebase Admin is unavailable');
    return;
  }
  const auth = getAuth(app);
  const db = getFirestore(app);
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const cutoff = Timestamp.fromMillis(Date.now() - LOOKBACK_MS);
      const snap = await db.collection('users').where('createdAt', '>=', cutoff).limit(50).get();
      for (const doc of snap.docs) {
        const data = doc.data() || {};
        if (data.verificationDelivery?.resendSentAt) continue;
        const createdMs = data.createdAt?.toMillis?.() || 0;
        if (!createdMs || Date.now() - createdMs < MIN_ACCOUNT_AGE_MS) continue;
        try {
          const user = await auth.getUser(doc.id);
          if (!user.email || user.emailVerified) continue;
          const link = await auth.generateEmailVerificationLink(user.email);
          const messageId = await sendWithResend({ to: user.email, username: data.username, link });
          await doc.ref.set({
            verificationDelivery: {
              channel: 'resend',
              resendSentAt: FieldValue.serverTimestamp(),
              messageId: messageId || null
            }
          }, { merge: true });
          console.log('Verification fallback sent via Resend');
        } catch (error) {
          console.warn('Verification fallback send failed:', error.message);
        }
      }
    } catch (error) {
      console.warn('Verification fallback scan failed:', error.message);
    } finally {
      running = false;
    }
  };

  setTimeout(tick, 12 * 1000).unref();
  setInterval(tick, POLL_MS).unref();
  console.log('Resend verification fallback enabled');
};
