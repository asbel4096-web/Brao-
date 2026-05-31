# نظام طلبات شحن الرصيد

نظام كامل يسمح للمستخدم بطلب شحن رصيد، والأدمن بمراجعة الطلبات والموافقة عليها أو رفضها.

## كيف يعمل؟

```
1️⃣ المستخدم يفتح المحفظة → يضغط "شحن رصيد"
       ↓
2️⃣ يفتح dialog: يدخل المبلغ + طريقة الدفع + رقم التواصل + ملاحظة
       ↓
3️⃣ Toast: "تم إرسال طلب الشحن. سيراجعه الفريق قريباً"
       ↓
4️⃣ الأدمن يفتح /admin/topup-requests (tab "قيد المراجعة")
       ↓
5️⃣ يرى الطلب كاملاً (المبلغ، طريقة الدفع، رقم التواصل، ملاحظة)
       ↓
6️⃣ يتواصل مع المستخدم على الرقم → يستلم الدفع
       ↓
7️⃣ يضغط "موافقة" → الرصيد يُضاف فوراً + إشعار للمستخدم
   أو يضغط "رفض" → يكتب سبب → إشعار للمستخدم بالرفض
```

## ما تم بناؤه

### Library
- `lib/wallet/topup.ts` — types, 5 طرق دفع (تحويل بنكي/إدفعلي/تداول/كاش/أخرى)، حدود

### Hooks
- `hooks/wallet/use-topup-requests.ts`
  - `useMyTopupRequests()` للمستخدم
  - `useAdminTopupRequests(filter)` للأدمن مع إحصاءات

### Components
- `components/wallet/topup-sheet.tsx` — bottom sheet مع form + history
- `components/wallet/wallet-sheet.tsx` — معدَّل (زرّا الشحن يفتحان TopupSheet)
- `components/wallet/wallet-trigger.tsx` — معدَّل (ربط TopupSheet)

### API Routes
- `app/api/wallet/topup/request/route.ts` — المستخدم يُنشئ طلباً
- `app/api/admin/topup/[requestId]/approve/route.ts` — موافقة + إضافة رصيد + إشعار
- `app/api/admin/topup/[requestId]/reject/route.ts` — رفض + سبب + إشعار

### Admin
- `app/admin/topup-requests/page.tsx` — Dashboard كامل (4 tabs + إحصاءات + بطاقات تفاعلية)
- `components/admin/layout/admin-sidebar.tsx` — رابط "طلبات الشحن"

### Rules
- `firestore.rules` — collection `topupRequests` (read فقط من client، writes server-side)

---

## خطوات النشر

### 1️⃣ ارفعي الملفات
```bash
git add .
git commit -m "feat(wallet): topup requests system"
git push
```

### 2️⃣ انشري Firestore rules
من Firebase Console → Firestore → Rules → الصقي + Publish.

### 3️⃣ لا npm install
لا dependencies جديدة.

---

## الاختبار

### اختبار 1: المستخدم يطلب شحناً

1. سجّلي دخول كمستخدم عادي
2. تأكدي أن `wallet` flag مفعَّل (`/admin/settings/features`)
3. افتحي المحفظة من الـheader (الزر بـgradient أزرق)
4. اضغطي **"شحن رصيد"** (في البطاقة العلوية أو في Quick Actions)
5. سيفتح TopupSheet
6. أدخلي:
   - المبلغ: `500` (أو اضغطي زر سريع 100/200/500/1000)
   - طريقة الدفع: تحويل بنكي
   - رقم التواصل: `091XXXXXXX`
   - ملاحظة: "أرجو التواصل بعد الساعة 6 مساءً"
7. اضغطي **"إرسال طلب الشحن"**
8. ✅ Toast: "تم إرسال طلب الشحن. سيراجعه الفريق قريباً"
9. ✅ تنتقلين تلقائياً إلى view "history" مع الطلب الجديد بحالة "قيد المراجعة"

### اختبار 2: الأدمن يوافق

1. سجّلي دخول كأدمن
2. افتحي `/admin/topup-requests`
3. ✅ سترين بطاقة الطلب في tab "قيد المراجعة" (مع badge أصفر)
4. ✅ كل التفاصيل ظاهرة: المبلغ، طريقة الدفع، رقم التواصل (clickable للاتصال)، الملاحظة
5. تواصلي مع المستخدم على الرقم → استلمي الدفع
6. اضغطي **"موافقة"** (أخضر)
7. Confirm dialog → "موافقة"
8. ✅ Toast: "تمت الإضافة. الرصيد الجديد: 500 BC"
9. ✅ البطاقة تنتقل إلى tab "موافق عليها"
10. ✅ في `/admin/wallet/[uid]`: الرصيد ازداد + معاملة جديدة type=credit

### اختبار 3: المستخدم يتلقى الإشعار

1. سجّلي دخول كمستخدم (الذي طلب الشحن)
2. ✅ في الـheader، أيقونة الجرس عليها badge أحمر
3. اضغطيها → ستجدين إشعاراً: **"تمت الموافقة على طلب الشحن"**
4. ✅ في المحفظة: الرصيد محدَّث realtime
5. ✅ في حول TopupSheet → history: الطلب أصبح "تمت الموافقة"

### اختبار 4: الأدمن يرفض

