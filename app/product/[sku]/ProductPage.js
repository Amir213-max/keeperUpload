'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/app/contexts/TranslationContext';
import Image from 'next/image';
import ImageGallery from './ImageGallery';
import ProductDetailsSidebar from './ProductDetailsSidebar';

export default function ProductPage({ product }) {
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [isZoomed, setIsZoomed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });

  const imageContainerRef = useRef(null);

  // ✅ Set default image
  useEffect(() => {
    if (product.images?.length > 0 && !selectedImage) {
      setSelectedImage(product.images[0]);
      setSelectedIndex(0);
    }
  }, [product.images, selectedImage]);

  const handleImageSelect = (img, index) => {
    setSelectedImage(img);
    setSelectedIndex(index);
  };

  const handleZoomMove = (x, y, width, height, left, top) => {
    const newX = ((x - left) / width) * 100;
    const newY = ((y - top) / height) * 100;
    setZoomPosition({ x: newX, y: newY });
  };

  const handleMouseMove = (e) => {
    const { left, top, width, height } =
      imageContainerRef.current.getBoundingClientRect();
    handleZoomMove(e.pageX, e.pageY, width, height, left, top);
  };

  // ✅ دعم الزووم باللمس (Touch Zoom)
  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const { left, top, width, height } =
      imageContainerRef.current.getBoundingClientRect();
    handleZoomMove(touch.pageX, touch.pageY, width, height, left, top);
  };

  const handleTouchStart = (e) => {
    setIsZoomed(true);
    handleTouchMove(e); // عشان الزووم يبدأ من أول لمسة
  };

  const handleTouchEnd = () => {
    setIsZoomed(false);
  };

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ✅ Fullscreen Zoom Modal */}
        <AnimatePresence>
          {isModalOpen && selectedImage && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-zoom-out"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="relative w-[90vw] h-[90vh]"
              >
                <Image
                  src={selectedImage}
                  alt="Zoomed Product"
                  fill
                  className="object-contain"
                  priority
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ✅ Layout */}
        <div className="grid grid-cols-8 gap-2">
          {/* ✅ Gallery - للشاشات المتوسطة والكبيرة */}
          <div className="hidden md:block col-span-1">
            <ImageGallery
              images={product.images}
              productName={product.name}
              selectedImage={selectedImage}
              selectedIndex={selectedIndex}
              onImageSelect={handleImageSelect}
              isVertical={true}
            />
          </div>

          {/* ✅ Main Image */}
          <div className="col-span-8 md:col-span-5">
            <div
              ref={imageContainerRef}
              className="relative w-full h-[-webkit-fill-available] aspect-square bg-white flex items-center justify-center overflow-hidden border border-gray-100 group select-none"
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={() => setIsModalOpen(true)}
            >
              <AnimatePresence mode="wait">
                {selectedImage ? (
                  <motion.div
                    key={selectedImage}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                    className="relative w-full h-full"
                  >
                    <div
                      className="absolute inset-0 transition-all duration-500 ease-out"
                      style={{
                        backgroundImage: `url(${selectedImage})`,
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: isZoomed ? '200%' : 'contain',
                        backgroundPosition: isZoomed
                          ? `${zoomPosition.x}% ${zoomPosition.y}%`
                          : 'center',
                      }}
                    ></div>
                    <Image
                      src={selectedImage}
                      alt={product.name}
                      fill
                      className="object-contain opacity-0"
                      sizes="(min-width: 1024px) 50vw"
                      priority
                    />
                  </motion.div>
                ) : (
                  <span className="text-gray-400">No Image Available</span>
                )}
              </AnimatePresence>
            </div>

            {/* ✅ Gallery في الموبايل (أفقي تحت الصورة) */}
            <div className="block md:hidden mt-4">
              <ImageGallery
                images={product.images}
                productName={product.name}
                selectedImage={selectedImage}
                selectedIndex={selectedIndex}
                onImageSelect={handleImageSelect}
                isVertical={false}
              />
            </div>
          </div>

          {/* ✅ Sidebar */}
          <div className="col-span-8 md:col-span-2 p-3 ">
            <ProductDetailsSidebar
              product={product}
              selectedImage={selectedImage}
              onImageSelect={handleImageSelect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
