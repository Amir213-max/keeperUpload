/**
 * Root category listing configuration (slug-first).
 * Slugs must match RootCategory.slug from Query.rootCategories.
 * legacyRootCategoryIds: optional fallback if slug differs between environments — remove when CMS slugs are stable.
 */

/** @type {Record<string, { slug: string; legacyRootCategoryIds?: string[] }>} */
export const verticalListingConfig = Object.freeze({
  goalkeeperGloves: {
    slug: "goalkeeper-gloves",
    legacyRootCategoryIds: ["153"],
  },
  teamsport: {
    slug: "teamsport",
    legacyRootCategoryIds: ["21"],
  },
  footballBoots: {
    slug: "football-boots",
    legacyRootCategoryIds: ["54"],
  },
  goalkeeperEquipment: {
    slug: "goalkeeper-equipment",
    legacyRootCategoryIds: ["52"],
  },
  /** CMS has no `goalkeeper-apparel` root; 113 absent on keepersport.store. Jerseys root lists GK tops (closest vertical). */
  goalkeeperApparel: {
    slug: "goalkeeper-jerseys",
    legacyRootCategoryIds: ["3", "21", "113"],
  },
  sale: {
    slug: "sale",
    legacyRootCategoryIds: ["17"],
  },
});

/** Promo sliders (client) — semantic slugs; align with CMS if previews are empty. */
export const promoSliderListingConfig = Object.freeze({
  /** Slider_2 — "Gloves Collection" */
  glovesCollection: {
    slug: "goalkeeper-gloves",
    legacyRootCategoryIds: ["17", "153"],
  },
  /** Slider_3 — "Studs Collection" */
  studsCollection: {
    slug: "football-boots",
    legacyRootCategoryIds: ["31"],
  },
  /** Slider_5 — "Training aids collection" */
  trainingAids: {
    slug: "goalkeeper-equipment",
    legacyRootCategoryIds: ["23"],
  },
});
