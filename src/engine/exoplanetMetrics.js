/**
 * Pure Astrophysical Exoplanet Habitability & Dynamical Metrics
 *
 * 1. Earth Similarity Index (ESI) — Schulze-Makuch et al. (2011), Astrobiology 11(10), 1041–1052.
 *    Four-parameter geometric mean across radius (w=0.57), bulk density (w=1.07),
 *    escape velocity (w=0.70), and surface temperature (w=5.58).
 *    When a planet lacks either mass or radius in the NASA archive, the missing quantity
 *    is estimated using the Chen & Kipping (2017) empirical mass-radius relation.
 *
 * 2. Tidal-Locking Synchronization Timescale — Peale (1977) / Gladman et al. (1996) / Barnes (2017).
 *    t_lock = (4 / 9) * (alpha * omega_0 * (Q / k2) * M_p * a^6) / (G * M_star^2 * R_p^3)
 *    Classifies worlds into:
 *      - 'locked'   : t_lock < 1.0 Gyr  (almost certainly tidally synchronized / spin-orbit resonant)
 *      - 'possible' : 1.0 <= t_lock <= 10.0 Gyr (synchronization depends on system age & tidal Q)
 *      - 'free'     : t_lock > 10.0 Gyr (retains primordial rotation over main-sequence lifetime)
 */

const G_SI = 6.6743e-11; // m^3 kg^-1 s^-2
const M_SUN_KG = 1.98847e30; // kg
const M_EARTH_KG = 5.9722e24; // kg
const R_EARTH_M = 6.371e6; // m
const AU_M = 1.495978707e11; // m
const SEC_PER_GYR = 3.15576e16; // s (10^9 Julian years)

/**
 * Empirical mass-radius fallback (Chen & Kipping 2017, ApJ 834, 17).
 * Used ONLY when one of radiusEarth or massEarth is absent in the NASA archive.
 */
export function estimateMassAndRadius(radiusEarth, massEarth) {
  let r = Number.isFinite(radiusEarth) && radiusEarth > 0 ? radiusEarth : null;
  let m = Number.isFinite(massEarth) && massEarth > 0 ? massEarth : null;

  if (r !== null && m === null) {
    if (r < 1.23) {
      // Terran regime: M ~ R^(1/0.279) = R^3.584
      m = r ** 3.584;
    } else if (r < 11.1) {
      // Neptunian / sub-Neptune regime: R ~ 0.808 * M^0.589 -> M ~ (R / 0.808)^1.698
      m = (r / 0.808) ** 1.698;
    } else {
      // Jovian regime (~Jupiter mass baseline)
      m = 318 * (r / 11.2) ** 0.5;
    }
  } else if (m !== null && r === null) {
    if (m < 2.04) {
      // Terran regime: R ~ M^0.279
      r = m ** 0.279;
    } else if (m < 131.6) {
      // Neptunian regime: R ~ 0.808 * M^0.589
      r = 0.808 * m ** 0.589;
    } else {
      // Jovian regime: nearly constant radius ~11–13 R_earth
      r = Math.min(16, 11.2 * (m / 318) ** -0.04);
    }
  }

  return { r, m };
}

/**
 * Computes the Schulze-Makuch et al. (2011) Earth Similarity Index in [0.00, 1.00].
 *
 * @param {object} params
 * @param {number|null} params.radiusEarth      Planet radius in Earth radii
 * @param {number|null} params.massEarth        Planet mass in Earth masses
 * @param {number|null} params.eqTempK          Equilibrium temperature in K (from NASA pl_eqt)
 * @param {number|null} [params.surfaceTempK]   Direct surface temperature in K (overrides eqTempK + 33 K)
 * @param {number|null} [params.insolationEarth] Stellar flux in Earth units (S_earth = 1.0)
 * @returns {number|null} ESI rounded to 2 decimals, or null if insufficient data
 */
