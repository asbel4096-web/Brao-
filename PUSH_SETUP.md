# إعداد إشعارات Push — براتشو كار

دليل خطوة بخطوة لتفعيل Web Push Notifications على المنصة.

> **مهم:** هذه الخطوات تُنفَّذ مرة واحدة فقط. بعدها، الإشعارات تعمل تلقائياً.

---

## الخطوة 1: تفعيل Cloud Messaging على Firebase Console

1. افتحي https://console.firebase.google.com/project/bratsho-car/settings/cloudmessaging
2. سترين قسم **"Web Push certificates"** أسفل الصفحة.
3. اضغطي **"Generate key pair"**.
4. انسخي القيمة الظاهرة (تبدأ بـ`B...` وطولها ~88 حرفاً).
5. هذه قيمة **VAPID public key** — احتفظي بها للخطوة التالية.

---

## الخطوة 2: إنشاء Service Account لـFirebase Admin

نحتاج credentials للـserver (Vercel API route) لكي يُرسل push.

1. افتحي https://console.firebase.google.com/project/bratsho-car/settings/serviceaccounts/adminsdk
2. اضغطي **"Generate new private key"**.
3. سيُنزَّل ملف JSON (لا تشاركيه مع أحد، لا تضعيه على GitHub).
4. افتحي الملف. ستحتاجين 3 قيم منه:
   - `project_id`
   - `client_email`
   - `private_key`

---

## الخطوة 3: إضافة Environment Variables على Vercel

افتحي https://vercel.com/your-team/brao/settings/environment-variables

### Client-side (مفعّلة على Production + Preview + Development):

```
NEXT_PUBLIC_FIREBASE_VAPID_KEY=<القيمة من الخطوة 1>
```

### Server-side (Production + Preview فقط — لا تضعيها على Development):

```
FIREBASE_ADMIN_PROJECT_ID=bratsho-car
FIREBASE_ADMIN_CLIENT_EMAIL=<client_email من JSON>
FIREBASE_ADMIN_PRIVATE_KEY=<private_key من JSON>
```

> **تحذير مهم بشأن `FIREBASE_ADMIN_PRIVATE_KEY`:**
> 
> القيمة في JSON تحتوي على `\n` كأحرف **حرفية** (literal). عند لصقها في Vercel، يجب أن تظل كذلك. الكود في `route.ts` يُحوّلها لـnewlines تلقائياً:
> 
> ```ts
> .replace(/\\n/g, "\n")
> ```
> 
> إذا أزالها Vercel أو أضاف اقتباسات، الكود يفشل. لو واجهتِ خطأ "Invalid PEM", تأكدي أن `\n` ظاهرة كنص.

---

## الخطوة 4: تحديث `public/firebase-messaging-sw.js`

افتحي الملف وستجدين سطوراً مثل:

```js
firebase.initializeApp({
  apiKey: "REPLACE_WITH_NEXT_PUBLIC_FIREBASE_API_KEY",
  ...
});
```

استبدلي كل `REPLACE_WITH_...` بالقيمة الفعلية من ملف `.env` (نفس قيم `NEXT_PUBLIC_FIREBASE_*` التي تستخدمينها).

> **لماذا لا نقرأها من env تلقائياً؟**
> 
> Service Worker لا يستطيع قراءة environment variables (يعمل خارج سياق Next.js). الحل: نضع القيم مباشرة. القيم public وآمنة (تظهر في bundle الـclient على أي حال).

---

## الخطوة 5: نشر قواعد Firestore الجديدة

أضفنا قسم `match /fcmTokens/{tokenId}` للقواعد. انشريها:

**عبر Firebase Console:**
1. افتحي https://console.firebase.google.com/project/bratsho-car/firestore/rules
2. انسخي محتوى `firestore.rules` الجديد بالكامل.
3. الصقي في المحرر، اضغطي **Publish**.

**أو عبر CLI:**
```bash
firebase deploy --only firestore:rules
```

---

## الخطوة 6: تثبيت Dependencies + النشر على Vercel

```bash
npm install
git add .
git commit -m "feat: add web push notifications"
git push
```

Vercel سيبني تلقائياً. لو نجح البناء، تابعي للاختبار.

---

## الخطوة 7: الاختبار

### اختبار في Chrome على Android أو Desktop:

