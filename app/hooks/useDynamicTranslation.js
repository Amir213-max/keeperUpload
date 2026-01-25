'use client';

import { useEffect, useState, useRef } from 'react';
import { translateText, clearTranslationCache } from '../lib/translationService';

/**
 * Detect source language of text
 */
function detectSourceLanguage(text) {
  if (!text || typeof text !== 'string') return 'en';
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F]/;
  return arabicRegex.test(text) ? 'ar' : 'en';
}

export function useDynamicTranslation(text, lang) {
  // CRITICAL: Initialize with text, will be updated based on lang
  const [translatedText, setTranslatedText] = useState(() => {
    // If lang is 'en' on mount, use original text
    // If lang is 'ar' on mount, will be translated in useEffect
    return text || '';
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const prevLangRef = useRef(lang);
  const cancelledRef = useRef(false);
  const prevTextRef = useRef(text);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    // Track language change for logging
    const langChanged = prevLangRef.current !== lang;
    const textChanged = prevTextRef.current !== text;
    const isFirstRender = isFirstRenderRef.current;
    
    if (isFirstRender) {
      isFirstRenderRef.current = false;
      console.log('🆕 useDynamicTranslation: First render', {
        text: text?.substring(0, 30) + '...',
        lang,
      });
    }
    
    if (langChanged) {
      console.log('🌐 [BROWSER] Language changed:', {
        from: prevLangRef.current,
        to: lang,
      });
      prevLangRef.current = lang;
      
      // CRITICAL: Clear cache when language changes to force fresh translation
      if (lang === 'ar') {
        console.log('🧹 Clearing translation cache for fresh translations');
        clearTranslationCache();
      }
    }
    
    // Update text ref
    prevTextRef.current = text;

    console.log('🔍 useDynamicTranslation effect triggered', {
      text: text?.substring(0, 30) + '...',
      lang,
      langChanged,
      textChanged,
      isFirstRender,
    });

    // Reset cancellation flag
    cancelledRef.current = false;

    // Handle empty text
    if (!text || typeof text.trim() === '') {
      setTranslatedText('');
      setIsTranslating(false);
      return;
    }

    // CRITICAL: When lang === "en" → ALWAYS show original, NO translation
    if (lang === 'en') {
      console.log('🛑 Skipping translation because lang === "en"');
      setIsTranslating(false);
      setTranslatedText(text);
      console.log('♻️ Resetting translation to original (EN)');
      return;
    }

    // When lang === "ar" → translate ONLY if source is English
    if (lang === 'ar') {
      const sourceLang = detectSourceLanguage(text);
      
      // If text is already Arabic, no need to translate
      if (sourceLang === 'ar') {
        console.log('⏭️ Text is already Arabic, skipping translation');
        setIsTranslating(false);
        setTranslatedText(text);
        return;
      }

      // Text is English, translate to Arabic
      // CRITICAL: Always translate when lang is "ar" and text is English
      let cancelled = false;

      async function runTranslation() {
        try {
          setIsTranslating(true);
          console.log('🌍 Translating:', text.substring(0, 50) + (text.length > 50 ? '...' : ''), '=>', lang);

          const result = await translateText(text, lang);

          if (!cancelled && !cancelledRef.current) {
            console.log('✅ Translation applied:', result.substring(0, 50) + (result.length > 50 ? '...' : ''));
            console.log('✅ Translated text:', result);
            setTranslatedText(result);
          }
        } catch (err) {
          console.error('❌ Translation error:', err);
          if (!cancelled && !cancelledRef.current) {
            setTranslatedText(text); // Fallback to original on error
          }
        } finally {
          if (!cancelled && !cancelledRef.current) {
            setIsTranslating(false);
          }
        }
      }

      runTranslation();

      return () => {
        cancelled = true;
        cancelledRef.current = true;
      };
    }
  }, [text, lang]);

  return { translatedText, isTranslating };
}
