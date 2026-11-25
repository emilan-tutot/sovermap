// The globe of Brume douce, seen from orbit. A fine light from the upper left with a soft shadow on
// the far side, a discreet atmospheric halo, hairline coasts, a dotted graticule; threads that trace themselves on
// arrival with a light running once along them, thin rings at the countries of arrival, threads that fade out when
// their country goes behind the globe. Its colours and its matter come from the tokens
// (lib/design/tokens.ts), converted to the screen like every colour of the site (DESIGN.md §4).
import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  Points,
  PointsMaterial,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from "three";
import { adoucir, anneau, devant, materiauFil, segments, textureTerre, tube, type Fabrique } from "./commun";
import { arcGrandCercle, graticule, surSphere } from "./geo";
import { creerGlobe } from "./moteur";

/** The light, in view space: from the upper left, slightly in front. */
const LUMIERE = new Vector3(-0.5, 0.45, 0.74).normalize();

export const creer: Fabrique = (o) =>
  creerGlobe(o, (groupe, scene) => {
    const j = o.jetons;
    const c = j.scene;
    const m = j.matiere;
    const terre = textureTerre(o.monde);
    const globe = new ShaderMaterial({
      uniforms: {
        terre: { value: terre },
        couleurGlobe: { value: new Color(c.globe) },
        couleurTerre: { value: new Color(c.terre) },
        couleurLimbe: { value: new Color(c.limbe) },
        couleurReflet: { value: new Color(c.cote) },
        lumiere: { value: LUMIERE },
        ombre: { value: m.ombre },
        brillance: { value: m.brillance },
        exposant: { value: m.exposant },
        grain: { value: m.grain },
        bordClair: { value: j.clair ? 0.12 : 0.32 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormale;
        varying vec3 vLocal;
        void main() {
          vNormale = normalize(normalMatrix * normal);
          vLocal = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D terre;
        uniform vec3 couleurGlobe;
        uniform vec3 couleurTerre;
        uniform vec3 couleurLimbe;
        uniform vec3 couleurReflet;
        uniform vec3 lumiere;
        uniform float ombre;
        uniform float brillance;
        uniform float exposant;
        uniform float grain;
        uniform float bordClair;
        varying vec3 vNormale;
        varying vec3 vLocal;
        float bruit(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        void main() {
          vec3 p = normalize(vLocal);
          vec2 uv = vec2(atan(p.x, p.z) / 6.2831853 + 0.5, asin(p.y) / 3.1415927 + 0.5);
          float sol = texture2D(terre, uv).r;
          vec3 n = normalize(vNormale);
          vec3 vue = vec3(0.0, 0.0, 1.0);
          // A soft shadow on the side away from the light, never black.
          float eclaire = smoothstep(-0.35, 0.9, dot(n, lumiere));
          vec3 base = mix(couleurGlobe, couleurTerre, sol * 0.9);
          base *= mix(1.0 - ombre, 1.0, eclaire);
          // Satin: a soft highlight; stone and matte globes have none.
          vec3 h = normalize(lumiere + vue);
          base += couleurReflet * brillance * pow(max(dot(n, h), 0.0), exposant) * 0.35;
          // Stone grain, fixed to the surface.
          base += (bruit(floor(uv * vec2(2048.0, 1024.0))) - 0.5) * grain;
          // The edge catches a little of the atmosphere, more on the lit side.
          float bord = pow(1.0 - max(dot(n, vue), 0.0), 3.0);
          base += couleurLimbe * bord * bordClair * (0.45 + 0.55 * eclaire);
          gl_FragColor = vec4(base, 1.0);
          #include <colorspace_fragment>
        }`,
    });

    // Coasts and borders: hairlines just above the surface.
    const surLaSphere = (lat: number, lon: number) => surSphere(lat, lon, 1.0015);
    groupe.add(new LineSegments(segments(o.monde.cotes, surLaSphere), new LineBasicMaterial({ color: c.cote, transparent: true, opacity: 0.8 })));
    groupe.add(new LineSegments(segments(o.monde.frontieres, surLaSphere), new LineBasicMaterial({ color: c.frontiere, transparent: true, opacity: 0.55 })));

    // Dotted graticule: one dot every 1.5 degrees along the 15-degree lines; finer and fainter on a small globe, where
    // the dots come closer together.
    const points: number[] = [];
    for (const ligne of graticule(15, 1.5)) for (let i = 0; i < ligne.length; i += 2) points.push(...surSphere(ligne[i + 1] ?? 0, ligne[i] ?? 0, 1.001));
    const geometrieGraticule = new BufferGeometry();
    geometrieGraticule.setAttribute("position", new Float32BufferAttribute(points, 3));
    const materiauGraticule = new PointsMaterial({ color: c.graticule, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.85 });
    groupe.add(new Points(geometrieGraticule, materiauGraticule));

    // A discreet atmospheric halo: light added on a dark page, a faint tint on a light one; stronger on the lit side.
    const halo = new Mesh(
      new SphereGeometry(1.06, 96, 64),
      new ShaderMaterial({
        side: BackSide,
        transparent: true,
        depthWrite: false,
        blending: j.clair ? NormalBlending : AdditiveBlending,
        uniforms: { couleur: { value: new Color(c.halo ?? c.limbe) }, lumiere: { value: LUMIERE }, force: { value: j.clair ? 0.16 : 0.24 } },
        vertexShader: /* glsl */ `
          varying vec3 vNormale;
          void main() {
            vNormale = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 couleur;
          uniform vec3 lumiere;
          uniform float force;
          varying vec3 vNormale;
          void main() {
            vec3 n = normalize(vNormale);
            float i = pow(max(0.0, 0.7 - dot(n, vec3(0.0, 0.0, 1.0))), 3.0);
            float cote = 0.55 + 0.45 * smoothstep(-0.6, 0.8, dot(-n, lumiere));
            gl_FragColor = vec4(couleur, i * force * cote);
            #include <colorspace_fragment>
          }`,
      }),
    );
    scene.add(halo);

    // France, the point of origin, inside the EU: a dot inside a thin ring, in the luminous neutral.
    const normaleFrance = new Vector3(...surSphere(o.origine.lat, o.origine.lon, 1));
    const point = new Mesh(new SphereGeometry(0.011, 16, 12), new MeshBasicMaterial({ color: c.filUE }));
    point.position.copy(normaleFrance.clone().multiplyScalar(1.002));
    groupe.add(point);
    groupe.add(anneau(normaleFrance, 0.026, 0.0035, c.filUE, 0.85));

    // Threads, thicker with more sites, traced one after another, opaque above the map; a thin ring at each country of
    // arrival. The accent only for the countries outside the EU, the luminous neutral for the others.
    const fils = [...o.fils].sort((a, b) => b.sites - a.sites);
    const departs = new Vector3(...surSphere(o.origine.lat, o.origine.lon, 1));
    const traces = fils.map((f) => {
      const couleur = f.horsUE ? c.arc : c.filUE;
      const materiau = materiauFil(f.horsUE ? (c.fils?.horsUE ?? c.arc) : (c.fils?.ue ?? c.filUE));
      const epaisseur = 0.0024 + 0.0021 * Math.sqrt(f.sites);
      // The ends of the tube sit just above the surface: a short thread lies flat on the map, never sinks into it.
      const fil = new Mesh(tube(arcGrandCercle(o.origine, f, 140, 1 + epaisseur + 0.0015), epaisseur), materiau);
      fil.renderOrder = 2;
      groupe.add(fil);
      const arrivee = new Vector3(...surSphere(f.lat, f.lon, 1));
      const rond = anneau(arrivee, 0.012 + 0.004 * Math.sqrt(f.sites), 0.003, couleur, 0.9);
      groupe.add(rond);
      return { materiau, arrivee, rond };
    });

    let debut = -1;
    return {
      globe,
      animer(t, _dt, regard) {
        if (debut < 0) debut = t;
        const origineVisible = devant(regard.face(departs));
        traces.forEach((tr, i) => {
          const u = tr.materiau.uniforms;
          const avance = o.reduit ? 1 : adoucir((t - debut - 0.5 - i * 0.35) / 1.7);
          if (u["progres"]) u["progres"].value = avance;
          // The light runs along the thread while it traces itself, then goes out: once.
          if (u["pointe"]) u["pointe"].value = o.reduit ? 0 : avance < 1 ? Math.min(1, avance * 6) : Math.max(0, 1 - (t - debut - 2.2 - i * 0.35) * 2);
          const visible = Math.min(origineVisible, devant(regard.face(tr.arrivee)));
          if (u["visibilite"]) u["visibilite"].value = visible;
          const anneauMateriau = tr.rond.material as MeshBasicMaterial;
          anneauMateriau.opacity = 0.9 * visible * Math.min(1, Math.max(0, (avance - 0.9) / 0.1));
        });
      },
      redimensionner(diametre, dpr) {
        const k = Math.min(1, Math.max(0, (diametre - 300) / 300));
        materiauGraticule.size = dpr * (0.9 + 0.6 * k);
        materiauGraticule.opacity = 0.55 + 0.3 * k;
      },
      liberer: () => terre.dispose(),
    };
  });
