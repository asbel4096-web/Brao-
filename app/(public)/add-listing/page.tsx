export default function AddListingPage() {
  return (
    <section className="container py-10">
      <div className="mx-auto max-w-4xl">
        <div>
          <h1 className="section-title">إضافة إعلان جديد</h1>
          <p className="section-subtitle">النموذج منظم ليدعم لاحقًا رفع حتى 20 صورة، حفظ البيانات في Firestore، واعتماد المشرف.</p>
        </div>
        <form className="card mt-6 p-6 sm:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="label">عنوان الإعلان</label>
              <input className="input" placeholder="مثال: هونداي أزيرا 2012 فل الفل" />
            </div>
            <div>
              <label className="label">القسم</label>
              <select className="input">
                <option>سيارات</option>
                <option>قطع غيار</option>
                <option>كماليات</option>
                <option>خدمات</option>
              </select>
            </div>
            <div>
              <label className="label">السعر</label>
              <input className="input" placeholder="أدخل السعر" />
            </div>
            <div>
              <label className="label">المدينة</label>
              <select className="input">
                <option>طرابلس</option>
                <option>بنغازي</option>
                <option>مصراتة</option>
                <option>الزاوية</option>
              </select>
            </div>
            <div>
              <label className="label">سنة الصنع</label>
              <input className="input" placeholder="2023" />
            </div>
            <div>
              <label className="label">المسافة المقطوعة</label>
              <input className="input" placeholder="12000 كم" />
            </div>
            <div>
              <label className="label">رقم الهاتف</label>
              <input className="input" placeholder="0910000000" />
            </div>
            <div>
              <label className="label">واتساب</label>
              <input className="input" placeholder="218910000000" />
            </div>
          </div>
          <div className="mt-5">
            <label className="label">الوصف</label>
            <textarea className="input min-h-[160px]" placeholder="اكتب تفاصيل الإعلان هنا..."></textarea>
          </div>
          <div className="mt-5">
            <label className="label">الصور</label>
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              مكان مخصص لرفع حتى 20 صورة عند ربط Firebase Storage
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn-primary">نشر الإعلان</button>
            <button type="button" className="btn-secondary">حفظ كمسودة</button>
          </div>
        </form>
      </div>
    </section>
  );
}
