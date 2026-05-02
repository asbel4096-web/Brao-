"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, isAdminEmail } from "@/lib/firebase";
import type { UserProfile } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
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

  const loadProfile = useCallback(async (currentUser: User) => {
    try {
      const userRef = doc(db, "users", currentUser.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(
          userRef,
          {
            uid: currentUser.uid,
            name: currentUser.displayName || "",
            email: currentUser.email || "",
            phone: currentUser.phoneNumber || "",
            photoURL: currentUser.photoURL || "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
          },
          { merge: true }
        );
        const fresh = await getDoc(userRef);
        setProfile({ uid: currentUser.uid, ...(fresh.data() as any) });
      } else {
        await setDoc(
          userRef,
          { lastLoginAt: serverTimestamp() },
          { merge: true }
        );
        setProfile({ uid: currentUser.uid, ...(snap.data() as any) });
      }
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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      isAdmin: isAdminEmail(user?.email) || profile?.isAdmin === true,
      refreshProfile,
    }),
    [user, profile, loading, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
