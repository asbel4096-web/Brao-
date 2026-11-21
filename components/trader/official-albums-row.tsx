"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { collection, doc, getDoc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/contexts/ToastContext";
import { toDisplayItem } from "@/lib/stories/helpers";
import type { StoryDisplayItem, StoryDocument } from "@/lib/stories/types";

const StoryViewer = dynamic(
  () => import("@/components/stories/story-viewer").then((m) => m.StoryViewer),
  { ssr: false }
);

/**
 * 2026-11-21: ألبومات القصص الدائمة للحساب الرسمي «براتشو الرسمي».
 *
 * users/bratsho_official/highlights/{id} = { title, storyIds, coverUrl, order } — تكتبها دوال الخادم
 * وحدها (مركز الحساب الرسمي في تطبيق الإدارة)، والقراءة عامة. القصة تختفي من الشريط بعد 24 ساعة
 * لكنها تبقى في ألبومها وتُعرض بعارض القصص نفسه. نفس حلقات «القصص» في رأس الصفحة — لا تصميم جديد.
 */
export const OFFICIAL_UID = "bratsho_official";

interface Album {
  id: string;
  title: string;
  storyIds: string[];
  coverUrl: string;
}

export function OfficialAlbumsRow({ ownerId }: { ownerId: string }) {
  const toast = useToast();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [opening, setOpening] = useState<string | null>(null);
  const [viewer, setViewer] = useState<StoryDisplayItem[] | null>(null);
  const enabled = ownerId === OFFICIAL_UID;

  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, "users", ownerId, "highlights"), orderBy("order"));
    return onSnapshot(
      q,
      (snap) =>
        setAlbums(
          snap.docs
            .map((d) => {
              const x = d.data();
              return {
                id: d.id,
                title: typeof x.title === "string" ? x.title : "",
                storyIds: Array.isArray(x.storyIds) ? x.storyIds.map(String) : [],
                coverUrl: typeof x.coverUrl === "string" ? x.coverUrl : "",
              };
            })
            .filter((a) => a.storyIds.length > 0)
        ),
      () => setAlbums([])
    );
  }, [enabled, ownerId]);

  if (!enabled || albums.length === 0) return null;

  const open = async (album: Album) => {
    if (opening) return;
    setOpening(album.id);
    try {
      const snaps = await Promise.all(album.storyIds.map((id) => getDoc(doc(db, "stories", id))));
      const items = snaps
        .filter((s) => s.exists())
        .map((s) => ({ ...(s.data() as Omit<StoryDocument, "id">), id: s.id }) as StoryDocument)
        .filter((s) => (s as { hidden?: boolean }).hidden !== true)
        .map(toDisplayItem)
        .filter((x): x is StoryDisplayItem => x !== null);
      if (items.length === 0) {
        toast.info("لا توجد قصص في هذا الألبوم");
        return;
      }
      setViewer(items);
    } catch {
      toast.error("تعذّر فتح الألبوم. حاول مجدداً.");
    } finally {
      setOpening(null);
    }
  };

  return (
    <>
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-end px-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            الألبومات
          </span>
        </div>
        <div className="-mx-4 sm:-mx-5">
          <div
            className="
              flex gap-3 overflow-x-auto px-4 pb-2 sm:px-5
              [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
              snap-x snap-mandatory
            "
          >
            {albums.map((album) => (
              <motion.button
                key={album.id}
                type="button"
                onClick={() => open(album)}
                whileTap={{ scale: 0.95 }}
                disabled={opening !== null}
                aria-label={album.title}
                className="flex shrink-0 snap-start flex-col items-center gap-1.5"
              >
                <div className="relative h-16 w-16 rounded-full bg-slate-200 p-[2.5px] dark:bg-slate-800">
                  <div className="relative h-full w-full overflow-hidden rounded-full bg-white ring-2 ring-white dark:bg-slate-900 dark:ring-slate-900">
                    {album.coverUrl ? (
                      <Image src={album.coverUrl} alt={album.title} fill className="object-cover" sizes="64px" />
                    ) : null}
                    {opening === album.id ? (
                      <div className="absolute inset-0 grid place-items-center bg-black/30">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      </div>
                    ) : null}
                  </div>
                </div>
                <span className="max-w-[68px] truncate text-[10px] font-black text-slate-700 dark:text-slate-300">
                  {album.title}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {viewer ? <StoryViewer stories={viewer} onClose={() => setViewer(null)} /> : null}
    </>
  );
}
