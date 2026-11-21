"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Users } from "lucide-react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useFollowTraderState } from "@/hooks/useListingEngagement";
import type { UserProfile } from "@/lib/types";

/**
 * «أتابعهم» (2026-11-21) — مطابقة لشاشة التطبيق FollowingScreen2026:
 * users/{me}/following (الأحدث أولاً) + الملف العام publicProfiles/{id} لكل حساب.
 * تشمل «براتشو الرسمي» للحسابات الجديدة (متابعة تلقائية خادمية).
 */
export default function FollowingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [ids, setIds] = useState<string[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?redirect=/profile/following");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "following"),
      orderBy("createdAt", "desc"),
      limit(300)
    );
    return onSnapshot(
      q,
      (s) => setIds(s.docs.map((d) => d.id)),
      () => setError(true)
    );
  }, [user]);

  if (authLoading || !user) {
    return (
      <section className="container py-10">
        <div className="card mx-auto max-w-md p-8 text-center text-slate-500">
          جارٍ التحميل...
        </div>
      </section>
    );
  }

  return (
    <section className="container max-w-2xl py-4 sm:py-8">
      <h1 className="mb-4 inline-flex items-center gap-2 text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
        <Users className="text-blue-600" size={26} />
        أتابعهم
      </h1>

      {error ? (
        <div className="card p-8 text-center text-slate-500">تعذّر تحميل القائمة</div>
      ) : ids === null ? (
        <div className="card p-8 text-center text-slate-500">جارٍ التحميل...</div>
      ) : ids.length === 0 ? (
        <div className="card p-8 text-center">
          <Users className="mx-auto text-slate-400" size={44} />
          <p className="mt-3 font-black text-slate-900 dark:text-white">لا تتابع أحداً بعد</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            تابع المعارض والحسابات لتظهر هنا
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {ids.map((id) => (
            <FollowingRow key={id} id={id} />
          ))}
        </ul>
      )}
    </section>
  );
}

function FollowingRow({ id }: { id: string }) {
  const toast = useToast();
  const [p, setP] = useState<UserProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const { isFollowing, toggleFollow } = useFollowTraderState(id);

  useEffect(
    () =>
      onSnapshot(doc(db, "publicProfiles", id), (s) =>
        setP(s.exists() ? ({ uid: s.id, ...s.data() } as UserProfile) : null)
      ),
    [id]
  );

  const name =
    (p?.businessName && p.businessName.trim()) || p?.name || "مستخدم";
  const isOfficial = p?.isOfficial === true;
  const verified = isOfficial || p?.isVerifiedDealer === true;

  const onToggle = async () => {
    setBusy(true);
    try {
      await toggleFollow();
    } catch (err: any) {
      toast.error(err?.message || "تعذّر تنفيذ المتابعة");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <Link href={`/traders/${id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          {p?.photoURL ? (
            <Image src={p.photoURL} alt={name} fill className="object-cover" sizes="48px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 text-lg font-black text-white">
              {name.charAt(0)}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-black text-slate-950 dark:text-white">{name}</p>
          {verified && (
            <span
              className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-black ${
                isOfficial
                  ? "bg-blue-600 text-white"
                  : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              }`}
            >
              <BadgeCheck size={12} strokeWidth={2.5} aria-hidden="true" />
              {isOfficial ? "الحساب الرسمي" : "موثّق"}
            </span>
          )}
        </div>
      </Link>
      <button
        type="button"
        onClick={onToggle}
        disabled={busy}
        className={`shrink-0 rounded-xl px-4 py-2 text-sm font-black transition disabled:opacity-60 ${
          isFollowing
            ? "bg-slate-100 text-slate-900 ring-1 ring-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:ring-slate-700"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {busy ? "..." : isFollowing ? "✓ متابَع" : "متابعة"}
      </button>
    </li>
  );
}
