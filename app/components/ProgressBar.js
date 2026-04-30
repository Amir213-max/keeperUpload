'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { KEEPER_NAV_PENDING } from '../lib/navigationProgress';

export default function ProgressBar() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);
  const intervalRef = useRef(null);
  const showDelayRef = useRef(null);
  const finishTimeoutRef = useRef(null);
  const navigationPendingRef = useRef(false);
  const barVisibleRef = useRef(false);

  const clearAllTimers = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (showDelayRef.current) {
      clearTimeout(showDelayRef.current);
      showDelayRef.current = null;
    }
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    const armNavigationProgress = () => {
      navigationPendingRef.current = true;
      barVisibleRef.current = false;
      clearAllTimers();

      // Show bar only if navigation takes noticeable time.
      showDelayRef.current = setTimeout(() => {
        if (!navigationPendingRef.current) return;
        barVisibleRef.current = true;
        setLoading(true);
        setProgress(12);

        let current = 12;
        intervalRef.current = setInterval(() => {
          if (current >= 88) return;
          const step = current < 40 ? 10 : current < 70 ? 5 : 2;
          current = Math.min(88, current + step);
          setProgress(current);
        }, 90);
      }, 220);
    };

    const handleClick = (event) => {
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!target) return;
      const href = target.getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (/^https?:\/\//i.test(href)) return;
      if (!href.startsWith('/')) return;
      if (target.getAttribute('target') === '_blank') return;

      armNavigationProgress();
    };

    const handleKeeperNavPending = () => armNavigationProgress();

    document.addEventListener('click', handleClick, true);
    window.addEventListener(KEEPER_NAV_PENDING, handleKeeperNavPending);
    return () => {
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener(KEEPER_NAV_PENDING, handleKeeperNavPending);
    };
  }, []);

  useEffect(() => {
    if (pathname === prevPathnameRef.current) return;
    prevPathnameRef.current = pathname;
    navigationPendingRef.current = false;

    // Route finished before delay -> never show bar.
    if (!barVisibleRef.current) {
      clearAllTimers();
      return;
    }

    clearAllTimers();
    setProgress(100);
    finishTimeoutRef.current = setTimeout(() => {
      setLoading(false);
      setProgress(0);
      barVisibleRef.current = false;
    }, 180);

    return () => {
      clearAllTimers();
    };
  }, [pathname]);

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
