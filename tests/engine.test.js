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
import { solveSignalToShip, computeShipTransmission } from '../src/engine/commLightCone.js';
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

    // Verify Groombridge 1618 alias on GJ 380, Alien on Zeta Reticuli, and Tau Ceti Wikipedia hits
    expect(scifi.bySystemId['hip-49908'].aliases).toContain('Groombridge 1618');
    expect(scifi.bySystemId['hip-15371'].universes).toContain('Alien');
    const tau = scifi.bySystemId['hip-8102'];
    expect(tau.notableWorks.some((w) => w.title.includes('Project Hail Mary'))).toBe(true);
    expect(tau.wikiWorks.length).toBeGreaterThan(10);
  });
});

