// The guards of the day's collection, with their limits (methode § 7, plan § 6), for the Quality page's proposals B
// and C. A value not published gives null, and no verdict.
import { type Fraicheur, RETARD_HEURES } from "@/lib/donnees/fraicheur";
import type { Qualite } from "@/lib/donnees/qualite";
import { nombre, pourcent } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";

export type GardeFou = {
  cle: "echecs" | "pannes" | "debitPart" | "debitMax" | "fraicheur";
  libelle: string;
  valeur: number | null;
  texte: string | null;
  limite: number;
  texteLimite: string;
  /** Within the limit; null when the value is not published. */
  tenu: boolean | null;
};

export function gardeFous(q: Qualite, f: Fraicheur): GardeFou[] {
  const g = fr.qualite.gardeFous;
  const garde = (
    cle: GardeFou["cle"],
    libelle: string,
    valeur: number | null,
    ecrire: (v: number) => string,
    limite: number,
    inclus: boolean,
  ): GardeFou => ({
    cle,
    libelle,
    valeur,
    texte: valeur === null ? null : ecrire(valeur),
    limite,
    texteLimite: ecrire(limite),
    tenu: valeur === null ? null : inclus ? valeur <= limite : valeur < limite,
  });
  const heures = (v: number) => g.heures(nombre(Math.floor(v)));
  return [
    garde("echecs", g.echecs, q.echecs.nonConfirmesPourcent, (v) => pourcent(v), 2, false),
    garde("pannes", g.pannes, q.echecs.pannesPourcent, (v) => pourcent(v), 8, false),
    garde("debitPart", g.debitPart, q.debit?.pourcent ?? null, (v) => pourcent(v, 3), 0.1, true),
    garde("debitMax", g.debitMax, q.debit?.max ?? null, (v) => nombre(v), 15, true),
    garde("fraicheur", g.fraicheur, f.ageHeures, heures, RETARD_HEURES, true),
  ];
}
