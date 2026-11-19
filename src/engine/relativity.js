/**
 * Special-Relativistic Interstellar Kinematics, Propulsion & Doppler Engine
 *
 * Units:
 *   - Distance: light-years (ly)
 *   - Coordinate Time (Earth / Rest Frame): Julian years (yr = 365.25 * 86400 s)
 *   - Proper Time (Ship Crew Frame): Julian years (yr)
 *   - Speed of light: c = 1 ly / yr
 *   - Standard gravity: g0 = 9.80665 m/s² ≈ 1.032275536 ly / yr²
 *
 * All hyperbolic motion and Doppler formulas are written in cancellation-free
 * analytical form so machine precision is preserved from non-relativistic speeds
 * (β ~ 1e-6) to ultra-relativistic regimes (γ > 1e6).
 */

export const C = 1.0;
export const DAYS_PER_YEAR = 365.25;
export const LY_PER_PARSEC = 3.2615637771674333;
export const METERS_PER_LY = 9.4607304725808e15;
export const SECONDS_PER_YEAR = 365.25 * 86400;
export const G0_M_S2 = 9.80665;
export const G_LY_PER_YR2 = (G0_M_S2 * SECONDS_PER_YEAR ** 2) / METERS_PER_LY; // ~1.032275536

const C2_TJ_PER_KG = 89875.51787368176; // c^2 in TJ/kg (exact SI: 299792458^2 / 1e12)
const PROTON_REST_MEV = 938.27208816;   // CODATA proton rest mass energy
const CMB_T0_K = 2.7255;                // Fixsen (2009) CMB monopole temperature

/** Convert proper acceleration in Earth g's to ly/yr². */
export function gToLyYr2(accelG) {
  return accelG * G_LY_PER_YR2;
}

/**
 * Lorentz factor gamma = 1 / sqrt((1 - beta)(1 + beta)).
 * Uses factored difference of squares to avoid precision loss as beta -> 1.
 */
export function lorentzGamma(beta) {
  const b = Math.min(1 - 1e-15, Math.max(0, Math.abs(beta)));
  return 1 / Math.sqrt((1 - b) * (1 + b));
}

/**
 * Relativistic Doppler shift for head-on (approaching, blueshift) and rear (receding, redshift),
 * plus CMB temperature ahead, ISM proton impact energy, and relativistic kinetic energy per kg.
 *
 * Passing `exactGamma` (e.g. from exact hyperbolic motion gamma = 1 + a*x) eliminates all
 * floating-point cancellation as beta -> 1 via:
 *   D_fwd = gamma * (1 + beta) = exp(eta)
 *   D_rear = 1 / (gamma * (1 + beta)) = exp(-eta)
 */
export function dopplerShift(beta, exactGamma = null) {
  const b = Math.min(1 - 1e-15, Math.max(0, Math.abs(beta)));
  const gamma = exactGamma !== null && Number.isFinite(exactGamma) && exactGamma >= 1
    ? exactGamma
    : lorentzGamma(b);

  // Exact cancellation-free identities:
  // sqrt((1+b)/(1-b)) = gamma*(1+b), and sqrt((1-b)/(1+b)) = 1 / (gamma*(1+b))
  const forwardFactor = gamma * (1 + b);
  const rearFactor = 1 / forwardFactor;

  // Reference 550 nm green starlight: lambda_obs = lambda_emit / D
  const forwardGreenNm = 550 / forwardFactor;
  const rearGreenNm = 550 / rearFactor;
  // Planck blackbody temperature ahead of ship transforms linearly with D (Peebles & Wilkinson 1968)
  const forwardCmbTempK = CMB_T0_K * forwardFactor;
  // Relativistic kinetic energy per kg: (gamma - 1) c^2
  const kineticEnergyTjPerKg = (gamma - 1) * C2_TJ_PER_KG;
  // Interstellar medium proton impact kinetic energy in ship rest frame: (gamma - 1) m_p c^2
  const ismProtonMeV = (gamma - 1) * PROTON_REST_MEV;

  return {
    beta: b,
    gamma,
    forwardFactor,
    rearFactor,
    zForward: rearFactor - 1,      // = 1 / D_fwd - 1 (negative = blueshift)
    zRear: forwardFactor - 1,      // = 1 / D_rear - 1 (positive = redshift)
    forwardGreenNm,
    rearGreenNm,
    forwardCmbTempK,
    kineticEnergyTjPerKg,
    ismProtonMeV,
  };
}

