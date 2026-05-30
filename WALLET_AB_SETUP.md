# جولة A + B — Wallet Foundation + Core

النظام مبني على Feature Flags، **مخفي افتراضياً** حتى تُفعّليه من اللوحة.

## ما تم بناؤه

### الجولة A: Foundation
- ✅ نظام **Feature Flags** كامل (5 flags: wallet, referrals, vip, boosts, verification_paid)
- ✅ Hook موحَّد `useFeatureFlag` (realtime + cached)
- ✅ صفحة `/admin/settings/features` مع toggles احترافية
- ✅ API route آمن لتشغيل/إيقاف الـflags
- ✅ Types + Constants + Pricing

### الجولة B: Wallet Core
- ✅ Wallet Sheet عصري (bottom sheet + Framer Motion + animations)
- ✅ Hook `useWallet` (الرصيد + المعاملات realtime)
- ✅ API route آمن لإضافة/خصم الرصيد (transactional + audit)
- ✅ Admin dashboard `/admin/wallet` + صفحة لكل مستخدم
- ✅ Dialog احترافي للإضافة/الخصم مع validation كامل
- ✅ Firestore rules محصّنة (balance لا يُعدَّل من client)

---

## الملفات (16)

### Library
- `lib/features/types.ts` — Feature flags constants
- `lib/wallet/types.ts` — Wallet types + Pricing + Plans

### Hooks
- `hooks/features/use-feature-flag.ts`
- `hooks/wallet/use-wallet.ts`

### Components
- `components/wallet/wallet-sheet.tsx` — Bottom sheet الرئيسي
- `components/wallet/wallet-trigger.tsx` — زر الفتح + "قريباً" card

### API Routes
- `app/api/admin/features/[flagKey]/route.ts` — Toggle flag
- `app/api/admin/wallet/[uid]/adjust/route.ts` — تعديل رصيد (transactional)

### Admin Pages
- `app/admin/settings/features/page.tsx` — إدارة الـflags
- `app/admin/wallet/page.tsx` — قائمة الأرصدة
- `app/admin/wallet/[uid]/page.tsx` — تفاصيل + adjust

### Modified
- `components/admin/layout/admin-sidebar.tsx` — رابط "إدارة المحافظ"
- `firestore.rules` — حماية balance + walletTransactions
- `package.json` — إضافة `framer-motion`

---

## خطوات النشر

### 1️⃣ ارفعي كل الملفات

```bash
git add .
git commit -m "feat: wallet system + feature flags (A+B)"
git push
```

Vercel سيُشغّل `npm install` (لإضافة framer-motion ~50KB).

### 2️⃣ انشري Firestore rules

من Firebase Console → Firestore → Rules → الصقي + Publish

التغييرات:
- منع المستخدم من تعديل `balance`, `verifiedUntil`, `referralsCount` مباشرة
- إضافة `walletTransactions` collection (قراءة فقط من client)

### 3️⃣ لا تفعّلي الـwallet بعد!

افتراضياً: `wallet.enabled = false` → لا شيء يظهر للمستخدمين.

## اختبار الـAdmin Side

### اختبار 1: Feature Flags
1. افتحي `/admin/settings/features`
2. ✅ يجب أن تري 5 flags بحالة "موقوف" جميعاً
3. اضغطي toggle "نظام المحفظة" → تفعيل
4. ✅ Toast نجاح + لون البطاقة أخضر

### اختبار 2: إدارة المحفظة
1. افتحي `/admin/wallet`
2. ✅ صفحة فارغة (لا يوجد مستخدم برصيد بعد)

### اختبار 3: إضافة رصيد لمستخدم
1. اذهبي إلى `/admin/users` → اختاري مستخدماً
2. أو افتحي `/admin/wallet/[uid]` مباشرة
3. اضغطي **"إضافة رصيد"** الأخضر
4. أدخلي:
   - المبلغ: `100`
   - النوع: تعديل إداري
   - السبب: `هدية ترحيب`