1. كمستخدم: أرسلي طلباً جديداً
2. كأدمن: اضغطي **"رفض"** (أحمر)
3. dialog يفتح: اكتبي سبباً (مثلاً: "لم يصلنا التحويل البنكي")
4. اضغطي "تأكيد الرفض"
5. ✅ المستخدم يستلم إشعاراً بالسبب
6. ✅ في TopupSheet → history: الطلب "مرفوض" + السبب معروض بأحمر

### اختبار 5: Anti-spam

1. كمستخدم: أرسلي 3 طلبات شحن (متتالية)
2. حاولي إرسال طلب رابع
3. ✅ يفشل: "لديك 3 طلبات قيد المراجعة. انتظر مراجعتها أولاً"

---

## الميزات الذكية

### 1. Quick amounts
زرّان سريعان: 100 / 200 / 500 / 1000 → نقرة واحدة بدلاً من الكتابة

### 2. رقم التواصل قابل للاتصال
في dashboard الأدمن، الرقم يُعرض كـ`<a href="tel:...">` → نقرة لبدء مكالمة

### 3. رقم الهاتف مُعبأ تلقائياً
لو المستخدم لديه `phone` في profile، يُعبأ تلقائياً (يمكن تعديله)

### 4. Realtime
- المستخدم يرى تحديث حالة طلبه فور موافقة الأدمن
- الأدمن يرى الطلبات الجديدة فوراً (onSnapshot)
- لا حاجة لتحديث الصفحة

### 5. Highlight للطلبات المعلَّقة
في dashboard، صندوق "قيد المراجعة" يحصل على ring أصفر إذا كان > 0 (يلفت انتباه الأدمن)

### 6. Transactional الموافقة
عند الموافقة، 3 عمليات atomic:
- walletTransactions/{txId} يُكتب
- users.balance يُحدَّث
- topupRequests.status = "approved"

لا possibility لـpartial state.

---

## الأمان (3 طبقات)

| الطبقة | الحماية |
|---|---|
| **Firestore Rules** | المستخدم لا يستطيع كتابة `topupRequests` مباشرة، ولا تغيير status، ولا حتى قراءة طلبات الآخرين |
| **API Routes** | فحص idToken + role + validation + anti-spam (max 3 pending) |
| **Feature Flag** | `wallet` flag يمنع كل العمليات عند الإيقاف |

### ماذا لو حاول مستخدم خبيث؟

```javascript
// محاولة 1: تغيير status من client
await updateDoc(doc(db, "topupRequests", id), { status: "approved" });
// → permission-denied (rule: update: if false)

// محاولة 2: إنشاء طلب بـstatus="approved" مباشرة
await addDoc(collection(db, "topupRequests"), {
  userId, amount: 99999, status: "approved"
});
// → permission-denied (rule: create: if false)

// الطريق الوحيد = API:
//   POST /api/wallet/topup/request → دائماً status=pending
//   POST /api/admin/topup/{id}/approve → يفحص أن المُتصِل أدمن
```

---

## الـrequest doc كامل

```typescript
topupRequests/{id} = {
  userId: "abc123",
  userEmail: "user@example.com",
  userName: "أحمد العبدلي",
  userPhone: "0911234567",
  amount: 500,
  paymentMethod: "bank_transfer",
  paymentMethodLabel: "تحويل بنكي",
  contactNumber: "0911234567",
  note: "أرجو التواصل بعد العصر",
  status: "pending" | "approved" | "rejected",
  // عند المراجعة:
  reviewedBy: "admin-uid",
  reviewedByEmail: "admin@example.com",
  reviewedAt: Timestamp,
  reviewNote: "تم استلام التحويل" | "سبب الرفض",
  txId: "wallet-tx-id" (لو approved),
  createdAt: Timestamp,
}
```

---

## 📍 أين يصل المستخدم لزر الشحن؟

من **3 أماكن**:

1. **الـheader** → الزر `1,250 BC` → WalletSheet → "شحن رصيد"
2. **profile** → بطاقة المحفظة → WalletSheet → "شحن رصيد"
3. **داخل WalletSheet**:
   - زر كبير "شحن رصيد" في بطاقة الرصيد العلوية
   - زر "شحن رصيد" في Quick Actions

كل المسارات تؤدي إلى TopupSheet.

---

## ⚠️ ملاحظات

### الإدارة لا تظهر إذا...
- `wallet` flag مغلق → كل الـwallet UI يختفي بما فيه الشحن
- المستخدم غير مسجَّل دخول

### الإشعار يصل تلقائياً
يستخدم `notifications` collection الموجودة من المراحل السابقة. لا إعدادات إضافية.

### للمستقبل
لو أردتِ بوابة دفع حقيقية (MyFatoorah/Edfa3ly):
- بدّلي API request ليُنشئ payment session
- عند الـwebhook callback، استدعي approve API
- تبقى نفس البنية بدون تغيير DB

---

## نظام Wallet مكتمل!

| الجولة | المحتوى | الحالة |
|---|---|---|
| A | Feature Flags + Foundation | ✅ |
| B | Wallet Core + Admin Tools | ✅ |
| C | Verification Subscriptions | ✅ |
| D | Referrals + UI Polish | ✅ |
| **Integration** | **Header + Profile + شارة التوثيق** | ✅ |
| **Topup Requests** | **طلبات شحن من المستخدم** | ✅ |

المستخدم الآن يستطيع طلب شحن رصيد بنفسه، والأدمن يدير كل الطلبات من dashboard مركزي.
