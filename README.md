# Owner-Only Stats — Bratsho Car

إخفاء عداد المشاهدات عن غير المالك + هيكل قابل للتوسّع لإحصائيات خاصة (favorites، نقرات الاتصال، نقرات الواتساب، إلخ).

## الملفات في الـ zip

```
hooks/
├── useIsListingOwner.ts            ← جديد (hook بسيط)
└── useOwnerStats.ts                ← جديد (hook قابل للتوسّع لكل الإحصائيات)

components/
├── owner-only.tsx                  ← جديد (wrapper حماية)
├── owner-stats-bar.tsx             ← جديد (شريط الإحصائيات)
├── listing-card.tsx                ← مُحدَّث (إخفاء views)
└── listing-quality-card.tsx        ← مُحدَّث (إزالة views)

app/(public)/listings/[id]/page.tsx ← مُحدَّث (إضافة OwnerStatsBar)

firestore.rules.example             ← مرجع لقواعد Firestore المقترحة
```

## التطبيق

```bash
unzip owner-only-stats.zip
git add hooks/ components/ app/
git commit -m "feat: hide views from non-owners + extensible owner stats infrastructure"
git push
```

تم اختباره بـ `tsc --noEmit --strict` → **0 أخطاء**.

---

## الإصلاح المباشر — إخفاء views

### قبل
في `listing-card.tsx`:
```tsx
{typeof listing.views === "number" && listing.views > 0 && (
  <span>👁 {listing.views}</span>  // يظهر للجميع!
)}
```

في `listing-quality-card.tsx`:
```tsx
indicators.push({ label: "المشاهدات", value: listing.views, ... });
// مرئي في صفحة التفاصيل لكل الزوار!
```

### بعد
في `listing-card.tsx`:
```tsx
<OwnerOnly ownerId={listing.ownerId}>
  <span className="bg-amber-500 ...">  {/* لون مميز ليفهم المالك أنها خاصة */}
    👁 {listing.views}
  </span>
</OwnerOnly>
```

في `listing-quality-card.tsx`:
- views **مُحذوف نهائياً** من المؤشرات العامة.
- الانتقال إلى `OwnerStatsBar` في صفحة التفاصيل (للمالك فقط).

---

## الـ 4 مكوّنات الجديدة

### 1) `hooks/useIsListingOwner.ts`

API بسيط جداً:
```ts
const isOwner = useIsListingOwner(listing.ownerId); // boolean
```

يقارن `user.uid` مع `ownerId` ويرجع `false` لو الـ user غير موجود.

### 2) `components/owner-only.tsx`

wrapper للـ JSX:
```tsx
<OwnerOnly ownerId={listing.ownerId}>
  <PrivateContent />
</OwnerOnly>
```

أو مع `fallback` للزوار:
```tsx
<OwnerOnly ownerId={listing.ownerId} fallback={<PublicView />}>
  <OwnerView />
</OwnerOnly>
```

### 3) `hooks/useOwnerStats.ts` — الجوهر

hook مركزي يجمع كل الإحصائيات الخاصة:

```ts
const { stats, isOwner } = useOwnerStats({
  listingId: listing.id,
  ownerId: listing.ownerId,
  initialViews: listing.views,
});

// stats: { views?, favoritesCount?, chatClicks?, phoneClicks?, whatsappClicks? }
```

**كيف يحسبها:**

| إحصائية | المصدر | متاح الآن؟ |
|---|---|---|
| `views` | `listing.views` (قابل للتحديث live) | ✅ نعم |
| `favoritesCount` | `collectionGroup('favorites').where('listingId', '==', X)` | ✅ نعم (مع فهرس) |
| `chatClicks` | `listing.chatClicks` counter | جاهز للتفعيل |
| `phoneClicks` | `listing.phoneClicks` counter | جاهز للتفعيل |
| `whatsappClicks` | `listing.whatsappClicks` counter | جاهز للتفعيل |

**حماية مزدوجة:**
- إذا كان المستخدم ليس المالك، الـ hook **لا يقوم بأي طلب لـ Firestore** (يرجع `{}` فوراً) — يوفّر reads ويحمي إضافياً.
- `firestore.rules.example` يوفّر طبقة الحماية الثانية على مستوى الـ backend.

### 4) `components/owner-stats-bar.tsx`

شريط أنيق يعرض كل الإحصائيات الموجودة:

```tsx
<OwnerStatsBar
  listingId={listing.id}
  ownerId={listing.ownerId}
  initialViews={listing.views}
  variant="compact"  // أو "full" للـ dashboard
/>
```

- **محمي بـ `<OwnerOnly>`** داخلياً — يعرض null لغير المالك.
- يعرض القيم الموجودة فقط (لا حقول فارغة).
- شعار 🛡️ ورسالة "تظهر لك فقط — لا يراها الآخرون" ليفهم المالك السياق.
- ألوان دلالية: مشاهدات (أزرق)، مفضلة (وردي)، نقرات (أخضر/أزرق).

---

## التوسّع المستقبلي — تتبّع النقرات

دالة `recordListingEvent` جاهزة في `useOwnerStats.ts`:

```ts
import { recordListingEvent } from "@/hooks/useOwnerStats";

// في زر الاتصال:
<a
  href={`tel:${listing.phone}`}
  onClick={() => recordListingEvent(listing.id, "phone_click")}
>
  اتصال
</a>

// في زر واتساب:
<a
  href={waUrl}
  onClick={() => recordListingEvent(listing.id, "whatsapp_click")}
>
  واتساب
</a>
```

**كيف تعمل:** تكتب event في `listings/{id}/events/{eventId}`. الـ events مرئية للمالك فقط (محمية بـ Firestore rules — انظر `firestore.rules.example`).

**خطوة لاحقة:** Cloud Function تستمع للـ events وتزيد counters في `listing.chatClicks` / `phoneClicks` / `whatsappClicks` تلقائياً، ثم `useOwnerStats` تقرؤها مباشرة.

---

## قواعد Firestore المقترحة

في `firestore.rules.example`:

```
match /listings/{listingId}/events/{eventId} {
  // المالك فقط يقرأ
  allow read: if get(...).data.ownerId == request.auth.uid;
  // الجميع يكتب نوع محدد
  allow create: if request.resource.data.type in
    ['view', 'chat_click', 'phone_click', 'whatsapp_click'];
  allow update, delete: if false;  // immutable
}
```

⚠️ **اختياري الآن.** لو لم تطبّقها، كل شيء يعمل بنفس الشكل لكن `recordListingEvent` لن يكتب.

---

## ملخص ما يراه كل مستخدم

| المستخدم | بطاقة الإعلان | صفحة التفاصيل | إعلاناتي |
|---|---|---|---|
| **زائر عادي** | لا views | لا views | (لا يصل) |
| **المالك** | شارة مشاهدات أمبر | OwnerStatsBar كامل | إحصائيات + بطاقات |
| **مستخدم آخر مسجَّل** | لا views | لا views | إعلاناته فقط |

---

## التحقق

```
✓ tsc --noEmit --strict          → 0 أخطاء
✓ listing-card                    → views محمي بـ OwnerOnly
✓ listing-quality-card           → views محذوف تماماً
✓ صفحة التفاصيل                  → OwnerStatsBar مضاف للمالك فقط
✓ متوافق مع المراحل السابقة       → نعم (يستخدم AuthContext الموجود)
✓ لا تبعيات جديدة                → نعم
```
