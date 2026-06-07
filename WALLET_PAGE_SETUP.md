# 💼 صفحة المحفظة الجديدة - /wallet

تصميم احترافي مطابق للصورة المرجعية - مستوى Apple Wallet / Revolut.

## 📦 الملفات (6)

### Components
- `components/wallet-page/balance-hero.tsx` - بطاقة الرصيد العلوية بـgradient
- `components/wallet-page/quick-services-grid.tsx` - 6 أيقونات دائرية
- `components/wallet-page/transactions-section.tsx` - آخر العمليات
- `components/wallet-page/bc-services-section.tsx` - كروت الخدمات
- `components/wallet-page/verification-section.tsx` - بطاقة موثَّق + Banner

### Page
- `app/(public)/wallet/page.tsx` - الصفحة الرئيسية

---

## 🎨 المميزات

### Hero Balance Card
- ✅ Gradient أزرق فاخر مع decorative shapes
- ✅ Coin icon 3D (CSS only - لا صور)
- ✅ الرصيد + المعادل بالدينار
- ✅ زرّان: شحن (أبيض) + استخدام (شفاف)
- ✅ Glow effects خفيفة

### Quick Services
- ✅ 6 أيقونات دائرية بألوان متنوعة:
  - شحن رصيد (أزرق)
  - دعوة صديق (برتقالي)
  - تحويل رصيد (أخضر - "قريباً")
  - المكافآت (بنفسجي)
  - توثيق معرض (أزرق)
  - الإعدادات (رمادي)
- ✅ Stagger animation للظهور
- ✅ Spring tap (scale 0.92)

### Transactions
- ✅ ربط realtime مع `walletTransactions` collection
- ✅ أيقونات ملوّنة حسب النوع
- ✅ ألوان: أخضر للموجب، أحمر للسالب
- ✅ تاريخ + وقت
- ✅ زر "عرض الكل"

### BC Services Cards
- ✅ 4 خدمات: إعلان مميز / رفع / ظهور أقوى / توثيق
- ✅ أيقونات 3D-style مع gradients
- ✅ Cards كبيرة قابلة للضغط
- ✅ Stagger animations

### Verification (شرطية)
- ✅ **إن كان موثقاً**: بطاقة "توثيق المعرض النشط" مع progress bar + زر تجديد
- ✅ **إن لم يكن موثقاً**: Banner "وثّق معرضك الآن" مع shield icon
- ✅ تلقائياً تتبدّل حسب `verifiedUntil`

---

## 🚀 خطوات النشر

### 1. ارفعي الملفات
```bash
git add components/wallet-page app/(public)/wallet
git commit -m "feat(wallet): premium /wallet page redesign"
git push
```

### 2. ⚠️ تكامل اختياري

#### A) رابط /wallet في الـheader
ربط زر الرصيد في الـheader العلوي بـ`/wallet` بدلاً من فتح bottom sheet:

```tsx
// في wallet-trigger.tsx أو أي مكان آخر
<Link href="/wallet">
  {balance} BC
</Link>
```

#### B) في الـbottom navigation
أضيفي رابط للمحفظة في الـnav السفلي.

### 3. ✅ لا dependencies جديدة

---

## ✨ ما يعمل تلقائياً

| الميزة | الـSheet المُستخدم |
|---|---|
| شحن رصيد | TopupSheet (موجود) |
| دعوة صديق + المكافآت | ReferralsSheet (موجود) |
| توثيق معرض | PlansSheet (موجود) |
| Boost/Featured | router.push → /my-listings (BoostButton موجود) |

---

## 🧪 الاختبار

1. افتحي `brao-chi.vercel.app/wallet`
2. ✅ Hero card بأزرق فاخر مع الرصيد
3. ✅ 6 خدمات سريعة
4. ✅ آخر العمليات (إن وجدت)
5. ✅ 4 كروت BC services
6. ✅ Verification card حسب حالة الحساب

---

## 📝 ملاحظة

ميزة "تحويل رصيد" (إرسال BC لمستخدم آخر) **لم تُبنَ بعد**. الأيقونة تظهر مع badge "قريباً" وغير قابلة للضغط. عند جاهزيتك، سنبنيها في جولة منفصلة.
