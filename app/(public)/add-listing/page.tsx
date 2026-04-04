"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
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
  "طرابلس","بنغازي","مصراتة","الزاوية","زليتن","صبراتة","صرمان","جنزور","الخمس","ترهونة","غريان","يفرن","نالوت","زوارة","رقدالين","العجيلات","سرت","إجدابيا","المرج","البيضاء","درنة","طبرق","سبها","أوباري","مرزق","غات","الكفرة","هون","ودان","براك الشاطئ","بن وليد","شحات","راس لانوف"
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

  const previews = useMemo(() => images.map((file) => URL.createObjectURL(file)), [images]);

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
    return Promise.all(
      images.map(async (file, index) => {
        const fileName = `${Date.now()}-${index}-${file.name}`;
        const storageRef = ref(storage, `listing-images/${ownerId}/${fileName}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
      })
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) return setMessage("يجب تسجيل الدخول أولًا.");
    if (!form.title.trim()) return setMessage("اكتب عنوان الإعلان.");
    if (!form.price.trim()) return setMessage("اكتب السعر.");
    if (!form.phone.trim()) return setMessage("اكتب رقم الهاتف.");

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
      setTimeout(() => router.push("/my-listings"), 1200);
    } catch (error) {
      console.error("Add listing error:", error);
      setMessage("حدث خطأ أثناء حفظ الإعلان.");
    } finally {
      setSubmitting(false);
    }
  };

  return <section className="container py-8" />;
}
