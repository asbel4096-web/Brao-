"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getApp } from "firebase/app";
import { useSearchAlertMatcher } from "@/hooks/useSearchAlertMatcher";
import type { UserProfile } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  /**
   * مصدر الحقيقة الوحيد للأدمن في الواجهة.
   * يقرأ من حقل `users/{uid}.isAdmin === true`.
   *
   * هذا الحقل يُحفظ تلقائياً عند أوّل تسجيل دخول لمستخدم
   * إيميله في قائمة `NEXT_PUBLIC_ADMIN_EMAILS` (bootstrap).
   * بعد ذلك تغيير env vars لا يؤثر — الإدارة تتم من /admin/users.
   */
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * تحميل الملف الشخصي + bootstrap أوّل أدمن:
   * - مستخدم جديد: يُنشأ ملف. لو إيميله في BOOTSTRAP list → isAdmin=true تلقائياً.
   * - مستخدم موجود: يُحدّث lastLoginAt فقط، **لا يُلمَس isAdmin** أبداً.
   */
  const loadProfile = useCallback(async (currentUser: User) => {
    // ================================================================
    // تشخيص: نطبع projectId/uid/المسار قبل أي عملية Firestore.
    // هذه السطور حاسمة للتأكد أن:
    //  - الـapp يستخدم نفس projectId المتوقع (وليس مشروع آخر بقواعد قديمة).
    //  - الـuid الذي نقرأ به فعلاً يطابق request.auth.uid.
    //  - المسار يقرأ users/{uid} فقط ولا شيء آخر.
    // ================================================================
    let projectId = "(unknown)";
    try {
      projectId = getApp().options.projectId || "(missing)";
    } catch {
      /* تجاهل - لو لم يُهيَّأ الـapp بعد */
    }
    const path = `users/${currentUser.uid}`;
    // eslint-disable-next-line no-console
    console.log("[Auth] projectId:", projectId);
    // eslint-disable-next-line no-console
    console.log("[Auth] loadProfile uid:", currentUser.uid);
    // eslint-disable-next-line no-console
    console.log("[Auth] loadProfile path:", path);

    const userRef = doc(db, "users", currentUser.uid);

    // ----------------------------------------------------------------
    // مرحلة 1: قراءة users/{uid}.
    // معزولة في try خاص حتى نعرف *بالضبط* أن الفشل من القراءة لا من
    // الكتابة. القاعدة المنشورة لـ users/{userId} هي:
    //   allow read: if true;
    // إن فشلت هذه بـpermission-denied فالقواعد المنشورة في Firebase
    // *ليست* القواعد الموجودة في firestore.rules بالريبو (لم يتم deploy)
    // أو الـprojectId يشير لمشروع آخر.
    // ----------------------------------------------------------------
    let snap;
    try {
      snap = await getDoc(userRef);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("[Auth] loadProfile READ failed at", path);
      // eslint-disable-next-line no-console
      console.error("[Auth] loadProfile READ error code:", err?.code || "(unknown)");
      // eslint-disable-next-line no-console
      console.error("[Auth] loadProfile READ error message:", err?.message || "(no message)");
      // مهم: لا نُلقي toast هنا ولا نُعيد رمي الخطأ.
      // الـprofile يبقى null والـflow يُكمل إلى /profile/complete الذي
      // يستطيع إنشاء الوثيقة عبر setDoc(merge:true).
      setProfile(null);
      return;
    }

    if (!snap.exists()) {
      // ------------------------------------------------------------
      // مستخدم جديد. لا نُنشئ الوثيقة هنا — نترك صفحة /profile/complete
      // تُنشئها عند الحفظ. هذا يتجنّب writes صامتة قد تكسر القواعد
      // (مثلاً إذا تغيّرت قائمة الحقول المسموحة لـcreate).
      //
      // كل ما نحتاجه الآن: تعيين profile مبدئي بالحد الأدنى من البيانات
      // المعروفة من Auth، حتى تتدفّق الواجهة بشكل طبيعي إلى
      // /profile/complete (مدفوع من LoginClient/profile/page).
      // ------------------------------------------------------------
      // eslint-disable-next-line no-console
      console.log("[Auth] loadProfile: no doc yet at", path, "- letting /profile/complete create it");
      setProfile({
        uid: currentUser.uid,
        name: currentUser.displayName || "",
        email: currentUser.email || "",
        phone: currentUser.phoneNumber || "",
        photoURL: currentUser.photoURL || "",
        isAdmin: false,
        profileCompleted: false,
      } as UserProfile);
      return;
    }

    // مستخدم موجود - تحقّق من حالة التعطيل أولاً.
    const existingData = snap.data() as UserProfile;
    if (existingData.disabled === true) {
      // الحساب معطَّل من قبل الأدمن (احتيال/انتحال). سجّل خروج فوري
      // ولا تُحمّل الـprofile - تجربة "كأن الحساب غير موجود".
      // eslint-disable-next-line no-console
      console.warn("[Auth] Account is disabled. Signing out.");
      try {
        await signOut(auth);
      } catch {
        /* تجاهل أخطاء الخروج - الـAuth state سيتحدّث على أي حال */
      }
      setProfile(null);
      if (typeof window !== "undefined") {
        // رسالة بسيطة للمستخدم. لا نكشف السبب لتجنّب جدال مع المحتالين.
        alert("تم تعطيل هذا الحساب. للمزيد تواصل مع إدارة براتشو كار.");
      }
      return;
    }

    // ----------------------------------------------------------------
    // مرحلة 2: تعيين الـprofile من القراءة *قبل* أي كتابة.
    // الواجهة تتدفّق فوراً، وأي فشل في الكتابة (lastLoginAt) لن يعطّل
    // المستخدم — هي عملية تجميل لا حرجة.
    // ----------------------------------------------------------------
    setProfile({ uid: currentUser.uid, ...(existingData as any) });

    // ----------------------------------------------------------------
    // مرحلة 3: تحديث lastLoginAt + الحضور (best-effort).
    // معزول حتى لو فشلت القواعد على حقل غير متوقع، لا نعرض toast.
    // ----------------------------------------------------------------
    try {
      await setDoc(
        userRef,
        {
          lastLoginAt: serverTimestamp(),
          isOnline: true,
          lastSeenAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.warn("[Auth] loadProfile lastLoginAt update failed (non-fatal):", err?.code || "", err?.message || "");
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setProfile({ uid: user.uid, ...(snap.data() as any) });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[Auth] refreshProfile error:", err);
    }
  }, [user]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadProfile(currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [loadProfile]);

  // ----------------------------------------------------------------
  // مستمع realtime لوثيقة المستخدم users/{uid}.
  //
  // السبب: loadProfile يقرأ مرة واحدة (getDoc) عند الدخول. أي تحديث
  // لاحق على الوثيقة — مثل إضافة رصيد عند الموافقة على طلب شحن،
  // أو خصم عند شراء باقة — لا ينعكس على الواجهة حتى إعادة تحميل.
  //
  // هذا المستمع يبقي الـprofile (ومنه الرصيد) محدّثاً لحظياً. يُفعّل
  // فقط بعد أن يكون لدينا profile مُحمّل (أي مستخدم موجود وغير معطّل)،
  // كي لا يتعارض مع منطق loadProfile للحالات الخاصة (جديد/معطّل).
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as UserProfile;
        // لو عُطّل الحساب أثناء الجلسة، لا نُحدّث (يُدار في loadProfile/مكان آخر)
        if ((data as any).disabled === true) return;
        setProfile((prev) =>
          prev ? { ...prev, ...(data as any), uid: user.uid } : prev
        );
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn("[Auth] profile snapshot error:", err?.code || "");
      }
    );
    return () => unsub();
  }, [user]);

  /**
   * Presence heartbeat.
   * - Refreshes `lastSeenAt` every 2 minutes while a tab is open, so the
   *   5-minute "online" window stays accurate without exact disconnect
   *   tracking.
   * - Best-effort flip to `isOnline: false` when the tab is hidden/closed.
   * Only ever writes the user's OWN document, with the field-scoped rule.
   */
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    const beat = (online: boolean) => {
      // Fire-and-forget; never block the UI on presence writes.
      setDoc(
        userRef,
        { isOnline: online, lastSeenAt: serverTimestamp() },
        { merge: true }
      ).catch(() => {
        /* presence is non-critical */
      });
    };

    beat(true);
    heartbeatRef.current = setInterval(() => beat(true), 2 * 60 * 1000);

    const handleVisibility = () => {
      beat(document.visibilityState === "visible");
    };
    const handleLeave = () => beat(false);

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handleLeave);
    window.addEventListener("beforeunload", handleLeave);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handleLeave);
      window.removeEventListener("beforeunload", handleLeave);
      // Mark offline when the user signs out / provider unmounts.
      beat(false);
    };
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      // ✅ مصدر واحد - من Firestore فقط
      isAdmin: profile?.isAdmin === true,
      refreshProfile,
    }),
    [user, profile, loading, refreshProfile]
  );

  return (
    <AuthContext.Provider value={value}>
      {/*
        يشغّل فحص "تنبيهات سياراتي" بعد تسجيل الدخول. يفحص مرة واحدة كل
        10 دقائق ضمن الجلسة، ويعمل صامتاً (لا UI). إن لم يكن المستخدم
        مسجّلاً، الـuid يكون null والفحص يتخطّى تلقائياً.
      */}
      <SearchAlertMatcherRunner uid={user?.uid ?? null} />
      {children}
    </AuthContext.Provider>
  );
}

/** خفيف: يعزل استدعاء الـhook عن AuthProvider الرئيسي. */
function SearchAlertMatcherRunner({ uid }: { uid: string | null }) {
  useSearchAlertMatcher(uid);
  return null;
}

export function useAuth() {
  return useContext(AuthContext);
}
