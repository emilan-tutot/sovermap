// The SecNumCloud qualifications in force on a given day (brief C.4; referentiels/secnumcloud.json): a service is
// qualified from the start of its decision to its end, both days included; the day after its end, it disappears on its
// own, with no hand to remove it (the owner's answer to point 13: Outscale's qualification ends on 30/11/2026). Pure: the
// collection and the site pass the day they describe.

/** A qualified service, as the survey writes it (only the fields the rule reads). */
export type ServiceQualifie = { societe: string | null; service: string; debut: string; fin: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The services in force on a day (AAAA-MM-JJ): started, and not ended before it. */
export function servicesEnVigueur<S extends ServiceQualifie>(services: readonly S[], jour: string): S[] {
  if (!DATE.test(jour)) throw new Error(`jour invalide : ${jour}`);
  return services.filter((s) => DATE.test(s.debut) && DATE.test(s.fin) && s.debut <= jour && jour <= s.fin);
}

/** The companies of the referential that hold at least one service in force on that day. */
export function societesQualifiees(services: readonly ServiceQualifie[], jour: string): Set<string> {
  return new Set(servicesEnVigueur(services, jour).flatMap((s) => (s.societe === null ? [] : [s.societe])));
}
