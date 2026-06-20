"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Eye,
  ChevronDown,
  CheckSquare,
  Square,
  Send,
  BellRing,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import { useToast } from "@/contexts/ToastContext";
import { useMarketState } from "@/hooks/friday-market/use-market-state";
import { useMarketWeeks } from "@/hooks/friday-market/use-market-weeks";
import {
  DEFAULT_FRIDAY_SETTINGS,
  FRIDAY_CATEGORIES,
  type FridayMarketItem,
  type FridayMarketSettings,
} from "@/lib/friday-market/types";
import { formatNumber, formatPrice } from "@/lib/utils";

const DAYS = [
  { v: 5, label: "الجمعة" },
  { v: 6, label: "السبت" },
  { v: 0, label: "الأحد" },
  { v: 1, label: "الإثنين" },
  { v: 2, label: "الثلاثاء" },
  { v: 3, label: "الأربعاء" },
  { v: 4, label: "الخميس" },
];

const ITEMS_LIMIT = 300;

export default function AdminFridayMarketPage() {
  const { can, loading: roleLoading } = useAdminRole();
  const toast = useToast();
  const { weekKey: currentWeekKey, weekLabel, isLive } = useMarketState();
  const { weeks } = useMarketWeeks(40);

  const allowed = can("settings.edit") || can("listings.feature");

  /* ===================== الإعدادات ===================== */
  const [settings, setSettings] = useState<FridayMarketSettings>(
    DEFAULT_FRIDAY_SETTINGS
  );
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingEnabled, setTogglingEnabled] = useState(false);

  // إشعار فتح السوق
  const [notifyTitle, setNotifyTitle] = useState("🛒 سوق الجمعة فُتح الآن!");
  const [notifyBody, setNotifyBody] = useState(
    "عروض الجمعة متاحة لوقت محدود — تصفّح وانشر عرضك السريع الآن 🔥"
  );
  const [sendingNotify, setSendingNotify] = useState(false);
  const [notifiedWeek, setNotifiedWeek] = useState<string>("");

  useEffect(() => {
    if (!allowed) return;
    (async () => {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const res = await fetch("/api/admin/friday-market/settings", {
          headers: { Authorization: `Bearer ${idToken || ""}` },
        });
        const data = await res.json();
        if (res.ok && data.settings) {
          setSettings(data.settings);
          setNotifiedWeek(data.settings.lastNotifiedWeek || "");
        }
      } catch {
        /* default */
      } finally {
        setLoadingSettings(false);
      }
    })();
  }, [allowed]);

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

  // زر التفعيل يحفظ فوراً (بدون الحاجة لزر "حفظ")
  const setEnabled = async (v: boolean) => {
    const nextSettings = { ...settings, enabled: v };
    setSettings(nextSettings);
    setTogglingEnabled(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/friday-market/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken || ""}`,
        },
        body: JSON.stringify(nextSettings),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "فشل");
      toast.success(v ? "تم تفعيل سوق الجمعة" : "تم إيقاف سوق الجمعة");
    } catch (e: any) {
      setSettings((s) => ({ ...s, enabled: !v })); // تراجع عند الفشل
      toast.error(e?.message || "تعذّر تحديث الحالة");
    } finally {
      setTogglingEnabled(false);
    }
  };

  // إرسال إشعار "فُتح السوق" لكل المستخدمين
  const sendNotification = async (force = false) => {
    if (!force && notifyTitle.trim().length < 3) {
      toast.warning("اكتب عنواناً للإشعار");
      return;
    }
    if (
      !force &&
      !confirm("إرسال إشعار فتح السوق لكل المستخدمين الآن؟")
    )
      return;

    setSendingNotify(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/friday-market/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken || ""}`,
        },
        body: JSON.stringify({
          title: notifyTitle.trim(),
          body: notifyBody.trim(),
          force,
        }),
      });
      const data = await res.json();

      // سبق الإرسال لهذه الجمعة → اطلب تأكيداً وأعد الإرسال بـforce
      if (res.ok && data.already) {
        if (confirm("⚠️ سبق إرسال إشعار لجمعة هذا الأسبوع. إعادة الإرسال للجميع؟")) {
          await sendNotification(true);
        }
        return;
      }

      if (!res.ok || !data.ok) throw new Error(data?.error || "فشل الإرسال");

      setNotifiedWeek(data.weekKey || currentWeekKey);
      toast.success(
        `تم الإرسال ✅ — ${formatNumber(data.pushSent || 0)} إشعار فوري + ${formatNumber(
          data.recipientCount || 0
        )} داخل التطبيق`
      );
    } catch (e: any) {
      toast.error(e?.message || "تعذّر إرسال الإشعار");
    } finally {
      setSendingNotify(false);
    }
  };
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [items, setItems] = useState<FridayMarketItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // الجلسة الافتراضية = الحالية
  useEffect(() => {
    if (!selectedWeek && currentWeekKey) setSelectedWeek(currentWeekKey);
  }, [currentWeekKey, selectedWeek]);

  const loadItems = useCallback(async () => {
    if (!selectedWeek || !allowed) return;
    setLoadingItems(true);
    setSelected(new Set());
    try {
      const q = query(
        collection(db, "fridayMarket"),
        where("weekKey", "==", selectedWeek),
        where("status", "==", tab),
        orderBy("createdAt", "desc"),
        limit(ITEMS_LIMIT)
      );
      const snap = await getDocs(q);
      setItems(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<FridayMarketItem, "id">),
        }))
      );
    } catch {
      toast.error("تعذّر تحميل الإعلانات (تأكد من إنشاء الفهرس)");
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  }, [selectedWeek, tab, allowed, toast]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // تجميع حسب القسم (كل قسم لوحده، بترتيب ثابت)
  const grouped = useMemo(() => {
    const map = new Map<string, FridayMarketItem[]>();
    for (const cat of FRIDAY_CATEGORIES) map.set(cat.key, []);
    const other: FridayMarketItem[] = [];
    for (const it of items) {
      const arr = map.get(String(it.category));
      if (arr) arr.push(it);
      else other.push(it);
    }
    const sections: {
      key: string;
      label: string;
      emoji: string;
      items: FridayMarketItem[];
    }[] = FRIDAY_CATEGORIES.map((c) => ({
      key: c.key as string,
      label: c.label,
      emoji: c.emoji,
      items: map.get(c.key) || [],
    })).filter((s) => s.items.length > 0);
    if (other.length) {
      sections.push({ key: "other", label: "غير مصنّف", emoji: "🛒", items: other });
    }
    return sections;
  }, [items]);

  const totalViews = useMemo(
    () => items.reduce((sum, it) => sum + (it.views || 0), 0),
    [items]
  );

  /* ---------- التحديد ---------- */
  const toggleItem = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleCategory = (catItems: FridayMarketItem[]) => {
    const ids = catItems.map((i) => i.id);
    const allSel = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allSel ? next.delete(id) : next.add(id)));
      return next;
    });
  };
  const allSelected = items.length > 0 && selected.size === items.length;
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  };

  /* ---------- أفعال الحذف الجماعي ---------- */
  const bulkDeleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`حذف ${selected.size} إعلاناً نهائياً؟`)) return;
    setBulkBusy(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/friday-market/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken || ""}`,
        },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "فشل الحذف");
      toast.success(`تم حذف ${data.deleted} إعلاناً`);
      loadItems();
    } catch (e: any) {
      toast.error(e?.message || "تعذّر الحذف");
    } finally {
      setBulkBusy(false);
    }
  };

  const deleteAllSession = async () => {
    if (items.length === 0) return;
    const label = tab === "active" ? "النشطة" : "المؤرشفة";
    if (
      !confirm(
        `⚠️ حذف كل الإعلانات ${label} في هذه الجلسة نهائياً؟ لا يمكن التراجع.`
      )
    )
      return;
    setBulkBusy(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/friday-market/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken || ""}`,
        },
        body: JSON.stringify({ weekKey: selectedWeek, status: tab, all: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "فشل الحذف");
      toast.success(`تم حذف ${data.deleted} إعلاناً`);
      loadItems();
    } catch (e: any) {
      toast.error(e?.message || "تعذّر الحذف");
    } finally {
      setBulkBusy(false);
    }
  };

  /* ---------- أفعال الإعلان الواحد ---------- */
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

  const toggleCollapse = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  /* ===================== العرض ===================== */
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
            <Row label="تفعيل سوق الجمعة" hint="إيقافه يخفي البانر والصفحة عن الجميع فوراً">
              <div className="flex items-center gap-2">
                {togglingEnabled && (
                  <Loader2 size={15} className="animate-spin text-action-500" />
                )}
                <Toggle
                  on={settings.enabled !== false}
                  onChange={(v) => setEnabled(v)}
                />
              </div>
            </Row>
            <Row label="يوم الفتح">
              <select
                value={settings.openDay}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, openDay: Number(e.target.value) }))
                }
                className={inputCls}
              >
                {DAYS.map((d) => (
                  <option key={d.v} value={d.v}>
                    {d.label}
                  </option>
                ))}
              </select>
            </Row>
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

      {/* ===== إشعار فتح السوق ===== */}
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
        <div className="mb-1 flex items-center gap-2">
          <BellRing size={18} className="text-action-500" />
          <h2 className="text-base font-black text-slate-900 dark:text-white">
            إشعار فتح السوق
          </h2>
        </div>
        <p className="mb-4 text-xs font-semibold text-slate-400">
          يصل لكل المستخدمين (إشعار فوري + داخل التطبيق) ويفتح صفحة سوق الجمعة.
          يُرسَل تلقائياً صباح يوم فتح السوق، ويمكنك إرساله يدوياً الآن أيضاً.
        </p>

        {notifiedWeek && notifiedWeek === currentWeekKey && (
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            ✓ تم الإرسال لجمعة هذا الأسبوع
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200">
              العنوان
            </label>
            <input
              value={notifyTitle}
              onChange={(e) => setNotifyTitle(e.target.value)}
              maxLength={100}
              className={inputCls + " w-full"}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200">
              النص
            </label>
            <textarea
              value={notifyBody}
              onChange={(e) => setNotifyBody(e.target.value)}
              maxLength={500}
              rows={3}
              className={inputCls + " w-full resize-none"}
            />
          </div>

          <button
            onClick={() => sendNotification(false)}
            disabled={sendingNotify}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-orange-500 to-red-600 py-3 text-sm font-black text-white shadow-md transition active:scale-[0.98] disabled:opacity-60"
          >
            {sendingNotify ? (
              <>
                <Loader2 size={16} className="animate-spin" /> جاري الإرسال...
              </>
            ) : (
              <>
                <Send size={16} /> أرسل إشعار فتح السوق
              </>
            )}
          </button>
        </div>
      </section>

      {/* ===== إدارة الإعلانات ===== */}
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-black text-slate-900 dark:text-white">
            عروض المستخدمين
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

        {/* محدّد الجلسة + ملخّص */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className={inputCls + " w-auto min-w-[180px]"}
          >
            {currentWeekKey &&
              !weeks.find((w) => w.weekKey === currentWeekKey) && (
                <option value={currentWeekKey}>
                  {weekLabel} (الحالية)
                </option>
              )}
            {weeks.map((w) => (
              <option key={w.weekKey} value={w.weekKey}>
                {w.label}
                {w.weekKey === currentWeekKey ? " (الحالية)" : ""}
              </option>
            ))}
          </select>

          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {formatNumber(items.length)} إعلان
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Eye size={13} /> {formatNumber(totalViews)} مشاهدة
          </span>
        </div>

        {/* شريط أدوات التحديد */}
        {items.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 p-2 dark:bg-slate-800/50">
            <button
              onClick={toggleAll}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {allSelected ? (
                <CheckSquare size={16} className="text-action-500" />
              ) : (
                <Square size={16} />
              )}
              تحديد الكل
            </button>

            <span className="text-xs font-bold text-slate-400">
              {selected.size > 0 ? `${selected.size} محدّد` : ""}
            </span>

            <div className="mr-auto flex items-center gap-2">
              <button
                onClick={bulkDeleteSelected}
                disabled={selected.size === 0 || bulkBusy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-3 py-1.5 text-xs font-black text-white active:scale-95 disabled:opacity-40"
              >
                {bulkBusy ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                حذف المحدّد
              </button>
              <button
                onClick={deleteAllSession}
                disabled={bulkBusy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 px-3 py-1.5 text-xs font-black text-rose-600 active:scale-95 disabled:opacity-40 dark:border-rose-900/50"
              >
                <Trash2 size={14} /> حذف الكل
              </button>
            </div>
          </div>
        )}

        {/* القوائم المجمّعة حسب القسم */}
        {loadingItems ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-action-500" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm font-bold text-slate-400">
            لا إعلانات {tab === "active" ? "نشطة" : "مؤرشفة"} في هذه الجلسة
          </p>
        ) : (
          <div className="space-y-4">
            {grouped.map((section) => {
              const ids = section.items.map((i) => i.id);
              const allCatSel = ids.every((id) => selected.has(id));
              const isCollapsed = collapsed.has(section.key);
              return (
                <div
                  key={section.key}
                  className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800"
                >
                  {/* رأس القسم */}
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
                    <button
                      onClick={() => toggleCategory(section.items)}
                      title="تحديد القسم"
                      className="shrink-0"
                    >
                      {allCatSel ? (
                        <CheckSquare size={18} className="text-action-500" />
                      ) : (
                        <Square size={18} className="text-slate-400" />
                      )}
                    </button>
                    <button
                      onClick={() => toggleCollapse(section.key)}
                      className="flex flex-1 items-center gap-2 text-right"
                    >
                      <span className="text-base">{section.emoji}</span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                        {section.label}
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-900">
                        {section.items.length}
                      </span>
                      <ChevronDown
                        size={18}
                        className={[
                          "mr-auto text-slate-400 transition-transform",
                          isCollapsed ? "" : "rotate-180",
                        ].join(" ")}
                      />
                    </button>
                  </div>

                  {/* عناصر القسم */}
                  {!isCollapsed && (
                    <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                      {section.items.map((it) => (
                        <ItemRow
                          key={it.id}
                          item={it}
                          selected={selected.has(it.id)}
                          busy={busyId === it.id}
                          tab={tab}
                          onToggle={() => toggleItem(it.id)}
                          onAction={(a) => itemAction(it, a)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* ===================== صفّ الإعلان ===================== */
function ItemRow({
  item,
  selected,
  busy,
  tab,
  onToggle,
  onAction,
}: {
  item: FridayMarketItem;
  selected: boolean;
  busy: boolean;
  tab: "active" | "archived";
  onToggle: () => void;
  onAction: (
    a: "feature" | "unfeature" | "archive" | "restore" | "delete"
  ) => void;
}) {
  return (
    <div
      className={[
        "flex items-center gap-2.5 px-3 py-2.5 transition",
        selected ? "bg-action-50/60 dark:bg-action-500/5" : "",
      ].join(" ")}
    >
      <button onClick={onToggle} className="shrink-0" aria-label="تحديد">
        {selected ? (
          <CheckSquare size={18} className="text-action-500" />
        ) : (
          <Square size={18} className="text-slate-300" />
        )}
      </button>

      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
        {item.images?.[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.images[0]} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-slate-800 dark:text-slate-100">
          {item.featured && <Star size={11} className="inline text-amber-500" />}{" "}
          {item.title}
        </p>
        <p className="text-xs font-bold text-action-600">{formatPrice(item.price)}</p>
        <p className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
          <span className="inline-flex items-center gap-0.5">
            <Eye size={11} /> {formatNumber(item.views || 0)}
          </span>
          <span>· {item.ownerName}</span>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {busy ? (
          <Loader2 size={18} className="animate-spin text-action-500" />
        ) : (
          <>
            {tab === "active" && (
              <>
                <IconBtn
                  title={item.featured ? "إلغاء التمييز" : "تمييز"}
                  onClick={() => onAction(item.featured ? "unfeature" : "feature")}
                  active={!!item.featured}
                >
                  <Star size={15} />
                </IconBtn>
                <IconBtn title="أرشفة" onClick={() => onAction("archive")}>
                  <ArchiveIcon size={15} />
                </IconBtn>
              </>
            )}
            {tab === "archived" && (
              <IconBtn title="استعادة" onClick={() => onAction("restore")}>
                <RotateCcw size={15} />
              </IconBtn>
            )}
            <IconBtn title="حذف" danger onClick={() => onAction("delete")}>
              <Trash2 size={15} />
            </IconBtn>
          </>
        )}
      </div>
    </div>
  );
}

/* ===================== عناصر مساعدة ===================== */
const inputCls =
  "rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-action-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

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
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</p>
        {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
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
