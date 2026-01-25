'use client';

import { useCallback, useMemo, useRef, useEffect } from 'react';
import { Splide, SplideSlide } from '@splidejs/react-splide';
import '@splidejs/react-splide/css';
import { useTranslation } from '../contexts/TranslationContext';

export default function BrandsSlider({ brands, selectedBrand, onBrandChange }) {
  const { lang } = useTranslation();
  const splideRef = useRef(null);
  const containerRef = useRef(null);

  const validBrands = useMemo(() => [...new Set(brands.filter(Boolean))], [brands]);

  if (validBrands.length <= 1) return null;

  if (!onBrandChange || typeof onBrandChange !== 'function') {
    console.warn('⚠️ BrandsSlider: onBrandChange is not a function', { onBrandChange });
    return null;
  }

  const handleBrandClick = useCallback(
    (brand) => {
      if (brand === selectedBrand) {
        onBrandChange(null);
      } else {
        onBrandChange(brand);
      }
    },
    [onBrandChange, selectedBrand]
  );

  // Fix: Enable ALL visible slides to be clickable - continuous monitoring
  useEffect(() => {
    let intervalId = null;
    let resizeObserver = null;
    let mutationObserver = null;

    // Function to force enable all visible slides
    const forceEnableVisibleSlides = () => {
      if (!splideRef.current?.splide) return;

      const splide = splideRef.current.splide;
      const rootElement = splide.root?.element;
      
      if (!rootElement) return;

      const containerRect = rootElement.getBoundingClientRect();
      const allSlides = rootElement.querySelectorAll('.splide__slide');
      
      allSlides.forEach((slide) => {
        const rect = slide.getBoundingClientRect();
        
        // Check if slide is in viewport (with generous margin)
        const isInViewport = 
          rect.right >= containerRect.left - 100 && 
          rect.left <= containerRect.right + 100 &&
          rect.bottom >= containerRect.top - 100 &&
          rect.top <= containerRect.bottom + 100;

        if (isInViewport) {
          // Force enable - override everything
          slide.style.setProperty('pointer-events', 'auto', 'important');
          slide.style.setProperty('opacity', '1', 'important');
          slide.removeAttribute('aria-hidden');
          
          const button = slide.querySelector('button');
          if (button) {
            button.style.setProperty('pointer-events', 'auto', 'important');
            button.style.setProperty('cursor', 'pointer', 'important');
            button.removeAttribute('disabled');
            button.removeAttribute('tabindex');
            // Ensure button is not blocked by parent
            button.onclick = button.onclick || (() => {
              const brandText = button.textContent?.trim();
              if (brandText) handleBrandClick(brandText);
            });
          }
        }
      });
    };

    // Wait for Splide to be ready
    const initTimeout = setTimeout(() => {
      if (!splideRef.current?.splide) return;

      const splide = splideRef.current.splide;

      // Run immediately
      forceEnableVisibleSlides();

      // Run continuously every 100ms to catch all changes
      intervalId = setInterval(() => {
        requestAnimationFrame(forceEnableVisibleSlides);
      }, 100);

      // Listen to Splide events
      splide.on('mounted', forceEnableVisibleSlides);
      splide.on('updated', forceEnableVisibleSlides);
      splide.on('move', forceEnableVisibleSlides);
      splide.on('resize', forceEnableVisibleSlides);
      splide.on('moved', forceEnableVisibleSlides);

      // Watch for DOM changes
      const rootElement = splide.root?.element;
      if (rootElement) {
        mutationObserver = new MutationObserver(() => {
          requestAnimationFrame(forceEnableVisibleSlides);
        });
        mutationObserver.observe(rootElement, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['aria-hidden', 'style', 'class']
        });
      }

      // Watch for resize
      const elementToObserve = containerRef.current || rootElement;
      if (elementToObserve) {
        resizeObserver = new ResizeObserver(() => {
          requestAnimationFrame(forceEnableVisibleSlides);
        });
        resizeObserver.observe(elementToObserve);
      }

      window.addEventListener('resize', forceEnableVisibleSlides);
      window.addEventListener('scroll', forceEnableVisibleSlides, true);
    }, 150);

    return () => {
      clearTimeout(initTimeout);
      if (intervalId) clearInterval(intervalId);
      if (mutationObserver) mutationObserver.disconnect();
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', forceEnableVisibleSlides);
      window.removeEventListener('scroll', forceEnableVisibleSlides, true);
      if (splideRef.current?.splide) {
        const splide = splideRef.current.splide;
        splide.off('mounted', forceEnableVisibleSlides);
        splide.off('updated', forceEnableVisibleSlides);
        splide.off('move', forceEnableVisibleSlides);
        splide.off('resize', forceEnableVisibleSlides);
        splide.off('moved', forceEnableVisibleSlides);
      }
    };
  }, [validBrands.length, handleBrandClick]);

  // Event delegation as fallback - capture all clicks on brand buttons
  useEffect(() => {
    const handleClick = (e) => {
      const button = e.target.closest('button');
      if (button && containerRef.current?.contains(button)) {
        const brandText = button.textContent?.trim();
        if (brandText && validBrands.includes(brandText)) {
          e.preventDefault();
          e.stopPropagation();
          handleBrandClick(brandText);
        }
      }
    };

    if (containerRef.current) {
      containerRef.current.addEventListener('click', handleClick, true);
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('click', handleClick, true);
      }
    };
  }, [validBrands, handleBrandClick]);

  return (
    <div ref={containerRef} className="relative my-6 px-0">
      <Splide
        ref={splideRef}
        options={{
          type: 'loop',
          autoWidth: true,
          trimSpace: false,
          perMove: 1,
          gap: '.5rem',
          pagination: false,
          arrows: true,
          direction: lang === 'ar' ? 'rtl' : 'ltr',
          drag: true,
          focus: 'center',
          updateOnMove: true,
          focusableNodes: 'button',
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

      {/* ستايل الأسهم + تفعيل كل السلايدات الظاهرة */}
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

        /* Fix: Force enable ALL slides and buttons - override everything */
        .splide__slide,
        .splide__slide[aria-hidden='true'],
        .splide__slide[aria-hidden='false'],
        .splide__slide[tabindex="-1"],
        .splide__slide[tabindex="0"] {
          pointer-events: auto !important;
          opacity: 1 !important;
        }

        /* Ensure buttons are ALWAYS clickable */
        .splide__slide button,
        .splide__slide[aria-hidden='true'] button,
        .splide__slide[aria-hidden='false'] button {
          pointer-events: auto !important;
          cursor: pointer !important;
          user-select: none !important;
        }

        /* Override Splide track if it blocks clicks */
        .splide__track {
          pointer-events: none !important;
        }

        .splide__track .splide__slide {
          pointer-events: auto !important;
        }
      `}</style>
    </div>
  );
}