# المرحلة 1: تحسين الواجهة الرئيسية + بطاقات الإعلان

تنفيذ احترافي للأولويات الرئيسية في document. التحقق بـ `tsc --noEmit` → **0 أخطاء**.

## الملفات المعدَّلة (4 ملفات)

```
components/listing-card.tsx       ← بطاقة جديدة احترافية
components/hero.tsx               ← Hero بـ بحث + chips
components/category-grid.tsx      ← شبكة موحَّدة لكل المقاسات
components/listings-grid.tsx      ← skeletons + grid أنظف
```

## التطبيق

```bash
unzip homepage-pro.zip
git add components/
git commit -m "feat(home): pro homepage redesign + cleaner listing cards"
git push
```

---

## نقاط الضعف التي تم إصلاحها

### 1. `listing-card.tsx` — بطاقة الإعلان

| قبل | بعد |
|---|---|
| 11 زر إجمالي (4 إجراءات + 4 أيقونات + 3 تواصل) | 6 أزرار فقط (4 تفاعل + 2 تواصل) |
| سعر داخلي مع باقي المعلومات | سعر بارز فوق الصورة بكبسولة brand |
| نفس وزن لكل المعلومات | هرمية بصرية (سعر → عنوان → تفاصيل → أزرار) |
| أزرار اتصال بـ 3 أعمدة (التفاصيل/اتصال/واتساب) | عمودان فقط (اتصال + واتساب) - البطاقة كلها رابط |
| Heart + Like منفصلان فوق الصورة (تشتيت) | زر مفضلة واحد فوق الصورة |
| الوزن: 150 سطر | 175 سطر مع تعليقات + هيكل أنظف |

### 2. `hero.tsx` — Hero الصفحة الرئيسية

| قبل | بعد |
|---|---|
| `dashboardStats` مزيّف (أرقام لا تتغيّر) | حذف stats — لا أرقام كاذبة |
| البحث في header فقط (المستخدم لا يلاحظه) | شريط بحث رئيسي بارز في الـ Hero |
| لا توجد طريقة سريعة للوصول للأقسام | chips للأقسام الرئيسية مباشرة تحت البحث |
| نص طويل سرد دعائي | نص مختصر مع قيمة مباشرة |
| zوايا decoration ثابتة | blob خلفي + animation subtle |

### 3. `category-grid.tsx` — شبكة الأقسام

| قبل | بعد |
|---|---|
| chips على الموبايل، cards فقط على الديسكتوب (تجربتان مختلفتان) | grid موحَّد على كل المقاسات |
| 2 columns على الديسكتوب فقط | 3 → 4 → 8 columns حسب العرض |
| `marketplaceSections` معقد بـ accent colors | تصميم بسيط نظيف بأيقونة + اسم |

### 4. `listings-grid.tsx`

| قبل | بعد |
|---|---|
| Skeleton مجرّد aspect-ratio (لا يحاكي البطاقة) | Skeleton كامل يطابق هيكل البطاقة الفعلي |
| 1 column على الجوال (يتطلب scroll طويل) | 2 columns من الجوال (نفس Facebook Marketplace) |
| عنوان عادي | أيقونة Sparkles لتمييز "أحدث" |

---

## القرارات التصميمية

### السعر فوق الصورة
استلهمت من Cars.com / AutoTrader / موزجيك: السعر هو **القرار الأهم** عند تصفّح إعلان سيارة. وضعه فوق الصورة بكبسولة brand-700 يجعله ينقفز بصرياً.

### حذف الـ stats المزيّفة
كانت dashboardStats تعرض أرقاماً ثابتة من ملف بدون اتصال بـ Firestore. هذا يفقد ثقة المستخدم. الأفضل: لا أرقام، أو أرقام حقيقية live (يمكن إضافتها لاحقاً عبر `useStats()` hook منفصل).

### 2 columns على الموبايل
- 1 column = scroll طويل، تشتيت
- 2 columns = نظرة سريعة على 4 إعلانات في الـ fold = قرار أسرع
- Facebook Marketplace, IG Shop, Carfax كلها 2-cols mobile

### chips للأقسام في Hero
المستخدم على الجوال يحتاج إجراءً بنقرة واحدة. التصنيف الواحد يفتح صفحة `/listings?category=cars`. هذا يقصر مسار الوصول من 3 خطوات إلى 1.

---

## الملفات التي **لم** تُعدَّل (محفوظة كما هي)

- `components/site-header.tsx` — يبقى كما هو (موضوع المرحلة الثانية)
- `components/bottom-nav.tsx` — تم تحسينه في المرحلة السابقة
- `app/page.tsx` — يبقى كما هو (لا تغيير في الترتيب)
- `tailwind.config.ts` و `globals.css` — لا حاجة لتغيير
- بطاقات Stories / Categories الفرعية — لم تُمَس

---

## الخطوة التالية المقترحة

**المرحلة 2:**
1. تحسين `site-header.tsx` (تقليل الازدحام)
2. تحسين `app/(public)/listings/[id]/page.tsx` (صفحة التفاصيل = أهم صفحة)
3. مراجعة `image-gallery.tsx` على الجوال (سحب أفضل)

**المرحلة 3:**
4. توحيد القوائم العمودية في `app/(public)/profile/page.tsx`
5. تنظيف `app/(public)/messages/page.tsx`
6. مراجعة `add-listing` (form طويل يحتاج steps)

---

## التحقق

```
✓ tsc --noEmit                → 0 أخطاء
✓ هوية براتشو محفوظة          → brand-700 + action-500 + ink
✓ RTL يعمل                    → نعم (flex-row + Arabic numerals)
✓ موبايل first                → grid-cols-2/3 على الجوال
✓ لا تبعيات جديدة              → لا
✓ لا كسر للميزات الموجودة      → ListingActionsBar محفوظ
✓ أداء                        → memo + skeleton أنظف + priority على أول 2
```
