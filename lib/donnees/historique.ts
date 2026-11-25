// The figures' history (agregats/historique.json; D.2, the Atlas's time slider), checked at the border: a day that is
// not one is left out. Pure, shared by the server and the slider.

export type FigureJour = {
  auMoinsPourcent: number;
  probablePourcent: number;
  nonDeterminePourcent: number;
  domaines: number;
};
export type JourPublie = { date: string; methode: string; reglesChangees: boolean; chiffreTitre: FigureJour };

const part = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100 ? v : null;

function figureDe(v: unknown): FigureJour | null {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const [auMoinsPourcent, probablePourcent, nonDeterminePourcent] = [
    part(o["auMoinsPourcent"]),
    part(o["probablePourcent"]),
    part(o["nonDeterminePourcent"]),
  ];
  const domaines = o["domaines"];
  if (auMoinsPourcent === null || probablePourcent === null || nonDeterminePourcent === null) return null;
  if (typeof domaines !== "number" || !Number.isSafeInteger(domaines) || domaines < 0) return null;
  return { auMoinsPourcent, probablePourcent, nonDeterminePourcent, domaines };
}

/** agregats/historique.json, checked: the published days, in date order, each with its headline figure. */
export function lireHistorique(valeur: unknown): JourPublie[] {
  if (typeof valeur !== "object" || valeur === null || !Array.isArray((valeur as { jours?: unknown }).jours)) return [];
  return (valeur as { jours: unknown[] }).jours
    .flatMap((j): JourPublie[] => {
      if (typeof j !== "object" || j === null) return [];
      const o = j as Record<string, unknown>;
      const date = o["date"];
      const methode = o["methode"];
      const chiffreTitre = figureDe(o["chiffreTitre"]);
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || chiffreTitre === null) return [];
      return [
        {
          date,
          methode: typeof methode === "string" ? methode.slice(0, 20) : "",
          reglesChangees: o["reglesChangees"] === true,
          chiffreTitre,
        },
      ];
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(-4000);
}
