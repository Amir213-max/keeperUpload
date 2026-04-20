'use client';

import { useCallback, useMemo, useRef } from 'react';
import { Splide, SplideSlide } from '@splidejs/react-splide';
import '@splidejs/react-splide/css';
import { useTranslation } from '../contexts/TranslationContext';

export default function BrandsSlider({ brands, selectedBrand, onBrandChange }) {
  const { lang } = useTranslation();
  const splideRef = useRef(null);
  const normalizedSelectedBrand = useMemo(
    () => String(selectedBrand || '').trim().toLowerCase(),
    [selectedBrand]
  );

  const validBrands = useMemo(() => {
    const byKey = new Map();
    for (const rawBrand of brands || []) {
      const label = String(rawBrand || '').trim();
      if (!label) continue;
      const key = label.toLowerCase();
      if (!byKey.has(key)) {
        byKey.set(key, label);
      }
    }
    return Array.from(byKey.entries()).map(([key, label]) => ({ key, label }));
  }, [brands]);

  if (validBrands.length <= 1) return null;

  if (!onBrandChange || typeof onBrandChange !== 'function') {
    console.warn('⚠️ BrandsSlider: onBrandChange is not a function', { onBrandChange });
    return null;
  }

  const handleBrandClick = useCallback(
    (brandKey, brandLabel) => {
      if (brandKey === normalizedSelectedBrand) {
        onBrandChange(null);
      } else {
        onBrandChange(brandLabel);
      }
    },
    [onBrandChange, normalizedSelectedBrand]
  );

  return (
    <div
      className="relative my-6 w-full max-w-full min-w-0 overflow-x-hidden"
    >
      <Splide
        ref={splideRef}
        options={{
          type: 'slide',
          autoWidth: true,
          trimSpace: true,
          perMove: 1,
          gap: '.5rem',
          pagination: false,
          arrows: false,
          direction: lang === 'ar' ? 'rtl' : 'ltr',
          drag: true,
          focus: 0,
          updateOnMove: true,
        }}
        className="w-full brands-centered-slider"
      >
        {validBrands.map((brand) => (
          <SplideSlide key={brand.key} className="p-0 m-0 flex justify-center items-center">
            <button
              type="button"
              onClick={() => handleBrandClick(brand.key, brand.label)}
              className={`inline-flex items-center justify-center
                px-5 py-2.5 text-sm font-semibold whitespace-nowrap
                transition-all duration-200
                ${
                  normalizedSelectedBrand === brand.key
                    ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg scale-105'
                    : 'bg-white text-gray-700 shadow hover:bg-gray-50'
                }
              `}
            >
              {brand.label}
            </button>
          </SplideSlide>
        ))}
      </Splide>

      {/* تنسيقات السلايدر */}
      <style jsx>{`
        .brands-centered-slider :global(.splide__track) {
          width: fit-content;
          max-width: 100%;
          margin: 0 auto;
        }
        .brands-centered-slider :global(.splide__list) {
          justify-content: center;
        }
      `}</style>
    </div>
  );
}