import type { MetadataRoute } from "next";
import { indexingOpen } from "@/lib/site";

// Closed to every robot until the launch (SITE_INDEXING=open, on the owner's decision).
export default function robots(): MetadataRoute.Robots {
  if (!indexingOpen()) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/" }, sitemap: "/sitemap.xml" };
}