/**
 * Optional Relativistic Tsiolkovsky Rocket Equation (Ackeret 1946):
 *   M0 / Mf = exp(deltaRapidity / (ve / c))
 * for reaction drives (ve measured in ship's instantaneous rest frame, 0 < ve <= c),
 * or 1.0 for non-reactive / field-coupled sci-fi drives.
 *
 * @param {{ totalRapidity: number, driveType?: 'non-reactive' | 'reaction', exhaustVelC?: number }} opts
 */
export function calculateMassRatio({ totalRapidity, driveType = 'non-reactive', exhaustVelC = 0.33 }) {
  if (driveType === 'non-reactive') {
    return {
      isReactive: false,
      massRatio: 1.0,
      log10MassRatio: 0.0,
      propellantFraction: 0.0,
      exhaustVelC: null,
      feasible: true,
    };
  }
  const ve = Math.max(0.001, Math.min(1.0, exhaustVelC));
  const exponent = totalRapidity / ve;
  const massRatio = exponent > 700 ? Infinity : Math.exp(exponent);
  const propellantFraction = Number.isFinite(massRatio) && massRatio > 0 ? 1 - 1 / massRatio : 1;
  return {
    isReactive: true,
    massRatio,
    log10MassRatio: exponent / Math.LN10,
    propellantFraction,
    exhaustVelC: ve,
    feasible: massRatio < 1000,
  };
}

/**
 * Compute full relativistic flight profile for a single leg of length `distance` (ly).
 *
 * Supported profile modes (`mode`):
 *  - `'constant'`: Constant cruise speed `cruiseC` (0 < cruiseC < 1), instantaneous start/stop approximation.
 *  - `'flip'`: Continuous proper acceleration `accelG` to midpoint (d/2), flip and decelerate at `accelG` to rest.
 *  - `'accel-cruise'`: Accelerate at `accelG` up to `cruiseC`, coast at `cruiseC`, then brake at `accelG` (falls back to `'flip'` if d < 2*d_burn).
 *  - `'flyby'`: Accelerate at `accelG` up to `cruiseC` (or continuously if d < d_burn) and pass target without braking.
 */
