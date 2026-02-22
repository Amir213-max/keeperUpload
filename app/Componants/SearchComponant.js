'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { graphqlRequest } from '../lib/graphqlClientHelper';
import { SEARCH_PRODUCTS_QUERY } from '../lib/queries';
import Link from 'next/link';
import Image from 'next/image';
import { useCurrency } from '../contexts/CurrencyContext';
import PriceDisplay from '../components/PriceDisplay';
import Loader from './Loader';
import DynamicText from '../components/DynamicText';

/**
 * Detect if text contains Arabic characters
 */
function isArabic(text) {
  if (!text || typeof text !== 'string') return false;
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F]/;
  return arabicRegex.test(text);
}

/**
 * Translate Arabic text to English using the translation API
 */
async function translateToEnglish(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return text;
  }

  if (!isArabic(text)) {
    return text; // Return as is if not Arabic
  }

  try {
    console.log('🌐 Translating Arabic to English:', text);
    
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.trim(),
        target: 'en', // Translate Arabic to English
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('⚠️ Translation API response not OK:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      // Try to return original text, but also try searching with it
      return text;
    }

    const data = await response.json();
    const translated = data?.translatedText || text;
    
    console.log('✅ Translation result:', {
      original: text,
      translated: translated,
      success: translated !== text
    });
    
    // If translation failed or returned same text, return original
    if (!translated || translated.trim() === '' || translated === text) {
      console.warn('⚠️ Translation returned empty or same text, using original');
      return text;
    }
    
    return translated;
  } catch (error) {
    console.error('❌ Translation error:', error);
    // Fallback to original text
    return text;
  }
}

export default function SearchComponent({ onClose }) {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const router = useRouter();
  const searchRef = useRef(null);
  const { loading: currencyLoading } = useCurrency();

  // ✅ البحث مع debounce وترجمة الاستعلامات العربية
  useEffect(() => {
    if (!searchText.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        // ✅ إذا كان البحث بالعربية، نترجمه للإنجليزية أولاً
        let searchQuery = searchText.trim();
        const originalQuery = searchQuery;
        
        if (isArabic(searchQuery)) {
          console.log('🔍 Arabic search detected:', searchQuery);
          const translatedQuery = await translateToEnglish(searchQuery);
          
          if (translatedQuery && translatedQuery !== searchQuery && translatedQuery.trim() !== '') {
            console.log('✅ Using translated query:', translatedQuery);
            searchQuery = translatedQuery;
          } else {
            console.warn('⚠️ Translation failed or returned same text, trying original query');
            // Try with original Arabic text as fallback
            searchQuery = originalQuery;
          }
        }

        console.log('🔎 Searching with query:', searchQuery);

        // Use API route proxy to avoid CORS issues
        const data = await graphqlRequest(SEARCH_PRODUCTS_QUERY, {
          query: searchQuery,
          limit: 10,
        });
        
        const products = data?.productsSearch || [];
        console.log('📦 Search results:', {
          count: products.length,
          query: searchQuery,
          originalQuery: originalQuery,
          products: products.map(p => p.name)
        });
        
        // If no results with translated query and original was Arabic, try partial search
        if (products.length === 0 && isArabic(originalQuery) && searchQuery !== originalQuery) {
          console.log('⚠️ No results with translated query, trying partial search...');
          // Try searching with individual words from the translation
          const words = searchQuery.split(/\s+/).filter(w => w.length > 2);
          if (words.length > 0) {
            // Try searching with the first meaningful word
            const partialQuery = words[0];
            console.log('🔍 Trying partial search with:', partialQuery);
            try {
              const partialData = await graphqlRequest(SEARCH_PRODUCTS_QUERY, {
                query: partialQuery,
                limit: 10,
              });
              const partialProducts = partialData?.productsSearch || [];
              if (partialProducts.length > 0) {
                console.log('✅ Found', partialProducts.length, 'results with partial search');
                setResults(partialProducts);
                setShowResults(true);
                return;
              }
            } catch (partialError) {
              console.warn('Partial search failed:', partialError);
            }
          }
        }
        
        setResults(products);
        setShowResults(true);
      } catch (error) {
        console.error('❌ Error searching products:', error);
        setResults([]);
        setShowResults(true); // Show "no results" message
      } finally {
        setLoading(false);
      }
    }, 500); // ✅ زيادة debounce إلى 500ms لإعطاء وقت للترجمة

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
                        <DynamicText>{product.name}</DynamicText>
                      </p>
                      <p className="text-xs text-gray-100">SKU: {product.sku}</p>
                      {product.brand_name && (
                        <p className="text-xs text-gray-200">
                          <DynamicText>{product.brand_name}</DynamicText>
                        </p>
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
