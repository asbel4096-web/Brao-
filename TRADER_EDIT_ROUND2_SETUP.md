# Round 2 - صفحة تعديل المعرض الكاملة

صفحة `/profile/edit` بـ5 tabs لتحرير كل بيانات المعرض + رفع الصور.

## ما تم بناؤه (8 ملفات)

### Library
- `lib/dealer/storage.ts` — helpers لرفع/حذف الصور + ضغط client-side

### Components
- `components/dealer-edit/info-edit-tab.tsx` — Tab معلومات (اسم/موقع/هاتف/bio)
- `components/dealer-edit/image-edit-tab.tsx` — Tab لوجو أو غلاف (مشترك)
- `components/dealer-edit/gallery-edit-tab.tsx` — Tab معرض الصور (حتى 12)
- `components/dealer-edit/stories-edit-tab.tsx` — Tab Stories مع modal إنشاء

### Page
- `app/(public)/profile/edit/page.tsx` — الصفحة الرئيسية بـ5 tabs

### Storage
- `storage/storage.rules` — Storage Rules كاملة

---

## المميزات

### 🎨 Visual
- ✅ Tabs أفقية قابلة للـscroll مع pills زرقاء
- ✅ كل tab له أيقونة + وصف صغير
- ✅ Animations ناعمة عند التبديل (fade + slide)
- ✅ Previews كبيرة قبل الحفظ
- ✅ Loading states في كل العمليات

### ⚡ Performance
- ✅ **ضغط client-side للصور** قبل الرفع (يحفظ bandwidth)
  - Logo: max 800×800px
  - Cover: max 1920×1920px
  - Gallery/Story: max 1600×1600px
  - JPEG quality 0.85
- ✅ Cache-Control: 1 سنة على الـStorage
- ✅ Compression يُتخطّى لو الصورة < 500KB
- ✅ Progress bar لرفع متعدد

### 🔒 Security
- ✅ Storage rules: المالك فقط يكتب
- ✅ حد أقصى 10MB لكل ملف
- ✅ فقط `image/*` content types
- ✅ Validation client-side قبل الرفع

### 📱 UX
- ✅ Multiple file selection للـgallery
- ✅ Drag delete مع confirm
- ✅ معاينة realtime للصور المختارة
- ✅ Progress: "جارٍ رفع 3 من 7..."
- ✅ Toast notifications للنجاح/الفشل

### 🎯 Features-aware
- ✅ Gallery + Stories تظهر **فقط للمعارض الموثقة**
- ✅ غير الموثقين يرون رسالة تشجيعية للتوثيق
- ✅ Info + Logo + Cover متاحة للجميع

---

## خطوات النشر

### 1. ارفعي الملفات
```bash
git add lib/dealer components/dealer-edit app/(public)/profile/edit
git commit -m "feat(profile): dealer edit page with tabs"
git push
```

### 2. ⚠️ Storage Rules (مهم!)

في Firebase Console:
1. اذهبي إلى **Storage** (وليس Firestore)
2. اضغطي tab **"Rules"**
3. الصقي محتوى `storage/storage.rules` (دمج مع rules الموجودة)
4. اضغطي **"Publish"**

> ⚠️ **انتباه**: إذا لم تنشري Storage rules، الرفع سيفشل بـ"permission denied"!

### 3. لا npm install (Firebase + framer-motion موجودة)

---

## الاختبار الكامل

### اختبار 1: tab معلومات
1. ادخلي بحساب صاحب معرض
2. افتحي `/profile/edit`
3. ✅ تظهر صفحة بـ5 tabs، النشط "معلومات المعرض"
4. عدّلي الاسم والموقع
5. اضغطي "حفظ التغييرات"
6. ✅ Toast: "تم حفظ التغييرات"
7. ✅ افتحي `/traders/{uid}` → الاسم محدَّث

