"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/firebase";
import type { Listing } from "@/lib/types";
import { DynamicListingCard } from "@/components/cards/dynamic-listing-card";
import { resolveCategorySlug } from "@/lib/categories";

/**
 * ============================================================
 *  DynamicCategorySections — أقسام رئيسية ديناميكية لكل فئة
 * ============================================================
 *
 * يحوّل كل فئة فيها إعلان واحد أو أكثر إلى قسم مستقل "أحدث {الفئة}"
 * يظهر تلقائياً في الصفحة الرئيسية، بنفس بطاقة السيارات/الخدمات.
 *
 * المتطلبات المغطّاة:
 *  1. أي فئة فيها ≥1 إعلان تظهر تلقائياً.
 *  3. الفئة الفارغة (0) لا تظهر.
 *  4. كل قسم يعرض آخر 5 إعلانات فقط.
 *  5. زر "عرض الكل" → صفحة القسم.
 *  6. نفس البطاقة (DynamicListingCard).
 *  7. ترتيب الأقسام: الأكثر إعلانات أولاً ثم الأحدث نشراً.
 *  8/10. الأداء: استعلام واحد فقط (نقرأ نافذة من أحدث الإعلانات ونجمّعها
 *       client-side) بدل استعلام لكل فئة، + lazy-mount لبطاقات كل قسم
 *       عبر IntersectionObserver (لا تُرسَم/تُحمَّل صورها إلا عند الاقتراب).
 *  9. Skeleton أثناء التحميل.
 *
 * ملاحظة: نافذة الجلب (WINDOW) تغطّي أحدث الإعلانات. ما دام الإجمالي
 * ضمنها (وهو الغالب) فالعدّ دقيق 100%. لو تجاوز الإجمالي النافذة مستقبلاً
 * يبقى الترتيب تقريبياً صحيحاً (الأكثر نشاطاً أولاً) — يمكن رفع WINDOW.
 */

const WINDOW = 250; // أقصى عدد إعلانات نقرأها في الاستعلام الواحد
const PER_SECTION = 5;
const CACHE_KEY = "bratsho:dynamic-sections:v1";
const CACHE_TTL = 3 * 60 * 1000;

/** عناوين مخصّصة (احتياطي: "أحدث " + اسم الفئة). */
const TITLES: Record<string, string> = {
  "سيارات": "أحدث السيارات",
  "حافلات": "أحدث الحافلات",
  "شاحنات": "أحدث الشاحنات",
  "قطع غيار سيارات": "أحدث قطع غيار السيارات",
  "قطع غيار شاحنات": "أحدث قطع غيار الشاحنات",
  "قطع غيار كهربائية": "أحدث قطع الغيار الكهربائية",
  "قطع غيار مستعملة": "أحدث قطع الغيار المستعملة",
  "كماليات سيارات": "أحدث الكماليات",
  "زيوت ومواد مضافة": "أحدث الزيوت والمواد المضافة",
  "إطارات وجنوط": "أحدث الإطارات والجنوط",
  "ميكانيكي متنقل": "أحدث الميكانيكي المتنقل",
  "ساحبة سيارات": "أحدث الساحبات",
  "سمكرة وزواق": "أحدث السمكرة والزواق",
  "ورش ميكانيكا": "أحدث ورش الميكانيكا",
  "فني كهربائي سيارات": "أحدث فنيي كهرباء السيارات",
  "سيارات بها حوادث": "أحدث السيارات المتضررة",
  "خدمات وتقارير المركبات": "أحدث خدمات المركبات",
};

interface Group {
  name: string;
  items: Listing[];
  count: number;
  latest: number;
}

function toMs(v: any): number {
  return v?.toMillis?.() || 0;
}

export function DynamicCategorySections() {
  const [groups, setGroups] = useState<Group[] | null>(null);

  useEffect(() => {
    // كاش جلسة
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Date.now() - parsed.ts < CACHE_TTL) {
          setGroups(parsed.groups as Group[]);
          return;
        }
      }
    } catch {
      /* ignore */
    }

    let cancelled = false;
    void (async () => {
      try {
        // استعلام واحد: أحدث الإعلانات المعتمدة (فهرس createdAt الموجود).
        const snap = await getDocs(
          query(
            collection(db, "listings"),
            where("status", "==", "approved"),
            orderBy("createdAt", "desc"),
            limit(WINDOW)
          )
        );
        if (cancelled) return;

        const all: Listing[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));

        // تجميع حسب الفئة (الترتيب محفوظ = الأحدث أولاً).
        const map = new Map<string, Listing[]>();
        for (const l of all) {
          const cat = (l as any).category;
          if (!cat) continue;
          const arr = map.get(cat);
          if (arr) arr.push(l);
          else map.set(cat, [l]);
        }

        const grps: Group[] = Array.from(map.entries()).map(
          ([name, list]) => ({
            name,
            items: list.slice(0, PER_SECTION),
            count: list.length,
            latest: toMs((list[0] as any)?.createdAt),
          })
        );

        // ترتيب: الأكثر إعلانات أولاً، ثم الأحدث نشراً.
        grps.sort((a, b) => b.count - a.count || b.latest - a.latest);

        setGroups(grps);
        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ ts: Date.now(), groups: grps })
          );
        } catch {
          /* ignore */
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[dynamic-sections] fetch failed:", (err as any)?.code);
        if (!cancelled) setGroups([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Skeleton أثناء التحميل
  if (groups === null) {
    return (
      <>
        {[0, 1].map((s) => (
          <section key={s} className="py-4 sm:py-5">
            <div className="container">
              <div className="mb-3 h-6 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 no-scrollbar sm:px-6">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-56 w-[210px] shrink-0 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-700 sm:w-[230px]"
                />
              ))}
            </div>
          </section>
        ))}
      </>
    );
  }

  if (groups.length === 0) return null;

  return (
    <>
      {groups.map((g, idx) => (
        <CategorySection key={g.name} group={g} eager={idx === 0} />
      ))}
    </>
  );
}

/** قسم فئة واحد — يؤجّل رسم البطاقات حتى الاقتراب من الشاشة (Lazy). */
function CategorySection({ group, eager }: { group: Group; eager: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(eager);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  const title = TITLES[group.name] || `أحدث ${group.name}`;
  const slug = resolveCategorySlug(group.name);
  const seeAll =
    group.name === "ساحبة سيارات"
      ? "/tow-trucks"
      : `/listings?category=${slug || encodeURIComponent(group.name)}`;

  return (
    <section ref={ref} className="py-4 sm:py-5">
      <div className="container">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <h2 className="text-base font-black text-slate-900 dark:text-white sm:text-lg">
            {title}
          </h2>
          <Link
            href={seeAll}
            prefetch={false}
            className="inline-flex items-center gap-0.5 text-xs font-black text-brand-700 transition hover:text-brand-800 dark:text-brand-300"
          >
            عرض الكل
            <ChevronLeft size={14} />
          </Link>
        </div>
      </div>

      <div
        className="flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:px-6"
        style={{ scrollbarWidth: "none" }}
      >
        {visible
          ? group.items.map((it, idx) => (
              <DynamicListingCard
                key={it.id}
                listing={it}
                priority={eager && idx < 2}
              />
            ))
          : [0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-56 w-[210px] shrink-0 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-700 sm:w-[230px]"
              />
            ))}
      </div>
    </section>
  );
}

export default DynamicCategorySections;
