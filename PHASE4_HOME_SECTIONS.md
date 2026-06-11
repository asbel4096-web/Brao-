# 🏠 نظام الأقسام الديناميكي — المرحلة 4: أقسام الرئيسية المنفصلة

> **تصحيح مصطلح**: "الساحبات" (وليس السطحات). صُحّح في كل الملفات (العناوين + الشارات).

## ما بُني

### `components/home-sections/latest-by-bucket.tsx` (جديد)
بدل قسم واحد موحّد ("أحدث الإعلانات")، أقسام **منفصلة لكل نوع**:

| المكوّن | العنوان | الفئات |
|---|---|---|
| `<LatestCars />` | أحدث السيارات | سيارات/حافلات/شاحنات |
| `<LatestParts />` | أحدث قطع الغيار | كل أقسام قطع الغيار + كماليات + زيوت + إطارات |
| `<LatestServices />` | أحدث خدمات الصيانة | ميكانيكي/سمكرة/ورش/كهرباء |
| `<LatestTowTrucks />` | أحدث الساحبات | ساحبة سيارات |

كلها تستخدم `<DynamicListingCard />` (المرحلة 3) فتظهر حقول كل قسم تلقائياً.

### المزايا
- **Auto Mapping**: الفئات تأتي من `categoryNamesForBucket` (المرحلة 1) → أي قسم جديد يظهر تلقائياً في دلوه.
- **status==approved** في الاستعلام (مطلوب من القواعد - نفس درس المميزة).
- يختفي تماماً لو لا عناصر (`return null`).
- Skeleton + كاش جلسة (3 دقائق) لكل دلو.
- لا فهرس مركّب جديد (يقرأ مجموعة بـorderBy createdAt ثم يفلتر الدلو client-side).

---

## كيف يُدمج في الرئيسية

في `app/page.tsx`، استبدلي قسم `<ListingsGrid />` الموحّد بالأقسام المنفصلة:

```tsx
import {
  LatestCars,
  LatestParts,
  LatestServices,
  LatestTowTrucks,
} from "@/components/home-sections/latest-by-bucket";

// بدل: <ListingsGrid />
{mounted && <LatestCars />}
{mounted && <LatestParts />}
{mounted && <LatestServices />}
{mounted && <LatestTowTrucks />}
```

الترتيب المطلوب من المخطط:
```
... المميزة → أحدث السيارات → أحدث قطع الغيار →
أحدث خدمات الصيانة → أحدث الساحبات → الأكثر مشاهدة → ...
```

> يمكنك إبقاء `ListingsGrid` مؤقتاً والإضافة بجانبه للتجربة، ثم استبداله.

---

## ⚠️ ملاحظة أداء صريحة

كل قسم "أحدث X" يقرأ ~60 مستنداً ثم يفلتر. مع 4 أقسام = حتى 240 قراءة عند أول تحميل (ثم الكاش يخفّضها لـ0 لمدة 3 دقائق).

هذا مقبول للإطلاق، لكن لو نما حجم البيانات كثيراً، التحسين الأمثل لاحقاً: فهرس مركّب `category + status + createdAt` لكل دلو واستعلام `where(category in [...])` مباشرة (أدق لكن يتطلب فهارس). أخبريني لو رغبتِ في ذلك.

---

## الملف الجديد (1)

`components/home-sections/latest-by-bucket.tsx` (يصدّر LatestByBucket + 4 مكوّنات جاهزة)

## النشر

```bash
git add components/home-sections/latest-by-bucket.tsx
# + تعديل app/page.tsx للإدماج (اختياري الآن)
git commit -m "feat(phase4): separate latest-by-category home sections"
git push
```

> يعتمد على ملفات المراحل 1+3. تأكدي أنها مرفوعة.

---

## 🔜 المرحلة 5 (الأخيرة): الإدماج الفعلي

- إدماج `DynamicFields` في صفحة add-listing (استبدال الحقول اليدوية)
- إدماج الأقسام المنفصلة في app/page.tsx فعلياً
- اختبار شامل أن الحفظ + العرض يعملان معاً

هذه المرحلة تمسّ صفحة الحفظ، فسأنفّذها بحذر شديد مع اختبار كل خطوة.

---

## ملاحظة صريحة

لم أشغّل `tsc`/build فعلياً (بيئتي بلا شبكة). تحققتُ يدوياً: الأقواس متوازنة ✅، الاستيرادات صحيحة (DynamicListingCard، categoryNamesForBucket، HomeBucket موجودة) ✅، status==approved في الاستعلام ✅، لا `any` (عدا `as any` على بيانات Firestore الديناميكية). المعاينة (preview-sections.png) تؤكّد 4 أقسام منفصلة بشاراتها الصحيحة (بما فيها "ساحبة"). لو ظهر خطأ build، أرسليه.
