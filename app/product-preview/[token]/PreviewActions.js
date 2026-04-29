'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Share, Copy, Check, ExternalLink, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PreviewActions({ product }) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Preview link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Preview: ${product.name}`,
          text: `Check out this preview of ${product.name}`,
          url: window.location.href,
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2 text-blue-700">
          <Eye className="w-5 h-5" />
          <span className="font-semibold">Preview Mode</span>
        </div>
        <div className="flex items-center gap-1 text-blue-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>This is how the product will appear when published</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Share className="w-4 h-4" />
              Share Preview
            </>
          )}
        </button>

        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors text-sm font-medium"
        >
          <Copy className="w-4 h-4" />
          Copy Link
        </button>

        <div className="flex items-center gap-2 text-sm text-gray-600 ml-auto">
          <span>SKU:</span>
          <span className="font-mono bg-gray-100 px-2 py-1 rounded">{product.sku}</span>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        <p>
          <strong>Note:</strong> This preview link will expire. 
          {product._preview?.expiresAt && (
            <> Expires on {new Date(product._preview.expiresAt).toLocaleDateString()}</>
          )}
        </p>
      </div>
    </motion.div>
  );
}
