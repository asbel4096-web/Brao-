import { plans } from '@/lib/mock-data';
import { formatPrice } from '@/lib/utils';

export default function PricingPage() {
  return (
    <section className="container py-10">
      <div>
        <h1 className="section-title">خطط الاشتراك</h1>
        <p className="section-subtitle">واجهة جاهزة لربط خطط شهرية وسنوية وإعلانات مميزة داخل براتشو كار.</p>
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.id} className={`card p-6 ${plan.popular ? 'border-brand-300 ring-4 ring-brand-100' : ''}`}>
            {plan.popular ? <div className="badge">الأكثر طلبًا</div> : null}
            <h2 className="mt-4 text-2xl font-black">{plan.name}</h2>
            <div className="mt-3 text-4xl font-black text-brand-700">{formatPrice(plan.price)}</div>
            <div className="mt-2 text-sm text-slate-500">{plan.duration}</div>
            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              {plan.features.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
            <button className="btn-primary mt-6 w-full">اشترك الآن</button>
          </div>
        ))}
      </div>
    </section>
  );
}
