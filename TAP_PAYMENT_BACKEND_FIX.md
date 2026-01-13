# Tap Payment Backend Fix Guide

## Problem
The backend successfully creates the order but fails when calling Tap API, returning:
```
error: "Payment processing failed: Invalid response from Tap payment service"
success: false
payment_url: null
```

## Root Cause
The backend GraphQL resolver (`CreateOrderWithTapPaymentMutation`) is not properly handling the Tap API response or is missing required fields.

## Required Fixes in Backend

### 1. Check Response Status Before Parsing JSON

**Current Issue:** Backend likely tries to parse JSON without checking if response is OK.

**Fix:**
```php
$response = Http::withHeaders([
    'Authorization' => 'Bearer ' . env('TAP_SECRET_KEY'),
    'Content-Type' => 'application/json',
])->post('https://api.tap.company/v2/charges', $tapPayload);

// ✅ ADD THIS CHECK
if (!$response->successful()) {
    $errorData = $response->json();
    Log::error('Tap API Error:', [
        'status' => $response->status(),
        'response' => $errorData
    ]);
    
    return [
        'success' => false,
        'error' => $errorData['message'] ?? $errorData['errors'] ?? 'Invalid response from Tap payment service',
        'order_id' => $order->id,
        'payment_url' => null,
        'transaction_id' => null,
    ];
}
```

### 2. Validate Tap API Response Structure

**Fix:**
```php
$data = $response->json();

// Check for errors in response
if (isset($data['errors'])) {
    Log::error('Tap API Errors:', $data['errors']);
    return [
        'success' => false,
        'error' => $data['errors'][0]['message'] ?? 'Invalid response from Tap payment service',
        'order_id' => $order->id,
        'payment_url' => null,
    ];
}

// Validate transaction URL exists
if (!isset($data['transaction']['url'])) {
    Log::error('Missing transaction URL:', $data);
    return [
        'success' => false,
        'error' => 'Invalid response from Tap payment service - missing payment URL',
        'order_id' => $order->id,
        'payment_url' => null,
    ];
}
```

### 3. Ensure Amount is in Smallest Currency Unit

**Critical:** Tap API requires amount in smallest currency unit (fils for SAR, cents for USD).

**Fix:**
```php
// Calculate order total
$orderTotal = $order->total_amount; // e.g., 100.50 SAR

// Convert to smallest unit (fils for SAR, cents for USD)
$amountInSmallestUnit = (int) round($orderTotal * 100); // 10050 fils

$tapPayload = [
    'amount' => $amountInSmallestUnit, // ✅ Must be integer in smallest unit
    'currency' => 'SAR', // or 'USD', 'KWD', etc.
    // ... rest of payload
];
```

### 4. Include All Required Tap API Fields

**Required Fields:**
```php
$tapPayload = [
    'amount' => $amountInSmallestUnit, // Integer in smallest currency unit
    'currency' => 'SAR', // ISO currency code
    'customer' => [
        'first_name' => $input['shipping_address']['first_name'] ?? 'Customer',
        'last_name' => $input['shipping_address']['last_name'] ?? '',
        'email' => $input['customer_email'],
        'phone' => [
            'country_code' => '966', // Adjust based on country
            'number' => preg_replace('/[^0-9]/', '', $input['customer_phone']), // Remove non-digits
        ],
    ],
    'source' => [
        'id' => 'src_all', // Allows all payment methods
    ],
    'redirect' => [
        'url' => $input['redirect_url'],
    ],
    'threeDSecure' => true,
    'save_card' => false,
    'description' => "Order #{$order->number}",
    'metadata' => [
        'order_id' => (string) $order->id,
    ],
];
```

### 5. Handle Network/Connection Errors

**Fix:**
```php
try {
    $response = Http::timeout(30)->withHeaders([
        'Authorization' => 'Bearer ' . env('TAP_SECRET_KEY'),
        'Content-Type' => 'application/json',
    ])->post('https://api.tap.company/v2/charges', $tapPayload);
    
    // ... handle response
    
} catch (\Illuminate\Http\Client\ConnectionException $e) {
    Log::error('Tap API Connection Error:', ['message' => $e->getMessage()]);
    return [
        'success' => false,
        'error' => 'Failed to connect to Tap payment service',
        'order_id' => $order->id,
    ];
} catch (\Exception $e) {
    Log::error('Tap API Exception:', ['message' => $e->getMessage()]);
    return [
        'success' => false,
        'error' => 'Payment processing failed: ' . $e->getMessage(),
        'order_id' => $order->id,
    ];
}
```

### 6. Verify Environment Variables

