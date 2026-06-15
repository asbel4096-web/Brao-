/**
 * Markdown renderer بسيط وآمن (بدون مكتبة خارجية).
 *
 * يدعم:
 *  - # H1, ## H2, ### H3
 *  - **bold**
 *  - *italic*
 *  - `code`
 *  - [link](url) — فقط http(s) و mailto و tel و / (داخلي)
 *  - - bullet list
 *  - 1. numbered list
 *  - paragraphs (سطور فارغة)
 *  - line breaks (سطر واحد = <br>)
 *
 * لا يدعم:
 *  - HTML inline (يُهرَّب لتجنّب XSS)
 *  - images (الأدمن يضعها كروابط نصية)
 *  - tables (نادر في صفحات CMS قانونية)
 *  - code blocks
 *
 * الفلسفة: نُهرّب كل HTML من المدخل أولاً، ثم نُحوّل markdown patterns
 * إلى HTML tags آمنة. هذا يضمن XSS-safe حتى لو الأدمن (شر) كتب
 * <script> أو attributes خبيثة.
 */

/** HTML-escape: يمنع المدخل من إنشاء tags. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** فحص أن الـURL آمن: نقبل http(s), mailto, tel, مسارات داخلية. */
function isSafeUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.startsWith("/")) return true;
  if (trimmed.startsWith("mailto:")) return true;
  if (trimmed.startsWith("tel:")) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  return false;
}

/** تحويل inline markdown (يطبَّق على كل سطر). */
function renderInline(text: string): string {
  // المدخل هنا مُهرَّب HTML بالفعل (escapeHtml تم قبل الاستدعاء)
  let out = text;

  // `code` (قبل أي شيء آخر لأنه يحوي أحرفاً خاصة)
  out = out.replace(
    /`([^`]+)`/g,
    (_, code) =>
      `<code class="rounded bg-slate-100 px-1.5 py-0.5 text-[0.92em] dark:bg-slate-800">${code}</code>`
  );

  // **bold**
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // *italic*
  out = out.replace(/(?<![*])\*([^*\n]+)\*(?![*])/g, "<em>$1</em>");

  // [text](url) — مع تحقق URL
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (full, label, url) => {
    if (!isSafeUrl(url)) return full; // تجاهل، اتركه كنص
    const safeUrl = url.trim();
    const external = /^https?:/i.test(safeUrl);
    const attrs = external ? ' target="_blank" rel="noopener noreferrer nofollow"' : "";
    return `<a href="${safeUrl}"${attrs} class="text-brand-700 hover:underline dark:text-brand-300">${label}</a>`;
  });

  return out;
}

/**
 * المحوّل الرئيسي - يأخذ markdown ويُرجِع HTML آمن.
 */
export function renderMarkdown(markdown: string): string {
  if (!markdown) return "";

  // 1) escape كل HTML أولاً
  const safe = escapeHtml(markdown);

  // 2) split إلى أسطر للمعالجة block-level
  const lines = safe.split(/\r?\n/);
  const out: string[] = [];

  let inUl = false;
  let inOl = false;
  let paraBuf: string[] = [];

  const flushParagraph = () => {
    if (paraBuf.length === 0) return;
    const text = paraBuf.map((l) => renderInline(l)).join("<br>");
    out.push(`<p class="my-3 leading-7">${text}</p>`);
    paraBuf = [];
  };

  const closeLists = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // سطر فارغ → ينهي الفقرة/القائمة
    if (line.trim() === "") {
      flushParagraph();
      closeLists();
      continue;
    }

    // headings
    const h3 = line.match(/^###\s+(.+)$/);
    const h2 = line.match(/^##\s+(.+)$/);
    const h1 = line.match(/^#\s+(.+)$/);
    if (h3 || h2 || h1) {
      flushParagraph();
      closeLists();
      if (h1)
        out.push(
          `<h1 class="mt-6 mb-3 text-2xl font-black text-slate-900 dark:text-white">${renderInline(h1[1])}</h1>`
        );
      else if (h2)
        out.push(
          `<h2 class="mt-5 mb-2 text-xl font-black text-slate-900 dark:text-white">${renderInline(h2[1])}</h2>`
        );
      else
        out.push(
          `<h3 class="mt-4 mb-2 text-lg font-black text-slate-900 dark:text-white">${renderInline(h3![1])}</h3>`
        );
      continue;
    }

    // bullet list
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      if (inOl) {
        out.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        out.push('<ul class="my-3 list-disc space-y-1 ps-6">');
        inUl = true;
      }
      out.push(`<li>${renderInline(bullet[1])}</li>`);
      continue;
    }

    // numbered list
    const numbered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (numbered) {
      flushParagraph();
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        out.push('<ol class="my-3 list-decimal space-y-1 ps-6">');
        inOl = true;
      }
      out.push(`<li>${renderInline(numbered[1])}</li>`);
      continue;
    }

    // سطر عادي → فقرة
    closeLists();
    paraBuf.push(line);
  }

  flushParagraph();
  closeLists();

  return out.join("\n");
}
