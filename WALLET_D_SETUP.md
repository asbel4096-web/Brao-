# الجولة D — نظام الإحالات (Referrals)

النظام الكامل للإحالات مع anti-abuse. **يعتمد على الجولات A+B+C** المنشورة.

## ما تم بناؤه

- ✅ **Auto-generate كود فريد** لكل مستخدم (نمط: `BRAT-AHMED-X7K2`)
- ✅ **التقاط ?ref تلقائياً** من الـURL في أي صفحة
- ✅ **تطبيق الكود تلقائياً** عند ظهور المستخدم المسجَّل
- ✅ **مكافأة عند نشر أول إعلان معتمد** (10 BC لكل طرف)
- ✅ **ReferralsSheet عصري** مع 3 حالات (قريباً/فعّل/مفعَّل)
- ✅ **مشاركة سهلة**: WhatsApp + Web Share API + Copy
- ✅ **Anti-abuse كامل**:
  - منع self-referral
  - حساب جديد فقط (< 7 أيام)
  - مكافأة واحدة لكل مُحال
  - 5 مكافآت يومياً كحد أقصى للمُحيل
  - فحص حظر الطرفين قبل الصرف
- ✅ **Admin dashboard** بالإحصاءات

---

## الملفات (12)

### Library
- `lib/wallet/referrals.ts` — types + code generator + helpers

### Hooks
- `hooks/wallet/use-referrals.ts` — useMyReferrals + useAllReferrals
- `hooks/wallet/use-referral-capture.ts` — capture + auto-apply

### Components
- `components/wallet/referrals-sheet.tsx` — Bottom sheet عصري
- `components/wallet/referral-flow-provider.tsx` — Wrapper للـlayout
- `components/wallet/wallet-trigger.tsx` — معدَّل (يربط ReferralsSheet)

### API Routes
- `app/api/wallet/referrals/activate/route.ts` — تفعيل وإنشاء كود
- `app/api/wallet/referrals/apply-code/route.ts` — ربط مستخدم بكود
- `app/api/wallet/referrals/claim/route.ts` — صرف المكافأة

### Admin
- `app/admin/referrals/page.tsx` — Dashboard
- `app/admin/listings/page.tsx` — معدَّل (يصرف المكافأة عند الاعتماد)
- `components/admin/layout/admin-sidebar.tsx` — رابط "نظام الإحالات"

### Layout
- `app/layout.tsx` — يضمّ ReferralFlowProvider
- `firestore.rules` — referrals collection + unchanged fields

---

## خطوات النشر

### 1️⃣ ارفعي الملفات
```bash
git add .
git commit -m "feat(wallet): referrals system (round D)"
git push
```

### 2️⃣ انشري firestore.rules
- إضافة collection `referrals`
- إضافة حقول للـunchanged (referralCode, referredBy, ...)

### 3️⃣ لا npm install
لا dependencies جديدة.

---

## الاختبار الكامل

### 1) تفعيل النظام (أدمن)
1. `/admin/settings/features`
2. فعّلي **"نظام الإحالات"** (referrals)

### 2) مستخدم A يفعّل ويُشارك
1. سجّلي دخول كمستخدم A
2. افتحي المحفظة → زر **"دعوة صديق"** (يظهر فقط لو الـflag مفعَّل)
3. أو من profile → بطاقة المحفظة → ReferralsSheet
4. اضغطي **"فعّل نظام الإحالات"**
5. ✅ Toast: "تم التفعيل! كودك: BRAT-XXXX-XXXX"
6. الواجهة تتحول إلى عرض الكود + الرابط + أزرار المشاركة
7. اضغطي **"WhatsApp"** → يفتح WhatsApp مع رسالة جاهزة

### 3) مستخدم B يستخدم الرابط
1. افتحي رابط `brao-chi.vercel.app/?ref=BRAT-XXXX-XXXX` في tab متخفية
2. الكود يُحفظ في localStorage تلقائياً
3. الـURL يُنظَّف (إزالة ?ref)
4. سجّلي حساباً جديداً
5. بعد ظهور الـprofile، الكود يُطبَّق تلقائياً
6. ✅ في Firestore: `users/{uidB}.referredBy = "BRAT-XXXX-XXXX"`
7. ✅ تظهر referral doc بحالة `pending`

### 4) مستخدم B ينشر إعلاناً + الأدمن يعتمده
1. سجّلي دخول كـB → انشري إعلاناً جديداً
2. سجّلي دخول كأدمن → افتحي `/admin/listings?filter=pending`
3. اضغطي **"اعتماد"** على إعلان B
4. ✅ Toast: "تم اعتماد الإعلان"
5. ✅ تلقائياً: B يحصل على 10 BC + A يحصل على 10 BC
6. ✅ في referrals: status = "completed", rewardedAt مُسجَّل
7. ✅ A يرى في الـReferralsSheet: 1 دعوة مكتملة، +10 BC

