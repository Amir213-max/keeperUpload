import { graphqlClient } from "./graphqlClient";
import { getSiteLogoUrlOrFallback } from "./siteLogoFromSettings";

export const revalidate = 300;
const PUBLIC_SETTINGS_NAV_QUERY_STRING = `
  query PublicSettingsNav {
    publicSettings {
      key
      value
      group
      url
      image
      multiple_images
    }
  }
`;

export async function getSiteLogoUrlForIcons() {
  try {
    const data = await graphqlClient.request(PUBLIC_SETTINGS_NAV_QUERY_STRING);
    return getSiteLogoUrlOrFallback(data?.publicSettings || []);
  } catch {
    return getSiteLogoUrlOrFallback([]);
  }
}

export async function buildLogoPngWithBlackBackground(size) {
  const dimension = Math.max(16, Number(size) || 32);
  const logoUrl = await getSiteLogoUrlForIcons();

  try {
    const response = await fetch(logoUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to fetch logo: ${response.status}`);
    }

    const inputBuffer = Buffer.from(await response.arrayBuffer());
    const sharpModule = await import("sharp");
    const sharp = sharpModule.default;
    const logoSize = Math.max(10, Math.floor(dimension * 0.82));

    const resizedLogo = await sharp(inputBuffer)
      .resize(logoSize, logoSize, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    const outputPng = await sharp({
      create: {
        width: dimension,
        height: dimension,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      },
    })
      .composite([{ input: resizedLogo, gravity: "center" }])
      .png()
      .toBuffer();

    return new Response(outputPng, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
      },
    });
  } catch {
    return Response.redirect(logoUrl, 307);
  }
}
