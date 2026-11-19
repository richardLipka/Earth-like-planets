#!/usr/bin/env node
/**
 * Builds public/data/astrometrics_catalog.json from primary astronomical catalogues:
 *
 *  1. Astronexus HYG Stellar Database v3.8 (Hipparcos + Yale Bright Star + Gliese/CNS3):
 *     3D Cartesian coordinates (x,y,z), 3D velocity vectors (vx,vy,vz), proper motions,
 *     radial velocities, V magnitudes, B-V color indices, spectral types, Bayer/Flamsteed
 *     and proper names, and multiple-star system memberships (comp_primary).
 *  2. NASA Exoplanet Archive TAP API (pscomppars):
 *     Confirmed exoplanets, orbital parameters (semi-major axis, period, eccentricity),
 *     radii, masses, equilibrium temperatures, discovery year/method, peer-reviewed
 *     discovery reference links (NASA ADS bibcodes), cross-catalogue identifiers
 *     (HIP, HD, Gaia DR3, TIC), and Gaia DR3 astrometry (ra, dec, sy_dist, sy_plx,
 *     sy_pmra, sy_pmdec, st_radv).
 *  3. Pecaut & Mamajek (2013 / v2022.04.16) empirical dwarf sequence &
 *     Flower (1996) / Torres (2010) Teff and bolometric correction calibrations.
 *  4. Kopparapu et al. (2014, ApJL 787, L29) circumstellar Habitable Zone flux limits
 *     (Recent Venus, Runaway Greenhouse, Maximum Greenhouse, Early Mars).
 *
 * Usage:
 *   node scripts/buildAstrometricsData.mjs [--radius 105] [--hz-radius 135] [--close-volume 35]
 *     [--mag-limit 8.5] [--refresh | --refresh-planets | --refresh-stars]
 *     [--respect-ttl] [--offline]
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import {
  getNumArg,
  readJsonIfExists,
  writeFileAtomic,
  writeJsonAtomic,
  isCacheFresh,
  fileAgeDays,
  fetchWithRetry,
  createSpatialGrid,
} from './lib/ioUtils.mjs';
import { computeESI, computeTidalLocking } from '../src/engine/exoplanetMetrics.js';
import {
  createSkyGrid,
  indexGaiaDr3,
  matchSystemToGaia,
  indexCns5,
  matchSystemToCns5,
  indexNeaSpectra,
  indexGcvsActivity,
  indexDebrisDisks,
  processUltracoolCatalogs,
} from './lib/enrichment.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CACHE = path.join(__dirname, '.cache');
const OUT_DIR = path.join(ROOT, 'public', 'data');
const CONFIG_PATH = path.join(__dirname, 'config', 'database.config.json');

const CONFIG = readJsonIfExists(CONFIG_PATH, {}) || {};
const argv = process.argv.slice(2);

const REFRESH_ALL = argv.includes('--refresh') || argv.includes('--force');
const REFRESH_PLANETS = REFRESH_ALL || argv.includes('--refresh-planets');
const REFRESH_STARS = REFRESH_ALL || argv.includes('--refresh-stars');
const REFRESH_GAIA = REFRESH_STARS || argv.includes('--refresh-gaia');
const REFRESH_ULTRACOOL = REFRESH_STARS || argv.includes('--refresh-ultracool');
const REFRESH_SPECTRA = REFRESH_PLANETS || argv.includes('--refresh-spectra');
const REFRESH_ACTIVITY = REFRESH_STARS || argv.includes('--refresh-activity');
const RESPECT_TTL = argv.includes('--respect-ttl');
const OFFLINE = argv.includes('--offline');

const MAX_RADIUS_LY = getNumArg(argv, '--radius', Number(CONFIG.radiusLy) || 105);
const DEFAULT_HZ_RADIUS = Math.max(
  Number(CONFIG.minExtendedHzRadiusLy) || 135,
  MAX_RADIUS_LY + (Number(CONFIG.extendedHzMarginLy) || 30)
);
const EXTENDED_HZ_RADIUS_LY = Math.max(
  MAX_RADIUS_LY,
  getNumArg(argv, '--hz-radius', DEFAULT_HZ_RADIUS)
);
const CLOSE_VOLUME_LY = getNumArg(argv, '--close-volume', Number(CONFIG.closeVolumeLy) || 35);
const EXTENDED_MAG_LIMIT = getNumArg(argv, '--mag-limit', Number(CONFIG.extendedMagLimit) || 8.5);
const MERGE_LY = Number(CONFIG.mergeLy) || 0.28; // Merge binary/trinary star components closer than 0.28 ly

const LY_PER_PC = 3.261563777;
const T_SUN = 5772; // IAU 2015 Resolution B3
const MBOL_SUN_IAU = 4.74;
const MBOL_SUN_FLOWER = 4.73;

// Dynamic parsec cutoff for NASA Exoplanet Archive TAP query so expanding --radius fetches ALL exoplanets!
const NEA_MAX_PC = Math.max(45, Math.ceil(EXTENDED_HZ_RADIUS_LY / LY_PER_PC) + 2);
const NEA_CACHE_FILE =
  NEA_MAX_PC === 45 ? 'nea_pscomppars_nearby.json' : `nea_pscomppars_max_${NEA_MAX_PC}pc.json`;

// Equatorial (J2000) to Galactic rotation matrix:
// Galactic +X -> Galactic Center, +Y -> Galactic Rotation, +Z -> North Galactic Pole
const EQ_TO_GAL = [
  [-0.0548755604, -0.8734370902, -0.4838350155],
  [0.4941094279, -0.4448296300, 0.7469822445],
  [-0.8676661490, -0.1980763734, 0.4559837762],
];

function toGalactic(x, y, z) {
  return [
    EQ_TO_GAL[0][0] * x + EQ_TO_GAL[0][1] * y + EQ_TO_GAL[0][2] * z,
    EQ_TO_GAL[1][0] * x + EQ_TO_GAL[1][1] * y + EQ_TO_GAL[1][2] * z,
    EQ_TO_GAL[2][0] * x + EQ_TO_GAL[2][1] * y + EQ_TO_GAL[2][2] * z,
  ];
}

/**
 * Convert (RA deg, Dec deg, Distance pc) and (pmRA mas/yr, pmDec mas/yr, RV km/s)
 * to Equatorial J2000 Cartesian position (pc) and velocity (pc/yr), then rotate to Galactic (ly, ly/kyr).
 */
function astrometryToGalactic({ raDeg, decDeg, distPc, pmRaMasYr = 0, pmDecMasYr = 0, rvKmS = 0 }) {
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const cosRa = Math.cos(ra);
  const sinRa = Math.sin(ra);
  const cosDec = Math.cos(dec);
  const sinDec = Math.sin(dec);

  const xEqPc = distPc * cosDec * cosRa;
  const yEqPc = distPc * cosDec * sinRa;
  const zEqPc = distPc * sinDec;

  // Tangential velocities in km/s: v_t = 4.74047 * (mu [arcsec/yr]) * d [pc]
  const K = 4.740470446;
  const vRaKmS = K * (pmRaMasYr / 1000) * distPc;
  const vDecKmS = K * (pmDecMasYr / 1000) * distPc;
  const vr = Number.isFinite(rvKmS) ? rvKmS : 0;

  // Unit vectors in equatorial coordinates:
  // r_hat = (cosDec cosRa, cosDec sinRa, sinDec)
  // ra_hat = (-sinRa, cosRa, 0)
  // dec_hat = (-sinDec cosRa, -sinDec sinRa, cosDec)
  const vxKmS = vr * cosDec * cosRa - vRaKmS * sinRa - vDecKmS * sinDec * cosRa;
  const vyKmS = vr * cosDec * sinRa + vRaKmS * cosRa - vDecKmS * sinDec * sinRa;
  const vzKmS = vr * sinDec + vDecKmS * cosDec;

  // 1 km/s = 0.001022712165 pc/kyr = 0.00333564095 ly/kyr
  const KM_S_TO_LY_KYR = 0.00333564095;
  const posGalLy = toGalactic(xEqPc, yEqPc, zEqPc).map((v) => v * LY_PER_PC);
  const velGalLyKyr = toGalactic(vxKmS, vyKmS, vzKmS).map((v) => v * KM_S_TO_LY_KYR);

  return { posGalLy, velGalLyKyr };
}

const NEA_ADQL = [
  'select pl_name,hostname,hip_name,hd_name,gaia_dr3_id,tic_id,',
  'sy_dist,sy_plx,ra,dec,sy_pmra,sy_pmdec,st_radv,sy_vmag,',
  'st_teff,st_lum,st_rad,st_mass,st_spectype,',
  'pl_orbsmax,pl_orbper,pl_orbeccen,pl_rade,pl_bmasse,pl_eqt,pl_insol,',
  'disc_year,discoverymethod,disc_refname',
  'from pscomppars',
  `where sy_dist is not null and sy_dist <= ${NEA_MAX_PC}`,
].join(' ');

const NEA_TAP_BASE =
  CONFIG.sources?.neaTapBaseUrl || 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync';
const GAIA_TAP_BASE =
  CONFIG.sources?.gaiaTapBaseUrl || 'https://gea.esac.esa.int/tap-server/tap/sync';
const VIZIER_ASU_BASE =
  CONFIG.sources?.vizierAsuBaseUrl || 'https://vizier.cfa.harvard.edu/viz-bin/asu-tsv';

const NEA_SPECTRA_ADQL =
  'select pl_name,spec_type,facility,instrument,num_datapoints,minwavelng,maxwavelng,bibcode from spectra';

// Dynamic Gaia DR3 parallax thresholds covering the active sphere radius (+3 pc margin for Hipparcos error)
const GAIA_CORE_MAX_PC = Math.min(36, Math.ceil(MAX_RADIUS_LY / LY_PER_PC) + 3);
const GAIA_CORE_MIN_PLX = Math.max(27, Math.floor(1000 / GAIA_CORE_MAX_PC));
const GAIA_EXT_MAX_PC = Math.ceil(EXTENDED_HZ_RADIUS_LY / LY_PER_PC) + 3;
const GAIA_EXT_MIN_PLX = Math.max(5, Math.floor(1000 / GAIA_EXT_MAX_PC));

const GAIA_CORE_ADQL = [
  'SELECT source_id, ra, dec, parallax, parallax_over_error, pmra, pmdec,',
  'radial_velocity, mh_gspphot, ruwe, non_single_star, phot_g_mean_mag',
  'FROM gaiadr3.gaia_source',
  `WHERE parallax > ${GAIA_CORE_MIN_PLX} AND parallax_over_error > 5`,
].join(' ');

const GAIA_EXT_ADQL = [
  'SELECT TOP 100000 source_id, ra, dec, parallax, parallax_over_error, pmra, pmdec,',
  'radial_velocity, mh_gspphot, ruwe, non_single_star, phot_g_mean_mag',
  'FROM gaiadr3.gaia_source',
  `WHERE parallax > ${GAIA_EXT_MIN_PLX} AND parallax <= ${GAIA_CORE_MIN_PLX}`,
  'AND parallax_over_error > 5 AND (radial_velocity IS NOT NULL OR phot_g_mean_mag < 10.5)',
].join(' ');

