import fond from "@/lib/carte/fond-de-carte.json";

// The map of the territories (D.2, decision C2-2): the base map drawn once from the IGN's departments
// (lib/carte/fond-de-carte.json, pipeline/cli/fond-de-carte.ts), rendered by the server as an SVG, without any script in
// the browser. It shows, it never navigates: the lists of the page are its text alternative and its links (DESIGN.md
// § 11). The accent never marks a territory: it means « outside the EU » in the data (DESIGN.md § 3).

type Props = {
  /** The accessible name of the map: what it shows. */
  titre: string;
  /** Departments drawn darker: a région's, or one département. */
  surligner?: ReadonlySet<string>;
  /** Departments the map frames, with a margin; all of them when absent (the overseas frames included). */
  cadrer?: ReadonlySet<string>;
};

/**
 * The départements of a région, as the base map gives them (the IGN's layer, which carries each one's région): the
 * whole région, whether or not each of its départements has a measured site that day.
 */
export const departementsDeLaRegion = (region: string): Set<string> =>
  new Set(fond.departements.filter((d) => d.region === region).map((d) => d.code));

type Boite = { x: number; y: number; l: number; h: number };

/** The box of some departments' paths, from their points (« M12 34 56 78Z »). */
function boiteDe(chemins: readonly string[]): Boite | null {
  let [xMin, yMin, xMax, yMax] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const d of chemins) {
    const nombres = d.match(/-?[0-9]+(?:\.[0-9]+)?/g) ?? [];
    for (let i = 0; i + 1 < nombres.length; i += 2) {
      const [x, y] = [Number(nombres[i]), Number(nombres[i + 1])];
      if (x < xMin) xMin = x;
      if (x > xMax) xMax = x;
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
    }
  }
  return Number.isFinite(xMin) ? { x: xMin, y: yMin, l: xMax - xMin, h: yMax - yMin } : null;
}

export function CarteFrance({ titre, surligner, cadrer }: Props) {
  const cadre =
    cadrer === undefined ? null : boiteDe(fond.departements.filter((d) => cadrer.has(d.code)).map((d) => d.d));
  const marge = cadre === null ? 0 : Math.max(cadre.l, cadre.h) * 0.08;
  const viewBox =
    cadre === null
      ? `0 0 ${fond.largeur} ${fond.hauteur}`
      : `${cadre.x - marge} ${cadre.y - marge} ${cadre.l + 2 * marge} ${cadre.h + 2 * marge}`;
  return (
    <svg className="carte-france" viewBox={viewBox} role="img" aria-label={titre} preserveAspectRatio="xMidYMid meet">
      {cadre === null
        ? fond.encarts.map((e) => (
            <rect key={e.code} className="carte-encart" x={e.x} y={e.y} width={e.largeur} height={e.hauteur} />
          ))
        : null}
      {fond.departements.map((d) => (
        <path
          key={d.code}
          d={d.d}
          fillRule="evenodd"
          className={
            surligner?.has(d.code) === true
              ? "carte-departement carte-surligne"
              : cadrer !== undefined && !cadrer.has(d.code)
                ? "carte-departement carte-autour"
                : "carte-departement"
          }
        />
      ))}
      <path className="carte-regions" d={fond.frontieresRegions} />
    </svg>
  );
}
