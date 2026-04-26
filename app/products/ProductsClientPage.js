"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import { flattenCategoriesWithParentRefs } from "../lib/categoryResolve";
import { getProductsListingBannerContext } from "../lib/productListingBannerContext";
import { useCategory } from "../contexts/CategoryContext";
import { useProductFilters } from "../hooks/useProductFilters";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  buildPathSegmentUrl,
  parsePathSegments,
  parseBrandFromPathSegments,
  fromSlug,
  toSlug,
} from "../lib/urlSlugHelper";
import ServerPaginationControls from "../Componants/ServerPaginationControls";
import { buildPathWithPage } from "../lib/paginationUrl";
import { parseListingPageFromUrlSearchParams } from "../lib/listingPageParse";
import { LISTING_PAGE_SIZE } from "../lib/listingConfig";
import CategoryListingBanner from "../Componants/CategoryListingBanner";
import BrandCategoryCovers from "../Componants/BrandCategoryCovers";

export default function ProductsClientPage({
  products,
  brands,
  attributeValues,
  initialCategories = [],
  categoryId: initialCategoryId,
  categorySlug: initialCategorySlug,
  rootCategory,
  currentPage: initialPage = 1,
  totalCount = 0,
  hasMore = false,
  initialFilters = [],
  listingPageSize = LISTING_PAGE_SIZE,
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [categories, setCategories] = useState(() =>
    Array.isArray(initialCategories) ? initialCategories : []
  );
  const categoryContext = useCategory();
  const selectedCategoryId = categoryContext?.selectedCategoryId || null;
  const setSelectedCategoryId = categoryContext?.setSelectedCategoryId || (() => {});
  const [selectedCategoryName, setSelectedCategoryName] = useState(null);
  const serverPage = useMemo(() => {
    if (searchParams.has("page")) {
      return parseListingPageFromUrlSearchParams(searchParams);
    }
    return initialPage;
  }, [searchParams, initialPage]);
  const productsPerPage = listingPageSize;
  const hasInitializedFromUrlRef = useRef(false);
  const lastParsedFiltersRef = useRef(null); // Track last parsed filters to prevent re-parsing
  const { loading: currencyLoading } = useCurrency();
  const { t, language } = useTranslation();

  const isRTL = language === "ar";

  // Fetch categories
  // 🔹 جلب التصنيفات فقط (بدون منتجات)
  // IMPORTANT: Fetch only categories, not products. Fetching all products causes 503 errors.
  useEffect(() => {
    if (Array.isArray(initialCategories) && initialCategories.length > 0) {
      setCategories(initialCategories);
      return;
    }
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
  }, [initialCategories]);

  const categoriesForSidebar = useMemo(
    () => flattenCategoriesWithParentRefs(categories),
    [categories]
  );

  /** يطابق `?brand=adidas` مع `brand_name` الفعلي من القائمة (تجاهل حالة الأحرف و fromSlug). */
  const resolveBrandFromQuerySlug = useCallback((brandSlug, brandsList) => {
    if (!brandSlug || !brandsList?.length) return null;
    const decoded = decodeURIComponent(String(brandSlug).trim());
    if (!decoded) return null;
    const target = toSlug(decoded).toLowerCase();
    for (const b of brandsList) {
      const name =
        typeof b === "string" ? b : b?.brand_name ?? b?.name ?? null;
      if (!name) continue;
      if (toSlug(String(name)).toLowerCase() === target) return String(name);
    }
    return fromSlug(decoded);
  }, []);

  // Use unified filter hook (ProductsClientPage only uses /products/ routes)
  // Let the hook handle URL updates automatically for better efficiency (like main pages)
  const {
    selectedBrand,
    selectedAttributes,
    selectedCategorySlug,
    setSelectedCategorySlug,
    handleBrandChange,
    handleAttributesChange,
    setSelectedBrand,
    setSelectedAttributes,
  } = useProductFilters({
    brands,
    attributeValues,
    categoriesWithProducts: categoriesForSidebar,
    basePath: null, // null means it will auto-detect from pathname (/products/[slug])
    setSelectedCategoryId,
    selectedCategoryId,
    disableUrlUpdates: false, // Let hook handle URL updates automatically (like main pages)
  });

  const displayBrandForCovers = useMemo(() => {
    if (selectedBrand) return selectedBrand;
    const bs = selectedAttributes?.Brand;
    if (Array.isArray(bs) && bs.length === 1) return bs[0];
    return null;
  }, [selectedBrand, selectedAttributes]);

  // Create refs for selectedBrand and selectedAttributes to use in comparisons
  const selectedBrandRef = useRef(selectedBrand);
  const selectedAttributesRef = useRef(selectedAttributes);
  
  // Update refs when state changes
  useEffect(() => {
    selectedBrandRef.current = selectedBrand;
    selectedAttributesRef.current = selectedAttributes;
  }, [selectedBrand, selectedAttributes]);

  // 🔹 Initialize filters from URL on mount (for direct access/refresh)
  // This ensures filters are applied when opening a filtered URL directly
  // This is especially important for subcategory pages from sidebar
  // Priority: 1) initialFilters from server params, 2) parse from URL pathname
  // This runs synchronously to ensure filters are applied BEFORE rendering
  // 🔹 IMPORTANT: This runs BEFORE hook's parsing to ensure initialFilters have priority
  useEffect(() => {
    // 🔹 Priority 1: Use initialFilters from server component params if available
    // This handles prefixed segments like: brand-nike, color-white, color-gold
    // Example URL: /products/goalkeeper-jerseys/color-white/color-gold/brand-nike
    // → initialFilters: ["color-white", "color-gold", "brand-nike"]
    const hasInitialFilters = initialFilters && Array.isArray(initialFilters) && initialFilters.length > 0;
    
    // 🔹 إذا كان هناك initialFilters، نطبقها فوراً حتى لو البيانات غير جاهزة
    // لأنها تأتي من server component وهي صحيحة
    if (hasInitialFilters) {
      // Wait for data to be ready - we need brands and attributeValues to parse filters correctly
      if (!brands.length || !attributeValues.length) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔹 ProductsClientPage: initialFilters found but data not ready, will retry');
        }
        // سنحاول مرة أخرى عند وصول البيانات
        return;
      }
      
      // Create a unique key for current filters to prevent re-parsing
      const filtersKey = JSON.stringify({
        initialFilters: initialFilters || [],
        pathname,
        brandsLength: brands.length,
        attributeValuesLength: attributeValues.length
      });
      
      // Skip if we've already parsed these exact filters
      if (lastParsedFiltersRef.current === filtersKey) {
        return;
      }
      
      // Mark as initialized after successful parsing
      if (!hasInitializedFromUrlRef.current) {
        hasInitializedFromUrlRef.current = true;
      }
      
      // Mark as parsed
      lastParsedFiltersRef.current = filtersKey;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔹 ProductsClientPage: Applying initialFilters with priority:', initialFilters);
      }
      
      // Decode URL-encoded segments
      const pathSegments = initialFilters.map(segment => decodeURIComponent(segment));
      
      // Parse brand from path segments (handles both "brand-nike" and "nike" formats)
      if (pathSegments.length > 0) {
        const parsedBrand = parseBrandFromPathSegments(pathSegments, brands, attributeValues);
        if (parsedBrand && parsedBrand !== selectedBrandRef.current) {
          // Apply brand filter immediately
          if (process.env.NODE_ENV === 'development') {
            console.log('🔹 ProductsClientPage: Parsing brand from initialFilters:', parsedBrand);
          }
          setSelectedBrand(parsedBrand);
        }
      }
      
      // Parse attributes from path segments
      // Handles prefixed segments like "color-white", "color-gold", "size-large"
      // Also handles standalone values like "black" (first color value)
      if (pathSegments.length > 0) {
        const parsedAttrs = parsePathSegments(pathSegments, attributeValues, brands);
        if (parsedAttrs && Object.keys(parsedAttrs).length > 0) {
          const currentAttrsStr = JSON.stringify(selectedAttributesRef.current);
          const newAttrsStr = JSON.stringify(parsedAttrs);
          if (currentAttrsStr !== newAttrsStr) {
            // Apply attribute filters immediately
            if (process.env.NODE_ENV === 'development') {
              console.log('🔹 ProductsClientPage: Parsing attributes from initialFilters:', parsedAttrs);
            }
            setSelectedAttributes(parsedAttrs);
          }
        }
      }
      
      // 🔹 بعد تطبيق initialFilters، لا نحتاج للـ fallback parsing
      // لأن initialFilters هي المصدر الصحيح للفلاتر
      return;
    }
    
    // Priority 2: Fallback to parsing from URL pathname (for client-side navigation)
    // فقط إذا لم يكن هناك initialFilters
    // Wait for data to be ready - we need brands and attributeValues to parse filters correctly
    if (!brands.length || !attributeValues.length) {
      if (!hasInitializedFromUrlRef.current) {
        return; // Wait for data to be ready on first attempt
      }
      return;
    }
    
    // Create a unique key for current filters to prevent re-parsing
    const filtersKey = JSON.stringify({
      initialFilters: initialFilters || [],
      pathname,
      brandsLength: brands.length,
      attributeValuesLength: attributeValues.length
    });
    
    // Skip if we've already parsed these exact filters
    if (lastParsedFiltersRef.current === filtersKey) {
      return;
    }
    
    // Mark as initialized after successful parsing
    if (!hasInitializedFromUrlRef.current) {
      hasInitializedFromUrlRef.current = true;
    }
    
    // Mark as parsed
    lastParsedFiltersRef.current = filtersKey;
    
    const currentPath = typeof window !== "undefined" ? window.location.pathname : pathname;
    if (currentPath && currentPath.startsWith('/products/')) {
      // Parse /products/[category-slug]/[filters] structure
      const pathWithoutBase = currentPath.replace('/products/', '').split('?')[0];
      const parts = pathWithoutBase.split('/').filter((p) => p);
      
      if (parts.length > 1) {
        // First part is category slug, rest are filter segments
        const pathSegments = parts.slice(1);
        
        // Parse brand from path segments
        if (pathSegments.length > 0) {
          const parsedBrand = parseBrandFromPathSegments(pathSegments, brands, attributeValues);
          if (parsedBrand && parsedBrand !== selectedBrandRef.current) {
            if (process.env.NODE_ENV === 'development') {
              console.log('🔹 ProductsClientPage: Parsing brand from URL pathname:', parsedBrand);
            }
            setSelectedBrand(parsedBrand);
          }
        }
        
        // Parse attributes from path segments
        if (pathSegments.length > 0) {
          const parsedAttrs = parsePathSegments(pathSegments, attributeValues, brands);
          if (parsedAttrs && Object.keys(parsedAttrs).length > 0) {
            const currentAttrsStr = JSON.stringify(selectedAttributesRef.current);
            const newAttrsStr = JSON.stringify(parsedAttrs);
            if (currentAttrsStr !== newAttrsStr) {
              if (process.env.NODE_ENV === 'development') {
                console.log('🔹 ProductsClientPage: Parsing attributes from URL pathname:', parsedAttrs);
              }
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
        const brandName = resolveBrandFromQuerySlug(brandSlug, brands);
        if (brandName && brandName !== selectedBrandRef.current) {
          setSelectedBrand(brandName);
        }
      }
    }
  }, [brands, attributeValues, pathname, searchParams, initialFilters, resolveBrandFromQuerySlug]);


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
      const slugDecoded = decodeURIComponent(categorySlugToUse);
      const foundCategory = categoriesForSidebar.find((cat) => cat.slug === slugDecoded);
      if (foundCategory) {
        // Set both ID and slug to ensure URL updates work correctly
        if (foundCategory.id !== selectedCategoryId) {
          setSelectedCategoryId(foundCategory.id);
        }
      }
    } else if (initialCategoryId) {
      const foundCategory = categoriesForSidebar.find(
        (cat) => String(cat.id) === String(initialCategoryId)
      );
      if (foundCategory) {
        setSelectedCategoryId(initialCategoryId);
      }
    }
  }, [pathname, setSelectedCategoryId, initialCategoryId, initialCategorySlug, categoriesForSidebar, selectedCategoryId]);

  // 🔹 فلترة المنتجات حسب الفلاتر - استخدام useMemo لتحسين الأداء وتطبيق الفلاتر فوراً
  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      // 🔹 Handle single brand (selectedBrand) or multiple brands (Brand attribute)
      let brandMatch = true;
      if (selectedAttributes["Brand"] && selectedAttributes["Brand"].length > 0) {
        // Multiple brands selected as attribute
        const selectedBrands = selectedAttributes["Brand"].map((b) => String(b).toLowerCase().trim());
        brandMatch = product.brand_name && selectedBrands.includes(String(product.brand_name).toLowerCase().trim());
      } else if (selectedBrand) {
        const pb = product.brand_name
          ? String(product.brand_name).toLowerCase().trim()
          : "";
        const sb = String(selectedBrand).toLowerCase().trim();
        brandMatch = Boolean(pb && sb && pb === sb);
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

      return brandMatch && attributesMatch;
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
  }, [products, selectedBrand, selectedAttributes]);

  const lastAppliedFilterSignatureRef = useRef(null);
  const filterSignature = useMemo(
    () => JSON.stringify({ selectedBrand, selectedAttributes }),
    [selectedBrand, selectedAttributes]
  );
  useEffect(() => {
    if (lastAppliedFilterSignatureRef.current === null) {
      // Baseline after hydration: do not reset page on initial filter URL sync.
      lastAppliedFilterSignatureRef.current = filterSignature;
      return;
    }
    if (lastAppliedFilterSignatureRef.current === filterSignature) return;
    lastAppliedFilterSignatureRef.current = filterSignature;
    if (serverPage > 1) {
      router.replace(buildPathWithPage(pathname, searchParams, 1));
    }
  }, [filterSignature, serverPage, pathname, searchParams, router]);

  const [currentRootCategory, setCurrentRootCategory] = useState(rootCategory);

  useEffect(() => {
    const cat = categoriesForSidebar.find((c) => String(c.id) === String(selectedCategoryId));
    setSelectedCategoryName(cat?.name || null);
  }, [selectedCategoryId, categoriesForSidebar]);

  useEffect(() => {
    if (rootCategory) {
      setCurrentRootCategory(rootCategory);
    }
  }, [rootCategory]);

  const currentProducts = filteredProducts;
  const memoizedInitialFilters = useMemo(
    () => ({ ...selectedAttributes }),
    [selectedAttributes]
  );

  // 🔹 معالجة URL الصورة
  const getImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith('http')) return image;
    // استخدام BASE_URL مباشرة
    return `https://keepersport.store/storage/${image}`;
  };

  const productsPathFirstSlug = useMemo(() => {
    if (!pathname?.startsWith("/products/")) return null;
    const rest = pathname.slice("/products/".length).split("?")[0];
    const parts = rest.split("/").filter(Boolean);
    return parts[0] || null;
  }, [pathname]);

  const { rootForMeta, selectedLeaf } = useMemo(
    () =>
      getProductsListingBannerContext(
        categories,
        selectedCategoryId,
        productsPathFirstSlug
      ),
    [categories, selectedCategoryId, productsPathFirstSlug]
  );

  const categoryImageRaw =
    selectedLeaf?.image ??
    rootForMeta?.image ??
    currentRootCategory?.image ??
    null;
  const categoryBannerSrc = categoryImageRaw ? getImageUrl(categoryImageRaw) : null;

  const coversSource =
    rootForMeta?.brand_category_covers ??
    currentRootCategory?.brand_category_covers ??
    [];
  const rootCategoryIdForCovers =
    rootForMeta?.id ?? currentRootCategory?.id ?? null;

  return (
    <div className={`bg-[#373e3e] ${isRTL ? "rtl" : "ltr"}`}>
      <div className="grid pt-1 grid-cols-1 lg:grid-cols-5">
        {/* Sidebar */}
        <div className="hidden lg:block lg:col-span-1 bg-black h-auto">
          <Sidebar
            categories={categoriesForSidebar.length > 0 ? categoriesForSidebar : categories}
            onSelectCategory={(catId) => {
              // 🔹 استخدام router.push مع slug في path للتنقل بسلاسة
              const allCategories = categoriesForSidebar.length > 0 ? categoriesForSidebar : categories;
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
        <div className="md:col-span-4 min-w-0 p-4 bg-white">
          {/* 🟢 عرض صورة rootCategory فوق المنتجات */}
          <h1 className="text-4xl text-[#1f2323] p-2">
            {selectedCategoryName || t("All Products")}
          </h1>
          {categoryBannerSrc && (
            <CategoryListingBanner
              src={categoryBannerSrc}
              alt={currentRootCategory.name || "Category Banner"}
            />
          )}

          {displayBrandForCovers &&
            !categoryBannerSrc &&
            Array.isArray(coversSource) &&
            coversSource.length > 0 && (
              <BrandCategoryCovers
                covers={coversSource}
                getImageUrl={getImageUrl}
                selectedBrand={displayBrandForCovers}
                selectedCategoryId={selectedCategoryId}
                rootCategoryId={rootCategoryIdForCovers}
              />
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
              initialFilters={memoizedInitialFilters}
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
                    <ProductSlider
                      key={`${product.id || product.sku}-${displayBrandForCovers || ""}-${(selectedAttributes["Brand"] || []).join(",")}`}
                      images={product.images}
                      productName={product.name}
                    />
                  </div>

                  <div className="p-4 flex flex-col flex-grow justify-between">
                    <h3 className="text-base text-gray-700 text-center font-bold mb-1">
                      <DynamicText>{product.brand_name || ''}</DynamicText>
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

          <ServerPaginationControls serverPage={serverPage} hasMore={hasMore} />
        </div>
      </div>
    </div>
  );
}

