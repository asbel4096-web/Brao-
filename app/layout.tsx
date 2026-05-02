import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SiteHeader } from "@/components/site-header";
import BottomNav from "@/components/bottom-nav";

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
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <SiteHeader />
            <main className="pb-28 md:pb-12">{children}</main>
            <BottomNav />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
