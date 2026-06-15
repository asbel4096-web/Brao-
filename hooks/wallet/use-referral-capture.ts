"use client";

import { useEffect } from "react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlag } from "@/hooks/features/use-feature-flag";
import {
  isValidCodeFormat,
  REFERRAL_CODE_TTL_MS,
} from "@/lib/wallet/referrals";

/**
 * Hook لالتقاط ?ref=CODE من الـURL وحفظه في localStorage،
 * ثم تطبيقه تلقائياً عند توفر مستخدم مسجَّل.
 *
 * - يُستدعى مرة في الصفحة الرئيسية (مثل layout أو main page).
 * - بعد التسجيل + ظهور الـprofile، نُحاول تطبيق الكود.
 * - الكود يُمسح من localStorage بعد التطبيق الناجح.
 *
 * Anti-abuse: API يفحص حداثة الحساب (< 7 أيام).
 */

const STORAGE_KEY = "bratsho:pending-referral-code";
const STORAGE_TS_KEY = "bratsho:pending-referral-ts";

/**
 * يلتقط ref من query وُيخزّنه في localStorage.
 * استخدم في الـlayout أو الـpage الرئيسية.
 */
export function useReferralCodeCapture() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (!ref) return;

      const code = ref.trim().toUpperCase();
      if (!isValidCodeFormat(code)) return;

      window.localStorage.setItem(STORAGE_KEY, code);
      window.localStorage.setItem(STORAGE_TS_KEY, String(Date.now()));

      // تنظيف الـURL (إزالة ?ref بدون reload)
      const url = new URL(window.location.href);
      url.searchParams.delete("ref");
      window.history.replaceState({}, "", url.toString());
    } catch {
      /* تجاهل */
    }
  }, []);
}

/**
 * يُطبّق الكود المُخزَّن عند توفر user.
 * يُستدعى مرة في الـlayout بعد الـAuth context يكون جاهزاً.
 *
 * idempotent: لو الكود طُبِّق سابقاً، الـAPI يُرجِع alreadyApplied
 * ونحن نُنظّف localStorage ولا نُعيد المحاولة.
 */
export function useReferralCodeApply() {
  const { user, profile } = useAuth();
  const enabled = useFeatureFlag("referrals");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!enabled || !user || !profile) return;

    // المستخدم لديه referredBy؟ → الكود طُبِّق سابقاً
    if ((profile as any).referredBy) {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(STORAGE_TS_KEY);
      return;
    }

    const code = window.localStorage.getItem(STORAGE_KEY);
    const tsRaw = window.localStorage.getItem(STORAGE_TS_KEY);
    if (!code) return;

    // فحص الـTTL
    if (tsRaw) {
      const ts = Number(tsRaw);
      if (Date.now() - ts > REFERRAL_CODE_TTL_MS) {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(STORAGE_TS_KEY);
        return;
      }
    }

    // محاولة التطبيق
    (async () => {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const res = await fetch("/api/wallet/referrals/apply-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken || ""}`,
          },
          body: JSON.stringify({ code }),
        });
        // sucesso أم فشل: نُنظّف الـlocalStorage (لا نُعيد المحاولة)
        // الفشل غالباً = حساب قديم (> 7 أيام) أو كود غير صالح
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(STORAGE_TS_KEY);
        if (res.ok) {
          // eslint-disable-next-line no-console
          console.log("[referrals] code applied successfully");
        }
      } catch {
        // فشل الشبكة - نتركه ليعيد المحاولة لاحقاً
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, profile, enabled]);
}

/**
 * Hook موحَّد: يلتقط + يُطبّق. استخدم في الـlayout.
 */
export function useReferralCodeFlow() {
  useReferralCodeCapture();
  useReferralCodeApply();
}
