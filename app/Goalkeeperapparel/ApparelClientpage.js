"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useRef } from "react";
import BrandsSlider from "../Componants/brandsSplide_1";
import FilterDropdown from "../Componants/CheckboxDropdown ";
import { useCurrency } from "../contexts/CurrencyContext";
import PriceDisplay from "../components/PriceDisplay";
import ProductSlider from "../Componants/ProductSlider";
import Sidebar from "../Componants/sidebar";
import { useTranslation } from "../contexts/TranslationContext";
import { graphqlRequest } from "../lib/graphqlClientHelper";
import { GET_CATEGORIES_ONLY_QUERY } from "../lib/queries";
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
import { useCategory } from "../contexts/CategoryContext";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function ApparelClientPage({ products, brands, attributeValues, rootCategory }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [categories, setCategories] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(() => {
    // Initialize from URL if available
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const brandSlug = urlParams.get("brand");
      return brandSlug ? fromSlug(brandSlug) : null;
    }
    return null;
  });
  const [selectedAttributes, setSelectedAttributes] = useState(() => {
    // Initialize from URL if available
    if (typeof window !== "undefined" && attributeValues && attributeValues.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const attrs = {};
      for (const [key, value] of urlParams.entries()) {
        if (key === "brand" || key === "category") continue;
        const attrName = matchSlugToAttributeName(key, attributeValues);
        if (attrName) {
          const attrValues = slugToAttributeValues(value);
          if (attrValues.length > 0) {
            attrs[attrName] = attrValues;
          }
        }
      }
      return attrs;
    }
    return {};
  });
  const { selectedCategoryId, setSelectedCategoryId } = useCategory();
  const [selectedCategoryName, setSelectedCategoryName] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 20;
  
  // 🔹 Ref to track if we're updating URL internally (to avoid infinite loop)
  const isUpdatingUrlRef = useRef(false);
 const { loading: currencyLoading } = useCurrency();

  const { t, language } = useTranslation();
  const isRTL = language === "ar"; // ✅ اتجاه الموقع
const [currencyRate, setCurrencyRate] = useState(null);

