import type { MetadataRoute } from "next";
import { indexingOpen, origineConfiguree } from "@/lib/site";

// Closed to every robot until the launch (SITE_INDEXING=open, on the owner's decision). Once open, the sitemap is
// announced by its absolute address, as the protocol requires; without the site's address, the line is left out.
export default function robots(): MetadataRoute.Robots {
  if (!indexingOpen()) return { rules: { userAgent: "*", disallow: "/" } };
  const origine = origineConfiguree();
  return origine
    ? { rules: { userAgent: "*", allow: "/" }, sitemap: `${origine}/sitemap.xml` }
    : { rules: { userAgent: "*", allow: "/" } };
}
