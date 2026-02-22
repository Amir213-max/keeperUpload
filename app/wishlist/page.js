"use client";

import { useEffect, useState } from "react";
import { graphqlClient } from "../lib/graphqlClient";
import { gql } from "graphql-request";
import Link from "next/link";
import { useCurrency } from "../contexts/CurrencyContext";
import PriceDisplay from "../components/PriceDisplay";
import Loader from "../Componants/Loader";

const GET_WISHLIST = gql`
  query GetWishlist($id: ID!) {
    wishlist(id: $id) {
      id
      name
      items_count
      products {
        id
        name
        sku
        images
        list_price_amount
        list_price_currency
        price_range_exact_amount
        brand {
          name
        }
      }
    }
  }
`;

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState(null);
  const [loading, setLoading] = useState(true);
  const { loading: currencyLoading } = useCurrency();

  // ⚠️ هنا لازم تستخدم الـ wishlist id اللي بيرجع من الـ API
  const wishlistId = "1"; 

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const data = await graphqlClient.request(GET_WISHLIST, { id: wishlistId });
        setWishlist(data.wishlist);
      } catch (error) {
        console.error("Error fetching wishlist:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [wishlistId]);

  if (loading) return <Loader />;
  if (!wishlist) return <p className="text-center mt-10">No wishlist found.</p>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        ❤️ {wishlist.name} ({wishlist.items_count} items)
      </h1>

      {wishlist.products.length === 0 ? (
        <p className="text-gray-600">No products in your wishlist yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {wishlist.products.map((product) => (
            <div
              key={product.id}
              className="bg-white shadow-md   overflow-hidden hover:shadow-lg transition"
            >
              {/* صورة المنتج */}
              {product.images?.[0] && (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />
              )}

              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-700">
                  {product.brand_name}
                </h3>
                <p className="text-sm text-gray-500 mb-2">{product.name}</p>

                <div className="text-center">
                
                    {product.list_price_amount !== product.price_range_exact_amount && (
                      <div className="line-through text-gray-500 text-sm">
                        <PriceDisplay price={product.list_price_amount} loading={currencyLoading} />
                      </div>
                    )}
                    <span className="text-lg font-bold text-neutral-900">
                      <PriceDisplay price={product.price_range_exact_amount} loading={currencyLoading} />
                    </span>
                 

                </div>

                <Link
                  href={`/product/${encodeURIComponent(product.sku)}`}
                  className="block mt-3 text-center text-sm bg-[#1f2323] text-white py-2   hover:bg-black"
                >
                  View Product
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
