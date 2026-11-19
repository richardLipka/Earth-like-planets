/**
 * Special-Relativistic Cockpit Optics Engine
 *
 * Transforms real catalogued 3D star coordinates, effective temperatures, and
 * magnitudes into a moving starship's forward/aft bridge frame using exact
 * Special Relativity:
 *
 *  1. Relativistic Aberration (Einstein 1905):
 *       cos(theta') = (cos(theta) + beta) / (1 + beta * cos(theta))
 *     Stars crowd dramatically toward the forward velocity vector (the
 *     relativistic headlight / searchlight effect) as beta -> 1.
 *
 *  2. Exact 3D Relativistic Doppler Shift:
 *       D(theta) = gamma * (1 + beta * cos(theta))
 *                = 1 / (gamma * (1 - beta * cos(theta')))
 *     In the cancellation-free form at theta = pi (dead astern):
 *       D(pi) = 1 / (gamma * (1 + beta))
 *
 *  3. Blackbody Temperature & Visual Beaming:
 *       T'_eff = D(theta) * T_eff
 *       Bolometric flux boost I'/I = D(theta)^4 (visual mag delta ~ -2.5 * log10(D^3.5))
 *
 *  4. Forward Cosmic Microwave Background (CMB) Blueshift:
 *       T'_CMB(bow) = 2.7255 K * gamma * (1 + beta)
 */

import { lorentzGamma } from './relativity.js';

const CMB_T0_K = 2.7255;

/**
 * Exact relativistic aberration of starlight angle from rest frame to ship frame.
 * theta = 0 is dead ahead (along ship velocity vector), theta = pi is dead astern.
 */
export function aberrateCosTheta(cosThetaRest, beta) {
  const b = Math.max(0, Math.min(1 - 1e-15, Math.abs(beta || 0)));
  const c = Math.max(-1, Math.min(1, cosThetaRest));
  if (b < 1e-12) {
    return { cosThetaApparent: c, thetaApparentRad: Math.acos(c) };
  }
  const denom = Math.max(1e-15, 1 + b * c);
  const cosPrime = Math.max(-1, Math.min(1, (c + b) / denom));
  return {
    cosThetaApparent: cosPrime,
    thetaApparentRad: Math.acos(cosPrime),
  };
}

/**
 * Exact cancellation-free Doppler factor D = f_ship / f_rest for a star at rest-frame
 * angle theta from the ship's velocity vector (cosThetaRest = +1 ahead, -1 astern).
 */
export function starDopplerFactor(cosThetaRest, beta, exactGamma = null) {
  const b = Math.max(0, Math.min(1 - 1e-15, Math.abs(beta || 0)));
  const c = Math.max(-1, Math.min(1, cosThetaRest));
  const gamma =
    exactGamma !== null && Number.isFinite(exactGamma) && exactGamma >= 1
      ? exactGamma
      : lorentzGamma(b);
  if (b < 1e-12) return 1.0;
  // Exact cancellation-free handling near dead-astern (cosTheta -> -1)
  if (c <= -1 + 1e-12) {
    return 1 / (gamma * (1 + b));
  }
  return gamma * (1 + b * c);
}

/**
 * Physically grounded Planckian blackbody color approximation for sRGB display,
 * extended smoothly into Deep Infrared (<1800 K) and Extreme UV / X-Ray (>25000 K).
 */
