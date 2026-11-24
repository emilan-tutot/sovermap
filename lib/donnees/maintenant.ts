import "server-only";
import { connection } from "next/server";

/**
 * The time of the request (milliseconds since 1970), for the freshness of the data (plan § 6): the page is then rendered
 * at each request, with its shared Cache-Control (D.4), never frozen at build time.
 */
export async function maintenant(): Promise<number> {
  await connection();
  return Date.now();
}
