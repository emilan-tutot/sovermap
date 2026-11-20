// Tests of the zip reader, on archives built here (no file read, no network).
import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { lireZip } from "./zip";

/** A zip of one entry (deflated), written by hand from APPNOTE 6.3. */
function archive(nom: string, contenu: Buffer, tailleDeclaree = contenu.length): Buffer {
  const comprime = deflateRawSync(contenu);
  const n = Buffer.from(nom, "utf8");
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(comprime.length, 18);
  local.writeUInt32LE(tailleDeclaree, 22);
  local.writeUInt16LE(n.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(comprime.length, 20);
  central.writeUInt32LE(tailleDeclaree, 24);
  central.writeUInt16LE(n.length, 28);
  central.writeUInt32LE(0, 42);
  const debutCentral = 30 + n.length + comprime.length;
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(1, 8);
  fin.writeUInt16LE(1, 10);
  fin.writeUInt32LE(46 + n.length, 12);
  fin.writeUInt32LE(debutCentral, 16);
  return Buffer.concat([local, n, comprime, central, n, fin]);
}

describe("the zip reader", () => {
  it("reads a deflated entry", () => {
    const contenu = Buffer.from(JSON.stringify({ service: [] }));
    expect(lireZip(archive("dila.json", contenu)).get("dila.json")?.toString()).toBe('{"service":[]}');
  });

  it("refuses an entry that inflates beyond its declared size, and a file that is not a zip", () => {
    expect(() => lireZip(archive("bombe.json", Buffer.alloc(100_000), 10))).toThrow();
    expect(() => lireZip(Buffer.from("pas une archive, juste du texte"))).toThrow(/fin du répertoire/);
  });
});
