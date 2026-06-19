"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  Loader2,
  Save,
  ShoppingCart,
  Star,
  Trash2,
  Archive as ArchiveIcon,
  RotateCcw,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import { useToast } from "@/contexts/ToastContext";
import { useMarketState } from "@/hooks/friday-market/use-market-state";
import {
  DEFAULT_FRIDAY_SETTINGS,
  fridayCategoryLabel,
  type FridayMarketItem,
  type FridayMarketSettings,
} from "@/lib/friday-market/types";
import { formatPrice } from "@/lib/utils";

const DAYS = [
  { v: 5, label: "الجمعة" },
  { v: 6, label: "السبت" },
  { v: 0, label: "الأحد" },
  { v: 1, label: "الإثنين" },
  { v: 2, label: "الثلاثاء" },
  { v: 3, label: "الأربعاء" },
  { v: 4, label: "الخميس" },
];

export default function AdminFridayMarketPage() {
  const { can, loading: roleLoading } = useAdminRole();
  const toast = useToast();
  const { weekKey, weekLabel, isLive } = useMarketState();

  const [settings, setSettings] = useState<FridayMarketSettings>(
    DEFAULT_FRIDAY_SETTINGS
  );
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tab, setTab] = useState<"active" | "archived">("active");
  const [items, setItems] = useState<FridayMarketItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const allowed = can("settings.edit") || can("listings.feature");

  // جلب الإعدادات
  useEffect(() => {
    if (!allowed) return;
    (async () => {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const res = await fetch("/api/admin/friday-market/settings", {
          headers: { Authorization: `Bearer ${idToken || ""}` },
        });
        const data = await res.json();
        if (res.ok && data.settings) setSettings(data.settings);
      } catch {
        /* الافتراضي */
      } finally {
        setLoadingSettings(false);
      }
    })();
  }, [allowed]);

  // جلب إعلانات الجلسة الحالية
  const loadItems = useCallback(async () => {
    if (!weekKey || !allowed) return;
    setLoadingItems(true);
    try {
      const q = query(
        collection(db, "fridayMarket"),
        where("weekKey", "==", weekKey),
        where("status", "==", tab),
        orderBy("createdAt", "desc"),
        limit(60)
      );
      const snap = await getDocs(q);
      setItems(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FridayMarketItem, "id">) }))
      );
    } catch (e: any) {
      toast.error("تعذّر تحميل الإعلانات (تأكد من الفهرس)");
    } finally {
      setLoadingItems(false);
    }
  }, [weekKey, tab, allowed, toast]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/friday-market/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken || ""}`,
        },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "فشل الحفظ");
      toast.success("تم حفظ إعدادات السوق");
    } catch (e: any) {
      toast.error(e?.message || "تعذّر الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const itemAction = async (
    item: FridayMarketItem,
    action: "feature" | "unfeature" | "archive" | "restore" | "delete"
  ) => {
    if (action === "delete" && !confirm("حذف هذا الإعلان نهائياً؟")) return;
    setBusyId(item.id);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const method = action === "delete" ? "DELETE" : "PATCH";
      const res = await fetch(`/api/admin/friday-market/${item.id}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken || ""}`,
        },
        body: action === "delete" ? undefined : JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "فشل الإجراء");
      toast.success("تم");
      loadItems();
    } catch (e: any) {
      toast.error(e?.message || "تعذّر تنفيذ الإجراء");
    } finally {
      setBusyId(null);
    }
  };

  if (roleLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-action-500" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="p-6 text-center text-sm font-bold text-slate-500" dir="rtl">
        لا تملك صلاحية الوصول لهذه الصفحة.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6" dir="rtl">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-950/40">
          <ShoppingCart size={22} />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            سوق الجمعة
          </h1>
          <p className="text-xs font-semibold text-slate-400">
            {weekLabel} ·{" "}
            <span className={isLive ? "text-emerald-600" : "text-rose-500"}>
              {isLive ? "مفتوح الآن" : "مغلق"}
            </span>
          </p>
        </div>
      </header>

      {/* ===== الإعدادات ===== */}
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
        <h2 className="mb-4 text-base font-black text-slate-900 dark:text-white">
          إعدادات السوق
        </h2>

        {loadingSettings ? (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin text-action-500" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* تفعيل */}
            <Row label="تفعيل سوق الجمعة" hint="إيقافه يخفي البانر والصفحة عن الجميع">
              <Toggle
                on={settings.enabled !== false}
                onChange={(v) => setSettings((s) => ({ ...s, enabled: v }))}
              />
            </Row>

            {/* يوم الفتح */}
            <Row label="يوم الفتح">
              <select
                value={settings.openDay}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, openDay: Number(e.target.value) }))
                }
                className={selectCls}
              >
                {DAYS.map((d) => (
                  <option key={d.v} value={d.v}>
                    {d.label}
                  </option>
                ))}
              </select>
            </Row>

            {/* ساعة الفتح */}
            <Row label="ساعة الفتح (0–23)" hint="بتوقيت ليبيا">
              <input
                type="number"
                min={0}
                max={23}
                value={settings.openHour}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, openHour: Number(e.target.value) }))
                }
                className={inputCls}
              />
            </Row>

            {/* المدّة */}
            <Row label="مدّة السوق (ساعات)" hint="24 = طوال اليوم">
              <input
                type="number"
                min={1}
                max={168}
                value={settings.durationHours}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    durationHours: Number(e.target.value),
                  }))
                }
                className={inputCls}
              />
            </Row>

            {/* نص البانر */}
            <Row label="عنوان البانر">
              <input
                value={settings.bannerTitle || ""}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, bannerTitle: e.target.value }))
                }
                className={inputCls}
              />
            </Row>
            <Row label="وصف البانر">
              <input
                value={settings.bannerSubtitle || ""}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, bannerSubtitle: e.target.value }))
                }
                className={inputCls}
              />
            </Row>

            <Row label="إظهار الأرشيف للمستخدمين">
              <Toggle
                on={settings.showArchive !== false}
                onChange={(v) => setSettings((s) => ({ ...s, showArchive: v }))}
              />
            </Row>

            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 rounded-2xl bg-action-500 px-5 py-2.5 text-sm font-black text-white active:scale-95 disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              حفظ الإعدادات
            </button>
          </div>
        )}
      </section>

      {/* ===== إدارة الإعلانات ===== */}
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 dark:text-white">
            إعلانات الجلسة ({items.length})
          </h2>
          <div className="flex gap-1.5">
            {(["active", "archived"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={[
                  "rounded-full px-3 py-1.5 text-xs font-bold",
                  tab === t
                    ? "bg-action-500 text-white"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800",
                ].join(" ")}
              >
                {t === "active" ? "نشطة" : "مؤرشفة"}
              </button>
            ))}
          </div>
        </div>

        {loadingItems ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-action-500" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm font-bold text-slate-400">
            لا إعلانات {tab === "active" ? "نشطة" : "مؤرشفة"} في هذه الجلسة
          </p>
        ) : (
          <div className="space-y-2.5">
            {items.map((it) => (
              <div
                key={it.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 p-2.5 dark:border-slate-800"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                  {it.images?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.images[0]}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-800 dark:text-slate-100">
                    {it.featured && <Star size={12} className="inline text-amber-500" />}{" "}
                    {it.title}
                  </p>
                  <p className="text-xs font-bold text-action-600">
                    {formatPrice(it.price)}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-400">
                    {fridayCategoryLabel(it.category)} · {it.ownerName}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {busyId === it.id ? (
                    <Loader2 size={18} className="animate-spin text-action-500" />
                  ) : (
                    <>
                      {tab === "active" && (
                        <>
                          <IconBtn
                            title={it.featured ? "إلغاء التمييز" : "تمييز"}
                            onClick={() =>
                              itemAction(it, it.featured ? "unfeature" : "feature")
                            }
                            active={!!it.featured}
                          >
                            <Star size={16} />
                          </IconBtn>
                          <IconBtn
                            title="أرشفة"
                            onClick={() => itemAction(it, "archive")}
                          >
                            <ArchiveIcon size={16} />
                          </IconBtn>
                        </>
                      )}
                      {tab === "archived" && (
                        <IconBtn
                          title="استعادة"
                          onClick={() => itemAction(it, "restore")}
                        >
                          <RotateCcw size={16} />
                        </IconBtn>
                      )}
                      <IconBtn
                        title="حذف"
                        danger
                        onClick={() => itemAction(it, "delete")}
                      >
                        <Trash2 size={16} />
                      </IconBtn>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ===================== عناصر مساعدة ===================== */

const inputCls =
  "w-36 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-action-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const selectCls = inputCls;

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-50 pb-3 dark:border-slate-800/60">
      <div>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
          {label}
        </p>
        {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={[
        "relative h-7 w-12 rounded-full transition",
        on ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700",
      ].join(" ")}
      aria-pressed={on}
    >
      <span
        className={[
          "absolute top-1 h-5 w-5 rounded-full bg-white transition-all",
          on ? "right-1" : "right-6",
        ].join(" ")}
      />
    </button>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  active,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        "rounded-xl p-2 transition active:scale-90",
        danger
          ? "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          : active
          ? "bg-amber-100 text-amber-600 dark:bg-amber-950/40"
          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
