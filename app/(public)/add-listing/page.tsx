"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  getDoc
} from "firebase/firestore";
import {
  getDownloadURL,
  ref,
  uploadBytes
} from "firebase/storage";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db, storage } from "@/lib/firebase";

type FormState = {
  title: string;
  category: string;
  price: string;
  city: string;
  description: string;
  phone: string;
  sellerName: string;
  whatsapp: string;
  year: string;
  mileage: string;
  fuel: string;
  transmission: string;
};

const initialState: FormState = {
  title: "",
  category: "سيارات",
  price: "",
  city: "طرابلس",
  description: "",
  phone: "",
  sellerName: "",
  whatsapp: "",
  year: "",
  mileage: "",
  fuel: "بنزين",
  transmission: "أوتوماتيك"
};

const MAX_IMAGES = 20;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export default function AddListingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [form, setForm] = useState<FormState>(initialState);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          const dbUser = userSnap.exists() ? userSnap.data() : null;

          setForm((prev) => ({
            ...prev,
            sellerName: dbUser?.name || user.displayName || prev.sellerName,
            phone: dbUser?.phone || user.phoneNumber || prev.phone,
            whatsapp: dbUser?.phone || user.phoneNumber || prev.whatsapp
          }));
        } catch (error) {
          console.error("Load current user data error:", error);
        }
      }

      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const nextPreviews = images.map((file) => URL.createObjectURL(file));
    setImagePreviews(nextPreviews);

    return () => {
      nextPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files || []);
    setSuccessMessage("");
    setErrorMessage("");

    if (!fileList.length) return;

    if (fileList.length > MAX_IMAGES) {
      setErrorMessage(`يمكنك رفع حتى ${MAX_IMAGES} صورة فقط.`);
      e.target.value = "";
      return;
    }

    const invalidFile = fileList.find(
      (file) => !file.type.startsWith("image/") || file.size > MAX_IMAGE_SIZE
    );

    if (invalidFile) {
      setErrorMessage("كل الملفات يجب أن تكون صورًا وأقل من 10 ميجابايت للصورة الواحدة.");
      e.target.value = "";
      return;
    }

    setImages(fileList);
  };

  const normalizedWhatsapp = useMemo(() => {
    return form.whatsapp.replace(/\s+/g, "").replace(/^0/, "218");
  }, [form.whatsapp]);

  const resetForm = () => {
    setForm((prev) => ({
      ...initialState,
      sellerName: prev.sellerName,
      phone: prev.phone,
      whatsapp: prev.whatsapp
    }));
    setImages([]);
    setSuccessMessage("");
    setErrorMessage("");
  };

  const uploadImages = async (uid: string) => {
    if (!images.length) return [] as string[];

    const urls = await Promise.all(
      images.map(async (file, index) => {
        const safeName = file.name.replace(/\s+/g, "-");
        const fileRef = ref(
          storage,
          `listing-images/${uid}/${Date.now()}-${index + 1}-${safeName}`
        );
        await uploadBytes(fileRef, file, { contentType: file.type });
        return getDownloadURL(fileRef);
      })
    );

    return urls;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!currentUser) {
      setErrorMessage("يجب تسجيل الدخول أولًا حتى تتمكن من إضافة إعلان.");
      return;
    }

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

    if (!form.description.trim()) {
      setErrorMessage("يرجى إدخال وصف الإعلان.");
      return;
    }

    try {
      setLoading(true);

      const imageUrls = await uploadImages(currentUser.uid);

      await addDoc(collection(db, "listings"), {
        title: form.title.trim(),
        category: form.category,
        price: Number(form.price) || form.price,
        city: form.city,
        description: form.description.trim(),
        phone: form.phone.trim(),
        sellerName: form.sellerName.trim() || currentUser.displayName || "مستخدم براتشو كار",
        whatsapp: normalizedWhatsapp,
        year: form.year ? Number(form.year) : null,
        mileage: form.mileage ? Number(form.mileage) : null,
        fuel: form.fuel,
        transmission: form.transmission,
        ownerId: currentUser.uid,
        ownerEmail: currentUser.email || "",
        status: "approved",
        featured: false,
        views: 0,
        images: imageUrls,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      resetForm();
      setSuccessMessage("تم نشر الإعلان بنجاح وظهر الآن في صفحة الإعلانات.");
      setTimeout(() => router.push("/listings"), 1200);
    } catch (error) {
      console.error("Error adding listing:", error);
      setErrorMessage("حدث خطأ أثناء حفظ الإعلان أو رفع الصور. تأكد من قواعد Storage وFirestore.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <section className="container py-10">
        <div className="card p-6 text-center text-slate-500">جارٍ تحميل الصفحة...</div>
      </section>
    );
  }

  if (!currentUser) {
    return (
      <section className="container py-10">
        <div className="mx-auto max-w-3xl card p-8 text-center">
          <h1 className="section-title">إضافة إعلان</h1>
          <p className="section-subtitle mt-3">
            يجب تسجيل الدخول أولًا عبر Google أو رقم الهاتف حتى تستطيع إضافة إعلان جديد.
          </p>
          <button
            type="button"
            className="btn btn-primary mt-6"
            onClick={() => router.push("/profile")}
          >
            الذهاب إلى تسجيل الدخول
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="container py-10">
      <div className="mx-auto max-w-5xl">
        <div>
          <h1 className="section-title">إضافة إعلان جديد</h1>
          <p className="section-subtitle">
            أضف إعلانك الآن مع الصور، وسيُحفظ مباشرة في Firebase ويظهر في صفحة الإعلانات.
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

            <div>
              <label className="label">واتساب</label>
              <input
                className="input"
                placeholder="0910000000 أو 218910000000"
                value={form.whatsapp}
                onChange={(e) => handleChange("whatsapp", e.target.value)}
              />
            </div>

            <div>
              <label className="label">سنة الصنع</label>
              <input
                className="input"
                type="number"
                placeholder="2018"
                value={form.year}
                onChange={(e) => handleChange("year", e.target.value)}
              />
            </div>

            <div>
              <label className="label">المسافة المقطوعة</label>
              <input
                className="input"
                type="number"
                placeholder="87000"
                value={form.mileage}
                onChange={(e) => handleChange("mileage", e.target.value)}
              />
            </div>

            <div>
              <label className="label">نوع الوقود</label>
              <select
                className="input"
                value={form.fuel}
                onChange={(e) => handleChange("fuel", e.target.value)}
              >
                <option>بنزين</option>
                <option>ديزل</option>
                <option>كهرباء</option>
                <option>هايبرد</option>
              </select>
            </div>

            <div>
              <label className="label">ناقل الحركة</label>
              <select
                className="input"
                value={form.transmission}
                onChange={(e) => handleChange("transmission", e.target.value)}
              >
                <option>أوتوماتيك</option>
                <option>عادي</option>
                <option>Tiptronic</option>
              </select>
            </div>
          </div>

          <div className="mt-5">
            <label className="label">وصف الإعلان</label>
            <textarea
              className="input min-h-[140px]"
              placeholder="اكتب تفاصيل الإعلان هنا"
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>

          <div className="mt-5">
            <label className="label">صور الإعلان (حتى 20 صورة)</label>
            <input
              className="input cursor-pointer py-3"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
            />
            <p className="mt-2 text-sm text-slate-500">
              يمكنك رفع حتى 20 صورة، وبحد أقصى 10 ميجابايت للصورة الواحدة.
            </p>

            {imagePreviews.length ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {imagePreviews.map((preview, index) => (
                  <div key={`${preview}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="h-32 w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : null}
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
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "جارٍ حفظ الإعلان ورفع الصور..." : "نشر الإعلان"}
            </button>

            <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={loading}>
              مسح الحقول
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
