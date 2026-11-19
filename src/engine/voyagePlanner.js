/**
 * Multi-Stop Interstellar Voyage & Synchronized Timeline Planner
 *
 * Computes full multi-leg itineraries (S0 -> S1 -> S2 -> ...) with stopover/turnaround
 * durations at intermediate waypoints, tracking both Universal/Earth Coordinate Time (t)
 * and Ship Crew Proper Time (tau).
 */

import {
  computeFlightProfile,
  distanceAtTime,
  speedAtTime,
  gammaAtTime,
  properTimeAtTime,
  phaseAtTime,
  dopplerShift,
  calculateMassRatio,
} from './relativity.js';
import { systemPosAtEpoch, distance3D } from './stellarMotion.js';

/**
 * Build a complete multi-stop voyage plan.
 *
 * Note on `'flyby'` mode with multiple waypoints:
 * Physically, stopping at an intermediate waypoint requires decelerating to rest
 * before changing heading or waiting in stopover; therefore intermediate legs use
 * `'accel-cruise'` (falling back to `'flip'` below 2*d_burn) and the final leg
 * executes the no-braking relativistic flyby.
 */
export function planMultiStopVoyage({
  waypoints,
  systemsById,
  departureYear = 2150.0,
  epochOffsetYears = 0,
  crewStartAge = 30.0,
  driveConfig,
}) {
  if (!waypoints || waypoints.length < 2) {
    return {
      legs: [],
      stops: [],
      totalDistanceLy: 0,
      totalCoordTimeYears: 0,
      totalFlightCoordYears: 0,
      totalStayYears: 0,
      totalProperTimeYears: 0,
      totalFlightProperYears: 0,
      timeSavedYears: 0,
      overallDilationFactor: 1,
      departureYear,
      arrivalYear: departureYear,
      crewStartAge,
      crewEndAge: crewStartAge,
      earthTwinEndAge: crewStartAge,
      peakSpeedC: 0,
      peakGamma: 1,
      totalRapidity: 0,
      overallPropulsion: calculateMassRatio({
        totalRapidity: 0,
        driveType: driveConfig?.driveType,
        exhaustVelC: driveConfig?.exhaustVelC,
      }),
    };
  }

  const legs = [];
  const stops = [];

  let coordClock = departureYear;
  let crewClock = 0; // elapsed proper time since departure
  let totalDistanceLy = 0;
  let totalFlightCoordYears = 0;
  let totalFlightProperYears = 0;
  let totalStayYears = 0;
  let peakSpeedC = 0;
  let peakGamma = 1;
  let totalRapidity = 0;

  const firstSys = systemsById.get(waypoints[0].systemId);
  if (firstSys) {
    stops.push({
      index: 0,
      systemId: firstSys.id,
      systemName: firstSys.name,
      pos: systemPosAtEpoch(firstSys, epochOffsetYears),
      arriveCoordYear: departureYear,
      departCoordYear: departureYear,
      stayYears: 0,
      arriveCrewProperYears: 0,
      departCrewProperYears: 0,
      crewBiologicalAgeArrive: crewStartAge,
      crewBiologicalAgeDepart: crewStartAge,
      earthTwinAgeArrive: crewStartAge,
      earthTwinAgeDepart: crewStartAge,
    });
  }

  for (let i = 0; i < waypoints.length - 1; i++) {
    const wpFrom = waypoints[i];
    const wpTo = waypoints[i + 1];
    const sysFrom = systemsById.get(wpFrom.systemId);
    const sysTo = systemsById.get(wpTo.systemId);
    if (!sysFrom || !sysTo) continue;

    const isLast = i === waypoints.length - 2;
    const fromPos = systemPosAtEpoch(sysFrom, epochOffsetYears);
    const toPos = systemPosAtEpoch(sysTo, epochOffsetYears);
    const dist = distance3D(fromPos, toPos);

    // On multi-stop routes in 'flyby' mode, intermediate stops must brake to rest;
    // only the final leg performs the no-braking flyby.
    const legMode = driveConfig.mode === 'flyby' && !isLast ? 'accel-cruise' : driveConfig.mode;

    const profile = computeFlightProfile({
      distance: dist,
      mode: legMode,
      accelG: driveConfig.accelG,
      cruiseC: driveConfig.cruiseC,
      driveType: driveConfig.driveType,
      exhaustVelC: driveConfig.exhaustVelC,
    });

    const legDepartCoord = coordClock;
    const legArriveCoord = legDepartCoord + profile.totalTime;
    const legDepartProper = crewClock;
    const legArriveProper = legDepartProper + profile.properTime;

    // Direction unit vector & key 3D phase boundary points for 3D route rendering
    const dx = toPos[0] - fromPos[0];
    const dy = toPos[1] - fromPos[1];
    const dz = toPos[2] - fromPos[2];
    const len = Math.max(1e-9, dist);
    const dir = [dx / len, dy / len, dz / len];

    const pointAlong = (dLy) => [
      fromPos[0] + dir[0] * dLy,
      fromPos[1] + dir[1] * dLy,
      fromPos[2] + dir[2] * dLy,
    ];

    const accelEndDist = profile.burnDistance;
    const coastEndDist = profile.burnDistance + profile.coastDistance;

    legs.push({
      index: i,
      fromSystemId: sysFrom.id,
      fromSystemName: sysFrom.name,
      toSystemId: sysTo.id,
      toSystemName: sysTo.name,
      fromPos,
      toPos,
      dir,
      accelEndPos: pointAlong(accelEndDist),
      coastEndPos: pointAlong(coastEndDist),
      departCoordYear: legDepartCoord,
      arriveCoordYear: legArriveCoord,
      departProperYears: legDepartProper,
      arriveProperYears: legArriveProper,
      crewAgeAtDepart: crewStartAge + legDepartProper,
      crewAgeAtArrive: crewStartAge + legArriveProper,
      earthTwinAgeAtArrive: crewStartAge + (legArriveCoord - departureYear),
      profile,
    });

    totalDistanceLy += dist;
    totalFlightCoordYears += profile.totalTime;
    totalFlightProperYears += profile.properTime;
    if (profile.peakSpeed > peakSpeedC) peakSpeedC = profile.peakSpeed;
    if (profile.peakGamma > peakGamma) peakGamma = profile.peakGamma;
    totalRapidity += profile.totalRapidity;

    coordClock = legArriveCoord;
    crewClock = legArriveProper;

    // Stopover at destination waypoint (at rest in star frame: delta_tau = delta_t)
    const stayYears = isLast ? 0 : Math.max(0, Number(wpTo.stayYears) || 0);
    const departNextCoord = coordClock + stayYears;
    const departNextProper = crewClock + stayYears;

    stops.push({
      index: i + 1,
      systemId: sysTo.id,
      systemName: sysTo.name,
      pos: toPos,
      arriveCoordYear: coordClock,
      departCoordYear: departNextCoord,
      stayYears,
      arriveCrewProperYears: crewClock,
      departCrewProperYears: departNextProper,
      crewBiologicalAgeArrive: crewStartAge + crewClock,
      crewBiologicalAgeDepart: crewStartAge + departNextProper,
      earthTwinAgeArrive: crewStartAge + (coordClock - departureYear),
      earthTwinAgeDepart: crewStartAge + (departNextCoord - departureYear),
    });

    coordClock = departNextCoord;
    crewClock = departNextProper;
    totalStayYears += stayYears;
  }

  const totalCoordTimeYears = coordClock - departureYear;
  const totalProperTimeYears = crewClock;

  return {
    legs,
    stops,
    totalDistanceLy,
    totalCoordTimeYears,
    totalFlightCoordYears,
    totalStayYears,
    totalProperTimeYears,
    totalFlightProperYears,
    timeSavedYears: totalCoordTimeYears - totalProperTimeYears,
    overallDilationFactor: totalProperTimeYears > 0 ? totalCoordTimeYears / totalProperTimeYears : 1,
    departureYear,
    arrivalYear: coordClock,
    crewStartAge,
    crewEndAge: crewStartAge + totalProperTimeYears,
    earthTwinEndAge: crewStartAge + totalCoordTimeYears,
    peakSpeedC,
    peakGamma,
    totalRapidity,
    overallPropulsion: calculateMassRatio({
      totalRapidity,
      driveType: driveConfig?.driveType,
      exhaustVelC: driveConfig?.exhaustVelC,
    }),
  };
}

