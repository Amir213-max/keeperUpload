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
import { graphqlRequest } from "../lib/graphqlClientHelper";
import { GET_CATEGORIES_ONLY_QUERY } from "../lib/queries";
import { useCategory } from "../contexts/CategoryContext";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  attributeNameToSlug,
  attributeValuesToSlug,
  slugToAttributeValues,
  matchSlugToAttributeName,
  toSlug,
  fromSlug,
  buildPathSegmentUrl,
  parsePathSegments,
} from "../lib/urlSlugHelper";

export default function ProductsClientPage({ products, brands, attributeValues, categoryId: initialCategoryId, categorySlug: initialCategorySlug, rootCategory, currentPage: initialPage = 1, totalCount = 0, hasMore = false }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [categories, setCategories] = useState([]);
  // Initialize brand from URL (convert from slug to readable format)
  const [selectedBrand, setSelectedBrand] = useState(() => {
    const brandSlug = searchParams.get("brand");
    return brandSlug ? fromSlug(brandSlug) : null;
  });
  
  // Initialize attributes from URL (convert from SEO-friendly slugs)
  const [selectedAttributes, setSelectedAttributes] = useState(() => {
    const attrs = {};
    // Parse all URL parameters and match them to attribute names
    for (const [key, value] of searchParams.entries()) {
      // Skip brand and category
      if (key === "brand" || key === "category") continue;
      
      // Try to match slug to actual attribute name
      const attrName = matchSlugToAttributeName(key, attributeValues);
      if (attrName) {
        // Convert slug values back to readable format
        const attrValues = slugToAttributeValues(value);
        if (attrValues.length > 0) {
          attrs[attrName] = attrValues;
        }
      }
    }
    return attrs;
  });
  const { selectedCategoryId, setSelectedCategoryId } = useCategory();
  const [selectedCategoryName, setSelectedCategoryName] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [currentPage, setCurrentPage] = useState(() => {
    const pageParam = searchParams.get('page');
    return pageParam ? parseInt(pageParam, 10) : initialPage;
  });
  const productsPerPage = 30;
  const { loading: currencyLoading } = useCurrency();
  const { t, language } = useTranslation();

  const isRTL = language === "ar";

  // Fetch categories
  // 🔹 جلب التصنيفات فقط (بدون منتجات)
  // IMPORTANT: Fetch only categories, not products. Fetching all products causes 503 errors.
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Use API route proxy to avoid CORS issues
        // Use GET_CATEGORIES_ONLY_QUERY to fetch only categories (no products)
        const data = await graphqlRequest(GET_CATEGORIES_ONLY_QUERY);
        setCategories(data.rootCategories || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  const categoriesWithProducts = useMemo(() => {
    return categories.filter((cat) =>
      products.some((product) =>
        (product.rootCategories || []).some((pCat) => pCat.id === cat.id)
      )
    );
  }, [categories, products]);

  // Set initial category from URL path or props
  useEffect(() => {
    // 🔹 قراءة slug من path (مثل /products/goalkeeper-jerseys/black/size-large)
    let pathSlug = null;
    
    if (pathname && pathname.startsWith('/products/')) {
      const pathWithoutBase = pathname.replace('/products/', '').split('?')[0];
      const parts = pathWithoutBase.split('/').filter(p => p);
      
      if (parts.length > 0) {
        pathSlug = parts[0];
      }
    }
    
    // Set category
    if (pathSlug && pathSlug !== 'products' && pathSlug !== '') {
      // 🔹 البحث عن الكاتيجوري بالـ slug وتحويله لـ ID
      const foundCategory = categoriesWithProducts.find(
        (cat) => cat.slug === decodeURIComponent(pathSlug)
      );
      if (foundCategory) {
        setSelectedCategoryId(foundCategory.id);
      }
    } else if (initialCategorySlug) {
      // إذا كان slug موجود في props
      const foundCategory = categoriesWithProducts.find(
        (cat) => cat.slug === initialCategorySlug
      );
      if (foundCategory) {
        setSelectedCategoryId(foundCategory.id);
      }
    } else if (initialCategoryId) {
      setSelectedCategoryId(initialCategoryId);
    } else {
      setSelectedCategoryId(null);
    }
  }, [pathname, setSelectedCategoryId, initialCategoryId, initialCategorySlug, categoriesWithProducts]);

  // Parse path segments to attributes (separate effect to ensure attributeValues is ready)
  useEffect(() => {
    if (!pathname || !pathname.startsWith('/products/')) {
      // If not on products page, clear attributes
      if (pathname !== '/products' && !pathname.startsWith('/products/')) {
        setSelectedAttributes({});
      }
      return;
    }
    
    const pathWithoutBase = pathname.replace('/products/', '').split('?')[0];
    const parts = pathWithoutBase.split('/').filter(p => p);
    
    // Skip first part (category slug), rest are filters
    const pathSegments = parts.slice(1);
    
    // Parse path segments to attributes (only if we have attributeValues)
    if (pathSegments.length > 0 && attributeValues && attributeValues.length > 0) {
      const parsedAttrs = parsePathSegments(pathSegments, attributeValues);
      if (parsedAttrs && Object.keys(parsedAttrs).length > 0) {
        console.log('📋 Parsed attributes from URL:', parsedAttrs);
        setSelectedAttributes(parsedAttrs);
      } else {
        console.log('⚠️ No attributes parsed from path segments:', pathSegments, 'attributeValues:', attributeValues);
      }
    } else if (pathSegments.length === 0) {
      // If no path segments, clear attributes only if we're not on a category page
      // (keep attributes if they were set manually)
    }
  }, [pathname, attributeValues]);

  // Filter products
  useEffect(() => {
    const result = products.filter((product) => {
      const brandMatch = !selectedBrand || product.brand?.name === selectedBrand;

      const attrs = product.productAttributeValues || [];
      const attributesMatch = Object.entries(selectedAttributes).every(
        ([attrLabel, selectedVals]) => {
          if (!selectedVals || selectedVals.length === 0) return true;
          
          // Convert selected values to lowercase for comparison
          const selectedLower = selectedVals.map((v) => String(v).toLowerCase().trim());
          
          // Check if any product attribute matches
          const hasMatch = attrs.some((pav) => {
            const pavAttrLabel = String(pav.attribute?.label || pav.attribute?.key || "").toLowerCase().trim();
            const pavValue = String(pav.key ?? "").toLowerCase().trim();
            
            // Match attribute label and value
            return pavAttrLabel === String(attrLabel).toLowerCase().trim() &&
                   selectedLower.includes(pavValue);
          });
          
          return hasMatch;
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

  const [currentRootCategory, setCurrentRootCategory] = useState(rootCategory);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState(null);

  useEffect(() => {
    const cat = categoriesWithProducts.find((c) => c.id === selectedCategoryId);
    setSelectedCategoryName(cat?.name || null);
    setSelectedCategorySlug(cat?.slug || null);
    
    // 🔹 تحديث rootCategory عند اختيار category جديد
    if (cat) {
      // البحث عن rootCategory من categories (يحتوي على image)
      const fullCategory = categories.find((c) => c.id === selectedCategoryId);
      setCurrentRootCategory(fullCategory || null);
    } else {
      setCurrentRootCategory(null);
    }
  }, [selectedCategoryId, categoriesWithProducts, categories]);

  // 🔹 تحديث rootCategory من props عند تغييرها
  useEffect(() => {
    if (rootCategory) {
      setCurrentRootCategory(rootCategory);
    }
  }, [rootCategory]);

  // 🔹 قراءة brand من query parameter (إذا كان موجود)
  useEffect(() => {
    const brandSlug = searchParams.get("brand");
    if (brandSlug) {
      const brandName = fromSlug(brandSlug);
      setSelectedBrand(brandName);
    }
    // Don't clear brand if it's not in URL - it might be set from other sources
  }, [searchParams]);

  // Update URL when filters change (using path segments format)
  useEffect(() => {
    // Build URL with path segments for attributes
    const newUrl = buildPathSegmentUrl(
      selectedCategorySlug || null,
      selectedAttributes,
      selectedBrand || null,
      currentPage > 1 ? currentPage : null
    );

    // Only update if newUrl is valid (not null) to prevent errors
    if (newUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [selectedBrand, selectedCategoryId, selectedCategorySlug, selectedAttributes, currentPage, router]);

  // Update currentPage when URL changes
  useEffect(() => {
    const pageParam = searchParams.get('page');
    if (pageParam) {
      const page = parseInt(pageParam, 10);
      if (page !== currentPage && page > 0) {
        setCurrentPage(page);
      }
    } else if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchParams]);

  // استخدام المنتجات مباشرة من السيرفر (server-side pagination)
  const currentProducts = filteredProducts;
  const totalPages = Math.ceil((totalCount || filteredProducts.length) / productsPerPage);

  // 🔹 معالجة URL الصورة
  const getImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith('http')) return image;
    // استخدام BASE_URL مباشرة
    return `https://keepersport.store/storage/${image}`;
  };

  return (
    <div className={`bg-[#373e3e] ${isRTL ? "rtl" : "ltr"}`}>
      <div className="grid pt-1 grid-cols-1 lg:grid-cols-5">
        {/* Sidebar */}
        <div className="hidden lg:block lg:col-span-1 bg-black h-auto">
          <Sidebar
            categories={categoriesWithProducts.length > 0 ? categoriesWithProducts : categories}
            onSelectCategory={(catId) => {
              // 🔹 استخدام router.push مع slug في path للتنقل بسلاسة
              const allCategories = categoriesWithProducts.length > 0 ? categoriesWithProducts : categories;
              const selectedCat = allCategories.find((c) => c.id === catId);
              if (selectedCat) {
              if (catId === selectedCategoryId) {
                setSelectedCategoryId(null);
                setSelectedCategoryName(null);
                  setSelectedCategorySlug(null);
                  // Don't navigate to /products (page removed) - stay on current page
              } else {
                setSelectedCategoryId(catId);
                  // تحديث URL مباشرة باستخدام path segments
                  const newUrl = buildPathSegmentUrl(
                    selectedCat.slug,
                    selectedAttributes,
                    selectedBrand || null
                  );
                  // Only navigate if newUrl is valid (not null)
                  if (newUrl) {
                    router.push(newUrl, { scroll: false });
                  }
                }
              }
            }}
            isRTL={isRTL}
          />
        </div>

        {/* Products Section */}
        <div className="md:col-span-4 p-4 bg-white">
          {/* 🟢 عرض صورة rootCategory فوق المنتجات */}
          <h1 className="text-4xl text-[#1f2323] p-2">
            {selectedCategoryName || t("All Products")}
          </h1>
          {currentRootCategory?.image && (
            <div className="w-full mb-4">
              <img 
                src={getImageUrl(currentRootCategory.image)}
                alt={currentRootCategory.name || "Category Banner"}
                className="w-full h-auto object-cover"
              />
            </div>
          )}

         

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
                  key={product.id || product.sku}
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
                onClick={() => {
                  const newPage = Math.max(currentPage - 1, 1);
                  const newUrl = buildPathSegmentUrl(
                    selectedCategorySlug || null,
                    selectedAttributes,
                    selectedBrand || null,
                    newPage === 1 ? null : newPage
                  );
                  if (newUrl) {
                    router.push(newUrl, { scroll: false });
                  }
                }}
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
                        onClick={() => {
                          const newUrl = buildPathSegmentUrl(
                            selectedCategorySlug || null,
                            selectedAttributes,
                            selectedBrand || null,
                            pageNumber === 1 ? null : pageNumber
                          );
                          if (newUrl) {
                            router.push(newUrl, { scroll: false });
                          }
                        }}
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
                onClick={() => {
                  const newPage = Math.min(currentPage + 1, totalPages);
                  const newUrl = buildPathSegmentUrl(
                    selectedCategorySlug || null,
                    selectedAttributes,
                    selectedBrand || null,
                    newPage
                  );
                  if (newUrl) {
                    router.push(newUrl, { scroll: false });
                  }
                }}
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

