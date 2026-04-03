export default function AdminUsersPage() {
  return (
    <section className="container py-10">
      <h1 className="section-title">إدارة المستخدمين</h1>
      <p className="section-subtitle">مساحة مهيأة لإدارة البائعين، المشترين، التوثيق، والحظر.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {['مستخدمون جدد', 'موثقون', 'محظورون'].map((title, i) => (
          <div key={title} className="card p-6">
            <div className="text-sm text-slate-500">{title}</div>
            <div className="mt-3 text-4xl font-black text-slate-950">{[120, 38, 4][i]}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
