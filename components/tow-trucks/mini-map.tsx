"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation, Truck } from "lucide-react";

/**
 * خريطة Leaflet حقيقية للساحبات.
 *
 * لماذا Leaflet بدون react-leaflet؟
 *  - Bundle أصغر: Leaflet وحده ~40KB gzipped. react-leaflet يضيف
 *    ~15KB بدون فائدة لنا، ويسبب مشاكل HMR في React 18 strict mode.
 *  - تحكم مباشر بدورة الحياة: نتجنّب re-renders غير ضرورية عند تغيير
 *    موقع المستخدم - نُحدّث الـmarkers يدوياً بدل re-mount كامل.
 *  - استيراد ديناميكي: المكتبة + CSS لا تُحمّلان إلا عند فتح هذه الصفحة،
 *    فلا يثقل bundle الصفحة الرئيسية.
 *
 * لماذا OpenStreetMap بدون token؟
 *  - مجاني ومناسب لاستخدام معتدل (شرط Tile Usage Policy).
 *  - لاحقاً يمكن الانتقال لـMapTiler/Stadia بتغيير URL واحد فقط.
 *
 * الـSSR:
 *  - Leaflet يستخدم window/document، لذا نستوردها داخل useEffect بعد mount.
 *  - قبل التحميل نعرض fallback (مثل placeholder سابق) - لا flash أبيض.
 */

interface TowPoint {
  id: string;
  lat: number;
  lng: number;
  name: string;
  city?: string;
  available?: boolean;
  /** رقم هاتف بصيغة دولية أو محلية (E.164 preferred). */
  phone?: string;
  /** رقم واتساب مُطبَّع (digits فقط، يبدأ بـ218). */
  whatsapp?: string;
}

interface Props {
  userLat: number | null;
  userLng: number | null;
  points: TowPoint[];
}

/** مركز ليبيا الافتراضي - يُستخدم عند عدم توفر موقع ولا أي ساحبة بإحداثيات. */
const DEFAULT_CENTER: [number, number] = [26.3351, 17.2283];
const DEFAULT_ZOOM = 6;
const USER_ZOOM = 13;

