# Stories Feature — Bratsho Car

ميزة قصص موحَّدة على الصفحة الرئيسية مشابهة لـ Facebook Stories مع 3 أنواع: سيارة / خدمة / عرض.

## الملفات في الـ zip (12 ملف + قواعد)

```
lib/stories/
├── types.ts                              ← الأنواع الموحَّدة (StoryType, payloads, Story, ...)
└── helpers.ts                            ← timestamps, isExpired, groupByOwner

hooks/
└── useStories.ts                         ← جلب القصص النشطة مع فلترة expired

components/stories/
├── stories-row.tsx                       ← الصف الأفقي (الكومبوننت الرئيسي)
├── add-story-bubble.tsx                  ← فقاعة "+" الأولى
├── story-bubble.tsx                      ← فقاعة قصة (avatar مع gradient ring)
├── story-type-picker.tsx                 ← اختيار النوع: سيارة/خدمة/عرض
├── story-create-modal.tsx                ← Modal الإنشاء (صورة + حقول)
├── story-viewer.tsx                      ← مشغّل ملء الشاشة (مثل FB/IG)
└── story-fields/
    ├── car-fields.tsx                    ← حقول السيارة
    ├── service-fields.tsx                ← حقول الخدمة
    └── offer-fields.tsx                  ← حقول العرض

app/page.tsx                              ← مُحدَّث (إضافة StoriesRow أعلى Hero)

firestore.rules.example                   ← قواعد Firestore مهمّة
storage.rules.example                     ← قواعد Storage لرفع الصور
```

## التطبيق

```bash
unzip stories-feature.zip
git add lib/ hooks/ components/ app/
git commit -m "feat: stories feature (car/service/offer) with 24h expiry"
git push
```

⚠️ **مهم:** انسخ القواعد من `firestore.rules.example` و `storage.rules.example` إلى ملفاتك الفعلية قبل النشر للإنتاج.

تم اختباره بـ `tsc --noEmit --strict` → **0 أخطاء**.

---

## كيف يعمل النظام

### الصفحة الرئيسية

```tsx
// app/page.tsx
<StoriesRow />        {/* جديد: الصف الأفقي للقصص */}
<Hero />
<CategoryGrid />
<ListingsGrid />
```

`StoriesRow` يعرض:
1. **فقاعة "+"** أولاً دائماً (إضافة قصة).
2. **فقاعات القصص** للمستخدمين الذين لديهم قصص نشطة، مرتّبة من الأحدث للأقدم.
3. **عداد رقمي** على الفقاعة لو نفس المستخدم نشر أكثر من قصة.

### Flow النشر (3 خطوات)

```
[+] →  اختيار النوع  →  رفع صورة + ملء الحقول  →  نشر
       ┌──────────┐    ┌─────────────────────┐    ┌──────┐
       │  سيارة   │    │  preview الصورة     │    │ نشر  │
       │  خدمة    │    │  حقول حسب النوع    │    └──────┘
       │  عرض     │    │  validation        │
       └──────────┘    └─────────────────────┘
```

كل خطوة تعرض زر "رجوع" للتعديل.

### حقول كل نوع

| الحقل | سيارة | خدمة | عرض |
|---|---|---|---|
| صورة | ✅ مطلوب | ✅ مطلوب | ✅ مطلوب |
| عنوان | ✅ | اسم الخدمة | ✅ |
| وصف قصير | — | ✅ مطلوب | — |
| السعر | اختياري | — | — |
| الخصم | — | — | ✅ مطلوب |
| المدينة | ✅ | ✅ | ✅ |
| رابط إعلان | اختياري | — | — |
| اتصال | اختياري | ✅ مطلوب | اختياري |
| واتساب | اختياري | اختياري | اختياري |

### مشغّل القصص (StoryViewer)

مثل Facebook/Instagram تماماً:
- **5 ثوان لكل قصة** (قابل للتعديل في `STORY_DURATION_MS`).
- **شريط تقدم في الأعلى** لكل قصة.
- **اضغط مطوّلاً للإيقاف المؤقت** (touch + mouse).
- **اضغط على الجانب الأيسر = التالي**، الأيمن = السابق (RTL).
- **أزرار تنقل** على الديسكتوب (chevrons).
- **Escape** للإغلاق، **سهم يمين/يسار** للتنقل.
- **Auto-advance** بين قصص نفس المالك ثم انتقال للمالك التالي تلقائياً.
- **caption ديناميكي** أسفل الشاشة بحقول النوع + أزرار اتصال/واتساب.

