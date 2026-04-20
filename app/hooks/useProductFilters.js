"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  parsePathSegments,
  parseBrandFromPathSegments,
  buildPathSegmentUrl,
  buildParentPageUrl,
  fromSlug,
  toSlug,
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
  const isHydratingFromUrlRef = useRef(true); // Prevent non-user URL rewrites during deep-link hydration
  const dataReadyRef = useRef(false); // Track if brands/attributes are loaded
  const brandsRef = useRef(brands); // Store brands to avoid re-parsing on data changes
  const attributeValuesRef = useRef(attributeValues); // Store attributeValues to avoid re-parsing on data changes
  const hasRetriedParsingRef = useRef(false); // Track if we've already retried parsing after data became ready

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
    const wasDataReady = dataReadyRef.current;
    if (brands.length > 0 || attributeValues.length > 0) {
      dataReadyRef.current = true;
    }
    // Update refs when data changes (but don't trigger re-parsing)
    brandsRef.current = brands;
    attributeValuesRef.current = attributeValues;
    
    // 🔹 Retry mechanism: إذا كانت البيانات غير جاهزة في البداية ووصلت الآن
    // وأصبحت جاهزة، نحاول parsing مرة أخرى للـ URL
    // لكن فقط مرة واحدة لمنع infinite loop
    // 🔹 أيضاً: إذا كان URL يحتوي على filters لكن لم يتم تطبيقها بعد
    if (!wasDataReady && dataReadyRef.current && isInitialLoadRef.current && !hasRetriedParsingRef.current) {
      // Mark as retried immediately to prevent infinite loop
      hasRetriedParsingRef.current = true;
      
      // البيانات أصبحت جاهزة بعد initial load، نحاول parsing مرة أخرى
      const currentPathname = typeof window !== "undefined" ? window.location.pathname : pathname;
      if (currentPathname) {
        // Check if there are path segments that need parsing
        const isProductsRouteCheck = currentPathname.startsWith("/products/");
        let pathSegments = [];
        
        if (isProductsRouteCheck) {
          const pathWithoutBase = currentPathname.replace("/products/", "").split("?")[0];
          const parts = pathWithoutBase.split("/").filter((p) => p);
          if (parts.length > 1) {
            pathSegments = parts.slice(1);
          }
        } else if (effectiveBasePath) {
          const pathParts = currentPathname.split("/").filter((p) => p);
          const basePathParts = effectiveBasePath.split("/").filter((p) => p);
          if (pathParts.length > basePathParts.length) {
            pathSegments = pathParts.slice(basePathParts.length);
          }
        }
        
        // 🔹 إذا كان هناك path segments لكن الفلاتر لم تُطبق بعد، نحاول parsing مرة أخرى
        const hasNoFilters = !selectedBrandRef.current && Object.keys(selectedAttributesRef.current).length === 0;
        if (pathSegments.length > 0 && brands.length > 0 && attributeValues.length > 0 && hasNoFilters) {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔹 useProductFilters: Retrying parsing with now-ready data:', pathSegments);
          }
          
          // Parse brand
          const parsedBrand = parseBrandFromPathSegments(pathSegments, brands, attributeValues);
          if (parsedBrand && parsedBrand !== selectedBrandRef.current) {
            if (process.env.NODE_ENV === 'development') {
              console.log('🔹 useProductFilters: Retry - Parsing brand:', parsedBrand);
            }
            setSelectedBrand(parsedBrand);
          }
          
          // Parse attributes
          const parsedAttrs = parsePathSegments(pathSegments, attributeValues, brands);
          if (parsedAttrs && Object.keys(parsedAttrs).length > 0) {
            const currentAttrsStr = JSON.stringify(selectedAttributesRef.current);
            const newAttrsStr = JSON.stringify(parsedAttrs);
            if (currentAttrsStr !== newAttrsStr) {
              if (process.env.NODE_ENV === 'development') {
                console.log('🔹 useProductFilters: Retry - Parsing attributes:', parsedAttrs);
              }
              setSelectedAttributes(parsedAttrs);
            }
          }
        }
      }
    }
  }, [brands, attributeValues, pathname, effectiveBasePath]);

  // Update selectedCategorySlug when selectedCategoryId changes
  // 🔹 منع تحديث selectedCategorySlug على initial load إذا كان URL يحتوي على category slug
  useEffect(() => {
    // 🔹 على initial load، لا نقوم بتحديث selectedCategorySlug إذا كان URL يحتوي على category slug
    // لأن هذا قد يسبب refresh تلقائي
    if (isInitialLoadRef.current) {
      // 🔹 التحقق من أن URL يحتوي على category slug
      const currentPathname = typeof window !== "undefined" ? window.location.pathname : pathname;
      if (currentPathname && currentPathname.startsWith('/products/')) {
        const pathWithoutBase = currentPathname.replace('/products/', '').split('?')[0];
        const parts = pathWithoutBase.split('/').filter((p) => p);
        if (parts.length > 0) {
          // هناك category slug في URL، لا نقوم بتحديث selectedCategorySlug
          return;
        }
      }
    }
    
    if (selectedCategoryId && categoriesWithProducts.length > 0) {
      const cat = categoriesWithProducts.find((c) => c.id === selectedCategoryId);
      setSelectedCategorySlug(cat?.slug || null);
    } else {
      setSelectedCategorySlug(null);
    }
  }, [selectedCategoryId, categoriesWithProducts, isInitialLoadRef, pathname]);

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
      // 🔹 على initial load، نحاول parsing حتى لو البيانات غير جاهزة
      // لأن URL قد يحتوي على فلاتر مهمة يجب تطبيقها فوراً
      // إذا كانت البيانات غير جاهزة، سنحاول parsing مرة أخرى عند وصولها (retry mechanism)
      
      // 🔹 حساب hasPathSegments بشكل صحيح للصفحات الرئيسية والفرعية
      let hasPathSegments = false;
      if (isProductsRoute) {
        // للصفحات الفرعية: /products/[category]/[filters]
        const pathWithoutBase = currentPathname.replace("/products/", "").split("?")[0];
        const parts = pathWithoutBase.split("/").filter((p) => p);
        // إذا كان هناك أكثر من جزء (category + filters)، فهناك filters
        hasPathSegments = parts.length > 1;
      } else if (effectiveBasePath) {
        // للصفحات الرئيسية: /[basePath]/[filters]
        const pathParts = currentPathname.split("/").filter((p) => p);
        const basePathParts = effectiveBasePath.split("/").filter((p) => p);
        hasPathSegments = pathParts.length > basePathParts.length;
      } else {
        // Fallback: حساب عادي
        hasPathSegments = currentPathname.split("/").filter((p) => p).length > 0;
      }
      
      // 🔹 إذا كان URL يحتوي على فلاتر ولم يتم parsing بعد، نسمح بالparsing
      // حتى لو البيانات غير جاهزة بعد (سيتم retry عند وصولها)
      if (hasPathSegments && !hasParsedInitialUrlRef.current) {
        // نسمح بالparsing حتى لو البيانات غير جاهزة
        if (process.env.NODE_ENV === 'development') {
          console.log('🔹 useProductFilters: URL has path segments, allowing parsing even if data not ready');
        }
      } else if (!hasPathSegments && !dataReadyRef.current) {
        // إذا لم تكن هناك path segments، انتظر البيانات
        return;
      } else if (hasParsedInitialUrlRef.current && dataReadyRef.current) {
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
        // على initial load، نحاول parsing حتى لو categoriesWithProducts غير جاهزة
        // لأن البيانات قد تأتي بعد قليل، وسنعيد parsing عند وصولها
        if (categorySlug && shouldParse) {
          if (categoriesWithProducts.length > 0) {
            const foundCategory = categoriesWithProducts.find(
              (cat) => cat.slug === categorySlug
            );
            if (foundCategory) {
              // Set category ID if different
              if (foundCategory.id !== selectedCategoryId) {
                setSelectedCategoryId(foundCategory.id);
              }
              // Also set category slug directly to ensure URL updates work correctly
              // 🔹 على initial load، لا نقوم بتحديث selectedCategorySlug إذا كان URL يحتوي على category slug
              // لأن هذا قد يسبب refresh تلقائي
              if (!isInitial || foundCategory.slug !== selectedCategorySlug) {
                if (foundCategory.slug !== selectedCategorySlug) {
                  setSelectedCategorySlug(foundCategory.slug);
                }
              }
            }
          } else if (isInitial) {
            // على initial load، إذا كانت categoriesWithProducts غير جاهزة، نحفظ categorySlug للـ retry
            // سيتم parsing مرة أخرى عند وصول categoriesWithProducts
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
      // خاصة للصفحات الفرعية (/products/[slug]/[...filters])
      // 🔹 على initial load، نحاول parsing حتى لو البيانات غير جاهزة
      // لأن URL قد يحتوي على فلاتر مهمة يجب تطبيقها
      // إذا كانت البيانات غير جاهزة، سنحاول parsing مرة أخرى عند وصولها (retry mechanism)
      if (!isInitial && (currentBrands.length === 0 || currentAttributeValues.length === 0)) {
        // على browser navigation، إذا لم تكن البيانات جاهزة، لا تقم بالparsing
        return;
      }
      // على initial load، نحاول parsing حتى لو البيانات غير جاهزة
      // لكن إذا كانت البيانات غير جاهزة، نحفظ pathSegments للـ retry لاحقاً
      
      // 🔹 Parse brand from path segments FIRST
      if (pathSegments.length > 0 && shouldParse) {
        const parsedBrand = parseBrandFromPathSegments(pathSegments, currentBrands, currentAttributeValues);
        if (parsedBrand && parsedBrand !== selectedBrandRef.current) {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔹 useProductFilters: Parsing brand from URL:', parsedBrand);
          }
          setSelectedBrand(parsedBrand);
        } else if (!parsedBrand && selectedBrandRef.current && pathSegments.length > 0) {
          // If URL has segments but brand not found:
          // - Could be attributes only (keep brand)
          // - Could be data not ready yet (keep brand)
          // - Only clear if we're sure it's not a brand (after data is loaded)
          // For now, keep existing brand to prevent flickering
          if (process.env.NODE_ENV === 'development') {
            console.log('🔹 useProductFilters: Brand not found in path segments, keeping existing brand');
          }
        }
      } else if (pathSegments.length === 0 && selectedBrandRef.current && shouldParse) {
        // 🔹 على initial load، لا نمسح الفلاتر الموجودة
        // لأنها قد تكون من initialFilters من server component
        // Only clear brand if URL is truly base page (no segments at all) AND it's explicit browser navigation
        // Never clear on initial load if we're coming from a filtered URL
        if (isBrowserNav && !isInitial) {
          const pathParts = currentPathname.split("/").filter((p) => p);
          const basePathParts = effectiveBasePath ? effectiveBasePath.split("/").filter((p) => p) : [];
          if (pathParts.length <= basePathParts.length) {
            if (process.env.NODE_ENV === 'development') {
              console.log('🔹 useProductFilters: Clearing brand (browser navigation to base page)');
            }
            setSelectedBrand(null);
          }
        } else if (isInitial) {
          // 🔹 على initial load، لا نمسح الفلاتر الموجودة
          if (process.env.NODE_ENV === 'development') {
            console.log('🔹 useProductFilters: Keeping existing brand on initial load (may be from initialFilters)');
          }
        }
      }

      // Fallback: check query params for brand (backward compatibility)
      if (!selectedBrandRef.current && shouldParse && searchParams) {
        const brandSlug = searchParams.get("brand");
        if (brandSlug) {
          const decoded = decodeURIComponent(String(brandSlug).trim());
          const target = toSlug(decoded).toLowerCase();
          let resolved = null;
          for (const b of currentBrands) {
            const name =
              typeof b === "string" ? b : b?.brand_name ?? b?.name ?? null;
            if (!name) continue;
            if (toSlug(String(name)).toLowerCase() === target) {
              resolved = String(name);
              break;
            }
          }
          const brandName = resolved || fromSlug(decoded);
          if (brandName !== selectedBrandRef.current) {
            setSelectedBrand(brandName);
          }
        }
      }

      // Parse attributes from path segments
      let parsedAttrs = {};
      if (pathSegments.length > 0 && shouldParse) {
        parsedAttrs = parsePathSegments(pathSegments, currentAttributeValues, currentBrands);
        if (parsedAttrs && Object.keys(parsedAttrs).length > 0) {
          const currentAttrsStr = JSON.stringify(selectedAttributesRef.current);
          const newAttrsStr = JSON.stringify(parsedAttrs);
          if (currentAttrsStr !== newAttrsStr) {
            if (process.env.NODE_ENV === 'development') {
              console.log('🔹 Parsing attributes from URL:', parsedAttrs);
            }
            setSelectedAttributes(parsedAttrs);
          }
        } else if (Object.keys(selectedAttributesRef.current).length > 0 && pathSegments.length > 0) {
          // If URL has segments but no attributes parsed:
          // - Could be brand only (keep attributes)
          // - Could be data not ready yet (keep attributes)
          // Keep existing attributes to prevent flickering
          if (process.env.NODE_ENV === 'development') {
            console.log('🔹 Attributes not found in path segments, keeping existing attributes');
          }
        } else if (pathSegments.length > 0 && Object.keys(parsedAttrs || {}).length === 0) {
          // 🔹 إذا كان هناك path segments لكن لم يتم parsing أي attributes
          // قد تكون البيانات غير جاهزة بعد، سنحاول parsing مرة أخرى عند وصولها
          if (process.env.NODE_ENV === 'development') {
            console.log('🔹 Path segments found but no attributes parsed - data may not be ready yet:', pathSegments);
          }
        }
      } else if (pathSegments.length === 0 && Object.keys(selectedAttributesRef.current).length > 0 && shouldParse) {
        // 🔹 على initial load، لا نمسح الفلاتر الموجودة
        // لأنها قد تكون من initialFilters من server component
        // Only clear attributes if URL is truly base page (no segments at all) AND it's explicit browser navigation
        // Never clear on initial load if we're coming from a filtered URL
        if (isBrowserNav && !isInitial) {
          const pathParts = currentPathname.split("/").filter((p) => p);
          const basePathParts = effectiveBasePath ? effectiveBasePath.split("/").filter((p) => p) : [];
          if (pathParts.length <= basePathParts.length) {
            if (process.env.NODE_ENV === 'development') {
              console.log('🔹 useProductFilters: Clearing attributes (browser navigation to base page)');
            }
            setSelectedAttributes({});
          }
        } else if (isInitial) {
          // 🔹 على initial load، لا نمسح الفلاتر الموجودة
          if (process.env.NODE_ENV === 'development') {
            console.log('🔹 useProductFilters: Keeping existing attributes on initial load (may be from initialFilters)');
          }
        }
      }

      // 🔹 على initial load، نمنع updateUrlFromState من التحديث بعد parsing
      // لأن URL الحالي هو الصحيح ولا نريد تغييره
      // خاصة إذا كان URL يحتوي على فلاتر
      if (isInitial) {
        isUpdatingUrlRef.current = true;
        // 🔹 زيادة المدة لمنع التحديث حتى يتم parsing الفلاتر
        setTimeout(() => {
          isUpdatingUrlRef.current = false;
        }, 2000); // 🔹 منع التحديث لمدة ثانيتين على initial load
      }

      // Mark initial load as complete after first parse
      if (isInitial) {
        hasParsedInitialUrlRef.current = true;
        if (process.env.NODE_ENV === 'development') {
          console.log('🔹 Initial URL parsing complete. Filters:', {
            brand: selectedBrandRef.current,
            attributes: selectedAttributesRef.current,
            pathSegments
          });
        }
        // 🔹 تأخير تعيين isInitialLoadRef.current = false لضمان عدم تحديث URL
        // خاصة إذا كان URL يحتوي على فلاتر
        setTimeout(() => {
          isInitialLoadRef.current = false;
          isHydratingFromUrlRef.current = false;
        }, 2500); // 🔹 تأخير 2.5 ثانية لضمان عدم تحديث URL على initial load
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

  // 🔹 Retry mechanism: إعادة parsing للـ category slug عند وصول categoriesWithProducts
  useEffect(() => {
    // فقط على initial load وإذا كانت categoriesWithProducts أصبحت جاهزة
    if (!isInitialLoadRef.current || categoriesWithProducts.length === 0) return;
    
    const currentPathname = typeof window !== "undefined" ? window.location.pathname : pathname;
    if (!currentPathname || !currentPathname.startsWith("/products/")) return;
    
    // Parse category slug from URL
    const pathWithoutBase = currentPathname.replace("/products/", "").split("?")[0];
    const parts = pathWithoutBase.split("/").filter((p) => p);
    
    if (parts.length > 0) {
      const categorySlug = decodeURIComponent(parts[0]);
      const foundCategory = categoriesWithProducts.find(
        (cat) => cat.slug === categorySlug
      );
      
      if (foundCategory) {
        // Set category ID if different
        if (foundCategory.id !== selectedCategoryId) {
          setSelectedCategoryId(foundCategory.id);
        }
        // Set category slug if different
        if (foundCategory.slug !== selectedCategorySlug) {
          setSelectedCategorySlug(foundCategory.slug);
        }
      }
    }
  }, [categoriesWithProducts, pathname, selectedCategoryId, selectedCategorySlug, setSelectedCategoryId]);

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
    if (isHydratingFromUrlRef.current && !userInitiatedChangeRef.current) return;
    
    // 🔹 منع تحديث URL إذا كان المستخدم لم يقم بتغيير الفلاتر (لمنع restart عند انتهاء ProgressBar)
    if (!userInitiatedChangeRef.current && !isInitialLoadRef.current) {
      return;
    }
    
    const currentPathname = typeof window !== "undefined" ? window.location.pathname : pathname;
    const currentBrand = selectedBrandRef.current;
    const currentAttributes = selectedAttributesRef.current;
    
    // 🔹 على initial load، إذا كان URL يحتوي على فلاتر ولم يتم parsing بعد، لا نقوم بتحديث URL
    // هذا يمنع حذف الفلاتر من URL قبل parsingها
    if (isInitialLoadRef.current || !hasParsedInitialUrlRef.current) {
      if (currentPathname) {
        const isProductsRoute = currentPathname.startsWith("/products/");
        if (isProductsRoute) {
          const pathWithoutBase = currentPathname.replace("/products/", "").split("?")[0];
          const parts = pathWithoutBase.split("/").filter((p) => p);
          // إذا كان هناك أكثر من جزء (category + filters)، لا نقوم بتحديث URL حتى يتم parsing
          if (parts.length > 1) {
            // 🔹 تحقق من أن الفلاتر لم يتم parsing بعد
            // إذا كانت الفلاتر فارغة والـ URL يحتوي على فلاتر، لا نقوم بتحديث URL
            const hasNoFilters = !currentBrand && Object.keys(currentAttributes).length === 0;
            if (hasNoFilters) {
              return; // لا نقوم بتحديث URL إذا كانت الفلاتر فارغة والـ URL يحتوي على فلاتر
            }
          }
        } else if (effectiveBasePath) {
          const pathParts = currentPathname.split("/").filter((p) => p);
          const basePathParts = effectiveBasePath.split("/").filter((p) => p);
          // إذا كان هناك أكثر من base path (base + filters)، لا نقوم بتحديث URL حتى يتم parsing
          if (pathParts.length > basePathParts.length) {
            // 🔹 تحقق من أن الفلاتر لم يتم parsing بعد
            const hasNoFilters = !currentBrand && Object.keys(currentAttributes).length === 0;
            if (hasNoFilters) {
              return; // لا نقوم بتحديث URL إذا كانت الفلاتر فارغة والـ URL يحتوي على فلاتر
            }
          }
        }
      }
    }

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

  const handleAttributesChange = useCallback((attributes, options = {}) => {
    if (!setSelectedAttributes) {
      console.warn('⚠️ setSelectedAttributes is not defined');
      return;
    }
    const userInitiated = options?.userInitiated !== false;

    if (!userInitiated) {
      setSelectedAttributes(attributes);
      selectedAttributesRef.current = attributes;
      return;
    }

    userInitiatedChangeRef.current = true; // 🔹 علامة أن المستخدم قام بالتغيير
    isInitialLoadRef.current = false; // 🔹 إلغاء التحميل الأولي عند تغيير المستخدم
    isHydratingFromUrlRef.current = false;
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
    setSelectedCategorySlug,
    setSelectedBrand,
    setSelectedAttributes,
    handleBrandChange: handleBrandChange || (() => {}), // 🔹 قيمة افتراضية
    handleAttributesChange: handleAttributesChange || (() => {}), // 🔹 قيمة افتراضية
  };
}
