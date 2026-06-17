import type { Listing, SearchAlert } from "@/lib/types";

/**
 * دالة مطابقة نقية (بلا Firebase) — مصدر واحد للحقيقة يستخدمه:
 *  - useSearchAlertMatcher (لإطلاق الإشعارات)
 *  - صفحة التنبيهات (لعرض عدّاد المطابقات الحيّ)
 *
 * كل حقل في التنبيه إذا كان فارغاً لا يُستخدم في الفلترة.
 */
export function matchesAlert(listing: Listing, alert: SearchAlert): boolean {
  if (alert.brand && alert.brand.trim()) {
    const target = alert.brand.trim().toLowerCase();
    const value = (listing.brand || "").toLowerCase();
    if (!value.includes(target) && !target.includes(value)) return false;
  }
  if (alert.model && alert.model.trim()) {
    const target = alert.model.trim().toLowerCase();
    const value = (listing.model || "").toLowerCase();
    if (!value.includes(target) && !target.includes(value)) return false;
  }
  if (alert.yearFrom != null && listing.year != null) {
    if (listing.year < alert.yearFrom) return false;
  }
  if (alert.yearTo != null && listing.year != null) {
    if (listing.year > alert.yearTo) return false;
  }
  if (alert.priceFrom != null) {
    if (listing.price < alert.priceFrom) return false;
  }
  if (alert.priceTo != null) {
    if (listing.price > alert.priceTo) return false;
  }
  if (alert.maxMileage != null && listing.mileage != null) {
    if (listing.mileage > alert.maxMileage) return false;
  }
  if (alert.color && alert.color.trim()) {
    const target = alert.color.trim().toLowerCase();
    const value = (listing.color || "").toLowerCase();
    if (!value.includes(target) && !target.includes(value)) return false;
  }
  if (alert.city && alert.city.trim()) {
    if (alert.city.trim() !== (listing.city || "")) return false;
  }
  if (alert.transmission && alert.transmission.trim()) {
    if (alert.transmission.trim() !== (listing.transmission || "")) return false;
  }
  if (alert.fuelType && alert.fuelType.trim()) {
    if (alert.fuelType.trim() !== (listing.fuel || "")) return false;
  }
  return true;
}
