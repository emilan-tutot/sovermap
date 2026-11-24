// Tests of the breadcrumb's structured data (D.7): a collected name can never close the script that carries them.
import { describe, expect, it } from "vitest";
import { jsonLdFilAriane } from "@/components/coque/FilAriane";

describe("the breadcrumb's structured data (D.7)", () => {
  it("lists the steps with absolute addresses, in order", () => {
    const json = JSON.parse(
      jsonLdFilAriane(
        [
          { nom: "Atlas", chemin: "/" },
          { nom: "Sociétés", chemin: "/societes" },
        ],
        "https://sovermap.example",
      ),
    ) as { itemListElement: { position: number; name: string; item: string }[] };
    expect(json.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Atlas", item: "https://sovermap.example/" },
      { "@type": "ListItem", position: 2, name: "Sociétés", item: "https://sovermap.example/societes" },
    ]);
  });

  it("escapes every « < », so that a name like « </script> » stays data", () => {
    const texte = jsonLdFilAriane([{ nom: "</script><img src=x>", chemin: "/x" }], "https://sovermap.example");
    expect(texte).not.toContain("<");
    expect(texte).toContain("\\u003c/script>");
    // Still the same data once read back.
    expect((JSON.parse(texte) as { itemListElement: { name: string }[] }).itemListElement[0]?.name).toBe(
      "</script><img src=x>",
    );
  });
});
