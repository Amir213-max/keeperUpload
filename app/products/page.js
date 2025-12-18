import { redirect } from "next/navigation";

/**
 * ⚠️ This page has been removed - redirecting to GoalkeeperGloves as default
 * 
 * The /products route is no longer used. All product pages should use
 * category-specific routes like /products/[category-slug] or
 * main category pages like /GoalkeeperGloves, /FootballBoots, etc.
 */
export default async function ProductsPage() {
  // Redirect to GoalkeeperGloves as default category page
  redirect('/GoalkeeperGloves');
}
