# 🔧 إصلاح خطأ بناء صفحات المدن (Timestamp serialization)

## المشكلة

```
Error occurred prerendering page "/cars/tripoli"
Error: Only plain objects, and a few built-ins, can be passed to
Client Components from Server Components.
  at Object.toJSON ... /cars/tripoli
```

**السبب**: صفحة المدن (Server Component) تجلب الإعلانات من Firestore، والإعلانات تحوي حقول `Timestamp` (مثل `createdAt`, `boostedUntil`). الـTimestamp **ليس plain object**، فلا يمكن تمريره إلى `ListingCard` (Client Component).

## الحل

أضفتُ دالة `toPlainListing` تحوّل كل Firestore Timestamp إلى **رقم millis** قبل تمرير الإعلان للكارت. كما جعلتُ `timeAgo` تقبل الأرقام/التواريخ (ليعرض الوقت بشكل صحيح بعد التحويل).

## الملفات المعدّلة (2)

| الملف | التغيير |
|---|---|
| `app/(public)/cars/[city]/page.tsx` | `toPlainListing` serializer + `dynamicParams` |
| `lib/utils.ts` | `timeAgo` يقبل Timestamp/number/Date (متوافق مع القديم) |

> **ملاحظة**: هذا الإصلاح **مكمّل** لـ`brao-seo-launch.zip`. ارفعي هذين الملفين فوقه.

## النشر

```bash
git add "app/(public)/cars/[city]/page.tsx" lib/utils.ts
git commit -m "fix: serialize Firestore Timestamps for city pages"
git push
```

## لماذا `timeAgo` تغيّرت؟

كانت تقبل `Timestamp` فقط (تستدعي `.toDate()`). بعد التحويل لـmillis، صارت تستقبل رقماً. حدّثتُها لتقبل الاثنين + Date + `{seconds}` — **متوافقة تماماً مع كل الاستخدامات القديمة** (الـTimestamp ما زال يعمل).

## الاختبار

1. ارفعي الملفين
2. انتظري build على Vercel → ✅ يجب أن ينجح
3. افتحي `/cars/tripoli` → ✅ إعلانات طرابلس بأوقات صحيحة
4. باقي المدن: benghazi / misrata / sebha / zawiya

## ملاحظة عن sitemap

`sitemap.ts` يستخدم `.toDate()` على Timestamps أيضاً — لكنه **server-only** (لا يمرّر شيئاً لـclient)، فلا يتأثر بهذا الخطأ ويعمل بشكل سليم.
