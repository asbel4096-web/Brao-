"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { KeyRound, AtSign, Lock, Eye, EyeOff, Check, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  normalizeUsername,
  validateUsername,
  validatePassword,
  saveUsernamePassword,
  reauthenticate,
} from "@/lib/auth-credentials";

/**
 * CredentialsManager — صفّ في الإعدادات لتغيير اسم المستخدم وكلمة المرور.
 *
 * - المستخدم الذي لم يُنشئ بيانات دخول بعد (حسابات قديمة): "إنشاء" (كلمة المرور مطلوبة).
 * - المستخدم الذي أنشأها: "تغيير" (كلمة المرور اختيارية — فارغة = إبقاء الحالية).
 *
 * يعيد استخدام نفس الـAPI (saveUsernamePassword) المستخدم في الإعداد الأول.
 */
export function CredentialsManager() {
  const { user, profile, refreshProfile } = useAuth();
  const toast = useToast();

  const currentUsername = (profile as any)?.username as string | undefined;
  const hasCreds = (profile as any)?.usernameSet === true;

  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(currentUsername || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");

  // إعادة المزامنة عند فتح النافذة
  useEffect(() => {
    if (open) {
      setUsername(currentUsername || "");
      setCurrentPassword("");
      setPassword("");
      setConfirm("");
      setStatus("idle");
    }
  }, [open, currentUsername]);

  // فحص توفّر اسم المستخدم (يتخطّى لو لم يتغيّر عن الحالي)
  useEffect(() => {
    if (!open) return;
    const u = normalizeUsername(username);
    if (!u || u === normalizeUsername(currentUsername || "")) {
      setStatus("idle");
      return;
    }
    if (!validateUsername(u).ok) {
      setStatus("invalid");
      return;
    }
    setStatus("checking");
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const snap = await getDoc(doc(db, "usernames", u));
        if (cancelled) return;
        const mine = snap.exists() && snap.data()?.uid === user?.uid;
        setStatus(snap.exists() && !mine ? "taken" : "available");
      } catch {
        if (!cancelled) setStatus("idle");
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [username, open, currentUsername, user?.uid]);

  const handleSave = async () => {
    if (saving) return;

    const uVal = validateUsername(username);
    if (!uVal.ok) {
      toast.warning(uVal.error!);
      return;
    }
    if (status === "taken") {
      toast.warning("اسم المستخدم محجوز.");
      return;
    }
    // كلمة المرور: مطلوبة لو لم تُنشأ من قبل، اختيارية للتغيير.
    const wantsPassword = password.length > 0;
    if (!hasCreds && !wantsPassword) {
      toast.warning("أدخل كلمة مرور لإنشاء بيانات الدخول.");
      return;
    }
    if (wantsPassword) {
      const pVal = validatePassword(password);
      if (!pVal.ok) {
        toast.warning(pVal.error!);
        return;
      }
      if (password !== confirm) {
        toast.warning("كلمتا المرور غير متطابقتين.");
        return;
      }
    }

    setSaving(true);
    try {
      // إعادة المصادقة قبل التغيير (مثل المنصات الكبيرة).
      // - مستخدم عنده كلمة مرور: نتحقّق من كلمة المرور الحالية.
      if (hasCreds) {
        if (!currentPassword) {
          toast.warning("أدخل كلمة المرور الحالية للتأكيد.");
          setSaving(false);
          return;
        }
        const re = await reauthenticate(currentPassword);
        if (!re.ok) {
          toast.error(re.error || "تعذّر تأكيد الهوية.");
          setSaving(false);
          return;
        }
      }

      let res = await saveUsernamePassword(
        username,
        wantsPassword ? password : undefined
      );

      // جلسة قديمة (لمستخدمي Google غالباً): أكّد عبر نافذة Google ثم أعد المحاولة.
      if (!res.ok && res.needsReauth) {
        const re = await reauthenticate(currentPassword || undefined);
        if (!re.ok) {
          toast.error(re.error || "تعذّر تأكيد الهوية.");
          setSaving(false);
          return;
        }
        res = await saveUsernamePassword(
          username,
          wantsPassword ? password : undefined
        );
      }

      if (!res.ok) {
        toast.error(res.error || "تعذّر الحفظ.");
        setSaving(false);
        return;
      }
      // حدّث ملف المستخدم (username/usernameSet مسموحان في القواعد).
      if (user) {
        await setDoc(
          doc(db, "users", user.uid),
          {
            username: normalizeUsername(username),
            usernameSet: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ).catch(() => {});
      }
      await refreshProfile?.();
      toast.success("تم تحديث بيانات الدخول بنجاح.");
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "تعذّر الحفظ.");
    } finally {
      setSaving(false);
    }
  };

  const inputBase =
    "w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-brand-900/40";

  return (
    <>
      {/* الصفّ داخل بطاقة الإعدادات */}
      <div className="flex items-center justify-between gap-3 p-4 sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            <KeyRound size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black dark:text-white">
              اسم المستخدم وكلمة المرور
            </div>
            <div className="truncate text-xs text-slate-500">
              {hasCreds && currentUsername
                ? `@${currentUsername} — للدخول من أي جهاز`
                : "أنشئ بيانات دخول للدخول من أي جهاز"}
            </div>
          </div>
        </div>
        <div className="shrink-0">
          <button onClick={() => setOpen(true)} className="btn-secondary">
            {hasCreds ? "تغيير" : "إنشاء"}
          </button>
        </div>
      </div>

      {/* النافذة المنبثقة */}
      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => !saving && setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            className="
              w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl
              dark:bg-slate-900 sm:rounded-3xl
            "
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {hasCreds ? "تغيير بيانات الدخول" : "إنشاء بيانات الدخول"}
              </h3>
              <button
                onClick={() => !saving && setOpen(false)}
                aria-label="إغلاق"
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* تأكيد الهوية: كلمة المرور الحالية (للمستخدم الذي أنشأ بيانات دخول) */}
              {hasCreds && (
                <div className="rounded-2xl bg-amber-50 p-3 dark:bg-amber-950/20">
                  <label className="mb-1.5 block text-sm font-black text-amber-800 dark:text-amber-300">
                    كلمة المرور الحالية
                  </label>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-amber-500"
                    />
                    <input
                      type={showPw ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="********"
                      dir="ltr"
                      autoComplete="current-password"
                      className={`${inputBase} border-amber-200 pr-10 text-left dark:border-amber-900/40`}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-400/80">
                    مطلوبة لتأكيد هويتك قبل التغيير.
                  </p>
                </div>
              )}

              {/* اسم المستخدم */}
              <div>
                <label className="mb-1.5 block text-sm font-black text-slate-900 dark:text-white">
                  اسم المستخدم
                </label>
                <div className="relative">
                  <AtSign
                    size={18}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    dir="ltr"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={20}
                    className={`${inputBase} pr-10 pl-10 text-left`}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">
                    {status === "checking" && (
                      <span className="block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500" />
                    )}
                    {status === "available" && (
                      <Check size={18} className="text-emerald-500" />
                    )}
                    {(status === "taken" || status === "invalid") && (
                      <X size={18} className="text-rose-500" />
                    )}
                  </span>
                </div>
              </div>

              {/* كلمة المرور */}
              <div>
                <label className="mb-1.5 block text-sm font-black text-slate-900 dark:text-white">
                  كلمة المرور{" "}
                  {hasCreds && (
                    <span className="text-xs font-normal text-slate-400">
                      (اتركها فارغة للإبقاء على الحالية)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    dir="ltr"
                    autoComplete="new-password"
                    className={`${inputBase} pr-10 pl-10 text-left`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    aria-label={showPw ? "إخفاء" : "إظهار"}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* تأكيد كلمة المرور (يظهر فقط عند كتابة كلمة مرور) */}
              {password.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-black text-slate-900 dark:text-white">
                    تأكيد كلمة المرور
                  </label>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type={showPw ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="********"
                      dir="ltr"
                      autoComplete="new-password"
                      className={`${inputBase} pr-10 text-left`}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => !saving && setOpen(false)}
                  className="flex-1 rounded-2xl border-2 border-slate-200 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-brand-700 py-3 text-sm font-black text-white shadow-blue transition hover:bg-brand-800 active:scale-[0.99] disabled:opacity-60"
                >
                  {saving ? "جارٍ الحفظ..." : "حفظ"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