/**
 * Evaluate exact ship state (3D position, velocity vector, speed, Lorentz gamma, proper time,
 * biological age, phase) along a planned voyage at any Universal/Earth Coordinate Year `coordYear`.
 */
export function evaluateVoyageAtCoordYear(voyage, coordYear) {
  if (!voyage || !voyage.legs || voyage.legs.length === 0) return null;

  // Before departure: crew is at rest at origin alongside Earth twin (1:1 aging!)
  if (coordYear <= voyage.departureYear) {
    const first = voyage.legs[0];
    const dtBefore = coordYear - voyage.departureYear; // <= 0
    return {
      coordYear,
      status: 'pre-departure',
      phase: 'idle',
      legIndex: 0,
      currentSystemId: first.fromSystemId,
      currentSystemName: first.fromSystemName,
      pos: first.fromPos,
      velVec: [0, 0, 0],
      distanceAlongLegLy: 0,
      totalDistanceCoveredLy: 0,
      speedC: 0,
      gamma: 1,
      properTimeYears: 0,
      crewAge: voyage.crewStartAge + dtBefore,
      earthTwinAge: voyage.crewStartAge + dtBefore,
      doppler: dopplerShift(0, 1),
    };
  }

  let cumulativeDist = 0;
  for (let i = 0; i < voyage.legs.length; i++) {
    const leg = voyage.legs[i];
    if (coordYear >= leg.departCoordYear && coordYear <= leg.arriveCoordYear) {
      const dt = coordYear - leg.departCoordYear;
      const dLeg = distanceAtTime(leg.profile, dt);
      const v = speedAtTime(leg.profile, dt);
      const gamma = gammaAtTime(leg.profile, dt);
      const tauLeg = properTimeAtTime(leg.profile, dt);
      const phase = phaseAtTime(leg.profile, dt);
      const pos = [
        leg.fromPos[0] + leg.dir[0] * dLeg,
        leg.fromPos[1] + leg.dir[1] * dLeg,
        leg.fromPos[2] + leg.dir[2] * dLeg,
      ];
      const velVec = [leg.dir[0] * v, leg.dir[1] * v, leg.dir[2] * v];
      const properTimeYears = leg.departProperYears + tauLeg;

      return {
        coordYear,
        status: 'in-flight',
        phase,
        legIndex: i,
        fromSystemName: leg.fromSystemName,
        toSystemName: leg.toSystemName,
        pos,
        velVec,
        distanceAlongLegLy: dLeg,
        totalDistanceCoveredLy: cumulativeDist + dLeg,
        speedC: v,
        gamma,
        properTimeYears,
        crewAge: voyage.crewStartAge + properTimeYears,
        earthTwinAge: voyage.crewStartAge + (coordYear - voyage.departureYear),
        doppler: dopplerShift(v, gamma),
      };
    }

    cumulativeDist += leg.profile.distance;

    // Check if waiting in stopover at the end of this leg
    const nextLeg = voyage.legs[i + 1];
    if (nextLeg && coordYear > leg.arriveCoordYear && coordYear < nextLeg.departCoordYear) {
      const stayElapsed = coordYear - leg.arriveCoordYear;
      const properTimeYears = leg.arriveProperYears + stayElapsed;
      return {
        coordYear,
        status: 'stopover',
        phase: 'stopover',
        legIndex: i,
        currentSystemId: leg.toSystemId,
        currentSystemName: leg.toSystemName,
        pos: leg.toPos,
        velVec: [0, 0, 0],
        distanceAlongLegLy: leg.profile.distance,
        totalDistanceCoveredLy: cumulativeDist,
        speedC: 0,
        gamma: 1,
        properTimeYears,
        crewAge: voyage.crewStartAge + properTimeYears,
        earthTwinAge: voyage.crewStartAge + (coordYear - voyage.departureYear),
        doppler: dopplerShift(0, 1),
      };
    }
  }

  const last = voyage.legs[voyage.legs.length - 1];
  const postArrivalYears = Math.max(0, coordYear - voyage.arrivalYear);

  // If the final leg was a no-braking flyby, the ship physically continues coasting past
  // the target star at constant velocity v = arrivalSpeed (with time dilation 1/gamma)!
  if (!last.profile.brake && postArrivalYears > 0) {
    const v = last.profile.arrivalSpeed;
    const gamma = last.profile.peakGamma;
    const extraDist = v * postArrivalYears;
    const pos = [
      last.toPos[0] + last.dir[0] * extraDist,
      last.toPos[1] + last.dir[1] * extraDist,
      last.toPos[2] + last.dir[2] * extraDist,
    ];
    const velVec = [last.dir[0] * v, last.dir[1] * v, last.dir[2] * v];
    const properTimeYears = voyage.totalProperTimeYears + postArrivalYears / gamma;

    return {
      coordYear,
      status: 'flyby-coast',
      phase: 'coasting',
      legIndex: voyage.legs.length - 1,
      currentSystemId: last.toSystemId,
      currentSystemName: last.toSystemName,
      pos,
      velVec,
      distanceAlongLegLy: last.profile.distance + extraDist,
      totalDistanceCoveredLy: voyage.totalDistanceLy + extraDist,
      speedC: v,
      gamma,
      properTimeYears,
      crewAge: voyage.crewStartAge + properTimeYears,
      earthTwinAge: voyage.crewStartAge + (coordYear - voyage.departureYear),
      doppler: dopplerShift(v, gamma),
    };
  }

  const properTimeYears = voyage.totalProperTimeYears + postArrivalYears;
  return {
    coordYear,
    status: 'arrived',
    phase: 'arrived',
    legIndex: voyage.legs.length - 1,
    currentSystemId: last.toSystemId,
    currentSystemName: last.toSystemName,
    pos: last.toPos,
    velVec: [0, 0, 0],
    distanceAlongLegLy: last.profile.distance,
    totalDistanceCoveredLy: voyage.totalDistanceLy,
    speedC: 0,
    gamma: 1,
    properTimeYears,
    crewAge: voyage.crewStartAge + properTimeYears,
    earthTwinAge: voyage.crewStartAge + (coordYear - voyage.departureYear),
    doppler: dopplerShift(0, 1),
  };
}
