# تحسينات قسم الأقسام — Bratsho Car

تنفيذ كامل لمتطلبات تحسين الأقسام داخل المشروع الحالي.

## الملفات في الـ zip

```
lib/
└── categories.ts                       ← مُحدَّث (إضافة helpers)

components/
└── category-grid.tsx                   ← مُحدَّث (روابط slug + /categories)

app/(public)/
├── categories/
│   └── page.tsx                        ← جديد (صفحة كل الأقسام)
└── listings/
    └── page.tsx                        ← مُحدَّث (يقرأ slug من URL)
```

## التطبيق

```bash
# في جذر المشروع
unzip categories-improvements.zip

# الملفات ستوضع في مساراتها الصحيحة تلقائياً
git add lib/ components/ app/
git commit -m "feat: dedicated categories page with slug-based URL filtering"
git push
```

Vercel سيعيد النشر تلقائياً. لا حاجة لتعديل قواعد Firestore أو متغيرات البيئة، ولا تحتاج تثبيت أي مكتبة جديدة.

---

## شرح كل تغيير

### 1) `lib/categories.ts` — إضافة helpers لحل الـ slug

أضفت دالتين جديدتين:

```ts
resolveCategoryName(value)  // من "cars" أو "سيارات" → "سيارات"
resolveCategorySlug(name)   // من "سيارات" → "cars"
```

**لماذا؟** الإعلانات في Firestore مخزّنة بالاسم العربي (`category: "سيارات"`)، لكن المتطلب يستخدم URL بـ slug إنجليزي (`?category=cars`). هذه الدوال تُترجم بين الاثنين دون كسر البيانات الموجودة.

**لم أحذف أو أغيّر أي قسم** — فقط أضفت helpers. كل البيانات الموجودة تبقى تعمل.

### 2) `components/category-grid.tsx` — روابط slug + زر "عرض الكل" → `/categories`

**التغييرات:**
- زر **"عرض الكل ←"** يذهب إلى `/categories` بدلاً من `/listings`.
- كل رابط قسم (في الـ chips على الجوال وفي البطاقات على التابلت/الكمبيوتر) يستخدم slug الإنجليزي بدلاً من الاسم العربي:
  ```tsx
  // قبل
  href={`/listings?category=${encodeURIComponent(item.name)}`}
  // بعد
  href={`/listings?category=${item.slug}`}
  ```
- النتيجة: روابط نظيفة ومقروءة (`/listings?category=cars` بدلاً من `/listings?category=%D8%B3%D9%8A%D8%A7%D8%B1%D8%A7%D8%AA`).

### 3) `app/(public)/categories/page.tsx` — جديد

صفحة مستقلة تعرض **كل الأقسام مجتمعة** مقسّمة حسب المجموعات الأربع (مركبات، قطع غيار، خدمات، خاصة).

**التخطيط حسب المتطلبات:**
- 📱 **الجوال**: عمود واحد (`grid-cols-1`).
- 📱 **التابلت**: عمودان (`sm:grid-cols-2`).
- 💻 **الكمبيوتر**: 3 أعمدة (`lg:grid-cols-3`) — كما طلبت بالضبط.

**التصميم:**
- كل قسم بطاقة تفاعلية بأيقونة دائرية، اسم القسم، ووصف فرعي + سهم متحرك عند hover.
- رؤوس مجموعات بـ gradient ألوان الهوية (`from-brand-700 to-brand-500` للمركبات، `action` لقطع الغيار، إلخ).
- CTA في الأسفل يقود إلى `/listings`.
- RTL وداكن (dark mode) مدعومان.

**كل بطاقة قابلة للضغط** وتذهب إلى `/listings?category={slug}`.

### 4) `app/(public)/listings/page.tsx` — قبول slug في URL وفلترة فعلية

**التغيير الجوهري:**

```tsx
// قبل
const cat0 = params.get("category") || "";
// أي إذا جاء URL بـ ?category=cars، الفلتر يبحث عن listing.category === "cars"
// لكن الإعلانات مخزّنة بالاسم العربي → 0 نتائج ❌

// بعد
const catRaw = params.get("category") || "";
const cat0 = resolveCategoryName(catRaw);
// إذا جاء "cars" → يصبح "سيارات" → الفلتر يطابق الإعلانات ✅
// إذا جاء "سيارات" مباشرة → يبقى "سيارات" → يعمل أيضاً ✅
```

**عند تطبيق فلتر من واجهة المستخدم:**

```tsx
// قبل: يحفظ الاسم العربي في URL
sp.set("category", category);

// بعد: يحوّل للـ slug للحصول على URL نظيف
const slug = resolveCategorySlug(category);
sp.set("category", slug || category);
```

**النتيجة:**
- ✅ `/listings?category=cars` → فلترة فعلية لكل السيارات
- ✅ `/listings?category=car-parts` → فلترة فعلية لقطع غيار السيارات
- ✅ `/listings?category=trucks` → فلترة فعلية للشاحنات
- ✅ نفس الشيء لكل الأقسام الـ 16
- ✅ إذا فتح المستخدم رابطاً قديماً بالاسم العربي، يعمل أيضاً (توافق رجعي)

---

## كيفية الاختبار

1. **افتح الصفحة الرئيسية** → اضغط "عرض الكل" بجانب الأقسام
   - يجب أن تفتح صفحة `/categories` بكل الأقسام في شبكة 3 أعمدة على الكمبيوتر.

2. **اضغط على قسم "سيارات"** في الصفحة الرئيسية أو في `/categories`
   - URL يصبح `/listings?category=cars`
   - النتائج تعرض السيارات فقط
   - "السعر/كل الأقسام" في رأس الصفحة يصبح "سيارات"

3. **جرّب أقسام أخرى:**
   - `/listings?category=trucks` → الشاحنات فقط
   - `/listings?category=car-parts` → قطع غيار السيارات فقط
   - `/listings?category=workshops` → ورش الميكانيكا فقط

4. **افتح فلتر القسم من الواجهة الجانبية** واختر قسماً
   - URL يتحدّث بـ slug إنجليزي
   - النتائج تتفلتر فعلياً

5. **على الجوال:**
   - شريط chips أفقي للأقسام يعمل بنفس slug
   - صفحة `/categories` تعرض الأقسام في عمود واحد منظّم

---

## نقاط مهمة

- **التوافق الرجعي**: الإعلانات الموجودة في Firestore لم تتأثر — نفس الـ schema، نفس الفلترة بالاسم العربي، فقط طبقة ترجمة في الواجهة.
- **روابط نظيفة**: `/listings?category=cars` بدلاً من URL مشفّر طويل.
- **الهوية البصرية**: استخدمت ألوان `brand-*` و `action-*` و `card` و `section-title` الموجودة في `tailwind.config.ts` و `globals.css`.
- **بدون تبعيات جديدة**: كل الأيقونات من `lucide-react` الموجود.
