# ⚠️ هذا الـzip يحوي كل ملفات المرحلة 5 + التكامل دفعة واحدة

سبب الخطأ السابق: ملف `lib/cms/types.ts` لم يكن مرفوعاً.
هذا الـzip يحوي كل شيء معاً لضمان عدم نسيان أي ملف.

## كيف تنشرين

1. فُكّي الـzip
2. ارفعي **كل** المجلدات والملفات للمستودع (overwrite الموجود):
   - `lib/cms/` (مجلد جديد)
   - `components/cms/` (مجلد جديد)
   - `components/homepage-banners-carousel.tsx` (ملف جديد)
   - `components/featured-listings-section.tsx` (يستبدل القديم)
   - `hooks/admin/use-cms-pages.ts` (ملف جديد)
   - `hooks/admin/use-homepage-config.ts` (ملف جديد)
   - `hooks/use-public-homepage-config.ts` (ملف جديد - **هذا اللي كان ناقص**)
   - `app/admin/content/` (مجلد جديد كامل)
   - `app/(public)/p/` (مجلد جديد)
   - `app/page.tsx` (يستبدل القديم)
   - `firestore.rules` (يستبدل)
   - `storage.rules` (يستبدل)

3. `git add . && git commit -m "phase 5 + integration" && git push`

4. تأكدي من نشر:
   - Firestore rules (Firebase Console)
   - Storage rules (Firebase Console)

## الملف الذي تسبّب في خطأ البناء

`lib/cms/types.ts` — يجب أن يكون موجوداً في:
```
repo-root/
└── lib/
    └── cms/
        ├── types.ts        ← هذا الذي كان مفقوداً
        └── markdown.ts
```

تأكدي من رفع المجلد `lib/cms/` كاملاً.
