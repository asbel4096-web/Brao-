import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ConfirmProvider } from "@/components/confirm-dialog";
import { SiteHeader } from "@/components/site-header";
import BottomNav from "@/components/bottom-nav";
import { PushForegroundListener } from "@/components/push-foreground-listener";

export const metadata: Metadata = {
  title: "براتشو كار | سوق السيارات وقطع الغيار في ليبيا",
  description:
    "براتشو كار - سوق السيارات الاحترافي في ليبيا: سيارات، حافلات، شاحنات، قطع غيار، كماليات وخدمات الورش.",
  manifest: "/manifest.json",
  applicationName: "براتشو كار",
  formatDetection: { telephone: true },
};

export const viewport: Viewport = {
  themeColor: "#1c389c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const noFlashScript = `
(function(){try{var t=localStorage.getItem('bratsho-theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://firestore.googleapis.com" crossOrigin="" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" crossOrigin="" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://lh3.googleusercontent.com" />
        <link rel="dns-prefetch" href="https://www.googleapis.com" />

        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <ConfirmProvider>
                <SiteHeader />
                <main className="pb-20 md:pb-12">{children}</main>
                <BottomNav />
                {/* مستمع لإشعارات foreground - يعرض toast عند وصول push
                    أثناء فتح التطبيق. خفيف جداً (لا UI ظاهر، effect فقط). */}
                <PushForegroundListener />
              </ConfirmProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
