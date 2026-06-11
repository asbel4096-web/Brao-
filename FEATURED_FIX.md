# 🎯 السبب الحقيقي: الإعلانات المميزة لا تظهر

## 🔍 التشخيص الدقيق (مع المشروع الكامل)

تتبّعتُ السلسلة كاملة فوجدتُ السبب الجذري الحقيقي:

### قاعدة Firestore تشترط status==approved
```
// firestore.rules
match /listings/{listingId} {
  allow read: if listingVisible();  // = status == 'approved' || مالك || أدمن
}
```

### لكن استعلام الإعلانات المميزة لم يفلتر بالـstatus
```js
// ❌ المنشور حالياً
query(collection(db,"listings"), where("featured","==",true), limit(50))
```

**المشكلة**: في Firestore، عندما تشترط قاعدة القراءة حقلاً (`status=="approved"`)، **يجب أن يحوي الاستعلام نفسه نفس الشرط** — وإلا يرفض Firestore الاستعلام **بالكامل** بـ`permission-denied` (لأنه قد يطال مستندات غير مسموح بقراءتها).

**النتيجة**: الاستعلام يفشل كلياً → `catch` → `items` فارغ → **القسم يختفي**، حتى لو وُجدت إعلانات مميزة معتمدة!

> دليل قاطع: `listings-grid` (الذي يعمل) يفلتر بـ`where("status","==","approved")`. أما `featured-near-you` فلا → يفشل. هذا الفرق هو السبب.

---

## ✅ الإصلاح (3 أجزاء)

### 1. إضافة فلتر status للاستعلام (`featured-near-you.tsx`)
```js
query(
  collection(db,"listings"),
  where("status","==","approved"),   // ← الإصلاح الحاسم
  where("featured","==",true),
  limit(50)
)
```
+ استعلام موازٍ لـ`isFeatured` (دعم الحقلين) + دمج.

### 2. الفهارس المركّبة (`firestore.indexes.json`)
الاستعلام صار مركّباً (`status` + `featured`) → يحتاج فهرساً. أضفتُ فهرسين:
- `status + featured`
- `status + isFeatured`

### 3. ترقية الـcache (`v1` → `v2`)
لتجاهل أي cache فارغ قديم فوراً.

---

## الملفات (2)

| الملف | التغيير |
|---|---|
| `components/featured-near-you.tsx` | فلتر status + دعم isFeatured + cache v2 |
| `firestore.indexes.json` | فهرسان جديدان (status+featured، status+isFeatured) |

---

## ⚠️ خطوة حرجة: إنشاء الفهرسين

بدون الفهرسين، الاستعلام المركّب يفشل. **طريقتان**:

### أ. من رابط الخطأ (الأسرع) ⭐
بعد رفع الكود، افتحي الرئيسية → افتحي console (DevTools):
- لو ظهر خطأ "The query requires an index" مع رابط → اضغطيه → **Create Index** → انتظري دقيقتين
- (سيظهر رابط لكل فهرس ناقص)

### ب. من CLI
```bash
firebase deploy --only firestore:indexes
```

### ج. يدوياً (Firebase Console → Firestore → Indexes → Create)
- Collection: `listings`
- Fields: `status` (Asc) + `featured` (Asc)
- كرّري لـ`status` + `isFeatured`

---

## النشر

```bash
git add components/featured-near-you.tsx firestore.indexes.json
git commit -m "fix: featured listings not showing (status filter + index)"
git push
# ثم أنشئي الفهرسين (طريقة أ أو ب)
```

## الاختبار
1. تأكدي من وجود إعلان مميّز **معتمد** (status=approved + featured=true)
2. بعد إنشاء الفهرسين + النشر → افتحي الرئيسية
3. ✅ قسم "سيارات مميزة" يظهر مع الإعلانات
4. console → ✅ لا permission-denied ولا index error

> لو ما زالت لا تظهر بعد كل ذلك: تأكدي أن الإعلان المميّز **معتمد** (status=approved). الإعلانات المميزة غير المعتمدة (pending) لن تظهر للزوّار — وهذا سلوك صحيح.

---

## ملخّص السبب

لم تكن المشكلة في `isListingFeatured` (رغم أني حسّنتها سابقاً)، بل في أن **الاستعلام كان يُرفض كلياً من Firestore** بسبب غياب فلتر `status==approved` الذي تتطلبه قواعد الأمان. الإصلاح يجعل الاستعلام متوافقاً مع القاعدة.
