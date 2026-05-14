"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import {
  ArrowRight,
  Camera,
  Mic,
  MessageCircle,
  Paperclip,
  Phone,
  Send,
  X,
} from "lucide-react";
import { auth, db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { createNotification } from "@/lib/notifications";
import { formatDateTime, normalizeLibyanPhone } from "@/lib/utils";
import type { ChatMessage, ChatMessageKind, ChatThread } from "@/lib/types";
import { ChatTipsBanner } from "@/components/chat/chat-tips-banner";
import { AudioRecorder } from "@/components/chat/audio-recorder";
import { ChatMessageBubble } from "@/components/chat/chat-message-bubble";
import { cn } from "@/lib/utils";

const QUICK_REPLIES = ["السلام عليكم", "مرحبا", "هلا"];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_AUDIO_BYTES = 8 * 1024 * 1024; // 8 MB

export default function ChatRoomPage() {
  const params = useParams<{ chatId: string }>();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const toast = useToast();

  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* ----------------------------------------------------------
   * تحميل المحادثة + الرسائل
   * ---------------------------------------------------------- */
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?redirect=/messages");
      return;
    }
    let unsubMessages: (() => void) | null = null;
    let unsubThread: (() => void) | null = null;

    const init = async () => {
      try {
        const chatRef = doc(db, "chats", params.chatId);
        const snap = await getDoc(chatRef);
        if (!snap.exists()) {
          setError("المحادثة غير موجودة.");
          setLoading(false);
          return;
        }
        const data = { id: snap.id, ...(snap.data() as any) } as ChatThread;
        if (!data.participants.includes(user.uid)) {
          setError("ليس لديك صلاحية فتح هذه المحادثة.");
          setLoading(false);
          return;
        }
        setThread(data);

        try {
          await updateDoc(chatRef, { [`unreadCount.${user.uid}`]: 0 });
        } catch {/* غير حرج */}

        unsubThread = onSnapshot(chatRef, (s) => {
          if (s.exists()) setThread({ id: s.id, ...(s.data() as any) });
        });

        const q = query(
          collection(db, "chats", params.chatId, "messages"),
          orderBy("createdAt", "asc")
        );
        unsubMessages = onSnapshot(q, (qs) => {
          const arr: ChatMessage[] = qs.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }));
          setMessages(arr);
          setLoading(false);
          requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({
              top: scrollRef.current.scrollHeight,
              behavior: "smooth",
            });
          });
        });
      } catch (err: any) {
        setError(err?.message || "تعذّر فتح المحادثة.");
        setLoading(false);
      }
    };

    void init();
    return () => {
      unsubMessages?.();
      unsubThread?.();
    };
  }, [user, authLoading, params.chatId, router]);

  /* ----------------------------------------------------------
   * Helper موحَّد لإنشاء رسالة
   * ---------------------------------------------------------- */
  const writeMessage = async (
    payload: Partial<ChatMessage> & {
      kind: ChatMessageKind;
      lastPreview: string;
    }
  ) => {
    if (!user || !thread) return;

    const liveUser = auth.currentUser;
    if (!liveUser || liveUser.uid !== user.uid) {
      toast.error("انتهت جلستك. يُرجى تسجيل الدخول من جديد.");
      return;
    }

    const otherUid = thread.participants.find((p) => p !== user.uid) || "";
    const senderName =
      profile?.name ||
      user.displayName ||
      user.email ||
      user.phoneNumber ||
      "مستخدم";

    const docPayload: any = {
      kind: payload.kind,
      text: payload.text || "",
      senderId: user.uid,
      senderName,
      createdAt: serverTimestamp(),
      read: false,
    };

    if (payload.imageUrl) {
      docPayload.imageUrl = payload.imageUrl;
      docPayload.imageWidth = payload.imageWidth ?? null;
      docPayload.imageHeight = payload.imageHeight ?? null;
    }
    if (payload.audioUrl) {
      docPayload.audioUrl = payload.audioUrl;
      docPayload.audioDurationSec = payload.audioDurationSec ?? null;
    }

    await addDoc(
      collection(db, "chats", params.chatId, "messages"),
      docPayload
    );

    await updateDoc(doc(db, "chats", params.chatId), {
      lastMessage: payload.lastPreview,
      lastMessageAt: serverTimestamp(),
      lastSenderId: user.uid,
      [`unreadCount.${otherUid}`]: increment(1),
    });

    await createNotification({
      userId: otherUid,
      type: "new_message",
      title: "رسالة جديدة",
      body: `${senderName}: ${payload.lastPreview.slice(0, 80)}`,
      link: `/messages/${params.chatId}`,
      meta: { chatId: params.chatId, listingId: thread.listingId },
    });
  };

  /* ----------------------------------------------------------
   * إرسال نص
   * ---------------------------------------------------------- */
  const handleSendText = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!user || !thread) return;
    const content = text.trim();
    if (!content || sending) return;

    setSending(true);
    try {
      await writeMessage({
        kind: "text",
        text: content,
        lastPreview: content,
      });
      setText("");
    } catch (err: any) {
      toast.error(err?.message || "تعذّر إرسال الرسالة.");
    } finally {
      setSending(false);
    }
  };

  const handleQuickReply = async (reply: string) => {
    if (sending) return;
    setSending(true);
    try {
      await writeMessage({ kind: "text", text: reply, lastPreview: reply });
    } catch (err: any) {
      toast.error(err?.message || "تعذّر إرسال الرسالة.");
    } finally {
      setSending(false);
    }
  };

  /* ----------------------------------------------------------
   * إرسال صورة
   * ---------------------------------------------------------- */
  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = ""; // reset
    if (!file) return;
    if (!user || !thread) return;

    if (!file.type.startsWith("image/")) {
      toast.error("الرجاء اختيار صورة.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("حجم الصورة يجب أن يكون أقل من 5 ميجابايت.");
      return;
    }

    const liveUser = auth.currentUser;
    if (!liveUser || liveUser.uid !== user.uid) {
      toast.error("انتهت جلستك. يُرجى تسجيل الدخول من جديد.");
      return;
    }

    setSending(true);

    try {
      // قراءة أبعاد الصورة قبل الرفع
      const dims = await readImageDims(file);

      const safeName = file.name.replace(/\s+/g, "-").toLowerCase();
      const path = `chat-media/${params.chatId}/${user.uid}/images/${Date.now()}-${safeName}`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, file, { contentType: file.type });
      const url = await getDownloadURL(ref);

      await writeMessage({
        kind: "image",
        text: "",
        imageUrl: url,
        imageWidth: dims?.width,
        imageHeight: dims?.height,
        lastPreview: "📷 صورة",
      });
    } catch (err: any) {
      const msg =
        err?.code === "storage/unauthorized"
          ? "صلاحية الرفع مرفوضة. تأكد من قواعد Storage."
          : err?.message || "تعذّر إرسال الصورة.";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  /* ----------------------------------------------------------
   * إرسال صوت
   * ---------------------------------------------------------- */
  const handleAudioSubmit = async (recording: {
    blob: Blob;
    durationSec: number;
    mimeType: string;
  }) => {
    if (!user || !thread) return;

    if (recording.blob.size > MAX_AUDIO_BYTES) {
      toast.error("حجم الصوت يجب أن يكون أقل من 8 ميجابايت.");
      setRecording(false);
      return;
    }

    const liveUser = auth.currentUser;
    if (!liveUser || liveUser.uid !== user.uid) {
      toast.error("انتهت جلستك. يُرجى تسجيل الدخول من جديد.");
      setRecording(false);
      return;
    }

    setSending(true);
    try {
      const ext = recording.mimeType.includes("webm")
        ? "webm"
        : recording.mimeType.includes("mp4")
        ? "m4a"
        : recording.mimeType.includes("ogg")
        ? "ogg"
        : "audio";
      const path = `chat-media/${params.chatId}/${user.uid}/audio/${Date.now()}.${ext}`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, recording.blob, { contentType: recording.mimeType });
      const url = await getDownloadURL(ref);

      const seconds = Math.round(recording.durationSec);
      const min = Math.floor(seconds / 60);
      const sec = seconds % 60;
      const formatted = `${min}:${sec.toString().padStart(2, "0")}`;

      await writeMessage({
        kind: "audio",
        text: "",
        audioUrl: url,
        audioDurationSec: seconds,
        lastPreview: `🎤 رسالة صوتية (${formatted})`,
      });

      setRecording(false);
    } catch (err: any) {
      const msg =
        err?.code === "storage/unauthorized"
          ? "صلاحية الرفع مرفوضة. تأكد من قواعد Storage."
          : err?.message || "تعذّر إرسال التسجيل.";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  /* ----------------------------------------------------------
   * Render
   * ---------------------------------------------------------- */
  if (authLoading || loading) {
    return (
      <section className="container py-10">
        <div className="card mx-auto max-w-md p-8 text-center text-slate-500">
          جارٍ التحميل...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="container py-10">
        <div className="card mx-auto max-w-md p-8 text-center">
          <p className="font-bold text-rose-700">{error}</p>
          <Link href="/messages" className="btn-secondary mt-4">
            العودة للمحادثات
          </Link>
        </div>
      </section>
    );
  }

  if (!thread || !user) return null;

  const otherUid = thread.participants.find((p) => p !== user.uid) || "";
  const other = thread.participantsInfo?.[otherUid];
  const groupedMessages = groupMessagesByDay(messages);
  // phone قد لا يكون موجوداً في participantsInfo حسب نوع ChatThread.
  // نقرؤه بطريقة آمنة في حال أضافه كود إنشاء المحادثة في المستقبل.
  const otherPhone = (other as { phone?: string } | undefined)?.phone;

  return (
    <section className="container py-2 sm:py-4">
      <div className="mx-auto flex max-w-3xl flex-col h-[calc(100dvh-120px)] sm:h-[calc(100dvh-140px)]">
        {/* ================ Header ================ */}
        <div className="flex items-center gap-3 rounded-3xl rounded-b-none border border-b-0 border-slate-200/80 bg-white p-3 shadow-card dark:border-slate-700/80 dark:bg-slate-900 sm:p-4">
          <Link
            href="/messages"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label="رجوع"
          >
            <ArrowRight size={20} />
          </Link>

          <div className="min-w-0 flex-1">
            <Link
              href={`/traders/${otherUid}`}
              className="flex items-center justify-end gap-2"
            >
              <span className="truncate text-sm font-black text-slate-900 dark:text-white sm:text-base">
                {other?.name || "مستخدم"}
              </span>
              {other?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={other.photoURL}
                  alt={other.name}
                  referrerPolicy="no-referrer"
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-brand-100 dark:ring-brand-900/40"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-700 to-brand-500 text-xs font-black text-white">
                  {(other?.name || "م").charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
          </div>

          {otherPhone && (
            <a
              href={`tel:${otherPhone}`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="اتصال"
            >
              <Phone size={18} />
            </a>
          )}
        </div>

        {/* ================ Listing summary chip ================ */}
        {thread.listingTitle && (
          <Link
            href={`/listings/${thread.listingId}`}
            className="
              flex items-center gap-3 border-x border-slate-200/80 bg-white px-4 py-2.5
              text-xs transition hover:bg-slate-50
              dark:border-slate-700/80 dark:bg-slate-900 dark:hover:bg-slate-800
            "
          >
            {thread.listingImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thread.listingImage}
                alt={thread.listingTitle}
                className="h-9 w-12 shrink-0 rounded-lg object-cover"
              />
            )}
            <span className="truncate font-bold text-slate-700 dark:text-slate-200">
              {thread.listingTitle}
            </span>
          </Link>
        )}

        {/* ================ Messages area ================ */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto border-x border-slate-200/80 bg-slate-50 px-3 pt-2 pb-3 dark:border-slate-700/80 dark:bg-slate-950 sm:px-4"
        >
          {/* بانر النصائح - يظهر دائماً في أعلى المحادثة */}
          <ChatTipsBanner />

          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                <MessageCircle size={32} />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                ابدأ المحادثة بإرسال أول رسالة...
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {groupedMessages.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1.5">
                  <div className="my-3 flex items-center justify-center">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                      {group.label}
                    </span>
                  </div>

                  {group.items.map((m, idx) => {
                    const mine = m.senderId === user.uid;
                    const prev = group.items[idx - 1];
                    const isFirstOfRun = !prev || prev.senderId !== m.senderId;
                    return (
                      <ChatMessageBubble
                        key={m.id}
                        message={m}
                        mine={mine}
                        isFirstOfRun={isFirstOfRun}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ================ Quick replies ================ */}
        {messages.length === 0 && !recording && (
          <div className="flex justify-center gap-2 border-x border-slate-200/80 bg-white px-3 py-2 dark:border-slate-700/80 dark:bg-slate-900">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void handleQuickReply(q)}
                disabled={sending}
                className="
                  rounded-full border-2 border-brand-200 bg-white px-4 py-1.5
                  text-xs font-black text-brand-700 transition
                  hover:bg-brand-50 active:scale-95
                  disabled:opacity-50
                  dark:border-brand-700 dark:bg-slate-900 dark:text-brand-300
                  dark:hover:bg-brand-950/40
                "
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* ================ Composer ================ */}
        <div className="rounded-3xl rounded-t-none border border-t-0 border-slate-200/80 bg-white p-2.5 shadow-card dark:border-slate-700/80 dark:bg-slate-900">
          {recording ? (
            <AudioRecorder
              onSubmit={handleAudioSubmit}
              onCancel={() => setRecording(false)}
            />
          ) : (
            <form
              onSubmit={handleSendText}
              className="flex items-center gap-2"
            >
              {/* مرفقات (صورة) */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 active:scale-95 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="إرفاق صورة"
              >
                <Paperclip size={18} />
              </button>

              {/* حقل النص */}
              <div className="flex flex-1 items-center rounded-full bg-slate-100 px-4 py-1 dark:bg-slate-800">
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendText();
                    }
                  }}
                  placeholder="أرسل رسالة جديدة"
                  className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-slate-400 dark:text-white"
                  disabled={sending}
                />

                {/* زر صورة سريع داخل الحقل */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                  className="ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-brand-700 transition hover:bg-brand-100 active:scale-95 disabled:opacity-60 dark:text-brand-300 dark:hover:bg-brand-900/40"
                  aria-label="إرسال صورة"
                >
                  <Camera size={18} />
                </button>
              </div>

              {/* إذا كان النص فارغ → زر مايك. إذا في نص → زر إرسال */}
              {text.trim() ? (
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white shadow-blue transition active:scale-95 hover:bg-brand-600 disabled:opacity-60"
                  aria-label="إرسال"
                >
                  <Send size={18} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setRecording(true)}
                  disabled={sending}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white shadow-blue transition active:scale-95 hover:bg-brand-600 disabled:opacity-60"
                  aria-label="تسجيل صوتي"
                >
                  <Mic size={18} />
                </button>
              )}
            </form>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            className="sr-only"
          />
        </div>
      </div>
    </section>
  );
}

/* ============================================================
 * Helpers
 * ============================================================ */

function readImageDims(
  file: File
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function groupMessagesByDay(messages: ChatMessage[]) {
  const groups: { label: string; items: ChatMessage[] }[] = [];
  let lastKey = "";

  for (const m of messages) {
    const date = m.createdAt?.toDate?.();
    let key: string;
    let label: string;
    if (!date) {
      key = "now";
      label = "الآن";
    } else {
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();

      if (isToday) {
        key = "today";
        label = "اليوم";
      } else if (isYesterday) {
        key = "yesterday";
        label = "أمس";
      } else {
        key = date.toDateString();
        label = formatDateTime(m.createdAt as any).split("،")[0] || key;
      }
    }

    if (key !== lastKey) {
      groups.push({ label, items: [m] });
      lastKey = key;
    } else {
      groups[groups.length - 1].items.push(m);
    }
  }

  return groups;
}
