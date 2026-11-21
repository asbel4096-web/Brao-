import type { Metadata } from "next";

/** صفحة خاصة بصاحب المحتوى (قرار الإدارة) — لا تُفهرس. القالب في app/layout.tsx يضيف اسم الموقع. */
export const metadata: Metadata = {
  title: "قرار الإدارة",
  robots: { index: false, follow: false },
};

export default function ModerationDecisionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
