import type { NextConfig } from "next";
import { reecrituresPorte } from "./lib/porte";
import { securityHeaders } from "./lib/security/headers";
import { indexingOpen } from "./lib/site";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // No source map is ever served in production (cahier §6).
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  // No image goes through the optimizer (the site draws its images in code and serves its few files as they are).
  // Switched off, so that Vercel's image service never answers before the production door (lib/porte.ts).
  images: { unoptimized: true },
  experimental: {
    // Every build starts cold: a restored build cache once served a stale stylesheet in another project of the owner
    // (specs/001-sovermap/pieges-connus.md).
    turbopackFileSystemCacheForBuild: false,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders({
          development: process.env.NODE_ENV !== "production",
          indexing: indexingOpen(),
        }),
      },
    ];
  },
  // The production door (lib/porte.ts): while SITE_PUBLIC is not exactly « open », only the waiting page answers.
  async rewrites() {
    return { beforeFiles: reecrituresPorte(), afterFiles: [], fallback: [] };
  },
};

export default nextConfig;
