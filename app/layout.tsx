import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { BottomNav } from '@/components/bottom-nav';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: 'براتشو كار',
  description: 'منصة سيارات وقطع غيار وخدمات قريبة من تجربة السوق المفتوح بهوية براتشو كار.',
  manifest: '/manifest.json',
  themeColor: '#2146ef',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('brao-theme');document.documentElement.dataset.theme=t==='dark'?'dark':'light';if(t==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){document.documentElement.dataset.theme='light';document.documentElement.classList.remove('dark');}})();`}
        </Script>
        <SiteHeader />
        <main className="min-h-screen pb-28">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