**Check these in your `.env` file:**
```env
TAP_SECRET_KEY=sk_test_... # or sk_live_... for production
```

**Verify in code:**
```php
if (empty(env('TAP_SECRET_KEY'))) {
    throw new \Exception('TAP_SECRET_KEY is not set in environment');
}
```

## Complete Example Backend Resolver

```php
<?php

namespace App\GraphQL\Mutations;

use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CreateOrderWithTapPaymentMutation
{
    public function __invoke($_, array $args)
    {
        $input = $args['input'];
        
        // 1. Create order from cart
        $order = $this->createOrder($input);
        
        // 2. Calculate amount in smallest currency unit
        $orderTotal = $order->total_amount;
        $amountInSmallestUnit = (int) round($orderTotal * 100);
        
        // 3. Prepare Tap API payload
        $tapPayload = [
            'amount' => $amountInSmallestUnit,
            'currency' => 'SAR', // Adjust based on your currency
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
            'metadata' => ['order_id' => (string) $order->id],
        ];
        
        // 4. Call Tap API
        try {
            $response = Http::timeout(30)->withHeaders([
                'Authorization' => 'Bearer ' . env('TAP_SECRET_KEY'),
                'Content-Type' => 'application/json',
            ])->post('https://api.tap.company/v2/charges', $tapPayload);
            
            // 5. Check response status
            if (!$response->successful()) {
                $errorData = $response->json();
                Log::error('Tap API Error Response:', [
                    'status' => $response->status(),
                    'response' => $errorData,
                    'payload' => $tapPayload,
                ]);
                
                return [
                    'success' => false,
                    'error' => $errorData['message'] ?? ($errorData['errors'][0]['message'] ?? 'Invalid response from Tap payment service'),
                    'order_id' => (string) $order->id,
                    'payment_url' => null,
                    'transaction_id' => null,
                    'order' => $order,
                ];
            }
            
            $data = $response->json();
            
            // 6. Validate response structure
            if (isset($data['errors'])) {
                Log::error('Tap API Errors:', $data['errors']);
                return [
                    'success' => false,
                    'error' => $data['errors'][0]['message'] ?? 'Invalid response from Tap payment service',
                    'order_id' => (string) $order->id,
                    'payment_url' => null,
                    'order' => $order,
                ];
            }
            
            if (!isset($data['transaction']['url'])) {
                Log::error('Missing transaction URL:', $data);
                return [
                    'success' => false,
                    'error' => 'Invalid response from Tap payment service - missing payment URL',
                    'order_id' => (string) $order->id,
                    'payment_url' => null,
                    'order' => $order,
                ];
            }
            
            // 7. Success - return payment URL
            return [
                'success' => true,
                'payment_url' => $data['transaction']['url'],
                'transaction_id' => $data['id'] ?? null,
                'order_id' => (string) $order->id,
                'order' => $order,
            ];
            
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('Tap API Connection Error:', ['message' => $e->getMessage()]);
            return [
                'success' => false,
                'error' => 'Failed to connect to Tap payment service',
                'order_id' => (string) $order->id,
                'order' => $order,
            ];
        } catch (\Exception $e) {
            Log::error('Tap API Exception:', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return [
                'success' => false,
                'error' => 'Payment processing failed: ' . $e->getMessage(),
                'order_id' => (string) $order->id,
                'order' => $order,
            ];
        }
    }
    
    private function createOrder($input)
    {
        // Your existing order creation logic
        // ...
        return $order;
    }
}
```

## Testing Checklist

1. ✅ Verify `TAP_SECRET_KEY` is set correctly
2. ✅ Check that amount is converted to smallest currency unit
3. ✅ Verify all required Tap API fields are included
4. ✅ Test with valid test credentials
5. ✅ Check backend logs for actual Tap API error messages
6. ✅ Verify phone number format (remove non-digits)
7. ✅ Ensure redirect_url is accessible

## Debugging Steps

1. **Check Backend Logs:** Look for the actual Tap API error response
2. **Test Tap API Directly:** Use Postman/curl to test the API call
3. **Verify Amount Format:** Ensure it's an integer in smallest unit
4. **Check Currency Code:** Must be valid ISO code (SAR, USD, KWD, etc.)
5. **Validate Phone Number:** Must be numeric only in the `number` field

## Common Issues

1. **Amount Format:** Not converting to smallest unit (e.g., sending 100.50 instead of 10050)
2. **Phone Number:** Including non-numeric characters
3. **Missing Fields:** Customer email, phone, or redirect URL
4. **Invalid API Key:** Wrong secret key or expired
5. **Network Issues:** Timeout or connection problems

