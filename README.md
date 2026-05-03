# المرحلة الأخيرة قبل الإطلاق — Bratsho Car

تنظيف نهائي + تحسينات UX + فحص للإنتاج.

## الملفات في الـ zip

```
lib/
└── firebase.ts                              ← مُحدَّث (حذف debug logs ⚠️ حرج)

contexts/
└── ToastContext.tsx                         ← جديد (نظام Toast بدل alert)

components/
├── confirm-dialog.tsx                       ← جديد (مكون + hook بدل confirm())
└── listing-comments.tsx                     ← مُحدَّث (toast/confirm)

app/
├── layout.tsx                               ← مُحدَّث (تسجيل Providers الجديدة)
├── (public)/
│   ├── favorites/page.tsx                   ← مُحدَّث (next/image + بطاقة موحدة)
│   ├── listings/[id]/page.tsx               ← مُحدَّث (toast بدل alert)
│   ├── messages/[chatId]/page.tsx           ← مُحدَّث (toast بدل alert)
│   ├── my-listings/page.tsx                 ← مُحدَّث (toast/confirm)
│   ├── notifications/page.tsx               ← مُحدَّث (toast + UI)
│   └── settings/page.tsx                    ← مُحدَّث (confirm للخروج)
└── admin/listings/page.tsx                  ← مُحدَّث (RejectDialog بدل prompt)
```

## التطبيق

```bash
unzip prelaunch-cleanup.zip
git add lib/ contexts/ components/ app/
git commit -m "chore: pre-launch cleanup - toast system, confirm dialogs, remove debug logs"
git push
```

تم اختباره بـ `tsc --noEmit` → **0 أخطاء**. لا تبعيات جديدة.

---

## الإصلاحات الحرجة

### 1) ⚠️ `lib/firebase.ts` — حذف debug logs (حرج للإنتاج)

كانت هناك ثلاثة أسطر `console.log` تطبع **`projectId`، `authDomain`، و أول 10 أحرف من `apiKey`** على كل تحميل صفحة في الإنتاج:

```ts
// تم حذفها:
console.log("[Firebase Debug] projectId:", firebaseConfig.projectId);
console.log("[Firebase Debug] authDomain:", firebaseConfig.authDomain);
console.log("[Firebase Debug] apiKey(first 10):", ...);
```

**لماذا حرج:**
- يلوّث console المستخدم بدون سبب.
- يكشف معرّف المشروع لأي شخص يفتح DevTools (ليس سرّاً تقنياً، لكنه إشارة عدم احترافية).
- يكشف عن وجود debug code متروك → يضرّ بالثقة بالعلامة.

**النسخة الجديدة:** تحذير واحد فقط في **dev mode** إن لم تُضبط متغيرات البيئة. صامت تماماً في production.

---

## نظام UX جديد

### 2) `contexts/ToastContext.tsx` — Toast بدل `alert()`

**المشكلة:** كان الكود يستخدم `alert()` العادي للأخطاء والرسائل في 7+ مكان:
- على الجوال يبدو سيئاً جداً وقديماً.
- يقطع الـ flow ويتطلب نقرة لإغلاقه.
- لا يدعم RTL.
- لا يدعم ألوان دلالية (نجاح/خطأ/تحذير).

**الحل:** نظام Toast كامل مع:
- 4 أنواع: `success` (أخضر) / `error` (أحمر) / `warning` (كهرماني) / `info` (أزرق).
- ظهور من الأعلى مع animation سلس.
- مدة افتراضية ذكية (3.5 ثانية للعادي، 5 ثوان للأخطاء).
- زر إغلاق + إغلاق تلقائي.
- queue للتوست المتعددة.
- API بسيط:

```ts
const toast = useToast();
toast.success("تمت إضافة التعليق.");
toast.error("تعذّر إرسال الرسالة.");
toast.warning("سجّل الدخول أولاً.");
toast.info("معلومة عامة.");
```

### 3) `components/confirm-dialog.tsx` — Confirm بدل `confirm()`

**المشكلة:** كان الكود يستخدم `window.confirm()` و `window.prompt()` في 4+ أماكن (حذف، تسجيل خروج، رفض إعلان):
- شكلهما مختلف في كل متصفح.
- على الجوال أحياناً يظهرون باللغة الإنجليزية حتى مع RTL.
- لا يمكن تخصيص النص أو الألوان.
- `prompt` لا يعمل بشكل موثوق على iOS.

**الحل:** ConfirmDialog و RejectDialog بتصميم احترافي:
- 3 ألوان (danger/warning/info).
- يفتح من الأسفل على الجوال (bottom sheet)، ومن الوسط على الديسكتوب.
- backdrop blur + animation.
- يدعم Escape و Enter للوحة المفاتيح.
- يقفل scroll الصفحة عند فتحه.

