import type { Metadata } from "next";
import Link from "next/link";
import { Coque } from "@/components/coque/Coque";
import { fr } from "@/lib/i18n/fr";

export const metadata: Metadata = { title: fr.meta.titre(fr.notFound.title) };

export default function NotFound() {
  return (
    <Coque>
      <p className="etiquette-capitales valeur">{fr.notFound.code}</p>
      <h1 className="titre-page">{fr.notFound.title}</h1>
      <p className="chapo">{fr.notFound.lead}</p>
      <p>
        <Link href="/" prefetch={false}>
          {fr.notFound.back}
        </Link>
      </p>
    </Coque>
  );
}
