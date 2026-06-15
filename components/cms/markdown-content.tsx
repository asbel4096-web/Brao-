"use client";

import { renderMarkdown } from "@/lib/cms/markdown";

/**
 * مكوّن يعرض markdown كـHTML آمن.
 *
 * الـrender يتم في الـserver-component والـclient بنفس الطريقة (الدالة
 * pure). نستخدم dangerouslySetInnerHTML بأمان لأن renderMarkdown يُهرّب
 * كل HTML قبل تطبيق الـmarkdown patterns.
 */

interface Props {
  markdown: string;
  className?: string;
}

export function MarkdownContent({ markdown, className = "" }: Props) {
  const html = renderMarkdown(markdown);
  return (
    <div
      className={`prose-cms text-slate-700 dark:text-slate-200 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
