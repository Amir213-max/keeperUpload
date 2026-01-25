"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  parsePathSegments,
  parseBrandFromPathSegments,
  buildPathSegmentUrl,
  buildParentPageUrl,
  fromSlug,
  attributeNameToSlug,
} from "../lib/urlSlugHelper";

/**
 * Unified hook for managing product filters and URL synchronization
 * 
 * This hook handles:
 * - Reading brand and attributes from URL path segments
 * - Updating URL when filters change
 * - Preventing infinite loops
 * - Handling page refresh and browser navigation
 * - Supporting both /products/[category] and parent page routes
 * 
 * @param {Object} options - Configuration options
 * @param {Array} options.brands - Array of brand objects
 * @param {Array} options.attributeValues - Array of attribute value objects
 * @param {Array} options.categoriesWithProducts - Array of categories
 * @param {string} options.basePath - Base path for parent pages (e.g., "/FootballBoots")
 * @param {Function} options.setSelectedCategoryId - Function to set selected category ID
 * @param {string|null} options.selectedCategoryId - Currently selected category ID
 * @param {boolean} options.disableUrlUpdates - If true, hook won't update URLs (useful when page handles its own URL updates)
 * @returns {Object} Filter state and handlers
 */
export function useProductFilters({
  brands = [],
  attributeValues = [],
  categoriesWithProducts = [],
  basePath = null,
  setSelectedCategoryId = () => {},
  selectedCategoryId = null,
  disableUrlUpdates = false,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // 🔹 استخدام window.location.pathname على initial load لضمان الحصول على URL الصحيح
  const initialPathname = typeof window !== "undefined" ? window.location.pathname : pathname;
  
  // Track the last pathname that we updated via router.replace
  const lastUpdatedPathnameRef = useRef(null); // 🔹 null في البداية لأننا لم نقم بأي تحديث بعد

  // Filter state
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [selectedCategorySlug, setSelectedCategorySlug] = useState(null);

  // Refs to prevent infinite loops
  const isUpdatingUrlRef = useRef(false);
  const isInitialLoadRef = useRef(true);
  const lastUrlRef = useRef(null);
  const userInitiatedChangeRef = useRef(false);
  const lastPathnameRef = useRef(initialPathname); // 🔹 استخدام initialPathname بدلاً من pathname
  const selectedBrandRef = useRef(selectedBrand);
  const selectedAttributesRef = useRef(selectedAttributes);
  const hasParsedInitialUrlRef = useRef(false); // Track if we've parsed URL on initial load
  const dataReadyRef = useRef(false); // Track if brands/attributes are loaded
  const brandsRef = useRef(brands); // Store brands to avoid re-parsing on data changes
  const attributeValuesRef = useRef(attributeValues); // Store attributeValues to avoid re-parsing on data changes

  // Determine if we're on a /products/ route
  const isProductsRoute = pathname?.startsWith("/products/");

  // Get base path from current pathname if not provided
  const effectiveBasePath = basePath || (isProductsRoute ? null : pathname?.split("/").filter(Boolean)[0] ? `/${pathname.split("/").filter(Boolean)[0]}` : null);

  // Update refs when state changes
  useEffect(() => {
    selectedBrandRef.current = selectedBrand;
    selectedAttributesRef.current = selectedAttributes;
  }, [selectedBrand, selectedAttributes]);

  // Track when data is ready and update refs
  useEffect(() => {
    if (brands.length > 0 || attributeValues.length > 0) {
      dataReadyRef.current = true;
    }
    // Update refs when data changes (but don't trigger re-parsing)
    brandsRef.current = brands;
    attributeValuesRef.current = attributeValues;
  }, [brands, attributeValues]);

  // Update selectedCategorySlug when selectedCategoryId changes
  useEffect(() => {
    if (selectedCategoryId && categoriesWithProducts.length > 0) {
      const cat = categoriesWithProducts.find((c) => c.id === selectedCategoryId);
      setSelectedCategorySlug(cat?.slug || null);
    } else {
      setSelectedCategorySlug(null);
    }
  }, [selectedCategoryId, categoriesWithProducts]);

  // Parse URL and update filters - ONLY on initial load or browser navigation
  useEffect(() => {
    // Never parse if URL is being updated by user action
    if (isUpdatingUrlRef.current) return;
    if (userInitiatedChangeRef.current) return;

    // 🔹 استخدام window.location.pathname بدلاً من pathname من usePathname
    // لأن window.history.replaceState لا يحدث pathname من usePathname تلقائياً
    const currentPathname = typeof window !== "undefined" ? window.location.pathname : pathname;
    
    // 🔹 على initial load، lastPathnameRef قد يكون مختلفاً عن currentPathname
    // لذلك نحتاج للتحقق من أن هذا ليس initial load
    const pathnameChanged = lastPathnameRef.current !== currentPathname;
    
    // 🔹 على initial load، لا نعتبر هذا تحديثنا
    const isOurUpdate = !isInitialLoadRef.current && (
      lastUpdatedPathnameRef.current === currentPathname || 
      lastPathnameRef.current === currentPathname
    );
    
    const isBrowserNavigation = pathnameChanged && !userInitiatedChangeRef.current && !isOurUpdate;
    
    // On initial load: parse once when data is ready
    if (isInitialLoadRef.current) {
      // Wait for data to be ready before parsing
      // لكن إذا كان هناك path segments في URL، نحاول parsing حتى لو البيانات غير جاهزة بعد
      const hasPathSegments = currentPathname.split("/").filter((p) => p).length > (effectiveBasePath ? effectiveBasePath.split("/").filter((p) => p).length : 0);
      if (!dataReadyRef.current && !hasPathSegments) {
        // إذا لم تكن هناك path segments، انتظر البيانات
        return;
      }
      if (hasParsedInitialUrlRef.current && dataReadyRef.current) {
        // إذا تم parsing بالفعل والبيانات جاهزة، لا تعيد parsing
        return;
      }
    } else if (!isBrowserNavigation) {
      // After initial load, only parse on browser navigation
      return;
    }

    // Store whether this is browser navigation for use in timeout
    const isBrowserNav = isBrowserNavigation;
    const isInitial = isInitialLoadRef.current;

    // Update lastPathnameRef AFTER determining we should parse
    // 🔹 على initial load، نحدث lastPathnameRef دائماً
    if (pathnameChanged || isInitial) {
      // 🔹 على initial load، نحدث lastPathnameRef مباشرة
      if (isInitial) {
        lastPathnameRef.current = currentPathname;
        lastUpdatedPathnameRef.current = null; // 🔹 null لأننا لم نقم بأي تحديث بعد
      } else if (!isOurUpdate) {
        // على browser navigation، نحدث فقط إذا لم يكن تحديثنا
        lastPathnameRef.current = currentPathname;
        // Reset our update tracking when pathname changes from browser
        if (isBrowserNav) {
          lastUpdatedPathnameRef.current = null;
        }
      }
    }

    const timeoutId = setTimeout(() => {
      // 🔹 تحقق مرة أخرى قبل parsing
      if (isUpdatingUrlRef.current) return;
      if (userInitiatedChangeRef.current) return;
      
      const currentPathname = typeof window !== "undefined" ? window.location.pathname : pathname;
      if (!currentPathname) return;
      
      // 🔹 تحقق مرة أخرى من أن هذا ليس تحديثنا
      // 🔹 على initial load، لا نعتبر هذا تحديثنا
      const isStillOurUpdate = !isInitial && (
        lastUpdatedPathnameRef.current === currentPathname || 
        lastPathnameRef.current === currentPathname
      );
      if (isStillOurUpdate) {
        return; // 🔹 لا تقم بالتحليل إذا كان هذا تحديثنا
      }

      let pathSegments = [];
      let categorySlug = null;

      if (isProductsRoute) {
        // Parse /products/[category-slug]/[filters]
        const pathWithoutBase = currentPathname.replace("/products/", "").split("?")[0];
        const parts = pathWithoutBase.split("/").filter((p) => p);
        
        if (parts.length > 0) {
          categorySlug = decodeURIComponent(parts[0]);
          pathSegments = parts.slice(1);
        }

        // Update category if slug found
        const shouldParse = isInitial || isBrowserNav;
        if (categorySlug && categoriesWithProducts.length > 0 && shouldParse) {
          const foundCategory = categoriesWithProducts.find(
            (cat) => cat.slug === categorySlug
          );
          if (foundCategory) {
            // Set category ID if different
            if (foundCategory.id !== selectedCategoryId) {
              setSelectedCategoryId(foundCategory.id);
            }
            // Also set category slug directly to ensure URL updates work correctly
            if (foundCategory.slug !== selectedCategorySlug) {
              setSelectedCategorySlug(foundCategory.slug);
            }
          }
        } else if (!categorySlug && selectedCategoryId && shouldParse) {
          // Clear category only if URL is base page
          setSelectedCategoryId(null);
          setSelectedCategorySlug(null);
        }
      } else {
        // Parse parent page route: /[category]/[brand]/[filters]
        const pathParts = currentPathname.split("/").filter((p) => p);
        // Skip first part (category), get remaining segments
        if (pathParts.length > 1) {
          pathSegments = pathParts.slice(1);
        }
      }

      // 🔹 Parse from path segments for parent pages (shareable URLs without ? or =)
      const shouldParse = isInitial || isBrowserNav;
      
      // Use refs to avoid re-parsing when data changes
      const currentBrands = brandsRef.current;
      const currentAttributeValues = attributeValuesRef.current;
      
      // Skip parsing if data is not ready yet - but don't clear existing filters
      // على initial load، نحاول parsing حتى لو البيانات غير جاهزة بعد
      // لأن البيانات قد تأتي بعد قليل، وسنعيد parsing عند وصولها
      if (!isInitial && (currentBrands.length === 0 || currentAttributeValues.length === 0)) {
        // على browser navigation، إذا لم تكن البيانات جاهزة، لا تقم بالparsing
        return;
      }
      // على initial load، نحاول parsing حتى لو البيانات غير جاهزة
      // لأن URL قد يحتوي على فلاتر مهمة يجب تطبيقها
      
      // 🔹 على initial load، نمنع updateUrlFromState من التحديث
      // لأن URL الحالي هو الصحيح ولا نريد تغييره
      if (isInitial) {
        isUpdatingUrlRef.current = true;
        setTimeout(() => {
          isUpdatingUrlRef.current = false;
        }, 1000); // 🔹 منع التحديث لمدة ثانية واحدة على initial load
      }
      
      // Parse brand from path segments
      if (pathSegments.length > 0 && shouldParse) {
        const parsedBrand = parseBrandFromPathSegments(pathSegments, currentBrands, currentAttributeValues);
        if (parsedBrand && parsedBrand !== selectedBrandRef.current) {
          setSelectedBrand(parsedBrand);
        } else if (!parsedBrand && selectedBrandRef.current && pathSegments.length > 0) {
          // If URL has segments but brand not found:
          // - Could be attributes only (keep brand)
          // - Could be data not ready yet (keep brand)
          // - Only clear if we're sure it's not a brand (after data is loaded)
          // For now, keep existing brand to prevent flickering
        }
      } else if (pathSegments.length === 0 && selectedBrandRef.current && shouldParse) {
        // Only clear brand if URL is truly base page (no segments at all) AND it's explicit browser navigation
        // Never clear on initial load if we're coming from a filtered URL
        if (isBrowserNav && !isInitial) {
          const pathParts = currentPathname.split("/").filter((p) => p);
          const basePathParts = effectiveBasePath ? effectiveBasePath.split("/").filter((p) => p) : [];
          if (pathParts.length <= basePathParts.length) {
            setSelectedBrand(null);
          }
        }
      }

      // Fallback: check query params for brand (backward compatibility)
      if (!selectedBrandRef.current && shouldParse && searchParams) {
        const brandSlug = searchParams.get("brand");
        if (brandSlug) {
          const brandName = fromSlug(brandSlug);
          if (brandName !== selectedBrandRef.current) {
            setSelectedBrand(brandName);
          }
        }
      }

      // Parse attributes from path segments
      if (pathSegments.length > 0 && shouldParse) {
        const parsedAttrs = parsePathSegments(pathSegments, currentAttributeValues, currentBrands);
        if (parsedAttrs && Object.keys(parsedAttrs).length > 0) {
          const currentAttrsStr = JSON.stringify(selectedAttributesRef.current);
          const newAttrsStr = JSON.stringify(parsedAttrs);
          if (currentAttrsStr !== newAttrsStr) {
            setSelectedAttributes(parsedAttrs);
          }
        } else if (Object.keys(selectedAttributesRef.current).length > 0 && pathSegments.length > 0) {
          // If URL has segments but no attributes parsed:
          // - Could be brand only (keep attributes)
          // - Could be data not ready yet (keep attributes)
          // Keep existing attributes to prevent flickering
        }
      } else if (pathSegments.length === 0 && Object.keys(selectedAttributesRef.current).length > 0 && shouldParse) {
        // Only clear attributes if URL is truly base page (no segments at all) AND it's explicit browser navigation
        // Never clear on initial load if we're coming from a filtered URL
        if (isBrowserNav && !isInitial) {
          const pathParts = currentPathname.split("/").filter((p) => p);
          const basePathParts = effectiveBasePath ? effectiveBasePath.split("/").filter((p) => p) : [];
          if (pathParts.length <= basePathParts.length) {
            setSelectedAttributes({});
          }
        }
      }

      // Mark initial load as complete after first parse
      if (isInitial) {
        hasParsedInitialUrlRef.current = true;
        // 🔹 تأخير تعيين isInitialLoadRef.current = false لضمان عدم تحديث URL
        setTimeout(() => {
          isInitialLoadRef.current = false;
        }, 1500); // 🔹 تأخير 1.5 ثانية لضمان عدم تحديث URL على initial load
      }
    }, isInitial ? 200 : 100); // 🔹 زيادة timeout على initial load لضمان parsing صحيح

    return () => clearTimeout(timeoutId);
  }, [
    pathname, // Only pathname triggers parsing (browser navigation)
    searchParams, // Search params can change from browser navigation
    // Note: brands and attributeValues are NOT in dependencies to prevent re-parsing on data changes
    // They are stored in refs and used from there
    categoriesWithProducts, // Needed for parsing category from URL
    selectedCategoryId, // Needed for category comparison
    effectiveBasePath, // Needed for base path comparison
    isProductsRoute,
    setSelectedCategoryId,
  ]);

  // 🔹 إضافة listener لـ popstate للتعامل مع back/forward buttons
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      // عند الضغط على back/forward، Next.js يقوم بتحديث pathname
      // نحتاج إلى إعادة تحليل URL
      const currentPath = window.location.pathname;
      if (currentPath !== lastPathnameRef.current) {
        lastPathnameRef.current = currentPath;
        lastUpdatedPathnameRef.current = null; // Reset لأن هذا browser navigation
        userInitiatedChangeRef.current = false; // Reset لأن هذا browser navigation
        isUpdatingUrlRef.current = false; // Reset
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 🔹 إزالة useEffect لتحديث URL - تحديث URL مباشرة في handlers فقط
  // 🔹 هذا يمنع إعادة التشغيل التلقائي للـ URL update

  // Helper function to update URL immediately
  const updateUrlFromState = useCallback(() => {
    if (disableUrlUpdates) return;
    if (isUpdatingUrlRef.current) return;
    
    // 🔹 على initial load، لا نقوم بتحديث URL لأن URL الحالي هو الصحيح
    if (isInitialLoadRef.current) {
      return;
    }

    const currentBrand = selectedBrandRef.current;
    const currentAttributes = selectedAttributesRef.current;

    let newUrl = null;

    if (selectedCategorySlug) {
      newUrl = buildPathSegmentUrl(
        selectedCategorySlug,
        currentAttributes,
        currentBrand
      );
    } else if (effectiveBasePath) {
      newUrl = buildParentPageUrl(
        effectiveBasePath,
        currentAttributes,
        currentBrand
      );
    }

    if (!newUrl) return;

    const currentPathname = typeof window !== "undefined" ? window.location.pathname : pathname;
    const currentPathnameOnly = currentPathname.split("?")[0];
    const newPathnameOnly = newUrl.split("?")[0];

    const currentPathNormalized = currentPathnameOnly.toLowerCase();
    const newPathNormalized = newPathnameOnly.toLowerCase();
    
    // 🔹 استخدام path segments للصفحات الأساسية (shareable URLs بدون ? أو =)
    if (currentPathNormalized !== newPathNormalized && newUrl !== "/products") {
      // 🔹 استخدام window.history.replaceState لتحديث URL بدون إعادة تحميل الصفحة
      // هذا يمنع Next.js من إعادة تحميل الصفحة عند تغيير URL
      if (typeof window !== "undefined") {
        isUpdatingUrlRef.current = true;
        lastUpdatedPathnameRef.current = newPathnameOnly;
        lastPathnameRef.current = newPathnameOnly; // 🔹 تحديث lastPathnameRef أيضاً
        
        // 🔹 تحديث URL باستخدام window.history.replaceState (بدون إعادة تحميل)
        window.history.replaceState(
          { ...window.history.state, as: newPathnameOnly, url: newPathnameOnly },
          '',
          newUrl
        );
        
        // 🔹 تحديث pathname refs يدوياً لأن Next.js router لن يحدثها تلقائياً
        // لكن لا نستخدم router.replace لأنها تسبب إعادة تحميل
        
        // 🔹 إعادة تعيين isUpdatingUrlRef بسرعة لتسريع التحديثات التالية
        // لكن نترك وقت كافي للـ deeplinking للعمل بشكل صحيح
        setTimeout(() => {
          isUpdatingUrlRef.current = false;
          const hasActiveFilters = currentBrand || Object.keys(currentAttributes).length > 0 || selectedCategoryId;
          if (hasActiveFilters) {
            // 🔹 إبقاء userInitiatedChangeRef = true عندما يكون هناك فلاتر نشطة
            userInitiatedChangeRef.current = true;
            // 🔹 إعادة تعيينه إلى false بعد فترة أطول (5 ثواني بدلاً من 2 ثانية)
            setTimeout(() => {
              // فقط إذا لم يكن هناك فلاتر نشطة
              if (!currentBrand && Object.keys(currentAttributes).length === 0 && !selectedCategoryId) {
                userInitiatedChangeRef.current = false;
              }
            }, 5000);
          } else {
            setTimeout(() => {
              userInitiatedChangeRef.current = false;
            }, 500);
          }
        }, 100); // 🔹 timeout 100ms للتوازن بين السرعة والـ deeplinking
      }
    }
  }, [disableUrlUpdates, selectedCategorySlug, effectiveBasePath, router, pathname, selectedCategoryId]);

  // Handlers
  const handleBrandChange = useCallback((brand) => {
    if (!setSelectedBrand) {
      console.warn('⚠️ setSelectedBrand is not defined');
      return;
    }
    const newBrand = brand === selectedBrandRef.current ? null : brand;
    userInitiatedChangeRef.current = true; // 🔹 علامة أن المستخدم قام بالتغيير
    isInitialLoadRef.current = false; // 🔹 إلغاء التحميل الأولي عند تغيير المستخدم
    setSelectedBrand(newBrand);
    
    // 🔹 تحديث refs فوراً قبل تحديث URL
    selectedBrandRef.current = newBrand;
    
    // 🔹 استخدام requestAnimationFrame لتحديث URL بسرعة مع الحفاظ على deeplinking
    requestAnimationFrame(() => {
      updateUrlFromState();
    });
  }, [setSelectedBrand, updateUrlFromState]);

  const handleAttributesChange = useCallback((attributes) => {
    if (!setSelectedAttributes) {
      console.warn('⚠️ setSelectedAttributes is not defined');
      return;
    }
    userInitiatedChangeRef.current = true; // 🔹 علامة أن المستخدم قام بالتغيير
    isInitialLoadRef.current = false; // 🔹 إلغاء التحميل الأولي عند تغيير المستخدم
    setSelectedAttributes(attributes);
    
    // 🔹 تحديث refs فوراً قبل تحديث URL
    selectedAttributesRef.current = attributes;
    
    // 🔹 استخدام requestAnimationFrame لتحديث URL بسرعة مع الحفاظ على deeplinking
    requestAnimationFrame(() => {
      updateUrlFromState();
    });
  }, [setSelectedAttributes, updateUrlFromState]);

  return {
    selectedBrand,
    selectedAttributes,
    selectedCategorySlug,
    setSelectedBrand,
    setSelectedAttributes,
    handleBrandChange: handleBrandChange || (() => {}), // 🔹 قيمة افتراضية
    handleAttributesChange: handleAttributesChange || (() => {}), // 🔹 قيمة افتراضية
  };
}
