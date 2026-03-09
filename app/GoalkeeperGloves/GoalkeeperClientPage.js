"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import BrandsSlider from "../Componants/brandsSplide_1";
import ProductSlider from "../Componants/ProductSlider";
import Sidebar from "../Componants/sidebar";
import { useTranslation } from "../contexts/TranslationContext";
import FilterDropdown from "../Componants/CheckboxDropdown ";
import { useCurrency } from "../contexts/CurrencyContext";
import PriceDisplay from "../components/PriceDisplay";
import DynamicText from "../components/DynamicText";
import { graphqlRequest } from "../lib/graphqlClientHelper";
import { GET_CATEGORIES_ONLY_QUERY } from "../lib/queries";
import { buildPathSegmentUrl, buildParentPageUrl, parsePathSegments, parseBrandFromPathSegments, fromSlug } from "../lib/urlSlugHelper";
import { useCategory } from "../contexts/CategoryContext";
import { useProductFilters } from "../hooks/useProductFilters";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import ProgressBar from "../Componants/ProgressBar";

export default function GoalKeeperClientPage({ products, brands, attributeValues, rootCategory }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState([]);
  const categoryContext = useCategory();
  const selectedCategoryId = categoryContext?.selectedCategoryId ?? null;
  const setSelectedCategoryId = categoryContext?.setSelectedCategoryId ?? (() => {});
  const setGoalkeeperGlovesBrands = categoryContext?.setGoalkeeperGlovesBrands ?? (() => {});
  const [selectedCategoryName, setSelectedCategoryName] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 20;
  const hasInitializedFromUrlRef = useRef(false);
  
  // ✅ إضافة state لتتبع تحميل الصور
  const [imagesLoading, setImagesLoading] = useState(false); // يبدأ بـ false، يصبح true فقط عند التحميل الأولي أو action من المستخدم
  const [imageProgress, setImageProgress] = useState(0);
  const [showProducts, setShowProducts] = useState(false); // إخفاء المنتجات حتى يكتمل التحميل
  const loadedImagesRef = useRef(new Set());
  const totalImagesRef = useRef(0);
  const isInitialLoadRef = useRef(true); // لتتبع التحميل الأولي
  
  const { loading: currencyLoading } = useCurrency();
  const { t, language } = useTranslation();
  const isRTL = language === "ar";

  // 🔹 تم إزالة router.refresh() لمنع refresh تلقائي للصفحة

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

  // 🔹 حفظ البراندات في الـ context للاستخدام في الـ sidebar
  useEffect(() => {
    if (brands && brands.length > 0) {
      setGoalkeeperGlovesBrands(brands);
    }
  }, [brands, setGoalkeeperGlovesBrands]);

  // Use unified filter hook
  // 🔹 تعطيل تحديثات URL التلقائية لمنع restart عند انتهاء ProgressBar
  const {
    selectedBrand,
    selectedAttributes,
    handleBrandChange,
    handleAttributesChange,
    setSelectedBrand,
    setSelectedAttributes,
  } = useProductFilters({
    brands,
    attributeValues,
    categoriesWithProducts,
    basePath: "/GoalkeeperGloves",
    setSelectedCategoryId,
    selectedCategoryId,
    disableUrlUpdates: false, // 🔹 نتركه false لأننا نريد تحديث URL عند تغيير الفلاتر
  });

  // 🔹 Initialize filters from URL on mount (for direct access/refresh)
  // This ensures filters are applied when opening a filtered URL directly
  useEffect(() => {
    // Only run once on initial mount, after data is ready
    if (hasInitializedFromUrlRef.current) return;
    if (!brands.length || !attributeValues.length) return; // Wait for data to be ready
    
    // Mark as initialized immediately to prevent re-running
    hasInitializedFromUrlRef.current = true;
    
    // Read current URL
    const currentPath = typeof window !== "undefined" ? window.location.pathname : pathname;
    if (!currentPath) return;
    
    // Parse path segments (everything after /GoalkeeperGloves)
    const pathParts = currentPath.split("/").filter((p) => p);
    const basePathParts = "/GoalkeeperGloves".split("/").filter((p) => p);
    
    // Get segments after base path
    let pathSegments = [];
    if (pathParts.length > basePathParts.length) {
      pathSegments = pathParts.slice(basePathParts.length);
    }
    
    // Parse attributes from path segments first (includes Brand attribute for multiple brands)
    let parsedAttrs = {};
    if (pathSegments.length > 0) {
      parsedAttrs = parsePathSegments(pathSegments, attributeValues, brands);
      if (parsedAttrs && Object.keys(parsedAttrs).length > 0) {
        // 🔹 إذا كان هناك Brand attribute (من brand-{brandName} في URL)، نأخذ أول براند ونضعه في selectedBrand
        if (parsedAttrs["Brand"] && Array.isArray(parsedAttrs["Brand"]) && parsedAttrs["Brand"].length > 0) {
          const brandFromAttr = parsedAttrs["Brand"][0];
          setSelectedBrand(brandFromAttr);
          // 🔹 الاحتفاظ بـ Brand في attributes لإظهاره في FilterDropdown
          if (process.env.NODE_ENV === 'development') {
            console.log('🔹 GoalkeeperClientPage: Parsed Brand from URL attributes:', brandFromAttr);
            console.log('🔹 GoalkeeperClientPage: Setting attributes:', parsedAttrs);
          }
          setSelectedAttributes(parsedAttrs);
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔹 GoalkeeperClientPage: Setting attributes (no Brand):', parsedAttrs);
          }
          setSelectedAttributes(parsedAttrs);
        }
      }
    }
    
    // Parse brand from path segments (for single brand only - بدون prefix)
    if (pathSegments.length > 0) {
      const parsedBrand = parseBrandFromPathSegments(pathSegments, brands, attributeValues);
      if (parsedBrand) {
        // Only set selectedBrand if Brand attribute is not set (to avoid conflict)
        if (!parsedAttrs["Brand"] || parsedAttrs["Brand"].length === 0) {
          setSelectedBrand(parsedBrand);
          // 🔹 إضافة البراند إلى selectedAttributes["Brand"] لإظهاره في FilterDropdown
          if (process.env.NODE_ENV === 'development') {
            console.log('🔹 GoalkeeperClientPage: Parsed brand from URL path segments:', parsedBrand);
            console.log('🔹 GoalkeeperClientPage: Adding Brand to attributes');
          }
          setSelectedAttributes((prev) => ({
            ...prev,
            Brand: [parsedBrand],
          }));
        }
      }
    }
    
    // Also check query params for brand (backward compatibility)
    if (searchParams) {
      const brandSlug = searchParams.get("brand");
      if (brandSlug) {
        const brandName = fromSlug(brandSlug);
        if (brandName) {
          // Only set selectedBrand if Brand attribute is not set (to avoid conflict)
          if (!parsedAttrs["Brand"] || parsedAttrs["Brand"].length === 0) {
            setSelectedBrand(brandName);
            // 🔹 إضافة البراند إلى selectedAttributes["Brand"] لإظهاره في FilterDropdown
            if (process.env.NODE_ENV === 'development') {
              console.log('🔹 GoalkeeperClientPage: Parsed brand from query params:', brandName);
              console.log('🔹 GoalkeeperClientPage: Adding Brand to attributes');
            }
            setSelectedAttributes((prev) => ({
              ...prev,
              Brand: [brandName],
            }));
          }
        }
      }
    }
  }, [brands, attributeValues, pathname, searchParams, setSelectedBrand, setSelectedAttributes]);


  // ✅ بدء ProgressBar عند تغيير الفلاتر أو الصفحة (action من المستخدم)
  useEffect(() => {
    // تجاهل التحميل الأولي - سيتم التعامل معه في useEffect منفصل
    if (isInitialLoadRef.current) {
      return;
    }
    
    // فقط عند action من المستخدم (فلترة أو تغيير صفحة)
    setImagesLoading(true);
    setImageProgress(0);
    setShowProducts(false); // إخفاء المنتجات عند الفلترة
    loadedImagesRef.current.clear();
  }, [selectedBrand, selectedAttributes, selectedCategoryId, currentPage]);

  // 🔹 فلترة المنتجات حسب الفلاتر
  useEffect(() => {
    const result = products.filter((product) => {
      // 🔹 Handle single brand (selectedBrand) or multiple brands (Brand attribute)
      let brandMatch = true;
      if (selectedAttributes["Brand"] && selectedAttributes["Brand"].length > 0) {
        // Multiple brands selected as attribute
        const selectedBrands = selectedAttributes["Brand"].map((b) => String(b).toLowerCase().trim());
        brandMatch = product.brand_name && selectedBrands.includes(String(product.brand_name).toLowerCase().trim());
      } else if (selectedBrand) {
        // Single brand selected
        brandMatch = product.brand_name === selectedBrand;
      }

      const attrs = product.productAttributeValues || [];
      const attributesMatch = Object.entries(selectedAttributes).every(
        ([attrLabel, selectedVals]) => {
          if (!selectedVals || selectedVals.length === 0) return true;
          // Skip Brand attribute as it's handled separately above
          if (attrLabel === "Brand") return true;
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

  // 🔹 ضبط اسم التصنيف المحدد
  useEffect(() => {
    const cat = categoriesWithProducts.find((c) => c.id === selectedCategoryId);
    setSelectedCategoryName(cat?.name || null);
  }, [selectedCategoryId, categoriesWithProducts]);

  // Client-side pagination
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  // 🔹 استخدام useMemo لمنع إنشاء كائن جديد في كل render (يسبب infinite loop)
  const memoizedInitialFilters = useMemo(() => ({ ...selectedAttributes }), [selectedAttributes]);

  // ✅ حساب عدد الصور الإجمالي وبدء التحميل الأولي
  useEffect(() => {
    const totalImages = currentProducts.reduce((count, product) => {
      return count + (product.images?.length > 0 ? 1 : 0);
    }, 0);
    totalImagesRef.current = totalImages;
    
    // ✅ التحميل الأولي فقط
    if (isInitialLoadRef.current && totalImages > 0) {
      setImagesLoading(true);
      setImageProgress(0);
      setShowProducts(false); // إخفاء المنتجات حتى تحمل الصور
      loadedImagesRef.current.clear();
      isInitialLoadRef.current = false;
      
      // ✅ Fallback: إذا لم تحمل الصور خلال 3 ثوان، اعرض المنتجات
      const fallbackTimeout = setTimeout(() => {
        setImagesLoading(false);
        setImageProgress(0);
        setShowProducts(true);
      }, 3000);
      
      return () => clearTimeout(fallbackTimeout);
    } else if (totalImages === 0 && isInitialLoadRef.current) {
      // إذا لم تكن هناك صور في التحميل الأولي، اعرض المنتجات مباشرة
      setImagesLoading(false);
      setImageProgress(0);
      setShowProducts(true);
      isInitialLoadRef.current = false;
    }
  }, [currentProducts]);

  // ✅ معالج تحميل الصور
  const handleImageLoad = useCallback((productId) => {
    if (!loadedImagesRef.current.has(productId)) {
      loadedImagesRef.current.add(productId);
      const loadedCount = loadedImagesRef.current.size;
      const totalImages = totalImagesRef.current;
      
      // ✅ حساب النسبة المئوية الفعلية
      if (totalImages > 0) {
        const progress = Math.min((loadedCount / totalImages) * 100, 100);
        setImageProgress(progress);
      }
      
      // ✅ إذا تم تحميل جميع الصور، أكمل إلى 100% ثم اخف الشريط
      if (loadedCount >= totalImages && totalImages > 0) {
        // تأكد من الوصول إلى 100%
        setImageProgress(100);
        // انتظر قليلاً للتأكد من أن كل شيء تم تحميله
        // 🔹 استخدام requestAnimationFrame لمنع restart الصفحة
        requestAnimationFrame(() => {
          setTimeout(() => {
            setImagesLoading(false);
            setShowProducts(true); // عرض المنتجات بعد اكتمال التحميل
          }, 300);
        });
      }
    }
  }, []);

  // 🔹 معالجة URL الصورة
  const getImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith('http')) return image;
    // استخدام BASE_URL مباشرة
    return `https://keepersport.store/storage/${image}`;
  };

  return (
    <div className={`bg-[#373e3e] ${isRTL ? "rtl" : "ltr"}`}>
      {/* ✅ Progress Bar في أعلى الشاشة */}
      <ProgressBar 
        isLoading={imagesLoading && totalImagesRef.current > 0} 
        progress={imageProgress}
      />
      <div className="grid pt-1 grid-cols-1 lg:grid-cols-5">
        {/* Sidebar */}
        <div className="hidden lg:block lg:col-span-1 bg-black h-auto">
          <Sidebar
            categories={categoriesWithProducts}
            onSelectBrand={(brandName) => {
              // 🔹 عند اختيار براند من الـ sidebar، نضيفه لـ selectedBrand و selectedAttributes["Brand"]
              if (brandName) {
                // تحديث selectedBrand أولاً
                setSelectedBrand(brandName);
                // إضافة البراند إلى selectedAttributes["Brand"] لإظهاره في FilterDropdown
                const newAttributes = {
                  ...selectedAttributes,
                  Brand: [brandName],
                };
                
                if (process.env.NODE_ENV === 'development') {
                  console.log('🔹 GoalkeeperClientPage: Setting brand from sidebar:', brandName);
                  console.log('🔹 GoalkeeperClientPage: New attributes:', newAttributes);
                }
                
                setSelectedAttributes(newAttributes);
                // تحديث الـ URL باستخدام buildParentPageUrl مع selectedAttributes الجديدة
                const newUrl = buildParentPageUrl(
                  "/GoalkeeperGloves",
                  newAttributes,
                  brandName
                );
                if (newUrl && typeof window !== "undefined") {
                  // 🔹 استخدام window.history.replaceState بدلاً من router.replace لمنع refresh
                  window.history.replaceState(
                    { ...window.history.state, as: newUrl, url: newUrl },
                    '',
                    newUrl
                  );
                }
              } else {
                // إلغاء التحديد
                setSelectedBrand(null);
                const { Brand, ...otherAttrs } = selectedAttributes;
                
                if (process.env.NODE_ENV === 'development') {
                  console.log('🔹 GoalkeeperClientPage: Clearing brand from sidebar');
                  console.log('🔹 GoalkeeperClientPage: Remaining attributes:', otherAttrs);
                }
                
                setSelectedAttributes(otherAttrs);
                // تحديث الـ URL
                const newUrl = buildParentPageUrl(
                  "/GoalkeeperGloves",
                  otherAttrs,
                  null
                );
                if (newUrl && typeof window !== "undefined") {
                  // 🔹 استخدام window.history.replaceState بدلاً من router.replace لمنع refresh
                  window.history.replaceState(
                    { ...window.history.state, as: newUrl, url: newUrl },
                    '',
                    newUrl
                  );
                }
              }
            }}
            onSelectCategory={(catId) => {
              // 🔹 استخدام جميع الـ categories للبحث (وليس فقط categoriesWithProducts)
              // هذا يسمح بالتنقل إلى subCategories من صفحات أخرى
              const selectedCat = categories.find((c) => {
                return String(c.id) === String(catId) || c.id === catId;
              });
              
              if (selectedCat) {
              if (catId === selectedCategoryId) {
                  // إذا تم الضغط على نفس الكاتيجوري، إلغاء التحديد
                setSelectedCategoryId(null);
                setSelectedCategoryName(null);
                  // 🔹 استخدام router.replace بدلاً من router.push
                  router.replace('/GoalkeeperGloves', { scroll: false });
                } else {
                  // تحديث الـ state أولاً
                  setSelectedCategoryId(catId);
                  
                  // 🔹 Navigate using buildPathSegmentUrl with current filters
                  const newUrl = buildPathSegmentUrl(
                    selectedCat.slug,
                    selectedAttributes, // 🔹 الحفاظ على الفلاتر الحالية
                    selectedBrand // 🔹 الحفاظ على البراند الحالي
                  );
                  // Only navigate if newUrl is valid (not null)
                  if (newUrl) {
                    // 🔹 استخدام router.replace بدلاً من router.push
                    router.replace(newUrl, { scroll: false });
                  }
                }
              } else {
                console.warn("⚠️ Category not found for ID:", catId);
              }
            }}
            isRTL={isRTL}
          />
        </div>

        {/* Products Section */}
        <div className="md:col-span-4 p-4 bg-white">
          {/* 🟢 عرض صورة rootCategory فوق المنتجات */}

          <h1 className="text-4xl text-[#1f2323] p-2">
            {selectedCategoryName ? <DynamicText>{selectedCategoryName}</DynamicText> : t("Goalkeeper Gloves")}
          </h1>
          
          {rootCategory?.image && (
            <div className="w-full mb-4">
              <img 
                src={getImageUrl(rootCategory.image)}
                alt={rootCategory?.name || "Category Banner"}
                className="w-full h-auto object-cover"
              />
            </div>
          )}

       

{!selectedCategoryId && !selectedBrand && brands && brands.length > 0 && (
            <BrandsSlider
              brands={brands}
              selectedBrand={selectedBrand}
              onBrandChange={handleBrandChange}
            />
          )}

          <div className="flex mb-4 gap-3 flex-wrap">
            <FilterDropdown
              attributeValues={attributeValues}
              onFilterChange={handleAttributesChange}
              initialFilters={memoizedInitialFilters}
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
                    if (e.target.closest(".product-image-click")) return;
                    if (e.target.closest(".product-swiper-container")) {
                      e.preventDefault();
                      e.stopPropagation();
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
                      images={product.images} 
                      productName={product.name}
                      onImageLoad={() => handleImageLoad(product.id || product.sku)}
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