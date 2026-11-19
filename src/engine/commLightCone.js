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

/**
 * Compute exact combined 3D Special-Relativistic Doppler factor between a moving
 * emitter ship (A) and a moving receiver ship (B) along photon direction unit vector n_hat:
 *
 *   f_B / f_A = [gamma_B * (1 - v_B . n_hat)] / [gamma_A * (1 - v_A . n_hat)]
 *
 * Reduces exactly to:
 *  - Stationary A -> Moving B:  gamma_B * (1 - v_B . n_hat)
 *  - Moving A -> Stationary B:  1 / [gamma_A * (1 - v_A . n_hat)]
 *  - Co-moving A & B (v_A = v_B): 1.000000 exactly.
 */
function computeShipToShipDoppler(senderState, receiverState) {
  const vA = senderState.speedC || 0;
  const gA = senderState.gamma || 1;
  const vB = receiverState.speedC || 0;
  const gB = receiverState.gamma || 1;

  if (vA === 0 && vB === 0) {
    return { dopplerFactor: 1.0, shiftType: 'none' };
  }

  const dx = receiverState.pos[0] - senderState.pos[0];
  const dy = receiverState.pos[1] - senderState.pos[1];
  const dz = receiverState.pos[2] - senderState.pos[2];
  const dist = Math.hypot(dx, dy, dz);
  if (dist < 1e-9) {
    const ratio = gB / gA;
    return { dopplerFactor: ratio, shiftType: classifyShift(ratio) };
  }

  const velA = senderState.velVec || [0, 0, 0];
  const velB = receiverState.velVec || [0, 0, 0];
  // Photon propagation unit vector n_hat = (r_B - r_A) / dist
  const betaALos = Math.max(-vA, Math.min(vA, (velA[0] * dx + velA[1] * dy + velA[2] * dz) / dist));
  const betaBLos = Math.max(-vB, Math.min(vB, (velB[0] * dx + velB[1] * dy + velB[2] * dz) / dist));

  // Cancellation-free evaluation of 1 / [gamma_A * (1 - betaA_los)] and gamma_B * (1 - betaB_los)
  const emitToGal =
    vA === 0
      ? 1.0
      : Math.abs(betaALos - vA) < 1e-12
        ? gA * (1 + vA)
        : Math.abs(betaALos + vA) < 1e-12
          ? 1 / (gA * (1 + vA))
          : 1 / (gA * Math.max(1e-15, 1 - betaALos));

  const galToRx =
    vB === 0
      ? 1.0
      : Math.abs(betaBLos - vB) < 1e-12
        ? 1 / (gB * (1 + vB))
        : Math.abs(betaBLos + vB) < 1e-12
          ? gB * (1 + vB)
          : gB * Math.max(1e-15, 1 - betaBLos);

  const dopplerFactor = emitToGal * galToRx;
  return {
    dopplerFactor,
    shiftType: classifyShift(dopplerFactor),
  };
}

/**
 * Inter-Ship Light-Cone Messaging Solver (Moving Ship A -> Moving Ship B + 2-Way Reply):
 *
 * Given Sender Ship A transmitting at coordinate year `tEmit`, finds:
 *  - Exact coordinate year `tHit` when the light sphere intercepts Receiver Ship B
 *  - Receiver B's proper time, biological age, 3D position, and flight status at reception
 *  - Exact combined 3D relativistic Doppler factor f_B / f_A
 *  - Immediate 2-way reply reception back at Ship A (`tReplyCoordYear`, `roundTripCoordYears`,
 *    `senderProperWaitYears`, `senderAgeAtReply`)
 */
