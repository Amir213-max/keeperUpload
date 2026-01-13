'use client';

import { useCurrency } from '@/app/contexts/CurrencyContext';

export default function PriceDisplay({ 
  price, 
  showCurrency = true, 
  className = "",
  loading = false 
}) {
  const { formatPrice, convertPrice, loading: currencyLoading } = useCurrency();
  
  if (loading || currencyLoading) {
    return <span className={className}>...</span>;
  }

  if (!price || isNaN(price)) {
    return <span className={className}>N/A</span>;
  }

  if (showCurrency) {
    return <span className={className}>{formatPrice(price)}</span>;
  }

  return <span className={className}>{convertPrice(price).toFixed(2)}</span>;
}