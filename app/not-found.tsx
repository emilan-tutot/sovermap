import type { Metadata } from "next";
import Link from "next/link";
import { Coque } from "@/components/coque/Coque";
import { fr } from "@/lib/i18n/fr";

// The layout's title template already adds « · Sovermap ».
export const metadata: Metadata = { title: fr.notFound.title };

// Without the freshness line: the 404 page stays static, so that a robot's wrong address costs no function invocation
// (the review of PR 22).
export default function NotFound() {
  return (
    <Coque fraicheur={false}>
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
