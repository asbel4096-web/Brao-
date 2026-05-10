# تجربة الحساب — الأجزاء 3, 4, 5

تكملة لـ `auth-flow-v1.zip`. تنفيذ كامل لتوثيق الهاتف + صفحة الحساب + الدعم.

## الملفات (3 ملفات + 1 patch)

```
app/(public)/verify-phone/page.tsx         ← جديد - توثيق الهاتف بـ 3 steps
app/(public)/profile/page.tsx              ← إعادة تصميم احترافي
app/(public)/contact/page.tsx              ← جديد - صفحة دعم نظيفة
firestore-rules-patch.txt                  ← قاعدة support_messages
```

## التطبيق

```bash
# ⚠️ تأكد أنك طبّقت أولاً auth-flow-v1.zip (الأجزاء 1+2)
unzip auth-flow-v2.zip

# انسخ patch القواعد
# افتح firestore.rules وأضف القاعدة قبل match /{document=**}
# ثم انشر:
firebase deploy --only firestore:rules

# git
git add app/ firestore.rules
git commit -m "feat(auth-2): phone verify + premium profile + support page"
git push
```

تم اختباره بـ `tsc --noEmit` → **0 أخطاء**.

---

## الجزء 3️⃣ — توثيق الهاتف `/verify-phone`

### السيناريو
المستخدم سجّل دخوله بـ Google (بدون هاتف). الآن يريد إضافة هاتفه ليصبح موثَّقاً.

### 3 steps متتالية

#### Step 1: phone
- عنوان: **"قم بتوثيق رقم الموبايل"**
- شرح: "لبناء الثقة وحماية المستخدمين..."
- **box توضيحي** brand: "لماذا توثيق الرقم؟ يضمن وصول المشترين..."
- حقل رقم الهاتف بنفس تصميم login (+218 ثابت + علم ليبيا)
- CTA كبير "إرسال رمز التوثيق" مع أيقونة Phone

#### Step 2: otp
نفس تصميم login's OTP step:
- حقل 6 أرقام بـ tracking كبير
- countdown 144 ثانية
- زر إعادة الإرسال

**فرق مهم عن login OTP:** بدلاً من `confirmation.confirm()` (تسجيل دخول جديد)، يستخدم:
```ts
const credential = PhoneAuthProvider.credential(verificationId, code);
await linkWithCredential(user, credential);
```
→ يضيف الهاتف للحساب الموجود (Google) بدلاً من إنشاء حساب جديد.

#### Step 3: success
بطاقة نجاح خضراء فيها:
- ✓ أيقونة checkmark دائرة خضراء
- النص: "تم التوثيق"
- الرقم الموثَّق LTR: +218...
- زرّان:
  - **متابعة** (CTA كبير brand)
  - **أضف إعلان** (action color) — مطابق للصورة 9

### Edge cases مغطّاة
| Code | الرسالة |
|---|---|
| `auth/provider-already-linked` | تجاهل وتابع (مرتبط مسبقاً) |
| `auth/credential-already-in-use` | "هذا الرقم مرتبط بحساب آخر" |
| `auth/email-already-in-use` | "الإيميل المرتبط بهذا الرقم مستخدم" |
| `auth/too-many-requests` | "عدد كبير من المحاولات..." |
| `auth/invalid-phone-number` | "صيغة الرقم غير صحيحة" |

### حفظ في Firestore
```ts
await setDoc(doc(db, "users", user.uid), {
  phone: fullPhone,
  phoneVerified: true,
  updatedAt: serverTimestamp(),
}, { merge: true });
```

→ `phoneVerified: true` يمكن استخدامه في الواجهة لاحقاً (شارة "موثَّق").

---

## الجزء 4️⃣ — صفحة الحساب `/profile`

### بنية الصفحة (top → bottom على الموبايل)

```
┌──────────────────────────────────────────┐
│  [Header card]                            │
│   - gradient brand (h-24)                 │
│   - زر مشاركة في الأعلى يسار              │
│   - الصورة (24×24) تتداخل مع الـ gradient │
│   - الاسم + شارة موثَّق + شارة مشرف        │
│   - تقييم ★ (لو > 0)                      │
│   - رقم الحساب (قابل للنسخ) + عضو منذ    │
│   - زرّا: تعديل البيانات + إدارة الحساب  │
├──────────────────────────────────────────┤
│  [تنبيه توثيق - لو غير موثَّق]            │
│   - عنبر بحدود/خلفية                       │
│   - يدخل إلى /verify-phone                │
├──────────────────────────────────────────┤
│  [3 إحصائيات]                              │
│   - إعلاناتي / المفضلة / رسائل           │
│   - أرقام live من Firestore               │
├──────────────────────────────────────────┤
│  [لوحة الإدارة - للأدمن فقط]              │
├──────────────────────────────────────────┤
│  [قائمة]                                  │
│   - أضف إعلان جديد (action color)        │
│   - الإشعارات                             │
│   - تقرير المركبة (VIN)                  │
│   - الدعم والتواصل                        │
├──────────────────────────────────────────┤
│  [زر تسجيل الخروج]                        │
│   - وردي مع confirm                       │
└──────────────────────────────────────────┘
```

### مزايا UX

**رقم الحساب قابل للنسخ:**
```ts
await navigator.clipboard.writeText(user.uid);
```
يظهر آخر 8 أحرف من UID بـ font-mono. عند النقر → نسخ كامل UID للحافظة.

**مشاركة الحساب:**
```ts
if (navigator.share) {
  await navigator.share({ title, url: /traders/{uid} });
} else {
  navigator.clipboard.writeText(url);  // fallback
}
```
Native share sheet على الموبايل، نسخ تلقائي على الديسكتوب.

