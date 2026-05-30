# Phase 5 Integration — ربط Homepage Config بالصفحة الرئيسية

هذا الـzip يُكمل ما تبقّى من المرحلة 5: تطبيق إعدادات `/admin/content/homepage` على الصفحة الرئيسية العامة `/` فعلياً.

## ما يتغيّر بعد النشر

**قبل:**
- الأدمن يحرّر البنرات/الأقسام/الإعلانات المميَّزة في اللوحة ✅
- التغييرات تُحفظ في Firestore ✅
- **لكن الصفحة الرئيسية لا تقرأها** ❌

**بعد:**
- الصفحة الرئيسية تقرأ `homepageConfig/main` تلقائياً ✅
- البنرات المضافة تظهر كـcarousel ✅
- ترتيب الأقسام يتبع `sectionsOrder` ✅
- الأقسام المُخفاة (`enabledSections`) لا تظهر ✅
- الإعلانات المميَّزة المختارة يدوياً تأخذ أولوية على الـauto mode ✅

---

## الملفات (4)

### جديد
- `hooks/use-public-homepage-config.ts` — قراءة الـconfig مع cache
- `components/homepage-banners-carousel.tsx` — Carousel للبنرات

### معدَّل
- `app/page.tsx` — الصفحة الرئيسية الديناميكية
- `components/featured-listings-section.tsx` — يدعم `manualIds`

---

## خطوات النشر

```bash
git add .
git commit -m "feat(home): integrate homepageConfig with public homepage"
git push
```

**لا تعديل على:**
- Firestore rules (مستخدمة من المرحلة 5)
- Storage rules (مستخدمة من المرحلة 5)
- package.json (لا dependencies جديدة)

---

## الاختبار بعد النشر

### اختبار 1: البنرات تظهر فعلياً
1. كأدمن، أضيفي بنراً في `/admin/content/homepage` → tab البنرات
2. تأكدي أن `active=true`
3. افتحي `/` (الصفحة الرئيسية)
4. ✅ يجب أن ترين البنر كـcarousel أسفل Hero (أو حسب ترتيب sectionsOrder)

### اختبار 2: إخفاء قسم
1. كأدمن، tab "ترتيب الأقسام"
2. أخفي قسم "البنرات" (اضغطي العين)
3. حدّثي الصفحة الرئيسية
4. ✅ البنرات تختفي تماماً

### اختبار 3: إعادة ترتيب
1. كأدمن، ارفعي "إعلانات مميَّزة" لأعلى ترتيب
2. حدّثي الصفحة الرئيسية
3. ✅ يجب أن تظهر "إعلانات مميَّزة" قبل "أحدث الإعلانات"

### اختبار 4: Featured manual
1. كأدمن، tab "إعلانات مميَّزة"
2. أضيفي 3 IDs محدّدة (من إعلانات موجودة معتمدة)
3. حدّثي الصفحة الرئيسية
4. ✅ قسم "إعلانات مميَّزة" يعرض هذه الـ3 بالضبط بنفس الترتيب
5. (في غياب manualIds، يعمل الوضع التلقائي القديم - featured=true)

### اختبار 5: Cache
- بعد فتح الصفحة الرئيسية، التغييرات من الأدمن تظهر بعد ~2 دقيقة
  (cache TTL) أو عند مسح sessionStorage / hard refresh
- هذا متعمَّد لتقليل reads على Firestore

---

## ملاحظات تقنية

### Cache strategy
- `sessionStorage` key `bratsho:homepage-config:v1`
- TTL = 2 دقيقة
- يُمسح تلقائياً عند إغلاق التاب
- بعد تعديل الأدمن، الزائر القادم يرى التغيير خلال 2 دقيقة كحد أقصى

### الأقسام الثابتة
هذه ليست ديناميكية (تظهر دائماً):
- StoriesRow + Hero (في الأعلى)
- VerifiedDealersRow (يخفي نفسه عند عدم وجود معارض موثَّقة)
- CTASection + SiteFooter (في الأسفل)

### Mapping للأقسام
الـkey في `HOMEPAGE_SECTIONS` يطابق component كالتالي:

| key | يرسم |
|---|---|
| banners | HomepageBannersCarousel |
| featured | FeaturedListingsSection (مع manualIds لو موجودة) |
| newest | ListingsGrid (أحدث الإعلانات) |
| categories | CategoryGrid |
| tow | TowTrucksCTA |
| services | BrowseByBrand (شريط الماركات حالياً) |

### Firestore reads
- 1 read للـconfig + N للبنرات النشطة → ~5 reads per visitor (أول مرة)
- مع cache: 0 reads خلال 2 دقيقة
- لمنصة بـ1000 زائر/يوم: ~5000 reads/يوم → ضمن Spark plan

### وضع الـmanualIds
- لو الأدمن وضع IDs → يستخدمها (max 30 لقيود Firestore `in`)
- الترتيب يتبع ترتيب الأدمن (الأول = الأول)
- لو لم يضع شيئاً → يُستخدم المنطق التلقائي القديم (featured=true)
- نُسقط أي إعلان مؤرشف/مرفوض حتى لو الأدمن وضعه

---

## مكتمل الآن

| المرحلة | الحالة |
|---|---|
| 1. الأساس | ✅ |
| 2. إدارة المستخدمين | ✅ |
| 3. Moderation + Banned Words | ✅ |
| 4. Analytics + Charts | ✅ |
| 5. CMS + Homepage Editor | ✅ |
| **5. Integration** | ✅ (هذه الجولة) |

النظام مكتمل وظيفياً. ما يمكن بعد ذلك:
- **مراجعة استقرارية** — جرد كل ما بُني + اختبار end-to-end
- **Feature Flags UI** — collection موجود من المرحلة 1
- **مراحل Blaze** — Scheduled broadcasts، AI moderation، إلخ
