'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from '../contexts/TranslationContext';
import { translateText, clearTranslationCache } from '../lib/translationService';

/**
 * Hook for translating dynamic API content
 * Only translates content that comes from API, not static UI text
 * 
 * FIXES:
 * - Prevents infinite loops by using refs to track translation state
 * - Uses local cache (useRef) to avoid re-translating same text
 * - Debounces translation requests
 * - Only translates when language differs from source
 * - Prevents translation during render phase
 * 
 * @param {string} text - Text to translate (from API)
 * @param {object} options - Options for translation
 * @param {boolean} options.enabled - Enable/disable translation (default: true)
 * @param {string} options.fallback - Fallback text if translation fails
 * @returns {string} - Translated text
 */
export function useDynamicTranslation(text, options = {}) {
  const { lang } = useTranslation();
  const { enabled = true, fallback = null } = options;
  
  // Local cache using ref to persist across re-renders without causing re-renders
  const localCacheRef = useRef(new Map());
  
  // Track mounted state
  const mountedRef = useRef(true);
  
  // Track last values to detect actual changes
  // FIX: Initialize with empty string to ensure first render always detects change
  const lastTextRef = useRef('');
  // FIX: Initialize with null to ensure language change is always detected on first render
  const lastLangRef = useRef(null);
  
  // Track if translation is in progress to prevent duplicate requests
  const translatingRef = useRef(false);
  
  // Debounce timer ref
  const debounceTimerRef = useRef(null);
  
  // Initialize state with text (will be updated if translation needed)
  const [translatedText, setTranslatedText] = useState(() => {
    // Initialize with text, will be updated if translation is needed
    return text || fallback || '';
  });
  const [isTranslating, setIsTranslating] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Clear debounce timer on unmount
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Memoize text normalization to prevent unnecessary re-renders
  const normalizedText = useMemo(() => {
    if (!text || typeof text !== 'string') return '';
    return text.trim();
  }, [text]);

  // Detect source language (memoized)
  const sourceLang = useMemo(() => {
    if (!normalizedText) return 'en';
    const hasArabic = /[\u0600-\u06FF\u0750-\u077F]/.test(normalizedText);
    return hasArabic ? 'ar' : 'en';
  }, [normalizedText]);

  // Check if translation is needed (memoized)
  // FIX: Always translate if source language differs from target language
  // This ensures translation happens when language changes, even if text is same
  const needsTranslation = useMemo(() => {
    if (!enabled || !normalizedText) return false;
    // Always translate if source language is different from target language
    // This ensures API content (usually English) gets translated when switching to Arabic
    if (sourceLang === lang) return false; // Already in target language
    return true;
  }, [enabled, normalizedText, sourceLang, lang]);

  // Translation function (memoized with useCallback)
  const performTranslation = useCallback(async (textToTranslate, targetLang) => {
    console.log('📝 performTranslation: Starting', {
      text: textToTranslate?.substring(0, 50) + '...',
      targetLang,
      textLength: textToTranslate?.length || 0,
    });

    // Check local cache first
    const cacheKey = `${textToTranslate}_${targetLang}`;
    if (localCacheRef.current.has(cacheKey)) {
      const cached = localCacheRef.current.get(cacheKey);
      console.log('✅ performTranslation: Found in local cache', {
        text: textToTranslate?.substring(0, 30) + '...',
        cached: cached?.substring(0, 30) + '...',
      });
      if (mountedRef.current) {
        setTranslatedText(cached);
        setIsTranslating(false);
      }
      return;
    }

    // Prevent duplicate requests
    if (translatingRef.current) {
      console.log('⏭️ performTranslation: Already translating, skipping duplicate request');
      return;
    }

    console.log('🔄 performTranslation: Calling translateText API', {
      text: textToTranslate?.substring(0, 50) + '...',
      targetLang,
    });

    translatingRef.current = true;
    setIsTranslating(true);

    try {
      const translated = await translateText(textToTranslate, targetLang);
      
      console.log('✅ performTranslation: Translation received', {
        original: textToTranslate?.substring(0, 30) + '...',
        translated: translated?.substring(0, 30) + '...',
        originalLength: textToTranslate?.length,
        translatedLength: translated?.length,
      });
      
      // Cache the translation
      localCacheRef.current.set(cacheKey, translated);
      
      // Limit cache size to prevent memory issues
      if (localCacheRef.current.size > 500) {
        const firstKey = localCacheRef.current.keys().next().value;
        localCacheRef.current.delete(firstKey);
        console.log('🧹 performTranslation: Cache size limit reached, removed oldest entry');
      }

      if (mountedRef.current) {
        setTranslatedText(translated || textToTranslate || fallback || '');
        setIsTranslating(false);
        console.log('✅ performTranslation: State updated successfully');
      } else {
        console.log('⏭️ performTranslation: Component unmounted, skipping state update');
      }
    } catch (error) {
      console.error('❌ performTranslation: Translation failed', {
        error: error.message,
        stack: error.stack,
        text: textToTranslate?.substring(0, 30) + '...',
        targetLang,
      });
      if (mountedRef.current) {
        setTranslatedText(textToTranslate || fallback || '');
        setIsTranslating(false);
      }
    } finally {
      translatingRef.current = false;
      console.log('🏁 performTranslation: Finished');
    }
  }, [fallback]);

  // Main effect - only runs when text or lang actually changes
  useEffect(() => {
    console.log('🔍 useDynamicTranslation: Effect triggered', {
      text: normalizedText?.substring(0, 30) + '...',
      lang,
      enabled,
      normalizedTextLength: normalizedText?.length || 0,
    });

    // Skip if translation is disabled or text is empty
    if (!enabled || !normalizedText) {
      console.log('⏭️ useDynamicTranslation: Skipping - disabled or empty text', {
        enabled,
        hasText: !!normalizedText,
      });
      if (mountedRef.current) {
        setTranslatedText(normalizedText || fallback || '');
      }
      return;
    }

    // Check if text or language actually changed
    // FIX: Check changes BEFORE updating refs to ensure accurate detection
    const textChanged = normalizedText !== lastTextRef.current;
    // FIX: Treat null as changed to ensure first render always triggers
    const langChanged = lastLangRef.current === null || lang !== lastLangRef.current;
    
    console.log('🔄 useDynamicTranslation: Change detection', {
      textChanged,
      langChanged,
      lastText: lastTextRef.current?.substring(0, 30) + '...',
      currentText: normalizedText?.substring(0, 30) + '...',
      lastLang: lastLangRef.current,
      currentLang: lang,
    });

    // If neither changed, skip (prevents unnecessary re-renders)
    // FIX: Allow first render (when lastLangRef.current is null) to proceed
    if (!textChanged && !langChanged && lastLangRef.current !== null) {
      console.log('⏭️ useDynamicTranslation: Skipping - no changes detected');
      return;
    }
    
    // Update refs AFTER checking changes to track current state for next render
    lastTextRef.current = normalizedText;
    lastLangRef.current = lang;

    // FIX: Recalculate needsTranslation here to ensure it's based on current lang value
    // This is critical because needsTranslation is memoized and might use stale lang value
    const currentNeedsTranslation = enabled && normalizedText && sourceLang !== lang;
    
    console.log('🔍 useDynamicTranslation: Translation check', {
      needsTranslation,
      currentNeedsTranslation,
      sourceLang,
      targetLang: lang,
      sourceLangMatchesTarget: sourceLang === lang,
      enabled,
      hasText: !!normalizedText,
    });

    // FIX: Use currentNeedsTranslation instead of memoized needsTranslation
    // This ensures we check translation needs with the current lang value
    if (!currentNeedsTranslation) {
      console.log('⏭️ useDynamicTranslation: Skipping - no translation needed', {
        sourceLang,
        targetLang: lang,
        enabled,
        hasText: !!normalizedText,
      });
      if (mountedRef.current) {
        setTranslatedText(normalizedText);
      }
      return;
    }

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // IMPORTANT: Clear local cache when language changes to force re-translation
    // This ensures that when user switches language (e.g., from 'en' to 'ar'),
    // all API texts (which are in English) get re-translated to Arabic
    // FIX: Always clear cache on language change, even if it's the first render
    if (langChanged) {
      console.log('🧹 useDynamicTranslation: Clearing local cache due to language change', {
        oldLang: lastLangRef.current,
        newLang: lang,
        cacheSize: localCacheRef.current.size,
        isFirstRender: lastLangRef.current === null,
      });
      localCacheRef.current.clear();
      // Also clear the translating flag to allow new translations
      translatingRef.current = false;
      // FIX: Also clear global cache to force fresh translations
      // This ensures translations are re-fetched when language changes
      clearTranslationCache();
    }

    // Debounce translation to prevent rapid-fire requests
    // Reduced debounce time when language changes for faster response
    const debounceTime = langChanged ? 50 : 100;
    console.log('⏳ useDynamicTranslation: Scheduling translation', {
      text: normalizedText?.substring(0, 30) + '...',
      lang,
      debounceTime,
      langChanged,
    });
    
    debounceTimerRef.current = setTimeout(() => {
      if (mountedRef.current && !translatingRef.current) {
        console.log('🚀 useDynamicTranslation: Executing translation', {
          text: normalizedText?.substring(0, 30) + '...',
          lang,
        });
        performTranslation(normalizedText, lang);
      } else {
        console.log('⏭️ useDynamicTranslation: Skipping translation execution', {
          mounted: mountedRef.current,
          translating: translatingRef.current,
        });
      }
    }, debounceTime);

    // Cleanup debounce timer
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // FIX: Include sourceLang in dependencies to ensure effect re-runs when language detection changes
    // This is critical because sourceLang affects whether translation is needed
  }, [normalizedText, lang, enabled, sourceLang, performTranslation, fallback]);

  return { translatedText, isTranslating };
}

