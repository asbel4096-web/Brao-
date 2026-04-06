"use client";

import { useMemo, useState } from "react";

type SourceType = "كوريا" | "أمريكا" | "كندا";

type ReportCard = {
  label: string;
  value: string;
};

export default function VehicleReportPage() {
  const [vin, setVin] = useState("");
  const [source, setSource] = useState<SourceType>("كوريا");
  const [submitted, setSubmitted] = useState(false);

  const reportData = useMemo<ReportCard[]>(() => {
    const normalizedVin = vin.trim().toUpperCase();

    return [
      { label: "المصدر", value: source },
      { label: "رقم الهيكل / الكود", value: normalizedVin || "—" },
      { label: "الحالة", value: "تقرير مبدئي جاهز" },
      { label: "الربط", value: "جاهز للربط مع API" },
      { label: "ملاحظات", value: "يمكن لاحقًا إظهار الحوادث، العداد، الصور، وسجل الملكية." },
      { label: "هوية العرض", value: "براتشو كار" }
    ];
  }, [vin, source]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!vin.trim()) return;
    setSubmitted(true);
  };

  return (
    <section className="container py-8">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[36px] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 text-white shadow-2xl">
        <div className="grid gap-8 p-6 md:grid-cols-[1.1fr_0.9fr] md:p-10">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white/80 backdrop-blur">
              تقرير المركبة • براتشو كار
            </div>

            <h1 className="text-4xl font-black leading-tight md:text-6xl">
              تقرير مركبة
              <br />
              احترافي وواضح
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/75">
              أدخل رقم الهيكل VIN أو كود المركبة، واختر مصدر السيارة للحصول على
              تقرير مبدئي أنيق ومنظم. هذه الواجهة جاهزة الآن ويمكن ربطها لاحقًا
              مع خدمات فعلية للسيارات الكورية والأمريكية والكندية.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="text-sm text-white/60">دعم المصادر</div>
                <div className="mt-2 text-2xl font-black">3</div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="text-sm text-white/60">واجهة احترافية</div>
                <div className="mt-2 text-2xl font-black">جاهزة</div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="text-sm text-white/60">قابلية الربط</div>
                <div className="mt-2 text-2xl font-black">API Ready</div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/10 p-5 shadow-xl backdrop-blur md:p-6">
            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label className="mb-3 block text-sm font-bold text-white/75">
                  اختر مصدر التقرير
                </label>

                <div className="grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setSource("كوريا")}
                    className={`rounded-2xl px-4 py-4 text-base font-black transition ${
                      source === "كوريا"
                        ? "bg-orange-500 text-white shadow-lg"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    السيارات الكورية
                  </button>

                  <button
                    type="button"
                    onClick={() => setSource("أمريكا")}
                    className={`rounded-2xl px-4 py-4 text-base font-black transition ${
                      source === "أمريكا"
                        ? "bg-orange-500 text-white shadow-lg"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    السيارات الأمريكية
                  </button>

                  <button
                    type="button"
                    onClick={() => setSource("كندا")}
                    className={`rounded-2xl px-4 py-4 text-base font-black transition ${
                      source === "كندا"
                        ? "bg-orange-500 text-white shadow-lg"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    السيارات الكندية
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm font-bold text-white/75">
                  رقم الهيكل أو كود المركبة
                </label>
                <input
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  placeholder="مثال: KMHE341DBLA123456"
                  dir="ltr"
                  className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-lg text-white outline-none placeholder:text-white/35"
                />
              </div>

              <button
                type="submit"
                className="mt-5 w-full rounded-2xl bg-orange-500 px-5 py-4 text-xl font-black text-white shadow-lg"
              >
                استخراج التقرير
              </button>

              <p className="mt-4 text-center text-sm text-white/55">
                هذه النسخة تعرض تقريرًا مبدئيًا، ويمكن ربطها لاحقًا ببيانات حقيقية.
              </p>
            </form>
          </div>
        </div>

        {submitted && (
          <div className="border-t border-white/10 bg-white/5 p-6 md:p-10">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-3xl font-black">نتيجة التقرير</h2>
                <p className="mt-2 text-white/70">
                  تم تجهيز تقرير مبدئي بناءً على البيانات المدخلة.
                </p>
              </div>

              <div className="inline-flex rounded-full border border-green-400/20 bg-green-500/10 px-4 py-2 text-sm font-bold text-green-300">
                جاهز للعرض
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reportData.map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur"
                >
                  <div className="text-sm text-white/55">{item.label}</div>
                  <div className="mt-3 break-words text-2xl font-black leading-9">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/10 p-5 text-white/80">
              <div className="text-lg font-black">ما الذي يمكن إضافته لاحقًا؟</div>
              <div className="mt-3 leading-8">
                ربط فعلي مع مزود تقارير مركبات، عرض الحوادث، تاريخ التصدير،
                قراءة العداد، الصور السابقة، بيانات المزاد، وسجل الملكية.
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
