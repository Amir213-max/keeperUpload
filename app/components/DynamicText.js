'use client';

import { useMemo } from 'react';
import { useDynamicTranslation } from '../hooks/useDynamicTranslation';
import { useTranslation } from '../contexts/TranslationContext';

/**
 * DynamicText
 * ------------
 * مسؤول عن ترجمة النصوص القادمة من الـ API فقط
 * (أسماء منتجات – وصف – إلخ)
 *
 * المميزات:
 * - يعتمد صراحة على lang (عشان الترجمة تشتغل عند تغيير اللغة)
 * - يمنع re-render غير ضروري
 * - يطبع logs واضحة للتتبع
 */
export default function DynamicText({ children, className, ...props }) {
  /**
   * 1️⃣ تطبيع النص (تحويله لـ string ثابت)
   */
  const text = useMemo(() => {
    if (children === null || children === undefined) return '';
    return String(children).trim();
  }, [children]);

  /**
   * 2️⃣ اللغة الحالية من الـ context
   */
  const { lang } = useTranslation();

  /**
   * 3️⃣ الترجمة (مع تمرير lang صراحة)
   */
  const { translatedText, isTranslating } = useDynamicTranslation(text, lang);

  /**
   * 4️⃣ تحديد النص المعروض
   */
  const displayText = useMemo(() => {
    // CRITICAL: When lang === "en" → ALWAYS show original text
    if (lang === 'en') {
      return text;
    }

    // When lang === "ar":
    // - Show original while translating (no flicker)
    // - Show translated when ready
    if (isTranslating) {
      return text;
    }

    // Show translated text if available, otherwise fallback to original
    return translatedText || text;
  }, [isTranslating, translatedText, text, lang]);

  /**
   * 5️⃣ render
   */
  return (
    <span className={className} {...props}>
      {displayText}
    </span>
  );
}
