import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface Props {
  /** The CSS shadow under the ball; scaled and faded with the ball's height. */
  shadow: RefObject<HTMLDivElement | null>;
  label: string;
  reduced: boolean;
  onReady: () => void;
  onFail: () => void;
}

const BASE = import.meta.env.BASE_URL;
const DROP_HEIGHT = 3.1;
const GRAVITY = -17;
const BOUNCE = 0.42;

/**
 * A dimpled golf ball with the GOLFWEAR print. Drag to spin (with inertia), tap or press Enter
 * to make it hop, arrow keys to spin. It tilts toward the cursor and idles with a slow turn.
 * Rendering stops while the ball is off screen or the tab is hidden.
 */
export default function GolfBall({ shadow, label, reduced, onReady, onFail }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onReady, onFail });
  callbacks.current = { onReady, onFail };

  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      callbacks.current.onFail();
      return;
    }
    const lowEnd = (navigator.hardwareConcurrency ?? 8) <= 4 && window.matchMedia('(pointer: coarse)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    const canvas = renderer.domElement;
    Object.assign(canvas.style, { width: '100%', height: '100%', display: 'block', touchAction: 'pan-y' });
    el.appendChild(canvas);

    // ---- scene ----
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
    camera.position.set(0, 0, 6.4);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    const key = new THREE.DirectionalLight(0xfff3df, 2.3);
    key.position.set(-3, 4, 5);
    const rim = new THREE.DirectionalLight(0xd9c39a, 1.2);
    rim.position.set(4, 1.5, -3);
    scene.add(key, rim);

    const geometry = new THREE.SphereGeometry(1, lowEnd ? 96 : 128, lowEnd ? 72 : 96);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.34, metalness: 0, envMapIntensity: 0.85 });
    const ball = new THREE.Mesh(geometry, material);
    ball.rotation.set(0, -0.14, 0);   // lands with the print facing you
    const tilt = new THREE.Group();   // leans toward the cursor
    const lift = new THREE.Group();   // drop and hops
    tilt.add(ball);
    lift.add(tilt);
    scene.add(lift);

    // ---- motion state ----
    const omega = new THREE.Vector3();                         // angular velocity, rad/s
    const idle = new THREE.Vector3();                         // slow turn, starts once the ball has landed
