'use client';

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { FaShoppingCart, FaUser } from 'react-icons/fa';
import { ChevronDown, ChevronRight, X, ArrowLeft } from "lucide-react";
import { graphqlRequest } from "../lib/graphqlClientHelper";
import {
  Root_CATEGORIES,
  MAIN_ROOT_CATEGORIES_QUERY,
  GET_CATEGORIES_ONLY_QUERY,
  PRODUCTS_WITH_FILTERS_LISTING_QUERY,
} from "../lib/queries";
import { fetchClientProductsByVertical } from "../lib/clientCategoryListing";
import { motion, AnimatePresence } from "framer-motion";
import CartSidebar from "./CartSidebar";
import Image from "next/image";
// import { useChat } from "../contexts/ChatContext";
import { useTranslation } from "../contexts/TranslationContext";
import { useAuth } from "../contexts/AuthContext";
import { usePublicNavSettings } from "../contexts/PublicNavSettingsContext";
import { SITE_LOGO_FALLBACK_URL } from "../lib/siteLogoFromSettings";
import { buildParentPageUrl, toSlug } from "../lib/urlSlugHelper";

const SIDEBAR_NAV_CACHE_KEY = "sidebar_nav_cache_v1";
const SIDEBAR_BRANDS_CACHE_KEY = "sidebar_gk_brands_cache_v1";
const SIDEBAR_CACHE_TTL_MS = 15 * 60 * 1000;

function readSidebarCache(key) {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.ts || Date.now() - parsed.ts > SIDEBAR_CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

function writeSidebarCache(key, data) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // ignore storage errors
  }
}

function getParentRouteFromCategoryName(name) {
  let nameStr = "";
  try {
    const parsed = JSON.parse(name || "{}");
    nameStr = parsed.en || parsed.ar || name || "";
  } catch {
    nameStr = name || "";
  }
  const normalized = nameStr.toLowerCase().trim();
  if (normalized.includes("goalkeeper") && normalized.includes("gloves")) return "/GoalkeeperGloves";
  if (normalized.includes("football") && normalized.includes("boots")) return "/FootballBoots";
  if (normalized.includes("goalkeeper") && normalized.includes("apparel")) return "/Goalkeeperapparel";
  if (normalized.includes("goalkeeper") && normalized.includes("equipment")) return "/Goalkeeperequipment";
  if (normalized.includes("teamsport")) return "/Teamsport";
  if (normalized.includes("sale")) return "/Sale";
  return null;
}

function isGoalkeeperGlovesCategoryName(name) {
  if (!name) return false;
  let nameStr = "";
  try {
    const parsed = JSON.parse(typeof name === "string" ? name : "{}");
    nameStr = parsed.en || parsed.ar || name || "";
  } catch {
    nameStr = typeof name === "string" ? name : "";
  }
  const n = nameStr.toLowerCase().trim();
  return n.includes("goalkeeper") && n.includes("gloves");
}

function getLocalizedName(rawName, lang) {
  if (!rawName) return "";
  if (typeof rawName !== "string") return String(rawName || "");
  try {
    const parsed = JSON.parse(rawName);
    if (parsed && typeof parsed === "object") {
      if (parsed[lang]) return String(parsed[lang]);
      if (parsed.en) return String(parsed.en);
      if (parsed.ar) return String(parsed.ar);
    }
  } catch {
    // plain string, return as-is
  }
  return rawName;
}

/** Flatten main roots + nested subCategories for slug/id lookup (handleSubcategoryClick). */
function flattenMainNavCategories(mains) {
  const list = [];
  for (const m of mains || []) {
    list.push({
      id: m.id,
      name: m.name,
      slug: m.slug,
      order: m.order,
      parent: null,
      subCategories: m.subCategories,
      is_main: m.is_main,
      show_brands_in_menu: m.show_brands_in_menu,
    });
    for (const s of m.subCategories || []) {
      list.push({
        ...s,
        parent: { id: m.id, name: m.name, order: m.order ?? 0 },
      });
    }
  }
  return list;
}

