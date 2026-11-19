/**
 * Light-Cone Communication & Relativistic Signal Interception Solver
 *
 * Calculates:
 *  1. Static star-to-star light delay (1-way and round-trip ping).
 *  2. Ship-to-Star signal arrival times & exact 3D Special-Relativistic Doppler shift
 *     (including longitudinal + transverse time-dilation redshift):
 *       f_obs / f_emit = 1 / [gamma * (1 - beta_vec . n_hat_ship_to_star)]
 *  3. Star-to-Ship signal interception solver: given a signal transmitted from any star
 *     system at coordinate year `tEmit`, finds the exact coordinate year `tHit`, crew
 *     proper time `tauHit`, and exact 3D reception Doppler shift:
 *       f_ship / f_star = gamma * (1 - beta_vec . n_hat_star_to_ship)
 *     where the expanding 3D light sphere intersects the ship's worldline:
 *       |r_ship(t) - r_emitter| = c * (t - tEmit).
 */

import { evaluateVoyageAtCoordYear } from './voyagePlanner.js';
import { distance3D } from './stellarMotion.js';

/**
 * Static communication delay between two 3D positions (in years, since c = 1 ly/yr).
 */
export function staticCommDelay(posA, posB) {
  const distLy = distance3D(posA, posB);
  return {
    distanceLy: distLy,
    oneWayYears: distLy,
    roundTripYears: 2 * distLy,
  };
}

/**
 * Classify observed frequency ratio f_obs / f_emit into blueshift / redshift / none.
 */
function classifyShift(dopplerFactor) {
  if (Math.abs(dopplerFactor - 1) < 1e-4) return 'none';
  return dopplerFactor > 1 ? 'blueshift' : 'redshift';
}

/**
 * Given a signal emitted by a ship on `voyage` at coordinate year `tSend`,
 * calculate when it reaches the Origin system, the Current Leg Destination, and any custom target systems,
 * along with the exact 3D relativistic Doppler factor (including transverse time dilation).
 */
export function computeShipTransmission(voyage, tSend, targetSystems = []) {
  const shipState = evaluateVoyageAtCoordYear(voyage, tSend);
  if (!shipState) return null;

  const leg = voyage.legs[shipState.legIndex] || voyage.legs[0];
  const v = shipState.speedC;
  const gamma = shipState.gamma || 1;
  const shipVelVec = shipState.velVec || (leg ? [leg.dir[0] * v, leg.dir[1] * v, leg.dir[2] * v] : [0, 0, 0]);

  const evaluateReceiver = (label, systemId, pos) => {
    const dx = pos[0] - shipState.pos[0];
    const dy = pos[1] - shipState.pos[1];
    const dz = pos[2] - shipState.pos[2];
    const distLy = Math.hypot(dx, dy, dz);
    const arriveCoordYear = tSend + distLy;

    // Unit vector from moving ship toward stationary receiver: n_hat = (r_rx - r_ship) / d
    // Line-of-sight velocity projection toward receiver: beta_los = beta_vec . n_hat
    let betaLos = 0;
    if (distLy > 1e-9 && v > 0) {
      betaLos = (shipVelVec[0] * dx + shipVelVec[1] * dy + shipVelVec[2] * dz) / distLy;
    }
    const clampedBetaLos = Math.max(-v, Math.min(v, betaLos));

    // Exact 3D special-relativistic Doppler formula (moving emitter -> stationary receiver):
    //   f_obs / f_emit = 1 / (gamma * (1 - beta_los))
    // Special cases:
    //   - Head-on toward receiver (beta_los = +v):  1 / (gamma*(1-v)) = gamma*(1+v) = sqrt((1+v)/(1-v))
    //   - Receding directly away  (beta_los = -v):  1 / (gamma*(1+v)) = sqrt((1-v)/(1+v))
    //   - Strictly transverse     (beta_los =  0):  1 / gamma < 1 (transverse time-dilation redshift!)
    let dopplerFactor;
    if (v === 0) {
      dopplerFactor = 1.0;
    } else if (Math.abs(clampedBetaLos - v) < 1e-12) {
      // Cancellation-free head-on limit
      dopplerFactor = gamma * (1 + v);
    } else if (Math.abs(clampedBetaLos + v) < 1e-12) {
      // Cancellation-free tail-on limit
      dopplerFactor = 1 / (gamma * (1 + v));
    } else {
      dopplerFactor = 1 / (gamma * Math.max(1e-15, 1 - clampedBetaLos));
    }

    return {
      label,
      systemId,
      distanceAtSendLy: distLy,
      lightTravelYears: distLy,
      arriveCoordYear,
      betaLineOfSight: clampedBetaLos,
      transverseFactor: 1 / gamma,
      dopplerFactor,
      shiftType: classifyShift(dopplerFactor),
    };
  };

  const results = [];
  if (leg) {
    results.push(evaluateReceiver(leg.fromSystemName, leg.fromSystemId, leg.fromPos));
    results.push(evaluateReceiver(leg.toSystemName, leg.toSystemId, leg.toPos));
  }
  for (const sys of targetSystems) {
    if (!results.some((r) => r.systemId === sys.id)) {
      results.push(evaluateReceiver(sys.name, sys.id, sys.pos));
    }
  }

  return {
    tSendCoordYear: tSend,
    tauSendProperYears: shipState.properTimeYears,
    crewAgeAtSend: shipState.crewAge,
    shipPos: shipState.pos,
    shipSpeedC: v,
    shipGamma: gamma,
    receivers: results,
  };
}

