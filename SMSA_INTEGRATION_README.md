# SMSA Express Integration

## Overview
This integration automatically creates shipments with SMSA Express after successful payment for orders:
- Shipping to Saudi Arabia (country code: SA)
- Shipping type: "normal" or "standard"

## Configuration

### Environment Variables
Add these to your `.env.local` file:

```env
# SMSA Express API Configuration
SMSA_API_ENDPOINT=https://ecomapis-sandbox.azurewebsites.net
SMSA_API_KEY=e984157a3da448f5bae9dc06d090500a
```

For production, replace with:
```env
SMSA_API_ENDPOINT=https://ecomapis.azurewebsites.net
SMSA_API_KEY=your_production_api_key
```

## How It Works

1. **Payment Success**: After Tap payment is verified successfully
2. **Condition Check**: System checks if:
   - Country code is "SA" (Saudi Arabia)
   - Shipping type is "normal" or "standard"
3. **SMSA Integration**: If conditions are met, automatically creates shipment with SMSA Express
4. **Error Handling**: Failures are logged but don't interrupt the payment success flow

## API Endpoint

**POST** `/api/smsa/create-shipment`

### Request Body
```json
{
  "orderId": "123",
  "orderNumber": "ORD-001",
  "customerName": "John Doe",
  "customerPhone": "0501234567",
  "customerEmail": "customer@example.com",
  "shippingAddress": {
    "address_line_1": "123 Main Street",
    "locality": "Riyadh",
    "postal_code": "12345",
    "country_code": "SA"
  },
  "items": [
    {
      "product_name": "Product Name",
      "product_sku": "SKU-001",
      "quantity": 2
    }
  ]
}
```

### Response
```json
{
  "success": true,
  "shipmentId": "SMSA-123456",
  "trackingNumber": "TRACK123456",
  "message": "Shipment created successfully with SMSA Express",
  "data": { ... }
}
```

## Files Modified

1. **`app/api/smsa/create-shipment/route.js`**
   - Handles SMSA Express API integration
   - Validates order data
   - Creates shipment via SMSA API

2. **`app/payment-success/PaymentSuccessClient.js`**
   - Updated GraphQL query to include shipping details
   - Added `handleSMSAIntegration()` function
   - Automatically triggers SMSA integration after successful payment

## Testing

1. Place an order with:
   - Country: Saudi Arabia (SA)
   - Shipping type: "normal" or "standard"
2. Complete payment successfully
3. Check browser console for SMSA integration logs
4. Verify shipment was created in SMSA Express dashboard

## Notes

- Integration runs silently in the background
- Payment success is not affected if SMSA integration fails
- All errors are logged to console for debugging
- Shipping address is retrieved from order data (may need backend support)

## Backend Requirements

The GraphQL `verifyTapPayment` mutation should return order with:
- `shipping_country.code` or `shipping_country.id`
- `shipping_type`
- `user.name`, `user.email`, `user.phone`
- `items[]` with `product_name`, `product_sku`, `quantity`

If shipping address is not available in order response, you may need to:
1. Add `shipping_address` field to Order type in GraphQL schema
2. Or fetch order details separately after payment verification

