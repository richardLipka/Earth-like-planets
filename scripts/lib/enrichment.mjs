/**
 * Non-LLM Astronomical Enrichment Helpers for ASTROMETRICS // 3D
 *
 * Parses and cross-matches real upstream astronomical datasets fetched by
 * `scripts/buildAstrometricsData.mjs`:
 *   1. ESA Gaia DR3 TAP (`gaiadr3.gaia_source`): radial velocity, [Fe/H], RUWE, non-single-star
 *   2. CNS5 (Golovin et al. 2023, VizieR J/A+A/670/A19): supplementary nearby RVs (incl. Scholz's Star)
 *   3. Kirkpatrick et al. (2024, VizieR J/ApJS/271/55/table4) + Best et al. (2021, VizieR J/AJ/161/42):
 *      Ultracool & L/T/Y Brown Dwarf census (Luhman 16 AB, WISE 0855-0714, Scholz's Star, etc.)
 *   4. NASA Exoplanet Archive Atmospheric Spectroscopy (`spectra` TAP table): JWST / HST / Spitzer tags
 *   5. GCVS v5.1 (VizieR B/gcvs/gcvs_cat): UV Ceti Flare Stars, BY Dra & RS CVn active stars
 *   6. Cotten & Song (2016, J/ApJS/225/15) + Chen et al. (2014, J/ApJS/211/25): Debris Disks
 */

import { createSpatialGrid } from './ioUtils.mjs';

const DEG2RAD = Math.PI / 180;
const LY_PER_PC = 3.261563777;
const T_SUN = 5772;

const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
const numOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Angular separation in arcseconds between two equatorial coordinates (deg).
 */
export function angularSepArcsec(ra1Deg, dec1Deg, ra2Deg, dec2Deg) {
  if (
    !Number.isFinite(ra1Deg) ||
    !Number.isFinite(dec1Deg) ||
    !Number.isFinite(ra2Deg) ||
    !Number.isFinite(dec2Deg)
  ) {
    return Infinity;
  }
  const dRa = ((ra1Deg - ra2Deg + 540) % 360) - 180;
  const dDec = dec1Deg - dec2Deg;
  const meanDec = ((dec1Deg + dec2Deg) * 0.5) * DEG2RAD;
  const cosD = Math.cos(meanDec);
  return Math.hypot(dRa * cosD, dDec) * 3600;
}

/**
 * Parses VizieR ASU-TSV text into an array of row objects keyed by column header.
 */
export function parseVizierTsv(text) {
  if (!text) return [];
  const rawLines = text.split(/\r?\n/);
  const dataLines = [];
  for (const line of rawLines) {
    if (!line || line.startsWith('#')) continue;
    dataLines.push(line);
  }
  if (dataLines.length < 4) return [];

  const headers = dataLines[0].split('\t').map((h) => h.trim());
  // Row 1 is units, row 2 is dashes (-----)
  let startIdx = 1;
  while (startIdx < Math.min(5, dataLines.length) && !/^-{2,}/.test(dataLines[startIdx].trim())) {
    startIdx++;
  }
  startIdx = startIdx < Math.min(5, dataLines.length) ? startIdx + 1 : 3;

  const rows = [];
  for (let i = startIdx; i < dataLines.length; i++) {
    const line = dataLines[i];
    if (!line.trim()) continue;
    const cols = line.split('\t');
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = (cols[j] ?? '').trim();
    }
    rows.push(obj);
  }
  return rows;
}

/**
 * Simple 2D sky hash grid (0.25-deg cells) for O(1) J2000 coordinate cross-matching.
 */
