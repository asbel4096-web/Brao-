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
  deleteField,
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
  CornerDownLeft,
  ExternalLink,
  Heart,
  Image as ImageIcon,
  Mic,
  MessageCircle,
  Phone,
  Send,
  Star,
  Video as VideoIcon,
  X,
} from "lucide-react";
import { auth, db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { createNotification } from "@/lib/notifications";
import { formatDateTime, normalizeLibyanPhone } from "@/lib/utils";
import type {
  ChatMessage,
  ChatMessageKind,
  ChatReplyRef,
  ChatThread,
  UserProfile,
} from "@/lib/types";
import { onlineShortLabel } from "@/lib/online";
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
  const [otherTyping, setOtherTyping] = useState(false);
  const typingWriteRef = useRef(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  // الرسالة التي يجري الرد عليها — تظهر معاينة فوق حقل الكتابة.
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  // الرسالة المختارة لفتح قائمة Reply/React (long-press).
  const [actionSheetMsg, setActionSheetMsg] = useState<ChatMessage | null>(null);
  // الملف الشخصي للطرف الآخر (للحصول على حالة "متصل الآن").
  const [otherProfile, setOtherProfile] = useState<UserProfile | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

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
          await updateDoc(chatRef, {
            [`unreadCount.${user.uid}`]: 0,
            [`lastReadAt.${user.uid}`]: serverTimestamp(),
          });
        } catch {/* غير حرج */}

        unsubThread = onSnapshot(
          chatRef,
          (s) => {
            if (s.exists()) setThread({ id: s.id, ...(s.data() as any) });
          },
          (err) => {
            // eslint-disable-next-line no-console
            console.warn("[chat] thread listener:", (err as any)?.code);
          }
        );

        const q = query(
          collection(db, "chats", params.chatId, "messages"),
          orderBy("createdAt", "asc")
        );
        unsubMessages = onSnapshot(
          q,
          (qs) => {
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
          },
          (err) => {
            // بدون هذا المعالج كانت الصفحة تبقى عالقة على "جارٍ التحميل"
            // إلى الأبد عند أي خطأ قراءة (صلاحيات/شبكة) = "لا تفتح المحادثة".
            // eslint-disable-next-line no-console
            console.error("[chat] messages listener:", (err as any)?.code);
            setError(
              (err as any)?.code === "permission-denied"
                ? "تعذّر تحميل الرسائل (صلاحيات). تأكّد من نشر قواعد Firestore."
                : "تعذّر تحميل الرسائل. تحقّق من اتصالك وحاول مجدداً."
            );
            setLoading(false);
          }
        );
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
   * اشتراك مباشر بملف الطرف الآخر (لعرض حالة "متصل الآن"
   * أو "آخر ظهور منذ ..." في الهيدر).
   * ---------------------------------------------------------- */
  useEffect(() => {
    if (!thread || !user) return;
    const otherUid = thread.participants.find((p) => p !== user.uid);
    if (!otherUid) return;
    const unsub = onSnapshot(
      doc(db, "users", otherUid),
      (snap) => {
        if (snap.exists()) {
          setOtherProfile({ uid: snap.id, ...(snap.data() as any) });
        }
      },
      () => {
        /* تجاهل خطأ القراءة - الهيدر يكتفي بـ participantsInfo */
      }
    );
    return () => unsub();
  }, [thread, user]);

  /* ----------------------------------------------------------
   * مؤشّر "يكتب الآن": نراقب typingAt للطرف الآخر في وثيقة المحادثة.
   * نعدّه فعّالاً إذا كان خلال آخر 6 ثوانٍ، ونُخفيه تلقائياً بعدها.
   * ---------------------------------------------------------- */
  useEffect(() => {
    if (!thread || !user) {
      setOtherTyping(false);
      return;
    }
    const otherUid = thread.participants.find((p) => p !== user.uid);
    if (!otherUid) return;
    const ms = (thread as any).typingAt?.[otherUid]?.toMillis?.() || 0;
    const fresh = ms > 0 && Date.now() - ms < 6000;
    setOtherTyping(fresh);
    if (fresh) {
      const t = setTimeout(() => setOtherTyping(false), 6000 - (Date.now() - ms));
      return () => clearTimeout(t);
    }
  }, [thread, user]);

  /* ----------------------------------------------------------
   * تحديث "آخر قراءة" عند وصول رسائل جديدة من الطرف الآخر والمحادثة
   * مفتوحة → يرى المُرسِل إيصال ✓✓ مباشرةً.
   * ---------------------------------------------------------- */
  useEffect(() => {
    if (!user || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.senderId === user.uid) return; // آخر رسالة منّي، لا حاجة
    updateDoc(doc(db, "chats", params.chatId), {
      [`lastReadAt.${user.uid}`]: serverTimestamp(),
    }).catch(() => {});
  }, [messages, user, params.chatId]);

  // مؤشّر الكتابة: كتابة/مسح typingAt الخاص بي (مع throttle).
  const pingTyping = () => {
    if (!user) return;
    const now = Date.now();
    if (now - typingWriteRef.current < 2500) return;
    typingWriteRef.current = now;
    updateDoc(doc(db, "chats", params.chatId), {
      [`typingAt.${user.uid}`]: serverTimestamp(),
    }).catch(() => {});
  };
  const stopTyping = () => {
    if (!user) return;
    typingWriteRef.current = 0;
    updateDoc(doc(db, "chats", params.chatId), {
      [`typingAt.${user.uid}`]: null,
    }).catch(() => {});
  };

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
    if (payload.videoUrl) {
      docPayload.videoUrl = payload.videoUrl;
      docPayload.videoDurationSec = payload.videoDurationSec ?? null;
    }
    if (payload.replyTo) {
      docPayload.replyTo = payload.replyTo;
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
   * بناء كائن replyTo من الرسالة الهدف الحالية
   * ---------------------------------------------------------- */
  const buildReplyTo = (): ChatReplyRef | undefined => {
    if (!replyTarget) return undefined;
    const kind = replyTarget.kind || "text";
    let textPreview = "";
    if (kind === "text") {
      textPreview = (replyTarget.text || "").slice(0, 80);
    } else if (kind === "image") {
      textPreview = replyTarget.text?.slice(0, 80) || "📷 صورة";
    } else if (kind === "video") {
      textPreview = replyTarget.text?.slice(0, 80) || "🎬 فيديو";
    } else if (kind === "audio") {
      textPreview = "🎙️ مقطع صوتي";
    }
    return {
      messageId: replyTarget.id,
      kind,
      textPreview,
      imageUrl: replyTarget.imageUrl,
      senderName: replyTarget.senderName,
    };
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
        replyTo: buildReplyTo(),
      });
      setText("");
      setReplyTarget(null);
      stopTyping();
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
        replyTo: buildReplyTo(),
      });
      setReplyTarget(null);
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
        replyTo: buildReplyTo(),
      });
      setReplyTarget(null);

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
   * إرسال فيديو
   * ---------------------------------------------------------- */
  const handleVideoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user || !thread) return;

    if (!file.type.startsWith("video/")) {
      toast.error("الرجاء اختيار ملف فيديو.");
      return;
    }
    const MAX_VIDEO = 25 * 1024 * 1024;
    if (file.size > MAX_VIDEO) {
      toast.error("حجم الفيديو يتجاوز 25 ميجابايت.");
      return;
    }

    try {
      setSending(true);
      const path = `chat-media/${params.chatId}/${user.uid}/video-${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, file, { contentType: file.type });
      const url = await getDownloadURL(ref);

      await writeMessage({
        kind: "video",
        text: "",
        videoUrl: url,
        lastPreview: "🎬 فيديو",
        replyTo: buildReplyTo(),
      });
      setReplyTarget(null);
    } catch (err: any) {
      const msg =
        err?.code === "storage/unauthorized"
          ? "صلاحية الرفع مرفوضة. تأكد من قواعد Storage."
          : err?.message || "تعذّر إرسال الفيديو.";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  /* ----------------------------------------------------------
   * تبديل التفاعل (قلب) على رسالة
   * ---------------------------------------------------------- */
  const handleToggleReaction = async (message: ChatMessage) => {
    if (!user) return;
    const liveUser = auth.currentUser;
    if (!liveUser || liveUser.uid !== user.uid) {
      toast.error("انتهت جلستك. يُرجى تسجيل الدخول من جديد.");
      return;
    }
    const existing = message.reactions?.[user.uid];
    try {
      const msgRef = doc(db, "chats", params.chatId, "messages", message.id);
      if (existing) {
        // إزالة - نستخدم deleteField لمسح المفتاح فقط
        await updateDoc(msgRef, {
          [`reactions.${user.uid}`]: deleteField(),
        });
      } else {
        await updateDoc(msgRef, {
          [`reactions.${user.uid}`]: "❤️",
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "تعذّر تنفيذ العملية.");
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
  const otherPhone =
    (other as { phone?: string } | undefined)?.phone || otherProfile?.phone;
  const otherWhatsapp = otherProfile?.whatsapp
    ? normalizeLibyanPhone(otherProfile.whatsapp)
    : null;
  // حالة النشاط: "متصل الآن" / "آخر ظهور منذ ..." / "غير متصل"
  const statusLabel = onlineShortLabel(otherProfile);

  // وقت آخر قراءة للطرف الآخر (لإيصالات ✓✓).
  const otherUidForReceipt = thread?.participants.find((p) => p !== user?.uid);
  const otherReadMs =
    (otherUidForReceipt &&
      (thread as any)?.lastReadAt?.[otherUidForReceipt]?.toMillis?.()) ||
    0;

  return (
    <section className="container py-2 sm:py-4">
      <div className="mx-auto flex max-w-3xl flex-col h-[calc(100dvh-120px)] sm:h-[calc(100dvh-140px)]">
        {/* ================ Header ================ */}
        <div className="flex items-center gap-2 rounded-3xl rounded-b-none border border-b-0 border-slate-200/80 bg-white p-2.5 shadow-card dark:border-slate-700/80 dark:bg-slate-900 sm:gap-3 sm:p-3">
          <Link
            href="/messages"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label="رجوع"
          >
            <ArrowRight size={20} />
          </Link>

          {/* صورة + اسم + حالة النشاط (كل الكتلة قابلة للنقر لفتح صفحة التاجر) */}
          <Link
            href={`/traders/${otherUid}`}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1 py-0.5 transition active:scale-[0.98]"
          >
            <div className="relative shrink-0">
              {other?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={other.photoURL}
                  alt={other.name}
                  referrerPolicy="no-referrer"
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-brand-100 dark:ring-brand-900/40"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-700 to-brand-500 text-xs font-black text-white">
                  {(other?.name || "م").charAt(0).toUpperCase()}
                </div>
              )}
              {/* نقطة "متصل الآن" */}
              {statusLabel === "متصل الآن" && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-900 dark:text-white sm:text-[15px]">
                {other?.name || "مستخدم"}
              </p>
              <p
                className={cn(
                  "truncate text-[11px] font-bold",
                  otherTyping
                    ? "text-brand-600 dark:text-brand-300"
                    : statusLabel === "متصل الآن"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-500 dark:text-slate-400"
                )}
              >
                {otherTyping ? "يكتب الآن…" : statusLabel}
              </p>
            </div>
          </Link>

          {/* أزرار الإجراءات */}
          <div className="flex shrink-0 items-center gap-1">
            {/* الإعلان المرتبط */}
            {thread.listingId && (
              <Link
                href={`/listings/${thread.listingId}`}
                aria-label="عرض الإعلان"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ExternalLink size={18} />
              </Link>
            )}
            {/* واتساب */}
            {otherWhatsapp && (
              <a
                href={`https://wa.me/${otherWhatsapp}`}
                target="_blank"
                rel="noreferrer"
                aria-label="واتساب"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-emerald-600 transition hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
              >
                <MessageCircle size={18} />
              </a>
            )}
            {/* اتصال */}
            {otherPhone && (
              <a
                href={`tel:${otherPhone}`}
                aria-label="اتصال"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Phone size={18} />
              </a>
            )}
          </div>
        </div>

        {/* الإعلان المرتبط يظهر داخل ProfilePreviewCard أسفل */}

        {/* ================ Messages area ================ */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto border-x border-slate-200/80 bg-slate-50 px-3 pt-2 pb-3 dark:border-slate-700/80 dark:bg-slate-950 sm:px-4"
        >
          {/* بانر النصائح - يظهر دائماً في أعلى المحادثة */}
          <ChatTipsBanner />

          {/* بطاقة تعريف الطرف الآخر - تظهر مرة واحدة في أعلى المحادثة */}
          <ProfilePreviewCard
            otherUid={otherUid}
            otherName={other?.name || "مستخدم"}
            otherPhoto={other?.photoURL}
            city={otherProfile?.city}
            ratingsCount={otherProfile?.ratingsCount}
            averageRating={otherProfile?.averageRating}
            listingsCount={otherProfile?.listingsCount}
            listingId={thread.listingId}
            listingTitle={thread.listingTitle}
            listingImage={thread.listingImage}
          />

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
                        myUid={user.uid}
                        seen={
                          mine &&
                          !!m.createdAt?.toMillis &&
                          m.createdAt.toMillis() <= otherReadMs
                        }
                        onLongPress={setActionSheetMsg}
                        onToggleReaction={handleToggleReaction}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {otherTyping && <TypingBubble />}
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
        <div className="rounded-3xl rounded-t-none border border-t-0 border-slate-200/80 bg-white shadow-card dark:border-slate-700/80 dark:bg-slate-900">
          {/* معاينة الرد فوق حقل الكتابة */}
          {replyTarget && (
            <div className="flex items-start gap-2 border-b border-slate-200/70 px-3 pt-2 pb-2 dark:border-slate-700/70">
              <div className="mt-0.5 h-full w-0.5 shrink-0 rounded-full bg-brand-500" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[10px] font-black text-brand-700 dark:text-brand-300">
                  <CornerDownLeft size={11} />
                  رد على {replyTarget.senderName}
                </div>
                <p className="line-clamp-1 text-[11px] text-slate-600 dark:text-slate-300">
                  {(replyTarget.kind || "text") === "text"
                    ? replyTarget.text
                    : (replyTarget.kind === "image"
                        ? "📷 صورة"
                        : replyTarget.kind === "video"
                        ? "🎬 فيديو"
                        : "🎙️ مقطع صوتي")}
                </p>
              </div>
              {replyTarget.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={replyTarget.imageUrl}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-md object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => setReplyTarget(null)}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="إلغاء الرد"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="p-2.5">
            {recording ? (
              <AudioRecorder
                onSubmit={handleAudioSubmit}
                onCancel={() => setRecording(false)}
              />
            ) : (
              <form
                onSubmit={handleSendText}
                className="flex items-center gap-1.5"
              >
                {/* حقل النص */}
                <div className="flex flex-1 items-center rounded-full bg-slate-100 px-4 dark:bg-slate-800">
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      if (e.target.value.trim()) pingTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSendText();
                      }
                    }}
                    placeholder="اكتب رسالة..."
                    className="flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400 dark:text-white"
                    disabled={sending}
                  />
                </div>

                {/* إذا في نص → فقط زر إرسال. إذا فارغ → مايك + صورة + كاميرا + فيديو */}
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
                  <div className="flex shrink-0 items-center gap-0.5">
                    {/* مايك - تسجيل صوتي */}
                    <button
                      type="button"
                      onClick={() => setRecording(true)}
                      disabled={sending}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 active:scale-95 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800"
                      aria-label="تسجيل صوتي"
                    >
                      <Mic size={18} />
                    </button>
                    {/* صورة من المعرض */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sending}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 active:scale-95 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800"
                      aria-label="إرسال صورة"
                    >
                      <ImageIcon size={18} />
                    </button>
                    {/* كاميرا - التقاط مباشر */}
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={sending}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 active:scale-95 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800"
                      aria-label="كاميرا"
                    >
                      <Camera size={18} />
                    </button>
                    {/* فيديو */}
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={sending}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 active:scale-95 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800"
                      aria-label="إرسال فيديو"
                    >
                      <VideoIcon size={18} />
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* مدخلات الملفات المخفية */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            className="sr-only"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageChange}
            className="sr-only"
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoChange}
            className="sr-only"
          />
        </div>
      </div>

      {/* ================ Action Sheet (Reply / React) ================ */}
      {actionSheetMsg && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
          onClick={() => setActionSheetMsg(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="
              w-full max-w-md rounded-t-3xl border border-slate-200/80
              bg-white p-3 shadow-2xl dark:border-slate-700/80 dark:bg-slate-900
              sm:rounded-3xl
            "
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* مقبض السحب */}
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden" />

            {/* صف القلب الكبير */}
            <button
              type="button"
              onClick={() => {
                void handleToggleReaction(actionSheetMsg);
                setActionSheetMsg(null);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 transition hover:bg-rose-50 dark:hover:bg-rose-900/20"
            >
              <Heart
                size={28}
                className={cn(
                  actionSheetMsg.reactions?.[user.uid]
                    ? "fill-rose-500 text-rose-500"
                    : "text-slate-400 dark:text-slate-500"
                )}
              />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {actionSheetMsg.reactions?.[user.uid]
                  ? "إزالة الإعجاب"
                  : "إعجاب ❤️"}
              </span>
            </button>

            <div className="my-1 h-px bg-slate-200 dark:bg-slate-700" />

            {/* رد */}
            <button
              type="button"
              onClick={() => {
                setReplyTarget(actionSheetMsg);
                setActionSheetMsg(null);
              }}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-right transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <CornerDownLeft size={20} className="text-brand-700 dark:text-brand-300" />
              <span className="flex-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                رد
              </span>
            </button>

            {/* إلغاء */}
            <button
              type="button"
              onClick={() => setActionSheetMsg(null)}
              className="mt-1 flex w-full items-center justify-center rounded-2xl bg-slate-100 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
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

/* ============================================================
 * ProfilePreviewCard - بطاقة تعريف الطرف الآخر في أعلى المحادثة
 * ============================================================ */
function ProfilePreviewCard({
  otherUid,
  otherName,
  otherPhoto,
  city,
  ratingsCount,
  averageRating,
  listingsCount,
  listingId,
  listingTitle,
  listingImage,
}: {
  otherUid: string;
  otherName: string;
  otherPhoto?: string;
  city?: string;
  ratingsCount?: number;
  averageRating?: number;
  listingsCount?: number;
  listingId?: string;
  listingTitle?: string;
  listingImage?: string;
}) {
  const hasRating = typeof averageRating === "number" && averageRating > 0;
  return (
    <div className="mb-3 flex flex-col items-center rounded-2xl border border-slate-200/80 bg-white p-4 text-center shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
      {/* الصورة الشخصية */}
      <Link href={`/traders/${otherUid}`} aria-label={otherName}>
        {otherPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={otherPhoto}
            alt={otherName}
            referrerPolicy="no-referrer"
            className="h-16 w-16 rounded-full object-cover ring-2 ring-brand-100 dark:ring-brand-900/40"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-700 to-brand-500 text-lg font-black text-white">
            {(otherName || "م").charAt(0).toUpperCase()}
          </div>
        )}
      </Link>

      {/* الاسم */}
      <p className="mt-2 text-sm font-black text-slate-900 dark:text-white">
        {otherName}
      </p>

      {/* المدينة + التقييم/الإعلانات */}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
        {city ? <span>{city}</span> : null}
        {city && (hasRating || (listingsCount && listingsCount > 0)) ? (
          <span aria-hidden="true">•</span>
        ) : null}
        {hasRating ? (
          <span className="inline-flex items-center gap-0.5">
            <Star size={11} className="fill-amber-400 text-amber-400" />
            {averageRating!.toFixed(1)}
            {ratingsCount ? ` (${ratingsCount})` : ""}
          </span>
        ) : null}
        {hasRating && listingsCount && listingsCount > 0 ? (
          <span aria-hidden="true">•</span>
        ) : null}
        {listingsCount && listingsCount > 0 ? (
          <span>{listingsCount} إعلان</span>
        ) : null}
      </div>

      {/* أزرار سريعة */}
      <div className="mt-3 flex w-full max-w-xs flex-wrap items-center justify-center gap-2">
        <Link
          href={`/traders/${otherUid}`}
          className="
            inline-flex h-9 flex-1 items-center justify-center rounded-xl
            border border-slate-200 bg-white px-3 text-xs font-black
            text-slate-700 transition hover:bg-slate-50
            dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200
            dark:hover:bg-slate-700
          "
        >
          عرض الملف
        </Link>
        {listingId && (
          <Link
            href={`/listings/${listingId}`}
            className="
              inline-flex h-9 flex-1 items-center justify-center gap-1.5
              rounded-xl bg-brand-700 px-3 text-xs font-black text-white
              shadow-blue transition hover:bg-brand-600
            "
          >
            عرض الإعلان
          </Link>
        )}
      </div>

      {/* بطاقة الإعلان المرتبط - مصغّرة */}
      {listingId && listingTitle && (
        <Link
          href={`/listings/${listingId}`}
          className="mt-3 flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-right transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          {listingImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listingImage}
              alt={listingTitle}
              className="h-10 w-14 shrink-0 rounded-lg object-cover"
            />
          )}
          <span className="line-clamp-1 flex-1 text-xs font-bold text-slate-700 dark:text-slate-200">
            {listingTitle}
          </span>
        </Link>
      )}
    </div>
  );
}

/** فقاعة "يكتب الآن" بنقاط متحركة (مثل التطبيقات الكبيرة). */
function TypingBubble() {
  return (
    <div className="flex justify-end" dir="rtl">
      <div className="mt-1 flex items-center gap-1 rounded-2xl rounded-tr-sm bg-white px-3.5 py-3 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
      </div>
    </div>
  );
}
