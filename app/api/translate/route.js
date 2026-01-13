import { NextResponse } from "next/server";

/**
 * Translation API Route
 * Uses Google Translate API for dynamic content translation
 * This is used for API-returned content only, not static UI text
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { text, target } = body;

    // Validate input
    if (!text || typeof text !== 'string') {
      return NextResponse.json({
        translatedText: text || '',
        originalText: text || '',
        targetLanguage: target || 'ar',
        error: "Text is required",
      }, { status: 200 }); // Return 200 to prevent UI breaking
    }

    if (!target || !['ar', 'en'].includes(target)) {
      return NextResponse.json({
        translatedText: text,
        originalText: text,
        targetLanguage: target || 'ar',
        error: "Target language must be 'ar' or 'en'",
      }, { status: 200 }); // Return 200 to prevent UI breaking
    }

    // Check API key
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY;
    console.log('🔑 API Key check:', {
      hasKey: !!apiKey,
      keyLength: apiKey?.length || 0,
    });
    
    if (!apiKey) {
      console.warn('⚠️ Google Translate API key not configured, returning original text');
      // Return original text instead of error to prevent breaking the UI
      return NextResponse.json({
        translatedText: text,
        originalText: text,
        targetLanguage: target,
        warning: 'API key not configured',
      });
    }

    // Detect source language
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F]/;
    const sourceLang = arabicRegex.test(text) ? 'ar' : 'en';

    // If already in target language, return as is
    if (sourceLang === target) {
      return NextResponse.json({
        translatedText: text,
        originalText: text,
        targetLanguage: target,
      });
    }

    // Google Translate API endpoint
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    
    console.log('🌐 Calling Google Translate API:', {
      sourceLang,
      targetLang: target,
      textLength: text.length,
    });
    
    try {
      // Note: If you get 403 errors, you need to:
      // 1. Go to Google Cloud Console
      // 2. Select your API key
      // 3. Remove "HTTP referrer restrictions" or add your domain
      // 4. For server-side API calls, it's better to use IP restrictions or no restrictions
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: target,
          format: 'text',
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = await response.text();
        }
        
        console.error("❌ Google Translate API error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          text: text.substring(0, 50) + '...',
        });
        
        // If 403 error, it's likely an API key restriction issue
        if (response.status === 403) {
          console.error("⚠️ 403 Forbidden - API Key Restriction Issue:");
          console.error("═══════════════════════════════════════════════════");
          console.error("To fix this, go to Google Cloud Console:");
          console.error("1. Navigate to: APIs & Services > Credentials");
          console.error("2. Click on your API key");
          console.error("3. Under 'API restrictions', make sure 'Cloud Translation API' is enabled");
          console.error("4. Under 'Application restrictions':");
          console.error("   - Option A: Select 'None' (less secure but works for server-side)");
          console.error("   - Option B: Select 'IP addresses' and add your server IP");
          console.error("   - Option C: If using 'HTTP referrers', add: localhost:3000/* and your domain");
          console.error("═══════════════════════════════════════════════════");
        }
        
        // Return original text instead of error to prevent breaking the UI
        return NextResponse.json({
          translatedText: text,
          originalText: text,
          targetLanguage: target,
          error: `Translation API returned ${response.status}`,
        });
      }

      const data = await response.json();
      const translatedText = data?.data?.translations?.[0]?.translatedText || text;

      console.log('✅ Google Translate API response:', {
        success: !!translatedText && translatedText !== text,
        originalLength: text.length,
        translatedLength: translatedText.length,
      });

      return NextResponse.json({
        translatedText,
        originalText: text,
        targetLanguage: target,
      });
    } catch (fetchError) {
      console.error("❌ Fetch error in translation API:", fetchError);
      // Return original text instead of error
      return NextResponse.json({
        translatedText: text,
        originalText: text,
        targetLanguage: target,
        error: fetchError.message,
      });
    }
  } catch (err) {
    console.error("❌ Translate API route error:", err);
    // Return original text instead of error to prevent breaking the UI
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({
      translatedText: body?.text || '',
      originalText: body?.text || '',
      targetLanguage: body?.target || 'ar',
      error: err.message,
    });
  }
}
