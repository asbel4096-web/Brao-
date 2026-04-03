"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GeoPoint,
  addDoc,
  collection,
  serverTimestamp
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { LocateFixed, MapPinned } from "lucide-react";
import { LIBYA_CITIES } from "@/lib/libya-cities";

type FormState = {
  title: string;
  category: string;
  price: string;
  city: string;
  description: string;
  phone: string;
  sellerName: string;
  whatsapp: string;
  address: string;
  latitude: string;
  longitude: string;
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
  address: "",
  latitude: "32.8872",
  longitude: "13.1913"
};

const DEFAULT_CENTER = {
  lat: 27.0,
  lng: 17.0
};

function createMapEmbedUrl(latitude: number, longitude: number) {
  const offset = 0.08;
  const left = longitude - offset;
  const right = longitude + offset;
  const top = latitude + offset;
  const bottom = latitude - offset;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

export default function AddListingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [detectingLocation, setDetectingLocation] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        setForm((prev) => ({
          ...prev,
          sellerName: prev.sellerName || currentUser.displayName || "",
          phone: prev.phone || currentUser.phoneNumber || "",
          whatsapp: prev.whatsapp || currentUser.phoneNumber || ""
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectedLat = Number(form.latitude);
  const selectedLng = Number(form.longitude);
  const hasValidCoordinates = Number.isFinite(selectedLat) && Number.isFinite(selectedLng);

  const mapEmbedUrl = useMemo(() => {
    if (hasValidCoordinates) {
      return createMapEmbedUrl(selectedLat, selectedLng);
    }
    return createMapEmbedUrl(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
  }, [hasValidCoordinates, selectedLat, selectedLng]);

  const handleUseCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setErrorMessage("المتصفح لا يدعم تحديد الموقع الحالي.");
      return;
    }

    setDetectingLocation(true);
    setErrorMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }));
        setDetectingLocation(false);
      },
      () => {
        setDetectingLocation(false);
        setErrorMessage("تعذر تحديد موقعك الحالي. يمكنك إدخال الإحداثيات يدويًا.");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!user) {
      setErrorMessage("يجب تسجيل الدخول أولًا قبل إضافة إعلان.");
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

    if (!form.city.trim()) {
      setErrorMessage("يرجى اختيار المدينة.");
      return;
    }

    if (!hasValidCoordinates) {
      setErrorMessage("يرجى تحديد موقع الإعلان على الخريطة أو إدخال الإحداثيات.");
      return;
    }

    try {
      setLoading(true);

      const normalizedPhone = form.phone.trim();
      const normalizedWhatsapp = form.whatsapp.trim() || normalizedPhone;

      await addDoc(collection(db, "listings"), {
        title: form.title.trim(),
        category: form.category,
        price: Number(form.price) || form.price,
        city: form.city,
        description: form.description.trim(),
        phone: normalizedPhone,
        sellerPhone: normalizedPhone,
        whatsapp: normalizedWhatsapp,
        sellerName: form.sellerName.trim() || user.displayName || "مستخدم براتشو كار",
        address: form.address.trim(),
        latitude: selectedLat,
        longitude: selectedLng,
        location: new GeoPoint(selectedLat, selectedLng),
        mapUrl: `https://www.google.com/maps?q=${selectedLat},${selectedLng}`,
        ownerId: user.uid,
        ownerEmail: user.email || "",
        ownerPhone: user.phoneNumber || normalizedPhone,
        status: "approved",
        featured: false,
        views: 0,
        images: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setForm({
        ...initialState,
        sellerName: user.displayName || "",
        phone: user.phoneNumber || "",
        whatsapp: user.phoneNumber || ""
      });
      setSuccessMessage("تم نشر الإعلان بنجاح مع حفظ المدينة والموقع على الخريطة.");
      setTimeout(() => router.push("/listings"), 1200);
    } catch (error) {
      console.error("Error adding listing:", error);
      setErrorMessage("حدث خطأ أثناء حفظ الإعلان. تأكد من إعدادات Firebase وFirestore.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <section className="container py-10">
        <div className="card p-6 text-center text-slate-500">جارٍ التحقق من الحساب...</div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="container py-10">
        <div className="mx-auto max-w-3xl card p-8 text-center">
          <h1 className="section-title">إضافة إعلان جديد</h1>
          <p className="section-subtitle mt-3">يجب تسجيل الدخول أولًا حتى تتمكن من إضافة إعلان وحفظ موقعك على الخريطة.</p>
          <button onClick={() => router.push('/profile')} className="btn btn-primary mt-6">
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
            اختر المدينة من جميع مدن ليبيا، ثم حدّد موقع المعلن على الخريطة ليظهر مكانه بشكل أوضح داخل الإعلان.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card mt-6 p-6 sm:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="label">عنوان الإعلان</label>
              <input
                className="input"
                placeholder="مثال: مرسيدس E350 موديل 2014"
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
                {LIBYA_CITIES.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">اسم المعلن</label>
              <input
                className="input"
                placeholder="اسم المعلن"
                value={form.sellerName}
                onChange={(e) => handleChange("sellerName", e.target.value)}
              />
            </div>

            <div>
              <label className="label">رقم الهاتف</label>
              <input
                className="input"
                placeholder="0910000000 أو +218..."
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </div>

            <div>
              <label className="label">واتساب</label>
              <input
                className="input"
                placeholder="رقم الواتساب"
                value={form.whatsapp}
                onChange={(e) => handleChange("whatsapp", e.target.value)}
              />
            </div>

            <div>
              <label className="label">العنوان التفصيلي</label>
              <input
                className="input"
                placeholder="مثال: طرابلس - عين زارة - شارع كذا"
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
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

          <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">موقع المعلن على الخريطة</h2>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  يمكنك استخدام موقعك الحالي أو إدخال الإحداثيات يدويًا. ستُحفظ هذه البيانات مع الإعلان.
                </p>
              </div>

              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"
                disabled={detectingLocation}
              >
                <LocateFixed size={18} />
                {detectingLocation ? "جارٍ تحديد الموقع..." : "استخدام موقعي الحالي"}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">خط العرض Latitude</label>
                <input
                  className="input"
                  placeholder="32.8872"
                  value={form.latitude}
                  onChange={(e) => handleChange("latitude", e.target.value)}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="label">خط الطول Longitude</label>
                <input
                  className="input"
                  placeholder="13.1913"
                  value={form.longitude}
                  onChange={(e) => handleChange("longitude", e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">
                <span className="inline-flex items-center gap-2"><MapPinned size={16} /> معاينة الموقع</span>
                {hasValidCoordinates ? (
                  <a
                    href={`https://www.google.com/maps?q=${selectedLat},${selectedLng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-700"
                  >
                    فتح في الخرائط
                  </a>
                ) : null}
              </div>
              <iframe
                title="موقع المعلن"
                src={mapEmbedUrl}
                className="h-[320px] w-full border-0"
                loading="lazy"
              />
            </div>
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
                setForm({
                  ...initialState,
                  sellerName: user.displayName || "",
                  phone: user.phoneNumber || "",
                  whatsapp: user.phoneNumber || ""
                });
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
