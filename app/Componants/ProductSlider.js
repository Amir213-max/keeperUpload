"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import Image from 'next/image';
import { useTranslation } from '../contexts/TranslationContext';

export default function ProductSlider({ images, productName }) {
  const { lang } = useTranslation();
  const [direction, setDirection] = useState('ltr');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const swiperRef = useRef(null);
  const loadTimeoutRef = useRef(null);
  const imageCheckRef = useRef(null);

  // 🔹 Memoize direction to prevent unnecessary re-renders
  useEffect(() => {
    setDirection(lang === 'ar' ? 'rtl' : 'ltr');
  }, [lang]);

  // 🔹 Set mounted to true only on client side to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // 🔹 Memoize showArrows to prevent recalculation
  const showArrows = useMemo(() => images?.length > 1, [images?.length]);

  // 🔹 Memoize handlers to prevent re-creation
  const handlePrev = useCallback((e) => {
    e.preventDefault();
    if (swiperRef.current) swiperRef.current.slidePrev();
  }, []);

  const handleNext = useCallback((e) => {
    e.preventDefault();
    if (swiperRef.current) swiperRef.current.slideNext();
  }, []);

  // 🔹 Memoize empty check
  const hasImages = useMemo(() => Array.isArray(images) && images.length > 0, [images]);


  // 🔹 إعادة تعيين حالة التحميل عند تغيير الصور
  useEffect(() => {
    // تنظيف timeout السابق
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }

    // إعادة تعيين الحالة - دائماً نبدأ بـ false لإظهار الـ loader
    setImageLoaded(false);

    // إضافة timeout احتياطي (3 ثواني كحد أقصى) لإخفاء الـ loader في حالة فشل التحميل
    if (mounted && images?.[0]) {
      loadTimeoutRef.current = setTimeout(() => {
        setImageLoaded(true);
      }, 3000);
    }

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, [images, mounted]);

  if (!hasImages) {
    return (
      <div className="w-full h-48 flex items-center justify-center bg-gray-100">
        <span className="text-gray-400">No images</span>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full flex items-center justify-center product-swiper-container"
      onClick={(e) => {
        // يمنع الضغط داخل السلايدر من تفعيل الـ Link، إلا الصورة
        const isImage = e.target.closest(".product-image-click");
        if (!isImage) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {/* 🔹 Professional Loader - يظهر أثناء تحميل الصورة (فقط على الـ client) */}
      {mounted && !imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center  z-10">
          <div className="relative w-16 h-16">
            {/* Spinner Animation - حركة أبطأ */}
            <div className="absolute inset-0 border-4 border-amber-400 border-t-transparent rounded-full loader-spin"></div>
            {/* Pulse Effect */}
            <div className="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-20"></div>
          </div>
        </div>
      )}

      <Swiper
        onSwiper={(swiper) => (swiperRef.current = swiper)}
        key={direction}
        modules={[Navigation]}
        spaceBetween={0}
        slidesPerView={1}
        loop={images.length > 1}
        dir={direction}
        className="w-full h-full product-swiper"
        allowTouchMove={true}
        grabCursor={true}
      >
        {images.map((img, index) => (
          <SwiperSlide
            key={index}
            className="flex items-center justify-center"
          >
            <Image
              src={img}
              alt={`${productName} image ${index + 1}`}
              width={400}
              height={220}
              className={`w-full h-48 object-contain product-image-click cursor-pointer transition-opacity duration-300 ${
                index === 0 && mounted && !imageLoaded ? 'opacity-0' : 'opacity-100'
              }`}
              draggable={false}
              loading={index === 0 ? "eager" : "lazy"} // 🔹 Eager load first image, lazy load others
              priority={index === 0} // 🔹 Priority for LCP image
              quality={85} // 🔹 Optimize image quality
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              unoptimized={img?.startsWith('http')} // 🔹 Handle external images
              onLoad={() => {
                // 🔹 عند تحميل الصورة الأولى، إخفاء الـ loader
                if (index === 0) {
                  // تنظيف timeout إذا كان موجوداً
                  if (loadTimeoutRef.current) {
                    clearTimeout(loadTimeoutRef.current);
                    loadTimeoutRef.current = null;
                  }
                  
                  // تأخير بسيط (200ms) لإظهار الـ loader حتى لو كانت الصورة سريعة التحميل
                  setTimeout(() => {
                    setImageLoaded(true);
                  }, 200);
                }
              }}
              onError={() => {
                // 🔹 في حالة خطأ في تحميل الصورة، إخفاء الـ loader أيضاً
                if (index === 0) {
                  // تنظيف timeout إذا كان موجوداً
                  if (loadTimeoutRef.current) {
                    clearTimeout(loadTimeoutRef.current);
                    loadTimeoutRef.current = null;
                  }
                  
                  setImageLoaded(true);
                }
              }}
              onLoadingComplete={() => {
                // 🔹 طريقة إضافية للتحقق من اكتمال التحميل (Next.js Image) - الأكثر موثوقية
                if (index === 0) {
                  if (loadTimeoutRef.current) {
                    clearTimeout(loadTimeoutRef.current);
                    loadTimeoutRef.current = null;
                  }
                  
                  // تأخير بسيط لضمان اكتمال التحميل
                  setTimeout(() => {
                    setImageLoaded(true);
                  }, 100);
                }
              }}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      {showArrows && (
        <>
          <button
            type="button"
            className={`swiper-button-prev-custom ${direction === 'rtl' ? 'rtl-prev' : 'ltr-prev'}`}
            onClick={handlePrev}
            aria-label="Previous image"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="#888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <button
            type="button"
            className={`swiper-button-next-custom ${direction === 'rtl' ? 'rtl-next' : 'ltr-next'}`}
            onClick={handleNext}
            aria-label="Next image"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 6L15 12L9 18" stroke="#888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
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

        /* 🔹 حركة الدوران البطيئة للـ loader */
        .loader-spin {
          animation: spin 1.5s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
