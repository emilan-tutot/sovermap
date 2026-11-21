// A small zip reader (APPNOTE 6.3: stored and deflated entries, through the central directory), for the DILA's file.
// A downloaded archive is data: every size is checked, an entry may never inflate beyond its declared size nor beyond
// 512 MiB, and a malformed archive stops the reading.
import { inflateRawSync } from "node:zlib";

const TAILLE_MAX = 512 * 1024 * 1024;

/** The entries `garder` asks for (all by default); their inflated total may not exceed 512 MiB. */
export function lireZip(zip: Buffer, garder: (nom: string) => boolean = () => true): Map<string, Buffer> {
  let total = 0;
  let fin = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65_557); i -= 1) {
    if (zip.readUInt32LE(i) === 0x06054b50) {
      fin = i;
      break;
    }
  }
  if (fin < 0) throw new Error("zip : fin du répertoire central introuvable");
  const nombre = zip.readUInt16LE(fin + 10);
  let p = zip.readUInt32LE(fin + 16);
  const entrees = new Map<string, Buffer>();
  for (let k = 0; k < nombre; k += 1) {
    if (p + 46 > zip.length || zip.readUInt32LE(p) !== 0x02014b50)
      throw new Error("zip : répertoire central illisible");
    const methode = zip.readUInt16LE(p + 10);
    const taille = zip.readUInt32LE(p + 20);
    const tailleBrute = zip.readUInt32LE(p + 24);
    const longueurNom = zip.readUInt16LE(p + 28);
    const suite = longueurNom + zip.readUInt16LE(p + 30) + zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42);
    const nom = zip.subarray(p + 46, p + 46 + longueurNom).toString("utf8");
    p += 46 + suite;
    if (local + 30 > zip.length || zip.readUInt32LE(local) !== 0x04034b50)
      throw new Error(`zip : entrée ${nom} illisible`);
    const debut = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    if (!garder(nom)) continue;
    total += tailleBrute;
    if (debut + taille > zip.length || total > TAILLE_MAX) throw new Error(`zip : entrée ${nom} hors limites`);
    const donnees = zip.subarray(debut, debut + taille);
    if (methode === 0) entrees.set(nom, Buffer.from(donnees));
    else if (methode === 8) entrees.set(nom, inflateRawSync(donnees, { maxOutputLength: Math.max(1, tailleBrute) }));
    else throw new Error(`zip : méthode ${methode} non prise en charge (${nom})`);
  }
  return entrees;
}
