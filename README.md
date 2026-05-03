# Multi-Provider Vehicle Report — Bratsho Car

تطوير تقرير المركبة لدعم US/CA/EU/KR.

## الفلسفة

NHTSA (مجاني) للـ decoding فقط. مزودات إقليمية مدفوعة للـ history.
يضمن أن التقرير يعمل دائماً (DECODE_ONLY) حتى بدون مزود مدفوع.

## الملفات (13 ملف)

```
lib/
├── vin.ts                                    ← + detectMarketFromVin
└── vehicle-report/
    ├── types.ts                              ← الأنواع الموحَّدة
    ├── decoder-nhtsa.ts                      ← decoding only
    ├── router.ts                             ← provider selection
    └── providers/
        ├── types.ts                          ← HistoryProvider interface
        ├── mock-fixtures.ts
        ├── carfax.ts                         ← US
        ├── carfax-canada.ts                  ← CA
        ├── europe.ts                         ← EU
        └── encar.ts                          ← KR

app/
├── api/vehicle-report/route.ts               ← orchestration
└── (public)/vehicle-report/page.tsx          ← 6 UI states

components/
└── vehicle-report-card.tsx                   ← decoded + history

.env.example
```

## الأنواع

- `DecodedVehicleData` - من NHTSA (لا mileage)
- `VehicleHistoryData` - من المزوّد (mileage, accidents, owners, ...)
- `VehicleReportResponse` - shape موحَّد

## كشف السوق

من أول حرف من VIN: 1/4/5→US، 2→CA، K→KR، S-Z→EU.

## Mock Mode

`VEHICLE_REPORT_DEMO=true` يفعّل mocks. آخر رقمين من VIN:
- `00` → NOT_FOUND
- `11` → بيانات جزئية (يُظهر "المسافة المقطوعة غير متوفرة")
- باقي → تقرير كامل

## الحالات الستة

idle / loading / invalid_vin / not_found / decode_only / full_report / provider_error

## VINs للاختبار

- `1HGBH41JXMN109186` → US كامل
- `2T3BFREV0FW123456` → CA كامل
- `WAUZZZ4M9KD123456` → EU كامل
- `KMHCT5AE3GU123456` → KR كامل
- VIN ينتهي بـ `11` → يُظهر "المسافة المقطوعة غير متوفرة"
- VIN ينتهي بـ `00` → DECODE_ONLY

## التطبيق

```bash
unzip vehicle-report-multi-provider.zip
echo "VEHICLE_REPORT_DEMO=true" >> .env.local
git add lib/ app/ components/ .env.example
git commit -m "feat: multi-provider vehicle report (US, CA, EU, KR)"
git push
```

تم اختباره بـ tsc --noEmit → 0 أخطاء.
