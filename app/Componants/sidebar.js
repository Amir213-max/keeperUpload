'use client';

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaShoppingCart, FaUser } from 'react-icons/fa';
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { graphqlRequest } from "../lib/graphqlClientHelper";
import { Root_CATEGORIES, GET_CATEGORIES_ONLY_QUERY } from "../lib/queries";
import { motion, AnimatePresence } from "framer-motion";
import CartSidebar from "./CartSidebar";
import Image from "next/image";
// import { useChat } from "../contexts/ChatContext";
import { useTranslation } from "../contexts/TranslationContext";
import { useAuth } from "../contexts/AuthContext";

export default function Sidebar({ isOpen, setIsOpen, isRTL = false, categories: externalCategories, onSelectCategory: externalOnSelectCategory }) {
  const [categories, setCategories] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [openParentId, setOpenParentId] = useState(null);
  const router = useRouter();
  // const { openChat } = useChat();
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  // Memoize externalCategories to prevent dependency array changes
  const externalCategoriesMemo = useMemo(() => {
    return externalCategories && Array.isArray(externalCategories) && externalCategories.length > 0 
      ? externalCategories 
      : null;
  }, [externalCategories]);

  // 🔹 جلب جميع الـ categories من الـ API دائماً للـ Sidebar
  // حتى لو كانت هناك externalCategories (محدودة للصفحة الحالية)
  // الـ Sidebar يحتاج إلى جميع الـ categories لعرض جميع الـ parent categories
  useEffect(() => {
    const fetchAllCategories = async () => {
      try {
        // Use API route proxy to avoid CORS issues
        const data = await graphqlRequest(Root_CATEGORIES);
        const allCategories = data?.rootCategories || [];
        setCategories(allCategories);
      } catch (error) {
        console.error("❌ Error fetching categories:", error);
        // Fallback: استخدام externalCategories إذا فشل الـ API
        if (externalCategoriesMemo) {
          setCategories(externalCategoriesMemo);
        }
      }
    };
    fetchAllCategories();
  }, []); // 🔹 جلب مرة واحدة فقط عند تحميل الـ Sidebar

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
    
    // 🔹 فلترة: عرض فقط الـ parent categories التي لديها subcategories فعلاً
    const filtered = parents.filter(item => {
      const parent = item.parent;
      const subCategories = categories.filter(sub => sub.parent?.id === parent.id);
      return subCategories.length > 0; // فقط التي لديها subcategories
    });
    
    // 🔹 ترتيب حسب order (0 أولاً، ثم 1، وهكذا)
    return filtered.sort((a, b) => {
      const orderA = a.parent?.order ?? 9999;
      const orderB = b.parent?.order ?? 9999;
      return orderA - orderB;
    });
  }, [categories]);

  const handleParentClick = (parentId, parentName, event) => {
    // 🔹 منع التنقل إذا تم الضغط على السهم فقط (للسماح بالفتح/الإغلاق)
    const isArrowClick = event?.target?.closest('.chevron-icon') || 
                         event?.target?.tagName === 'svg' || 
                         event?.target?.tagName === 'path';
    
    if (isArrowClick) {
      // فقط toggle للفتح/الإغلاق إذا تم الضغط على السهم
      if (openParentId === parentId) {
        setOpenParentId(null);
      } else {
        setOpenParentId(parentId);
      }
      return;
    }

    // 🔹 دالة لتحويل اسم الـ category إلى route رئيسي
    const getParentRoute = (name) => {
      let nameStr = '';
      
      // معالجة الـ name (قد يكون JSON string أو string عادي)
      try {
        const parsed = JSON.parse(name || '{}');
        nameStr = parsed.en || parsed.ar || name || '';
      } catch {
        nameStr = name || '';
      }

      // Normalize الاسم (إزالة المسافات الزائدة وتحويل لحروف صغيرة)
      const normalized = nameStr.toLowerCase().trim();

      // Mapping بين الأسماء والـ routes الرئيسية
      if (normalized.includes('goalkeeper') && normalized.includes('gloves')) {
        return '/GoalkeeperGloves';
      }
      if (normalized.includes('football') && normalized.includes('boots')) {
        return '/FootballBoots';
      }
      if (normalized.includes('goalkeeper') && normalized.includes('apparel')) {
        return '/Goalkeeperapparel';
      }
      if (normalized.includes('goalkeeper') && normalized.includes('equipment')) {
        return '/Goalkeeperequipment';
      }
      if (normalized.includes('teamsport')) {
        return '/Teamsport';
      }
      if (normalized.includes('sale')) {
        return '/Sale';
      }

      return null;
    };

    // 🔹 البحث عن الـ parent category من categories
    const parentCategory = categories.find((cat) => {
      return String(cat.id) === String(parentId) || cat.id === parentId;
    });

    // 🔹 الحصول على الـ route الرئيسي من اسم الـ parent
    const route = getParentRoute(parentName || parentCategory?.name);

    if (route) {
      // Navigate to main category page
      router.push(route, { scroll: false });
      console.log("✅ Navigating to parent category page:", route, parentName);
      if (setIsOpen) setIsOpen(false); // إغلاق الـ drawer على الموبايل
    } else {
      // Fallback: استخدام products/slug إذا لم نجد route رئيسي
      if (parentCategory?.slug) {
        const slug = encodeURIComponent(parentCategory.slug);
        router.push(`/products/${slug}`, { scroll: false });
        console.log("✅ Navigating to products page:", `/products/${slug}`);
        if (setIsOpen) setIsOpen(false);
      } else {
        // Fallback: toggle للفتح/الإغلاق إذا لم يتم العثور على route أو slug
        console.warn("⚠️ Parent category not found or missing route for ID:", parentId, "Name:", parentName);
        const parentFromParentCategories = parentCategories.find(item => 
          String(item.parent?.id) === String(parentId) || item.parent?.id === parentId
        );
        
        if (parentFromParentCategories?.parent?.name) {
          console.log("ℹ️ Found parent but no route, toggling instead");
        }
        
        if (openParentId === parentId) {
          setOpenParentId(null);
        } else {
          setOpenParentId(parentId);
        }
      }
    }
  };

  // دالة التنقل للـ Products مع التأكد من setIsOpen
  const handleSubcategoryClick = (subId) => {
    console.log("Subcategory ID clicked:", subId);
    
    // إذا كان هناك external onSelectCategory، استخدمه
    if (externalOnSelectCategory) {
      externalOnSelectCategory(subId);
      if (setIsOpen) setIsOpen(false);
      return;
    }
    
    // Otherwise, use default behavior
    // 🔹 البحث عن slug من categories وتحويل لصفحة slug
    const selectedCat = categories.find((cat) => {
      // Try to match by id (string or number)
      return String(cat.id) === String(subId) || cat.id === subId;
    });
    
    if (selectedCat?.slug) {
      // Navigate to products page with category slug
      const slug = encodeURIComponent(selectedCat.slug);
      router.push(`/products/${slug}`, { scroll: false });
      console.log("✅ Navigating to:", `/products/${slug}`);
    } else {
      // If no slug found, show error and don't navigate
      console.warn("⚠️ Category not found or missing slug for ID:", subId);
      // Don't navigate to /products (page removed) - stay on current page
    }
    if (setIsOpen) setIsOpen(false); // ← آمنة حتى لو setIsOpen مش موجود
  };

  return (
    <>
      {/* Sidebar للشاشات الكبيرة - يعرض parentCategories مع subcategories (نفس منطق الموبايل) */}
      <aside className={`hidden lg:block bg-black text-white w-full min-h-screen py-4 px-3 font-sans ${isRTL ? "rtl" : "ltr"}`}>
        <SidebarContent
          parentCategories={parentCategories}
          categories={categories}
          openParentId={openParentId}
          handleParentClick={handleParentClick}
          onSelectCategory={handleSubcategoryClick} // Desktop safe
          isRTL={isRTL}
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
              transition={{ duration: 0.3 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              className="fixed top-0 h-full w-64 bg-black text-white z-70 shadow-xl py-4 px-3 font-sans overflow-y-auto lg:hidden flex flex-col"
              initial={{ x: isRTL ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? '100%' : '-100%' }}
              transition={{ type: 'tween', duration: 0.4 }}
              style={{ right: isRTL ? 0 : 'auto', left: isRTL ? 'auto' : 0 }}
            >
              {/* زر الإغلاق */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">{t("Menu")}</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:text-amber-400"
                >
                  <X size={22} />
                </button>
              </div>

              {/* قائمة الأقسام */}
              <SidebarContent
                parentCategories={parentCategories}
                categories={categories}
                openParentId={openParentId}
                handleParentClick={handleParentClick}
                onSelectCategory={handleSubcategoryClick} // Drawer safe
                setIsOpen={setIsOpen}
                isRTL={isRTL}
                t={t}
              />

              {/* أيقونات أسفل الستارة */}
              <div className={`mt-auto pt-4 border-t border-neutral-700 flex flex-col gap-3`}>
                <div className={`flex ${isRTL ? "flex-row-reverse justify-center" : "justify-between"} items-center w-full px-3 gap-4`}>
                  <Link href="/">
                    <Image
                      src="https://static-assets.keepersport.net/dist/82d4dde2fe42e8e4fbfc.svg"
                      alt="LOGO"
                      width={30}
                      height={30}
                      className="object-contain"
                      priority
                    />
                  </Link>

                  {/* <button onClick={openChat} className="text-white hover:text-amber-400 transition-colors duration-200">
                    <FaComments size={20} />
                  </button> */}

                  <button onClick={() => setCartOpen(true)} className="text-white hover:text-amber-400 transition-colors duration-200">
                    <FaShoppingCart size={20} />
                  </button>

                  {user ? (
                    <Link href="/myprofile" className="text-white hover:text-amber-400 transition-colors duration-200" onClick={() => setIsOpen(false)}>
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

// محتوى القائمة - نفس المنطق للموبايل والكمبيوتر
function SidebarContent({ parentCategories, categories, openParentId, handleParentClick, onSelectCategory, isRTL, t }) {
  // 🔹 عرض parentCategories (التي لديها parent و parent.name) مع subcategories المرتبطة بها
  // نفس منطق الموبايل - يعمل على الشاشات الكبيرة أيضاً
  if (parentCategories && parentCategories.length > 0) {
  return (
    <ul className="space-y-1">
      {parentCategories.map(item => {
        const parent = item.parent;
        const subCategories = categories.filter(sub => sub.parent?.id === parent.id);
        const isOpen = openParentId === parent.id;
          const hasSubCategories = subCategories.length > 0;

        return (
          <li key={parent.id} className="border-b border-neutral-700 pb-1">
            <div
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-neutral-700 transition-all rounded"
              onClick={(e) => handleParentClick(parent.id, parent.name, e)}
              dir={isRTL ? "rtl" : "ltr"}
            >
                <span className="text-sm font-medium text-white hover:text-amber-400 transition-colors">
                  {t(parent.name)}
                </span>
                {hasSubCategories && (
                  <div className="flex-shrink-0 chevron-icon">
                    {isOpen ? (
                      <ChevronDown size={16} className="text-neutral-400" />
                    ) : (
                      <ChevronRight size={16} className={`text-neutral-400 ${isRTL ? "rotate-180" : ""}`} />
                    )}
                  </div>
              )}
            </div>

              {isOpen && hasSubCategories && (
                <ul className={`mt-1 mb-2 space-y-0.5 ${isRTL ? "mr-4 ml-0 border-r-2 border-neutral-700" : "ml-4 mr-0 border-l-2 border-neutral-700"} pl-2`}>
                {subCategories
                  .sort((a, b) => {
                    const orderA = a.order ?? 9999;
                    const orderB = b.order ?? 9999;
                    return orderA - orderB;
                  })
                  .map(sub => (
                    <li
                      key={sub.id}
                        className="px-3 py-1.5 text-sm text-neutral-300 cursor-pointer hover:bg-neutral-800 hover:text-white hover:translate-x-1 transition-all rounded"
                        onClick={() => onSelectCategory && onSelectCategory(sub.id)}
                        dir={isRTL ? "rtl" : "ltr"}
                    >
                      {t(sub.name)}
                    </li>
                  ))}
              </ul>
            )}
          </li>
        );
      })}
      </ul>
    );
  }

  // 🔹 Fallback نهائي: عرض جميع categories مباشرة
  return (
    <ul className="space-y-1">
      {categories.map(cat => (
        <li
          key={cat.id}
          className="px-3 py-2 text-sm text-white cursor-pointer hover:bg-neutral-800 hover:text-amber-400 transition-all border-b border-neutral-700"
          onClick={() => onSelectCategory && onSelectCategory(cat.id)}
        >
          {t(cat.name)}
        </li>
      ))}
    </ul>
  );
}