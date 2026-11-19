"use client";

/**
 * منشورات المجتمع (سابقاً «سوق الجمعة») — نفس شاشة التطبيق FridayMarketHomeScreen:
 * المنشورات المعتمدة من مجموعة `posts` الأحدث أولاً، 15 لكل صفحة، وزر «+ منشور».
 * القسم يُفعَّل/يُعطَّل بمفتاح التطبيق نفسه `featureFlags/friday_market`.
 * (عناصر السوق الأسبوعي القديم في `fridayMarket` تبقى صفحاتها /friday-market/{id} للقراءة.)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Users } from "lucide-react";
import { doc, getDoc, type DocumentData, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { PostCard } from "@/components/community/post-card";
import { fetchApprovedPage, type CommunityPost } from "@/lib/community/posts";

const CREATE = "/friday-market/create-post";

export default function CommunityPostsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [last, setLast] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(false);
  const sentinel = useRef<HTMLDivElement | null>(null);

  // المفتاح نفسه الذي يقرؤه التطبيق (الافتراضي مفعّل).
  useEffect(() => {
    getDoc(doc(db, "featureFlags", "friday_market"))
      .then((s) => setEnabled(s.exists() ? s.data()?.enabled !== false : true))
      .catch(() => setEnabled(true));
  }, []);

  const loadFirst = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const r = await fetchApprovedPage(null);
      setPosts(r.posts);
      setLast(r.last);
      setHasMore(r.posts.length > 0 && !!r.last);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void loadFirst();
  }, [enabled, loadFirst]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !last) return;
    setLoadingMore(true);
    try {
      const r = await fetchApprovedPage(last);
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...r.posts.filter((p) => !seen.has(p.id))];
      });
      setLast(r.last);
      setHasMore(r.posts.length > 0 && !!r.last);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, last, loadingMore]);

  // تحميل الصفحة التالية قبل نهاية القائمة (مثل التطبيق).
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => es.some((e) => e.isIntersecting) && void loadMore(),
      { rootMargin: "800px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  const openCreate = () =>
    user ? router.push(CREATE) : router.push(`/login?redirect=${encodeURIComponent(CREATE)}`);

  if (enabled === false) {
    return (
      <div className="container flex min-h-[70vh] flex-col items-center justify-center text-center" dir="rtl">
        <div className="text-5xl">💬</div>
        <h1 className="mt-4 text-lg font-black text-slate-800 dark:text-slate-100">
          منشورات المجتمع غير متاحة حالياً
        </h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">تابعنا — ستعود قريباً</p>
        <Link href="/" className="mt-5 rounded-full bg-brand-700 px-6 py-2.5 text-sm font-bold text-white">
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24" dir="rtl">
      {/* الرأس */}
      <section className="container pt-4">
        <div className="flex items-center gap-3 rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-blue">
            <Users size={24} strokeWidth={2.4} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-black leading-tight text-slate-900 dark:text-white">منشورات المجتمع</h1>
            <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
              انشر وتصفّح منشورات الأعضاء
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 shrink-0 items-center gap-1 rounded-2xl bg-brand-700 px-4 text-sm font-black text-white shadow-blue transition hover:bg-brand-800 active:scale-[0.98]"
          >
            <Plus size={16} strokeWidth={2.8} />
            منشور
          </button>
        </div>
      </section>

      {/* القائمة */}
      <section className="container mx-auto mt-4 max-w-2xl space-y-4">
        {loading || enabled === null ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-3xl bg-white ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800" />
          ))
        ) : error ? (
          <div className="rounded-3xl bg-white p-8 text-center ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">تعذّر تحميل المنشورات</p>
            <button type="button" onClick={() => void loadFirst()} className="mt-3 rounded-full bg-brand-700 px-5 py-2 text-sm font-bold text-white">
              إعادة المحاولة
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
            <div className="text-4xl">📝</div>
            <h2 className="mt-3 text-base font-black text-slate-800 dark:text-slate-100">لا توجد منشورات بعد</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">كن أول من ينشر في منشورات المجتمع</p>
            <button type="button" onClick={openCreate} className="mt-4 rounded-full bg-brand-700 px-6 py-2.5 text-sm font-bold text-white">
              أنشئ منشوراً
            </button>
          </div>
        ) : (
          <>
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
            <div ref={sentinel} />
            {loadingMore && (
              <div className="h-24 animate-pulse rounded-3xl bg-white ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800" />
            )}
            {!hasMore && (
              <p className="py-4 text-center text-xs font-bold text-slate-400">وصلت لنهاية المنشورات</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