export function computeESI({
  radiusEarth = null,
  massEarth = null,
  eqTempK = null,
  surfaceTempK = null,
  insolationEarth = null,
} = {}) {
  const { r, m } = estimateMassAndRadius(radiusEarth, massEarth);

  // Surface temperature: use explicit surfaceTempK (e.g. Solar System planets) if provided;
  // otherwise apply standard PHL Earth-greenhouse offset (+33 K) to equilibrium temperature
  // (or derive T_eq = 255 * S^0.25 assuming Earth Bond albedo A_B = 0.30).
  let tSurf = null;
  if (Number.isFinite(surfaceTempK) && surfaceTempK > 0) {
    tSurf = surfaceTempK;
  } else if (Number.isFinite(eqTempK) && eqTempK > 0) {
    tSurf = eqTempK + 33;
  } else if (Number.isFinite(insolationEarth) && insolationEarth > 0) {
    tSurf = 255 * insolationEarth ** 0.25 + 33;
  }

  if (r === null || m === null || tSurf === null) return null;

  // Bulk density & escape velocity relative to Earth (= 1.0)
  const rhoRel = Math.max(1e-4, m / r ** 3);
  const vEscRel = Math.max(1e-4, Math.sqrt(m / r));

  const term = (x, x0, w) => {
    const frac = Math.abs(x - x0) / (x + x0);
    return Math.max(0, 1 - frac) ** (w / 4);
  };

  const esi =
    term(r, 1.0, 0.57) *
    term(rhoRel, 1.0, 1.07) *
    term(vEscRel, 1.0, 0.70) *
    term(tSurf, 288.0, 5.58);

  if (!Number.isFinite(esi)) return null;
  return Math.round(Math.max(0, Math.min(1, esi)) * 100) / 100;
}

/**
 * Computes the tidal-locking spin synchronization timescale in Gyr.
 *
 * Uses Peale (1977) / Gladman et al. (1996) / Barnes (2017) with initial spin period
 * P_0 = 13.5 h (Earth primordial rotation), terrestrial Q/k2 = 300 (alpha = 0.33),
 * and gas/ice giant Q/k2 = 1e5 (alpha = 0.25).
 *
 * @param {object} params
 * @param {number|null} params.semiMajorAxisAU  Orbital semi-major axis in AU
 * @param {number|null} params.starMassSolar    Host star mass in solar masses
 * @param {number|null} params.radiusEarth      Planet radius in Earth radii
 * @param {number|null} params.massEarth        Planet mass in Earth masses
 * @param {boolean}     [params.isTerrestrial]  Whether planet is rocky/terrestrial
 * @returns {{ tidalLockGyr: number|null, tidalLockStatus: 'locked'|'possible'|'free'|null }}
 */
export function computeTidalLocking({
  semiMajorAxisAU = null,
  starMassSolar = null,
  radiusEarth = null,
  massEarth = null,
  isTerrestrial = true,
} = {}) {
  if (!Number.isFinite(semiMajorAxisAU) || semiMajorAxisAU <= 0) {
    return { tidalLockGyr: null, tidalLockStatus: null };
  }
  const mStarSol = Number.isFinite(starMassSolar) && starMassSolar > 0 ? starMassSolar : 1.0;
  const { r, m } = estimateMassAndRadius(radiusEarth, massEarth);
  const rEarths = r ?? 1.0;
  const mEarths = m ?? 1.0;

  const rocky = isTerrestrial || (rEarths <= 1.75 && mEarths <= 8.0);
  const alpha = rocky ? 0.33 : 0.25;
  const qOverK2 = rocky ? 300 : 1e5;
  const omega0 = (2 * Math.PI) / (13.5 * 3600); // rad/s (13.5 h primordial period)

  const aM = semiMajorAxisAU * AU_M;
  const mStarKg = mStarSol * M_SUN_KG;
  const mPKg = mEarths * M_EARTH_KG;
  const rPM = rEarths * R_EARTH_M;

  const tSec =
    (4 / 9) *
    ((alpha * omega0 * qOverK2 * mPKg * aM ** 6) / (G_SI * mStarKg ** 2 * rPM ** 3));

  if (!Number.isFinite(tSec) || tSec < 0) {
    return { tidalLockGyr: null, tidalLockStatus: null };
  }

  const tGyr = tSec / SEC_PER_GYR;
  const roundedGyr =
    tGyr >= 1000
      ? Math.round(tGyr)
      : tGyr >= 10
        ? Number(tGyr.toPrecision(3))
        : tGyr >= 0.001
          ? Number(tGyr.toPrecision(3))
          : Number(tGyr.toExponential(2));

  const tidalLockStatus = tGyr < 1.0 ? 'locked' : tGyr <= 10.0 ? 'possible' : 'free';
  return { tidalLockGyr: roundedGyr, tidalLockStatus };
}
