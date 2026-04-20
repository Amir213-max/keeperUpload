/** Laravel public disk URL (…/storage). Env can be origin only, e.g. https://keepersport.store */
export function getStorageBaseUrl() {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_STORAGE_BASE) {
    const b = String(process.env.NEXT_PUBLIC_STORAGE_BASE).replace(/\/+$/, "");
    return b.endsWith("/storage") ? b : `${b}/storage`;
  }
  return "https://keepersport.store/storage";
}

/**
 * CMS sometimes stores paths as `settings/…` or `storage/settings/…`.
 * Base URL already ends with `/storage`, so strip leading `storage/` to avoid …/storage/storage/…
 */
export function normalizeStorageRelativeKey(key) {
  let k = String(key || "").replace(/^\/+/, "").replace(/\\/g, "/");
  while (/^storage\//i.test(k)) {
    k = k.replace(/^storage\//i, "");
  }
  return k.replace(/^\/+/, "");
}

/** Collapse accidental /storage/storage/ in a full URL */
export function dedupeStorageInUrl(url) {
  if (typeof url !== "string") return url;
  return url.replace(/(\/storage)\/storage\//gi, "$1/");
}

/** Default logo when CMS group `logo` is missing or empty */
export const SITE_LOGO_FALLBACK_URL =
  "https://static-assets.keepersport.net/dist/82d4dde2fe42e8e4fbfc.svg";

function padBase64(s) {
  const str = String(s).replace(/\s/g, "");
  const pad = str.length % 4;
  if (pad === 0) return str;
  return str + "=".repeat(4 - pad);
}

function decodeBase64Utf8(b64) {
  const padded = padBase64(b64);
  if (typeof Buffer !== "undefined") {
    try {
      return Buffer.from(padded, "base64").toString("utf8");
    } catch {
      /* fall through */
    }
  }
  if (typeof atob !== "undefined") {
    try {
      return atob(padded);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * CMS may store logo `value` as Base64 JSON: { bucket, key, edits } → build storage URL.
 */
function urlFromBase64AssetPayload(str) {
  const t = String(str).trim();
  if (!t || t.length < 8) return null;
  // Heuristic: base64 of `{"` starts with eyJ
  if (!t.startsWith("eyJ")) return null;
  try {
    const jsonStr = decodeBase64Utf8(t);
    if (!jsonStr) return null;
    const obj = JSON.parse(jsonStr);
    if (!obj || typeof obj.key !== "string") return null;
    const key = normalizeStorageRelativeKey(obj.key);
    if (!key) return null;
    return dedupeStorageInUrl(`${getStorageBaseUrl().replace(/\/+$/, "")}/${key}`);
  } catch {
    return null;
  }
}

/** Reject site home/marketing URLs mistaken for image src (e.g. https://keepersport.sa/) */
function looksLikeDirectImageHttpUrl(str) {
  if (!/^https?:\/\//i.test(str)) return true;
  try {
    const u = new URL(str);
    const path = (u.pathname || "").replace(/\/+$/, "") || "/";
    if (path === "/" || path === "") return false;
    if (/\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(path)) return true;
    if (path.includes("/storage/") || path.includes("/user_upload/")) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Relative paths from CMS (e.g. settings/xxx.webp, user_upload/…) → absolute storage URL.
 */
function storageUrlFromRelativePath(t) {
  const key = normalizeStorageRelativeKey(t);
  if (!key) return null;
  const looksLikeFile =
    /^settings\//i.test(key) ||
    /user_upload\//i.test(key) ||
    /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(key);
  if (!looksLikeFile) return null;
  return dedupeStorageInUrl(`${getStorageBaseUrl().replace(/\/+$/, "")}/${key}`);
}

/**
 * Turn one setting field (value / url / image) into a usable image URL.
 */
export function resolveLogoCandidate(raw) {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) {
    if (!looksLikeDirectImageHttpUrl(t)) return null;
    return dedupeStorageInUrl(t);
  }
  if (t.startsWith("//")) {
    const full = `https:${t}`;
    if (!looksLikeDirectImageHttpUrl(full)) return null;
    return dedupeStorageInUrl(full);
  }
  const fromPayload = urlFromBase64AssetPayload(t);
  if (fromPayload) return fromPayload;
  const fromStorage = storageUrlFromRelativePath(t);
  if (fromStorage) return fromStorage;
  return null;
}

/**
 * Ordered candidates from one Setting row (CMS may store uploads on `image`, `multiple_images`, or `value`).
 */
function settingLogoCandidates(setting) {
  if (!setting || typeof setting !== "object") return [];
  const out = [];
  if (setting.image) out.push(setting.image);
  if (Array.isArray(setting.multiple_images)) {
    for (const m of setting.multiple_images) {
      if (m) out.push(m);
    }
  }
  // Prefer path/value before `url`: CMS often sets url to the shop homepage, not the image file.
  if (setting.value) out.push(setting.value);
  if (setting.url) out.push(setting.url);
  return out;
}

/**
 * Pick site logo URL from Query.publicSettings rows (group `logo`, case-insensitive).
 * Tries `image`, then `multiple_images`, then `value` (storage path e.g. settings/….webp), then `url` if it looks like a direct image URL.
 */
export function pickSiteLogoUrl(settings) {
  if (!Array.isArray(settings) || settings.length === 0) return null;
  const inGroup = settings.filter((s) => String(s.group || "").toLowerCase() === "logo");
  if (!inGroup.length) return null;
  const preferred =
    inGroup.find((s) => String(s.key || "").toLowerCase() === "logo") || inGroup[0];
  for (const c of settingLogoCandidates(preferred)) {
    const url = resolveLogoCandidate(c);
    if (url) return url;
  }
  return null;
}

/** Unified helper for any consumer (navbar, metadata, favicon routes). */
export function getSiteLogoUrlOrFallback(settings) {
  return pickSiteLogoUrl(settings) || SITE_LOGO_FALLBACK_URL;
}
