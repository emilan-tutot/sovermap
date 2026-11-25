// Security headers of every response, in one pure module (next.config.ts imports it, so no "@/" alias here).
// Policy: cahier §6. The browser talks to this site only: no third-party script, font, style, image or connection.

export type HeaderEntry = { key: string; value: string };

export type SecurityHeaderOptions = {
  /** `next dev` needs eval (React refresh) and a websocket (HMR): allowed in development only. */
  development: boolean;
  /** Search engines may index the site only when SITE_INDEXING is "open" (at launch, on the owner's decision). */
  indexing: boolean;
};

export function contentSecurityPolicy({ development }: Pick<SecurityHeaderOptions, "development">): string {
  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    // No nonce: pages are prerendered or cached and shared, so they cannot carry a per-request one. Next's own inline
    // bootstrap scripts need 'unsafe-inline'; nothing else is allowed (no third-party script). Tried on 22/11/2026
    // (brief D.5): experimental.sri puts an integrity on the external scripts only; without 'unsafe-inline', the inline
    // RSC payloads gave 137 violations on 10 kinds of page (9 to 27 a page). 'unsafe-inline' stays.
    ["script-src", ["'self'", "'unsafe-inline'", ...(development ? ["'unsafe-eval'"] : [])]],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:"]],
    ["font-src", ["'self'"]],
    ["connect-src", ["'self'", ...(development ? ["ws://localhost:*", "ws://127.0.0.1:*"] : [])]],
    ["media-src", ["'self'"]],
    ["worker-src", ["'self'", "blob:"]],
    ["manifest-src", ["'self'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'none'"]],
  ];
  return directives.map(([name, sources]) => `${name} ${sources.join(" ")}`).join("; ");
}

/** Every browser feature is closed: the site needs none of them. */
export const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "autoplay=()",
  "bluetooth=()",
  "browsing-topics=()",
  "camera=()",
  "display-capture=()",
  "encrypted-media=()",
  "fullscreen=(self)",
  "geolocation=()",
  "gyroscope=()",
  "hid=()",
  "magnetometer=()",
  "microphone=()",
  "midi=()",
  "payment=()",
  "publickey-credentials-get=()",
  "screen-wake-lock=()",
  "serial=()",
  "usb=()",
  "xr-spatial-tracking=()",
].join(", ");

export function securityHeaders(options: SecurityHeaderOptions): HeaderEntry[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(options) },
    // One year without `preload` keeps the way back open until the domain is connected (T8).
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
    ...(options.indexing ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]),
  ];
}
