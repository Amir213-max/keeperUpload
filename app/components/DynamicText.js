'use client';

import { useDynamicTranslation } from '../hooks/useDynamicTranslation';
import { useMemo } from 'react';

/**
 * Component for displaying dynamically translated API content
 * Only translates content from API, not static UI text
 * 
 * FIXES:
 * - Memoizes children to prevent unnecessary re-renders
 * - Only renders when translation is complete or text changes
 * 
 * @param {string} children - Text to translate (from API)
 * @param {object} props - Additional props
 */
export default function DynamicText({ children, className, ...props }) {
  // Normalize children to string to prevent unnecessary re-renders
  const text = useMemo(() => {
    if (children === null || children === undefined) return '';
    return String(children).trim();
  }, [children]);

  console.log('📦 DynamicText: Rendering', {
    original: text?.substring(0, 30) + '...',
    textLength: text?.length || 0,
    hasChildren: !!children,
  });

  const { translatedText, isTranslating } = useDynamicTranslation(text);

  console.log('📦 DynamicText: Translation state', {
    original: text?.substring(0, 30) + '...',
    translated: translatedText?.substring(0, 30) + '...',
    isTranslating,
    originalLength: text?.length,
    translatedLength: translatedText?.length,
  });

  // Memoize the display text to prevent unnecessary re-renders
  const displayText = useMemo(() => {
    // Show original text while translating to prevent flickering
    // Only show translated text when translation is complete
    const result = isTranslating ? text : translatedText;
    console.log('📦 DynamicText: Display text calculated', {
      isTranslating,
      displayText: result?.substring(0, 30) + '...',
    });
    return result;
  }, [isTranslating, text, translatedText]);

  return (
    <span className={className} {...props}>
      {displayText}
    </span>
  );
}

