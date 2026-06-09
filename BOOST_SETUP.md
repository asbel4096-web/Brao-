# 🚀 نظام الترقية الهرمي (Boost Tiers)

إعادة تشكيل نظام Boost الحالي إلى 3 باقات هرمية — **دون لمس البنية الأساسية**.

## الباقات الجديدة

| الباقة | السعر | المدة | الشارة | الأولوية |
|---|---|---|---|---|
| 🥇 VIP | 200 د.ل | 14 يوم | ذهبية + إطار ذهبي | الأعلى + الصفحة الرئيسية |
| 🥈 ممول | 120 د.ل | 7 أيام | خضراء | أعلى من المميز |
| 🥉 مميز | 50 د.ل | 3 أيام | زرقاء | أعلى من العادي |

**ترتيب النتائج**: VIP ← ممول ← مميز ← عادي

---

## الملفات المعدّلة (6)

| الملف | التغيير |
|---|---|
| `lib/wallet/types.ts` | أسعار `PROMO_FEATURED/BOOST/VIP` (50/120/200) |
| `lib/wallet/boost.ts` | إعادة تشكيل كاملة لـ3 باقات + `getPromotionTier` + `isVipNow` |
| `app/api/wallet/boost/purchase/route.ts` | دعم شراء VIP (يكتب `vipUntil` + featured) |
| `components/wallet/boost-sheet.tsx` | عرض الباقات الثلاث + شارات الحالة |
| `components/listing-card.tsx` | شارات VIP/ممول/مميز + إطار ذهبي لـVIP |
| `app/(public)/listings/page.tsx` | ترتيب 4 مستويات (VIP>ممول>مميز>عادي) |

---

## 🔄 تدفّق العمل الكامل (شراء → انتهاء)

```
1. المستخدم في "إعلاناتي" → يضغط "ترقية"
   └─ يفتح BoostSheet مع 3 باقات

2. يختار باقة (مثلاً VIP 200)
   └─ تأكيد: "سيتم خصم 200 BC"

3. POST /api/wallet/boost/purchase { listingId, service: "vip" }
   └─ Admin SDK (transaction):
      ├─ فحص feature flag (wallet/boosts)
      ├─ فحص الرصيد ≥ 200
      ├─ خصم 200 من walletBalance
      ├─ تسجيل walletTransaction (-200, type: boost)
      └─ تحديث الإعلان:
         vipUntil = now + 14 يوم
         featured = true (للصفحة الرئيسية)
         featuredUntil = now + 14 يوم

4. الإعلان الآن:
   ├─ شارة 👑 VIP ذهبية + إطار ذهبي في البطاقة
   ├─ يظهر أعلى نتائج /listings (tier 3)
   └─ يظهر في قسم المميزة بالصفحة الرئيسية

5. الانتهاء التلقائي (بلا تدخّل):
   ├─ الـUI يفحص vipUntil > now لحظياً (isVipNow)
   │  → بعد 14 يوم: الشارة تختفي، يرجع لترتيب العادي
   └─ cleanup (/api/admin/boosts/cleanup):
      يضع featured=false للمنتهية (تنظيف اختياري)

6. التراكم: شراء VIP وهو نشط → يُمدّد (يُضاف 14 يوم للمتبقي)
```

---

## 🔒 ما تم الحفاظ عليه (لم يُلمس)

✅ نظام المحفظة · ✅ خصم الرصيد · ✅ سجل العمليات (`walletTransactions`)
✅ الانتهاء التلقائي · ✅ بنية Firestore · ✅ الـAnalytics · ✅ صفحة admin/boosts

**الحقول**: نفس الحقول الحالية (`boostedUntil`, `featured`, `featuredUntil`) + حقل واحد جديد `vipUntil`. الإعلانات القديمة بلا هذه الحقول = عادية (توافق كامل).

---

## النشر

```bash
git add lib/wallet/types.ts lib/wallet/boost.ts \
        "app/api/wallet/boost/purchase/route.ts" \
        components/wallet/boost-sheet.tsx \
        components/listing-card.tsx \
        "app/(public)/listings/page.tsx"
git commit -m "feat: hierarchical boost tiers (مميز/ممول/VIP)"
git push
```

✅ لا Firestore rules جديدة (الشراء عبر Admin SDK، يتجاوز القواعد).
> تأكدي أن feature flags `wallet` و `boosts` مفعّلتان (Firestore: `featureFlags/wallet.enabled=true`).

---

## ملاحظات مهمة (مطابقة للصورة)

- لا يمكن استرداد المبلغ بعد تفعيل الترقية
- الترقية تعتمد على توفّر الرصيد الكافي
- شراء باقة نشطة = تمديد المدة
- VIP يظهر تلقائياً في الصفحة الرئيسية

---

## الاختبار

1. اشحني رصيداً كافياً (≥200)
2. "إعلاناتي" → "ترقية" على إعلان
3. ✅ ترين 3 باقات: VIP 200 / ممول 120 / مميز 50
4. اشتري VIP → ✅ خصم 200 + شارة ذهبية + إطار ذهبي
5. افتحي /listings → ✅ الإعلان أعلى القائمة
6. الصفحة الرئيسية → ✅ يظهر في المميزة
7. اشتري "مميز" على إعلان آخر → ✅ يظهر تحت VIP/ممول

افتحي `preview.html` لرؤية التصميم.
