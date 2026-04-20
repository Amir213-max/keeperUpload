'use client';

import Image from 'next/image';
import { usePublicNavSettings } from '../contexts/PublicNavSettingsContext';
import { SITE_LOGO_FALLBACK_URL } from '../lib/siteLogoFromSettings';

export default function Loader() {
  const { siteLogoUrl } = usePublicNavSettings();
  const src = siteLogoUrl || SITE_LOGO_FALLBACK_URL;
  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center bg-black py-20">
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28">
        <Image
          key={src}
          src={src}
          alt="Loading..."
          fill
          className="object-contain animate-pulse-opacity"
          priority
          unoptimized={Boolean(siteLogoUrl)}
        />
      </div>
    </div>
  );
}

