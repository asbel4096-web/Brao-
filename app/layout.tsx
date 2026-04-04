import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/bottom-nav";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "براتشو كار",
  description: "سوق السيارات وقطع الغيار والخدمات في ليبيا"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-slate-100 text-slate-900">
        <SiteHeader />
        <main className="pb-32">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
