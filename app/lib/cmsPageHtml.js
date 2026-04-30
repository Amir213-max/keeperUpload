import { getStorageBaseUrl, normalizeStorageRelativeKey, dedupeStorageInUrl } from "./siteLogoFromSettings";

function storageKeyFromUrlPathname(pathname) {
  const p = String(pathname || "").replace(/^\/+/, "");
  const m = p.match(/^storage\/(.+)$/i);
  return m ? normalizeStorageRelativeKey(m[1]) : null;
}

/**
 * Dashboard often saves `http://localhost/storage/...` — same files as blogs
 * (`https://keepersport.store/storage/...` / NEXT_PUBLIC_STORAGE_BASE).
 */
function rewriteLocalhostStorageHttpUrl(s) {
  try {
    const u = new URL(s);
    if (!/^localhost|127\.0\.0\.1$/i.test(u.hostname)) return null;
    const key = storageKeyFromUrlPathname(u.pathname);
    if (!key) return null;
    const base = getStorageBaseUrl().replace(/\/+$/, "");
    const out = dedupeStorageInUrl(`${base}/${key}`);
    return u.search ? `${out}${u.search}` : out;
  } catch {
    return null;
  }
}

/**
 * Turn relative / storage-relative URLs from dashboard HTML into absolute storage URLs.
 * Safe for SSR and client (uses NEXT_PUBLIC_STORAGE_BASE when set).
 */
export function absolutizeCmsMediaUrl(raw) {
  const s = String(raw ?? "").trim();
  if (!s || s.startsWith("data:") || s.startsWith("blob:")) return s;
  if (s.startsWith("#")) return s;

  if (/^https?:\/\//i.test(s)) {
    const localFixed = rewriteLocalhostStorageHttpUrl(s);
    if (localFixed) return localFixed;
    return dedupeStorageInUrl(s);
  }

  if (s.startsWith("//")) return dedupeStorageInUrl(`https:${s}`);
  const key = normalizeStorageRelativeKey(s.startsWith("/") ? s.slice(1) : s);
  if (!key) return s;
  const base = getStorageBaseUrl().replace(/\/+$/, "");
  return dedupeStorageInUrl(`${base}/${key}`);
}

function rewriteSrcsetValue(srcset) {
  return String(srcset || "")
    .split(",")
    .map((piece) => {
      const t = piece.trim();
      if (!t) return t;
      const space = t.search(/\s+\d/);
      if (space === -1) return absolutizeCmsMediaUrl(t);
      const urlPart = t.slice(0, space).trim();
      const rest = t.slice(space);
      return `${absolutizeCmsMediaUrl(urlPart)}${rest}`;
    })
    .join(", ");
}

function rewriteTagAttributes(tagOpen, attrNames) {
  let out = tagOpen;
  for (const name of attrNames) {
    const re = new RegExp(`\\b${name}\\s*=\\s*(["'])([^"']*)\\1`, "i");
    out = out.replace(re, (full, quote, val) => {
      if (name.toLowerCase() === "srcset") {
        return `${name}=${quote}${rewriteSrcsetValue(val)}${quote}`;
      }
      return `${name}=${quote}${absolutizeCmsMediaUrl(val)}${quote}`;
    });
  }
  return out;
}

/** Strip text that looks like filename / dimensions / file size (editor junk). */
function figcaptionIsMetaOnly(innerHtml) {
  const t = String(innerHtml || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return true;
  if (/\b\d{1,5}\s*(KB|MB|bytes?)\b/i.test(t)) return true;
  if (/\b\d{2,5}\s*[×x]\s*\d{2,5}\b/.test(t)) return true;
  if (/\.(png|jpe?g|gif|webp|svg|avif)(\?[^.\s]*)?(\s|$|,|;)/i.test(t) && t.length < 160) return true;
  if (/^[\w.-]{1,120}\.(png|jpe?g|gif|webp|svg|avif)(\?[\w.-]*)?$/i.test(t)) return true;
  return false;
}

/**
 * Remove figcaptions that only repeat file name / size / dimensions (not real captions).
 */
export function stripCmsFigureMetaCaptions(html) {
  if (!html || typeof html !== "string") return html;
  return html.replace(/<figcaption\b[^>]*>[\s\S]*?<\/figcaption>/gi, (full) => {
    const inner = full.replace(/^<figcaption\b[^>]*>|<\/figcaption>$/gi, "");
    return figcaptionIsMetaOnly(inner) ? "" : full;
  });
}

/** Remove fixed pixel size and hover title that expose file metadata from dashboard HTML. */
function stripImgPresentationNoise(attrs) {
  let out = attrs
    .replace(/\s+width\s*=\s*(["'])[^"']*\1/gi, "")
    .replace(/\s+height\s*=\s*(["'])[^"']*\1/gi, "")
    .replace(/\s+title\s*=\s*(["'])[^"']*\1/gi, "");
  out = out.replace(/\salt\s*=\s*(["'])([^"']*)\1/gi, (full, quote, altVal) => {
    const t = String(altVal || "").trim();
    if (!t) return full;
    if (/^[\w.-]{1,120}\.(png|jpe?g|gif|webp|svg|avif)(\?[\w.-]*)?$/i.test(t)) {
      return ` alt=${quote}${quote}`;
    }
    if (t.length < 140 && /\.(png|jpe?g|gif|webp|svg|avif)\b/i.test(t) && /\b\d{2,5}\s*[×x]\s*\d{2,5}\b/.test(t)) {
      return ` alt=${quote}${quote}`;
    }
    return full;
  });
  return out;
}

/**
 * Prefix relative image/video poster URLs in CMS HTML from the dashboard.
 */
export function rewriteCmsHtmlMediaUrls(html) {
  if (!html || typeof html !== "string") return html;

  let result = html.replace(/<img\b([^>]*?)>/gi, (full, attrs) => {
    let next = rewriteTagAttributes(attrs, ["src", "srcset"]);
    next = stripImgPresentationNoise(next);
    return `<img${next}>`;
  });

  result = result.replace(/<source\b([^>]*?)>/gi, (full, attrs) => {
    const next = rewriteTagAttributes(attrs, ["srcset", "src"]);
    return `<source${next}>`;
  });

  result = result.replace(/<video\b([^>]*?)>/gi, (full, attrs) => {
    const next = rewriteTagAttributes(attrs, ["poster"]);
    return `<video${next}>`;
  });

  result = stripCmsFigureMetaCaptions(result);

  return result;
}
