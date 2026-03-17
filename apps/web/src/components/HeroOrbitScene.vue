<template>
  <div ref="root" class="relative h-[20rem] overflow-hidden rounded-[2rem] border border-black/8 bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.24),rgba(255,255,255,0.12),transparent_68%)]">
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.38),transparent_26%),radial-gradient(circle_at_80%_26%,rgba(29,78,216,0.24),transparent_24%),radial-gradient(circle_at_40%_80%,rgba(221,139,32,0.22),transparent_28%)]" />
    <div class="pointer-events-none absolute inset-x-6 top-6 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-white/70">
      <span>3D Coach</span>
      <span>Three.js</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import gsap from 'gsap';
import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  Object3D,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  TorusGeometry,
  WebGLRenderer,
  WireframeGeometry,
} from 'three';

const root = ref<HTMLElement | null>(null);

let renderer: WebGLRenderer | null = null;
let scene: Scene | null = null;
let camera: PerspectiveCamera | null = null;
let frameId = 0;
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  const host = root.value;
  if (!host) return;

  scene = new Scene();
  camera = new PerspectiveCamera(48, host.clientWidth / host.clientHeight, 0.1, 100);
  camera.position.set(0, 0.4, 4.3);

  renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  host.appendChild(renderer.domElement);

  const ambient = new AmbientLight(0xffffff, 1.5);
  const point = new PointLight(0x7dd3fc, 16, 18);
  point.position.set(2, 3, 4);
  scene.add(ambient, point);

  const cluster = new Group();

  const shell = new Mesh(
    new IcosahedronGeometry(1.15, 3),
    new MeshPhysicalMaterial({
      color: 0x0f766e,
      metalness: 0.08,
      roughness: 0.18,
      transparent: true,
      opacity: 0.8,
      transmission: 0.18,
    }),
  );
  cluster.add(shell);

  const wire = new LineSegments(
    new WireframeGeometry(new IcosahedronGeometry(1.42, 2)),
    new LineBasicMaterial({ color: 0xdd8b20, transparent: true, opacity: 0.55 }),
  );
  cluster.add(wire);

  const halo = new Mesh(
    new TorusGeometry(1.75, 0.06, 24, 120),
    new MeshBasicMaterial({ color: 0x1d4ed8, transparent: true, opacity: 0.4 }),
  );
  halo.rotation.x = Math.PI / 2.4;
  cluster.add(halo);

  const particlesGeometry = new BufferGeometry();
  const particles = new Float32Array(160 * 3);
  for (let i = 0; i < particles.length; i += 3) {
    particles[i] = (Math.random() - 0.5) * 5;
    particles[i + 1] = (Math.random() - 0.5) * 3;
    particles[i + 2] = (Math.random() - 0.5) * 4;
  }
  particlesGeometry.setAttribute('position', new BufferAttribute(particles, 3));
  const dust = new Points(
    particlesGeometry,
    new PointsMaterial({
      color: 0xffffff,
      size: 0.03,
      transparent: true,
      opacity: 0.8,
    }),
  );
  scene.add(dust);
  scene.add(cluster);

  gsap.fromTo(
    host,
    { opacity: 0, y: 24, filter: 'blur(14px)' },
    { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, ease: 'power3.out' },
  );
  gsap.to(cluster.rotation, {
    y: Math.PI * 2,
    duration: 18,
    repeat: -1,
    ease: 'none',
  });
  gsap.to(shell.position, {
    y: 0.16,
    duration: 2.8,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  });
  gsap.to(halo.rotation, {
    z: Math.PI * 2,
    duration: 12,
    repeat: -1,
    ease: 'none',
  });

  const render = () => {
    if (!renderer || !scene || !camera) return;
    dust.rotation.y += 0.0015;
    dust.rotation.x += 0.0008;
    cluster.rotation.x += 0.0022;
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(render);
  };
  render();

  resizeObserver = new ResizeObserver(() => {
    if (!renderer || !camera || !host) return;
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(host.clientWidth, host.clientHeight);
  });
  resizeObserver.observe(host);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId);
  resizeObserver?.disconnect();
  renderer?.dispose();
  if (root.value && renderer?.domElement) {
    root.value.removeChild(renderer.domElement);
  }
  scene?.traverse((object: Object3D) => {
    const mesh = object as Mesh;
    mesh.geometry?.dispose?.();
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((material: Material) => material.dispose());
    } else {
      mesh.material?.dispose?.();
    }
  });
});
</script>
