# 🔐 إغلاق المشاكل الحرجة — جاهزية الإطلاق

إصلاح كل النقاط الحرجة من Launch Readiness Audit. **لا ميزات جديدة.**

---

## 📁 الملفات (3)

| الملف | النوع | الدور |
|---|---|---|
| `firestore.rules` | معدّل | حماية vipUntil + العدّادات + قاعدة viewers |
| `app/api/cron/boosts-cleanup/route.ts` | جديد | تنظيف الترقيات (Cron) |
| `vercel.json` | جديد | جدولة الـCron يومياً |

---

## 1️⃣ + 2️⃣ إصلاح firestore.rules

### Diff الأمني (قاعدة listings update)

```diff
          // المالك ممنوع من تعديل حقول التمييز/التعزيز/الترقية
          && unchanged([
            'featured', 'featuredAt', 'featuredUntil', 'featuredBy',
            'boostedUntil', 'boostedAt',
            'bumpedAt', 'bumpCount',
+           'vipUntil', 'vipAt',
+           'views', 'favoritesCount',
+           'chatClicks', 'phoneClicks', 'whatsappClicks', 'shareClicks'
          ])

+     // مسار dedup مشاهدات الإعلان - server-side فقط
+     match /viewers/{viewerKey} {
+       allow read, write: if false;
+     }
```

**النتيجة**:
- ✅ المالك لا يستطيع منح نفسه VIP مجانًا (`vipUntil` محمي)
- ✅ المالك لا يستطيع تزوير المشاهدات/النقرات (كل العدّادات محمية)
- ✅ featured/boosted كانت محمية وبقيت
- ✅ `likesCount/commentsCount` تبقى مسموحة (transactions العميل)
- ✅ قاعدة viewers صريحة

---

## 3️⃣ Cron Job لتنظيف الترقيات

### الملف الجديد: `app/api/cron/boosts-cleanup/route.ts`
- `GET` يُصادَق عبر `CRON_SECRET` (معيار Vercel Cron)
- يطفئ `featured=false` للمنتهية + ينظّف `vipUntil` المنتهي
- آمن: لا يحذف بيانات

### `vercel.json` — جدولة يومية الساعة 2 صباحًا
```json
{ "crons": [{ "path": "/api/cron/boosts-cleanup", "schedule": "0 2 * * *" }] }
```

> Vercel يرسل `Authorization: Bearer <CRON_SECRET>` تلقائياً. **يجب** ضبط `CRON_SECRET` في env (خطوة 5).

---

## 4️⃣ مراجعة Environment Variables

### مطلوبة للإنتاج (حرجة)

| المتغيّر | الوصف | عام/سرّي |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | مفتاح Firebase | عام |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | نطاق المصادقة | عام |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | معرّف المشروع | عام |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | تخزين الصور | عام |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | الإشعارات | عام |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | معرّف التطبيق | عام |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | مفتاح Push | عام |
| `FIREBASE_ADMIN_PROJECT_ID` | Admin SDK | 🔒 سرّي |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Admin SDK | 🔒 سرّي |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Admin SDK | 🔒 سرّي |
| `NEXT_PUBLIC_ADMIN_EMAILS` | إيميلات الأدمن | عام |
| **`NEXT_PUBLIC_SITE_URL`** | نطاق الموقع (للـSEO/OG) | عام |
| **`CRON_SECRET`** | سرّ الـCron (جديد) | 🔒 سرّي |

### اختيارية (تقارير VIN — معطّلة حاليًا)
`VEHICLE_REPORT_DEMO`, `CARFAX_API_KEY`, `CARFAX_CA_API_KEY`, `CARVERTICAL_API_KEY`, `AUTODNA_API_KEY`, `ENCAR_API_KEY` — اتركيها فارغة حتى تتعاقدي مع مزوّد.

---

## 5️⃣ إعدادات Vercel خطوة بخطوة

### أ. متغيّرات البيئة
1. Vercel → مشروعك `brao` → **Settings** → **Environment Variables**
2. أضيفي كل متغيّر من الجدول أعلاه (Production + Preview + Development)
3. **المتغيّران الجديدان المهمّان**:
   - `NEXT_PUBLIC_SITE_URL` = `https://brao-chi.vercel.app` (أو نطاقك المخصّص)
   - `CRON_SECRET` = سلسلة عشوائية طويلة (مثلاً من `openssl rand -hex 32`)
4. **`FIREBASE_ADMIN_PRIVATE_KEY`**: انسخيه كما هو من ملف الخدمة (مع `\n`). لو Vercel يرفضه، ضعيه بين علامتي اقتباس.

### ب. نشر firestore.rules (الفجوة المتكررة!)
الـrules في المشروع **لا تُنشر تلقائيًا**. يجب:
1. افتحي [Firebase Console](https://console.firebase.google.com) → مشروع `bratsho-car`
2. **Firestore Database** → **Rules**
3. الصقي محتوى `firestore.rules` المحدّث بالكامل
4. **Publish**

> ⚠️ هذه أهم خطوة — بدونها الحماية الجديدة لن تُفعّل!

### ج. تفعيل feature flags
في Firestore Console، تأكدي من:
- `featureFlags/wallet` → `enabled: true`
- `featureFlags/boosts` → `enabled: true`

### د. النشر
```bash
git add firestore.rules vercel.json app/api/cron/boosts-cleanup/
git commit -m "fix: secure rules (vip/counters) + cron cleanup"
git push
```

### هـ. التحقق من الـCron
بعد النشر: Vercel → **Settings** → **Cron Jobs** → ✅ يظهر `boosts-cleanup` يوميًا 2ص.

---

## ✅ ما تم إغلاقه

| المشكلة | الحالة |
|---|---|
| 🔴 تلاعب vipUntil (VIP مجاني) | ✅ مُغلق |
| 🔴 تزوير العدّادات | ✅ مُغلق |
| 🟡 قاعدة viewers | ✅ مُغلق |
| 🟡 cleanup الترقيات | ✅ مُغلق (Cron) |
| 🔴 مراجعة env | ✅ مُوثّق |
| 🔴 دليل Vercel | ✅ مُوثّق |

> الباقي (apple-touch-icon، Service Worker، TODOs) تحسينات غير مانعة للإطلاق.