**Stats subscriptions مؤجَّلة:**
```ts
if ('requestIdleCallback' in window) {
  requestIdleCallback(startSubscriptions, { timeout: 2000 });
}
```
لا تعطّل الـ initial render. badge أحمر على "رسائل" لو هناك unread.

**Badge "موثَّق":**
```tsx
{isPhoneVerified && <ShieldCheck className="text-brand-700" />}
```
يستخدم `user.phoneNumber || profile.phone` كاختبار للتوثيق.

### إزالة الفوضى السابقة
- ✅ uid + lastSignInTime محذوفان (تقنية)
- ✅ 5 quick actions → 3 stats + قائمة منظمة
- ✅ logout بـ confirm (لا نقر بالخطأ)
- ✅ شريط gradient brand جذاب
- ✅ تنبيه توثيق الهاتف ذكي (يختفي عند التوثيق)

---

## الجزء 5️⃣ — صفحة الدعم `/contact`

### البنية

**Hero بسيط:**
```
هل تحتاج إلى مساعدة؟
فريق براتشو كار جاهز للرد...
```

**3 بطاقات تواصل (grid 3 columns على الجوال):**

| البطاقة | الأبرز؟ |
|---|---|
| 📱 واتساب | ✅ (border emerald-200، أكبر إبراز) |
| ☎️ اتصل بنا | عادي |
| ✉️ بريد إلكتروني | عادي |

كل بطاقة فيها:
- أيقونة كبيرة بـ rounded-2xl
- اسم الخدمة بـ font-black
- البيانات الفعلية تحته (الرقم، الإيميل)
- hover effect (-translate-y-0.5)

**نموذج "أرسل لنا رسالة":**

```tsx
type ContactType = "issue" | "suggestion" | "other";
```

- 3 chips type selector (مشكلة / اقتراح / أخرى)
- الاسم + طريقة التواصل + الرسالة (1000 حرف max)
- counter character تحت textarea
- pre-fill من `useAuth()`: اسم + هاتف/إيميل
- يحفظ في `support_messages` collection
- success state: بطاقة خضراء + checkmark + "إرسال رسالة أخرى" link

**وسائل التواصل الاجتماعي (compact chips):**
- Facebook
- WhatsApp
- Email

**روابط أسفل:**
- اتفاقية الاستخدام
- سياسة الخصوصية

### Firestore: collection جديدة `support_messages`

شكل الـ doc:
```ts
{
  type: "issue" | "suggestion" | "other",
  name: string,
  contact: string,
  message: string,         // <= 1000 char
  userId: string | null,   // null لو زائر
  userEmail: string | null,
  createdAt: serverTimestamp,
  status: "open"
}
```

القاعدة (في `firestore-rules-patch.txt`):
- **create**: أي زائر، مع شروط validation
- **read/update/delete**: الأدمن فقط

### تخصيص أرقام الدعم

في الأعلى من الملف:
```ts
const SUPPORT_PHONE = "+218912345678";
const SUPPORT_WHATSAPP = "218912345678";
const SUPPORT_EMAIL = "support@bratshocar.com";
```

استبدلها بأرقامك الفعلية.

---

## التحقق

```
✓ tsc --noEmit                            → 0 أخطاء
✓ verify-phone بـ Firebase linkWithCredential → نعم
✓ 5 edge cases في الأخطاء                  → نعم
✓ shareSheet للهاتف + clipboard fallback   → نعم
✓ stats subscriptions مؤجَّلة              → نعم (requestIdleCallback)
✓ logout بـ confirm                        → نعم
✓ admin section منفصل                      → نعم
✓ نموذج دعم بـ validation                  → نعم
✓ هوية براتشو محفوظة                       → brand + emerald + action
✓ RTL                                      → نعم في كل الصفحات
✓ موبايل first                             → max-w-md/2xl/3xl حسب الصفحة
```

---

## ما لم يُنفَّذ (واضح ولماذا)

### WhatsApp OTP بدلاً من Firebase Phone
الصورة الأولى تظهر "وثّق عبر الواتساب". هذا يحتاج:
- Twilio WhatsApp Business API ($$$)
- أو خدمة WhatsApp Cloud API من Meta
- Cloud Function لاستقبال webhook + توليد OTP + التحقق

**التوصية:** ابدأ بـ Firebase Phone Auth (SMS) — يكفي للسوق الليبي. أضف WhatsApp لاحقاً لو احتجت.

### Apple Sign-In
يحتاج Apple Developer Account سنوياً ($99). يمكن إضافته كزر ثالث في login.

### نسبة اكتمال الملف الشخصي (الصورة 5)
يمكن إضافة `useMemo` يحسب %:
```ts
const completion = [name, phone, email, photo, bio].filter(Boolean).length / 5 * 100;
```
وعرضه كـ progress bar. أُجَّل لأنه ميزة ثانوية.

### كرت "محفظة" أو "رصيد"
ميزة paid product — تحتاج payment integration. لم تُذكر في requirements الأساسية.

---

## نقاط المتابعة لاحقاً

1. **`profile.createdAt` ليس مضموناً موجوداً** على الحسابات القديمة (قبل ميزة timestamps). دالة `formatJoinDate` ترجع "—" في هذه الحالة. لا مشكلة عملياً.

2. **`/verify-phone` يفترض أن المستخدم مسجَّل دخول**. لو فُتح بدون auth → redirect لـ `/login?redirect=/verify-phone`.

3. **رسائل الدعم** ستحتاج صفحة admin لمراجعتها. يمكن إضافة `/admin/support` لاحقاً.

4. **روابط التواصل الاجتماعي** placeholders — استبدلها بالروابط الحقيقية.
