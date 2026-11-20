import type { MetadataRoute } from "next";
import { indexingOpen, origineConfiguree } from "@/lib/site";

// Empty until the launch: nothing is listed while the site is closed to indexing.
export default function sitemap(): MetadataRoute.Sitemap {
  if (!indexingOpen()) return [];
  const origine = origineConfiguree();
  return origine ? [{ url: `${origine}/`, changeFrequency: "daily" }] : [];
}
