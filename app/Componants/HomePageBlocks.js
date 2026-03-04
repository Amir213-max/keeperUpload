"use client";

import { useEffect, useState } from "react";
import { graphqlRequest } from "../lib/graphqlClientHelper";
import { GET_ACTIVE_HOME_PAGE_BLOCKS, PRODUCTS_BY_IDS_QUERY, GET_BLOGS_QUERY } from "../lib/queries";
import Link from "next/link";
import Image from "next/image";
import { useCurrency } from "../contexts/CurrencyContext";
import PriceDisplay from "../components/PriceDisplay";
import { Splide, SplideSlide } from "@splidejs/react-splide";
import "@splidejs/react-splide/css";
import { useTranslation } from "../contexts/TranslationContext";
import { motion } from "framer-motion";
import MultiSlider_6 from "./Slider_6";
import Loader from "./Loader";
import DynamicText from "../components/DynamicText";

export default function HomePageBlocks() {
  const { lang, t } = useTranslation();
  const BASE_URL = "https://keepersport.store/storage/";
  const { loading: currencyLoading } = useCurrency();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsMap, setProductsMap] = useState({});
  const [blogs, setBlogs] = useState([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    async function fetchBlocks() {
      try {
        // ✅ جلب الـ blocks أولاً
        // Use API route proxy to avoid CORS issues
        const data = await graphqlRequest(GET_ACTIVE_HOME_PAGE_BLOCKS);
        const activeBlocks = data.activeHomepageBlocks || [];
        setBlocks(activeBlocks);
        setLoading(false); // ✅ نخفي الـ loader بمجرد جلب الـ blocks

        // ✅ جلب المنتجات بشكل متوازي لجميع الـ blocks في نفس الوقت
        const productBlocks = activeBlocks.filter(
          (block) => block.type === "products" && block.content?.product_ids?.length
        );

        if (productBlocks.length > 0) {
          // ✅ نجمع كل الـ product IDs من كل الـ blocks
          const allProductPromises = productBlocks.flatMap((block) => {
            const productIds = block.content.product_ids.map((p) => p.product_id);
            return productIds.map((id) =>
              graphqlRequest(PRODUCTS_BY_IDS_QUERY, { id })
                .then((res) => ({ blockId: block.id, product: res.product }))
                .catch(() => ({ blockId: block.id, product: null }))
            );
          });

          // ✅ نجلب كل المنتجات في نفس الوقت
          const allResults = await Promise.all(allProductPromises);

          // ✅ نجمع المنتجات حسب الـ block
          const productsByBlock = {};
          allResults.forEach(({ blockId, product }) => {
            if (product) {
              if (!productsByBlock[blockId]) {
                productsByBlock[blockId] = [];
              }
              productsByBlock[blockId].push(product);
            }
          });

          // ✅ نحدث الـ state مرة واحدة
          setProductsMap(productsByBlock);
        }

        // ✅ جلب الـ blogs
        try {
          const blogsData = await graphqlRequest(GET_BLOGS_QUERY);
          setBlogs(blogsData?.blogs || []);
        } catch (err) {
          console.error("❌ Error fetching blogs:", err);
        }
      } catch (error) {
        console.error("❌ Error fetching home page blocks:", error);
        setLoading(false);
      }
    }

    fetchBlocks();
  }, []);

  if (loading) return <Loader />;
  if (!blocks.length) return <p className="text-center py-8 text-gray-500">No blocks available.</p>;

  const getImageUrl = (img) => {
    if (!img) return "";
    let path = typeof img === "string" ? img : img.url || img.src || "";
    return path.startsWith("http") ? path : `${BASE_URL}${path}`;
  };

  const firstTextBlock = blocks.find((b) => b.type === "text");
  const otherBlocks = blocks.filter((b) => b !== firstTextBlock);
  const firstBannerBlockIndex = blocks.findIndex((b) => b.type === "banners");
    
  return (
    <div className="pt-3 space-y-3">
      {otherBlocks.map((block, blockIndex) => {
        const isFirstBannerBlock = block.type === "banners" && blockIndex === firstBannerBlockIndex;

        return (
          <motion.div
            key={block.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: blockIndex * 0.2 }}
            className={`overflow-hidden shadow-lg w-full ${block.css_class || ""}`}
            style={{
              backgroundColor: block.background_color || (block.type === "banners" ? "#000" : "#f9f9f9"),
              color: block.text_color || "#fff",
            }}
          >
            {block.title && (
              <h2 className="text-2xl sm:text-3xl md:text-4xl text-center font-bold mb-6 pt-6 text-white">
                {block.title}
              </h2>
            )}

            <div className=" pb-1  space-y-3">
              {/* 🔹 Slider Block */}
              {block.type === "slider" && block.content?.slides?.length > 0 && (
                <Splide
                  options={{
                    type: "loop",
                    perPage: 3,
                    autoplay: true,
                    pauseOnHover: true,
                    arrows: true,
                    pagination: true,
                    direction: lang === "ar" ? "rtl" : "ltr",
                  }}
                >
                  {block.content.slides.map((slide, i) => (
                    <SplideSlide key={i}>
                      <div className="relative w-full overflow-hidden">
                        <Image
                          src={getImageUrl(slide.image)}
                          alt={slide.title || ""}
                          width={1920}
                          height={800}
                          className="w-full h-auto object-contain"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-center text-white px-4">
                          <h3 className="text-2xl md:text-4xl font-bold mb-3">{slide.title}</h3>
                          <p className="max-w-2xl text-sm md:text-base mb-4">{slide.description}</p>
                          {slide.button_text && (
                            <Link
                              href={slide.button_link || "#"}
                              className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-2 font-semibold"
                            >
                              {slide.button_text}
                            </Link>
                          )}
                        </div>
                      </div>
                    </SplideSlide>
                  ))}
                </Splide>
              )}

             {block.type === "banners" && block.content?.banners?.length > 0 && (
  <>
    {block.content.banners.length <= 2 ? (
      <div className="w-full  md:mx-0">
        <div
          className={`grid ${
            block.content.banners.length === 1
              ? "grid-cols-1"
              : "grid-cols-1 md:grid-cols-2"
          } gap-2 md:gap-4`}
        >
          {block.content.banners.map((banner, idx) => {
            const hasMobileImage = isMobile && banner.mobile_image;
            const imageSrc = hasMobileImage
                ? getImageUrl(banner.mobile_image)
                : getImageUrl(banner.image);

            const isTwoBanners = block.content.banners.length === 2;

            return (
              <motion.a
                key={banner.id || idx}
                href={banner.link || "#"}
                target={banner.link ? "_blank" : undefined}
                rel={banner.link ? "noopener noreferrer" : undefined}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className={`relative overflow-hidden bg-black w-full group
                  ${
                    block.content.banners.length === 1
                      ? " sm:aspect-[2500/833]"
                      : isTwoBanners
                           ? "aspect-[4/3] sm:aspect-[5/3]"
                            : "aspect-[4/3] sm:aspect-[2500/833]"
                  }
                `}
              >
                {isMobile ? (
                  <Image
                    src={imageSrc}
                    alt={banner.title || ""}
                    width={1920}
                    height={800}
                    sizes={isTwoBanners 
                      ? "(max-width: 768px) 100vw, 50vw" 
                      : "100vw"}
                    className="w-full h-auto object-center transition-transform duration-500 ease-out group-hover:scale-105"
                    unoptimized
                    priority={isFirstBannerBlock && idx === 0}
                  />
                ) : (
                  <Image
                    src={imageSrc}
                    alt={banner.title || ""}
                    fill
                    sizes={isTwoBanners 
                      ? "(max-width: 768px) 100vw, 50vw" 
                      : "100vw"}
                    className="object-center transition-transform duration-500 ease-out group-hover:scale-105"
                    unoptimized
                    priority={isFirstBannerBlock && idx === 0}
                  />
                )}
              </motion.a>
            );
          })}
        </div>
      </div>
    ) : (
      <div className="w-full md:mx-0 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        <div className="flex gap-3 md:gap-4 min-w-max pb-2 md:pb-4 scroll-smooth px-2 md:px-4">
          {block.content.banners.map((banner, idx) => {
            const imageSrc =
              isMobile && banner.mobile_image
                ? getImageUrl(banner.mobile_image)
                : getImageUrl(banner.image);

            return (
              <motion.a
                key={banner.id || idx}
                href={banner.link || "#"}
                target={banner.link ? "_blank" : undefined}
                rel={banner.link ? "noopener noreferrer" : undefined}
                initial={{ opacity: 0, x: 60, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ 
                  duration: 0.6, 
                  delay: idx * 0.1,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                whileHover={{ 
                  scale: 1.03, 
                  y: -5,
                  transition: { duration: 0.3, ease: "easeOut" }
                }}
                whileTap={{ scale: 0.97 }}
                className="relative flex-shrink-0 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-black group rounded-lg md:rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300"
                style={{
                  width: "clamp(280px, 85vw, 380px)",
                  height: "clamp(350px, 105vw, 475px)"
                }}
              >
                {/* Glowing border effect */}
                <motion.div
                  className="absolute inset-0 rounded-lg md:rounded-xl border border-transparent group-hover:border-white/20 transition-all duration-300 z-20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.1 + 0.2 }}
                />

                {/* Image container with enhanced animations */}
                <motion.div
                  className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-950 to-black p-2 md:p-3"
                  initial={{ scale: 1.1, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    duration: 0.7, 
                    delay: idx * 0.1 + 0.15,
                    ease: [0.25, 0.46, 0.45, 0.94]
                  }}
                >
                  {isMobile ? (
                    <motion.div
                      className="relative w-full h-full flex items-center justify-center"
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                      <Image
                        src={imageSrc}
                        alt={banner.title || ""}
                        width={380}
                        height={570}
                        sizes="(max-width: 768px) 85vw, 380px"
                        className="w-full h-full object-contain"
                        quality={95}
                        unoptimized
                        priority={isFirstBannerBlock && idx === 0}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      className="relative w-full h-full flex items-center justify-center"
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                      <Image
                        src={imageSrc}
                        alt={banner.title || ""}
                        fill
                        sizes="(max-width: 768px) 85vw, 380px"
                        className="object-contain"
                        quality={95}
                        unoptimized
                        priority={isFirstBannerBlock && idx === 0}
                      />
                    </motion.div>
                  )}
                </motion.div>
                
                {/* Shine effect on hover */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg md:rounded-xl pointer-events-none"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                />
                
                {/* Subtle overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 rounded-lg md:rounded-xl pointer-events-none" />
              </motion.a>
            );
          })}
        </div>
      </div>
    )}
  </>
)}

        
              {/* 🔹 Products Block */}
              {block.type === "products" && productsMap[block.id]?.length > 0 && (
                <div className="px-4 md:px-8 overflow-hidden lg:px-12">
                  <Splide
                    key={lang}
                    options={{
                      type: "slide",
                      perPage: block.content?.per_row || 5,
                      perMove: 1,
                      gap: "1rem",
                      rewind: false,
                      pagination: false,
                      arrows: true,
                      direction: lang === "ar" ? "rtl" : "ltr",
                      breakpoints: {
                        1280: { perPage: 5 },
                        1024: { perPage: 4 },
                        768: { perPage: 3 },
                        640: { perPage: 2 },
                      },
                    }}
                  >
                    {productsMap[block.id].map((product, idx) => {
                      const badgeLabel = product.productBadges?.[0]?.label || "";
                      const badgeColor = product.productBadges?.[0]?.color || "#888";

                      return (
                        <SplideSlide key={`${product.id}-${idx}`}>
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                            className="h-full overflow-hidden"
                          >
                            <Link
                             href={`/product/${encodeURIComponent(product.sku)}`}
                              className="block bg-[#111] hover:bg-[#2b2a2a] overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 h-full"
                            >
                              <div className="relative flex items-center justify-center overflow-hidden aspect-[125/116] md:aspect-[1.3/1.5]">
                                {/* 🔹 Badge */}
                                {badgeLabel && (
                                  <div
                                    className="absolute top-3 left-[-20px] w-[90px] text-center text-white text-xs font-bold py-1 rotate-[-45deg] shadow-md z-10"
                                    style={{ backgroundColor: badgeColor }}
                                  >
                                    {badgeLabel}
                                  </div>
                                )}

                                {/* 🔹 Product Image */}
                                {product.images?.[0] ? (
                                  <Image
                                    src={
                                      typeof product.images[0] === "string"
                                        ? product.images[0]
                                        : product.images[0]?.url
                                    }
                                    alt={product.name || "Product image"}
                                    fill
                                    className="object-contain p-3"
                                    loading="lazy"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                    quality={85}
                                    unoptimized={typeof product.images[0] === "string" && product.images[0]?.startsWith('http')}
                                  />
                                ) : (
                                  <div className="text-gray-500 text-sm" role="img" aria-label="No image available">No Image</div>
                                )}
                              </div>
{/* 🔹 Product Info */}
<div className="p-4 text-center overflow-hidden flex flex-col justify-between">
  {product.brand_name && (
    <p className="text-gray-300 text-sm mb-1">
      <DynamicText>{product.brand_name}</DynamicText>
    </p>
  )}

  <h3 className="text-white text-sm sm:text-base font-medium line-clamp-2 mb-2">
    <DynamicText>{product.name || ''}</DynamicText>
  </h3>

  <div className="text-white font-bold text-lg">
    {badgeLabel && badgeLabel.includes("%") ? (
      <>
        {/* السعر القديم */}
        <div className="text-gray-400 text-sm line-through mb-1">
          <PriceDisplay
            price={product.list_price_amount}
            loading={currencyLoading}
          />
        </div>

        {/* السعر بعد الخصم */}
        <div className="text-white text-lg">
          <PriceDisplay
            price={
              product.list_price_amount -
              (product.list_price_amount * Math.abs(parseFloat(badgeLabel.replace("%", "")))) / 100
              
            }
          
            
            loading={currencyLoading}
          />
        </div>
      </>
    ) : (
      // لو مفيش badge
      <PriceDisplay
        price={product.list_price_amount}
        loading={currencyLoading}
      />
    )}
  </div>
</div>

                            </Link>
                          </motion.div>
                        </SplideSlide>
                      );
                    })}
                  </Splide>

                  {block.button_text && (
                    <div className="flex justify-center mt-4">
                      <Link
                        href={block.button_url || "#"}
                        className={`  font-semibold px-6 py-3 text-lg ${
                          block.button_style === "red"
                            ? "bg-red-500 text-white hover:bg-red-600"
                            : "bg-yellow-500 text-black hover:bg-yellow-400"
                        }`}
                      >
                        {block.button_text}
                      </Link>
                    </div>
                  )}
                </div>
              )}
                

            </div>
          </motion.div>
        );
      })}
      <MultiSlider_6 />

      {/* 🔹 Blogs Section */}
      {blogs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="overflow-hidden shadow-lg w-full bg-black"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl text-center font-bold mb-6 pt-6 text-white">
            {t('Blogs') || 'Blogs'}
          </h2>

          <div className="px-4 md:px-8 lg:px-12 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {blogs.map((blog, idx) => {
                const imageUrl = getImageUrl(blog.image);

                return (
                  <motion.div
                    key={blog.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: idx * 0.1 }}
                    className="group"
                  >
                    <Link href={`/blogs`} className="block h-full">
                      <div className="bg-[#1a1a1a] hover:bg-[#2a2a2a] rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 h-full flex flex-col">
                        {/* Image */}
                        <div className="relative w-full aspect-[16/9] overflow-hidden">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={blog.title || "Blog Image"}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-500"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                              <span className="text-gray-500">No Image</span>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-4 sm:p-6 flex-1 flex flex-col">
                          {/* Title */}
                          {blog.title && (
                            <h2 className="text-xl sm:text-2xl font-bold mb-3 line-clamp-2 group-hover:text-yellow-400 transition-colors duration-300">
                              <DynamicText>{blog.title}</DynamicText>
                            </h2>
                          )}

                          {/* Description */}
                          {blog.description && (
                            <div 
                              className="text-gray-400 text-sm sm:text-base line-clamp-3 mb-4 flex-1"
                              dangerouslySetInnerHTML={{ __html: blog.description }}
                            />
                          )}

                          {/* Read More Link */}
                          <div className="mt-auto pt-4 border-t border-gray-700">
                            <span className="text-yellow-400 text-sm font-semibold group-hover:text-yellow-300 transition-colors duration-300">
                              {t('Read More') || 'Read More'} →
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}