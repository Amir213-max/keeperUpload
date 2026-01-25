'use client';
import { useEffect, useState } from 'react';
import { Splide, SplideSlide } from '@splidejs/react-splide';
import '@splidejs/react-splide/css';
import Image from 'next/image';
import Link from 'next/link';
import { gql } from 'graphql-request';
import { graphqlClient } from '../lib/graphqlClient';
import { useTranslation } from '../contexts/TranslationContext';

// 🔹 GraphQL Query
const GET_BRANDS = gql`
  query {
    brands {
      id
      name
      logo
    }
  }
`;

// ✅ Custom Loader يسمح بتحميل الصور من أي مصدر
const customLoader = ({ src }) => {
  return src;
};

export default function MultiSlider_6() {
  const { t, lang } = useTranslation();
  const [brands, setBrands] = useState([]);

  // 🔹 Fetch brands from API
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const data = await graphqlClient.request(GET_BRANDS);
        const filtered = (data?.brands || []).filter(
          (b) => b.logo && b.logo.trim() !== ''
        );
        setBrands(filtered);
      } catch (error) {
        console.error('Error fetching brands:', error);
      }
    };
    fetchBrands();
  }, []);

  // 🔹 Splide settings
  const sliderOptions = {
    type: 'loop',
    perPage: 5,
    gap: '1rem',
    autoplay: true,
    interval: 3000,
    pauseOnHover: true,
    arrows: true,
    pagination: false,
    breakpoints: {
      1024: { perPage: 3 },
      640: { perPage: 2 },
    },
    direction: lang === 'ar' ? 'rtl' : 'ltr',
  };

  return (
    <div className="w-full mx-auto px-4 space-y-5 py-10 border-b-2 border-white">
      <div className="mx-auto text-2xl flex justify-center font-bold text-white">
        {t('From the league to the national team - our Brands')}
      </div>

      {/* ✅ Dynamic Slider */}
     <Splide
  key={`${lang}-${brands.length}`} // ✅ إعادة بناء السلايدر عند تغيير اللغة أو البيانات
  className="h-fit"
  options={sliderOptions}
  aria-label="Brand logos"
>

        {brands.length > 0 ? (
          brands.map((brand, index) => {
            // ✅ استخدام اسم البراند في الـ URL بدلاً من ID
            const brandName = brand?.name ? String(brand.name).trim() : null;
            const brandId = brand?.id ? String(brand.id).trim() : null;
            
            if (!brandName || !brandId) {
              console.warn('Brand missing name or ID:', brand);
              return null;
            }
            
            return (
              <SplideSlide key={brandId || index}>
                <Link href={`/brands/${encodeURIComponent(brandName)}`}>
                  <div className="  shadow-md overflow-hidden w-full flex flex-col h-32 cursor-pointer hover:scale-105 transition-transform duration-300 bg-black">
                    <div className="relative w-full h-full flex items-center justify-center p-6">
                      <Image
                        loader={customLoader} // ✅ استخدم الـ Loader هنا
                        src={brand.logo}
                        alt={brandName}
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                </Link>
              </SplideSlide>
            );
          })
        ) : (
          <p className="text-center text-white">Loading brands...</p>
        )}
      </Splide>
    </div>
  );
}