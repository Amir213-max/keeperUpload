'use client';
import { createContext, useContext, useState, useEffect } from 'react';

// Static imports بدل dynamic imports
import en from '../../locales/en.json';
import ar from '../../locales/ar.json';

const TranslationContext = createContext();

const dictionaries = {
  en,
  ar,
};

export const TranslationProvider = ({ children }) => {
  // 👇 نخلي الافتراضي عربي
  const [lang, setLang] = useState('ar');
  const [dict, setDict] = useState(dictionaries['ar']);

  useEffect(() => {
    // 👇 يقرأ من لغة الجهاز، والـ fallback عربي
    const browserLang = navigator.language.startsWith('en')
      ? 'en'
      : 'ar';
    setLang(browserLang);
  }, []);

  useEffect(() => {
    setDict(dictionaries[lang]);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const t = (key) => dict[key] || key;

  return (
    <TranslationContext.Provider value={{ t, lang, setLang }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => useContext(TranslationContext);