export function computeFlightProfile({
  distance,
  mode = 'flip',
  accelG = 1.0,
  cruiseC = 0.5,
  driveType = 'non-reactive',
  exhaustVelC = 0.33,
}) {
  const d = Math.max(0, Number(distance) || 0);
  if (d === 0) {
    return {
      distance: 0,
      mode,
      accelG,
      accel: gToLyYr2(accelG),
      cruiseC,
      peakSpeed: 0,
      peakGamma: 1,
      burnTime: 0,
      burnProperTime: 0,
      burnDistance: 0,
      coastTime: 0,
      coastProperTime: 0,
      coastDistance: 0,
      totalTime: 0,
      properTime: 0,
      dilationFactor: 1,
      timeSavedYears: 0,
      brakeStart: 0,
      warningLeadYears: 0,
      brake: mode !== 'flyby',
      arrivalSpeed: 0,
      totalRapidity: 0,
      doppler: dopplerShift(0, 1),
      propulsion: calculateMassRatio({ totalRapidity: 0, driveType, exhaustVelC }),
    };
  }

  // 1. Constant-speed profile
  if (mode === 'constant') {
    const v = Math.min(0.999999, Math.max(0.0001, Number(cruiseC) || 0.5));
    const gamma = lorentzGamma(v);
    const totalTime = d / v;
    const properTime = totalTime / gamma;
    const totalRapidity = 2 * Math.atanh(v);
    return {
      distance: d,
      mode: 'constant',
      accelG: 0,
      accel: 0,
      cruiseC: v,
      peakSpeed: v,
      peakGamma: gamma,
      burnTime: 0,
      burnProperTime: 0,
      burnDistance: 0,
      coastTime: totalTime,
      coastProperTime: properTime,
      coastDistance: d,
      totalTime,
      properTime,
      dilationFactor: gamma,
      timeSavedYears: totalTime - properTime,
      brakeStart: totalTime,
      warningLeadYears: Math.max(0, totalTime - d),
      brake: true,
      arrivalSpeed: 0,
      totalRapidity,
      doppler: dopplerShift(v, gamma),
      propulsion: calculateMassRatio({ totalRapidity, driveType, exhaustVelC }),
    };
  }

  const g = Math.max(0.001, Number(accelG) || 1.0);
  const a = gToLyYr2(g);
  const vCap = mode === 'flip' ? 1.0 : Math.min(0.999999, Math.max(0.0001, Number(cruiseC) || 0.5));
  const gammaCap = mode === 'flip' ? Infinity : lorentzGamma(vCap);
  const fullBurnTime = mode === 'flip' ? Infinity : (gammaCap * vCap) / a;
  const fullBurnDist = mode === 'flip' ? Infinity : (gammaCap - 1) / a;

  // 2. Flyby profile (no braking burn)
  if (mode === 'flyby') {
    let burnTime, burnDistance, peakSpeed, peakGamma, coastTime, coastDistance;
    if (fullBurnDist <= d) {
      burnTime = fullBurnTime;
      burnDistance = fullBurnDist;
      peakSpeed = vCap;
      peakGamma = gammaCap;
      coastDistance = d - fullBurnDist;
      coastTime = coastDistance / vCap;
    } else {
      burnDistance = d;
      // Exact cancellation-free: t = sqrt(x^2 + 2x/a), gamma = 1 + a*x, beta = (a*t)/gamma
      burnTime = Math.sqrt(burnDistance * burnDistance + (2 * burnDistance) / a);
      peakGamma = 1 + a * burnDistance;
      peakSpeed = (a * burnTime) / peakGamma;
      coastDistance = 0;
      coastTime = 0;
    }
    const burnProperTime = Math.asinh(a * burnTime) / a;
    const coastProperTime = coastTime / peakGamma;
    const totalTime = burnTime + coastTime;
    const properTime = burnProperTime + coastProperTime;
    const totalRapidity = a * burnProperTime;

    return {
      distance: d,
      mode: 'flyby',
      accelG: g,
      accel: a,
      cruiseC: vCap,
      peakSpeed,
      peakGamma,
      burnTime,
      burnProperTime,
      burnDistance,
      coastTime,
      coastProperTime,
      coastDistance,
      totalTime,
      properTime,
      dilationFactor: properTime > 0 ? totalTime / properTime : 1,
      timeSavedYears: totalTime - properTime,
      brakeStart: totalTime,
      warningLeadYears: Math.max(0, totalTime - d),
      brake: false,
      arrivalSpeed: peakSpeed,
      totalRapidity,
      doppler: dopplerShift(peakSpeed, peakGamma),
      propulsion: calculateMassRatio({ totalRapidity, driveType, exhaustVelC }),
    };
  }

  // 3. Symmetric Braking Profiles ('flip' or 'accel-cruise')
  let burnTime, burnDistance, peakSpeed, peakGamma, coastTime, coastDistance;
  if (mode === 'accel-cruise' && 2 * fullBurnDist <= d) {
    burnTime = fullBurnTime;
    burnDistance = fullBurnDist;
    peakSpeed = vCap;
    peakGamma = gammaCap;
    coastDistance = d - 2 * fullBurnDist;
    coastTime = coastDistance / vCap;
  } else {
    burnDistance = d / 2;
    // Exact cancellation-free hyperbolic kinematics:
    //   t_burn = sqrt(x^2 + 2x/a)
    //   gamma_peak = 1 + a*x
    //   beta_peak = (a * t_burn) / gamma_peak
    burnTime = Math.sqrt(burnDistance * burnDistance + (2 * burnDistance) / a);
    peakGamma = 1 + a * burnDistance;
    peakSpeed = (a * burnTime) / peakGamma;
    coastDistance = 0;
    coastTime = 0;
  }

  const burnProperTime = Math.asinh(a * burnTime) / a;
  const coastProperTime = coastTime / peakGamma;
  const totalTime = 2 * burnTime + coastTime;
  const properTime = 2 * burnProperTime + coastProperTime;
  const totalRapidity = 2 * a * burnProperTime;

  // Time between first braking-plume photon arriving at destination and ship arrival:
  //   t_arrive - (t_brake + x_burn/c) = t_burn - x_burn = (2*x_burn / a) / (t_burn + x_burn)
  // Rationalized form avoids catastrophic cancellation at ultra-relativistic speeds (asymptotes to c/a).
  const warningLeadYears =
    burnTime + burnDistance > 0 ? (2 * burnDistance) / (a * (burnTime + burnDistance)) : 0;

  return {
    distance: d,
    mode,
    accelG: g,
    accel: a,
    cruiseC: mode === 'flip' ? peakSpeed : vCap,
    peakSpeed,
    peakGamma,
    burnTime,
    burnProperTime,
    burnDistance,
    coastTime,
    coastProperTime,
    coastDistance,
    totalTime,
    properTime,
    dilationFactor: properTime > 0 ? totalTime / properTime : 1,
    timeSavedYears: totalTime - properTime,
    brakeStart: burnTime + coastTime,
    warningLeadYears,
    brake: true,
    arrivalSpeed: 0,
    totalRapidity,
    doppler: dopplerShift(peakSpeed, peakGamma),
    propulsion: calculateMassRatio({ totalRapidity, driveType, exhaustVelC }),
  };
}

