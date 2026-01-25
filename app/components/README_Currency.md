# 💰 Currency System Documentation

## Overview
A professional currency switcher system for KEEPERsport that allows users to switch between EUR and SAR currencies with real-time conversion and localStorage persistence.

## 🏗️ Architecture

### Core Components
- **CurrencyContext** (`app/contexts/CurrencyContext.js`) - React Context for global currency state
- **CurrencySwitcher** (`app/components/CurrencySwitcher.js`) - Professional dropdown component
- **PriceDisplay** (`app/components/PriceDisplay.js`) - Reusable price display component
- **getCurrencyRate** (`app/lib/getCurrencyRate.js`) - API function for EUR→SAR conversion rate

## 🚀 Features

✅ **Real-time Currency Conversion**
- EUR prices converted to SAR using live exchange rate
- Automatic price updates across all components

✅ **Professional UI/UX**
- Clean dropdown with country flags and currency codes
- Hover effects and smooth transitions
- Loading states and error handling

✅ **Persistent Storage**
- Selected currency saved in localStorage
- Maintains user preference across page reloads

✅ **Global State Management**
- React Context for centralized currency state
- Easy integration with any component

## 📦 Installation & Setup

### 1. Provider Setup
The `CurrencyProvider` is already integrated in `app/layout.js`:

```jsx
<CurrencyProvider>
  {/* Your app components */}
</CurrencyProvider>
```

### 2. Navbar Integration
The currency switcher is already added to the navbar in `app/Componants/navbar.js`:

```jsx
import CurrencySwitcher from '../components/CurrencySwitcher';

// In the navbar JSX:
<CurrencySwitcher />
```

## 🎯 Usage Examples

### Basic Price Display
```jsx
import PriceDisplay from '../components/PriceDisplay';

<PriceDisplay price={89.99} />
// Output: "89.99 EUR" or "413.95 SAR" (depending on selected currency)
```

### Sale Price Display
```jsx
<PriceDisplay 
  price={89.99}
  originalPrice={129.99}
  size="lg"
/>
// Shows crossed-out original price and highlighted sale price
```

### Using Currency Context Directly
```jsx
import { useCurrency } from '../contexts/CurrencyContext';

const MyComponent = () => {
  const { currency, formatPrice, convertPrice } = useCurrency();
  
  const eurPrice = 89.99;
  const convertedPrice = convertPrice(eurPrice);
  const formattedPrice = formatPrice(eurPrice);
  
  return (
    <div>
      <p>Currency: {currency}</p>
      <p>Converted: {convertedPrice}</p>
      <p>Formatted: {formattedPrice}</p>
    </div>
  );
};
```

## 🎨 Styling

### Currency Switcher
- **Background**: White with gray border
- **Hover**: Yellow border (`#FFD300`)
- **Focus**: Yellow ring with opacity
- **Dropdown**: Clean white background with hover effects

### Price Display
- **Regular Price**: Black text (`#111`)
- **Sale Price**: Yellow highlight (`#FFD300`)
- **Original Price**: Gray with strikethrough
- **Sizes**: `sm`, `base`, `lg`, `xl`

## 🔧 API Integration

The system uses the existing `getCurrencyRate()` function from `app/lib/getCurrencyRate.js`:

```javascript
// Fetches EUR→SAR conversion rate from GraphQL
const rate = await getCurrencyRate(); // Returns: 4.6 (example)
```

## 📱 Responsive Design

- **Mobile**: Compact dropdown with touch-friendly targets
- **Desktop**: Full dropdown with hover states
- **Tablet**: Optimized spacing and sizing

## 🧪 Testing

### Manual Testing Checklist
- [ ] Currency switcher appears in navbar
- [ ] Dropdown opens/closes properly
- [ ] Currency selection updates prices
- [ ] Selection persists after page reload
- [ ] Loading states display correctly
- [ ] Error handling works (network issues)

### Test Components
Use `app/components/CurrencyExample.js` for testing different scenarios.

## 🔄 Migration Guide

### Before (Old Price Display)
```jsx
// Old hardcoded SAR conversion
<span>SAR {(price * currencyRate).toFixed(2)}</span>
```

### After (New Price Display)
```jsx
// New dynamic currency system
<PriceDisplay price={price} />
```

## 🐛 Troubleshooting

### Common Issues

1. **Currency not switching**
   - Check if `CurrencyProvider` wraps your app
   - Verify localStorage is enabled

2. **Prices not converting**
   - Ensure `getCurrencyRate()` returns valid data
   - Check network connectivity

3. **Styling issues**
   - Verify Tailwind classes are available
   - Check for CSS conflicts

## 🚀 Future Enhancements

- [ ] Add more currencies (USD, GBP, etc.)
- [ ] Real-time exchange rate updates
- [ ] Currency conversion history
- [ ] Admin panel for rate management
- [ ] Analytics for currency usage

## 📞 Support

For issues or questions about the currency system, check:
1. Browser console for errors
2. Network tab for API calls
3. localStorage for saved preferences
4. Component props and context values
