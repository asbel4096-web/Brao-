export default function ProfilePage() {
  return (
    <section className="container py-10">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="card p-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 text-3xl font-black text-brand-700">
            BC
          </div>
          <h1 className="mt-4 text-2xl font-black">حساب المستخدم</h1>
          <p className="mt-2 text-sm leading-7 text-slate-500">جاهز للربط مع Firebase Authentication وإدارة البيانات الشخصية.</p>
        </aside>
        <div className="card p-6">
          <h2 className="text-xl font-black">معلومات الحساب</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label className="label">الاسم</label>
              <input className="input" defaultValue="يونس جمال" />
            </div>
            <div>
              <label className="label">البريد الإلكتروني</label>
              <input className="input" defaultValue="user@example.com" />
            </div>
            <div>
              <label className="label">الهاتف</label>
              <input className="input" defaultValue="0910000000" />
            </div>
            <div>
              <label className="label">المدينة</label>
              <input className="input" defaultValue="طرابلس" />
            </div>
          </div>
          <button className="btn-primary mt-6">حفظ التعديلات</button>
        </div>
      </div>
    </section>
  );
}
