# SMSA Express Order Integration

## Overview
This integration creates a shipping order with SMSA Express API immediately after the "Place Order" button is clicked, before redirecting to payment.

## Files Created/Modified

### 1. API Route: `app/api/smsa/create-order/route.js`
- Handles SMSA Express API integration
- Validates order data
- Sends order data in the required format to SMSA Express
- Handles success and error responses

### 2. Customer Page: `app/checkout_1/customer/CustomerPage.js`
- Updated `handlePlaceOrder` function
- Calls SMSA API immediately after order creation
- Non-blocking: Payment flow continues even if SMSA fails

## API Configuration

The API automatically uses:
- **Sandbox**: `https://ecomapis-sandbox.azurewebsites.net` (key: `e984157a3da448f5bae9dc06d090500a`)
- **Production**: `https://ecomapis.smsaexpress.com` (key: `ce361e7d11104da0a24539994eab2f6c`)

Environment detection is based on `NODE_ENV`.

## Payload Format

The integration sends data in this exact format:

```json
{
  "input": {
    "cart_id": "6",
    "shipping_cost": 50,
    "total_amount": 200.00,
    "vat_amount": 30.00,
    "subtotal": 230.00,
    "currency": "EUR",
    "shipping_type": "standard",
    "shipping_country_id": "1",
    "shipping_address": {
      "first_name": "...",
      "last_name": "...",
      "address_line_1": "...",
      "address_line_2": "",
      "locality": "...",
      "postal_code": "...",
      "country_code": "..."
    },
    "billing_address": { ... },
    "customer_email": "amir@example.com",
    "customer_phone": "+201234567890",
    "redirect_url": "https://your-website.com/payment-success",
    "webhook_url": "https://your-website.com/payment-webhook",
    "tags": ["smsa"],
    "tracking_urls": [],
    "published": true
  }
}
```

## Integration Flow

1. User clicks "Place Order"
2. Order is created via GraphQL mutation
3. **SMSA Express order is created immediately** (new)
4. User is redirected to payment gateway
5. Payment is processed
6. User returns to payment verification page

## Error Handling

- SMSA API failures are logged but don't block the payment flow
- Errors are logged to console for debugging
- Payment redirect happens regardless of SMSA success/failure

## Testing

1. Place an order with valid customer information
2. Check browser console for SMSA integration logs
3. Verify SMSA order was created in SMSA Express dashboard
4. Complete payment flow normally

## Notes

- The SMSA API endpoint is set to `/api/orders` - adjust in `app/api/smsa/create-order/route.js` if your SMSA API uses a different endpoint
- The integration runs synchronously but doesn't block the payment redirect
- All order data is automatically extracted from the checkout form

