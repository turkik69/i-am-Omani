# 🎮 Quiz Arena — ساحة التحدي

منصة مسابقات حية متعددة اللاعبين تعمل في الوقت الفعلي عبر **Node.js + Express + Socket.io**، بواجهة عربية تفاعلية وهوية بصرية مستوحاة من تطبيقات الألعاب.

## ✨ أبرز المميزات

- 👑 **مضيف مستقل** ينشئ الغرفة ويتحكم ببداية المسابقة والأسئلة والانتقال والإنهاء.
- 🔢 **رمز دخول من 6 أرقام** لكل غرفة.
- 🎯 **لاعبون متعددون** مع أسماء وشخصيات رمزية وترتيب حي.
- 📺 **وضع شاشة عرض** مخصص للتلفزيون أو البروجكتر.
- 🧠 **محرر بنك أسئلة** من داخل التطبيق: إضافة/حذف/تعديل السؤال والخيارات والإجابة والوقت والتصنيف.
- ⚡ **نظام نقاط يعتمد على صحة الإجابة وسرعتها** مع مكافأة للمراكز الأسرع.
- 🏆 منصة تتويج ونتائج نهائية وترتيب مباشر.
- 🔊 مؤثرات صوتية مولدة داخل المتصفح وحركات وانتقالات وConfetti.
- 📱 PWA قابل للتثبيت على الهاتف، مع Service Worker وManifest وأيقونة مخصصة.
- 🌙 تصميم ألعاب داكن/نيون متجاوب مع الهاتف والكمبيوتر.
- 💾 حفظ إحصائيات اللاعبين وسجل الألعاب في ملف Runtime محلي.
- ❤️ Health endpoint على `/api/health`.
- ✅ GitHub Actions لفحص JavaScript تلقائيًا على كل Push.

## 🚀 التشغيل محليًا

```bash
git clone https://github.com/turkik69/realtime-quiz-app.git
cd realtime-quiz-app
npm install
npm start
```

ثم افتح:

```text
http://localhost:3000
```

## 🎮 طريقة الاستخدام

### المضيف
1. اختر **أنشئ مسابقة**.
2. اكتب اسم المسابقة.
3. شارك رمز الغرفة مع اللاعبين.
4. عدّل بنك الأسئلة إذا رغبت.
5. افتح شاشة العرض على شاشة كبيرة عند الحاجة.
6. اضغط **ابدأ المسابقة**.
7. بعد كل سؤال اعرض النتائج وانتقل للسؤال التالي.

### اللاعب
1. اختر **انضم للمسابقة**.
2. أدخل رمز الغرفة.
3. اكتب الاسم واختر الشخصية.
4. انتظر المضيف ثم أجب قبل انتهاء الوقت.

### شاشة العرض
اختر **شاشة العرض** وأدخل نفس رمز الغرفة. ستعرض الشاشة السؤال، عدد المشاركين الذين أجابوا، النتائج والترتيب النهائي دون عناصر التحكم الخاصة باللاعب.

## 🏗️ البنية

```text
server.js               خادم Express + Socket.io ومنطق الغرف والنقاط
public/index.html        شاشات التطبيق
public/styles.css        هوية وتصميم وحركات اللعبة
public/app.js            منطق الواجهة واتصالات Socket.io والأصوات
public/manifest.json     إعداد PWA
public/sw.js             Service Worker
public/icon.svg          أيقونة التطبيق
render.yaml              Blueprint جاهز للنشر على Render
.github/workflows/ci.yml فحص تلقائي للكود
```

## 🧮 النقاط

الإجابة الصحيحة تحصل على نقاط أساسية بالإضافة إلى مكافأة سرعة، مع مكافأة إضافية للمتسابقين الأسرع في السؤال. الإجابة الخاطئة لا تضيف نقاطًا.

## 💾 البيانات

الغرف النشطة موجودة في ذاكرة الخادم أثناء الجلسة. إحصائيات اللاعبين وسجل الألعاب تُحفظ في `data/stats.json` أثناء التشغيل، والملف مستثنى من Git.

> على استضافة ذات نظام ملفات مؤقت يجب ربط Persistent Disk أو قاعدة بيانات خارجية للحفاظ على الإحصائيات بين عمليات إعادة النشر.

## 🌐 النشر

المستودع يحتوي `render.yaml` جاهزًا لخدمة Node Web Service مع:

- `npm install`
- `npm start`
- Node 22
- Health Check على `/api/health`
- Auto Deploy من GitHub

## 🔐 ملاحظات إنتاجية

- المضيف يمتلك Token خاصًا لاستعادة جلسة التحكم.
- أوامر التحكم الحساسة تتحقق من Socket المضيف على الخادم.
- الإجابة لا تُقبل أكثر من مرة لكل لاعب في السؤال.
- الإجابة الصحيحة لا تُرسل للعميل قبل انتهاء الجولة.
- أسماء المستخدمين والنصوص المدخلة يتم تنظيفها وتحديد طولها.

## 👨‍💻 المطور

**turkik69**

## Firebase accounts and progress

The server serves only the public Web App config at `/api/firebase-config`. On Render set `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, and `FIREBASE_APP_ID` from the Firebase Web App. Set `FIREBASE_SERVICE_ACCOUNT_JSON` as a **server-only** secret containing the service-account JSON for that same project. Never put that JSON in `public/`, Git, or a browser variable. Render's existing service must have these variables configured in its environment; a Blueprint change alone does not populate them.

Enable Email/Password in Firebase Authentication and authorize `sahat-oman.onrender.com`. Create Firestore (production mode) and deploy `firestore.rules` with the Firebase CLI (`firebase deploy --only firestore:rules --project PROJECT_ID`) or paste the file into Firestore > Rules and publish it. The rules keep email/phone/profile data private to the account owner, reserve usernames atomically, and allow each owner to save XP, levels, badges, and progress. An authenticated user can read a username reservation's UID; emails are never in that directory. Client-side XP remains self-reported and should not be used for prizes or trusted rankings until rewards are verified by the server.

A user can recover a password through Firebase's reset email. The username recovery flow sends the same private reset link to the registered email, after which the user signs in with their email and sees their username in the profile. The account screen stays out of the way until Firebase is fully configured. Existing local progress is not silently attached to a new account, to avoid mixing profiles on a shared device.