export function createSkyGrid(cellDeg = 0.25) {
  const buckets = new Map();
  const keyOf = (raBin, decBin) => `${raBin},${decBin}`;

  return {
    add(raDeg, decDeg, item) {
      if (!Number.isFinite(raDeg) || !Number.isFinite(decDeg)) return;
      const normRa = ((raDeg % 360) + 360) % 360;
      const rBin = Math.floor(normRa / cellDeg);
      const dBin = Math.floor((decDeg + 90) / cellDeg);
      const k = keyOf(rBin, dBin);
      let list = buckets.get(k);
      if (!list) {
        list = [];
        buckets.set(k, list);
      }
      list.push({ ra: normRa, dec: decDeg, item });
    },
    query(raDeg, decDeg, maxArcsec = 30) {
      if (!Number.isFinite(raDeg) || !Number.isFinite(decDeg)) return [];
      const normRa = ((raDeg % 360) + 360) % 360;
      const decSpan = maxArcsec / 3600;
      const cosD = Math.max(0.05, Math.cos(decDeg * DEG2RAD));
      const raSpan = Math.min(180, decSpan / cosD);

      const dMin = Math.floor((decDeg - decSpan + 90) / cellDeg);
      const dMax = Math.floor((decDeg + decSpan + 90) / cellDeg);
      const rSteps = Math.max(1, Math.ceil(raSpan / cellDeg));
      const rCenter = Math.floor(normRa / cellDeg);
      const numRaBins = Math.ceil(360 / cellDeg);

      const hits = [];
      for (let db = dMin; db <= dMax; db++) {
        for (let dr = -rSteps; dr <= rSteps; dr++) {
          const rb = ((rCenter + dr) % numRaBins + numRaBins) % numRaBins;
          const list = buckets.get(keyOf(rb, db));
          if (!list) continue;
          for (const entry of list) {
            const sep = angularSepArcsec(normRa, decDeg, entry.ra, entry.dec);
            if (sep <= maxArcsec) {
              hits.push({ item: entry.item, sepArcsec: sep });
            }
          }
        }
      }
      hits.sort((a, b) => a.sepArcsec - b.sepArcsec);
      return hits;
    },
  };
}

/**
 * Propagate J2016.0 Gaia DR3 coordinates back 16 years to J2000.0 using proper motion.
 */
function propagateToJ2000(raDeg, decDeg, pmRaMasYr, pmDecMasYr, epochYear = 2016.0) {
  const dt = 2000.0 - epochYear; // -16.0 yr for Gaia DR3
  const cosD = Math.max(0.05, Math.cos(decDeg * DEG2RAD));
  const dDec = ((pmDecMasYr || 0) / 3600000) * dt;
  const dRa = (((pmRaMasYr || 0) / 3600000) * dt) / cosD;
  return {
    ra2000: (((raDeg + dRa) % 360) + 360) % 360,
    dec2000: Math.max(-90, Math.min(90, decDeg + dDec)),
  };
}

/**
 * Indexes ESA Gaia DR3 TAP JSON responses (supporting multiple merged query chunks).
 */
export function indexGaiaDr3(jsonTexts, astrometryToGalactic) {
  const bySourceId = new Map();
  const skyGrid = createSkyGrid(0.25);
  const spatialGrid = createSpatialGrid(1.5);

  for (const txt of jsonTexts) {
    if (!txt) continue;
    let parsed;
    try {
      parsed = JSON.parse(txt);
    } catch {
      continue;
    }
    const cols = (parsed.metadata || []).map((m) => m.name);
    const data = parsed.data || [];
    const idx = Object.fromEntries(cols.map((c, i) => [c, i]));

    for (const row of data) {
      const sourceId = row[idx.source_id] != null ? String(row[idx.source_id]) : null;
      if (!sourceId || bySourceId.has(sourceId)) continue;

      const ra = numOrNull(row[idx.ra]);
      const dec = numOrNull(row[idx.dec]);
      const parallax = numOrNull(row[idx.parallax]);
      if (ra === null || dec === null || parallax === null || parallax <= 0) continue;

      const pmra = numOrNull(row[idx.pmra]) ?? 0;
      const pmdec = numOrNull(row[idx.pmdec]) ?? 0;
      const rv = numOrNull(row[idx.radial_velocity]);
      const mh = numOrNull(row[idx.mh_gspphot]);
      const ruwe = numOrNull(row[idx.ruwe]);
      const nss = numOrNull(row[idx.non_single_star]) ?? 0;
      const gmag = numOrNull(row[idx.phot_g_mean_mag]);
      const plxErr = numOrNull(row[idx.parallax_over_error]);

      const distPc = 1000 / parallax;
      const distLy = distPc * LY_PER_PC;
      const { ra2000, dec2000 } = propagateToJ2000(ra, dec, pmra, pmdec, 2016.0);
      const { posGalLy } = astrometryToGalactic({
        raDeg: ra,
        decDeg: dec,
        distPc,
        pmRaMasYr: pmra,
        pmDecMasYr: pmdec,
        rvKmS: rv ?? 0,
      });

      const rec = {
        sourceId,
        ra,
        dec,
        ra2000,
        dec2000,
        parallax,
        parallaxOverError: plxErr,
        distPc,
        distLy,
        pmra,
        pmdec,
        rv,
        mhGspphot: mh,
        ruwe,
        nonSingleStar: nss > 0,
        gmag,
        posGalLy,
      };

      bySourceId.set(sourceId, rec);
      skyGrid.add(ra2000, dec2000, rec);
      spatialGrid.add(posGalLy, rec);
    }
  }

  return { bySourceId, skyGrid, spatialGrid, count: bySourceId.size };
}

