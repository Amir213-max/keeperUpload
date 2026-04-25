"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import Sidebar from "../Componants/sidebar";
import BrandsSlider from "../Componants/brandsSplide_1";
import FilterDropdown from "../Componants/CheckboxDropdown ";
import ProductSlider from "../Componants/ProductSlider";
import { useTranslation } from "../contexts/TranslationContext";
import { graphqlClient } from "../lib/graphqlClient";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { ADD_TO_WISHLIST } from "../lib/mutations";
import PriceDisplay from "../components/PriceDisplay";
import DynamicText from "../components/DynamicText";
import { useRouter, useSearchParams } from "next/navigation";
import { flattenCategoriesWithParentRefs } from "../lib/categoryResolve";

export default function ProductsPageLayout({
  products,
  brands,
  attributeValues,
  pageTitle,
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const isRTL = language === "ar";

  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [wishlistIds, setWishlistIds] = useState([]);

  const wishlistId = user?.defaultWishlist?.id || user?.wishlists?.[0]?.id;
  const productsPerPage = 20;
  const [currentPage, setCurrentPage] = useState(1);
// Currency handling is now managed by CurrencyContext

  // Fetch wishlist items
  useEffect(() => {
    if (!wishlistId) return;
    const fetchWishlist = async () => {
      try {
        const res = await graphqlClient.request(ADD_TO_WISHLIST, { wishlistId });
        const ids = res?.wishlist?.items?.map((item) => String(item.product.id)) || [];
        setWishlistIds(ids);
      } catch (error) {
        console.error("Wishlist error:", error);
      }
    };
    fetchWishlist();
  }, [wishlistId]);

  const handleAddToWishlist = async (productId) => {
    if (!user) return toast.error("You must be logged in");
    if (wishlistIds.includes(String(productId))) return toast("Already added ❤️");
    try {
      const res = await graphqlClient.request(ADD_TO_WISHLIST, {
        input: { wishlist_id: wishlistId, product_id: productId },
      });
      if (res?.addToWishlist?.success) {
        toast.success("Added to wishlist");
        setWishlistIds((prev) => [...prev, String(productId)]);
      }
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  // 🔹 قراءة الفلاتر من URL عند تحميل الصفحة
  useEffect(() => {
    const brandFromUrl = searchParams.get("brand");
    if (brandFromUrl) setSelectedBrand(brandFromUrl);

    const categoryFromUrl = searchParams.get("category");
    if (categoryFromUrl) setSelectedCategoryId(categoryFromUrl);

    const attrs = {};
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("attr_")) {
        attrs[key.replace("attr_", "")] = value.split(",");
      }
    }
    setSelectedAttributes(attrs);
  }, [searchParams]);

  // Fetch categories (replace GET_CATEGORIES_QUERY if needed)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await graphqlClient.request(/* GET_CATEGORIES_QUERY */);
        setCategories(data.rootCategories || []);
      } catch (error) {
        console.error("Categories fetch error:", error);
      }
    };
    fetchCategories();
  }, []);

  // 🔹 فلترة المنتجات حسب الفلاتر
  useEffect(() => {
    const result = products.filter((product) => {
      const brandMatch = !selectedBrand || product.brand_name === selectedBrand;

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

      return brandMatch && attributesMatch;
    });

    setFilteredProducts(result);
    setCurrentPage(1);
  }, [products, selectedBrand, selectedAttributes]);

  // 🔹 تحديث الـ URL عند تغيير الفلاتر
  useEffect(() => {
    const params = new URLSearchParams();

    if (selectedBrand) params.set("brand", selectedBrand);
    if (selectedCategoryId) params.set("category", selectedCategoryId);

    Object.entries(selectedAttributes).forEach(([attr, values]) => {
      if (values.length) params.set(`attr_${attr}`, values.join(","));
    });

    router.replace(`?${params.toString()}`, { scroll: false });
  }, [selectedBrand, selectedCategoryId, selectedAttributes, router]);

  const categoriesForSidebar = useMemo(
    () => flattenCategoriesWithParentRefs(categories),
    [categories]
  );

  // 🔹 ضبط اسم التصنيف المحدد
  useEffect(() => {
    const cat = categoriesForSidebar.find((c) => String(c.id) === String(selectedCategoryId));
    setSelectedCategoryName(cat?.name || null);
  }, [selectedCategoryId, categoriesForSidebar]);

  const indexOfLast = currentPage * productsPerPage;
  const indexOfFirst = indexOfLast - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const paginationSegments = useMemo(() => {
    if (totalPages <= 1) return [];
    const p = Math.max(1, Math.min(currentPage, totalPages));
    const set = new Set([1, totalPages]);
    const lo = Math.max(1, p - 2);
    const hi = Math.min(totalPages, p + 2);
    for (let i = lo; i <= hi; i += 1) set.add(i);
    const sorted = Array.from(set).sort((a, b) => a - b);
    const out = [];
    let prev = 0;
    for (const n of sorted) {
      if (prev > 0 && n - prev > 1) {
        out.push({ type: "gap", key: `gap-${prev}-${n}` });
      }
      out.push({ type: "page", n, key: `p-${n}` });
      prev = n;
    }
    return out;
  }, [currentPage, totalPages]);

  const getBadgeColor = (label) => {
    if (!label) return "bg-gray-400";
    if (label.toLowerCase().includes("new")) return "bg-green-500";
    if (label.includes("%") || label.toLowerCase().includes("off")) return "bg-red-500";
    return "bg-yellow-500";
  };

  const handleCategorySelect = (catId) => {
    if (catId === selectedCategoryId) {
      setSelectedCategoryId(null);
      setSelectedCategoryName(null);
    } else {
      setSelectedCategoryId(catId);
      const cat = categoriesForSidebar.find((c) => String(c.id) === String(catId));
      setSelectedCategoryName(cat?.name || null);
    }
    setSidebarOpen(false);
  };

  return (
    <div className={`bg-[#373e3e] min-h-screen ${isRTL ? "rtl" : "ltr"}`}>
      {/* Mobile Top bar */}
      <div className="block lg:hidden bg-[#1f2323] px-4 py-3 sticky top-0 z-30 flex justify-between items-center">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-white bg-yellow-500 px-3 py-1   font-semibold"
        >
          ☰ {t("Filters")}
        </button>
        <h2 className="text-white font-bold text-lg">
          {selectedCategoryName || pageTitle}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
        {/* Sidebar desktop */}
        <div className="hidden lg:block lg:col-span-1 bg-[#1f2323] h-auto p-2">
          <Sidebar
            categories={categoriesForSidebar}
            onSelectCategory={handleCategorySelect}
          />
        </div>

        {/* Main content */}
        <div className="lg:col-span-4 bg-white p-4 sm:p-6  ">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1f2323] mb-4">
            {selectedCategoryName || pageTitle}
          </h1>

          {brands.length > 1 && !selectedCategoryId && (
            <BrandsSlider
              brands={brands}
              selectedBrand={selectedBrand}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {currentProducts.map((product) => (
              <Link
                key={product.sku}
                href={`/product/${encodeURIComponent(product.sku)}`}
                className="bg-gradient-to-br from-white to-neutral-200   shadow-md overflow-hidden flex flex-col relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1 block group"
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
                {/* Product Badge */}
              {product.productBadges?.length > 0 &&
  product.productBadges[0]?.label && (
    <div
      className="absolute top-3 left-[-20px] w-[90px] text-center text-white text-xs font-bold py-1 rotate-[-45deg] shadow-md z-10"
      style={{
        backgroundColor: product.productBadges[0]?.color || "#888", // fallback gray if no color
      }}
    >
      {product.productBadges[0].label}
    </div>
  )}


                <ProductSlider images={product.images} productName={product.name} />

                <div className="p-4 flex flex-col flex-grow justify-between">
                  <div className="bg-neutral-400 text-amber-100 text-xs font-semibold w-fit px-3 py-1   mb-3">
                    {(product.rootCategories || []).map((cat, idx) => (
                      <span key={cat.id}>
                        {idx > 0 && ', '}
                        <DynamicText>{cat.name}</DynamicText>
                      </span>
                    ))}
                  </div>

                  <h3 className="text-base text-gray-700 text-center font-bold mb-1">
                    <DynamicText>{product.brand_name || ''}</DynamicText>
                  </h3>

                  <p className="text-center text-sm text-gray-500 line-clamp-2 mb-3">
                    <DynamicText>{product.name || ''}</DynamicText>
                  </p>

                  <div className="text-center">
                    <PriceDisplay 
                      price={product.price_range_exact_amount}
                      originalPrice={product.list_price_amount !== product.price_range_exact_amount ? product.list_price_amount : null}
                      size="lg"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination — windowed page numbers to limit DOM when totalPages is large */}
          {totalPages > 1 && (
            <nav
              className="mt-6 flex flex-wrap items-center justify-center gap-2"
              aria-label="Pagination"
            >
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="min-h-11 min-w-[5.5rem] cursor-pointer rounded-full border border-neutral-200 bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50 sm:text-base touch-manipulation"
              >
                Prev
              </button>

              {paginationSegments.map((item) =>
                item.type === "gap" ? (
                  <span
                    key={item.key}
                    className="flex h-11 min-w-[2rem] items-center justify-center text-sm font-medium text-neutral-400"
                    aria-hidden
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setCurrentPage(item.n)}
                    className={`flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors sm:text-base touch-manipulation ${
                      currentPage === item.n
                        ? "bg-[#1f2323] text-white shadow-md"
                        : "border border-neutral-200 bg-gray-100 text-gray-700 hover:border-[#1f2323] hover:bg-neutral-50"
                    }`}
                    aria-label={`Page ${item.n}`}
                    aria-current={currentPage === item.n ? "page" : undefined}
                  >
                    {item.n}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="min-h-11 min-w-[5.5rem] cursor-pointer rounded-full border border-neutral-200 bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50 sm:text-base touch-manipulation"
              >
                Next
              </button>
            </nav>
          )}
        </div>
      </div>

      {/* Sidebar drawer for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 flex">
          <div className="bg-[#1f2323] w-3/4 sm:w-2/4 p-4 overflow-y-auto">
            <Sidebar
              isOpen={sidebarOpen}
              categories={categoriesForSidebar}
              onSelectCategory={handleCategorySelect}
              setIsOpen={setSidebarOpen}
            />
          </div>
          <div className="flex-1" onClick={() => setSidebarOpen(false)}></div>
        </div>
      )}
    </div>
  );
}
