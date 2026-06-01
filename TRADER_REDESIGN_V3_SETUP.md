# تصميم صفحة المعرض الاحترافي v3 - Round 1

تصميم Mobile-first احترافي مطابق للصورة المرجعية الجديدة.

## ما تم بناؤه (Round 1 - البنية الأساسية)

### Library
- `lib/dealer/stories.ts` — Types + 4 تصنيفات stories (وصل حديثاً/عروض/المعرض/تجربة قيادة) + helpers

### Hooks
- `hooks/dealer/use-dealer-stories.ts` — قراءة stories معرض realtime + group بالتصنيف

### Components
- `components/trader/trader-profile-header.tsx` — Header كامل (Cover + parallax + identity + stats + stories rings)
- `components/trader/trader-tabs.tsx` — معدَّل (sticky tabs + light theme + stagger animations)
- `components/trader/story-viewer.tsx` — Fullscreen viewer مثل Instagram (progress bars + tap zones + auto-advance)

### Page
- `app/(public)/traders/[uid]/page.tsx` — معدَّل (دمج الـviewer + state للستوريز)

### Firestore
- `firestore/dealer-stories-rules.txt` — Rules لإضافتها يدوياً
- `firestore/dealer-stories-index.json` — Index لإضافته يدوياً

---

## المميزات الجديدة

### 🎨 Visual
- ✅ Cover image مع **parallax خفيف** (يتحرك مع scroll)
- ✅ **4 أزرار عائمة** علوية (back/share/more/notifications) بـbackdrop blur
- ✅ Badge "معرض موثق" مع تصميم premium
- ✅ Logo دائري كبير مع ring أبيض وshadow
- ✅ Followers stack (4 صور صغيرة متراكبة بـgradients)
- ✅ بطاقة Stats بيضاء مع أيقونات زرقاء
- ✅ **Stories rings** أفقية مع ring أزرق + badges للعدد

### ⚡ Performance
- ✅ Image lazy loading عبر next/Image
- ✅ Parallax بـCSS transform (GPU-accelerated)
- ✅ Stagger animations محدودة (max 0.3s delay)
- ✅ Sticky tabs بدون JavaScript scroll listener

### 🎬 Interactions (Spring animations)
- ✅ زر متابعة: قلب يكبر عند الضغط
- ✅ كل الأزرار: scale 0.97 عند الـtap
- ✅ Chips الفلاتر: tap animation
- ✅ Stories ring: tap animation
- ✅ Card grid: stagger entrance (0.03s × index)

### 📱 Mobile-first
- ✅ Touch-friendly (44px+ tap targets)
- ✅ Horizontal scroll للـstories و chips بـsnap
- ✅ Sticky tabs مع backdrop blur
- ✅ Safe area للأزرار العائمة

### 🌗 Dark mode
كل المكونات تدعم dark mode تلقائياً.

---

## خطوات النشر

### 1. ارفعي الملفات
```bash
git add lib/dealer hooks/dealer components/trader app/(public)/traders
git commit -m "feat(traders): premium profile design v3 + stories"
git push
```

### 2. ⚠️ Firestore: rules + index

#### A. Rules (Firebase Console → Firestore → Rules)
انسخي محتوى `firestore/dealer-stories-rules.txt` وألصقيه قبل القوس الختامي لـ`match /databases/{database}/documents`.

#### B. Index (Firebase Console → Firestore → Indexes)
أنشئي index جديد بنفس الإعدادات في `firestore/dealer-stories-index.json`:
- Collection: `dealerStories`
- Fields: `dealerUid (Asc)`, `createdAt (Desc)`
- Query scope: Collection

أو أضيفيه إلى `firestore.indexes.json` ثم `firebase deploy --only firestore:indexes` لو لديكِ Firebase CLI.

### 3. ✅ لا npm install (framer-motion موجود من قبل)

---

## الاختبار

