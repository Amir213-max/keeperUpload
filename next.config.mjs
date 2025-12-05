/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
      serverActions: true,
    },
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'images.keepersport.net',
          port: '', // لو مفيش port خليها فاضية
          pathname: '/**', // يسمح بأي مسار داخل الدومين
        },
      ],
    },
  };
  
export default nextConfig;
  