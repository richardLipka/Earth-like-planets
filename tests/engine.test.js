import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {
  computeFlightProfile,
  distanceAtTime,
  speedAtTime,
  gammaAtTime,
  properTimeAtTime,
  dopplerShift,
  calculateMassRatio,
  G_LY_PER_YR2,
} from '../src/engine/relativity.js';
import { planMultiStopVoyage, evaluateVoyageAtCoordYear } from '../src/engine/voyagePlanner.js';
import {
  solveSignalToShip,
  computeShipTransmission,
  solveShipToShipSignal,
  computeShipRendezvous,
} from '../src/engine/commLightCone.js';
import {
  aberrateCosTheta,
  starDopplerFactor,
  blackbodyTempToRgb,
  computeCmbForwardGlow,
} from '../src/engine/relativisticOptics.js';
import { RADIO_SHELL_LAYERS, METI_BEAMS } from '../src/data/radioBroadcastLayers.js';
import {
  BROADCAST_MIN_YEAR,
  BROADCAST_MAX_YEAR,
  getBroadcastsForYear,
  getBroadcastEraForYear,
} from '../src/data/broadcastChronicle.js';
import { computeESI, computeTidalLocking } from '../src/engine/exoplanetMetrics.js';
import { systemPosAtEpoch, distanceBetweenSystems } from '../src/engine/stellarMotion.js';
import { getSystemSourceLinks, getSkyCutoutSources } from '../src/utils/catalogLinks.js';
import { translations } from '../src/i18n/translations.js';

describe('Relativistic Flight & Propulsion Engine', () => {
  it('computes 1g brachistochrone (midpoint flip) to Alpha Centauri (4.321 ly)', () => {
    const p = computeFlightProfile({
      distance: 4.321,
      mode: 'flip',
      accelG: 1.0,
      driveType: 'non-reactive',
    });

    // At 1g over 4.321 ly:
    // Coordinate time ~ 5.90 years, Ship proper time ~ 3.55 years, Peak speed ~ 0.95c
    expect(p.totalTime).toBeGreaterThan(5.8);
    expect(p.totalTime).toBeLessThan(6.05);
    expect(p.properTime).toBeGreaterThan(3.5);
    expect(p.properTime).toBeLessThan(3.65);
    expect(p.peakSpeed).toBeGreaterThan(0.94);
    expect(p.peakSpeed).toBeLessThan(0.96);
    expect(p.propulsion.isReactive).toBe(false);
    expect(p.propulsion.massRatio).toBe(1.0);

    // Distance and speed interpolation checks
    expect(distanceAtTime(p, 0)).toBe(0);
    expect(distanceAtTime(p, p.totalTime / 2)).toBeCloseTo(4.321 / 2, 5);
    expect(distanceAtTime(p, p.totalTime)).toBeCloseTo(4.321, 5);
    expect(speedAtTime(p, p.totalTime / 2)).toBeCloseTo(p.peakSpeed, 5);
    expect(speedAtTime(p, p.totalTime)).toBe(0);
    expect(properTimeAtTime(p, p.totalTime)).toBeCloseTo(p.properTime, 5);
  });

  it('computes constant cruise speed (0.5c over 10 ly)', () => {
    const p = computeFlightProfile({
      distance: 10,
      mode: 'constant',
      cruiseC: 0.5,
    });
    expect(p.totalTime).toBeCloseTo(20.0, 5);
    // gamma(0.5c) = 1 / sqrt(0.75) = 1.1547005 -> properTime = 20 * sqrt(0.75) = 17.3205 yr
    expect(p.properTime).toBeCloseTo(17.3205, 3);
    expect(p.peakGamma).toBeCloseTo(1.1547, 3);
  });

  it('computes accel-cruise-brake profile and relativistic Doppler shift', () => {
    const p = computeFlightProfile({
      distance: 20,
      mode: 'accel-cruise',
      accelG: 1.0,
      cruiseC: 0.6,
      driveType: 'reaction',
      exhaustVelC: 0.33,
    });

    expect(p.peakSpeed).toBeCloseTo(0.6, 5);
    expect(p.coastTime).toBeGreaterThan(25);
    // At beta = 0.6, forward Doppler factor = sqrt(1.6 / 0.4) = 2.0
    const d = dopplerShift(0.6);
    expect(d.forwardFactor).toBeCloseTo(2.0, 5);
    expect(d.rearFactor).toBeCloseTo(0.5, 5);
    expect(d.forwardGreenNm).toBeCloseTo(275.0, 3);
    expect(p.propulsion.isReactive).toBe(true);
    expect(p.propulsion.massRatio).toBeGreaterThan(10);
  });

  it('satisfies exact ODE quadrature, hyperbolic invariants, ultra-relativistic (Andromeda) and Newtonian limits', () => {
    // 1. Verify exact ODE integration dx/dt = v(t), dtau/dt = sqrt(1 - v^2), and Minkowski invariant (a*t)^2 - (a*x+1)^2 = -1
    const profiles = [
      computeFlightProfile({ distance: 4.321, mode: 'flip', accelG: 1.0 }),
      computeFlightProfile({ distance: 25.0, mode: 'flip', accelG: 1.0 }),
      computeFlightProfile({ distance: 11.905, mode: 'accel-cruise', accelG: 0.5, cruiseC: 0.5 }),
      computeFlightProfile({ distance: 10.0, mode: 'flyby', accelG: 1.0, cruiseC: 0.9 }),
    ];

    for (const p of profiles) {
      const N = 4000;
      const dt = p.totalTime / N;
      let numDist = 0;
      let numTau = 0;
      for (let i = 0; i < N; i++) {
        const tMid = (i + 0.5) * dt;
        const v = speedAtTime(p, tMid);
        const g = gammaAtTime(p, tMid);
        numDist += v * dt;
        numTau += (1 / g) * dt;
      }
      expect(Math.abs(numDist - p.distance) / p.distance).toBeLessThan(1e-6);
      expect(Math.abs(numTau - p.properTime) / p.properTime).toBeLessThan(1e-6);

      // Check hyperbolic invariant (a*t)^2 - (a*x + 1)^2 = -1 at half-burn
      const tHalf = p.burnTime * 0.5;
      const xHalf = distanceAtTime(p, tHalf);
      const a = p.accel;
      expect((a * tHalf) ** 2 - (a * xHalf + 1) ** 2).toBeCloseTo(-1.0, 10);
      expect(gammaAtTime(p, tHalf)).toBeCloseTo(1 + a * xHalf, 10);
    }

    // 2. Ultra-relativistic benchmark: Andromeda (2,500,000 ly at 1g flip — Baez Relativistic Rocket ~28.6 yr ship time!)
    const andromeda = computeFlightProfile({ distance: 2500000, mode: 'flip', accelG: 1.0 });
    expect(andromeda.properTime).toBeCloseTo(28.6034, 2);
    expect(andromeda.peakGamma).toBeCloseTo(1 + G_LY_PER_YR2 * 1250000, 1);
    expect(andromeda.doppler.forwardFactor).toBeGreaterThan(2e6);
    // Torchship braking-flare horizon asymptotes to c/a = 1 / 1.0322755 = 0.96873 yr!
    expect(andromeda.warningLeadYears).toBeCloseTo(1 / G_LY_PER_YR2, 4);

    // 3. Non-relativistic Newtonian limit (0.001 ly at 0.02g flip): t = 2*sqrt(d/a)
    const tiny = computeFlightProfile({ distance: 0.001, mode: 'flip', accelG: 0.02 });
    const newtonianT = 2 * Math.sqrt(0.001 / (0.02 * G_LY_PER_YR2));
    expect(Math.abs(tiny.totalTime - newtonianT) / newtonianT).toBeLessThan(1e-4);
    expect(tiny.properTime / tiny.totalTime).toBeGreaterThan(0.9999);

    // 4. Exact Ackeret relativistic photon rocket equation:
    //    ve = c, accel to 0.6c + brake to rest => M0/Mf = (1 + 0.6)/(1 - 0.6) = 4.000 exactly!
    const photon = calculateMassRatio({
      totalRapidity: 2 * Math.atanh(0.6),
      driveType: 'reaction',
      exhaustVelC: 1.0,
    });
    expect(photon.massRatio).toBeCloseTo(4.0, 10);
    expect(photon.propellantFraction).toBeCloseTo(0.75, 10);
  });
});

