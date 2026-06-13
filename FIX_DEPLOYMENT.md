# 🔧 إصلاح فشل النشر (Vercel Deployment Failed)

## السبب (من الصورتين)

- **Vercel Hobby** (الخطة المجانية) يسمح بـcron jobs تعمل **مرة واحدة يومياً فقط**.
- الـcron الذي أضفته `refresh-stats` كان `0 */6 * * *` (كل 6 ساعات = 4 مرات يومياً).
- Hobby **يرفض** أي cron أكثر من مرة يومياً → **فشل النشر بالكامل**.

> لاحظي في الصورة: GitHub Actions نجحت (3 ✅)، لكن **Vercel - Deployment failed** — هذا يؤكّد أن الخطأ في إعداد Vercel (الـcron) لا في الكود.

## الإصلاح

غيّرتُ جدولة `refresh-stats` من كل 6 ساعات → **مرة يومياً** (الساعة 3 صباحاً):

```json
{
  "crons": [
    { "path": "/api/cron/boosts-cleanup", "schedule": "0 2 * * *" },
    { "path": "/api/cron/refresh-stats",  "schedule": "0 3 * * *" }
  ]
}
```

كلاهما الآن `0 X * * *` (مرة يومياً) → متوافق مع Hobby.

## النشر

```bash
git add vercel.json
git commit -m "fix: cron schedule to once-daily (Vercel Hobby limit)"
git push
```

بعد الدفع، يجب أن ينجح النشر على Vercel.

## ملاحظة عن الإحصائيات

`refresh-stats` يحدّث وثيقة `stats/platform` مرة يومياً الآن (بدل كل 6 ساعات). هذا كافٍ تماماً للإحصائيات العامة (عدد السيارات/المعارض لا يتغيّر كثيراً خلال اليوم). لو احتجتِ تحديثاً أسرع لاحقاً، يتطلب ترقية لخطة Pro.

## صراحة

لم أشغّل build فعلياً (لا شبكة). لكن السبب واضح من الصورتين: رفض الـcron. لو فشل النشر بعد هذا الإصلاح لسبب آخر، أرسلي رسالة الخطأ من **Vercel → Deployments → آخر نشر → Build Logs** (ليس GitHub) لأشخّصه بدقّة.
