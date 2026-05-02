import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <section className="container py-10">
      <div className="card mx-auto max-w-md p-8 text-center text-slate-500">
        جارٍ التحميل...
      </div>
    </section>
  );
} عز
