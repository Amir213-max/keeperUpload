'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Splide, SplideSlide } from '@splidejs/react-splide';
import '@splidejs/react-splide/css';
import Image from 'next/image';

export default function ImageGallery({
  images,
  productName,
  selectedImage,
  onImageSelect,
  isVertical = true,
}) {
  const [fadeKey, setFadeKey] = useState(0);
  const [internalSelectedImage, setInternalSelectedImage] = useState(images[0]);
  const currentSelectedImage = selectedImage || internalSelectedImage;

  const handleImageClick = (url) => {
    if (url !== currentSelectedImage) {
      setFadeKey((prev) => prev + 1);
      if (onImageSelect) onImageSelect(url);
      else setInternalSelectedImage(url);
    }
  };

  if (isVertical) {
    // ✅ Vertical slider for sidebar
    return (
      <div className="h-full">
        <Splide
          options={{
            direction: 'ttb',
            height: '700px', // 👈 تقليل الارتفاع الكلي
            perPage: 6,
            gap: '15px', // 👈 زيادة المسافة بين الصور
            pagination: false,
            arrows: false,
            wheel: true,
            drag: true,
            breakpoints: {
              1024: { perPage: 7, height: '600px' },
              768: { perPage: 6, height: '420px' },
            },
          }}
          aria-label="Product side images"
          className="splide-vertical"
        >
          {images.map((img, index) => (
            <SplideSlide key={index}>
              <motion.button
                onClick={() => handleImageClick(img)}
                className={`w-[80%] mx-auto aspect-square  transition-all duration-300 overflow-hidden group 
                ${currentSelectedImage === img
                  ? ' shadow-lg ring-2 '
                  : '  hover:shadow-md'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Image
                  src={img}
                  alt={`${productName} - Image ${index + 1}`}
                  width={120}
                  height={120}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  style={{ maxWidth: '90%', maxHeight: '90%', margin: 'auto' }}
                  loading={index < 3 ? "eager" : "lazy"}
                  quality={75}
                  sizes="(max-width: 768px) 20vw, 120px"
                  placeholder="empty"
                  unoptimized={img?.startsWith('http')}
                />
              </motion.button>
            </SplideSlide>
          ))}
        </Splide>
      </div>
    );
  }

  // ✅ Horizontal slider for mobile
  return (
    <div className="w-full">
      <Splide
        options={{
          direction: 'ltr',
          height: 'auto',
          perPage: 6,
          pagination: false,
          arrows: false,
           gap: '-10px', // 👈 زيادة المسافة بين الصور
          wheel: true,
          breakpoints: {
            640: {
              perPage: 6,
               gap: '-10px',
            },
          },
        }}
        aria-label="Product images"
        className="w-full relative splide-custom-arrows"
      >
        {images.map((img, index) => (
          <SplideSlide key={index}>
            <motion.button
              onClick={() => handleImageClick(img)}
              className={`w-[90%]  aspect-square border-2 transition-all duration-300 overflow-hidden group 
              ${currentSelectedImage === img
                ? 'border-yellow-400 shadow-lg ring-2 ring-yellow-200'
                : 'border-gray-200 hover:border-yellow-300 hover:shadow-md'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Image
                src={img}
                alt={`${productName} - Image ${index + 1}`}
                width={120}
                height={120}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                style={{ maxWidth: '85%', maxHeight: '85%', margin: 'auto' }}
                loading={index < 3 ? "eager" : "lazy"}
                quality={75}
                sizes="(max-width: 640px) 20vw, 120px"
                placeholder="empty"
                unoptimized={img?.startsWith('http')}
              />
            </motion.button>
          </SplideSlide>
        ))}
      </Splide>
    </div>
  );
}