```ts
const confirm = useConfirm();
const ok = await confirm({
  title: "حذف الإعلان؟",
  message: "هذا الإجراء لا يمكن التراجع عنه.",
  confirmLabel: "حذف",
  tone: "danger",
});
if (!ok) return;
```

### 4) `app/admin/listings/page.tsx` — `RejectDialog` بدل `prompt()`

كان رفض الإعلان يستخدم:
```ts
const reason = prompt("سبب الرفض (اختياري):", "");
```

استُبدل بـ Modal مخصص يحتوي على:
- اسم الإعلان كسياق.
- textarea بحد 300 حرف للسبب.
- placeholder بأمثلة واقعية ("الصور غير واضحة، السعر مبالغ فيه...").
- زر تأكيد بحالة loading.

---

## تحسينات الواجهة الأخرى

### 5) `app/(public)/favorites/page.tsx`

- استبدال `<img>` بـ `next/image` (lazy loading + WebP/AVIF).
- بطاقة بنفس تصميم `ListingCard` للتناسق البصري الكامل.
- `aspect-[4/3]` للصورة + سعر عائم بـ brand-700.
- حالة فراغ محسّنة بأيقونة كبيرة وعبارة واضحة.
- toast عند الإزالة بدل refresh صامت.

### 6) `app/(public)/notifications/page.tsx`

- استبدال `/* ok */` (تجاهل صامت) بـ toast.error للأخطاء الفعلية.
- toast عند "تعليم الكل كمقروء".
- بطاقة كل إشعار محسّنة بأيقونة دائرية ملوّنة حسب النوع (موافقة/رفض/رسالة).
- حالة فراغ بأيقونة كبيرة وعبارة احترافية.
- زر "تعليم الكل" responsive (يظهر تحت العنوان على الجوال).

### 7) باقي الصفحات

كل `alert()` في المشروع → `toast.success/error/warning`:
- `app/(public)/listings/[id]/page.tsx` — alert "لا يمكنك بدء دردشة..." → `toast.warning`.
- `app/(public)/messages/[chatId]/page.tsx` — alert خطأ الإرسال → `toast.error`.
- `app/(public)/my-listings/page.tsx` — alert خطأ الحذف → `toast.error` + `useConfirm` للحذف.
- `app/(public)/settings/page.tsx` — `confirm("هل تريد تسجيل الخروج")` → `useConfirm` بألوان warning.
- `components/listing-comments.tsx` — alert "سجل الدخول" → `toast.warning` + `useConfirm` للحذف.

---

## فحص نهائي للإنتاج

تم الاختبار:

```
✓ tsc --noEmit                   → 0 أخطاء TypeScript
✓ grep "console.log"             → 0 (تم حذف debug logs)
✓ grep "TEMP DEBUG"              → 0 (تم حذف التعليقات المؤقتة)
✓ grep "alert("                  → 0 (تم استبدالها بـ toast)
✓ grep "window.confirm"          → 0 (تم استبدالها بـ useConfirm)
✓ grep "window.prompt"           → 0 (تم استبدالها بـ RejectDialog)
✓ Suspense boundary للـ login    → موجود (من المرحلة الأولى)
✓ Authorized domain للـ Vercel    → نُفِّذ في Firebase Console
✓ قواعد Firestore                → تشمل isAdmin() و chats
✓ متغيرات البيئة في Vercel        → تشير لـ bratsho-car (المشروع الصحيح)
```

`console.error` المتبقية (12 موقع) **مقصودة** — كلها داخل `catch` blocks مع `toast.error` مرافق، وهي المعيار الصحيح لتشخيص الأخطاء عبر console المتصفح أو أدوات مراقبة (مثل Sentry لاحقاً).

---

## تكامل مع المراحل السابقة

هذه المرحلة الخامسة. متوافقة 100% مع المراحل السابقة:
1. ✅ `categories-improvements.zip`
2. ✅ `listing-improvements.zip`
3. ✅ `messaging-improvements.zip`
4. ✅ `performance-improvements.zip`
5. ✅ **`prelaunch-cleanup.zip`** (هذه)

تم اختبار الـ zip فوق المراحل الأربع السابقة معاً بـ `tsc --noEmit` → 0 أخطاء.

## قائمة فحص قبل الإطلاق ✅

- [x] حذف debug logs من firebase.ts
- [x] استبدال alert/confirm/prompt بمكوّنات احترافية
- [x] تحسين Empty States في كل الصفحات
- [x] تحسين رسائل الأخطاء والنجاح
- [x] التوافق مع dark mode في كل المكوّنات الجديدة
- [x] RTL في كل المكوّنات الجديدة
- [x] mobile-first في الـ ConfirmDialog (bottom sheet) والـ Toast
- [x] keyboard navigation (Escape/Enter في ConfirmDialog)
- [x] aria attributes للـ accessibility
- [x] التحقق من 0 أخطاء TypeScript
- [x] لا تبعيات جديدة

**المشروع جاهز للإطلاق 🚀**
