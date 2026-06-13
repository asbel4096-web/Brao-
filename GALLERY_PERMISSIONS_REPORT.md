# 🔍 تشخيص: Missing or Insufficient Permissions عند صور المعرض

## ✅ السبب الدقيق (مؤكّد)

الحقل **`dealerGallery`** يُحدَّث في وثيقة المستخدم، لكنه **غير موجود** في قائمة الحقول المسموحة (`hasOnly`) داخل قواعد Firestore. لذا Firestore يرفض العملية بالكامل → **Missing or insufficient permissions**.

---

## التقرير الدقيق المطلوب

### 1. الملف المسؤول عن رفع الصور
`lib/dealer/storage.ts` → دالة `uploadGalleryImage(uid, file)` (ترفع الصورة لـStorage بمسار `users/{uid}/dealer/gallery/{id}.jpg`).
> **رفع الصورة لـStorage ينجح.** المشكلة ليست هنا.

### 2. الملف المسؤول عن تحديث وثيقة المستخدم
`components/dealer-edit/gallery-edit-tab.tsx`

### 3. اسم الحقل الذي يفشل
**`dealerGallery`** (مصفوفة روابط صور المعرض)

### 4. السطر الذي يسبب الخطأ
| العملية | السطر | الكود |
|---|---|---|
| **إضافة صورة** | `gallery-edit-tab.tsx:77-78` | `updateDoc(doc(db,"users",uid), { dealerGallery: arrayUnion(...newUrls) })` |
| **حذف صورة** | `gallery-edit-tab.tsx:109-110` | `updateDoc(doc(db,"users",uid), { dealerGallery: arrayRemove(url) })` |

كلاهما يفشل عند قاعدة `users update` في `firestore.rules` (حوالي سطر 152):
```
request.resource.data.diff(resource.data).affectedKeys().hasOnly([... قائمة لا تحوي dealerGallery ...])
```

### 5. التصحيح الكامل

#### أ. القاعدة (`firestore.rules`) — الإصلاح الجذري ⭐
أضفتُ `'dealerGallery'` لقائمة `hasOnly` في فرع `users update` (بعد `dealerCover`):

```
'dealerLogo',
'dealerCover',
'dealerGallery',   ← مُضاف
'dealerBio',
```

**هذا هو الإصلاح الفعلي.** بدونه يستحيل حفظ صور المعرض.

#### ب. الكود (`gallery-edit-tab.tsx`) — تشخيص
أضفتُ `console.log` قبل/بعد كل عملية + `try/catch` حول Firestore (كما طلبتِ):
```js
console.log("UPLOAD START", files[i].name);
console.log("FIRESTORE UPDATE START", { dealerGallery: ... });
try {
  await updateDoc(...);
  console.log("FIRESTORE UPDATE DONE");
} catch (fsErr) {
  console.error("FIRESTORE ERROR", fsErr);
  throw fsErr;
}
```
سترين في Console: `UPLOAD START` ثم `UPLOAD DONE` (الرفع نجح) ثم `FIRESTORE ERROR` (الكتابة فشلت) — يؤكّد أن المشكلة في القاعدة لا الرفع.

---

## فحص شامل لكل حقول تحرير المعرض

راجعتُ **كل** الحقول المكتوبة في ملفات تحرير المعرض وطابقتها بالقواعد:

| الملف | الحقول المكتوبة | في القواعد؟ |
|---|---|---|
| `gallery-edit-tab.tsx` | dealerGallery | ❌ **كان مفقوداً** → أُصلح |
| `image-edit-tab.tsx` | dealerLogo, dealerCover | ✅ موجود |
| `info-edit-tab.tsx` | businessName, bio, phone, whatsapp, workingHours, facebookUrl, instagramUrl, websiteUrl | ✅ موجود |
| `stories-edit-tab.tsx` | dealerLogo, dealerName | ✅ موجود |

**`dealerGallery` كان الحقل الوحيد المفقود.** لا حقول أخرى فاشلة (galleryImages/gallery/images/photos/showroomImages غير مستخدمة في المشروع).

---

## ⚠️ الأهم: نشر القاعدة

تعديل ملف `firestore.rules` **لا يكفي** — يجب **نشره** على Firebase ليُطبَّق:

```bash
firebase deploy --only firestore:rules
```

أو من Firebase Console → Firestore → Rules → الصق المحتوى → Publish.

> هذه القاعدة المنشورة في Console هي ما يطبّقه Firestore فعلياً (ليس الملف في GitHub). فجوة بينهما = الخطأ مستمر.

---

## الملفات المعدّلة (2)

| الملف | التغيير |
|---|---|
| `firestore.rules` | + `dealerGallery` في allowlist (الإصلاح الجذري) |
| `components/dealer-edit/gallery-edit-tab.tsx` | + console.log تشخيصية + try/catch |

### جديدة (0)

---

## النشر

```bash
# 1. الكود
git add firestore.rules components/dealer-edit/gallery-edit-tab.tsx
git commit -m "fix(rules): allow dealerGallery field + diagnostic logs"
git push

# 2. القاعدة (مهم جداً - بدونه الخطأ يستمر)
firebase deploy --only firestore:rules
```

## الاختبار
1. انشري القاعدة أولاً
2. تحرير المعرض → معرض الصور → ارفعي صورة
3. ✅ تُحفظ بلا خطأ صلاحيات
4. في Console: `UPLOAD START` → `FIRESTORE UPDATE DONE` (نجاح)

---

## نتيجة Build / TypeScript — بصراحة

⚠️ **لا أستطيع تشغيلها** (بيئتي بلا شبكة). **لن أدّعي نجاحاً.**

تحققتُ يدوياً:
- ✅ القاعدة متوازنة الأقواس
- ✅ gallery-edit-tab متوازن
- ✅ dealerGallery أُضيف للقائمة
- ✅ كل حقول تحرير المعرض الأخرى موجودة في القواعد (فحصتها واحداً واحداً)
- ✅ console.log + try/catch مضافة

**شغّلي `npm run build` محلياً وأرسلي أي خطأ.**

---

## ملاحظة

الـconsole.log التشخيصية تركتُها لمساعدتك على التأكد. بعد التحقق من نجاح الإصلاح، يمكن إزالتها لاحقاً (ليست ضارة، لكن تملأ Console). أخبريني لو تريدين نسخة نظيفة بدونها بعد التأكد.