export function TowTrucksMiniMap({ userLat, userLng, points }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // نحفظ نسخة الـmap + الـmarkers في refs (وليس state) لتجنّب re-renders
  // عند كل تغيير في الخريطة. Leaflet يتحكّم بـDOM بنفسه.
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const userCircleRef = useRef<any>(null);
  const LRef = useRef<any>(null);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // ============================================================
  // تهيئة الخريطة (مرّة واحدة على mount)
  // ============================================================
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        // استيراد ديناميكي - يمنع تحميل المكتبة على SSR.
        const L = (await import("leaflet")).default;
        if (cancelled || !containerRef.current) return;
        LRef.current = L;

        // إصلاح مشهور: الـicons الافتراضية لـleaflet تشير إلى مسارات
        // نسبية لا تحلّ مع bundler. نعطّل default icon ونستخدم divIcon
        // لكل marker (انظر addPoints).
        // @ts-ignore - delete على private property معروف للـworkaround.
        delete (L.Icon.Default.prototype as any)._getIconUrl;

        // الـtile layer: OSM standard. CDN-served, لا أكواد API.
        const initialCenter: [number, number] =
          userLat != null && userLng != null
            ? [userLat, userLng]
            : DEFAULT_CENTER;
        const initialZoom =
          userLat != null && userLng != null ? USER_ZOOM : DEFAULT_ZOOM;

        const map = L.map(containerRef.current, {
          center: initialCenter,
          zoom: initialZoom,
          zoomControl: true,
          // RTL: نقل أزرار التحكم لليسار يبدو أنسب لتخطيط عربي.
          attributionControl: true,
          // أداء: scroll wheel zoom يمكن أن يكون مزعجاً داخل صفحة طويلة.
          // نتركه مفعّلاً لأن المستخدم يتوقّع التفاعل.
          scrollWheelZoom: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        mapRef.current = map;
        setReady(true);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[TowTrucksMiniMap] init failed:", err);
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      // تنظيف عند unmount - مهم تجنّباً لـmemory leaks في dev/HMR.
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          /* ignore */
        }
        mapRef.current = null;
      }
      markersRef.current = [];
      userMarkerRef.current = null;
      userCircleRef.current = null;
    };
    // نهيّئ مرّة واحدة. تغييرات الموقع/النقاط تُعالَج في useEffects أخرى.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // تحديث marker المستخدم + recenter عند تغيّر موقعه
  // ============================================================
  useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!map || !L || !ready) return;

    // أزل القديم لو موجود
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    if (userCircleRef.current) {
      userCircleRef.current.remove();
      userCircleRef.current = null;
    }

    if (userLat == null || userLng == null) return;

    // marker أزرق (brand) مع pulse - divIcon CSS pure.
    const icon = L.divIcon({
      className: "brao-user-marker",
      html: `
        <div class="brao-user-pulse"></div>
        <div class="brao-user-dot"></div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    userMarkerRef.current = L.marker([userLat, userLng], {
      icon,
      keyboard: false,
      // لا interactive - مجرد إشارة بصرية.
      interactive: false,
    }).addTo(map);

    // دائرة محيطة خفيفة (تقريبية - 1 km لإعطاء حس بالمحيط)
    userCircleRef.current = L.circle([userLat, userLng], {
      radius: 1000,
      color: "#1c389c",
      weight: 1,
      opacity: 0.25,
      fillColor: "#1c389c",
      fillOpacity: 0.05,
    }).addTo(map);

    // recenter بسلاسة - لا flyTo (مكلف وملحوظ).
    map.setView([userLat, userLng], USER_ZOOM, { animate: true });
  }, [userLat, userLng, ready]);

  // ============================================================
  // تحديث markers الساحبات عند تغيّرها
  // ============================================================
  useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!map || !L || !ready) return;

    // امسح القديمة
    for (const m of markersRef.current) {
      try {
        m.remove();
      } catch {
        /* ignore */
      }
    }
    markersRef.current = [];

    for (const p of points) {
      const color = p.available ? "#10b981" : "#f97316"; // emerald / action

      // أيقونة شاحنة بهوية البراند - SVG مدمج في divIcon.
      // الـSVG: دائرة ملوّنة فيها أيقونة truck بيضاء.
      const icon = L.divIcon({
        className: "brao-tow-marker",
        html: `
          <div class="brao-tow-pin" style="background:${color}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 17h4V5H2v12h3"/>
              <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/>
              <circle cx="7.5" cy="17.5" r="2.5"/>
              <circle cx="17.5" cy="17.5" r="2.5"/>
            </svg>
          </div>
        `,
        iconSize: [32, 38],
        iconAnchor: [16, 38],
        popupAnchor: [0, -32],
      });

      const marker = L.marker([p.lat, p.lng], { icon }).addTo(map);

      // popup: اسم + أزرار اتصال/واتساب (لو متوفّرة).
      // نبني HTML نصياً لأن popup يقبل HTML string أو DOM node.
      // dir="rtl" لضمان عرض صحيح للنص العربي.
      const safeName = escapeHtml(p.name || "ساحبة سيارات");
      const cityLine = p.city
        ? `<div class="brao-popup-city">${escapeHtml(p.city)}</div>`
        : "";
      const availLine = p.available
        ? `<div class="brao-popup-avail">● متاحة الآن</div>`
        : "";

      const actions: string[] = [];
      if (p.phone) {
        actions.push(
          `<a href="tel:${escapeAttr(p.phone)}" class="brao-popup-btn brao-popup-call" aria-label="اتصال">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z"/></svg>
            اتصال
          </a>`
        );
      }
      if (p.whatsapp) {
        actions.push(
          `<a href="https://wa.me/${escapeAttr(p.whatsapp)}" target="_blank" rel="noreferrer" class="brao-popup-btn brao-popup-wa" aria-label="واتساب">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.4.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1-1.1 2.5s1.1 3 1.3 3.2c.2.2 2.2 3.4 5.4 4.7 3.2 1.3 3.2.9 3.8.8.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.3-.2-.6-.4zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 4.9L2 22l5.2-1.3c1.4.8 3 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.2c-1.6 0-3-.4-4.3-1.2l-.3-.2-3.1.8.8-3-.2-.3c-.9-1.4-1.3-2.9-1.3-4.5 0-4.5 3.7-8.2 8.2-8.2 4.5 0 8.2 3.7 8.2 8.2 0 4.5-3.7 8.4-8 8.4z"/></svg>
            واتساب
          </a>`
        );
      }

      const html = `
        <div class="brao-popup" dir="rtl">
          <div class="brao-popup-name">${safeName}</div>
          ${cityLine}
          ${availLine}
          ${actions.length ? `<div class="brao-popup-actions">${actions.join("")}</div>` : ""}
        </div>
      `;

      marker.bindPopup(html, {
        closeButton: true,
        maxWidth: 220,
        minWidth: 180,
        autoPan: true,
      });

      markersRef.current.push(marker);
    }
  }, [points, ready]);

  return (
    <>
      {/* CSS لـLeaflet من CDN - أبسط وأنظف من npm install للـCSS فقط.
          unpkg يخدم نفس النسخة. integrity hash يضمن السلامة. */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />

      <div
        className="
          relative overflow-hidden rounded-3xl border border-slate-200
          bg-slate-100 shadow-sm
          dark:border-slate-800 dark:bg-slate-900
        "
        style={{ aspectRatio: "16 / 10" }}
      >
        {/* الحاوية التي يضع فيها Leaflet الخريطة */}
        <div
          ref={containerRef}
          className="absolute inset-0 h-full w-full"
          // tabIndex=-1 لمنع focus ring غير مرغوب على الديسكتوب
          tabIndex={-1}
          aria-label="خريطة الساحبات القريبة"
        />

        {/* fallback أثناء التحميل (قبل ready) */}
        {!ready && !failed && (
          <div className="pointer-events-none absolute inset-0 z-[400] flex flex-col items-center justify-center gap-2 bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            <p className="text-xs font-bold">جارٍ تحميل الخريطة...</p>
          </div>
        )}

        {/* fallback عند الفشل (لا اتصال، CDN محجوب، إلخ) */}
        {failed && (
          <div className="absolute inset-0 z-[400] flex flex-col items-center justify-center gap-2 p-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-700 text-white">
              <Truck size={20} />
            </div>
            <p className="text-sm font-black text-slate-700 dark:text-slate-200">
              تعذّر تحميل الخريطة
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              يمكنك الاستمرار باستخدام القائمة أدناه.
            </p>
          </div>
        )}

        {/* عند عدم وجود موقع، رسالة تشجيعية فوق الخريطة */}
        {ready && userLat == null && (
          <div className="pointer-events-none absolute inset-x-3 top-3 z-[400]">
            <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-slate-900/85 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-sm">
              <Navigation size={12} />
              فعّل موقعك لرؤية الساحبات حولك
            </div>
          </div>
        )}
      </div>

      {/* ستايل الـmarkers والـpopup - نضعه هنا حتى لا نلوّث globals.css.
          z-index على الـpopup لتجنّب تداخل مع headers الموقع. */}
      <style>{`
        .brao-user-marker { background: transparent; border: none; }
        .brao-user-pulse {
          position: absolute; inset: -6px;
          border-radius: 9999px;
          background: rgba(28, 56, 156, 0.25);
          animation: brao-pulse 2s ease-out infinite;
        }
        .brao-user-dot {
          position: absolute; inset: 4px;
          border-radius: 9999px;
          background: #1c389c;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        @keyframes brao-pulse {
          0%   { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0; }
        }

        .brao-tow-marker { background: transparent; border: none; }
        .brao-tow-pin {
          width: 32px; height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2.5px solid white;
          box-shadow: 0 3px 10px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
        }
        .brao-tow-pin > svg { transform: rotate(45deg); }

        .brao-popup .leaflet-popup-content-wrapper,
        .leaflet-popup-content-wrapper {
          border-radius: 16px !important;
          padding: 4px !important;
        }
        .leaflet-popup-content { margin: 10px 12px !important; }
        .brao-popup-name {
          font-weight: 900; font-size: 14px;
          color: #0f172a; line-height: 1.3;
        }
        .brao-popup-city {
          margin-top: 2px; font-size: 11px; color: #64748b;
        }
        .brao-popup-avail {
          margin-top: 4px; font-size: 11px; font-weight: 800;
          color: #059669;
        }
        .brao-popup-actions {
          display: flex; gap: 6px; margin-top: 10px;
        }
        .brao-popup-btn {
          flex: 1;
          display: inline-flex; align-items: center; justify-content: center;
          gap: 4px;
          height: 32px; border-radius: 10px;
          font-size: 12px; font-weight: 800;
          color: white; text-decoration: none;
          transition: opacity 0.15s;
        }
        .brao-popup-btn:hover { opacity: 0.9; }
        .brao-popup-call { background: #1c389c; }
        .brao-popup-wa   { background: #10b981; }

        /* dark mode للـpopup */
        @media (prefers-color-scheme: dark) {
          .leaflet-popup-content-wrapper,
          .leaflet-popup-tip {
            background: #0f172a !important;
            color: white !important;
          }
          .brao-popup-name { color: white; }
          .brao-popup-city { color: #94a3b8; }
        }

        /* z-index لـattribution + zoom controls - تحت أي modal */
        .leaflet-control-container .leaflet-top,
        .leaflet-control-container .leaflet-bottom {
          z-index: 400;
        }
      `}</style>
    </>
  );
}

// ============================================================
// مساعدات صغيرة
// ============================================================

/** Escape نصّ المستخدم قبل إدراجه في HTML داخل popup. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape attribute (نفس الـescape لكن نُبقي الـAPI واضحاً). */
function escapeAttr(s: string): string {
  return escapeHtml(s);
}
