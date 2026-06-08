/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ضغط الـ HTML/CSS/JS الناتج
  compress: true,

  // إزالة header غير ضروري
  poweredByHeader: false,

  // إزالة console.* من الإنتاج تلقائياً (يبقى console.error للأخطاء الحرجة).
  // يحفظ حجماً + يمنع تسرّب معلومات debug في المتصفح.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error"] }
        : false,
  },

  // تحسين الصور تلقائياً عبر Next/Image
  images: {
    // صيغ حديثة + أصغر حجماً (~30-50% توفير على JPEG)
    formats: ["image/avif", "image/webp"],
    // أحجام معقولة للجوال والديسكتوب
    deviceSizes: [360, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [80, 96, 128, 256, 384],
    // كاش طويل للصور المحسّنة (سنة)
    minimumCacheTTL: 60 * 60 * 24 * 365,
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
    ],
  },

  experimental: {
    // tree-shake للمكتبات الكبيرة (يحفظ ~100KB+ على bundles)
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },

  // Security headers (أفضل ممارسة)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
