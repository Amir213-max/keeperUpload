'use client';

import { useCurrency } from '@/app/contexts/CurrencyContext';

export default function CurrencyTest() {
  const { currency, conversionRate, loading, error, convertPrice, formatPrice } = useCurrency();

  const testPrice = 100; // EUR 100

  return (
    <div className="fixed bottom-4 left-4 bg-white p-4   shadow-lg border z-50 max-w-sm">
      <h3 className="font-bold text-lg mb-2">Currency Test</h3>
      
      <div className="space-y-2 text-sm">
        <div><strong>Current Currency:</strong> {currency}</div>
        <div><strong>Conversion Rate:</strong> {conversionRate}</div>
        <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
        {error && <div><strong>Error:</strong> {error}</div>}
        
        <div className="border-t pt-2">
          <div><strong>Test Price (EUR 100):</strong></div>
          <div>Converted: {convertPrice(testPrice).toFixed(2)} {currency}</div>
          <div>Formatted: {formatPrice(testPrice)}</div>
        </div>
      </div>
    </div>
  );
}
