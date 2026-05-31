# الجولة E — Boosts + Featured Listings

نظام تعزيز الإعلانات: 3 خدمات قابلة للشراء بـBC.

## الخدمات الثلاث

| الخدمة | السعر | المدة | ما يفعل |
|---|---|---|---|
| ⬆️ **رفع للأعلى** | 25 BC | فوري | يقفز الإعلان لأعلى القائمة (مؤقت) |
| 🚀 **Boost قوي** | 80 BC | 7 أيام | يبقى في الأعلى أسبوعاً |
| ✨ **إعلان مميَّز** | 150 BC | 7 أيام | شارة 🔥 + ظهور في "المميَّزة" بالصفحة الرئيسية |

**تراكم**: المستخدم يستطيع شراء أكثر من خدمة على نفس الإعلان (مثلاً bump + featured = الأقوى).

---

## ما تم بناؤه

### Library
- `lib/wallet/boost.ts` — types + helpers (isBoostedNow, isFeaturedNow, formatRemainingDays)

### Components
- `components/wallet/boost-sheet.tsx` — bottom sheet للشراء (3 بطاقات ملوّنة + animations)
- `components/wallet/boost-button.tsx` — زر صغير "تعزيز" بجانب كل إعلان
- `components/wallet/featured-badge.tsx` — شارة 🔥 هادئة لبطاقات الإعلانات
- `components/my-listing-card.tsx` — معدَّل (يحوي BoostButton)
- `components/admin/layout/admin-sidebar.tsx` — معدَّل (رابط "تعزيز الإعلانات")

### Hooks
- `hooks/wallet/use-active-boosts.ts` — للأدمن: قائمة الإعلانات المعزَّزة/المميَّزة النشطة

### API Routes
- `app/api/wallet/boost/purchase/route.ts` — شراء (User)
- `app/api/admin/boosts/cleanup/route.ts` — تنظيف منتهية (lazy، بدون Blaze)
- `app/api/admin/boosts/[listingId]/grant/route.ts` — منح مجاني (Admin)

### Admin
- `app/admin/boosts/page.tsx` — Dashboard كامل بـ3 tabs + إحصاءات

### Rules
- `firestore.rules` — حقول `featured*`, `boostedUntil`, `bumpedAt`, `bumpCount` في unchanged (لا تعديل من client)

---

## خطوات النشر

### 1️⃣ ارفعي الملفات

```bash
git add .
git commit -m "feat(wallet): boosts + featured listings (round E)"
git push
```

### 2️⃣ انشري Firestore rules ⚠️

التغيير: إضافة `boostedUntil`, `boostedAt`, `bumpedAt`, `bumpCount` إلى unchanged list للإعلانات.

### 3️⃣ لا npm install
لا dependencies جديدة.

---

## الاختبار

### اختبار 1: تفعيل النظام (أدمن)

1. `/admin/settings/features`
2. فعّلي:
   - **"تعزيز الإعلانات"** (boosts) — لخدمتي bump و boost
   - **"نظام المحفظة"** (wallet) — مفعَّل سابقاً، يُلزم لـfeatured

### اختبار 2: مستخدم يُعزِّز إعلاناً

1. كمستخدم: تأكدي من رصيدك ≥ 25 BC
2. اذهبي إلى `/my-listings`
3. لكل إعلان معتمد، سترين زر **"تعزيز"** بنفسجي
4. اضغطيه → ينفتح BoostSheet
5. سترين:
   - حالة الإعلان (عادي أو مُعزَّز/مميَّز)
   - رصيدك الحالي
   - 3 بطاقات للخدمات (مع gradients ملونة)
6. اضغطي **"اشترِ الآن"** على "رفع للأعلى"
7. Confirm → تأكيد
8. ✅ Toast: "تم رفع الإعلان للأعلى!"
9. ✅ في Firestore: `listings/{id}.bumpedAt` محدَّث + `bumpCount` ازداد
10. ✅ في `/admin/wallet/[uid]`: معاملة جديدة type=boost بـ-25 BC

### اختبار 3: شراء Featured (الأهم)

1. تأكدي من رصيدك ≥ 150 BC
2. ادخلي BoostSheet → اشترِ "إعلان مميَّز"
3. ✅ Toast: "تم تفعيل إعلان مميَّز ✨"
4. ✅ في Firestore: `featured=true`, `featuredUntil = now + 7 days`
5. افتحي الصفحة الرئيسية → ✅ الإعلان يظهر في قسم "الإعلانات المميَّزة"
6. ✅ في `/admin/boosts`: الإعلان يظهر في tab "مميَّز"

### اختبار 4: تراكم الخدمات

