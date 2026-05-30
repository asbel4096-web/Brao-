# الجولة C — Verification Subscriptions

نظام اشتراكات توثيق المعارض. **يعتمد على الجولة A + B** المنشورة سابقاً.

## ما تم بناؤه

- ✅ **شراء فوري** للتوثيق بـBC (5 خطط)
- ✅ **تمديد تلقائي** إذا المستخدم لديه اشتراك نشط
- ✅ **منح مجاني** من الأدمن (يُسجَّل كـ"granted")
- ✅ **إلغاء + استرداد اختياري** للرصيد
- ✅ **تنظيف تلقائي** للمنتهية عند فتح صفحة الأدمن (lazy، بدون Cloud Scheduler)
- ✅ **PlansSheet عصري** مطابق للتصميم المرسل (بطاقات gradient + animations)
- ✅ **Dashboard إدارة** بـ4 tabs (الكل/نشط/ينتهي قريباً/منتهي)
- ✅ **تفاصيل اشتراك** مع منح/تمديد/إلغاء/استرداد

---

## الملفات (10 جديدة)

### Library
- `lib/wallet/verification.ts` — helpers (isVerifiedNow, daysUntilExpiry, formatRemainingDays)

### Hooks
- `hooks/wallet/use-verification.ts` — useMyVerification + useSubscriptionsList

### Components
- `components/wallet/plans-sheet.tsx` — Bottom sheet لشراء الخطط
- `components/wallet/wallet-trigger.tsx` — معدَّل (يربط PlansSheet)
- `components/wallet/wallet-sheet.tsx` — معدَّل (يستخدم onOpenPlans)

### API Routes
- `app/api/wallet/verification/purchase/route.ts` — شراء (المستخدم نفسه)
- `app/api/admin/subscriptions/[uid]/grant/route.ts` — منح مجاني (أدمن)
- `app/api/admin/subscriptions/[uid]/cancel/route.ts` — إلغاء + استرداد (أدمن)
- `app/api/admin/subscriptions/cleanup/route.ts` — تنظيف منتهية (أدمن)

### Admin Pages
- `app/admin/subscriptions/page.tsx` — قائمة + tabs + بحث + cleanup auto
- `app/admin/subscriptions/[uid]/page.tsx` — تفاصيل + dialogs

---

## خطوات النشر

### 1️⃣ ارفعي الملفات
```bash
git add .
git commit -m "feat(wallet): verification subscriptions (round C)"
git push
```

### 2️⃣ لا تغيير في rules
الـcollections مستخدمة (users, walletTransactions, featureFlags) كلها من الجولة A+B.

### 3️⃣ لا npm install
لا dependencies جديدة (Framer Motion من A+B).

---

## الاختبار

### 1) تفعيل النظام (أدمن)
1. `/admin/settings/features` → فعّلي **"اشتراكات توثيق المعارض"** (`verification_paid`)
2. ✅ Toast نجاح + Badge أخضر

### 2) المستخدم يشتري اشتراكاً
1. سجّلي دخول كمستخدم عادي
2. تأكدي من رصيدك ≥ 200 BC (لو لا، أضيفي رصيداً من `/admin/wallet/[uid]`)
3. افتحي المحفظة → اضغطي زر **"العروض"**
4. ✅ سترين 5 خطط ملوّنة
5. اضغطي **"اشترك الآن"** على "توثيق أساسي" (200 BC)
6. confirm dialog → تأكيد
7. ✅ Toast: "مبروك! تم تفعيل توثيق أساسي"
8. ✅ في PlansSheet، البطاقة الآن "الحالي" + الرصيد نقص 200

### 3) تمديد الاشتراك
1. أعد الخطوة 2 لنفس الخطة
2. ✅ Confirm dialog يقول "تمديد"
3. ✅ Toast: "تم تمديد توثيق أساسي بنجاح"
4. ✅ الـverifiedUntil يمتد 30 يوماً إضافياً

### 4) منح أدمن
1. `/admin/subscriptions` → tab "الكل"
2. ✅ سترين المستخدم في القائمة مع شارة BadgeCheck
3. اضغطي عليه → صفحة التفاصيل
4. اضغطي **"تمديد / منح"** الأخضر
5. اختاري خطة + اكتبي عدد أيام (مثلاً 60) + سبب
6. تأكيد
7. ✅ Toast: "تم تمديد التوثيق" + verifiedUntil يمتد