useEffect(() => {
  const fetchRate = async () => {
    try {
      const { getCurrencyRate } = await import("../lib/getCurrencyRate");
      const rate = await getCurrencyRate();
      setCurrencyRate(rate);
    } catch (err) {
      console.error("Error loading currency rate:", err);
    }
  };
  fetchRate();
  }, []);

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

  // 🔹 قراءة brand من query parameter (only update if changed)
  useEffect(() => {
    if (isUpdatingUrlRef.current) return; // Skip if we're updating URL internally
    
    const brandSlug = searchParams.get("brand");
    const newBrand = brandSlug ? fromSlug(brandSlug) : null;
    
    // Only update if different to avoid unnecessary re-renders
    if (newBrand !== selectedBrand) {
      setSelectedBrand(newBrand);
    }
  }, [searchParams, selectedBrand]);

  // 🔹 قراءة category من URL path segments
  useEffect(() => {
    if (isUpdatingUrlRef.current || !pathname || !categoriesWithProducts.length) return;
    
    // Try to read from path first (e.g., /products/category-slug)
    if (pathname.startsWith('/products/')) {
      const pathWithoutBase = pathname.replace('/products/', '').split('?')[0];
      const parts = pathWithoutBase.split('/').filter(p => p);
      
      if (parts.length > 0) {
        const categorySlug = decodeURIComponent(parts[0]);
        const foundCategory = categoriesWithProducts.find(
          (cat) => cat.slug === categorySlug
        );
        if (foundCategory && foundCategory.id !== selectedCategoryId) {
          setSelectedCategoryId(foundCategory.id);
        }
      } else if (selectedCategoryId) {
        setSelectedCategoryId(null);
      }
    } else {
      // Fallback to query params for backward compatibility
      const categoryFromUrl = searchParams.get("category");
      if (categoryFromUrl) {
        const foundCategory = categoriesWithProducts.find(
          (cat) => cat.slug === decodeURIComponent(categoryFromUrl)
        );
        if (foundCategory && foundCategory.id !== selectedCategoryId) {
          setSelectedCategoryId(foundCategory.id);
        }
      } else if (selectedCategoryId) {
        setSelectedCategoryId(null);
      }
    }
  }, [pathname, searchParams, setSelectedCategoryId, categoriesWithProducts, selectedCategoryId]);

  // 🔹 قراءة attributes من URL path segments (only when URL actually changes)
  useEffect(() => {
    if (isUpdatingUrlRef.current || !pathname || !attributeValues || attributeValues.length === 0) return;
    
    // Parse path segments from URL (e.g., /products/category-slug/black/size-large)
    if (pathname.startsWith('/products/')) {
      const pathWithoutBase = pathname.replace('/products/', '').split('?')[0];
      const parts = pathWithoutBase.split('/').filter(p => p);
      
      // First part is category slug, rest are attribute filters
      const pathSegments = parts.slice(1); // Skip category slug
      
      // Parse path segments to attributes
      if (pathSegments.length > 0) {
        const parsedAttrs = parsePathSegments(pathSegments, attributeValues);
        if (parsedAttrs && Object.keys(parsedAttrs).length > 0) {
          const currentAttrsStr = JSON.stringify(selectedAttributes);
          const newAttrsStr = JSON.stringify(parsedAttrs);
          if (currentAttrsStr !== newAttrsStr) {
            setSelectedAttributes(parsedAttrs);
          }
        }
      } else if (Object.keys(selectedAttributes).length > 0) {
        // If no path segments but we have attributes, clear them
        setSelectedAttributes({});
      }
    } else {
      // Also check query params for backward compatibility
      const attrs = {};
      for (const [key, value] of searchParams.entries()) {
        if (key === "brand" || key === "category") continue;
        const attrName = matchSlugToAttributeName(key, attributeValues);
        if (attrName && value) {
          const attrValues = slugToAttributeValues(value);
          if (attrValues.length > 0) {
            attrs[attrName] = attrValues;
          }
        }
      }
      if (Object.keys(attrs).length > 0) {
        setSelectedAttributes(attrs);
      }
    }
  }, [pathname, searchParams, attributeValues, selectedAttributes]);

  // 🔹 فلترة المنتجات حسب الفلاتر
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

  const [selectedCategorySlug, setSelectedCategorySlug] = useState(null);

  // 🔹 ضبط اسم التصنيف المحدد
  useEffect(() => {
    const cat = categoriesWithProducts.find((c) => c.id === selectedCategoryId);
    setSelectedCategoryName(cat?.name || null);
    setSelectedCategorySlug(cat?.slug || null);
  }, [selectedCategoryId, categoriesWithProducts]);

  // 🔹 تحديث الـ URL عند تغيير الفلاتر (using path segments format)
  // ⚠️ IMPORTANT: Only update URL if we have a category slug - /products route is removed
  useEffect(() => {
    // Don't update URL if we're on a specific page (like /Goalkeeperapparel) and no category is selected
    // This prevents unwanted redirects to removed /products route
    if (!selectedCategorySlug && pathname !== '/products' && !pathname.startsWith('/products/')) {
      return; // Stay on current page, don't redirect
    }
    
    // Build URL with path segments: /products/[category slug]/[attributes]
    const newUrl = buildPathSegmentUrl(
      selectedCategorySlug || null,
      selectedAttributes,
      selectedBrand || null
    );
    
    // If buildPathSegmentUrl returns null (no categorySlug), don't update URL
    if (!newUrl) {
      return;
    }
    
    // Check if URL actually changed to avoid unnecessary updates
    const currentUrl = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
    if (currentUrl !== newUrl && newUrl !== "/products" && newUrl !== null) {
      // Only update if newUrl is valid and not the removed /products route
      isUpdatingUrlRef.current = true;
      router.replace(newUrl, { scroll: false });
      
      // Reset flag after a short delay to allow URL to update
      setTimeout(() => {
        isUpdatingUrlRef.current = false;
      }, 100);
    }
  }, [selectedBrand, selectedCategoryId, selectedCategorySlug, selectedAttributes, router, pathname]);

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const getBadgeColor = (label) => {
    if (!label) return "bg-gray-400";
    if (label.toLowerCase().includes("new")) return "bg-green-500";
    if (label.includes("%") || label.toLowerCase().includes("off")) return "bg-gray-500";
    return "bg-yellow-500";
  };

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
            categories={categoriesWithProducts}
            onSelectCategory={(catId) => {
              // 🔹 استخدام router.push مع slug للتنقل بسلاسة
              const selectedCat = categoriesWithProducts.find((c) => {
                return String(c.id) === String(catId) || c.id === catId;
              });
              
              if (selectedCat) {
                if (catId === selectedCategoryId) {
                  // إذا تم الضغط على نفس الكاتيجوري، إلغاء التحديد
                  setSelectedCategoryId(null);
                  setSelectedCategoryName(null);
                  setSelectedCategorySlug(null);
                  router.push('/Goalkeeperapparel', { scroll: false });
                } else {
                  // تحديث الـ state أولاً
                  setSelectedCategoryId(catId);
                  
                  // Navigate to /products/[category slug] with attributes as path segments
                  const newUrl = buildPathSegmentUrl(
                    selectedCat.slug,
                    selectedAttributes,
                    selectedBrand || null
                  );
                  router.push(newUrl, { scroll: false });
                }
              } else {
                console.warn("⚠️ Category not found for ID:", catId);
              }
            }}
            isRTL={isRTL} // ✅ تمرير اتجاه اللغة
          />
        </div>

        {/* Products Section */}
        <div className="md:col-span-4 p-4 bg-white">
          {/* 🟢 عرض صورة rootCategory فوق المنتجات */}
          {rootCategory?.image && (
            <div className="w-full mb-4">
              <img 
                src={getImageUrl(rootCategory.image)}
                alt={rootCategory.name || "Category Banner"}
                className="w-full h-auto object-cover"
              />
            </div>
          )}

          <h1 className="text-4xl text-[#1f2323] p-2">
            {selectedCategoryName || t("Goalkeeper Apparel")}
          </h1>

          {!selectedCategoryId && (
            <BrandsSlider
              brands={brands}
              selectedBrand={selectedBrand}
              direction={isRTL ? "rtl" : "ltr"}
              onBrandClick={(brand) =>
                setSelectedBrand(brand === selectedBrand ? null : brand)
              }
            />
          )}

          <div className="flex mb-4 gap-3 flex-wrap">
            <FilterDropdown
              attributeValues={attributeValues}
              onFilterChange={setSelectedAttributes}
            />
          </div>

         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-3 p-2 sm:p-4">
  {currentProducts.map((product) => {
    const basePrice = product.list_price_amount;
    let finalPrice = product.price_range_exact_amount;

    // لو فيه بادج فيها نسبة خصم زي "20%"
    const badgeLabel = product.productBadges?.[0]?.label || "";
    const discountMatch = badgeLabel.match(/(\d+)%/); // يجيب الرقم من "20%"
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
        {/* Badge */}
        {badgeLabel && (
          <div
            className="absolute top-3 left-[-20px] w-[90px] text-center text-white text-xs font-bold py-1 rotate-[-45deg] shadow-md z-10"
            style={{
              backgroundColor: product.productBadges?.[0]?.color || "#888",
            }}
          >
            {badgeLabel}
          </div>
        )}

        {/* صورة المنتج */}
        <div className="flex justify-center items-center h-[220px]">
          <ProductSlider images={product.images} productName={product.name} />
        </div>

        {/* تفاصيل المنتج */}
        <div className="p-4 flex flex-col flex-grow justify-between">
          <h3 className="text-base text-gray-700 text-center font-bold mb-1">
            {product.brand?.name}
          </h3>

          <p className="text-center text-sm text-gray-500 line-clamp-2 mb-3">
            {product.name}
          </p>

          {/* السعر */}
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
    {/* Previous Button */}
    <button
      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
      disabled={currentPage === 1}
      className="px-3 py-2   bg-gray-200 text-gray-700 disabled:opacity-50 hover:bg-gray-300 transition"
    >
      &#10094;
    </button>

    {/* Page numbers slider */}
    <div className="flex gap-2 overflow-x-auto scrollbar-none px-2">
      {[...Array(totalPages)].map((_, idx) => {
        const pageNumber = idx + 1;
        // Show only few pages around current for slider effect
        if (
          pageNumber === 1 ||
          pageNumber === totalPages ||
          (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
        ) {
          return (
            <button
              key={idx}
              onClick={() => setCurrentPage(pageNumber)}
              className={`px-3 py-2   text-sm sm:text-base transition ${
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

    {/* Next Button */}
    <button
      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
      disabled={currentPage === totalPages}
      className="px-3 py-2   bg-gray-200 text-gray-700 disabled:opacity-50 hover:bg-gray-300 transition"
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
