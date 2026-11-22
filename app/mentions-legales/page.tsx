import { notFound } from "next/navigation";
import { PageTexte } from "@/components/texte/PageTexte";
import { editeurDe } from "@/lib/editeur";
import { mentionsLegales, mentionsLegalesParDefaut } from "@/lib/i18n/fr-textes";
import { metadonneesTexte } from "@/lib/referencement";
import { sitePublic } from "@/lib/site";

export const metadata = metadonneesTexte(mentionsLegalesParDefaut);

// The legal notices (brief E.4): option A by default; the publisher comes from Production variables of Vercel that the
// owner creates himself (lib/editeur.ts), never from the repository. Behind a closed door, « not found ».
export default function Page() {
  if (!sitePublic()) notFound();
  return <PageTexte page={mentionsLegales(editeurDe(process.env))} />;
}
