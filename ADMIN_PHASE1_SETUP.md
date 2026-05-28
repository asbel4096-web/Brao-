# المرحلة 1 — لوحة الإدارة الجديدة | دليل النشر

هذا الدليل يشرح خطوة بخطوة كيفية نشر **الأساس** للوحة الإدارة الجديدة.

> **ما الذي تم؟** الأساس: نظام Roles + Layout احترافي + Dashboard محسّن.
> **ما لم يتم بعد؟** Users management page، Reports، Analytics charts، CMS، Feature Flags UI، Activity Logs UI. كلها مراحل لاحقة.

---

## ما الذي يتغير في تجربتك؟

### قبل المرحلة 1:
- صفحة `/admin` بدائية (Sidebar بسيط، صفحة رئيسية بإحصاءات أساسية)
- نظام صلاحيات ثنائي: `isAdmin` فقط (نعم/لا)

### بعد المرحلة 1:
- **Layout احترافي**: Sidebar قابل للطي + Topbar + RTL + Dark mode + Mobile drawer
- **5 أدوار** بصلاحيات granular: super_admin, admin, moderator, support, analytics
- **Dashboard جديدة**: KPIs ملوّنة، Alerts بارزة، Quick actions، روابط ذكية حسب الصلاحيات
- **حماية أعلى**: تعديل role يحتاج super_admin، البان والـrole محميَّان من client

---

## خطوات النشر

### 1️⃣ ارفعي الملفات الجديدة

ملفات جديدة:
- `lib/admin/roles.ts`
- `lib/admin/permissions.ts`
- `hooks/admin/use-admin-role.ts`
- `hooks/admin/use-admin-stats.ts`
- `components/admin/ui/stat-card.tsx`
- `components/admin/ui/role-badge.tsx`
- `components/admin/layout/admin-sidebar.tsx`
- `components/admin/layout/admin-topbar.tsx`
- `components/admin/layout/admin-mobile-nav.tsx`

ملفات معدّلة (تستبدل الموجود):
- `app/admin/layout.tsx` ⚠️ يستبدل الـlayout القديم بالكامل
- `app/admin/page.tsx` ⚠️ يستبدل الـdashboard القديم
- `firestore.rules` ⚠️ يحوي القواعد الجديدة

### 2️⃣ انشري قواعد Firestore

عبر Firebase Console:
1. افتحي https://console.firebase.google.com/project/bratsho-car/firestore/rules
2. الصقي `firestore.rules` الجديد
3. اضغطي **Publish**

أو عبر CLI:
```bash
firebase deploy --only firestore:rules
```

### 3️⃣ ضعي نفسك Super Admin

⚠️ **هذه الخطوة حرجة**. بدون role، لن تظهر لكِ كل عناصر الـsidebar.

من Firebase Console:
1. افتحي `users/{uidك}` في Firestore
2. أضيفي حقل: `role` = `"super_admin"` (نوع: string)
3. تأكدي أن `isAdmin` = `true` (موجود من قبل)
4. احفظي

> **ملاحظة**: المستخدمون الأدمن القدامى الذين لديهم `isAdmin=true` بدون `role` يُعاملون كـ"admin" تلقائياً (توافق رجعي).

### 4️⃣ ادفعي للـVercel

```bash
git add .
git commit -m "feat(admin): phase 1 - roles, layout, dashboard"
git push
```

Vercel سيبني تلقائياً (~1 دقيقة).

---

## بعد النشر — اختبار

افتحي `/admin` على هاتفك:

✅ **يجب أن ترى:**
- Sidebar على الديسكتوب أو زر hamburger على الموبايل
- Dashboard فيها بطاقات KPIs ملوّنة
- بطاقتك في الأعلى مع role badge ("مدير عام" أحمر للـsuper_admin)
- Sidebar فيها كل الـlinks (لأنك super_admin)
- لو يوجد إعلانات معلَّقة → banner أصفر "يحتاج المراجعة"

✅ **اختبار permissions:**
1. غيِّري `role` على نفسك من `super_admin` إلى `moderator`
2. أعيدي تحميل `/admin`
3. الـsidebar الآن يُظهر فقط: اللوحة، الإعلانات، البلاغات، سجلّ النشاطات
4. ارجعيها إلى `super_admin`

---

## ⚠️ مشاكل محتملة

### "غير مخوَّل" تظهر لي رغم أني أدمن
- تأكدي أن `users/{uidك}.role` موجود وقيمته صحيحة
- تأكدي أن `isAdmin = true`
- اخرجي وادخلي مرة أخرى (لإعادة تحميل profile)

### Sidebar مختفي على الديسكتوب
- شاشة < 1024px (lg breakpoint) → استخدمي hamburger
- أو وسّعي نافذة المتصفح

### Dark mode غريب
- اختبري في نفس الـtheme الذي تستخدمينه في الموقع العام
- النظام يتبع `theme` من ThemeContext الموجود

### Permissions غير صحيحة
- افتحي `lib/admin/roles.ts` لرؤية صلاحيات كل دور
- لتعديل صلاحية: عدّلي `ROLE_PERMISSIONS` ثم redeploy

---

## الخطوة التالية (المرحلة 2)

بعد التأكد أن المرحلة 1 تعمل عندك:
- **إدارة المستخدمين**: جدول كامل + Ban/Verify/Edit + Role assignment UI
- **API routes** آمنة للعمليات الحساسة

أعلميني عند جاهزيتك للمرحلة 2.

---

## ملاحظات تقنية

### نظام الصلاحيات
- `lib/admin/permissions.ts` يحوي `canPerform(role, action)` - مدخل واحد لكل الفحوصات
- يدعم `*`, `module.*`, و exact match
- استخدميه دائماً قبل عرض زر إجراء أو تنفيذ عملية

### الـLayout
- `collapsed` state يُحفظ في localStorage (يستمر بين الجلسات)
- Mobile drawer مُغلَق افتراضياً، يُفتح بـhamburger
- ESC يُغلق الـdrawer
- اختيار link داخل الـdrawer يُغلقه تلقائياً

### الأمان
- جميع الـ`users.role_assign` تتطلب `super_admin`
- حقول `role`, `banned`, `bannedAt`, `bannedBy`, `banReason` محميَّة من client
- الـAPI routes للمراحل القادمة ستضيف server-side checks
