"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import {
  AtSign,
  CheckCircle2,
  Facebook,
  Instagram,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Send,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useContactSettings } from "@/hooks/useContactSettings";

/**
 * صفحة الدعم والتواصل - بسيطة وعملية.
 *
 * معلومات التواصل (هاتف، واتساب، إيميل، روابط social) تأتي من
 * Firestore (settings/contact). الأدمن يعدّلها من /admin/contact-info،
 * أي حقل فارغ يخفي بطاقته من الواجهة.
 */

type ContactType = "suggestion" | "issue" | "other";

export default function ContactPage() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const { settings } = useContactSettings();

  // اشتقاق القيم من الإعدادات - نتحقق من وجود قيمة قبل عرض البطاقة.
  const SUPPORT_PHONE = settings.phone || "";
  const SUPPORT_WHATSAPP = settings.whatsapp || "";
  const SUPPORT_EMAIL = settings.email || "";

  const [type, setType] = useState<ContactType>("issue");
  const [name, setName] = useState(profile?.name || user?.displayName || "");
  const [contact, setContact] = useState(
    profile?.phone || profile?.email || user?.phoneNumber || user?.email || ""
  );
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.warning("اكتب رسالتك أولاً.");
      return;
    }
    if (!name.trim() || !contact.trim()) {
      toast.warning("اسمك وطريقة التواصل مطلوبة.");
      return;
    }

    setSending(true);
    try {
      await addDoc(collection(db, "support_messages"), {
        type,
        name: name.trim(),
        contact: contact.trim(),
        message: message.trim(),
        userId: user?.uid || null,
        userEmail: user?.email || null,
        createdAt: serverTimestamp(),
        status: "open",
      });
      setSuccess(true);
      setMessage("");
      toast.success("تم إرسال رسالتك.");
    } catch (err: any) {
      toast.error(err?.message || "تعذّر إرسال الرسالة. تواصل معنا عبر واتساب.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="container py-4 sm:py-8">
      <div className="mx-auto max-w-2xl space-y-5">
        {/* ============================================================
            Hero - عنوان + نص توضيحي. للأدمن يظهر زر اختصار لصفحة
            تعديل معلومات التواصل (/admin/contact-info). يستخدم نفس
            هوية البرند ولا يلفت نظر المستخدم العادي (لا يراه أصلاً).
           ============================================================ */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              هل تحتاج إلى مساعدة؟
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              فريق براتشو كار جاهز للرد على استفساراتك ومقترحاتك.
            </p>
          </div>

          {profile?.isAdmin && (
            <Link
              href="/admin/contact-info"
              aria-label="تعديل معلومات التواصل (للأدمن فقط)"
              className="
                inline-flex h-9 shrink-0 items-center gap-1.5 rounded-2xl
                border border-action-300 bg-action-50 px-3 text-xs font-black
                text-action-700 transition active:scale-95 hover:bg-action-100
                dark:border-action-800/40 dark:bg-action-900/20 dark:text-action-300
                dark:hover:bg-action-900/30
              "
            >
              <Pencil size={12} />
              تعديل
            </Link>
          )}
        </div>

        {/* ============================================================
            3 بطاقات تواصل سريع
           ============================================================ */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* واتساب - الأبرز - يخفى لو الأدمن لم يضع رقماً */}
          {SUPPORT_WHATSAPP && (
          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP}`}
            target="_blank"
            rel="noreferrer"
            className="
              group relative flex flex-col items-center gap-2 overflow-hidden
              rounded-3xl border-2 border-emerald-200 bg-emerald-50/50
              p-5 text-center transition-all
              hover:-translate-y-0.5 hover:border-emerald-300
              hover:shadow-md
              dark:border-emerald-800/60 dark:bg-emerald-950/30
              dark:hover:border-emerald-700
            "
          >
            <div
              className="
                flex h-12 w-12 items-center justify-center rounded-2xl
                bg-emerald-500 text-white shadow-md
              "
            >
              <MessageCircle size={22} />
            </div>
            <div>
              <div className="text-sm font-black text-slate-950 dark:text-white">
                واتساب
              </div>
              <div className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                أسرع طريقة للرد
              </div>
            </div>
          </a>
          )}

          {/* اتصال هاتفي */}
          {SUPPORT_PHONE && (
          <a
            href={`tel:${SUPPORT_PHONE}`}
            className="
              flex flex-col items-center gap-2 overflow-hidden
              rounded-3xl border-2 border-slate-200 bg-white
              p-5 text-center transition-all
              hover:-translate-y-0.5 hover:border-brand-300
              hover:shadow-md
              dark:border-slate-700 dark:bg-slate-900
              dark:hover:border-brand-700
            "
          >
            <div
              className="
                flex h-12 w-12 items-center justify-center rounded-2xl
                bg-brand-700 text-white shadow-blue
              "
            >
              <Phone size={20} />
            </div>
            <div>
              <div className="text-sm font-black text-slate-950 dark:text-white">
                اتصل بنا
              </div>
              <div
                dir="ltr"
                className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300"
              >
                {SUPPORT_PHONE}
              </div>
            </div>
          </a>
          )}

          {/* إيميل */}
          {SUPPORT_EMAIL && (
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="
              flex flex-col items-center gap-2 overflow-hidden
              rounded-3xl border-2 border-slate-200 bg-white
              p-5 text-center transition-all
              hover:-translate-y-0.5 hover:border-brand-300
              hover:shadow-md
              dark:border-slate-700 dark:bg-slate-900
              dark:hover:border-brand-700
            "
          >
            <div
              className="
                flex h-12 w-12 items-center justify-center rounded-2xl
                bg-slate-700 text-white shadow-md
                dark:bg-slate-600
              "
            >
              <Mail size={20} />
            </div>
            <div>
              <div className="text-sm font-black text-slate-950 dark:text-white">
                بريد إلكتروني
              </div>
              <div className="mt-0.5 truncate text-[11px] text-slate-600 dark:text-slate-300">
                {SUPPORT_EMAIL}
              </div>
            </div>
          </a>
          )}
        </div>

        {/* ============================================================
            نموذج اقتراح / مشكلة
           ============================================================ */}
        <div className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Send size={16} className="text-brand-700 dark:text-brand-300" />
            <h2 className="text-base font-black text-slate-950 dark:text-white sm:text-lg">
              أرسل لنا رسالة
            </h2>
          </div>

          {success ? (
            <SuccessState onReset={() => setSuccess(false)} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* نوع الرسالة */}
              <div>
                <label className="mb-2 block text-xs font-black text-slate-900 dark:text-white">
                  نوع الرسالة
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <TypeButton
                    active={type === "issue"}
                    onClick={() => setType("issue")}
                    label="مشكلة"
                  />
                  <TypeButton
                    active={type === "suggestion"}
                    onClick={() => setType("suggestion")}
                    label="اقتراح"
                  />
                  <TypeButton
                    active={type === "other"}
                    onClick={() => setType("other")}
                    label="أخرى"
                  />
                </div>
              </div>

              {/* الاسم */}
              <div>
                <label className="mb-2 block text-xs font-black text-slate-900 dark:text-white">
                  الاسم
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="اسمك"
                  maxLength={60}
                  className="
                    w-full rounded-2xl border-2 border-slate-200 bg-white
                    px-4 py-3 text-sm outline-none transition
                    focus:border-brand-400 focus:ring-4 focus:ring-brand-100
                    dark:border-slate-700 dark:bg-slate-900 dark:text-white
                    dark:focus:ring-brand-900/40
                  "
                />
              </div>

              {/* طريقة التواصل */}
              <div>
                <label className="mb-2 block text-xs font-black text-slate-900 dark:text-white">
                  طريقة التواصل
                </label>
                <div className="relative">
                  <AtSign
                    size={14}
                    className="
                      pointer-events-none absolute right-3 top-1/2
                      -translate-y-1/2 text-slate-400
                    "
                  />
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="هاتف أو بريد إلكتروني"
                    className="
                      w-full rounded-2xl border-2 border-slate-200 bg-white
                      py-3 pl-3 pr-10 text-sm outline-none transition
                      focus:border-brand-400 focus:ring-4 focus:ring-brand-100
                      dark:border-slate-700 dark:bg-slate-900 dark:text-white
                      dark:focus:ring-brand-900/40
                    "
                  />
                </div>
              </div>

              {/* الرسالة */}
              <div>
                <label className="mb-2 block text-xs font-black text-slate-900 dark:text-white">
                  الرسالة
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="اكتب رسالتك هنا..."
                  rows={5}
                  maxLength={1000}
                  className="
                    w-full resize-none rounded-2xl border-2 border-slate-200
                    bg-white px-4 py-3 text-sm outline-none transition
                    focus:border-brand-400 focus:ring-4 focus:ring-brand-100
                    dark:border-slate-700 dark:bg-slate-900 dark:text-white
                    dark:focus:ring-brand-900/40
                  "
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {message.length}/1000
                </p>
              </div>

              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="
                  flex w-full items-center justify-center gap-2
                  rounded-2xl bg-brand-700 py-3.5 text-sm font-black
                  text-white shadow-blue transition active:scale-[0.99]
                  hover:bg-brand-800 disabled:cursor-not-allowed
                  disabled:bg-slate-300 disabled:text-slate-500
                  disabled:shadow-none
                  dark:disabled:bg-slate-700
                "
              >
                <Send size={16} />
                {sending ? "جارٍ الإرسال..." : "إرسال الرسالة"}
              </button>
            </form>
          )}
        </div>

        {/* ============================================================
            وسائل التواصل الاجتماعي - تظهر فقط لو الأدمن وضع رابطاً.
           ============================================================ */}
        <div className="card p-5 sm:p-6">
          <h3 className="mb-3 text-sm font-black text-slate-900 dark:text-white">
            تابعنا على
          </h3>
          <div className="flex flex-wrap gap-2">
            {settings.facebookUrl && (
              <SocialChip
                href={settings.facebookUrl}
                icon={<Facebook size={16} />}
                label="Facebook"
                color="bg-[#1877F2] text-white"
              />
            )}
            {settings.instagramUrl && (
              <SocialChip
                href={settings.instagramUrl}
                icon={<Instagram size={16} />}
                label="Instagram"
                color="bg-gradient-to-tr from-pink-500 to-orange-400 text-white"
              />
            )}
            {SUPPORT_WHATSAPP && (
              <SocialChip
                href={`https://wa.me/${SUPPORT_WHATSAPP}`}
                icon={<MessageCircle size={16} />}
                label="WhatsApp"
                color="bg-emerald-500 text-white"
              />
            )}
            {SUPPORT_EMAIL && (
              <SocialChip
                href={`mailto:${SUPPORT_EMAIL}`}
                icon={<Mail size={16} />}
                label="Email"
                color="bg-slate-700 text-white dark:bg-slate-600"
              />
            )}
          </div>
        </div>

        {/* ============================================================
            روابط مساعدة سفلية
           ============================================================ */}
        <div
          className="
            grid grid-cols-2 gap-2 rounded-2xl border border-slate-200/70
            bg-slate-50/60 p-3 text-center text-xs
            dark:border-slate-700/70 dark:bg-slate-950/40
          "
        >
          <Link
            href="/terms"
            className="rounded-xl px-3 py-2 font-bold text-slate-700 transition hover:bg-white dark:text-slate-200 dark:hover:bg-slate-900"
          >
            اتفاقية الاستخدام
          </Link>
          <Link
            href="/privacy"
            className="rounded-xl px-3 py-2 font-bold text-slate-700 transition hover:bg-white dark:text-slate-200 dark:hover:bg-slate-900"
          >
            سياسة الخصوصية
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
 * Sub-components
 * ============================================================ */

function TypeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`
        rounded-xl px-3 py-2 text-xs font-black transition active:scale-95
        ${
          active
            ? "bg-brand-700 text-white shadow-blue"
            : "border-2 border-slate-200 bg-white text-slate-700 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-700"
        }
      `}
    >
      {label}
    </button>
  );
}

function SocialChip({
  href,
  icon,
  label,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`
        inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs
        font-black shadow-sm transition active:scale-95 hover:opacity-90
        ${color}
      `}
    >
      {icon}
      {label}
    </a>
  );
}

function SuccessState({ onReset }: { onReset: () => void }) {
  return (
    <div
      className="
        flex flex-col items-center gap-3 rounded-2xl border-2
        border-emerald-200 bg-emerald-50 p-6 text-center
        dark:border-emerald-800 dark:bg-emerald-950/30
      "
    >
      <div
        className="
          flex h-14 w-14 items-center justify-center rounded-full
          bg-emerald-500 text-white shadow-md
        "
      >
        <CheckCircle2 size={28} />
      </div>
      <div>
        <p className="text-base font-black text-slate-900 dark:text-white">
          تم استلام رسالتك
        </p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          سنتواصل معك في أقرب وقت ممكن.
        </p>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="text-xs font-black text-brand-700 hover:underline dark:text-brand-300"
      >
        إرسال رسالة أخرى
      </button>
    </div>
  );
}
