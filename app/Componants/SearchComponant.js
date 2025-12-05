'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { graphqlClient } from '../lib/graphqlClient';
import { SEARCH_PRODUCTS_QUERY } from '../lib/queries';
import Link from 'next/link';
import Image from 'next/image';
import { useCurrency } from '../contexts/CurrencyContext';
import PriceDisplay from '../components/PriceDisplay';
import Loader from './Loader';

export default function SearchComponent({ onClose }) {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const router = useRouter();
  const searchRef = useRef(null);
  const { loading: currencyLoading } = useCurrency();

  // ✅ البحث مع debounce
  useEffect(() => {
    if (!searchText.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await graphqlClient.request(SEARCH_PRODUCTS_QUERY, {
          query: searchText.trim(),
          limit: 10,
        });
        setResults(data.productsSearch || []);
        setShowResults(true);
      } catch (error) {
        console.error('Error searching products:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300); // ✅ debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [searchText]);

  // ✅ إغلاق عند الضغط خارج
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchText.trim() && results.length > 0) {
      // ✅ الانتقال لأول نتيجة أو صفحة المنتج
      router.push(`/product/${encodeURIComponent(results[0].sku)}`);
      onClose();
    }
  };

  const handleProductClick = (sku) => {
    router.push(`/product/${encodeURIComponent(sku)}`);
    onClose();
  };

  return (
    <>
      {/* خلفية شفافة تغطي الشاشة */}
      <div
        className="fixed inset-0 bg-black opacity-80 z-40"
        onClick={onClose}
      ></div>

      {/* مربع البحث */}
      <div
        ref={searchRef}
        className="fixed animate-slide-down top-7 left-1/2 transform -translate-x-1/2 bg-black rounded shadow-lg z-50 w-[90%] max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="p-3 flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search for a product"
              className="border border-gray-300 px-3 py-2 rounded text-white text-sm w-full focus:outline-none focus:ring-2 focus:ring-yellow-400"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              autoFocus
            />
            {searchText && (
              <button
                type="button"
                onClick={() => {
                  setSearchText('');
                  setResults([]);
                  setShowResults(false);
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FaTimes size={14} />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="bg-yellow-400 text-black px-4 py-2 rounded text-sm font-bold hover:bg-yellow-500 transition-colors"
          >
            <FaSearch />
          </button>
        </form>

        {/* ✅ نتائج البحث */}
        {showResults && (
          <div className="max-h-96 overflow-y-auto border-t border-gray-200">
            {loading ? (
              <div className="p-4 text-center">
                <Loader />
              </div>
            ) : results.length > 0 ? (
              <div className="p-2">
                {results.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleProductClick(product.sku)}
                    className="flex items-center gap-3 p-3 hover:bg-neutral-900 cursor-pointer rounded transition-colors"
                  >
                    {/* صورة المنتج */}
                    {product.images?.[0] && (
                      <div className="relative w-16 h-16 flex-shrink-0">
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          fill
                          className="object-contain rounded"
                          unoptimized
                        />
                      </div>
                    )}
                    {/* معلومات المنتج */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-200 truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-100">SKU: {product.sku}</p>
                      {product.brand?.name && (
                        <p className="text-xs text-gray-200">{product.brand.name}</p>
                      )}
                    </div>
                    {/* السعر */}
                    <div className="text-right">
                      <PriceDisplay
                        price={product.price_range_exact_amount || product.list_price_amount}
                        loading={currencyLoading}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : searchText.trim() ? (
              <div className="p-4 text-center text-gray-200">
                <p>لا توجد نتائج للبحث "{searchText}"</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
