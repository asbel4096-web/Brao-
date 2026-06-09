# 🔥 إصلاح عاجل: خطأ الصفحة الرئيسية (React #310)

## الخطأ الفعلي (من console)

```
Error: Minified React error #310
at Object.r4 [as useEffect] ...
at P (page-...js)   ← الصفحة الرئيسية
```

**React #310** = "Rendered more hooks than during the previous render"
→ عدد/ترتيب الـHooks اختلف بين رندر السيرفر ورندر العميل (hydration mismatch).

---

## 🎯 السبب الجذري (محدّد بدقّة)

**الملف**: `hooks/use-public-homepage-config.ts`
**السطر**: 67

```js
// ❌ قبل
const cached = typeof window !== "undefined" ? loadCache() : null;
const [config, setConfig] = useState(cached?.config || DEFAULT);
```

**المشكلة**:
- على **السيرفر**: `window` غير موجود → `cached = null` → `config = DEFAULT`
- على **العميل** (hydration): `cached` يُقرأ من `sessionStorage` → قد يحوي config مختلف

النتيجة: `config.sectionsOrder` و `enabledSections` يختلفان بين رندر السيرفر والعميل. الصفحة الرئيسية ترسم أقساماً حسب `config` → **عدد المكوّنات (والـhooks) يختلف** → React #310 → الصفحة تنهار بالكامل.

> هذا خطأ كامن قديم، لكنه ظهر الآن بعد تغييرات الـlayout/SEO التي غيّرت توقيت الـhydration فكشفته.

---

## ✅ الإصلاح

```js
// ✅ بعد
// نبدأ دائماً بالافتراضي (متطابق سيرفر + عميل) → لا hydration mismatch
const [config, setConfig] = useState(DEFAULT_HOMEPAGE_CONFIG);
const [banners, setBanners] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  // الـcache يُقرأ هنا فقط (بعد hydration - آمن)
  const cached = loadCache();
  if (cached) { setConfig(cached.config); ... return; }
  // وإلا نقرأ من Firestore
}, []);
```

**المبدأ**: أول رندر (سيرفر + عميل) **متطابق دائماً** (الافتراضي). الـcache والبيانات تُحمّل بعد الـhydration داخل `useEffect`. هذا يلغي التعارض نهائياً.

✅ نفس الأداء (cache ما زال يعمل) · ✅ لا وميض محتوى · ✅ لا تغيير في المنطق الآخر.

---

## الملف المعدّل (1)

`hooks/use-public-homepage-config.ts`

## النشر

```bash
git add hooks/use-public-homepage-config.ts
git commit -m "fix: hydration mismatch on homepage (React #310)"
git push
```

---

## بعد النشر

1. افتحي الصفحة الرئيسية → ✅ تعمل بلا خطأ
2. console → ✅ لا React #310
3. الأقسام تظهر طبيعياً (بنرات، إعلانات مميزة، إلخ)

> **تحذير ثانوي غير مهم**: console يُظهر تحذير `apple-mobile-web-app-capable deprecated`. هذا مجرد تحذير (لا يكسر شيئاً). لو أردتِ إزالته لاحقاً، نضيف `<meta name="mobile-web-app-capable" content="yes">` في الـlayout — لكنه ليس أولوية.

---

## ملاحظة منهجية

هذا أول خطأ runtime فعلي يمنع الصفحة. بعد إصلاحه يجب أن تعمل الصفحة الرئيسية. لو ظهر خطأ آخر بعده (نادر)، أرسلي console الجديد.
