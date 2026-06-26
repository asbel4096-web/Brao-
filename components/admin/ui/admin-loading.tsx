// هياكل تحميل موحّدة للوحة الإدارة — تطابق شكل المحتوى الفعلي بدل
// سبينر/نص «جارٍ التحميل». تستعمل نفس رموز التصميم (slate + rounded + pulse).

function Bar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800 ${className}`}
    />
  );
}

/** صفوف جدول/قائمة. */
export function AdminTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900"
        />
      ))}
    </div>
  );
}

/** شبكة بطاقات إحصائية. */
export function AdminCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800"
        />
      ))}
    </div>
  );
}

/** بطاقة نموذج بإعدادات (تسمية + حقل) ×fields + زر حفظ. */
export function AdminFormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
      <Bar className="mb-6 h-6 w-40" />
      <div className="space-y-5">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Bar className="h-3.5 w-28" />
            <Bar className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <Bar className="mt-6 h-11 w-32 rounded-xl" />
    </div>
  );
}

/** هيكل صفحة كامل: عنوان + محتوى (جدول/نموذج/بطاقات). */
export function AdminPageSkeleton({
  variant = "table",
}: {
  variant?: "table" | "form" | "cards";
}) {
  return (
    <div className="container py-6">
      <Bar className="mb-6 h-8 w-48" />
      {variant === "form" ? (
        <AdminFormSkeleton />
      ) : variant === "cards" ? (
        <AdminCardsSkeleton />
      ) : (
        <AdminTableSkeleton />
      )}
    </div>
  );
}
