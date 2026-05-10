# تجربة التسجيل والدخول الجديدة

تنفيذ كامل للأجزاء 1-2 من تحسينات الحساب. التحقق بـ `tsc --noEmit` → **0 أخطاء**.

## الفلسفة

**شاشة واحدة = هدف واحد.** لا cards جانبية، لا أعمدة، لا ازدحام.

استلهام من الصور التي أرسلتها (السوق المفتوح ومنصات أخرى):
- عنوان كبير في الأعلى
- شرح سطر واحد قصير
- حقل واحد بارز
- CTA كبير في الأسفل
- مساعدة + إغلاق في الشريط العلوي

**بدون تقليد** — هوية براتشو محفوظة (brand colors، Tailwind tokens، أيقونات Lucide بدل svg مرفقة).

## الملفات الجديدة (3 ملفات)

```
components/auth/auth-layout.tsx               ← هيكل مشترك لكل شاشات الحساب
app/(public)/login/LoginClient.tsx            ← Login بـ 2 steps داخلية
app/(public)/profile/complete/page.tsx        ← Onboarding بـ 4 steps
```

## التطبيق

```bash
unzip auth-flow-v1.zip
git add components/auth app/
git commit -m "feat(auth): one-purpose-per-screen login + step-based onboarding"
git push
```

---

## الجزء 1️⃣: تسجيل الدخول

### قبل
- صفحة واحدة فيها بطاقتان جنباً إلى جنب: Google + Phone
- reCAPTCHA كبير "normal" في الوسط = يحجز ~78px
- العداد 144 ثانية ببطاقة معقّدة بشريط تقدم
- تجربة مرتبكة على الموبايل (عمودان متراصّان)

### بعد - 2 steps داخلية

#### Step 1: phone
- عنوان: **"تسجيل الدخول أو التسجيل"**
- شرح: "الرجاء تعبئة رقم الموبايل"
- حقل واحد فقط: code الدولة (+218 ثابت مع علم ليبيا) + 9-10 أرقام
- CTA كبير: **"التالي"** (معطّل حتى يكتمل الرقم)
- فاصل "أو"
- زر Google ثانوي
- شريط ميزات في الأسفل (sell tagline)
- **reCAPTCHA invisible** — لا يحجز مساحة

#### Step 2: otp
- زر رجوع (←) للعودة لـ phone
- عنوان: **"ادخل رمز التحقق"**
- شرح: "أرسلنا رمزاً مكوّناً من 6 أرقام إلى +218XXXXX"
- حقل واحد: 6 أرقام بـ tracking كبير، autofocus، autocomplete="one-time-code"
- CTA كبير: **"تأكيد ودخول"**
- أسفل: countdown 144 ثانية مبسّط (نص فقط + أيقونة)
- بعد انتهاء العداد: زر "إعادة إرسال الرمز"

### مزايا UX إضافية

| الميزة | الفائدة |
|---|---|
| `inputMode="numeric"` | keyboard رقمي على الموبايل |
| `autoComplete="tel-national"` و `"one-time-code"` | iOS يقرأ الرمز من SMS تلقائياً |
| Enter يقدّم للخطوة التالية | تجربة كيبورد سلسة |
| `autoFocus` على الحقل النشط | مباشرة جاهز للكتابة |
| رسائل خطأ محدّدة لكل code من Firebase | إرشاد واضح بدل رسائل عامة |
| السماح بـ 9 أو 10 أرقام | يدعم 091xxxx (10) و 91xxxx (9) |

### redirect ذكي بعد تسجيل الدخول

```ts
const isProfileComplete = Boolean(profile?.name?.trim());

if (!isProfileComplete) {
  router.replace(`/profile/complete?redirect=${redirectTo}`);
} else {
  router.replace(redirectTo);
}
```

**النتيجة:** مستخدم جديد بدون اسم يُوجَّه تلقائياً إلى onboarding. مستخدم عائد يذهب لوجهته مباشرة.

---

## الجزء 2️⃣: إكمال الحساب — `/profile/complete`

### قبل
- لا توجد صفحة منفصلة — كل شيء في `/profile` (نموذج طويل)
- المستخدم الجديد لا يعرف أن عليه إكمال البيانات
- بيانات تقنية ظاهرة (uid، lastSignInTime)

### بعد - 4 steps واضحة

