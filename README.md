# تفعيل ميزة تقرير المركبة — Bratsho Car

تكامل حقيقي مع NHTSA vPIC API (مجاني، بدون مفتاح).

## الملفات في الـ zip

```
lib/
└── vin.ts                                   ← جديد (التحقق من VIN + الأنواع)

app/
├── api/vehicle-report/
│   └── route.ts                             ← جديد (API Route مع NHTSA)
└── (public)/vehicle-report/
    └── page.tsx                             ← مُحدَّث (تكامل حقيقي)

components/
└── vehicle-report-card.tsx                  ← جديد (عرض النتيجة)
```

## التطبيق

```bash
unzip vehicle-report-feature.zip
git add lib/ components/ app/
git commit -m "feat: real vehicle report via NHTSA vPIC API"
git push
```

تم اختباره بـ `tsc --noEmit` → **0 أخطاء**. لا تبعيات جديدة.

---

## شرح الميزة

### 1) `lib/vin.ts` — التحقق + الأنواع

- **`validateVin(input)`**: يتحقق من 17 خانة + بدون I/O/Q + حروف وأرقام إنجليزية فقط.
- **`normalizeVin(input)`**: ينظّف ويحوّل لأحرف كبيرة.
- **`VehicleReport` و `VehicleData`**: shape موحَّد للرد - مهم لتبديل المزوّد لاحقاً (CARFAX/AutoCheck) دون كسر الواجهة.

**ملاحظة مدروسة**: لا نتحقق من check digit (الموضع 9) لأن VINs الأوروبية والآسيوية لا تتبع نفس قاعدة US — قد يرفض المستخدمين الليبيين بشكل خاطئ.

### 2) `app/api/vehicle-report/route.ts` — API Route آمن

**Endpoint:** `GET /api/vehicle-report?vin=XXXXXXXXXXXXXXXXX`

**المزايا:**
- **Proxy آمن**: يخفي مزوّد البيانات عن الواجهة → يسهّل تبديل NHTSA بـ CARFAX لاحقاً بتعديل ملف واحد فقط.
- **التحقق قبل الإرسال**: لا يُرسل طلب لـ NHTSA إذا كان VIN غير صالح.
- **كاش 24 ساعة**: نفس VIN لا يُسأل API مرتين → سريع جداً + يحمي NHTSA من الحمل الزائد.
- **معالجة أخطاء كاملة**: 400 (VIN غير صالح) / 404 (غير موجود) / 502 (مشكلة NHTSA) / 500 (خطأ شبكة).
- **تحويل البيانات**: يحوّل الحقول الفارغة و "Not Applicable" إلى `undefined` ليسهل الفلترة في الواجهة.

**استخدام NHTSA:**
```
GET https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{vin}?format=json
```
بدون authentication، بدون rate limit مذكور.

### 3) `components/vehicle-report-card.tsx` — عرض النتيجة

تصميم بطاقة احترافية:
- **Hero بـ gradient أزرق داكن** مطابق لهوية Bratsho Car (`from-[#071133] via-[#0a1d55] to-[#1c389c]`).
- اسم السيارة كبير: `Toyota Camry 2021`.
- شارات الحالة (مصدر البيانات + decoded clean).
- VIN معروض بـ font monospace tracking-wider.
- 3 hero stats (الشركة، الموديل، السنة).
- بطاقة المواصفات التفصيلية (15+ حقل) — تعرض فقط الموجود فعلاً (ما فيش حقول فارغة).
- ملاحظات NHTSA إن وُجدت.
- تنبيه مرئي إذا كان decoded غير clean.

