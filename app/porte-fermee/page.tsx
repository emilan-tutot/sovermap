import { notFound } from "next/navigation";

// The target of the production door's rewrite (lib/porte.ts): always the 404 page. A static route outranks any dynamic
// segment a later chantier may add at the root ([lang], [...slug]), so a closed address can never reach another page.
export default function PorteFermee(): never {
  notFound();
}
