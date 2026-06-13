# 📋 المرحلة 1: إصلاح Firestore — التقرير النهائي

## ملخّص التشخيص

فحصتُ **كل** استعلامات Firestore في المشروع (getDocs، getDoc، collection، query، where، getCountFromServer، collectionGroup). إليك الحقيقة الكاملة:

### مصادر 403 المكتشفة

| Collection | المصدر | الحالة قبل | الإصلاح |
|---|---|---|---|
| **listings** | usePlatformStats (count) | كان بلا status | ✅ مُصلح سابقاً (status موجود) |
| **listings** | useBrandCounts (count) | فيه status | ✅ سليم |
| **listings** | **similar-listings** (getDocs) | **بلا status → 403** | ✅ **مُصلح الآن** |
| **users** | verificationType/lastLoginAt count | `read: if true` | ✅ مسموح أصلاً |
| **favorites** | useOwnerStats collectionGroup | يُرفض | ⚠️ لا يُشغّل (enableFavoritesCount=false) |
| **stories** | useStories (expiresAt) | `storyVisible()=true` | ✅ مسموح + الفهرس موجود |
| **dealers** | (= users بـverificationType) | `read: if true` | ✅ مسموح |

---

## الإصلاحات المنفّذة

### 1. الحل الجذري لـAggregate: stats collection ⭐ (كما طلبتِ)
بدل أن ينفّذ كل زائر 5 استعلامات `getCountFromServer` من العميل (قد تُرفض + تستهلك reads):

**أ) قاعدة جديدة `stats/{docId}`** (`firestore.rules`):
```
match /stats/{docId} {
  allow read: if true;              // قراءة عامة (زائر + مسجّل)
  allow create, update, delete: if false;  // كتابة server-side فقط
}
```

**ب) `usePlatformStats.ts`**: يقرأ `stats/platform` بقراءة **واحدة** أولاً، ويسقط تلقائياً للعدّ المباشر (aggregate) كـfallback لو الوثيقة غير موجودة.

**ج) Cron جديد `/api/cron/refresh-stats`**: يحسب الأعداد server-side بـAdmin SDK (يتجاوز قواعد العميل تماماً) ويكتبها في `stats/platform` كل 6 ساعات. مُسجّل في `vercel.json`.

> النتيجة: الإحصائيات تُقرأ بقراءة واحدة عامة سريعة، **مستحيل أن تُرفض بـ403**.

### 2. إصلاح similar-listings (403 مباشر)
`components/similar-listings.tsx` كان يستعلم `where("category"==)` **بلا status==approved** → 403. أضفتُ `status==approved` (يستخدم فهرس status+category الموجود) + صحّحتُ الفلتر (كان يفلتر `status==="active"` بينما القيمة الفعلية `"approved"`).

---

## الملفات

### معدّلة (3)
| الملف | التغيير |
|---|---|
| `firestore.rules` | + قاعدة stats collection (قراءة عامة) |
| `hooks/usePlatformStats.ts` | قراءة stats/platform أولاً + fallback |
| `components/similar-listings.tsx` | + status==approved (إصلاح 403) + تصحيح الفلتر |

### جديدة (2)
| الملف | الغرض |
|---|---|
| `app/api/cron/refresh-stats/route.ts` | cron يحسب stats server-side |
| `vercel.json` | + تسجيل cron refresh-stats |

---

## القواعد المعدّلة

`firestore.rules`: أُضيفت قاعدة `match /stats/{docId}` (قراءة عامة، كتابة server فقط). **لم تُعدّل أي قاعدة أخرى** — الصلاحيات الموجودة سليمة:
- الزائر: يقرأ listings (approved)، stories، users/معارض، stats ✅
- المسجّل: يضيف إعلان/قصة/مفضلة، يعدّل بياناته ✅
- الأدمن: كل الصلاحيات ✅

---

## النشر (مطلوب)

```bash
git add firestore.rules hooks/usePlatformStats.ts components/similar-listings.tsx \
        app/api/cron/refresh-stats/route.ts vercel.json
git commit -m "fix(firestore): stats collection + similar-listings 403"
git push

# مهم جداً - نشر القواعد المحدّثة:
firebase deploy --only firestore:rules

# تعبئة أولى لوثيقة الإحصائيات (بعد ضبط CRON_SECRET):
# افتحي: https://brao-chi.vercel.app/api/cron/refresh-stats
# مع هيدر Authorization: Bearer <CRON_SECRET>
# أو انتظري أول تشغيل تلقائي للـcron.
```

> ⚠️ **الأهم**: نشر `firestore.rules` ضروري. الكثير من أخطاء 403 لديكِ سببها أن **القاعدة المنشورة في Console أقدم من الملف** (تكرّر في خطأ اللوجو). نشر القواعد يحلّ هذا.

---

## نتائج Build / TypeScript / Lint — بصراحة

⚠️ **لا أستطيع تشغيلها فعلياً** — بيئتي بلا شبكة/تبعيات (لا npm/tsc/eslint/firebase). **لن أدّعي "Build passed".**

ما تحققتُ منه يدوياً:
- ✅ كل الملفات الـ5 متوازنة (أقواس {} () [])
- ✅ vercel.json صالح (JSON)
- ✅ الاستيرادات صحيحة (doc/getDoc مضافان، getAdminFirestore بنفس نمط boosts-cleanup)
- ✅ `.count().get()` نمط Admin SDK الصحيح
- ✅ الفهرس status+category موجود (لـsimilar-listings)
- ✅ لم أكسر منطقاً موجوداً (usePlatformStats يحتفظ بالـaggregate كـfallback)

**الاختبار الحقيقي عند رفعك + نشر القواعد.** راقبي Console.

---

## المشاكل المتبقية (صراحة)

1. **القاعدة المنشورة قد تكون أقدم**: لا أستطيع التحقق من Console. لو استمر 403 بعد نشر القواعد، أرسلي لقطة من تبويب Rules.

2. **useOwnerStats collectionGroup**: لا يُشغّل حالياً (enableFavoritesCount=false). لو فُعّل مستقبلاً، سيحتاج إمّا قاعدة collectionGroup أو قراءة favoritesCount المخزّن. تركته كما هو (لا يسبب خطأ الآن).

3. **التحقق النهائي من Build**: يجب أن تشغّليه أنتِ (`npm run build && npm run lint`) وترسلي أي خطأ.
