"use client";

import { useEffect, useState } from "react";
import { graphqlRequest } from "../lib/graphqlClientHelper";
import {
  GET_ACTIVE_HOME_PAGE_BLOCKS,
  GET_BLOGS_QUERY,
  HOME_BRAND_CATEGORY_WITH_FILTERS_QUERY,
} from "../lib/queries";
import { buildProductFilters, isNumericBrandId } from "../lib/productFilters";
import Link from "next/link";
import Image from "next/image";
import { useCurrency } from "../contexts/CurrencyContext";
import PriceDisplay from "../components/PriceDisplay";
import { Splide, SplideSlide } from "@splidejs/react-splide";
import "@splidejs/react-splide/css";
import { useTranslation } from "../contexts/TranslationContext";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Loader from "./Loader";
import DynamicText from "../components/DynamicText";
import BlogImageWithLoader from "../components/BlogImageWithLoader";

const MultiSlider_6 = dynamic(() => import("./Slider_6"), { ssr: false });

const BRAND_CATEGORY_FETCH_LIMIT = 80;
/** Category-only fetch window when CMS sends brand as slug (no server-side brand filter). */
const BRAND_SLUG_CATEGORY_FETCH_LIMIT = 80;

/** Homepage blogs: grid up to this count; above → horizontal strip like multi-banners */
const HOME_BLOGS_GRID_MAX = 4;

function productMatchesHomeBrand(product, brandIdFromCms) {
  const raw = String(brandIdFromCms ?? "").trim();
  if (!raw) return false;
  const b = product?.brand;
  if (isNumericBrandId(raw)) {
    return String(b?.id ?? "") === raw;
  }
  const name = b?.name ?? product?.brand_name;
  if (name != null && String(name).toLowerCase().replace(/\s+/g, "") === raw.toLowerCase()) {
    return true;
  }
  return String(b?.id ?? "") === raw;
}

function mapProductToHomeSelected(p) {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    images: Array.isArray(p.images) ? p.images : [],
    price_range_from: p.price_range_from,
    price_range_exact_amount: p.price_range_exact_amount,
    list_price_amount: p.list_price_amount,
    brand_name: p.brand_name ?? p.brand?.name ?? null,
    productBadges: (p.productBadges || []).map((b) => ({
      label: b.label,
      color: b.color,
    })),
  };
}

function sortProductsNewestFirst(products) {
  return [...products].sort((a, b) => {
    const ta = Date.parse(a.created_at || a.updated_at || 0) || 0;
    const tb = Date.parse(b.created_at || b.updated_at || 0) || 0;
    return tb - ta;
  });
}

