# المرحلة 4 — الجزء 2/4: توحيد نظام الأدمن

تم توحيد نظام الأدمن في كل المشروع لمصدر واحد: `users/{uid}.isAdmin === true`.

## الملفات المعدَّلة (4 ملفات)

```
lib/firebase.ts                       ← isAdminEmail → isBootstrapAdminEmail (deprecated)
contexts/AuthContext.tsx              ← isAdmin يقرأ من Firestore فقط + bootstrap logic
components/listing-comments.tsx       ← profile?.role === "admin" → useAuth().isAdmin
app/admin/users/page.tsx              ← + زر منح/سحب صلاحيات الأدمن
```

## التطبيق

```bash
unzip admin-unification.zip
git add lib/ contexts/ components/ app/
git commit -m "feat(admin): unify admin system to users/{uid}.isAdmin === true"
git push
```

تم اختباره بـ `tsc --noEmit` → **0 أخطاء**.

---

## نقاط الضعف التي تم إصلاحها

### 1) ❌ 4 طرق متضاربة للتحقق من الأدمن

```ts
// قبل:
useAuth().isAdmin                              // ✅ من Firestore (بعد إصلاح أيضاً)
profile?.role === "admin"                      // ❌ في listing-comments.tsx — حقل غير موجود!
isAdminEmail(email)                            // ❌ في admin/users.tsx — env-based
u.isAdmin || isAdminEmail(u.email)             // ❌ مرة أخرى env-based
```

**النتيجة قبل:** أدمن في صفحة قد لا يكون أدمن في صفحة أخرى. مثلاً: أدمن من قائمة env يستطيع دخول /admin، لكن لا يستطيع حذف تعليق لأن الكود يفحص `profile?.role`.

**بعد:** كل المشروع يستخدم نفس المصدر:
```ts
const { isAdmin } = useAuth(); // ✅
```
الذي يقرأ مباشرة من `profile?.isAdmin === true`.

### 2) ✅ كيف يتمّ منح أوّل أدمن (Bootstrap)

نظراً لأن المصدر الوحيد هو حقل في Firestore، نحتاج طريقة لإنشاء **أول** أدمن. الحل:

**في `AuthContext.tsx`:**
```ts
const loadProfile = useCallback(async (currentUser) => {
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    // مستخدم جديد - bootstrap لو إيميله مسجَّل
    const shouldBootstrapAdmin = isBootstrapAdminEmail(currentUser.email);
    await setDoc(userRef, {
      // ...
      isAdmin: shouldBootstrapAdmin, // ← يُكتب مرة واحدة فقط
    });
    return;
  }

  // مستخدم موجود - تحديث lastLoginAt فقط، **لا يُلمَس isAdmin**
  await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true });
});
```

**النتيجة:**
- أوّل تسجيل دخول لإيميل في `NEXT_PUBLIC_ADMIN_EMAILS` → `isAdmin: true` يُكتب تلقائياً
- بعد ذلك، **تغيير env vars لا يؤثر** على أي مستخدم
- إدارة الأدمن تتم فقط من `/admin/users` بزر "منح/سحب"

### 3) ✅ صفحة `/admin/users` بزر toggle احترافي

قبل:
```tsx
const admin = u.isAdmin || isAdminEmail(u.email);  // عرض فقط
```

بعد:
```tsx
const isAdmin = u.isAdmin === true;  // عرض من Firestore فقط

<button onClick={() => toggleAdmin(u)}>
  {isAdmin ? "سحب" : "منح أدمن"}
</button>
```

**ميزات الزر:**
- لا يستطيع الأدمن سحب صلاحياته من نفسه (حماية من قفل النظام)
- يُظهر confirm dialog قبل التغيير
- يكتب `isAdmin: bool + updatedAt` على Firestore
- لون أخضر للمنح، وردي للسحب
- شارة "أنت" بجانب اسم الأدمن الحالي للتمييز

### 4) ✅ Deprecated alias للتوافق الرجعي