**الحقول المعروضة** (كلها موجودة كما طلبت):
- ✅ الشركة المصنعة (Make)
- ✅ الموديل (Model)
- ✅ سنة الصنع (ModelYear)
- ✅ نوع المركبة (VehicleType)
- ✅ بلد الصنع (PlantCountry)
- ✅ المحرك (DisplacementL + EngineModel)
- ✅ نظام الدفع (DriveType)
- ✅ عدد الأبواب (Doors)
- ✅ عدد الأسطوانات (EngineCylinders)
- ✅ Fuel type (FuelTypePrimary)
- ✅ Plant country/city/state
- ✅ Notes
- إضافة: قدرة المحرك، ناقل الحركة، عدد المقاعد، فئة الهيكل، السلسلة، الفئة (Trim)، المُصنِّع الكامل

### 4) `app/(public)/vehicle-report/page.tsx` — الصفحة

**الحالات الأربع** الكاملة:
- **`idle`**: نموذج البحث + بطاقات المصادر (NHTSA متاح، CARFAX/AutoCheck "قريباً").
- **`loading`**: مؤشر animation + skeleton للنتيجة المتوقعة.
- **`success`**: عرض البطاقة الكاملة.
- **`error`**: بطاقة وردية مع زر "إعادة المحاولة".
- **`notfound`** (حالة منفصلة): بطاقة كهرمانية مع نصائح مخصصة لـ VINs الأجنبية.

**الـ UX:**
- input بـ `font-mono tracking-wider` لقراءة أسهل.
- عدّاد 17/X بلون أخضر عند الاكتمال.
- زر مسح (X) داخل الـ input.
- زر البحث معطّل حتى يصل الـ VIN لـ 17 خانة.
- toast عند الأخطاء (يستخدم `useToast` من المرحلة السابقة).
- responsive كامل (single column على الجوال، 3 columns للحقول على الديسكتوب).

---

## للمستقبل: إضافة CARFAX أو AutoCheck

هيكل الكود مُصمَّم خصيصاً لذلك:

1. عدّل `app/api/vehicle-report/route.ts` ليجرّب CARFAX أولاً (مع API key من env)، ثم fallback لـ NHTSA.
2. احتفظ بنفس shape الرد `VehicleReport` — الواجهة ستعمل بدون أي تغيير.
3. غيّر فقط `report.source` ليُظهر للمستخدم مصدر البيانات الحقيقي.

```ts
// future: lib/vehicle-providers/carfax.ts
export async function fetchCarfaxReport(vin: string): Promise<VehicleReport | null> {
  const apiKey = process.env.CARFAX_API_KEY;
  if (!apiKey) return null;
  // ... CARFAX call
}

// app/api/vehicle-report/route.ts (المستقبل)
const carfaxReport = await fetchCarfaxReport(vin);
if (carfaxReport) return NextResponse.json(carfaxReport);
// fallback to NHTSA
const nhtsaReport = await fetchNhtsaReport(vin);
return NextResponse.json(nhtsaReport);
```

---

## VIN للاختبار

جرّب هذه الـ VINs الحقيقية للتأكد:

| VIN | المركبة المتوقعة |
|---|---|
| `1HGBH41JXMN109186` | Honda |
| `1FA6P8TD5M5100001` | Ford Mustang 2021 |
| `WA1A4AFY2J2008189` | Audi Q5 2018 |
| `5XYKT3A12CG000000` | Kia Sorento |

---

## التحقق

```
✓ tsc --noEmit                       → 0 أخطاء
✓ NHTSA API call                     → GET فقط، بدون مفتاح
✓ التحقق من VIN قبل الطلب             → نعم
✓ كاش 24 ساعة                        → نعم (s-maxage + revalidate)
✓ معالجة 4 حالات (idle/loading/...) → نعم
✓ متجاوب للجوال                       → نعم (single col → 3 cols)
✓ RTL                                → نعم
✓ هوية Bratsho Car                   → نعم (نفس gradient الـ Hero)
✓ متوافق مع المراحل السابقة            → نعم (يستخدم useToast)
✓ جاهز لـ CARFAX/AutoCheck لاحقاً     → نعم (نفس shape)
```

**الميزة جاهزة للنشر 🚀**
