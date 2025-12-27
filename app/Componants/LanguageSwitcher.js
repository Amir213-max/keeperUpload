// components/LanguageSwitcher.js
'use client';

import { useTranslation } from '../contexts/TranslationContext';
import { useEffect } from 'react';
import { clearTranslationCache } from '../lib/translationService';

export default function LanguageSwitcher() {
  const { lang, setLang } = useTranslation();

  // Clear translation cache when language changes to force re-translation
  useEffect(() => {
    clearTranslationCache();
  }, [lang]);

  const handleLanguageChange = (newLang) => {
    if (newLang !== lang) {
      // Clear cache before changing language
      clearTranslationCache();
      setLang(newLang);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleLanguageChange('ar')}
        className={`px-3 py-1 rounded text-sm transition ${
          lang === 'ar'
            ? 'bg-blue-600 text-white font-semibold'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        العربية
      </button>
      <button
        onClick={() => handleLanguageChange('en')}
        className={`px-3 py-1 rounded text-sm transition ${
          lang === 'en'
            ? 'bg-blue-600 text-white font-semibold'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        English
      </button>
    </div>
  );
}
