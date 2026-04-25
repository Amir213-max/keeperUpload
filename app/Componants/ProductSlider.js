"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import Image from "next/image";
import { useTranslation } from "../contexts/TranslationContext";

const IMG_AREA = "min-h-[220px] h-[220px]";

const LISTING_IMAGE_STORAGE_BASE = "https://keepersport.store/storage/";

/**
 * Normalize listing image entries for Next/Image: strings, relative paths, or `{ url }`.
 */
function normalizeListingImageSrc(entry) {
  if (entry == null) return "";
  if (typeof entry === "string") {
    const s = entry.trim();
    if (!s) return "";
    if (
      s.startsWith("http://") ||
      s.startsWith("https://") ||
      s.startsWith("data:") ||
      s.startsWith("/")
    ) {
      return s;
    }
    return `${LISTING_IMAGE_STORAGE_BASE}${s.replace(/^\//, "")}`;
  }
  if (typeof entry === "object") {
    const nested =
      entry.url ?? entry.src ?? entry.path ?? entry.image ?? entry.href ?? "";
    return normalizeListingImageSrc(typeof nested === "string" ? nested : "");
  }
  return "";
}

function normalizeProductImagesForSlider(images) {
  if (!Array.isArray(images)) return [];
  const out = [];
  const seen = new Set();
  for (const entry of images) {
    const url = normalizeListingImageSrc(entry);
    if (url && !seen.has(url)) {
      seen.add(url);
      out.push(url);
    }
  }
  return out;
}

/** Tiny inline SVG — subtle “sport” cue while images stream from API */
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
      <path
        d="M32 18v28M18 32h28"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.2"
      />
    </svg>
  );
}

function ImageSkeleton({ visible }) {
  if (!visible) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center overflow-hidden rounded-md bg-transparent"
      aria-hidden
    >
      <div
        className="product-slider-shimmer absolute inset-0"
        style={{
          background:
            "linear-gradient(105deg, transparent 42%, rgba(31,35,35,.07) 50%, transparent 58%)",
          animation: "productSliderShimmer 1.35s ease-in-out infinite",
        }}
      />
      <LoadingGlyph className="relative z-[1] h-14 w-14 text-[#1f2323]/20" />
    </div>
  );
}

