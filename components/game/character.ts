import * as THREE from 'three';

/**
 * An articulated person.
 *
 * The crowds in `StreetLife` are billboarded impostors, which is right for
 * sixty thousand of them and wrong for the one you are looking at over the
 * shoulder. The player, the police and anyone close enough to matter get this
 * instead: a jointed rig of capsules with a hand-authored walk cycle, so the
 * legs pass each other and the arms swing against them.
 *
 * Everything is built in metres around a root at the feet, 1.76 m to the crown.
 */

export type Look = {
  skin: number;
  shirt: number;
  trousers: number;
  hair: number;
  shoes: number;
};

export const LOOKS: Look[] = [
  { skin: 0x8d5a3b, shirt: 0xe9e4d6, trousers: 0x2c3038, hair: 0x14100d, shoes: 0x1a1714 },
  { skin: 0x7a4a2e, shirt: 0x2f6fae, trousers: 0x3b3a34, hair: 0x18120e, shoes: 0x241f1a },
  { skin: 0xa06f45, shirt: 0xc4553f, trousers: 0x4a4438, hair: 0x241a12, shoes: 0x1a1714 },
  { skin: 0x6b3f26, shirt: 0x2f8a5c, trousers: 0x22252b, hair: 0x120e0a, shoes: 0x2a231c },
  { skin: 0x99693f, shirt: 0xe8c04a, trousers: 0x35302a, hair: 0x1c1510, shoes: 0x1e1a16 },
];

export type Rig = {
  root: THREE.Group;
  /** Everything below the neck, so the body can lean without the head. */
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  foreL: THREE.Group;
  foreR: THREE.Group;
  thighL: THREE.Group;
  thighR: THREE.Group;
  shinL: THREE.Group;
  shinR: THREE.Group;
  materials: THREE.Material[];
  /** Kept by name so one rig can be re-dressed and used again. */
  paint: {
    skin: THREE.MeshStandardMaterial;
    shirt: THREE.MeshStandardMaterial;
    trousers: THREE.MeshStandardMaterial;
    hair: THREE.MeshStandardMaterial;
  };
};

function limb(
  len: number,
  r: number,
  mat: THREE.Material,
  cast: boolean
): { pivot: THREE.Group; end: number } {
  const pivot = new THREE.Group();
  const g = new THREE.CapsuleGeometry(r, Math.max(0.01, len - r * 2), 3, 8);
  g.translate(0, -len / 2, 0);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = cast;
  pivot.add(m);
  return { pivot, end: -len };
}

export function buildCharacter(look: Look, cast = true): Rig {
  const skin = new THREE.MeshStandardMaterial({ color: look.skin, roughness: 0.78 });
  const shirt = new THREE.MeshStandardMaterial({ color: look.shirt, roughness: 0.86 });
  const trousers = new THREE.MeshStandardMaterial({ color: look.trousers, roughness: 0.9 });
  const hair = new THREE.MeshStandardMaterial({ color: look.hair, roughness: 0.95 });
  const shoes = new THREE.MeshStandardMaterial({ color: look.shoes, roughness: 0.7 });
  const materials = [skin, shirt, trousers, hair, shoes];

  const root = new THREE.Group();
  root.name = 'ped';

  const hips = new THREE.Group();
  hips.position.y = 0.92;
  root.add(hips);

  // Torso, tapering to the shoulders.
  const torso = new THREE.Group();
  hips.add(torso);
  {
    const g = new THREE.CylinderGeometry(0.185, 0.155, 0.56, 10);
    g.scale(1, 1, 0.62);
    g.translate(0, 0.3, 0);
    const m = new THREE.Mesh(g, shirt);
    m.castShadow = cast;
    torso.add(m);
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.158, 0.16, 0.12, 10), trousers);
    belt.scale.set(1, 1, 0.66);
    belt.position.y = 0.03;
    torso.add(belt);
  }

  const head = new THREE.Group();
  head.position.y = 0.62;
  torso.add(head);
  {
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.08, 6), skin);
    neck.position.y = 0.02;
    head.add(neck);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.108, 12, 10), skin);
    skull.scale.set(0.92, 1.08, 0.98);
    skull.position.y = 0.15;
    skull.castShadow = cast;
    head.add(skull);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.113, 12, 8, 0, Math.PI * 2, 0, 1.15), hair);
    cap.scale.set(0.94, 1.02, 1.0);
    cap.position.set(0, 0.165, -0.008);
    head.add(cap);
  }

  const arms: THREE.Group[] = [];
  const fores: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const upper = limb(0.3, 0.052, shirt, cast);
    upper.pivot.position.set(side * 0.205, 0.52, 0);
    torso.add(upper.pivot);
    const fore = limb(0.28, 0.045, skin, cast);
    fore.pivot.position.y = upper.end;
    upper.pivot.add(fore.pivot);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 6), skin);
    hand.position.y = fore.end;
    fore.pivot.add(hand);
    arms.push(upper.pivot);
    fores.push(fore.pivot);
  }

  const thighs: THREE.Group[] = [];
  const shins: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const thigh = limb(0.44, 0.072, trousers, cast);
    thigh.pivot.position.set(side * 0.088, -0.02, 0);
    hips.add(thigh.pivot);
    const shin = limb(0.42, 0.058, trousers, cast);
    shin.pivot.position.y = thigh.end;
    thigh.pivot.add(shin.pivot);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.24), shoes);
    foot.position.set(0, shin.end + 0.03, 0.05);
    foot.castShadow = cast;
    shin.pivot.add(foot);
    thighs.push(thigh.pivot);
    shins.push(shin.pivot);
  }

  return {
    root,
    hips,
    torso,
    head,
    armL: arms[0],
    armR: arms[1],
    foreL: fores[0],
    foreR: fores[1],
    thighL: thighs[0],
    thighR: thighs[1],
    shinL: shins[0],
    shinR: shins[1],
    materials,
    paint: { skin, shirt, trousers, hair },
  };
}