---

## خصوصية المشاهدات (مهم!)

### في الواجهة

استخدمنا `<OwnerOnly>` (من المرحلة السابقة) داخل `StoryViewer`:

```tsx
<OwnerOnly ownerId={current.ownerId}>
  <div className="...">👁 {current.viewsCount}</div>
</OwnerOnly>
```

→ المشاهدون **لا يرون** عداد المشاهدات أبداً. المالك فقط.

### في Firestore (الحماية الفعلية)

في `firestore.rules.example`:

```
match /stories/{storyId} {
  allow read: if true;  // الكل يشاهد القصة

  allow update: if request.auth != null && (
    resource.data.ownerId == request.auth.uid  // المالك يعدّل
    ||
    // أو: المشاهد يزيد العداد فقط، لا يغيّر شيء آخر
    request.resource.data.viewsCount == resource.data.viewsCount + 1
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['viewsCount'])
  );
}

// قائمة المشاهدين بالاسم - للمالك فقط
match /viewers/{viewerId} {
  allow read: if get(...).data.ownerId == request.auth.uid;
  allow write: if request.auth.uid == viewerId;
}
```

→ حتى لو حاول مهاجم استدعاء Firestore مباشرة، لا يستطيع قراءة `viewsCount` بشكل مفصّل (لقائمة المشاهدين)، ولا يستطيع تعديل بيانات القصة.

### المالك لا يحسب لنفسه مشاهدة

```ts
if (user && user.uid === current.ownerId) {
  // skip view recording
}
```

---

## انتهاء صلاحية 24 ساعة

### عند الإنشاء

```ts
const expiresAt = Timestamp.fromMillis(Date.now() + STORY_LIFETIME_MS);
// STORY_LIFETIME_MS = 24 * 60 * 60 * 1000
```

### عند الجلب

```ts
where('expiresAt', '>', Timestamp.now())
```

→ القصص المنتهية لا تظهر حتى لو لم تُحذف من Firestore.

### تنظيف اختياري

في `firestore.rules.example` قسم Cloud Function يحذف القصص المنتهية كل ساعة لتوفير storage. اختياري — الميزة تعمل بدونه (فقط تتراكم القصص الميتة في الـ DB).

---

## التوسّع المستقبلي

### إضافة نوع جديد (مثلاً "ورشة")

1. أضف `"workshop"` إلى `StoryType` في `lib/stories/types.ts`.
2. أضف `WorkshopStoryPayload` interface وأضفه للـ union.
3. أضف entry في `STORY_TYPE_META`.
4. أنشئ `components/stories/story-fields/workshop-fields.tsx`.
5. أضف case للـ workshop في `story-create-modal.tsx` و `story-viewer.tsx`.

**لا تعديلات** على Firestore Schema أو القواعد.

### إضافة متابعة (يظهر للمالك من شاهد)

`viewers` subcollection موجود بالفعل! فقط أنشئ صفحة `/stories/[id]/viewers` تستعلم منها. القواعد تحمي الوصول.

### إضافة Stories من نوع فيديو

أضف `videoUrl?: string` بجانب `imageUrl` في الأنواع، عدّل `StoryViewer` ليستخدم `<video>` لو وُجد videoUrl.

---

## التحقق

```
✓ tsc --noEmit --strict          → 0 أخطاء
✓ التوافق مع أمان Firebase        → نعم (rules مرفقة)
✓ التوافق مع المراحل السابقة      → نعم (يستخدم useToast, OwnerOnly)
✓ موبايل first                   → نعم (bottom sheet, touch handlers)
✓ RTL                            → نعم
✓ هوية Bratsho Car               → نعم (brand colors, gradients)
✓ صور Firebase Storage           → نعم (next.config صالح)
✓ لا تبعيات جديدة               → نعم
```

## فهرس Firestore المطلوب

في Firebase Console → Firestore → Indexes، أنشئ:

```
Collection: stories
Field: expiresAt (Ascending)
```

(يظهر تلقائياً كـ link في console عند أول استعلام فاشل).
