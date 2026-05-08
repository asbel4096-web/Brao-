# Bottom Nav احترافي + إخفاء عند التمرير

شريط سفلي بمواصفات Facebook/Instagram مع الحفاظ على هوية براتشو كار.

## الملفات (3 ملفات)

```
hooks/useScrollDirection.ts          ← جديد - يكشف اتجاه التمرير
components/bottom-nav.tsx            ← مُعاد التصميم بالكامل
app/layout.tsx                       ← pb-28 → pb-20 (أصغر لأن الشريط أنحف)
```

## التطبيق

```bash
unzip bottom-nav-pro.zip
git add hooks/ components/ app/
git commit -m "feat: pro bottom-nav with hide-on-scroll"
git push
```

تم اختباره بـ `tsc --noEmit` → **0 أخطاء**. لا تبعيات جديدة.

---

## مواصفات الشريط (مستوحاة من Facebook/Instagram)

### قياسات احترافية

| العنصر | القيمة | لماذا |
|---|---|---|
| **العرض** | full-width (edge-to-edge) | معيار FB/IG/Threads |
| **الارتفاع** | 56px (h-14) | معيار Material + iOS HIG |
| **آيكونات** | 24px (FB يستخدم 24-26) | أوضح على الجوال |
| **النصوص** | 10px (text-[10px]) | كافية للقراءة دون ازدحام |
| **safe-area** | `env(safe-area-inset-bottom)` | يحترم home indicator في iPhone |
| **Backdrop** | `backdrop-blur-md` على bg `white/95` | يعكس المحتوى مثل iOS |
| **الحدود** | `border-t` رفيع + ظل علوي خفيف | فصل بصري نظيف |

### حالات الأيقونات

- **افتراضي**: stroke = 2، لون slate-500.
- **نشط**: stroke = 2.4، fill-current، لون brand-700، scale-105.
- **مؤشّر علوي**: شريط 2px × 32px فوق الأيقونة (مثل Instagram).

### زر "إضافة" المرتفع

مثل Threads/IG modern: مربع 48px مرتفع 20px فوق الشريط، خلفية action-500 (لون براتشو الإجرائي)، shadow-action، plus icon 26px.

### الـ badges

- مدمجة على الأيقونة نفسها (top-right) بدلاً من تحت النص.
- إطار أبيض 2px (border-2 border-white) ليفصلها عن خلفية الشريط (مثل Discord/Telegram).
- `9+` بدلاً من العدد إذا تجاوز 9.
- وردي للمفضلة، action-500 للرسائل.

---

## سلوك الإخفاء عند التمرير

### Hook منفصل: `useScrollDirection`

ثلاث حالات:
- **`down`** → المستخدم يمرّر للأسفل → الشريط يختفي (`translate-y-full`).
- **`up`** → يمرّر للأعلى → الشريط يظهر فوراً.
- **`idle`** → توقّف عن التمرير 160ms → يظهر (لو كان مخفياً).

### حماية من flicker

- **threshold = 6px**: لا يستجيب لاهتزازات صغيرة في الـ scroll.
- **topOffset = 64px**: لا يخفي الشريط عندما المستخدم في أعلى الصفحة (دائماً مرئي في hero).
- **rAF debouncing**: يستخدم `requestAnimationFrame` لتحديث 60fps دون لاج.
- **passive listener**: لا يعيق scrolling الأصلي.

### الانتقال

```css
transition-transform duration-300 ease-out will-change-transform
```

300ms مع easing طبيعي مثل iOS/Android — ليس بطيئاً ولا حادّاً.

---

## الحفاظ على هوية براتشو

| العنصر | الهوية |
|---|---|
| اللون النشط | `brand-700` (أزرق براتشو) |
| زر الإضافة | `action-500` (لون CTA براتشو) |
| الـ badges المفضلة | `rose-500` (نفس القلب) |
| الـ badges الرسائل | `action-500` |
| الخط | font-black للنشط، font-bold للباقي |
| الزوايا | `rounded-2xl` لزر الإضافة (نفس برامج البطاقات) |

---

## مقارنة قبل/بعد

| | قبل | بعد |
|---|---|---|
| الشكل | floating pill 96% عرض، 28px borderRadius | full-width edge-to-edge |
| الارتفاع | متغيّر (~70px مع زر مرتفع 16) | ثابت 56px + safe-area |
| الإخفاء | لا | عند scroll للأسفل |
| safe-area | لا (`bottom-3`) | نعم (`env(safe-area-inset-bottom)`) |
| المؤشّر النشط | لون فقط | لون + شريط علوي + scale |
| الـ badges | تحت/جانب الأيقونة | على الأيقونة بإطار أبيض |
| Backdrop | `backdrop-blur-xl` ثقيل | `backdrop-blur-md` خفيف |

---

## التحقق

```
✓ tsc --noEmit                      → 0 أخطاء
✓ يختفي عند scroll للأسفل           → نعم (translate-y-full)
✓ يظهر عند scroll للأعلى أو التوقف  → نعم
✓ مقاس FB/IG-like                   → h-14, icon 24px, text 10px
✓ safe-area للـ iPhone              → نعم
✓ هوية براتشو                       → brand-700 + action-500
✓ RTL                               → يعمل بدون تعديل (flex-row)
✓ لا يكسر صفحات أخرى                → main padding مُحدَّث
✓ أداء سلس 60fps                   → rAF + threshold + passive
```
