import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
   experimental: { serverActions: {} },
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'images.keepersport.net',
          port: '', // لو مفيش port خليها فاضية
          pathname: '/**', // يسمح بأي مسار داخل الدومين
        },
        {
          protocol: 'https',
          hostname: 'static-assets.keepersport.net',
          port: '',
          pathname: '/**',
        },
        {
          protocol: 'https',
          hostname: 'keepersport.store',
          port: '',
          pathname: '/**',
        },
        {
          protocol: 'https',
          hostname: 'www.keepersport.sa',
          port: '',
          pathname: '/**',
        },
      ],
      formats: ['image/avif', 'image/webp'],
      // Optimized for mobile-first: smaller sizes prioritized
      deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
      minimumCacheTTL: 31536000, // 1 year - زيادة cache لتحسين الأداء
      // Enable image optimization for better performance
      dangerouslyAllowSVG: true,
      contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    },
    compress: true,
    poweredByHeader: false,
    reactStrictMode: true,
    // Reduce JavaScript bundle size
    compiler: {
      removeConsole: process.env.NODE_ENV === 'production' ? {
        exclude: ['error', 'warn'],
      } : false,
    },
    async headers() {
      return [
        {
          source: "/:path*",
          headers: [
            { key: "X-DNS-Prefetch-Control", value: "on" },
            { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
            { key: "X-Frame-Options", value: "SAMEORIGIN" },
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "Referrer-Policy", value: "origin-when-cross-origin" },
            { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ],
        },
      ];
    },
  };
  
export default withBundleAnalyzer(nextConfig);
  