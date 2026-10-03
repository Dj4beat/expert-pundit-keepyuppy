import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { asset } from '../assets';
import { PoseOverrides } from './pose';
import { animationSample, REACH, type JugglingStudy, type PlayerManifest } from './simulation';

const UP = new THREE.Vector3(0, 1, 0);
const temp = new THREE.Vector3();
export class StudyScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  readonly ball = new THREE.Mesh(new THREE.SphereGeometry(0.105, 32, 20));
  readonly ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.15, 0.006, 8, 64),
    new THREE.MeshBasicMaterial({ color: 0xeac575, transparent: true, opacity: 0.75 }),
  );
  manifest!: PlayerManifest;
  private model!: THREE.Group;
  private mixer!: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private texture?: THREE.Texture;
  private resizeObserver: ResizeObserver;
  private side = false;
  private shadows = true;
  private light = new THREE.DirectionalLight(0xffebce, 3.4);
  private poseOverrides = new PoseOverrides();
  contactError = 0;
  maxContactError = 0;
  constructor(readonly host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.domElement.setAttribute(
      'aria-label',
      'Ronaldinho 3D juggling court. Tap or press Space to touch the ball.',
    );
    host.append(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight(0xd7e6ff, 0x756c4c, 2.2));
    this.light.position.set(-3, 6, 4);
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(1024, 1024);
    Object.assign(this.light.shadow.camera, {
      left: -2,
      right: 2,
      top: 3,
      bottom: -2,
      near: 0.1,
      far: 12,
    });
    this.light.shadow.normalBias = 0.015;
    this.light.shadow.bias = -0.0002;
    this.scene.add(this.light);
    const bounce = new THREE.DirectionalLight(0xc6e2ee, 0.7);
    bounce.position.set(3, 3, -2);
    this.scene.add(bounce);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.ShadowMaterial({ opacity: 0.34 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.position.y = -0.015;
    this.scene.add(ground);
    // A real surface receives shadows. The retained venue plate supplies its painted appearance.
    this.scene.add(this.ball, this.ring);
    this.ball.castShadow = true;
    this.ball.material = new THREE.MeshStandardMaterial({
      map: this.makeBallTexture(),
      roughness: 0.65,
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
  }
  private makeBallTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f8f5e8';
    ctx.fillRect(0, 0, 512, 256);
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 8; col++) {
        const x = col * 70 + (row % 2) * 35,
          y = row * 76 + 14;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
          const px = x + Math.cos(a) * 17,
            py = y + Math.sin(a) * 17;
          if (i) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = '#172128';
        ctx.fill();
      }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  async load() {
    const [gltf, manifest, background] = await Promise.all([
      new GLTFLoader().loadAsync(asset('models/ronaldinho.glb')),
      fetch(asset('models/ronaldinho.contacts.json')).then((r) => {
        if (!r.ok) throw new Error('Contact manifest could not be loaded.');
        return r.json() as Promise<PlayerManifest>;
      }),
      new THREE.TextureLoader().loadAsync(asset('art/court.webp')),
    ]);
    this.manifest = manifest;
    this.texture = background;
    background.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = background;
    this.model = gltf.scene;
    this.model.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    this.scene.add(this.model);
    this.mixer = new THREE.AnimationMixer(this.model);
    for (const clip of gltf.animations) {
      const action = this.mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();
      action.paused = true;
      action.weight = 0;
      this.actions.set(clip.name, action);
    }
    for (const name of ['ready', 'foot_l', 'foot_r', 'knee_l', 'knee_r', 'header'])
      if (!this.actions.has(name)) throw new Error(`Missing animation: ${name}`);
    this.setCamera(false);
    this.actions.get('ready')!.weight = 1;
    this.mixer.update(0);
    // Upload textures, geometry, skinning buffers and compile before the countdown.
    this.renderer.initTexture(background);
    await this.renderer.compileAsync(this.scene, this.camera);
    this.renderer.render(this.scene, this.camera);
  }
  setCamera(side: boolean) {
    this.side = side;
    this.camera.position.set(
      ...((side ? [4.4, 2.05, 0.5] : [2.25, 2.0, 5.4]) as [number, number, number]),
    );
    this.camera.lookAt(0, 1.28, 0);
    // The side camera is an inspection view; the plate belongs to the gameplay camera.
    this.scene.background = side ? new THREE.Color('#52616a') : (this.texture ?? null);
    this.resize();
  }
  private resize() {
    const width = Math.max(1, this.host.clientWidth),
      height = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.texture && !this.side) {
      const image = this.texture.image as HTMLImageElement;
      const imageAspect = image.width / image.height;
      const aspect = width / height;
      this.texture.repeat.set(Math.min(1, aspect / imageAspect), Math.min(1, imageAspect / aspect));
      this.texture.offset.set((1 - this.texture.repeat.x) / 2, (1 - this.texture.repeat.y) / 2);
    }
  }
  setLowQuality(value: boolean) {
    if (this.shadows === !value) return;
    this.shadows = !value;
    this.renderer.shadowMap.enabled = !value;
    this.renderer.setPixelRatio(value ? 1 : Math.min(devicePixelRatio, 1.75));
    this.resize();
  }
  draw(sim: JugglingStudy, outro = 0) {
    this.poseOverrides.restore();
    const sample =
      sim.ended && outro > 0
        ? { clip: 'defeat', time: Math.min(0.64, outro), weight: Math.min(1, outro * 5) }
        : animationSample(sim);
    for (const [name, action] of this.actions) {
      action.weight =
        name === sample.clip ? sample.weight : name === 'ready' ? 1 - sample.weight : 0;
      action.time = name === 'ready' ? sim.time % this.manifest.duration : sample.time;
      action.enabled = true;
    }
    if (sample.clip === 'ready') this.actions.get('ready')!.weight = 1;
    this.mixer.update(0);
    this.model.updateMatrixWorld(true);
    const head = this.model.getObjectByName('head');
    // Small gaze adjustment, faded away before authored header contact.
    if (head && !sim.ended) {
      this.poseOverrides.remember(head);
      const position = head.getWorldPosition(new THREE.Vector3());
      const pitch = Math.atan2(
        sim.ball[1] - position.y,
        Math.max(0.35, Math.hypot(sim.ball[0] - position.x, sim.ball[2] - position.z)),
      );
      const headerBlend = sample.clip === 'header' ? Math.max(0, 1 - sample.weight) : 1;
      head.rotateX(THREE.MathUtils.clamp(-pitch * 0.18, -0.18, 0.18) * headerBlend);
      head.updateMatrixWorld(true);
    }
    this.ball.position.fromArray(sim.ball);
    this.ball.rotation.set(sim.time * 0.8, sim.time * 0.5, 0);
    const contact = sim.contact;
    // The bounded correction only operates close to authored contact, never moves the root,
    // never scales a bone, and never changes the supporting leg.
    const recent = contact && contact.outcome !== 'miss' && sim.time - contact.actualTime < 0.17;
    const near = Math.abs(sim.time - sim.due) < 0.1;
    const limb = recent ? contact.limb : sim.limb;
    const marker = this.model.getObjectByName('contact_' + limb);
    if (marker && (recent || near)) {
      const desired = recent
        ? new THREE.Vector3().fromArray(contact.point)
        : this.ball.position.clone();
      desired.y -= this.manifest.ballRadius;
      marker.getWorldPosition(temp);
      const offset = desired.clone().sub(temp);
      if (offset.length() <= REACH[limb] + 0.035 && limb !== 'header') {
        const side = limb.endsWith('_l') ? 'l' : 'r';
        const names = limb.startsWith('foot')
          ? ['calf_' + side, 'thigh_' + side]
          : ['thigh_' + side];
        this.correctContact(names, marker, desired);
      }
      marker.getWorldPosition(temp).addScaledVector(UP, this.manifest.ballRadius);
      this.contactError = temp.distanceTo(
        recent ? new THREE.Vector3().fromArray(contact.point) : this.ball.position,
      );
      if (recent && sim.time - contact.actualTime < 1 / 30)
        this.maxContactError = Math.max(this.maxContactError, this.contactError);
    }
    this.ring.position.fromArray(sim.target);
    this.ring.quaternion.copy(this.camera.quaternion);
    const until = sim.due - sim.time;
    this.ring.visible = until < 0.6 && until > -0.1 && !sim.ended;
    this.ring.scale.setScalar(1 + Math.max(0, until) * 1.5);
    (this.ring.material as THREE.MeshBasicMaterial).color.set(
      sim.reachable ? '#99efb0' : '#eac575',
    );
    this.renderer.render(this.scene, this.camera);
  }
  private correctContact(names: string[], marker: THREE.Object3D, target: THREE.Vector3) {
    const originals = new Map<string, THREE.Quaternion>();
    for (const name of names) {
      const bone = this.model.getObjectByName(name);
      if (bone) {
        this.poseOverrides.remember(bone);
        originals.set(name, bone.quaternion.clone());
      }
    }
    for (let pass = 0; pass < 6; pass++)
      for (const name of names) {
        const bone = this.model.getObjectByName(name);
        if (!bone || !bone.parent) continue;
        const origin = bone.getWorldPosition(new THREE.Vector3());
        const from = marker.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
        const to = target.clone().sub(origin).normalize();
        const delta = new THREE.Quaternion().setFromUnitVectors(from, to);
        const world = bone.getWorldQuaternion(new THREE.Quaternion());
        const parent = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
        const wanted = parent.multiply(delta.multiply(world));
        const base = originals.get(name)!;
        const angle = base.angleTo(wanted);
        bone.quaternion.copy(base).slerp(wanted, Math.min(1, 0.24 / Math.max(angle, 0.0001)));
        bone.updateMatrixWorld(true);
      }
  }
  dispose() {
    this.resizeObserver.disconnect();
    this.mixer?.stopAllAction();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        for (const m of Array.isArray(obj.material) ? obj.material : [obj.material]) {
          if ('map' in m && m.map instanceof THREE.Texture) m.map.dispose();
          m.dispose();
        }
      }
    });
    this.texture?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
