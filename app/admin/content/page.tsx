"use client";

import { Suspense } from "react";
import { AdminPermissionGate } from "@/components/admin/ui/admin-permission-gate";
import { AdminTableSkeleton } from "@/components/admin/ui/admin-loading";
import { ContentManager } from "@/components/admin/modules/content/content-manager";

/**
 * «إدارة المحتوى» — حذف (قابل للاستعادة) / إيقاف مؤقت / استعادة / استئناف للإعلانات والمنشورات
 * والقصص والإعلانات الترويجية، مع السبب، عبر الدالة moderateContent.
 *
 * الصلاحية في الواجهة: listings.approve (= المدير العام والأدمن والمشرف — نفس أدوار الخادم).
 * الحماية الفعلية على الخادم (الدور + القواعد). رابط مباشر: /admin/content?type=listing&id=XYZ&report=RID
 */
export default function AdminContentPage() {
  return (
    <AdminPermissionGate permission="listings.approve" label="إدارة المحتوى">
      {/* useSearchParams يتطلّب Suspense في Next.js 14 */}
      <Suspense fallback={<AdminTableSkeleton rows={6} />}>
        <ContentManager />
      </Suspense>
    </AdminPermissionGate>
  );
}
