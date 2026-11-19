// The globe: camera, rotation with inertia, slow drift, centring, picking, labels. The direction dresses it (matter,
// lines, threads) through `habiller`.
import { Group, Mesh, PerspectiveCamera, Raycaster, Scene as Scene3, SphereGeometry, Vector2, Vector3, WebGLRenderer, type Material } from "three";
import { adoucir, type Options, type Scene } from "./commun";
import { arcGrandCercle, FRANCE, indexPays, surSphere, versLatLon } from "./geo";

const RAD = Math.PI / 180;
/** The view at rest: France on the right, the Atlantic and North America on the left. */
const VUE = { lat: 28, lon: -38 };

/** What the dressing may ask: how much a point of the globe faces the camera now (1 in front, below 0 behind). */
export type Regard = { face(local: Vector3): number };
export type Habit = {
  globe: Material;
  animer?: (t: number, dt: number, regard: Regard) => void;
  /** The globe's diameter on screen, in CSS pixels, and the pixel ratio: fine details follow the size of the globe. */
  redimensionner?: (diametre: number, dpr: number) => void;
  liberer?: () => void;
};

export function creerGlobe(o: Options, habiller: (groupe: Group, scene: Scene3) => Habit): Scene {
  const rendu = new WebGLRenderer({ canvas: o.canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  rendu.setClearColor(0x000000, 0);
  const scene = new Scene3();
  const camera = new PerspectiveCamera(35, 1, 0.1, 50);
  // Close enough for a large globe, far enough for the highest thread (about 1.16 radii) to stay in view.
  camera.position.set(0, 0, 3.7);
  const groupe = new Group();
  scene.add(groupe);
  const habit = habiller(groupe, scene);
  const sphere = new Mesh(new SphereGeometry(1, 160, 120), habit.globe);
  sphere.renderOrder = -1;
  groupe.add(sphere);

  const trouverPays = indexPays(o.monde);
  const rayon = new Raycaster();
  const ndc = new Vector2();
  let lat = VUE.lat;
  let lon = VUE.lon;
  let vLon = 0;
  let vLat = 0;
  let tenu = false;
  let derive = !o.reduit;
  let cible: { lat: number; lon: number; t0: number; de: { lat: number; lon: number } } | null = null;
  let maintenant = 0;

  const orienter = () => groupe.rotation.set(lat * RAD, -lon * RAD, 0);
  orienter();

  const monde = new Vector3();
  const versCamera = new Vector3();
  const regard: Regard = {
    face(local) {
      monde.copy(local).applyMatrix4(groupe.matrixWorld);
      versCamera.copy(camera.position).sub(monde).normalize();
      return monde.normalize().dot(versCamera);
    },
  };
  const ordre = [o.origine, ...[...o.fils].sort((x, y) => y.sites - x.sites)];
  const pointsEtiquettes = ordre.map((f) => ({ code: f.code, local: new Vector3(...surSphere(f.lat, f.lon, 1.01)) }));
  const projete = new Vector3();
  // Points along each thread (the same curve as the drawn one), so that no label sits on a thread.
  const departFils = new Vector3(...surSphere(o.origine.lat, o.origine.lon, 1));
  const echantillonsFils = o.fils.map((f) => ({
    arrivee: new Vector3(...surSphere(f.lat, f.lon, 1)),
    points: arcGrandCercle(o.origine, f, 48, 1.006).map((p) => new Vector3(...p)),
  }));

  return {
    dessiner(t, dt) {
      maintenant = t;
      if (cible) {
        const k = adoucir((t - cible.t0) / 1.2);
        let dLon = cible.lon - cible.de.lon;
        if (dLon > 180) dLon -= 360;
        if (dLon < -180) dLon += 360;
        lon = cible.de.lon + dLon * k;
        lat = cible.de.lat + (cible.lat - cible.de.lat) * k;
        if (k >= 1) cible = null;
      } else if (!tenu) {
        lon += vLon;
        lat = Math.max(-60, Math.min(70, lat + vLat));
        vLon *= 0.92;
        vLat *= 0.92;
        if (derive) lon += 2.2 * dt;
      }
      orienter();
      groupe.updateMatrixWorld(true);
      habit.animer?.(t, dt, regard);
      rendu.render(scene, camera);
    },
    taille(largeur, hauteur, dpr) {
      rendu.setPixelRatio(dpr);
      rendu.setSize(largeur, hauteur, false);
      camera.aspect = largeur / hauteur;
      // Keep the whole globe and its threads in view on narrow screens.
      camera.fov = camera.aspect < 1 ? 2 * Math.atan(Math.tan(17.5 * RAD) / camera.aspect) / RAD : 35;
      camera.updateProjectionMatrix();
      // The globe fills 0.89 of the smaller side (camera at 3.7 radii, 35 degrees).
      habit.redimensionner?.(0.89 * Math.min(largeur, hauteur), dpr);
    },
    glisser(dx, dy) {
      derive = false;
      cible = null;
      tenu = true;
      const k = 0.25;
      vLon = -dx * k;
      vLat = dy * k;
      lon += vLon;
      lat = Math.max(-60, Math.min(70, lat + vLat));
    },
    lacher() {
      tenu = false;
    },
    survoler() {},
    choisir(nx, ny) {
      ndc.set(nx, ny);
      rayon.setFromCamera(ndc, camera);
      const touche = rayon.intersectObject(sphere, false)[0];
      if (!touche) return null;
      const local = groupe.worldToLocal(touche.point.clone());
      const p = versLatLon(local.x, local.y, local.z);
      return trouverPays(p.lat, p.lon);
    },
    centrer(code) {
      const f = code === FRANCE.code ? o.origine : o.fils.find((x) => x.code === code);
      if (!f) return;
      derive = false;
      // Between France and the country, so that the thread stays in view.
      const milieu = { lat: (f.lat + FRANCE.lat) / 2, lon: f.code === FRANCE.code ? FRANCE.lon : (f.lon + FRANCE.lon) / 2 };
      cible = { lat: Math.max(-50, Math.min(60, milieu.lat)), lon: milieu.lon, t0: maintenant, de: { lat, lon } };
    },
    recentrer() {
      cible = { ...VUE, t0: maintenant, de: { lat, lon } };
    },
    etiquettes(largeur, hauteur, sortie, fils) {
      sortie.length = 0;
      for (const p of pointsEtiquettes) {
        const face = regard.face(p.local);
        projete.copy(p.local).applyMatrix4(groupe.matrixWorld).project(camera);
        sortie.push({ code: p.code, x: ((projete.x + 1) / 2) * largeur, y: ((1 - projete.y) / 2) * hauteur, visible: face > 0.12 });
      }
      if (!fils) return;
      fils.length = 0;
      // A thread is drawn only while both its ends face the camera (it fades out otherwise).
      if (regard.face(departFils) < 0.1) return;
      for (const fil of echantillonsFils) {
        if (regard.face(fil.arrivee) < 0.1) continue;
        fils.push(
          fil.points.map((p) => {
            projete.copy(p).applyMatrix4(groupe.matrixWorld).project(camera);
            return { x: ((projete.x + 1) / 2) * largeur, y: ((1 - projete.y) / 2) * hauteur };
          }),
        );
      }
    },
    calme() {
      derive = false;
    },
    liberer() {
      habit.liberer?.();
      scene.traverse((objet) => {
        const m = objet as Partial<Mesh>;
        m.geometry?.dispose();
        const materiaux = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
        for (const materiau of materiaux) materiau.dispose();
      });
      rendu.dispose();
    },
  };
}