### 5) Anti-abuse tests
- ❌ B يحاول نشر إعلان ثانٍ → لا مكافأة (referralRewardEarned = true)
- ❌ A يحاول دعوة نفسه → "لا يمكنك دعوة نفسك"
- ❌ مستخدم قديم (> 7 أيام) يحاول تطبيق كود → "حساب قديم"
- ❌ A يتجاوز 5 إحالات في يوم → "rate_limit"

### 6) Admin Dashboard
1. `/admin/referrals`
2. ✅ ترين 4 إحصاءات + قائمة بكل الإحالات
3. كل إحالة تُظهر: من → إلى، الحالة، التاريخ، الكود

---

## الميزات الذكية

### 1. Auto-capture من URL
```typescript
brao-chi.vercel.app/?ref=BRAT-AHMED-X7K2
// → الكود يُحفظ في localStorage
// → الـURL يُنظَّف تلقائياً (لا ?ref)
// → المستخدم يُسجّل → الكود يُطبَّق تلقائياً
// → نظيف وبدون تدخل من المستخدم
```

### 2. Idempotency في كل مكان
- تفعيل مرتين → الكود نفسه يُرجَع
- تطبيق نفس الكود مرتين → ok مع alreadyApplied
- claim مرتين → ok مع alreadyClaimed
- لا duplicates، لا أخطاء

### 3. Code generator فريد
- نمط: `BRAT-{prefix}-{random4}`
- prefix من اسم المستخدم (latin) أو "USER"
- random4 بدون أحرف ملتبسة (لا 0/O/I/1)
- محاولات متعددة لتجنّب collision (5 محاولات)

### 4. Lazy application
- لا activation تلقائي (تكلفة Firestore أقل)
- المستخدم الحالي يضغط "فعّل الآن"
- المستخدمون الجدد فقط يحصلون على كود إن طلبوا

### 5. Transactional rewards
- 5 عمليات في transaction واحدة:
  - يقرأ المستخدمين + الـreferral
  - يُحدّث balance × 2
  - يكتب walletTransactions × 2
  - يُحدّث referralsCount
  - يُحدّث referralRewardEarned
- لا race conditions، لا double rewards

---

## الأمان

| الطبقة | الحماية |
|---|---|
| **Firestore Rules** | referrals/walletTransactions writes ممنوعة من client. الحقول الحرجة في users unchanged |
| **API Routes** | فحص feature flag + idToken + حالة الحساب + حداثة الحساب + rate limit |
| **Transactions** | Atomic: لا possibility لـpartial state |
| **Feature Flag** | الإيقاف يمنع كل العمليات + يخفي الـUI |

---

## ⚠️ تكامل اختياري

### بطاقة "ادعُ أصدقاءك" في profile

أضيفي في profile مباشرة لزيادة الانتشار:

```tsx
import { useFeatureFlag } from "@/hooks/features/use-feature-flag";
import { useState } from "react";
import { ReferralsSheet } from "@/components/wallet/referrals-sheet";

// داخل JSX:
const referralsEnabled = useFeatureFlag("referrals");
const [refOpen, setRefOpen] = useState(false);

{referralsEnabled && (
  <button onClick={() => setRefOpen(true)} className="...">
    🎁 ادعُ أصدقاءك واربح 10 BC
  </button>
)}

<ReferralsSheet open={refOpen} onClose={() => setRefOpen(false)} />
```

---

## 🎉 نظام Wallet مكتمل!

| الجولة | المحتوى | الحالة |
|---|---|---|
| A | Feature Flags + Foundation | ✅ |
| B | Wallet Core + Admin Tools | ✅ |
| C | Verification Subscriptions | ✅ |
| **D** | **Referrals + UI Polish** | ✅ |

نظام احترافي كامل، production-ready، مع كل anti-abuse.

## التسعير المركزي
```
verification basic: 200 BC / 30 يوم
verification gold:  500 BC / 30 يوم
verification vip:   800 BC / 30 يوم
verification business: 1500 BC / 30 يوم
verification annual: 2000 BC / 365 يوم
featured listing 7d:  150 BC
boost to top:          25 BC
boost strong:          80 BC
vip account:          300 BC
referral reward:       10 BC × 2 طرفين
```

تعديلها = ملف واحد (`lib/wallet/types.ts` + `lib/wallet/referrals.ts`).

---

## ما الذي يأتي لاحقاً (اختياري)

### Boosts + Featured Listings
- صفحة شراء "إعلان مميَّز" بـ150 BC
- "رفع للأعلى" بـ25 BC
- "Boost قوي" بـ80 BC
- يُحدّث listing.featured, featuredUntil

### بوابة دفع حقيقية
- MyFatoorah / Edfa3ly / Stripe
- شحن BC تلقائي من المستخدم
- يحتاج حساب تجاري + API keys

أعلميني عما تريدين بعد ذلك.