### اختبار 2: لوجو + غلاف
1. tab "اللوجو" → اضغطي "رفع صورة"
2. اختاري صورة من الجهاز
3. ✅ الرفع يحدث (تظهر loader)
4. ✅ Toast: "تم تحديث اللوجو"
5. ✅ صفحة المعرض تُظهر اللوجو الجديد
6. كرّري لـ"الغلاف"

### اختبار 3: معرض الصور
1. **يجب أن يكون الحساب موثقاً** (verifiedUntil أو isVerifiedDealer)
2. tab "معرض الصور"
3. اضغطي "إضافة صور"
4. اختاري **عدة صور دفعة واحدة**
5. ✅ Progress bar: "جارٍ رفع 1 من 5..."
6. ✅ كل صورة تظهر في Grid بعد الرفع
7. اضغطي 🗑️ على إحداها → confirm → تُحذف
8. ✅ في صفحة المعرض: الصور تظهر (سنُضيف tab "معرض الصور" في صفحة العرض لاحقاً)

### اختبار 4: Stories
1. tab "القصص"
2. سترين 4 تصنيفات (وصل حديثاً، عروض، إلخ)
3. اضغطي "+ إضافة" في تصنيف ما
4. Modal يفتح:
   - اختاري التصنيف
   - اختاري صورة
   - أضيفي وصف
5. اضغطي "نشر القصة"
6. ✅ Toast: "تمت إضافة القصة ✨"
7. ✅ القصة تظهر كـthumbnail تحت تصنيفها
8. ✅ افتحي `/traders/{uid}` → Story ring يظهر بـthumb القصة
9. اضغطي الـring → ✅ Viewer fullscreen يفتح القصة

### اختبار 5: للحساب غير الموثق
1. ادخلي بحساب **غير موثَّق**
2. tabs Info/Logo/Cover تعمل عادياً
3. tabs Gallery/Stories → ✅ رسالة "متاحة للمعارض الموثقة فقط"

---

## ⚠️ Storage Rules - تفصيل

### إن كان لديكِ `storage.rules` بالفعل:
ادمجي القسم الخاص بـ`users/{uid}/dealer/` فقط مع الـrules الموجودة.

### إن لم يكن لديكِ:
الصقي الملف كاملاً.

### الفحص:
بعد النشر، حاولي رفع صورة:
- ✅ نجاح → Rules صحيحة
- ❌ "permission-denied" → Rules غير منشورة أو خاطئة

---

## ما يكتمل في Round 1 + 2

| الوظيفة | الحالة |
|---|---|
| عرض صفحة المعرض الجديدة | ✅ Round 1 |
| Story Viewer fullscreen | ✅ Round 1 |
| تعديل المعلومات الأساسية | ✅ Round 2 |
| رفع لوجو + غلاف | ✅ Round 2 |
| معرض صور (12 صورة) | ✅ Round 2 |
| إنشاء/حذف Stories | ✅ Round 2 |
| Storage rules | ✅ Round 2 |

---

## ما المتبقي (Round 3 اختياري)

| التحسين | الأولوية |
|---|---|
| عرض **gallery tab في صفحة العرض** | عالية |
| Skeleton shimmer أثناء التحميل | متوسطة |
| Swipe down to close في story viewer | منخفضة |
| Image cropper (نسبة 1:1 للوجو) | منخفضة |
| إعادة ترتيب الـgallery (drag-drop) | منخفضة |

---

## 🎯 الحالة النهائية

النظام الآن **production-ready** للمعارض الموثقة:
1. صفحة عرض احترافية مطابقة للتصميم
2. صفحة تعديل كاملة بـ5 tabs
3. رفع آمن لكل أنواع الصور
4. Stories بـ4 تصنيفات
5. كل العمليات realtime + atomic

أعلميني بعد:
1. رفع الكود
2. نشر Storage rules
3. اختبار رفع لوجو + إنشاء قصة

ثم نُكمل Round 3 لو أردتِ.