/**
 * Matches a catalog system to its best ESA Gaia DR3 record.
 */
export function matchSystemToGaia(sys, gaiaIndex) {
  if (!gaiaIndex || sys.id === 'sol') return null;

  if (sys.ids?.gaiaDr3 && gaiaIndex.bySourceId.has(String(sys.ids.gaiaDr3))) {
    return gaiaIndex.bySourceId.get(String(sys.ids.gaiaDr3));
  }
  if (!Number.isFinite(sys.ra) || !Number.isFinite(sys.dec)) return null;

  // High-PM nearby stars can shift up to ~40 arcsec between Hipparcos J1991.25 / J2000 and J2016
  const maxSep = sys.distLy < 25 ? 60 : 25;
  const candidates = gaiaIndex.skyGrid.query(sys.ra, sys.dec, maxSep);
  if (!candidates.length) return null;

  let best = null;
  let bestScore = Infinity;
  for (const { item: g, sepArcsec } of candidates) {
    const distRatioErr = Math.abs(g.distLy - sys.distLy) / Math.max(1, sys.distLy);
    if (distRatioErr > 0.25) continue;
    // Reject obvious bright-vs-faint background mismatches when both magnitudes are known
    if (g.gmag !== null && Number.isFinite(sys.vmag) && sys.vmag < 90) {
      if (Math.abs(g.gmag - sys.vmag) > 4.2) continue;
    }
    const score = sepArcsec + distRatioErr * 60;
    if (score < bestScore) {
      bestScore = score;
      best = g;
    }
  }
  return best;
}

/**
 * Indexes CNS5 (Fifth Catalogue of Nearby Stars, Golovin et al. 2023) for supplementary
 * radial velocities (e.g. Scholz's Star, nearby cool M/L dwarfs missed by Gaia RVS).
 */
export function indexCns5(tsvText) {
  const rows = parseVizierTsv(tsvText);
  const byHip = new Map();
  const byGaia = new Map();
  const skyGrid = createSkyGrid(0.25);

  for (const r of rows) {
    const ra = numOrNull(r.RAJ2000);
    const dec = numOrNull(r.DEJ2000);
    const plx = numOrNull(r.plx);
    if (ra === null || dec === null || plx === null || plx <= 0) continue;

    const rec = {
      cns5: clean(r.CNS5),
      gj: clean(r.GJ),
      gaiaDr3: clean(r.GaiaDR3) || null,
      hip: numOrNull(r.HIP),
      ra,
      dec,
      plx,
      distPc: 1000 / plx,
      distLy: (1000 / plx) * LY_PER_PC,
      pmra: numOrNull(r.pmRA) ?? 0,
      pmdec: numOrNull(r.pmDE) ?? 0,
      rv: numOrNull(r.RV),
    };

    if (rec.hip) byHip.set(rec.hip, rec);
    if (rec.gaiaDr3) byGaia.set(rec.gaiaDr3, rec);
    skyGrid.add(ra, dec, rec);
  }

  return { byHip, byGaia, skyGrid, count: rows.length };
}

export function matchSystemToCns5(sys, cns5Index) {
  if (!cns5Index || sys.id === 'sol') return null;
  if (sys.ids?.gaiaDr3 && cns5Index.byGaia.has(String(sys.ids.gaiaDr3))) {
    return cns5Index.byGaia.get(String(sys.ids.gaiaDr3));
  }
  if (sys.ids?.hip && cns5Index.byHip.has(sys.ids.hip)) {
    return cns5Index.byHip.get(sys.ids.hip);
  }
  if (!Number.isFinite(sys.ra) || !Number.isFinite(sys.dec)) return null;
  const hits = cns5Index.skyGrid.query(sys.ra, sys.dec, 45);
  for (const { item } of hits) {
    if (Math.abs(item.distLy - sys.distLy) / Math.max(1, sys.distLy) <= 0.2) {
      return item;
    }
  }
  return null;
}

