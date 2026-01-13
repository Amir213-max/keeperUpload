'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { graphqlClient } from '../lib/graphqlClient';
import { PRODUCTS_BY_CATEGORY_QUERY } from '../lib/queries';
import { useTranslation } from '../contexts/TranslationContext';
import Link from 'next/link';

export default function BootsSlider() {
  const { t, lang } = useTranslation();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // افترض إن عندك ID للفئة 'boots' مثلا 3
        const categoryId = 17;

        const data = await graphqlClient.request(PRODUCTS_BY_CATEGORY_QUERY, { categoryId });
        // نجمع المنتجات من الفئة الرئيسية + المنتجات من subCategories لو موجودة
        const mainProducts = data.rootCategory?.products || [];
        const subProducts = data.rootCategory?.subCategories?.flatMap(sub => sub.products) || [];
        setProducts([...mainProducts, ...subProducts].slice(0, 10)); // آخر 10 منتجات
      } catch (err) {
        console.error("Error fetching boots products:", err);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="w-full max-w-9xl mx-auto px-4 space-y-5 py-10">
      <h2 className="text-white font-bold text-3xl text-center">
        {t("Gloves Collection")}
      </h2>

      <Swiper
        key={lang}
        modules={[Navigation, Autoplay]}
        spaceBetween={16}
        slidesPerView={5}
        loop={products.length > 5}
        autoplay={{
          delay: 3000,
          pauseOnMouseEnter: true,
          disableOnInteraction: false,
        }}
        navigation={true}
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        breakpoints={{
          1024: { slidesPerView: 3 },
          640: { slidesPerView: 2 },
        }}
        className="h-fit"
      >
        {products.map((item) => (
          <SwiperSlide key={item.id}>
            <Link href={`/product/${item.sku}`}>
              <div className="bg-neutral-900 hover:bg-neutral-800   shadow-md overflow-hidden flex flex-col h-96 cursor-pointer">
                <div className="relative w-full h-48 flex items-center justify-center">
                  {item.images?.[0] ? (
                    <Image
                      src={item.images[0]}
                      alt={item.name}
                      fill
                      className="object-contain pt-6"
                      unoptimized // مهم لتجنب مشاكل الـ 500/Timeout
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="text-lg text-center font-semibold mb-2">{item.name}</h3>
                  <h2 className="font-bold text-2xl mt-8 flex justify-center line-clamp-1">
                    ${item.list_price_amount || 0}
                  </h2>
                </div>
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
