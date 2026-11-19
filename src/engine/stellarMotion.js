/**
 * 3D Stellar Space Motion Propagator
 *
 * Uses HYG & Gaia DR3 3D Galactic space velocity vectors [vx, vy, vz] in ly/kyr
 * to compute star positions and pairwise distances at any epoch offset deltaYears.
 */

/**
 * Position of a star system at `epochOffsetYears` relative to J2000.0 (in Galactic ly).
 * @param {{ pos: [number, number, number], vel?: [number, number, number] }} system
 * @param {number} epochOffsetYears
 * @returns {[number, number, number]}
 */
export function systemPosAtEpoch(system, epochOffsetYears = 0) {
  if (!epochOffsetYears || !system.vel) return system.pos;
  const dtKyr = epochOffsetYears / 1000;
  return [
    system.pos[0] + system.vel[0] * dtKyr,
    system.pos[1] + system.vel[1] * dtKyr,
    system.pos[2] + system.vel[2] * dtKyr,
  ];
}

/**
 * 3D Euclidean distance in light-years between two points or systems.
 */
export function distance3D(posA, posB) {
  return Math.hypot(posB[0] - posA[0], posB[1] - posA[1], posB[2] - posA[2]);
}

/**
 * Distance between two star systems at a given epoch offset (years from J2000).
 */
export function distanceBetweenSystems(sysA, sysB, epochOffsetYears = 0) {
  return distance3D(systemPosAtEpoch(sysA, epochOffsetYears), systemPosAtEpoch(sysB, epochOffsetYears));
}

