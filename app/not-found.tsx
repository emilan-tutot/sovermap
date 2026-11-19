import Link from "next/link";
import { fr } from "@/lib/i18n/fr";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <p className="font-mono text-sm text-discret tabular-nums">404</p>
      <h1 className="text-3xl font-semibold">{fr.notFound.title}</h1>
      <p className="text-lg">{fr.notFound.lead}</p>
      <p>
        <Link href="/" className="underline underline-offset-4">
          {fr.notFound.back}
        </Link>
      </p>
    </main>
  );
}
