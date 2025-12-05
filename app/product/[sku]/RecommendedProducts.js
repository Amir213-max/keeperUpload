'use client';

import { useTranslation } from '@/app/contexts/TranslationContext';
import { useCurrency } from '@/app/contexts/CurrencyContext';
import { graphqlClient } from '@/app/lib/graphqlClient';

import { Splide, SplideSlide } from '@splidejs/react-splide';
import '@splidejs/react-splide/css';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RECOMMENDED_PRODUCTS_QUERY } from '@/app/lib/queries';

export default function RecommendedSlider({ productId }) {
  const { t, lang } = useTranslation();
  const { formatPrice, loading: currencyLoading } = useCurrency();
  const [products, setProducts] = useState([]);
  const [recentProducts, setRecentProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('recommended');

  // ✅ Fetch recommended products
  useEffect(() => {
    const fetchRecommended = async () => {
      try {
        const data = await graphqlClient.request(RECOMMENDED_PRODUCTS_QUERY, {
          productId,
        });
        setProducts(
          data?.productsWithCategoryRecommendations?.recommended_products || []
        );
      } catch (err) {
        console.error('Error fetching recommended products:', err);
      }
    };
    if (productId) fetchRecommended();
  }, [productId]);

  // ✅ Load recently viewed
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentlyViewed');
      if (stored) {
        const parsed = JSON.parse(stored);
        const unique = Array.from(
          new Map(parsed.map((item) => [item.sku, item])).values()
        );
        setRecentProducts(unique);
      }
    } catch (err) {
      console.error('Failed to load recently viewed:', err);
    }
  }, []);

  const displayedProducts =
    activeTab === 'recommended' ? products : recentProducts;

  const sliderOptions = {
    type: 'loop',
    perPage: 5,
    gap: '1rem',
    autoplay: false,
    pauseOnHover: true,
    arrows: false,
    pagination: false,
    breakpoints: {
      1024: { perPage: 4 },
      640: { perPage: 2 },
    },
    direction: lang === 'ar' ? 'rtl' : 'ltr',
  };

  if (!products.length && !recentProducts.length) return null;

  return (
    <div className="w-full max-w-9xl mx-auto px-4 space-y-6 py-10">
      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('recommended')}
          className={`pb-2 font-semibold text-base transition-all ${
            activeTab === 'recommended'
              ? 'text-amber-500 border-b-2 border-amber-500'
              : 'text-gray-500 hover:text-amber-400'
          }`}
        >
          {t('Recommended for you')}
        </button>
        <button
          onClick={() => setActiveTab('recent')}
          className={`pb-2 font-semibold text-base transition-all ${
            activeTab === 'recent'
              ? 'text-amber-500 border-b-2 border-amber-500'
              : 'text-gray-500 hover:text-amber-400'
          }`}
        >
          {t('Recently viewed')}
        </button>
      </div>

      {/* Slider */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {displayedProducts.length > 0 ? (
            <Splide
              key={activeTab + lang}
              options={sliderOptions}
              aria-label="Products Slider"
            >
              {displayedProducts.map((item, index) => {
                const basePrice =
                  item.list_price_amount ||
                  item.price_range_from ||
                  item.price ||
                  0;
                let finalPrice = basePrice;
                const badgeLabel = item.productBadges?.[0]?.label || '';
                let discountPercent = 0;
                const discountMatch = badgeLabel.match(/(\d+)%/);

                if (discountMatch) {
                  discountPercent = parseFloat(discountMatch[1]);
                  finalPrice = basePrice - (basePrice * discountPercent) / 100;
                }

                // If there's no badge but there's price difference
                if (!discountPercent && item.price_range_exact_amount < basePrice) {
                  discountPercent = Math.round(
                    ((basePrice - item.price_range_exact_amount) / basePrice) * 100
                  );
                  finalPrice = item.price_range_exact_amount;
                }

                return (
                  <SplideSlide key={item.id || item.sku}>
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: index * 0.1,
                      }}
                    >
                      <Link href={`/product/${item.sku}`} className="block">
                        <div className="relative hover:bg-gray-100 transition duration-500 text-neutral-700 shadow-md overflow-hidden flex flex-col h-96 rounded-lg">
                          {/* ✅ Badge الخصم */}
                          {/* {discountPercent > 0 && (
                            <div
                              className={`absolute top-2 ${
                                lang === 'ar' ? 'left-2' : 'right-2'
                              } bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow-md z-10`}
                            >
                              -{discountPercent}%
                            </div>
                          )} */}
                              {badgeLabel && (
          <div
            className="absolute top-3 left-[-20px] w-[90px] text-center text-white text-xs font-bold py-1 rotate-[-45deg] shadow-md z-10"
            style={{
              backgroundColor: item.productBadges?.[0]?.color || "#888",
            }}
          >
            {badgeLabel}
          </div>
        )}

                          {/* ✅ Product image */}
                          <div className="relative w-full h-48 flex items-center justify-center">
                            {item.images?.[0] ? (
                              <Image
                                src={item.images[0]}
                                alt={item.name}
                                fill
                                className="object-contain pt-6"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                No Image
                              </div>
                            )}
                          </div>

                          {/* ✅ Product details */}
                          <div className="p-5 text-center">
                            <h3 className="text-base font-semibold mb-2 line-clamp-2">
                              {item.name}
                            </h3>

                            {discountPercent > 0 ? (
                              <>
                                <div className="line-through text-gray-500 text-sm">
                                  {currencyLoading
                                    ? '...'
                                    : formatPrice(basePrice)}
                                </div>
                                <h2 className="font-bold text-xl text-neutral-900">
                                  {currencyLoading
                                    ? '...'
                                    : formatPrice(finalPrice)}
                                </h2>
                              </>
                            ) : (
                              <h2 className="font-bold text-xl text-neutral-900">
                                {currencyLoading
                                  ? '...'
                                  : formatPrice(basePrice)}
                              </h2>
                            )}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  </SplideSlide>
                );
              })}
            </Splide>
          ) : (
            <p className="text-center text-gray-500 py-6">
              {activeTab === 'recommended'
                ? t('No recommended products found.')
                : t('No recently viewed products yet.')}
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
