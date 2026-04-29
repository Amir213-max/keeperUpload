// API route for generating preview tokens (for backend integration)
import { NextResponse } from 'next/server';
import { generatePreviewToken } from '@/app/lib/previewTokenStore';

export async function POST(request) {
  try {
    const { productSku, expiresInHours } = await request.json();

    if (!productSku) {
      return NextResponse.json(
        { success: false, error: 'Product SKU is required' },
        { status: 400 }
      );
    }

    // Generate preview token
    const tokenData = generatePreviewToken(productSku, expiresInHours || 24);

    return NextResponse.json({
      success: true,
      ...tokenData,
    });

  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate preview token' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Preview Token Generation API',
    usage: 'POST with { productSku: string, expiresInHours?: number }',
  });
}