/**
 * Hook for translating multiple texts at once
 * Useful for translating arrays of product names, etc.
 */
export function useDynamicTranslationBatch(texts, options = {}) {
  const { lang } = useTranslation();
  const { enabled = true } = options;
  
  const [translatedTexts, setTranslatedTexts] = useState(texts || []);
  const [isTranslating, setIsTranslating] = useState(false);
  const mountedRef = useRef(true);
  const lastTextsRef = useRef([]);
  const lastLangRef = useRef(lang);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !Array.isArray(texts) || texts.length === 0) {
      if (mountedRef.current) {
        setTranslatedTexts(texts || []);
      }
      return;
    }

    // Skip if texts and language haven't changed
    const textsChanged = JSON.stringify(texts) !== JSON.stringify(lastTextsRef.current);
    const langChanged = lang !== lastLangRef.current;

    if (!textsChanged && !langChanged) {
      return;
    }

    lastTextsRef.current = texts;
    lastLangRef.current = lang;

    // Check if all texts are already in target language
    const allInTargetLang = texts.every((text) => {
      if (!text || typeof text !== 'string') return true;
      const hasArabic = /[\u0600-\u06FF\u0750-\u077F]/.test(text);
      return (hasArabic && lang === 'ar') || (!hasArabic && lang === 'en');
    });

    if (allInTargetLang) {
      if (mountedRef.current) {
        setTranslatedTexts(texts);
      }
      return;
    }

    // Translate texts
    setIsTranslating(true);
    import('../lib/translationService')
      .then(({ translateBatch }) => translateBatch(texts, lang))
      .then((translated) => {
        if (mountedRef.current) {
          setTranslatedTexts(translated || texts);
          setIsTranslating(false);
        }
      })
      .catch((error) => {
        console.error('Batch translation error:', error);
        if (mountedRef.current) {
          setTranslatedTexts(texts);
          setIsTranslating(false);
        }
      });
  }, [texts, lang, enabled]);

  return { translatedTexts, isTranslating };
}

