import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { systemPosAtEpoch } from '../../engine/stellarMotion.js';
import { evaluateVoyageAtCoordYear } from '../../engine/voyagePlanner.js';
import { SPECTRAL_COLORS } from '../../utils/format.js';
import {
  RADIO_REFERENCE_YEAR,
  RADIO_SHELL_LAYERS,
  METI_BEAMS,
} from '../../data/radioBroadcastLayers.js';

/**
 * Galactic [x, y, z] -> Three.js Y-up scene [x, z, -y]
 */
function toSceneVec(galPos, out = new THREE.Vector3()) {
  return out.set(galPos[0], galPos[2], -galPos[1]);
}

function magnitudeSize(absmag) {
  return Number.isFinite(absmag) ? Math.min(10.5, Math.max(2.8, 9.2 - 0.44 * absmag)) : 3.5;
}

/**
 * Custom GLSL Point Shader from star-empire upgraded with crisp vector shapes:
 * shape 0 = filled disc (star core)
 * shape 1 = circular ring (exoplanet host indicator)
 * shape 2 = filled diamond (ship marker)
 * shape 3 = diamond reticle ring (habitable zone host indicator)
 */
function createPointCloud({ positions, colors, sizes, opacity = 1.0, shape = 0 }) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      pixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      opacity: { value: opacity },
      shape: { value: shape },
    },
    vertexShader: /* glsl */ `
      attribute float size;
      attribute vec3 color;
      uniform float pixelRatio;
      varying vec3 vColor;
      void main() {
        vColor = color;
        gl_PointSize = size * pixelRatio;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float opacity;
      uniform int shape;
      varying vec3 vColor;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float r = shape >= 2 ? (abs(c.x) + abs(c.y)) * 2.0 : length(c) * 2.0;
        float edge = fwidth(r);
        float alpha = 1.0 - smoothstep(1.0 - edge, 1.0, r);
        if (shape == 1 || shape == 3) {
          alpha *= smoothstep(0.62 - edge, 0.62, r);
        }
        if (alpha <= 0.0) discard;
        gl_FragColor = vec4(vColor, alpha * opacity);
      }
    `,
    transparent: true,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
}

/**
 * Screen-facing constant-pixel-radius selection reticle ring.
 */
function createScreenRing({ color, radiusPx, dashed = false }) {
  const pts = [];
  const n = 64;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(pts);
  const material = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: 0.2, gapSize: 0.14 })
    : new THREE.LineBasicMaterial({ color });
  const ring = new THREE.Line(geometry, material);
  if (dashed) ring.computeLineDistances();
  ring.visible = false;
  const tmp = new THREE.Vector3();

  return {
    object: ring,
    setPosition(pos) {
      ring.visible = !!pos;
      if (pos) ring.position.copy(pos);
    },
    update(camera, viewportHeight) {
      if (!ring.visible) return;
      ring.quaternion.copy(camera.quaternion);
      const dist = tmp.copy(ring.position).distanceTo(camera.position);
      const worldPerPx = (2 * dist * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(1, viewportHeight);
      ring.scale.setScalar(radiusPx * worldPerPx);
    },
  };
}

