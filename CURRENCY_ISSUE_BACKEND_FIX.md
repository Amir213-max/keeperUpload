# Currency Mismatch Issue - Backend Fix Required

## Problem
When placing an order, the Tap payment page shows KWD (Kuwaiti Dinar) as the default currency instead of the user's selected currency (SAR or EUR). This causes price mismatches.

## Root Cause
The backend `CreateOrderWithTapPaymentMutation` is hardcoding or defaulting to KWD when calling the Tap API, instead of using the user's selected currency.

## Current Situation
- Frontend allows users to select EUR or SAR
- Frontend displays prices in the selected currency
- Backend GraphQL schema (`TapPaymentInput`) does NOT have a `currency` field
- Backend defaults to KWD when calling Tap API
- This causes the Tap payment page to show wrong currency and potentially wrong amounts

## Backend Fix Required

### Option 1: Add Currency Field to TapPaymentInput (Recommended)

1. **Update GraphQL Schema** (`schema.graphql`):
```graphql
input TapPaymentInput {
    cart_id: ID!
    shipping_cost: Float
    shipping_type: String
    shipping_country_id: ID
    shipping_address: AddressInput
    billing_address: AddressInput
    customer_email: String
    customer_phone: String
    redirect_url: String!
    webhook_url: String!
    tags: [String!]
    tracking_urls: [String!]
    published: Boolean
    currency: String  # ✅ Add this field
}
```

2. **Update Mutation to Accept and Use Currency**:
```php
// In App\GraphQL\Mutations\CreateOrderWithTapPaymentMutation

public function __invoke($_, array $args)
{
    $input = $args['input'];
    
    // Get currency from input, with fallback logic
    $currency = $input['currency'] ?? $this->determineCurrency($input);
    
    // Validate currency
    $supportedCurrencies = ['SAR', 'EUR', 'KWD', 'USD'];
    if (!in_array($currency, $supportedCurrencies)) {
        $currency = 'SAR'; // Default fallback
    }
    
    // Create order
    $order = $this->createOrder($input);
    
    // Calculate amount in smallest currency unit
    $orderTotal = $order->total_amount;
    $smallestUnitMultiplier = ($currency === 'KWD') ? 1000 : 100;
    $amountInSmallestUnit = (int) round($orderTotal * $smallestUnitMultiplier);
    
    // Prepare Tap API payload with correct currency
    $tapPayload = [
        'amount' => $amountInSmallestUnit,
        'currency' => $currency, // ✅ Use currency from input, not hardcoded
        'customer' => [
            'first_name' => $input['shipping_address']['first_name'] ?? 'Customer',
            'last_name' => $input['shipping_address']['last_name'] ?? '',
            'email' => $input['customer_email'],
            'phone' => [
                'country_code' => '966',
                'number' => preg_replace('/[^0-9]/', '', $input['customer_phone']),
            ],
        ],
        'source' => ['id' => 'src_all'],
        'redirect' => ['url' => $input['redirect_url']],
        'threeDSecure' => true,
        'save_card' => false,
        'description' => "Order #{$order->number}",
        'metadata' => [
            'order_id' => (string) $order->id,
            'currency' => $currency,
        ],
    ];
    
    // Call Tap API
    // ... rest of implementation
}

private function determineCurrency($input)
{
    // Fallback logic: determine currency from shipping country
    $countryCode = $input['shipping_country_id'] ?? null;
    
    // If shipping to Saudi Arabia, use SAR
    if ($countryCode == 'SA' || $countryCode == 1) { // Adjust ID based on your DB
        return 'SAR';
    }
    
    // Default to SAR for Middle East, EUR for Europe
    return 'SAR';
}
```

### Option 2: Determine Currency from Order/Cart (Alternative)

If you can't add currency to the input, determine it from the order or cart:

```php
// After creating the order
$order = $this->createOrder($input);

// Determine currency from cart items or shipping country
$currency = 'SAR'; // Default

// Option A: From shipping country
$shippingCountry = $order->shipping_country;
if ($shippingCountry && $shippingCountry->code === 'SA') {
    $currency = 'SAR';
} elseif ($shippingCountry && in_array($shippingCountry->code, ['DE', 'FR', 'IT'])) {
    $currency = 'EUR';
}

// Option B: From cart items currency (if stored)
$cart = $order->cart;
if ($cart && $cart->currency) {
    $currency = $cart->currency;
}

// Use $currency when calling Tap API
```

## Important Notes

1. **Currency Conversion**: If your order amounts are stored in EUR but user selected SAR, you may need to convert:
   ```php
   if ($currency === 'SAR' && $order->currency !== 'SAR') {
       $conversionRate = 4.0; // 1 EUR = 4 SAR (adjust based on your rates)
       $orderTotal = $order->total_amount * $conversionRate;
   }
   ```

2. **Smallest Currency Unit**: Tap API requires amounts in smallest unit:
   - SAR, EUR, USD: multiply by 100 (fils/cents)
   - KWD: multiply by 1000 (fils)

3. **Supported Currencies**: Tap API supports: SAR, KWD, AED, BHD, OMR, JOD, EGP, USD, EUR, GBP

## Testing Checklist

- [ ] Test with EUR currency selection → Tap should show EUR
- [ ] Test with SAR currency selection → Tap should show SAR
- [ ] Verify Tap payment page shows correct currency
- [ ] Verify Tap payment page shows correct amount
- [ ] Test currency conversion if applicable
- [ ] Verify order is saved with correct currency

## Frontend Status

The frontend is ready and will pass the currency once the backend schema is updated. Currently, the frontend does NOT send currency to avoid the GraphQL error.

