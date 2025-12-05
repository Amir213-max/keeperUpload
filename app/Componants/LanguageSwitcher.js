// components/LanguageSwitcher.js
'use client';

import { usePathname, useRouter } from 'next/navigation';

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();

  const changeLanguage = (lang) => {
    const segments = pathname.split('/');
    segments[1] = lang; // استبدال اللغة
    router.push(segments.join('/'));
  };

  return (
    <div style={{ marginTop: 20 }}>
      <button onClick={() => changeLanguage('ar')}>العربية</button>
      <button onClick={() => changeLanguage('en')} style={{ marginLeft: 10 }}>
        English
      </button>
    </div>
  );
}
