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
          perPage: 5,
          perMove: 1,
          breakpoints: {
            1024: { perPage: 5 },
            768: { perPage: 4 },
            640: { perPage: 3 },
            480: { perPage: 2 },
          },
          gap: '8px',
          pagination: false,
          arrows: true,
          direction: lang === 'ar' ? 'rtl' : 'ltr',
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
                whitespace-nowrap w-full
                rounded-lg
                border-2
                ${
                  selectedBrand === brand
                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 border-yellow-500 shadow-lg transform scale-105'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-yellow-400 hover:bg-yellow-50 hover:shadow-md'
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

        /* تحسين التصميم على الشاشات الصغيرة */
        @media (max-width: 768px) {
          .splide__arrow {
            width: 24px !important;
            height: 24px !important;
          }

          .splide__arrow svg {
            width: 12px !important;
            height: 12px !important;
          }

          .splide__arrow--prev {
            left: -12px !important;
          }

          .splide__arrow--next {
            right: -12px !important;
          }
        }
      `}</style>
    </div>
  );
}
