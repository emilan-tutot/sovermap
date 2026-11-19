// Automated checks of the design bans (cahier §8.3 ; DESIGN.md §12 once the direction is chosen). Line-based on
// purpose: fast, dependency-free, and every violation points to an exact line. Paths are POSIX, relative to the root.
// Adapted from a generic tool of another project of the owner.

export type DesignViolation = { line: number; rule: string; ban: string; excerpt: string };

type Rule = { id: string; ban: string; pattern: RegExp; appliesTo: (filePath: string) => boolean };

const isUiSource = (p: string) => p.startsWith("app/") || p.startsWith("components/") || p.startsWith("lib/i18n/");
const isDictionary = (p: string) => p.startsWith("lib/i18n/");
const TOKEN_SOURCES = new Set(["app/globals.css", "lib/design/tokens.ts"]);
const everywhere = () => true;

const RULES: readonly Rule[] = [
  { id: "no-emoji", ban: "§8.3 contenus : emojis", pattern: /\p{Extended_Pictographic}/u, appliesTo: isUiSource },
  {
    id: "no-raw-color",
    ban: "§8.3 couleurs : une seule source de jetons",
    pattern: /#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?\b|\b(?:rgb|hsl)a?\(/,
    appliesTo: (p) => !TOKEN_SOURCES.has(p),
  },
  {
    id: "no-default-radius",
    ban: "§8.3 formes : coins trop ronds",
    pattern: /\brounded-(?:sm|md|lg|xl|2xl|3xl|4xl)\b/,
    appliesTo: everywhere,
  },
  {
    id: "no-default-shadow",
    ban: "§8.3 formes : ombres démesurées",
    pattern: /\bshadow-(?:sm|md|lg|xl|2xl)\b/,
    appliesTo: everywhere,
  },
  {
    id: "no-violet-family",
    ban: "§8.3 couleurs : dégradé violet, néon",
    pattern: /\b(?:bg|text|border|from|via|to|ring|fill|stroke)-(?:purple|violet|fuchsia|indigo|pink)-\d{2,3}\b/,
    appliesTo: everywhere,
  },
  { id: "no-clinical-white", ban: "§8.3 couleurs : blanc clinique pur", pattern: /\bbg-white\b(?!\/)/, appliesTo: everywhere },
  {
    id: "no-generic-motion",
    ban: "§8.3 formes : animations décoratives",
    pattern: /\banimate-(?:pulse|bounce|ping)\b/,
    appliesTo: everywhere,
  },
  { id: "no-glass", ban: "§8.3 formes : faux verre, orbes flous", pattern: /\bbackdrop-blur(?:-\w+)?\b/, appliesTo: everywhere },
  { id: "no-rainbow-text", ban: "§8.3 couleurs : texte arc-en-ciel", pattern: /\bbg-clip-text\b/, appliesTo: everywhere },
  {
    id: "no-left-accent-border",
    ban: "§8.3 couleurs : liseré de couleur à gauche",
    pattern: /\bborder-l-(?:2|4|8)\b/,
    appliesTo: everywhere,
  },
  {
    id: "banned-fonts",
    ban: "§8.3 typographie : Inter, Geist ou Space Grotesk par défaut",
    pattern: /\b(?:Inter|Geist(?:_Mono)?|Space_Grotesk)\s*\(|\bfont-(?:inter|geist|grotesk)\b|["']Space Grotesk["']/,
    appliesTo: everywhere,
  },
  {
    id: "no-dash-series",
    ban: "§8.3 contenus : tirets cadratins en série",
    pattern: /—[^—\n]*—/,
    appliesTo: isDictionary,
  },
];

export function findDesignViolations(filePath: string, source: string): DesignViolation[] {
  const rules = RULES.filter((rule) => rule.appliesTo(filePath));
  if (rules.length === 0) return [];
  return source.split(/\r?\n/).flatMap((text, index) =>
    rules
      .filter((rule) => rule.pattern.test(text))
      .map((rule) => ({ line: index + 1, rule: rule.id, ban: rule.ban, excerpt: text.trim() })),
  );
}
