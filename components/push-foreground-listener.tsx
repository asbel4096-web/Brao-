"use client";

import { useEffect } from "react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useToast } from "@/contexts/ToastContext";

/**
 * مكوّن خفيف يستمع للإشعارات foreground ويعرضها كـtoast.
 *
 * يُوضع مرة واحدة في app/layout.tsx (داخل الـAuthProvider) - لا UI ظاهر،
 * مجرد effect listener.
 *
 * لماذا منفصل عن usePushNotifications؟
 *  - يفصل عرض الإشعار عن منطق التسجيل/الإذن.
 *  - يستخدم Toast context الذي يحتاج أن يكون mounted في الـtree.
 *  - يمكن استبداله بسهولة بـ"in-app banner" أنيق إن أردنا لاحقاً.
 *
 * Note: لا نتعامل مع التنقل عند الضغط على الـtoast حالياً - فقط عرض النص.
 * إذا أردنا "اضغط لفتح الإعلان"، نُضيف زر `link` للـToast API.
 */

export function PushForegroundListener() {
  const { foregroundMessage, clearForegroundMessage } = usePushNotifications();
  const toast = useToast();

  useEffect(() => {
    if (!foregroundMessage) return;
    const { title, body } = foregroundMessage;

    // toast يحوي العنوان + الجسم. مدة 6 ثوانٍ كافية للقراءة دون إزعاج.
    toast.info(`${title} — ${body}`, 6000);

    // ننظّف فوراً حتى لا يُعرض مرتين على re-render.
    clearForegroundMessage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foregroundMessage]);

  return null;
}