const IDLE_SPEED = reduced ? 0 : 0.3;
    const axis = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const target = { x: 0.16, y: 0 };
    let y = reduced ? 0 : DROP_HEIGHT;
    let vy = 0;
    let squash = 0;
    let ready = false;
    let landed = reduced;
    if (landed) idle.y = IDLE_SPEED;

    const spinBy = (ax: number, ay: number, angle: number) => {
      axis.set(ax, ay, 0).normalize();
      q.setFromAxisAngle(axis, angle);
      ball.quaternion.premultiply(q);
    };
    const hop = () => {
      if (reduced) { omega.y += 5; return; }
      if (y < 0.05) vy = 4.6;
      omega.y += 7;
      omega.x += (Math.random() - 0.5) * 3;
    };

    // ---- input ----
    let dragging = false;
    let moved = 0, lastX = 0, lastY = 0, lastT = 0, downT = 0;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      moved = 0;
      lastX = e.clientX; lastY = e.clientY; lastT = downT = performance.now();
      omega.multiplyScalar(0.2);
      canvas.setPointerCapture(e.pointerId);
    };
    const onDrag = (e: PointerEvent) => {
      if (!dragging) return;
      const now = performance.now();
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        const angle = dist / (canvas.clientHeight * 0.3);
        spinBy(dy, dx, angle);
        const dt = Math.max((now - lastT) / 1000, 1 / 120);
        omega.lerp(axis.clone().multiplyScalar(angle / dt), 0.5);
      }
      moved += dist;
      lastX = e.clientX; lastY = e.clientY; lastT = now;
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      if (moved < 6 && performance.now() - downT < 350) hop();
      if (performance.now() - lastT > 80) omega.multiplyScalar(0.2); // held still before letting go
      omega.clampLength(0, 16);
    };
    const onHover = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
      target.x = 0.16 + ny * 0.26;
      target.y = nx * 0.34;
    };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === 'ArrowLeft') omega.y -= 2.6;
      else if (k === 'ArrowRight') omega.y += 2.6;
      else if (k === 'ArrowUp') omega.x -= 2.6;
      else if (k === 'ArrowDown') omega.x += 2.6;
      else if (k === 'Enter' || k === ' ') hop();
      else return;
      e.preventDefault();
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onDrag);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    window.addEventListener('pointermove', onHover, { passive: true });
    el.addEventListener('keydown', onKey);

    // ---- size ----
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // ---- loop ----
    let raf = 0, last = 0, visible = true;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - (last || now)) / 1000, 0.05);
      last = now;
      if (!ready) return;

      // drop, bounce and hops
      if (y > 0 || vy !== 0) {
        vy += GRAVITY * dt;
        y += vy * dt;
        if (y <= 0) {
          y = 0;
          if (Math.abs(vy) > 1.4) {
            squash = Math.min(0.11, Math.abs(vy) * 0.012);
            omega.x += vy * 0.025;
            vy = -vy * BOUNCE;
          } else {
            vy = 0;
            if (!landed) { landed = true; idle.y = IDLE_SPEED; }
          }
        }
      }
      squash *= Math.exp(-14 * dt);
      ball.scale.set(1 + squash, 1 - squash, 1 + squash);
      lift.position.y = y;

      // spin: inertia easing back to the idle turn
      if (!dragging) omega.lerp(idle, 1 - Math.exp(-1.3 * dt));
      const speed = omega.length();
      if (!dragging && speed > 1e-5) spinBy(omega.x, omega.y, speed * dt);

      // lean toward the cursor
      const ease = 1 - Math.exp(-4 * dt);
      tilt.rotation.x += (target.x - tilt.rotation.x) * ease;
      tilt.rotation.y += (target.y - tilt.rotation.y) * ease;

      const sh = shadow.current;
      if (sh) {
        const h = Math.min(y / DROP_HEIGHT, 1);
        sh.style.opacity = String(0.75 * (1 - h * 0.85));
        sh.style.transform = `translateX(-50%) scale(${1 - h * 0.45})`;
      }
      renderer.render(scene, camera);
    };
    const start = () => { if (!raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) start(); else stop(); });
    io.observe(el);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);

    // ---- textures ----
    const res = Math.max(window.innerWidth, window.innerHeight) * Math.min(window.devicePixelRatio || 1, 2) > 1400 && !lowEnd ? '2k' : '1k';
    const loader = new THREE.TextureLoader();
    const load = (url: string) => new Promise<THREE.Texture>((resolve, reject) => loader.load(url, resolve, undefined, reject));
    let disposed = false;
    const textures: THREE.Texture[] = [];
    Promise.all([load(`${BASE}ball/albedo-${res}.webp`), load(`${BASE}ball/normal-${res}.webp`)])
      .then(([albedo, normal]) => {
        textures.push(albedo, normal);
        if (disposed) return;
        albedo.colorSpace = THREE.SRGBColorSpace;
        albedo.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        normal.colorSpace = THREE.NoColorSpace;
        material.map = albedo;
        material.normalMap = normal;
        material.normalMapType = THREE.ObjectSpaceNormalMap;
        material.needsUpdate = true;
        ready = true;
        renderer.render(scene, camera);
        callbacks.current.onReady();
        start();
      })
      .catch(() => callbacks.current.onFail());

    return () => {
      disposed = true;
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onHover);
      el.removeEventListener('keydown', onKey);
      geometry.dispose();
      material.dispose();
      textures.forEach((t) => t.dispose());
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [shadow, reduced]);

  return (
    <div
      ref={host}
      className="absolute inset-0 rounded-full outline-offset-[-12px]"
      role="button"
      tabIndex={0}
      aria-label={label}
      data-cursor="drag"
    />
  );
}