const SOURCES = {
  hyg: {
    file: 'hyg_v38.csv.gz',
    url:
      CONFIG.sources?.hygUrl ||
      'https://raw.githubusercontent.com/astronexus/HYG-Database/master/hyg/v3/hyg_v38.csv.gz',
    forceRefresh: REFRESH_STARS,
    ttlDays: Number(CONFIG.cacheMaxAgeDays?.stars) || 180,
  },
  mamajek: {
    file: 'EEM_dwarf_UBVIJHK_colors_Teff.txt',
    url:
      CONFIG.sources?.mamajekUrl ||
      'https://www.pas.rochester.edu/~emamajek/EEM_dwarf_UBVIJHK_colors_Teff.txt',
    forceRefresh: REFRESH_STARS,
    ttlDays: Number(CONFIG.cacheMaxAgeDays?.calibration) || 90,
  },
  nea: {
    file: NEA_CACHE_FILE,
    url: `${NEA_TAP_BASE}?query=${encodeURIComponent(NEA_ADQL)}&format=json`,
    forceRefresh: REFRESH_PLANETS,
    ttlDays: Number(CONFIG.cacheMaxAgeDays?.planets) || 7,
    validateJson: true,
  },
  neaSpectra: {
    file: 'nea_spectra.json',
    url: `${NEA_TAP_BASE}?query=${encodeURIComponent(NEA_SPECTRA_ADQL)}&format=json`,
    forceRefresh: REFRESH_SPECTRA,
    ttlDays: Number(CONFIG.cacheMaxAgeDays?.spectra) || 7,
    validateJson: true,
    optional: true,
  },
  gaiaCore: {
    file: `gaia_dr3_plx_${GAIA_CORE_MIN_PLX}.json`,
    url: `${GAIA_TAP_BASE}?request=doQuery&lang=adql&format=json&query=${encodeURIComponent(GAIA_CORE_ADQL)}`,
    forceRefresh: REFRESH_GAIA,
    ttlDays: Number(CONFIG.cacheMaxAgeDays?.gaia) || 180,
    validateJson: true,
    optional: true,
  },
  gaiaExt: {
    file: `gaia_dr3_ext_${GAIA_EXT_MIN_PLX}_${GAIA_CORE_MIN_PLX}.json`,
    url: `${GAIA_TAP_BASE}?request=doQuery&lang=adql&format=json&query=${encodeURIComponent(GAIA_EXT_ADQL)}`,
    forceRefresh: REFRESH_GAIA,
    ttlDays: Number(CONFIG.cacheMaxAgeDays?.gaia) || 180,
    validateJson: true,
    optional: true,
  },
  cns5: {
    file: 'vizier_cns5_25pc.tsv',
    url: `${VIZIER_ASU_BASE}?${new URLSearchParams({
      '-source': 'J/A+A/670/A19/cns5',
      '-out': 'CNS5,GJ,GaiaDR3,HIP,RAJ2000,DEJ2000,plx,pmRA,pmDE,RV',
      '-out.max': 'unlimited',
    })}`,
    forceRefresh: REFRESH_ULTRACOOL,
    ttlDays: Number(CONFIG.cacheMaxAgeDays?.ultracool) || 180,
    optional: true,
  },
  kirk2024: {
    file: 'vizier_kirkpatrick2024_20pc.tsv',
    url: `${VIZIER_ASU_BASE}?${new URLSearchParams({
      '-source': 'J/ApJS/271/55/table4',
      '-out':
        'Name,OName,GJ,Gaia,Plx,pmRA,pmDE,GaiaRV,SpTOpt,SpTNIR,Teff,Mass,RUWE,VarType,Const,Gmag,_RAJ2000,_DEJ2000',
      '-out.max': 'unlimited',
    })}`,
    forceRefresh: REFRESH_ULTRACOOL,
    ttlDays: Number(CONFIG.cacheMaxAgeDays?.ultracool) || 180,
    optional: true,
  },
  best2021: {
    file: 'vizier_best2021_ultracool.tsv',
    url: `${VIZIER_ASU_BASE}?${new URLSearchParams({
      '-source': 'J/AJ/161/42',
      '-out': 'Object,Dist,plx,SpT-opt,SpT-nir,_RA,_DE',
      '-out.max': 'unlimited',
    })}`,
    forceRefresh: REFRESH_ULTRACOOL,
    ttlDays: Number(CONFIG.cacheMaxAgeDays?.ultracool) || 180,
    optional: true,
  },
  gcvsUv: {
    file: 'vizier_gcvs_uv.tsv',
    url: `${VIZIER_ASU_BASE}?${new URLSearchParams({
      '-source': 'B/gcvs/gcvs_cat',
      '-out': 'GCVS,VarType,_RAJ2000,_DEJ2000',
      '-out.max': 'unlimited',
      VarType: '*UV*',
    })}`,
    forceRefresh: REFRESH_ACTIVITY,
    ttlDays: Number(CONFIG.cacheMaxAgeDays?.activity) || 90,
    optional: true,
  },
  gcvsBy: {
    file: 'vizier_gcvs_by.tsv',
    url: `${VIZIER_ASU_BASE}?${new URLSearchParams({
      '-source': 'B/gcvs/gcvs_cat',
      '-out': 'GCVS,VarType,_RAJ2000,_DEJ2000',
      '-out.max': 'unlimited',
      VarType: '*BY*',
    })}`,
    forceRefresh: REFRESH_ACTIVITY,
    ttlDays: Number(CONFIG.cacheMaxAgeDays?.activity) || 90,
    optional: true,
  },
  gcvsRs: {
    file: 'vizier_gcvs_rs.tsv',
    url: `${VIZIER_ASU_BASE}?${new URLSearchParams({
      '-source': 'B/gcvs/gcvs_cat',
      '-out': 'GCVS,VarType,_RAJ2000,_DEJ2000',
      '-out.max': 'unlimited',
      VarType: '*RS*',
    })}`,
    forceRefresh: REFRESH_ACTIVITY,
    ttlDays: Number(CONFIG.cacheMaxAgeDays?.activity) || 90,
    optional: true,
  },
  debrisCotten: {
    file: 'vizier_debris_cotten2016.tsv',
    url: `${VIZIER_ASU_BASE}?${new URLSearchParams({
      '-source': 'J/ApJS/225/15',
      '-out': 'Name,Dist,_RAJ2000,_DEJ2000',
      '-out.max': 'unlimited',
      Dist: `<${Math.max(45, NEA_MAX_PC)}`,
    })}`,
    forceRefresh: REFRESH_ACTIVITY,
    ttlDays: Number(CONFIG.cacheMaxAgeDays?.activity) || 90,
    optional: true,
  },
  debrisChen: {
    file: 'vizier_debris_chen2014.tsv',
    url: `${VIZIER_ASU_BASE}?${new URLSearchParams({
      '-source': 'J/ApJS/211/25',
      '-out': 'Name,SpType,_RA,_DE',
      '-out.max': 'unlimited',
    })}`,
    forceRefresh: REFRESH_ACTIVITY,
    ttlDays: Number(CONFIG.cacheMaxAgeDays?.activity) || 90,
    optional: true,
  },
};

/**
 * If a larger cached NASA pscomppars file already exists (e.g. max_100pc) and is usable,
 * we can reuse it when building a smaller sphere in offline or non-refresh mode.
 */
function findCoveringNeaCache(minPc) {
  if (!fs.existsSync(CACHE)) return null;
  let best = null;
  for (const name of fs.readdirSync(CACHE)) {
    let pc = null;
    if (name === 'nea_pscomppars_nearby.json') pc = 45;
    else {
      const m = /^nea_pscomppars_max_(\d+)pc\.json$/.exec(name);
      if (m) pc = Number(m[1]);
    }
    if (pc !== null && pc >= minPc) {
      const fullPath = path.join(CACHE, name);
      if (!best || fileAgeDays(fullPath) < fileAgeDays(best.fullPath)) {
        best = { file: name, fullPath, pc };
      }
    }
  }
  return best;
}

async function fetchOrCache(key) {
  const { file, url, forceRefresh, ttlDays, validateJson, optional } = SOURCES[key];
  let target = path.join(CACHE, file);

  // For NASA exoplanets, check if a larger radius cache already covers this request
  if (key === 'nea' && !fs.existsSync(target) && !forceRefresh) {
    const covering = findCoveringNeaCache(NEA_MAX_PC);
    if (covering && (!RESPECT_TTL || isCacheFresh(covering.fullPath, ttlDays) || OFFLINE)) {
      console.log(
        `[DATA] Reusing cached ${covering.file} (covers <= ${covering.pc} pc, age ${fileAgeDays(covering.fullPath).toFixed(1)}d)`
      );
      return fs.readFileSync(covering.fullPath, 'utf8');
    }
  }

  const exists = fs.existsSync(target);
  const expired = RESPECT_TTL && !isCacheFresh(target, ttlDays);
  const shouldDownload = !OFFLINE && (!exists || forceRefresh || expired);

  if (OFFLINE && !exists) {
    if (optional) {
      console.warn(`[DATA] Offline: optional cache ${file} missing — skipping ${key}.`);
      return null;
    }
    throw new Error(
      `Offline mode requested, but cache file ${file} is missing in ${CACHE}. Run without --offline first.`
    );
  }

  if (shouldDownload) {
    fs.mkdirSync(CACHE, { recursive: true });
    const reason = !exists ? 'missing' : forceRefresh ? 'forced refresh' : `cache > ${ttlDays}d`;
    console.log(`[DATA] Downloading ${key} (${reason})...`);
    try {
      const res = await fetchWithRetry(url, { label: key, timeoutMs: 75000, retries: 3 });
      const buf = Buffer.from(await res.arrayBuffer());
      if (validateJson) {
        const parsed = JSON.parse(buf.toString('utf8'));
        const rows = Array.isArray(parsed) ? parsed : parsed.data || parsed.value || [];
        if (key === 'nea' && rows.length === 0) {
          throw new Error('NASA Exoplanet Archive returned 0 rows');
        }
      }
      writeFileAtomic(target, buf);
    } catch (err) {
      if (exists) {
        console.warn(
          `[DATA] Warning: Download failed for ${key} (${err.message}). Falling back to existing cached ${file}.`
        );
      } else if (optional) {
        console.warn(`[DATA] Warning: Optional source ${key} unavailable (${err.message}). Continuing without it.`);
        return null;
      } else {
        throw err;
      }
    }
  } else {
    const ageStr = exists ? `${fileAgeDays(target).toFixed(1)}d old` : 'cached';
    console.log(`[DATA] Using cached ${file} (${ageStr})`);
  }

  const buf = fs.readFileSync(target);
  return file.endsWith('.gz') ? zlib.gunzipSync(buf).toString('utf8') : buf.toString('utf8');
}

