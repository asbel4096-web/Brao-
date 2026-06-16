import {
  signInWithEmailAndPassword,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  signOut,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

/**
 * ============================================================
 *  اسم المستخدم + كلمة المرور (Username / Password)
 * ============================================================
 *
 * Firebase لا يدعم "اسم مستخدم" مباشرة، بل بريد/كلمة مرور. لذلك:
 *  - نحوّل اسم المستخدم إلى "بريد داخلي مخفي" ثابت الاشتقاق:
 *        username  →  username@login.bratsho-car.app
 *    هذا البريد لا يُعرض للمستخدم ولا يُرسَل له شيء؛ هو مجرد مُعرِّف
 *    داخلي لمزوّد كلمة المرور في Firebase.
 *  - ضبط كلمة المرور يتم **من السيرفر** عبر Admin SDK (updateUser)،
 *    فيعمل بثبات لحسابات Google والهاتف على حدٍّ سواء، ويتجنّب تعقيدات
 *    linkWithCredential على جهة العميل.
 *  - الدخول لاحقاً من أي جهاز: اسم المستخدم + كلمة المرور →
 *    نشتقّ البريد الداخلي → signInWithEmailAndPassword.
 */

/** نطاق البريد الداخلي المخفي (لا يحتاج أن يكون نطاقاً حقيقياً). */
export const LOGIN_EMAIL_DOMAIN = "login.bratsho-car.app";

/** أحرف لاتينية صغيرة + أرقام + (_ .)، طول 3–20. */
export const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

/** يطبّع اسم المستخدم: قصّ + تحويل لحروف صغيرة. */
export function normalizeUsername(raw: string): string {
  return (raw || "").trim().toLowerCase();
}

/** يحوّل اسم المستخدم إلى البريد الداخلي المخفي. */
export function usernameToLoginEmail(username: string): string {
  return `${normalizeUsername(username)}@${LOGIN_EMAIL_DOMAIN}`;
}

/** تحقّق من صيغة اسم المستخدم. */
export function validateUsername(raw: string): { ok: boolean; error?: string } {
  const u = normalizeUsername(raw);
  if (!u) return { ok: false, error: "اسم المستخدم مطلوب." };
  if (u.length < 3) return { ok: false, error: "اسم المستخدم قصير جداً (3 أحرف على الأقل)." };
  if (u.length > 20) return { ok: false, error: "اسم المستخدم طويل جداً (20 حرفاً كحد أقصى)." };
  if (!USERNAME_RE.test(u)) {
    return {
      ok: false,
      error: "يُسمح فقط بأحرف إنجليزية صغيرة وأرقام و( _ . ).",
    };
  }
  return { ok: true };
}

/** تحقّق من قوة كلمة المرور. */
export function validatePassword(pw: string): { ok: boolean; error?: string } {
  if (!pw) return { ok: false, error: "كلمة المرور مطلوبة." };
  if (pw.length < 8) return { ok: false, error: "كلمة المرور يجب ألا تقل عن 8 أحرف." };
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) {
    return { ok: false, error: "اجعل كلمة المرور تحوي أحرفاً وأرقاماً." };
  }
  return { ok: true };
}

/**
 * إعادة المصادقة قبل عملية حسّاسة (تغيير اسم المستخدم/كلمة المرور) —
 * مثل المنصات الكبيرة. تختار الطريقة حسب مزوّد دخول المستخدم:
 *  - عنده كلمة مرور + أدخل كلمة المرور الحالية → reauthenticateWithCredential.
 *  - عنده Google → نافذة Google.
 *  - هاتف فقط بلا كلمة مرور → يحتاج إعادة دخول.
 *
 * بعد النجاح، الجلسة تصبح "حديثة" فيتجاوز فحص الحداثة في السيرفر.
 */
