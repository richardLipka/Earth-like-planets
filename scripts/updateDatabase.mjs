#!/usr/bin/env node
/**
 * ASTROMETRICS // 3D — Periodic Local Database Updater (100% Automated, Zero LLM Required)
 *
 * Updates local JSON datasets in `public/data/`:
 *   1. `astrometrics_catalog.json` — Stars (HYG v3.8 + Pecaut & Mamajek) & Confirmed Exoplanets
 *      (live NASA Exoplanet Archive `pscomppars` TAP API).
 *   2. `scifi_literature.json`     — Whole-catalogue Sci-Fi Literature sweep across Wikipedia
 *      and 11+ franchise MediaWiki APIs + user-editable `scripts/config/scifi_custom.json`.
 *   3. `scifi_voyages.json`        — Physics-validated canonical & custom Sci-Fi voyages from
 *      built-in presets + `scripts/config/voyages_custom.json`.
 *
 * Features:
 *   - Smart TTL-based cache expiration (default: planets 7d, scifi 30d, calibration 90d, stars 180d)
 *   - Expandable 3D sphere radius (`--radius 150`, `--radius 200`, etc.) with automatic NASA TAP
 *     distance expansion and whole-catalogue Sci-Fi re-matching
 *   - Before -> After diff summary showing newly discovered exoplanets, HZ systems & Sci-Fi matches
 *   - Optional pre-update backup (`--backup`), offline rebuild (`--offline`), dry-run (`--check`),
 *     and automatic post-update test verification (`vitest run`)
 *
 * Usage:
 *   node scripts/updateDatabase.mjs [options]
 *   npm run update-db -- --radius 150
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  getArgValue,
  getNumArg,
  readJsonIfExists,
  writeJsonAtomic,
  fileAgeDays,
  isCacheFresh,
} from './lib/ioUtils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'public', 'data');
const CACHE_DIR = path.join(__dirname, '.cache');
const BACKUP_DIR = path.join(__dirname, '.backups');
const CONFIG_PATH = path.join(__dirname, 'config', 'database.config.json');

const CATALOG_PATH = path.join(DATA_DIR, 'astrometrics_catalog.json');
const SCIFI_PATH = path.join(DATA_DIR, 'scifi_literature.json');
const VOYAGES_PATH = path.join(DATA_DIR, 'scifi_voyages.json');

const argv = process.argv.slice(2);

function printHelp() {
  console.log(`
ASTROMETRICS // 3D — Local Database Updater (No LLM Required)

Usage:
  npm run update-db -- [options]
  node scripts/updateDatabase.mjs [options]

Options:
  --radius <ly>         Set star sphere radius in light-years (default from database.config.json, e.g. 105, 150, 200, 300)
  --hz-radius <ly>      Extended Habitable Zone exoplanet cutoff (default: max(135, radius + 30))
  --close-volume <ly>   Radius within which ALL faint stars are included in Core Tier 1 (default: 35)
  --mag-limit <vmag>    Apparent magnitude cutoff for Tier 2 stars beyond close-volume (default: 8.5)
  --save-config         Save --radius / density options into scripts/config/database.config.json
  --planets-only        Fast refresh: query live NASA Exoplanet Archive only + rebuild catalog & voyages
  --scifi-only          Refresh Sci-Fi literature sweep & custom entries only
  --voyages-only        Rebuild & validate Sci-Fi voyages library only (after editing voyages_custom.json)
  --force, --refresh    Ignore cache TTLs and re-download all selected upstream sources live
  --offline             Rebuild strictly from local .cache/ and scripts/config/*.json (zero network calls)
  --check, --dry-run    Inspect database metadata, cache ages, and what would update (writes nothing)
  --backup              Snapshot existing public/data/*.json into scripts/.backups/<timestamp>/ first
  --no-verify           Skip post-update Vitest integrity checks
  -h, --help            Show this help message

Examples:
  npm run update-db                          # Smart periodic update (auto-refreshes stale caches by TTL)
  npm run update-db:planets                  # Fast live check for newly discovered NASA exoplanets
  npm run update-db -- --radius 150          # Expand 3D star sphere to 150 ly (stars + planets + sci-fi)
  npm run update-db -- --radius 200 --save-config --backup
  npm run update-db -- --offline             # Instant local rebuild after editing scripts/config/*.json
  npm run update-db:check                    # Show current catalogue stats & cache ages without modifying files
`);
}

if (argv.includes('-h') || argv.includes('--help')) {
  printHelp();
  process.exit(0);
}

const config = readJsonIfExists(CONFIG_PATH, {}) || {};
const FORCE = argv.includes('--force') || argv.includes('--refresh');
const OFFLINE = argv.includes('--offline');
const CHECK_ONLY = argv.includes('--check') || argv.includes('--dry-run');
const DO_BACKUP = argv.includes('--backup');
const SAVE_CONFIG = argv.includes('--save-config');
const NO_VERIFY = argv.includes('--no-verify');

const PLANETS_ONLY = argv.includes('--planets-only');
const SCIFI_ONLY = argv.includes('--scifi-only');
const VOYAGES_ONLY = argv.includes('--voyages-only');

const radiusArg = getNumArg(argv, '--radius', null);
const hzRadiusArg = getNumArg(argv, '--hz-radius', null);
const closeVolArg = getNumArg(argv, '--close-volume', null);
const magLimitArg = getNumArg(argv, '--mag-limit', null);

const targetRadiusLy = radiusArg ?? Number(config.radiusLy) ?? 105;
const targetHzRadiusLy =
  hzRadiusArg ??
  Math.max(
    Number(config.minExtendedHzRadiusLy) || 135,
    targetRadiusLy + (Number(config.extendedHzMarginLy) || 30)
  );
const targetCloseVolLy = closeVolArg ?? Number(config.closeVolumeLy) ?? 35;
const targetMagLimit = magLimitArg ?? Number(config.extendedMagLimit) ?? 8.5;

function snapshotDataset() {
  const catalog = readJsonIfExists(CATALOG_PATH, null);
  const scifi = readJsonIfExists(SCIFI_PATH, null);
  const voyages = readJsonIfExists(VOYAGES_PATH, null);

  const systemIds = new Set();
  const planetNames = new Set();
  const hzPlanetNames = new Set();
  for (const s of catalog?.systems || []) {
    systemIds.add(s.id);
    for (const p of s.planets || []) {
      planetNames.add(p.name);
      if (p.hzStatus >= 1) hzPlanetNames.add(p.name);
    }
  }

  const scifiStarNames = new Map();
  for (const [id, entry] of Object.entries(scifi?.bySystemId || {})) {
    scifiStarNames.set(id, entry.systemName || id);
  }

  return {
    catalogMeta: catalog?.meta || null,
    scifiMeta: scifi?.meta || null,
    voyagesMeta: voyages?.meta || null,
    systemIds,
    planetNames,
    hzPlanetNames,
    scifiStarNames,
    voyageIds: new Set((voyages?.voyages || []).map((v) => v.id)),
  };
}

function printStatusReport(snap) {
  const ttl = config.cacheMaxAgeDays || { planets: 7, stars: 180, calibration: 90, scifi: 30 };
  const lyPerPc = 3.261563777;
  const neaMaxPc = Math.max(45, Math.ceil(targetHzRadiusLy / lyPerPc) + 2);
  const neaFile = neaMaxPc === 45 ? 'nea_pscomppars_nearby.json' : `nea_pscomppars_max_${neaMaxPc}pc.json`;

  console.log('\n=== ASTROMETRICS // 3D — Local Database Status ===');
  if (snap.catalogMeta) {
    const c = snap.catalogMeta.counts || {};
    console.log(
      `Catalogue : generated ${snap.catalogMeta.generatedAt} | sphere <= ${snap.catalogMeta.maxRadiusLy} ly (HZ <= ${snap.catalogMeta.extendedHzRadiusLy} ly)`
    );
    console.log(
      `            ${c.totalSystems} systems (${c.tier1CoreSystems} core Tier 1), ${c.exoplanetHostSystems} exoplanet hosts, ${c.totalConfirmedPlanets} planets, ${c.optimisticHzHostSystems} HZ hosts`
    );
  } else {
    console.log('Catalogue : NOT BUILT YET');
  }
  if (snap.scifiMeta) {
    console.log(
      `Sci-Fi    : generated ${snap.scifiMeta.generatedAt} | ${snap.scifiMeta.systemsWithFictionCount} / ${snap.scifiMeta.catalogueSystemsSwept} stars matched (${snap.scifiMeta.curatedHighlightsCount} structured + ${snap.scifiMeta.wikipediaCategoryWorksCount} Wikipedia works)`
    );
  }
  if (snap.voyagesMeta) {
    console.log(
      `Voyages   : generated ${snap.voyagesMeta.generatedAt} | ${snap.voyagesMeta.voyageCount} scenarios (${snap.voyagesMeta.totalShipsCount} ships, ${snap.voyagesMeta.customVoyagesCount || 0} custom)`
    );
  }

  console.log('\nUpstream Cache Freshness:');
  const gaiaCoreMinPlx = Math.max(27, Math.floor(1000 / Math.min(36, Math.ceil(targetRadiusLy / lyPerPc) + 3)));
  const checks = [
    { label: 'HYG v3.8 Stars', file: path.join(CACHE_DIR, 'hyg_v38.csv.gz'), maxAge: ttl.stars ?? 180 },
    { label: `ESA Gaia DR3 (plx>${gaiaCoreMinPlx})`, file: path.join(CACHE_DIR, `gaia_dr3_plx_${gaiaCoreMinPlx}.json`), maxAge: ttl.gaia ?? 180 },
    { label: 'Ultracool (Kirkpatrick 24)', file: path.join(CACHE_DIR, 'vizier_kirkpatrick2024_20pc.tsv'), maxAge: ttl.ultracool ?? 180 },
    { label: 'UltracoolSheet (Best 21)', file: path.join(CACHE_DIR, 'vizier_best2021_ultracool.tsv'), maxAge: ttl.ultracool ?? 180 },
    { label: 'CNS5 25-pc Census', file: path.join(CACHE_DIR, 'vizier_cns5_25pc.tsv'), maxAge: ttl.ultracool ?? 180 },
    { label: 'Pecaut & Mamajek', file: path.join(CACHE_DIR, 'EEM_dwarf_UBVIJHK_colors_Teff.txt'), maxAge: ttl.calibration ?? 90 },
    { label: `NASA Exoplanets (<=${neaMaxPc} pc)`, file: path.join(CACHE_DIR, neaFile), maxAge: ttl.planets ?? 7 },
    { label: 'NASA Spectra (JWST/HST)', file: path.join(CACHE_DIR, 'nea_spectra.json'), maxAge: ttl.spectra ?? 7 },
    { label: 'GCVS Flare Stars (UV)', file: path.join(CACHE_DIR, 'vizier_gcvs_uv.tsv'), maxAge: ttl.activity ?? 90 },
    { label: 'Debris Disks (Cotten 16)', file: path.join(CACHE_DIR, 'vizier_debris_cotten2016.tsv'), maxAge: ttl.activity ?? 90 },
    { label: 'Wikipedia Sci-Fi Categories', file: path.join(CACHE_DIR, 'scifi_v2', 'wiki_allcategories_fiction_set_around.json'), maxAge: ttl.scifi ?? 30 },
  ];
  for (const ch of checks) {
    const exists = fs.existsSync(ch.file);
    const age = fileAgeDays(ch.file);
    const fresh = isCacheFresh(ch.file, ch.maxAge);
    const status = !exists
      ? 'MISSING (will download)'
      : fresh
        ? `FRESH (${age.toFixed(1)}d / ${ch.maxAge}d TTL)`
        : `STALE (${age.toFixed(1)}d > ${ch.maxAge}d TTL — will refresh)`;
    console.log(`  - ${ch.label.padEnd(28)} : ${status}`);
  }
  console.log(`\nTarget parameters for next run: radius=${targetRadiusLy} ly, hzRadius=${targetHzRadiusLy} ly, closeVolume=${targetCloseVolLy} ly, magLimit=${targetMagLimit}`);
}

function backupCurrentData() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = path.join(BACKUP_DIR, stamp);
  fs.mkdirSync(dir, { recursive: true });
  let count = 0;
  for (const f of ['astrometrics_catalog.json', 'scifi_literature.json', 'scifi_voyages.json']) {
    const src = path.join(DATA_DIR, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(dir, f));
      count++;
    }
  }
  console.log(`[BACKUP] Saved ${count} existing dataset file(s) to ${path.relative(ROOT, dir)}`);
}

function runNodeScript(scriptRelPath, scriptArgs = []) {
  const full = path.join(ROOT, scriptRelPath);
  console.log(`\n[RUN] node ${scriptRelPath} ${scriptArgs.join(' ')}`.trim());
  const res = spawnSync(process.execPath, [full, ...scriptArgs], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (res.status !== 0) {
    throw new Error(`Script ${scriptRelPath} exited with status ${res.status}`);
  }
}

function runVerificationTests() {
  console.log('\n[VERIFY] Running Vitest physics & catalogue integrity suite...');
  const vitestBin = path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs');
  const res = spawnSync(process.execPath, [vitestBin, 'run'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (res.status !== 0) {
    throw new Error(`Verification tests failed with status ${res.status}`);
  }
}

function formatDelta(before, after) {
  const d = (after ?? 0) - (before ?? 0);
  if (d === 0) return '0';
  return d > 0 ? `+${d}` : `${d}`;
}

function printDiffSummary(before, after) {
  const bc = before.catalogMeta?.counts || {};
  const ac = after.catalogMeta?.counts || {};

  const addedPlanets = [...after.planetNames].filter((p) => !before.planetNames.has(p)).sort();
  const removedPlanets = [...before.planetNames].filter((p) => !after.planetNames.has(p)).sort();
  const addedHzPlanets = [...after.hzPlanetNames].filter((h) => !before.hzPlanetNames.has(h)).sort();
  const addedSciFi = [...after.scifiStarNames.entries()]
    .filter(([id]) => !before.scifiStarNames.has(id))
    .map(([, name]) => name)
    .sort();

  console.log('\n============================================================');
  console.log('  ASTROMETRICS // 3D — DATABASE UPDATE DIFF SUMMARY');
  console.log('============================================================');
  console.log(
    `  Sphere Radius      : ${before.catalogMeta?.maxRadiusLy ?? '?'} ly -> ${after.catalogMeta?.maxRadiusLy ?? '?'} ly (HZ <= ${after.catalogMeta?.extendedHzRadiusLy ?? '?'} ly)`
  );
  console.log(
    `  Star Systems       : ${bc.totalSystems ?? 0} -> ${ac.totalSystems ?? 0} (${formatDelta(bc.totalSystems, ac.totalSystems)})`
  );
  console.log(
    `  Tier 1 Core Stars  : ${bc.tier1CoreSystems ?? 0} -> ${ac.tier1CoreSystems ?? 0} (${formatDelta(bc.tier1CoreSystems, ac.tier1CoreSystems)})`
  );
  console.log(
    `  Exoplanet Hosts    : ${bc.exoplanetHostSystems ?? 0} -> ${ac.exoplanetHostSystems ?? 0} (${formatDelta(bc.exoplanetHostSystems, ac.exoplanetHostSystems)})`
  );
  console.log(
    `  Confirmed Planets  : ${bc.totalConfirmedPlanets ?? 0} -> ${ac.totalConfirmedPlanets ?? 0} (${formatDelta(bc.totalConfirmedPlanets, ac.totalConfirmedPlanets)})`
  );
  console.log(
    `  HZ Host Systems    : ${bc.optimisticHzHostSystems ?? 0} -> ${ac.optimisticHzHostSystems ?? 0} (${formatDelta(bc.optimisticHzHostSystems, ac.optimisticHzHostSystems)})`
  );
  console.log(
    `  Full 3D Velocity   : ${bc.full3dVelocitySystems ?? 0} -> ${ac.full3dVelocitySystems ?? 0} (${formatDelta(bc.full3dVelocitySystems, ac.full3dVelocitySystems)})`
  );
  console.log(
    `  L/T/Y Brown Dwarfs : ${bc.brownDwarfSystems ?? 0} -> ${ac.brownDwarfSystems ?? 0} (${formatDelta(bc.brownDwarfSystems, ac.brownDwarfSystems)})`
  );
  console.log(
    `  JWST Spectra Worlds: ${bc.jwstSpectraPlanets ?? 0} -> ${ac.jwstSpectraPlanets ?? 0} (${formatDelta(bc.jwstSpectraPlanets, ac.jwstSpectraPlanets)})`
  );
  console.log(
    `  Flare / Debris Sys : ${ac.flareStarSystems ?? 0} flare stars · ${ac.debrisDiskSystems ?? 0} debris disks · ${ac.highEsiPlanets ?? 0} high-ESI (>=0.75)`
  );
  console.log(
    `  Sci-Fi Stars       : ${before.scifiMeta?.systemsWithFictionCount ?? 0} -> ${after.scifiMeta?.systemsWithFictionCount ?? 0} (${formatDelta(before.scifiMeta?.systemsWithFictionCount, after.scifiMeta?.systemsWithFictionCount)})`
  );
  console.log(
    `  Sci-Fi Voyages     : ${before.voyagesMeta?.voyageCount ?? 0} -> ${after.voyagesMeta?.voyageCount ?? 0} (${formatDelta(before.voyagesMeta?.voyageCount, after.voyagesMeta?.voyageCount)})`
  );

  if (addedPlanets.length > 0) {
    const preview = addedPlanets.slice(0, 15).join(', ');
    const more = addedPlanets.length > 15 ? ` ... (+${addedPlanets.length - 15} more)` : '';
    console.log(`\n  + New Planets (${addedPlanets.length}): ${preview}${more}`);
  }
  if (removedPlanets.length > 0) {
    const preview = removedPlanets.slice(0, 10).join(', ');
    const more = removedPlanets.length > 10 ? ` ... (+${removedPlanets.length - 10} more)` : '';
    console.log(`  - Removed Planets (${removedPlanets.length}): ${preview}${more}`);
  }
  if (addedHzPlanets.length > 0) {
    const preview = addedHzPlanets.slice(0, 12).join(', ');
    const more = addedHzPlanets.length > 12 ? ` ... (+${addedHzPlanets.length - 12} more)` : '';
    console.log(`  + New HZ Planets (${addedHzPlanets.length}): ${preview}${more}`);
  }
  if (addedSciFi.length > 0) {
    const preview = addedSciFi.slice(0, 15).join(', ');
    const more = addedSciFi.length > 15 ? ` ... (+${addedSciFi.length - 15} more)` : '';
    console.log(`  + New Sci-Fi Stars (${addedSciFi.length}): ${preview}${more}`);
  }
  console.log('============================================================\n');

  // Persist machine-readable report into gitignored cache
  writeJsonAtomic(
    path.join(CACHE_DIR, 'last_update_report.json'),
    {
      updatedAt: new Date().toISOString(),
      radiusLy: after.catalogMeta?.maxRadiusLy,
      extendedHzRadiusLy: after.catalogMeta?.extendedHzRadiusLy,
      beforeCounts: bc,
      afterCounts: ac,
      addedPlanets,
      removedPlanets,
      addedHzPlanets,
      addedSciFiStars: addedSciFi,
    },
    true
  );
}

async function main() {
  const before = snapshotDataset();

  if (CHECK_ONLY) {
    printStatusReport(before);
    return;
  }

  if (SAVE_CONFIG) {
    const nextConfig = {
      ...config,
      radiusLy: targetRadiusLy,
      closeVolumeLy: targetCloseVolLy,
      extendedMagLimit: targetMagLimit,
    };
    writeJsonAtomic(CONFIG_PATH, nextConfig, true);
    console.log(`[CONFIG] Saved updated defaults to ${path.relative(ROOT, CONFIG_PATH)}`);
  }

  if (DO_BACKUP) {
    backupCurrentData();
  }

  const radiusChanged =
    before.catalogMeta?.maxRadiusLy !== undefined &&
    before.catalogMeta.maxRadiusLy !== targetRadiusLy;

  const runCatalog = !SCIFI_ONLY && !VOYAGES_ONLY;
  // Always re-run Sci-Fi sweep if radius changed so newly added stars are matched against all wikis!
  const runSciFi = !VOYAGES_ONLY && (!PLANETS_ONLY || radiusChanged);
  const runVoyages = !SCIFI_ONLY;

  if (runCatalog) {
    const args = [
      '--radius',
      String(targetRadiusLy),
      '--hz-radius',
      String(targetHzRadiusLy),
      '--close-volume',
      String(targetCloseVolLy),
      '--mag-limit',
      String(targetMagLimit),
    ];
    if (OFFLINE) args.push('--offline');
    else if (FORCE) args.push('--refresh');
    else if (PLANETS_ONLY) args.push('--refresh-planets');
    else args.push('--respect-ttl');

    runNodeScript('scripts/buildAstrometricsData.mjs', args);
  }

  if (runSciFi) {
    const args = [];
    if (OFFLINE) args.push('--offline');
    else if (FORCE) args.push('--refresh');
    else args.push('--respect-ttl');

    runNodeScript('scripts/buildSciFiSweep.mjs', args);
  }

  if (runVoyages) {
    runNodeScript('scripts/buildSciFiVoyages.mjs', []);
  }

  const after = snapshotDataset();
  printDiffSummary(before, after);

  if (!NO_VERIFY) {
    runVerificationTests();
  }
}

main().catch((err) => {
  console.error('\n[UPDATE] Database update failed:', err.message);
  process.exit(1);
});
