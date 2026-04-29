'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Clock, X } from 'lucide-react';

export default function PreviewBadge({ expiresAt }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!expiresAt) return '';
      
      const now = new Date();
      const expiry = new Date(expiresAt);
      const difference = expiry - now;

      if (difference <= 0) {
        return 'Expired';
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        return `${days} day${days > 1 ? 's' : ''} left`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m left`;
      } else {
        return `${minutes}m left`;
      }
    };

    // Update immediately
    setTimeLeft(calculateTimeLeft());

    // Update every minute
    const timer = setInterval(calculateTimeLeft, 60000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  return (
    <AnimatePresence>
      {!isMinimized && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-4 z-50 bg-amber-500 text-white shadow-lg rounded-lg p-3 max-w-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 flex-shrink-0" />
              <div>
                <div className="font-semibold text-sm">Preview Mode</div>
                {timeLeft && (
                  <div className="flex items-center gap-1 text-xs opacity-90">
                    <Clock className="w-3 h-3" />
                    <span>{timeLeft}</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 hover:bg-amber-600 rounded transition-colors"
              aria-label="Minimize preview badge"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      )}
      
      {/* Minimized version */}
      {isMinimized && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => setIsMinimized(false)}
          className="fixed top-4 left-4 z-50 bg-amber-500 text-white shadow-lg rounded-full p-2 hover:bg-amber-600 transition-colors"
          aria-label="Show preview badge"
        >
          <Eye className="w-4 h-4" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
