// npx tsx pipeline/cli/attendre-resolveur.ts [127.0.0.1:5300]
// Waits until the local resolver answers (the root's NS records, validated), 90 seconds at most.
import { ClientUdp } from "../dns-bas";

const [hote = "127.0.0.1", port = "5300"] = (process.argv[2] ?? "127.0.0.1:5300").split(":");
async function attendre(): Promise<number> {
  const client = new ClientUdp("knot", hote, Number(port), 3_000);
  const limite = Date.now() + 90_000;
  for (;;) {
    const r = await client.demander(".", "NS");
    if (r.code === "NOERROR" && r.reponses.length > 0) {
      console.log(
        `résolveur prêt : ${r.reponses.length} serveurs de la racine, réponse validée : ${r.ad ? "oui" : "non"}`,
      );
      client.fermer();
      return r.ad ? 0 : 1;
    }
    if (Date.now() > limite) {
      console.error(`résolveur muet après 90 s (dernier code : ${r.code})`);
      client.fermer();
      return 1;
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
}

attendre().then((code) => process.exit(code));