export default function Sidebar({ isOpen, setIsOpen, isRTL, categories: externalCategories, onSelectCategory: externalOnSelectCategory, brands: externalBrands = [], onSelectBrand: externalOnSelectBrand }) {
  const { siteLogoUrl } = usePublicNavSettings();
  const logoSrc = siteLogoUrl || SITE_LOGO_FALLBACK_URL;
  const [categories, setCategories] = useState([]);
  const [mainNavRoots, setMainNavRoots] = useState([]);
  /** "main" = mainRootCategories / is_main hierarchy; "legacy" = old parentCategories list */
  const [navSource, setNavSource] = useState("legacy");
  const [cartOpen, setCartOpen] = useState(false);
  const [openParentId, setOpenParentId] = useState(null);
  const [selectedParentForDetail, setSelectedParentForDetail] = useState(null);
  const [showParentDetail, setShowParentDetail] = useState(false);
  const [goalkeeperGlovesBrands, setGoalkeeperGlovesBrands] = useState([]);
  const router = useRouter();
  const pathname = usePathname();
  // const { openChat } = useChat();
  const { t, lang } = useTranslation();
  const effectiveIsRTL = typeof isRTL === "boolean" ? isRTL : lang === "ar";
  const { user, logout } = useAuth();

  // Memoize externalCategories to prevent dependency array changes
  const externalCategoriesMemo = useMemo(() => {
    return externalCategories && Array.isArray(externalCategories) && externalCategories.length > 0 
      ? externalCategories 
      : null;
  }, [externalCategories]);

  // 🔹 جلب الجذور الرئيسية (mainRootCategories / is_main) ثم fallback لـ rootCategories الكاملة
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const cachedNav = readSidebarCache(SIDEBAR_NAV_CACHE_KEY);
      if (cachedNav && !cancelled) {
        setMainNavRoots(Array.isArray(cachedNav.mainNavRoots) ? cachedNav.mainNavRoots : []);
        setCategories(Array.isArray(cachedNav.categories) ? cachedNav.categories : []);
        setNavSource(cachedNav.navSource || "legacy");
        return;
      }
      try {
        const mainData = await graphqlRequest(MAIN_ROOT_CATEGORIES_QUERY);
        if (cancelled) return;
        const mains = mainData?.mainRootCategories || [];
        if (mains.length > 0) {
          const sorted = [...mains].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
          const hasIsMainFlag = sorted.some((m) => typeof m.is_main === "boolean");
          const rootsOnlyMain = hasIsMainFlag
            ? sorted.filter((m) => m.is_main === true)
            : sorted;
          if (rootsOnlyMain.length > 0) {
            setMainNavRoots(rootsOnlyMain);
            const flattened = flattenMainNavCategories(rootsOnlyMain);
            setCategories(flattened);
            setNavSource("main");
            writeSidebarCache(SIDEBAR_NAV_CACHE_KEY, {
              mainNavRoots: rootsOnlyMain,
              categories: flattened,
              navSource: "main",
            });
            return;
          }
        }
      } catch (e) {
        console.error("❌ Error fetching mainRootCategories:", e);
      }

      try {
        const data = await graphqlRequest(Root_CATEGORIES);
        if (cancelled) return;
        const all = data?.rootCategories || [];
        const mainsFromAll = all
          .filter((c) => !c.parent && c.is_main === true)
          .map((m) => ({
            ...m,
            subCategories: all
              .filter((sub) => sub.parent && String(sub.parent.id) === String(m.id))
              .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999)),
          }))
          .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));

        if (mainsFromAll.length > 0) {
          setMainNavRoots(mainsFromAll);
          setCategories(all);
          setNavSource("main");
          writeSidebarCache(SIDEBAR_NAV_CACHE_KEY, {
            mainNavRoots: mainsFromAll,
            categories: all,
            navSource: "main",
          });
          return;
        }

        setCategories(all.length > 0 ? all : externalCategoriesMemo || []);
        setMainNavRoots([]);
        setNavSource("legacy");
        writeSidebarCache(SIDEBAR_NAV_CACHE_KEY, {
          mainNavRoots: [],
          categories: all.length > 0 ? all : externalCategoriesMemo || [],
          navSource: "legacy",
        });
      } catch (error) {
        console.error("❌ Error fetching categories:", error);
        if (!cancelled && externalCategoriesMemo) {
          setCategories(externalCategoriesMemo);
        }
        if (!cancelled) {
          setMainNavRoots([]);
          setNavSource("legacy");
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [externalCategoriesMemo]);

  // 🔹 جلب rootCategories (الرئيسية التي ليس لها parent) - نفس منطق الموبايل
  const rootCategories = categories.filter((cat) => !cat.parent);
  
  // 🔹 جلب parentCategories (التي لديها parent و parent.name)
  // مع التأكد من أن كل parent لديه subcategories فعلاً
  const parentCategories = useMemo(() => {
    const parents = categories
      .filter((cat) => cat.parent && cat.parent.name)
      .reduce((acc, curr) => {
        const exists = acc.find((p) => p.parent.id === curr.parent.id);
        if (!exists) acc.push(curr);
        return acc;
      }, []);
    
    // 🔹 فلترة: فقط جذور is_main ولديها subcategories (الجذر من صف الأب في القائمة المسطّحة)
    const filtered = parents.filter((item) => {
      const parent = item.parent;
      const subCategories = categories.filter((sub) => sub.parent?.id === parent.id);
      if (subCategories.length === 0) return false;
      const parentRoot = categories.find(
        (c) => !c.parent && String(c.id) === String(parent.id)
      );
      if (parentRoot && typeof parentRoot.is_main === "boolean") {
        return parentRoot.is_main === true;
      }
      if (typeof parent?.is_main === "boolean") {
        return parent.is_main === true;
      }
      return false;
    });
    
    // 🔹 ترتيب حسب order (0 أولاً، ثم 1، وهكذا)
    return filtered.sort((a, b) => {
      const orderA = a.parent?.order ?? 9999;
      const orderB = b.parent?.order ?? 9999;
      return orderA - orderB;
    });
  }, [categories]);

  const categoryById = useMemo(() => {
    const map = new Map();
    for (const cat of categories || []) {
      if (cat?.id === null || cat?.id === undefined) continue;
      map.set(String(cat.id), cat);
    }
    return map;
  }, [categories]);

  const parentCategoryById = useMemo(() => {
    const map = new Map();
    for (const item of parentCategories || []) {
      const pid = item?.parent?.id;
      if (pid === null || pid === undefined) continue;
      map.set(String(pid), item);
    }
    return map;
  }, [parentCategories]);

  // 🔹 دالة لتحويل route إلى parent category ID (main nav أو legacy)
  const getParentIdFromRoute = useCallback(
    (route) => {
      if (!route) return null;
      const verticals = [
        "/GoalkeeperGloves",
        "/FootballBoots",
        "/Goalkeeperapparel",
        "/Goalkeeperequipment",
        "/Teamsport",
        "/Sale",
      ];
      let matched = null;
      for (const p of verticals) {
        if (route === p || route.startsWith(`${p}/`)) {
          matched = p;
          break;
        }
      }
      if (matched && mainNavRoots.length > 0) {
        for (const m of mainNavRoots) {
          if (getParentRouteFromCategoryName(m.name) === matched) return m.id;
        }
      }

      const routeToParentName = {
        "/GoalkeeperGloves": "goalkeeper gloves",
        "/FootballBoots": "football boots",
        "/Goalkeeperapparel": "goalkeeper apparel",
        "/Goalkeeperequipment": "goalkeeper equipment",
        "/Teamsport": "teamsport",
        "/Sale": "sale",
      };
      const key = matched || route;
      const parentName = routeToParentName[key];
      if (!parentName) return null;

      const parentCategory = parentCategories.find((item) => {
        const parent = item.parent;
        if (!parent?.name) return false;
        let nameStr = "";
        try {
          const parsed = JSON.parse(parent.name || "{}");
          nameStr = parsed.en || parsed.ar || parent.name || "";
        } catch {
          nameStr = parent.name || "";
        }
        const normalized = nameStr.toLowerCase().trim();
        return normalized.includes(parentName.toLowerCase());
      });

      return parentCategory?.parent?.id || null;
    },
    [mainNavRoots, parentCategories]
  );

  // 🔹 إعادة تعيين حالة parent detail عند إغلاق الـ drawer
  useEffect(() => {
    if (!isOpen) {
      setShowParentDetail(false);
      setSelectedParentForDetail(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setShowParentDetail(false);
    setSelectedParentForDetail(null);
    if (setIsOpen) setIsOpen(false);
  }, [pathname]);

  // 🔹 فتح الـ subcategories تلقائياً عند تحميل الصفحة بناءً على الـ URL
  useEffect(() => {
    if (!pathname) return;

    const savedParentId = localStorage.getItem("sidebar_open_parent_id");
    if (savedParentId) {
      const inMain = mainNavRoots.some((m) => String(m.id) === String(savedParentId));
      const inLegacy = parentCategories.some((item) => String(item.parent?.id) === String(savedParentId));
      if (inMain || inLegacy) {
        setOpenParentId(savedParentId);
        localStorage.removeItem("sidebar_open_parent_id");
        return;
      }
    }

    const parentId = getParentIdFromRoute(pathname);
    if (parentId) setOpenParentId(parentId);
  }, [pathname, parentCategories, mainNavRoots, getParentIdFromRoute]);

  // Brands for Goalkeeper Gloves — Query.productsWithFilters (no rootCategory.products)
  useEffect(() => {
    const fetchBrands = async () => {
      const cachedBrands = readSidebarCache(SIDEBAR_BRANDS_CACHE_KEY);
      if (cachedBrands && Array.isArray(cachedBrands) && cachedBrands.length > 0) {
        setGoalkeeperGlovesBrands(cachedBrands);
        return;
      }
      try {
        const products = await fetchClientProductsByVertical("goalkeeperGloves", { limit: 96 });
        const brandsList = [...new Set(products.map((p) => p.brand_name).filter(Boolean))];
        setGoalkeeperGlovesBrands(brandsList);
        writeSidebarCache(SIDEBAR_BRANDS_CACHE_KEY, brandsList);
      } catch (error) {
        console.error("❌ Error fetching brands for GoalkeeperGloves:", error);
        if (externalBrands && externalBrands.length > 0) {
          setGoalkeeperGlovesBrands(externalBrands);
        }
      }
    };

    fetchBrands();
  }, []);

  // Keep sidebar prefetch lightweight to avoid competing with active mobile navigation.
  useEffect(() => {
    if (!isOpen) return;
    const subcategorySlugs = categories
      .filter((c) => c?.slug && c?.parent)
      .slice(0, 6)
      .map((c) => `/products/${encodeURIComponent(c.slug)}`);
    subcategorySlugs.forEach((route) => router.prefetch(route));
  }, [router, categories, isOpen]);

  useEffect(() => {
    if (!showParentDetail || !selectedParentForDetail?.parent?.id) return;
    const parentId = String(selectedParentForDetail.parent.id);
    const showAllRoute = getParentRoute(selectedParentForDetail.parent.name);
    if (showAllRoute) router.prefetch(showAllRoute);
    const childRoutes = categories
      .filter((c) => c?.parent && String(c.parent.id) === parentId && c?.slug)
      .slice(0, 8)
      .map((c) => `/products/${encodeURIComponent(c.slug)}`);
    childRoutes.forEach((route) => router.prefetch(route));
  }, [showParentDetail, selectedParentForDetail, categories, router]);

  const getParentRoute = (name) => getParentRouteFromCategoryName(name);

  const closeAllMobilePanels = useCallback(() => {
    setShowParentDetail(false);
    setSelectedParentForDetail(null);
    if (typeof setIsOpen === "function") {
      setIsOpen(false);
    }
  }, [setIsOpen]);

  // 🔹 التنقل لصفحة الـ parent (زر "عرض الكل" / جذر بلا فرعيات)
  const handleShowAllClick = (parentId, parentName) => {
    const route = getParentRoute(parentName);

    if (route) {
      localStorage.setItem("sidebar_open_parent_id", String(parentId));
      router.push(route, { scroll: false });

      setShowParentDetail(false);
      setSelectedParentForDetail(null);
      if (setIsOpen) setIsOpen(false);
    } else {
      const parentCategory = categoryById.get(String(parentId));

      if (parentCategory?.slug) {
        const slug = encodeURIComponent(parentCategory.slug);
        router.push(`/products/${slug}`, { scroll: false });
        setShowParentDetail(false);
        setSelectedParentForDetail(null);
        if (setIsOpen) setIsOpen(false);
      } else {
        console.warn("⚠️ Could not navigate to parent category:", parentId, parentName);
        setShowParentDetail(false);
        setSelectedParentForDetail(null);
      }
    }
  };

  const handleParentClick = (parentId, parentName, event) => {
    const isMobile = isOpen;

    if (navSource === "main") {
      const main = mainNavRoots.find((m) => String(m.id) === String(parentId));
      if (!main) return;
      const subs = main.subCategories || [];
      const showGkBrands =
        isGoalkeeperGlovesCategoryName(main.name) &&
        goalkeeperGlovesBrands.length > 0 &&
        main.show_brands_in_menu !== false;
      if (subs.length === 0 && !showGkBrands) {
        handleShowAllClick(parentId, main.name);
        return;
      }

      // في الموبايل: افتح ستارة جانبية ثانية بدل dropdown
      if (isMobile) {
        setSelectedParentForDetail({
          parent: { id: main.id, name: main.name },
        });
        setShowParentDetail(true);
        return;
      }

      setOpenParentId((prev) => (String(prev) === String(parentId) ? null : parentId));
      return;
    }

    // 🔹 في وضع الجوال: عرض شاشة التفاصيل بدلاً من التنقل المباشر
    if (isMobile) {
      const parentFromParentCategories = parentCategoryById.get(String(parentId));
      
      if (parentFromParentCategories) {
        setSelectedParentForDetail(parentFromParentCategories);
        setShowParentDetail(true);
        return;
      }
    }
    
    // 🔹 في وضع الديسكتوب: التنقل المباشر (السلوك الحالي)
    // 🔹 البحث عن الـ parent category من categories
    const parentCategory = categoryById.get(String(parentId));

    // 🔹 الحصول على الـ route الرئيسي من اسم الـ parent
    const route = getParentRoute(parentName || parentCategory?.name);

    if (route) {
      // 🔹 حفظ parentId في localStorage لفتح الـ subcategories بعد التنقل
      localStorage.setItem('sidebar_open_parent_id', String(parentId));
      router.push(route, { scroll: false });
      
      if (setIsOpen) setIsOpen(false); // إغلاق الـ drawer على الموبايل
    } else {
      // Fallback: استخدام products/slug إذا لم نجد route رئيسي
      if (parentCategory?.slug) {
        const slug = encodeURIComponent(parentCategory.slug);
        router.push(`/products/${slug}`, { scroll: false });
        if (setIsOpen) setIsOpen(false);
      } else {
        // Fallback: toggle للفتح/الإغلاق إذا لم يتم العثور على route أو slug
        console.warn("⚠️ Parent category not found or missing route for ID:", parentId, "Name:", parentName);
        const parentFromParentCategories = parentCategoryById.get(String(parentId));
        
        if (parentFromParentCategories?.parent?.name) {
          // No route/slug available; fallback to desktop toggle behavior.
        }
        
        if (openParentId === parentId) {
          setOpenParentId(null);
        } else {
          setOpenParentId(parentId);
        }
      }
    }
  };

  // 🔹 Handler للضغط على براند
  const handleBrandClick = useCallback((brandName) => {
    if (!brandName) return;

    closeAllMobilePanels();

    // 🔹 إذا كان هناك externalOnSelectBrand (من GoalkeeperGloves)، استخدمه
    if (externalOnSelectBrand) {
      externalOnSelectBrand(brandName);
      queueMicrotask(() => closeAllMobilePanels());
      return;
    }

    // بناء URL مع فلتر البراند (للصفحات الأخرى)
    const brandUrl = buildParentPageUrl("/GoalkeeperGloves", {}, brandName);

    if (brandUrl) {
      router.push(brandUrl, { scroll: false });
    }
    queueMicrotask(() => closeAllMobilePanels());
  }, [router, closeAllMobilePanels, externalOnSelectBrand]);

  // 🔹 Handler لفتح Goalkeeper Gloves في ParentDetailView (في وضع الجوال)
  const handleShowGoalkeeperGlovesDetail = useCallback(() => {
    if (navSource === "main" && mainNavRoots.length > 0) {
      const gk = mainNavRoots.find((m) => isGoalkeeperGlovesCategoryName(m.name));
      if (gk) {
        setOpenParentId(String(gk.id));
        return;
      }
    }

    const goalkeeperGlovesParent = parentCategories.find((item) => {
      const parent = item.parent;
      if (!parent?.name) return false;
      let nameStr = "";
      try {
        const parsed = JSON.parse(parent.name || "{}");
        nameStr = parsed.en || parsed.ar || parent.name || "";
      } catch {
        nameStr = parent.name || "";
      }
      const normalized = nameStr.toLowerCase().trim();
      return normalized.includes("goalkeeper") && normalized.includes("gloves");
    });

    if (goalkeeperGlovesParent) {
      setSelectedParentForDetail(goalkeeperGlovesParent);
      setShowParentDetail(true);
    } else {
      const goalkeeperGlovesName = JSON.stringify({
        en: "Goalkeeper Gloves",
        ar: "قفازات حارس المرمى",
      });
      setSelectedParentForDetail({
        parent: { id: "goalkeeper-gloves", name: goalkeeperGlovesName },
      });
      setShowParentDetail(true);
    }
  }, [navSource, mainNavRoots, parentCategories]);

  // دالة التنقل للـ Products مع التأكد من إغلاق الستارتين في الجوال
  const handleSubcategoryClick = (subId) => {
    // 🔹 إغلاق الستارة الثانية + الأولى فورًا قبل أي عمل آخر
    closeAllMobilePanels();
    
    // 🔹 البحث عن slug من categories وتحويل لصفحة slug
    // يجب التنقل دائمًا إلى صفحة المنتجات، حتى لو كان هناك externalOnSelectCategory
    const selectedCat = categoryById.get(String(subId));
    
    if (selectedCat?.slug) {
      // Navigate to products page with category slug
      const slug = encodeURIComponent(selectedCat.slug);
      router.push(`/products/${slug}`, { scroll: false });
      // 🔹 استدعاء externalOnSelectCategory إذا كان موجودًا (للتحديث الإضافي)
      // ولكن بعد التنقل، وليس بدلاً منه
      if (externalOnSelectCategory) {
        externalOnSelectCategory(subId);
      }
      queueMicrotask(() => closeAllMobilePanels());
    } else {
      // If no slug found, show error and don't navigate
      console.warn("⚠️ Category not found or missing slug for ID:", subId);
      // Don't navigate to /products (page removed) - stay on current page
      
      // 🔹 حتى لو لم نجد slug، استدعاء externalOnSelectCategory إذا كان موجودًا
      if (externalOnSelectCategory) {
        externalOnSelectCategory(subId);
      }
      queueMicrotask(() => closeAllMobilePanels());
    }
    
  };

  return (
    <>
      {/* Sidebar للشاشات الكبيرة - يعرض parentCategories مع subcategories (نفس منطق الموبايل) */}
      <aside
        className={`hidden lg:block bg-black text-white w-full h-screen py-4 px-3 font-sans overflow-y-auto ${effectiveIsRTL ? "text-right" : "text-left"}`}
        dir={effectiveIsRTL ? "rtl" : "ltr"}
      >
        <SidebarContent
          navSource={navSource}
          mainNavRoots={mainNavRoots}
          parentCategories={parentCategories}
          categories={categories}
          openParentId={openParentId}
          handleParentClick={handleParentClick}
          onSelectCategory={handleSubcategoryClick}
          onShowAllClick={handleShowAllClick}
          goalkeeperGlovesBrands={goalkeeperGlovesBrands}
          onSelectBrand={handleBrandClick}
          isOpen={false}
          onShowGoalkeeperGlovesDetail={null}
          isRTL={effectiveIsRTL}
          lang={lang}
          t={t}
        />
      </aside>

      {/* Drawer للشاشات الصغيرة والمتوسطة */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black z-60 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              className={`fixed top-0 h-full w-64 bg-black text-white z-70 shadow-xl py-4 px-3 font-sans overflow-y-auto lg:hidden flex flex-col ${effectiveIsRTL ? "text-right" : "text-left"}`}
              initial={{ x: effectiveIsRTL ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: effectiveIsRTL ? '100%' : '-100%' }}
              transition={{ type: 'tween', duration: 0.2 }}
              style={{ right: effectiveIsRTL ? 0 : 'auto', left: effectiveIsRTL ? 'auto' : 0 }}
              dir={effectiveIsRTL ? "rtl" : "ltr"}
            >
              {/* زر الإغلاق */}
              {!showParentDetail && (
                <div className={`flex items-center mb-4 ${effectiveIsRTL ? "flex-row-reverse justify-between" : "justify-between"}`}>
                  <h2 className="text-lg font-semibold">{t("Menu")}</h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:text-amber-400"
                  >
                    <X size={22} />
                  </button>
                </div>
              )}

              {/* الستارة الأولى + الستارة الثانية (تفاصيل الـ parent) */}
              <div className="flex-1 relative overflow-hidden">
                <motion.div
                  key="sidebar-content"
                  initial={{ x: effectiveIsRTL ? '100%' : '-100%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: 'tween', duration: 0.16, ease: 'easeInOut' }}
                  className="absolute inset-0"
                >
                  <SidebarContent
                    navSource={navSource}
                    mainNavRoots={mainNavRoots}
                    parentCategories={parentCategories}
                    categories={categories}
                    openParentId={openParentId}
                    handleParentClick={handleParentClick}
                    onSelectCategory={handleSubcategoryClick}
                    onShowAllClick={handleShowAllClick}
                    goalkeeperGlovesBrands={goalkeeperGlovesBrands}
                    onSelectBrand={handleBrandClick}
                    isOpen={isOpen}
                    onShowGoalkeeperGlovesDetail={handleShowGoalkeeperGlovesDetail}
                    isRTL={effectiveIsRTL}
                    lang={lang}
                    t={t}
                  />
                </motion.div>

                <AnimatePresence>
                  {showParentDetail && selectedParentForDetail && (
                    <motion.div
                      key="parent-detail-panel"
                      initial={{ x: effectiveIsRTL ? '-100%' : '100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: effectiveIsRTL ? '-100%' : '100%' }}
                      transition={{ type: 'tween', duration: 0.16, ease: 'easeInOut' }}
                      className="absolute inset-0 bg-black z-10 shadow-2xl"
                    >
                      <ParentDetailView
                        selectedParent={selectedParentForDetail}
                        categories={categories}
                        brands={goalkeeperGlovesBrands}
                        onShowAll={handleShowAllClick}
                        onSelectCategory={handleSubcategoryClick}
                        onCloseAll={closeAllMobilePanels}
                        onBack={() => {
                          setShowParentDetail(false);
                          setSelectedParentForDetail(null);
                        }}
                        onSelectBrand={externalOnSelectBrand}
                        isRTL={effectiveIsRTL}
                        lang={lang}
                        t={t}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* أيقونات أسفل الستارة */}
              <div className={`mt-auto pt-4 border-t border-neutral-700 flex flex-col gap-3`}>
                <div className={`flex ${effectiveIsRTL ? "flex-row-reverse justify-between" : "justify-between"} items-center w-full px-3 gap-4`}>
                  <Link href="/">
                    <Image
                      key={logoSrc}
                      src={logoSrc}
                      alt="Logo"
                      width={120}
                      height={32}
                      className="h-8 w-auto max-w-[120px] object-contain"
                      priority
                      unoptimized={Boolean(siteLogoUrl)}
                    />
                  </Link>

                  {/* <button onClick={openChat} className="text-white hover:text-amber-400 transition-colors duration-200">
                    <FaComments size={20} />
                  </button> */}

                  <button onClick={() => setCartOpen(true)} className="text-white hover:text-amber-400 transition-colors duration-200">
                    <FaShoppingCart size={20} />
                  </button>

                  {user ? (
                    <Link href="/profile" className="text-white hover:text-amber-400 transition-colors duration-200" onClick={() => setIsOpen(false)}>
                      <FaUser size={20} />
                    </Link>
                  ) : (
                    <Link href="/login" className="text-white hover:text-amber-400 transition-colors duration-200">
                      <FaUser size={20} />
                    </Link>
                  )}
                </div>

                {user && (
                  <div className="px-3">
                    <button
                      onClick={() => {
                        logout();
                        setIsOpen(false);
                      }}
                      className="w-full bg-black hover:bg-neutral-900 border border-neutral-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      <span>{t('Logout') || 'Logout'}</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CartSidebar isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}

// 🔹 مكون ParentDetailView للعرض في وضع الجوال
function ParentDetailView({ selectedParent, categories, brands = [], onShowAll, onSelectCategory, onCloseAll, onBack, onSelectBrand: externalOnSelectBrand, isRTL, lang, t }) {
  if (!selectedParent) return null;

  const router = useRouter();
  const parent = selectedParent.parent;
  
  const subCategories = categories
    .filter(sub => sub.parent?.id === parent.id)
    .sort((a, b) => {
      const orderA = a.order ?? 9999;
      const orderB = b.order ?? 9999;
      return orderA - orderB;
    });

  // 🔹 استخراج القيمة المناسبة من JSON string بناءً على اللغة الحالية
  const parentDisplayName = useMemo(() => {
    if (!parent?.name) return '';
    
    try {
      const parsed = typeof parent.name === 'string' ? JSON.parse(parent.name) : parent.name;
      // 🔹 اختيار en للغة الإنجليزية و ar للغة العربية
      return parsed[lang] || parsed.en || parsed.ar || parent.name;
    } catch {
      // إذا فشل parsing، إرجاع النص كما هو
      return parent.name;
    }
  }, [parent?.name, lang]);

  // 🔹 التحقق من أن parent category هو "goalkeeper gloves"
  const isGoalkeeperGloves = useMemo(() => {
    if (!parent?.name) return false;
    
    let nameStr = '';
    try {
      const parsed = JSON.parse(parent.name || '{}');
      nameStr = parsed.en || parsed.ar || parent.name || '';
    } catch {
      nameStr = parent.name || '';
    }
    
    const normalized = nameStr.toLowerCase().trim();
    return normalized.includes('goalkeeper') && normalized.includes('gloves');
  }, [parent?.name]);

  // 🔹 Handler للضغط على براند
  const handleBrandClick = useCallback((brandName) => {
    if (!brandName) return;

    if (onCloseAll) onCloseAll();

    // 🔹 إذا كان هناك externalOnSelectBrand (من GoalkeeperGloves)، استخدمه
    if (externalOnSelectBrand) {
      externalOnSelectBrand(brandName);
      queueMicrotask(() => onCloseAll && onCloseAll());
      return;
    }

    // بناء URL مع فلتر البراند (للصفحات الأخرى)
    const brandUrl = buildParentPageUrl("/GoalkeeperGloves", {}, brandName);

    if (brandUrl) {
      router.push(brandUrl, { scroll: false });
    }
    queueMicrotask(() => onCloseAll && onCloseAll());
  }, [router, onCloseAll, externalOnSelectBrand]);

  return (
    <div className="flex flex-col h-full">
      {/* Header with back button and title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.14 }}
        className="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-700"
      >
        <button
          onClick={onBack}
          className="text-white hover:text-amber-400 transition-colors p-1"
          aria-label="Back"
        >
          <ArrowLeft size={20} className={isRTL ? "rotate-180" : ""} />
        </button>
        <h2 className="text-lg font-semibold text-white">
          {parentDisplayName}
        </h2>
      </motion.div>

      {/* Parent name */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.14 }}
        className="px-3 py-2 mb-2"
      >
        <h3 className="text-base font-medium text-white">
          {parentDisplayName}
        </h3>
      </motion.div>

      {/* Show all button */}
      <motion.button
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.14 }}
        onClick={() => onShowAll(parent.id, parent.name)}
        className={`px-3 py-2 text-sm text-white hover:bg-neutral-800 hover:text-amber-400 transition-all rounded mb-2 ${isRTL ? "text-right" : "text-left"}`}
        dir={isRTL ? "rtl" : "ltr"}
      >
        {t("Show all")}
      </motion.button>

      {/* Subcategories list مع البراندات */}
      {(subCategories.length > 0 || (isGoalkeeperGloves && brands && brands.length > 0)) && (
        <ul className="space-y-1 flex-1 overflow-y-auto">
          {/* Subcategories */}
          {subCategories.map((sub) => (
            <motion.li
              key={sub.id}
              initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                duration: 0.14,
                delay: 0,
                ease: 'easeOut'
              }}
              whileTap={{ scale: 0.98 }}
              className={`px-3 py-2.5 text-sm text-neutral-300 cursor-pointer hover:bg-neutral-800 hover:text-white transition-all rounded active:bg-neutral-700 ${isRTL ? "hover:-translate-x-1 text-right" : "hover:translate-x-1 text-left"}`}
              onClick={() => {
                if (onSelectCategory) {
                  onSelectCategory(sub.id);
                }
              }}
              dir={isRTL ? "rtl" : "ltr"}
            >
              {getLocalizedName(sub.name, lang)}
            </motion.li>
          ))}
          
          {/* 🔹 البراندات كـ subcategories لـ goalkeeper gloves في وضع الجوال */}
          {isGoalkeeperGloves && brands && brands.length > 0 && (
            <>
              {brands.map((brand, index) => {
                const brandName = typeof brand === 'string' ? brand : (brand?.brand_name || brand?.name || '');
                if (!brandName) return null;
                
                return (
                  <motion.li
                    key={`brand-${brandName}-${index}`}
                    initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ 
                      duration: 0.14,
                      delay: 0,
                      ease: 'easeOut'
                    }}
                    whileTap={{ scale: 0.98 }}
                    className={`px-3 py-2.5 text-sm text-neutral-300 cursor-pointer hover:bg-neutral-800 hover:text-white transition-all rounded active:bg-neutral-700 ${isRTL ? "hover:-translate-x-1 text-right" : "hover:translate-x-1 text-left"}`}
                    onClick={() => handleBrandClick(brandName)}
                    dir={isRTL ? "rtl" : "ltr"}
                  >
                    {brandName}
                  </motion.li>
                );
              })}
            </>
          )}
        </ul>
      )}
    </div>
  );
}

// محتوى القائمة - نفس المنطق للموبايل والكمبيوتر
function SidebarContent({
  navSource = "legacy",
  mainNavRoots = [],
  parentCategories,
  categories,
  openParentId,
  handleParentClick,
  onSelectCategory,
  onShowAllClick,
  goalkeeperGlovesBrands = [],
  onSelectBrand,
  isRTL,
  lang,
  t,
  isOpen,
  onShowGoalkeeperGlovesDetail,
}) {
  const rowLayoutClass = isRTL ? "text-right" : "flex-row text-left";
  const subItemHoverTranslateClass = isRTL ? "hover:-translate-x-1" : "hover:translate-x-1";
  const nestedListClass = isRTL
    ? "mt-1 mb-2 space-y-0.5 mr-4 ml-0 border-r-2 border-neutral-700 pr-2"
    : "mt-1 mb-2 space-y-0.5 ml-4 mr-0 border-l-2 border-neutral-700 pl-2";

  const isGoalkeeperGlovesParent = useCallback((parentName) => {
    if (!parentName) return false;
    
    let nameStr = '';
    try {
      const parsed = JSON.parse(parentName || '{}');
      nameStr = parsed.en || parsed.ar || parentName || '';
    } catch {
      nameStr = parentName || '';
    }
    
    const normalized = nameStr.toLowerCase().trim();
    return normalized.includes('goalkeeper') && normalized.includes('gloves');
  }, []);

  // 🔹 قائمة الجذور الرئيسية (is_main / mainRootCategories) + dropdown للفرعيات
  if (navSource === "main" && mainNavRoots.length > 0) {
    return (
      <ul className="space-y-1">
        {mainNavRoots.map((main) => {
          const subs = [...(main.subCategories || [])].sort(
            (a, b) => (a.order ?? 9999) - (b.order ?? 9999)
          );
          const rowExpanded = !isOpen && String(openParentId) === String(main.id);
          const isGk = isGoalkeeperGlovesCategoryName(main.name);
          const showGkBrands =
            isGk &&
            Array.isArray(goalkeeperGlovesBrands) &&
            goalkeeperGlovesBrands.length > 0 &&
            main.show_brands_in_menu !== false;
          const hasChevron = subs.length > 0 || showGkBrands;

          return (
            <li key={main.id} className="border-b border-neutral-700 pb-1">
              <div
                className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-neutral-700 transition-all rounded ${rowLayoutClass}`}
                onClick={(e) => handleParentClick(main.id, main.name, e)}
                dir={isRTL ? "rtl" : "ltr"}
              >
                <span className="text-sm font-medium text-white hover:text-amber-400 transition-colors">
                  {getLocalizedName(main.name, lang)}
                </span>
                {hasChevron && (
                  <div className="flex-shrink-0 chevron-icon">
                    {isOpen ? (
                      <ChevronRight size={16} className={`text-neutral-400 ${isRTL ? "rotate-180" : ""}`} />
                    ) : rowExpanded ? (
                      <ChevronDown size={16} className="text-neutral-400" />
                    ) : (
                      <ChevronRight size={16} className={`text-neutral-400 ${isRTL ? "rotate-180" : ""}`} />
                    )}
                  </div>
                )}
              </div>

              {rowExpanded && (subs.length > 0 || showGkBrands) && (
                <ul
                  className={nestedListClass}
                >
                  <li
                    className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-500 cursor-pointer hover:text-amber-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowAllClick(main.id, main.name);
                    }}
                    dir={isRTL ? "rtl" : "ltr"}
                  >
                    {t("Show all") || "Show all"}
                  </li>
                  {subs.map((sub) => (
                    <li
                      key={sub.id}
                      className={`px-3 py-1.5 text-sm text-neutral-300 cursor-pointer hover:bg-neutral-800 hover:text-white transition-all rounded ${subItemHoverTranslateClass} ${isRTL ? "text-right" : "text-left"}`}
                      onClick={() => onSelectCategory && onSelectCategory(sub.id)}
                      dir={isRTL ? "rtl" : "ltr"}
                    >
                      {getLocalizedName(sub.name, lang)}
                    </li>
                  ))}
                  {showGkBrands &&
                    goalkeeperGlovesBrands.map((brand, index) => {
                      const brandName =
                        typeof brand === "string"
                          ? brand
                          : brand?.brand_name || brand?.name || "";
                      if (!brandName) return null;
                      return (
                        <li
                          key={`brand-${brandName}-${index}`}
                          className={`px-3 py-1.5 text-sm text-neutral-300 cursor-pointer hover:bg-neutral-800 hover:text-white transition-all rounded ${subItemHoverTranslateClass} ${isRTL ? "text-right" : "text-left"}`}
                          onClick={() => onSelectBrand && onSelectBrand(brandName)}
                          dir={isRTL ? "rtl" : "ltr"}
                        >
                          {brandName}
                        </li>
                      );
                    })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  // 🔹 عرض parentCategories (التي لديها parent و parent.name) مع subcategories المرتبطة بها
  // نفس منطق الموبايل - يعمل على الشاشات الكبيرة أيضاً
  if (parentCategories && parentCategories.length > 0) {
  return (
    <ul className="space-y-1">
      {parentCategories.map((item) => {
        const parent = item.parent;
        const parentRoot = categories.find(
          (c) => !c.parent && String(c.id) === String(parent.id)
        );
        const subCategories = categories.filter((sub) => sub.parent?.id === parent.id);
        const rowExpanded = !isOpen && openParentId === parent.id;
        const hasSubCategories = subCategories.length > 0;
        const isGoalkeeperGloves = isGoalkeeperGlovesParent(parent.name);
        const hasBrands =
          isGoalkeeperGloves &&
          Array.isArray(goalkeeperGlovesBrands) &&
          goalkeeperGlovesBrands.length > 0 &&
          parentRoot?.show_brands_in_menu !== false;

        return (
          <li key={parent.id} className="border-b border-neutral-700 pb-1">
            <div
                className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-neutral-700 transition-all rounded ${rowLayoutClass}`}
              onClick={(e) => handleParentClick(parent.id, parent.name, e)}
              dir={isRTL ? "rtl" : "ltr"}
            >
                <span className="text-sm font-medium text-white hover:text-amber-400 transition-colors">
                  {getLocalizedName(parent.name, lang)}
                </span>
                {(hasSubCategories || hasBrands) && (
                  <div className="flex-shrink-0 chevron-icon">
                    {isOpen ? (
                      <ChevronRight size={16} className={`text-neutral-400 ${isRTL ? "rotate-180" : ""}`} />
                    ) : rowExpanded ? (
                      <ChevronDown size={16} className="text-neutral-400" />
                    ) : (
                      <ChevronRight size={16} className={`text-neutral-400 ${isRTL ? "rotate-180" : ""}`} />
                    )}
                  </div>
              )}
            </div>

              {rowExpanded && (hasSubCategories || hasBrands) && (
                <ul className={nestedListClass}>
                {/* Subcategories */}
                {subCategories
                  .sort((a, b) => {
                    const orderA = a.order ?? 9999;
                    const orderB = b.order ?? 9999;
                    return orderA - orderB;
                  })
                  .map(sub => (
                    <li
                      key={sub.id}
                        className={`px-3 py-1.5 text-sm text-neutral-300 cursor-pointer hover:bg-neutral-800 hover:text-white transition-all rounded ${subItemHoverTranslateClass} ${isRTL ? "text-right" : "text-left"}`}
                        onClick={() => onSelectCategory && onSelectCategory(sub.id)}
                        dir={isRTL ? "rtl" : "ltr"}
                    >
                      {getLocalizedName(sub.name, lang)}
                    </li>
                  ))}
                
                {isGoalkeeperGloves && goalkeeperGlovesBrands && Array.isArray(goalkeeperGlovesBrands) && goalkeeperGlovesBrands.length > 0 && (
                  <>
                    {goalkeeperGlovesBrands.map((brand, index) => {
                      const brandName = typeof brand === 'string' ? brand : (brand?.brand_name || brand?.name || '');
                      if (!brandName) return null;
                      
                      return (
                        <li
                          key={`brand-${brandName}-${index}`}
                          className={`px-3 py-1.5 text-sm text-neutral-300 cursor-pointer hover:bg-neutral-800 hover:text-white transition-all rounded ${subItemHoverTranslateClass} ${isRTL ? "text-right" : "text-left"}`}
                          onClick={() => onSelectBrand && onSelectBrand(brandName)}
                          dir={isRTL ? "rtl" : "ltr"}
                        >
                          {brandName}
                        </li>
                      );
                    })}
                  </>
                )}
              </ul>
            )}
          </li>
        );
      })}
      </ul>
    );
  }

  // 🔹 Fallback: فقط جذور is_main وفرعياتها (بدون عرض كل الـ categories)
  const fallbackMainRoots = categories
    .filter((c) => !c.parent && c.is_main === true)
    .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
  if (fallbackMainRoots.length > 0) {
    return (
      <ul className="space-y-1">
        {fallbackMainRoots.map((main) => {
          const subs = categories
            .filter((sub) => sub.parent && String(sub.parent.id) === String(main.id))
            .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
          const rowExpanded = !isOpen && String(openParentId) === String(main.id);
          const isGk = isGoalkeeperGlovesCategoryName(main.name);
          const showGkBrands =
            isGk &&
            Array.isArray(goalkeeperGlovesBrands) &&
            goalkeeperGlovesBrands.length > 0 &&
            main.show_brands_in_menu !== false;
          const hasChevron = subs.length > 0 || showGkBrands;
          return (
            <li key={main.id} className="border-b border-neutral-700 pb-1">
              <div
                className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-neutral-700 transition-all rounded ${rowLayoutClass}`}
                onClick={(e) => handleParentClick(main.id, main.name, e)}
                dir={isRTL ? "rtl" : "ltr"}
              >
                <span className="text-sm font-medium text-white hover:text-amber-400 transition-colors">
                  {getLocalizedName(main.name, lang)}
                </span>
                {hasChevron && (
                  <div className="flex-shrink-0 chevron-icon">
                    {isOpen ? (
                      <ChevronRight size={16} className={`text-neutral-400 ${isRTL ? "rotate-180" : ""}`} />
                    ) : rowExpanded ? (
                      <ChevronDown size={16} className="text-neutral-400" />
                    ) : (
                      <ChevronRight size={16} className={`text-neutral-400 ${isRTL ? "rotate-180" : ""}`} />
                    )}
                  </div>
                )}
              </div>
              {rowExpanded && (subs.length > 0 || showGkBrands) && (
                <ul
                  className={nestedListClass}
                >
                  <li
                    className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-500 cursor-pointer hover:text-amber-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowAllClick(main.id, main.name);
                    }}
                    dir={isRTL ? "rtl" : "ltr"}
                  >
                    {t("Show all") || "Show all"}
                  </li>
                  {subs.map((sub) => (
                    <li
                      key={sub.id}
                      className={`px-3 py-1.5 text-sm text-neutral-300 cursor-pointer hover:bg-neutral-800 hover:text-white transition-all rounded ${subItemHoverTranslateClass} ${isRTL ? "text-right" : "text-left"}`}
                      onClick={() => onSelectCategory && onSelectCategory(sub.id)}
                      dir={isRTL ? "rtl" : "ltr"}
                    >
                      {getLocalizedName(sub.name, lang)}
                    </li>
                  ))}
                  {showGkBrands &&
                    goalkeeperGlovesBrands.map((brand, index) => {
                      const brandName =
                        typeof brand === "string"
                          ? brand
                          : brand?.brand_name || brand?.name || "";
                      if (!brandName) return null;
                      return (
                        <li
                          key={`fb-${brandName}-${index}`}
                          className={`px-3 py-1.5 text-sm text-neutral-300 cursor-pointer hover:bg-neutral-800 hover:text-white transition-all rounded ${subItemHoverTranslateClass} ${isRTL ? "text-right" : "text-left"}`}
                          onClick={() => onSelectBrand && onSelectBrand(brandName)}
                          dir={isRTL ? "rtl" : "ltr"}
                        >
                          {brandName}
                        </li>
                      );
                    })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="space-y-1 px-3 py-2 text-sm text-neutral-500" dir={isRTL ? "rtl" : "ltr"}>
      <li>{t("No categories") || "No categories"}</li>
    </ul>
  );
}