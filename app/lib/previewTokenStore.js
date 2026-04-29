// Shared preview token storage (use database in production)
const previewTokens = new Map();

export function generatePreviewToken(productSku, expiresInHours = 24) {
  const { createHash, randomBytes } = require('crypto');
  
  const tokenId = randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const expiresAt = new Date(timestamp + expiresInHours * 60 * 60 * 1000);
  
  // Create a secure token
  const tokenData = `${tokenId}:${productSku}:${timestamp}`;
  const token = createHash('sha256').update(tokenData).digest('hex');
  
  // Store token data (in production, use database)
  previewTokens.set(token, {
    productSku,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
  });
  
  return {
    token,
    expiresAt: expiresAt.toISOString(),
    previewUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/product-preview/${token}`,
  };
}

export function validatePreviewToken(token) {
  try {
    if (!token || typeof token !== 'string') {
      return { success: false, error: 'Invalid token format' };
    }

    const tokenData = previewTokens.get(token);
    
    if (!tokenData) {
      // Fallback for demo token
      if (token === 'preview_demo_token') {
        return {
          success: true,
          productSku: 'demo-product-sku',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
      }
      return { success: false, error: 'Token not found or expired' };
    }

    // Check if token has expired
    if (new Date(tokenData.expiresAt) < new Date()) {
      previewTokens.delete(token); // Clean up expired token
      return { success: false, error: 'Token expired' };
    }

    return {
      success: true,
      productSku: tokenData.productSku,
      expiresAt: tokenData.expiresAt,
    };

  } catch (error) {
    console.error('Token validation error:', error);
    return { success: false, error: 'Validation failed' };
  }
}

export function cleanupExpiredTokens() {
  const now = new Date();
  for (const [token, data] of previewTokens.entries()) {
    if (new Date(data.expiresAt) < now) {
      previewTokens.delete(token);
    }
  }
}

// Auto-cleanup expired tokens every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredTokens, 60 * 60 * 1000);
}
