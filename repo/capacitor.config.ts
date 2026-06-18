import type { CapacitorConfig } from "@capacitor/cli";

/**
 * إعداد Capacitor لتطبيق "براتشو كار".
 *
 * المعمارية: نمط مستضاف (Hybrid) — القشرة الأصلية تحمّل الموقع المنشور
 * على Vercel عبر server.url، لأن المشروع يعتمد على Next.js API routes
 * ومكوّنات سيرفر لا يمكن تصديرها ثابتة.
 *
 * للتطوير المحلي: غيّر server.url إلى http://192.168.x.x:3000 (IP جهازك)
 * وشغّل `npm run dev`، أو علّق server.url لاستخدام النسخة المضمّنة.
 */
const config: CapacitorConfig = {
  appId: "com.bratsho.car",
  appName: "براتشو كار",
  // مطلوب من الـCLI حتى مع server.url (لا يُستخدم للتحميل هنا).
  webDir: "public",
  server: {
    // الموقع المنشور — تُحمّله القشرة الأصلية.
    url: "https://www.bratshocar.com",
    cleartext: false,
    androidScheme: "https",
    iosScheme: "https",
    // نطاقات يُسمح للـwebview بالتنقّل داخلها (تبقى داخل التطبيق).
    allowNavigation: [
      "www.bratshocar.com",
      "bratshocar.com",
      "*.firebaseapp.com",
      "*.firebaseio.com",
      "*.googleapis.com",
      "*.gstatic.com",
    ],
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0a1330",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    Keyboard: {
      resize: "native",
    },
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#0a1330",
  },
  android: {
    backgroundColor: "#0a1330",
    allowMixedContent: false,
  },
};

export default config;
