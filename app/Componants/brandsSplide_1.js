'use client';

import { useCallback, useMemo } from 'react';
import { Splide, SplideSlide } from '@splidejs/react-splide';
import '@splidejs/react-splide/css';
import { useTranslation } from '../contexts/TranslationContext';

export default function BrandsSlider({ brands, selectedBrand, onBrandChange }) {
  const { lang } = useTranslation();

  // 🔹 Memoize valid brands to prevent recalculation
  const validBrands = useMemo(() => [...new Set(brands.filter(Boolean))], [brands]);

  if (validBrands.length <= 1) return null;

  // 🔹 إذا لم يكن onBrandChange معرف، لا تعرض الكومبوننت
  if (!onBrandChange || typeof onBrandChange !== 'function') {
    console.warn('⚠️ BrandsSlider: onBrandChange is not a function', { onBrandChange });
    return null;
  }

  const handleBrandClick = useCallback(
    (brand) => {
      // نفس منطق CheckDropdown:
      // لو ضغط على نفس البراند → إلغاء التحديد
      if (brand === selectedBrand) {
        onBrandChange(null);
      } else {
        onBrandChange(brand);
      }
    },
    [onBrandChange, selectedBrand]
  );

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
          breakpoints: {
            1024: { arrows: false },
          },
        }}
        className="w-full"
      >
        {validBrands.map((brand) => (
          <SplideSlide key={brand} className="p-0 m-0 flex justify-center items-center">
            <button
              type="button"
              onClick={() => handleBrandClick(brand)}
              className={`inline-flex items-center justify-center
                px-5 py-2.5 text-sm font-semibold whitespace-nowrap
                transition-all duration-200
                ${
                  selectedBrand === brand
                    ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg scale-105'
                    : 'bg-white text-gray-700 shadow hover:bg-gray-50'
                }
              `}
            >
              {brand}
            </button>
          </SplideSlide>
        ))}
      </Splide>

      {/* ستايل الأسهم */}
      <style jsx>{`
        .splide__arrow {
          background: #f3f4f6 !important;
          color: #374151 !important;
          width: 28px !important;
          height: 28px !important;
          border-radius: 999px !important;
        }

        .splide__arrow:hover {
          background: #e5e7eb !important;
        }

        .splide__arrow svg {
          width: 14px !important;
          height: 14px !important;
        }

        @media (max-width: 1024px) {
          .splide__arrow {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
