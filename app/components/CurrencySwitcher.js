'use client';

import { useState, useRef, useEffect } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import { ChevronDown } from 'lucide-react';

const CurrencySwitcher = () => {
  const { currency, switchCurrency, loading } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currencies = [
    { code: 'EUR', name: '€',  flag: '🇪🇺' },
    { code: 'SAR', name: '﷼', flag: '🇸🇦' },
  ];

  const currentCurrency = currencies.find(c => c.code === currency);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCurrencySelect = (currencyCode) => {
    console.log('🔄 Switching currency to:', currencyCode);
    switchCurrency(currencyCode);
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-1 px-2 py-1 text-xs">
        <div className="animate-spin   h-3 w-3 border-b-2 border-[#FFD300]"></div>
        <span className="text-[#666]">Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* الزر الرئيسي */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center bg-black text-white border border-gray-600   shadow-sm hover:border-[#FFD300] transition-all duration-200 text-sm sm:text-base px-2 py-1"
        aria-label="Select currency"
      >
        {/* <span className="text-base text-white sm:text-base">{currentCurrency?.flag}</span> */}
        <span className=" text-white ml-1">{currentCurrency?.name}</span>
        {/* <span className="ml-1 text-white">{currentCurrency?.symbol}</span> */}
        <ChevronDown
          size={14}
          className={`text-white transition-transform duration-200 ml-1 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* القائمة المنسدلة */}
      {isOpen && (
        <div className="absolute text-white right-0 mt-1 w-12 sm:w-12 bg-gray-900 border border-gray-600   shadow-lg z-50 overflow-hidden text-sm">
          {currencies.map((curr) => (
            <button
              key={curr.code}
              onClick={() => handleCurrencySelect(curr.code)}
              className={`w-full flex text-white items-center space-x-2 px-2 cursor-pointer py-2 hover:bg-gray-800 transition ${
                currency === curr.code ? 'bg-[#FFD300]/10' : ''
              }`}
            >
              {/* <span className="text-base text-white sm:text-base">{curr.flag}</span> تكبير العلم */}
              <div className="flex-1">
                <div className="flex items-center text-white justify-between">
                  <span className="font-medium text-white">{curr.name}</span>
                  {/* <span className="font-medium text-white">{curr.symbol}</span> */}
                  {currency === curr.code && (
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
      
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CurrencySwitcher;
