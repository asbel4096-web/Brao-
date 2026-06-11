"use client";

import { useAuth } from "@/contexts/AuthContext";

/**
 * يرجع true إذا كان المستخدم الحالي هو مالك الإعلان.
 *
 * يُستخدم لإظهار:
 * - عداد المشاهدات
 * - عدد المفضلين
 * - نقرات الاتصال/الواتساب
 * - أزرار التعديل والحذف
 *
 * أي بيانات أو إجراءات يجب أن تكون محصورة بالمالك.
 *
 * ملاحظة: هذا للـ UI فقط. الحماية الفعلية يجب أن تكون في firestore.rules.
 */
export function useIsListingOwner(ownerId?: string | null): boolean {
  const { user } = useAuth();
  if (!user || !ownerId) return false;
  return user.uid === ownerId;
}
