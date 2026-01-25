// // hooks/useTranslation.js
// 'use client';
// import { useState, useEffect } from 'react';

// const dictionaries = {
//   en: () => import('../locales/en.json').then((mod) => mod.default),
//   ar: () => import('../locales/ar.json').then((mod) => mod.default),
// };

// export function useTranslation() {
//   const [lang, setLang] = useState('en');
//   const [dict, setDict] = useState({});

//   useEffect(() => {
//     dictionaries[lang]().then(setDict);
//     document.documentElement.lang = lang;
//     document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
//   }, [lang]);

//   function t(key) {
//     return dict[key] || key;
//   }

//   return { t, lang, setLang };
// }
