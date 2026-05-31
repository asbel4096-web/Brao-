# تعليمات رفع الملفات

## ⚠️ مهم: حافظي على هيكل المجلدات بالضبط

هذا الـzip يحوي **12 ملف** يجب رفعها كما هي:

```
lib/wallet/topup.ts                          ← الملف الناقص الذي سبّب الخطأ
hooks/wallet/use-topup-requests.ts
components/wallet/topup-sheet.tsx
components/wallet/wallet-sheet.tsx           ← معدَّل
components/wallet/wallet-trigger.tsx         ← معدَّل
components/admin/layout/admin-sidebar.tsx    ← معدَّل
app/admin/topup-requests/page.tsx
app/api/wallet/topup/request/route.ts
app/api/admin/topup/[requestId]/approve/route.ts
app/api/admin/topup/[requestId]/reject/route.ts
firestore.rules                              ← انشريها يدوياً في Firebase Console
```

## كيف ترفعين على GitHub؟

### الطريقة الأسهل (موصاة):
1. فُكّي الـzip في جهازكِ
2. على GitHub، افتحي مستودعكِ
3. اسحبي مجلد **`lib`** كاملاً → سيدمج تلقائياً (overwrite)
4. كرّري لكل المجلدات: `hooks`, `components`, `app`
5. ارفعي `firestore.rules` في root
6. Commit message: `feat: topup requests system`
7. اضغطي Commit changes

### إذا واجهتِ مشكلة هيكل المجلدات:
- ارفعي كل ملف منفرداً وتأكدي أن الـpath في GitHub يطابق المسار في الـzip
- مثلاً: `topup.ts` يجب أن يكون في `lib/wallet/topup.ts` وليس في root
