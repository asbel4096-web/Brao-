import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/seo";

/** صفحة خاصة بصاحب المحتوى (قرار الإدارة) — لا تُفهرس. */
export const metadata: Metadata = {
  title: `قرار الإدارة | ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

export default function ModerationDecisionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
