# Product Preview System Documentation

## Project Audit Summary

### A) Product Display Pages Analysis

**Main Product Route**: `app/product/[sku]/page.js`
- **Architecture**: Server Component that fetches product data via GraphQL
- **Data Source**: Uses `GET_PRODUCT_BY_SKU` query from `app/lib/queries.js`
- **Client Component**: `ProductPageClient` handles client-side interactions
- **Rendering**: Uses Suspense with Loader fallback

**Product Components Found**:
- `ProductPage.js` - Main product display with image gallery and zoom
- `ProductPageClient.js` - Client wrapper with recently viewed tracking
- `ProductDetailsSidebar.js` - Product info, pricing, variants, add to cart
- `ProductDescription.js` - Product description and specifications tabs
- `ImageGallery.js` - Product image carousel (vertical/horizontal)
- `RecommendedProducts.js` - Related products slider

### B) Product Data Layer Analysis

**GraphQL Setup**:
- **Client**: `app/lib/graphqlClient.js` using graphql-request
- **Endpoint**: `https://keepersport.store/graphql`
- **Auth**: Bearer token support via `setAuthToken()`

**Key Queries**:
- `GET_PRODUCT_BY_SKU` - Fetches complete product by SKU
- Returns: images, variants, attributes, brand, pricing, badges
- **Product Structure**: Full product data with variants, stock, pricing

**API Routes**:
- `app/api/recent-products/route.js` - Batch product fetching by SKU
- Uses GraphQL batch queries for performance

### C) Reusable Components Identified

**Core Product Components** (All Reused for Preview):
1. **ProductPage** - Main layout with image zoom functionality
2. **ProductDetailsSidebar** - Complete product info and purchasing
3. **ProductDescription** - Description/specifications display
4. **ImageGallery** - Responsive image carousel
5. **PreviewBadge** - New component for preview indication
6. **PreviewActions** - New component for preview-specific actions

**Design System Integration**:
- Uses existing TailwindCSS classes
- Follows established color scheme (yellow-400 for primary actions)
- Maintains responsive design patterns
- Uses existing translation context

---

## New Preview System Implementation

### Route Structure
```
app/product-preview/[token]/
  page.js              # Server Component - token validation & data fetching
  PreviewBadge.js      # Preview mode indicator
  PreviewActions.js    # Preview-specific actions bar
  ProductPageClient.js # Modified client component for preview mode
```

### API Endpoints
```
app/api/preview/
  validate/route.js           # Token validation
  generate-token/route.js     # Token generation for backend
```

### Shared Utilities
```
app/lib/previewTokenStore.js  # Token management (replace with DB in production)
```

---

## Integration Instructions for Backend

### 1. Generate Preview Tokens

**Endpoint**: `POST /api/preview/generate-token`

```json
Request:
{
  "productSku": "PRODUCT_SKU_HERE",
  "expiresInHours": 24  // Optional, defaults to 24
}

Response:
{
  "success": true,
  "token": "abc123...",
  "expiresAt": "2026-04-30T15:16:00.000Z",
  "previewUrl": "http://yourdomain.com/product-preview/abc123..."
}
```

### 2. Preview URL Structure

**Format**: `{domain}/product-preview/{token}`

**Example**: `https://keepersport.store/product-preview/abc123def456`

### 3. Backend Integration Steps

1. **Add "Preview Product" Button** in admin dashboard
2. **Call Token Generation API** when button is clicked
3. **Open Preview URL** in new tab/window
4. **Handle Token Expiration** - tokens expire after specified time

### 4. Production Considerations

**Database Integration** (Required for Production):
- Replace in-memory `previewTokenStore.js` with database storage
- Store tokens with: `id`, `token_hash`, `product_sku`, `expires_at`, `created_at`
- Add cleanup job for expired tokens

**Security Enhancements**:
- Use environment variables for token secrets
- Implement rate limiting on token generation
- Add admin authentication to token generation endpoint
- Consider IP restrictions for preview access

---

## Features Implemented

### Preview Mode Features
- **Preview Badge**: Shows preview status and expiration time
- **Preview Actions Bar**: Share/copy functionality
- **No Indexing**: `robots: noindex, nofollow` metadata
- **No Recently Viewed**: Preview products don't affect user history
- **No Recommended Products**: Hidden in preview mode
- **Expiration Handling**: Graceful error for expired/invalid tokens

### User Experience
- **Identical Design**: Preview matches live product page 1:1
- **Responsive**: Works on all device sizes
- **Shareable**: Easy sharing of preview links
- **Time-aware**: Shows remaining preview time
- **Error Handling**: Clear messages for invalid/expired links

### Technical Features
- **Server Components**: Proper SSR with data fetching
- **GraphQL Integration**: Uses existing product queries
- **Component Reuse**: 100% component reuse from live product pages
- **Performance**: Suspense loading and optimized image handling
- **SEO Ready**: Proper metadata and noindex tags

---

## Testing Instructions

### 1. Demo Token
Use token: `preview_demo_token`
URL: `http://localhost:3000/product-preview/preview_demo_token`

### 2. Generate New Token
```bash
curl -X POST http://localhost:3000/api/preview/generate-token \
  -H "Content-Type: application/json" \
  -d '{"productSku": "your-product-sku"}'
```

### 3. Test Scenarios
- Valid token with existing product
- Invalid/expired token handling
- Share functionality
- Responsive design testing
- Preview badge countdown

---

## File Structure Summary

```
app/
  product-preview/[token]/
    page.js                 # Main preview page (Server Component)
    PreviewBadge.js         # Preview indicator
    PreviewActions.js       # Preview actions bar
    ProductPageClient.js    # Modified client component
  
  api/preview/
    validate/route.js       # Token validation endpoint
    generate-token/route.js # Token generation endpoint
  
  lib/
    previewTokenStore.js    # Token management utility
```

**Total New Files**: 6
**Modified Existing Files**: 0
**Reused Components**: 5 (ProductPage, ProductDetailsSidebar, ProductDescription, ImageGallery, etc.)

---

## Deployment Notes

1. **Environment Variables**:
   - `NEXT_PUBLIC_BASE_URL` - For generating preview URLs
   - `GRAPHQL_ENDPOINT` - Existing GraphQL endpoint

2. **Database Requirements** (Production):
   - `preview_tokens` table with indexes on token_hash and expires_at

3. **Monitoring**:
   - Track preview token generation/validation
   - Monitor preview page access patterns
   - Clean up expired tokens regularly

---

## Support & Maintenance

The preview system is designed to be:
- **Self-contained**: Minimal impact on existing codebase
- **Scalable**: Easy to extend with additional preview features
- **Maintainable**: Uses existing patterns and components
- **Secure**: Token-based access with expiration

For issues or enhancements, refer to the component structure above and modify the preview-specific files without affecting the core product functionality.
