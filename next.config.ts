import type { NextConfig } from "next";
import { securityHeaders } from "./lib/security/headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // No source map is ever served in production (cahier §6).
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
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
          indexing: process.env.SITE_INDEXING === "open",
        }),
      },
    ];
  },
};

export default nextConfig;
