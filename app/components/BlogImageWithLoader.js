"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

function LoadingGlyph({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.35" />
      <path d="M32 18v28M18 32h28" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.2" />
    </svg>
  );
}

export default function BlogImageWithLoader({
  src,
  alt,
  sizes,
  priority = false,
  className = "",
}) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setDone(false);
    setError(false);
  }, [src]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {!done && (
        <div
          className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center"
          aria-hidden
        >
          <div
            className="absolute inset-0 blog-image-shimmer"
            style={{
              background:
                "linear-gradient(105deg, transparent 42%, rgba(255,255,255,.12) 50%, transparent 58%)",
              animation: "blogImageShimmer 1.35s ease-in-out infinite",
            }}
          />
          <LoadingGlyph className="relative z-[1] h-12 w-12 text-white/25" />
        </div>
      )}

      {error ? (
        <div className="flex h-full w-full items-center justify-center bg-gray-800 text-gray-500 text-xs">
          No Image
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className={`${className} transition-all duration-500 ease-out ${done ? "scale-100 opacity-100" : "scale-[0.98] opacity-0"}`}
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          onLoadingComplete={() => setDone(true)}
          onLoad={() => setDone(true)}
          onError={() => {
            setError(true);
            setDone(true);
          }}
        />
      )}

      <style jsx>{`
        @keyframes blogImageShimmer {
          0% {
            transform: translateX(-120%) skewX(-12deg);
          }
          100% {
            transform: translateX(120%) skewX(-12deg);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .blog-image-shimmer {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