export default function ProductSlider({ images, productName, onImageLoad }) {
  const { lang, t } = useTranslation();
  const [direction, setDirection] = useState("ltr");
  const swiperRef = useRef(null);
  const previousImagesRef = useRef(null);
  const firstSlideReportedRef = useRef(false);

  /** index -> loaded (or error: treat as done to hide skeleton) */
  const [slideState, setSlideState] = useState({});

  const markSlideDone = useCallback(
    (index, { error } = {}) => {
      setSlideState((prev) => ({ ...prev, [index]: error ? "error" : "loaded" }));
      if (index === 0 && onImageLoad && !firstSlideReportedRef.current) {
        firstSlideReportedRef.current = true;
        onImageLoad();
      }
    },
    [onImageLoad]
  );

  useEffect(() => {
    setDirection(lang === "ar" ? "rtl" : "ltr");
  }, [lang]);

  const imageUrls = useMemo(
    () => normalizeProductImagesForSlider(images),
    [images]
  );

  const showArrows = useMemo(() => imageUrls.length > 1, [imageUrls.length]);
  const hasImages = imageUrls.length > 0;

  useEffect(() => {
    const currentImagesKey = imageUrls.join("\u0001");
    const previousImagesKey = previousImagesRef.current || "";

    if (currentImagesKey === previousImagesKey && previousImagesKey !== "") {
      return;
    }

    previousImagesRef.current = currentImagesKey;
    setSlideState({});
    firstSlideReportedRef.current = false;
  }, [imageUrls]);

  const handlePrev = useCallback((e) => {
    e.preventDefault();
    if (swiperRef.current) swiperRef.current.slidePrev();
  }, []);

  const handleNext = useCallback((e) => {
    e.preventDefault();
    if (swiperRef.current) swiperRef.current.slideNext();
  }, []);

  if (!hasImages) {
    return (
      <div
        className={`flex w-full ${IMG_AREA} items-center justify-center rounded-md border border-dashed border-neutral-200/60 bg-transparent`}
      >
        <div className="flex flex-col items-center gap-2 text-neutral-400">
          <LoadingGlyph className="h-10 w-10" />
          <span className="text-xs font-medium">{t("No product images")}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`product-swiper-container relative flex w-full items-center justify-center ${IMG_AREA}`}
      onClick={(e) => {
        const isImage = e.target.closest(".product-image-click");
        if (!isImage) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <style jsx global>{`
        @keyframes productSliderShimmer {
          0% {
            transform: translateX(-120%) skewX(-12deg);
          }
          100% {
            transform: translateX(120%) skewX(-12deg);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .product-slider-shimmer {
            animation: none !important;
          }
        }
      `}</style>

      <Swiper
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        key={direction}
        modules={[Navigation]}
        spaceBetween={0}
        slidesPerView={1}
        loop={false}
        dir={direction}
        className="product-swiper h-full w-full"
        allowTouchMove
        grabCursor
      >
        {imageUrls.map((img, index) => {
          const done = slideState[index] === "loaded" || slideState[index] === "error";
          const showSkeleton = !done;

          return (
            <SwiperSlide
              key={`${index}-${img.slice(0, 120)}`}
              className="flex items-center justify-center"
            >
              <div className="relative flex h-full w-full max-w-full items-center justify-center overflow-hidden rounded-md bg-transparent">
                <ImageSkeleton visible={showSkeleton} />

                {slideState[index] === "error" ? (
                  <div className="product-image-click flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 px-4 text-center text-neutral-400">
                    <LoadingGlyph className="h-12 w-12 opacity-40" />
                    <span className="text-xs">{t("Image unavailable")}</span>
                  </div>
                ) : (
                  <Image
                    src={img}
                    alt={`${productName} image ${index + 1}`}
                    width={400}
                    height={220}
                    className={`product-image-click h-full max-h-[220px] w-full cursor-pointer object-contain transition-all duration-500 ease-out ${
                      done ? "scale-100 opacity-100" : "scale-[0.98] opacity-0"
                    }`}
                    draggable={false}
                    loading="lazy"
                    priority={false}
                    fetchPriority="auto"
                    quality={index === 0 ? 82 : 72}
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    placeholder="empty"
                    unoptimized={
                      img.startsWith("http://") ||
                      img.startsWith("https://") ||
                      img.startsWith("data:")
                    }
                    onLoadingComplete={() => markSlideDone(index)}
                    onLoad={() => markSlideDone(index)}
                    onError={() => markSlideDone(index, { error: true })}
                  />
                )}
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {showArrows && (
        <>
          <button
            type="button"
            className={`swiper-button-prev-custom ${direction === "rtl" ? "rtl-prev" : "ltr-prev"}`}
            onClick={handlePrev}
            aria-label="Previous image"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18L9 12L15 6"
                stroke="#888"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            type="button"
            className={`swiper-button-next-custom ${direction === "rtl" ? "rtl-next" : "ltr-next"}`}
            onClick={handleNext}
            aria-label="Next image"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 6L15 12L9 18"
                stroke="#888"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </>
      )}

      <style jsx>{`
        .product-swiper-container {
          position: relative;
        }

        .product-swiper-container :global(.swiper-button-prev-custom),
        .product-swiper-container :global(.swiper-button-next-custom) {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.98);
          border: 1.5px solid #e0e0e0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 30;
          transition: all 0.25s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          opacity: 0;
        }

        .product-swiper-container:hover :global(.swiper-button-prev-custom),
        .product-swiper-container:hover :global(.swiper-button-next-custom) {
          opacity: 1;
        }

        .product-swiper-container :global(.swiper-button-prev-custom:hover),
        .product-swiper-container :global(.swiper-button-next-custom:hover) {
          border-color: #888;
          transform: translateY(-50%) scale(1.1);
        }

        .product-swiper-container :global(.ltr-prev) {
          left: 10px;
        }

        .product-swiper-container :global(.ltr-next) {
          right: 10px;
        }

        .product-swiper-container :global(.rtl-prev) {
          right: 10px;
        }

        .product-swiper-container :global(.rtl-next) {
          left: 10px;
        }

        .product-swiper-container :global(.swiper-button-next),
        .product-swiper-container :global(.swiper-button-prev) {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