export function solveShipToShipSignal(
  senderVoyage,
  receiverVoyage,
  tEmit,
  senderName = 'Ship A',
  receiverName = 'Ship B',
  includeReply = true
) {
  if (
    !senderVoyage ||
    !senderVoyage.legs ||
    senderVoyage.legs.length === 0 ||
    !receiverVoyage ||
    !receiverVoyage.legs ||
    receiverVoyage.legs.length === 0
  ) {
    return null;
  }

  const senderState = evaluateVoyageAtCoordYear(senderVoyage, tEmit);
  if (!senderState) return null;

  const hit = solveSignalToShip(receiverVoyage, senderState.pos, senderName, tEmit);
  if (!hit) return null;

  const receiverStateAtHit = evaluateVoyageAtCoordYear(receiverVoyage, hit.tHitCoordYear);
  const { dopplerFactor, shiftType } = computeShipToShipDoppler(senderState, receiverStateAtHit);

  let reply = null;
  if (includeReply) {
    const backHit = solveSignalToShip(senderVoyage, receiverStateAtHit.pos, receiverName, hit.tHitCoordYear);
    if (backHit) {
      const senderStateAtReply = evaluateVoyageAtCoordYear(senderVoyage, backHit.tHitCoordYear);
      const backDoppler = computeShipToShipDoppler(receiverStateAtHit, senderStateAtReply);
      reply = {
        tReplyCoordYear: backHit.tHitCoordYear,
        returnLightTravelYears: backHit.lightTravelYears,
        roundTripCoordYears: backHit.tHitCoordYear - tEmit,
        senderProperWaitYears: senderStateAtReply.properTimeYears - senderState.properTimeYears,
        senderAgeAtReply: senderStateAtReply.crewAge,
        replyPos: backHit.hitPos,
        dopplerFactor: backDoppler.dopplerFactor,
        shiftType: backDoppler.shiftType,
      };
    }
  }

  return {
    senderName,
    receiverName,
    tEmitCoordYear: tEmit,
    senderPos: senderState.pos,
    senderProperTimeYears: senderState.properTimeYears,
    senderCrewAge: senderState.crewAge,
    senderStatus: senderState.status,
    senderSpeedC: senderState.speedC,
    tHitCoordYear: hit.tHitCoordYear,
    lightTravelYears: hit.lightTravelYears,
    hitPos: hit.hitPos,
    receiverProperTimeYears: receiverStateAtHit.properTimeYears,
    receiverCrewAgeAtHit: receiverStateAtHit.crewAge,
    receiverStatusAtHit: receiverStateAtHit.status,
    receiverPhaseAtHit: receiverStateAtHit.phase,
    receiverSpeedAtHitC: receiverStateAtHit.speedC,
    dopplerFactor,
    shiftType,
    reply,
  };
}

/**
 * Closest Approach / Rendezvous Solver between two moving starships (Ship A & Ship B)
 * across their combined mission timeline using dense sampling + golden-section refinement.
 */
export function computeShipRendezvous(voyageA, voyageB) {
  if (
    !voyageA ||
    !voyageA.legs ||
    voyageA.legs.length === 0 ||
    !voyageB ||
    !voyageB.legs ||
    voyageB.legs.length === 0
  ) {
    return null;
  }

  const tMin = Math.min(voyageA.departureYear, voyageB.departureYear);
  const tMax = Math.max(voyageA.arrivalYear, voyageB.arrivalYear);
  const span = Math.max(0.5, tMax - tMin);

  const distAt = (t) => {
    const a = evaluateVoyageAtCoordYear(voyageA, t);
    const b = evaluateVoyageAtCoordYear(voyageB, t);
    return distance3D(a.pos, b.pos);
  };

  const N = 240;
  let bestT = tMin;
  let bestD = Infinity;
  let bestIdx = 0;
  const dt = span / N;

  for (let i = 0; i <= N; i++) {
    const t = tMin + i * dt;
    const d = distAt(t);
    if (d < bestD) {
      bestD = d;
      bestT = t;
      bestIdx = i;
    }
  }

  // Golden-section search in [tLeft, tRight] around best sample
  let lo = tMin + Math.max(0, bestIdx - 1) * dt;
  let hi = tMin + Math.min(N, bestIdx + 1) * dt;
  const phi = (Math.sqrt(5) - 1) / 2;
  let c = hi - phi * (hi - lo);
  let d = lo + phi * (hi - lo);
  let fc = distAt(c);
  let fd = distAt(d);

  for (let iter = 0; iter < 36; iter++) {
    if (fc < fd) {
      hi = d;
      d = c;
      fd = fc;
      c = hi - phi * (hi - lo);
      fc = distAt(c);
    } else {
      lo = c;
      c = d;
      fc = fd;
      d = lo + phi * (hi - lo);
      fd = distAt(d);
    }
  }

  const tClosest = 0.5 * (lo + hi);
  const stA = evaluateVoyageAtCoordYear(voyageA, tClosest);
  const stB = evaluateVoyageAtCoordYear(voyageB, tClosest);
  const minDistLy = distance3D(stA.pos, stB.pos);

  // Relative 3D closing/passing speed (in coordinate rest frame)
  const vA = stA.velVec || [0, 0, 0];
  const vB = stB.velVec || [0, 0, 0];
  const relCoordSpeedC = Math.hypot(vA[0] - vB[0], vA[1] - vB[1], vA[2] - vB[2]);

  return {
    tClosestCoordYear: tClosest,
    minDistLy,
    posA: stA.pos,
    posB: stB.pos,
    statusA: stA.status,
    statusB: stB.status,
    tauA: stA.properTimeYears,
    tauB: stB.properTimeYears,
    relCoordSpeedC,
  };
}
