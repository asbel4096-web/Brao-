# 🔧 إصلاح خطأ البناء - مراجع "bump" المتبقية

## المشكلة

بعد إعادة تشكيل نظام Boost (إزالة `bump` من `BoostServiceKey`)، بقي ملفان يستخدمان `serviceKey === "bump"` — وهذا أصبح **خطأ نوع** (TypeScript):

```
./app/api/admin/boosts/[listingId]/grant/route.ts:76:11
Type error: This comparison appears to be unintentional because
the types 'BoostServiceKey' and '"bump"' have no overlap.
```

السبب: `bump` لم يعد ضمن الباقات الثلاث الجديدة (مميز/ممول/VIP).

## الحل

أصلحتُ الملفين:

### 1. `app/api/admin/boosts/[listingId]/grant/route.ts`
- أزلتُ فرع `bump`
- أضفتُ فرع `vip` (يكتب `vipUntil` + featured للصفحة الرئيسية)
- الآن يدعم منح الأدمن للباقات الثلاث: مميز/ممول/VIP مجاناً

### 2. `app/api/wallet/boost/purchase/route.ts`
- أزلتُ فرع `bump` الميت (كان سيسبّب نفس الخطأ)
- حدّثتُ التعليقات

## الملفات (2)

| الملف | التغيير |
|---|---|
| `app/api/admin/boosts/[listingId]/grant/route.ts` | bump → vip |
| `app/api/wallet/boost/purchase/route.ts` | إزالة bump الميت |

> **ملاحظة**: هذا الإصلاح **مكمّل** لـ`brao-boost-tiers.zip`. لو رفعتِ ذلك الـzip، ارفعي هذين الملفين فوقه.

## النشر

```bash
git add "app/api/admin/boosts/[listingId]/grant/route.ts" \
        "app/api/wallet/boost/purchase/route.ts"
git commit -m "fix: remove dead bump branch, add vip to boost grant/purchase"
git push
```

## ملاحظات

- الأيقونة `Flame` ما زالت مستخدمة في `admin/boosts/page.tsx` و`boost-button.tsx` — **لا تكسر البناء** (مجرد أيقونة)، لكن لو أردتِ توحيد الشكل لاحقاً يمكن تبديلها بـ`Star`.
- بعد هذا الإصلاح، يجب أن يكتمل البناء بنجاح ✅.

## الاختبار

1. ارفعي الملفين
2. انتظري build على Vercel
3. ✅ يجب أن ينجح البناء (لا مزيد من خطأ "bump")
