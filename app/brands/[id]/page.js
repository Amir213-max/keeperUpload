'use client';

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { graphqlClient } from "../../lib/graphqlClient";
import { gql } from "graphql-request";
import { useTranslation } from "../../contexts/TranslationContext";
import { useAuth } from "../../contexts/AuthContext";
import Sidebar from "../../Componants/sidebar";
import FilterDropdown from "../../Componants/CheckboxDropdown ";
import ProductSlider from "../../Componants/ProductSlider";

import toast from "react-hot-toast";
import { ADD_TO_WISHLIST } from "../../lib/mutations";
import { GET_WISHLIST_ITEMS } from "../../lib/queries";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useCurrency } from "@/app/contexts/CurrencyContext";
import PriceDisplay from "@/app/components/PriceDisplay";
import DynamicText from "@/app/components/DynamicText";
import Loader from "../../Componants/Loader";
import { PRODUCTS_BY_BRAND_QUERY } from "../../lib/queries";

export default function BrandPage() {
  const params = useParams();
  // ✅ Handle id from params (could be string or array in Next.js)
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { t } = useTranslation();
  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [wishlistIds, setWishlistIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const wishlistId = user?.defaultWishlist?.id || user?.wishlists?.[0]?.id;
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 20;
 const { loading: currencyLoading } = useCurrency();
const [currencyRate, setCurrencyRate] = useState(null);

  // ✅ جلب كل البيانات بشكل متوازي لتحسين الأداء
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const fetchAllData = async () => {
      try {
        // ✅ Convert id to string if needed and ensure it's valid
        const brandId = String(id).trim();
        if (!brandId) {
          setLoading(false);
          return;
        }

        // ✅ جلب كل البيانات في نفس الوقت (متوازي)
        const [productsData, currencyRateData, wishlistData] = await Promise.allSettled([
          graphqlClient.request(PRODUCTS_BY_BRAND_QUERY, { 
            brand_id: brandId, // ✅ استخدام brand_id مباشرة (يمكن أن يكون ID أو اسم البراند مثل "Jako")
          }),
          import("../../lib/getCurrencyRate").then((mod) => mod.getCurrencyRate()),
          wishlistId
            ? graphqlClient.request(GET_WISHLIST_ITEMS, { wishlistId })
            : Promise.resolve(null),
        ]);

        // ✅ معالجة نتائج المنتجات - تحويل البيانات من الـ query الجديد
        if (productsData.status === "fulfilled") {
          const rawProducts = productsData.value?.productsByBrand || [];
          
          // ✅ تحويل البيانات إلى الشكل المطلوب
          const products = rawProducts.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            url: p.url,
            list_price_amount: p.list_price_amount || 0,
            price_range_exact_amount: p.price_range_exact_amount || p.list_price_amount || 0,
            price_range_from: p.price_range_from,
            price_range_to: p.price_range_to,
            price_range_currency: p.price_range_currency,
            offer_price_amount: p.offer_price_amount,
            offer_discount_percentage: p.offer_discount_percentage,
            images: Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []),
            number_of_images: p.number_of_images,
            brand: {
              id: p.brand_name ? brandId : null,
              name: p.brand_name || '',
            },
            brand_name: p.brand_name,
            brand_logo_url: p.brand_logo_url,
            is_online: p.is_online,
            published: p.published,
            productAttributeValues: p.productAttributeValues || [],
            variants: p.variants || [],
            // ✅ حساب productBadges من offer_discount_percentage
            productBadges: p.offer_discount_percentage 
              ? [{ label: `${p.offer_discount_percentage}%`, color: '#888' }]
              : [],
          }));
          
          setProducts(products);
          setFilteredProducts(products);
          if (products.length === 0) {
            console.warn(`No products found for brand ID: ${brandId}`);
          }
        } else {
          console.error("Error fetching products:", productsData.reason);
          setProducts([]);
          setFilteredProducts([]);
        }

        // ✅ معالجة نتائج العملة
        if (currencyRateData.status === "fulfilled") {
          setCurrencyRate(currencyRateData.value);
        }

        // ✅ معالجة نتائج الـ wishlist
        if (wishlistData.status === "fulfilled" && wishlistData.value) {
          const ids =
            wishlistData.value?.wishlist?.items?.map((item) => String(item.product.id)) || [];
          setWishlistIds(ids);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setProducts([]);
        setFilteredProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [id, wishlistId, user]);

  // ➕ Add to Wishlist
  async function handleAddToWishlist(productId) {
    if (!user) {
      toast.error("❌ You must be logged in to add to wishlist");
      return;
    }
    if (wishlistIds.includes(String(productId))) {
      toast("⚠️ Product already in wishlist");
      return;
    }

    try {
      const variables = { input: { wishlist_id: wishlistId, product_id: productId } };
      const res = await graphqlClient.request(ADD_TO_WISHLIST, variables);
      if (res?.addToWishlist?.success) {
        toast.success("✅ Added to wishlist!");
        setWishlistIds((prev) => [...prev, String(productId)]);
      } else toast.error(res?.addToWishlist?.message || "❌ Failed");
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      toast.error("❌ Something went wrong!");
    }
  }

  // 🎛️ Prepare dynamic filter attributes
  const attributeValues = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      (p.productAttributeValues || []).forEach((attr) => {
        const label = attr.attribute?.label;
        const val = attr.key;
        if (label && val) {
          if (!map[label]) map[label] = new Set();
          map[label].add(val);
        }
      });
    });
    return Object.entries(map).map(([attribute, values]) => ({
      attribute,
      values: Array.from(values),
    }));
  }, [products]);

  // 🧮 Filter products by attributes
  useEffect(() => {
    const result = products.filter((product) => {
      const attrs = product.productAttributeValues || [];
      return Object.entries(selectedAttributes).every(([label, vals]) => {
        if (!vals.length) return true;
        const selectedLower = vals.map((v) => String(v).toLowerCase());
        return attrs.some(
          (pav) =>
            String(pav.attribute?.label || "").toLowerCase() ===
              String(label).toLowerCase() &&
            selectedLower.includes(String(pav.key ?? "").toLowerCase())
        );
      });
    });
    setFilteredProducts(result);
    setCurrentPage(1);
  }, [selectedAttributes, products]);

  // 📄 Pagination
  const indexOfLast = currentPage * productsPerPage;
  const indexOfFirst = indexOfLast - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const getBadgeColor = (label) => {
    if (!label) return "bg-gray-400";
    if (label.toLowerCase().includes("new")) return "bg-green-500";
    if (label.includes("%") || label.toLowerCase().includes("off")) return "bg-gray-500";
    return "bg-yellow-500";
  };

  if (loading) return <Loader />;

  return (
    <div className="bg-[#373e3e] min-h-screen">
      <div className="grid pt-1 grid-cols-1 lg:grid-cols-5">
        {/* 🧱 Sidebar */}
        <div className="hidden lg:block lg:col-span-1 bg-black h-auto">
          <Sidebar categories={[]} />
        </div>

        {/* 🛍️ Main Section */}
        <div className="md:col-span-4 p-4 bg-white">
          {/* 🔹 Page Title */}
          <h1 className="text-4xl font-bold text-[#1f2323] mb-6">
            {t("Brand Products")}
          </h1>

          {/* 🔹 No Products Message */}
          {!loading && filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                {t("No products found for this brand")}
              </p>
            </div>
          )}

         

          {/* 🔹 Filters Dropdown - Only show if there are products */}
          {filteredProducts.length > 0 && (
          <div className="flex mb-4 mt-4 gap-3 flex-wrap">
            <FilterDropdown
              attributeValues={attributeValues}
              onFilterChange={setSelectedAttributes}
            />
          </div>
          )}

          {/* 🔹 Products Grid - Only show if there are products */}
          {currentProducts.length > 0 && (
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
        key={product.sku}
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
            <DynamicText>{product.brand?.name || ''}</DynamicText>
          </h3>

          <p className="text-center text-sm text-gray-500 line-clamp-2 mb-3">
            <DynamicText>{product.name || ''}</DynamicText>
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
          )}


      {totalPages > 1 && (
  <div className="flex justify-center items-center gap-4 mt-8">
    {/* ◀️ Previous Button */}
    <button
      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
      disabled={currentPage === 1}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-all duration-200 ${
        currentPage === 1
          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
          : "bg-[#1f2323] text-white hover:bg-[#333]"
      }`}
    >
      <span>←</span> Previous
    </button>

    <span className="text-gray-700 font-medium">
      Page {currentPage} of {totalPages}
    </span>

    {/* ▶️ Next Button */}
    <button
      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
      disabled={currentPage === totalPages}
      className={`flex items-center gap-2 px-4 py-2  text-sm font-semibold transition-all duration-200 ${
        currentPage === totalPages
          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
          : "bg-[#1f2323] text-white hover:bg-[#333]"
      }`}
    >
      Next <span>→</span>
    </button>
  </div>
)}

        </div>
      </div>
    </div>
  );
}