/**
 * Solve when a light sphere expanding from `emitterPos` at coordinate year `tEmit`
 * intercepts a moving ship on `voyage`:
 *   f(t) = c * (t - tEmit) - |r_ship(t) - emitterPos| = 0   for t >= tEmit.
 *
 * Since |v_ship(t)| < c everywhere (including post-arrival flyby coasting), f(t) is strictly
 * monotonically increasing (df/dt >= 1 - v_max > 0), guaranteeing a unique exact root!
 */
export function solveSignalToShip(voyage, emitterPos, emitterName, tEmit) {
  if (!voyage || !voyage.legs || voyage.legs.length === 0) return null;

  const f = (t) => {
    const state = evaluateVoyageAtCoordYear(voyage, t);
    const d = distance3D(state.pos, emitterPos);
    return (t - tEmit) - d;
  };

  const computeReceptionDoppler = (state) => {
    const v = state.speedC;
    const gamma = state.gamma || 1;
    if (v === 0) return { dopplerFactorAtHit: 1.0, shiftTypeAtHit: 'none' };

    // Unit vector along photon propagation: from stationary emitter -> moving ship
    const dx = state.pos[0] - emitterPos[0];
    const dy = state.pos[1] - emitterPos[1];
    const dz = state.pos[2] - emitterPos[2];
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 1e-9) return { dopplerFactorAtHit: gamma, shiftTypeAtHit: classifyShift(gamma) };

    const velVec = state.velVec || [0, 0, 0];
    // beta_away = beta_vec . n_hat_emitter_to_ship (>0 means receding from emitter)
    const betaAway = Math.max(-v, Math.min(v, (velVec[0] * dx + velVec[1] * dy + velVec[2] * dz) / dist));

    // Exact 3D reception Doppler (stationary emitter -> moving receiver):
    //   f_ship / f_star = gamma * (1 - beta_away)
    // Special cases:
    //   - Moving directly away  (beta_away = +v): gamma*(1-v) = 1 / (gamma*(1+v)) = sqrt((1-v)/(1+v))
    //   - Moving directly toward(beta_away = -v): gamma*(1+v) = sqrt((1+v)/(1-v))
    //   - Moving transversely   (beta_away =  0): gamma > 1 (transverse blueshift in ship clock!)
    let dopplerFactorAtHit;
    if (Math.abs(betaAway - v) < 1e-12) {
      dopplerFactorAtHit = 1 / (gamma * (1 + v));
    } else if (Math.abs(betaAway + v) < 1e-12) {
      dopplerFactorAtHit = gamma * (1 + v);
    } else {
      dopplerFactorAtHit = gamma * Math.max(1e-15, 1 - betaAway);
    }
    return {
      dopplerFactorAtHit,
      shiftTypeAtHit: classifyShift(dopplerFactorAtHit),
    };
  };

  // At t = tEmit, f(tEmit) = -distance <= 0.
  const fStart = f(tEmit);
  if (Math.abs(fStart) < 1e-9) {
    const st = evaluateVoyageAtCoordYear(voyage, tEmit);
    const rxD = computeReceptionDoppler(st);
    return {
      emitterName,
      tEmitCoordYear: tEmit,
      tHitCoordYear: tEmit,
      lightTravelYears: 0,
      tauHitProperYears: st.properTimeYears,
      crewAgeAtHit: st.crewAge,
      shipStatusAtHit: st.status,
      shipPhaseAtHit: st.phase,
      shipSpeedAtHitC: st.speedC,
      ...rxD,
      hitPos: st.pos,
    };
  }

  // Find upper bracket tHigh where f(tHigh) >= 0 (works for both braked and post-flyby coasting ships!)
  const lastLeg = voyage.legs[voyage.legs.length - 1];
  const lastStop = voyage.stops[voyage.stops.length - 1];
  const distToFinal = distance3D(lastStop.pos, emitterPos);
  const vFinalCoast = lastLeg && !lastLeg.profile.brake ? lastLeg.profile.arrivalSpeed : 0;
  const chaseFactor = 1 / Math.max(1e-5, 1 - vFinalCoast);

  let tLow = tEmit;
  let tHigh = Math.max(voyage.arrivalYear, tEmit) + (distToFinal + 10) * Math.min(1000, chaseFactor) + 50;

  // Exponentially expand upper bracket if needed (handles extreme flyby speeds v -> c)
  let guard = 0;
  while (f(tHigh) < 0 && guard < 40) {
    tHigh = tEmit + (tHigh - tEmit) * 2 + 100;
    guard++;
  }

  // 70 iterations of bisection gives full IEEE-754 double precision (~1e-15 yr)
  for (let iter = 0; iter < 70; iter++) {
    const tMid = 0.5 * (tLow + tHigh);
    if (f(tMid) >= 0) {
      tHigh = tMid;
    } else {
      tLow = tMid;
    }
  }

  const tHit = 0.5 * (tLow + tHigh);
  const hitState = evaluateVoyageAtCoordYear(voyage, tHit);
  const rxD = computeReceptionDoppler(hitState);

  return {
    emitterName,
    tEmitCoordYear: tEmit,
    tHitCoordYear: tHit,
    lightTravelYears: tHit - tEmit,
    tauHitProperYears: hitState.properTimeYears,
    crewAgeAtHit: hitState.crewAge,
    shipStatusAtHit: hitState.status,
    shipPhaseAtHit: hitState.phase,
    shipSpeedAtHitC: hitState.speedC,
    ...rxD,
    hitPos: hitState.pos,
  };
}