describe('Multi-Stop Voyage Planner & Light-Cone Communication', () => {
  const mockSystems = new Map([
    ['sol', { id: 'sol', name: 'Sol', pos: [0, 0, 0], vel: [0, 0, 0] }],
    ['alpha', { id: 'alpha', name: 'Alpha Centauri', pos: [3, 4, 0], vel: [0.1, 0, 0] }], // dist = 5 ly
    ['tau', { id: 'tau', name: 'Tau Ceti', pos: [3, 4, 12], vel: [0, -0.1, 0] }],        // dist from alpha = 12 ly
  ]);

  it('plans a multi-stop voyage with stay duration and solves light-cone interception', () => {
    const voyage = planMultiStopVoyage({
      waypoints: [
        { systemId: 'sol', stayYears: 0 },
        { systemId: 'alpha', stayYears: 2.0 },
        { systemId: 'tau', stayYears: 0 },
      ],
      systemsById: mockSystems,
      departureYear: 2200.0,
      crewStartAge: 30.0,
      driveConfig: {
        mode: 'constant',
        accelG: 1.0,
        cruiseC: 0.5,
        driveType: 'non-reactive',
      },
    });

    expect(voyage.legs.length).toBe(2);
    expect(voyage.totalDistanceLy).toBeCloseTo(17.0, 5);
    // Leg 1: 5 ly at 0.5c = 10 yr coord; stay = 2 yr; Leg 2: 12 ly at 0.5c = 24 yr coord -> Total = 36 yr
    expect(voyage.totalCoordTimeYears).toBeCloseTo(36.0, 5);
    expect(voyage.arrivalYear).toBeCloseTo(2236.0, 5);

    // Mid-leg 1 at 2205.0: ship is 2.5 ly away from Sol
    const midState = evaluateVoyageAtCoordYear(voyage, 2205.0);
    expect(midState.status).toBe('in-flight');
    expect(midState.distanceAlongLegLy).toBeCloseTo(2.5, 5);

    // Signal sent from Sol at 2202.0 chasing the 0.5c ship:
    // Ship pos: x(t) = 0.5*(t - 2200); Photon pos: x_p(t) = 1.0*(t - 2202)
    // 0.5*(t - 2200) = t - 2202 => 0.5*t = 1102 => t = 2204.0!
    const intercept = solveSignalToShip(voyage, [0, 0, 0], 'Sol', 2202.0);
    expect(intercept.tHitCoordYear).toBeCloseTo(2204.0, 4);
    expect(intercept.lightTravelYears).toBeCloseTo(2.0, 4);

    // Ship transmits at 2204.0 (when 2.0 ly from Sol): arrives at Sol at 2206.0
    const tx = computeShipTransmission(voyage, 2204.0);
    const solRx = tx.receivers.find((r) => r.systemId === 'sol');
    expect(solRx.arriveCoordYear).toBeCloseTo(2206.0, 4);
    // Directly receding from Sol at 0.5c -> redshift sqrt((1-0.5)/(1+0.5)) = 1/sqrt(3)
    expect(solRx.dopplerFactor).toBeCloseTo(Math.sqrt(0.5 / 1.5), 5);
    expect(solRx.shiftType).toBe('redshift');
    // Receiving Sol's chasing signal at 0.5c -> same longitudinal redshift 1/sqrt(3)
    expect(intercept.dopplerFactorAtHit).toBeCloseTo(Math.sqrt(0.5 / 1.5), 5);
    expect(intercept.shiftTypeAtHit).toBe('redshift');
  });

  it('computes exact 3D transverse relativistic Doppler effect, synchronized pre-departure aging, and post-flyby coasting', () => {
    const perpSys = new Map([
      ['sol', { id: 'sol', name: 'Sol', pos: [0, 0, 0], vel: [0, 0, 0] }],
      ['a', { id: 'a', name: 'Star A', pos: [10, 0, 0], vel: [0, 0, 0] }],
      ['b', { id: 'b', name: 'Star B', pos: [10, 10, 0], vel: [0, 0, 0] }],
    ]);

    // Ship moves along +Y at 0.8c (gamma = 5/3) perpendicular to Sol at (0,0,0)
    const perpVoyage = planMultiStopVoyage({
      waypoints: [
        { systemId: 'a', stayYears: 0 },
        { systemId: 'b', stayYears: 0 },
      ],
      systemsById: perpSys,
      departureYear: 2200,
      crewStartAge: 30,
      driveConfig: { mode: 'constant', accelG: 1, cruiseC: 0.8 },
    });

    // 1. Pre-departure crew & Earth twin must age identically (1:1) before launch
    const pre = evaluateVoyageAtCoordYear(perpVoyage, 2198);
    expect(pre.crewAge).toBeCloseTo(28.0, 6);
    expect(pre.earthTwinAge).toBeCloseTo(28.0, 6);

    // 2. Transverse Doppler (ship -> Sol): f_obs / f_emit = 1 / gamma = sqrt(1 - 0.8^2) = 0.600 (redshift!)
    const txPerp = computeShipTransmission(perpVoyage, 2200.000001, [perpSys.get('sol')]);
    const solRx = txPerp.receivers.find((r) => r.systemId === 'sol');
    expect(solRx.dopplerFactor).toBeCloseTo(0.6, 4);
    expect(solRx.shiftType).toBe('redshift');

    // 3. Transverse reception Doppler (Sol -> ship): photon emitted at 2190 arrives at (10, 0, 0) at 2200.000001
    //    moving perpendicularly at 0.8c -> f_ship / f_star = gamma = 5/3 = 1.6667 (transverse blueshift!)
    const rxPerp = solveSignalToShip(perpVoyage, [0, 0, 0], 'Sol', 2190.000001);
    expect(rxPerp.tHitCoordYear).toBeCloseTo(2200.000001, 3);
    expect(rxPerp.dopplerFactorAtHit).toBeCloseTo(5 / 3, 3);
    expect(rxPerp.shiftTypeAtHit).toBe('blueshift');

    // 4. Flyby post-arrival coasting & light-cone interception
    const flyby = planMultiStopVoyage({
      waypoints: [
        { systemId: 'sol', stayYears: 0 },
        { systemId: 'a', stayYears: 0 },
      ],
      systemsById: perpSys,
      departureYear: 2200,
      crewStartAge: 30,
      driveConfig: { mode: 'flyby', accelG: 1.0, cruiseC: 0.6 },
    });
    const post5 = evaluateVoyageAtCoordYear(flyby, flyby.arrivalYear + 5.0);
    expect(post5.status).toBe('flyby-coast');
    expect(post5.speedC).toBeCloseTo(0.6, 5);
    expect(post5.pos[0]).toBeCloseTo(10 + 0.6 * 5.0, 4);
    expect(post5.properTimeYears).toBeCloseTo(flyby.totalProperTimeYears + 5.0 / 1.25, 4);

    // Signal sent from Sol at flyby arrival catches the 0.6c coasting ship:
    // Ship at t_arr is at x=10 moving at 0.6c -> 10 + 0.6*dt = dt => dt = 25.0 yr!
    const flybyHit = solveSignalToShip(flyby, [0, 0, 0], 'Sol', flyby.arrivalYear);
    expect(flybyHit.lightTravelYears).toBeCloseTo(25.0, 4);
    expect(flybyHit.shipStatusAtHit).toBe('flyby-coast');
  });

  it('propagates 3D stellar proper motion across millennia', () => {
    const sysA = mockSystems.get('sol');
    const sysB = mockSystems.get('alpha');
    expect(distanceBetweenSystems(sysA, sysB, 0)).toBeCloseTo(5.0, 5);
    // After +10,000 years (10 kyr), alpha moves +1.0 ly in X -> pos [4, 4, 0], dist = sqrt(32) = 5.65685 ly
    const pos10k = systemPosAtEpoch(sysB, 10000);
    expect(pos10k[0]).toBeCloseTo(4.0, 5);
    expect(distanceBetweenSystems(sysA, sysB, 10000)).toBeCloseTo(Math.sqrt(32), 4);
  });
});

