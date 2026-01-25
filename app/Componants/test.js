"use client";

import { useEffect, useState } from "react";
import { graphqlClient } from "../lib/graphqlClient";
import { GET_ACTIVE_HOME_PAGE_BLOCKS, PRODUCTS_BY_IDS_QUERY } from "../lib/queries";
import Link from "next/link";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { useTranslation } from "../contexts/TranslationContext";

export default function HomePageBlocks() {
  const { lang } = useTranslation();
  const BASE_URL = "https://keepersport.store/storage/";
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsMap, setProductsMap] = useState({});

  useEffect(() => {
    async function fetchBlocks() {
      try {
        const data = await graphqlClient.request(GET_ACTIVE_HOME_PAGE_BLOCKS);
        const activeBlocks = data.activeHomepageBlocks || [];
        setBlocks(activeBlocks);

        for (let block of activeBlocks) {
          if (block.type === "products" && block.content?.product_ids?.length) {
            const productIds = block.content.product_ids.map((p) => p.product_id);

            const productPromises = productIds.map((id) =>
              graphqlClient
                .request(PRODUCTS_BY_IDS_QUERY, { id })
                .then((res) => res.product)
                .catch((err) => {
                  console.error("❌ Error fetching product ID", id, err);
                  return null;
                })
            );

            const products = (await Promise.all(productPromises)).filter(Boolean);
            setProductsMap((prev) => ({ ...prev, [block.id]: products }));
          }
        }
      } catch (error) {
        console.error("❌ Error fetching home page blocks:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchBlocks();
  }, []);

  if (loading) return <p className="text-center py-8">Loading blocks...</p>;
  if (!blocks.length) return <p className="text-center py-8 text-gray-500">No blocks available.</p>;

  const getImageUrl = (img) => {
    if (!img) return "";
    let path = typeof img === "string" ? img : img.url || img.src || "";
    return path.startsWith("http") ? path : `${BASE_URL}${path}`;
  };

  return (
    <div className="space-y-12">
      {blocks.map((block) => (
        <div
          key={block.id}
          className={`  shadow-lg overflow-hidden w-full ${block.css_class || ""}`}
          style={{
            backgroundColor:
              block.background_color || (block.type === "banners" ? "#000" : "#f9f9f9"),
            color: block.text_color || "#fff",
          }}
        >
          {/* 🔹 Title */}
          {block.title && (
            <h2 className="text-2xl sm:text-3xl md:text-4xl text-center font-bold mb-6 pt-6">
              {block.title}
            </h2>
          )}

          <div className="px-4 pb-8 space-y-6">
            {/* 🟣 SLIDER */}
            {block.type === "slider" && block.content?.slides?.length > 0 && (
              <Swiper
                modules={[Navigation, Pagination, Autoplay]}
                spaceBetween={0}
                slidesPerView={1}
                loop={block.content.slides.length > 1}
                autoplay={{
                  delay: 3000,
                  pauseOnMouseEnter: true,
                  disableOnInteraction: false,
                }}
                navigation={true}
                pagination={true}
                dir={lang === "ar" ? "rtl" : "ltr"}
                className="test-slider-swiper"
              >
                {block.content.slides.map((slide, i) => (
                  <SwiperSlide key={i}>
                    <div className="relative w-full h-[400px] md:h-[500px] overflow-hidden  ">
                      <Image
                        src={getImageUrl(slide.image)}
                        alt={slide.title || ""}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-center text-white px-4">
                        <h3 className="text-2xl md:text-4xl font-bold mb-3">{slide.title}</h3>
                        <p className="max-w-2xl text-sm md:text-base mb-4">{slide.description}</p>
                        {slide.button_text && (
                          <Link
                            href={slide.button_link || "#"}
                            className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-2   font-semibold"
                          >
                            {slide.button_text}
                          </Link>
                        )}
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            )}

            {/* 🟢 IMAGES */}
            {block.type === "images" && block.content?.images?.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {block.content.images.map((img, idx) => (
                  <div key={idx} className="relative   overflow-hidden shadow-md">
                    <Image
                      src={getImageUrl(img.image)}
                      alt={img.title || ""}
                      width={1200}
                      height={600}
                      className="w-full h-auto object-contain"
                      unoptimized
                    />
                    {img.title && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <p className="text-white text-lg font-semibold">{img.title}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 🔵 TEXT BLOCK */}
            {block.type === "text" && block.content?.content && (
              <div
                className={`text-center max-w-4xl mx-auto text-gray-800 leading-relaxed ${
                  block.content.alignment === "center"
                    ? "text-center"
                    : block.content.alignment === "right"
                    ? "text-right"
                    : "text-left"
                }`}
                style={{
                  maxWidth: block.content.max_width || "80%",
                  margin: "0 auto",
                }}
              >
                <p>{block.content.content}</p>
              </div>
            )}

            {/* 🟠 BANNERS */}
            {block.type === "banners" && block.content?.banners?.length > 0 && (
              <div
                className={`grid gap-4 ${
                  block.content.banners.length === 1
                    ? "grid-cols-1"
                    : block.content.banners.length === 2
                    ? "grid-cols-1 md:grid-cols-2"
                    : "grid-cols-2 lg:grid-cols-3"
                }`}
              >
                {block.content.banners.map((banner, idx) => (
                  <Link
                    href={banner.link || "#"}
                    key={idx}
                    className="relative overflow-hidden shadow-md   w-full"
                  >
                    <Image
                      src={getImageUrl(banner.image)}
                      alt={banner.title || ""}
                      width={800}
                      height={400}
                      className="object-cover w-full h-auto"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-center text-white px-4">
                      <h3 className="text-xl md:text-2xl font-semibold">{banner.title}</h3>
                      <p className="text-sm md:text-base">{banner.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* 🟡 PRODUCTS */}
            {block.type === "products" && productsMap[block.id]?.length > 0 && (
              <Swiper
                key={lang}
                modules={[Navigation]}
                spaceBetween={16}
                slidesPerView={block.content?.per_row || 4}
                loop={productsMap[block.id].length > (block.content?.per_row || 4)}
                navigation={true}
                dir={lang === "ar" ? "rtl" : "ltr"}
                breakpoints={{
                  1280: { slidesPerView: 4 },
                  1024: { slidesPerView: 3 },
                  640: { slidesPerView: 2 },
                }}
                className="test-products-swiper"
              >
                {productsMap[block.id].map((product) => (
                  <SwiperSlide key={product.id}>
                    <Link
                      href={`/product/${product.sku}`}
                      className="block bg-neutral-900 hover:bg-neutral-800   shadow-md overflow-hidden flex flex-col transition h-full"
                    >
                      <div className="relative w-full aspect-[1/2] bg-neutral-900 flex items-center justify-center">
                        {product.images?.[0] ? (
                          <Image
                            src={
                              typeof product.images[0] === "string"
                                ? product.images[0]
                                : product.images[0]?.url
                            }
                            alt={product.name}
                            fill
                            className="object-contain p-4"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-gray-500">
                            No Image
                          </div>
                        )}
                      </div>

                      <div className="p-4 flex flex-col justify-between flex-1">
                        <h3 className="text-sm sm:text-base lg:text-lg text-center text-white font-semibold mb-2 line-clamp-2">
                          {product.name}
                        </h3>

                        <div className="mt-auto text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-gray-500 line-through text-xs sm:text-sm">
                              SAR {(product.list_price_amount * 4.6).toFixed(2)}
                            </span>
                            <span className="text-yellow-400 font-bold text-lg sm:text-xl">
                              SAR {(product.list_price_amount * 4.6).toFixed(2)}
                              {product.price_range_to &&
                              product.price_range_to !== product.price_range_from
                                ? ` - SAR ${(product.price_range_to * 4.6).toFixed(2)}`
                                : ""}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </SwiperSlide>
                ))}
              </Swiper>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