/**
 * Coordinate distance covered (ly) at coordinate time `t` (yr) after departure.
 * Uses rationalized hyperbolic identity (a*s^2)/(sqrt(1+(a*s)^2)+1) for full precision at tiny s.
 */
export function distanceAtTime(profile, t) {
  const { mode, accel: a, burnTime, burnDistance, coastTime, peakSpeed, totalTime, distance } = profile;
  if (t <= 0 || distance <= 0) return 0;
  if (t >= totalTime) return distance;
  if (mode === 'constant') return t * peakSpeed;

  const hyper = (s) => {
    const u = a * s;
    return (a * s * s) / (Math.sqrt(1 + u * u) + 1);
  };
  if (t <= burnTime) return hyper(t);
  if (!profile.brake) return burnDistance + (t - burnTime) * peakSpeed;
  if (t <= burnTime + coastTime) return burnDistance + (t - burnTime) * peakSpeed;
  return distance - hyper(totalTime - t);
}

/**
 * Instantaneous speed (beta = v/c) at coordinate time `t` (yr) after departure.
 */
export function speedAtTime(profile, t) {
  const { mode, accel: a, burnTime, coastTime, peakSpeed, totalTime } = profile;
  if (t <= 0) return 0;
  if (t >= totalTime) return profile.brake ? 0 : peakSpeed;
  if (mode === 'constant') return peakSpeed;

  const v = (s) => {
    const u = a * s;
    return u / Math.sqrt(1 + u * u);
  };
  if (t <= burnTime) return v(t);
  if (!profile.brake) return peakSpeed;
  if (t <= burnTime + coastTime) return peakSpeed;
  return v(totalTime - t);
}

/**
 * Exact instantaneous Lorentz factor gamma(t) at coordinate time `t` (yr) after departure.
 * Uses gamma = sqrt(1 + (a*s)^2) directly during burns so there is zero cancellation as beta -> 1.
 */
export function gammaAtTime(profile, t) {
  const { mode, accel: a, burnTime, coastTime, peakGamma, totalTime } = profile;
  if (t <= 0) return 1;
  if (t >= totalTime) return profile.brake ? 1 : peakGamma;
  if (mode === 'constant') return peakGamma;

  const gHyp = (s) => {
    const u = a * s;
    return Math.sqrt(1 + u * u);
  };
  if (t <= burnTime) return gHyp(t);
  if (!profile.brake) return peakGamma;
  if (t <= burnTime + coastTime) return peakGamma;
  return gHyp(totalTime - t);
}

/**
 * Instantaneous proper time `tau` (yr) experienced by the crew at coordinate time `t` (yr) after departure.
 */
export function properTimeAtTime(profile, t) {
  const { mode, accel: a, burnTime, burnProperTime, coastTime, peakGamma, totalTime, properTime } = profile;
  if (t <= 0) return 0;
  if (t >= totalTime) return properTime;
  if (mode === 'constant') return t / peakGamma;

  const tauHyper = (s) => Math.asinh(a * s) / a;
  if (t <= burnTime) return tauHyper(t);
  if (!profile.brake) return burnProperTime + (t - burnTime) / peakGamma;
  if (t <= burnTime + coastTime) return burnProperTime + (t - burnTime) / peakGamma;
  const rem = totalTime - t;
  return properTime - tauHyper(rem);
}

/**
 * Flight phase at coordinate time `t` (yr) after departure:
 * `'idle' | 'accelerating' | 'coasting' | 'braking' | 'arrived'`
 */
export function phaseAtTime(profile, t) {
  if (t <= 0) return 'idle';
  if (t >= profile.totalTime) return profile.brake ? 'arrived' : 'coasting';
  if (profile.mode === 'constant') return 'coasting';
  if (t < profile.burnTime) return 'accelerating';
  if (!profile.brake || t < profile.burnTime + profile.coastTime) return 'coasting';
  return 'braking';
}