describe('Catalogue Integrity, Multi-Star Matching & Link Generation', () => {
  const catalog = JSON.parse(fs.readFileSync('public/data/astrometrics_catalog.json', 'utf8'));

  it('has zero duplicate system IDs, zero duplicate planets, and valid coordinates/HZ', () => {
    const sysIds = new Set();
    const planetNames = new Set();

    for (const s of catalog.systems) {
      expect(sysIds.has(s.id)).toBe(false);
      sysIds.add(s.id);
      expect(s.pos.every(Number.isFinite)).toBe(true);
      if (s.id !== 'sol') {
        expect(Number.isFinite(s.ra)).toBe(true);
        expect(Number.isFinite(s.dec)).toBe(true);
      }
      for (const st of s.stars) {
        expect(st.teff).toBeGreaterThan(0);
        expect(st.lum).toBeGreaterThan(0);
        expect(st.hz.runawayGreenhouseAU).toBeLessThan(st.hz.maximumGreenhouseAU);
      }
      for (const p of s.planets) {
        expect(planetNames.has(p.name)).toBe(false);
        planetNames.add(p.name);
        expect(p.semiMajorAxisAU).toBeGreaterThan(0);
      }
    }
  });

  it('assigns multi-star exoplanets to the correct companion star (GJ 667C, Proxima Centauri, Struve 2398 B)', () => {
    const gl667 = catalog.systems.find((s) => s.name === 'Gl 667');
    expect(gl667).toBeDefined();
    const plC = gl667.planets.find((p) => p.name === 'GJ 667 C c');
    expect(plC?.hostComponent).toBe('GJ 667C');
    expect(plC?.hzStatus).toBeGreaterThanOrEqual(1);

    const alphaCen = catalog.systems.find((s) => s.name === 'Alpha Centauri');
    expect(alphaCen).toBeDefined();
    const proxB = alphaCen.planets.find((p) => p.name === 'Proxima Cen b');
    expect(proxB?.hostComponent).toBe('Proxima Centauri');
    expect(proxB?.hzStatus).toBe(2);
  });

  it('generates valid outbound source links and sky cutout sources with working endpoints', () => {
    for (const id of ['sol', 'hip-71683', 'hip-8102', 'nea-trappist-1']) {
      const sys = catalog.systems.find((s) => s.id === id);
      expect(sys).toBeDefined();
      const links = getSystemSourceLinks(sys, 'en');
      expect(links.length).toBeGreaterThanOrEqual(2);
      for (const l of links) {
        expect(l.url).toMatch(/^https:\/\//);
        expect(l.url).not.toContain('cds.unistra.fr'); // broken Strasbourg outage domain replaced by Harvard mirror
      }
      const sky = getSkyCutoutSources(sys);
      expect(sky.length).toBeGreaterThanOrEqual(2);
      expect(sky[0].url).toMatch(/^https:\/\//);
      expect(sky[0].url).not.toContain('alasky.cds.unistra.fr');
      expect(sky[0].url).not.toContain('600px-The_Sun');
    }
  });

  it('has complete EN and CS translation parity', () => {
    const enKeys = Object.keys(translations.en).sort();
    const csKeys = Object.keys(translations.cs).sort();
    expect(csKeys).toEqual(enKeys);
  });

  it('has valid whole-catalogue Sci-Fi literature sweep dataset including Revelation Space & major hard SF universes', () => {
    const scifi = JSON.parse(fs.readFileSync('public/data/scifi_literature.json', 'utf8'));
    const sysIds = new Set(catalog.systems.map((s) => s.id));
    const entries = Object.values(scifi.bySystemId || {});

    expect(scifi.meta.catalogueSystemsSwept).toBe(catalog.systems.length);
    expect(entries.length).toBeGreaterThanOrEqual(150);

    for (const entry of entries) {
      expect(sysIds.has(entry.systemId)).toBe(true);
      expect(entry.notableWorks.length + entry.wikiWorks.length).toBeGreaterThan(0);
      for (const w of entry.notableWorks) {
        if (w.world) {
          expect(w.world).not.toMatch(/\{\{|\}\}|\[\[/);
        }
      }
    }

    // Verify Revelation Space star network coverage across catalogue (including IAU/Gliese aliased stars)
    const revSpaceIds = [
      'hip-16537',  // Epsilon Eridani (Yellowstone / Chasm City)
      'hip-99240',  // Delta Pavonis (Resurgam)
      'hip-104214', // 61 Cygni (Sky's Edge)
      'hip-49908',  // GJ 380 / Groombridge 1618 (Turquoise)
      'hip-7981',   // 107 Piscium (Haldora & Hela)
      'hyg-118084', // p Eridani (Ararat)
      'hyg-119585', // Ross 248 (Diadem)
      'hip-114046', // Lacaille 9352 (Fand)
      'hip-86162',  // GJ 687 (Gliese 687)
      'hip-84405',  // Guniibuu / 36 Ophiuchi / Gliese 664 (Chaloupek)
    ];
    for (const id of revSpaceIds) {
      const e = scifi.bySystemId[id];
      expect(e, `Missing Revelation Space system ${id}`).toBeDefined();
      expect(e.universes).toContain('Revelation Space');
    }

    // Verify Bobiverse outer & core star network coverage (Books 1-4)
    for (const id of [
      'hip-16537',  // Epsilon Eridani (Bill's Skunk Works)
      'hip-17378',  // Delta Eridani / Rana (Eden / Deltans)
      'hip-19849',  // 40 Eridani (Vulcan & Romulus)
      'hip-15510',  // 82 G. Eridani (Asgard & Takamagahara)
      'hip-3821',   // Eta Cassiopeiae / Achird (Poseidon)
      'hip-108870', // Epsilon Indi (Big Top / KKP)
      'hip-113229', // GJ 877 (Others Homeworld & Dyson Sphere)
      'hip-27072',  // Gamma Leporis (Bender's trail)
      'hip-28103',  // Eta Leporis (Quin & Heaven's River)
    ]) {
      const e = scifi.bySystemId[id];
      expect(e, `Missing Bobiverse system ${id}`).toBeDefined();
      expect(e.universes).toContain('Bobiverse');
    }

    // Verify Xeelee Sequence stars in scifi_literature.json
    for (const id of ['hip-71683', 'hip-8102', 'hip-32349', 'hip-16537', 'hip-87937']) {
      const e = scifi.bySystemId[id];
      expect(e, `Missing Xeelee Sequence system ${id}`).toBeDefined();
      expect(e.universes).toContain('Xeelee Sequence');
    }

    // Verify Groombridge 1618 alias on GJ 380, Alien on Zeta Reticuli, and Tau Ceti Wikipedia hits
    expect(scifi.bySystemId['hip-49908'].aliases).toContain('Groombridge 1618');
    expect(scifi.bySystemId['hip-15371'].universes).toContain('Alien');
    const tau = scifi.bySystemId['hip-8102'];
    expect(tau.notableWorks.some((w) => w.title.includes('Project Hail Mary'))).toBe(true);
    expect(tau.wikiWorks.length).toBeGreaterThan(10);
  });

  it('has valid Sci-Fi Voyages Library with verified real catalogue star IDs and relativistic physics profiles', () => {
    const voyagesDoc = JSON.parse(fs.readFileSync('public/data/scifi_voyages.json', 'utf8'));
    const systemsById = new Map(catalog.systems.map((s) => [s.id, s]));
    const voyages = voyagesDoc.voyages || [];

    expect(voyages.length).toBeGreaterThanOrEqual(26);
    // Ensure Revelation Space, 4-part Bobiverse, 3-part Xeelee Sequence, Eastern Bloc (Lem, Yefremov, Strugatsky, Martynov, Babula), and Classic/Modern sublight SF are present
    const ids = new Set(voyages.map((v) => v.id));
    for (const requiredId of [
      'revelation-space-clavain-inhibitor',
      'revelation-space-exodus-chasm-city',
      'bobiverse-expansion',
      'bobiverse-exodus-colonies',
      'bobiverse-others-war',
      'bobiverse-heavens-river',
      'xeelee-timelike-infinity',
      'xeelee-mayflower-redemption',
      'xeelee-raft-flux-ring',
      'lem-return-from-the-stars',
      'lem-magellanic-cloud',
      'yefremov-andromeda-nebula',
      'strugatsky-noon-22nd-century',
      'martynov-kallisto-sirius',
      'babula-planet-of-three-suns',
      'anderson-tau-zero',
      'heinlein-time-for-the-stars',
      'leguin-hainish-nafal',
      'niven-known-space-slowboats',
      'clarke-rama-odyssey',
      'cameron-avatar-venture-star',
      'project-hail-mary',
    ]) {
      expect(ids.has(requiredId), `Missing voyage ${requiredId}`).toBe(true);
    }

    for (const vp of voyages) {
      expect(vp.title?.en).toBeTruthy();
      expect(vp.title?.cs).toBeTruthy();
      expect(vp.subtitle?.en).toBeTruthy();
      expect(vp.subtitle?.cs).toBeTruthy();
      expect(vp.physicsNote?.en).toBeTruthy();
      expect(vp.physicsNote?.cs).toBeTruthy();
      expect(vp.books?.en).toBeTruthy();
      expect(vp.books?.cs).toBeTruthy();
      expect(vp.sourceLabel?.en).toBeTruthy();
      expect(vp.sourceLabel?.cs).toBeTruthy();
      expect(vp.ships.length).toBeGreaterThan(0);
      for (const sh of vp.ships) {
        expect(sh.name).toBeTruthy();
        expect(sh.nameCs).toBeTruthy();
        expect(sh.waypoints.length).toBeGreaterThanOrEqual(2);
        for (const wp of sh.waypoints) {
          expect(systemsById.has(wp.systemId), `Invalid star ${wp.systemId} in ${vp.id}`).toBe(true);
        }
        const plan = planMultiStopVoyage({
          waypoints: sh.waypoints,
          systemsById,
          departureYear: sh.departureYear,
          crewStartAge: sh.crewStartAge,
          driveConfig: sh.driveConfig,
        });
        expect(plan.totalDistanceLy).toBeGreaterThan(0);
        expect(plan.totalCoordTimeYears).toBeGreaterThanOrEqual(plan.totalProperTimeYears);
      }
      for (const ev of vp.storyEvents || []) {
        expect(systemsById.has(ev.systemId)).toBe(true);
        expect(ev.title?.en).toBeTruthy();
        expect(ev.title?.cs).toBeTruthy();
      }
    }
  });

  it('solves exact Moving Ship A -> Moving Ship B light-cone interception, 3D Doppler & Rendezvous', () => {
    const sysMap = new Map([
      ['a', { id: 'a', name: 'Star A', pos: [0, 0, 0], vel: [0, 0, 0] }],
      ['b', { id: 'b', name: 'Star B', pos: [20, 0, 0], vel: [0, 0, 0] }],
      ['c', { id: 'c', name: 'Star C', pos: [0, 10, 0], vel: [0, 0, 0] }],
      ['d', { id: 'd', name: 'Star D', pos: [20, 10, 0], vel: [0, 0, 0] }],
    ]);

    // Two ships moving in parallel formation at identical 0.6c:
    // Ship A: (0,0,0) -> (20,0,0); Ship B: (0,10,0) -> (20,10,0)
    // Because v_A === v_B, exact combined Doppler f_B / f_A must equal 1.000000!
    const shipA = planMultiStopVoyage({
      waypoints: [{ systemId: 'a', stayYears: 0 }, { systemId: 'b', stayYears: 0 }],
      systemsById: sysMap,
      departureYear: 2200,
      crewStartAge: 30,
      driveConfig: { mode: 'constant', accelG: 1, cruiseC: 0.6 },
    });
    const shipB = planMultiStopVoyage({
      waypoints: [{ systemId: 'c', stayYears: 0 }, { systemId: 'd', stayYears: 0 }],
      systemsById: sysMap,
      departureYear: 2200,
      crewStartAge: 30,
      driveConfig: { mode: 'constant', accelG: 1, cruiseC: 0.6 },
    });

    const sig = solveShipToShipSignal(shipA, shipB, 2205.0, 'Ship A', 'Ship B', true);
    expect(sig).not.toBeNull();
    // Exact light-cone invariant: |r_B(tHit) - r_A(tEmit)| === tHit - tEmit
    const dx = sig.hitPos[0] - sig.senderPos[0];
    const dy = sig.hitPos[1] - sig.senderPos[1];
    const dz = sig.hitPos[2] - sig.senderPos[2];
    expect(Math.hypot(dx, dy, dz)).toBeCloseTo(sig.lightTravelYears, 6);
    // Co-moving formation must experience ZERO net Doppler shift (f_B / f_A = 1.0)!
    expect(sig.dopplerFactor).toBeCloseTo(1.0, 5);
    expect(sig.shiftType).toBe('none');
    expect(sig.reply).not.toBeNull();
    expect(sig.reply.tReplyCoordYear).toBeGreaterThan(sig.tHitCoordYear);

    // Head-on approaching ships: Ship A goes A->B (+X at 0.6c), Ship Opp goes B->A (-X at 0.6c)
    // Crossing happens at x=10, t = 2200 + 10/0.6 = 2216.667!
    const shipOpp = planMultiStopVoyage({
      waypoints: [{ systemId: 'b', stayYears: 0 }, { systemId: 'a', stayYears: 0 }],
      systemsById: sysMap,
      departureYear: 2200,
      crewStartAge: 30,
      driveConfig: { mode: 'constant', accelG: 1, cruiseC: 0.6 },
    });
    const headOn = solveShipToShipSignal(shipA, shipOpp, 2202.0, 'A', 'Opp', false);
    // Combined relativistic head-on Doppler for two 0.6c ships:
    // v_rel = (0.6 + 0.6)/(1 + 0.36) = 1.2/1.36 = 15/17 -> D = sqrt((1+15/17)/(1-15/17)) = sqrt(32/2) = 4.000!
    expect(headOn.dopplerFactor).toBeCloseTo(4.0, 4);
    expect(headOn.shiftType).toBe('blueshift');

    const rdv = computeShipRendezvous(shipA, shipOpp);
    expect(rdv.minDistLy).toBeLessThan(1e-3);
    expect(rdv.tClosestCoordYear).toBeCloseTo(2200 + 10 / 0.6, 2);
  });

  it('computes exact relativistic aberration, blackbody Doppler shift, CMB bow glow, and valid METI targets', () => {
    // 1. Abeam star (cos(theta) = 0, 90°) must aberrate forward to cos(theta') = beta!
    const ab = aberrateCosTheta(0, 0.8);
    expect(ab.cosThetaApparent).toBeCloseTo(0.8, 10);
    expect((ab.thetaApparentRad * 180) / Math.PI).toBeCloseTo(36.87, 2);

    // 2. Exact head-on & tail-on Doppler at beta = 0.6 (gamma = 1.25): D_bow = 2.0, D_aft = 0.5
    expect(starDopplerFactor(1.0, 0.6)).toBeCloseTo(2.0, 8);
    expect(starDopplerFactor(-1.0, 0.6)).toBeCloseTo(0.5, 8);
    // Transverse rest-frame (cosTheta = 0): D = gamma = 1.25
    expect(starDopplerFactor(0.0, 0.6)).toBeCloseTo(1.25, 8);

    // 3. Blackbody bands & CMB bow temperature
    expect(blackbodyTempToRgb(1000).band).toBe('ir');
    expect(blackbodyTempToRgb(5778).band).toBe('visible');
    expect(blackbodyTempToRgb(35000).band).toBe('uv');
    const cmb = computeCmbForwardGlow(0.6);
    expect(cmb.bowTempK).toBeCloseTo(2.7255 * 2.0, 4);

    // 4. All historical Radio shells & METI beam targets map to real catalogued stars & have EN/CS text
    const sysIds = new Set(catalog.systems.map((s) => s.id));
    expect(RADIO_SHELL_LAYERS.length).toBeGreaterThanOrEqual(5);
    for (const layer of RADIO_SHELL_LAYERS) {
      expect(layer.title?.en && layer.title?.cs).toBeTruthy();
      expect(layer.broadcasts.length).toBeGreaterThan(0);
    }
    for (const beam of METI_BEAMS) {
      expect(sysIds.has(beam.targetSystemId), `Invalid METI target ${beam.targetSystemId}`).toBe(true);
      expect(beam.name?.en && beam.name?.cs).toBeTruthy();
    }
  });

  it('provides 2-3 verified bilingual broadcasts for every single year 1926..2026 (101 years)', () => {
    const validTypes = new Set(['tv', 'radio', 'space', 'meti']);
    let total = 0;
    for (let y = BROADCAST_MIN_YEAR; y <= BROADCAST_MAX_YEAR; y++) {
      const items = getBroadcastsForYear(y);
      expect(items.length, `Year ${y} must have 2-3 broadcasts`).toBeGreaterThanOrEqual(2);
      expect(items.length, `Year ${y} must have <= 3 broadcasts`).toBeLessThanOrEqual(3);
      for (const b of items) {
        expect(b.year).toBe(y);
        expect(validTypes.has(b.type)).toBe(true);
        expect(b.title?.en?.trim().length).toBeGreaterThan(4);
        expect(b.title?.cs?.trim().length).toBeGreaterThan(4);
        expect(b.detail?.en?.trim().length).toBeGreaterThan(10);
        expect(b.detail?.cs?.trim().length).toBeGreaterThan(10);
      }
      const era = getBroadcastEraForYear(y);
      expect(era.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(era.title?.en && era.title?.cs).toBeTruthy();
      total += items.length;
    }
    expect(total).toBeGreaterThanOrEqual(250);
  });

  it('computes physically accurate ESI (Schulze-Makuch 2011) and Tidal-Locking timescales (Barnes 2017)', () => {
    // Earth = exact 1.00 ESI and freely rotating (> 100 Gyr)
    expect(computeESI({ radiusEarth: 1, massEarth: 1, surfaceTempK: 288 })).toBe(1);
    const earthLock = computeTidalLocking({
      semiMajorAxisAU: 1.0,
      starMassSolar: 1.0,
      radiusEarth: 1.0,
      massEarth: 1.0,
      isTerrestrial: true,
    });
    expect(earthLock.tidalLockStatus).toBe('free');
    expect(earthLock.tidalLockGyr).toBeGreaterThan(100);

    // Mercury: tidally locked (< 1 Gyr)
    const mercLock = computeTidalLocking({
      semiMajorAxisAU: 0.3871,
      starMassSolar: 1.0,
      radiusEarth: 0.383,
      massEarth: 0.055,
      isTerrestrial: true,
    });
    expect(mercLock.tidalLockStatus).toBe('locked');
    expect(mercLock.tidalLockGyr).toBeLessThan(1.0);

    // Proxima Centauri b: high ESI (>= 0.85) and rapidly tidally locked (< 0.01 Gyr)
    const proxEsi = computeESI({ radiusEarth: 1.07, massEarth: 1.07, insolationEarth: 0.65 });
    expect(proxEsi).toBeGreaterThanOrEqual(0.85);
    expect(proxEsi).toBeLessThanOrEqual(0.95);
    const proxLock = computeTidalLocking({
      semiMajorAxisAU: 0.0485,
      starMassSolar: 0.122,
      radiusEarth: 1.07,
      massEarth: 1.07,
      isTerrestrial: true,
    });
    expect(proxLock.tidalLockStatus).toBe('locked');
    expect(proxLock.tidalLockGyr).toBeLessThan(0.01);

    // Jupiter: low ESI and freely rotating
    expect(computeESI({ radiusEarth: 11.21, massEarth: 317.8, surfaceTempK: 165 })).toBeLessThan(0.4);
  });

  it('includes Gaia DR3 velocities, Ultracool L/T/Y brown dwarfs (Luhman 16, WISE 0855, Scholz), JWST spectra, Flare stars & Debris disks', () => {
    const rawText = fs.readFileSync('public/data/astrometrics_catalog.json', 'utf8');
    expect(/\b(NaN|Infinity)\b/.test(rawText)).toBe(false);

    // 1. Iconic nearby ultracool & brown dwarf systems present with real multi-star structure
    const luhman16 = catalog.systems.find((s) => /Luhman 16/i.test(s.name));
    expect(luhman16).toBeDefined();
    expect(luhman16.distLy).toBeCloseTo(6.5, 0);
    expect(luhman16.isBrownDwarf).toBe(true);
    expect(luhman16.stars.length).toBe(2);

    const wise0855 = catalog.systems.find((s) => /WISE 0855/i.test(s.name));
    expect(wise0855).toBeDefined();
    expect(wise0855.distLy).toBeCloseTo(7.43, 1);
    expect(wise0855.stars[0].cls).toBe('Y');
    expect(wise0855.stars[0].teff).toBeLessThan(350);

    const scholz = catalog.systems.find((s) => /Scholz/i.test(s.name));
    expect(scholz).toBeDefined();
    expect(scholz.hasFull3dVelocity).toBe(true);
    expect(scholz.radialVelocityKmS).toBeGreaterThan(75);
    // Past trajectory of Scholz's Star passes within < 1.5 ly of Sol ~70-85 kyr ago!
    const sol = catalog.systems.find((s) => s.id === 'sol');
    const scholzDistAtPast = distanceBetweenSystems(sol, scholz, -79000);
    expect(scholzDistAtPast).toBeLessThan(1.5);

    // 2. Gliese 710 upgraded to ESA Gaia DR3 precision (< 0.30 ly close encounter in ~1.33 Myr!)
    const gj710 = catalog.systems.find((s) => s.name === 'GJ 710');
    expect(gj710).toBeDefined();
    expect(gj710.velocitySource).toBe('Gaia DR3');
    expect(distanceBetweenSystems(sol, gj710, 1326000)).toBeLessThan(0.3);

    // 3. Aggregate enrichment coverage thresholds
    expect(catalog.meta.counts.full3dVelocitySystems).toBeGreaterThanOrEqual(2800);
    expect(catalog.meta.counts.brownDwarfSystems).toBeGreaterThanOrEqual(500);
    expect(catalog.meta.counts.flareStarSystems).toBeGreaterThanOrEqual(50);
    expect(catalog.meta.counts.debrisDiskSystems).toBeGreaterThanOrEqual(100);
    expect(catalog.meta.counts.jwstSpectraPlanets).toBeGreaterThanOrEqual(30);

    // 4. Specific verified astrophysical tags
    const alphaCen = catalog.systems.find((s) => s.name === 'Alpha Centauri');
    expect(alphaCen.isFlareStar).toBe(true);
    const vega = catalog.systems.find((s) => s.name === 'Vega');
    expect(vega.hasDebrisDisk).toBe(true);
    const trappist1 = catalog.systems.find((s) => s.id === 'nea-trappist-1');
    expect(trappist1.hasJwstSpectra).toBe(true);
    const trapE = trappist1.planets.find((p) => p.name === 'TRAPPIST-1 e');
    expect(trapE.hasJwstSpectrum).toBe(true);
    expect(trapE.esi).toBeGreaterThanOrEqual(0.85);
    expect(trapE.tidalLockStatus).toBe('locked');

    // 5. Sol Earth has exact ESI = 1 and free rotation
    const earth = sol.planets.find((p) => p.name === 'Earth');
    expect(earth.esi).toBe(1);
    expect(earth.tidalLockStatus).toBe('free');
  });
});

