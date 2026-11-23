import Link from "next/link";
import type { ReactNode } from "react";
import { fr } from "@/lib/i18n/fr";
import { PAGES_DE_TEXTE } from "@/lib/i18n/fr-textes";
import { servedVersion, sitePublic } from "@/lib/site";
import { Fraicheur } from "./Fraicheur";

const NAVIGATION = [
  { href: "/", texte: fr.coque.navigation.atlas },
  { href: "/ministeres", texte: fr.coque.navigation.ministeres },
  { href: "/societes", texte: fr.coque.navigation.societes },
  { href: "/territoires", texte: fr.coque.navigation.territoires },
  { href: "/journal", texte: fr.coque.navigation.journal },
  { href: "/methode", texte: fr.coque.navigation.methode },
  { href: "/donnees", texte: fr.coque.navigation.donnees },
] as const;

/**
 * The shell of every page (DESIGN.md §9): a skip link, the header with the wordmark, the content, the footer with the
 * served version. The navigation of the site (Atlas, Ministères, Sociétés, Territoires, Journal, Méthode, Données,
 * FR · EN) joins the header when its pages exist: until the launch, production shows only the waiting page.
 */
export function Coque({
  children,
  large = false,
  fraicheur = true,
}: {
  children: ReactNode;
  large?: boolean;
  /** The date of the last collection (Fraicheur), on every page but the 404 page, which stays static and costs nothing. */
  fraicheur?: boolean;
}) {
  return (
    <div className="coque">
      <a className="evitement" href="#contenu">
        {fr.coque.evitement}
      </a>
      <header className="entete">
        <Link className="logo" href="/" aria-label={fr.coque.logo} prefetch={false}>
          {fr.site.name}
        </Link>
        {sitePublic() ? (
          <>
            {/* A bar where it holds; on a phone, a compact menu (DESIGN.md § 9), without any script: a native
                disclosure. Only one of the two is ever shown, so only one navigation is ever read. */}
            <nav className="navigation navigation-barre" aria-label={fr.coque.navigation.libelle}>
              {NAVIGATION.map((n) => (
                <Link key={n.href} href={n.href} prefetch={false}>
                  {n.texte}
                </Link>
              ))}
            </nav>
            <details className="navigation-compacte">
              <summary>{fr.coque.navigation.menu}</summary>
              <nav className="navigation" aria-label={fr.coque.navigation.libelle}>
                {NAVIGATION.map((n) => (
                  <Link key={n.href} href={n.href} prefetch={false}>
                    {n.texte}
                  </Link>
                ))}
              </nav>
            </details>
          </>
        ) : null}
      </header>
      <main id="contenu" className={large ? "contenu contenu-large" : "contenu"}>
        {fraicheur && sitePublic() ? <Fraicheur /> : null}
        {children}
      </main>
      <footer className="pied">
        {sitePublic() ? (
          <nav className="pied-liens" aria-label={fr.footer.liens}>
            {PAGES_DE_TEXTE.map((p) => (
              <Link key={p.chemin} href={p.chemin} prefetch={false}>
                {p.court}
              </Link>
            ))}
          </nav>
        ) : null}
        <p>
          {fr.footer.version} <span className="valeur">{servedVersion()}</span>
        </p>
        <p>{fr.footer.independent}</p>
      </footer>
    </div>
  );
}
