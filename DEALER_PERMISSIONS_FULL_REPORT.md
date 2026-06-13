# 🔍 تشخيص نهائي: Missing or insufficient permissions — تحرير المعرض

## ✅ وجدتُ حقلين فاشلين (لا واحد)

راجعتُ **كل** عمليات `updateDoc`/`setDoc`/`addDoc` في صفحات المعرض، وطابقتُ كل حقل بقواعد Firestore. النتيجة:

| الملف | الحقول المُرسلة | في القواعد؟ |
|---|---|---|
| `gallery-edit-tab.tsx` | **dealerGallery** | ❌ **مفقود** |
| `info-edit-tab.tsx` | **dealerLocation**, businessName, phone, whatsapp, bio, facebookUrl, instagramUrl, websiteUrl, workingHours | ❌ **dealerLocation مفقود** (الباقي ✅) |
| `image-edit-tab.tsx` | dealerLogo / dealerCover | ✅ موجود |
| `stories-edit-tab.tsx` | (addDoc في dealerStories - collection منفصل) | ✅ قاعدة أخرى |
| `profile/page.tsx` | coverURL | ✅ موجود |

**حقلان مفقودان من `hasOnly` يسبّبان الخطأ: `dealerGallery` و `dealerLocation`.**

---

## التقرير الدقيق المطلوب

### 1. اسم الملف (الملفات المسؤولة)
- `components/dealer-edit/gallery-edit-tab.tsx` (معرض الصور)
- `components/dealer-edit/info-edit-tab.tsx` (معلومات المعرض)

### 2. مسار الوثيقة التي يتم تحديثها
`users/{uid}` (في كلا الملفين)

### 3. الحقول المُرسلة إلى Firestore
- **gallery**: `dealerGallery` (arrayUnion عند الإضافة / arrayRemove عند الحذف) + `updatedAt`
- **info**: `dealerLocation`, `businessName`, `phone`, `whatsapp`, `bio`, `facebookUrl`, `instagramUrl`, `websiteUrl`, `workingHours`, `updatedAt`

### 4. الحقول غير الموجودة في Firestore Rules
| الحقل | الملف | السطر |
|---|---|---|
| **`dealerGallery`** | `gallery-edit-tab.tsx` | 77-78 (إضافة)، 109-110 (حذف) |
| **`dealerLocation`** | `info-edit-tab.tsx` | 113 |

أي تحديث يحوي حقلاً واحداً غير موجود في `hasOnly([...])` → Firestore يرفض **العملية كلها** → permissions error.

### 5. التصحيح النهائي

#### القاعدة (`firestore.rules`) — الإصلاح الجذري ⭐
أضفتُ الحقلين لقائمة `hasOnly` في فرع `users update`:
```
'dealerCover',
'dealerGallery',    ← مُضاف
...
'workingHours',
'dealerLocation',   ← مُضاف
'locationUrl',
```

#### الكود — تشخيص بالصيغة المطلوبة
أضفتُ في كل عملية (gallery/info/image):
```js
console.log("DOCUMENT PATH", ref.path);
console.log("DATA", data);
try {
  await updateDoc(ref, data);
} catch (e) {
  console.error("FIRESTORE ERROR FULL", e);
  throw e;
}
```

---

## ⚠️ الأهم: نشر القاعدة

ملف `firestore.rules` **يجب نشره** ليُطبَّق. تعديل الملف وحده لا يكفي:

```bash
firebase deploy --only firestore:rules
```

أو Firebase Console → Firestore → Rules → الصق → Publish.

> **السبب الأرجح لاستمرار الخطأ**: عدّلتِ/رفعتِ الكود، لكن القاعدة المنشورة في Console ما زالت القديمة (بلا dealerGallery/dealerLocation). القاعدة المنشورة هي ما يطبّقه Firestore فعلياً.

---

## الملفات المعدّلة (4)

| الملف | التغيير |
|---|---|
| `firestore.rules` | + dealerGallery + dealerLocation في allowlist |
| `components/dealer-edit/gallery-edit-tab.tsx` | logs تشخيصية |
| `components/dealer-edit/info-edit-tab.tsx` | logs تشخيصية |
| `components/dealer-edit/image-edit-tab.tsx` | logs تشخيصية |

### جديدة (0)

---

## النشر

```bash
# 1. الكود
git add firestore.rules components/dealer-edit/
git commit -m "fix(rules): allow dealerGallery + dealerLocation"
git push

# 2. القاعدة (ضروري - بدونه الخطأ يستمر)
firebase deploy --only firestore:rules
```

## الاختبار (بعد نشر القاعدة)
1. تحرير المعرض → معرض الصور → رفع صورة → ✅ يُحفظ
2. تحرير المعرض → معلومات → حفظ (مع موقع) → ✅ يُحفظ
3. Console: `DOCUMENT PATH users/...` ثم `FIRESTORE UPDATE DONE` (نجاح)

---

## نتيجة Build / TypeScript — بصراحة

⚠️ **لا أستطيع تشغيلها** (بيئتي بلا شبكة). **لن أدّعي نجاحاً.**

تحققتُ يدوياً:
- ✅ القاعدة + الملفات الثلاثة متوازنة
- ✅ dealerGallery + dealerLocation في القائمة
- ✅ logs بالصيغة المطلوبة (DOCUMENT PATH / DATA / FIRESTORE ERROR FULL)
- ✅ كل حقول المعرض الأخرى فُحصت — لا حقول مفقودة أخرى

**شغّلي `npm run build` محلياً وأرسلي أي خطأ.**

---

## ملاحظة

بعد نشر القاعدة والتأكد من نجاح الحفظ، الـconsole.log التشخيصية يمكن إزالتها (غير ضارة لكن تملأ Console). أخبريني لو تريدين نسخة نظيفة.
