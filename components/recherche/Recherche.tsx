"use client";

import Link from "next/link";
import { useId, useRef, useState, ViewTransition } from "react";
import { fr } from "@/lib/i18n/fr";
import { chercher, type Entree, lireIndexRecherche } from "@/lib/recherche";

const t = fr.recherche;

/**
 * The search (D.2, R4): its index is loaded whole at the first use (never piecemeal, which would tell what is typed),
 * then searched in the browser; each result with its category, a company or a public body named « Exploitant », never
 * « Société ».
 */
export function Recherche() {
  const [saisie, setSaisie] = useState("");
  const [entrees, setEntrees] = useState<Entree[] | null>(null);
  const [etat, setEtat] = useState<"repos" | "chargement" | "pret" | "erreur">("repos");
  const demande = useRef(false);
  const id = useId();
  const charger = () => {
    if (demande.current) return;
    demande.current = true;
    setEtat("chargement");
    fetch("/recherche/index.json")
      .then((r) => (r.ok ? (r.json() as Promise<unknown>) : Promise.reject(new Error(String(r.status)))))
      .then((v) => {
        setEntrees(lireIndexRecherche(v));
        setEtat("pret");
      })
      .catch(() => {
        demande.current = false;
        setEtat("erreur");
      });
  };
  const resultats = entrees === null ? [] : chercher(entrees, saisie);
  const tape = saisie.trim() !== "";
  return (
    <div className="recherche" role="search">
      <label htmlFor={id}>{t.libelle}</label>
      <input
        id={id}
        type="search"
        value={saisie}
        placeholder={t.exemple}
        autoComplete="off"
        spellCheck={false}
        onFocus={charger}
        onChange={(e) => {
          setSaisie(e.target.value);
          charger();
        }}
      />
      <p className="recherche-etat" aria-live="polite">
        {etat === "chargement" && tape
          ? t.chargement
          : etat === "erreur"
            ? t.erreur
            : tape && entrees !== null
              ? t.nombre(resultats.length)
              : null}
      </p>
      {resultats.length > 0 ? (
        <ul className="recherche-resultats">
          {resultats.map((r) => (
            <li key={r.adresse}>
              <Link href={r.adresse} prefetch={false} className={r.type === "d" ? "valeur" : undefined}>
                {r.type === "d" ? (
                  // The domain's name flies into the Radiographie's title (DESIGN.md § 7).
                  <ViewTransition name={`domaine-${r.libelle}`} share="vole" default="none">
                    <span>{r.libelle}</span>
                  </ViewTransition>
                ) : (
                  r.libelle
                )}
              </Link>
              <span>{r.etat ? t.categorieEtat : r.nature !== null ? t.natures[r.nature] : t.categories[r.type]}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
