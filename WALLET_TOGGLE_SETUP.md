# 🎛️ التحكم بإظهار/إخفاء المحفظة (Admin)

نظام مستقل يتيح للأدمن إظهار أو إخفاء نظام المحفظة كاملاً، + ربط زر المحفظة بصفحة /wallet.

---

## 📦 الملفات

### جديدة
- `hooks/use-wallet-enabled.ts` — hook مستقل يقرأ `config/app.walletEnabled` realtime
- `app/admin/wallet-settings/page.tsx` — صفحة الأدمن (toggle)
- `app/api/admin/wallet-settings/route.ts` — API آمن (admin فقط)
- `components/wallet/wallet-trigger.tsx` — زر المحفظة الجديد (يربط بـ/wallet + يختفي)
- `firestore/config-rules.txt` — Rules لإضافتها

### معدَّلة
- `app/(public)/wallet/page.tsx` — يستخدم النظام الجديد + redirect لو معطّلة

---

## كيف يعمل

```
config/app  →  walletEnabled: true/false   (مصدر الحقيقة الوحيد)
       │
       ├─→ useWalletEnabled() hook (realtime)
       │      │
       │      ├─→ WalletTrigger (زر الـheader) → يختفي لو false
       │      └─→ صفحة /wallet → redirect للرئيسية لو false
       │
       └─→ /admin/wallet-settings → toggle (admin فقط)
              └─→ POST /api/admin/wallet-settings (Admin SDK)
```

- **الافتراضي**: `true` (ظاهرة) لو الحقل غير موجود
- **realtime**: أي تغيير ينعكس فوراً على كل المستخدمين بدون refresh

---

## 🚀 خطوات النشر

### 1. ارفعي الملفات
```bash
git add hooks/use-wallet-enabled.ts \
        app/admin/wallet-settings \
        app/api/admin/wallet-settings \
        components/wallet/wallet-trigger.tsx \
        app/(public)/wallet/page.tsx
git commit -m "feat(wallet): admin toggle + link trigger to /wallet"
git push
```

### 2. ⚠️ ربط زر المحفظة في الـHeader

هذه أهم خطوة! في ملف الـheader (غالباً `components/site-header.tsx`)،
استبدلي زر المحفظة القديم بالجديد:

```tsx
// أعلى الملف
import { WalletTrigger } from "@/components/wallet/wallet-trigger";

// في مكان زر المحفظة القديم (BC 0):
<WalletTrigger />
```

> إن لم تجدي مكان الزر القديم، أرسلي لي محتوى `site-header.tsx` وسأدمجه بدقة.

### 3. ⚠️ Firestore Rules

أضيفي محتوى `firestore/config-rules.txt` إلى rules قبل القاعدة الأخيرة، ثم Publish.

### 4. (اختياري) رابط في قائمة الأدمن

في `admin-sidebar.tsx` أضيفي:
```tsx
<Link href="/admin/wallet-settings">
  إعدادات المحفظة
</Link>
```

### 5. ✅ لا dependencies جديدة

---

## 🧪 الاختبار

### اختبار الإظهار/الإخفاء:
1. ادخلي بحساب **admin**
2. افتحي `/admin/wallet-settings`
3. سترين toggle "نظام المحفظة (BC)"
4. **أطفئيه** → toast "تم إخفاء المحفظة"
5. افتحي الرئيسية → ✅ زر BC اختفى من الأعلى
6. حاولي فتح `/wallet` → ✅ يُعاد توجيهك للرئيسية
7. **شغّليه** → ✅ كل شيء يعود

### اختبار من حساب عادي:
1. بينما المحفظة مُخفاة، ادخلي بحساب عادي
2. ✅ لا يرى زر المحفظة إطلاقاً
3. ✅ `/admin/wallet-settings` يُعيد توجيهه (ليس admin)

---

## 🔒 الأمان

- ✅ الكتابة على `config/app` ممنوعة من client (Admin SDK فقط)
- ✅ الـAPI يتحقق من `isAdmin === true` في Firestore
- ✅ صفحة الأدمن تتحقق من isAdmin وتُعيد التوجيه لغير الأدمن
- ✅ fail-open: لو فشلت القراءة، المحفظة تبقى ظاهرة (لا تتعطّل تجربة المستخدم)

---

## ملاحظات

### لماذا config/app وليس النظام القديم؟
النظام القديم (`useFeatureFlag`) لم يكن متاحاً للتحقق، فبنيتُ نظامًا مستقلاً نظيفًا لا يتعارض معه. لو أردتِ لاحقاً توحيدهما، أخبريني.

### الأرصدة محفوظة
الإخفاء يُخفي الواجهة فقط. أرصدة المستخدمين في `users/{uid}.walletBalance` تبقى سليمة، وتعود فور التشغيل.

### زر المحفظة الجديد
- يعرض الرصيد realtime
- يربط بـ`/wallet` (الصفحة الكاملة)
- يختفي تلقائياً عند الإخفاء

أعلميني بنتيجة الاختبار، وأرسلي `site-header.tsx` لو احتجتِ مساعدة في ربط الزر 🚀
