"use client";

import { useMemo } from "react";
import { Navigation, Truck } from "lucide-react";

/**
 * خريطة مصغّرة "placeholder" بدون أي maps API.
 *
 * لماذا SVG محلي بدلاً من Google Maps / Leaflet؟
 *  - يمنع dependency جديدة + لا يحمّل tiles كبيرة.
 *  - الـscreenshot المرجعي لا يحتاج تفاعل خرائط حقيقي - فقط إحساس بصري
 *    بوجود "خريطة" مع نقاط الساحبات حول المستخدم.
 *  - يمكن استبدالها لاحقاً بـMapLibre/Leaflet دون لمس باقي الصفحة.
 *
 * كيف نُحوّل lat/lng إلى مكان على الـSVG؟
 *  - نأخذ أبعد ساحبة (radius_km)، نُحوّلها إلى صف px على viewBox 100x100،
 *    مع مركز ثابت = موقع المستخدم. الإسقاط بسيط (مستوى مسطّح) - دقيق
 *    كفاية على مسافات < 50 كم في خط عرض ليبيا.
 */

interface Point {
  id: string;
  lat: number;
  lng: number;
  available?: boolean;
}

interface Props {
  /** موقع المستخدم. لو null نعرض حالة "خريطة بعد منح الإذن". */
  userLat: number | null;
  userLng: number | null;
  /** نقاط الساحبات (أقصى 8 للعرض - الباقي يُهمل لتجنّب الازدحام). */
  points: Point[];
}

const VIEW = 100; // viewBox unit
const CENTER = VIEW / 2;
const MIN_RADIUS_KM = 1;   // أقل radius للعرض (لا نضع نقاط فوق بعض)
const MAX_RADIUS_KM = 25;  // نقطع عند 25 كم - أبعد من ذلك خارج الخريطة

export function TowTrucksMiniMap({ userLat, userLng, points }: Props) {
  // إسقاط النقاط على إحداثيات الـSVG
  const projected = useMemo(() => {
    if (userLat == null || userLng == null) return [];

    // ابحث عن أبعد نقطة لتحديد scale - لا نتجاوز MAX_RADIUS_KM
    const distances = points
      .slice(0, 8)
      .map((p) => {
        const dKm = roughKm(userLat, userLng, p.lat, p.lng);
        return { ...p, dKm };
      })
      .filter((p) => isFinite(p.dKm));

    if (distances.length === 0) return [];

    const maxKm = Math.min(
      Math.max(...distances.map((d) => d.dKm), MIN_RADIUS_KM),
      MAX_RADIUS_KM
    );
    // نترك هامش 15% حول الحواف
    const scale = (VIEW / 2 - 8) / maxKm;

    return distances.map((p) => {
      const dxKm = (p.lng - userLng) * 111 * Math.cos((userLat * Math.PI) / 180);
      const dyKm = (p.lat - userLat) * 111;
      // في الـSVG: +y يتجه للأسفل، لذلك نعكس dyKm
      const x = CENTER + dxKm * scale;
      const y = CENTER - dyKm * scale;
      // clamp داخل viewBox - أي نقطة خارج الحدود نُلصقها بحافة الدائرة
      const clampedX = Math.max(6, Math.min(VIEW - 6, x));
      const clampedY = Math.max(6, Math.min(VIEW - 6, y));
      return { ...p, x: clampedX, y: clampedY };
    });
  }, [userLat, userLng, points]);

  const hasLocation = userLat != null && userLng != null;

  return (
    <div
      className="
        relative overflow-hidden rounded-3xl border border-slate-200
        bg-gradient-to-br from-slate-50 via-white to-brand-50/40
        shadow-sm
        dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-brand-950/30
      "
      style={{ aspectRatio: "16 / 9" }}
      aria-label="خريطة الساحبات القريبة"
    >
      {/* شبكة خفيفة كخلفية - تعطي إحساس "خريطة" */}
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        {/* خطوط شبكة */}
        <defs>
          <pattern id="towmap-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path
              d="M 10 0 L 0 0 0 10"
              fill="none"
              className="stroke-slate-200 dark:stroke-slate-700/60"
              strokeWidth="0.3"
            />
          </pattern>
          {/* مسارات منحنية تشبه شوارع */}
          <linearGradient id="towmap-road" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        <rect width={VIEW} height={VIEW} fill="url(#towmap-grid)" />

        {/* شارعان بشكل ديكوري */}
        <path
          d="M 0 35 Q 30 30 60 45 T 100 50"
          className="stroke-amber-300/50 dark:stroke-amber-500/30"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 20 0 Q 25 40 55 70 T 80 100"
          className="stroke-amber-200/40 dark:stroke-amber-500/20"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />

        {hasLocation && (
          <>
            {/* دوائر radius متحركة من مكان المستخدم */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r="30"
              className="fill-brand-500/5 stroke-brand-500/20"
              strokeWidth="0.4"
            />
            <circle
              cx={CENTER}
              cy={CENTER}
              r="18"
              className="fill-brand-500/8 stroke-brand-500/25"
              strokeWidth="0.4"
            />

            {/* النقاط - الساحبات */}
            {projected.map((p) => (
              <g key={p.id}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="3.6"
                  className="fill-white drop-shadow"
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="2.5"
                  className={
                    p.available
                      ? "fill-emerald-500"
                      : "fill-action-500"
                  }
                />
              </g>
            ))}

            {/* نقطة المستخدم (تنبض) */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r="5"
              className="fill-brand-500/30"
            >
              <animate
                attributeName="r"
                values="3.5;6;3.5"
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.6;0;0.6"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
            <circle
              cx={CENTER}
              cy={CENTER}
              r="3"
              className="fill-brand-600 stroke-white"
              strokeWidth="1"
            />
          </>
        )}
      </svg>

      {/* رسالة فوق الخريطة عند عدم توفر الموقع */}
      {!hasLocation && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-md">
            <Navigation size={20} />
          </div>
          <p className="text-sm font-black text-slate-700 dark:text-slate-200">
            فعّل موقعك لعرض الخريطة
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            ستظهر هنا الساحبات حولك مرتّبة بالأقرب.
          </p>
        </div>
      )}

      {/* عدّاد صغير في الزاوية لعدد النقاط الظاهرة */}
      {hasLocation && projected.length > 0 && (
        <div
          className="
            absolute bottom-3 start-3 inline-flex items-center gap-1.5
            rounded-full bg-slate-900/85 px-2.5 py-1
            text-[11px] font-black text-white backdrop-blur-sm
          "
        >
          <Truck size={12} />
          {projected.length} حولك
        </div>
      )}
    </div>
  );
}

/**
 * تقدير سريع للمسافة بالكيلومتر (مستوى مسطّح).
 * كافٍ لإسقاط نقاط على خريطة صغيرة 16:9 - ليس بديلاً عن haversine.
 */
function roughKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLat = (lat2 - lat1) * 111;
  const dLng = (lng2 - lng1) * 111 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}
