'use client';

import { useDynamicTranslation } from '../hooks/useDynamicTranslation';

/**
 * Component for displaying dynamically translated API content
 * Only translates content from API, not static UI text
 * 
 * @param {string} children - Text to translate (from API)
 * @param {object} props - Additional props
 */
export default function DynamicText({ children, className, ...props }) {
  const { translatedText, isTranslating } = useDynamicTranslation(children);

  return (
    <span className={className} {...props}>
      {isTranslating ? children : translatedText}
    </span>
  );
}

