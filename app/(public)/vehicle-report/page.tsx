"use client";

import { useState } from "react";

type SourceType = "كوريا" | "أمريكا" | "كندا";

export default function VehicleReportPage() {
  const [vin, setVin] = useState("");
  const [source, setSource] = useState<SourceType>("كوريا");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!vin.trim()) return;
    setSubmitted(true);
  };

  return (
    <section className="container py-8">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-[36px] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-6 text-white shadow-2xl md:p-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] bg-white/10 text-4xl backdrop-blur">
              📄
            </div>
            <h1 className="text-4xl font-black md:text-5xl">تقرير المركبة</h1>
            <p className="mt-4 text-lg text-white/75">
              أدخل رقم الهيكل VIN أو كود السيارة، واختر المصدر للحصول على تقرير مبدئي منظم بهوية براتشو كار.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-[30px] border border-white/15 bg-white/10 p-5 backdrop-blur md:p-6"
          >
            <div className="grid gap-4 md:grid-cols-3">
              <button
                type="button"
                onClick={() => setSource("كوريا")}
                className={`rounded-2xl px-4 py-4 text-lg font-black ${
                  source === "كوريا"
                    ? "bg-orange-500 text-white"
                    : "bg-white/10 text-white"
                }`}
              >
                السيارات الكورية
              </button>

              <button
                type="button"
                onClick={() => setSource("أمريكا")}
                className={`rounded-2xl px-4 py-4 text-lg font-black ${
                  source === "أمريكا"
                    ? "bg-orange-500 text-white"
                    : "bg-white/10 text-white"
                }`}
              >
                السيارات الأمريكية
              </button>

              <button
                type="button"
                onClick={() => setSource("كندا")}
                className={`rounded-2xl px-4 py-4 text-lg font-black ${
                  source === "كندا"
                    ? "bg-orange-500 text-white"
                    : "bg-white/10 text-white"
                }`}
              >
                السيارات الكندية
              </button>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-bold text-white/80">
                رقم الهيكل أو كود السيارة
              </label>
              <input
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                placeholder="مثال: KMHE341DBLA123456"
                className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-lg text-white outline-none placeholder:text-white/40"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              className="mt-5 w-full rounded-2xl bg-orange-500 px-5 py-4 text-xl font-black text-white shadow-lg"
            >
              استخراج التقرير
            </button>
          </form>

          {submitted && (
            <div className="mt-8 rounded-[30px] border border-white/15 bg-white/10 p-6 backdrop-blur">
              <h2 className="mb-5 text-3xl font-black">نتيجة التقرير المبدئي</h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="text-sm text-white/60">المصدر</div>
                  <div className="mt-2 text-2xl font-black">{source}</div>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="text-sm text-white/60">الرقم المدخل</div>
                  <div className="mt-2 text-2xl font-black break-all" dir="ltr">
                    {vin}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="text-sm text-white/60">الحالة</div>
                  <div className="mt-2 text-2xl font-black">جاهز للربط</div>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="text-sm text-white/60">ملاحظة</div>
                  <div className="mt-2 text-lg font-bold text-white/85">
                    هذه واجهة احترافية جاهزة الآن، ويمكن ربطها لاحقًا بـ API فعلي لتقرير المركبات.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