function splitCsvLine(line) {
  const cols = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === ',' && !quoted) {
      cols.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cols.push(cur);
  return cols;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const row = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = (cols[j] ?? '').trim();
    }
    out.push(row);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Astrophysical Calibrations (Flower 1996 / Torres 2010 / Pecaut & Mamajek 2013)
// ---------------------------------------------------------------------------

const FLOWER_BC = [
  [-0.190537291496456e5, 0.155144866764412e5, -0.421278819301717e4, 0.381476328422343e3],
  [-0.370510203809015e5, 0.385672629965804e5, -0.150651486316025e5, 0.261724637119416e4, -0.170623810323864e3],
  [-0.118115450538963e6, 0.137145973583929e6, -0.636233812100225e5, 0.147412923562646e5, -0.170587278406872e4, 0.788731721804990e2],
];
const FLOWER_TEFF_MS_GIANT = [
  3.979145106714099, -0.654992268598245, 1.740690042385095, -4.608815154057166,
  6.792599779944473, -5.396909891322525, 2.192970376522490, -0.359495739295671,
];
const FLOWER_TEFF_SUPERGIANT = [
  4.012559732366214, -1.055043117465989, 2.133394538571825, -2.459769794654992,
  1.349423943497744, -0.283942579112032,
];

const poly = (c, x) => c.reduce((s, a, i) => s + a * x ** i, 0);
const flowerBC = (teff) => {
  const x = Math.log10(teff);
  return poly(x < 3.7 ? FLOWER_BC[0] : x < 3.9 ? FLOWER_BC[1] : FLOWER_BC[2], x);
};
const flowerTeff = (bv, supergiant) =>
  10 **
  (supergiant
    ? poly(FLOWER_TEFF_SUPERGIANT, Math.min(1.7, Math.max(-0.3, bv)))
    : poly(FLOWER_TEFF_MS_GIANT, Math.min(1.65, Math.max(-0.3, bv))));

const LETTERS = 'OBAFGKM';
const spCode = (letter, sub) => LETTERS.indexOf(letter) * 10 + sub;

function parseMamajek(text) {
  const rows = [];
  const seen = new Set();
  for (const line of text.split(/\r?\n/)) {
    const p = line.trim().split(/\s+/);
    const m = /^([OBAFGKM])(\d(?:\.\d+)?)V$/.exec(p[0]);
    if (!m || seen.has(p[0])) continue;
    seen.add(p[0]);
    const num = (v) => (v === undefined || /^\.+$/.test(v) ? null : Number(v));
    rows.push({
      code: spCode(m[1], Number(m[2])),
      teff: num(p[1]),
      bc: num(p[3]),
      mv: num(p[7]),
      bv: num(p[8]),
    });
  }
  return rows.sort((a, b) => a.code - b.code);
}

function interp(rows, xKey, yKey, x) {
  const pts = rows.filter((r) => r[xKey] !== null && r[yKey] !== null).sort((a, b) => a[xKey] - b[xKey]);
  if (!pts.length) return null;
  if (x <= pts[0][xKey]) return pts[0][yKey];
  if (x >= pts[pts.length - 1][xKey]) return pts[pts.length - 1][yKey];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i],
      b = pts[i + 1];
    if (x >= a[xKey] && x <= b[xKey]) {
      const t = (x - a[xKey]) / (b[xKey] - a[xKey] || 1);
      return a[yKey] + t * (b[yKey] - a[yKey]);
    }
  }
  return null;
}

function parseSpectralType(spect) {
  const s = (spect || '').trim();
  if (/^D[ABOQZCX]?/i.test(s) || /^WD/i.test(s)) return { letter: 'D', sub: 5, lumClass: 'D' };
  const m = /([OBAFGKM])(\d(?:\.\d+)?)?/i.exec(s);
  if (!m) return { letter: null, sub: 5, lumClass: null };
  const letter = m[1].toUpperCase();
  const sub = m[2] !== undefined ? Number(m[2]) : 5;
  const rest = s.slice(m.index + m[0].length);
  const lc = /(Ia0|Iab|Ia|Ib|III|II|IV|VI|V|I)/i.exec(rest);
  let lumClass = null;
  if (lc) {
    const v = lc[1];
    lumClass = v.startsWith('I') && !['II', 'III', 'IV'].includes(v) ? 'I' : v === 'VI' ? 'V' : v;
  }
  if (/^sd/i.test(s)) lumClass = 'V';
  return { letter, sub, lumClass };
}

const M_GIANT_TEFF = [3895, 3810, 3730, 3640, 3560, 3420, 3250, 3080, 2900];
const mGiantTeff = (sub) => {
  const i = Math.max(0, Math.min(M_GIANT_TEFF.length - 1, sub));
  const lo = Math.floor(i),
    hi = Math.min(M_GIANT_TEFF.length - 1, lo + 1);
  return M_GIANT_TEFF[lo] + (i - lo) * (M_GIANT_TEFF[hi] - M_GIANT_TEFF[lo]);
};

function msMassFromLum(lum) {
  if (lum < 0.23 * 0.43 ** 2.3) return (lum / 0.23) ** (1 / 2.3);
  if (lum < 16) return lum ** 0.25;
  return (lum / 1.4) ** (1 / 3.5);
}

function computeStarParameters({ spect, bv, mv, hygLum }, mamajek) {
  const sp = parseSpectralType(spect);
  if (sp.letter === 'D') {
    const teff = bv !== null && Number.isFinite(bv) ? Math.round(Math.max(4000, Math.min(35000, 10000 / (bv + 0.6)))) : 8500;
    const lum = Number.isFinite(hygLum) && hygLum > 0 ? hygLum : 0.0005;
    const radius = Math.sqrt(lum) * (T_SUN / teff) ** 2;
    return { teff, lum, radius, mass: 0.6, lumClass: 'D', cls: 'D' };
  }

  let letter = sp.letter;
  let sub = sp.sub ?? 5;
  if (!letter || !LETTERS.includes(letter)) {
    if (bv !== null && Number.isFinite(bv)) {
      const tEst = interp(mamajek, 'bv', 'teff', bv) || 5000;
      letter = tEst > 10000 ? 'B' : tEst > 7500 ? 'A' : tEst > 6000 ? 'F' : tEst > 5200 ? 'G' : tEst > 3700 ? 'K' : 'M';
    } else {
      letter = mv > 8 ? 'M' : mv > 5.5 ? 'K' : 'G';
    }
  }

  const code = spCode(letter, sub);
  const spTeff = interp(mamajek, 'code', 'teff', code) || 5000;
  let lumClass = sp.lumClass;

  const calcTeff = (cls) => {
    const giant = cls === 'I' || cls === 'II' || cls === 'III';
    if (letter === 'O' || letter === 'B') return spTeff;
    if (letter === 'M') return giant ? mGiantTeff(sub) : spTeff;
    if (bv === null || !Number.isFinite(bv)) return spTeff;
    if (cls === 'I' || cls === 'II') return letter === 'A' ? spTeff : flowerTeff(bv, true);
    if (cls === 'III') return flowerTeff(bv, false);
    return interp(mamajek, 'bv', 'teff', bv) || spTeff;
  };

  let teff = calcTeff(lumClass);
  if (!lumClass) {
    const msMv = interp(mamajek, 'teff', 'mv', teff) ?? 5;
    const excess = msMv - (Number.isFinite(mv) ? mv : msMv);
    lumClass = excess < 1.0 || mv > 4.5 ? 'V' : excess < 2.0 ? 'IV' : mv < -4 ? 'I' : 'III';
    teff = calcTeff(lumClass);
  }

  const dwarf = lumClass === 'V' || lumClass === 'IV';
  const bcv = (dwarf ? interp(mamajek, 'teff', 'bc', teff) : flowerBC(teff)) ?? 0;
  const mbolSun = dwarf ? MBOL_SUN_IAU : MBOL_SUN_FLOWER;
  const lum = Number.isFinite(mv) ? 10 ** (-0.4 * (mv + bcv - mbolSun)) : hygLum || 1;
  const radius = Math.sqrt(lum) * (T_SUN / teff) ** 2;
  const mass = lumClass === 'V' ? msMassFromLum(lum) : null;

  return { teff: Math.round(teff), lum, radius, mass, lumClass, cls: letter };
}

// ---------------------------------------------------------------------------
// Kopparapu et al. (2014) Habitable Zone Limits
// ---------------------------------------------------------------------------

function getKopparapuHZ(lumSolar, tempK) {
  const lum = Math.max(1e-7, lumSolar || 1.0);
  const rawTemp = tempK || 5772;
  const temp = Math.max(2600, Math.min(7200, rawTemp));
  const t = temp - 5780;
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;

  const seff = (s0, a, b, c, d) => s0 + a * t + b * t2 + c * t3 + d * t4;
  const sRecentVenus = seff(1.776, 2.136e-4, 2.533e-8, -1.332e-11, -3.097e-15);
  const sRunawayGreenhouse = seff(1.107, 1.332e-4, 1.580e-8, -8.308e-12, -1.931e-15);
  const sMaximumGreenhouse = seff(0.356, 6.171e-5, 1.698e-9, -3.198e-12, -5.575e-16);
  const sEarlyMars = seff(0.320, 5.547e-5, 1.526e-9, -2.874e-12, -5.011e-16);

  const r = (x) => Number(x.toPrecision(4));
  return {
    recentVenusAU: r(Math.sqrt(lum / sRecentVenus)),
    runawayGreenhouseAU: r(Math.sqrt(lum / sRunawayGreenhouse)),
    earthEquivAU: r(Math.sqrt(lum)),
    maximumGreenhouseAU: r(Math.sqrt(lum / sMaximumGreenhouse)),
    earlyMarsAU: r(Math.sqrt(lum / sEarlyMars)),
    extrapolated: rawTemp < 2600 || rawTemp > 7200,
  };
}

// ---------------------------------------------------------------------------
// Star Designation Formatting
// ---------------------------------------------------------------------------

