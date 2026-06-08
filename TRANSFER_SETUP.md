# 💸 ميزة تحويل الرصيد (BC Transfer) - مكتملة

تحويل رصيد BC بين المستخدمين عبر رقم الهاتف.

## القواعد المعتمدة
- 🔍 البحث عن المستلم **برقم الهاتف**
- 💰 **بدون رسوم** (المبلغ المُرسَل = المُستلَم)
- 🛡️ حد أدنى **10 BC** · أقصى **1000 BC** · **5 تحويلات/يوم**

---

## 📦 الملفات (في الـzip)

### جديدة
- `lib/wallet/transfer.ts` — الثوابت + helpers (تطبيع الهاتف، الفحوص)
- `app/api/wallet/transfer/route.ts` — API آمن (atomic transaction)
- `components/wallet/transfer-sheet.tsx` — واجهة التحويل (3 خطوات)
- `firestore/wallet-transfers-rules.txt` — Rules لإضافتها
- `firestore/wallet-transfers-index.json` — Index لإضافته

### معدَّلة
- `app/(public)/wallet/page.tsx` — ربط TransferSheet + زر التحويل
- `components/wallet-page/quick-services-grid.tsx` — تفعيل زر "تحويل رصيد" (أزيل "قريباً")

### مرفقة للاكتمال (من جولة /wallet السابقة - لو لم تُرفع بعد)
- `components/wallet-page/balance-hero.tsx`
- `components/wallet-page/transactions-section.tsx`
- `components/wallet-page/bc-services-section.tsx`
- `components/wallet-page/verification-section.tsx`

---

## 🔒 الأمان (3 طبقات)

1. **API يتحقق من الـID token** — فقط المستخدم المسجّل يُحوّل من حسابه
2. **Atomic transaction** — خصم + إضافة + سجلّات في عملية واحدة (لا يمكن أن تفشل جزئياً)
3. **Firestore rules** — `walletTransfers` لا يُكتب من client أبداً (Admin SDK فقط)

### فحوص الـAPI:
- ✅ المبلغ صحيح (10-1000، رقم صحيح موجب)
- ✅ المستلم موجود (بحث بالهاتف بكل الصيغ)
- ✅ ليس تحويلاً للنفس
- ✅ رصيد المرسِل كافٍ (داخل transaction)
- ✅ لم يتجاوز 5 تحويلات اليوم

---

## 🚀 خطوات النشر

### 1. ارفعي الملفات
```bash
git add lib/wallet/transfer.ts app/api/wallet/transfer \
        components/wallet/transfer-sheet.tsx \
        app/(public)/wallet components/wallet-page
git commit -m "feat(wallet): BC transfer between users"
git push
```

### 2. ⚠️ Firestore Rules

افتحي Firebase Console → Firestore → Rules، وأضيفي محتوى
`firestore/wallet-transfers-rules.txt` **قبل** القاعدة الأخيرة:
```
match /{document=**} { allow read, write: if false; }
```

ثم Publish.

### 3. ⚠️ Firestore Index

Firebase Console → Firestore → Indexes → Create:
- Collection: `walletTransfers`
- Field 1: `senderUid` (Ascending)
- Field 2: `createdAt` (Ascending)
- Query scope: Collection

> يأخذ 2-5 دقائق ليُبنى. بدونه، فحص الحد اليومي سيفشل.

### 4. ✅ لا dependencies جديدة

---

## 🧪 الاختبار

### تحضير: حسابان
تحتاجين حسابين (أو اطلبي من صديق رقمه):
- حساب أ (المرسِل) — لديه رصيد ≥ 10 BC
- حساب ب (المستلم) — أي حساب

### الخطوات:
1. ادخلي بحساب أ → `/wallet`
2. اضغطي **"تحويل رصيد"** (الأيقونة الخضراء)
3. أدخلي رقم هاتف حساب ب
4. أدخلي مبلغاً (مثلاً 50)
5. اضغطي "متابعة" → شاشة المراجعة
6. اضغطي "تأكيد التحويل"
7. ✅ شاشة نجاح: "أرسلت 50 BC إلى [الاسم]"
8. ✅ رصيدك نقص 50
9. ادخلي بحساب ب → رصيده زاد 50 + إشعار "وصلك رصيد جديد"

### اختبارات الحدود:
- ✏️ جربي مبلغ 5 → "الحد الأدنى 10 BC"
- ✏️ جربي مبلغ 2000 → "الحد الأقصى 1000 BC"
- ✏️ جربي رقمك أنت → "لا يمكنك التحويل لنفسك"
- ✏️ جربي مبلغاً أكبر من رصيدك → "رصيدك غير كافٍ"
- ✏️ جربي 6 تحويلات في يوم → "تجاوزت الحد اليومي"
- ✏️ جربي رقماً غير موجود → "لا يوجد مستخدم بهذا الرقم"

---

## 📋 ملاحظات

### الحقول في walletTransactions (للتوافق)
أضفتُ نوعين جديدين:
- `transfer_out` (خصم من المرسِل، amount سالب)
- `transfer_in` (إضافة للمستلم، amount موجب)

صفحة آخر العمليات (`transactions-section.tsx`) تعرضهما تلقائياً.
**ملاحظة**: قد تحتاجين إضافة أيقونة لهذين النوعين في `TYPE_META` بـ`transactions-section.tsx` لو أردتِ تمييزهما (حالياً يظهران بأيقونة افتراضية).

### المعادلة بالدينار
النظام يفترض 1 BC = 1 LYD. لو تغيّرت التسعيرة، عدّلي في `balance-hero.tsx`.

---

## ✅ الحالة النهائية للمحفظة

| الميزة | الحالة |
|---|---|
| شحن (Topup) | ✅ |
| إحالات (Referrals) | ✅ |
| توثيق (Verification) | ✅ |
| Boosts + Featured | ✅ |
| صفحة /wallet | ✅ |
| **تحويل رصيد** | ✅ **(جديد)** |
| MyFatoorah (دفع تلقائي) | ⏳ مؤجّل |

المحفظة الآن **مكتملة** عدا الدفع التلقائي (يحتاج حساب تجاري).

أعلميني بنتيجة الاختبار 🚀
