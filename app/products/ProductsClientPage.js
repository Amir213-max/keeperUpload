"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useRef } from "react";
// import BrandsSlider from "../Componants/brandsSplide_1";
import ProductSlider from "../Componants/ProductSlider";
import Sidebar from "../Componants/sidebar";
import { useTranslation } from "../contexts/TranslationContext";
import FilterDropdown from "../Componants/CheckboxDropdown ";
import { useCurrency } from "../contexts/CurrencyContext";
import PriceDisplay from "../components/PriceDisplay";
import DynamicText from "../components/DynamicText";
import { graphqlRequest } from "../lib/graphqlClientHelper";
import { GET_CATEGORIES_ONLY_QUERY } from "../lib/queries";
import { useCategory } from "../contexts/CategoryContext";
import { useProductFilters } from "../hooks/useProductFilters";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { buildPathSegmentUrl, parsePathSegments, parseBrandFromPathSegments, fromSlug } from "../lib/urlSlugHelper";

export default function ProductsClientPage({ products, brands, attributeValues, categoryId: initialCategoryId, categorySlug: initialCategorySlug, rootCategory, currentPage: initialPage = 1, totalCount = 0, hasMore = false, initialFilters = [] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [categories, setCategories] = useState([]);
  const categoryContext = useCategory();
  const selectedCategoryId = categoryContext?.selectedCategoryId || null;
  const setSelectedCategoryId = categoryContext?.setSelectedCategoryId || (() => {});
  const [selectedCategoryName, setSelectedCategoryName] = useState(null);
  const [currentPage, setCurrentPage] = useState(() => {
    const pageParam = searchParams.get('page');
    return pageParam ? parseInt(pageParam, 10) : initialPage;
  });
  const productsPerPage = 30;
  const hasInitializedFromUrlRef = useRef(false);
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

  // Use unified filter hook (ProductsClientPage only uses /products/ routes)
  // Let the hook handle URL updates automatically for better efficiency (like main pages)
  const {
    selectedBrand,
    selectedAttributes,
    selectedCategorySlug,
    handleBrandChange,
    handleAttributesChange,
    setSelectedBrand,
    setSelectedAttributes,
  } = useProductFilters({
    brands,
    attributeValues,
    categoriesWithProducts,
    basePath: null, // null means it will auto-detect from pathname (/products/[slug])
    setSelectedCategoryId,
    selectedCategoryId,
    disableUrlUpdates: false, // Let hook handle URL updates automatically (like main pages)
  });

  // 🔹 Initialize filters from URL on mount (for direct access/refresh)
  // This ensures filters are applied when opening a filtered URL directly
  // This is especially important for subcategory pages from sidebar
  // Priority: 1) initialFilters from server params, 2) parse from URL pathname
  // This runs synchronously to ensure filters are applied BEFORE rendering
  useEffect(() => {
    // Only run once on initial mount, after data is ready
    if (hasInitializedFromUrlRef.current) return;
    
    // Wait for data to be ready - we need brands and attributeValues to parse filters correctly
    if (!brands.length || !attributeValues.length) {
      return; // Wait for data to be ready
    }
    
    // Mark as initialized immediately to prevent re-running
    hasInitializedFromUrlRef.current = true;
    
    // Priority 1: Use initialFilters from server component params if available
    // This handles prefixed segments like: brand-nike, color-white, color-gold
    // Example URL: /products/goalkeeper-jerseys/color-white/color-gold/brand-nike
    // → initialFilters: ["color-white", "color-gold", "brand-nike"]
    const hasInitialFilters = initialFilters && Array.isArray(initialFilters) && initialFilters.length > 0;
    if (hasInitialFilters) {
      // Decode URL-encoded segments
      const pathSegments = initialFilters.map(segment => decodeURIComponent(segment));
      
      // Parse brand from path segments (handles both "brand-nike" and "nike" formats)
      if (pathSegments.length > 0) {
        const parsedBrand = parseBrandFromPathSegments(pathSegments, brands, attributeValues);
        if (parsedBrand) {
          // Apply brand filter immediately
          setSelectedBrand(parsedBrand);
        }
      }
      
      // Parse attributes from path segments
      // Handles prefixed segments like "color-white", "color-gold", "size-large"
      // Also handles standalone values like "black" (first color value)
      if (pathSegments.length > 0) {
        const parsedAttrs = parsePathSegments(pathSegments, attributeValues, brands);
        if (parsedAttrs && Object.keys(parsedAttrs).length > 0) {
          // Apply attribute filters immediately
          setSelectedAttributes(parsedAttrs);
        }
      }
      
      // Debug: Log applied filters
      if (process.env.NODE_ENV === 'development') {
        console.log('🔹 Applied filters from initialFilters:', {
          pathSegments,
          parsedBrand: parseBrandFromPathSegments(pathSegments, brands, attributeValues),
          parsedAttrs: parsePathSegments(pathSegments, attributeValues, brands),
        });
      }
    } else {
      // Priority 2: Fallback to parsing from URL pathname (for client-side navigation)
      const currentPath = typeof window !== "undefined" ? window.location.pathname : pathname;
      if (currentPath && currentPath.startsWith('/products/') && brands.length > 0 && attributeValues.length > 0) {
        // Parse /products/[category-slug]/[filters] structure
        const pathWithoutBase = currentPath.replace('/products/', '').split('?')[0];
        const parts = pathWithoutBase.split('/').filter((p) => p);
        
        if (parts.length > 1) {
          // First part is category slug, rest are filter segments
          const pathSegments = parts.slice(1);
          
          // Parse brand from path segments
          if (pathSegments.length > 0) {
            const parsedBrand = parseBrandFromPathSegments(pathSegments, brands, attributeValues);
            if (parsedBrand) {
              setSelectedBrand(parsedBrand);
            }
          }
          
          // Parse attributes from path segments
          if (pathSegments.length > 0) {
            const parsedAttrs = parsePathSegments(pathSegments, attributeValues, brands);
            if (parsedAttrs && Object.keys(parsedAttrs).length > 0) {
              setSelectedAttributes(parsedAttrs);
            }
          }
        }
      }
    }
    
    // Also check query params for brand (backward compatibility)
    if (searchParams && brands.length > 0) {
      const brandSlug = searchParams.get("brand");
      if (brandSlug) {
        const brandName = fromSlug(brandSlug);
        if (brandName) {
          setSelectedBrand(brandName);
        }
      }
    }
  }, [brands, attributeValues, pathname, searchParams, setSelectedBrand, setSelectedAttributes, initialFilters]);

  // 🔹 Re-initialize filters if data becomes available after initial attempt
  // This handles the case where initialFilters exist but brands/attributeValues weren't ready yet
  useEffect(() => {
    // Only re-run if we have initialized but data wasn't ready initially
    if (!hasInitializedFromUrlRef.current) return;
    if (!brands.length || !attributeValues.length) return;
    
    // Only re-run if we have initialFilters but filters weren't applied
    if (initialFilters && Array.isArray(initialFilters) && initialFilters.length > 0) {
      // Check if filters are already applied
      const hasBrand = selectedBrand !== null;
      const hasAttributes = Object.keys(selectedAttributes).length > 0;
      
      // If we have initialFilters but no filters applied, try again
      if (!hasBrand && !hasAttributes) {
        // Force re-initialization
        const pathSegments = initialFilters.map(segment => decodeURIComponent(segment));
        
        if (pathSegments.length > 0) {
          const parsedBrand = parseBrandFromPathSegments(pathSegments, brands, attributeValues);
          if (parsedBrand) {
            setSelectedBrand(parsedBrand);
          }
          
          const parsedAttrs = parsePathSegments(pathSegments, attributeValues, brands);
          if (parsedAttrs && Object.keys(parsedAttrs).length > 0) {
            setSelectedAttributes(parsedAttrs);
          }
        }
      }
    }
  }, [brands, attributeValues, initialFilters, selectedBrand, selectedAttributes, setSelectedBrand, setSelectedAttributes]);

  // Set initial category from URL path or props (only if not set by hook)
  // This ensures selectedCategorySlug is set correctly for URL updates
  useEffect(() => {
    if (!categories.length) return; // Wait for categories to load (use all categories, not just categoriesWithProducts)
    
    let pathSlug = null;
    if (pathname && pathname.startsWith('/products/')) {
      const pathWithoutBase = pathname.replace('/products/', '').split('?')[0];
      const parts = pathWithoutBase.split('/').filter(p => p);
      if (parts.length > 0) {
        pathSlug = parts[0];
      }
    }
    
    // Use initialCategorySlug if available (from server component)
    const categorySlugToUse = initialCategorySlug || pathSlug;
    
    if (categorySlugToUse && categorySlugToUse !== 'products' && categorySlugToUse !== '') {
      // 🔹 Search in all categories first (not just categoriesWithProducts)
      // This ensures category is found even if products haven't loaded yet
      const foundCategory = categories.find(
        (cat) => cat.slug === decodeURIComponent(categorySlugToUse)
      ) || categoriesWithProducts.find(
        (cat) => cat.slug === decodeURIComponent(categorySlugToUse)
      );
      if (foundCategory) {
        // Set both ID and slug to ensure URL updates work correctly
        if (foundCategory.id !== selectedCategoryId) {
          setSelectedCategoryId(foundCategory.id);
        }
      }
    } else if (initialCategoryId) {
      // 🔹 Search in all categories first (not just categoriesWithProducts)
      const foundCategory = categories.find(
        (cat) => cat.id === initialCategoryId
      ) || categoriesWithProducts.find(
        (cat) => cat.id === initialCategoryId
      );
      if (foundCategory) {
        setSelectedCategoryId(initialCategoryId);
      }
    }
  }, [pathname, setSelectedCategoryId, initialCategoryId, initialCategorySlug, categories, categoriesWithProducts, selectedCategoryId]);

  // 🔹 فلترة المنتجات حسب الفلاتر - استخدام useMemo لتحسين الأداء وتطبيق الفلاتر فوراً
  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      // 🔹 Handle single brand (selectedBrand) or multiple brands (Brand attribute)
      let brandMatch = true;
      if (selectedAttributes["Brand"] && selectedAttributes["Brand"].length > 0) {
        // Multiple brands selected as attribute
        const selectedBrands = selectedAttributes["Brand"].map((b) => String(b).toLowerCase().trim());
        brandMatch = product.brand?.name && selectedBrands.includes(String(product.brand.name).toLowerCase().trim());
      } else if (selectedBrand) {
        // Single brand selected
        brandMatch = product.brand?.name === selectedBrand;
      }

      const attrs = product.productAttributeValues || [];
      const attributesMatch = Object.entries(selectedAttributes).every(
        ([attrLabel, selectedVals]) => {
          if (!selectedVals || selectedVals.length === 0) return true;
          // Skip Brand attribute as it's handled separately above
          if (attrLabel === "Brand") return true;
          
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
    
    // Debug: Log filtering results
    if (process.env.NODE_ENV === 'development') {
      console.log('🔹 Filtering products:', {
        totalProducts: products.length,
        selectedBrand,
        selectedAttributes,
        filteredCount: filtered.length,
      });
    }
    
    return filtered;
  }, [products, selectedBrand, selectedAttributes, selectedCategoryId]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBrand, selectedAttributes, selectedCategoryId]);

  const [currentRootCategory, setCurrentRootCategory] = useState(rootCategory);

  useEffect(() => {
    const cat = categoriesWithProducts.find((c) => c.id === selectedCategoryId);
    setSelectedCategoryName(cat?.name || null);
    
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

  // 🔹 Track initial load to prevent URL updates on mount
  const isInitialLoadRef = useRef(true);
  const hasParsedInitialUrlRef = useRef(false);
  
  // Parse URL on initial load
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const currentPath = window.location.pathname;
    if (currentPath && currentPath.startsWith('/products/')) {
      const pathWithoutBase = currentPath.replace('/products/', '').split('?')[0];
      const parts = pathWithoutBase.split('/').filter(p => p);
      
      if (parts.length > 1) {
        // There are filters in the URL
        hasParsedInitialUrlRef.current = true;
      }
    }
    
    // Mark initial load as complete after a short delay
    setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 2000); // 🔹 تأخير 2 ثانية لضمان عدم تحديث URL على initial load
  }, []);

  // 🔹 URL updates are now handled automatically by useProductFilters hook (like main pages)
  // The hook handles filter URL updates using buildPathSegmentUrl
  // For pagination, we sync with URL but the hook's updateUrlFromState handles filters
  // This ensures sub-pages work exactly like main pages for URL updates

  // Update currentPage when URL changes (sync with URL like main pages)
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
  }, [searchParams, currentPage]);
  
  // 🔹 Sync pagination with URL when page changes (same logic as main pages for filters)
  // This ensures URL reflects current page for shareable links, just like filters update URL
  useEffect(() => {
    // Skip on initial load
    if (isInitialLoadRef.current) return;
    
    // Get current page from URL
    const currentPageParam = searchParams.get('page');
    const currentPageNum = currentPageParam ? parseInt(currentPageParam, 10) : 1;
    
    // Only update URL if page changed (not from URL) and we have a category slug
    if (currentPage !== currentPageNum && currentPage > 0 && selectedCategorySlug) {
      // Build URL with updated page using buildPathSegmentUrl (same as main pages use for filters)
      const newUrl = buildPathSegmentUrl(
        selectedCategorySlug,
        selectedAttributes,
        selectedBrand,
        currentPage > 1 ? currentPage : null
      );
      
      if (newUrl) {
        const currentFullUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
        if (newUrl !== currentFullUrl) {
          router.replace(newUrl, { scroll: false });
        }
      }
    }
  }, [currentPage, selectedCategorySlug, selectedAttributes, selectedBrand, pathname, searchParams, router]);

  // استخدام المنتجات المفلترة مع pagination
  // 🔹 تطبيق pagination على المنتجات المفلترة
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

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
                    selectedBrand
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
              onFilterChange={handleAttributesChange}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-3 p-2 sm:p-4">
            {currentProducts.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 text-lg">{t("No products found") || "No products found"}</p>
              </div>
            ) : (
              currentProducts.map((product) => {
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
                      <DynamicText>{product.brand?.name || ''}</DynamicText>
                    </h3>

                    <p className="text-center text-sm text-gray-500 line-clamp-2 mb-3">
                      <DynamicText>{product.name || ''}</DynamicText>
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
            })
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6 select-none">
              <button
                onClick={() => {
                  const newPage = Math.max(currentPage - 1, 1);
                  setCurrentPage(newPage);
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
                          setCurrentPage(pageNumber);
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
                  setCurrentPage(newPage);
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