const GENITIVE = {
  And: 'Andromedae', Ant: 'Antliae', Aps: 'Apodis', Aqr: 'Aquarii', Aql: 'Aquilae', Ara: 'Arae', Ari: 'Arietis',
  Aur: 'Aurigae', Boo: 'Bootis', Cae: 'Caeli', Cam: 'Camelopardalis', Cnc: 'Cancri', CVn: 'Canum Venaticorum',
  CMa: 'Canis Majoris', CMi: 'Canis Minoris', Cap: 'Capricorni', Car: 'Carinae', Cas: 'Cassiopeiae', Cen: 'Centauri',
  Cep: 'Cephei', Cet: 'Ceti', Cha: 'Chamaeleontis', Cir: 'Circini', Col: 'Columbae', Com: 'Comae Berenices',
  CrA: 'Coronae Australis', CrB: 'Coronae Borealis', Crv: 'Corvi', Crt: 'Crateris', Cru: 'Crucis', Cyg: 'Cygni',
  Del: 'Delphini', Dor: 'Doradus', Dra: 'Draconis', Equ: 'Equulei', Eri: 'Eridani', For: 'Fornacis', Gem: 'Geminorum',
  Gru: 'Gruis', Her: 'Herculis', Hor: 'Horologii', Hya: 'Hydrae', Hyi: 'Hydri', Ind: 'Indi', Lac: 'Lacertae',
  Leo: 'Leonis', LMi: 'Leonis Minoris', Lep: 'Leporis', Lib: 'Librae', Lup: 'Lupi', Lyn: 'Lyncis', Lyr: 'Lyrae',
  Men: 'Mensae', Mic: 'Microscopii', Mon: 'Monocerotis', Mus: 'Muscae', Nor: 'Normae', Oct: 'Octantis',
  Oph: 'Ophiuchi', Ori: 'Orionis', Pav: 'Pavonis', Peg: 'Pegasi', Per: 'Persei', Phe: 'Phoenicis', Pic: 'Pictoris',
  Psc: 'Piscium', PsA: 'Piscis Austrini', Pup: 'Puppis', Pyx: 'Pyxidis', Ret: 'Reticuli', Sge: 'Sagittae',
  Sgr: 'Sagittarii', Sco: 'Scorpii', Scl: 'Sculptoris', Sct: 'Scuti', Ser: 'Serpentis', Sex: 'Sextantis', Tau: 'Tauri',
  Tel: 'Telescopii', Tri: 'Trianguli', TrA: 'Trianguli Australis', Tuc: 'Tucanae', UMa: 'Ursae Majoris',
  UMi: 'Ursae Minoris', Vel: 'Velorum', Vir: 'Virginis', Vol: 'Volantis', Vul: 'Vulpeculae',
};

const CONSTELLATION_NOM = {
  And: 'Andromeda', Ant: 'Antlia', Aps: 'Apus', Aqr: 'Aquarius', Aql: 'Aquila', Ara: 'Ara', Ari: 'Aries',
  Aur: 'Auriga', Boo: 'Boötes', Cae: 'Caelum', Cam: 'Camelopardalis', Cnc: 'Cancer', CVn: 'Canes Venatici',
  CMa: 'Canis Major', CMi: 'Canis Minor', Cap: 'Capricornus', Car: 'Carina', Cas: 'Cassiopeia', Cen: 'Centaurus',
  Cep: 'Cepheus', Cet: 'Cetus', Cha: 'Chamaeleon', Cir: 'Circinus', Col: 'Columba', Com: 'Coma Berenices',
  CrA: 'Corona Australis', CrB: 'Corona Borealis', Crv: 'Corvus', Crt: 'Crater', Cru: 'Crux', Cyg: 'Cygnus',
  Del: 'Delphinus', Dor: 'Dorado', Dra: 'Draco', Equ: 'Equuleus', Eri: 'Eridanus', For: 'Fornax', Gem: 'Gemini',
  Gru: 'Grus', Her: 'Hercules', Hor: 'Horologium', Hya: 'Hydra', Hyi: 'Hydrus', Ind: 'Indus', Lac: 'Lacerta',
  Leo: 'Leo', LMi: 'Leo Minor', Lep: 'Lepus', Lib: 'Libra', Lup: 'Lupus', Lyn: 'Lynx', Lyr: 'Lyra', Men: 'Mensa',
  Mic: 'Microscopium', Mon: 'Monoceros', Mus: 'Musca', Nor: 'Norma', Oct: 'Octans', Oph: 'Ophiuchus', Ori: 'Orion',
  Pav: 'Pavo', Peg: 'Pegasus', Per: 'Perseus', Phe: 'Phoenix', Pic: 'Pictor', Psc: 'Pisces', PsA: 'Piscis Austrinus',
  Pup: 'Puppis', Pyx: 'Pyxis', Ret: 'Reticulum', Sge: 'Sagitta', Sgr: 'Sagittarius', Sco: 'Scorpius', Scl: 'Sculptor',
  Sct: 'Scutum', Ser: 'Serpens', Sex: 'Sextans', Tau: 'Taurus', Tel: 'Telescopium', Tri: 'Triangulum',
  TrA: 'Triangulum Australe', Tuc: 'Tucana', UMa: 'Ursa Major', UMi: 'Ursa Minor', Vel: 'Vela', Vir: 'Virgo',
  Vol: 'Volans', Vul: 'Vulpecula',
};

const GREEK = {
  Alp: 'Alpha', Bet: 'Beta', Gam: 'Gamma', Del: 'Delta', Eps: 'Epsilon', Zet: 'Zeta', Eta: 'Eta', The: 'Theta',
  Iot: 'Iota', Kap: 'Kappa', Lam: 'Lambda', Mu: 'Mu', Nu: 'Nu', Xi: 'Xi', Omi: 'Omicron', Pi: 'Pi', Rho: 'Rho',
  Sig: 'Sigma', Tau: 'Tau', Ups: 'Upsilon', Phi: 'Phi', Chi: 'Chi', Psi: 'Psi', Ome: 'Omega',
};

const SYSTEM_NAME_OVERRIDES = {
  'Rigil Kentaurus': 'Alpha Centauri',
  Ran: 'Epsilon Eridani',
  Keid: '40 Eridani',
  Toliman: 'Alpha Centauri B',
};

const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
const round = (x, d = 3) => Math.round(x * 10 ** d) / 10 ** d;
const sig = (x, n = 4) => (x === null || x === undefined || !Number.isFinite(x) ? null : Number(x.toPrecision(n)));

function formatStarName(r) {
  if (r.proper) return clean(r.proper);
  if (r.bayer && r.con) {
    const [letter, idx] = r.bayer.split('-');
    return `${GREEK[letter] ?? letter}${idx ? `-${idx}` : ''} ${GENITIVE[r.con] ?? r.con}`;
  }
  if (r.flam && r.con) return `${r.flam} ${GENITIVE[r.con] ?? r.con}`;
  if (r.gl) return `GJ ${clean(r.gl).replace(/^(Gl|GJ|NN|Wo)\s*/i, '')}`;
  if (r.hip) return `HIP ${r.hip}`;
  if (r.hd) return `HD ${r.hd}`;
  return `HYG ${r.id}`;
}

