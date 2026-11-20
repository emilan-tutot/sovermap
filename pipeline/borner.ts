// Every record of the day is bounded before it is compared or published: what comes from the DNS is written by the
// measured domains themselves, and a single domain must never be able to stop the publication of all the others (an
// invalid name failing the schema, a record too large for its 8 KB fragment). A value that is not a DNS name is
// dropped; every list is capped; a record still larger than 3 KB is shortened and marked « tronque ». The same bounds
// apply to today's records and to yesterday's, so the hysteresis and the journal compare like with like.
import type { EnregistrementDomaine, EnregistrementNom, Hote } from "./publication";
import { jsonStable } from "./publication";
import { estNomDns } from "./schemas";

export const TAILLE_MAX_ENREGISTREMENT = 3 * 1024;

const taille = (e: unknown) => Buffer.byteLength(jsonStable(e));
const noms = (liste: readonly string[], max: number) => liste.filter(estNomDns).slice(0, max);

export function bornerNom(e: EnregistrementNom): EnregistrementNom {
  const borne: EnregistrementNom = {
    ...e,
    cname: noms(e.cname, 10),
    reseaux: e.reseaux.slice(0, 20),
    exploitants: e.exploitants.slice(0, 10),
  };
  if (taille(borne) <= TAILLE_MAX_ENREGISTREMENT) return borne;
  const court: EnregistrementNom = {
    ...borne,
    cname: borne.cname.length > 2 ? [borne.cname[0] as string, borne.cname.at(-1) as string] : borne.cname,
    reseaux: borne.reseaux.slice(0, 3),
    exploitants: borne.exploitants.slice(0, 3),
    tronque: true,
  };
  return taille(court) <= TAILLE_MAX_ENREGISTREMENT ? court : { ...court, cname: [], reseaux: [], exploitants: [] };
}

const hote = (h: Hote, max: number): Hote => ({
  ...h,
  as: h.as.slice(0, max),
  exploitants: h.exploitants.slice(0, max),
});

export function bornerDomaine(d: EnregistrementDomaine): EnregistrementDomaine {
  const spf = d.messagerie.spf;
  const borne: EnregistrementDomaine = {
    ...d,
    zone: {
      ...d.zone,
      ns: noms(d.zone.ns, 13),
      soa: d.zone.soa !== null && estNomDns(d.zone.soa) ? d.zone.soa : null,
      caa: d.zone.caa === null ? null : d.zone.caa.slice(0, 10),
    },
    serveursDeNoms: {
      ...d.serveursDeNoms,
      hotes: d.serveursDeNoms.hotes
        .filter((h) => estNomDns(h.hote))
        .slice(0, 13)
        .map((h) => hote(h, 10)),
    },
    messagerie: {
      ...d.messagerie,
      mx: d.messagerie.mx.filter((m) => estNomDns(m.hote)).slice(0, 10),
      hotes: d.messagerie.hotes
        .filter((h) => estNomDns(h.hote))
        .slice(0, 10)
        .map((h) => hote(h, 10)),
      spf: spf === null ? null : { ...spf, inclus: noms(spf.inclus, 20), reseaux: spf.reseaux.slice(0, 50) },
    },
  };
  if (taille(borne) <= TAILLE_MAX_ENREGISTREMENT) return borne;
  const court: EnregistrementDomaine = {
    ...borne,
    zone: {
      ...borne.zone,
      ns: borne.zone.ns.slice(0, 4),
      caa: borne.zone.caa === null ? null : borne.zone.caa.slice(0, 3),
    },
    serveursDeNoms: { ...borne.serveursDeNoms, hotes: borne.serveursDeNoms.hotes.slice(0, 4).map((h) => hote(h, 2)) },
    messagerie: {
      ...borne.messagerie,
      mx: borne.messagerie.mx.slice(0, 4),
      hotes: borne.messagerie.hotes.slice(0, 4).map((h) => hote(h, 2)),
      spf:
        borne.messagerie.spf === null
          ? null
          : {
              ...borne.messagerie.spf,
              inclus: borne.messagerie.spf.inclus.slice(0, 5),
              reseaux: borne.messagerie.spf.reseaux.slice(0, 10),
            },
    },
    tronque: true,
  };
  if (taille(court) <= TAILLE_MAX_ENREGISTREMENT) return court;
  return {
    ...court,
    zone: { ...court.zone, ns: [], caa: court.zone.caa === null ? null : [] },
    serveursDeNoms: { ...court.serveursDeNoms, hotes: [] },
    messagerie: {
      ...court.messagerie,
      mx: [],
      hotes: [],
      spf: court.messagerie.spf === null ? null : { ...court.messagerie.spf, inclus: [], reseaux: [] },
    },
  };
}
