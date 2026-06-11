"use client";

import { useCallback, useState } from "react";
import { auth } from "@/lib/firebase";
import { useToast } from "@/contexts/ToastContext";
import type { AdminRole } from "@/lib/admin/roles";

/**
 * Hook موحّد لإجراءات المستخدمين من الواجهة.
 *
 * يلتف على API routes ويضيف:
 *  - إدارة idToken تلقائياً
 *  - معالجة أخطاء + toast
 *  - busy state لكل إجراء
 *
 * استخدام في component:
 *   const { ban, busy } = useUserActions();
 *   await ban(uid, "السبب");
 */

async function getIdToken(): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("UNAUTHENTICATED");
  return token;
}

async function callApi<T = any>(
  url: string,
  method: "POST" | "DELETE" = "POST",
  body?: any
): Promise<T> {
  const idToken = await getIdToken();
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function useUserActions() {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null); // اسم الإجراء الجاري

  const wrap = useCallback(
    async <T,>(
      action: string,
      fn: () => Promise<T>,
      successMsg: string
    ): Promise<T | null> => {
      setBusy(action);
      try {
        const result = await fn();
        toast.success(successMsg);
        return result;
      } catch (err: any) {
        toast.error(err?.message || "تعذّر تنفيذ الإجراء");
        return null;
      } finally {
        setBusy(null);
      }
    },
    [toast]
  );

  const ban = useCallback(
    (uid: string, reason?: string) =>
      wrap(
        "ban",
        () => callApi(`/api/admin/users/${uid}/ban`, "POST", { reason }),
        "تم حظر المستخدم وأرشفة إعلاناته"
      ),
    [wrap]
  );

  const unban = useCallback(
    (uid: string) =>
      wrap(
        "unban",
        () => callApi(`/api/admin/users/${uid}/unban`, "POST"),
        "تم إلغاء الحظر واستعادة الإعلانات"
      ),
    [wrap]
  );

  const verify = useCallback(
    (uid: string) =>
      wrap(
        "verify",
        () => callApi(`/api/admin/users/${uid}/verify`, "POST"),
        "تم توثيق الحساب"
      ),
    [wrap]
  );

  const unverify = useCallback(
    (uid: string) =>
      wrap(
        "unverify",
        () => callApi(`/api/admin/users/${uid}/verify`, "DELETE"),
        "تم إلغاء التوثيق"
      ),
    [wrap]
  );

  const setRole = useCallback(
    (uid: string, role: AdminRole | null) =>
      wrap(
        "role",
        () => callApi(`/api/admin/users/${uid}/role`, "POST", { role }),
        role ? "تم تعيين الدور" : "تمت إزالة دور الأدمن"
      ),
    [wrap]
  );

  const softDelete = useCallback(
    (uid: string, reason?: string) =>
      wrap(
        "delete",
        () => callApi(`/api/admin/users/${uid}/delete`, "POST", { reason }),
        "تم حذف الحساب (soft delete)"
      ),
    [wrap]
  );

  return {
    ban,
    unban,
    verify,
    unverify,
    setRole,
    softDelete,
    busy,
    isBusy: busy !== null,
  };
}
