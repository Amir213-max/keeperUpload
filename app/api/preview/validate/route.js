// API route for validating preview tokens
import { NextResponse } from 'next/server';
import { validatePreviewToken } from '@/app/lib/previewTokenStore';

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    const validation = validatePreviewToken(token);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      productSku: validation.productSku,
      expiresAt: validation.expiresAt,
    });

  } catch (error) {
    console.error('Preview validation API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optional: Add rate limiting for security
export async function GET() {
  return NextResponse.json(
    { message: 'POST method required for token validation' },
    { status: 405 }
  );
}
