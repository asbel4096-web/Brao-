"use client";

import { useCallback, useState } from "react";

/**
 * نتيجة طلب موقع المستخدم.
 */
export interface UserLocation {
  latitude: number;
  longitude: number;
  /** دقة الموقع بالأمتار (لو متوفرة من المتصفح). */
  accuracy?: number;
}

export type GeolocationStatus = "idle" | "loading" | "ready" | "denied" | "unavailable" | "error";

/**
 * Hook لطلب موقع المستخدم من المتصفح باستخدام Geolocation API.
 *
 * الموقع يُحفظ في state فقط - لا يُكتب في Firestore أبداً.
 * المستخدم يجب أن يضغط زراً صريحاً لتشغيل طلب الموقع
 * (لا نطلب الإذن تلقائياً عند فتح الصفحة).
 *
 * الـstatus:
 *  - idle: لم يُطلب بعد.
 *  - loading: ينتظر إذن المستخدم أو تحديد الموقع.
 *  - ready: الموقع موجود في location.
 *  - denied: المستخدم رفض الإذن.
 *  - unavailable: المتصفح/الجهاز لا يدعم Geolocation.
 *  - error: خطأ آخر (timeout، فشل GPS، إلخ).
 */
export function useMyLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const requestLocation = useCallback(() => {
    if (typeof window === "undefined") return;

    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      setErrorMessage("جهازك لا يدعم تحديد الموقع.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setStatus("ready");
      },
      (err) => {
        // PERMISSION_DENIED = 1, POSITION_UNAVAILABLE = 2, TIMEOUT = 3
        if (err.code === 1) {
          setStatus("denied");
          setErrorMessage(
            "لم يتم السماح بالوصول للموقع. يمكنك البحث حسب المدينة."
          );
        } else if (err.code === 2) {
          setStatus("error");
          setErrorMessage("تعذّر تحديد موقعك. تأكد من تفعيل GPS وحاول مرة أخرى.");
        } else if (err.code === 3) {
          setStatus("error");
          setErrorMessage("انتهت مهلة تحديد الموقع. حاول مرة أخرى.");
        } else {
          setStatus("error");
          setErrorMessage("حدث خطأ أثناء تحديد الموقع.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000, // اقبل cache من آخر دقيقة
      }
    );
  }, []);

  const clearLocation = useCallback(() => {
    setLocation(null);
    setStatus("idle");
    setErrorMessage("");
  }, []);

  return {
    location,
    status,
    errorMessage,
    requestLocation,
    clearLocation,
  };
}