1. على نفس الإعلان: اشتري "Boost قوي" (80 BC)
2. ثم اشتري "إعلان مميَّز" (150 BC) - **مسموح**
3. ✅ الإعلان الآن: featured + boosted في نفس الوقت
4. ✅ في BoostSheet: الزرّان يصبحان "تمديد"
5. اضغطي "تمديد" على Boost → 7 أيام إضافية تُضاف
6. ✅ المستخدم لا يخسر الأيام المتبقية

### اختبار 5: Cleanup تلقائي

1. في Firestore Console: عدّلي `featuredUntil` ليصبح ماضياً
2. افتحي `/admin/boosts` (انتظري بضع ثوانٍ)
3. ✅ تلقائياً: `featured = false`
4. ✅ الشارة تختفي من الواجهة

### اختبار 6: Anti-abuse

- ❌ مستخدم يحاول تعزيز إعلان ليس له → "هذا الإعلان لا يخصّك"
- ❌ تعزيز إعلان pending → "يجب اعتماد الإعلان قبل تعزيزه"
- ❌ رصيد غير كافٍ → "الرصيد غير كافٍ. تحتاج X BC إضافية"
- ❌ تعديل featured من client مباشرة → permission-denied (rules)

---

## التكامل مع نظام Featured القديم

الموقع لديه نظام `FeaturedActionBar` قديم (طلب تمييز يُراجعه الأدمن). 

**الاستراتيجية**: نحتفظ بالاثنين:
- **القديم**: المستخدم يطلب، الأدمن يقرّر (مجاني، يدوي)
- **الجديد**: المستخدم يدفع 150 BC ويحصل فوراً (تلقائي)

كلاهما يستخدم نفس الحقول (`featured`, `featuredUntil`). الواجهة تعرض كليهما بجوار بعض في my-listings - المستخدم يختار:
- إذا لا BC: يطلب من الأدمن (قديم)
- إذا لديه BC: يشتري فوراً (جديد)

---

## ⚠️ تكامل اختياري

### عرض شارة "مميَّز" على بطاقات الإعلانات

أضيفي في أي مكان يعرض بطاقة إعلان:

```tsx
import { FeaturedBadge } from "@/components/wallet/featured-badge";

// داخل JSX:
<FeaturedBadge listing={listing} size="sm" />
```

الـcomponent يخفي نفسه تلقائياً لو الإعلان غير مميَّز.

### تحديث الترتيب في القوائم

في query الـlistings، إذا أردتِ تقديم featured/boosted:

```typescript
// بدلاً من orderBy("updatedAt", "desc") فقط:
const all = (await getDocs(q)).docs.map(...);
all.sort((a, b) => {
  // featured أولاً
  if (isFeaturedNow(a) && !isFeaturedNow(b)) return -1;
  if (!isFeaturedNow(a) && isFeaturedNow(b)) return 1;
  // boosted ثانياً
  if (isBoostedNow(a) && !isBoostedNow(b)) return -1;
  if (!isBoostedNow(a) && isBoostedNow(b)) return 1;
  // ثم updatedAt
  return (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0);
});
```

هذا اختياري - يمكن تطبيقه لاحقاً بدون كسر شيء.

---

## الأمان

| الطبقة | الحماية |
|---|---|
| **Firestore Rules** | `featured*`, `boostedUntil`, `bumpedAt`, `bumpCount` في unchanged للمالك |
| **API Routes** | فحص ownership + status=approved + feature flag + balance |
| **Transactional** | atomic: balance + walletTx + listing fields معاً |
| **Feature Flags** | flag `boosts` للـbump/boost، flag `wallet` للـfeatured |

---

## ⚙️ الإعدادات

في `lib/wallet/types.ts` (مركزي):
```typescript
BOOST_TO_TOP: 25 BC          // bump
BOOST_STRONG: 80 BC          // boost 7 أيام
FEATURED_LISTING_7DAYS: 150  // featured 7 أيام
```

تعديل الأسعار = ملف واحد.

---

## نظام Wallet مكتمل!

| الجولة | المحتوى | الحالة |
|---|---|---|
| A | Feature Flags + Foundation | ✅ |
| B | Wallet Core + Admin Tools | ✅ |
| C | Verification Subscriptions | ✅ |
| D | Referrals + UI Polish | ✅ |
| Topup Requests | طلبات شحن من المستخدم | ✅ |
| **E** | **Boosts + Featured Listings** | **✅** |

نظام تمويلي كامل: شحن (يدوي) → شراء خدمات (آني) → صرف على التوثيق + الإحالات + Boosts + Featured.

---

## ما المتبقي (اختياري)

### بوابة دفع MyFatoorah
- عند الحصول على API key + حساب تجاري
- نُبدّل API route الـtopup ليُنشئ payment session
- webhook handler يستقبل تأكيد الدفع
- auto-approve عند نجاح الدفع
- البنية الحالية جاهزة لذلك بدون إعادة بناء

أعلميني عند جاهزيتكِ.
