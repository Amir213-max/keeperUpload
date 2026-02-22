'use client';

import { useEffect, useState } from 'react';

export default function ProgressBar({ isLoading, progress = 0 }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (isLoading) {
      // ✅ استخدام progress الفعلي إذا كان متوفراً
      if (progress > 0) {
        setWidth(Math.min(progress, 99)); // لا نصل إلى 100% حتى يكتمل التحميل
      } else {
        // ✅ إذا لم يكن هناك progress، نبدأ من 0
        setWidth(0);
      }
    } else {
      // ✅ Complete to 100% when loading is done
      setWidth(100);
      // ✅ Hide after animation
      setTimeout(() => {
        setWidth(0);
      }, 300);
    }
  }, [isLoading, progress]);

  if (!isLoading && width === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-transparent">
      <div
        className="h-full bg-yellow-500 transition-all duration-200 ease-out shadow-lg"
        style={{
          width: `${width}%`,
          boxShadow: '0 0 10px rgba(234, 179, 8, 0.5), 0 0 20px rgba(234, 179, 8, 0.3)',
        }}
      />
    </div>
  );
}
