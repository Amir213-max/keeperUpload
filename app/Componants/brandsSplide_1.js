'use client';

import { Splide, SplideSlide } from '@splidejs/react-splide';
import '@splidejs/react-splide/css';
import { useTranslation } from '../contexts/TranslationContext';

export default function BrandsSlider({ brands, onBrandClick, selectedBrand }) {
  const { lang } = useTranslation();

  // 🔹 إزالة القيم الفارغة والمتكررة
  const validBrands = [...new Set(brands.filter(brand => brand && brand.trim() !== ''))];

  // 🔹 لو فيه براند واحد بس أو مفيش خالص → متعرضش الكومبوننت
  if (validBrands.length <= 1) return null;

  return (
    <div className="relative my-6 px-0">
      <Splide
        options={{
          type: 'loop',
          autoWidth: true,
          perMove: 1,
          gap: '.5rem',
          pagination: false,
          arrows: true,
          direction: lang === 'ar' ? 'rtl' : 'ltr',
          drag: true,
          swipe: true,
          touch: true,
          breakpoints: {
            1280: { 
              arrows: true,
            },
            1024: { 
              arrows: true,
            },
            768: { 
              arrows: false,
            },
            640: { 
              arrows: false,
            },
          },
        }}
        aria-label="Brand names"
        className="w-full"
      >
        {validBrands.map((brand, index) => (
          <SplideSlide
            key={index}
            className="p-0 m-0 flex justify-center items-center"
          >
            <div
              onClick={() => {
                // ✅ استدعاء onBrandClick عند الضغط على البراند
                if (onBrandClick) {
                  onBrandClick(brand);
                }
              }}
              className={`inline-flex items-center justify-center 
                text-sm sm:text-base font-semibold
                px-5 py-2.5 cursor-pointer
                transition-all duration-300 ease-in-out
                whitespace-nowrap w-fit
                rounded-lg
                ${
                  selectedBrand === brand
                    ? 'bg-gradient-to-r text-white from-gray-400 to-gray-500 text-gray-900 shadow-lg transform scale-105'
                    : 'bg-white text-gray-700 shadow-md hover:shadow-lg hover:bg-gray-50'
                }`}
            >
              {brand}
            </div>
          </SplideSlide>
        ))}
      </Splide>

      {/* تخصيص تصميم الأسهم بشكل احترافي */}
      <style jsx>{`
        .splide__arrow {
          background-color: #f3f4f6 !important;
          color: #6b7280 !important;
          width: 28px !important;
          height: 28px !important;
          border-radius: 50% !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
          transition: all 0.3s ease !important;
        }

        .splide__arrow:hover {
          background-color: #e5e7eb !important;
          color: #374151 !important;
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15) !important;
        }

        .splide__arrow svg {
          fill: currentColor !important;
          width: 14px !important;
          height: 14px !important;
        }

        .splide__arrow--prev {
          left: -15px !important;
        }

        .splide__arrow--next {
          right: -15px !important;
        }

        .splide__arrow:disabled {
          opacity: 0.3 !important;
          cursor: not-allowed !important;
        }

        /* إخفاء الأسهم على الشاشات الصغيرة والمتوسطة */
        @media (max-width: 1024px) {
          .splide__arrow {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }
        }

        /* إظهار الأسهم فقط على الشاشات الكبيرة */
        @media (min-width: 1280px) {
          .splide__arrow {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
        }

        /* تحسين السحب على الموبايل */
        .splide__track {
          overflow: hidden !important;
        }

        .splide {
          overflow: hidden !important;
          width: 100% !important;
        }

        .splide__container {
          overflow: hidden !important;
          width: 100% !important;
        }

        .splide__list {
          display: flex !important;
          width: fit-content !important;
        }

        .splide__slide {
          max-width: fit-content !important;
          flex-shrink: 0 !important;
          width: auto !important;
          touch-action: pan-y !important;
        }

        /* تحسين الـ touch على الموبايل */
        @media (max-width: 768px) {
          .splide__slide {
            touch-action: pan-x !important;
          }
        }
      `}</style>
    </div>
  );
}
