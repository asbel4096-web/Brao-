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
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, isBootstrapAdminEmail } from "@/lib/firebase";
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
    try {
      const userRef = doc(db, "users", currentUser.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        // مستخدم جديد - إنشاء + bootstrap admin إذا كان إيميله مسجَّلاً
        const shouldBootstrapAdmin = isBootstrapAdminEmail(currentUser.email);

        await setDoc(
          userRef,
          {
            uid: currentUser.uid,
            name: currentUser.displayName || "",
            email: currentUser.email || "",
            phone: currentUser.phoneNumber || "",
            photoURL: currentUser.photoURL || "",
            isAdmin: shouldBootstrapAdmin, // مصدر الحقيقة الوحيد
            isOnline: true,
            lastSeenAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
          },
          { merge: true }
        );

        const fresh = await getDoc(userRef);
        setProfile({ uid: currentUser.uid, ...(fresh.data() as any) });
        return;
      }

      // مستخدم موجود - تحديث lastLoginAt + الحضور فقط، لا نلمس isAdmin
      await setDoc(
        userRef,
        {
          lastLoginAt: serverTimestamp(),
          isOnline: true,
          lastSeenAt: serverTimestamp(),
        },
        { merge: true }
      );
      setProfile({ uid: currentUser.uid, ...(snap.data() as any) });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[Auth] loadProfile error:", err);
      setProfile(null);
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
