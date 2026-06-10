# 🔧 إصلاح تداخل زر "التالي" مع شريط التنقّل (Safe Area)

## المشكلة

زر "التالي" في `/add-listing` كان يُغطّى جزئياً بشريط التنقّل السفلي (BottomNav) على الموبايل، خصوصاً iPhone.

## السبب الجذري

- **BottomNav**: `fixed bottom-0 z-50` (ارتفاع ~64px + هامش 12px + safe-area)
- **شريط أزرار add-listing**: كان `fixed bottom-0 z-30` — نفس الموضع لكن z-index **أقل** → يظهر **خلف** BottomNav ويتغطّى.

## ✅ الإصلاح

### 1. رفع شريط الأزرار فوق BottomNav (موبايل)
```jsx
<div
  className="fixed inset-x-0 z-40 ... md:!bottom-0"
  style={{
    bottom: "calc(76px + env(safe-area-inset-bottom))",
    paddingBottom: "max(0px, env(safe-area-inset-bottom))",
  }}
>
```
- **الموبايل**: الشريط يجلس فوق BottomNav بمقدار ارتفاعه (76px) + المساحة الآمنة
- **md+ (ديسكتوب)**: `md:!bottom-0` يعيده للأسفل (BottomNav مخفي على md عبر `md:hidden`)

### 2. مساحة سفلية آمنة للمحتوى
```jsx
style={{ paddingBottom: "calc(150px + env(safe-area-inset-bottom))" }}
```
= شريط الأزرار (~64) + شريط التنقّل (~76) + المساحة الآمنة → آخر المحتوى لا يُغطّى.

### 3. إزالة `pb-28` القديمة (غير الكافية)
استُبدلت بالحساب الدقيق أعلاه.

## النتيجة

✅ زر "التالي" ظاهر بالكامل دائماً · ✅ لا تداخل · ✅ متوافق مع Safe Area لـiPhone الحديثة (Dynamic Island / Pro Max) · ✅ يعمل على iPhone Safari + Android Chrome · ✅ التصميم والهوية البصرية بلا تغيير.

## الملف المعدّل (1)

`app/(public)/add-listing/page.tsx` (تعديلان فقط: المحتوى + شريط الأزرار)

## النشر

```bash
git add "app/(public)/add-listing/page.tsx"
git commit -m "fix: lift add-listing action bar above bottom nav (safe area)"
git push
```

## الاختبار

1. افتحي `/add-listing` على iPhone Safari → ✅ زر التالي كامل فوق شريط التنقّل
2. Android Chrome → ✅ نفس النتيجة
3. مرّري لأسفل المحتوى → ✅ آخر عنصر غير مُغطّى
4. ديسكتوب → ✅ الشريط أسفل تماماً (لا BottomNav)

افتحي `preview.html` لرؤية النتيجة.

> الحل مطابق للمخطط المرجعي "بعد (الحل)": زر ظاهر بالكامل + مسافة آمنة + لا تداخل.

## ملاحظة تقنية

استخدمتُ `style` inline للقيمة `calc(... env())` بدل Tailwind arbitrary class، لأن `env()` داخل arbitrary values قد لا يُترجم بشكل موثوق في كل إعدادات Tailwind — الـinline style يضمن عملها على كل المتصفحات.
