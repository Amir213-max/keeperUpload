'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../contexts/TranslationContext';
import { translateText } from '../lib/translationService';

/**
 * Hook for translating dynamic API content
 * Only translates content that comes from API, not static UI text
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
  
  const [translatedText, setTranslatedText] = useState(text || fallback || '');
  const [isTranslating, setIsTranslating] = useState(false);
  const mountedRef = useRef(true);
  const lastTextRef = useRef('');
  const lastLangRef = useRef(lang);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Skip if translation is disabled or text is empty
    if (!enabled || !text || typeof text !== 'string' || !text.trim()) {
      if (mountedRef.current) {
        setTranslatedText(text || fallback || '');
      }
      return;
    }

    // Always update refs to track changes
    const textChanged = text !== lastTextRef.current;
    const langChanged = lang !== lastLangRef.current;
    
    lastTextRef.current = text;
    lastLangRef.current = lang;

    // If neither text nor language changed, skip
    if (!textChanged && !langChanged) {
      return;
    }

    // Detect if text is already in target language
    const hasArabic = /[\u0600-\u06FF\u0750-\u077F]/.test(text);
    const isArabic = hasArabic && lang === 'ar';
    const isEnglish = !hasArabic && lang === 'en';

    // If text is already in target language, no need to translate
    if (isArabic || isEnglish) {
      if (mountedRef.current) {
        setTranslatedText(text);
      }
      return;
    }

    // Translate the text (always translate when language changes, even if text is same)
    console.log('🔄 useDynamicTranslation: Starting translation', {
      text: text.substring(0, 30) + '...',
      lang,
      textChanged,
      langChanged,
    });
    
    setIsTranslating(true);
    translateText(text, lang)
      .then((translated) => {
        console.log('✅ useDynamicTranslation: Translation complete', {
          original: text.substring(0, 30) + '...',
          translated: translated?.substring(0, 30) + '...',
        });
        if (mountedRef.current) {
          // Use translated text if available, otherwise fall back to original
          setTranslatedText(translated || text || fallback || '');
          setIsTranslating(false);
        }
      })
      .catch((error) => {
        console.error('❌ useDynamicTranslation: Translation failed', error);
        // Silently fail and use original text
        if (mountedRef.current) {
          setTranslatedText(text || fallback || '');
          setIsTranslating(false);
        }
      });
  }, [text, lang, enabled, fallback]);

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

