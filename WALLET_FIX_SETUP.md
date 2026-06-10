# 💰 إصلاح مشكلة المحفظة: الرصيد لا يظهر بعد الموافقة

## 🔍 تتبّع العملية الكامل (Admin Approve → Wallet Balance)

```
1. الأدمن يوافق على طلب الشحن
   POST /api/admin/topup/[requestId]/approve

2. transaction ذرّية (سليمة ✅):
   ├─ يكتب walletTransactions/{txId}  (type: credit)
   ├─ يُحدّث users/{uid}.balance += 1000   ← الرصيد يُضاف فعلياً!
   └─ يُحدّث topupRequests/{id}.status = approved

3. إشعار (خارج الـtransaction): "تم إضافة 1000 BC"  ✅

4. ❌ الواجهة تعرض 0  ← المشكلة هنا
```

## 🎯 السبب الجذري (سببان متراكبان)

### السبب الأول (الأساسي): الـProfile لا يُحدّث realtime
**الملف**: `contexts/AuthContext.tsx`

```js
snap = await getDoc(userRef);   // ❌ قراءة مرة واحدة فقط (عند الدخول)
```

`AuthContext` يقرأ `users/{uid}` بـ`getDoc` **مرة واحدة** عند تسجيل الدخول. بعد الموافقة، الرصيد يُضاف في Firestore لكن الـ`profile` في ذاكرة المتصفح **لا يُحدّث** (لا يوجد `onSnapshot`). فالواجهة تعرض القيمة القديمة (0) حتى إعادة تحميل كاملة.

→ **الرصيد موجود فعلاً في قاعدة البيانات، لكن الواجهة لا تراه.**

### السبب الثاني: تضارب أسماء الحقول
- الموافقة + 6 APIs + `useWallet` تستخدم حقل **`balance`** ✅
- لكن `wallet/page.tsx` كان يقرأ **`walletBalance`** ❌
- و`transfer/route.ts` كان يكتب **`walletBalance`** ❌ (فالتحويلات أيضاً لا تظهر!)

---

## ✅ الإصلاحات

### 1. realtime listener في AuthContext (الأهم)
أضفتُ `onSnapshot` على `users/{uid}` يحدّث الـprofile (والرصيد) **لحظياً**:

```js
useEffect(() => {
  if (!user) return;
  const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.disabled === true) return;
    setProfile((prev) => prev ? { ...prev, ...data, uid: user.uid } : prev);
  });
  return () => unsub();
}, [user]);
```

الآن أي تحديث للرصيد (شحن، خصم، تحويل) ينعكس فوراً دون إعادة تحميل.
> لا يلمس منطق `loadProfile` الحسّاس (الحالات الخاصة: جديد/معطّل).

### 2. توحيد حقل الرصيد على `balance`
- `wallet/page.tsx`: يقرأ `balance` بدل `walletBalance`
- `transfer/route.ts`: يكتب `balance` بدل `walletBalance` (3 مواضع)

---

## 📊 إجابات أسئلتك المباشرة

| السؤال | الإجابة |
|---|---|
| أين تُحدّث حالة الطلب؟ | `topupRequests/{id}.status` داخل transaction ✅ |
| أين يُحدّث الرصيد؟ | `users/{uid}.balance` داخل transaction ✅ |
| هل تُنفّذ Transaction فعلاً؟ | **نعم**، ذرّية وسليمة ✅ |
| هل يوجد Firestore write failure؟ | **لا** — الكتابة تنجح |
| هل شرط يمنع إضافة الرصيد؟ | **لا** — الرصيد يُضاف فعلاً |
| **هل الرصيد يُضاف فعلاً؟** | **نعم** ✅ (في حقل balance) |
| **هل الواجهة تقرأ من نفس المصدر؟** | **كان لا** ❌ — السبب: (1) لا realtime، (2) wallet/page يقرأ walletBalance |

**الخلاصة**: الرصيد كان يُضاف بنجاح طوال الوقت. المشكلة أن الواجهة لم تكن تُحدّث (لا realtime) + تضارب اسم الحقل.

---

## الملفات

### معدّلة (3)
| الملف | التغيير |
|---|---|
| `contexts/AuthContext.tsx` | onSnapshot للـprofile (realtime) |
| `app/(public)/wallet/page.tsx` | يقرأ balance بدل walletBalance |
| `app/api/wallet/transfer/route.ts` | يكتب balance بدل walletBalance |

### المسؤولة عن العمليات (للمرجع، لم تُلمس - سليمة)
- الموافقة: `app/api/admin/topup/[requestId]/approve/route.ts` ✅
- إضافة الرصيد: نفس الملف (transaction) ✅

---

## النشر

```bash
git add contexts/AuthContext.tsx \
        "app/(public)/wallet/page.tsx" \
        "app/api/wallet/transfer/route.ts"
git commit -m "fix: realtime wallet balance + unify balance field"
git push
```

## ⚠️ ملاحظة عن الرصيد الحالي

طلب الشحن الذي تمت الموافقة عليه (1000 BC) **مضاف فعلاً** في `users/{uid}.balance`. بعد رفع الإصلاح، سيظهر فوراً (الـrealtime listener سيقرأه). لا حاجة لإعادة الموافقة.

> لو كان حسابك يعرض 0 بعد النشر: تأكدي أن الرصيد في حقل `balance` (وليس `walletBalance`) في وثيقة المستخدم بـFirestore Console.

## الاختبار

1. ارفعي الملفات الثلاثة
2. افتحي المحفظة → ✅ يظهر 1000 BC فوراً
3. جرّبي موافقة شحن جديدة → ✅ الرصيد يتحدّث لحظياً دون إعادة تحميل
4. جرّبي تحويل رصيد → ✅ يعمل الآن (كان مكسوراً بسبب walletBalance)
