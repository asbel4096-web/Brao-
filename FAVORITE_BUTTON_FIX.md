# 🔧 إصلاح خطأ البناء: Cannot find module './favorite-button'

## الخطأ

```
Type error: Cannot find module './favorite-button' or its corresponding type declarations.
> 9 | import { FavoriteButton } from "./favorite-button";
  (في components/compact-listing-card.tsx)
Next.js build worker exited with code: 1
```

## 🎯 السبب

`compact-listing-card.tsx` (ملف جديد، يُستخدم في `most-saved-section` و`featured-near-you`) يستورد:
```tsx
import { FavoriteButton } from "./favorite-button";
```

الاستيراد **صحيح** (نفس المجلد `components/`)، والملف موجود في نسختك المحلية وسليم تماماً. لكن البناء يفشل على Vercel لأن **`components/favorite-button.tsx` غير موجود في GitHub** — على الأرجح لم يُرفع عند إضافة الملفات الجديدة (compact-listing-card / most-saved-section / featured-near-you).

> تأكيد: فحصتُ الاستيراد بايت ببايت (مطابق لـ`listing-card.tsx` الناجح)، واسم الملف سليم، و`.gitignore` لا يتجاهله، والـexport صحيح (`export const FavoriteButton`). كل شيء سليم محلياً → الملف ناقص في المستودع.

## ✅ الحل

ارفعي `components/favorite-button.tsx` (المرفق) إلى GitHub في مجلد `components/`.

## النشر

```bash
git add components/favorite-button.tsx
git commit -m "fix: add missing favorite-button component"
git push
```

أو عبر واجهة GitHub: افتحي مجلد `components` → Add file → Upload → ارفعي `favorite-button.tsx`.

## التحقق قبل الرفع

تأكدي أن الملف **غير موجود** حالياً في GitHub:
- افتحي `github.com/.../components/` في المتصفح
- ابحثي عن `favorite-button.tsx`
- لو **غير موجود** → هذا سبب الخطأ، ارفعيه ✅
- لو **موجود** → أخبريني، فالسبب مختلف (سأفحص أعمق)

## بعد الرفع

Vercel سيعيد البناء تلقائياً → ✅ يجب أن ينجح.

## ملاحظة

`favorite-button.tsx` يعتمد على: `useFavoriteState` (hooks/useFavorites)، `useAuth`، `useToast`، `lib/types`، `lib/utils` — كلها موجودة في مشروعك، فلا تبعيات ناقصة أخرى.
