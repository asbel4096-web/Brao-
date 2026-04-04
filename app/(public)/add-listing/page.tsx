"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  getDownloadURL,
  ref,
  uploadBytes
} from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";

type CategoryOption = {
  label: string;
  value: string;
};

const CATEGORY_OPTIONS: CategoryOption[] = [
  { label: "سيارات", value: "cars" },
  { label: "حافلات", value: "buses" },
  { label: "شاحنات", value: "trucks" },
  { label: "خدمات", value: "services" },
  { label: "كماليات سيارات", value: "accessories" },
  { label: "زيوت ومواد مضافة", value: "oils_additives" },
  { label: "ميكانيكي متنقل", value: "mobile_mechanic" },
  { label: "إطارات وجنوط", value: "tires_wheels" },
  { label: "قطع غيار سيارات وشاحنات", value: "parts_cars_trucks" },
  { label: "قطع غيار كهربائية", value: "electrical_parts" },
  { label: "سمكرة وزواق", value: "body_paint" },
  { label: "ورش ميكانيكا", value: "mechanic_workshops" },
  { label: "فني كهربائي سيارات", value: "auto_electrician" },
  { label: "سيارات بها حوادث", value: "damaged_cars" },
  { label: "قطع غيار مستعملة", value: "used_parts" }
];

const LIBYA_CITIES: string[] = [
  "طرابلس",
  "بنغازي",
  "مصراتة",
  "الزاوية",
  "زليتن",
  "صبراتة",
  "صرمان",
  "جنزور",
  "الخمس",
  "ترهونة",
  "غريان",
  "يفرن",
  "نالوت",
  "زوارة",
  "رقدالين",
  "العجيلات",
  "الجبل الغربي",
  "سرت",
  "إجدابيا",
  "المرج",
  "البيضاء",
  "درنة",
  "طبرق",
  "سبها",
  "أوباري",
  "مرزق",
  "غات",
  "الكفرة",
  "هون",
  "ودان",
  "براك الشاطئ",
  "البوانيس",
  "الشويرف",
  "بن وليد",
  "القيقب",
  "شحات",
  "سلوق",
  "توكرة",
  "أجدابيا",
  "راس لانوف"
];

type ListingForm = {
  title: string;
  category: string;
  price: string;
  city: string;
  phone: string;
  description: string;
  year: string;
  mileage: string;
  fuelType: string;
  transmission: string;
  address: string;
};

const defaultForm: ListingForm = {
  title: "",
  category: CATEGORY_OPTIONS[0]?.label ?? "سيارات",
  price: "",
  city: "طرابلس",
  phone: "",
  description: "",
  year: "",
  mileage: "",
  fuelType: "",
  transmission: "",
  address: ""
};

export default function AddListingPage() {
  const router = useRouter();
  const [form, setForm] = useState<ListingForm>(defaultForm);
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const imagePreviews = useMemo(() => {
    return images.map((file) => URL.createObjectURL(file));
  }, [images]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImagesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const pickedFiles = Array.from(e.target.files || []);
    const limitedFiles = pickedFiles.slice(0, 20);
    setImages(limitedFiles);

    if (pickedFiles.length > 20) {
      setMessage("يمكنك رفع 20 صورة كحد أقصى.");
    } else {
      setMessage("");
    }
  };

  const uploadImages = async (ownerId: string): Promise<string[]> => {
    if (!images.length) return [];

    const uploads = images.map(async (file, index) => {
      const fileName = `${Date.now()}-${index}-${file.name}`;
      const storageRef = ref(storage, `listing-images/${ownerId}/${fileName}`);
      await uploadBytes(storageRef, file);
      return getDownloadURL(storageRef);
    });

    return Promise.all(uploads);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setMessage("يجب تسجيل الدخول أولًا قبل إضافة الإعلان.");
      return;
    }

    if (!form.title.trim()) {
      setMessage("اكتب عنوان الإعلان.");
      return;
    }

    if (!form.price.trim()) {
      setMessage("اكتب السعر.");
      return;
    }

    if (!form.phone.trim()) {
      setMessage("اكتب رقم الهاتف.");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("جارٍ رفع الإعلان...");

      const imageUrls = await uploadImages(currentUser.uid);

      await addDoc(collection(db, "listings"), {
        title: form.title.trim(),
        category: form.category,
        price: form.price.trim(),
        city: form.city,
        phone: form.phone.trim(),
        description: form.description.trim(),
        year: form.year.trim(),
        mileage: form.mileage.trim(),
        fuelType: form.fuelType.trim(),
        transmission: form.transmission.trim(),
        address: form.address.trim(),
        images: imageUrls,
        ownerId: currentUser.uid,
        ownerEmail: currentUser.email || "",
        ownerPhone: currentUser.phoneNumber || form.phone.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setMessage("تم إرسال الإعلان بنجاح، وهو الآن بانتظار اعتماد المشرف.");
      setForm(defaultForm);
      setImages([]);

      setTimeout(() => {
        router.push("/my-listings");
      }, 1200);
    } catch (error) {
      console.error("Add listing error:", error);
      setMessage("حدث خطأ أثناء حفظ الإعلان.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="container py-8">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900">إضافة إعلان</h1>
          <p className="mt-2 text-slate-500">
            أضف إعلانك بشكل احترافي مع صور متعددة وبيانات واضحة.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">
                عنوان الإعلان
              </label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="مثال: مرسيدس E350 2014"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">
                القسم
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.label}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">
                السعر
              </label>
              <input
                name="price"
                value={form.price}
                onChange={handleChange}
                placeholder="مثال: 65000"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">
                المدينة
              </label>
              <select
                name="city"
                value={form.city}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              >
                {LIBYA_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">
                رقم الهاتف
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="مثال: 0912345678"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">
                سنة الصنع
              </label>
              <input
                name="year"
                value={form.year}
                onChange={handleChange}
                placeholder="مثال: 2014"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">
                العداد
              </label>
              <input
                name="mileage"
                value={form.mileage}
                onChange={handleChange}
                placeholder="مثال: 90000 كم"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">
                نوع الوقود
              </label>
              <input
                name="fuelType"
                value={form.fuelType}
                onChange={handleChange}
                placeholder="مثال: بنزين"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">
                ناقل الحركة
              </label>
              <input
                name="transmission"
                value={form.transmission}
                onChange={handleChange}
                placeholder="مثال: أوتوماتيك"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">
                العنوان التفصيلي
              </label>
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="مثال: طرابلس - عين زارة"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-600">
              وصف الإعلان
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="اكتب تفاصيل الإعلان هنا"
              rows={5}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-600">
              صور الإعلان (حتى 20 صورة)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImagesChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
            />

            {images.length > 0 ? (
              <p className="mt-3 text-sm font-bold text-slate-600">
                عدد الصور المختارة: {images.length}
              </p>
            ) : null}

            {imagePreviews.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {imagePreviews.map((src, index) => (
                  <div
                    key={`${src}-${index}`}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                  >
                    <img
                      src={src}
                      alt={`preview-${index}`}
                      className="h-32 w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {message ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-blue-600 px-5 py-4 text-lg font-black text-white disabled:opacity-60"
          >
            {submitting ? "جارٍ حفظ الإعلان..." : "إرسال الإعلان للموافقة"}
          </button>
        </form>
      </div>
    </section>
  );
}