export function blackbodyTempToRgb(tempK) {
  const T = Math.max(200, tempK || 5778);

  let band = 'visible';
  if (T < 1800) band = 'ir';
  else if (T > 60000) band = 'xray';
  else if (T > 20000) band = 'uv';

  // Clamp effective color lookup temperature to Tanner Helland / Planckian range [1000 K, 40000 K]
  const tClamped = Math.max(1000, Math.min(40000, T)) / 100;
  let r, g, b;

  if (tClamped <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(tClamped) - 161.1195681661;
    b = tClamped <= 19 ? 0 : 138.5177312231 * Math.log(tClamped - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(tClamped - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(tClamped - 60, -0.0755148492);
    b = 255;
  }

  r = Math.max(0, Math.min(255, Math.round(r)));
  g = Math.max(0, Math.min(255, Math.round(g)));
  b = Math.max(0, Math.min(255, Math.round(b)));

  // Subtle spectral-regime tinting so UV/X-ray and deep-IR shifted stars read clearly on the bridge HUD
  let visFactor = 1.0;
  if (band === 'ir') {
    // Deep crimson fade as blackbody peak drops below human red vision
    const ratio = Math.max(0.22, Math.min(1, (T - 300) / 1500));
    r = Math.round(180 + 75 * ratio);
    g = Math.round(40 * ratio);
    b = Math.round(18 * ratio);
    visFactor = Math.max(0.32, ratio);
  } else if (band === 'uv') {
    // Electric blue-violet shift
    r = Math.round(r * 0.72 + 40);
    g = Math.round(g * 0.85 + 25);
    b = 255;
    visFactor = 0.95;
  } else if (band === 'xray') {
    // Intense cyan-violet high-energy marker glow
    r = 165;
    g = 125;
    b = 255;
    visFactor = 0.85;
  }

  return {
    r,
    g,
    b,
    css: `rgb(${r}, ${g}, ${b})`,
    band,
    visFactor,
  };
}

/**
 * Build an orthonormal camera basis { forward, right, up } from a ship's 3D heading vector.
 */
export function buildBridgeBasis(forwardDir) {
  const len = Math.hypot(forwardDir[0], forwardDir[1], forwardDir[2]);
  const f = len > 1e-9 ? [forwardDir[0] / len, forwardDir[1] / len, forwardDir[2] / len] : [1, 0, 0];

  // Choose Galactic North [0, 0, 1] as reference up unless nearly collinear
  const refUp = Math.abs(f[2]) < 0.96 ? [0, 0, 1] : [0, 1, 0];
  // right = normalize(f x refUp)
  const rx = f[1] * refUp[2] - f[2] * refUp[1];
  const ry = f[2] * refUp[0] - f[0] * refUp[2];
  const rz = f[0] * refUp[1] - f[1] * refUp[0];
  const rLen = Math.hypot(rx, ry, rz) || 1;
  const right = [rx / rLen, ry / rLen, rz / rLen];

  // up = right x f
  const up = [
    right[1] * f[2] - right[2] * f[1],
    right[2] * f[0] - right[0] * f[2],
    right[0] * f[1] - right[1] * f[0],
  ];

  return { forward: f, right, up };
}

/**
 * Project a catalogued star into the moving ship's relativistic bridge frame.
 */
export function projectStarToBridge({
  starPos,
  shipPos,
  basis,
  beta,
  exactGamma,
  starTeff = 5778,
  starAbsMag = 5.0,
}) {
  const dx = starPos[0] - shipPos[0];
  const dy = starPos[1] - shipPos[1];
  const dz = starPos[2] - shipPos[2];
  const distLy = Math.hypot(dx, dy, dz);
  if (distLy < 1e-5) return null;

  const invD = 1 / distLy;
  const ux = dx * invD;
  const uy = dy * invD;
  const uz = dz * invD;

  const { forward, right, up } = basis;
  const cosThetaRest = Math.max(-1, Math.min(1, ux * forward[0] + uy * forward[1] + uz * forward[2]));
  const projRight = ux * right[0] + uy * right[1] + uz * right[2];
  const projUp = ux * up[0] + uy * up[1] + uz * up[2];
  const azimuthRad = Math.atan2(projUp, projRight);

  const { cosThetaApparent, thetaApparentRad } = aberrateCosTheta(cosThetaRest, beta);
  const doppler = starDopplerFactor(cosThetaRest, beta, exactGamma);
  const shiftedTeffK = starTeff * doppler;
  const color = blackbodyTempToRgb(shiftedTeffK);

  // Rest-frame apparent magnitude from ship's current 3D position:
  // m = M + 5 * log10(d_pc / 10)
  const distPc = Math.max(0.01, distLy / 3.261563777);
  const restAppMag = starAbsMag + 5 * Math.log10(distPc / 10);
  // Relativistic beaming intensity boost (~ D^3.5 visual proxy, clamped so display stays legible)
  const magShift = -2.5 * 3.5 * Math.log10(Math.max(1e-4, doppler));
  const apparentMag = restAppMag + magShift;

  return {
    distLy,
    cosThetaRest,
    cosThetaApparent,
    thetaApparentRad,
    azimuthRad,
    doppler,
    shiftedTeffK,
    restAppMag,
    apparentMag,
    color,
    isForwardHemisphere: thetaApparentRad <= Math.PI * 0.5,
  };
}

/**
 * Compute forward Cosmic Microwave Background (CMB) blueshift temperature and bow glow.
 */
export function computeCmbForwardGlow(beta, exactGamma = null) {
  const b = Math.max(0, Math.min(1 - 1e-15, Math.abs(beta || 0)));
  const gamma =
    exactGamma !== null && Number.isFinite(exactGamma) && exactGamma >= 1
      ? exactGamma
      : lorentzGamma(b);
  const dBow = b < 1e-12 ? 1.0 : gamma * (1 + b);
  const bowTempK = CMB_T0_K * dBow;
  const peakWavelengthUm = 2897.77 / bowTempK;

  // Noticeable warm infrared/red bow glow begins when bowTempK > 300 K (gamma > ~55)
  // and turns visibly luminous red-orange-white above ~800 K (gamma > ~150).
  let glowAlpha = 0;
  let glowColor = 'rgba(239, 68, 68, 0)';
  if (bowTempK > 40) {
    // Soft diagnostic microwave-to-IR bow tint starting at moderate gamma, bright glow at extreme gamma
    const logIntensity = Math.min(1, Math.max(0, (Math.log10(bowTempK) - 1.5) / 2.2));
    glowAlpha = 0.08 + 0.52 * logIntensity;
    if (bowTempK < 900) {
      glowColor = `rgba(185, 28, 28, ${glowAlpha.toFixed(3)})`;
    } else {
      const rgb = blackbodyTempToRgb(bowTempK);
      glowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${glowAlpha.toFixed(3)})`;
    }
  }

  return {
    bowTempK,
    peakWavelengthUm,
    dBow,
    glowAlpha,
    glowColor,
    isVisiblyGlowing: bowTempK >= 800,
  };
}