/** Limbs thrown out, face down. Used for anyone a bumper has just met. */
export function poseFloored(r: Rig, t: number, dt: number) {
  const k = 1 - Math.exp(-9 * dt);
  const spread = Math.min(1, t * 3);
  r.hips.position.y = lerp(r.hips.position.y, 0.92, k);
  r.torso.rotation.x = lerp(r.torso.rotation.x, -0.16, k);
  r.torso.rotation.z = lerp(r.torso.rotation.z, 0.1 * spread, k);
  r.head.rotation.x = lerp(r.head.rotation.x, 0.3 * spread, k);
  r.armL.rotation.x = lerp(r.armL.rotation.x, -2.1 * spread, k);
  r.armR.rotation.x = lerp(r.armR.rotation.x, -1.4 * spread, k);
  r.armL.rotation.z = lerp(r.armL.rotation.z, -0.8 * spread, k);
  r.armR.rotation.z = lerp(r.armR.rotation.z, 0.55 * spread, k);
  r.foreL.rotation.x = lerp(r.foreL.rotation.x, -0.5, k);
  r.foreR.rotation.x = lerp(r.foreR.rotation.x, -1.2, k);
  r.thighL.rotation.x = lerp(r.thighL.rotation.x, 0.5 * spread, k);
  r.thighR.rotation.x = lerp(r.thighR.rotation.x, -0.35 * spread, k);
  r.shinL.rotation.x = lerp(r.shinL.rotation.x, -0.9 * spread, k);
  r.shinR.rotation.x = lerp(r.shinR.rotation.x, -0.3 * spread, k);
}

export function disposeCharacter(rig: Rig) {
  rig.root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose();
  });
  rig.materials.forEach((m) => m.dispose());
}

const lerp = THREE.MathUtils.lerp;

/**
 * Pose the rig.
 *
 * `phase` advances with distance travelled, not with time, so the feet do not
 * skate. `gait` runs 0 (standing) → 1 (walking) → 2 (sprinting): stride length,
 * arm swing and forward lean all key off it.
 */
