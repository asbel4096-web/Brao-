const rows = [
  ['جينيسيس G80 2023', 'طرابلس', 'مميز', 'مراجعة'],
  ['محرك 2.4 مستورد', 'الزاوية', 'عادي', 'موافقة'],
  ['ميكانيكي متنقل', 'بنغازي', 'عادي', 'رفض']
];

export default function AdminListingsPage() {
  return (
    <section className="container py-10">
      <h1 className="section-title">إدارة الإعلانات</h1>
      <p className="section-subtitle">جدول إداري مبدئي لفرز الإعلانات والاعتماد والرفض والتمييز.</p>
      <div className="card mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-4">الإعلان</th>
                <th className="px-4 py-4">المدينة</th>
                <th className="px-4 py-4">الخطة</th>
                <th className="px-4 py-4">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row[0]} className="border-t border-slate-100">
                  {row.map((cell, index) => (
                    <td key={index} className="px-4 py-4">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
