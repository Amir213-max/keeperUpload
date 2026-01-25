'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrencyRate } from '../lib/getCurrencyRate';

const CurrencyContext = createContext();

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export const CurrencyProvider = ({ children }) => {
  // تثبيت العملة على SAR دائماً
  const [currency] = useState('SAR');
  const [conversionRate, setConversionRate] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch conversion rate when component mounts
  useEffect(() => {
    const fetchRate = async () => {
      try {
     
        setLoading(true);
        setError(null);
        const rate = await getCurrencyRate();
     
        setConversionRate(rate);
      } catch (err) {
        console.error('❌ Error loading currency rate:', err);
        setError('Failed to load currency rate');
        // Fallback to default rate
        const fallbackRate = 4.6;
       
        setConversionRate(fallbackRate);
      } finally {
        setLoading(false);
      }
    };

    fetchRate();
  }, []);

  const convertPrice = (eurPrice) => {
    if (!eurPrice || isNaN(eurPrice)) {
      console.warn('⚠️ Invalid price for conversion:', eurPrice);
      return 0;
    }

    // دائماً نحول إلى SAR
    const convertedPrice = eurPrice * conversionRate;
    return convertedPrice;
  };

  const formatPrice = (eurPrice, showCurrency = true) => {
    const convertedPrice = convertPrice(eurPrice);
    const formattedPrice = convertedPrice.toFixed(2);
    
    if (!showCurrency) {
      return formattedPrice;
    }
    
    // دائماً نعرض SAR
    return `${formattedPrice} SAR`;
  };

  const getCurrencySymbol = () => {
    return 'SAR';
  };

  const value = {
    currency, // دائماً 'SAR'
    conversionRate,
    loading,
    error,
    convertPrice,
    formatPrice,
    getCurrencySymbol,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};
