# 🔴 إصلاح الأخطاء الحرجة (403 + next/image 400)

ركّزتُ هذا التسليم على **الأخطاء التي تكسر الموقع الآن**. القصص وصفحة المعارض (تحسينات كبيرة) تحتاج جلسات منفصلة — أشرحها في النهاية بصراحة.

---

## ✅ الخطأ 1: Firestore 403 / permission-denied (RunAggregationQuery)

### السبب الجذري
`hooks/usePlatformStats.ts` كان يعدّ إعلانات بـ`getCountFromServer`:
```js
query(listingsCol, where("category", "==", "سيارات"))           // ❌ بلا status
query(listingsCol, where("category", "in", PARTS_CATEGORIES))   // ❌ بلا status
```
لكن قاعدة `listings` تتطلب `status == "approved"` للقراءة (`listingVisible()`). أي استعلام على listings **بدون** `status==approved` يُرفض كلياً بـ403 — **نفس سبب مشكلة الإعلانات المميزة سابقاً**.

### الإصلاح (`hooks/usePlatformStats.ts`)
أضفتُ `where("status", "==", "approved")` لاستعلامي السيارات وقطع الغيار:
```js
query(listingsCol, where("status","==","approved"), where("category","==","سيارات"))
query(listingsCol, where("status","==","approved"), where("category","in",PARTS_CATEGORIES))
```

### + فهرس مركّب (`firestore.indexes.json`)
أضفتُ فهرس `status + category` (مطلوب للاستعلام المركّب). **يجب نشره**:
```bash
firebase deploy --only firestore:indexes
```

### بخصوص favorites
فحصتُ كل استعلامات favorites:
- `useFavorites`, `profile`, `bottom-nav` → تقرأ `users/{uid}/favorites` (مفضّلات المستخدم نفسه) → **مسموح، لا 403**
- `useOwnerStats` collectionGroup → **لا يُشغّل** (enableFavoritesCount=false افتراضياً، ولا أحد يمرّره true)

فخطأ favorites 403 (لو ظهر) مصدره الأرجح نفس مشكلة count على listings. لم أفتح صلاحيات favorites (قد يكشف من أعجبه ماذا) — الحل الأنظف موجود: `listings.favoritesCount` مخزّن مسبقاً.

---

## ✅ الخطأ 2: next/image 400 على صور Firebase Storage

### السبب المحتمل
`next.config.mjs` كان فيه `remotePatterns` بـhostname فقط بلا `pathname`. في Next 14، غياب `pathname` قد يرفض بعض مسارات Firebase Storage بـ400.

### الإصلاح (`next.config.mjs`)
أضفتُ `pathname` صريحاً:
```js
{ protocol: "https", hostname: "firebasestorage.googleapis.com", pathname: "/v0/b/**" }
{ protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" }
{ protocol: "https", hostname: "storage.googleapis.com", pathname: "/**" }
```

> ⚠️ **صراحة**: لا أستطيع رؤية الروابط الفاشلة فعلياً من بيئتي. لو استمر الخطأ 400 بعد هذا، فالسبب الأرجح **حجم الصور كبير جداً** (next/image يرفض الصور فوق حد معيّن). الحل حينها: ضغط الصور قبل الرفع (جزء من تحسينات لاحقة). أرسلي لي رابط صورة فاشلة من Console وأشخّصه بدقّة.

---

## الملفات المعدّلة (3)

| الملف | التغيير | السطور |
|---|---|---|
| `hooks/usePlatformStats.ts` | + status filter على استعلامي listings | استعلامات count |
| `firestore.indexes.json` | + فهرس status+category | فهرس جديد |
| `next.config.mjs` | + pathname لـremotePatterns | images config |

## النشر

```bash
git add hooks/usePlatformStats.ts firestore.indexes.json next.config.mjs
git commit -m "fix: Firestore 403 on stats count + next/image 400"
git push
firebase deploy --only firestore:indexes   # نشر الفهرس الجديد
```

---

## 📋 نتائج Build / TypeScript / ESLint — بصراحة

**لا أستطيع تشغيلها فعلياً** (بيئتي بلا شبكة/تبعيات). لن أدّعي "Build نجح". ما تحققتُ منه يدوياً:
- ✅ الملفات الثلاثة متوازنة (أقواس/أقواس معقوفة)
- ✅ JSON الفهارس صالح
- ✅ usePlatformStats: status مضاف للاستعلامين
- ✅ لم أكسر منطق count الموجود (users count يبقى كما هو)

**الاختبار الحقيقي عند رفعك + نشر الفهرس.** راقبي Console.

---

## ⚠️ القصص وصفحة المعارض — صراحة كاملة

طلبك يشمل أيضاً:
1. **إصلاح/تحسين نظام القصص** (preload، cache، تشغيل فيديو، أداء)
2. **صفحة معارض احترافية كاملة** (logo، cover، gallery، قصص معارض، رفع صور مع ضغط/قص، فلترة...)

**هذا عمل ضخم جداً** — عدة جلسات لكل منهما. صفحة المعارض وحدها = نظام رفع صور + ضغط + قص + قصص + تصميم كامل. لا يمكن تسليمها مع إصلاح الأخطاء في رسالة واحدة بجودة إنتاج دون كسر شيء.

**اقتراحي**: 
1. ارفعي إصلاح الأخطاء الحرجة أولاً (هذا التسليم) — يوقف الأعطال.
2. ثم نأخذ **القصص** كجلسة كاملة (تشخيص + إصلاح تدريجي).
3. ثم **صفحة المعارض** كجلسة (أو أكثر) — نبنيها مرحلة مرحلة كما فعلنا مع نظام الأقسام.

هذا النهج التدريجي هو ما نجح معنا طوال المشروع. أخبريني بأيّها نبدأ بعد رفع الإصلاحات.
