# 🛡️ نظام التوثيق متعدّد الأنواع - التقرير الكامل

## 📊 التقرير المطلوب

### ما كان موجوداً بالفعل (~85%)
| المكوّن | الحالة |
|---|---|
| نظام طلب التوثيق (`dealer-verification`) | ✅ موجود |
| حالات الطلب (Pending/Approved/Rejected) | ✅ موجود |
| لوحة أدمن للموافقة/الرفض (`admin/subscriptions`) | ✅ موجود |
| نظام التقييمات الكامل (نجوم + متوسط + عدد + مراجعات نصية) | ✅ موجود (`useTraderReview`) |
| نموذج كتابة تقييم | ✅ موجود (`ReviewForm`) |
| صفحة ملف التاجر (صورة، تقييم، إعلانات، عضوية) | ✅ موجود |
| Firestore Rules للتوثيق والتقييمات | ✅ موجود |
| التحقق من التوثيق (`isVerifiedNow`) | ✅ موجود |
| خطط التوثيق المدفوعة (basic/gold/vip/business) | ✅ موجود |

### ما تم إضافته في هذه الجولة
| الإضافة | الملف |
|---|---|
| منطق أنواع التوثيق الثلاثة + استنتاج ذكي | `lib/verification-type.ts` (جديد) |
| مكوّن Badge موحّد (3 أنماط مميزة) | `components/verification/verification-badge.tsx` (جديد) |
| حقل `verificationType` في UserProfile | `lib/types.ts` (معدّل) |
| شارة التوثيق في بطاقة الإعلان | `components/listing-card.tsx` (معدّل) |
| شارة ديناميكية في صفحة التاجر | `components/trader/trader-profile-header.tsx` (معدّل) |

### نسبة الاكتمال بعد التعديل: **~98%**
الـ2% المتبقية: ربط الشارة في صفحة التفاصيل + الملف + المحادثات (أكواد جاهزة أدناه — لصق بسيط).

---

## 🎨 أنواع التوثيق الثلاثة

| النوع | الشارة | اللون | الأيقونة | متى |
|---|---|---|---|---|
| `account` | ✓ حساب موثق | أزرق | BadgeCheck | فرد (تحقق هوية) |
| `dealer` | 🏢 تاجر موثق | أخضر | Store | تاجر (له businessName) |
| `showroom` | 🚗 معرض موثق | بنفسجي | Building2 | معرض (له dealerName) |

**الاستنتاج الذكي** (توافق مع القديم): لو لا يوجد `verificationType` صريح، يُستنتَج النوع من البيانات:
- `dealerName`/`dealerLogo` → معرض
- `businessName` → تاجر
- غير ذلك → حساب

---

## 📦 الملفات

### جديدة (2)
- `lib/verification-type.ts` — المنطق + الأنماط
- `components/verification/verification-badge.tsx` — `<VerificationBadge>` + `<VerificationIcon>`

### معدّلة (3)
- `lib/types.ts` — حقل `verificationType`
- `components/listing-card.tsx` — شارة في البطاقة
- `components/trader/trader-profile-header.tsx` — شارة ديناميكية

---

## 🔧 الاستخدام

```tsx
import { VerificationBadge, VerificationIcon } from "@/components/verification/verification-badge";

// شارة كاملة (تستنتج النوع من المستخدم)
<VerificationBadge user={profile} size="md" />

// شارة مختصرة (للبطاقات)
<VerificationBadge user={profile} size="sm" short />

// أيقونة فقط (بجانب الأسماء)
<VerificationIcon user={profile} size={14} />
```

النوع يُستنتَج تلقائياً. أو افرضيه: `<VerificationBadge type="dealer" />`.

---

## 📌 ربط الشارة في الأماكن المتبقية (لصق بسيط)

### 1. صفحة تفاصيل الإعلان — بطاقة التاجر
في `app/(public)/listings/[id]/page.tsx`، بعد اسم التاجر (قرب سطر 352)، أضيفي:
```tsx
import { VerificationBadge } from "@/components/verification/verification-badge";
// ...
<VerificationBadge user={seller} size="sm" />
```
(`seller` = بيانات صاحب الإعلان المجلوبة في الصفحة)

### 2. الملف الشخصي
في `app/(public)/profile/page.tsx`، بجانب اسم المستخدم:
```tsx
import { VerificationBadge } from "@/components/verification/verification-badge";
// ...
<VerificationBadge user={profile} size="md" />
```

### 3. المحادثات
في رأس المحادثة (قرب اسم الطرف الآخر):
```tsx
import { VerificationIcon } from "@/components/verification/verification-badge";
// ...
<span>{otherUserName}</span>
<VerificationIcon user={otherUserProfile} size={14} />
```

> هذه إضافات بسيطة (سطر import + سطر استخدام). تركتُها كأكواد جاهزة بدل تعديل كل ملف تلقائياً، تجنّباً لأي خطأ في ملفات لم أرها بالكامل. لو أردتِ، أرسلي لي أيًّا منها وأدمجه بدقّة.

---

## النشر

```bash
git add lib/verification-type.ts \
        components/verification/verification-badge.tsx \
        lib/types.ts components/listing-card.tsx \
        components/trader/trader-profile-header.tsx
git commit -m "feat: multi-type verification badges"
git push
```

✅ **لا backend / Firestore جديد** (النظام يعمل، كما طلبتِ).
✅ **توافق كامل**: الحسابات القديمة بلا `verificationType` يُستنتَج نوعها تلقائياً.

---

## كيف تُحدّدين النوع صراحةً (اختياري)

لو أردتِ تحديد النوع يدوياً بدل الاستنتاج، أضيفي حقل `verificationType` في وثيقة المستخدم بـFirestore:
- `"account"` / `"dealer"` / `"showroom"`

أو أضيفيه في لوحة الأدمن عند الموافقة على التوثيق (تطوير مستقبلي بسيط).

---

## الاختبار

1. حساب بـ`dealerName` → ✅ شارة "🚗 معرض موثق" بنفسجية
2. حساب بـ`businessName` فقط → ✅ "🏢 تاجر موثق" خضراء
3. حساب موثق عادي → ✅ "✓ حساب موثق" زرقاء
4. حساب غير موثق → ✅ لا شارة
5. الشارة تظهر في: البطاقة + صفحة التاجر (والباقي بعد لصق الأكواد)
