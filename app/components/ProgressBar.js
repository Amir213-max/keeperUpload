'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function ProgressBar() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // التحقق من تغيير pathname
    if (pathname !== prevPathnameRef.current) {
      // تنظيف أي timers سابقة
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // بدء التحميل
      setLoading(true);
      setProgress(0);
      prevPathnameRef.current = pathname;

      // محاكاة التقدم بشكل تدريجي
      let currentProgress = 0;
      intervalRef.current = setInterval(() => {
        if (currentProgress >= 90) {
          clearInterval(intervalRef.current);
          return;
        }
        // زيادة تدريجية أسرع في البداية، أبطأ في النهاية
        const increment = currentProgress < 30 ? 15 : currentProgress < 70 ? 8 : 3;
        currentProgress = Math.min(currentProgress + increment, 90);
        setProgress(currentProgress);
      }, 80);

      // إكمال التحميل بعد تحميل الصفحة
      timeoutRef.current = setTimeout(() => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setProgress(100);
        setTimeout(() => {
          setLoading(false);
          setProgress(0);
        }, 300);
      }, 500);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pathname]);

  // مراقبة أحداث التنقل من الروابط
  useEffect(() => {
    const handleClick = (e) => {
      const link = e.target.closest('a[href]');
      if (link && link.href) {
        const href = link.getAttribute('href');
        // التحقق من أن الرابط ليس external أو anchor
        if (href && !href.startsWith('http') && !href.startsWith('#') && href.startsWith('/')) {
          setLoading(true);
          setProgress(0);
        }
      }
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  if (!loading) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-transparent"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="h-full bg-yellow-500 transition-all duration-200 ease-out shadow-lg"
        style={{
          width: `${progress}%`,
          boxShadow: '0 0 10px rgba(234, 179, 8, 0.5), 0 0 20px rgba(234, 179, 8, 0.3)',
        }}
      />
    </div>
  );
}
