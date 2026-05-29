# المرحلة 3 — نظام البلاغات والإشراف | دليل النشر

ميزات هذه المرحلة:

- ✅ **نظام بلاغات كامل**: المستخدمون يبلّغون عن إعلانات/تعليقات/مستخدمين
- ✅ **Dialog إبلاغ موحَّد** مع reasons محدّدة حسب نوع الـtarget
- ✅ **زر `ReportButton`** قابل لإعادة الاستخدام (3 variants)
- ✅ **صفحة `/admin/moderation/reports`** قائمة + فلترة + infinite scroll
- ✅ **صفحة تفاصيل البلاغ** مع 4 إجراءات: رفض، تحذير، حذف، حظر مالك
- ✅ **API route** آمن لمعالجة البلاغات + Activity logs
- ✅ **Banned Words system** مع إدارة كاملة من الأدمن
- ✅ **Hook فلترة client-side** للنماذج

---

## الملفات الجديدة (13)

### Library
- `lib/moderation/types.ts` — أنواع + reasons + statuses
- `lib/moderation/banned-words.ts` — منطق الفلترة + subscription cached

### Hooks
- `hooks/admin/use-reports-list.ts` — قائمة البلاغات
- `hooks/admin/use-banned-words-check.ts` — فحص نص

### Components
- `components/report/report-dialog.tsx` — Dialog الإبلاغ
- `components/report/report-button.tsx` — زر الإبلاغ (3 variants)

### Pages
- `app/admin/moderation/reports/page.tsx`
- `app/admin/moderation/reports/[reportId]/page.tsx`
- `app/admin/moderation/banned-words/page.tsx`

### API Routes
- `app/api/admin/reports/[reportId]/route.ts`
- `app/api/admin/banned-words/route.ts`
- `app/api/admin/banned-words/[wordId]/route.ts`

### Modified
- `components/admin/layout/admin-sidebar.tsx` (يستبدل من المرحلة 1) — رابط الكلمات
- `firestore.rules` — تعديل bannedWords للقراءة العامة

---

## خطوات النشر

### 1️⃣ ارفعي الملفات

```bash
git add .
git commit -m "feat(admin): phase 3 - moderation system"
git push
```

### 2️⃣ انشري قواعد Firestore

ملف `firestore.rules` يحوي تعديلاً واحداً: `bannedWords` تُقرأ من الجميع الآن.

عبر Firebase Console:
- Project Settings → Firestore → Rules
- الصقي + Publish

### 3️⃣ لا حاجة لـnpm install أو env vars جديدة

نستخدم Firebase Admin SDK الموجود من المراحل السابقة.

---

## دمج `ReportButton` في الموقع العام

النظام **جاهز** لكن لكي يستخدمه المستخدمون، يجب إضافة الزر في 3 أماكن:

### أ) في كارت الإعلان أو صفحة الإعلان
```tsx
import { ReportButton } from "@/components/report/report-button";

<ReportButton
  targetType="listing"
  targetId={listing.id}
  targetMeta={{
    title: listing.title,
    ownerId: listing.ownerId,
  }}
  variant="text"
/>
```

### ب) في كل تعليق
```tsx
<ReportButton
  targetType="comment"
  targetId={comment.id}
  targetMeta={{
    ownerId: comment.userId,
    parentListingId: listingId,
    snapshot: comment.text,
  }}
  variant="icon"
/>
```

### ج) في صفحة ملف المستخدم
```tsx
<ReportButton
  targetType="user"
  targetId={user.id}
  targetMeta={{
    title: user.name,
    ownerId: user.id, // نفسه
  }}
  variant="text"
/>
```

> **ملاحظة:** الزر يخفي نفسه تلقائياً إذا كان المُشاهِد هو صاحب المحتوى.

---

## دمج فلترة الكلمات في النماذج

### تعديل نموذج التعليق:
```tsx
import { useBannedWordsCheck } from "@/hooks/admin/use-banned-words-check";

function CommentForm() {
  const { check } = useBannedWordsCheck();
  const toast = useToast();

  const handleSubmit = async () => {
    const result = check(commentText);
    if (result?.severity === "block") {
      toast.error(
        `لا يمكن نشر هذا التعليق: الكلمة "${result.matchedWord}" غير مسموحة.`
      );
      return;
    }
    // باقي الكود...
  };
}
```

### في نموذج إضافة إعلان:
نفس النمط — قبل الـsubmit، افحصي `title + description`.

---

## بعد النشر — الاختبار

### اختبار 1: إبلاغ مستخدم عادي
1. سجّلي دخول كمستخدم عادي (ليس أدمن)
2. افتحي إعلان أحد المستخدمين الآخرين
3. اضغطي "إبلاغ" → اختاري سبب → أرسلي
4. يجب أن ترى toast نجاح

### اختبار 2: مراجعة الأدمن
1. سجّلي دخول كأدمن
2. افتحي `/admin/moderation/reports`
3. يجب أن ترى البلاغ الجديد في تبويب "معلَّقة"

### اختبار 3: اتخاذ إجراء
1. افتحي تفاصيل بلاغ
2. اختاري "أرشفة الإعلان" → تأكيد
3. يجب أن:
   - تظهر toast نجاح
   - تعود لقائمة البلاغات
   - يصبح البلاغ "مُنجَز" + الإعلان `status="archived"`
   - يُكتب سجل في `adminLogs`

### اختبار 4: Banned Words
1. اذهبي `/admin/moderation/banned-words`
2. أضيفي كلمة (مثلاً "سبام") مع severity = block
3. الآن من حساب آخر، حاولي كتابة تعليق فيه "سبام"
4. يجب أن يُمنع (إذا أضفتِ الفحص في نموذج التعليق)

### اختبار 5: Self-protection
- في إعلان لكِ، **لن يظهر** زر الإبلاغ (الزر يخفي نفسه)
- لو حاولتِ كأدمن "حظر صاحب المحتوى" وأنتِ هذا الصاحب → ترفض الـAPI

---

## ⚠️ ملاحظات

### Banned Words تظهر للجميع
بعد المرحلة 3، قائمة الكلمات المحظورة قابلة للقراءة من أي مستخدم
(لأن الفلترة client-side تحتاج قراءتها). هذا trade-off واعٍ. لو
تريدين إخفاءها، الفلترة يجب أن تتحول لـserver-side عبر Cloud
Function أو API route (مؤجَّل).

### إعلام المستخدم المُبلَّغ ضده
لا يصل إشعار للمستخدم عند حذف محتواه — مرحلة لاحقة. حالياً يكتشف
الأمر فقط عند ملاحظة اختفاء الإعلان.

### "تحذير" لا ينفّذ فعلياً
زر "تحذير" يُسجَّل في `adminLogs` فقط ويضع البلاغ "مُنجَز". إرسال
إشعار فعلي للمستخدم: مرحلة لاحقة (يحتاج broadcast مع targeting محدد).

### Composite Index
استعلام البلاغات يستخدم `where("status") + orderBy("createdAt")`.
Firestore عادة يُنشئ الـindex المطلوب تلقائياً عند أول استعلام
يفشل، أو يعطيك link لإنشائه يدوياً. إذا رأيتِ خطأ "requires an
index"، اضغطي الرابط في console واتركي Firebase ينشئه.

---

## المرحلة 4 المُقترحة

**Analytics + Charts:**
- Recharts integration
- Dashboard مع رسومات (نمو المستخدمين، إعلانات يومياً)
- Top cities, top categories
- Activity feed UI كامل
- KPIs مع تغيُّر % مقارنة الأسبوع الماضي

أعلميني عند جاهزيتك للمرحلة 4.