1. افتحي الموقع، سجّلي دخول.
2. اذهبي لـ`/notifications` أو `/settings`.
3. يجب أن ترى البانر "لا تفوّت أي تنبيه" مع زر "تفعيل الإشعارات".
4. اضغطي الزر، وافقي على prompt المتصفح.
5. ستظهر toast "تم تفعيل الإشعارات".
6. **اختبر بإرسال إشعار من جهاز آخر**:
   - افتحي من جهاز ثانٍ (أو tab privacy)
   - علّقي على إعلانك أو أرسلي رسالة لحسابك
   - يجب أن يصل إشعار push (مع التطبيق مغلق أو مفتوح)

### اختبار على iPhone:

1. افتحي الموقع في Safari.
2. اضغطي أيقونة المشاركة (Share) → "Add to Home Screen".
3. افتحي التطبيق من الأيقونة الجديدة (وليس من Safari).
4. كرّري نفس خطوات Chrome أعلاه.
5. **مهم:** يعمل فقط على iOS 16.4 أو أحدث.

---

## الخطوة 8: التحقق من السجلّات

في حال لم تصل إشعارات:

### على Vercel:
1. افتحي https://vercel.com/your-team/brao/logs
2. ابحثي عن طلبات `/api/notifications/send`
3. لو ترين 401 → مشكلة auth (الـtoken لا يُمرَّر بشكل صحيح).
4. لو ترين 500 → مشكلة Admin SDK (تحقّقي من env vars).

### على المتصفح:
1. افتحي DevTools → Console.
2. ابحثي عن رسائل `[push]` أو `[SW]`.
3. لو ترين "NEXT_PUBLIC_FIREBASE_VAPID_KEY غير مضبوط" → الخطوة 1 لم تكتمل.
4. افتحي Application tab → Service Workers → تأكدي أن `firebase-messaging-sw.js` مُسجّل ونشط.

### على Firebase Console:
1. افتحي https://console.firebase.google.com/project/bratsho-car/messaging/reports
2. سترين عدد رسائل سُلِّمت وعدد فُتحت.

---

## معلومات للمطوّر — كيف يعمل النظام

### الـflow الكامل:

```
client (موبايل أ) يكتب تعليق
  ↓
addDoc(comments) → Firestore
  ↓
createNotification(targetUid)  ← يُكتب notification doc + يُحفّز push
  ↓
fetch /api/notifications/send  ← Vercel API route
  ↓
Admin SDK يقرأ users/{uid}/fcmTokens/*
  ↓
sendEachForMulticast → FCM servers
  ↓
push يصل للموبايل (Android Chrome أو PWA على iPhone)
  ↓
- إن التطبيق مفتوح: onMessage → toast
- إن التطبيق مغلق: firebase-messaging-sw.js → notification نظامية
  ↓
المستخدم يضغط الإشعار → يفتح /link المرسَل معه
```

### الأمان:

- **VAPID public key** عام، آمن في bundle الـclient.
- **Service Account JSON** سرّي - فقط على Vercel env vars (server-side).
- **idToken verification** في API route يمنع spam من users عشوائيين.
- **Firestore rules** على `fcmTokens` تسمح فقط للمالك بكتابة/قراءة tokenاته.

### تنظيف tokens المنتهية:

عند فشل push بـ`messaging/registration-token-not-registered`، الـAPI route يحذف الـtoken تلقائياً. لا حاجة لـjob دوري.

---

## استكشاف أخطاء شائعة

### "Notification permission denied"
المستخدم رفض الإذن. لا يمكن طلبه مجدداً برمجياً - يجب أن يفعّله يدوياً من إعدادات المتصفح.

### "Failed to register service worker"
- تأكدي أن `/firebase-messaging-sw.js` متاح (افتحيه مباشرة في المتصفح).
- على localhost: يعمل. على HTTP بدون SSL على production: لن يعمل (push يتطلب HTTPS).

### "Invalid VAPID key"
- تأكدي أن `NEXT_PUBLIC_FIREBASE_VAPID_KEY` مضبوطة بدون مسافات/علامات اقتباس.

### Push يصل في foreground لكن ليس في background
- تأكدي أن service worker مُسجَّل ونشط (DevTools → Application → Service Workers).
- على iPhone: التطبيق يجب أن يكون مُثبَّت كـPWA.

### "Module not found: firebase-admin"
ركّضي `npm install` بعد سحب الكود.
