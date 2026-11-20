import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { DeleteAccountPanel } from "./DeleteAccountPanel";

export const metadata: Metadata = {
  title: "حذف الحساب", // القالب في app/layout.tsx يضيف « | براتشو كار»
  description:
    "كيف تحذف حسابك في براتشو كار (Bratsho Car) وبياناتك: من التطبيق أو من الموقع، وما الذي يُحذف وما الذي يُحتفظ به ومدّة ذلك.",
};

/**
 * صفحة عامة لحذف الحساب (شرط Google Play: رابط ويب لطلب حذف الحساب والبيانات).
 * Server component بنفس بنية صفحة الخصوصية؛ زر الطلب نفسه في DeleteAccountPanel (عميل)
 * ويستدعي requestAccountDeletion — نفس دالة الخادم التي يستخدمها التطبيق.
 * المحتوى مطابق لما تفعله الدوال فعلاً (functions/src/account.ts).
 */

interface Section {
  title: string;
  blocks: Array<string | { intro?: string; items: string[]; outro?: string }>;
}

const SECTIONS: Section[] = [
  {
    title: "الطريقة الأولى: من تطبيق براتشو كار",
    blocks: [
      {
        items: [
          "افتح تطبيق براتشو كار وسجّل الدخول بحسابك.",
          "ادخل إلى «الملف الشخصي» ثم «الإعدادات».",
          "من قسم «الحساب والأمان» اختر «حذف الحساب».",
          "اقرأ ما سيُحذف، وفعّل خانة الموافقة، ثم اضغط «طلب حذف الحساب». قد يُطلب منك تأكيد هويتك بتسجيل الدخول من جديد.",
        ],
      },
    ],
  },
  {
    title: "ماذا يحدث بعد الطلب",
    blocks: [
      {
        items: [
          "يُعطَّل حسابك فوراً: يختفي ملفك وإعلاناتك عن الآخرين، ويُسجَّل خروجك من كل الأجهزة.",
          "لديك 30 يوماً للتراجع: سجّل الدخول من تطبيق براتشو كار واضغط «استعادة الحساب».",
          "بعد 30 يوماً يُحذف الحساب نهائياً ولا يمكن استرجاعه.",
          "إن كان في محفظتك رصيد، فحوّله أو اطلب مراجعة الإدارة أولاً؛ لا يُحذف حساب فيه رصيد حتى لا يضيع.",
        ],
      },
    ],
  },
  {
    title: "ما الذي يُحذف نهائياً",
    blocks: [
      {
        items: [
          "ملفك الشخصي: الاسم والصورة والغلاف ورقم الهاتف والبريد والنبذة والمدينة واسم المستخدم، وبيانات المعرض وروابطه وموقعه.",
          "إعلاناتك وصورها، مع تعليقاتها وإعجاباتها وتقييماتها.",
          "قصصك، ومنشوراتك في «منشورات المجتمع» مع تعليقاتها وإعجاباتها.",
          "الصور والفيديو والرسائل الصوتية التي أرسلتها في المحادثات.",
          "مفضّلتك ومتابعاتك ومتابعوك وتنبيهات البحث وإشعاراتك ومواعيدك.",
          "طلبات التوثيق والتمييز واقتراحاتك.",
          "حساب الدخول نفسه (الهاتف أو Google أو اسم المستخدم).",
        ],
      },
    ],
  },
  {
    title: "ما الذي يبقى، ولماذا",
    blocks: [
      {
        items: [
          "نصوص رسائلك تبقى لدى الطرف الآخر في محادثته، ويظهر اسمك «مستخدم محذوف» دون صورة أو بيانات.",
          "تعليقاتك وتقييماتك على إعلانات الآخرين ومنشوراتهم ومعارضهم تبقى نصاً وتقييماً فقط باسم «مستخدم محذوف» ودون صورة، حتى لا تختلّ الردود ومتوسطات التقييم.",
          "السجلات المالية (معاملات المحفظة وطلبات الشحن والسحب وسجل التدقيق) تُحفظ مدة أقصاها 10 سنوات لأغراض محاسبية وقانونية ولمنع الاحتيال.",
          "النسخ الاحتياطية للنظام، إن وُجدت، تُحذف تلقائياً عند انتهاء مدة حفظها.",
        ],
      },
    ],
  },
];

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 ps-5">
      {items.map((item, i) => (
        <li
          key={i}
          className="relative ps-3 before:absolute before:start-0 before:top-3 before:h-1.5 before:w-1.5 before:rounded-full before:bg-brand-500"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function Card({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-950/40">
      <h2 className="mb-3 flex items-baseline gap-2 text-lg font-black text-brand-700 dark:text-brand-300">
        <span className="text-sm tabular-nums text-slate-400 dark:text-slate-500">{n}.</span>
        {title}
      </h2>
      <div className="space-y-3 text-[15px] leading-8 text-slate-700 dark:text-slate-200">{children}</div>
    </section>
  );
}

export default function DeleteAccountPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
          حذف حسابك في براتشو كار
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400" dir="ltr" lang="en">
          Bratsho Car — account and data deletion
        </p>
        <p className="mt-4 text-[15px] leading-8 text-slate-700 dark:text-slate-200">
          تشرح هذه الصفحة كيف تحذف حسابك وبياناتك في تطبيق براتشو كار على Google Play وفي
          موقع bratshocar.com، وما الذي يُحذف وما الذي يُحتفظ به ومدّة ذلك. يمكنك الحذف من
          التطبيق أو من هذه الصفحة مباشرة.
        </p>
      </header>

      <div className="space-y-5">
        {SECTIONS.slice(0, 1).map((s) => (
          <Card key={s.title} n={1} title={s.title}>
            {s.blocks.map((b, i) => (typeof b === "string" ? <p key={i}>{b}</p> : <Bullets key={i} items={b.items} />))}
          </Card>
        ))}

        <Card n={2} title="الطريقة الثانية: من الموقع">
          <p>
            سجّل الدخول في الموقع بنفس الحساب الذي تريد حذفه، ثم اطلب الحذف من هنا. لأمان
            حسابك قد يُطلب منك تسجيل الدخول من جديد قبل التنفيذ.
          </p>
          <DeleteAccountPanel />
        </Card>

        {SECTIONS.slice(1).map((s, idx) => (
          <Card key={s.title} n={idx + 3} title={s.title}>
            {s.blocks.map((b, i) => (typeof b === "string" ? <p key={i}>{b}</p> : <Bullets key={i} items={b.items} />))}
          </Card>
        ))}

        <Card n={SECTIONS.length + 2} title="إن لم تستطع الدخول إلى حسابك">
          <p>
            تواصل معنا من صفحة{" "}
            <Link
              href="/contact"
              className="font-bold text-brand-700 underline-offset-4 hover:underline dark:text-brand-300"
            >
              تواصل معنا
            </Link>{" "}
            واذكر رقم الهاتف أو البريد أو اسم المستخدم المرتبط بالحساب. نتحقق من ملكيتك للحساب
            قبل تنفيذ الحذف.
          </p>
        </Card>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center dark:border-slate-800 dark:bg-slate-950/40">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            راجع أيضًا{" "}
            <Link
              href="/privacy"
              className="font-bold text-brand-700 underline-offset-4 hover:underline dark:text-brand-300"
            >
              سياسة الخصوصية
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
