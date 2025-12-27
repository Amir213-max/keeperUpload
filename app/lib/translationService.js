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
export async function translateText(text, targetLang = 'ar') {
  // Validate input
  if (!text || typeof text !== 'string' || !text.trim()) {
    return text;
  }

  // Don't translate if target language is same as source
  const sourceLang = detectLanguage(text);
  if (sourceLang === targetLang) {
    return text;
  }

  // Check cache first
  const cacheKey = getCacheKey(text, targetLang);
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  try {
    // Use Next.js API route to avoid CORS and expose API key
    console.log('🔄 Translating text:', {
      text: text.substring(0, 50) + '...',
      targetLang,
      sourceLang: detectLanguage(text),
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Translation API error:', {
        status: response.status,
        error: errorData,
      });
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data?.translatedText || text;
    
    console.log('✅ Translation result:', {
      original: text.substring(0, 30) + '...',
      translated: translatedText.substring(0, 30) + '...',
      hasError: !!data?.error,
    });

    // Cache the translation (with size limit)
    if (translationCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entry (first key)
      const firstKey = translationCache.keys().next().value;
      translationCache.delete(firstKey);
    }
    translationCache.set(cacheKey, translatedText);

    return translatedText;
  } catch (error) {
    console.error('Translation error:', error);
    // Return original text on error (don't break the UI)
    // The error is already logged, so we can safely return the original text
    return text;
  }
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
 */
export function clearTranslationCache() {
  translationCache.clear();
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