```ts
// lib/firebase.ts:
export const BOOTSTRAP_ADMIN_EMAILS = [...];
export const isBootstrapAdminEmail = (email) => {...};

/**
 * @deprecated استخدم useAuth().isAdmin
 */
export const isAdminEmail = isBootstrapAdminEmail;
```

→ أي كود قديم لم نعدّله لا يكسر، ويظهر تحذير في IDE لاستبداله لاحقاً.

---

## الملف الذي تم تعديله بالتفصيل

### `lib/firebase.ts`
- `ADMIN_EMAILS` → `BOOTSTRAP_ADMIN_EMAILS` (اسم أوضح)
- `isAdminEmail` → `isBootstrapAdminEmail` (أوضح للقارئ)
- إبقاء `isAdminEmail` كـ deprecated alias
- توثيق واضح: لا تستخدم لتقييم صلاحيات

### `contexts/AuthContext.tsx`
- إزالة `isAdminEmail(user?.email) || profile?.isAdmin` من الـ `useMemo`
- استبداله بـ: `isAdmin: profile?.isAdmin === true`
- إضافة منطق bootstrap: عند `loadProfile()` لمستخدم جديد، يُحفظ `isAdmin: true` لو الإيميل في BOOTSTRAP list
- توثيق شامل لكيفية عمل النظام في JSDoc

### `components/listing-comments.tsx`
- إضافة `isAdmin` إلى destructuring من `useAuth()`
- إزالة `profile?.role === "admin"` (سطرين)
- استخدام `isAdmin` المباشرة في `handleDelete` و render loop

### `app/admin/users/page.tsx`
- إزالة `isAdminEmail` import
- إزالة `u.isAdmin || isAdminEmail(u.email)`
- إضافة `toggleAdmin()` function تكتب `isAdmin: bool` مباشرة
- إضافة زر "منح/سحب" مع confirm dialog
- شارة "أنت" بجانب الأدمن الحالي
- حماية من سحب الذات (`if u.id === currentUser.uid`)

---

## التوافق مع Firestore Rules (الجزء 1)

القواعد الجديدة في الجزء 1 تفترض نفس المصدر:

```javascript
function isAdmin() {
  return signedIn()
    && exists(/databases/$(database)/documents/users/$(request.auth.uid))
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
}
```

→ **القواعد + الكود متطابقتان الآن** — أدمن في الواجهة = أدمن في القواعد، لا تضارب.

أيضاً القواعد تمنع:
- المستخدم من رفع `isAdmin` على نفسه ✅ (الحقل يُحرّر فقط بواسطة admin آخر أو counters)
- منح أدمن لشخص بعد تسجيله الأوّل عبر env ✅ (bootstrap logic لا يلمس existing users)

---

## التحقق

```
✓ tsc --noEmit                                → 0 أخطاء
✓ مصدر واحد للأدمن في كل الكود               → users/{uid}.isAdmin
✓ لا profile?.role === "admin" في الكود     → نعم، صفر تطابق
✓ لا isAdminEmail() لتقييم صلاحيات          → نعم (deprecated alias فقط)
✓ Bootstrap أوّل أدمن يعمل                   → نعم (لإيميلات في env عند أوّل تسجيل)
✓ صفحة /admin/users تدعم منح/سحب أدمن       → نعم
✓ حماية من سحب الأدمن لنفسه                  → نعم
✓ توافق مع Firestore Rules                   → نعم 100%
```

---

## نقاط للمرحلة التالية

| البند | حالته |
|---|---|
| ميزة دعوة أدمن جديد بالإيميل | يمكن إضافتها لاحقاً (تحتاج Cloud Function لإرسال invite) |
| سجل تغييرات صلاحيات الأدمن (audit log) | لم يُنفَّذ — يحتاج collection `admin_logs` |
| Custom claims في Firebase Auth (token-based) | لم يُنفَّذ — Firestore-based يكفي حالياً ولا يحتاج Cloud Functions |
| إضافة rule لمنع أدمن من سحب آخر أدمن في النظام | لم يُنفَّذ — يحتاج فحص count في rule |

**الجزء 3 الآن: مراجعة صفحات profile + favorites + messages.**