/**
 * Indexes NASA Exoplanet Archive `spectra` table by normalized planet name.
 */
export function indexNeaSpectra(jsonText) {
  const map = new Map();
  if (!jsonText) return map;

  let rows;
  try {
    rows = JSON.parse(jsonText);
  } catch {
    return map;
  }
  if (!Array.isArray(rows)) return map;

  const classifyFacility = (facStr) => {
    const f = (facStr || '').toLowerCase();
    if (f.includes('james webb') || f.includes('jwst')) return 'JWST';
    if (f.includes('hubble') || /\bhst\b/.test(f)) return 'HST';
    if (f.includes('spitzer')) return 'Spitzer';
    if (f.includes('very large telescope') || /\bvlt\b/.test(f)) return 'VLT';
    if (f.includes('keck')) return 'Keck';
    if (f.includes('gemini')) return 'Gemini';
    if (f.includes('magellan')) return 'Magellan';
    if (f.includes('large binocular') || /\blbt\b/.test(f)) return 'LBT';
    if (f.includes('gran telescopio') || /\bgtc\b/.test(f)) return 'GTC';
    return 'Ground';
  };

  for (const r of rows) {
    const plName = clean(r.pl_name);
    if (!plName) continue;
    const key = plName.toLowerCase();
    let entry = map.get(key);
    if (!entry) {
      entry = { count: 0, facilities: new Set(), hasJwst: false, hasHst: false };
      map.set(key, entry);
    }
    entry.count += 1;
    const tag = classifyFacility(r.facility);
    entry.facilities.add(tag);
    if (tag === 'JWST') entry.hasJwst = true;
    if (tag === 'HST') entry.hasHst = true;
  }

  return map;
}

/**
 * Indexes GCVS v5.1 Flare Stars (UV), BY Dra (BY), and RS CVn (RS) active stars.
 */
export function indexGcvsActivity(uvTsv, byTsv, rsTsv) {
  const skyGrid = createSkyGrid(0.25);
  let total = 0;

  const ingest = (tsv, defaultType) => {
    const rows = parseVizierTsv(tsv);
    for (const r of rows) {
      const ra = numOrNull(r._RAJ2000);
      const dec = numOrNull(r._DEJ2000);
      if (ra === null || dec === null) continue;
      const vt = clean(r.VarType) || defaultType;
      const isFlare = /\bUV\b|UVN|FLARE/i.test(vt) || defaultType === 'UV';
      skyGrid.add(ra, dec, {
        gcvs: clean(r.GCVS),
        varType: vt,
        activityType: isFlare ? 'UV' : /\bBY\b/i.test(vt) ? 'BY' : 'RS',
        isFlare,
      });
      total++;
    }
  };

  ingest(uvTsv, 'UV');
  ingest(byTsv, 'BY');
  ingest(rsTsv, 'RS');

  return { skyGrid, total };
}

/**
 * Indexes circumstellar debris disks from Cotten & Song (2016) and Chen et al. (2014).
 */
export function indexDebrisDisks(cottenTsv, chenTsv) {
  const skyGrid = createSkyGrid(0.25);
  const byName = new Set();

  const normName = (s) => clean(s).toLowerCase().replace(/\s+/g, ' ');
  const ingest = (tsv) => {
    const rows = parseVizierTsv(tsv);
    for (const r of rows) {
      const ra = numOrNull(r._RAJ2000 ?? r._RA);
      const dec = numOrNull(r._DEJ2000 ?? r._DE);
      const name = clean(r.Name);
      if (name) byName.add(normName(name));
      if (ra !== null && dec !== null) {
        skyGrid.add(ra, dec, { name });
      }
    }
  };

  ingest(cottenTsv);
  ingest(chenTsv);

  return { skyGrid, byName, normName };
}

// ---------------------------------------------------------------------------
// Ultracool & Brown Dwarf (L / T / Y) Ingestion from Kirkpatrick 2024 + Best 2021
// ---------------------------------------------------------------------------