function parseNeaRefLink(htmlStr) {
  if (!htmlStr) return { citation: null, url: null };
  const hrefMatch = /href=([^\s>]+)/i.exec(htmlStr);
  const textMatch = />([^<]+)</.exec(htmlStr);
  return {
    citation: textMatch ? textMatch[1].trim() : clean(htmlStr.replace(/<[^>]+>/g, '')),
    url: hrefMatch ? hrefMatch[1].replace(/^["']|["']$/g, '') : null,
  };
}

function normalizeHostKey(str) {
  return clean(str)
    .toLowerCase()
    .replace(/^gliese\s+/i, 'gj ')
    .replace(/^gl\s+/i, 'gj ')
    .replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------------------
// Main Pipeline
// ---------------------------------------------------------------------------

async function main() {
  const [
    hygText,
    mamText,
    neaJsonText,
    neaSpectraText,
    gaiaCoreText,
    gaiaExtText,
    cns5Text,
    kirk2024Text,
    best2021Text,
    gcvsUvText,
    gcvsByText,
    gcvsRsText,
    debrisCottenText,
    debrisChenText,
  ] = await Promise.all([
    fetchOrCache('hyg'),
    fetchOrCache('mamajek'),
    fetchOrCache('nea'),
    fetchOrCache('neaSpectra'),
    fetchOrCache('gaiaCore'),
    GAIA_EXT_MIN_PLX < GAIA_CORE_MIN_PLX ? fetchOrCache('gaiaExt') : Promise.resolve(null),
    fetchOrCache('cns5'),
    fetchOrCache('kirk2024'),
    fetchOrCache('best2021'),
    fetchOrCache('gcvsUv'),
    fetchOrCache('gcvsBy'),
    fetchOrCache('gcvsRs'),
    fetchOrCache('debrisCotten'),
    fetchOrCache('debrisChen'),
  ]);

  const mamajek = parseMamajek(mamText);
  const hygRows = parseCsv(hygText);
  const neaRaw = JSON.parse(neaJsonText);
  const neaRows = Array.isArray(neaRaw) ? neaRaw : neaRaw.value || [];

  console.log(`[DATA] Loaded ${hygRows.length} HYG stars and ${neaRows.length} nearby NASA exoplanet records.`);

  // 1. Index NASA Exoplanets by host star
  const neaHostsMap = new Map();
  const hostByHip = new Map();
  const hostByHd = new Map();
  const hostByNormName = new Map();

  for (const r of neaRows) {
    const distLy = Number(r.sy_dist) * LY_PER_PC;
    if (!Number.isFinite(distLy) || distLy <= 0) continue;

    // Temporary prelim HZ calculation to check if beyond 105 ly it's a habitable zone system
    const teff = Number(r.st_teff) || 5772;
    let lum = r.st_lum !== null && r.st_lum !== undefined && r.st_lum !== '' ? 10 ** Number(r.st_lum) : null;
    if ((!lum || !Number.isFinite(lum) || lum <= 0) && r.st_rad) {
      lum = Number(r.st_rad) ** 2 * (teff / T_SUN) ** 4;
    }
    if (!lum || !Number.isFinite(lum) || lum <= 0) {
      lum = (teff / T_SUN) ** 4;
    }
    const hz = getKopparapuHZ(lum, teff);
    let a = r.pl_orbsmax !== null && r.pl_orbsmax !== undefined ? Number(r.pl_orbsmax) : null;
    if ((!a || a <= 0) && r.pl_orbper && Number(r.pl_orbper) > 0) {
      const mStar = r.st_mass && Number(r.st_mass) > 0 ? Number(r.st_mass) : msMassFromLum(lum) || 1.0;
      a = Math.cbrt(mStar * (Number(r.pl_orbper) / 365.25) ** 2);
    }
    let hzStatus = 0; // 2 = Conservative HZ, 1 = Optimistic HZ, 0 = Outside
    if (a && a > 0) {
      if (a >= hz.runawayGreenhouseAU && a <= hz.maximumGreenhouseAU) hzStatus = 2;
      else if (a >= hz.recentVenusAU && a <= hz.earlyMarsAU) hzStatus = 1;
    }

    // Filter: keep all exoplanet systems within MAX_RADIUS_LY (105 ly), plus HZ systems up to EXTENDED_HZ_RADIUS_LY (135 ly)
    if (distLy > MAX_RADIUS_LY && !(hzStatus > 0 && distLy <= EXTENDED_HZ_RADIUS_LY)) {
      continue;
    }

    const hostname = clean(r.hostname);
    if (!neaHostsMap.has(hostname)) {
      const hipMatch = /HIP\s*(\d+)/i.exec(r.hip_name || '');
      const hdMatch = /HD\s*(\d+)/i.exec(r.hd_name || '');
      const gaiaMatch = /Gaia DR3\s*(\d+)/i.exec(r.gaia_dr3_id || '');
      const ticMatch = /TIC\s*(\d+)/i.exec(r.tic_id || '');
      const hip = hipMatch ? Number(hipMatch[1]) : null;
      const hd = hdMatch ? Number(hdMatch[1]) : null;

      neaHostsMap.set(hostname, {
        hostname,
        hip,
        hd,
        gaiaDr3: gaiaMatch ? gaiaMatch[1] : null,
        ticId: ticMatch ? ticMatch[1] : null,
        distPc: Number(r.sy_dist),
        distLy: round(distLy, 3),
        plxMas: r.sy_plx ? Number(r.sy_plx) : null,
        ra: Number(r.ra),
        dec: Number(r.dec),
        pmRa: r.sy_pmra ? Number(r.sy_pmra) : 0,
        pmDec: r.sy_pmdec ? Number(r.sy_pmdec) : 0,
        rv: r.st_radv !== null && r.st_radv !== undefined ? Number(r.st_radv) : null,
        vmag: r.sy_vmag !== null && r.sy_vmag !== undefined ? Number(r.sy_vmag) : null,
        teff: Math.round(teff),
        lum: sig(lum, 4),
        radius: r.st_rad ? sig(Number(r.st_rad), 3) : sig(Math.sqrt(lum) * (T_SUN / teff) ** 2, 3),
        mass: r.st_mass ? sig(Number(r.st_mass), 3) : null,
        spect: clean(r.st_spectype) || (teff < 3700 ? 'M5V' : teff < 5200 ? 'K2V' : teff < 6000 ? 'G2V' : 'F5V'),
        planets: [],
        matchedSystemId: null,
      });

      if (hip) hostByHip.set(hip, hostname);
      if (hd) hostByHd.set(hd, hostname);
      hostByNormName.set(normalizeHostKey(hostname), hostname);
      // Only map the stripped base name (without A/B/C) if it does not overwrite a distinct component host
      const stripped = normalizeHostKey(hostname.replace(/\s+[A-C]$/i, ''));
      if (stripped !== normalizeHostKey(hostname) && !hostByNormName.has(stripped)) {
        hostByNormName.set(stripped, hostname);
      }
    }

    const hostEntry = neaHostsMap.get(hostname);
    const radEarth = r.pl_rade !== null && r.pl_rade !== undefined ? round(Number(r.pl_rade), 2) : null;
    const massEarth = r.pl_bmasse !== null && r.pl_bmasse !== undefined ? round(Number(r.pl_bmasse), 2) : null;
    const isTerrestrial =
      (radEarth !== null && radEarth <= 1.65) || (radEarth === null && massEarth !== null && massEarth <= 5.5);
    const ref = parseNeaRefLink(r.disc_refname);

    hostEntry.planets.push({
      name: clean(r.pl_name),
      hostComponent: hostname,
      semiMajorAxisAU: a ? sig(a, 4) : null,
      periodDays: r.pl_orbper ? sig(Number(r.pl_orbper), 4) : null,
      eccentricity: r.pl_orbeccen !== null && r.pl_orbeccen !== undefined ? round(Number(r.pl_orbeccen), 3) : null,
      radiusEarth: radEarth,
      massEarth: massEarth,
      eqTempK: r.pl_eqt ? Math.round(Number(r.pl_eqt)) : null,
      insolationEarth: r.pl_insol ? sig(Number(r.pl_insol), 3) : a && a > 0 ? sig(lum / (a * a), 3) : null,
      hzStatus, // 2 = Conservative HZ, 1 = Optimistic HZ, 0 = Outside
      isTerrestrial,
      discoveryMethod: clean(r.discoverymethod) || 'Radial Velocity',
      discoveryYear: r.disc_year ? Number(r.disc_year) : null,
      discoveryCitation: ref.citation,
      discoveryUrl: ref.url,
    });
  }

  // Sort planets within each host by semi-major axis
  for (const host of neaHostsMap.values()) {
    host.planets.sort((a, b) => (a.semiMajorAxisAU || 999) - (b.semiMajorAxisAU || 999));
  }

  // 2. Process HYG stars within MAX_RADIUS_LY
  const KM_S_TO_LY_KYR = 0.00333564095;
  const PC_YR_TO_LY_KYR = LY_PER_PC * 1000;

  const hygFiltered = [];
  for (const r of hygRows) {
    const distPc = Number(r.dist);
    if (!Number.isFinite(distPc) || distPc >= 100000) continue;
    const distLy = distPc * LY_PER_PC;
    if (distLy > MAX_RADIUS_LY) continue;

    const hip = r.hip ? Number(r.hip) : null;
    const hd = r.hd ? Number(r.hd) : null;
    const hr = r.hr ? Number(r.hr) : null;
    const gl = clean(r.gl);
    const vmag = r.mag !== '' ? Number(r.mag) : 99;
    const absmag = r.absmag !== '' ? Number(r.absmag) : vmag - 5 * Math.log10(Math.max(1e-5, distPc) / 10);
    const bv = r.ci !== '' ? Number(r.ci) : null;
    const hygLum = r.lum !== '' ? Number(r.lum) : null;

    const posGal = toGalactic(Number(r.x), Number(r.y), Number(r.z)).map((v) => v * LY_PER_PC);
    const velGal = toGalactic(Number(r.vx) || 0, Number(r.vy) || 0, Number(r.vz) || 0).map((v) => v * PC_YR_TO_LY_KYR);
    const hasRadialVel = r.rv !== '' && Number(r.rv) !== 0;

    hygFiltered.push({
      r,
      id: r.id,
      hip,
      hd,
      hr,
      gl,
      vmag,
      absmag,
      bv,
      hygLum,
      distPc,
      distLy,
      posGal,
      velGal,
      hasRadialVel,
    });
  }

  hygFiltered.sort((a, b) => a.distLy - b.distLy);

  // 3. Group HYG stars into multi-star systems (by comp_primary, then spatial proximity < MERGE_LY)
  const groups = new Map();
  for (const s of hygFiltered) {
    const key = s.r.comp_primary || s.r.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  const primaryOf = (members) => members.find((m) => m.r.id === m.r.comp_primary) ?? members[0];
  const groupList = [...groups.values()].map((members) => ({ members, primary: primaryOf(members) }));
  groupList.sort((a, b) => a.primary.absmag - b.primary.absmag); // Brightest primary absorbs nearby companions

  const mergedSystems = [];
  const mergedGrid = createSpatialGrid(Math.max(0.5, MERGE_LY * 2));
  for (const g of groupList) {
    const hits = mergedGrid.queryWithin(g.primary.posGal, MERGE_LY);
    // Preserve brightest-primary absorption order (lowest insertion index in mergedSystems)
    let host = null;
    for (const h of hits) {
      if (!host || h.item._idx < host._idx) host = h.item;
    }
    if (host) {
      host.members.push(...g.members);
    } else {
      g._idx = mergedSystems.length;
      mergedSystems.push(g);
      mergedGrid.add(g.primary.posGal, g);
    }
  }

  // Pre-compute Galactic coordinates for all NASA hosts and index in a 3D spatial hash grid (O(N))
  const neaSpatialGrid = createSpatialGrid(Math.max(0.5, MERGE_LY * 2));
  for (const entry of neaHostsMap.values()) {
    if (Number.isFinite(entry.ra) && Number.isFinite(entry.dec) && Number.isFinite(entry.distPc)) {
      const { posGalLy, velGalLyKyr } = astrometryToGalactic({
        raDeg: entry.ra,
        decDeg: entry.dec,
        distPc: entry.distPc,
        pmRaMasYr: entry.pmRa,
        pmDecMasYr: entry.pmDec,
        rvKmS: entry.rv || 0,
      });
      entry._posGalLy = posGalLy;
      entry._velGalLyKyr = velGalLyKyr;
      neaSpatialGrid.add(posGalLy, entry);
    }
  }

  // 4. Build System records and cross-match with NASA Exoplanet Archive
  const catalogSystems = [];
  const catalogGrid = createSpatialGrid(0.5);
  const usedSystemIds = new Set();
  const makeUniqueSysId = (baseId) => {
    if (!usedSystemIds.has(baseId)) {
      usedSystemIds.add(baseId);
      return baseId;
    }
    let suffix = 2;
    while (usedSystemIds.has(`${baseId}-${suffix}`)) suffix++;
    const unique = `${baseId}-${suffix}`;
    usedSystemIds.add(unique);
    return unique;
  };

  for (const { members, primary } of mergedSystems) {
    const p = primary.r;
    const isSol = p.id === '0';
    const ordered = [primary, ...members.filter((m) => m !== primary)].sort((a, b) => a.absmag - b.absmag);
    const brightestVmag = Math.min(...ordered.map((m) => m.vmag));

    const named = p.proper || ((p.bayer || p.flam) && p.con ? formatStarName(p) : '');
    const baseName = (named || (p.base ? clean(p.base) : '') || formatStarName(p)).replace(/(\S)\s?[A-C]$/, '$1');
    const sysName = isSol ? 'Sol' : SYSTEM_NAME_OVERRIDES[baseName] ?? baseName;
    const rawSysId = isSol ? 'sol' : p.hip ? `hip-${p.hip}` : `hyg-${p.id}`;
    const sysId = makeUniqueSysId(rawSysId);

    // Cross-match every member star with NASA Exoplanet Archive hosts
    // Store matched hosts mapped to the specific component star they belong to
    const matchedEntries = [];
    for (const m of ordered) {
      const candidates = new Set();
      if (m.hip && hostByHip.has(m.hip)) candidates.add(hostByHip.get(m.hip));
      if (m.hd && hostByHd.has(m.hd)) candidates.add(hostByHd.get(m.hd));
      const starDisplayName = formatStarName(m.r);
      const glClean = m.gl ? `GJ ${m.gl.replace(/^(Gl|GJ|NN|Wo)\s*/i, '')}` : '';
      // Prefer exact component matches first (e.g. "GJ 667 C", "55 Cnc B", "Proxima Cen")
      for (const candidate of [
        starDisplayName,
        m.r.proper,
        glClean,
        m.r.bayer && m.r.con ? `${m.r.bayer} ${m.r.con}` : '',
        m.r.flam && m.r.con ? `${m.r.flam} ${m.r.con}` : '',
      ]) {
        if (!candidate) continue;
        const norm = normalizeHostKey(candidate);
        if (hostByNormName.has(norm)) candidates.add(hostByNormName.get(norm));
        // Also try matching space-separated component letter: "gj 667c" -> "gj 667 c"
        const spaced = norm.replace(/(\d)([a-c])$/, '$1 $2');
        if (spaced !== norm && hostByNormName.has(spaced)) candidates.add(hostByNormName.get(spaced));
      }
      for (const hName of candidates) {
        const entry = neaHostsMap.get(hName);
        if (entry && !entry.matchedSystemId) {
          matchedEntries.push({ entry, memberStar: m });
        }
      }
    }

    // Fallback: match system base name only for hosts not yet claimed by a component
    const normSys = normalizeHostKey(sysName);
    if (hostByNormName.has(normSys)) {
      const hName = hostByNormName.get(normSys);
      const entry = neaHostsMap.get(hName);
      if (entry && !entry.matchedSystemId && !matchedEntries.some((x) => x.entry === entry)) {
        matchedEntries.push({ entry, memberStar: ordered[0] });
      }
    }

    // Also claim any NASA host whose 3D position is within MERGE_LY of this system (O(1) grid lookup)
    // (catches binary companions whose NASA name differs from HYG, e.g., "Gl 725 B" vs "Struve 2398 B", "55 Cnc B" vs "GJ 324B")
    for (const hit of neaSpatialGrid.queryWithin(primary.posGal, MERGE_LY)) {
      const entry = hit.item;
      if (entry.matchedSystemId || matchedEntries.some((x) => x.entry === entry)) continue;
      // Match to specific component star by component letter (A/B/C) or closest luminosity/Teff
      const compMatch = /\s+([A-C])$/i.exec(entry.hostname);
      let bestMember = ordered[0];
      if (compMatch) {
        const letter = compMatch[1].toUpperCase();
        const byComp = ordered.find((m) => {
          const nm = formatStarName(m.r);
          return new RegExp(`(\\s|\\d)${letter}$`, 'i').test(nm) || new RegExp(`(\\s|\\d)${letter}$`, 'i').test(m.gl || '');
        });
        if (byComp) bestMember = byComp;
      }
      matchedEntries.push({ entry, memberStar: bestMember });
    }

    // Build stellar components
    const stars = ordered.map((m, idx) => {
      const params = isSol && idx === 0
        ? { teff: 5772, lum: 1.0, radius: 1.0, mass: 1.0, lumClass: 'V', cls: 'G' }
        : computeStarParameters({ spect: m.r.spect, bv: m.bv, mv: m.absmag, hygLum: m.hygLum }, mamajek);
      const hz = getKopparapuHZ(params.lum, params.teff);
      return {
        name: isSol && idx === 0 ? 'Sun (Sol)' : formatStarName(m.r),
        hip: m.hip,
        hd: m.hd,
        hr: m.hr,
        gl: m.gl || null,
        spect: isSol && idx === 0 ? 'G2V' : clean(m.r.spect) || `${params.cls}5${params.lumClass}`,
        cls: params.cls,
        lumClass: params.lumClass,
        vmag: round(m.vmag, 2),
        absmag: round(m.absmag, 2),
        bv: m.bv !== null ? round(m.bv, 2) : null,
        teff: params.teff,
        lum: sig(params.lum, 4),
        radius: sig(params.radius, 3),
        mass: params.mass ? sig(params.mass, 3) : null,
        hz,
      };
    });

    // Gather confirmed planets
    let planets = [];
    let gaiaDr3 = null;
    let ticId = null;
    let neaHostPrimary = null;

    if (isSol) {
      neaHostPrimary = 'Sun';
      planets = [
        { name: 'Mercury', hostComponent: 'Sun (Sol)', semiMajorAxisAU: 0.3871, periodDays: 87.97, eccentricity: 0.206, radiusEarth: 0.383, massEarth: 0.055, eqTempK: 440, insolationEarth: 6.67, hzStatus: 0, isTerrestrial: true, discoveryMethod: 'Classical', discoveryYear: null, discoveryCitation: 'IAU Solar System', discoveryUrl: 'https://science.nasa.gov/mercury/' },
        { name: 'Venus', hostComponent: 'Sun (Sol)', semiMajorAxisAU: 0.7233, periodDays: 224.7, eccentricity: 0.007, radiusEarth: 0.949, massEarth: 0.815, eqTempK: 737, insolationEarth: 1.91, hzStatus: 0, isTerrestrial: true, discoveryMethod: 'Classical', discoveryYear: null, discoveryCitation: 'IAU Solar System', discoveryUrl: 'https://science.nasa.gov/venus/' },
        { name: 'Earth', hostComponent: 'Sun (Sol)', semiMajorAxisAU: 1.0, periodDays: 365.25, eccentricity: 0.017, radiusEarth: 1.0, massEarth: 1.0, eqTempK: 288, insolationEarth: 1.0, hzStatus: 2, isTerrestrial: true, discoveryMethod: 'Homeworld', discoveryYear: null, discoveryCitation: 'IAU Solar System', discoveryUrl: 'https://science.nasa.gov/earth/' },
        { name: 'Mars', hostComponent: 'Sun (Sol)', semiMajorAxisAU: 1.5237, periodDays: 686.98, eccentricity: 0.093, radiusEarth: 0.532, massEarth: 0.107, eqTempK: 210, insolationEarth: 0.431, hzStatus: 1, isTerrestrial: true, discoveryMethod: 'Classical', discoveryYear: null, discoveryCitation: 'IAU Solar System', discoveryUrl: 'https://science.nasa.gov/mars/' },
        { name: 'Jupiter', hostComponent: 'Sun (Sol)', semiMajorAxisAU: 5.2038, periodDays: 4332.59, eccentricity: 0.049, radiusEarth: 11.21, massEarth: 317.8, eqTempK: 165, insolationEarth: 0.037, hzStatus: 0, isTerrestrial: false, discoveryMethod: 'Classical', discoveryYear: null, discoveryCitation: 'IAU Solar System', discoveryUrl: 'https://science.nasa.gov/jupiter/' },
        { name: 'Saturn', hostComponent: 'Sun (Sol)', semiMajorAxisAU: 9.5826, periodDays: 10759.22, eccentricity: 0.057, radiusEarth: 9.45, massEarth: 95.16, eqTempK: 134, insolationEarth: 0.011, hzStatus: 0, isTerrestrial: false, discoveryMethod: 'Classical', discoveryYear: null, discoveryCitation: 'IAU Solar System', discoveryUrl: 'https://science.nasa.gov/saturn/' },
        { name: 'Uranus', hostComponent: 'Sun (Sol)', semiMajorAxisAU: 19.191, periodDays: 30688.5, eccentricity: 0.046, radiusEarth: 4.01, massEarth: 14.54, eqTempK: 76, insolationEarth: 0.0027, hzStatus: 0, isTerrestrial: false, discoveryMethod: 'Telescopic (Herschel)', discoveryYear: 1781, discoveryCitation: 'Herschel 1781', discoveryUrl: 'https://science.nasa.gov/uranus/' },
        { name: 'Neptune', hostComponent: 'Sun (Sol)', semiMajorAxisAU: 30.07, periodDays: 60195, eccentricity: 0.01, radiusEarth: 3.88, massEarth: 17.15, eqTempK: 72, insolationEarth: 0.0011, hzStatus: 0, isTerrestrial: false, discoveryMethod: 'Mathematical / Telescopic', discoveryYear: 1846, discoveryCitation: 'Le Verrier & Galle 1846', discoveryUrl: 'https://science.nasa.gov/neptune/' },
      ];
    } else {
      for (const { entry, memberStar } of matchedEntries) {
        if (entry.matchedSystemId) continue; // Prevent duplicate planet attachment across two HYG records of the same star
        entry.matchedSystemId = sysId;
        if (!neaHostPrimary) neaHostPrimary = entry.hostname;
        if (!gaiaDr3 && entry.gaiaDr3) gaiaDr3 = entry.gaiaDr3;
        if (!ticId && entry.ticId) ticId = entry.ticId;

        // Resolve exact component star index & record
        const memberIdx = ordered.indexOf(memberStar);
        let hostStar = memberIdx >= 0 ? stars[memberIdx] : stars[0];

        // Double check explicit component letter match (e.g. "GJ 667 C" -> "GJ 667C", "Gl 725 B" -> "Struve 2398 B", "55 Cnc B" -> "GJ 324B")
        const compMatch = /\s+([A-C])$/i.exec(entry.hostname);
        if (compMatch && stars.length > 1) {
          const letter = compMatch[1].toUpperCase();
          const byComp = stars.find(
            (st) =>
              new RegExp(`(\\s|\\d)${letter}$`, 'i').test(st.name) ||
              new RegExp(`(\\s|\\d)${letter}$`, 'i').test(st.gl || '')
          );
          if (byComp) hostStar = byComp;
        } else if (entry.hostname.toLowerCase().includes('proxima')) {
          const prox = stars.find((st) => st.name.toLowerCase().includes('proxima'));
          if (prox) hostStar = prox;
        }

        for (const pl of entry.planets) {
          let hzStatus = pl.hzStatus;
          if (hostStar && hostStar.hz && pl.semiMajorAxisAU) {
            const a = pl.semiMajorAxisAU;
            if (a >= hostStar.hz.runawayGreenhouseAU && a <= hostStar.hz.maximumGreenhouseAU) hzStatus = 2;
            else if (a >= hostStar.hz.recentVenusAU && a <= hostStar.hz.earlyMarsAU) hzStatus = 1;
            else hzStatus = 0;
          }
          planets.push({
            ...pl,
            hostComponent: hostStar ? hostStar.name : pl.hostComponent,
            hzStatus,
          });
        }
      }
    }

    const isVisible = brightestVmag <= 6.5;
    const hasPlanets = planets.length > 0;
    const hasConservativeHZ = planets.some((pl) => pl.hzStatus === 2);
    const hasOptimisticHZ = planets.some((pl) => pl.hzStatus >= 1);
    const hasTerrestrialHZ = planets.some((pl) => pl.hzStatus >= 1 && pl.isTerrestrial);
    const isNamed = Boolean(p.proper || p.bayer || p.flam);

    // Tier classification:
    // Tier 1 (Core Default Map): All Exoplanet Hosts + All Naked-Eye Visible Stars (V <= 6.5) + All Close Neighbors (<= CLOSE_VOLUME_LY)
    // Tier 2 (Extended Survey): Stars with V <= EXTENDED_MAG_LIMIT or named/Gliese within MAX_RADIUS_LY
    const isCoreTier = isSol || hasPlanets || isVisible || primary.distLy <= CLOSE_VOLUME_LY;
    const isExtendedTier = isCoreTier || brightestVmag <= EXTENDED_MAG_LIMIT || isNamed || Boolean(primary.gl);

    if (!isExtendedTier) continue;

    const sysRecord = {
      id: sysId,
      name: sysName,
      constellation: CONSTELLATION_NOM[p.con] || p.con || null,
      pos: primary.posGal.map((v) => round(v, 3)),
      vel: primary.velGal.map((v) => round(v, 4)), // ly / kyr in Galactic frame
      hasFull3dVelocity: primary.hasRadialVel,
      radialVelocityKmS: primary.hasRadialVel ? round(Number(p.rv), 2) : null,
      velocitySource: primary.hasRadialVel ? 'HYG v3.8' : null,
      distLy: round(primary.distLy, 3),
      distPc: round(primary.distPc, 3),
      ra: p.ra !== '' ? round(Number(p.ra) * 15, 5) : null, // HYG RA is in hours -> convert to degrees
      dec: p.dec !== '' ? round(Number(p.dec), 5) : null,
      vmag: round(brightestVmag, 2),
      isVisibleFromEarth: isVisible,
      tier: isCoreTier ? 1 : 2,
      hasPlanets,
      planetCount: planets.length,
      hasConservativeHZ,
      hasOptimisticHZ,
      hasTerrestrialHZ,
      hasJwstSpectra: false,
      maxEsi: null,
      isBrownDwarf: stars[0]?.cls === 'L' || stars[0]?.cls === 'T' || stars[0]?.cls === 'Y',
      isFlareStar: false,
      activityType: null,
      hasDebrisDisk: false,
      metallicityFeH: null,
      ruwe: null,
      nonSingleStar: stars.length > 1,
      ids: {
        hip: primary.hip,
        hd: primary.hd,
        hr: primary.hr,
        gl: primary.gl || null,
        gaiaDr3,
        ticId,
        neaHost: neaHostPrimary,
      },
      stars,
      planets,
      _memberCoords: ordered
        .filter((m) => m.r.ra !== '' && m.r.dec !== '')
        .map((m) => ({ ra: Number(m.r.ra) * 15, dec: Number(m.r.dec) })),
    };
    catalogSystems.push(sysRecord);
    catalogGrid.add(sysRecord.pos, sysRecord);
  }

  // 5. Add any remaining unmatched NASA Exoplanet Hosts (e.g. TRAPPIST-1, LHS 1140, Teegarden's Star, Gliese 12, TOI-700, K2-18)
  let synthesizedNeaCount = 0;
  for (const entry of neaHostsMap.values()) {
    if (entry.matchedSystemId) continue;

    // Check if an existing system is within 0.25 ly of this host's 3D position (O(1) spatial lookup)
    const posGalLy =
      entry._posGalLy ||
      astrometryToGalactic({
        raDeg: entry.ra,
        decDeg: entry.dec,
        distPc: entry.distPc,
        pmRaMasYr: entry.pmRa,
        pmDecMasYr: entry.pmDec,
        rvKmS: entry.rv || 0,
      }).posGalLy;
    const velGalLyKyr =
      entry._velGalLyKyr ||
      astrometryToGalactic({
        raDeg: entry.ra,
        decDeg: entry.dec,
        distPc: entry.distPc,
        pmRaMasYr: entry.pmRa,
        pmDecMasYr: entry.pmDec,
        rvKmS: entry.rv || 0,
      }).velGalLyKyr;

    const nearHits = catalogGrid.queryWithin(posGalLy, 0.25);
    nearHits.sort((a, b) => a.distSq - b.distSq);
    const nearbyExisting = nearHits[0]?.item || null;

    if (nearbyExisting) {
      // Attach planets and IDs to the existing system
      nearbyExisting.planets.push(...entry.planets);
      nearbyExisting.planetCount = nearbyExisting.planets.length;
      nearbyExisting.hasPlanets = true;
      nearbyExisting.tier = 1;
      nearbyExisting.hasConservativeHZ = nearbyExisting.planets.some((pl) => pl.hzStatus === 2);
      nearbyExisting.hasOptimisticHZ = nearbyExisting.planets.some((pl) => pl.hzStatus >= 1);
      nearbyExisting.hasTerrestrialHZ = nearbyExisting.planets.some((pl) => pl.hzStatus >= 1 && pl.isTerrestrial);
      if (!nearbyExisting.ids.neaHost) nearbyExisting.ids.neaHost = entry.hostname;
      if (!nearbyExisting.ids.gaiaDr3 && entry.gaiaDr3) nearbyExisting.ids.gaiaDr3 = entry.gaiaDr3;
      if (!nearbyExisting.ids.ticId && entry.ticId) nearbyExisting.ids.ticId = entry.ticId;
      entry.matchedSystemId = nearbyExisting.id;
      continue;
    }

    // Create a dedicated 3D system from NASA / Gaia DR3 astrometry
    synthesizedNeaCount++;
    const sp = parseSpectralType(entry.spect);
    const cls = sp.letter && 'OBAFGKMD'.includes(sp.letter) ? sp.letter : entry.teff < 3700 ? 'M' : entry.teff < 5200 ? 'K' : entry.teff < 6000 ? 'G' : 'F';
    const hz = getKopparapuHZ(entry.lum, entry.teff);
    const vmag = entry.vmag ?? round(4.74 - 2.5 * Math.log10(entry.lum) + 5 * Math.log10(entry.distPc / 10), 2);
    const absmag = round(vmag - 5 * Math.log10(entry.distPc / 10), 2);
    const sysId = makeUniqueSysId(`nea-${entry.hostname.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);

    const neaRecord = {
      id: sysId,
      name: entry.hostname,
      constellation: null,
      pos: posGalLy.map((v) => round(v, 3)),
      vel: velGalLyKyr.map((v) => round(v, 4)),
      hasFull3dVelocity: entry.rv !== null,
      radialVelocityKmS: entry.rv !== null ? round(entry.rv, 2) : null,
      velocitySource: entry.rv !== null ? 'NASA Exoplanet Archive' : null,
      distLy: entry.distLy,
      distPc: round(entry.distPc, 3),
      ra: round(entry.ra, 5),
      dec: round(entry.dec, 5),
      vmag,
      isVisibleFromEarth: vmag <= 6.5,
      tier: 1,
      hasPlanets: true,
      planetCount: entry.planets.length,
      hasConservativeHZ: entry.planets.some((pl) => pl.hzStatus === 2),
      hasOptimisticHZ: entry.planets.some((pl) => pl.hzStatus >= 1),
      hasTerrestrialHZ: entry.planets.some((pl) => pl.hzStatus >= 1 && pl.isTerrestrial),
      hasJwstSpectra: false,
      maxEsi: null,
      isBrownDwarf: cls === 'L' || cls === 'T' || cls === 'Y',
      isFlareStar: false,
      activityType: null,
      hasDebrisDisk: false,
      metallicityFeH: null,
      ruwe: null,
      nonSingleStar: false,
      ids: {
        hip: entry.hip,
        hd: entry.hd,
        hr: null,
        gl: /^GJ\s/i.test(entry.hostname) ? entry.hostname : null,
        gaiaDr3: entry.gaiaDr3,
        ticId: entry.ticId,
        neaHost: entry.hostname,
      },
      stars: [
        {
          name: entry.hostname,
          hip: entry.hip,
          hd: entry.hd,
          hr: null,
          gl: null,
          spect: entry.spect,
          cls,
          lumClass: sp.lumClass || 'V',
          vmag,
          absmag,
          bv: null,
          teff: entry.teff,
          lum: entry.lum,
          radius: entry.radius,
          mass: entry.mass,
          hz,
        },
      ],
      planets: entry.planets,
    };
    catalogSystems.push(neaRecord);
    catalogGrid.add(neaRecord.pos, neaRecord);
  }

  // 6. Ingest Ultracool & Brown Dwarf (L / T / Y) Census (Kirkpatrick et al. 2024 + Best et al. 2021)
  const existingSkyGrid = createSkyGrid(0.25);
  for (const s of catalogSystems) {
    if (Number.isFinite(s.ra) && Number.isFinite(s.dec)) {
      existingSkyGrid.add(s.ra, s.dec, s);
    }
  }
  const { kirkActivitySky, addedSystems: ultracoolSystems } = processUltracoolCatalogs({
    kirkTsv: kirk2024Text,
    bestTsv: best2021Text,
    maxRadiusLy: MAX_RADIUS_LY,
    closeVolumeLy: CLOSE_VOLUME_LY,
    constellationNom: CONSTELLATION_NOM,
    astrometryToGalactic,
    getKopparapuHZ,
    catalogGrid,
    existingSkyGrid,
    makeUniqueSysId,
    round,
    sig,
  });
  for (const uc of ultracoolSystems) {
    catalogSystems.push(uc);
  }
  console.log(
    `[DATA] Added ${ultracoolSystems.length} ultracool & L/T/Y brown dwarf systems (Kirkpatrick 2024 + Best 2021).`
  );

  // 7. Cross-match against ESA Gaia DR3 TAP + CNS5 (Radial Velocities, [Fe/H], RUWE, Non-Single Star)
  const gaiaIndex = indexGaiaDr3([gaiaCoreText, gaiaExtText], astrometryToGalactic);
  const cns5Index = indexCns5(cns5Text);
  let gaiaMatchedCount = 0;
  let gaiaRvAddedCount = 0;
  let gaiaRvUpgradedCount = 0;
  let cns5RvAddedCount = 0;

  for (const s of catalogSystems) {
    if (s.id === 'sol') continue;

    const g = matchSystemToGaia(s, gaiaIndex);
    if (g) {
      gaiaMatchedCount++;
      if (!s.ids.gaiaDr3) s.ids.gaiaDr3 = g.sourceId;
      if (g.mhGspphot !== null) s.metallicityFeH = round(g.mhGspphot, 2);
      if (g.ruwe !== null) s.ruwe = round(g.ruwe, 2);
      if (g.nonSingleStar) s.nonSingleStar = true;

      const highQualityGaia =
        g.rv !== null &&
        (g.parallaxOverError === null || g.parallaxOverError >= 15) &&
        (g.ruwe === null || g.ruwe < 2.8);

      if (!s.hasFull3dVelocity && g.rv !== null) {
        const { velGalLyKyr } = astrometryToGalactic({
          raDeg: g.ra,
          decDeg: g.dec,
          distPc: g.distPc,
          pmRaMasYr: g.pmra,
          pmDecMasYr: g.pmdec,
          rvKmS: g.rv,
        });
        s.vel = velGalLyKyr.map((v) => round(v, 4));
        s.hasFull3dVelocity = true;
        s.radialVelocityKmS = round(g.rv, 2);
        s.velocitySource = 'Gaia DR3';
        gaiaRvAddedCount++;
      } else if (s.hasFull3dVelocity && highQualityGaia && s.vmag >= 4.0) {
        // Upgrade older Hipparcos/HYG velocities (e.g. Gliese 710!) to high-precision ESA Gaia DR3
        const { velGalLyKyr } = astrometryToGalactic({
          raDeg: g.ra,
          decDeg: g.dec,
          distPc: g.distPc,
          pmRaMasYr: g.pmra,
          pmDecMasYr: g.pmdec,
          rvKmS: g.rv,
        });
        s.vel = velGalLyKyr.map((v) => round(v, 4));
        s.radialVelocityKmS = round(g.rv, 2);
        s.velocitySource = 'Gaia DR3';
        gaiaRvUpgradedCount++;
      } else if (s.radialVelocityKmS === null && g.rv !== null) {
        s.radialVelocityKmS = round(g.rv, 2);
      }
    }

    // CNS5 fallback for radial velocities missed by Gaia RVS (e.g. Scholz's Star, very cool M/L dwarfs)
    if (!s.hasFull3dVelocity) {
      const c = matchSystemToCns5(s, cns5Index);
      if (c && c.rv !== null) {
        const { velGalLyKyr } = astrometryToGalactic({
          raDeg: c.ra,
          decDeg: c.dec,
          distPc: c.distPc,
          pmRaMasYr: c.pmra,
          pmDecMasYr: c.pmdec,
          rvKmS: c.rv,
        });
        s.vel = velGalLyKyr.map((v) => round(v, 4));
        s.hasFull3dVelocity = true;
        s.radialVelocityKmS = round(c.rv, 2);
        s.velocitySource = 'CNS5';
        cns5RvAddedCount++;
      }
    }
  }
  console.log(
    `[DATA] Gaia DR3 matched ${gaiaMatchedCount} systems (+${gaiaRvAddedCount} new 3D RVs, ${gaiaRvUpgradedCount} upgraded to Gaia DR3, +${cns5RvAddedCount} CNS5 RVs).`
  );

  // 8. Cross-match Flare / Active Stars (GCVS v5.1 + Kirkpatrick 2024) & Debris Disks (Cotten & Song 2016 + Chen 2014)
  const gcvsIndex = indexGcvsActivity(gcvsUvText, gcvsByText, gcvsRsText);
  const debrisIndex = indexDebrisDisks(debrisCottenText, debrisChenText);

  for (const s of catalogSystems) {
    if (s.id === 'sol') {
      delete s._memberCoords;
      continue;
    }
    const coordList =
      s._memberCoords && s._memberCoords.length > 0
        ? s._memberCoords
        : Number.isFinite(s.ra) && Number.isFinite(s.dec)
          ? [{ ra: s.ra, dec: s.dec }]
          : [];

    for (const pt of coordList) {
      const gcvsHits = gcvsIndex.skyGrid.query(pt.ra, pt.dec, 45);
      if (gcvsHits.length > 0) {
        const best = gcvsHits.find((h) => h.item.isFlare) || gcvsHits[0];
        if (best.item.isFlare) s.isFlareStar = true;
        if (!s.activityType || best.item.isFlare) s.activityType = best.item.activityType;
      }

      const kirkHits = kirkActivitySky.query(pt.ra, pt.dec, 45);
      if (kirkHits.length > 0) {
        for (const h of kirkHits) {
          if (h.item.isFlare) {
            s.isFlareStar = true;
            s.activityType = 'UV';
          }
          if (s.ruwe === null && h.item.ruwe !== null) {
            s.ruwe = round(h.item.ruwe, 2);
          }
        }
      }

      const debrisHits = debrisIndex.skyGrid.query(pt.ra, pt.dec, 40);
      if (debrisHits.length > 0) {
        s.hasDebrisDisk = true;
      }
    }

    if (!s.hasDebrisDisk) {
      const nameCandidates = [
        s.name,
        s.ids?.hd ? `HD ${s.ids.hd}` : null,
        s.ids?.hd ? `HD${s.ids.hd}` : null,
        s.ids?.hip ? `HIP ${s.ids.hip}` : null,
        s.ids?.hr ? `HR ${s.ids.hr}` : null,
      ].filter(Boolean);
      if (nameCandidates.some((c) => debrisIndex.byName.has(debrisIndex.normName(c)))) {
        s.hasDebrisDisk = true;
      }
    }

    delete s._memberCoords;
  }

  // 9. Exoplanet Enrichment: Earth Similarity Index (ESI), Tidal-Locking Timescale, & NASA JWST/HST Spectra
  const spectraByPlanet = indexNeaSpectra(neaSpectraText);
  let jwstSpectraPlanets = 0;
  let highEsiPlanets = 0;

  for (const s of catalogSystems) {
    if (!s.planets || s.planets.length === 0) continue;
    const isSol = s.id === 'sol';
    let sysHasJwst = false;
    let maxEsi = null;

    for (const pl of s.planets) {
      const hostStar = s.stars.find((st) => st.name === pl.hostComponent) || s.stars[0];
      const esi = computeESI({
        radiusEarth: pl.radiusEarth,
        massEarth: pl.massEarth,
        eqTempK: isSol ? null : pl.eqTempK,
        surfaceTempK: isSol ? pl.eqTempK : null,
        insolationEarth: pl.insolationEarth,
      });
      const { tidalLockGyr, tidalLockStatus } = computeTidalLocking({
        semiMajorAxisAU: pl.semiMajorAxisAU,
        starMassSolar: hostStar?.mass ?? 1.0,
        radiusEarth: pl.radiusEarth,
        massEarth: pl.massEarth,
        isTerrestrial: pl.isTerrestrial,
      });

      const spec = spectraByPlanet.get(clean(pl.name).toLowerCase()) || null;
      pl.esi = esi;
      pl.tidalLockGyr = tidalLockGyr;
      pl.tidalLockStatus = tidalLockStatus;
      pl.spectraCount = spec ? spec.count : 0;
      pl.hasJwstSpectrum = spec ? spec.hasJwst : false;
      pl.hasHstSpectrum = spec ? spec.hasHst : false;
      pl.spectraFacilities = spec ? [...spec.facilities].sort() : [];

      if (pl.hasJwstSpectrum) {
        sysHasJwst = true;
        jwstSpectraPlanets++;
      }
      if (esi !== null) {
        if (maxEsi === null || esi > maxEsi) maxEsi = esi;
        if (!isSol && esi >= 0.75) highEsiPlanets++;
      }
    }

    s.hasJwstSpectra = sysHasJwst;
    s.maxEsi = maxEsi;
  }

  catalogSystems.sort((a, b) => a.distLy - b.distLy);

  const tier1Count = catalogSystems.filter((s) => s.tier === 1).length;
  const visibleCount = catalogSystems.filter((s) => s.isVisibleFromEarth).length;
  const exoHostCount = catalogSystems.filter((s) => s.hasPlanets).length;
  const hzHostCount = catalogSystems.filter((s) => s.hasOptimisticHZ).length;
  const conservativeHzHostCount = catalogSystems.filter((s) => s.hasConservativeHZ).length;
  const totalPlanets = catalogSystems.reduce((sum, s) => sum + s.planetCount, 0);
  const full3dVelocityCount = catalogSystems.filter((s) => s.hasFull3dVelocity).length;
  const brownDwarfCount = catalogSystems.filter((s) => s.isBrownDwarf).length;
  const flareStarCount = catalogSystems.filter((s) => s.isFlareStar).length;
  const debrisDiskCount = catalogSystems.filter((s) => s.hasDebrisDisk).length;
  const jwstSpectraHosts = catalogSystems.filter((s) => s.hasJwstSpectra).length;

  const nowIso = new Date().toISOString();
  const catalog = {
    meta: {
      generatedAt: nowIso.slice(0, 10),
      generatedAtIso: nowIso,
      maxRadiusLy: MAX_RADIUS_LY,
      extendedHzRadiusLy: EXTENDED_HZ_RADIUS_LY,
      closeVolumeLy: CLOSE_VOLUME_LY,
      extendedMagLimit: EXTENDED_MAG_LIMIT,
      neaQueryMaxPc: NEA_MAX_PC,
      coordinateFrame: 'Galactic Cartesian (light-years; Sol at [0,0,0]; +X -> Galactic Center, +Y -> Galactic Rotation, +Z -> North Galactic Pole)',
      velocityFrame: 'Galactic Space Velocity (ly / kyr; derived from ESA Gaia DR3 / Hipparcos / CNS5 proper motion + radial velocity)',
      counts: {
        totalSystems: catalogSystems.length,
        tier1CoreSystems: tier1Count,
        visibleFromEarthSystems: visibleCount,
        exoplanetHostSystems: exoHostCount,
        optimisticHzHostSystems: hzHostCount,
        conservativeHzHostSystems: conservativeHzHostCount,
        totalConfirmedPlanets: totalPlanets,
        synthesizedGaiaExoplanetHosts: synthesizedNeaCount,
        full3dVelocitySystems: full3dVelocityCount,
        gaiaMatchedSystems: gaiaMatchedCount,
        brownDwarfSystems: brownDwarfCount,
        flareStarSystems: flareStarCount,
        debrisDiskSystems: debrisDiskCount,
        jwstSpectraPlanets,
        jwstSpectraHosts,
        highEsiPlanets,
      },
      sources: [
        {
          id: 'nea',
          name: 'NASA Exoplanet Archive (pscomppars & Atmospheric Spectroscopy TAP API)',
          url: 'https://exoplanetarchive.ipac.caltech.edu/',
          citation: 'Akeson et al. (2013), PASP 125, 989; NASA/IPAC Exoplanet Science Institute (JWST/HST/Spitzer spectra)',
        },
        {
          id: 'gaia',
          name: 'ESA Gaia Data Release 3 (Live TAP Service — gaiadr3.gaia_source)',
          url: 'https://gea.esac.esa.int/archive/',
          citation: 'Gaia Collaboration, Vallenari et al. (2023), A&A 674, A1 (3D RVs, [Fe/H], RUWE, Non-Single Stars)',
        },
        {
          id: 'ultracool',
          name: '20-pc Full-Sky Census & UltracoolSheet Volume-Limited L/T/Y Brown Dwarfs',
          url: 'https://vizier.cfa.harvard.edu/viz-bin/VizieR?-source=J/ApJS/271/55',
          citation: 'Kirkpatrick et al. (2024), ApJS 271, 55; Best et al. (2021), AJ 161, 42; Golovin et al. (2023) CNS5, A&A 670, A19',
        },
        {
          id: 'hyg',
          name: 'Astronexus HYG Stellar Database v3.8 (Hipparcos, Yale Bright Star, Gliese/CNS3)',
          url: 'https://github.com/astronexus/HYG-Database',
          license: 'CC BY-SA 4.0',
          citation: 'Nash, D. (2023), HYG Database v3.8',
        },
        {
          id: 'activity',
          name: 'GCVS v5.1 Flare/Active Stars & Spitzer/WISE Circumstellar Debris Disks',
          url: 'https://vizier.cfa.harvard.edu/viz-bin/VizieR?-source=B/gcvs',
          citation: 'Samus et al. (2017) GCVS v5.1; Cotten & Song (2016), ApJS 225, 15; Chen et al. (2014), ApJS 211, 25',
        },
        {
          id: 'kopparapu',
          name: 'Habitable Zones (Kopparapu 2014), ESI (Schulze-Makuch 2011) & Tidal Locking (Barnes 2017)',
          url: 'https://arxiv.org/abs/1404.5292',
          citation: 'Kopparapu et al. (2014), ApJL 787, L29; Schulze-Makuch et al. (2011), Astrobiology 11, 1041; Barnes (2017), CeMDA 129, 509',
        },
        {
          id: 'mamajek',
          name: 'Modern Mean Dwarf Stellar Color and Effective Temperature Sequence',
          url: 'https://www.pas.rochester.edu/~emamajek/EEM_dwarf_UBVIJHK_colors_Teff.txt',
          citation: 'Pecaut, M. J. & Mamajek, E. E. (2013), ApJS 208, 9 (v2022.04.16)',
        },
      ],
    },
    systems: catalogSystems,
  };

  const outPath = path.join(OUT_DIR, 'astrometrics_catalog.json');
  writeJsonAtomic(outPath, catalog, false);
  const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);

  console.log(
    `[DATA] Wrote ${outPath} (${sizeKb} KB, radius <= ${MAX_RADIUS_LY} ly, HZ <= ${EXTENDED_HZ_RADIUS_LY} ly):`
  );
  console.log(catalog.meta.counts);
}

main().catch((err) => {
  console.error('[DATA] Build failed:', err);
  process.exit(1);
});
