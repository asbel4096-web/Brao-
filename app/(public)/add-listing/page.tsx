"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db, storage } from "@/lib/firebase";
import { libyaCities, listingCategories } from "@/lib/categories";

type FormState = {
  title: string;
  category: string;
  price: string;
  city: string;
  address: string;
  mapLink: string;
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
  address: "",
  mapLink: "",
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
    return () => nextPreviews.forEach((url) => URL.revokeObjectURL(url));
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

    const invalidFile = fileList.find((file) => !file.type.startsWith("image/") || file.size > MAX_IMAGE_SIZE);
    if (invalidFile) {
      setErrorMessage("كل الملفات يجب أن تكون صورًا وأقل من 10 ميجابايت للصورة الواحدة.");
      e.target.value = "";
      return;
    }

    setImages(fileList);
  };

  const normalizedWhatsapp = useMemo(() => {
    return (form.whatsapp || form.phone || "").replace(/\s+/g, "").replace(/^0/, "218");
  }, [form.whatsapp, form.phone]);

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
    return Promise.all(
      images.map(async (file, index) => {
        const safeName = file.name.replace(/\s+/g, "-");
        const fileRef = ref(storage, `listing-images/${uid}/${Date.now()}-${index + 1}-${safeName}`);
        await uploadBytes(fileRef, file, { contentType: file.type });
        return getDownloadURL(fileRef);
      })
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!currentUser) {
      setErrorMessage("يجب تسجيل الدخول أولًا حتى تتمكن من إضافة إعلان.");
      return;
    }
    if (!form.title.trim() || !form.price.trim() || !form.phone.trim() || !form.description.trim()) {
      setErrorMessage("يرجى تعبئة عنوان الإعلان والسعر والهاتف والوصف.");
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
        address: form.address.trim(),
        mapLink: form.mapLink.trim(),
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
        status: "pending",
        featured: false,
        views: 0,
        images: imageUrls,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setSuccessMessage("تم نشر إعلانك بنجاح، وهو الآن بانتظار اعتماد المشرف.");
      resetForm();
      setTimeout(() => router.push("/my-listings"), 900);
    } catch (error) {
      console.error("Add listing error:", error);
      setErrorMessage("حدث خطأ أثناء حفظ الإعلان. تأكد من القواعد وإعدادات Firebase.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <section className="container py-10"><div className="card p-6 text-center">جارٍ تجهيز الصفحة...</div></section>;
  }

  if (!currentUser) {
    return (
      <section className="container py-10">
        <div className="mx-auto max-w-3xl card p-8 text-center">
          <h1 className="section-title">إضافة إعلان</h1>
          <p className="section-subtitle mt-3">يجب تسجيل الدخول أولًا عبر Google أو رقم الهاتف حتى تستطيع إضافة إعلان جديد.</p>
          <button type="button" className="btn-primary mt-6" onClick={() => router.push("/profile")}>الذهاب إلى تسجيل الدخول</button>
        </div>
      </section>
    );
  }

  return (
    <section className="container py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="section-title">إضافة إعلان جديد</h1>
          <p className="section-subtitle">أضف صورك وبيانات المركبة وأرفق رابط موقعك من الخرائط لتسهيل الوصول.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card p-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">عنوان الإعلان</label>
                <input className="input" value={form.title} onChange={(e) => handleChange("title", e.target.value)} placeholder="مثال: هونداي سبورتاج 2020" />
              </div>
              <div>
                <label className="label">القسم</label>
                <select className="input" value={form.category} onChange={(e) => handleChange("category", e.target.value)}>
                  {listingCategories.map((category) => <option key={category}>{category}</option>)}
                </select>
              </div>
              <div>
                <label className="label">السعر</label>
                <input className="input" value={form.price} onChange={(e) => handleChange("price", e.target.value)} placeholder="65000" />
              </div>
              <div>
                <label className="label">المدينة</label>
                <select className="input" value={form.city} onChange={(e) => handleChange("city", e.target.value)}>
                  {libyaCities.map((city) => <option key={city}>{city}</option>)}
                </select>
              </div>
              <div>
                <label className="label">اسم المعلن</label>
                <input className="input" value={form.sellerName} onChange={(e) => handleChange("sellerName", e.target.value)} placeholder="اسمك أو اسم الورشة" />
              </div>
              <div>
                <label className="label">رقم الهاتف</label>
                <input className="input" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="0912345678" />
              </div>
              <div>
                <label className="label">واتساب</label>
                <input className="input" value={form.whatsapp} onChange={(e) => handleChange("whatsapp", e.target.value)} placeholder="0912345678" />
              </div>
              <div>
                <label className="label">العنوان المختصر</label>
                <input className="input" value={form.address} onChange={(e) => handleChange("address", e.target.value)} placeholder="طرابلس - عين زارة" />
              </div>
              <div>
                <label className="label">سنة الصنع</label>
                <input className="input" value={form.year} onChange={(e) => handleChange("year", e.target.value)} placeholder="2020" />
              </div>
              <div>
                <label className="label">المسافة المقطوعة</label>
                <input className="input" value={form.mileage} onChange={(e) => handleChange("mileage", e.target.value)} placeholder="120000" />
              </div>
              <div>
                <label className="label">نوع الوقود</label>
                <input className="input" value={form.fuel} onChange={(e) => handleChange("fuel", e.target.value)} placeholder="بنزين" />
              </div>
              <div>
                <label className="label">ناقل الحركة</label>
                <input className="input" value={form.transmission} onChange={(e) => handleChange("transmission", e.target.value)} placeholder="أوتوماتيك" />
              </div>
            </div>

            <div>
              <label className="label">تفاصيل الإعلان</label>
              <textarea className="input min-h-[170px] resize-y" value={form.description} onChange={(e) => handleChange("description", e.target.value)} placeholder="اكتب المواصفات، الحالة، المميزات، العيوب، وأي معلومات مهمة للمشتري." />
            </div>

            <div>
              <label className="label">رابط موقعك من الخرائط</label>
              <input className="input" value={form.mapLink} onChange={(e) => handleChange("mapLink", e.target.value)} placeholder="الصق رابط Google Maps أو OpenStreetMap" />
            </div>
          </div>

          <div className="card p-6 space-y-5">
            <div>
              <label className="label">صور الإعلان (حتى 20 صورة)</label>
              <input type="file" accept="image/*" multiple onChange={handleImageChange} className="input file:ml-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-bold" />
              <div className="mt-3 text-sm text-slate-500">عدد الصور المختارة: <span className="font-black text-slate-800">{images.length}</span></div>
            </div>

            {imagePreviews.length ? (
              <div className="grid grid-cols-2 gap-3">
                {imagePreviews.map((image, index) => (
                  <div key={`${image}-${index}`} className="overflow-hidden rounded-3xl border border-slate-200">
                    <img src={image} alt={`preview-${index}`} className="h-36 w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : null}

            {successMessage ? <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">{successMessage}</div> : null}
            {errorMessage ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{errorMessage}</div> : null}

            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="btn-secondary" onClick={resetForm}>مسح الحقول</button>
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'جارٍ النشر...' : 'نشر إعلانك'}</button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
