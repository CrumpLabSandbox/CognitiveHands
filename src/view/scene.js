// Three.js view of the skeleton, arms and keyboard.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { KEY_CAP, KEY_HEIGHT, PITCH } from '../instrument/layout.js';

export const FINGER_COLORS = { thumb: 0xe4572e, index: 0xf3a712, middle: 0xa8c256, ring: 0x29a19c, little: 0x3d7dca };
const Y_UP = new THREE.Vector3(0, 1, 0);

export class HandScene {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x15171c);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.01, 10);
    this.camera.position.set(0.04, 0.4, 0.58);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.02, 0.05);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.maxDistance = 2;
    this.controls.minDistance = 0.08;

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x303540, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(0.3, 0.7, 0.45);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 2;
    sun.shadow.camera.left = sun.shadow.camera.bottom = -0.5;
    sun.shadow.camera.right = sun.shadow.camera.top = 0.5;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0x9fb4ff, 0.4);
    fill.position.set(-0.4, 0.3, -0.3);
    this.scene.add(fill);

    const desk = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x272a31, roughness: 0.95 }),
    );
    desk.rotation.x = -Math.PI / 2;
    desk.position.y = -0.013;
    desk.receiveShadow = true;
    this.scene.add(desk);

    this.meshes = new Map();
    this.keyMeshes = new Map();
    this.unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 16, 1);
    this.unitSphere = new THREE.SphereGeometry(1, 18, 14);
    this.boneMaterial = new THREE.MeshStandardMaterial({ color: 0xf0e8d6, roughness: 0.55 });
    this.jointMaterial = new THREE.MeshStandardMaterial({ color: 0xd9cfb9, roughness: 0.5 });
    this.carpalMaterial = new THREE.MeshStandardMaterial({ color: 0xe6dcc4, roughness: 0.6 });
    this.armMaterial = new THREE.MeshStandardMaterial({ color: 0xe9e1cf, roughness: 0.6, transparent: true, opacity: 0.85 });
    this.fingerMaterials = Object.fromEntries(
      Object.entries(FINGER_COLORS).map(([f, c]) => [f, new THREE.MeshStandardMaterial({ color: c, roughness: 0.45 })]),
    );
    this.showArms = true;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 600;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  labelTexture(label) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#e9e7e1';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#23252a';
    ctx.font = `${label.length > 2 ? 'bold 30px' : 'bold 60px'} system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 64, 68);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  buildKeyboard(keyboard) {
    for (const m of this.keyMeshes.values()) this.scene.remove(m);
    this.keyMeshes.clear();
    const xs = keyboard.keys.map((k) => k.x);
    const minX = Math.min(...keyboard.keys.map((k, i) => xs[i] - k.width / 2));
    const maxX = Math.max(...keyboard.keys.map((k, i) => xs[i] + k.width / 2));
    const zs = keyboard.keys.map((k) => k.z);
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(maxX - minX + 0.012, 0.01, Math.max(...zs) - Math.min(...zs) + PITCH + 0.012),
      new THREE.MeshStandardMaterial({ color: 0x3a3d46, roughness: 0.7, metalness: 0.1 }),
    );
    base.position.set((minX + maxX) / 2, -KEY_HEIGHT - 0.005, (Math.max(...zs) + Math.min(...zs)) / 2);
    base.receiveShadow = true;
    base.castShadow = true;
    this.scene.add(base);
    this.keyboardBase = base;

    const side = new THREE.MeshStandardMaterial({ color: 0xd3d0c8, roughness: 0.7 });
    for (const key of keyboard.keys) {
      const top = new THREE.MeshStandardMaterial({ map: this.labelTexture(key.label), roughness: 0.6, emissive: 0x000000 });
      const geo = new THREE.BoxGeometry(key.width - (PITCH - KEY_CAP), KEY_HEIGHT, KEY_CAP);
      const mesh = new THREE.Mesh(geo, [side, side, top, side, side, side]);
      mesh.position.set(key.x, -KEY_HEIGHT / 2, key.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.keyMeshes.set(key.id, { mesh, top });
    }
  }

  mesh(id, geometry, material) {
    let m = this.meshes.get(id);
    if (!m) {
      m = new THREE.Mesh(geometry, material);
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
      this.meshes.set(id, m);
    }
    if (m.material !== material) m.material = material;
    return m;
  }

  placeBone(id, from, to, radius, material = this.boneMaterial) {
    const m = this.mesh(id, this.unitCylinder, material);
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    m.position.copy(from).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(Y_UP, dir.normalize());
    m.scale.set(radius, len, radius);
    m.visible = true;
  }

  placeSphere(id, pos, radius, material = this.jointMaterial) {
    const m = this.mesh(id, this.unitSphere, material);
    m.position.copy(pos);
    m.scale.setScalar(radius);
    m.visible = true;
  }

  update(sim) {
    const activations = sim.lastOut?.activations ?? {};
    for (const side of ['left', 'right']) {
      const hand = sim.hands[side];
      const fk = hand.forwardKinematics();
      for (const seg of fk.segments) {
        const distal = seg.name.endsWith('distal');
        this.placeBone(`${side}.${seg.name}`, seg.from, seg.to, seg.radius * 0.9, distal ? this.fingerMaterials[seg.finger] : this.boneMaterial);
        this.placeSphere(`${side}.${seg.name}.head`, seg.from, seg.radius * 1.05);
        if (distal) {
          this.placeSphere(`${side}.${seg.name}.tip`, seg.to, seg.radius * 0.95, this.fingerMaterials[seg.finger]);
          this.placeSphere(`${side}.${seg.name}.pad`, fk.pads[seg.finger], seg.radius * 0.8, this.fingerMaterials[seg.finger]);
        }
      }
      for (const c of fk.carpals) this.placeSphere(`${side}.carpal.${c.name}`, c.pos, c.radius, this.carpalMaterial);

      const arm = sim.arms[side].solve(fk.wrist);
      const radialSign = side === 'right' ? -1 : 1;
      const radialWrist = fk.wrist.clone().add(new THREE.Vector3(radialSign * 0.012, 0.002, 0.02));
      const ulnarWrist = fk.wrist.clone().add(new THREE.Vector3(-radialSign * 0.012, 0.002, 0.02));
      const radialElbow = arm.elbow.clone().add(new THREE.Vector3(radialSign * 0.02, -0.005, 0));
      this.placeBone(`${side}.humerus`, arm.shoulder, arm.elbow, 0.014, this.armMaterial);
      this.placeBone(`${side}.ulna`, arm.elbow, ulnarWrist, 0.0085, this.armMaterial);
      this.placeBone(`${side}.radius`, radialElbow, radialWrist, 0.008, this.armMaterial);
      this.placeSphere(`${side}.elbow`, arm.elbow, 0.022, this.armMaterial);
      this.placeSphere(`${side}.shoulder`, arm.shoulder, 0.03, this.armMaterial);
      for (const id of ['humerus', 'ulna', 'radius', 'elbow', 'shoulder']) this.meshes.get(`${side}.${id}`).visible = this.showArms;
    }
    for (const key of sim.keyboard.keys) {
      const entry = this.keyMeshes.get(key.id);
      if (!entry) continue;
      entry.mesh.position.y = -KEY_HEIGHT / 2 - key.depth;
      const a = activations[key.id] ?? 0;
      if (key.pressed) entry.top.emissive.setHex(0xff7a30);
      else if (a > 0.05) entry.top.emissive.setRGB(0.1 * a, 0.3 * a, 0.9 * a);
      else entry.top.emissive.setHex(0x000000);
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
