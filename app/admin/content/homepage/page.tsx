"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Home,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Upload,
  X,
  Save,
  ListChecks,
  Image as ImageIcon,
  Layers,
} from "lucide-react";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { Timestamp } from "firebase/firestore";
import { storage } from "@/lib/firebase";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import {
  useBanners,
  useHomepageConfig,
} from "@/hooks/admin/use-homepage-config";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";
import {
  HOMEPAGE_SECTIONS,
  type HomepageSection,
  type HomepageBanner,
} from "@/lib/cms/types";

/**
 * محرّر الصفحة الرئيسية:
 *  - بنرات (إضافة/حذف/تفعيل/ترتيب)
 *  - أقسام الصفحة (ترتيب + تفعيل/إخفاء)
 *  - إعلانات مميَّزة مختارة يدوياً (إضافة ID + إعادة ترتيب)
 *
 * كل قسم في tab/section منفصل لتجنّب الصفحة الطويلة جداً.
 */

const TABS = [
  { key: "banners", label: "البنرات", icon: ImageIcon },
  { key: "sections", label: "ترتيب الأقسام", icon: Layers },
  { key: "featured", label: "إعلانات مميَّزة", icon: ListChecks },
] as const;

type Tab = (typeof TABS)[number]["key"];

export default function HomepageEditorPage() {
  const { can } = useAdminRole();
  const [tab, setTab] = useState<Tab>("banners");

  if (!can("homepage.edit")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        لا تملك صلاحية تعديل الصفحة الرئيسية.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-action-50 text-action-700 dark:bg-action-900/30 dark:text-action-300">
          <Home size={20} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
            الصفحة الرئيسية
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            تحكّم في البنرات والأقسام والإعلانات المميَّزة.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-black transition ${
                active
                  ? "bg-action-500 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-action-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              <Icon size={12} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "banners" && <BannersTab />}
      {tab === "sections" && <SectionsTab />}
      {tab === "featured" && <FeaturedTab />}
    </div>
  );
}

// ============================================================
// Banners Tab
// ============================================================
function BannersTab() {
  const { banners, loading, addBanner, updateBanner, deleteBanner } = useBanners();
  const toast = useToast();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState<{
    title: string;
    subtitle: string;
    link: string;
    startDate: string;
    endDate: string;
    file: File | null;
    preview: string;
  }>({
    title: "",
    subtitle: "",
    link: "",
    startDate: "",
    endDate: "",
    file: null,
    preview: "",
  });

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.warning("الصورة كبيرة جداً (الحد 3MB)");
      return;
    }
    setDraft((d) => ({
      ...d,
      file,
      preview: URL.createObjectURL(file),
    }));
  };

  const handleAdd = async () => {
    if (!draft.file) {
      toast.warning("اختاري صورة للبنر");
      return;
    }
    setUploading(true);
    try {
      // رفع الصورة لـStorage
      const fileExt = draft.file.name.split(".").pop() || "jpg";
      const bannerId = `banner_${Date.now()}`;
      const path = `homepage/banners/${bannerId}.${fileExt}`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, draft.file);
      const imageUrl = await getDownloadURL(fileRef);

      // إضافة الـdoc
      await addBanner({
        imageUrl,
        title: draft.title.trim() || undefined,
        subtitle: draft.subtitle.trim() || undefined,
        link: draft.link.trim() || undefined,
        order: banners.length + 1,
        active: true,
        ...(draft.startDate
          ? { startDate: Timestamp.fromDate(new Date(draft.startDate)) }
          : {}),
        ...(draft.endDate
          ? { endDate: Timestamp.fromDate(new Date(draft.endDate)) }
          : {}),
      });

      toast.success("تمت إضافة البنر");
      setDraft({
        title: "",
        subtitle: "",
        link: "",
        startDate: "",
        endDate: "",
        file: null,
        preview: "",
      });
      setAdding(false);
    } catch (err: any) {
      toast.error(err?.message || "فشلت الإضافة");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (b: HomepageBanner) => {
    const ok = await confirm({
      title: "حذف البنر؟",
      message: "سيُحذف نهائياً من الصفحة الرئيسية والـStorage.",
      confirmLabel: "حذف",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteBanner(b.id, b.imageUrl);
      toast.success("تم الحذف");
    } catch (err: any) {
      toast.error(err?.message || "فشل الحذف");
    }
  };

  const move = async (b: HomepageBanner, direction: 1 | -1) => {
    const idx = banners.findIndex((x) => x.id === b.id);
    const neighbor = banners[idx + direction];
    if (!neighbor) return;
    try {
      await updateBanner(b.id, { order: neighbor.order });
      await updateBanner(neighbor.id, { order: b.order });
    } catch (err: any) {
      toast.error(err?.message || "فشل التحديث");
    }
  };

  const toggleActive = async (b: HomepageBanner) => {
    try {
      await updateBanner(b.id, { active: !b.active });
    } catch (err: any) {
      toast.error(err?.message || "فشل التحديث");
    }
  };

  return (
    <div className="space-y-3">
      {/* Add new */}
      {!adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-sm font-black text-slate-600 transition hover:border-action-400 hover:text-action-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <Plus size={16} />
          إضافة بنر جديد
        </button>
      ) : (
        <div className="rounded-2xl border border-action-200 bg-action-50/30 p-4 dark:border-action-900/40 dark:bg-action-900/10">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              بنر جديد
            </h3>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setDraft({
                  title: "",
                  subtitle: "",
                  link: "",
                  startDate: "",
                  endDate: "",
                  file: null,
                  preview: "",
                });
              }}
              className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={14} />
            </button>
          </div>

          {/* Image upload */}
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-sm font-bold text-slate-600 transition hover:border-action-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {draft.preview ? (
              <Image
                src={draft.preview}
                alt="preview"
                width={400}
                height={150}
                className="rounded-xl object-contain"
                unoptimized
              />
            ) : (
              <>
                <Upload size={16} />
                <span>اختر صورة (حتى 3MB)</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
          </label>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="العنوان (اختياري)"
              maxLength={60}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-action-400 dark:border-slate-700 dark:bg-slate-900"
            />
            <input
              type="text"
              value={draft.subtitle}
              onChange={(e) => setDraft((d) => ({ ...d, subtitle: e.target.value }))}
              placeholder="نص فرعي (اختياري)"
              maxLength={100}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-action-400 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <input
            type="text"
            value={draft.link}
            onChange={(e) => setDraft((d) => ({ ...d, link: e.target.value }))}
            placeholder="رابط عند الضغط (اختياري) - مثلاً /listings"
            dir="ltr"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-action-400 dark:border-slate-700 dark:bg-slate-900"
          />

          {/* تواريخ العرض - إخفاء البانر تلقائياً بعد الانتهاء */}
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                تاريخ البدء (اختياري)
              </span>
              <input
                type="date"
                value={draft.startDate}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, startDate: e.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-action-400 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                تاريخ الانتهاء (اختياري)
              </span>
              <input
                type="date"
                value={draft.endDate}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, endDate: e.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-action-400 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleAdd}
              disabled={uploading || !draft.file}
              className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-action-500 px-4 text-xs font-black text-white shadow-sm transition hover:bg-action-600 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  جارٍ الرفع...
                </>
              ) : (
                <>
                  <Save size={12} />
                  إضافة
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Banners list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          لا توجد بنرات بعد
        </p>
      ) : (
        <div className="space-y-2">
          {banners.map((b, idx) => (
            <article
              key={b.id}
              className={`flex items-center gap-3 rounded-2xl border bg-white p-3 dark:bg-slate-900 ${
                b.active
                  ? "border-slate-200 dark:border-slate-800"
                  : "border-slate-200 opacity-60 dark:border-slate-800"
              }`}
            >
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                <Image
                  src={b.imageUrl}
                  alt={b.title || ""}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                {b.title && (
                  <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                    {b.title}
                  </p>
                )}
                {b.subtitle && (
                  <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {b.subtitle}
                  </p>
                )}
                {b.link && (
                  <p className="mt-0.5 truncate font-mono text-[10px] text-brand-700 dark:text-brand-300" dir="ltr">
                    {b.link}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => move(b, -1)}
                  disabled={idx === 0}
                  aria-label="رفع"
                  className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => move(b, 1)}
                  disabled={idx === banners.length - 1}
                  aria-label="نزول"
                  className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                >
                  <ArrowDown size={12} />
                </button>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleActive(b)}
                  aria-label={b.active ? "إخفاء" : "إظهار"}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {b.active ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(b)}
                  aria-label="حذف"
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sections Tab
// ============================================================
function SectionsTab() {
  const { config, save, saving } = useHomepageConfig();
  const toast = useToast();

  const move = async (key: HomepageSection, direction: 1 | -1) => {
    const order = [...config.sectionsOrder];
    const idx = order.indexOf(key);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= order.length) return;
    [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
    try {
      await save({ sectionsOrder: order });
    } catch (err: any) {
      toast.error(err?.message || "فشل التحديث");
    }
  };

  const toggle = async (key: HomepageSection) => {
    const enabled = config.enabledSections.includes(key);
    const next = enabled
      ? config.enabledSections.filter((s) => s !== key)
      : [...config.enabledSections, key];
    try {
      await save({ enabledSections: next });
    } catch (err: any) {
      toast.error(err?.message || "فشل التحديث");
    }
  };

  return (
    <div className="space-y-2">
      <p className="px-1 text-[11px] text-slate-500 dark:text-slate-400">
        رتّبي الأقسام بالأسهم. يمكن إخفاء قسم دون حذفه.
      </p>
      {config.sectionsOrder.map((key, idx) => {
        const meta = HOMEPAGE_SECTIONS.find((s) => s.key === key);
        const enabled = config.enabledSections.includes(key);
        return (
          <div
            key={key}
            className={`flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 ${
              !enabled ? "opacity-60" : ""
            }`}
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-[11px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {idx + 1}
            </span>
            <p className="flex-1 text-sm font-black text-slate-900 dark:text-white">
              {meta?.label || key}
            </p>
            <button
              type="button"
              onClick={() => toggle(key)}
              disabled={saving}
              aria-label={enabled ? "إخفاء" : "إظهار"}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
            >
              {enabled ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => move(key, -1)}
                disabled={idx === 0 || saving}
                className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
              >
                <ArrowUp size={12} />
              </button>
              <button
                type="button"
                onClick={() => move(key, 1)}
                disabled={idx === config.sectionsOrder.length - 1 || saving}
                className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
              >
                <ArrowDown size={12} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Featured Listings Tab
// ============================================================
function FeaturedTab() {
  const { config, save, saving } = useHomepageConfig();
  const toast = useToast();
  const [newId, setNewId] = useState("");

  const addId = async () => {
    const id = newId.trim();
    if (!id) return;
    if (config.featuredListings.includes(id)) {
      toast.warning("هذا الإعلان موجود في القائمة");
      return;
    }
    try {
      await save({ featuredListings: [...config.featuredListings, id] });
      setNewId("");
    } catch (err: any) {
      toast.error(err?.message || "فشل الحفظ");
    }
  };

  const removeId = async (id: string) => {
    try {
      await save({
        featuredListings: config.featuredListings.filter((x) => x !== id),
      });
    } catch (err: any) {
      toast.error(err?.message || "فشل الحفظ");
    }
  };

  const move = async (id: string, direction: 1 | -1) => {
    const arr = [...config.featuredListings];
    const idx = arr.indexOf(id);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    try {
      await save({ featuredListings: arr });
    } catch (err: any) {
      toast.error(err?.message || "فشل الحفظ");
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-black text-slate-700 dark:text-slate-300">
          أضيفي إعلاناً
        </p>
        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
          انسخي الـID من رابط الإعلان (مثلاً <span className="font-mono" dir="ltr">/listings/abc123</span> → الـID هو <span className="font-mono">abc123</span>)
        </p>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !saving && addId()}
            placeholder="معرّف الإعلان"
            dir="ltr"
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-action-400 dark:border-slate-700 dark:bg-slate-900"
          />
          <button
            type="button"
            onClick={addId}
            disabled={saving || !newId.trim()}
            className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-action-500 px-4 text-xs font-black text-white shadow-sm transition hover:bg-action-600 disabled:opacity-50"
          >
            <Plus size={14} />
            إضافة
          </button>
        </div>
      </div>

      {config.featuredListings.length === 0 ? (
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          لا توجد إعلانات مميَّزة بعد
        </p>
      ) : (
        <div className="space-y-2">
          {config.featuredListings.map((id, idx) => (
            <div
              key={id}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-action-100 text-[11px] font-black text-action-700 dark:bg-action-900/30 dark:text-action-300">
                {idx + 1}
              </span>
              <Link
                href={`/listings/${id}`}
                target="_blank"
                rel="noopener"
                className="flex-1 truncate font-mono text-sm font-bold text-brand-700 hover:underline dark:text-brand-300"
                dir="ltr"
              >
                {id}
              </Link>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => move(id, -1)}
                  disabled={idx === 0 || saving}
                  className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => move(id, 1)}
                  disabled={idx === config.featuredListings.length - 1 || saving}
                  className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                >
                  <ArrowDown size={12} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeId(id)}
                disabled={saving}
                aria-label="حذف"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