export async function reauthenticate(
  currentPassword?: string
): Promise<{ ok: boolean; error?: string; code?: string }> {
  const user = auth.currentUser;
  if (!user) return { ok: false, error: "يجب تسجيل الدخول أولاً." };

  const providers = user.providerData.map((p) => p.providerId);
  const hasPassword = providers.includes("password");
  const hasGoogle = providers.includes("google.com");

  try {
    if (hasPassword) {
      if (!currentPassword) {
        return { ok: false, error: "أدخل كلمة المرور الحالية.", code: "need-password" };
      }
      const cred = EmailAuthProvider.credential(user.email || "", currentPassword);
      await reauthenticateWithCredential(user, cred);
    } else if (hasGoogle) {
      await reauthenticateWithPopup(user, googleProvider);
    } else {
      // هاتف فقط بلا كلمة مرور
      return {
        ok: false,
        code: "relogin",
        error: "للتأكيد، سجّل الخروج ثم الدخول مجدداً ثم أعد المحاولة.",
      };
    }
    // أجبر تحديث الـtoken حتى يعكس auth_time الجديد للسيرفر.
    await user.getIdToken(true);
    return { ok: true };
  } catch (err: any) {
    const c = err?.code || "";
    if (
      c === "auth/wrong-password" ||
      c === "auth/invalid-credential"
    ) {
      return { ok: false, error: "كلمة المرور الحالية غير صحيحة." };
    }
    if (c === "auth/popup-closed-by-user") {
      return { ok: false, error: "تم إلغاء التأكيد." };
    }
    if (c === "auth/too-many-requests") {
      return { ok: false, error: "محاولات كثيرة. حاول لاحقاً." };
    }
    return { ok: false, error: "تعذّر تأكيد الهوية. حاول مجدداً." };
  }
}

/**
 * يضبط اسم المستخدم وكلمة المرور للحساب الحالي (يستدعي السيرفر).
 * - كلمة المرور **اختيارية** عند التغيير: اتركها فارغة للإبقاء على
 *   كلمة المرور الحالية وتغيير اسم المستخدم فقط.
 * - عند الإنشاء لأول مرة، كلمة المرور مطلوبة (يفرضها السيرفر).
 */
export async function saveUsernamePassword(
  username: string,
  password?: string,
  reSignInPassword?: string
): Promise<{ ok: boolean; error?: string; needsReauth?: boolean }> {
  const current = auth.currentUser;
  if (!current) return { ok: false, error: "يجب تسجيل الدخول أولاً." };

  const uVal = validateUsername(username);
  if (!uVal.ok) return uVal;
  if (password) {
    const pVal = validatePassword(password);
    if (!pVal.ok) return pVal;
  }

  try {
    // token حديث (force refresh) حتى يحمل أحدث auth_time لفحص الحداثة في السيرفر.
    const token = await current.getIdToken(true);
    const res = await fetch("/api/auth/set-credentials", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        username: normalizeUsername(username),
        ...(password ? { password } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data?.code === "reauth-required") {
        return {
          ok: false,
          needsReauth: true,
          error: data?.error || "يلزم تأكيد الهوية.",
        };
      }
      return { ok: false, error: data?.error || "تعذّر حفظ بيانات الدخول." };
    }

    // مهم جداً: تغيير البريد/كلمة المرور عبر Admin SDK يُبطِل الجلسة الحالية
    // (auth/user-token-expired). لذلك نعيد تسجيل الدخول فوراً بالبيانات
    // الجديدة لاستعادة جلسة صالحة، بدل استخدام token مُبطَل.
    const pwForReSignIn = password || reSignInPassword;
    if (pwForReSignIn) {
      try {
        await signInWithEmailAndPassword(
          auth,
          usernameToLoginEmail(username),
          pwForReSignIn
        );
      } catch (e) {
        // لو فشلت إعادة الدخول التلقائية، نطلب من المستخدم الدخول يدوياً.
        return {
          ok: true,
          error:
            "تم الحفظ. سجّل الدخول باسم المستخدم وكلمة المرور الجديدين.",
        };
      }
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "تعذّر الاتصال بالخادم." };
  }
}

/** الدخول باسم المستخدم + كلمة المرور (من أي جهاز). */
export async function signInWithUsername(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const uVal = validateUsername(username);
  if (!uVal.ok) return { ok: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة." };

  try {
    // نظّف أي جلسة سابقة قد تكون مُبطَلة (auth/user-token-expired) قبل
    // تسجيل دخول جديد، حتى لا تتداخل جلسة ميتة مع الدخول.
    if (auth.currentUser) {
      try {
        await signOut(auth);
      } catch {
        /* تجاهل */
      }
    }
    await signInWithEmailAndPassword(
      auth,
      usernameToLoginEmail(username),
      password
    );
    return { ok: true };
  } catch (err: any) {
    const code = err?.code || "";
    if (
      code === "auth/invalid-credential" ||
      code === "auth/wrong-password" ||
      code === "auth/user-not-found" ||
      code === "auth/invalid-email"
    ) {
      return { ok: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة." };
    }
    if (code === "auth/too-many-requests") {
      return { ok: false, error: "محاولات كثيرة. حاول لاحقاً." };
    }
    return { ok: false, error: "تعذّر تسجيل الدخول. حاول مجدداً." };
  }
}
