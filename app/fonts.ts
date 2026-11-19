import localFont from "next/font/local";

// The fonts of Brume douce (DESIGN.md §6): Chakra Petch for the wordmark, the titles and the figures; Manrope for the
// text; IBM Plex Mono for the raw values and the layers of the Radiographie only. Files kept in the repository
// (Fontsource builds of the original fonts, SIL Open Font License 1.1: public/licenses/), never fetched from Google at
// build time. Each family is declared twice under one name, latin then latin-ext, each half with its unicode-range: the
// browser fetches latin-ext only for the characters that need it (the French ones are all in latin). next/font wants
// every option written as a literal: the two ranges are repeated in each call (Fontsource's latin and latin-ext).

export const titre = localFont({
  src: [
    { path: "./fonts/chakra-petch-latin-500-normal.woff2", weight: "500" },
    { path: "./fonts/chakra-petch-latin-600-normal.woff2", weight: "600" },
  ],
  variable: "--police-titre",
  display: "swap",
  declarations: [
    { prop: "font-family", value: "titre" },
    { prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" },
  ],
});
export const titreExt = localFont({
  src: [
    { path: "./fonts/chakra-petch-latin-ext-500-normal.woff2", weight: "500" },
    { path: "./fonts/chakra-petch-latin-ext-600-normal.woff2", weight: "600" },
  ],
  variable: "--police-titre-ext",
  display: "swap",
  preload: false,
  declarations: [
    { prop: "font-family", value: "titre" },
    { prop: "unicode-range", value: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF" },
  ],
});

export const texte = localFont({
  src: "./fonts/manrope-latin-wght-normal.woff2",
  weight: "200 800",
  variable: "--police-texte",
  display: "swap",
  declarations: [
    { prop: "font-family", value: "texte" },
    { prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" },
  ],
});
export const texteExt = localFont({
  src: "./fonts/manrope-latin-ext-wght-normal.woff2",
  weight: "200 800",
  variable: "--police-texte-ext",
  display: "swap",
  preload: false,
  declarations: [
    { prop: "font-family", value: "texte" },
    { prop: "unicode-range", value: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF" },
  ],
});

export const mono = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500" },
  ],
  variable: "--police-mono",
  display: "swap",
  preload: false,
  declarations: [
    { prop: "font-family", value: "mono" },
    { prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" },
  ],
});
export const monoExt = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-latin-ext-400-normal.woff2", weight: "400" },
    { path: "./fonts/ibm-plex-mono-latin-ext-500-normal.woff2", weight: "500" },
  ],
  variable: "--police-mono-ext",
  display: "swap",
  preload: false,
  declarations: [
    { prop: "font-family", value: "mono" },
    { prop: "unicode-range", value: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF" },
  ],
});

/** Every font of the site, as the classes that declare their CSS variables (on <html>). */
export const POLICES = [titre, titreExt, texte, texteExt, mono, monoExt].map((p) => p.variable).join(" ");
