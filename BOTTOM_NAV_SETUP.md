# 🧭 إعادة تصميم Bottom Navigation — شريط زجاجي عائم

شريط تنقّل premium بمستوى Instagram/TikTok 2026 — **مع الحفاظ على كل المنطق.**

## ✅ المواصفات المنفّذة (مطابقة لطلبك حرفياً)

### الشريط الزجاجي العائم
```css
position: fixed; bottom/right/left: 12px;
border-radius: 28px;
backdrop-filter: blur(25px);
background: rgba(255,255,255,0.75);
border: 1px solid rgba(255,255,255,0.4);
box-shadow: 0 8px 40px rgba(0,0,0,0.08);
```
✅ شفاف بالكامل (Glassmorphism) · ✅ المحتوى يظهر خلفه · ✅ يطفو فوق الواجهة · ✅ لا خلفية صلبة

### الأيقونات (Lucide)
الرئيسية · الإعلانات · إضافة · المفضلة · الدردشة
- غير نشطة: `#64748B` · نشطة: `#2563EB` (ممتلئة)

### زر الإضافة (FAB)
- عائم في المنتصف، **يخرج 18px فوق الشريط** (`top: -18px`)
- 58×58px (أكبر من الباقي) · أزرق `#2563EB` · Plus أبيض
- ظل احترافي + حلقة بيضاء + **Spring animation** عند الضغط

### الحركة
- كل عنصر: `whileTap scale` + **Spring** (stiffness 500, damping 18)
- إخفاء/إظهار: `translateY 120% ↔ 0` + opacity + **250ms** + `pointer-events none` عند الإخفاء

### Safe Area
✅ `env(safe-area-inset-bottom)` — دعم Dynamic Island / Pro Max / PWA

---

## 🔒 المنطق المحفوظ (لم يُلمس)

✅ المسارات الـ5 · ✅ **badges realtime** (المحادثات غير المقروءة + عدد المفضلة عبر `onSnapshot` مع `requestIdleCallback` للأداء) · ✅ `useScrollDirection` (إخفاء/إظهار) · ✅ `usePathname` للحالة النشطة · ✅ `memo` · ✅ `md:hidden` (يظهر على الموبايل فقط)

**التغيير حصراً في التصميم (الـrender + الأنماط).**

---

## الملف المعدّل (1)

`components/bottom-nav.tsx`

## النشر

```bash
git add components/bottom-nav.tsx
git commit -m "redesign: floating glassmorphism bottom nav"
git push
```

⚠️ يتطلب `framer-motion` (مثبّت لديك).

## الاختبار

1. افتحي أي صفحة على الموبايل → ✅ شريط زجاجي عائم أسفل
2. مرّري لأسفل → ✅ يختفي (ينزل خارج الشاشة)
3. مرّري لأعلى → ✅ يعود بسلاسة (250ms)
4. اضغطي أي أيقونة → ✅ Spring animation
5. زر + الأزرق العائم → ✅ يفتح إضافة إعلان
6. badges المفضلة/الدردشة → ✅ تظهر الأعداد

افتحي `preview.html` لرؤية الشكل.

> ملاحظة: لم أشغّل build فعلي (لا شبكة) — تحققتُ يدوياً: الأقواس متوازنة ✅، المسارات + badges + scroll محفوظة، كل مواصفاتك الدقيقة موجودة. لو ظهر خطأ، أرسلي screenshot.