const CANONICAL_ULTRACOOL_NAMES = [
  { match: /104915.*-531906/i, name: 'Luhman 16 AB', compPrefix: 'Luhman 16' },
  { match: /085510.*-071442/i, name: 'WISE 0855−0714', compPrefix: 'WISE 0855−0714' },
  { match: /072003.*-084651/i, name: "Scholz's Star", compPrefix: "Scholz's Star" },
  { match: /150649.*\+702736/i, name: "WISE 1506+7027 (Thompson's Dwarf)", compPrefix: 'WISE 1506+7027' },
  { match: /035000.*-565830/i, name: 'WISE 0350−5658', compPrefix: 'WISE 0350−5658' },
  { match: /072227.*-054031/i, name: 'UGPS 0722−0540', compPrefix: 'UGPS 0722−0540' },
  { match: /041519.*-093506/i, name: '2MASS 0415−0935', compPrefix: '2MASS 0415−0935' },
  { match: /154151.*-225025/i, name: 'WISE 1541−2250', compPrefix: 'WISE 1541−2250' },
  { match: /140518.*\+553421/i, name: 'WISE 1405+5534', compPrefix: 'WISE 1405+5534' },
];

/**
 * Compact verbose survey designations (e.g., "WISEA J085510.74-071442.5" -> "WISE 0855-0714")
 * while keeping recognizable catalog identifiers.
 */
function formatUltracoolName(rawName, oName) {
  for (const rule of CANONICAL_ULTRACOOL_NAMES) {
    if (rule.match.test(rawName)) {
      return { sysName: rule.name, compPrefix: rule.compPrefix };
    }
  }
  const cleanO = clean(oName).replace(/^NAME\s+/i, '');
  if (cleanO && !/^(WISE|2MASS|SDSS|DENIS|ULAS|UGPS|PSO|CFBDS|CWISE)/i.test(cleanO)) {
    return { sysName: cleanO, compPrefix: cleanO };
  }
  const m = /^(CWISE|WISE[PA]?C?|2MASS[WI]?|SDSS|DENIS-?P?|ULAS|UGPS|PSO|CFBDSIR?)\s*J?(\d{4})\d*(?:\.\d+)?([+-]\d{4})/i.exec(
    clean(rawName).replace(/^NAME\s+/i, '')
  );
  if (m) {
    const prefix = m[1].replace(/^WISE[PA]?C?$/i, 'WISE').replace(/^2MASS[WI]?$/i, '2MASS').replace(/^DENIS-?P?$/i, 'DENIS');
    const short = `${prefix} ${m[2]}${m[3].replace('-', '−')}`;
    return { sysName: short, compPrefix: short };
  }
  const fallback = clean(rawName).replace(/^--+/, '').trim();
  return { sysName: fallback, compPrefix: fallback };
}

/**
 * Parses an ultracool/brown-dwarf spectral type string into { cls, sub, cleanSpect }.
 */
export function parseUltracoolSpectralType(spOpt, spNir, teff) {
  const raw = clean(spNir) || clean(spOpt);
  // Check Y, T, L first, then M
  const m = /\b([LTYM])(\d(?:\.\d)?)/i.exec(raw);
  if (m) {
    const cls = m[1].toUpperCase();
    const sub = Number(m[2]);
    return { cls, sub, cleanSpect: `${cls}${m[2]}` };
  }
  if (Number.isFinite(teff)) {
    if (teff < 550) return { cls: 'Y', sub: teff < 300 ? 4 : 1, cleanSpect: teff < 300 ? 'Y4' : 'Y1' };
    if (teff < 1300) return { cls: 'T', sub: 5, cleanSpect: 'T5' };
    if (teff < 2250) return { cls: 'L', sub: 5, cleanSpect: 'L5' };
  }
  return { cls: 'M', sub: 8, cleanSpect: raw || 'M8V' };
}

/**
 * Estimates Teff (K) from L/T/Y spectral class & subtype (Pecaut & Mamajek / Kirkpatrick 2021).
 */
function estimateBrownDwarfTeff(cls, sub) {
  const s = Math.max(0, Math.min(9.5, Number.isFinite(sub) ? sub : 5));
  if (cls === 'L') return Math.round(2250 - s * 105); // L0 ~2250 K -> L9 ~1305 K
  if (cls === 'T') return Math.round(1300 - s * 80); // T0 ~1300 K -> T9 ~580 K
  if (cls === 'Y') return Math.round(Math.max(250, 480 - s * 55)); // Y0 ~480 K -> Y4 ~250 K
  if (cls === 'M') return Math.round(Math.max(2250, 3850 - s * 170));
  return 1200;
}

