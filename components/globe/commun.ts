// three.js pieces of the scene. Loaded only after the first paint (dynamic import).
import {
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  RepeatWrapping,
  RingGeometry,
  ShaderMaterial,
  TubeGeometry,
  Vector3,
  type Texture,
} from "three";
import type { Jetons } from "@/lib/design/tokens";
import type { Fil, Monde } from "./geo";

export type { Jetons };
export type Etiquette = { code: string; x: number; y: number; visible: boolean };

/** What the page asks of a scene; the page owns the loop, the pointer and the labels. */
export type Scene = {
  dessiner(t: number, dt: number): void;
  taille(largeur: number, hauteur: number, dpr: number): void;
  glisser(dx: number, dy: number): void;
  lacher(): void;
  survoler(nx: number, ny: number): void;
  choisir(nx: number, ny: number): string | null;
  centrer(code: string | null): void;
  recentrer(): void;
  /** Where the labels point to, and (optional) the visible threads as screen polylines, which the labels keep clear of. */
  etiquettes(largeur: number, hauteur: number, sortie: Etiquette[], fils?: { x: number; y: number }[][]): void;
  calme(): void;
  liberer(): void;
};
export type Options = { canvas: HTMLCanvasElement; monde: Monde; fils: Fil[]; origine: Fil; jetons: Jetons; reduit: boolean };
export type Fabrique = (o: Options) => Scene;

/** Polylines of [lon, lat, lon, lat…] turned into the vertex pairs of LineSegments. */
export function segments(lignes: number[][], projeter: (lat: number, lon: number) => [number, number, number]): BufferGeometry {
  const positions: number[] = [];
  for (const l of lignes) {
    for (let i = 0; i + 3 < l.length; i += 2) {
      const a = projeter(l[i + 1] ?? 0, l[i] ?? 0);
      const b = projeter(l[i + 3] ?? 0, l[i + 2] ?? 0);
      positions.push(...a, ...b);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(positions, 3));
  return g;
}

/** A thread as a tube, so that its thickness says the number of sites. */
export function tube(points: [number, number, number][], rayon: number): TubeGeometry {
  const courbe = new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z)));
  return new TubeGeometry(courbe, Math.max(64, points.length), rayon, 8, false);
}

/**
 * A thread that draws itself on arrival (progres), with a light at its tip that runs along it once (pointe), and
 * that fades out when its country goes behind the globe (visibilite). It is opaque and passes above the map: the
 * coasts and the graticule never show through it.
 */
/** The colour shows as written (conversion to the screen); the light at the tip mixes it towards white on screen. */
export function materiauFil(couleur: string, opacite = 1): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: true,
    blending: NormalBlending,
    uniforms: {
      couleur: { value: new Color(couleur) },
      opacite: { value: opacite },
      progres: { value: 0 },
      pointe: { value: 0 },
      visibilite: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 couleur;
      uniform float opacite;
      uniform float progres;
      uniform float pointe;
      uniform float visibilite;
      varying vec2 vUv;
      void main() {
        if (vUv.x > progres || visibilite < 0.01) discard;
        float lueur = pointe * exp(-pow((progres - vUv.x) * 14.0, 2.0));
        vec3 vu = mix(sRGBTransferOETF(vec4(couleur, 1.0)).rgb, vec3(1.0), lueur * 0.75);
        gl_FragColor = vec4(sRGBTransferEOTF(vec4(vu, 1.0)).rgb, min(1.0, opacite * visibilite));
        #include <colorspace_fragment>
      }`,
  });
}

/** A thin ring lying on the sphere at a point (unit normal), for France and for the countries of arrival. */
export function anneau(normale: Vector3, rayon: number, epaisseur: number, couleur: string, opacite: number): Mesh {
  // One pass: a transparent two-sided material is otherwise drawn twice, and three.js rebuilds its program parameters
  // at each pass (measured: a tenth of the main thread on a phone). A flat ring needs no second pass.
  const m = new Mesh(new RingGeometry(rayon, rayon + epaisseur, 72), new MeshBasicMaterial({ color: couleur, transparent: true, opacity: opacite, side: DoubleSide, depthWrite: false, forceSinglePass: true }));
  m.position.copy(normale.clone().multiplyScalar(1.0025));
  m.lookAt(normale.clone().multiplyScalar(2));
  return m;
}

/** Land mask in an equirectangular canvas: white land on black sea, for the globe shader. */
export function textureTerre(monde: Monde, largeur = 2048): Texture {
  const toile = document.createElement("canvas");
  toile.width = largeur;
  toile.height = largeur / 2;
  const ctx = toile.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, toile.width, toile.height);
    ctx.fillStyle = "white";
    const x = (lon: number) => ((lon + 180) / 360) * toile.width;
    const y = (lat: number) => ((90 - lat) / 180) * toile.height;
    for (const p of monde.pays) {
      for (const contour of p.p) {
        ctx.beginPath();
        for (let i = 0; i < contour.length; i += 2) {
          const px = x(contour[i] ?? 0);
          const py = y(contour[i + 1] ?? 0);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  const t = new CanvasTexture(toile);
  t.minFilter = LinearFilter;
  t.magFilter = LinearFilter;
  t.generateMipmaps = false;
  t.wrapS = RepeatWrapping;
  return t;
}

/** Easing used by the threads and the centring. */
export const adoucir = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
/** 0 behind, 1 in front, with a short fade just before the edge. */
export const devant = (face: number) => {
  const t = Math.min(1, Math.max(0, (face - 0.04) / 0.2));
  return t * t * (3 - 2 * t);
};
