'use client';
import { useEffect, useState, useRef } from 'react';
import { FaFacebook, FaInstagram, FaYoutube, FaTiktok, FaWhatsapp } from 'react-icons/fa';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import DynamicText from '../components/DynamicText';
import { useTranslation } from '../contexts/TranslationContext';
import {
  resolveLogoCandidate,
  getStorageBaseUrl,
  normalizeStorageRelativeKey,
  dedupeStorageInUrl,
} from '../lib/siteLogoFromSettings';

/** Same idea as HomePageBlocks: prefix relative storage paths from CMS settings */
const BASE_URL = `${getStorageBaseUrl().replace(/\/+$/, '')}/`;
const FOOTER_SETTINGS_CACHE_KEY = "footer_public_settings_v1";
const FOOTER_SETTINGS_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Full image URL: resolver (http / base64 / known storage paths), else BASE_URL + relative key.
 */
function ensureAbsoluteSettingImage(raw) {
  const str = typeof raw === 'string' ? raw.trim() : '';
  if (!str) return null;
  const resolved = resolveLogoCandidate(str);
  if (resolved) return resolved;
  if (/^https?:\/\//i.test(str) || str.startsWith('//')) return null;
  const key = normalizeStorageRelativeKey(str);
  if (!key) return null;
  return dedupeStorageInUrl(`${BASE_URL.replace(/\/+$/, '')}/${key}`);
}

/** CMS `multiple_images`: trust badges, payment methods, certificates (footer strip). */
function resolveMultipleImageUrls(setting) {
  if (!setting || !Array.isArray(setting.multiple_images)) return [];
  return setting.multiple_images
    .map((raw) => ensureAbsoluteSettingImage(raw))
    .filter(Boolean);
}

function pagmentIconSrc(setting) {
  if (!setting || typeof setting !== 'object') return null;
  for (const raw of [setting.image, setting.value, setting.url]) {
    const u = ensureAbsoluteSettingImage(raw);
    if (u) return u;
  }
  return null;
}

function pagmentDescriptionText(setting) {
  const d = typeof setting?.description === 'string' ? setting.description.trim() : '';
  if (d) return d;
  const v = typeof setting?.value === 'string' ? setting.value.trim() : '';
  const iconFromValue = ensureAbsoluteSettingImage(v);
  if (iconFromValue && v === setting?.value) return '';
  return v;
}

function isProbablyHtml(s) {
  return typeof s === 'string' && /<\/?[a-z][\s\S]*>/i.test(s);
}

/** CMS may use `payment` or the legacy typo `pagment` */
function isPaymentLikeGroup(group) {
  const g = String(group || '').toLowerCase();
  return g === 'payment' || g === 'pagment';
}

export default function Footer() {
  const { t, lang } = useTranslation();
  const [settings, setSettings] = useState([]);
  const [footerTexts, setFooterTexts] = useState([]);
  const [translatedFooterTexts, setTranslatedFooterTexts] = useState([]);
  const [socialLinks, setSocialLinks] = useState([]);
  const [pagmentRows, setPagmentRows] = useState([]);
  const pathname = usePathname();
  const prevFooterTextsRef = useRef(null);
  const prevLangRef = useRef(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        if (typeof window !== "undefined") {
          const raw = sessionStorage.getItem(FOOTER_SETTINGS_CACHE_KEY);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (parsed?.ts && Date.now() - parsed.ts < FOOTER_SETTINGS_CACHE_TTL_MS) {
                const cachedSettings = parsed.data || [];
                const textSettings = cachedSettings.filter(
                  (s) => s.group && s.group.toLowerCase() === 'footer_text'
                );
                setFooterTexts(textSettings);
                setTranslatedFooterTexts(textSettings);
                const otherSettings = cachedSettings.filter(
                  (s) =>
                    s.group &&
                    !["footer_text", "social", "offers_label", "logo"].includes(s.group.toLowerCase()) &&
                    !isPaymentLikeGroup(s.group)
                );
                setSettings(otherSettings);
                const pagmentSettings = cachedSettings.filter((s) => s.group && isPaymentLikeGroup(s.group));
                setPagmentRows(pagmentSettings);
                const socials = cachedSettings.filter(
                  (s) => s.group && s.group.toLowerCase() === 'social'
                );
                setSocialLinks(socials);
                return;
              }
            } catch {
              sessionStorage.removeItem(FOOTER_SETTINGS_CACHE_KEY);
            }
          }
        }

        const res = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query {
                publicSettings {
                  id
                  key
                  value
                  group
                  url
                  image
                  description
                  multiple_images
                }
              }
            `
          }),
        });

        const data = await res.json();
        const allSettings = data?.data?.publicSettings || [];
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            FOOTER_SETTINGS_CACHE_KEY,
            JSON.stringify({ ts: Date.now(), data: allSettings })
          );
        }

        // نصوص الفوتر
        const textSettings = allSettings.filter(
          (s) => s.group && s.group.toLowerCase() === 'footer_text'
        );
        setFooterTexts(textSettings);
        setTranslatedFooterTexts(textSettings); // Initialize

        // باقي الإعدادات (لروابط الفوتر) — استبعاد شريط العروض، السوشيال، ولوجو الموقع
        const otherSettings = allSettings.filter(
          (s) =>
            s.group &&
            !["footer_text", "social", "offers_label", "logo"].includes(s.group.toLowerCase()) &&
            !isPaymentLikeGroup(s.group)
        );
        setSettings(otherSettings);

        const pagmentSettings = allSettings.filter((s) => s.group && isPaymentLikeGroup(s.group));
        setPagmentRows(pagmentSettings);

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
    // 🔹 منع تشغيل useEffect إذا كان footerTexts فارغاً
    if (footerTexts.length === 0) {
      if (prevFooterTextsRef.current === null) {
        setTranslatedFooterTexts([]);
        prevFooterTextsRef.current = [];
      }
      return;
    }
    
    // 🔹 التحقق من وجود تغيير فعلي في footerTexts أو lang
    const footerTextsStr = JSON.stringify(footerTexts);
    const prevFooterTextsStr = prevFooterTextsRef.current ? JSON.stringify(prevFooterTextsRef.current) : null;
    const hasFooterTextsChanged = prevFooterTextsStr !== footerTextsStr;
    const hasLangChanged = prevLangRef.current !== lang;
    
    // 🔹 تحديث refs فقط إذا تغيرت القيم فعلياً
    if (!hasFooterTextsChanged && !hasLangChanged) {
      return;
    }
    
    const translateFooterTexts = async () => {
      if (lang === 'en') {
        setTranslatedFooterTexts(footerTexts);
        prevFooterTextsRef.current = footerTexts;
        prevLangRef.current = lang;
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
        prevFooterTextsRef.current = footerTexts;
        prevLangRef.current = lang;
      } catch (err) {
        console.error('Error translating footer texts:', err);
        setTranslatedFooterTexts(footerTexts);
        prevFooterTextsRef.current = footerTexts;
        prevLangRef.current = lang;
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

  const visiblePagmentRows = pagmentRows.filter((row) => {
    const iconSrc = pagmentIconSrc(row);
    const multi = resolveMultipleImageUrls(row);
    const body = pagmentDescriptionText(row);
    const descStr = typeof row?.description === 'string' ? row.description.trim() : '';
    return !!(iconSrc || multi.length > 0 || body || (descStr && isProbablyHtml(descStr)));
  });

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
  .filter(
    ([group]) =>
      !["general", "logo"].includes(String(group).toLowerCase()) && !isPaymentLikeGroup(group)
  )
  .map(([group, values]) => (
    <div key={group}>
      <h3 className="font-bold text-lg mb-4">
        <DynamicText>{group}</DynamicText>
      </h3>
      <ul className="space-y-4 space-x-2">
        {values.map((setting, i) => {
          const stripUrls = resolveMultipleImageUrls(setting);
          if (stripUrls.length > 0) {
            return (
              <li key={setting.id || i} className="list-none">
                <div
                  className="flex flex-wrap items-center gap-3 py-1"
                  role="list"
                  aria-label={setting.key || String(group)}
                >
                  {stripUrls.map((src, j) => (
                    <div
                      key={j}
                      role="listitem"
                      className="flex h-11 items-center justify-center rounded-md border border-white/10 bg-white/5 px-2.5 shadow-sm transition hover:border-amber-400/35 hover:bg-white/10"
                    >
                      {setting.url ? (
                        <Link href={setting.url} className="block leading-none" aria-label={setting.value || setting.key || 'Link'}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt=""
                            className="max-h-8 max-w-[5rem] object-contain"
                            width={80}
                            height={32}
                            loading="lazy"
                            decoding="async"
                          />
                        </Link>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={src}
                          alt=""
                          className="max-h-8 max-w-[5rem] object-contain"
                          width={80}
                          height={32}
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                    </div>
                  ))}
                </div>
                {setting.value && typeof setting.value === 'string' && setting.value.trim() ? (
                  <p className="mt-2 text-xs text-neutral-400">
                    <DynamicText>{setting.value}</DynamicText>
                  </p>
                ) : null}
              </li>
            );
          }
          return (
            <li key={i} className="cursor-pointer hover:text-amber-400 transition">
              {setting.url ? (
                <Link href={setting.url} aria-label={setting.value}>
                  <DynamicText>{setting.value}</DynamicText>
                </Link>
              ) : (
                <span><DynamicText>{setting.value}</DynamicText></span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  ))}

        {visiblePagmentRows.length > 0 && (
          <div className="md:col-span-3 lg:col-span-5 border-t border-neutral-700 pt-8 mt-2">
            <h3 className="font-bold text-lg mb-4 text-white capitalize">
              <DynamicText>{visiblePagmentRows[0]?.group || 'Payment'}</DynamicText>
            </h3>
            <ul className="space-y-6">
              {visiblePagmentRows.map((row, i) => {
                const iconSrc = pagmentIconSrc(row);
                const multiUrls = resolveMultipleImageUrls(row);
                const body = pagmentDescriptionText(row);
                const descStr = typeof row?.description === 'string' ? row.description.trim() : '';
                const html = descStr && isProbablyHtml(descStr);
                const hasTextRow = !!(iconSrc || html || body);
                const inner = (
                  <div className="flex flex-col gap-3 text-neutral-200">
                    {hasTextRow ? (
                      <div className="flex flex-row items-center gap-2.5">
                        {iconSrc ? (
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/5 ring-1 ring-white/10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={iconSrc}
                              alt={row.key || 'Payment'}
                              className="max-h-7 max-w-7 object-contain"
                              width={28}
                              height={28}
                              loading="lazy"
                            />
                          </span>
                        ) : null}
                        <div className="min-w-0 flex-1 text-sm leading-snug flex items-center">
                          {html ? (
                            <div dangerouslySetInnerHTML={{ __html: descStr }} />
                          ) : body ? (
                            <DynamicText>{body}</DynamicText>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    {multiUrls.length > 0 ? (
                      <div
                        className="flex flex-wrap items-center justify-start gap-x-4 gap-y-3 sm:gap-x-6 md:justify-center"
                        role="list"
                        aria-label={row.key || 'Payment methods'}
                      >
                        {multiUrls.map((src, idx) => (
                          <div
                            key={`${row.id || row.key || i}-m-${idx}`}
                            role="listitem"
                            className="flex h-12 min-w-[3rem] items-center justify-center rounded-lg border border-white/10 bg-neutral-800/70 px-3 py-2 shadow-sm ring-1 ring-black/25 transition duration-300 hover:border-amber-400/40 hover:bg-neutral-800 hover:shadow-md"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={src}
                              alt=""
                              className="max-h-9 max-w-[5.5rem] object-contain opacity-90 transition duration-300 hover:opacity-100 sm:max-w-[6.5rem]"
                              width={112}
                              height={36}
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
                return (
                  <li key={row.id || row.key || i} className="list-none">
                    {row.url ? (
                      <a
                        href={row.url}
                        className="block rounded-md hover:text-amber-400 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {inner}
                      </a>
                    ) : (
                      <div className="block">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
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
