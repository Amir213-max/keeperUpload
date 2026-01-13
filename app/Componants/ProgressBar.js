'use client';

import { useEffect, useState } from 'react';

/**
 * ProgressBar - شريط تقدم أصفر رفيع يبدأ من أعلى الصفحة ويصل لآخرها
 * يظهر عند التحميل ويختفي بإنيميشن سلس عند اكتمال التحميل
 */
export default function ProgressBar({ isLoading, onComplete }) {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setIsVisible(true);
      setProgress(0);
      
      // محاكاة التقدم بشكل سلس
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          // تسريع في البداية، ثم إبطاء قليلاً
          const increment = prev < 70 ? 2 : prev < 90 ? 1.5 : 0.5;
          return Math.min(prev + increment, 100);
        });
      }, 50); // تحديث كل 50ms

      return () => clearInterval(interval);
    } else {
      // عند اكتمال التحميل، أكمل إلى 100% ثم اخفي
      if (progress < 100) {
        setProgress(100);
      }
      
      // انتظر قليلاً ثم اخفي بإنيميشن
      const timeout = setTimeout(() => {
        setIsVisible(false);
        if (onComplete) onComplete();
      }, 300);
      
      return () => clearTimeout(timeout);
    }
  }, [isLoading, progress, onComplete]);

  if (!isVisible && progress === 0) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        pointerEvents: 'none',
      }}
    >
      <div
        className="h-[2px] bg-yellow-400 transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          boxShadow: '0 0 10px rgba(250, 204, 21, 0.5)',
        }}
      />
    </div>
  );
}