### اختبار 1: عرض الصفحة (بدون stories)
1. افتحي `/traders/{uid لمعرض موثق}`
2. ✅ Cover يظهر مع parallax عند الـscroll
3. ✅ 4 أزرار عائمة في الأعلى
4. ✅ Badge "معرض موثق" في زاوية الـcover
5. ✅ بطاقة الـidentity مع logo + اسم + موقع + تقييم
6. ✅ زرّان: "متابعة" أزرق + "مراسلة" أبيض
7. ✅ بطاقة 4 إحصائيات
8. ✅ قسم Stories فارغ (لأنه لا توجد قصص بعد)

### اختبار 2: للمالك
1. سجّلي دخول كصاحب المعرض
2. افتحي `/traders/{your-uid}`
3. ✅ بدل "متابعة + مراسلة": "تعديل المعرض + إعلاناتي"
4. ✅ في قسم Stories: زر **"إضافة قصة"** بـborder dashed
5. الضغط عليه → ينتقل إلى `/profile/edit?tab=stories` (سيُبنى في Round 2)

### اختبار 3: عرض stories (بعد إنشاء بعضها)

بما أن صفحة إنشاء الـstories غير مُبنية بعد، يمكنكِ إضافة قصة test يدوياً عبر Firebase Console:

في Firestore Console:
```
collection: dealerStories
document: (auto)
fields:
  dealerUid: "uid-المعرض"
  dealerName: "اسم المعرض"
  category: "new_arrivals"  (أو offers/showroom/test_drive)
  mediaURL: "https://رابط-صورة"
  mediaType: "image"
  caption: "وصف اختياري"
  createdAt: (timestamp now)
  expiresAt: (timestamp + 30 days)
  viewCount: 0
```

ثم:
1. أعيدي تحميل `/traders/{uid}`
2. ✅ Story ring يظهر في تصنيف "وصل حديثاً" مع thumb للصورة
3. اضغطيه → ✅ Fullscreen viewer ينفتح
4. ✅ Progress bar في الأعلى يتحرك (auto-advance بعد 6s)
5. ✅ Tap على اليمين/اليسار = previous/next
6. ✅ Tap في الوسط = pause/play
7. ✅ زر X = إغلاق
8. ✅ ESC = إغلاق

---

## ما المتبقي (Round 2 + Round 3)

### Round 2: التحرير
- 📝 صفحة `/profile/edit` بـtabs (معلومات / لوجو / غلاف / معرض الصور / stories)
- 📝 نموذج رفع stories (اختيار صورة + تصنيف + caption)
- 📝 معرض صور المعرض (12 صورة كحد أقصى)
- 📝 API routes لـCRUD على stories + gallery

### Round 3: التحسينات
- ✨ Skeleton shimmer أثناء التحميل
- ✨ Like animation عند الـtap على heart في cards
- ✨ Story progress smoother (rAF بدل setInterval)
- ✨ Swipe down to close في story viewer
- ✨ Preload الـnext story (better UX)

---

## ⚠️ ملاحظات

### ما لم يُبنَ بعد (Round 1)
- ❌ إنشاء stories من الواجهة (يحتاج Round 2)
- ❌ رفع/تعديل صور المعرض من الواجهة (Round 2)
- ❌ صفحة "عرض الكل" للستوريز
- ❌ Bottom navigation (موجود في الـlayout الحالي - لم نُغيّره)

### ما يعمل تلقائياً
- ✅ نظام التوثيق القديم + الجديد (verifiedUntil)
- ✅ نظام المتابعة الموجود (useFollowTraderState)
- ✅ نظام التقييمات الموجود (ReviewsTab)
- ✅ نظام الإعلانات الموجود (ListingCard)
- ✅ المراسلة (handleMessage في page)

---

## التقدير

| القسم | الوقت |
|---|---|
| Round 1 (الحالي) | ✅ |
| Round 2 (التحرير) | 2-3 ساعات |
| Round 3 (التحسينات) | 1-2 ساعة |

أعلميني بعد رفع Round 1 وتجربته، ثم نُكمل Round 2.