/**
 * Computes physical star/brown-dwarf properties for an ultracool entry.
 */
function buildUltracoolComponent({ name, spOpt, spNir, teffIn, massIn, getKopparapuHZ, sig }) {
  const parsed = parseUltracoolSpectralType(spOpt, spNir, teffIn);
  const teff = Number.isFinite(teffIn) && teffIn > 150 ? Math.round(teffIn) : estimateBrownDwarfTeff(parsed.cls, parsed.sub);
  // Brown dwarfs have nearly degenerate electron-pressure radii ~0.095 R_sun (~1 R_Jupiter)
  const isBrownDwarf = parsed.cls === 'L' || parsed.cls === 'T' || parsed.cls === 'Y';
  const radius = isBrownDwarf ? 0.095 : 0.115;
  const lum = Math.max(1e-8, radius ** 2 * (teff / T_SUN) ** 4);
  const mass =
    Number.isFinite(massIn) && massIn > 0
      ? sig(massIn, 3)
      : parsed.cls === 'Y'
        ? 0.015
        : parsed.cls === 'T'
          ? 0.035
          : parsed.cls === 'L'
            ? 0.055
            : 0.085;
  const hz = getKopparapuHZ(lum, teff);

  return {
    name,
    hip: null,
    hd: null,
    hr: null,
    gl: null,
    spect: parsed.cleanSpect,
    cls: parsed.cls,
    lumClass: isBrownDwarf ? 'BD' : 'V',
    vmag: isBrownDwarf ? 22.0 : 18.0,
    absmag: isBrownDwarf ? 24.0 : 19.0,
    bv: null,
    teff,
    lum: sig(lum, 3),
    radius: sig(radius, 3),
    mass,
    hz,
  };
}

/**
 * Parses Kirkpatrick et al. (2024) 20-pc census and Best et al. (2021) UltracoolSheet
 * L0-T8 catalog to produce:
 *   1. `kirkActivityBySky`: sky-indexed flare/activity flags & RUWE for existing HYG stars
 *   2. `ultracoolSystems`: new nearby L/T/Y brown dwarf & ultracool systems not in HYG/NEA
 */
