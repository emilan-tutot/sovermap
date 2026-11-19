import { Fragment } from "react";

/** A separator « · » never starts a line: a non-breaking space glues it to the word before it. */
const INSECABLE = "\u00a0";
const ADRESSE_WEB = /^https?:\/\//;
const HEURE = /^\(?\d{1,2}:\d{2}(:\d{2})?\)?[,.;]?$/;
const IPV6 = /^[0-9a-f]{0,4}(:[0-9a-f]{0,4}){2,7}(\/\d{1,3})?[,.;)]?$/i;
const NOM_DE_DOMAINE = /^(\*\.)?(?=[a-z0-9-]*[a-z])[a-z0-9-]+(\.[a-z0-9-]+)+\.?[,;)]?$/i;

/**
 * The pieces of a raw word that never break, in order. Only a web address (after a slash or a dot), a domain name
 * (after a dot) and an IPv6 address (after a colon) may break; an IPv4 address, a prefix, a date, a time, an AS or
 * LEI number, a name with a hyphen always go whole to the next line.
 */
export function morceaux(mot: string): string[] {
  // After a dot or a slash, never between the two slashes of « https:// ».
  if (ADRESSE_WEB.test(mot)) return mot.split(/(?<=[/.])(?!\/)/);
  if (HEURE.test(mot)) return [mot];
  if (IPV6.test(mot)) return mot.split(/(?<=:)/);
  if (NOM_DE_DOMAINE.test(mot)) return mot.split(/(?<=\.)/);
  return [mot];
}

/** A raw value (domain name, address, prefix, date, number), which wraps only at its spaces and at its allowed points. */
export function Valeur({ texte }: { texte: string }) {
  const mots = texte.split(" ");
  return (
    <>
      {mots.map((mot, i) => (
        <Fragment key={i}>
          {i > 0 ? (mot === "·" ? INSECABLE : " ") : null}
          {morceaux(mot).map((m, j) => (
            <Fragment key={j}>
              {j > 0 ? <wbr /> : null}
              <span className="nb">{m}</span>
            </Fragment>
          ))}
        </Fragment>
      ))}
    </>
  );
}
