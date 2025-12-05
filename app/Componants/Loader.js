'use client';

import Image from 'next/image';

export default function Loader() {
  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center bg-black py-20">
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28">
        <Image
          src="https://static-assets.keepersport.net/dist/82d4dde2fe42e8e4fbfc.svg"
          alt="Loading..."
          fill
          className="object-contain animate-pulse-opacity"
          priority
        />
      </div>
    </div>
  );
}

