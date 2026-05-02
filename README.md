# براتشو كار - Bratsho Car

سوق السيارات الاحترافي في ليبيا. منصة Next.js 14 + Firebase + Tailwind RTL.

## الميزات

- ✅ مصادقة Firebase (Google + هاتف SMS) عبر AuthContext موحّد
- ✅ إعلانات سيارات/قطع/خدمات مع نظام موافقة من المشرف
- ✅ صفحة إعلانات بفلاتر متقدّمة (URL-based)
- ✅ معرض صور (Lightbox + Thumbnails)
- ✅ مفضلة لكل مستخدم (Subcollection)
- ✅ شات داخلي حقيقي مع Firestore (real-time + إشعارات)
- ✅ نظام إشعارات كامل
- ✅ لوحة إدارة (إحصائيات + اعتماد/رفض الإعلانات + إدارة المستخدمين)
- ✅ وضع ليلي بدون FOUC
- ✅ هوية بصرية: أبيض / أسود / أزرق ملكي + برتقالي للأكشن
- ✅ تصميم Mobile-first مع Bottom Navigation
- ✅ قواعد أمان Firestore و Storage جاهزة

## التشغيل

### 1. تثبيت الحزم

```bash
npm install
```

### 2. إعداد متغيرات البيئة

انسخ `.env.example` إلى `.env.local` واملأ القيم من Firebase Console:

```bash
cp .env.example .env.local
```

ثم عبّئ:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_ADMIN_EMAILS=admin@example.com
```

> ⚠️ مهم: `STORAGE_BUCKET` يجب أن ينتهي بـ `.appspot.com` وليس `.firebasestorage.app`.

### 3. التشغيل

```bash
npm run dev
```

افتح http://localhost:3000

## إعداد Firebase Console

### Authentication
1. فعّل **Google** (Authentication → Sign-in method).
2. فعّل **Phone** وأضف رقم اختبار إن أردت.
3. في **Authorized domains** أضف `localhost` ودومين الإنتاج.

### Firestore
1. أنشئ قاعدة بيانات Firestore (Production mode).
2. انسخ محتوى `firebase.rules` إلى **Rules**.
3. عدّل قائمة `isAdmin()` فيه ليشمل بريدك:
   ```
   request.auth.token.email in [
     'your-email@example.com'
   ]
   ```

### Storage
1. أنشئ Storage Bucket (إن لم يكن موجوداً).
2. انسخ محتوى `storage.rules` إلى **Rules**.

### الفهارس (Indexes)
سيطلب Firestore فهارس مركّبة عند أول تشغيل لاستعلامات:
- `listings` بـ `status` + `createdAt desc`
- `listings` بـ `ownerId` + `createdAt desc`
- `chats` بـ `participants array-contains` + `lastMessageAt desc`
- `notifications` بـ `userId` + `createdAt desc`

اضغط الرابط في رسالة الخطأ بالكونسول لإنشائها تلقائياً.

## كيف تصبح مشرفاً

طريقتان (أيّهما يكفي):

1. **الأسهل**: أضف بريدك إلى `NEXT_PUBLIC_ADMIN_EMAILS` في `.env.local`، ثم عدّل نفس البريد في `firebase.rules` داخل `isAdmin()`.
2. **عبر Firestore**: حدّث وثيقة `users/{uid}` وضع `isAdmin: true`.

ادخل ثم اذهب إلى `/admin`.

## بنية المجلدات

```
/app
  /(public)         صفحات عامة (الرئيسية + إعلانات + شات...)
  /admin            لوحة الإدارة (محمية)
  layout.tsx        Root + Providers
/components         مكوّنات قابلة لإعادة الاستخدام
/contexts           AuthContext + ThemeContext
/hooks              useFavorites
/lib                firebase, types, utils, categories, plans, notifications
firebase.rules      قواعد Firestore
storage.rules       قواعد Storage
```

## السكريبتات

```bash
npm run dev          # تشغيل التطوير
npm run build        # بناء للإنتاج
npm run start        # تشغيل الإنتاج
npm run lint         # ESLint
npm run type-check   # TypeScript check بدون بناء
```

## النشر على Vercel

1. ارفع المشروع إلى GitHub.
2. اربطه بـ Vercel.
3. أضف نفس متغيرات `.env.local` في Vercel → Settings → Environment Variables.
4. أضف دومين Vercel إلى Firebase Authorized Domains.

## الميزات القادمة

- بوابة دفع للاشتراكات
- ربط مع جهات تقارير المركبات الرسمية
- تطبيق Mobile (React Native)
- نظام تقييمات وتعليقات

## الترخيص

خاص - جميع الحقوق محفوظة © براتشو كار
