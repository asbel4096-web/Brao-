import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ConfirmProvider } from "@/components/confirm-dialog";
import { ReferralFlowProvider } from "@/components/wallet/referral-flow-provider";
import { SiteHeader } from "@/components/site-header";
import BottomNav from "@/components/bottom-nav";
import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "براتشو كار | سوق السيارات وقطع الغيار في ليبيا",
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  manifest: "/manifest.json",
  applicationName: SITE_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME,
  },
  formatDetection: { telephone: true },
  keywords: [
    "سيارات ليبيا",
    "سيارات للبيع",
    "سوق السيارات",
    "سيارات مستعملة",
    "قطع غيار",
    "شاحنات",
    "حافلات",
    "براتشو كار",
    "طرابلس",
    "بنغازي",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "براتشو كار | سوق السيارات وقطع الغيار في ليبيا",
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
    locale: "ar_LY",
  },
  twitter: {
    card: "summary_large_image",
    title: "براتشو كار | سوق السيارات في ليبيا",
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  themeColor: "#0a1330",
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
                <ReferralFlowProvider />
                <SiteHeader />
                <main className="pb-20 md:pb-12">{children}</main>
                <BottomNav />
              </ConfirmProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