5. تأكيد
6. ✅ Toast: "تمت إضافة 100 BC. الرصيد الجديد: 100"
7. ✅ المعاملة تظهر في السجلّ
8. ✅ في Firestore: `users/{uid}.balance = 100`
9. ✅ في Firestore: `walletTransactions/{txId}` موجود

### اختبار 4: User يرى المحفظة
1. سجّلي دخول من حساب آخر
2. **مع** `wallet` flag مفعَّل:
3. أضيفي `<WalletTrigger />` في الـnavbar أو الـprofile (تكامل لاحق - انظر أسفل)
4. الزر سيظهر مع الرصيد
5. اضغطه → bottom sheet ينفتح مع animations

---

## ⚠️ تكامل مطلوب يدوياً

النظام جاهز لكن `WalletTrigger` **لا يظهر تلقائياً** في الموقع. لإظهاره، أضيفي يدوياً:

### في الـNavbar / الـTopbar للموقع العام:

```tsx
import { WalletTrigger } from "@/components/wallet/wallet-trigger";

// داخل الـnavbar
<WalletTrigger variant="compact" />
```

### في صفحة Profile (`/profile`):

```tsx
import { WalletTrigger, WalletComingSoonCard } from "@/components/wallet/wallet-trigger";

// أعلى الصفحة
<WalletTrigger variant="card" />

// أو لو الـflag مغلق:
<WalletComingSoonCard />
```

**ملاحظة:** الـcomponent يخفي نفسه تلقائياً عندما `wallet.enabled = false`.

---

## الأمان (3 طبقات)

| الطبقة | الحماية |
|---|---|
| **Firestore Rules** | المستخدم لا يستطيع كتابة `balance` مباشرة |
| **API Routes** | كل عمليات الرصيد transactional + verify admin + log |
| **Feature Flags** | عند الإيقاف، الـUI يختفي + الـAPI ترفض |

### كيف لا تستطيع التلاعب؟

```javascript
// المستخدم يحاول:
await updateDoc(doc(db, "users", myUid), { balance: 99999 });
// → permission-denied (rule: balance في unchanged)

// المستخدم يحاول إضافة معاملة مزيفة:
await addDoc(collection(db, "walletTransactions"), {
  userId: myUid, amount: 1000, ...
});
// → permission-denied (rule: create: if false)
```

الطريق الوحيد = API route الذي:
- يفحص idToken
- يفحص role + permission
- يستخدم Firestore transaction (atomic)
- يكتب الـlog
- يمنع رصيداً سالباً

---

## ما الذي يأتي في الجولة C + D

### الجولة C: Verification Subscriptions
- شراء اشتراك توثيق بـBC
- تجديد / إلغاء
- صفحة admin لاشتراكات التوثيق
- تنبيهات انتهاء قريب
- 5 خطط (basic, gold, vip, business, annual)

### الجولة D: Referrals + UI Polish
- نظام إحالات كامل
- روابط دعوة + تتبّع
- مكافأة 10 BC لكل طرف
- صفحة "ادعُ أصدقاءك"
- UI tweaks + animations نهائية

أعلميني عند جاهزيتك للجولة التالية.

---

## ملاحظات

### Pricing (مركزي في lib/wallet/types.ts)
```
VERIFICATION_BASIC_MONTHLY: 200 BC
VERIFICATION_GOLD_MONTHLY:  500 BC
VERIFICATION_VIP_MONTHLY:   800 BC
FEATURED_LISTING_7DAYS:     150 BC
BOOST_TO_TOP:                25 BC
BOOST_STRONG:                80 BC
VIP_ACCOUNT:                300 BC
REFERRAL_REWARD:             10 BC
```

تعديلها لاحقاً: ملف واحد فقط.

### الشحن
حالياً **يدوي من الأدمن** فقط (كما اتفقنا). لإضافة بوابة دفع لاحقاً:
- MyFatoorah (الكويت)
- Edfa3ly (مصر)
- Stripe (دولي)

هذا يحتاج جولة منفصلة + حساب تجاري.
