"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ContactSettings } from "@/lib/types";

/**
 * Hook لجلب إعدادات معلومات التواصل من Firestore (settings/contact).
 *
 * - cache في sessionStorage لمدة 5 دقائق (إعدادات نادراً ما تتغيّر).
 * - fallback إلى DEFAULTS لو الوثيقة غير موجودة بعد (مثلاً قبل أن يحفظ
 *   الأدمن أول مرة).
 * - يقرأ مرة واحدة عبر getDoc (وليس onSnapshot) - لا حاجة لـrealtime
 *   لإعدادات ثابتة كهذه.
 */

const CACHE_KEY = "bratsho:contact-settings:v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * قيم افتراضية تظهر قبل أن يحفظ الأدمن أي شيء.
 * لو حذفها الأدمن لاحقاً (حقل فارغ)، الـUI ستخفي البطاقة المقابلة.
 */
export const DEFAULT_CONTACT_SETTINGS: ContactSettings = {
  phone: "+218912345678",
  whatsapp: "218912345678",
  email: "support@bratshocar.com",
  facebookUrl: "https://facebook.com/bratshocar",
  instagramUrl: "",
};

function readCache(): ContactSettings | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; data: ContactSettings };
    if (!parsed || Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data: ContactSettings) {
  try {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), data })
    );
  } catch {
    /* تجاهل */
  }
}

export function useContactSettings() {
  const [settings, setSettings] = useState<ContactSettings>(() => {
    return readCache() || DEFAULT_CONTACT_SETTINGS;
  });
  const [loading, setLoading] = useState(() => readCache() === null);

  useEffect(() => {
    // لو cache صالح، تخطّى الجلب.
    if (readCache() !== null) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "contact"));
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data() as ContactSettings;
          // دمج مع الافتراضيات - أي حقل غير محدّد من الأدمن
          // يبقى بقيمة افتراضية كي لا تتعطّل الصفحة.
          const merged: ContactSettings = {
            ...DEFAULT_CONTACT_SETTINGS,
            ...data,
          };
          setSettings(merged);
          writeCache(merged);
        } else {
          // الوثيقة غير موجودة بعد - استخدم الافتراضي.
          setSettings(DEFAULT_CONTACT_SETTINGS);
          writeCache(DEFAULT_CONTACT_SETTINGS);
        }
        setLoading(false);
      } catch {
        if (!cancelled) {
          // فشل صامت - استخدم الافتراضي. لا نُظهر خطأ للمستخدم العادي.
          setSettings(DEFAULT_CONTACT_SETTINGS);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { settings, loading };
}

/**
 * يمسح cache - يُستدعى بعد حفظ الأدمن لإجبار قراءة جديدة.
 */
export function clearContactSettingsCache() {
  try {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* تجاهل */
  }
}
