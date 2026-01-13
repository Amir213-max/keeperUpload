/** @type {import('next').NextConfig} */
const nextConfig = {
   experimental: { serverActions: true },
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
      ],
      formats: ['image/avif', 'image/webp'],
      // Optimized for mobile-first: smaller sizes prioritized
      deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
      minimumCacheTTL: 60,
      // Reduce image quality on mobile for faster loading
      dangerouslyAllowSVG: true,
      contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    },
    compress: true,
    poweredByHeader: false,
    reactStrictMode: true,
    // Optimize for mobile performance
    swcMinify: true,
    // Reduce JavaScript bundle size
    compiler: {
      removeConsole: process.env.NODE_ENV === 'production' ? {
        exclude: ['error', 'warn'],
      } : false,
    },
  };
  
export default nextConfig;
  