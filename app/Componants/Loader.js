'use client';

import Image from 'next/image';
import { usePublicNavSettings } from '../contexts/PublicNavSettingsContext';

export default function Loader() {
  const { siteLogoUrl } = usePublicNavSettings();
  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center bg-black py-20">
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28">
        {siteLogoUrl ? (
          <Image
            key={siteLogoUrl}
            src={siteLogoUrl}
            alt="Loading..."
            fill
            className="object-contain animate-pulse-opacity"
            priority
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 bg-white rounded-full animate-bounce [animation-delay:-0.2s]" />
            <span className="w-2.5 h-2.5 bg-white/85 rounded-full animate-bounce [animation-delay:-0.1s]" />
            <span className="w-2.5 h-2.5 bg-white/70 rounded-full animate-bounce" />
          </div>
        )}
      </div>
    </div>
  );
}