export function poseWalk(r: Rig, phase: number, gait: number, dt: number) {
  const run = Math.max(0, gait - 1);
  const move = Math.min(1, gait);
  const s = Math.sin(phase);
  const c = Math.cos(phase);

  const swing = (0.55 + run * 0.35) * move;
  const armSwing = (0.5 + run * 0.5) * move;

  // Legs: thigh swings, shin trails and never bends the wrong way.
  const tL = s * swing;
  const tR = -s * swing;
  r.thighL.rotation.x = lerp(r.thighL.rotation.x, tL, 1 - Math.exp(-22 * dt));
  r.thighR.rotation.x = lerp(r.thighR.rotation.x, tR, 1 - Math.exp(-22 * dt));
  r.shinL.rotation.x = lerp(
    r.shinL.rotation.x,
    -Math.max(0, -c * 0.9 + 0.25) * (0.9 + run) * move,
    1 - Math.exp(-22 * dt)
  );
  r.shinR.rotation.x = lerp(
    r.shinR.rotation.x,
    -Math.max(0, c * 0.9 + 0.25) * (0.9 + run) * move,
    1 - Math.exp(-22 * dt)
  );

  // Arms counter-swing, and tuck in as the pace picks up.
  const k = 1 - Math.exp(-20 * dt);
  r.armL.rotation.x = lerp(r.armL.rotation.x, -s * armSwing, k);
  r.armR.rotation.x = lerp(r.armR.rotation.x, s * armSwing, k);
  r.armL.rotation.z = lerp(r.armL.rotation.z, -0.09 - run * 0.06, k);
  r.armR.rotation.z = lerp(r.armR.rotation.z, 0.09 + run * 0.06, k);
  r.foreL.rotation.x = lerp(r.foreL.rotation.x, -0.25 - run * 0.75 - Math.max(0, -s) * 0.4, k);
  r.foreR.rotation.x = lerp(r.foreR.rotation.x, -0.25 - run * 0.75 - Math.max(0, s) * 0.4, k);

  // Bob and lean. A sprint pitches the whole body forward off the hips.
  r.hips.position.y = lerp(r.hips.position.y, 0.92 - Math.abs(c) * 0.035 * move - run * 0.03, k);
  r.torso.rotation.x = lerp(r.torso.rotation.x, 0.05 + move * 0.08 + run * 0.2, k);
  r.torso.rotation.z = lerp(r.torso.rotation.z, s * 0.045 * move, k);
  r.head.rotation.x = lerp(r.head.rotation.x, -0.05 - run * 0.16, k);
}

/** Astride: knees out and back, hands forward on the bars. */
export function poseAstride(r: Rig, steer: number, dt: number) {
  const k = 1 - Math.exp(-16 * dt);
  r.hips.position.y = lerp(r.hips.position.y, 0.9, k);
  r.torso.rotation.x = lerp(r.torso.rotation.x, 0.42, k);
  r.torso.rotation.z = lerp(r.torso.rotation.z, -steer * 0.12, k);
  r.head.rotation.x = lerp(r.head.rotation.x, -0.4, k);
  r.thighL.rotation.x = lerp(r.thighL.rotation.x, -0.72, k);
  r.thighR.rotation.x = lerp(r.thighR.rotation.x, -0.72, k);
  r.thighL.rotation.z = lerp(r.thighL.rotation.z, -0.2, k);
  r.thighR.rotation.z = lerp(r.thighR.rotation.z, 0.2, k);
  r.shinL.rotation.x = lerp(r.shinL.rotation.x, 1.15, k);
  r.shinR.rotation.x = lerp(r.shinR.rotation.x, 1.15, k);
  r.armL.rotation.x = lerp(r.armL.rotation.x, -1.35, k);
  r.armR.rotation.x = lerp(r.armR.rotation.x, -1.35, k);
  r.armL.rotation.z = lerp(r.armL.rotation.z, -0.2, k);
  r.armR.rotation.z = lerp(r.armR.rotation.z, 0.2, k);
  r.foreL.rotation.x = lerp(r.foreL.rotation.x, -0.15, k);
  r.foreR.rotation.x = lerp(r.foreR.rotation.x, -0.15, k);
}

/** Seated, hands on the wheel. */
export function poseSeated(r: Rig, steer: number, dt: number) {
  const k = 1 - Math.exp(-16 * dt);
  r.hips.position.y = lerp(r.hips.position.y, 0.62, k);
  r.torso.rotation.x = lerp(r.torso.rotation.x, 0.12, k);
  r.torso.rotation.z = lerp(r.torso.rotation.z, 0, k);
  r.head.rotation.x = lerp(r.head.rotation.x, -0.08, k);
  r.thighL.rotation.x = lerp(r.thighL.rotation.x, -1.42, k);
  r.thighR.rotation.x = lerp(r.thighR.rotation.x, -1.5, k);
  r.shinL.rotation.x = lerp(r.shinL.rotation.x, 1.28, k);
  r.shinR.rotation.x = lerp(r.shinR.rotation.x, 1.36, k);
  r.armL.rotation.x = lerp(r.armL.rotation.x, -1.05 + steer * 0.35, k);
  r.armR.rotation.x = lerp(r.armR.rotation.x, -1.05 - steer * 0.35, k);
  r.armL.rotation.z = lerp(r.armL.rotation.z, -0.32, k);
  r.armR.rotation.z = lerp(r.armR.rotation.z, 0.32, k);
  r.foreL.rotation.x = lerp(r.foreL.rotation.x, -0.5, k);
  r.foreR.rotation.x = lerp(r.foreR.rotation.x, -0.5, k);
}
