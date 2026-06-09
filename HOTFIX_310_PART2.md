# 🔥 إصلاح #310 (الجزء الثاني والأخير)

## لماذا استمر الخطأ بعد الإصلاح الأول؟

الإصلاح الأول عالج `usePublicHomepageConfig` (وكان صحيحاً). لكن **نفس النمط الخطير** موجود في **مكوّنين آخرين** يُرسمان على الصفحة الرئيسية:

- `VerifiedDealersRow` ← يُرسم **دائماً** على الرئيسية
- `FeaturedListingsSection` ← يُرسم في قسم "المميزة"

## السبب الجذري (النمط المتكرر)

```js
// ❌ المشكلة - useState مع قراءة cache من sessionStorage
const [dealers, setDealers] = useState(() => {
  if (typeof window === "undefined") return [];   // السيرفر: []
  return readCache() || [];                        // العميل: cache مختلف!
});
```

`useState(() => readCache())` يُنتج قيمة مبدئية **مختلفة** بين رندر السيرفر (`[]`) ورندر العميل (cache). هذا اختلاف hydration → **عدد/ترتيب hooks مختلف** → React #310 → انهيار الصفحة.

`VerifiedDealersRow` يُرسم دائماً، لذلك الخطأ استمر رغم إصلاح الـhook السابق.

## ✅ الإصلاح (نفس مبدأ الإصلاح الأول)

```js
// ✅ بعد - قيمة ثابتة، الـcache يُقرأ في useEffect
const [dealers, setDealers] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const cached = readCache();        // بعد hydration - آمن
  if (cached !== null) { setDealers(cached); setLoading(false); return; }
  // وإلا اقرأ من Firestore
}, []);
```

أول رندر متطابق دائماً (سيرفر + عميل) → لا hydration mismatch.

---

## الملفات المعدّلة (2)

| الملف | التغيير |
|---|---|
| `components/verified-dealers-row.tsx` | cache في useEffect بدل useState |
| `components/featured-listings-section.tsx` | cache في useEffect بدل useState |

## النشر

```bash
git add components/verified-dealers-row.tsx \
        components/featured-listings-section.tsx
git commit -m "fix: hydration mismatch in dealers/featured (React #310)"
git push
```

> ارفعي هذا **مع** الإصلاح الأول (`brao-hotfix-homepage.zip` — `usePublicHomepageConfig`). الاثنان معاً يغلقان كل مصادر #310 على الصفحة الرئيسية.

---

## ✅ تأكيد شامل

فحصتُ **كل** مكوّنات الصفحة الرئيسية للنمط نفسه:
- ✅ `usePublicHomepageConfig` — مُصلَح (الجولة السابقة)
- ✅ `VerifiedDealersRow` — مُصلَح الآن
- ✅ `FeaturedListingsSection` — مُصلَح الآن
- ✅ `StoriesRow` — سليم (يقرأ localStorage في useEffect أصلاً)
- ✅ `Hero` — سليم (useState ثابت)
- ✅ `ListingsGrid`, `CategoryGrid`, `TowTrucksCTA`, `BrowseByBrand` — سليمة

لا يوجد أي `useState(() => readCache())` متبقٍ في المشروع.

## بعد النشر

1. الصفحة الرئيسية → ✅ تعمل
2. console → ✅ لا #310
3. أقسام البائعين الموثوقين + المميزة تظهر طبيعياً
