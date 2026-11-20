// The JS mirror of the tokens of app/globals.css, for what CSS cannot reach: the 3D globe reads its colours and its
// matter here. One direction: Brume douce, chosen at ARRÊT 2 quater (DESIGN.md §3 and §4). A test checks that the page
// colours here are those of app/globals.css.

/** The matter of the globe: a satin highlight, a stone grain, the depth of the soft shadow away from the light. */
export type Matiere = { brillance: number; exposant: number; grain: number; ombre: number };

export type Jetons = {
  fond: string;
  encre: string;
  discret: string;
  accent: string;
  /** A light page puts a dark globe on a light ground: the halo is drawn as a tint, not added as light. */
  clair: boolean;
  /**
   * The colours of the globe, as they show: every shader converts its colours to the screen (sRGB), like the built-in
   * materials (decision of ARRÊT 2 ter). `arc` is the accent made luminous, for the rings of the countries outside the
   * European Union; `filUE` a luminous neutral, for France and the countries inside it: in the data, the accent always
   * means « outside the EU ». `fils` and `halo`: the threads and the glow, darker than the rings and the edge, as Mist
   * showed them before the conversion (its tokens recalibrated, gap measured on the image: OKLab 0.0091 at most).
   */
  scene: {
    globe: string;
    terre: string;
    cote: string;
    frontiere: string;
    graticule: string;
    limbe: string;
    arc: string;
    filUE: string;
    fils: { horsUE: string; ue: string };
    halo: string;
  };
  matiere: Matiere;
};

export const JETONS: Jetons = {
  fond: "#D7DADD",
  encre: "#20252C",
  discret: "#4D555D",
  accent: "#1F45B0",
  clair: true,
  // The lit globe of Mist with every term divided by 12.92 (the slope of the sRGB curve in the dark tones), so that the
  // conversion to the screen gives back the look chosen by the owner.
  scene: {
    globe: "#05080B",
    terre: "#080C10",
    cote: "#C0CCD8",
    frontiere: "#5E6C79",
    graticule: "#3D4955",
    limbe: "#030F33",
    arc: "#8FB0FF",
    filUE: "#D5DCE3",
    fils: { horsUE: "#466FFF", ue: "#AAB7C4" },
    halo: "#030F6F",
  },
  matiere: { brillance: 0.00619, exposant: 22, grain: 0.00062, ombre: 0.4 },
};