export function processUltracoolCatalogs({
  kirkTsv,
  bestTsv,
  maxRadiusLy,
  closeVolumeLy,
  constellationNom,
  astrometryToGalactic,
  getKopparapuHZ,
  catalogGrid,
  existingSkyGrid,
  makeUniqueSysId,
  round,
  sig,
}) {
  const kirkRows = parseVizierTsv(kirkTsv);
  const bestRows = parseVizierTsv(bestTsv);

  // Build activity/RUWE lookup from ALL Kirkpatrick 2024 rows (for enriching existing HYG stars)
  const kirkActivitySky = createSkyGrid(0.25);
  for (const r of kirkRows) {
    const ra = numOrNull(r._RAJ2000 ?? r.RAPdeg);
    const dec = numOrNull(r._DEJ2000 ?? r.DEPdeg);
    const vt = clean(r.VarType);
    const ruwe = numOrNull(r.RUWE);
    if (ra !== null && dec !== null && (vt || ruwe !== null)) {
      kirkActivitySky.add(ra, dec, {
        varType: vt,
        isFlare: /\bUV\b|flare/i.test(vt),
        ruwe,
        gaiaRV: numOrNull(r.GaiaRV),
      });
    }
  }

  // Group Kirkpatrick 2024 rows into parent systems + "--" child components
  const kirkSystems = [];
  let currentParent = null;
  for (const r of kirkRows) {
    const rawName = r.Name || '';
    if (!rawName.trim() || rawName.trim().toLowerCase() === 'sun') {
      currentParent = null;
      continue;
    }
    if (rawName.startsWith('--') && currentParent) {
      currentParent.children.push(r);
    } else {
      currentParent = { parent: r, children: [] };
      kirkSystems.push(currentParent);
    }
  }

  const addedSystems = [];
  const addedSkyGrid = createSkyGrid(0.25);

  const isAlreadyInCatalog = (posGalLy, raDeg, decDeg, distLy) => {
    const near3D = catalogGrid.queryWithin(posGalLy, 0.35);
    for (const h of near3D) {
      const s = h.item;
      if (angularSepArcsec(raDeg, decDeg, s.ra, s.dec) < 45) return true;
      if (Math.sqrt(h.distSq) < 0.15) return true;
    }
    const skyHits = existingSkyGrid.query(raDeg, decDeg, 25);
    for (const h of skyHits) {
      if (Math.abs(h.item.distLy - distLy) / Math.max(1, distLy) < 0.25) return true;
    }
    const addedHits = addedSkyGrid.query(raDeg, decDeg, 30);
    for (const h of addedHits) {
      if (Math.abs(h.item.distLy - distLy) / Math.max(1, distLy) < 0.25) return true;
    }
    return false;
  };

  // A. Ingest all L/T/Y brown dwarfs + Scholz's Star from Kirkpatrick et al. (2024)
  for (const grp of kirkSystems) {
    const p = grp.parent;
    const plx = numOrNull(p.Plx);
    const ra = numOrNull(p._RAJ2000 ?? p.RAPdeg);
    const dec = numOrNull(p._DEJ2000 ?? p.DEPdeg);
    if (plx === null || plx <= 0 || ra === null || dec === null) continue;

    const distPc = 1000 / plx;
    const distLy = distPc * LY_PER_PC;
    if (distLy > maxRadiusLy) continue;

    // Inspect spectral classes of parent and children
    const memberRows = grp.children.length > 0 ? grp.children : [p];
    const hasLTY = memberRows.some((m) => {
      const parsed = parseUltracoolSpectralType(m.SpTOpt || p.SpTOpt, m.SpTNIR || p.SpTNIR, numOrNull(m.Teff));
      return parsed.cls === 'L' || parsed.cls === 'T' || parsed.cls === 'Y';
    });
    const isIconicScholz = /072003.*-084651|scholz/i.test(`${p.Name} ${p.OName}`);
    if (!hasLTY && !isIconicScholz) continue;

    const pmra = numOrNull(p.pmRA) ?? 0;
    const pmdec = numOrNull(p.pmDE) ?? 0;
    const rv = numOrNull(p.GaiaRV);
    const { posGalLy, velGalLyKyr } = astrometryToGalactic({
      raDeg: ra,
      decDeg: dec,
      distPc,
      pmRaMasYr: pmra,
      pmDecMasYr: pmdec,
      rvKmS: rv ?? 0,
    });

    if (isAlreadyInCatalog(posGalLy, ra, dec, distLy)) continue;

    const { sysName, compPrefix } = formatUltracoolName(p.Name, p.OName);
    const stars = memberRows.map((m, idx) => {
      const compSuffix = memberRows.length > 1 ? ` ${String.fromCharCode(65 + idx)}` : '';
      const teffIn = numOrNull(m.Teff) ?? numOrNull(p.Teff);
      const massIn = numOrNull(m.Mass) ?? numOrNull(p.Mass);
      return buildUltracoolComponent({
        name: memberRows.length > 1 ? `${compPrefix}${compSuffix}` : sysName,
        spOpt: m.SpTOpt || p.SpTOpt,
        spNir: m.SpTNIR || p.SpTNIR,
        teffIn,
        massIn,
        getKopparapuHZ,
        sig,
      });
    });

    const gaiaMatch = /(\d{10,})/.exec(p.Gaia || '');
    const constCode = clean(p.Const) || clean(memberRows[0]?.Const);
    const vmagEst = numOrNull(p.Gmag) ?? (stars[0].cls === 'Y' ? 25.0 : stars[0].cls === 'T' ? 22.0 : 19.5);
    const rawId = `uc-${sysName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
    const sysId = makeUniqueSysId(rawId);

    const record = {
      id: sysId,
      name: sysName,
      constellation: constellationNom[constCode] || constCode || null,
      pos: posGalLy.map((v) => round(v, 3)),
      vel: velGalLyKyr.map((v) => round(v, 4)),
      hasFull3dVelocity: rv !== null,
      radialVelocityKmS: rv !== null ? round(rv, 2) : null,
      velocitySource: rv !== null ? 'Gaia DR3' : 'Kirkpatrick 2024',
      distLy: round(distLy, 3),
      distPc: round(distPc, 3),
      ra: round(ra, 5),
      dec: round(dec, 5),
      vmag: round(vmagEst, 2),
      isVisibleFromEarth: false,
      tier: distLy <= closeVolumeLy || isIconicScholz ? 1 : 2,
      hasPlanets: false,
      planetCount: 0,
      hasConservativeHZ: false,
      hasOptimisticHZ: false,
      hasTerrestrialHZ: false,
      hasJwstSpectra: false,
      maxEsi: null,
      isBrownDwarf: stars[0].cls === 'L' || stars[0].cls === 'T' || stars[0].cls === 'Y',
      isFlareStar: /\bUV\b|flare/i.test(clean(p.VarType)),
      activityType: /\bUV\b|flare/i.test(clean(p.VarType)) ? 'UV' : null,
      hasDebrisDisk: false,
      metallicityFeH: null,
      ruwe: numOrNull(p.RUWE) !== null ? round(numOrNull(p.RUWE), 2) : null,
      nonSingleStar: memberRows.length > 1,
      ids: {
        hip: null,
        hd: null,
        hr: null,
        gl: clean(p.GJ) ? `GJ ${clean(p.GJ)}` : null,
        gaiaDr3: gaiaMatch ? gaiaMatch[1] : null,
        ticId: null,
        neaHost: null,
      },
      stars,
      planets: [],
    };

    addedSystems.push(record);
    addedSkyGrid.add(ra, dec, record);
    catalogGrid.add(record.pos, record);
  }

  // B. Supplement with Best et al. (2021) UltracoolSheet Volume-Limited L0-T8 Brown Dwarfs (20-32 pc)
  for (const r of bestRows) {
    const plx = numOrNull(r.plx);
    const distPcIn = numOrNull(r.Dist);
    const distPc = distPcIn && distPcIn > 0 ? distPcIn : plx && plx > 0 ? 1000 / plx : null;
    const ra = numOrNull(r._RA);
    const dec = numOrNull(r._DE);
    if (!distPc || ra === null || dec === null) continue;

    const distLy = distPc * LY_PER_PC;
    if (distLy > maxRadiusLy) continue;

    const spOpt = r['SpT-opt'] === '...' ? '' : r['SpT-opt'];
    const spNir = r['SpT-nir'] === '...' ? '' : r['SpT-nir'];
    const parsed = parseUltracoolSpectralType(spOpt, spNir, null);
    if (parsed.cls !== 'L' && parsed.cls !== 'T' && parsed.cls !== 'Y') continue;

    const { posGalLy, velGalLyKyr } = astrometryToGalactic({
      raDeg: ra,
      decDeg: dec,
      distPc,
      pmRaMasYr: 0,
      pmDecMasYr: 0,
      rvKmS: 0,
    });

    if (isAlreadyInCatalog(posGalLy, ra, dec, distLy)) continue;

    const { sysName } = formatUltracoolName(r.Object, '');
    const star = buildUltracoolComponent({
      name: sysName,
      spOpt,
      spNir,
      teffIn: null,
      massIn: null,
      getKopparapuHZ,
      sig,
    });

    const rawId = `uc-${sysName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
    const sysId = makeUniqueSysId(rawId);

    const record = {
      id: sysId,
      name: sysName,
      constellation: null,
      pos: posGalLy.map((v) => round(v, 3)),
      vel: velGalLyKyr.map((v) => round(v, 4)),
      hasFull3dVelocity: false,
      radialVelocityKmS: null,
      velocitySource: 'UltracoolSheet',
      distLy: round(distLy, 3),
      distPc: round(distPc, 3),
      ra: round(ra, 5),
      dec: round(dec, 5),
      vmag: star.cls === 'T' ? 22.0 : 19.5,
      isVisibleFromEarth: false,
      tier: distLy <= closeVolumeLy ? 1 : 2,
      hasPlanets: false,
      planetCount: 0,
      hasConservativeHZ: false,
      hasOptimisticHZ: false,
      hasTerrestrialHZ: false,
      hasJwstSpectra: false,
      maxEsi: null,
      isBrownDwarf: true,
      isFlareStar: false,
      activityType: null,
      hasDebrisDisk: false,
      metallicityFeH: null,
      ruwe: null,
      nonSingleStar: false,
      ids: {
        hip: null,
        hd: null,
        hr: null,
        gl: null,
        gaiaDr3: null,
        ticId: null,
        neaHost: null,
      },
      stars: [star],
      planets: [],
    };

    addedSystems.push(record);
    addedSkyGrid.add(ra, dec, record);
    catalogGrid.add(record.pos, record);
  }

  return { kirkActivitySky, addedSystems };
}
