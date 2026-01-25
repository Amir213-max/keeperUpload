'use client';

import { useCurrency } from '../contexts/CurrencyContext';
import PriceDisplay from './PriceDisplay';

const CurrencyExample = () => {
  const { currency, conversionRate, formatPrice, convertPrice } = useCurrency();

  // Example product data
  const exampleProduct = {
    name: "Professional Goalkeeper Gloves",
    price: 89.99, // EUR price
    originalPrice: 129.99, // Original price for sale display
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold text-[#111] mb-6">Currency System Example</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product Card Example */}
        <div className="bg-gray-50 p-6  ">
          <h3 className="text-lg font-semibold text-[#111] mb-4">Product Card</h3>
          <div className="space-y-3">
            <h4 className="font-medium text-[#111]">{exampleProduct.name}</h4>
            <PriceDisplay 
              price={exampleProduct.price}
              originalPrice={exampleProduct.originalPrice}
              size="lg"
            />
          </div>
        </div>

        {/* Currency Info */}
        <div className="bg-gray-50 p-6  ">
          <h3 className="text-lg font-semibold text-[#111] mb-4">Current Settings</h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Selected Currency:</span> {currency}</p>
            <p><span className="font-medium">Conversion Rate:</span> {conversionRate.toFixed(4)}</p>
            <p><span className="font-medium">EUR Price:</span> €{exampleProduct.price.toFixed(2)}</p>
            <p><span className="font-medium">Converted Price:</span> {formatPrice(exampleProduct.price)}</p>
          </div>
        </div>
      </div>

      {/* Usage Examples */}
      <div className="mt-6 p-6 bg-blue-50  ">
        <h3 className="text-lg font-semibold text-[#111] mb-4">Usage Examples</h3>
        <div className="space-y-3 text-sm">
          <div>
            <p className="font-medium text-[#111]">Basic Price Display:</p>
            <code className="bg-gray-200 px-2 py-1 rounded text-xs">
              {`<PriceDisplay price={89.99} />`}
            </code>
            <p className="mt-1">Result: <PriceDisplay price={89.99} /></p>
          </div>
          
          <div>
            <p className="font-medium text-[#111]">With Original Price (Sale):</p>
            <code className="bg-gray-200 px-2 py-1 rounded text-xs">
              {`<PriceDisplay price={89.99} originalPrice={129.99} />`}
            </code>
            <p className="mt-1">Result: <PriceDisplay price={89.99} originalPrice={129.99} /></p>
          </div>
          
          <div>
            <p className="font-medium text-[#111]">Different Sizes:</p>
            <div className="flex items-center space-x-4">
              <span>Small: <PriceDisplay price={89.99} size="sm" /></span>
              <span>Base: <PriceDisplay price={89.99} size="base" /></span>
              <span>Large: <PriceDisplay price={89.99} size="lg" /></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurrencyExample;
