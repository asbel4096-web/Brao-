# 🧩 نظام الأقسام الديناميكي — المرحلة 2: النموذج الديناميكي

## ما بُني

### `components/categories/dynamic-fields.tsx` (جديد)
مكوّن `DynamicFields` يرسم **الحقول الدقيقة لكل قسم** اعتماداً على `getCategoryConfig` (من المرحلة 1):

| القسم | الحقول التي تظهر |
|---|---|
| **سيارات** | عنوان، ماركة، موديل، سنة، محرك، ناقل، وقود، مسافة، سعر، مدينة، هاتف |
| **قطع غيار** | اسم القطعة، الحالة (جديد/مستعمل)، السيارة المتوافقة، سعر، مدينة، هاتف |
| **سطحة** | اسم الخدمة، مناطق التغطية، متاح الآن (toggle)، سعر، مدينة، هاتف |
| **ورش/خدمات** | اسم الورشة، وصف، تقييم (نجوم)، مدينة، هاتف |

يدعم كل أنواع الحقول: text / number / price (مع د.ل) / textarea / select / city / brand / year / phone / toggle / rating.

### مزايا
- **Controlled component** — يأخذ `values` + `onChange` + `onToggle`، فيُدمج بسهولة في أي نموذج.
- أسماء المفاتيح تطابق حقول Listing في Firestore → **لا يتغيّر التخزين**.
- يستخدم ثوابت المشروع الحقيقية (`fuelTypes`, `transmissionTypes`, `libyaCities`, `CAR_BRANDS`).
- لا يلمس Firebase ولا الحفظ — طبقة عرض فقط.

---

## ✅ آمن: لا يكسر شيئاً

المكوّن **جديد ومستقل، لا يُستورد من أي مكان بعد**. رفعه لا يؤثر على صفحة add-listing الحالية (تبقى تعمل كما هي). تتبنّينه متى شئتِ.

---

## كيف يُدمج (اختياري - عند الجاهزية)

في `app/(public)/add-listing/page.tsx`، يمكن استبدال الحقول المرسومة يدوياً بـ:

```tsx
import { DynamicFields } from "@/components/categories/dynamic-fields";

// داخل خطوة المعلومات:
<DynamicFields
  category={form.category}
  values={form as Record<string, unknown>}
  onChange={(k, v) => set(k as keyof FormState, v)}
  onToggle={(k, v) => setBool(k as keyof FormState, v)}
  skipKeys={["title", "category"]}  // المُدارة في مكان آخر
/>
```

> **لا تدمجيه دفعة واحدة على الإنتاج.** جرّبيه أولاً، وأنا أساعدك في الإدماج التدريجي في مرحلة لاحقة بعد التأكد أن الحفظ يعمل.

---

## الملف الجديد (1)

`components/categories/dynamic-fields.tsx`

## النشر

```bash
git add components/categories/dynamic-fields.tsx
git commit -m "feat(phase2): dynamic fields renderer per category"
git push
```

> الرفع آمن — المكوّن غير مستخدم بعد، فلن يؤثر على أي صفحة. (يعتمد على ملفي المرحلة 1، فتأكدي أنهما مرفوعان.)

---

## 🔜 المرحلة 3 القادمة: البطاقات الديناميكية

`CarCard`, `PartsCard`, `ServiceCard`, `TowTruckCard`... كل قسم ببطاقته + قاعدة "لا تعرض حقلاً فارغاً" (لا N/A، لا undefined).

ثم المرحلة 4 (أقسام الرئيسية المنفصلة)، والمرحلة 5 (الإدماج الفعلي للنموذج في add-listing).

---

## ملاحظة صريحة

لم أشغّل `tsc`/build فعلياً (بيئتي بلا شبكة). تحققتُ يدوياً: الأقواس متوازنة ✅، كل الاستيرادات موجودة (`getCategoryConfig`, `fuelTypes`, `transmissionTypes`, `libyaCities`, `CAR_BRANDS` بحقلي id/nameAr) ✅، لا `any` (عدا `Record<string, unknown>` الآمن) ✅. المعاينة (preview.png) تؤكّد رسم الحقول الصحيحة لكل قسم. لو ظهر خطأ build، أرسليه.
