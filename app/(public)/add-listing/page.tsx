"use client";

import { FormEvent, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

type FormState = {
  title: string;
  category: string;
  price: string;
  city: string;
  description: string;
  phone: string;
  sellerName: string;
};

const initialState: FormState = {
  title: "",
  category: "سيارات",
  price: "",
  city: "طرابلس",
  description: "",
  phone: "",
  sellerName: ""
};

export default function AddListingPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (
    field: keyof FormState,
    value: string
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!form.title.trim()) {
      setErrorMessage("يرجى إدخال عنوان الإعلان.");
      return;
    }

    if (!form.price.trim()) {
      setErrorMessage("يرجى إدخال السعر.");
      return;
    }

    if (!form.phone.trim()) {
      setErrorMessage("يرجى إدخال رقم الهاتف.");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "listings"), {
        title: form.title.trim(),
        category: form.category,
        price: Number(form.price) || form.price,
        city: form.city,
        description: form.description.trim(),
        phone: form.phone.trim(),
        sellerName: form.sellerName.trim(),
        status: "pending",
        featured: false,
        views: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setForm(initialState);
      setSuccessMessage("تم إرسال الإعلان بنجاح، وهو الآن بانتظار اعتماد المشرف.");
    } catch (error) {
      console.error("Error adding listing:", error);
      setErrorMessage("حدث خطأ أثناء حفظ الإعلان. تأكد من إعدادات Firebase وFirestore.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="container py-10">
      <div className="mx-auto max-w-4xl">
        <div>
          <h1 className="section-title">إضافة إعلان جديد</h1>
          <p className="section-subtitle">
            النموذج منظم ليدعم لاحقًا رفع حتى 20 صورة، حفظ البيانات في Firestore،
            واعتماد المشرف.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card mt-6 p-6 sm:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="label">عنوان الإعلان</label>
              <input
                className="input"
                placeholder="مثال: هونداي أزيرا 2012 فل الفل"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
              />
            </div>

            <div>
              <label className="label">القسم</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => handleChange("category", e.target.value)}
              >
                <option>سيارات</option>
                <option>قطع غيار</option>
                <option>كماليات</option>
                <option>خدمات</option>
              </select>
            </div>

            <div>
              <label className="label">السعر</label>
              <input
                className="input"
                type="number"
                placeholder="أدخل السعر"
                value={form.price}
                onChange={(e) => handleChange("price", e.target.value)}
              />
            </div>

            <div>
              <label className="label">المدينة</label>
              <select
                className="input"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
              >
                <option>طرابلس</option>
                <option>بنغازي</option>
                <option>مصراتة</option>
                <option>الزاوية</option>
                <option>زليتن</option>
                <option>سبها</option>
                <option>الخمس</option>
                <option>سرت</option>
              </select>
            </div>

            <div>
              <label className="label">اسم البائع</label>
              <input
                className="input"
                placeholder="اسم البائع"
                value={form.sellerName}
                onChange={(e) => handleChange("sellerName", e.target.value)}
              />
            </div>

            <div>
              <label className="label">رقم الهاتف</label>
              <input
                className="input"
                placeholder="0910000000"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="label">الوصف</label>
            <textarea
              className="input min-h-[140px]"
              placeholder="اكتب تفاصيل الإعلان هنا"
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>

          {successMessage ? (
            <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {successMessage}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "جارٍ حفظ الإعلان..." : "نشر الإعلان"}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setForm(initialState);
                setSuccessMessage("");
                setErrorMessage("");
              }}
              disabled={loading}
            >
              مسح الحقول
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
connect add listing to firestore
