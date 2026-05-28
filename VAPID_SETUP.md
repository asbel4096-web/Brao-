# تفعيل Push الفعلي — خطوة VAPID

هذه آخر خطوة لتفعيل push الحقيقي على الجوال (للـbroadcast + التعليقات + الرسائل).

> **ملاحظة:** خلاف الإعداد السابق، **لا تحتاجين تعديل `firebase-messaging-sw.js` يدوياً**. النسخة الجديدة تقرأ Firebase config تلقائياً من رابط التسجيل. فقط أضيفي مفتاح VAPID.

---

## الخطوة 1: توليد VAPID key

1. افتحي:
   https://console.firebase.google.com/project/bratsho-car/settings/cloudmessaging

2. انزلي لأسفل إلى قسم **"Web Push certificates"**.

3. اضغطي **"Generate key pair"**.

4. ستظهر قيمة طويلة تبدأ بـ`B...` (طولها ~88 حرفاً). انسخيها.

---

## الخطوة 2: إضافة المفتاح على Vercel

افتحي: Vercel → مشروعك → Settings → Environment Variables → Add

- **Key:** `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
- **Value:** القيمة التي نسختيها (بدون اقتباسات)
- **Environments:** **All Environments** (مهم — هذا client-side، ليس Production فقط)
- **Sensitive:** **لا** (هذا مفتاح عام، آمن)

اضغطي **Save**.

---

## الخطوة 3: تأكدي من باقي متغيرات Firebase

النسخة الجديدة من الـservice worker تحتاج هذه القيم (كلها موجودة على الأرجح، لكن تأكدي):

```
NEXT_PUBLIC_FIREBASE_API_KEY              ✓ (موجود)
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN          ✓ (موجود)
NEXT_PUBLIC_FIREBASE_PROJECT_ID           ← تأكدي من وجوده
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET       ← تأكدي من وجوده
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID  ← تأكدي من وجوده
NEXT_PUBLIC_FIREBASE_APP_ID               ← تأكدي من وجوده
```

لو أي منها مفقود، أضيفيه (القيم من Firebase Console → Project Settings → General → Your apps → Web app → SDK setup).

---

## الخطوة 4: نشر الملفات + Redeploy

1. ارفعي الملفين المعدّلين:
   - `public/firebase-messaging-sw.js`
   - `hooks/use-push-notifications.ts`

```bash
git add .
git commit -m "feat: VAPID push via SW query config"
git push
```

2. Vercel يبني تلقائياً. بعد اكتمال البناء، تابعي.

---

## الخطوة 5: الاختبار

### على Android Chrome أو Desktop Chrome:

1. افتحي الموقع، سجّلي دخول.
2. اذهبي لـ`/notifications` أو `/settings`.
3. اضغطي "تفعيل الإشعارات".
4. وافقي على prompt المتصفح.
5. **يجب أن ترى toast "تم تفعيل الإشعارات"** — هذا يعني الـtoken سُجّل.

### اختبار الوصول الفعلي:

1. من `/admin/broadcast`، أرسلي إشعار اختبار.
2. **أغلقي التطبيق تماماً** (أو انتقلي لـtab آخر).
3. خلال ثوانٍ، يجب أن يصل **إشعار نظامي** على الجوال/سطح المكتب.
4. اضغطيه → يفتح `/notifications`.

---

## التحقق من النجاح

### في Console (DevTools):
- لا أخطاء `[push]` أو `[SW]`.
- Application tab → Service Workers → ترين `firebase-messaging-sw.js` نشطاً (activated).

### في Firestore:
- افتحي `users/{uid}/fcmTokens` → يجب أن ترى وثيقة token واحدة على الأقل بعد التفعيل.

### في `/admin/broadcast`:
- بعد الإرسال، البطاقة الخضراء تُظهر **"push نجح: N"** بقيمة أكبر من صفر.

---

## استكشاف الأخطاء

### "تم تفعيل الإشعارات" لا يظهر، والـstatus يبقى error:
- تأكدي أن `NEXT_PUBLIC_FIREBASE_VAPID_KEY` مضاف وأعدتِ Redeploy.
- في Console، ابحثي عن "VAPID" أو "applicationServerKey" errors.

### push نجح يبقى صفر رغم تفعيل التفعيل:
- تأكدي أن الجهاز الذي فعّل الإشعارات مختلف عن جهاز الإرسال، أو انتظري قليلاً.
- تحققي من `users/{uid}/fcmTokens` — هل توجد وثيقة token؟

### الإشعار يصل في foreground فقط (التطبيق مفتوح) وليس background:
- Application tab → Service Workers → تأكدي أن الـSW "activated and running".
- لو ترين خطأ في الـSW، افتحيه مباشرة: `https://brao-chi.vercel.app/firebase-messaging-sw.js` — يجب أن يُحمّل JavaScript بدون 404.

### على iPhone:
- يجب تثبيت التطبيق كـPWA أولاً (Share → Add to Home Screen)، ثم فتحه من الأيقونة.
- يعمل فقط على iOS 16.4+.
