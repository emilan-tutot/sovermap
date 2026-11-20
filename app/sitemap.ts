import type { MetadataRoute } from "next";
import { indexingOpen } from "@/lib/site";

// Empty until the launch: nothing is listed while the site is closed to indexing.
export default function sitemap(): MetadataRoute.Sitemap {
  if (!indexingOpen()) return [];
  const origin = process.env["NEXT_PUBLIC_SITE_URL"];
  return origin ? [{ url: `${origin.replace(/\/$/, "")}/`, changeFrequency: "daily" }] : [];
}
