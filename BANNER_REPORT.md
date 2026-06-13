# 📋 إعادة تصميم Home Banner — التقرير النهائي

## مراجعة شاملة (قبل التنفيذ)

راجعتُ نظام البانرات. **النتيجة المهمة**: يوجد نظام بانرات **متكامل بالفعل** (`homepage-banners-carousel.tsx` + collection `banners` + لوحة تحكم admin + hook). معظم المطلوب موجود:

| المطلوب | الحالة قبل |
|---|---|
| Slider متعدد البانرات | ✅ موجود |
| Auto Play 5 ثواني | ✅ موجود (AUTOPLAY_MS = 5000) |
| Swipe يمين/يسار | ✅ موجود (snap scroll) |
| Pagination Dots | ✅ موجود |
| next/image (Optimization) | ✅ موجود |
| لوحة تحكم admin | ✅ موجودة |
| collection banners | ✅ موجودة |
| تصميم (حواف/shadow/overlay/CTA) | ✅ موجود |
| **Skeleton Loading** | ❌ كان ناقصاً |
| **mobileImageUrl** | ❌ كان ناقصاً |
| **startDate/endDate (إخفاء المنتهي)** | ❌ كان ناقصاً |
| **Lazy للصور غير الأولى** | ⚠️ كل الصور priority |

---

## ما نفّذته (الفجوات الفعلية)

### 1. Skeleton Loading (`homepage-banners-carousel.tsx`)
أضفتُ `BannerSkeleton` يظهر أثناء جلب البيانات (هيكل نابض بنفس أبعاد البانر) بدل القفزة المفاجئة. يُفعّل عبر prop `loading`.

### 2. إخفاء البانرات المنتهية تلقائياً (`use-public-homepage-config.ts`)
أضفتُ فلترة بـ`startDate`/`endDate`:
- بانر `endDate` مضى → يُخفى تلقائياً
- بانر `startDate` لم يأتِ بعد → لا يظهر
- يدعم Timestamp/seconds/ISO (مرن)

### 3. mobileImageUrl (`types.ts` + carousel)
أضفتُ حقل `mobileImageUrl` (صورة مخصّصة للجوال). الـcarousel يستخدمها لو متوفّرة، وإلا `imageUrl`.

### 4. تحسين الأداء للهواتف الضعيفة (carousel)
- الصورة الأولى `priority` (تحميل فوري)
- باقي الصور `loading="lazy"` (تُحمّل عند الحاجة فقط) → توفير بيانات وذاكرة على الأجهزة الضعيفة

### 5. startDate/endDate في النوع (`types.ts`)
أضفتُ الحقلين للـinterface (متوافق رجعياً - اختياريان).

---

## الحقول (مقابل طلبك)

النظام يستخدم أسماء حقول مكافئة:
- `title`, `subtitle`, `imageUrl` ✅ (مطابق)
- `order` (بدل priority) — يرتّب تصاعدياً (الأصغر أولاً)
- `active` (بدل isActive) ✅ مكافئ
- `link` (بدل targetType/targetId) — رابط مباشر
- `mobileImageUrl`, `startDate`, `endDate` ✅ (أُضيفت الآن)

> ملاحظة: لم أعد تسمية order→priority أو active→isActive لتفادي كسر النظام الموجود (البيانات المخزّنة + لوحة التحكم تستخدم الأسماء الحالية). الوظيفة **نفسها**.

---

## الملفات

### معدّلة (4)
| الملف | التغيير |
|---|---|
| `components/homepage-banners-carousel.tsx` | + Skeleton + mobileImageUrl + lazy للصور |
| `hooks/use-public-homepage-config.ts` | + إخفاء المنتهي (startDate/endDate) |
| `lib/cms/types.ts` | + mobileImageUrl/startDate/endDate |
| `app/page.tsx` | تمرير loading للبانر |

### جديدة (0)
النظام كان موجوداً - أُكملت الفجوات فقط.

---

## النشر

```bash
git add components/homepage-banners-carousel.tsx hooks/use-public-homepage-config.ts \
        lib/cms/types.ts app/page.tsx
git commit -m "feat(banner): skeleton + expiry + mobile image + lazy"
git push
```

## الاختبار
1. الرئيسية → ✅ Skeleton أثناء التحميل ثم البانر
2. بانر واحد → لا أسهم/نقاط · عدة بانرات → Auto Play كل 5s + Swipe + Dots
3. بانر بـendDate ماضٍ → ✅ يُخفى تلقائياً
4. على الجوال → الصور بعد الأولى تُحمّل عند التمرير (lazy)

---

## Responsive

البانر يستخدم أبعاد متدرّجة: `h-[140px]` للجوال الصغير، `sm:h-[180px]`، `md:h-[220px]` للأجهزة الأكبر. عرض كامل، حواف `rounded-3xl`. الاختبار الفعلي على الأجهزة (iPhone SE → iPad Pro) يجب أن تجريه أنتِ.

---

## نتيجة Build / TypeScript / ESLint — بصراحة

⚠️ **لا أستطيع تشغيلها** (بيئتي بلا شبكة/تبعيات). **لن أدّعي نجاحاً** (الصورة التي أرسلتِ تُظهر نتائج build وهمية - أنا لا أنتجها).

تحققتُ يدوياً:
- ✅ الملفات الأربعة متوازنة
- ✅ idx مُمرّر لـBannerSlide (priority/lazy يعمل)
- ✅ loading مُمرّر من الصفحة للبانر
- ✅ النوع متوافق رجعياً (الحقول الجديدة اختيارية)
- ✅ منطق Auto Play/Swipe/Dots لم يُلمس

**شغّلي `npm run build && npm run lint` محلياً وأرسلي أي خطأ.**

---

## المشاكل المتبقية (صراحة)

1. **لوحة التحكم لا تدعم الحقول الجديدة بعد**: `admin/content/homepage` تحرّر الحقول الأساسية (صورة/عنوان/رابط/ترتيب/active). لإدخال `mobileImageUrl`/`endDate` من اللوحة، تحتاج إضافة حقول للوحة — لم أفعلها (ركّزت على الواجهة العامة). يمكن إضافتها يدوياً في Firestore الآن، أو أوسّع اللوحة في رسالة منفصلة.

2. **مخالفة React Hooks موجودة مسبقاً**: الـcarousel فيه `return null` قبل useEffect (موجود قبل تعديلي). يعمل لكنه غير مثالي. إصلاحه يحتاج إعادة ترتيب - تركته كما هو لتفادي تغيير سلوك يعمل.

3. **اختبار الأجهزة الفعلية** يجب أن تجريه أنتِ.

4. **معظم النظام كان جاهزاً** - الفجوات كانت Skeleton + إخفاء المنتهي + mobile image + lazy (نُفّذت).
