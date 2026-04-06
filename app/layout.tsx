import type { Metadata } from 'next';
import './globals.css';
import BottomNav from '@/components/bottom-nav';
import TopActions from '@/components/TopActions';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: 'براتشو كار',
  description: 'منصة سيارات وقطع غيار وخدمات بهوية براتشو كار.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="container pt-4">
          <TopActions />
        </div>
        <SiteHeader />
        <main className="min-h-screen pb-28">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