| الخطوة | المحتوى | إجباري؟ |
|---|---|---|
| **1. الاسم** | حقل واحد، autofocus | ✅ مطلوب |
| **2. الصورة** | preview كبير + camera button + "تخطي" | ❌ اختياري |
| **3. التواصل** | إيميل + هاتف بديل + نبذة (200 حرف) | ❌ كل الحقول اختيارية |
| **4. مراجعة** | preview كامل قبل الحفظ + ملاحظة "يمكنك التعديل لاحقاً" | — |

### تفاصيل بصرية

#### شريط التقدم
```
الخطوة 2 من 4                                    50%
■■■■■■■■■■□□□□□□□□□□
```
gradient brand خفيف + transition smooth.

#### Step 1 - الاسم
- input كبير `py-3.5` 
- hint تحت الحقل: "يظهر للمشترين على إعلاناتك"
- maxLength 60

#### Step 2 - الصورة
- صورة دائرية 32×32 مع ring brand
- لو لا توجد صورة: gradient brand بحرف الاسم
- زر camera floating bottom-left
- زر "اختر صورة" / "تغيير الصورة" + "إزالة الصورة"
- زر "تخطّي هذه الخطوة" (link style، تحت CTA)

#### Step 3 - التواصل
- 3 حقول، كلها اختيارية (مذكور صراحةً)
- counter `0/200` على نبذة

#### Step 4 - مراجعة
- Card فيها: صورة + اسم في الأعلى
- 3 صفوف للبيانات (label + value)
- ملاحظة "💡 يمكنك تعديل هذه البيانات لاحقاً"
- زر "حفظ وإكمال"

### Triple auth guard على الحفظ

نفس النمط من add-listing:
```ts
const liveUser = auth.currentUser;
if (!liveUser || liveUser.uid !== user.uid) {
  toast.error("انتهت جلستك...");
  return;
}
```

---

## مكوّن `AuthLayout` المشترك

كل شاشات الحساب الجديدة تستخدمه:

```tsx
<AuthLayout
  title="ادخل رمز التحقق"
  description="أرسلنا رمزاً..."
  onBack={() => setStep("phone")}
  backType="back"
>
  ...
</AuthLayout>
```

**الفوائد:**
- شريط علوي موحَّد (مساعدة يمين + back/close يسار)
- spacing موحَّد (`max-w-md` center + padding مريح)
- footer قانوني خفيف (اتفاقية + خصوصية)
- min-height = `100dvh` لاحترام شريط الأدوات في iOS

---

## التحقق

```
✓ tsc --noEmit                                 → 0 أخطاء
✓ هوية براتشو محفوظة                            → brand-700 + action + إيقونات Lucide
✓ RTL                                          → نعم في كل الصفحات
✓ موبايل first                                  → max-w-md، padding مريح، CTA كبير
✓ keyboard sequence سلس                         → autoFocus + Enter للتالي
✓ iOS SMS autofill                              → autoComplete="one-time-code"
✓ شاشة واحدة = هدف واحد                         → نعم (لا cards جانبية، لا أعمدة)
✓ redirect ذكي بعد login                        → مستخدم جديد → onboarding
```

---

## ما لم يُنفَّذ بعد (سيأتي في الأجزاء 3-5)

| الجزء | المحتوى |
|---|---|
| **3) توثيق رقم الهاتف** | حالياً مدمج في login. لو احتاج verification منفصل (واتساب OTP)، نفصله. |
| **4) صفحة الحساب الشخصي** | `/profile` - تنظيم البطاقات + إحصائيات أوضح |
| **5) صفحة الدعم** | `/contact` - وسائل تواصل بطاقة احترافية |

---

## نقاط للمتابعة لاحقاً

1. **WhatsApp OTP**: الصورة الأولى تظهر "وثق عبر الواتساب". هذا ليس Firebase Auth الافتراضي — يحتاج twilio/whatsapp business API. يمكن إضافته كـ provider إضافي لاحقاً.

2. **Apple Sign-In**: ظاهر في الصورة الثالثة. Firebase يدعمه لكن يحتاج Apple Developer account + config. يمكن إضافته كزر ثالث بعد Google.

3. **Country selector**: حالياً ليبيا فقط `+218`. لو وسّعت لدول أخرى لاحقاً، يحتاج dropdown مع flag selector.

4. **Email/Password fallback**: لم أضفه لأن المستخدمين على الموبايل يفضّلون OTP. يمكن إضافته كـ "تسجيل دخول بالبريد" لاحقاً.

5. **Profile completion %**: الصورة الخامسة تظهر progress bar للسيرة الذاتية. هذا feature ثانوي يمكن إضافته في صفحة /profile لاحقاً.
