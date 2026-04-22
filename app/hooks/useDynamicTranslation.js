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
  const [translatedText, setTranslatedText] = useState(() => {
    return text || '';
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const prevLangRef = useRef(lang);
  const cancelledRef = useRef(false);

  useEffect(() => {
    const langChanged = prevLangRef.current !== lang;
    if (langChanged) {
      prevLangRef.current = lang;

      if (lang === 'ar') {
        clearTranslationCache();
      }
    }

    cancelledRef.current = false;

    if (!text || typeof text.trim() === '') {
      setTranslatedText('');
      setIsTranslating(false);
      return;
    }

    if (lang === 'en') {
      setIsTranslating(false);
      setTranslatedText(text);
      return;
    }

    if (lang === 'ar') {
      const sourceLang = detectSourceLanguage(text);

      if (sourceLang === 'ar') {
        setIsTranslating(false);
        setTranslatedText(text);
        return;
      }

      let cancelled = false;

      async function runTranslation() {
        try {
          setIsTranslating(true);
          const result = await translateText(text, lang);

          if (!cancelled && !cancelledRef.current) {
            setTranslatedText(result);
          }
        } catch (err) {
          console.error('❌ Translation error:', err);
          if (!cancelled && !cancelledRef.current) {
            setTranslatedText(text);
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
