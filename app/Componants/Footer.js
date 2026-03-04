'use client';
import { useEffect, useState } from 'react';
import { FaFacebook, FaInstagram, FaYoutube, FaTiktok, FaWhatsapp } from 'react-icons/fa';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import DynamicText from '../components/DynamicText';
import { useTranslation } from '../contexts/TranslationContext';

export default function Footer() {
  const { t, lang } = useTranslation();
  const [settings, setSettings] = useState([]);
  const [footerTexts, setFooterTexts] = useState([]);
  const [translatedFooterTexts, setTranslatedFooterTexts] = useState([]);
  const [socialLinks, setSocialLinks] = useState([]);
  const pathname = usePathname();

  useEffect(() => {
    async function fetchSettings() {
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

        // نصوص الفوتر
        const textSettings = allSettings.filter(
          (s) => s.group && s.group.toLowerCase() === 'footer_text'
        );
        setFooterTexts(textSettings);
        setTranslatedFooterTexts(textSettings); // Initialize

        // باقي الإعدادات (لروابط الفوتر) - استبعاد offers_label
        const otherSettings = allSettings.filter(
          (s) => s.group && !['footer_text', 'social', 'offers_label'].includes(s.group.toLowerCase())
        );
        setSettings(otherSettings);

        // روابط السوشيال
        const socials = allSettings.filter(
          (s) => s.group && s.group.toLowerCase() === 'social'
        );
        setSocialLinks(socials);
      } catch (err) {
        console.error('Error fetching footer settings:', err);
      }
    }

    fetchSettings();
  }, []);

  // ترجمة footerTexts عند تغيير اللغة
  useEffect(() => {
    const translateFooterTexts = async () => {
      if (footerTexts.length === 0) return;
      
      if (lang === 'en') {
        setTranslatedFooterTexts(footerTexts);
        return;
      }

      try {
        const translated = await Promise.all(
          footerTexts.map(async (item) => {
            try {
              // استخراج النص من HTML
              const textContent = item.value.replace(/<[^>]*>/g, '').trim();
              if (!textContent) return item;

              const response = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textContent, target: lang }),
              });
              const data = await response.json();
              const translatedText = data.translatedText || textContent;
              
              // استبدال النص في HTML
              const translatedHtml = item.value.replace(textContent, translatedText);
              return { ...item, value: translatedHtml };
            } catch (err) {
              return item;
            }
          })
        );
        setTranslatedFooterTexts(translated);
      } catch (err) {
        console.error('Error translating footer texts:', err);
        setTranslatedFooterTexts(footerTexts);
      }
    };

    translateFooterTexts();
  }, [footerTexts, lang]);

  // Group settings by group name
  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.group]) acc[setting.group] = [];
    acc[setting.group].push(setting);
    return acc;
  }, {});

  // Map icons dynamically
  const getSocialIcon = (key) => {
    const lower = key.toLowerCase();
    if (lower.includes('facebook')) return <FaFacebook />;
    if (lower.includes('instagram')) return <FaInstagram />;
    if (lower.includes('youtube')) return <FaYoutube />;
    if (lower.includes('tiktok')) return <FaTiktok />;
    if (lower.includes('whatsapp')) return <FaWhatsapp />;
    return null;
  };

  return (
    <footer className="bg-neutral-900 text-white text-sm">

      {/* Footer text (only on homepage) */}
      {pathname === '/' && translatedFooterTexts.length > 0 && (
        <div className="bg-black text-white flex justify-center py-4 sm:py-6 px-4">
          <div className="text-center text-sm sm:text-base md:text-lg font-semibold max-w-4xl leading-relaxed space-y-3">
            {translatedFooterTexts.map((item, i) => (
              <div key={i} dangerouslySetInnerHTML={{ __html: item.value }} />
            ))}
          </div>
        </div>
      )}

      {/* Newsletter signup */}
      <div className="bg-yellow-400 text-black px-4 py-6 flex flex-col sm:flex-row items-center justify-center gap-4">
        <input
          type="email"
          placeholder={t('Your email address . . .') || 'Your email address . . .'}
          className="w-full sm:w-1/2 md:w-1/3 px-4 py-2 rounded bg-neutral-800 text-amber-50 placeholder-amber-200"
          aria-label={t('Email address for newsletter') || 'Email address for newsletter'}
        />
        <button className="bg-white px-6 py-2 rounded font-bold cursor-pointer hover:bg-gray-200 w-full sm:w-auto" aria-label={t('Subscribe to newsletter') || 'Subscribe to newsletter'}>
          {t('SIGN UP!') || 'SIGN UP!'}
        </button>
      </div>

      {/* Footer links */}
      <div className="grid grid-cols-1 space-x-2 md:grid-cols-3 lg:grid-cols-5 gap-8 px-6 py-10 max-w-7xl mx-auto">
   {Object.entries(groupedSettings)
  .filter(([group]) => group.toLowerCase() !== 'general') // 👈 استبعاد الجروب general
  .map(([group, values]) => (
    <div key={group}>
      <h3 className="font-bold text-lg mb-4">
        <DynamicText>{group}</DynamicText>
      </h3>
      <ul className="space-y-4 space-x-2">
        {values.map((setting, i) => (
          <li key={i} className="cursor-pointer hover:text-amber-400 transition">
            {setting.url ? (
              <Link href={setting.url} aria-label={setting.value}>
                <DynamicText>{setting.value}</DynamicText>
              </Link>
            ) : (
              <span><DynamicText>{setting.value}</DynamicText></span>
            )}
          </li>
        ))}
      </ul>
    </div>
  ))}

      </div>

      <hr className="border-gray-700" />

      {/* Social media (dynamically from API) */}
      <div className="flex justify-center gap-6 py-8 text-2xl">
        {socialLinks.map((item, i) => (
          <a
            key={i}
            href={item.value}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-400 transition-transform transform hover:scale-125"
            aria-label={`Visit our ${item.key} page`}
          >
            {getSocialIcon(item.key)}
          </a>
        ))}
      </div>

      {/* Copyright */}
      <div className="bg-black py-4 text-center text-xs text-gray-400 border-t border-gray-800">
        © {new Date().getFullYear()} KeeperSport | {t('All Rights Reserved') || 'All Rights Reserved'}
      </div>
    </footer>
  );
}
