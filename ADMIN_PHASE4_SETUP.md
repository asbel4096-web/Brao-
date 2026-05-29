# المرحلة 4 — التحليلات والرسومات | دليل النشر

ميزات هذه المرحلة:

- ✅ **Recharts integration** — رسومات احترافية تفاعلية
- ✅ **صفحة `/admin/analytics`** كاملة (charts نمو + Top items)
- ✅ **ملخّص charts في `/admin`** الرئيسية (للوصول السريع)
- ✅ **KPIs مع % change** (مقارنة الأسبوع الحالي بالسابق)
- ✅ **Top cities/categories/brands** — Bar charts أفقية
- ✅ **صفحة `/admin/system/logs`** — Activity feed لـ`adminLogs`
- ✅ **فلاتر** على الـactivity feed (المستخدمون/الإعلانات/البلاغات/الإشعارات)

---

## الملفات الجديدة (7)

### Hooks
- `hooks/admin/use-analytics-data.ts` — قراءة + aggregation client-side
- `hooks/admin/use-activity-feed.ts` — قائمة adminLogs مع pagination

### Charts
- `components/admin/charts/growth-chart.tsx` — Area chart للنمو
- `components/admin/charts/top-bar-chart.tsx` — Horizontal bar chart

### Pages
- `app/admin/analytics/page.tsx` — صفحة التحليلات الكاملة
- `app/admin/system/logs/page.tsx` — Activity feed

### Modified
- `app/admin/page.tsx` — إضافة قسم mini charts
- `package.json` — إضافة `recharts@^2.13.3`

---

## خطوات النشر

### 1️⃣ ارفعي الملفات

```bash
git add .
git commit -m "feat(admin): phase 4 - analytics + charts"
git push
```

### 2️⃣ Vercel سيُنفّذ `npm install` تلقائياً

لأننا أضفنا dependency جديد (`recharts`). البناء يأخذ ~2 دقيقة.

> **مهم**: لو فشل الـbuild بسبب recharts، تأكدي أن `package.json` المعدَّل مرفوع.

### 3️⃣ لا تعديل على Firestore rules

نستخدم `users`, `listings`, `adminLogs` — كلها موجودة في القواعد من مراحل سابقة.

---

## بعد النشر — الاختبار

### اختبار 1: صفحة التحليلات
1. افتحي `/admin/analytics`
2. يجب أن ترى:
   - 4 KPIs في الأعلى (مستخدمون/إعلانات أسبوع + 30 يوم)
   - 2 area charts (نمو المستخدمين + الإعلانات)
   - 3 bar charts أفقية (Top cities + categories + brands)

### اختبار 2: ملخّص في الـdashboard
1. افتحي `/admin`
2. يجب أن ترى قسم جديد "نظرة على النمو" مع 2 charts
3. رابط "التحليلات الكاملة" يأخذك لـ`/admin/analytics`

### اختبار 3: سجلّ النشاطات
1. افتحي `/admin/system/logs`
2. يجب أن ترى كل الإجراءات السابقة (ban, verify, broadcast, ...)
3. اختبري الفلاتر: المستخدمون / الإعلانات / البلاغات / الإشعارات
4. infinite scroll يعمل (load more تلقائياً)

### اختبار 4: KPIs مع % change
- لو هذا الأسبوع 5 مستخدمين جدد والأسبوع السابق 3 → "+67% مقابل الأسبوع السابق" بلون أخضر
- لو 0 الأسبوع السابق → لا تظهر النسبة (تجنّب القسمة على صفر)

---

## التفاصيل التقنية

### كيف تعمل التحليلات؟
- `useAnalyticsData` يقرأ **مرة واحدة** عند فتح الصفحة:
  - كل users المُنشأين في 30 يوم الأخيرة
  - كل listings المُنشأة في 30 يوم الأخيرة
- يحسب client-side: daily aggregation + Top items + week comparison
- الفترة ثابتة (30 يوم) — قابلة للتعديل لاحقاً

### تكلفة Firestore
لمنصة بـ500 إعلان جديد شهرياً:
- ~1000 reads لكل فتح للصفحة (users + listings)
- Spark plan = 50K reads/يوم → كافٍ تماماً للأدمن

### Recharts size
- ~120KB gzip (مكتبة كبيرة نسبياً)
- محمَّلة dynamically (`next/dynamic` + `ssr:false`)
- لا تؤثر على الـbundle الأولي للصفحات الأخرى

### لماذا One-shot (وليس realtime)؟
- البيانات التاريخية لا تتغيّر فجأة
- onSnapshot على collection كاملة = استماع مستمر = reads مستمرة
- المستخدم يقرأ مرة + يضغط F5 لو يريد تحديث

---

## القيود المعروفة

### لا توجد Heatmaps / Retention / Live users
هذه تتطلب:
- **Heatmaps**: خدمة مدفوعة (Hotjar / Microsoft Clarity)
- **Retention**: Mixpanel / Amplitude (مدفوع)
- **Live users**: Realtime Database + presence (يحتاج Blaze)

### لا توجد لقطات يومية مؤرشفة
الحالي يقرأ Firestore live كل مرة. للمنصات الكبيرة:
- يحتاج Cloud Scheduler يكتب snapshot في `analytics/daily/{YYYY-MM-DD}`
- الـcollection موجود في rules من المرحلة 1، جاهزة للاستخدام لاحقاً
- يحتاج Firebase Blaze plan

### استعلامات composite indexes
استعلام users/listings مع `where("createdAt", ">=", ...)` يحتاج index بسيط. Firestore عادة ينشئه تلقائياً عند أول استعلام. لو رأيتِ خطأ "requires an index"، اضغطي الرابط في الـconsole.

---

## ما الذي اكتمل حتى الآن (المراحل 1-4)

### ✅ المرحلة 1: الأساس
- 5 أدوار + permissions granular
- Layout احترافي (sidebar + topbar + drawer + glassmorphism + dark mode)
- Dashboard أساسية

### ✅ المرحلة 2: إدارة المستخدمين
- Ban/Unban + Verify + Soft delete + Role assignment
- 5 API routes آمنة
- صفحة قائمة + تفاصيل
- Activity logs server-side

### ✅ المرحلة 3: Moderation
- نظام بلاغات كامل (إعلانات/تعليقات/مستخدمين)
- 3 صفحات أدمن + إجراءات سريعة
- Banned words system + فلترة client-side
- تكامل في كل النماذج العامة

### ✅ المرحلة 4: التحليلات
- Charts نمو + Top items
- KPIs مع % change
- Activity feed UI
- ملخّص في Dashboard

---

## المراحل المُؤجَّلة (تتطلب موارد إضافية)

### يحتاج Blaze plan
- Scheduled broadcasts (Cloud Scheduler + Functions)
- Daily analytics snapshots
- Automated backup
- Cloud Functions للـheavy aggregation

### يحتاج خدمات مدفوعة
- AI moderation (OpenAI API)
- Heatmaps (Hotjar, ~$32/mo)
- Device fingerprinting (FingerprintJS Pro, ~$200/mo)
- Mixpanel/Amplitude للـretention + funnel

### مراحل ممكنة بـSpark
- **المرحلة 5: CMS + Homepage editor** — صفحات ديناميكية + بنرات
- **المرحلة 6: Feature Flags UI** — تشغيل/إيقاف ميزات من الأدمن
- **مراجعة استقرارية شاملة** — جرد كل ما بُني

أعلميني عند جاهزيتك لما يلي.