### 5) إلغاء + استرداد
1. في تفاصيل المستخدم، اضغطي **"إلغاء الاشتراك"**
2. اكتبي سبب
3. ✅ علّمي **"استرداد الرصيد"**
4. تأكيد
5. ✅ Toast: "تم الإلغاء واسترداد 200 BC"
6. ✅ في `/admin/wallet/[uid]`: الرصيد عاد + معاملة refund جديدة

### 6) Auto cleanup
1. اعملي اشتراكاً لمستخدم، ثم في Firestore Console عدّلي `verifiedUntil` ليصبح ماضياً
2. افتحي `/admin/subscriptions` (انتظري بضع ثوانٍ)
3. ✅ تلقائياً: المستخدم انتقل لـtab "منتهي"، verificationStatus = "expired"

### 7) الشارة تختفي تلقائياً
- في صفحة المتداول العامة (`/traders/[uid]`)، الشارة تظهر بناءً على `isVerifiedNow`
- عند الانتهاء، `isVerifiedNow` يُرجِع false → الشارة تختفي حتى لو الـstatus لم يُحدَّث بعد
- هذا يضمن **اختفاء فوري** حتى قبل cleanup

---

## تكامل مطلوب (يدوي)

### لإظهار شارة "موثَّق" في الموقع

في `components/trader/trader-profile-header.tsx` أو حيث تظهر بيانات المتداول، استخدمي:

```tsx
import { isVerifiedNow } from "@/lib/wallet/verification";
import { BadgeCheck } from "lucide-react";

// داخل JSX:
{isVerifiedNow(trader) && (
  <BadgeCheck size={18} className="text-emerald-500" />
)}
```

هذا يستبدل أي logic قديم لـ`isVerifiedDealer` (إن وجد). الفرق:
- **القديم**: `isVerifiedDealer: boolean` (يدوي من الأدمن)
- **الجديد**: يحسب من `verifiedUntil` + `verificationStatus` (تلقائي)

### لإظهار تنبيه "ينتهي قريباً" للمستخدم

في profile أو navbar:

```tsx
import { useMyVerification } from "@/hooks/wallet/use-verification";

const { expiringSoon, daysRemaining } = useMyVerification();

{expiringSoon && (
  <div className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-800">
    ⚠️ توثيقك ينتهي خلال {daysRemaining} أيام. جدّد الآن.
  </div>
)}
```

---

## الأمان

3 طبقات (مثل A+B):

| الطبقة | الحماية |
|---|---|
| **Firestore Rules** | `verifiedUntil`, `verificationPlan`, `verificationStatus` في unchanged list (من A+B) |
| **API Routes** | كل عملية transactional + verify auth + log |
| **Feature Flag** | `verification_paid` يمنع الـAPI عند الإيقاف |

### Race conditions محلولة
كل عمليات الشراء/التمديد/الاسترداد تستخدم `runTransaction`:
- لا rachat مزدوج
- balance لا يصبح سالباً
- verifiedUntil يُحدَّث بشكل atomic

---

## التفاصيل التقنية

### لماذا "granted" منفصل عن "active"؟
- `active` = المستخدم دفع
- `granted` = أدمن منحه مجاناً
- مهم للإحصاءات: كم مستخدم يدفع فعلاً vs مجاني
- في الـUI: كلاهما يظهر "نشط" مع badge "مجاني" للأخير

### Lazy cleanup
بدلاً من Cloud Scheduler (Blaze plan)، نُنظّف عند فتح الأدمن للصفحة:
- Trigger تلقائي مرة كل 60s
- يقتصر على 200 وثيقة لكل استدعاء (تجنّب timeout)
- الـUI نفسه يستخدم `isVerifiedNow` ⇒ المستخدم لا يرى توثيقاً منتهياً حتى لو DB لم يُحدَّث بعد

### Pricing مركزي
```
basic:    200 BC / 30 يوم
gold:     500 BC / 30 يوم
vip:      800 BC / 30 يوم
business: 1500 BC / 30 يوم
annual:   2000 BC / 365 يوم
```
في `lib/wallet/types.ts` — تعديلها لاحقاً = ملف واحد.

---

## ما المتبقي

### الجولة D: Referrals + UI Polish
- نظام إحالات كامل
- روابط دعوة + تتبّع + مكافأة 10 BC للطرفين
- صفحة "ادعُ أصدقاءك" بـUI ممتاز
- تنبيهات + animations نهائية

هل تريدين الجولة D الآن؟
