// The day's data could not be read: GitHub down or limiting, and no copy of the day before in the caches.
/**
 * The page then answers an error (5xx), which Vercel's CDN never keeps, rather than a page « unavailable » it would
 * keep an hour or a day (lib/cache.ts, D.4); app/error.tsx shows the message, and the next visit reads again.
 */
export function indisponible(): never {
  throw new Error("Sovermap : données indisponibles");
}