export default function HomePageBlocks() {
  const { lang, t } = useTranslation();
  const BASE_URL = "https://keepersport.store/storage/";
  const { loading: currencyLoading } = useCurrency();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
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
        let activeBlocks = data.activeHomepageBlocks || [];

        /** @type {Map<string, { categoryId: string; brandKey: string; numericBrand: boolean; indices: number[] }>} */
        const dedupeGroups = new Map();
        activeBlocks.forEach((block, index) => {
          if (block.type !== "brand_category_products") return;
          const brandId = block.content?.brand_id;
          const categoryId =
            block.content?.category_id ?? block.content?.root_category_id;
          if (
            brandId == null ||
            categoryId == null ||
            String(brandId).trim() === "" ||
            String(categoryId).trim() === ""
          ) {
            return;
          }
          const cat = String(categoryId).trim();
          const brandKey = String(brandId).trim();
          const dedupeKey = JSON.stringify([cat, brandKey]);
          if (!dedupeGroups.has(dedupeKey)) {
            dedupeGroups.set(dedupeKey, {
              categoryId: cat,
              brandKey,
              numericBrand: isNumericBrandId(brandKey),
              indices: [],
            });
          }
          dedupeGroups.get(dedupeKey).indices.push(index);
        });

        /** @type {Map<string, ReturnType<typeof mapProductToHomeSelected>[]>} */
        const productsByDedupeKey = new Map();
        await Promise.all(
          [...dedupeGroups.entries()].map(async ([dedupeKey, g]) => {
            try {
              const filters = g.numericBrand
                ? buildProductFilters({
                    categoryId: g.categoryId,
                    brandId: g.brandKey,
                  })
                : buildProductFilters({ categoryId: g.categoryId });
              const fw = await graphqlRequest(HOME_BRAND_CATEGORY_WITH_FILTERS_QUERY, {
                filters,
                limit: g.numericBrand
                  ? BRAND_CATEGORY_FETCH_LIMIT
                  : BRAND_SLUG_CATEGORY_FETCH_LIMIT,
                offset: 0,
              });
              let list = fw?.productsWithFilters || [];
              if (!g.numericBrand) {
                list = list.filter((p) => productMatchesHomeBrand(p, g.brandKey));
              }
              const products = sortProductsNewestFirst(list)
                .slice(0, 15)
                .map(mapProductToHomeSelected);
              productsByDedupeKey.set(dedupeKey, products);
            } catch (err) {
              console.error("❌ Error fetching brand_category_products:", err);
              productsByDedupeKey.set(dedupeKey, []);
            }
          })
        );

        const categoryProductCategoryIds = new Set();
        activeBlocks.forEach((block) => {
          if (block.type !== "category_products") return;
          const categoryId =
            block.content?.root_category_id ?? block.content?.category_id;
          if (categoryId == null || String(categoryId).trim() === "") return;
          categoryProductCategoryIds.add(String(categoryId).trim());
        });

        /** @type {Map<string, ReturnType<typeof mapProductToHomeSelected>[]>} */
        const categoryProductsByCategoryId = new Map();
        await Promise.all(
          [...categoryProductCategoryIds].map(async (cat) => {
            try {
              const filters = buildProductFilters({ categoryId: cat });
              const fw = await graphqlRequest(HOME_BRAND_CATEGORY_WITH_FILTERS_QUERY, {
                filters,
                limit: BRAND_CATEGORY_FETCH_LIMIT,
                offset: 0,
              });
              const list = fw?.productsWithFilters || [];
              const products = sortProductsNewestFirst(list)
                .slice(0, 15)
                .map(mapProductToHomeSelected);
              categoryProductsByCategoryId.set(cat, products);
            } catch (err) {
              console.error("❌ Error fetching category_products:", err);
              categoryProductsByCategoryId.set(cat, []);
            }
          })
        );

        activeBlocks = activeBlocks.map((block) => {
          if (block.type === "brand_category_products") {
            const brandId = block.content?.brand_id;
            const categoryId =
              block.content?.category_id ?? block.content?.root_category_id;
            if (
              brandId == null ||
              categoryId == null ||
              String(brandId).trim() === "" ||
              String(categoryId).trim() === ""
            ) {
              return block;
            }
            const dedupeKey = JSON.stringify([
              String(categoryId).trim(),
              String(brandId).trim(),
            ]);
            const products = productsByDedupeKey.get(dedupeKey);
            if (!products) return block;
            return { ...block, selected_products: products };
          }
          if (block.type === "category_products") {
            const categoryId =
              block.content?.root_category_id ?? block.content?.category_id;
            if (categoryId == null || String(categoryId).trim() === "") {
              return block;
            }
            const cat = String(categoryId).trim();
            const products = categoryProductsByCategoryId.get(cat);
            if (products === undefined) return block;
            return { ...block, selected_products: products };
          }
          return block;
        });

        setBlocks(activeBlocks);

        // ✅ جلب الـ blogs
        try {
          const blogsData = await graphqlRequest(GET_BLOGS_QUERY);
          setBlogs(blogsData?.blogs || []);
        } catch (err) {
          console.error("❌ Error fetching blogs:", err);
        }

        setLoading(false);
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
    <div className="pt-3 space-y-3 w-full max-w-full min-w-0">
      {otherBlocks.map((block, blockIndex) => {
        const isFirstBannerBlock = block.type === "banners" && blockIndex === firstBannerBlockIndex;
        const isProductsLikeBlock = ["products", "brand_category_products", "category_products"].includes(
          block.type
        );

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
                  height: "clamp(200px, 70vw, 300px)"
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
              {isProductsLikeBlock && (block.selected_products && block.selected_products.length > 0) && (
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
                    {(block.selected_products || []).map((product, idx) => {
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
      {/* 🔹 Blogs Section — compact; >4 items → horizontal strip like multi-banners */}
      {blogs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative w-full max-w-full min-w-0 overflow-x-hidden shadow-lg bg-black"
        >
          <h2 className="text-lg sm:text-xl md:text-2xl text-center font-bold mb-3 pt-4 px-3 text-white">
            {t("Blogs") || "Blogs"}
          </h2>

          {blogs.length > HOME_BLOGS_GRID_MAX ? (
            <div className="w-full max-w-full min-w-0 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent pb-4">
              <div
                className={`flex gap-3 md:gap-4 w-max max-w-none scroll-smooth px-3 md:px-4 ${
                  lang === "ar" ? "flex-row-reverse" : ""
                }`}
              >
                {blogs.map((blog, idx) => {
                  const imageUrl = getImageUrl(blog.image);
                  return (
                    <motion.div
                      key={blog.id}
                      initial={{ opacity: 0, x: lang === "ar" ? -24 : 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.45, delay: Math.min(idx, 8) * 0.05 }}
                      className="group flex-shrink-0"
                      style={{ width: "clamp(200px, 72vw, 260px)" }}
                    >
                      <Link href={`/blogs/${blog.id}`} className="block h-full">
                        <div className="bg-[#1a1a1a] hover:bg-[#2a2a2a] overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 h-full flex flex-col border border-gray-800/80">
                          <div className="relative w-full aspect-[5/3] overflow-hidden">
                            {imageUrl ? (
                              <BlogImageWithLoader
                                src={imageUrl}
                                alt={blog.title || "Blog Image"}
                                className="object-cover group-hover:scale-105"
                                sizes="260px"
                              />
                            ) : (
                              <div className="w-full h-full min-h-[120px] bg-gray-800 flex items-center justify-center">
                                <span className="text-gray-500 text-xs">No Image</span>
                              </div>
                            )}
                          </div>
                          <div className="p-3 flex-1 flex flex-col">
                            {blog.title && (
                              <h3 className="text-sm sm:text-base font-bold mb-2 line-clamp-2 group-hover:text-yellow-400 transition-colors">
                                <DynamicText>{blog.title}</DynamicText>
                              </h3>
                            )}
                            {blog.author_name && (
                              <p className="text-gray-500 text-xs mb-2 line-clamp-1">
                                <span className="text-gray-600">{t("Author")}: </span>
                                <DynamicText>{blog.author_name}</DynamicText>
                              </p>
                            )}
                            {blog.description && (
                              <div
                                className="text-gray-400 text-xs line-clamp-2 mb-2 flex-1 [&_p]:m-0 [&_*]:text-xs"
                                dangerouslySetInnerHTML={{ __html: blog.description }}
                              />
                            )}
                            <div className="mt-auto pt-2 border-t border-gray-700">
                              <span className="text-yellow-400 text-xs font-semibold group-hover:text-yellow-300">
                                {t("Read More") || "Read More"} →
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
          ) : (
            <div className="px-3 md:px-6 pb-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {blogs.map((blog, idx) => {
                  const imageUrl = getImageUrl(blog.image);
                  return (
                    <motion.div
                      key={blog.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: idx * 0.06 }}
                      className="group"
                    >
                      <Link href={`/blogs/${blog.id}`} className="block h-full">
                        <div className="bg-[#1a1a1a] hover:bg-[#2a2a2a] overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 h-full flex flex-col border border-gray-800/80">
                          <div className="relative w-full aspect-[5/3] overflow-hidden">
                            {imageUrl ? (
                              <BlogImageWithLoader
                                src={imageUrl}
                                alt={blog.title || "Blog Image"}
                                className="object-cover group-hover:scale-105"
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                              />
                            ) : (
                              <div className="w-full h-full min-h-[100px] bg-gray-800 flex items-center justify-center">
                                <span className="text-gray-500 text-xs">No Image</span>
                              </div>
                            )}
                          </div>
                          <div className="p-3 flex-1 flex flex-col">
                            {blog.title && (
                              <h3 className="text-sm sm:text-base font-bold mb-2 line-clamp-2 group-hover:text-yellow-400 transition-colors">
                                <DynamicText>{blog.title}</DynamicText>
                              </h3>
                            )}
                            {blog.author_name && (
                              <p className="text-gray-500 text-xs mb-2 line-clamp-1">
                                <span className="text-gray-600">{t("Author")}: </span>
                                <DynamicText>{blog.author_name}</DynamicText>
                              </p>
                            )}
                            {blog.description && (
                              <div
                                className="text-gray-400 text-xs line-clamp-2 mb-2 flex-1 [&_p]:m-0 [&_*]:text-xs"
                                dangerouslySetInnerHTML={{ __html: blog.description }}
                              />
                            )}
                            <div className="mt-auto pt-2 border-t border-gray-700">
                              <span className="text-yellow-400 text-xs font-semibold group-hover:text-yellow-300">
                                {t("Read More") || "Read More"} →
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
          )}
        </motion.div>
      )}

      <MultiSlider_6 />
    </div>
  );
}