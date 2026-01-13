'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function OffersBanner() {
  const [offersLabel, setOffersLabel] = useState(null);
  const pathname = usePathname();

  useEffect(() => {
    async function fetchOffersLabel() {
      try {
        const res = await fetch('https://keepersport.store/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query {
                publicSettings {
                  key
                  value
                  group
                  url
                }
              }
            `
          }),
        });

        const data = await res.json();
        const allSettings = data?.data?.publicSettings || [];

        // البحث عن الجروب offers_label
        const offersLabelSetting = allSettings.find(
          (s) => s.group && s.group.toLowerCase() === 'offers_label'
        );

        if (offersLabelSetting) {
          setOffersLabel(offersLabelSetting);
        }
      } catch (err) {
        console.error('Error fetching offers label:', err);
      }
    }

    fetchOffersLabel();
  }, []);

  // عرض الشريط فقط في الصفحة الرئيسية
  if (pathname !== '/') {
    return null;
  }

  // إذا لم يكن هناك offers_label، لا نعرض الشريط
  if (!offersLabel || !offersLabel.value) {
    return null;
  }

  // إذا كان هناك URL، نجعله قابل للنقر
  const content = offersLabel.url ? (
    <Link 
      href={offersLabel.url} 
      className="block w-full font-bold text-center hover:opacity-90 transition-opacity"
      aria-label={offersLabel.value}
    >
      {offersLabel.value}
    </Link>
  ) : (
    <span>{offersLabel.value}</span>
  );

  return (
    <div className="bg-yellow-600 text-white py-2 px-4 w-full">
      <div className="text-center text-sm sm:text-base font-medium">
        {content}
      </div>
    </div>
  );
}
