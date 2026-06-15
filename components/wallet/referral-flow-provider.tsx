"use client";

import { useReferralCodeFlow } from "@/hooks/wallet/use-referral-capture";

/**
 * مكوّن client صغير يُشغّل referral flow.
 * يُضمَّن في الـroot layout (الذي هو server component).
 *
 * المسؤوليات:
 *  - التقاط ?ref=CODE من الـURL وحفظه في localStorage
 *  - تطبيق الكود تلقائياً عند توفّر مستخدم مسجَّل
 *
 * لا يعرض أي UI - فقط side effects.
 */
export function ReferralFlowProvider() {
  useReferralCodeFlow();
  return null;
}
