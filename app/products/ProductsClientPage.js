"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
// import BrandsSlider from "../Componants/brandsSplide_1";
import ProductSlider from "../Componants/ProductSlider";
import Sidebar from "../Componants/sidebar";
import { useTranslation } from "../contexts/TranslationContext";
import FilterDropdown from "../Componants/CheckboxDropdown ";
import { useCurrency } from "../contexts/CurrencyContext";
import PriceDisplay from "../components/PriceDisplay";
import { graphqlClient } from "../lib/graphqlClient";
import { GET_CATEGORIES_QUERY } from "../lib/queries";
import { useCategory } from "../contexts/CategoryContext";
import { useRouter, useSearchParams } from "next/navigation";

export default function ProductsClientPage({ products, brands, attributeValues, categoryId: initialCategoryId }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [categories, setCategories] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get("brand") || null);
  const [selectedAttributes, setSelectedAttributes] = useState(() => {
    const attrs = {};
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("attr_")) {
        attrs[key.replace("attr_", "")] = value.split(",");
      }
    }
    return attrs;
  });
  const { selectedCategoryId, setSelectedCategoryId } = useCategory();
  const [selectedCategoryName, setSelectedCategoryName] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 20;
  const { loading: currencyLoading } = useCurrency();
  const { t, language } = useTranslation();

  const isRTL = language === "ar";

  // Set initial category from URL or props
  useEffect(() => {
    const categoryFromUrl = searchParams.get("category");
    if (categoryFromUrl) {
      setSelectedCategoryId(categoryFromUrl);
    } else if (initialCategoryId) {
      setSelectedCategoryId(initialCategoryId);
    }
  }, [searchParams, setSelectedCategoryId, initialCategoryId]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await graphqlClient.request(GET_CATEGORIES_QUERY);
        setCategories(data.rootCategories || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  // Filter products
  useEffect(() => {
    const result = products.filter((product) => {
      const brandMatch = !selectedBrand || product.brand?.name === selectedBrand;

      const attrs = product.productAttributeValues || [];
      const attributesMatch = Object.entries(selectedAttributes).every(
        ([attrLabel, selectedVals]) => {
          if (!selectedVals || selectedVals.length === 0) return true;
          const selectedLower = selectedVals.map((v) => String(v).toLowerCase());
          return attrs.some(
            (pav) =>
              String(pav.attribute?.label || pav.attribute?.key || "")
                .toLowerCase() === String(attrLabel).toLowerCase() &&
              selectedLower.includes(String(pav.key ?? "").toLowerCase())
          );
        }
      );

      const categoryMatch =
        !selectedCategoryId ||
        (product.rootCategories || []).some(
          (cat) => String(cat.id) === String(selectedCategoryId)
        );

      return brandMatch && attributesMatch && categoryMatch;
    });

    setFilteredProducts(result);
    setCurrentPage(1);
  }, [products, selectedBrand, selectedAttributes, selectedCategoryId]);

  const categoriesWithProducts = useMemo(() => {
    return categories.filter((cat) =>
      products.some((product) =>
        (product.rootCategories || []).some((pCat) => pCat.id === cat.id)
      )
    );
  }, [categories, products]);

  useEffect(() => {
    const cat = categoriesWithProducts.find((c) => c.id === selectedCategoryId);
    setSelectedCategoryName(cat?.name || null);
  }, [selectedCategoryId, categoriesWithProducts]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (selectedBrand) params.set("brand", selectedBrand);
    if (selectedCategoryId) params.set("category", selectedCategoryId);

    Object.entries(selectedAttributes).forEach(([attr, values]) => {
      if (values.length) params.set(`attr_${attr}`, values.join(","));
    });

    router.replace(`?${params.toString()}`, { scroll: false });
  }, [selectedBrand, selectedCategoryId, selectedAttributes, router]);

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  return (
    <div className={`bg-[#373e3e] ${isRTL ? "rtl" : "ltr"}`}>
      <div className="grid pt-1 grid-cols-1 lg:grid-cols-5">
        {/* Sidebar */}
        <div className="hidden lg:block lg:col-span-1 bg-black h-auto">
          <Sidebar
            categories={categoriesWithProducts}
            onSelectCategory={(catId) => {
              if (catId === selectedCategoryId) {
                setSelectedCategoryId(null);
                setSelectedCategoryName(null);
              } else {
                setSelectedCategoryId(catId);
              }
            }}
            isRTL={isRTL}
          />
        </div>

        {/* Products Section */}
        <div className="md:col-span-4 p-4 bg-white">
          <h1 className="text-4xl text-[#1f2323] p-2">
            {selectedCategoryName || t("All Products")}
          </h1>

          {/* <BrandsSlider
            brands={brands}
            selectedBrand={selectedBrand}
            direction={isRTL ? "rtl" : "ltr"}
            onBrandClick={(brand) =>
              setSelectedBrand(brand === selectedBrand ? null : brand)
            }
          /> */}

          <div className="flex mb-4 gap-3 flex-wrap">
            <FilterDropdown
              attributeValues={attributeValues}
              onFilterChange={setSelectedAttributes}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-3 p-2 sm:p-4">
            {currentProducts.map((product) => {
              const basePrice = product.list_price_amount;
              let finalPrice = product.list_price_amount;

              const badgeLabel = product.productBadges?.[0]?.label || "";
              const discountMatch = badgeLabel.match(/(\d+)%/);
              if (discountMatch) {
                const discountPercent = parseFloat(discountMatch[1]);
                finalPrice = basePrice - (basePrice * discountPercent) / 100;
              }

              return (
                <Link
                  key={product.sku}
                  href={`/product/${encodeURIComponent(product.sku)}`}
                  className="relative bg-gradient-to-br from-white to-neutral-300 shadow-lg overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 block group"
                  onClick={(e) => {
                    // اضغط على الصورة → افتح صفحة المنتج
                    if (e.target.closest(".product-image-click")) {
                      return; // يفتح عادي
                    }

                    // اضغط داخل السلايدر → امنع فتح اللينك
                    if (e.target.closest(".product-swiper-container")) {
                      e.preventDefault();
                      e.stopPropagation();  // ← مهم جدًا علشان ما يعليش bubbled click
                      return;
                    }
                  }}
                >
                  {badgeLabel && (
                    <div
                      className="absolute top-3 left-[-20px] w-[90px] text-center text-white text-xs font-bold py-1 rotate-[-45deg] shadow-md z-20"
                      style={{
                        backgroundColor: product.productBadges?.[0]?.color || "#888",
                      }}
                    >
                      {badgeLabel}
                    </div>
                  )}

                  <div className="flex justify-center items-center h-[220px] relative">
                    <ProductSlider images={product.images} productName={product.name} />
                  </div>

                  <div className="p-4 flex flex-col flex-grow justify-between">
                    <h3 className="text-base text-gray-700 text-center font-bold mb-1">
                      {product.brand?.name}
                    </h3>

                    <p className="text-center text-sm text-gray-500 line-clamp-2 mb-3">
                      {product.name}
                    </p>

                    <div className="text-center">
                      {discountMatch ? (
                        <>
                          <div className="line-through text-gray-500 text-sm">
                            <PriceDisplay price={basePrice} loading={currencyLoading} />
                          </div>
                          <span className="text-lg font-bold text-neutral-900">
                            <PriceDisplay price={finalPrice} loading={currencyLoading} />
                          </span>
                        </>
                      ) : (
                        <span className="text-lg font-bold text-neutral-900">
                          <PriceDisplay price={basePrice} loading={currencyLoading} />
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6 select-none">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-gray-200 text-gray-700 disabled:opacity-50 hover:bg-gray-300 transition"
              >
                &#10094;
              </button>

              <div className="flex gap-2 overflow-x-auto scrollbar-none px-2">
                {[...Array(totalPages)].map((_, idx) => {
                  const pageNumber = idx + 1;
                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`px-3 py-2 text-sm sm:text-base transition ${
                          currentPage === pageNumber
                            ? "bg-[#1f2323] text-white shadow-md"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  } else if (
                    pageNumber === currentPage - 2 ||
                    pageNumber === currentPage + 2
                  ) {
                    return <span key={idx} className="px-2 text-gray-500">...</span>;
                  } else {
                    return null;
                  }
                })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 bg-gray-200 text-gray-700 disabled:opacity-50 hover:bg-gray-300 transition"
              >
                &#10095;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

