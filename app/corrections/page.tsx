import { notFound } from "next/navigation";
import { PageTexte } from "@/components/texte/PageTexte";
import { corrections as page } from "@/lib/i18n/fr-textes";
import { metadonneesTexte } from "@/lib/referencement";
import { sitePublic } from "@/lib/site";

export const metadata = metadonneesTexte(page);

// A text page (part E; its words in lib/i18n/fr-textes.ts): no data read. Behind a closed door, « not found », like
// every page but the waiting one (lib/porte.ts).
export default function Page() {
  if (!sitePublic()) notFound();
  return <PageTexte page={page} />;
}
