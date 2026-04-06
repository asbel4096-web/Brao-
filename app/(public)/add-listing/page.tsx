"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { ImagePlus, MapPin, Phone, Tag, FileText, CarFront } from "lucide-react";
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

const LIBYA_CITIES = [
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
  "بن وليد",
  "شحات",
  "راس لانوف"
];

type ListingForm = {
  title: string;
  category: string;
  price: string;
  city: string;
  phone: string;
  whatsapp: string;
  sellerName: string;
  description: string;
  year: string;
  mileage: string;
  fuel: string;
  transmission: string;
  address: string;
  mapLink: string;
};

const defaultForm: ListingForm = {
  title: "",
  category: CATEGORY_OPTIONS[0]?.label ?? "سيارات",
  price: "",
  city: "طرابلس",
  phone: "",
  whatsapp: "",
  sellerName: "",
  description: "",
  year: "",
  mileage: "",
  fuel: "بنزين",
  transmission: "أوتوماتيك",
  address: "",
  mapLink: ""
};

export default function AddListingPage() {
  const router = useRouter();
  const [form, setForm] = useState<ListingForm>(defaultForm);
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const previews = useMemo(() => {
    return images.map((file) => URL.createObjectURL(file));
  }, [images]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImagesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const limited = files.slice(0, 20);
    setImages(limited);
    setMessage(files.length > 20 ? "يمكنك رفع 20 صورة كحد أقصى." : "");
  };

  const uploadImages = async (ownerId: string): Promise<string[]> => {
    if (!images.length) return [];

    const uploaded = await Promise.all(
      images.map(async (file, index) => {
        const fileName = `${Date.now()}-${index}-${file.name}`;
        const storageRef = ref(storage, `listing-images/${ownerId}/${fileName}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
      })
    );

    return uploaded;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setMessage("يجب تسجيل الدخول أولًا.");
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
      setMessage("جارٍ نشر الإعلان...");

      const imageUrls = await uploadImages(currentUser.uid);

      await addDoc(collection(db, "listings"), {
        title: form.title.trim(),
        category: form.category,
        price: form.price.trim(),
        city: form.city,
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim() || form.phone.trim(),
        sellerName: form.sellerName.trim(),
        description: form.description.trim(),
        year: form.year.trim(),
        mileage: form.mileage.trim(),
        fuelType: form.fuel.trim(),
        transmission: form.transmission.trim(),
        address: form.address.trim(),
        mapLink: form.mapLink.trim(),
        images: imageUrls,
        ownerId: currentUser.uid,
        ownerEmail: currentUser.email || "",
        ownerPhone: currentUser.phoneNumber || form.phone.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setMessage("تم نشر إعلانك بنجاح، وهو الآن بانتظار اعتماد المشرف.");
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
    <section className="container pb-8">
      <div className="grid gap-5">
        <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <div className="text-right">
              <h1 className="text-3xl font-black text-slate-950 dark:text-white">
                إضافة إعلان
              </h1>
              <p className="mt-2 text-base text-slate-500 dark:text-slate-300">
                أضف إعلانك بشكل مرتب وواضح للمشترين.
              </p>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#2F49C8]/10">
              <CarFront className="h-7 w-7 text-[#2F49C8]" />
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="grid gap-5">
          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              المعلومات الأساسية
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">عنوان الإعلان</label>
                <div className="flex items-center gap-3 rounded-[18px] bg-slate-100 px-4 py-3 dark:bg-slate-800">
                  <Tag className="h-5 w-5 text-slate-500" />
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="مثال: مرسيدس E350 2014"
                    className="w-full bg-transparent text-right outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">القسم</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full rounded-[18px] bg-slate-100 px-4 py-3 text-right outline-none dark:bg-slate-800"
                >
                  {CATEGORY_OPTIONS.map((item) => (
                    <option key={item.value} value={item.label}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">السعر</label>
                <input
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="مثال: 65000"
                  className="w-full rounded-[18px] bg-slate-100 px-4 py-3 text-right outline-none dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">المدينة</label>
                <select
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  className="w-full rounded-[18px] bg-slate-100 px-4 py-3 text-right outline-none dark:bg-slate-800"
                >
                  {LIBYA_CITIES.map((cityName) => (
                    <option key={cityName} value={cityName}>
                      {cityName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">اسم البائع</label>
                <input
                  name="sellerName"
                  value={form.sellerName}
                  onChange={handleChange}
                  placeholder="اسم المعلن"
                  className="w-full rounded-[18px] bg-slate-100 px-4 py-3 text-right outline-none dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">سنة الصنع</label>
                <input
                  name="year"
                  value={form.year}
                  onChange={handleChange}
                  placeholder="2014"
                  className="w-full rounded-[18px] bg-slate-100 px-4 py-3 text-right outline-none dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">العداد</label>
                <input
                  name="mileage"
                  value={form.mileage}
                  onChange={handleChange}
                  placeholder="90000 كم"
                  className="w-full rounded-[18px] bg-slate-100 px-4 py-3 text-right outline-none dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">نوع الوقود</label>
                <input
                  name="fuel"
                  value={form.fuel}
                  onChange={handleChange}
                  placeholder="بنزين"
                  className="w-full rounded-[18px] bg-slate-100 px-4 py-3 text-right outline-none dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">ناقل الحركة</label>
                <input
                  name="transmission"
                  value={form.transmission}
                  onChange={handleChange}
                  placeholder="أوتوماتيك"
                  className="w-full rounded-[18px] bg-slate-100 px-4 py-3 text-right outline-none dark:bg-slate-800"
                />
              </div>
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              التواصل والموقع
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">رقم الهاتف</label>
                <div className="flex items-center gap-3 rounded-[18px] bg-slate-100 px-4 py-3 dark:bg-slate-800">
                  <Phone className="h-5 w-5 text-slate-500" />
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="0912345678"
                    className="w-full bg-transparent text-right outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-500">واتساب</label>
                <input
                  name="whatsapp"
                  value={form.whatsapp}
                  onChange={handleChange}
                  placeholder="0912345678"
                  className="w-full rounded-[18px] bg-slate-100 px-4 py-3 text-right outline-none dark:bg-slate-800"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold text-slate-500">العنوان</label>
                <input
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="مثال: طرابلس - عين زارة"
                  className="w-full rounded-[18px] bg-slate-100 px-4 py-3 text-right outline-none dark:bg-slate-800"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold text-slate-500">رابط موقعك من الخرائط</label>
                <div className="flex items-center gap-3 rounded-[18px] bg-slate-100 px-4 py-3 dark:bg-slate-800">
                  <MapPin className="h-5 w-5 text-slate-500" />
                  <input
                    name="mapLink"
                    value={form.mapLink}
                    onChange={handleChange}
                    placeholder="الصق رابط موقعك من Google Maps"
                    className="w-full bg-transparent text-right outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              وصف الإعلان
            </h2>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-end gap-2 text-sm font-bold text-slate-500">
                <span>اكتب التفاصيل المهمة للمشتري</span>
                <FileText className="h-4 w-4" />
              </div>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={6}
                placeholder="اكتب تفاصيل الإعلان هنا"
                className="w-full rounded-[20px] bg-slate-100 px-4 py-4 text-right outline-none dark:bg-slate-800"
              />
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              صور الإعلان
            </h2>

            <div className="mt-5">
              <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center dark:border-slate-700 dark:bg-slate-800">
                <ImagePlus className="h-10 w-10 text-[#2F49C8]" />
                <span className="mt-3 text-lg font-black text-slate-950 dark:text-white">
                  اضغط لاختيار الصور
                </span>
                <span className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                  يمكنك رفع حتى 20 صورة
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImagesChange}
                  className="hidden"
                />
              </label>

              {images.length > 0 && (
                <p className="mt-4 text-sm font-bold text-slate-600 dark:text-slate-300">
                  عدد الصور المختارة: {images.length}
                </p>
              )}

              {previews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {previews.map((src, index) => (
                    <div
                      key={`${src}-${index}`}
                      className="overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800"
                    >
                      <img
                        src={src}
                        alt={`preview-${index}`}
                        className="h-32 w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {message && (
            <div className="rounded-[20px] bg-slate-100 px-4 py-4 text-center text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-[22px] bg-[#F58233] px-5 py-5 text-lg font-black text-white shadow-[0_14px_30px_rgba(245,130,51,0.26)] disabled:opacity-60"
          >
            {submitting ? "جارٍ نشر الإعلان..." : "نشر إعلانك"}
          </button>
        </form>
      </div>
    </section>
  );
}
