/**
 * Dynamic Translation Service for API Content
 * Uses Google Translate API to translate dynamic content from backend
 * Only translates API-returned content, not static UI text
 */

// Translation cache to avoid unnecessary API calls
// Using Map for in-memory cache (cleared on page refresh)
const translationCache = new Map();

// Maximum cache size to prevent memory issues
const MAX_CACHE_SIZE = 1000;

// Track pending translations to prevent duplicate requests for same text
const pendingTranslations = new Map();

/**
 * Generate cache key for translation
 */
function getCacheKey(text, targetLang) {
  return `${text}_${targetLang}`;
}

/**
 * Detect source language automatically
 */
function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'en';
  
  // Check for Arabic characters
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F]/;
  if (arabicRegex.test(text)) {
    return 'ar';
  }
  
  // Default to English
  return 'en';
}

/**
 * Translate text using Google Translate API
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language ('ar' or 'en')
 * @returns {Promise<string>} - Translated text
 */
/**
 * Translate text using Google Translate API
 * FIXES:
 * - Prevents duplicate requests for same text+lang using pendingTranslations map
 * - Improved caching with better cache key generation
 * - Returns cached result immediately if available
 * - Handles pending requests by returning the same promise
 * 
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language ('ar' or 'en')
 * @returns {Promise<string>} - Translated text
 */
export async function translateText(text, targetLang = 'ar') {
  console.log('🌐 translateText: Called', {
    text: text?.substring(0, 50) + '...',
    targetLang,
    textLength: text?.length || 0,
    textType: typeof text,
  });

  // Validate input
  if (!text || typeof text !== 'string' || !text.trim()) {
    console.log('⏭️ translateText: Invalid input, returning original', {
      hasText: !!text,
      isString: typeof text === 'string',
      trimmed: text?.trim() || '',
    });
    return text;
  }

  // Don't translate if target language is same as source
  const sourceLang = detectLanguage(text);
  console.log('🔍 translateText: Language detection', {
    sourceLang,
    targetLang,
    needsTranslation: sourceLang !== targetLang,
    textPreview: text?.substring(0, 50) + '...',
  });

  if (sourceLang === targetLang) {
    console.log('⏭️ translateText: Source and target languages match, returning original', {
      sourceLang,
      targetLang,
      textPreview: text?.substring(0, 50) + '...',
    });
    return text;
  }
  
  // ✅ Log when translation will happen - CLEAR AND VISIBLE
  console.log('🌍 Translating:', {
    original: text?.substring(0, 50) + (text?.length > 50 ? '...' : ''),
    from: sourceLang,
    to: targetLang,
  });

  // Check cache first (synchronous check for immediate return)
  const cacheKey = getCacheKey(text, targetLang);
  if (translationCache.has(cacheKey)) {
    const cached = translationCache.get(cacheKey);
    console.log('✅ translateText: Found in global cache', {
      text: text?.substring(0, 30) + '...',
      cached: cached?.substring(0, 30) + '...',
    });
    return cached;
  }

  // Check if there's already a pending translation for this text+lang
  // This prevents duplicate API calls for the same text
  if (pendingTranslations.has(cacheKey)) {
    console.log('⏳ translateText: Pending translation exists, returning promise');
    return pendingTranslations.get(cacheKey);
  }

  // Create translation promise
  const translationPromise = (async () => {
    console.log('🚀 translateText: Starting API call', {
      text: text?.substring(0, 50) + '...',
      targetLang,
      cacheKey: cacheKey?.substring(0, 50) + '...',
    });

    try {
      // CRITICAL: Use Next.js API route to avoid CORS and expose API key
      // This MUST be called when targetLang === "ar" and sourceLang === "en"
      console.log('📡 translateText: Sending fetch request to /api/translate', {
        text: text?.substring(0, 50) + '...',
        target: targetLang,
      });
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          target: targetLang,
        }),
      });

      console.log('📥 translateText: Response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ translateText: Translation API error', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          text: text?.substring(0, 30) + '...',
        });
        throw new Error(`Translation API error: ${response.status}`);
      }

      const data = await response.json();
      const translatedText = data?.translatedText || text;

      // ✅ MANDATORY: Log the final translated text clearly in browser console
      console.log("🌍 Translating:", text, "=>", targetLang);
      console.log("✅ Translated:", translatedText);
      console.log("✅ Translated text:", translatedText);

      console.log('✅ translateText: Translation successful', {
        original: text?.substring(0, 30) + '...',
        translated: translatedText?.substring(0, 30) + '...',
        originalLength: text?.length,
        translatedLength: translatedText?.length,
        hasError: !!data?.error,
        errorMessage: data?.error,
      });

      // Cache the translation (with size limit)
      if (translationCache.size >= MAX_CACHE_SIZE) {
        // Remove oldest entry (first key)
        const firstKey = translationCache.keys().next().value;
        translationCache.delete(firstKey);
        console.log('🧹 translateText: Cache size limit reached, removed oldest entry');
      }
      translationCache.set(cacheKey, translatedText);
      console.log('💾 translateText: Cached translation', {
        cacheSize: translationCache.size,
      });

      // Remove from pending translations
      pendingTranslations.delete(cacheKey);

      return translatedText;
    } catch (error) {
      console.error('❌ translateText: Translation error', {
        error: error.message,
        stack: error.stack,
        text: text?.substring(0, 30) + '...',
        targetLang,
      });
      // Remove from pending translations on error
      pendingTranslations.delete(cacheKey);
      // Return original text on error (don't break the UI)
      return text;
    }
  })();

  // Store pending translation to prevent duplicates
  pendingTranslations.set(cacheKey, translationPromise);

  return translationPromise;
}

/**
 * Translate multiple texts in batch
 * @param {string[]} texts - Array of texts to translate
 * @param {string} targetLang - Target language
 * @returns {Promise<string[]>} - Array of translated texts
 */
export async function translateBatch(texts, targetLang = 'ar') {
  if (!Array.isArray(texts) || texts.length === 0) {
    return texts;
  }

  // Filter out texts that don't need translation
  const textsToTranslate = texts.map((text, index) => ({
    text,
    index,
    sourceLang: detectLanguage(text),
  })).filter(({ text, sourceLang }) => {
    return text && typeof text === 'string' && text.trim() && sourceLang !== targetLang;
  });

  if (textsToTranslate.length === 0) {
    return texts;
  }

  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) {
      return texts;
    }

    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: textsToTranslate.map(({ text }) => text),
        source: textsToTranslate[0].sourceLang,
        target: targetLang,
        format: 'text',
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    const translations = data?.data?.translations || [];

    // Map translations back to original array
    const result = [...texts];
    textsToTranslate.forEach(({ index }, i) => {
      result[index] = translations[i]?.translatedText || result[index];
      
      // Cache the translation
      const cacheKey = getCacheKey(texts[index], targetLang);
      translationCache.set(cacheKey, result[index]);
    });

    return result;
  } catch (error) {
    console.error('Batch translation error:', error);
    return texts;
  }
}

/**
 * Clear translation cache
 * FIX: Also clears pending translations to prevent stale data
 */
export function clearTranslationCache() {
  translationCache.clear();
  pendingTranslations.clear();
}

/**
 * Clear cache for specific language
 */
export function clearCacheForLanguage(lang) {
  const keysToDelete = [];
  for (const key of translationCache.keys()) {
    if (key.endsWith(`_${lang}`)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => translationCache.delete(key));
}

/**
 * Get cache size (for debugging)
 */
export function getCacheSize() {
  return translationCache.size;
}

