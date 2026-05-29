# المرحلة 2 — إدارة المستخدمين | دليل النشر

ميزات هذه المرحلة:

- ✅ **5 API routes آمنة** (ban/unban/verify/role/delete)
- ✅ **صفحة قائمة المستخدمين** مع بحث + فلترة + infinite scroll
- ✅ **صفحة تفاصيل المستخدم** مع كل الإجراءات (realtime)
- ✅ **حظر مستخدم** = إخفاء كل إعلاناته المعتمدة تلقائياً
- ✅ **إلغاء الحظر** = استعادة الإعلانات للحالة الأصلية
- ✅ **Soft delete** = حذف آمن، الحساب يبقى في قاعدة البيانات
- ✅ **Activity logs** server-side لكل إجراء (collection: `adminLogs`)
- ✅ **Role assignment** محصور بـSuper Admin فقط
- ✅ **حماية lockout** = آخر Super Admin لا يستطيع إزالة دوره عن نفسه
- ✅ **منع الـself-actions** = لا حظر/حذف للنفس

---

## الملفات الجديدة (12)

### Library + Hooks
- `lib/admin/api-helpers.ts` — مكتبة مشتركة لكل API routes
- `hooks/admin/use-user-actions.ts` — Hook موحَّد للإجراءات
- `hooks/admin/use-users-list.ts` — قائمة + infinite scroll

### UI Components
- `components/admin/modules/users/users-table.tsx`
- `components/admin/modules/users/ban-user-dialog.tsx`
- `components/admin/modules/users/role-selector-dialog.tsx`

### Pages
- `app/admin/users/page.tsx` (يستبدل القديم)
- `app/admin/users/[uid]/page.tsx` (جديد)

### API Routes (server-side)
- `app/api/admin/users/[uid]/ban/route.ts`
- `app/api/admin/users/[uid]/unban/route.ts`
- `app/api/admin/users/[uid]/verify/route.ts`
- `app/api/admin/users/[uid]/role/route.ts`
- `app/api/admin/users/[uid]/delete/route.ts`

### Rules
- `firestore.rules` (يستبدل، فقط يضيف `isActiveUser()` helper - باقي القواعد كما كانت)

---

## خطوات النشر

### 1️⃣ ارفعي كل الملفات للمستودع

```bash
git add .
git commit -m "feat(admin): phase 2 - users management"
git push
```

### 2️⃣ انشري قواعد Firestore

عبر Firebase Console:
- افتحي https://console.firebase.google.com/project/bratsho-car/firestore/rules
- الصقي `firestore.rules` الجديد
- اضغطي **Publish**

### 3️⃣ Vercel سيبني تلقائياً

لا حاجة لـnpm install (لا dependencies جديدة).

> **مهم**: تأكدي من Environment Variables الموجودة من المرحلة السابقة:
> - `FIREBASE_ADMIN_PROJECT_ID`
> - `FIREBASE_ADMIN_CLIENT_EMAIL`
> - `FIREBASE_ADMIN_PRIVATE_KEY`
>
> بدونها، كل API routes ستفشل.

---

## بعد النشر — الاختبار

### اختبار 1: قائمة المستخدمين
1. افتحي `/admin/users`
2. يجب أن ترى جدول المستخدمين مع 50 صف أول دفعة
3. اختبري Tabs: الكل / الإدارة / موثَّقون / محظورون / محذوفون
4. اختبري البحث (بالاسم/email/phone)

### اختبار 2: تفاصيل مستخدم
1. اضغطي على أي مستخدم → يفتح `/admin/users/{uid}`
2. سترين معلوماته + شارة الدور + الإجراءات المتاحة حسب صلاحياتك

### اختبار 3: Verify
1. على مستخدم تاجر، اضغطي "توثيق الحساب"
2. تأكيد → يجب أن ترى شارة ✓ تظهر فوراً (realtime)

### اختبار 4: Ban (الأهم)
1. على مستخدم عادي (ليس Super Admin)، اضغطي "حظر المستخدم"
2. اكتبي سبب → "حظر"
3. شارة "محظور" حمراء تظهر فوراً
4. تأكدي من Firestore أن إعلاناته المعتمدة أصبح `status="archived"`
5. اختبري "إلغاء الحظر" → تعود الإعلانات لـ"approved"

### اختبار 5: Role assignment (super_admin فقط)
1. كـSuper Admin، افتحي مستخدماً عادياً
2. اضغطي "تعيين دور أدمن"
3. اختاري "Moderator"
4. تأكدي من Firestore: `users/{uid}.role = "moderator"` و `isAdmin = true`

### اختبار 6: Activity log
1. بعد أي إجراء، افتحي Firestore Console
2. اذهبي إلى collection `adminLogs`
3. يجب أن ترى وثيقة جديدة بكل تفاصيل الإجراء (من، ماذا، متى، before/after)

---

## ⚠️ سلوكيات مهمة

### حظر مستخدم → ماذا يحدث؟
- ✅ `banned = true`
- ✅ كل إعلاناته `status=approved` → `status=archived` مع `archivedReason="user_banned"`
- ✅ الإعلانات مخفية من الصفحات العامة
- ❌ المستخدم **لا** يُحذف من Firebase Auth (لو سجَّل دخول، سيرى رسالة حظر — تنفيذها مرحلة لاحقة)

### إلغاء الحظر
- ✅ `banned = false`
- ✅ إعلانات `archived + archivedReason=user_banned` تعود لـ`approved`
- ✅ لا تأثير على الإعلانات التي أرشفت لسبب آخر

### Soft Delete
- ✅ `deleted = true` + `banned = true` (الاثنين معاً)
- ✅ كل الإعلانات → archived
- ✅ الحساب يبقى في Firestore (يمكن استعادته يدوياً بإزالة `deleted` و `banned`)
- ❌ Firebase Auth account يبقى — حذفه نهائياً يحتاج خطوة إضافية (Firebase Auth Admin SDK)

### Self-protection
- لا حظر للنفس
- لا حذف للنفس
- آخر Super Admin لا يستطيع إزالة دوره عن نفسه

---

## استكشاف الأخطاء

### "Firebase Admin env vars missing"
- تحققي من 3 env variables في Vercel
- اعملي Redeploy بعد إضافتها

### "Forbidden: missing permission 'users.ban'"
- دورك لا يحوي الصلاحية
- راجعي `lib/admin/roles.ts` لرؤية الصلاحيات لكل دور
- أو ضعي نفسك `super_admin` للاختبار

### الإعلانات لم تُؤرشف بعد الحظر
- تحققي من حقل `ownerId` على الإعلانات
- لو يستخدم اسم آخر (مثل `userId`)، عدّلي الـAPI route

### Activity log فارغ
- تحققي من قاعدة `adminLogs` في firestore.rules
- يجب أن تكون `allow read: if isAdmin()` و `allow create: if false`
- الكتابة تتم Admin SDK (server-side)

---

## المرحلة 3 المقترحة

**Moderation - نظام البلاغات الكامل:**
- صفحة `/admin/moderation/reports`
- المستخدمون يبلّغون عن إعلانات/تعليقات/مستخدمين
- صفحة مراجعة + إجراءات سريعة
- ربط البلاغات بالإجراءات (مثلاً "حظر المُبلَّغ عنه")
- Banned words filter

أعلميني عند جاهزيتك.