export default function AstrometricsMap3D({
  systems,
  selectedSystemId,
  onSelectSystem,
  onAppendWaypoint,
  epochOffsetYears,
  labelMode,
  colorMode,
  activeVoyage,
  allShipsWithVoyages,
  masterClockYear,
  lightConeConfig,
  focusRequest,
  galacticCenterText,
  scifiBySystemId,
  velocityVectorMode = 'off',
  velocityHorizonKyr = 20,
  maxRadiusLy = 135,
  radioBubbleConfig = null,
  systemsById = null,
  lang = 'en',
}) {
  const containerRef = useRef(null);
  const stateRef = useRef({
    systems: [],
    scenePos: [],
    selectedSystemId: null,
    onSelectSystem: null,
    onAppendWaypoint: null,
    labelMode: 'auto',
    colorMode: 'spectral',
  });

  stateRef.current.systems = systems;
  stateRef.current.selectedSystemId = selectedSystemId;
  stateRef.current.onSelectSystem = onSelectSystem;
  stateRef.current.onAppendWaypoint = onAppendWaypoint;
  stateRef.current.labelMode = labelMode;
  stateRef.current.colorMode = colorMode;

  const threeRef = useRef(null);

  // Initialize Three.js WebGL + CSS2D viewport once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.className = 'astrometrics-label-layer';
    container.appendChild(labelRenderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#040711');

    const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 1600);
    camera.position.set(0, 75, 115);

    const controls = new OrbitControls(camera, labelRenderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.minDistance = 0.8;
    controls.maxDistance = 650;

    // Groups
    const gridGroup = new THREE.Group();
    const starGroup = new THREE.Group();
    const velocityGroup = new THREE.Group();
    const routeGroup = new THREE.Group();
    const shipGroup = new THREE.Group();
    const lightConeGroup = new THREE.Group();
    const radioBubbleGroup = new THREE.Group();
    const labelGroup = new THREE.Group();

    scene.add(
      gridGroup,
      starGroup,
      velocityGroup,
      routeGroup,
      shipGroup,
      lightConeGroup,
      radioBubbleGroup,
      labelGroup
    );

    const selectRing = createScreenRing({ color: '#00f0ff', radiusPx: 13 });
    const hoverRing = createScreenRing({ color: '#ffffff', radiusPx: 10, dashed: true });
    scene.add(selectRing.object, hoverRing.object);

    let viewportHeight = 1;
    const resize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      viewportHeight = h;
      renderer.setSize(w, h);
      labelRenderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // Pointer picking (screen-space projection)
    const projected = new THREE.Vector3();
    const pickStar = (clientX, clientY, maxPx = 14) => {
      const rect = labelRenderer.domElement.getBoundingClientRect();
      const scenePos = stateRef.current.scenePos;
      let bestIdx = -1;
      let bestDistSq = maxPx * maxPx;
      for (let i = 0; i < scenePos.length; i++) {
        projected.copy(scenePos[i]).project(camera);
        if (projected.z > 1 || projected.z < -1) continue;
        const sx = ((projected.x + 1) / 2) * rect.width + rect.left;
        const sy = ((1 - projected.y) / 2) * rect.height + rect.top;
        const dSq = (sx - clientX) ** 2 + (sy - clientY) ** 2;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = i;
        }
      }
      return bestIdx;
    };

    let pointerDownPos = { x: 0, y: 0 };
    let hoveredIdx = -1;

    const onPointerDown = (e) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e) => {
      if (Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y) > 5) return;
      const idx = pickStar(e.clientX, e.clientY, 15);
      if (idx >= 0) {
        const sys = stateRef.current.systems[idx];
        if (e.shiftKey && stateRef.current.onAppendWaypoint) {
          stateRef.current.onAppendWaypoint(sys.id);
        } else if (stateRef.current.onSelectSystem) {
          stateRef.current.onSelectSystem(sys.id);
        }
      }
    };

    const onDblClick = (e) => {
      const idx = pickStar(e.clientX, e.clientY, 16);
      if (idx >= 0 && threeRef.current) {
        threeRef.current.focusAnim = {
          from: controls.target.clone(),
          to: stateRef.current.scenePos[idx].clone(),
          t: 0,
        };
      }
    };

    let hoverQueued = false;
    const onPointerMove = (e) => {
      if (hoverQueued || e.buttons) return;
      hoverQueued = true;
      requestAnimationFrame(() => {
        hoverQueued = false;
        const idx = pickStar(e.clientX, e.clientY, 12);
        if (idx !== hoveredIdx) {
          hoveredIdx = idx;
          labelRenderer.domElement.style.cursor = idx >= 0 ? 'pointer' : '';
          hoverRing.setPosition(idx >= 0 ? stateRef.current.scenePos[idx] : null);
          threeRef.current?.refreshLabels?.();
        }
      });
    };

    const domEl = labelRenderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    domEl.addEventListener('pointerup', onPointerUp);
    domEl.addEventListener('dblclick', onDblClick);
    domEl.addEventListener('pointermove', onPointerMove);

    let animId = 0;
    let lastTime = performance.now();
    const lastLabelTarget = new THREE.Vector3(Infinity, 0, 0);

    const animate = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.2);
      lastTime = now;

      if (threeRef.current?.focusAnim) {
        const fa = threeRef.current.focusAnim;
        fa.t = Math.min(1, fa.t + dt * 2.8);
        const k = 1 - (1 - fa.t) ** 3;
        const next = fa.from.clone().lerp(fa.to, k);
        camera.position.add(next.clone().sub(controls.target));
        controls.target.copy(next);
        if (fa.t >= 1) threeRef.current.focusAnim = null;
      }

      controls.update();

      // Refresh 'auto' proximity labels whenever the camera orbits/pans to a new neighborhood
      if (stateRef.current.labelMode === 'auto' && controls.target.distanceTo(lastLabelTarget) > 1.2) {
        lastLabelTarget.copy(controls.target);
        threeRef.current?.refreshLabels?.();
      }

      selectRing.update(camera, viewportHeight);
      hoverRing.update(camera, viewportHeight);

      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);

    threeRef.current = {
      scene,
      camera,
      controls,
      gridGroup,
      starGroup,
      velocityGroup,
      routeGroup,
      shipGroup,
      lightConeGroup,
      radioBubbleGroup,
      labelGroup,
      selectRing,
      hoverRing,
      focusAnim: null,
      labels: [],
      getHoveredIdx: () => hoveredIdx,
      refreshLabels: null,
    };

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      domEl.removeEventListener('pointerdown', onPointerDown);
      domEl.removeEventListener('pointerup', onPointerUp);
      domEl.removeEventListener('dblclick', onDblClick);
      domEl.removeEventListener('pointermove', onPointerMove);
      controls.dispose();
      renderer.dispose();
      container.innerHTML = '';
    };
  }, []);

  // Build / scale Galactic plane reference rings, radial spokes, and camera range dynamically to match catalogue radius
  useEffect(() => {
    const ctx = threeRef.current;
    if (!ctx) return;
    const { gridGroup, camera, controls } = ctx;

    while (gridGroup.children.length > 0) {
      const obj = gridGroup.children[0];
      obj.geometry?.dispose?.();
      obj.material?.dispose?.();
      obj.element?.remove?.();
      gridGroup.remove(obj);
    }

    const outerR = Math.max(120, Math.ceil((Number(maxRadiusLy) || 135) / 20) * 20);
    camera.far = Math.max(1600, outerR * 12);
    camera.updateProjectionMatrix();
    controls.maxDistance = Math.max(650, outerR * 4.5);

    const ringMat = new THREE.LineBasicMaterial({ color: '#162844', transparent: true, opacity: 0.75 });
    const ringMajorMat = new THREE.LineBasicMaterial({ color: '#1e426e', transparent: true, opacity: 0.9 });
    const spokeMat = new THREE.LineBasicMaterial({ color: '#13233b', transparent: true, opacity: 0.5 });

    // Adaptive ring spacing: 10 ly steps inside 120 ly, 20 ly up to 240 ly, 50 ly beyond
    const radii = [];
    for (let r = 10; r <= Math.min(outerR, 120); r += 10) radii.push(r);
    for (let r = 140; r <= Math.min(outerR, 240); r += 20) radii.push(r);
    for (let r = 250; r <= outerR; r += 50) radii.push(r);
    if (radii[radii.length - 1] < outerR) radii.push(outerR);

    for (const r of radii) {
      const pts = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
      const isMajor = r % 50 === 0 || r === outerR;
      gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), isMajor ? ringMajorMat : ringMat));

      const showLabel =
        r <= 50 ||
        (r <= 120 && r % 20 === 0) ||
        (r > 120 && r <= 240 && r % 40 === 0) ||
        (r > 240 && r % 50 === 0) ||
        r === outerR;
      if (showLabel) {
        const el = document.createElement('div');
        el.className = 'map3d-ring-label';
        el.textContent = `${r} ly`;
        const lbl = new CSS2DObject(el);
        lbl.center.set(0, 1);
        lbl.position.set(r, 0, 0);
        gridGroup.add(lbl);
      }
    }

    const spokePts = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      spokePts.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(a) * outerR, 0, Math.sin(a) * outerR));
    }
    gridGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(spokePts), spokeMat));

    const gcEl = document.createElement('div');
    gcEl.className = 'map3d-ring-label gc-dir';
    gcEl.textContent = galacticCenterText || '→ Galactic Center';
    const gcLabel = new CSS2DObject(gcEl);
    gcLabel.center.set(0, 0.5);
    gcLabel.position.set(outerR + 6, 0, 0);
    gridGroup.add(gcLabel);
  }, [maxRadiusLy, galacticCenterText]);

  // Camera focus requests (e.g. "Center Sol" or selecting from search)
  useEffect(() => {
    if (!focusRequest || !threeRef.current) return;
    const idx = systems.findIndex((s) => s.id === focusRequest.systemId);
    if (idx >= 0 && stateRef.current.scenePos[idx]) {
      threeRef.current.focusAnim = {
        from: threeRef.current.controls.target.clone(),
        to: stateRef.current.scenePos[idx].clone(),
        t: 0,
      };
    }
  }, [focusRequest, systems]);

  // Rebuild Star Points, Exoplanet / HZ Indicator Rings, Drop Lines & Labels when filtered systems or epoch change
  useEffect(() => {
    const ctx = threeRef.current;
    if (!ctx) return;

    const { starGroup, labelGroup, selectRing } = ctx;

    // Clear previous star meshes and CSS2D labels (including detaching DOM nodes from CSS2DRenderer)
    while (starGroup.children.length > 0) {
      const obj = starGroup.children[0];
      obj.geometry?.dispose?.();
      obj.material?.dispose?.();
      starGroup.remove(obj);
    }
    while (labelGroup.children.length > 0) {
      const lbl = labelGroup.children[0];
      lbl.element?.remove?.();
      labelGroup.remove(lbl);
    }

    const n = systems.length;
    const scenePos = systems.map((s) => toSceneVec(systemPosAtEpoch(s, epochOffsetYears)));
    stateRef.current.scenePos = scenePos;

    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const sizes = new Float32Array(n);
    const feetPositions = new Float32Array(n * 3);
    const feetColors = new Float32Array(n * 3);
    const aboveDrop = [];
    const belowDrop = [];

    const exoPositions = [];
    const exoColors = [];
    const exoSizes = [];

    const hzPositions = [];
    const hzColors = [];
    const hzSizes = [];

    const scifiPositions = [];
    const scifiColors = [];
    const scifiSizes = [];

    const tmpColor = new THREE.Color();
    const footColor = new THREE.Color('#2f4c73');

    systems.forEach((s, i) => {
      const p = scenePos[i];
      p.toArray(positions, i * 3);

      const primary = s.stars[0] || { cls: 'G', absmag: 5 };
      const bestAbsMag = Math.min(...s.stars.map((st) => st.absmag ?? 5));
      let baseSize = s.id === 'sol' ? 9.5 : magnitudeSize(bestAbsMag);
      const hasSciFi = Boolean(scifiBySystemId && scifiBySystemId[s.id]);

      if (colorMode === 'exoplanet') {
        if (s.id === 'sol') {
          tmpColor.set('#ffe97a');
        } else if (s.hasConservativeHZ) {
          tmpColor.set('#00ff88');
          baseSize = Math.max(baseSize, 7.2);
        } else if (s.hasOptimisticHZ) {
          tmpColor.set('#34d399');
          baseSize = Math.max(baseSize, 6.5);
        } else if (s.hasPlanets) {
          tmpColor.set('#00f0ff');
          baseSize = Math.max(baseSize, 5.5);
        } else {
          tmpColor.set('#3a4c66');
          baseSize *= 0.72;
        }
      } else {
        // Spectral class color
        if (s.id === 'sol') {
          tmpColor.set('#ffe97a');
        } else {
          tmpColor.set(SPECTRAL_COLORS[primary.cls] || SPECTRAL_COLORS['?']);
        }
      }

      tmpColor.toArray(colors, i * 3);
      sizes[i] = baseSize;

      // Drop lines to Galactic plane (only for Tier 1 / Exoplanet / Visible stars so plane isn't cluttered)
      feetPositions.set([p.x, 0, p.z], i * 3);
      footColor.toArray(feetColors, i * 3);
      if (s.tier === 1 || n <= 1400) {
        (p.y >= 0 ? aboveDrop : belowDrop).push(p.x, p.y, p.z, p.x, 0, p.z);
      }

      // Outer cyan ring for confirmed Exoplanet Hosts
      if (s.hasPlanets) {
        exoPositions.push(p.x, p.y, p.z);
        const c = s.hasOptimisticHZ ? new THREE.Color('#00ff88') : new THREE.Color('#00f0ff');
        exoColors.push(c.r, c.g, c.b);
        exoSizes.push(baseSize + 7.5);
      }

      // Outer emerald diamond reticle for Habitable Zone Hosts
      if (s.hasOptimisticHZ) {
        hzPositions.push(p.x, p.y, p.z);
        const c = s.hasConservativeHZ ? new THREE.Color('#00ff88') : new THREE.Color('#fde047');
        hzColors.push(c.r, c.g, c.b);
        hzSizes.push(baseSize + 13.5);
      }

      // Subtle violet-magenta ring for stars featured in Sci-Fi literature
      if (hasSciFi) {
        scifiPositions.push(p.x, p.y, p.z);
        const c = new THREE.Color('#c084fc');
        scifiColors.push(c.r, c.g, c.b);
        scifiSizes.push(baseSize + (s.hasOptimisticHZ ? 18.0 : s.hasPlanets ? 12.5 : 8.5));
      }
    });

    // 1. Star core discs
    const corePoints = createPointCloud({ positions, colors, sizes, opacity: 1.0, shape: 0 });
    corePoints.renderOrder = 3;
    starGroup.add(corePoints);

    // 2. Exoplanet host circular rings
    if (exoPositions.length > 0) {
      const exoPoints = createPointCloud({
        positions: new Float32Array(exoPositions),
        colors: new Float32Array(exoColors),
        sizes: new Float32Array(exoSizes),
        opacity: 0.9,
        shape: 1,
      });
      exoPoints.renderOrder = 2;
      starGroup.add(exoPoints);
    }

    // 3. Habitable Zone host diamond reticles
    if (hzPositions.length > 0) {
      const hzPoints = createPointCloud({
        positions: new Float32Array(hzPositions),
        colors: new Float32Array(hzColors),
        sizes: new Float32Array(hzSizes),
        opacity: 0.95,
        shape: 3,
      });
      hzPoints.renderOrder = 2;
      starGroup.add(hzPoints);
    }

    // 3b. Sci-Fi featured star halo rings
    if (scifiPositions.length > 0) {
      const scifiPoints = createPointCloud({
        positions: new Float32Array(scifiPositions),
        colors: new Float32Array(scifiColors),
        sizes: new Float32Array(scifiSizes),
        opacity: 0.72,
        shape: 1,
      });
      scifiPoints.renderOrder = 1;
      starGroup.add(scifiPoints);
    }

    // 4. Drop-lines & feet markers on Galactic Plane
    if (aboveDrop.length > 0) {
      const aboveLines = new THREE.LineSegments(
        new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(aboveDrop, 3)),
        new THREE.LineBasicMaterial({ color: '#2b4a70', transparent: true, opacity: 0.3 })
      );
      starGroup.add(aboveLines);
    }
    if (belowDrop.length > 0) {
      const belowLines = new THREE.LineSegments(
        new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(belowDrop, 3)),
        new THREE.LineDashedMaterial({ color: '#1f3654', transparent: true, opacity: 0.42, dashSize: 0.4, gapSize: 0.4 })
      );
      belowLines.computeLineDistances();
      starGroup.add(belowLines);
    }
    if (n > 0) {
      const feetPoints = createPointCloud({
        positions: feetPositions,
        colors: feetColors,
        sizes: new Float32Array(n).fill(2.4),
        opacity: 0.7,
        shape: 0,
      });
      feetPoints.renderOrder = 1;
      starGroup.add(feetPoints);
    }

    // 5. Lazy-mounted CSS2D Labels (creates DOM nodes only for visible labels so 10,000+ star spheres stay 60 FPS)
    const routeSet = new Set((activeVoyage?.stops || []).map((st) => st.systemId));
    const labels = new Array(systems.length).fill(null);
    const getOrCreateLabel = (s, i) => {
      if (labels[i]) return labels[i];
      const el = document.createElement('div');
      el.className = 'map3d-star-label';
      if (s.hasOptimisticHZ) el.classList.add('hz-host');
      else if (s.hasPlanets) el.classList.add('exo-host');
      if (s.id === 'sol') el.classList.add('sol-label');

      const badge = s.hasConservativeHZ ? ' ◈' : s.hasOptimisticHZ ? ' ◇' : s.hasPlanets ? ' ◎' : '';
      const scifiTag = scifiBySystemId && scifiBySystemId[s.id] ? ' ★' : '';
      el.textContent = `${s.name}${badge}${scifiTag}`;

      const obj = new CSS2DObject(el);
      obj.center.set(0, 1);
      obj.position.copy(scenePos[i]);
      labels[i] = obj;
      return obj;
    };
    ctx.labels = labels;

    const refreshLabels = () => {
      const mode = stateRef.current.labelMode;
      const selId = stateRef.current.selectedSystemId;
      const hovIdx = ctx.getHoveredIdx();
      const target = ctx.controls.target;

      // In 'auto' mode on large starfields (>45 stars), cap non-forced labels to the ~26
      // closest/most prominent systems around the camera target to keep the 3D map uncluttered.
      let autoAllowedSet = null;
      if (mode === 'auto' && systems.length > 45) {
        const candidates = [];
        for (let i = 0; i < systems.length; i++) {
          const s = systems[i];
          const distToTarget = scenePos[i].distanceTo(target);
          const priority =
            distToTarget -
            (s.hasConservativeHZ ? 9 : s.hasOptimisticHZ ? 5 : 0) -
            (s.isVisibleFromEarth && s.vmag <= 2.2 ? 7 : 0);
          if (distToTarget <= 26 || (s.isVisibleFromEarth && s.vmag <= 2.2)) {
            candidates.push({ i, priority });
          }
        }
        candidates.sort((a, b) => a.priority - b.priority);
        autoAllowedSet = new Set(candidates.slice(0, 26).map((c) => c.i));
      }

      systems.forEach((s, i) => {
        const isSel = s.id === selId;
        const isHov = i === hovIdx;
        const isRoute = routeSet.has(s.id);
        const isSol = s.id === 'sol';
        const forced = isSel || isHov || isRoute || isSol;

        let show = forced;
        if (!show) {
          if (mode === 'all') {
            show = s.tier === 1 || s.vmag <= 6.5;
          } else if (mode === 'hz') {
            show = s.hasOptimisticHZ;
          } else if (mode === 'auto') {
            show = autoAllowedSet ? autoAllowedSet.has(i) : true;
          }
        }

        if (show) {
          const lbl = getOrCreateLabel(s, i);
          if (lbl.parent !== labelGroup) labelGroup.add(lbl);
          lbl.visible = true;
          lbl.element.classList.toggle('selected', isSel || isRoute);
        } else if (labels[i]) {
          const lbl = labels[i];
          lbl.visible = false;
          if (lbl.parent === labelGroup) {
            lbl.element?.remove?.();
            labelGroup.remove(lbl);
          }
        }
      });
    };

    ctx.refreshLabels = refreshLabels;
    refreshLabels();

    // Update selection ring
    const selIdx = systems.findIndex((s) => s.id === selectedSystemId);
    selectRing.setPosition(selIdx >= 0 ? scenePos[selIdx] : null);
  }, [systems, epochOffsetYears, colorMode, labelMode, selectedSystemId, activeVoyage, scifiBySystemId]);

  // Render 3D Stellar Velocity Vectors (Exact physical displacement over +velocityHorizonKyr)
  // Full 3D space velocity (PM + RV) in cyan; tangential-only proper motion in amber;
  // selected star gets a bright future arrow + dashed past trajectory trail (-velocityHorizonKyr).
  useEffect(() => {
    const ctx = threeRef.current;
    if (!ctx) return;
    const { velocityGroup } = ctx;

    while (velocityGroup.children.length > 0) {
      const obj = velocityGroup.children[0];
      obj.geometry?.dispose?.();
      obj.material?.dispose?.();
      velocityGroup.remove(obj);
    }

    if (!velocityVectorMode || velocityVectorMode === 'off' || !systems?.length) return;

    const horizon = Math.max(1, Number(velocityHorizonKyr) || 20);
    const positions = [];
    const colors = [];

    const col3dTail = new THREE.Color('#0c4a6e');
    const col3dTip = new THREE.Color('#38bdf8');
    const colTanTail = new THREE.Color('#78350f');
    const colTanTip = new THREE.Color('#fbbf24');
    const colSelTail = new THREE.Color('#0ea5e9');
    const colSelTip = new THREE.Color('#ffffff');

    const p0 = new THREE.Vector3();
    const dv = new THREE.Vector3();
    const tip = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const refUp = new THREE.Vector3();
    const perp1 = new THREE.Vector3();
    const perp2 = new THREE.Vector3();
    const base = new THREE.Vector3();
    const barb = new THREE.Vector3();

    const pushSeg = (a, b, ca, cb) => {
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      colors.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b);
    };

    let selectedPastSeg = null;
    let selectedPastColor = '#38bdf8';

    for (const s of systems) {
      if (s.id === 'sol' || !s.vel) continue;
      if (velocityVectorMode === 'full3d' && !s.hasFull3dVelocity) continue;

      const vMag = Math.hypot(s.vel[0], s.vel[1], s.vel[2]);
      if (vMag < 1e-5) continue;

      const galPos = systemPosAtEpoch(s, epochOffsetYears);
      toSceneVec(galPos, p0);
      toSceneVec([s.vel[0] * horizon, s.vel[1] * horizon, s.vel[2] * horizon], dv);

      const len = dv.length();
      if (len < 0.02) continue;

      tip.copy(p0).add(dv);
      dir.copy(dv).divideScalar(len);

      // Build an orthonormal pair perpendicular to velocity vector for 3D arrowhead chevrons
      if (Math.abs(dir.y) > 0.9) refUp.set(1, 0, 0);
      else refUp.set(0, 1, 0);
      perp1.crossVectors(dir, refUp).normalize();
      perp2.crossVectors(dir, perp1).normalize();

      const isSel = s.id === selectedSystemId;
      const tailCol = isSel ? colSelTail : s.hasFull3dVelocity ? col3dTail : colTanTail;
      const tipCol = isSel ? colSelTip : s.hasFull3dVelocity ? col3dTip : colTanTip;

      // Shaft from current epoch position -> future position (+horizon kyr)
      pushSeg(p0, tip, tailCol, tipCol);

      // 4-barb 3D arrowhead so arrow direction is unambiguous from any orbit angle
      // Never exceed 45% of shaft length so slow-moving stars keep clean proportions
      const headLen = Math.min(0.75, Math.min(len * 0.45, Math.max(0.18, len * 0.22)));
      const headW = headLen * 0.42;
      base.copy(tip).addScaledVector(dir, -headLen);

      barb.copy(base).addScaledVector(perp1, headW);
      pushSeg(tip, barb, tipCol, tipCol);
      barb.copy(base).addScaledVector(perp1, -headW);
      pushSeg(tip, barb, tipCol, tipCol);
      barb.copy(base).addScaledVector(perp2, headW);
      pushSeg(tip, barb, tipCol, tipCol);
      barb.copy(base).addScaledVector(perp2, -headW);
      pushSeg(tip, barb, tipCol, tipCol);

      if (isSel) {
        selectedPastSeg = [p0.clone(), p0.clone().sub(dv)];
        selectedPastColor = s.hasFull3dVelocity ? '#38bdf8' : '#fbbf24';
      }
    }

    if (positions.length > 0) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
      });
      const lines = new THREE.LineSegments(geom, mat);
      lines.renderOrder = 2;
      velocityGroup.add(lines);
    }

    // Dashed past trajectory (-horizon kyr -> now) for the selected star
    if (selectedPastSeg) {
      const pastGeom = new THREE.BufferGeometry().setFromPoints(selectedPastSeg);
      const pastMat = new THREE.LineDashedMaterial({
        color: selectedPastColor,
        transparent: true,
        opacity: 0.65,
        dashSize: 0.45,
        gapSize: 0.35,
      });
      const pastLine = new THREE.Line(pastGeom, pastMat);
      pastLine.computeLineDistances();
      velocityGroup.add(pastLine);
    }
  }, [systems, epochOffsetYears, selectedSystemId, velocityVectorMode, velocityHorizonKyr]);

  // Render 3D Route Trajectory (color-coded by burn phase: Accel -> Coast -> Brake) + Animated Ship Markers & Light-Cones
  useEffect(() => {
    const ctx = threeRef.current;
    if (!ctx) return;

    const { routeGroup, shipGroup, lightConeGroup } = ctx;

    while (routeGroup.children.length > 0) {
      const o = routeGroup.children[0];
      o.geometry?.dispose?.();
      o.material?.dispose?.();
      routeGroup.remove(o);
    }
    while (shipGroup.children.length > 0) {
      const o = shipGroup.children[0];
      o.geometry?.dispose?.();
      o.material?.dispose?.();
      o.element?.remove?.();
      shipGroup.remove(o);
    }
    while (lightConeGroup.children.length > 0) {
      const o = lightConeGroup.children[0];
      o.geometry?.dispose?.();
      o.material?.dispose?.();
      lightConeGroup.remove(o);
    }

    // 1. Draw all ships' route lines & live positions at `masterClockYear`
    const shipsToDraw = allShipsWithVoyages && allShipsWithVoyages.length > 0
      ? allShipsWithVoyages
      : activeVoyage
        ? [{ id: 'active', name: 'Ship', color: '#00f0ff', voyage: activeVoyage, isActive: true }]
        : [];

    shipsToDraw.forEach((ship) => {
      const voyage = ship.voyage;
      if (!voyage || !voyage.legs || voyage.legs.length === 0) return;

      for (const leg of voyage.legs) {
        const pStart = toSceneVec(leg.fromPos);
        const pAccelEnd = toSceneVec(leg.accelEndPos);
        const pCoastEnd = toSceneVec(leg.coastEndPos);
        const pEnd = toSceneVec(leg.toPos);

        if (ship.isActive) {
          // Detailed 3-phase burn coloring for active route:
          // Phase 1: Acceleration burn (Electric Cyan #00f0ff)
          if (leg.profile.burnDistance > 0.001) {
            const accelGeom = new THREE.BufferGeometry().setFromPoints([pStart, pAccelEnd]);
            routeGroup.add(new THREE.Line(accelGeom, new THREE.LineBasicMaterial({ color: '#00f0ff' })));
          }

          // Phase 2: Relativistic Coast (Emerald/White Dashed)
          if (leg.profile.coastDistance > 0.01) {
            const coastGeom = new THREE.BufferGeometry().setFromPoints([pAccelEnd, pCoastEnd]);
            const coastLine = new THREE.Line(
              coastGeom,
              new THREE.LineDashedMaterial({ color: '#e2e8f0', dashSize: 0.45, gapSize: 0.25 })
            );
            coastLine.computeLineDistances();
            routeGroup.add(coastLine);
          }

          // Phase 3: Braking Deceleration burn (Tactical Amber/Orange #f59e0b)
          if (leg.profile.brake && leg.profile.burnDistance > 0.001) {
            const brakeGeom = new THREE.BufferGeometry().setFromPoints([pCoastEnd, pEnd]);
            routeGroup.add(new THREE.Line(brakeGeom, new THREE.LineBasicMaterial({ color: '#f59e0b' })));
          }

          // Turnover / Flip marker diamond (only when an acceleration burn actually occurs)
          if (leg.profile.burnDistance > 0.001 && leg.profile.brake) {
            const flipPos = new Float32Array([pAccelEnd.x, pAccelEnd.y, pAccelEnd.z]);
            const flipCol = new Float32Array([1.0, 0.82, 0.2]);
            const flipSize = new Float32Array([7.0]);
            routeGroup.add(createPointCloud({ positions: flipPos, colors: flipCol, sizes: flipSize, shape: 3 }));
          }
        } else {
          // Secondary ships in multi-ship timeline
          const lineGeom = new THREE.BufferGeometry().setFromPoints([pStart, pEnd]);
          const line = new THREE.Line(
            lineGeom,
            new THREE.LineDashedMaterial({ color: ship.color || '#a855f7', dashSize: 0.6, gapSize: 0.3, transparent: true, opacity: 0.7 })
          );
          line.computeLineDistances();
          routeGroup.add(line);
        }
      }

      // Evaluate ship's 3D position at `masterClockYear`
      if (Number.isFinite(masterClockYear)) {
        const st = evaluateVoyageAtCoordYear(voyage, masterClockYear);
        if (st && st.pos) {
          const sp = toSceneVec(st.pos);
          const posArr = new Float32Array([sp.x, sp.y, sp.z]);
          const c = new THREE.Color(ship.color || '#00ff88');
          const colArr = new Float32Array([c.r, c.g, c.b]);
          const sizeArr = new Float32Array([12.0]);
          const marker = createPointCloud({ positions: posArr, colors: colArr, sizes: sizeArr, shape: 2 });
          marker.renderOrder = 5;
          shipGroup.add(marker);

          const lblEl = document.createElement('div');
          lblEl.className = `map3d-ship-label${ship.isActive ? ' active-ship' : ''}`;
          lblEl.style.borderColor = ship.color || '#00ff88';
          const shortName = ship.name.includes(' · ') ? ship.name.split(' · ')[0] : ship.name;
          lblEl.textContent = ship.isActive
            ? `${shortName} (${(st.speedC * 100).toFixed(1)}%c · τ=${st.properTimeYears.toFixed(1)}y)`
            : `${shortName} (${(st.speedC * 100).toFixed(0)}%c)`;
          if (!ship.isActive) {
            lblEl.style.opacity = '0.84';
          }
          const lblObj = new CSS2DObject(lblEl);
          lblObj.center.set(0.5, 1.3);
          lblObj.position.copy(sp);
          shipGroup.add(lblObj);
        }
      }
    });

    // 2. Render 3D Expanding Light-Cone Sphere if enabled
    if (lightConeConfig && lightConeConfig.enabled && lightConeConfig.radiusLy > 0.05) {
      const centerScene = toSceneVec(lightConeConfig.originPos);
      const r = lightConeConfig.radiusLy;
      const sphereGeom = new THREE.SphereGeometry(r, 40, 24);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: lightConeConfig.color || '#00f0ff',
        transparent: true,
        opacity: 0.07,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(sphereGeom, sphereMat);
      mesh.position.copy(centerScene);
      lightConeGroup.add(mesh);

      // Equatorial wireframe ring on the light sphere
      const ringPts = [];
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        ringPts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
      const eqRing = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(ringPts),
        new THREE.LineBasicMaterial({ color: lightConeConfig.color || '#00f0ff', transparent: true, opacity: 0.55 })
      );
      eqRing.position.copy(centerScene);
      lightConeGroup.add(eqRing);

      // Optional Inter-Ship Signal Interception Beam (originPos -> targetPos)
      if (lightConeConfig.targetPos) {
        const targetScene = toSceneVec(lightConeConfig.targetPos);
        const beamGeom = new THREE.BufferGeometry().setFromPoints([centerScene, targetScene]);
        const beamLine = new THREE.Line(
          beamGeom,
          new THREE.LineBasicMaterial({
            color: lightConeConfig.beamColor || '#facc15',
            transparent: true,
            opacity: 0.92,
          })
        );
        lightConeGroup.add(beamLine);

        const hitPt = createPointCloud({
          positions: new Float32Array([targetScene.x, targetScene.y, targetScene.z]),
          colors: new Float32Array([0.98, 0.8, 0.08]),
          sizes: new Float32Array([11.0]),
          shape: 3,
        });
        lightConeGroup.add(hitPt);
      }
    }
  }, [activeVoyage, allShipsWithVoyages, masterClockYear, lightConeConfig]);

  // Render Earth's Expanding Radio & TV Broadcast Shells + Directed METI Beams
  useEffect(() => {
    const ctx = threeRef.current;
    if (!ctx) return;
    const { radioBubbleGroup } = ctx;

    while (radioBubbleGroup.children.length > 0) {
      const o = radioBubbleGroup.children[0];
      o.geometry?.dispose?.();
      o.material?.dispose?.();
      o.element?.remove?.();
      radioBubbleGroup.remove(o);
    }

    if (!radioBubbleConfig || !radioBubbleConfig.enabled) return;

    const selectedId = radioBubbleConfig.selectedLayerId || 'layer-100';

    // 1. Concentric Spherical Radio Broadcast Horizons centered on Sol [0, 0, 0]
    RADIO_SHELL_LAYERS.forEach((layer) => {
      const r = layer.radiusLy;
      const isSelected = layer.id === selectedId;
      const isTwoWay = layer.isTwoWayHorizon;
      const color = new THREE.Color(layer.color);

      // Translucent sphere surface for the selected layer (plus subtle outer 100 ly & 50 ly reference spheres)
      if (isSelected || layer.radiusLy === 100 || isTwoWay) {
        const sphGeom = new THREE.SphereGeometry(r, 40, 24);
        const sphMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: isSelected ? 0.095 : isTwoWay ? 0.038 : 0.025,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        radioBubbleGroup.add(new THREE.Mesh(sphGeom, sphMat));
      }

      // Equatorial ring in Galactic Plane (XZ in Three.js)
      const eqPts = [];
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        eqPts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
      const eqMat = isTwoWay
        ? new THREE.LineDashedMaterial({
            color,
            dashSize: 2.2,
            gapSize: 1.2,
            transparent: true,
            opacity: isSelected ? 0.95 : 0.72,
          })
        : new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: isSelected ? 0.92 : 0.28,
          });
      const eqLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(eqPts), eqMat);
      if (isTwoWay) eqLine.computeLineDistances();
      radioBubbleGroup.add(eqLine);

      // Vertical meridian rings on the selected layer & 2-way reply horizon to emphasize 3D sphere volume
      if (isSelected || isTwoWay) {
        const merPts1 = [];
        const merPts2 = [];
        for (let i = 0; i <= 72; i++) {
          const a = (i / 72) * Math.PI * 2;
          merPts1.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
          merPts2.push(new THREE.Vector3(0, Math.sin(a) * r, Math.cos(a) * r));
        }
        const mMat = new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: isSelected ? 0.42 : 0.16,
        });
        radioBubbleGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(merPts1), mMat));
        radioBubbleGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(merPts2), mMat.clone()));
      }

      // Floating CSS2D badge on the active shell (and 50 ly 2-way horizon)
      if (isSelected || isTwoWay) {
        const el = document.createElement('div');
        el.className = `map3d-radio-label${isSelected ? ' active' : ''}`;
        el.style.borderColor = layer.color;
        el.style.color = layer.color;
        el.textContent = `📡 ${layer.badge?.[lang] || layer.badge?.en}`;
        const lbl = new CSS2DObject(el);
        const angle = isTwoWay && !isSelected ? Math.PI * 0.72 : Math.PI * 0.22;
        lbl.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
        radioBubbleGroup.add(lbl);
      }
    });

    // 2. Real Directed Interstellar METI Beams (Sónar Calling GJ 273b, AMFE GJ 581, Cosmic Call 1 & 2)
    if (radioBubbleConfig.showMetiBeams && systemsById) {
      const origin = new THREE.Vector3(0, 0, 0);
      METI_BEAMS.forEach((beam) => {
        const targetSys = systemsById.get(beam.targetSystemId);
        if (!targetSys) return;
        const targetVec = toSceneVec(systemPosAtEpoch(targetSys, epochOffsetYears));
        const distLy = targetVec.length();
        if (distLy < 0.1) return;

        const elapsedLy = Math.max(0.5, Math.min(distLy, RADIO_REFERENCE_YEAR - beam.transmitYear));
        const frac = elapsedLy / distLy;
        const waveVec = targetVec.clone().multiplyScalar(frac);
        const beamCol = new THREE.Color(beam.color);

        // Bright solid active beam from Sol -> current 2026 wavefront
        const activeGeom = new THREE.BufferGeometry().setFromPoints([origin, waveVec]);
        const activeLine = new THREE.Line(
          activeGeom,
          new THREE.LineBasicMaterial({ color: beamCol, transparent: true, opacity: 0.95 })
        );
        radioBubbleGroup.add(activeLine);

        // Faint dashed remaining flight line from wavefront -> target star
        if (frac < 0.995) {
          const remGeom = new THREE.BufferGeometry().setFromPoints([waveVec, targetVec]);
          const remLine = new THREE.Line(
            remGeom,
            new THREE.LineDashedMaterial({
              color: beamCol,
              dashSize: 0.9,
              gapSize: 0.65,
              transparent: true,
              opacity: 0.45,
            })
          );
          remLine.computeLineDistances();
          radioBubbleGroup.add(remLine);
        }

        // Glowing diamond marker right at the 2026 photon wavefront!
        const pulse = createPointCloud({
          positions: new Float32Array([waveVec.x, waveVec.y, waveVec.z]),
          colors: new Float32Array([beamCol.r, beamCol.g, beamCol.b]),
          sizes: new Float32Array([10.5]),
          shape: 2,
        });
        radioBubbleGroup.add(pulse);

        // Concise wavefront CSS2D label
        const lblEl = document.createElement('div');
        lblEl.className = 'map3d-meti-label';
        lblEl.style.borderColor = beam.color;
        const arriveYr = Math.round(beam.transmitYear + distLy);
        lblEl.textContent = `⚡ ${targetSys.name} (${elapsedLy.toFixed(1)}/${distLy.toFixed(1)} ly · ${arriveYr})`;
        const lblObj = new CSS2DObject(lblEl);
        lblObj.position.copy(waveVec);
        lblObj.center.set(0.5, 1.35);
        radioBubbleGroup.add(lblObj);
      });
    }
  }, [radioBubbleConfig, systemsById, epochOffsetYears, lang]);

  return <div ref={containerRef} className="astrometrics-map3d-viewport" />;
}

