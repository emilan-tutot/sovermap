import { fr } from "@/lib/i18n/fr";
import { servedVersion } from "@/lib/site";

// Production shows only this sober waiting page, without any data, until the launch (brief B.5 and E.2).
export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-16">
        <p className="text-sm tracking-wide text-discret uppercase">{fr.attente.title}</p>
        <h1 className="text-4xl leading-tight font-semibold sm:text-5xl">
          {fr.site.name}
          <span className="block font-normal text-discret">{fr.site.question}</span>
        </h1>
        <p className="text-lg leading-relaxed">{fr.attente.lead}</p>
        <p className="border-t border-filet pt-6 text-base text-discret">{fr.attente.status}</p>
      </main>
      <footer className="mx-auto w-full max-w-2xl px-6 pb-8 text-sm text-discret">
        <p>
          {fr.footer.version} : <span className="font-mono tabular-nums">{servedVersion()}</span>
        </p>
        <p>{fr.footer.independent}</p>
      </footer>
    </div>
  );
}
