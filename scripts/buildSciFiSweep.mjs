#!/usr/bin/env node
/**
 * Whole-Catalogue Sci-Fi Literature & Media Sweep Script (`npm run scifi`)
 *
 * Sweeps ALL 3,494 real star systems in `public/data/astrometrics_catalog.json`
 * (using full HYG v3.8 Bayer/Flamsteed/Variable/Proper/Gliese/HIP/HD alias resolution)
 * against live web sources:
 *
 *   1. Wikipedia MediaWiki API:
 *      - Dynamic discovery of ALL `Category:Fiction_set_around_*` categories (27+)
 *      - Full wikitext wikilink & mention sweep of `Stars in fiction`,
 *        `Extrasolar planets in fiction`, all Alastair Reynolds *Revelation Space*
 *        articles, and 20+ landmark hard sci-fi universe articles.
 *   2. Revelation Space Wiki (`revelationspace.fandom.com/api.php`):
 *      - Full sweep of `Category:Systems` & `Category:Planets` + wikitext extraction.
 *   3. Bobiverse Wiki (`bobiverse.fandom.com/api.php`):
 *      - Full sweep of `Category:Star_Systems` & `Category:Planets` + wikitext.
 *   4. Halopedia (`www.halopedia.org/api.php`):
 *      - Full paginated sweep of `Category:Planetary_systems` + lead extracts.
 *   5. Memory Alpha — Star Trek (`memory-alpha.fandom.com/api.php`):
 *      - Full paginated sweep of `Category:Stars` & `Category:Star_systems` + lead extracts.
 *   6. Xenopedia — Alien / Predator (`avp.fandom.com/api.php`):
 *      - Full paginated sweep of `Category:Star_systems` + lead extracts.
 *   7. Dune Wiki (`dune.fandom.com/api.php`):
 *      - Sweep of `Category:Stars`, `Category:Star_systems`, and `Category:Planets`.
 *   8. Hyperion Cantos, Asimov/Foundation, Known Space & Honorverse Wikis:
 *      - Sweep of star/system/planet categories + wikitext.
 *   9. Curated Hard Sci-Fi Highlights & Encyclopedia of Science Fiction (SFE) links:
 *      - Structured metadata (Title, Author, Year, Fictional World, Medium, Universe)
 *        merged & deduplicated with all live-scraped results.
 *
 * Outputs `public/data/scifi_literature.json`, keyed by `system.id`.
 *
 * Usage:
 *   node scripts/buildSciFiSweep.mjs [--refresh | --respect-ttl | --offline] [--max-age-days 30]
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import {
  sleep,
  getNumArg,
  readJsonIfExists,
  writeFileAtomic,
  writeJsonAtomic,
  isCacheFresh,
  fetchWithRetry,
} from './lib/ioUtils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'public', 'data', 'astrometrics_catalog.json');
const HYG_CACHE_PATH = path.join(__dirname, '.cache', 'hyg_v38.csv.gz');
const CACHE_DIR = path.join(__dirname, '.cache', 'scifi_v2');
const OUT_PATH = path.join(ROOT, 'public', 'data', 'scifi_literature.json');
const DB_CONFIG = readJsonIfExists(path.join(__dirname, 'config', 'database.config.json'), {}) || {};
const CUSTOM_SCIFI = readJsonIfExists(path.join(__dirname, 'config', 'scifi_custom.json'), {}) || {};

const argv = process.argv.slice(2);
const REFRESH = argv.includes('--refresh') || argv.includes('--force');
const RESPECT_TTL = argv.includes('--respect-ttl');
const OFFLINE = argv.includes('--offline');
const CACHE_TTL_DAYS = getNumArg(
  argv,
  '--max-age-days',
  Number(DB_CONFIG.cacheMaxAgeDays?.scifi) || 30
);

const USER_AGENT = 'AstrometricsSciFiSweep/2.1 (https://home.zcu.cz/~lipka/)';

// ---------------------------------------------------------------------------
// Astronomical Designation Tables (All 88 IAU Constellations + Greek Letters)
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

const GREEK = {
  Alp: 'Alpha', Bet: 'Beta', Gam: 'Gamma', Del: 'Delta', Eps: 'Epsilon', Zet: 'Zeta', Eta: 'Eta', The: 'Theta',
  Iot: 'Iota', Kap: 'Kappa', Lam: 'Lambda', Mu: 'Mu', Nu: 'Nu', Xi: 'Xi', Omi: 'Omicron', Pi: 'Pi', Rho: 'Rho',
  Sig: 'Sigma', Tau: 'Tau', Ups: 'Upsilon', Phi: 'Phi', Chi: 'Chi', Psi: 'Psi', Ome: 'Omega',
};

const GREEK_LOWER_TO_FULL = Object.fromEntries(
  Object.entries(GREEK).map(([k, v]) => [k.toLowerCase(), v.toLowerCase()])
);

const GREEK_SYMBOLS = {
  'α': 'alpha', 'β': 'beta', 'γ': 'gamma', 'δ': 'delta', 'ε': 'epsilon', 'ζ': 'zeta', 'η': 'eta', 'θ': 'theta',
  'ι': 'iota', 'κ': 'kappa', 'λ': 'lambda', 'μ': 'mu', 'ν': 'nu', 'ξ': 'xi', 'ο': 'omicron', 'π': 'pi',
  'ρ': 'rho', 'σ': 'sigma', 'τ': 'tau', 'υ': 'upsilon', 'φ': 'phi', 'χ': 'chi', 'ψ': 'psi', 'ω': 'omega',
};

/**
 * Single-word proper star names that collide with common English words, authors,
 * constellations, or fictional planets (e.g., "Arrakis" is Dune's planet orbiting Canopus,
 * NOT Mu Draconis; "Diadem" is a Revelation Space planet orbiting Ross 248, NOT Alpha Com!).
 * Never allow these bare strings to auto-match a star system!
 */
const BLOCKED_AMBIGUOUS_ALIASES = new Set([
  'sol', 'sun', 'earth', 'terra', 'moon', 'luna', 'star', 'nova', 'alpha', 'beta', 'gamma', 'delta',
  'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'omicron', 'pi',
  'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
  'arrakis', 'diadem', 'ran', 'rana', 'peacock', 'musica', 'cervantes', 'copernicus', 'galileo',
  'brahe', 'atlas', 'maia', 'electra', 'phoenix', 'michael', 'chara', 'kuma', 'abol', 'bharani',
  'funi', 'wurren', 'ginan', 'keid', 'beid', 'mira', 'hydra', 'draco', 'orion', 'leo', 'virgo',
  'libra', 'taurus', 'gemini', 'cancer', 'aries', 'pisces', 'aquarius', 'lyra', 'cygnus', 'aquila',
  'pegasus', 'perseus', 'andromeda', 'hercules', 'centaurus', 'carina', 'vela', 'eridanus', 'cetus',
  'caph', 'tabit', 'sabik', 'sadr', 'enif', 'skat', 'kraz', 'alkes', 'matar', 'biham', 'homam',
  'tail', 'nexus', 'haven', 'reach', 'harvest', 'eden', 'vulcan', 'pandora', 'caladan', 'aurora',
  'titan', 'europa', 'mars', 'venus', 'mercury', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
  'ceres', 'eris', 'intercrus', 'helvetios', 'titawin', 'chalawan', 'lichtenstein', 'veritate',
  'fawaris', 'alasia', 'bunda', 'pipirima', 'polaris', 'polaris australis', 'gacrux', 'acrux',
]);

/**
 * Historic & widely-used sci-fi aliases whose HYG/NASA primary designation uses
 * a different name (e.g. IAU proper name or Gliese catalog ID).
 * Keyed by our catalogue's exact `system.id`.
 */
const EXPLICIT_SYSTEM_ALIASES = {
  'hip-71683': ['Alpha Centauri', 'Proxima Centauri', 'Rigil Kentaurus', 'Toliman', 'Alpha Centauri A', 'Alpha Centauri B', 'Gliese 559', 'Gliese 551'],
  'hip-16537': ['Epsilon Eridani', 'Ran', 'Gliese 144', '18 Eridani'],
  'hip-19849': ['40 Eridani', 'Omicron2 Eridani', 'Omicron-2 Eridani', 'Omicron Eridani', 'Keid', 'Gliese 166'],
  'hip-49908': ['Groombridge 1618', 'Gliese 380', 'GJ 380'],
  'hip-1475': ['Groombridge 34', 'GX Andromedae', 'GQ Andromedae', 'Gliese 15'],
  'hip-57939': ['Groombridge 1830', 'CF Ursae Majoris', 'Gliese 451'],
  'hyg-118084': ['p Eridani', 'P Eridani', 'Gliese 66', 'HD 10360', 'HD 10361'],
  'hip-7981': ['107 Piscium', 'Gliese 68'],
  'hyg-119585': ['Ross 248', 'HH Andromedae', 'Gliese 905'],
  'hip-114046': ['Lacaille 9352', 'Gliese 887', 'GJ 887'],
  'hip-86162': ['Gliese 687', 'GJ 687'],
  'hip-105090': ['Lacaille 8760', 'AX Microscopii', 'Gliese 825'],
  'hyg-118079': ['Luyten 726-8', 'UV Ceti', 'BL Ceti', 'Gliese 65'],
  'hyg-119518': ['EZ Aquarii', 'Luyten 789-6', 'Gliese 866'],
  'hip-36208': ["Luyten's Star", 'Gliese 273', 'GJ 273'],
  'hip-3829': ["Van Maanen's Star", 'Van Maanen 2', 'Gliese 35'],
  'hip-110893': ['Kruger 60', 'DO Cephei', 'Gliese 860'],
  'hip-91768': ['Struve 2398', 'Gliese 725'],
  'hip-15371': ['Zeta Reticuli', 'Zeta1 Reticuli', 'Zeta2 Reticuli', 'Zeta-1 Reticuli', 'Zeta-2 Reticuli', 'Gliese 138', 'Gliese 136'],
  'hip-15510': ['82 G. Eridani', '82 Eridani', 'e Eridani', 'HD 20794', 'Gliese 139'],
  'hip-96100': ['Sigma Draconis', 'Alsafi', '61 Draconis', 'Gliese 764'],
  'hip-3821': ['Eta Cassiopeiae', 'Achird', '24 Cassiopeiae', 'Gliese 34'],
  'hip-84405': ['36 Ophiuchi', 'Guniibuu', 'Gliese 663', 'Gliese 664', 'GJ 664'],
  'hip-88601': ['70 Ophiuchi', 'Gliese 702'],
  'hip-17378': ['Delta Eridani', 'Rana', '23 Eridani', 'Gliese 150'],
  'hip-22449': ['Pi3 Orionis', 'Pi-3 Orionis', 'Tabit', '1 Orionis', 'Gliese 178'],
  'hip-57757': ['Beta Virginis', 'Zavijava', '5 Virginis', 'Gliese 449'],
  'hip-43587': ['55 Cancri', 'Copernicus', 'Rho1 Cancri', 'Gliese 324'],
  'hip-113357': ['51 Pegasi', 'Helvetios', 'Gliese 882'],
  'hip-53721': ['47 Ursae Majoris', 'Chalawan', 'Gliese 407'],
  'hip-7513': ['Upsilon Andromedae', 'Titawin', '50 Andromedae', 'Gliese 61'],
  'hip-116727': ['Gamma Cephei', 'Errai', '35 Cephei', 'Gliese 903'],
  'hip-86796': ['Mu Arae', 'Cervantes', 'Gliese 691'],
  'hip-61317': ['Beta Canum Venaticorum', 'Chara', '8 Canum Venaticorum', 'Gliese 475'],
  'hip-27913': ['Chi1 Orionis', 'Chi-1 Orionis', 'Chi Orionis', '54 Orionis', 'Gliese 222'],
  'hip-15457': ['Kappa Ceti', 'Kappa1 Ceti', 'Kappa-1 Ceti', '96 Ceti', 'Gliese 137'],
  'hip-104214': ['61 Cygni', 'Gliese 820'],
  'hip-99240': ['Delta Pavonis', 'Gliese 780'],
  'hip-8102': ['Tau Ceti', '52 Ceti', 'Gliese 71'],
  'hip-108870': ['Epsilon Indi', 'Gliese 845'],
  'hip-2021': ['Beta Hydri', 'Gliese 19'],
  'hip-54035': ['Lalande 21185', 'Gliese 411', 'HD 95735'],
  'hyg-118720': ['Wolf 359', 'CN Leonis', 'Gliese 406'],
  'hip-87937': ["Barnard's Star", 'Barnards Star', 'Gliese 699'],
  'hip-24186': ["Kapteyn's Star", 'Gliese 191'],
  'hip-57548': ['Ross 128', 'FI Virginis', 'Gliese 447'],
  'hip-92403': ['Ross 154', 'V1216 Sagittarii', 'Gliese 729'],
  'hip-114622': ['HD 219134', 'HR 8832', 'Gliese 892'],
  'hip-40693': ['HD 69830', 'Gliese 302'],
  'hip-27887': ['HD 40307'],
  'hip-74995': ['Gliese 581', 'GJ 581', 'HO Librae'],
  'hip-84709': ['Gliese 667', 'Gliese 667 C', 'GJ 667', 'GJ 667 C'],
  'hip-113020': ['Gliese 876', 'GJ 876', 'IL Aquarii'],
  'hip-106440': ['Gliese 832', 'GJ 832'],
  'hip-57087': ['Gliese 436', 'GJ 436'],
  'hyg-119137': ['Gliese 1214', 'GJ 1214'],
  'hip-80824': ['Wolf 1061', 'Gliese 628', 'GJ 628', 'V2306 Ophiuchi'],
  'hip-5496': ['Gliese 54', 'GJ 54'],
  'hip-113229': ['Gliese 877', 'GJ 877'],
  'hip-5643': ['YZ Ceti', 'Gliese 54.1', 'GJ 54.1'],
  'hip-14576': ['Algol', 'Beta Persei', '26 Persei'],
  'hip-57632': ['Denebola', 'Beta Leonis', '94 Leonis'],
  'hip-76267': ['Alphecca', 'Alpha Coronae Borealis', 'Gemma'],
  'hip-86032': ['Rasalhague', 'Alpha Ophiuchi'],
  'hip-98036': ['Alshain', 'Beta Aquilae', '60 Aquilae'],
  'hip-61941': ['Porrima', 'Gamma Virginis'],
  'hip-79672': ['18 Scorpii', 'HR 6060', 'Gliese 616'],
  'hip-64394': ['Beta Comae Berenices', '43 Comae Berenices', 'Gliese 502'],
  'hip-105858': ['Gamma Pavonis', 'Gliese 827'],
  'hip-28103': ['Eta Leporis', '16 Leporis', 'Gliese 225'],
  'hip-14101': ['HIP 14101', 'Gliese 121.1'],
  'hip-67275': ['Tau Bootis', 'Tau Boötis', '4 Bootis', 'Gliese 527'],
  'hip-12653': ['Iota Horologii', 'Gliese 108'],
  'hip-78459': ['Rho Coronae Borealis', '15 Coronae Borealis'],
  'hip-56997': ['61 Ursae Majoris', 'Gliese 434'],
  'hip-96895': ['16 Cygni', 'Gliese 765.1'],
  'hip-64924': ['61 Virginis', 'Gliese 506'],
  'hip-102485': ['Psi Capricorni'],
  'hip-27321': ['Beta Pictoris'],
  'hip-102409': ['AU Microscopii', 'Gliese 803'],
  'hip-14632': ['Iota Persei', 'Gliese 124'],
  'hip-12777': ['Theta Persei', '13 Persei', 'Gliese 107'],
  'hip-10644': ['Delta Trianguli', '8 Trianguli', 'Gliese 92'],
  'hip-72659': ['Xi Bootis', 'Xi Boötis', '37 Bootis', 'Gliese 566'],
  'hip-27072': ['Gamma Leporis', '13 Leporis', 'Gliese 216'],
  'hip-89937': ['Chi Draconis', '44 Draconis', 'Gliese 713'],
  'hip-5336': ['Mu Cassiopeiae', '30 Cassiopeiae', 'Gliese 53'],
  'hip-86974': ['Mu Herculis', '86 Herculis', 'Gliese 695'],
  'hip-1599': ['Zeta Tucanae', 'Gliese 17'],
  'hip-5862': ['Nu Phoenicis', 'Gliese 55'],
  'hip-29271': ['Alpha Mensae', 'Gliese 231'],
  'hip-13402': ['Epsilon Eridani B?'], // removed below; hip-13402 is EP Eridani
};
delete EXPLICIT_SYSTEM_ALIASES['hip-13402'];

// Merge user-editable custom aliases & blocked terms from scripts/config/scifi_custom.json
for (const b of CUSTOM_SCIFI.extraBlockedAliases || []) {
  if (typeof b === 'string' && b.trim()) BLOCKED_AMBIGUOUS_ALIASES.add(b.trim().toLowerCase());
}
for (const [sysId, list] of Object.entries(CUSTOM_SCIFI.extraSystemAliases || {})) {
  if (sysId.startsWith('_') || !Array.isArray(list)) continue;
  const existing = EXPLICIT_SYSTEM_ALIASES[sysId] || [];
  EXPLICIT_SYSTEM_ALIASES[sysId] = [...new Set([...existing, ...list.filter((v) => typeof v === 'string')])];
}

// ---------------------------------------------------------------------------
// Normalization & CSV Helpers
// ---------------------------------------------------------------------------

function normalizeAlias(str) {
  if (!str) return '';
  let s = String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics (Boötis -> Bootis)
    .replace(/[’'`]/g, "'")
    .replace(/¹/g, '1')
    .replace(/²/g, '2')
    .replace(/³/g, '3')
    .replace(/[–—]/g, '-')
    .toLowerCase()
    .trim();

  // Replace leading Greek unicode symbol with English word
  s = s.replace(/^([α-ω])(\d?)\b/, (_, sym, num) => `${GREEK_SYMBOLS[sym] || sym}${num || ''}`);

  // Strip common page-title suffixes (" system", " star", " (star)", " (system)")
  s = s
    .replace(/\s*\((?:star|star system|planetary system|system|astronomy|constellation)\)\s*$/i, '')
    .replace(/\s+(?:planetary\s+system|star\s+system|binary\s+star\s+system|triple\s+star\s+system|system)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Normalize "gliese 687" / "gj 687" / "gl 687" -> "gliese 687"
  s = s.replace(/^(?:gl|gj|gliese)\s+(\d+(?:\.\d+)?)\s*([a-d])?$/i, (_, num, comp) =>
    comp ? `gliese ${num} ${comp.toLowerCase()}` : `gliese ${num}`
  );

  // Normalize "zeta-2 reticuli" / "zeta 2 reticuli" -> "zeta2 reticuli"
  s = s.replace(
    /^(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)[-\s]?([1-9])\s+/,
    '$1$2 '
  );

  // Normalize "82 g. eridani" -> "82 g eridani"
  s = s.replace(/\bg\.\s+/g, 'g ');

  return s.replace(/\s+/g, ' ').trim();
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

/**
 * Build a complete alias lookup across ALL 3,494 systems in `astrometrics_catalog.json`
 * enriched with ALL Bayer, Flamsteed, Variable, Proper, Gliese, HD, HR, HIP rows from HYG v3.8.
 */
function buildCatalogAliasIndex(catalog) {
  const aliasToSystemId = new Map();
  const displayAliasesBySysId = new Map();
  const systemsById = new Map(catalog.systems.map((s) => [s.id, s]));

  // Map every HIP & HD across all systems (including multi-star components!) -> system.id
  const hipToSysId = new Map();
  const hdToSysId = new Map();
  const hygIdToSysId = new Map();

  for (const s of catalog.systems) {
    if (s.id === 'sol') continue;
    if (s.ids?.hip) hipToSysId.set(Number(s.ids.hip), s.id);
    if (s.ids?.hd) hdToSysId.set(Number(s.ids.hd), s.id);
    if (s.id.startsWith('hyg-')) hygIdToSysId.set(Number(s.id.slice(4)), s.id);
    for (const st of s.stars || []) {
      if (st.hip) hipToSysId.set(Number(st.hip), s.id);
    }
  }

  function register(rawAlias, sysId, { recordDisplay = false, allowBareProper = false } = {}) {
    if (!rawAlias || !sysId || sysId === 'sol') return;
    const norm = normalizeAlias(rawAlias);
    if (!norm || norm.length < 4) return;
    if (BLOCKED_AMBIGUOUS_ALIASES.has(norm)) return;
    // Reject single-word bare aliases unless explicitly safe (proper astronomical names >= 5 chars)
    if (!norm.includes(' ') && !allowBareProper && !/^trappist-|^toi-|^k2-|^lhs|^hd\d|^hip\d/i.test(norm)) {
      return;
    }
    if (!aliasToSystemId.has(norm)) {
      aliasToSystemId.set(norm, sysId);
    }
    // Also register Gliese without trailing component letter ("gliese 687 a" -> "gliese 687")
    const glNoComp = norm.match(/^(gliese \d+(?:\.\d+)?)\s+[a-d]$/);
    if (glNoComp && !aliasToSystemId.has(glNoComp[1])) {
      aliasToSystemId.set(glNoComp[1], sysId);
    }
    // Also register Bayer without numeric index if safe (e.g. "kappa1 ceti" -> "kappa ceti", "zeta2 reticuli" -> "zeta reticuli")
    const bayerNoNum = norm.match(/^(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)[1-9]\s+([a-z ]+)$/);
    if (bayerNoNum) {
      const bare = `${bayerNoNum[1]} ${bayerNoNum[2]}`;
      if (!aliasToSystemId.has(bare)) aliasToSystemId.set(bare, sysId);
    }
    if (recordDisplay) {
      const sys = systemsById.get(sysId);
      const cleanDisp = String(rawAlias).trim();
      if (sys && cleanDisp && cleanDisp.toLowerCase() !== sys.name.toLowerCase()) {
        if (!displayAliasesBySysId.has(sysId)) displayAliasesBySysId.set(sysId, new Set());
        displayAliasesBySysId.get(sysId).add(cleanDisp);
      }
    }
  }

  // 1. Register explicit historic/sci-fi aliases FIRST (highest priority)
  for (const [sysId, list] of Object.entries(EXPLICIT_SYSTEM_ALIASES)) {
    if (!systemsById.has(sysId)) continue;
    for (const a of list) {
      register(a, sysId, { recordDisplay: true, allowBareProper: true });
    }
  }

  // 2. Register every system's name, component star names, NEA host, and catalogue IDs
  for (const s of catalog.systems) {
    if (s.id === 'sol') continue;
    register(s.name, s.id, { allowBareProper: true });
    for (const st of s.stars || []) {
      register(st.name, s.id, { allowBareProper: true });
      if (st.gl) register(st.gl, s.id);
    }
    if (s.ids?.neaHost) {
      register(s.ids.neaHost, s.id, { allowBareProper: true });
      // Expand abbreviated NASA host names like "eps Eri" -> "Epsilon Eridani"
      const m = /^([a-z]{2,4})(\d?)\s+([A-Za-z]{2,3})$/i.exec(s.ids.neaHost.trim());
      if (m) {
        const g = GREEK_LOWER_TO_FULL[m[1].toLowerCase()];
        const gen = GENITIVE[m[3]];
        if (g && gen) register(`${g}${m[2] || ''} ${gen}`, s.id);
      }
    }
    if (s.ids?.gl) register(s.ids.gl, s.id);
    if (s.ids?.hip) register(`HIP ${s.ids.hip}`, s.id);
    if (s.ids?.hd) register(`HD ${s.ids.hd}`, s.id);
    if (s.ids?.hr) register(`HR ${s.ids.hr}`, s.id);
  }

  // 3. Enrich ALL 3,494 systems from HYG v3.8 CSV (Bayer, Flamsteed, Variable, Proper, Gliese, HD)
  let hygEnriched = 0;
  if (fs.existsSync(HYG_CACHE_PATH)) {
    const csv = zlib.gunzipSync(fs.readFileSync(HYG_CACHE_PATH)).toString('utf8');
    const lines = csv.split(/\r?\n/);
    const header = splitCsvLine(lines[0]).map((h) => h.trim());
    const idxOf = (col) => header.indexOf(col);
    const iId = idxOf('id');
    const iHip = idxOf('hip');
    const iHd = idxOf('hd');
    const iHr = idxOf('hr');
    const iGl = idxOf('gl');
    const iProper = idxOf('proper');
    const iBayer = idxOf('bayer');
    const iFlam = idxOf('flam');
    const iCon = idxOf('con');
    const iVar = idxOf('var');

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const cols = splitCsvLine(line);
      const hip = Number(cols[iHip]);
      const hd = Number(cols[iHd]);
      const hygId = Number(cols[iId]);

      const sysId =
        (hip && hipToSysId.get(hip)) ||
        (hd && hdToSysId.get(hd)) ||
        (hygId && hygIdToSysId.get(hygId)) ||
        null;
      if (!sysId) continue;
      hygEnriched++;

      const con = (cols[iCon] || '').trim();
      const gen = GENITIVE[con];
      const proper = (cols[iProper] || '').trim();
      const bayer = (cols[iBayer] || '').trim();
      const flam = (cols[iFlam] || '').trim();
      const gl = (cols[iGl] || '').trim();
      const varName = (cols[iVar] || '').trim();
      const hr = (cols[iHr] || '').trim();

      if (proper) register(proper, sysId, { allowBareProper: true });
      if (gl) register(gl, sysId);
      if (hd) register(`HD ${hd}`, sysId);
      if (hr) register(`HR ${hr}`, sysId);

      if (bayer && gen) {
        const [letter, num] = bayer.split('-');
        const fullG = GREEK[letter] || letter;
        const bayerFull = `${fullG}${num || ''} ${gen}`;
        register(bayerFull, sysId, { recordDisplay: true });
        if (num) register(`${fullG}-${num} ${gen}`, sysId);
      }
      if (flam && gen) {
        register(`${flam} ${gen}`, sysId, { recordDisplay: true });
      }
      if (varName && gen && /^[A-Z]{1,2}$|^V\d+$/.test(varName)) {
        register(`${varName} ${gen}`, sysId, { recordDisplay: true });
      }
    }
  }

  console.log(
    `[SCIFI] Indexed ALL ${catalog.systems.length} catalogue systems (${hygEnriched} HYG rows enriched) -> ${aliasToSystemId.size} unique searchable aliases.`
  );

  function resolveTitleToSystemId(rawTitle) {
    if (!rawTitle) return null;
    // Try exact normalized title first
    let norm = normalizeAlias(rawTitle);
    if (aliasToSystemId.has(norm)) return aliasToSystemId.get(norm);

    // Strip trailing single component letter ("40 Eridani A", "61 Cygni B", "Alpha Centauri AB")
    const noComp = norm.replace(/\s+(?:[a-d]|ab|bc|ac)$/, '').trim();
    if (noComp !== norm && aliasToSystemId.has(noComp)) return aliasToSystemId.get(noComp);

    // Strip trailing Roman numeral planet number ONLY if it's clearly a Bayer/Flamsteed/Catalogue star?
    // NO — keep planet pages separate so we extract the star from wikitext rather than guessing!
    // Strip leading Flamsteed number before Bayer ("8 Eta Bootis" -> "Eta Bootis")
    const flamBayer = noComp.replace(/^\d+\s+(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)/, '$1');
    if (flamBayer !== noComp && aliasToSystemId.has(flamBayer)) return aliasToSystemId.get(flamBayer);

    return null;
  }

  return { aliasToSystemId, displayAliasesBySysId, systemsById, resolveTitleToSystemId };
}

// ---------------------------------------------------------------------------
// Polite Cached HTTP & MediaWiki API Helpers
// ---------------------------------------------------------------------------

function shouldUseCachedFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  if (OFFLINE) return true;
  if (REFRESH) return false;
  if (RESPECT_TTL) return isCacheFresh(filePath, CACHE_TTL_DAYS);
  return true;
}

async function fetchJsonCached(cacheKey, url, delayMs = 160, legacyCacheKey = null) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const safe = cacheKey.replace(/[^a-z0-9._-]+/gi, '_').slice(0, 140);
  const filePath = path.join(CACHE_DIR, `${safe}.json`);

  if (shouldUseCachedFile(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  // Optional legacy fallback (only used when offline and hashed file has not been written yet)
  const legacyPath = legacyCacheKey
    ? path.join(CACHE_DIR, `${legacyCacheKey.replace(/[^a-z0-9._-]+/gi, '_').slice(0, 140)}.json`)
    : null;
  if (OFFLINE) {
    if (legacyPath && fs.existsSync(legacyPath)) {
      return JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
    }
    return null;
  }

  await sleep(delayMs);
  try {
    const res = await fetchWithRetry(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeoutMs: 25000,
      retries: 2,
      baseDelayMs: 600,
      label: cacheKey,
    });
    const json = await res.json();
    writeFileAtomic(filePath, JSON.stringify(json));
    return json;
  } catch (err) {
    console.warn(`[SCIFI] Fetch error for ${cacheKey}: ${err.message}`);
    // Graceful stale-cache fallback so a transient wiki outage never loses existing local entries
    if (fs.existsSync(filePath)) {
      console.warn(`[SCIFI] Using stale cache fallback for ${cacheKey}`);
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    if (legacyPath && fs.existsSync(legacyPath)) {
      return JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
    }
    return null;
  }
}

async function fetchAllCategoryMembers(wikiKey, apiBase, categoryTitle, maxPages = 6) {
  const cacheKey = `${wikiKey}_cat_${categoryTitle}`;
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const safe = cacheKey.replace(/[^a-z0-9._-]+/gi, '_').slice(0, 140);
  const filePath = path.join(CACHE_DIR, `${safe}.json`);

  if (shouldUseCachedFile(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  if (OFFLINE) {
    return [];
  }

  const all = [];
  let cmcontinue = null;
  let fetchedAnyPage = false;
  for (let page = 0; page < maxPages; page++) {
    let url =
      `${apiBase}?action=query&list=categorymembers&cmnamespace=0&cmlimit=500&format=json&cmtitle=` +
      encodeURIComponent(categoryTitle);
    if (cmcontinue) url += '&cmcontinue=' + encodeURIComponent(cmcontinue);

    await sleep(160);
    try {
      const res = await fetchWithRetry(url, {
        headers: { 'User-Agent': USER_AGENT },
        timeoutMs: 25000,
        retries: 2,
        baseDelayMs: 600,
        label: `${wikiKey}:${categoryTitle}`,
      });
      const j = await res.json();
      fetchedAnyPage = true;
      for (const m of j.query?.categorymembers || []) {
        if (m.title && !/^(Category:|List of|Template:|Unnamed )/i.test(m.title)) {
          all.push(m.title);
        }
      }
      cmcontinue = j.continue?.cmcontinue || null;
      if (!cmcontinue) break;
    } catch (err) {
      console.warn(`[SCIFI] Category fetch failed (${wikiKey} ${categoryTitle}): ${err.message}`);
      break;
    }
  }

  if (!fetchedAnyPage && fs.existsSync(filePath)) {
    console.warn(`[SCIFI] Using stale category cache fallback for ${wikiKey} ${categoryTitle}`);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  writeFileAtomic(filePath, JSON.stringify(all, null, 2));
  return all;
}

async function fetchBatchWikitext(wikiKey, apiBase, titles, batchSize = 25) {
  const result = new Map(); // title -> wikitext
  const unique = [...new Set(titles)].filter(Boolean);
  for (let i = 0; i < unique.length; i += batchSize) {
    const chunk = unique.slice(i, i + batchSize);
    const hash = crypto.createHash('sha1').update(chunk.join('|')).digest('hex').slice(0, 12);
    const cacheKey = `${wikiKey}_wt_${hash}_${chunk.length}`;
    const legacyKey = `${wikiKey}_wt_${i}_${chunk.length}_${chunk[0]}`;
    const url =
      `${apiBase}?action=query&redirects=1&prop=revisions&rvprop=content&rvslots=main&format=json&titles=` +
      encodeURIComponent(chunk.join('|'));
    const j = await fetchJsonCached(cacheKey, url, 180, legacyKey);
    if (!j?.query?.pages) continue;
    for (const p of Object.values(j.query.pages)) {
      if (p.missing !== undefined) continue;
      const txt = p.revisions?.[0]?.slots?.main?.['*'] || p.revisions?.[0]?.['*'] || '';
      if (txt) result.set(p.title, txt);
    }
  }
  return result;
}

/**
 * Strip wiki markup into a clean readable snippet (1-2 complete sentences, <= maxLen chars).
 */
function cleanWikiSummary(wikitext, maxLen = 175) {
  if (!wikitext) return '';
  let text = wikitext;
  // Remove wikitables {| ... |}
  text = text.replace(/\{\|[\s\S]*?\|\}/g, ' ');
  // Remove HTML comments & ref tags
  text = text
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, ' ')
    .replace(/<ref[^>]*\/>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');

  // Remove templates {{...}} iteratively (handles deeply nested infoboxes/sidebars)
  for (let pass = 0; pass < 12; pass++) {
    const next = text.replace(/\{\{[^{}]*\}\}/g, ' ');
    if (next === text) break;
    text = next;
  }
  // Remove any malformed leftover template markers
  text = text.replace(/\{\{|\}\}/g, ' ');

  // Remove File/Image/Category links even when captions contain nested [[links]]
  text = text.replace(/^\s*\[\[(?:File|Image|Category):.*$/gim, ' ');
  for (let pass = 0; pass < 4; pass++) {
    const next = text.replace(/\[\[(?:File|Image|Category):[^\[\]]*(?:\[\[[^\[\]]*\]\][^\[\]]*)*\]\]/gi, ' ');
    if (next === text) break;
    text = next;
  }

  text = text
    .replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[https?:\/\/[^\s\]]+\s+([^\]]+)\]/g, '$1')
    .replace(/\[https?:\/\/[^\s\]]+\]/g, '')
    .replace(/'''?/g, '')
    .replace(/==+[^=]+==+/g, ' ')
    .replace(/^\s*[*#:;|!].*$/gm, ' ')
    .replace(/\(\s*\)/g, '')
    .replace(/\|/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return '';
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 18);
  const lead = sentences.slice(0, 2).join(' ') || text;
  return lead.length > maxLen ? `${lead.slice(0, maxLen - 1).trim()}…` : lead;
}

/**
 * Extract the clean complete sentence (from the surrounding paragraph) mentioning `matchText`.
 */
function extractMentionSentence(wikitext, linkIndex, matchLabel, maxLen = 165) {
  if (!wikitext) return '';
  // Find enclosing paragraph bounded by double newlines (or single newline bullet)
  let pStart = wikitext.lastIndexOf('\n', linkIndex);
  pStart = pStart < 0 ? 0 : pStart + 1;
  let pEnd = wikitext.indexOf('\n', linkIndex);
  pEnd = pEnd < 0 ? wikitext.length : pEnd;

  const rawPara = wikitext.slice(pStart, pEnd).replace(/^\s*[*#;:]+\s*/, '');
  const cleaned = cleanWikiSummary(rawPara, 900);
  if (!cleaned) return '';

  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  const needle = (matchLabel || '').toLowerCase();
  const hit = sentences.find((s) => needle && s.toLowerCase().includes(needle)) || sentences[0] || cleaned;
  const trimmed = hit.trim();
  return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen - 1).trim()}…` : trimmed;
}

/**
 * Extract all `[[Target]]` wikilinks from wikitext.
 */
function extractWikilinks(wikitext) {
  const out = [];
  if (!wikitext) return out;
  const re = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g;
  let m;
  while ((m = re.exec(wikitext)) !== null) {
    const target = m[1].trim();
    const label = (m[2] || m[1]).trim();
    if (/^(File|Image|Category|Special|Help|Wikipedia|Portal|Template|User|w|wikipedia):/i.test(target)) {
      // Handle [[wikipedia:en:61 Cygni|61 Cygni]]!
      const wpMatch = /^wikipedia:(?:en:)?(.+)$/i.exec(target);
      if (wpMatch) out.push({ target: wpMatch[1].trim(), label, index: m.index });
      continue;
    }
    out.push({ target, label, index: m.index });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Curated High-Signal Hard Sci-Fi Highlights (Merged with Live Scrapes)
// ---------------------------------------------------------------------------

const CURATED_HIGHLIGHTS = [
  // === ALASTAIR REYNOLDS — REVELATION SPACE UNIVERSE (Complete Nearby Network) ===
  {
    id: 'hip-16537', // Epsilon Eridani
    sfeSlug: null,
    works: [
      { title: 'Revelation Space / Chasm City / Prefect Dreyfus', author: 'Alastair Reynolds', year: 2000, universe: 'Revelation Space', world: 'Yellowstone (Chasm City, Glitter Band) & Tangerine Dream', medium: 'novel', wiki: 'Chasm_City' },
      { title: 'Babylon 5', author: 'J. Michael Straczynski', year: 1993, universe: 'Babylon 5', world: 'Epsilon III (orbiting Babylon 5 station)', medium: 'tv', wiki: 'Babylon_5' },
      { title: 'Halo: The Fall of Reach', author: 'Eric Nylund', year: 2001, universe: 'Halo', world: 'Reach (UNSC fortress world) & Tribute', medium: 'novel', wiki: 'Halo:_The_Fall_of_Reach' },
      { title: 'We Are Legion (We Are Bob)', author: 'Dennis E. Taylor', year: 2016, universe: 'Bobiverse', world: 'Ragnarok (first Bobiverse colony system)', medium: 'novel', wiki: 'Dennis_E._Taylor' },
      { title: 'Vacuum Diagrams (Xeelee Sequence)', author: 'Stephen Baxter', year: 1997, universe: 'Xeelee Sequence', world: 'Early First Expansion GUTship colony system', medium: 'novel', wiki: 'Xeelee_Sequence' },
      { title: 'World of Ptavvs / Known Space', author: 'Larry Niven', year: 1966, universe: 'Known Space', world: 'Early human colony world', medium: 'novel', wiki: 'Known_Space' },
    ],
  },
  {
    id: 'hip-99240', // Delta Pavonis
    works: [
      { title: 'Revelation Space / Redemption Ark', author: 'Alastair Reynolds', year: 2000, universe: 'Revelation Space', world: 'Resurgam (Amarantin archaeological desert world), Roc & Hades', medium: 'novel', wiki: 'Revelation_Space' },
      { title: 'Dune', author: 'Frank Herbert', year: 1965, universe: 'Dune', world: 'Caladan (3rd planet — ancestral ocean homeworld of House Atreides)', medium: 'novel', wiki: 'Caladan' },
      { title: 'For We Are Many (Bobiverse)', author: 'Dennis E. Taylor', year: 2017, universe: 'Bobiverse', world: 'Eden (Pav homeworld evacuated by the Bobs)', medium: 'novel', wiki: 'Delta_Pavonis' },
    ],
  },
  {
    id: 'hip-104214', // 61 Cygni
    works: [
      { title: 'Chasm City / Galactic North / Redemption Ark', author: 'Alastair Reynolds', year: 2001, universe: 'Revelation Space', world: "Sky's Edge (61 Cygni A — colony founded by the generation ship Santiago)", medium: 'novel', wiki: 'Chasm_City' },
      { title: 'Andromeda: A Space-Age Tale (Туманность Андромеды)', author: 'Ivan Yefremov', year: 1957, universe: 'Eastern Bloc SF', world: 'Closest Great Ring (Великое Кольцо) interstellar relay partner to Earth', medium: 'novel', wiki: 'Andromeda_(novel)' },
      { title: 'Mission of Gravity', author: 'Hal Clement', year: 1954, universe: 'Classic Hard SF', world: 'Mesklin (rapidly spinning super-massive high-g world)', medium: 'novel', wiki: 'Mission_of_Gravity' },
      { title: 'The Caves of Steel / Robots', author: 'Isaac Asimov', year: 1954, universe: 'Foundation / Robots', world: 'Early Spacer sector reference', medium: 'novel', wiki: '61_Cygni' },
    ],
  },
  {
    id: 'hip-49908', // GJ 380 / Groombridge 1618
    works: [
      { title: 'Diamond Dogs, Turquoise Days', author: 'Alastair Reynolds', year: 2002, universe: 'Revelation Space', world: 'Turquoise (Groombridge 1618 — oceanic Pattern Juggler world)', medium: 'novel', wiki: 'Diamond_Dogs,_Turquoise_Days' },
    ],
  },
  {
    id: 'hip-7981', // 107 Piscium
    works: [
      { title: 'Absolution Gap', author: 'Alastair Reynolds', year: 2003, universe: 'Revelation Space', world: 'Hela (frozen cathedral moon orbiting gas giant Haldora)', medium: 'novel', wiki: 'Absolution_Gap' },
    ],
  },
  {
    id: 'hyg-118084', // p Eridani
    works: [
      { title: 'Redemption Ark / Absolution Gap', author: 'Alastair Reynolds', year: 2002, universe: 'Revelation Space', world: 'Ararat (Pattern Juggler ocean world colonized by Nostalgia for Infinity)', medium: 'novel', wiki: 'Redemption_Ark' },
      { title: 'Known Space', author: 'Larry Niven', year: 1966, universe: 'Known Space', world: 'Early interstellar frontier star', medium: 'novel', wiki: 'Known_Space' },
    ],
  },
  {
    id: 'hyg-119585', // Ross 248
    works: [
      { title: 'Galactic North / Chasm City', author: 'Alastair Reynolds', year: 2006, universe: 'Revelation Space', world: 'Diadem (icy Amerikano-era colony first explored by Conjoiners)', medium: 'novel', wiki: 'Galactic_North' },
    ],
  },
  {
    id: 'hip-114046', // Lacaille 9352
    works: [
      { title: 'Galactic North / Revelation Space', author: 'Alastair Reynolds', year: 2006, universe: 'Revelation Space', world: "Fand & Irravel's Moon (Earth-like human colony world)", medium: 'novel', wiki: 'Galactic_North' },
    ],
  },
  {
    id: 'hip-86162', // GJ 687 (Gliese 687)
    works: [
      { title: 'Redemption Ark / Revelation Space', author: 'Alastair Reynolds', year: 2002, universe: 'Revelation Space', world: 'Gliese 687 system (Conjoiner Mother Nest / Haven sector)', medium: 'novel', wiki: 'Redemption_Ark' },
    ],
  },
  {
    id: 'hip-84405', // 36 Ophiuchi (Guniibuu / GJ 664)
    works: [
      { title: 'Absolution Gap', author: 'Alastair Reynolds', year: 2003, universe: 'Revelation Space', world: 'Chaloupek (Gliese 664 / 36 Oph C — waystation visited by Gnostic Ascension)', medium: 'novel', wiki: 'Absolution_Gap' },
      { title: 'Dune', author: 'Frank Herbert', year: 1965, universe: 'Dune', world: 'Giedi Prime (36 Ophiuchi B — industrial homeworld of House Harkonnen)', medium: 'novel', wiki: 'Giedi_Prime' },
    ],
  },
  {
    id: 'hip-54035', // Lalande 21185
    works: [
      { title: 'Revelation Space / Galactic North', author: 'Alastair Reynolds', year: 2006, universe: 'Revelation Space', world: 'Early lighthugger & Conjoiner trade route benchmark (8.3 ly)', medium: 'novel', wiki: 'Lalande_21185' },
      { title: 'The Dark Forest', author: 'Liu Cixin', year: 2008, universe: 'Three-Body', world: 'Nearby red dwarf catalogued during the Deterrence Era', medium: 'novel', wiki: 'Lalande_21185' },
      { title: 'Known Space / Ringworld era', author: 'Larry Niven', year: 1970, universe: 'Known Space', world: 'Early human survey star', medium: 'novel', wiki: 'Lalande_21185' },
    ],
  },
  {
    id: 'hip-24186', // Kapteyn's Star
    works: [
      { title: 'Sad Kapteyn', author: 'Alastair Reynolds', year: 2014, universe: 'Alastair Reynolds', world: 'Kapteyn b (short story commissioned for the 2014 exoplanet announcement)', medium: 'novel', wiki: "Kapteyn's_Star" },
    ],
  },

  // === CORE HARD SCI-FI & SPACE OPERA LANDMARKS ===
  {
    id: 'hip-71683', // Alpha Centauri / Proxima Centauri
    sfeSlug: 'alpha_centauri',
    works: [
      { title: 'The Magellanic Cloud (Obłok Magellana)', author: 'Stanisław Lem', year: 1955, universe: 'Stanisław Lem', world: 'Starship Gea (227 crew) — humanity’s first relativistic voyage to Alpha & Proxima Centauri', medium: 'novel', wiki: 'The_Magellanic_Cloud' },
      { title: 'Planeta tří sluncí / Oceánem světelných roků', author: 'Vladimír Babula', year: 1954, universe: 'Eastern Bloc SF', world: 'Kvarten (Planet of Three Suns) — destination of the Czechoslovak starship Paprsek', medium: 'novel', wiki: 'Vladimír_Babula' },
      { title: 'The Three-Body Problem', author: 'Liu Cixin', year: 2008, universe: 'Three-Body', world: 'Trisolaris (chaotic three-body world)', medium: 'novel', wiki: 'The_Three-Body_Problem_(novel)' },
      { title: 'Avatar', author: 'James Cameron', year: 2009, universe: 'Avatar', world: 'Pandora (moon of Polyphemus around Alpha Cen A, reached by ISV Venture Star at 0.70c)', medium: 'film', wiki: 'Avatar_(2009_film)' },
      { title: 'Starfall (Xeelee Sequence)', author: 'Stephen Baxter', year: 2009, universe: 'Xeelee Sequence', world: 'Alpha Centauri rebel stronghold of Flood challenging Empress Shira’s Solar Empire (AD 4820)', medium: 'novel', wiki: 'Xeelee_Sequence' },
      { title: 'Proxima', author: 'Stephen Baxter', year: 2013, universe: 'Proxima', world: 'Per Ardua (tidally locked Proxima Centauri colony)', medium: 'novel', wiki: 'Proxima_(novel)' },
      { title: 'The Songs of Distant Earth', author: 'Arthur C. Clarke', year: 1986, universe: 'Arthur C. Clarke', world: 'Pasadena / early relativistic colony transit', medium: 'novel', wiki: 'The_Songs_of_Distant_Earth' },
      { title: 'Known Space (Wunderland)', author: 'Larry Niven', year: 1966, universe: 'Known Space', world: 'Wunderland (first human slowboat colony around Alpha Centauri)', medium: 'novel', wiki: 'Known_Space' },
      { title: 'Downbelow Station', author: 'C. J. Cherryh', year: 1981, universe: 'Alliance-Union', world: 'Alpha Station', medium: 'novel', wiki: 'Downbelow_Station' },
      { title: "Sid Meier's Alpha Centauri", author: 'Brian Reynolds', year: 1999, universe: 'Alpha Centauri', world: 'Chiron ("Planet")', medium: 'game', wiki: "Sid_Meier's_Alpha_Centauri" },
    ],
  },
  {
    id: 'hip-8102', // Tau Ceti
    sfeSlug: 'tau_ceti',
    works: [
      { title: 'Project Hail Mary', author: 'Andy Weir', year: 2021, universe: 'Project Hail Mary', world: 'Tau Ceti (Astrophage-immune star, meeting of Grace & Rocky)', medium: 'novel', wiki: 'Project_Hail_Mary' },
      { title: 'Aurora', author: 'Kim Stanley Robinson', year: 2015, universe: 'Kim Stanley Robinson', world: 'Aurora (moon of Planet E, generation ship destination)', medium: 'novel', wiki: 'Aurora_(novel)' },
      { title: 'The Dispossessed', author: 'Ursula K. Le Guin', year: 1974, universe: 'Hainish Cycle', world: 'Urras & Anarres (twin inhabited worlds linked by NAFAL sublight ships)', medium: 'novel', wiki: 'The_Dispossessed' },
      { title: 'Time for the Stars', author: 'Robert A. Heinlein', year: 1956, universe: 'Classic Hard SF', world: 'Survey destination of the 1g torchship Lewis and Clark', medium: 'novel', wiki: 'Time_for_the_Stars' },
      { title: 'Hyperion Cantos', author: 'Dan Simmons', year: 1989, universe: 'Hyperion Cantos', world: 'Tau Ceti Center (Hegemony capital)', medium: 'novel', wiki: 'Hyperion_(Simmons_novel)' },
      { title: 'Downbelow Station', author: 'C. J. Cherryh', year: 1981, universe: 'Alliance-Union', world: "Pell's World (Downbelow)", medium: 'novel', wiki: 'Downbelow_Station' },
      { title: 'The Robots of Dawn', author: 'Isaac Asimov', year: 1983, universe: 'Foundation / Robots', world: 'Aurora (first Spacer world)', medium: 'novel', wiki: 'The_Robots_of_Dawn' },
      { title: 'The Legacy of Heorot', author: 'Larry Niven, Jerry Pournelle & Steven Barnes', year: 1987, universe: 'Heorot', world: 'Avalon', medium: 'novel', wiki: 'The_Legacy_of_Heorot' },
      { title: 'Ring / Vacuum Diagrams (Xeelee Sequence)', author: 'Stephen Baxter', year: 1994, universe: 'Xeelee Sequence', world: 'Early human sleeper-ship & First Expansion GUTdrive colony target', medium: 'novel', wiki: 'Ring_(Baxter_novel)' },
    ],
  },
  {
    id: 'hip-19849', // 40 Eridani (Keid / Omicron2 Eridani)
    works: [
      { title: 'Project Hail Mary', author: 'Andy Weir', year: 2021, universe: 'Project Hail Mary', world: 'Erid (40 Eridani b — super-Earth homeworld of Rocky)', medium: 'novel', wiki: 'Project_Hail_Mary' },
      { title: 'Star Trek', author: 'Gene Roddenberry / James Blish', year: 1966, universe: 'Star Trek', world: 'Vulcan (40 Eridani A)', medium: 'tv', wiki: 'Vulcan_(Star_Trek)' },
      { title: 'Dune (Expanded / Encyclopedia)', author: 'Frank Herbert', year: 1965, universe: 'Dune', world: 'Richese (40 Eridani A)', medium: 'novel', wiki: '40_Eridani' },
      { title: 'We Are Legion (We Are Bob)', author: 'Dennis E. Taylor', year: 2016, universe: 'Bobiverse', world: 'Vulcan & Romulus (Omicron² Eridani colony)', medium: 'novel', wiki: '40_Eridani' },
    ],
  },
  {
    id: 'hip-15371', // Zeta Reticuli
    works: [
      { title: 'Alien / Aliens', author: 'Ridley Scott / James Cameron / Dan O’Bannon', year: 1979, universe: 'Alien', world: 'LV-426 (Acheron — moon of Calpamos in Zeta² Reticuli)', medium: 'film', wiki: 'Alien_(film)' },
      { title: 'Prometheus', author: 'Ridley Scott', year: 2012, universe: 'Alien', world: 'LV-223 (Engineer installation moon in Zeta² Reticuli)', medium: 'film', wiki: 'Prometheus_(2012_film)' },
      { title: 'Star Control II', author: 'Paul Reiche III & Fred Ford', year: 1992, universe: 'Star Control', world: 'Notable exploration sector', medium: 'game', wiki: 'Zeta_Reticuli' },
    ],
  },
  {
    id: 'hip-87937', // Barnard's Star
    works: [
      { title: 'Rocheworld', author: 'Robert L. Forward', year: 1984, universe: 'Classic Hard SF', world: 'Rocheworld (double planet reached via laser-pushed lightsail)', medium: 'novel', wiki: 'Rocheworld' },
      { title: 'Přátelé z Hadonoše (Friends from Ophiuchus)', author: 'Vladimír Babula', year: 1956, universe: 'Eastern Bloc SF', world: 'Ophiuchus interstellar expedition of the Czechoslovak starship Paprsek', medium: 'novel', wiki: 'Vladimír_Babula' },
      { title: 'Hyperion', author: 'Dan Simmons', year: 1989, universe: 'Hyperion Cantos', world: "Barnard's World (Sol Weintraub's home)", medium: 'novel', wiki: 'Hyperion_(Simmons_novel)' },
      { title: 'The Garden of Rama', author: 'Arthur C. Clarke & Gentry Lee', year: 1991, universe: 'Rama', world: 'Rama Node (deep-space hub)', medium: 'novel', wiki: 'The_Garden_of_Rama' },
      { title: "The Hitchhiker's Guide to the Galaxy", author: 'Douglas Adams', year: 1979, universe: "Hitchhiker's Guide", world: 'Interstellar waystation', medium: 'novel', wiki: "The_Hitchhiker's_Guide_to_the_Galaxy" },
      { title: 'Downbelow Station / Alliance-Union', author: 'C. J. Cherryh', year: 1981, universe: 'Alliance-Union', world: "Barnard's Station", medium: 'novel', wiki: 'Alliance–Union_universe' },
      { title: 'Vacuum Diagrams (Xeelee Sequence)', author: 'Stephen Baxter', year: 1997, universe: 'Xeelee Sequence', world: 'Early First Expansion interstellar probe & colony stepping stone', medium: 'novel', wiki: 'Vacuum_Diagrams' },
    ],
  },
  {
    id: 'hip-32349', // Sirius
    sfeSlug: 'sirius',
    works: [
      { title: 'Kallisto / The Kallistonians (Каллисто)', author: 'Georgy Martynov', year: 1957, universe: 'Eastern Bloc SF', world: 'Kallisto (Sirius system — 1g / 0.63c relativistic meson starship visiting Earth)', medium: 'novel', wiki: 'Georgy_Martynov' },
      { title: 'Micromégas', author: 'Voltaire', year: 1752, universe: 'Classic SF', world: 'Sirius giant traveler (early sci-fi milestone)', medium: 'novel', wiki: 'Micromégas' },
      { title: "The Hitchhiker's Guide to the Galaxy", author: 'Douglas Adams', year: 1979, universe: "Hitchhiker's Guide", world: 'Sirius Cybernetics Corporation', medium: 'novel', wiki: 'Sirius_Cybernetics_Corporation' },
      { title: 'Foundation / Galactic Empire', author: 'Isaac Asimov', year: 1951, universe: 'Foundation / Robots', world: 'Sirius Sector', medium: 'novel', wiki: 'Foundation_(Asimov_novel)' },
      { title: 'V', author: 'Kenneth Johnson', year: 1983, universe: 'V', world: 'Sirius IV (homeworld of the Visitors)', medium: 'tv', wiki: 'V_(1983_miniseries)' },
      { title: 'Known Space (Flatlander)', author: 'Larry Niven', year: 1966, universe: 'Known Space', world: 'Jinx & runaway slowboat Lazy Eight II', medium: 'novel', wiki: 'Known_Space' },
      { title: 'Vacuum Diagrams / Resplendent (Xeelee Sequence)', author: 'Stephen Baxter', year: 1997, universe: 'Xeelee Sequence', world: 'Early First Expansion & post-Qax Coalition core star system', medium: 'novel', wiki: 'Xeelee_Sequence' },
    ],
  },
  {
    id: 'hip-91262', // Vega
    sfeSlug: 'vega',
    works: [
      { title: 'Noon: 22nd Century (Полдень, XXII век)', author: 'Arkady & Boris Strugatsky', year: 1961, universe: 'Noon Universe', world: 'Relativistic photon starship Taimyr launched in 2017 toward Lyra (Vega sector), returning a century later', medium: 'novel', wiki: 'Noon:_22nd_Century' },
      { title: 'Contact', author: 'Carl Sagan', year: 1985, universe: 'Contact', world: 'Vega (origin of the prime-number radio signal)', medium: 'novel', wiki: 'Contact_(novel)' },
      { title: 'Foundation', author: 'Isaac Asimov', year: 1951, universe: 'Foundation / Robots', world: 'Vega Province (wealthiest trade hub)', medium: 'novel', wiki: 'Foundation_(Asimov_novel)' },
      { title: 'Agent of Vega', author: 'James H. Schmitz', year: 1960, universe: 'Classic SF', world: 'Vegan Confederacy', medium: 'novel', wiki: 'Agent_of_Vega' },
      { title: 'Rendezvous with Rama', author: 'Arthur C. Clarke', year: 1973, universe: 'Rama', world: 'Interstellar reference benchmark', medium: 'novel', wiki: 'Vega' },
    ],
  },
  {
    id: 'hyg-118720', // Wolf 359
    works: [
      { title: 'Star Trek: TNG — The Best of Both Worlds', author: 'Michael Piller', year: 1990, universe: 'Star Trek', world: 'Battle of Wolf 359 (Federation vs. Borg)', medium: 'tv', wiki: 'The_Best_of_Both_Worlds_(Star_Trek:_The_Next_Generation)' },
      { title: 'Wolf 359 (Audio Drama)', author: 'Gabriel Urbina', year: 2014, universe: 'Wolf 359', world: 'U.S.S. Hephaestus research station', medium: 'audio', wiki: 'Wolf_359_(podcast)' },
      { title: 'The Outer Limits — Wolf 359', author: 'Seeleg Lester', year: 1964, universe: 'The Outer Limits', world: 'Miniature planetary simulation', medium: 'tv', wiki: 'Wolf_359_(The_Outer_Limits)' },
    ],
  },
  {
    id: 'hip-97649', // Altair
    works: [
      { title: 'Forbidden Planet', author: 'Fred M. Wilcox / Cyril Hume', year: 1956, universe: 'Forbidden Planet', world: 'Altair IV (home of the extinct Krell)', medium: 'film', wiki: 'Forbidden_Planet' },
      { title: 'The Forever War', author: 'Joe Haldeman', year: 1974, universe: 'The Forever War', world: 'Aleph-1 / Collapsar transit staging', medium: 'novel', wiki: 'The_Forever_War' },
      { title: "The Hitchhiker's Guide to the Galaxy", author: 'Douglas Adams', year: 1979, universe: "Hitchhiker's Guide", world: 'Altairian Dollar', medium: 'novel', wiki: 'Altair' },
    ],
  },
  {
    id: 'hip-113368', // Fomalhaut
    works: [
      { title: 'Return from the Stars', author: 'Stanisław Lem', year: 1961, universe: 'Stanisław Lem', world: 'Fomalhaut relativistic expedition (127 Earth yr / 10 crew yr!)', medium: 'novel', wiki: 'Return_from_the_Stars' },
      { title: "Rocannon's World", author: 'Ursula K. Le Guin', year: 1966, universe: 'Hainish Cycle', world: 'Fomalhaut II (Rokanan)', medium: 'novel', wiki: "Rocannon's_World" },
      { title: 'Lies, Inc. / The Unteleported Man', author: 'Philip K. Dick', year: 1966, universe: 'Philip K. Dick', world: "Whale's Mouth (Fomalhaut colony)", medium: 'novel', wiki: 'Lies,_Inc.' },
    ],
  },
  {
    id: 'hip-69673', // Arcturus
    works: [
      { title: 'A Voyage to Arcturus', author: 'David Lindsay', year: 1920, universe: 'Classic SF', world: 'Tormance (orbiting Arcturus)', medium: 'novel', wiki: 'A_Voyage_to_Arcturus' },
      { title: 'Mass Effect', author: 'BioWare', year: 2007, universe: 'Mass Effect', world: 'Arcturus Station (Systems Alliance capital)', medium: 'game', wiki: 'Mass_Effect' },
      { title: 'What Mad Universe', author: 'Fredric Brown', year: 1949, universe: 'Classic SF', world: 'Arcturian interstellar war', medium: 'novel', wiki: 'What_Mad_Universe' },
      { title: 'Foundation / Galactic Empire', author: 'Isaac Asimov', year: 1951, universe: 'Foundation / Robots', world: 'Arcturus sector', medium: 'novel', wiki: 'Arcturus' },
    ],
  },
  {
    id: 'hip-21421', // Aldebaran
    works: [
      { title: 'The Forever War', author: 'Joe Haldeman', year: 1974, universe: 'The Forever War', world: 'Stargate / Aldebaran campaign', medium: 'novel', wiki: 'The_Forever_War' },
      { title: 'Worlds of Aldebaran', author: 'Leo', year: 1994, universe: 'Worlds of Aldebaran', world: 'Aldebaran-4 (oceanic colony world)', medium: 'comic', wiki: 'Worlds_of_Aldebaran' },
      { title: 'The King in Yellow / Cthulhu Mythos', author: 'Robert W. Chambers / H. P. Lovecraft', year: 1895, universe: 'Cthulhu Mythos', world: 'Carcosa (near the Hyades & Aldebaran)', medium: 'novel', wiki: 'The_King_in_Yellow' },
    ],
  },
  {
    id: 'hip-37279', // Procyon
    works: [
      { title: 'Known Space', author: 'Larry Niven', year: 1970, universe: 'Known Space', world: 'Early human survey & Kzin frontier sector', medium: 'novel', wiki: 'Known_Space' },
      { title: 'Star Trek: Enterprise', author: 'Rick Berman & Brannon Braga', year: 2001, universe: 'Star Trek', world: 'Andoria (orbiting Procyon / Epsilon Indi sector)', medium: 'tv', wiki: 'Procyon' },
      { title: 'A Fire Upon the Deep', author: 'Vernor Vinge', year: 1992, universe: 'Zones of Thought', world: 'Slow Zone benchmark star', medium: 'novel', wiki: 'Procyon' },
    ],
  },
  {
    id: 'hip-2021', // Beta Hydri
    works: [
      { title: 'We Are Legion / For We Are Many (Bobiverse)', author: 'Dennis E. Taylor', year: 2016, universe: 'Bobiverse', world: 'Beta Hydri (metal-stripped dead system where Mario finds first evidence of The Others)', medium: 'novel', wiki: 'Beta_Hydri' },
      { title: 'Time for the Stars', author: 'Robert A. Heinlein', year: 1956, universe: 'Classic Hard SF', world: 'Ammonia-ocean world "Inferno" surveyed by the 1g torchship Lewis and Clark', medium: 'novel', wiki: 'Time_for_the_Stars' },
      { title: 'Time Enough for Love', author: 'Robert A. Heinlein', year: 1973, universe: 'Future History', world: 'Secundus & Tertius (Howard Families colonies)', medium: 'novel', wiki: 'Time_Enough_for_Love' },
      { title: 'The Songs of Distant Earth', author: 'Arthur C. Clarke', year: 1986, universe: 'Arthur C. Clarke', world: 'Interstellar seedship target', medium: 'novel', wiki: 'Beta_Hydri' },
    ],
  },
  {
    id: 'hip-108870', // Epsilon Indi
    works: [
      { title: 'We Are Legion / For We Are Many (Bobiverse)', author: 'Dennis E. Taylor', year: 2016, universe: 'Bobiverse', world: 'Big Top & KKP (Klown Kar Planet) — Linus rescues Henry Roberts; Howard & Bridget live on Tantor', medium: 'novel', wiki: 'Epsilon_Indi' },
      { title: 'Halo: Contact Harvest', author: 'Joseph Staten', year: 2007, universe: 'Halo', world: 'Harvest (site of first Human–Covenant contact)', medium: 'novel', wiki: 'Halo:_Contact_Harvest' },
      { title: 'Known Space', author: 'Larry Niven', year: 1966, universe: 'Known Space', world: 'Kzinhome? / Early human-Kzin border', medium: 'novel', wiki: 'Known_Space' },
      { title: 'Star Trek: Enterprise', author: 'Rick Berman & Brannon Braga', year: 2001, universe: 'Star Trek', world: 'Andoria (ringed gas giant moon)', medium: 'tv', wiki: 'Epsilon_Indi' },
    ],
  },
  {
    id: 'hip-96100', // Sigma Draconis (Alsafi)
    works: [
      { title: "Star Trek — Spock's Brain", author: 'Gene L. Coon', year: 1968, universe: 'Star Trek', world: 'Sigma Draconis VI', medium: 'tv', wiki: "Spock's_Brain" },
      { title: 'Dune (Expanded / Encyclopedia)', author: 'Frank Herbert', year: 1965, universe: 'Dune', world: 'Sigma Draconis IV (early Ix / Richese reference)', medium: 'novel', wiki: 'Sigma_Draconis' },
      { title: '2312 / Aurora', author: 'Kim Stanley Robinson', year: 2012, universe: 'Kim Stanley Robinson', world: 'Solar-analog colonization candidate', medium: 'novel', wiki: 'Sigma_Draconis' },
    ],
  },
  {
    id: 'hip-3821', // Eta Cassiopeiae (Achird)
    works: [
      { title: 'For We Are Many / All These Worlds (Bobiverse)', author: 'Dennis E. Taylor', year: 2017, universe: 'Bobiverse', world: 'Poseidon (water world discovered by Mulder; aerial cities led by Marcus)', medium: 'novel', wiki: 'Eta_Cassiopeiae' },
      { title: 'Star Trek: Enterprise', author: 'Rick Berman & Brannon Braga', year: 2001, universe: 'Star Trek', world: 'Terra Nova (first human deep-space colony)', medium: 'tv', wiki: 'Eta_Cassiopeiae' },
      { title: 'Known Space', author: 'Larry Niven', year: 1966, universe: 'Known Space', world: 'Early human colony sector', medium: 'novel', wiki: 'Eta_Cassiopeiae' },
    ],
  },
  {
    id: 'hip-15510', // 82 G. Eridani
    works: [
      { title: 'We Are Legion / All These Worlds (Bobiverse)', author: 'Dennis E. Taylor', year: 2016, universe: 'Bobiverse', world: 'Asgard & Takamagahara (site of Milo vs. Medeiros, settled by Mack in 2220)', medium: 'novel', wiki: '82_G._Eridani' },
      { title: 'Noon Universe', author: 'Arkady & Boris Strugatsky', year: 1964, universe: 'Noon Universe', world: 'EN-2 / Nearby G8V solar analog', medium: 'novel', wiki: '82_G._Eridani' },
    ],
  },
  {
    id: 'hip-88601', // 70 Ophiuchi
    works: [
      { title: 'Andromeda: A Space-Age Tale (Туманность Андромеды)', author: 'Ivan Yefremov', year: 1957, universe: 'Eastern Bloc SF', world: 'Zirda sector (Ophiuchus) — 37th Cosmic Expedition aboard the 5/6c anameson starship Tantra', medium: 'novel', wiki: 'Andromeda_(novel)' },
      { title: 'Dune (Expanded / Encyclopedia)', author: 'Frank Herbert', year: 1965, universe: 'Dune', world: 'Sikun / 70 Ophiuchi A sector', medium: 'novel', wiki: '70_Ophiuchi' },
      { title: 'The Mote in God’s Eye / CoDominium', author: 'Jerry Pournelle', year: 1974, universe: 'CoDominium', world: 'Early interstellar frontier star', medium: 'novel', wiki: '70_Ophiuchi' },
    ],
  },
  {
    id: 'hip-56997', // 61 Ursae Majoris
    works: [
      { title: 'Known Space', author: 'Larry Niven', year: 1968, universe: 'Known Space', world: 'Kzin (61 Ursae Majoris — homeworld of the Kzinti)', medium: 'novel', wiki: '61_Ursae_Majoris' },
    ],
  },
  {
    id: 'hip-24608', // Capella
    works: [
      { title: "Star Trek — Friday's Child", author: 'D. C. Fontana', year: 1967, universe: 'Star Trek', world: 'Capella IV (warrior culture)', medium: 'tv', wiki: "Friday's_Child_(Star_Trek:_The_Original_Series)" },
      { title: 'BattleTech', author: 'FASA', year: 1984, universe: 'BattleTech', world: 'Capellan Confederation namesake', medium: 'game', wiki: 'Capella' },
    ],
  },
  {
    id: 'hip-49669', // Regulus
    works: [
      { title: 'Star Trek II: The Wrath of Khan', author: 'Nicholas Meyer', year: 1982, universe: 'Star Trek', world: 'Regula I space laboratory (Project Genesis)', medium: 'film', wiki: 'Star_Trek_II:_The_Wrath_of_Khan' },
      { title: 'Foundation / Galactic Empire', author: 'Isaac Asimov', year: 1951, universe: 'Foundation / Robots', world: 'Regulus sector', medium: 'novel', wiki: 'Regulus' },
    ],
  },
  {
    id: 'hip-37826', // Pollux
    works: [
      { title: 'Star Trek — Who Mourns for Adonais?', author: 'Gilbert Ralston', year: 1967, universe: 'Star Trek', world: 'Pollux IV', medium: 'tv', wiki: 'Pollux_(star)' },
    ],
  },
  {
    id: 'hip-36850', // Castor
    works: [
      { title: 'Classic Space Opera (Sextuple System)', author: 'Various', year: 1965, universe: 'Classic SF', world: 'Castor 6-star system in Gemini', medium: 'novel', wiki: 'Castor_(star)' },
    ],
  },
  {
    id: 'hip-14576', // Algol
    works: [
      { title: 'Phantasy Star / Classic Pulp SF', author: 'Sega / Various', year: 1987, universe: 'Phantasy Star', world: 'Algol Star System (Palma, Motavia, Dezolis)', medium: 'game', wiki: 'Algol' },
    ],
  },
  {
    id: 'hip-57548', // Ross 128
    works: [
      { title: 'Frontier: Elite II / Elite Dangerous', author: 'David Braben', year: 1993, universe: 'Elite', world: 'Federal prison colony system', medium: 'game', wiki: 'Ross_128' },
      { title: 'Modern Hard SF Anthologies', author: 'Various', year: 2017, universe: 'Modern Exoplanet SF', world: 'Ross 128 b (quiet temperate M-dwarf world 11 ly away)', medium: 'novel', wiki: 'Ross_128_b' },
    ],
  },
  {
    id: 'nea-trappist-1', // TRAPPIST-1
    works: [
      { title: 'Seven Worlds / NASA Exoplanet Travel Bureau', author: 'Various', year: 2017, universe: 'Modern Exoplanet SF', world: 'TRAPPIST-1d/e/f/g (compact resonant chain of 7 Earth-sized worlds)', medium: 'novel', wiki: 'TRAPPIST-1' },
      { title: 'Elite Dangerous', author: 'Frontier Developments', year: 2017, universe: 'Elite', world: 'Hand-crafted into galaxy immediately after 2017 discovery', medium: 'game', wiki: 'TRAPPIST-1' },
    ],
  },
  {
    id: 'hip-74995', // GJ 581
    works: [
      { title: 'Battleship', author: 'Peter Berg', year: 2012, universe: 'Film SF', world: 'Gliese 581g ("Planet G" — alien signal origin)', medium: 'film', wiki: 'Gliese_581' },
    ],
  },
  {
    id: 'hip-84709', // Gl 667 (GJ 667 C)
    works: [
      { title: 'Alien vs. Predator / Modern Exoplanet SF', author: 'Various', year: 2013, universe: 'Modern Exoplanet SF', world: 'GJ 667 Cc (habitable super-Earth in triple-star system)', medium: 'novel', wiki: 'Gliese_667_Cc' },
    ],
  },
  {
    id: 'hip-43587', // Copernicus (55 Cancri)
    works: [
      { title: '55 Cancri e ("Diamond Planet") Hard SF', author: 'Various', year: 2012, universe: 'Modern Exoplanet SF', world: 'Janssen (55 Cnc e — carbon-rich lava super-Earth)', medium: 'novel', wiki: '55_Cancri_e' },
    ],
  },
  {
    id: 'hip-113357', // Helvetios (51 Pegasi)
    works: [
      { title: 'Halo / Modern Exoplanet SF', author: 'Various', year: 1995, universe: 'Modern Exoplanet SF', world: 'Dimidium (51 Pegasi b — first exoplanet discovered around a Sun-like star)', medium: 'novel', wiki: '51_Pegasi_b' },
    ],
  },
  {
    id: 'hip-53721', // Chalawan (47 Ursae Majoris)
    works: [
      { title: 'Early Exoplanet Hard SF', author: 'Various', year: 1996, universe: 'Modern Exoplanet SF', world: '47 UMa (classic Jupiter-analog solar twin architecture)', medium: 'novel', wiki: '47_Ursae_Majoris' },
    ],
  },
  {
    id: 'hip-79672', // 18 Scorpii
    works: [
      { title: 'Halo / SETI Solar Twin Hard SF', author: 'Various', year: 1997, universe: 'Halo', world: 'Falaknuma (closest near-identical solar twin at 45.3 ly)', medium: 'novel', wiki: '18_Scorpii' },
    ],
  },
  {
    id: 'hip-64394', // Beta Comae Berenices
    works: [
      { title: 'Hard SF Solar Analog Surveys', author: 'Various', year: 2008, universe: 'Modern Exoplanet SF', world: 'Nearly exact solar twin at 30 ly', medium: 'novel', wiki: 'Beta_Comae_Berenices' },
    ],
  },
  {
    id: 'hip-1475', // Groombridge 34
    works: [
      { title: 'Elite / Halo / Classic Hard SF', author: 'Various', year: 1993, universe: 'Halo', world: 'Binary red dwarf 11.6 ly from Sol', medium: 'novel', wiki: 'Groombridge_34' },
    ],
  },
  {
    id: 'hyg-118079', // Gl 65 (Luyten 726-8 / UV Ceti)
    works: [
      { title: 'Frontier: Elite II / Known Space', author: 'Various', year: 1993, universe: 'Elite', world: 'Luyten 726-8 / UV Ceti flare-star binary (8.6 ly)', medium: 'game', wiki: 'Luyten_726-8' },
    ],
  },
  {
    id: 'hip-36208', // Luyten's Star
    works: [
      { title: 'Sónar Calling GJ 273b / Modern Hard SF', author: 'METI International / Various', year: 2017, universe: 'Modern Exoplanet SF', world: 'GJ 273b (real METI interstellar radio message target, 12.4 ly)', medium: 'novel', wiki: "Luyten's_Star" },
    ],
  },
  {
    id: 'hip-17378', // Delta Eridani (Rana)
    works: [
      { title: 'We Are Legion (We Are Bob)', author: 'Dennis E. Taylor', year: 2016, universe: 'Bobiverse', world: 'Delta Eridani (home system of the Deltans, uplifted by Bob-1)', medium: 'novel', wiki: 'Delta_Eridani' },
    ],
  },
  {
    id: 'hip-22449', // Pi3 Orionis (Tabit)
    works: [
      { title: 'For We Are Many (Bobiverse)', author: 'Dennis E. Taylor', year: 2017, universe: 'Bobiverse', world: 'Pi³ Orionis (Bobiverse frontier star)', medium: 'novel', wiki: 'Pi3_Orionis' },
    ],
  },
  {
    id: 'hip-57757', // Beta Virginis (Zavijava)
    works: [
      { title: 'Tau Zero', author: 'Poul Anderson', year: 1970, universe: 'Classic Hard SF', world: 'Destination of the runaway 1g Bussard ramjet Leonora Christine (35.6 ly)', medium: 'novel', wiki: 'Tau_Zero' },
      { title: 'Star Trek / Classic Hard SF', author: 'Various', year: 1966, universe: 'Star Trek', world: 'Beta Virginis system (35.6 ly F9V star)', medium: 'tv', wiki: 'Beta_Virginis' },
    ],
  },
  // === BOBIVERSE COMPLETE OUTER NETWORK (BOOKS 2–4) ===
  {
    id: 'hip-113229', // Gliese 877 (GJ 877)
    works: [
      { title: 'For We Are Many / All These Worlds (Bobiverse)', author: 'Dennis E. Taylor', year: 2017, universe: 'Bobiverse', world: 'Home system & Dyson Sphere of The Others (scouted by Bashful & Hal; destroyed by Icarus & Daedalus in 2257)', medium: 'novel', url: 'https://bobiverse.fandom.com/wiki/Gliese_877' },
    ],
  },
  {
    id: 'hip-5496', // Gliese 54 (GJ 54)
    works: [
      { title: 'For We Are Many (Bobiverse)', author: 'Dennis E. Taylor', year: 2017, universe: 'Bobiverse', world: 'Mario’s untouched forward base (2180), birthplace of Bashful, Hal & Others first contact', medium: 'novel', url: 'https://bobiverse.fandom.com/wiki/Gliese_54' },
    ],
  },
  {
    id: 'hip-1599', // Zeta Tucanae
    works: [
      { title: 'For We Are Many (Bobiverse)', author: 'Dennis E. Taylor', year: 2017, universe: 'Bobiverse', world: 'Second devastated system explored by Mario (2176), confirming The Others’ galactic harvesting', medium: 'novel', url: 'https://bobiverse.fandom.com/wiki/Zeta_Tucanae' },
    ],
  },
  {
    id: 'hip-105858', // Gamma Pavonis
    works: [
      { title: 'For We Are Many / Heaven’s River (Bobiverse)', author: 'Dennis E. Taylor', year: 2017, universe: 'Bobiverse', world: 'Newholme (colony discovered by Claude in 2205; Battle of Newholme in 2334)', medium: 'novel', url: 'https://bobiverse.fandom.com/wiki/Gamma_Pavonis' },
    ],
  },
  {
    id: 'hip-14101', // HIP 14101
    works: [
      { title: 'For We Are Many / All These Worlds (Bobiverse)', author: 'Dennis E. Taylor', year: 2017, universe: 'Bobiverse', world: 'Odin (gas giant with aerial life & Rivendell floating city; Howard & Bridget’s home from 2210)', medium: 'novel', url: 'https://bobiverse.fandom.com/wiki/HIP_14101' },
    ],
  },
  {
    id: 'hip-15457', // Kappa-1 Ceti
    works: [
      { title: 'For We Are Many (Bobiverse)', author: 'Dennis E. Taylor', year: 2017, universe: 'Bobiverse', world: 'High-gravity (3g) super-Earth biosphere catalogued by Luke (2170s)', medium: 'novel', url: 'https://bobiverse.fandom.com/wiki/Kappa_Ceti' },
    ],
  },
  {
    id: 'hip-27072', // Gamma Leporis
    works: [
      { title: 'We Are Legion / Heaven’s River (Bobiverse)', author: 'Dennis E. Taylor', year: 2020, universe: 'Bobiverse', world: 'Gamma Leporis A — Bender’s lost 2165 destination where Bob-1 picks up his faint trail in 2296', medium: 'novel', url: 'https://bobiverse.fandom.com/wiki/Bender' },
    ],
  },
  {
    id: 'hip-28103', // Eta Leporis
    works: [
      { title: 'Heaven’s River (Bobiverse Book 4)', author: 'Dennis E. Taylor', year: 2020, universe: 'Bobiverse', world: 'Quin & Heaven’s River topopolis megastructure — where Bender is held by Quinlan AI ANEC and rescued by Bob-1 (2331–2334)', medium: 'novel', url: 'https://bobiverse.fandom.com/wiki/Eta_Leporis' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Accumulator Helpers
// ---------------------------------------------------------------------------

function createEntryStore(systemsById, displayAliasesBySysId) {
  const map = new Map();

  function getOrCreate(sysId) {
    if (!systemsById.has(sysId) || sysId === 'sol') return null;
    if (!map.has(sysId)) {
      const sys = systemsById.get(sysId);
      const dispAliases = displayAliasesBySysId.get(sysId);
      map.set(sysId, {
        systemId: sys.id,
        systemName: sys.name,
        distLy: sys.distLy,
        aliases: dispAliases ? [...dispAliases].slice(0, 5) : [],
        universes: new Set(),
        sfeUrl: null,
        wikiCategories: [],
        notableWorks: [],
        wikiWorks: [],
        _seenNotable: new Set(),
        _seenWiki: new Set(),
        _seenCat: new Set(),
      });
    }
    return map.get(sysId);
  }

  function addNotable(sysId, work) {
    const entry = getOrCreate(sysId);
    if (!entry || !work?.title) return;
    const key = `${work.title.toLowerCase().replace(/[^a-z0-9]+/g, '')}::${(work.universe || '').toLowerCase()}`;
    if (entry._seenNotable.has(key)) return;
    entry._seenNotable.add(key);
    entry.notableWorks.push({
      title: work.title,
      author: work.author || 'Various',
      year: work.year || null,
      universe: work.universe || null,
      world: work.world || null,
      medium: work.medium || 'novel',
      url: work.url || (work.wiki ? `https://en.wikipedia.org/wiki/${encodeURIComponent(work.wiki)}` : null),
      source: work.source || 'curated',
    });
    if (work.universe) entry.universes.add(work.universe);
  }

  function addWikiWork(sysId, { title, url, source, universe }) {
    const entry = getOrCreate(sysId);
    if (!entry || !title) return;
    const key = title.toLowerCase();
    if (entry._seenWiki.has(key)) return;
    entry._seenWiki.add(key);
    entry.wikiWorks.push({ title, url, source: source || 'wikipedia' });
    if (universe) entry.universes.add(universe);
  }

  function addWikiCategory(sysId, label, url) {
    const entry = getOrCreate(sysId);
    if (!entry || entry._seenCat.has(label)) return;
    entry._seenCat.add(label);
    entry.wikiCategories.push({ label, url });
  }

  function setSfe(sysId, slug) {
    const entry = getOrCreate(sysId);
    if (entry && slug) entry.sfeUrl = `https://sf-encyclopedia.com/entry/${slug}`;
  }

  return { map, getOrCreate, addNotable, addWikiWork, addWikiCategory, setSfe };
}

// ---------------------------------------------------------------------------
// Live Scraper Modules (All Operating Over the Full 3,494-System Alias Index)
// ---------------------------------------------------------------------------

/**
 * 1. Wikipedia: Dynamically discover ALL `Category:Fiction_set_around_*` categories
 *    and sweep EVERY member against our 3,494-system index.
 */
async function sweepWikipediaFictionCategories(index, store) {
  const catListJson = await fetchJsonCached(
    'wiki_allcategories_fiction_set_around',
    'https://en.wikipedia.org/w/api.php?action=query&list=allcategories&acprefix=Fiction+set+around+&aclimit=100&format=json'
  );
  const categories = (catListJson?.query?.allcategories || []).map((c) => c['*']);
  let matchedCats = 0;
  let totalWorks = 0;

  for (const catName of categories) {
    const starPart = catName.replace(/^Fiction set around\s+/i, '').trim();
    const sysId = index.resolveTitleToSystemId(starPart);
    if (!sysId) continue;
    matchedCats++;

    const fullCat = `Category:${catName.replace(/ /g, '_')}`;
    store.addWikiCategory(sysId, catName, `https://en.wikipedia.org/wiki/${encodeURIComponent(fullCat)}`);

    const members = await fetchAllCategoryMembers('wiki', 'https://en.wikipedia.org/w/api.php', fullCat, 2);
    for (const title of members) {
      store.addWikiWork(sysId, {
        title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
        source: 'Wikipedia Category',
      });
      totalWorks++;
    }
  }
  console.log(`[SCIFI] [1/9] Wikipedia Fiction_set_around_* -> ${matchedCats}/${categories.length} categories matched our ${index.systemsById.size} stars (${totalWorks} works).`);
}

/**
 * 2. Wikipedia Core Sci-Fi Articles:
 *    Sweep `Stars in fiction`, `Extrasolar planets in fiction`, ALL Revelation Space articles,
 *    and 20+ landmark hard SF universe articles by matching `[[Wikilink]]` star targets!
 */
const WIKI_SCIFI_ARTICLES = [
  { title: 'Stars in fiction', universe: null, author: 'Wikipedia Survey', medium: 'novel' },
  { title: 'Extrasolar planets in fiction', universe: null, author: 'Wikipedia Survey', medium: 'novel' },
  // Revelation Space (Alastair Reynolds)
  { title: 'Revelation Space series', universe: 'Revelation Space', author: 'Alastair Reynolds', year: 2000, medium: 'novel' },
  { title: 'Revelation Space', universe: 'Revelation Space', author: 'Alastair Reynolds', year: 2000, medium: 'novel' },
  { title: 'Chasm City', universe: 'Revelation Space', author: 'Alastair Reynolds', year: 2001, medium: 'novel' },
  { title: 'Redemption Ark', universe: 'Revelation Space', author: 'Alastair Reynolds', year: 2002, medium: 'novel' },
  { title: 'Absolution Gap', universe: 'Revelation Space', author: 'Alastair Reynolds', year: 2003, medium: 'novel' },
  { title: 'Diamond Dogs, Turquoise Days', universe: 'Revelation Space', author: 'Alastair Reynolds', year: 2002, medium: 'novel' },
  { title: 'Galactic North', universe: 'Revelation Space', author: 'Alastair Reynolds', year: 2006, medium: 'novel' },
  { title: 'The Prefect', universe: 'Revelation Space', author: 'Alastair Reynolds', year: 2007, medium: 'novel' },
  { title: 'Elysium Fire', universe: 'Revelation Space', author: 'Alastair Reynolds', year: 2018, medium: 'novel' },
  { title: 'Inhibitor Phase', universe: 'Revelation Space', author: 'Alastair Reynolds', year: 2021, medium: 'novel' },
  // Other Major Hard SF & Space Opera Series
  { title: 'Known Space', universe: 'Known Space', author: 'Larry Niven', year: 1966, medium: 'novel' },
  { title: 'Alliance–Union universe', universe: 'Alliance-Union', author: 'C. J. Cherryh', year: 1981, medium: 'novel' },
  { title: 'Hainish Cycle', universe: 'Hainish Cycle', author: 'Ursula K. Le Guin', year: 1966, medium: 'novel' },
  { title: 'Hyperion Cantos', universe: 'Hyperion Cantos', author: 'Dan Simmons', year: 1989, medium: 'novel' },
  { title: 'The Forever War', universe: 'The Forever War', author: 'Joe Haldeman', year: 1974, medium: 'novel' },
  { title: 'Project Hail Mary', universe: 'Project Hail Mary', author: 'Andy Weir', year: 2021, medium: 'novel' },
  { title: 'The Three-Body Problem (novel)', universe: 'Three-Body', author: 'Liu Cixin', year: 2008, medium: 'novel' },
  { title: 'The Dark Forest', universe: 'Three-Body', author: 'Liu Cixin', year: 2008, medium: 'novel' },
  { title: 'Aurora (novel)', universe: 'Kim Stanley Robinson', author: 'Kim Stanley Robinson', year: 2015, medium: 'novel' },
  { title: 'The Songs of Distant Earth', universe: 'Arthur C. Clarke', author: 'Arthur C. Clarke', year: 1986, medium: 'novel' },
  { title: 'Honorverse', universe: 'Honorverse', author: 'David Weber', year: 1993, medium: 'novel' },
  { title: 'CoDominium', universe: 'CoDominium', author: 'Jerry Pournelle', year: 1974, medium: 'novel' },
  { title: 'Humanx Commonwealth', universe: 'Humanx Commonwealth', author: 'Alan Dean Foster', year: 1972, medium: 'novel' },
  { title: 'Noon Universe', universe: 'Noon Universe', author: 'Arkady & Boris Strugatsky', year: 1962, medium: 'novel' },
  { title: 'Uplift Universe', universe: 'Uplift Universe', author: 'David Brin', year: 1980, medium: 'novel' },
  { title: 'Vorkosigan Saga', universe: 'Vorkosigan Saga', author: 'Lois McMaster Bujold', year: 1986, medium: 'novel' },
  { title: "Old Man's War", universe: "Old Man's War", author: 'John Scalzi', year: 2005, medium: 'novel' },
  { title: 'Zones of Thought', universe: 'Zones of Thought', author: 'Vernor Vinge', year: 1992, medium: 'novel' },
  { title: 'Frontier: Elite II', universe: 'Elite', author: 'David Braben', year: 1993, medium: 'game' },
  { title: 'Elite Dangerous', universe: 'Elite', author: 'Frontier Developments', year: 2014, medium: 'game' },
  { title: 'Traveller (role-playing game)', universe: 'Traveller', author: 'Marc Miller', year: 1977, medium: 'game' },
  // Additional Landmark Hard SF & Space Opera Novels / Films
  { title: 'Ringworld', universe: 'Known Space', author: 'Larry Niven', year: 1970, medium: 'novel' },
  { title: 'Protector (novel)', universe: 'Known Space', author: 'Larry Niven', year: 1973, medium: 'novel' },
  { title: "The Mote in God's Eye", universe: 'CoDominium', author: 'Larry Niven & Jerry Pournelle', year: 1974, medium: 'novel' },
  { title: 'Downbelow Station', universe: 'Alliance-Union', author: 'C. J. Cherryh', year: 1981, medium: 'novel' },
  { title: 'Cyteen', universe: 'Alliance-Union', author: 'C. J. Cherryh', year: 1988, medium: 'novel' },
  { title: 'The Dispossessed', universe: 'Hainish Cycle', author: 'Ursula K. Le Guin', year: 1974, medium: 'novel' },
  { title: 'The Left Hand of Darkness', universe: 'Hainish Cycle', author: 'Ursula K. Le Guin', year: 1969, medium: 'novel' },
  { title: 'A Deepness in the Sky', universe: 'Zones of Thought', author: 'Vernor Vinge', year: 1999, medium: 'novel' },
  { title: 'A Fire Upon the Deep', universe: 'Zones of Thought', author: 'Vernor Vinge', year: 1992, medium: 'novel' },
  { title: 'Contact (novel)', universe: 'Contact', author: 'Carl Sagan', year: 1985, medium: 'novel' },
  { title: 'Forbidden Planet', universe: 'Forbidden Planet', author: 'Fred M. Wilcox', year: 1956, medium: 'film' },
  { title: 'Avatar (2009 film)', universe: 'Avatar', author: 'James Cameron', year: 2009, medium: 'film' },
  { title: 'Alien (film)', universe: 'Alien', author: 'Ridley Scott', year: 1979, medium: 'film' },
  { title: 'Dune (novel)', universe: 'Dune', author: 'Frank Herbert', year: 1965, medium: 'novel' },
  { title: "Ender's Game", universe: "Ender's Game", author: 'Orson Scott Card', year: 1985, medium: 'novel' },
  { title: 'Speaker for the Dead', universe: "Ender's Game", author: 'Orson Scott Card', year: 1986, medium: 'novel' },
  { title: 'Time Enough for Love', universe: 'Future History', author: 'Robert A. Heinlein', year: 1973, medium: 'novel' },
  { title: '2312 (novel)', universe: 'Kim Stanley Robinson', author: 'Kim Stanley Robinson', year: 2012, medium: 'novel' },
  { title: 'Pushing Ice', universe: 'Alastair Reynolds', author: 'Alastair Reynolds', year: 2005, medium: 'novel' },
  { title: 'Return from the Stars', universe: 'Stanisław Lem', author: 'Stanisław Lem', year: 1961, medium: 'novel' },
  { title: 'Foundation (Asimov novel)', universe: 'Foundation / Robots', author: 'Isaac Asimov', year: 1951, medium: 'novel' },
  { title: 'The Robots of Dawn', universe: 'Foundation / Robots', author: 'Isaac Asimov', year: 1983, medium: 'novel' },
];

// Append user-editable Wikipedia articles from scripts/config/scifi_custom.json
for (const item of CUSTOM_SCIFI.extraWikiArticles || []) {
  if (!item || item._example || (!item.article && !item.title)) continue;
  WIKI_SCIFI_ARTICLES.push({
    title: item.article || item.title,
    universe: item.universe || null,
    author: item.author || 'Wikipedia',
    year: item.year || null,
    medium: item.medium || 'novel',
  });
}

async function sweepWikipediaCoreArticles(index, store) {
  const titles = WIKI_SCIFI_ARTICLES.map((a) => a.title);
  const wtMap = await fetchBatchWikitext('wiki_articles', 'https://en.wikipedia.org/w/api.php', titles, 10);
  const specByTitle = new Map(WIKI_SCIFI_ARTICLES.map((a) => [a.title.toLowerCase(), a]));

  const matchedStars = new Set();
  for (const [pageTitle, wt] of wtMap.entries()) {
    const spec = specByTitle.get(pageTitle.toLowerCase()) || { title: pageTitle, universe: null, author: 'Wikipedia', medium: 'novel' };
    const links = extractWikilinks(wt);
    const seenInArticle = new Set();

    for (const lnk of links) {
      // If the link label itself resolves to a specific star (e.g. Wikipedia's [[Luyten's star|Luyten 726-8]]),
      // prefer the explicit label over a mistakenly piped target!
      const sysId = index.resolveTitleToSystemId(lnk.label) || index.resolveTitleToSystemId(lnk.target);
      if (!sysId || seenInArticle.has(sysId)) continue;
      seenInArticle.add(sysId);
      matchedStars.add(sysId);

      const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`;
      if (spec.universe) {
        const snippet = extractMentionSentence(wt, lnk.index, lnk.label || lnk.target, 155);
        store.addNotable(sysId, {
          title: pageTitle,
          author: spec.author,
          year: spec.year || null,
          universe: spec.universe,
          world: snippet || `Featured in ${pageTitle}`,
          medium: spec.medium,
          url,
          source: 'Wikipedia Article',
        });
      } else {
        store.addWikiWork(sysId, {
          title: pageTitle,
          url,
          source: 'Wikipedia Survey',
        });
      }
    }
  }
  console.log(`[SCIFI] [2/9] Wikipedia Core Sci-Fi Articles (${wtMap.size} pages) -> matched ${matchedStars.size} catalogue systems.`);
}

/**
 * 3. Revelation Space Wiki (`revelationspace.fandom.com/api.php`):
 *    Scrape BOTH `Category:Systems` AND `Category:Planets` + full wikitext!
 */
async function sweepRevelationSpaceWiki(index, store) {
  const api = 'https://revelationspace.fandom.com/api.php';
  const [sysPages, planetPages] = await Promise.all([
    fetchAllCategoryMembers('revspace', api, 'Category:Systems', 2),
    fetchAllCategoryMembers('revspace', api, 'Category:Planets', 2),
  ]);

  const allPages = [...new Set([...sysPages, ...planetPages])];
  const wtMap = await fetchBatchWikitext('revspace', api, allPages, 25);

  const matchedStars = new Set();

  // Direct system page matches
  for (const title of sysPages) {
    const sysId = index.resolveTitleToSystemId(title);
    if (!sysId) continue;
    matchedStars.add(sysId);
    const wt = wtMap.get(title) || '';
    const summary = cleanWikiSummary(wt, 165);
    const url = `https://revelationspace.fandom.com/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
    store.addNotable(sysId, {
      title: `Revelation Space — ${title}`,
      author: 'Alastair Reynolds',
      year: 2000,
      universe: 'Revelation Space',
      world: summary || `Star system in Alastair Reynolds's Revelation Space universe`,
      medium: 'novel',
      url,
      source: 'Revelation Space Wiki',
    });
  }

  // Planet page matches: scan wikilinks in each planet page for real star systems!
  for (const title of planetPages) {
    const wt = wtMap.get(title) || '';
    if (!wt) continue;
    const links = extractWikilinks(wt);
    const leadLinks = links.filter((l) => l.index < 900); // Focus on lead/infobox star link
    for (const lnk of leadLinks) {
      const sysId = index.resolveTitleToSystemId(lnk.target);
      if (!sysId) continue;
      matchedStars.add(sysId);
      const summary = cleanWikiSummary(wt, 165);
      const url = `https://revelationspace.fandom.com/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
      store.addNotable(sysId, {
        title: `Revelation Space — ${title}`,
        author: 'Alastair Reynolds',
        year: 2000,
        universe: 'Revelation Space',
        world: summary || `Fictional world "${title}" in Revelation Space`,
        medium: 'novel',
        url,
        source: 'Revelation Space Wiki',
      });
      break; // Attach planet to its primary host star link
    }
  }

  console.log(`[SCIFI] [3/9] Revelation Space Wiki (${allPages.length} pages) -> matched ${matchedStars.size} catalogue systems.`);
}

/**
 * 4. Generic Multi-Wiki Star System & Planet Category Sweeper
 *    Used for Bobiverse, Halopedia, Memory Alpha, Xenopedia (Alien), Dune,
 *    Hyperion, Asimov/Foundation, Known Space, Honorverse, and Mass Effect!
 */
async function sweepFranchiseWiki(index, store, config) {
  const {
    key,
    label,
    apiBase,
    wikiBase,
    universe,
    author,
    year,
    medium,
    systemCategories = [],
    planetCategories = [],
    maxCatPages = 5,
    fetchDetailsForMatched = true,
  } = config;

  const sysMembers = [];
  for (const cat of systemCategories) {
    const members = await fetchAllCategoryMembers(key, apiBase, cat, maxCatPages);
    sysMembers.push(...members);
  }

  // Match all system/star category titles against our 3,494-system index
  const matchedPages = []; // { pageTitle, sysId }
  const seenSys = new Set();
  for (const pageTitle of new Set(sysMembers)) {
    const sysId = index.resolveTitleToSystemId(pageTitle);
    if (!sysId || seenSys.has(sysId)) continue;
    seenSys.add(sysId);
    matchedPages.push({ pageTitle, sysId });
  }

  // Optionally batch-fetch wikitext ONLY for matched real stars to get clean world/colony summaries!
  let wtMap = new Map();
  if (fetchDetailsForMatched && matchedPages.length > 0) {
    wtMap = await fetchBatchWikitext(
      `${key}_matched`,
      apiBase,
      matchedPages.map((m) => m.pageTitle),
      25
    );
  }

  const cleanSourceName = label.replace(/^\[\d+[a-z]?\/\d+\]\s*/i, '');

  for (const { pageTitle, sysId } of matchedPages) {
    const wt = wtMap.get(pageTitle) || '';
    const summary = cleanWikiSummary(wt, 155);
    const url = `${wikiBase}${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`;
    store.addNotable(sysId, {
      title: `${universe} — ${pageTitle}`,
      author,
      year: year || null,
      universe,
      world: summary || `Featured star system in ${universe}`,
      medium,
      url,
      source: cleanSourceName,
    });
  }

  // Also scan planet categories via lead wikilinks if configured (great for Bobiverse, Dune, Hyperion, Asimov)
  let planetMatches = 0;
  if (planetCategories.length > 0) {
    const planetMembers = [];
    for (const cat of planetCategories) {
      const members = await fetchAllCategoryMembers(key, apiBase, cat, 2);
      planetMembers.push(...members);
    }
    const uniquePlanets = [...new Set(planetMembers)].slice(0, 80);
    if (uniquePlanets.length > 0) {
      const pWtMap = await fetchBatchWikitext(`${key}_planets`, apiBase, uniquePlanets, 25);
      for (const [pTitle, wt] of pWtMap.entries()) {
        // First check if the planet page title itself IS a star name (e.g. Asimov Wiki "61 Cygni", "Arcturus")
        const directSys = index.resolveTitleToSystemId(pTitle);
        let targetSysId = directSys;
        if (!targetSysId) {
          const leadLinks = extractWikilinks(wt).filter((l) => l.index < 800);
          for (const lnk of leadLinks) {
            const candidate = index.resolveTitleToSystemId(lnk.label) || index.resolveTitleToSystemId(lnk.target);
            if (candidate) {
              targetSysId = candidate;
              break;
            }
          }
        }
        if (!targetSysId) continue;
        seenSys.add(targetSysId);
        planetMatches++;
        const summary = cleanWikiSummary(wt, 155);
        const url = `${wikiBase}${encodeURIComponent(pTitle.replace(/ /g, '_'))}`;
        store.addNotable(targetSysId, {
          title: `${universe} — ${pTitle}`,
          author,
          year: year || null,
          universe,
          world: summary || `Fictional world "${pTitle}" in ${universe}`,
          medium,
          url,
          source: cleanSourceName,
        });
      }
    }
  }

  console.log(
    `[SCIFI] ${label} (${sysMembers.length} sys pages) -> matched ${seenSys.size} catalogue systems (${planetMatches} via planet links).`
  );
  return seenSys.size;
}

// ---------------------------------------------------------------------------
// Main Pipeline
// ---------------------------------------------------------------------------

async function main() {
  if (!fs.existsSync(CATALOG_PATH)) {
    throw new Error(`Catalog not found at ${CATALOG_PATH}. Run "npm run data" first.`);
  }
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const index = buildCatalogAliasIndex(catalog);
  const store = createEntryStore(index.systemsById, index.displayAliasesBySysId);

  // 0. Seed Curated Hard Sci-Fi Core FIRST so clean structured titles/authors/years appear at the top
  for (const spec of CURATED_HIGHLIGHTS) {
    if (!index.systemsById.has(spec.id)) continue;
    if (spec.sfeSlug) store.setSfe(spec.id, spec.sfeSlug);
    for (const w of spec.works || []) {
      store.addNotable(spec.id, { ...w, source: 'Curated Hard SF' });
    }
  }

  // 0b. Merge user-editable curated works from scripts/config/scifi_custom.json
  let customCuratedApplied = 0;
  for (const spec of CUSTOM_SCIFI.extraCuratedWorks || []) {
    if (!spec || spec._example) continue;
    const sysId =
      (spec.systemId && index.systemsById.has(spec.systemId) && spec.systemId) ||
      index.resolveTitleToSystemId(spec.system || spec.systemName || '');
    if (!sysId) {
      console.warn(`[SCIFI] Custom curated entry could not resolve star: ${spec.systemId || spec.system}`);
      continue;
    }
    if (spec.sfeSlug) store.setSfe(sysId, spec.sfeSlug);
    for (const w of spec.works || []) {
      store.addNotable(sysId, { ...w, source: w.source || 'Custom Local Entry' });
      customCuratedApplied++;
    }
  }
  if (customCuratedApplied > 0) {
    console.log(`[SCIFI] Applied ${customCuratedApplied} custom local curated works from scifi_custom.json.`);
  }

  // 1-2. Wikipedia Fiction Categories & Core Sci-Fi Literature Articles
  await sweepWikipediaFictionCategories(index, store);
  await sweepWikipediaCoreArticles(index, store);

  // 3. Revelation Space Wiki (Alastair Reynolds)
  await sweepRevelationSpaceWiki(index, store);

  // 4-9. Major Sci-Fi Universe Wikis (All matched against ALL 3,494 stars!)
  await sweepFranchiseWiki(index, store, {
    key: 'bobiverse',
    label: '[4/9] Bobiverse Wiki',
    apiBase: 'https://bobiverse.fandom.com/api.php',
    wikiBase: 'https://bobiverse.fandom.com/wiki/',
    universe: 'Bobiverse',
    author: 'Dennis E. Taylor',
    year: 2016,
    medium: 'novel',
    systemCategories: ['Category:Star_Systems'],
    planetCategories: ['Category:Planets'],
    maxCatPages: 2,
  });

  await sweepFranchiseWiki(index, store, {
    key: 'halopedia',
    label: '[5/9] Halopedia (Halo)',
    apiBase: 'https://www.halopedia.org/api.php',
    wikiBase: 'https://www.halopedia.org/wiki/',
    universe: 'Halo',
    author: 'Bungie / Eric Nylund / 343 Industries',
    year: 2001,
    medium: 'game',
    systemCategories: ['Category:Planetary_systems'],
    maxCatPages: 3,
  });

  await sweepFranchiseWiki(index, store, {
    key: 'memory_alpha',
    label: '[6/9] Memory Alpha (Star Trek)',
    apiBase: 'https://memory-alpha.fandom.com/api.php',
    wikiBase: 'https://memory-alpha.fandom.com/wiki/',
    universe: 'Star Trek',
    author: 'Gene Roddenberry / Star Trek',
    year: 1966,
    medium: 'tv',
    systemCategories: ['Category:Stars', 'Category:Star_systems'],
    maxCatPages: 6,
  });

  await sweepFranchiseWiki(index, store, {
    key: 'xenopedia',
    label: '[7/9] Xenopedia (Alien / Predator)',
    apiBase: 'https://avp.fandom.com/api.php',
    wikiBase: 'https://avp.fandom.com/wiki/',
    universe: 'Alien',
    author: 'Ridley Scott / Alien Universe',
    year: 1979,
    medium: 'film',
    systemCategories: ['Category:Star_systems'],
    maxCatPages: 4,
  });

  await sweepFranchiseWiki(index, store, {
    key: 'dune',
    label: '[8/9] Dune Wiki',
    apiBase: 'https://dune.fandom.com/api.php',
    wikiBase: 'https://dune.fandom.com/wiki/',
    universe: 'Dune',
    author: 'Frank Herbert',
    year: 1965,
    medium: 'novel',
    systemCategories: ['Category:Stars', 'Category:Star_systems'],
    planetCategories: ['Category:Planets'],
    maxCatPages: 2,
  });

  await sweepFranchiseWiki(index, store, {
    key: 'hyperion',
    label: '[9a/9] Hyperion Cantos Wiki',
    apiBase: 'https://hyperioncantos.fandom.com/api.php',
    wikiBase: 'https://hyperioncantos.fandom.com/wiki/',
    universe: 'Hyperion Cantos',
    author: 'Dan Simmons',
    year: 1989,
    medium: 'novel',
    planetCategories: ['Category:Planets'],
    maxCatPages: 2,
  });

  await sweepFranchiseWiki(index, store, {
    key: 'asimov',
    label: '[9b/9] Asimov / Foundation Wiki',
    apiBase: 'https://asimov.fandom.com/api.php',
    wikiBase: 'https://asimov.fandom.com/wiki/',
    universe: 'Foundation / Robots',
    author: 'Isaac Asimov',
    year: 1951,
    medium: 'novel',
    planetCategories: ['Category:Planets'],
    maxCatPages: 2,
  });

  await sweepFranchiseWiki(index, store, {
    key: 'knownspace',
    label: '[9c/9] Known Space Wiki',
    apiBase: 'https://larryniven.fandom.com/api.php',
    wikiBase: 'https://larryniven.fandom.com/wiki/',
    universe: 'Known Space',
    author: 'Larry Niven',
    year: 1966,
    medium: 'novel',
    systemCategories: ['Category:Stars'],
    planetCategories: ['Category:Planets'],
    maxCatPages: 2,
  });

  await sweepFranchiseWiki(index, store, {
    key: 'honorverse',
    label: '[9d/9] Honorverse Wiki',
    apiBase: 'https://honorverse.fandom.com/api.php',
    wikiBase: 'https://honorverse.fandom.com/wiki/',
    universe: 'Honorverse',
    author: 'David Weber',
    year: 1993,
    medium: 'novel',
    systemCategories: ['Category:Systems'],
    maxCatPages: 4,
  });

  await sweepFranchiseWiki(index, store, {
    key: 'masseffect',
    label: '[9e/9] Mass Effect Wiki',
    apiBase: 'https://masseffect.fandom.com/api.php',
    wikiBase: 'https://masseffect.fandom.com/wiki/',
    universe: 'Mass Effect',
    author: 'BioWare',
    year: 2007,
    medium: 'game',
    systemCategories: ['Category:Systems'],
    maxCatPages: 3,
  });

  // 10. Sweep any user-added custom franchise wikis from scripts/config/scifi_custom.json
  const customWikiSources = [];
  for (const cfg of CUSTOM_SCIFI.extraFranchiseWikis || []) {
    if (!cfg || cfg._example || !cfg.key || !cfg.apiBase) continue;
    await sweepFranchiseWiki(index, store, {
      key: `custom_${cfg.key}`,
      label: `[Custom] ${cfg.label || cfg.universe || cfg.key}`,
      apiBase: cfg.apiBase,
      wikiBase: cfg.wikiBase || cfg.apiBase.replace(/\/api\.php.*$/, '/wiki/'),
      universe: cfg.universe || cfg.label || cfg.key,
      author: cfg.author || 'Various',
      year: cfg.year || null,
      medium: cfg.medium || 'novel',
      systemCategories: cfg.systemCategories || [],
      planetCategories: cfg.planetCategories || [],
      maxCatPages: cfg.maxCatPages || 3,
    });
    customWikiSources.push({
      name: cfg.label || cfg.universe || cfg.key,
      url: cfg.wikiBase || cfg.apiBase,
    });
  }

  // Finalize & serialize entries
  const entries = {};
  const universeCounts = {};
  let totalNotableWorks = 0;
  let totalWikiWorks = 0;

  // Sort deterministically by distance from Sol
  const sortedEntries = [...store.map.values()].sort((a, b) => a.distLy - b.distLy);

  for (const e of sortedEntries) {
    // Keep only systems that have at least one notableWork or wikiWork
    if (e.notableWorks.length === 0 && e.wikiWorks.length === 0) continue;

    // Deduplicate overlapping curated vs wiki entries with identical universe + very similar title
    const universes = [...e.universes].sort((a, b) => a.localeCompare(b));
    for (const u of universes) {
      universeCounts[u] = (universeCounts[u] || 0) + 1;
    }

    totalNotableWorks += e.notableWorks.length;
    totalWikiWorks += e.wikiWorks.length;

    entries[e.systemId] = {
      systemId: e.systemId,
      systemName: e.systemName,
      distLy: e.distLy,
      aliases: e.aliases,
      universes,
      sfeUrl: e.sfeUrl,
      wikiCategories: e.wikiCategories,
      notableWorks: e.notableWorks,
      wikiWorks: e.wikiWorks,
      totalCount: e.notableWorks.length + e.wikiWorks.length,
    };
  }

  // Sort universe summary by star count desc
  const topUniverses = Object.entries(universeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const nowIso = new Date().toISOString();
  const output = {
    meta: {
      generatedAt: nowIso.slice(0, 10),
      generatedAtIso: nowIso,
      catalogueSystemsSwept: catalog.systems.length,
      uniqueAliasesIndexed: index.aliasToSystemId.size,
      systemsWithFictionCount: Object.keys(entries).length,
      curatedHighlightsCount: totalNotableWorks,
      wikipediaCategoryWorksCount: totalWikiWorks,
      universes: topUniverses,
      sources: [
        {
          name: 'Wikipedia — Fiction about Stars & Sci-Fi Universe Articles (MediaWiki API)',
          url: 'https://en.wikipedia.org/wiki/Stars_in_fiction',
        },
        {
          name: 'Revelation Space Wiki (Alastair Reynolds)',
          url: 'https://revelationspace.fandom.com/wiki/Category:Systems',
        },
        {
          name: 'Bobiverse Wiki (Dennis E. Taylor)',
          url: 'https://bobiverse.fandom.com/wiki/Category:Star_Systems',
        },
        {
          name: 'Halopedia (Halo Universe Planetary Systems)',
          url: 'https://www.halopedia.org/wiki/Category:Planetary_systems',
        },
        {
          name: 'Memory Alpha (Star Trek Stars & Systems)',
          url: 'https://memory-alpha.fandom.com/wiki/Category:Stars',
        },
        {
          name: 'Xenopedia (Alien / Predator Star Systems)',
          url: 'https://avp.fandom.com/wiki/Category:Star_systems',
        },
        {
          name: 'Dune Wiki / Hyperion / Asimov / Known Space / Honorverse / Mass Effect Wikis',
          url: 'https://dune.fandom.com/wiki/Category:Stars',
        },
        {
          name: 'The Encyclopedia of Science Fiction (SFE)',
          url: 'https://sf-encyclopedia.com/',
        },
        ...customWikiSources,
      ],
    },
    bySystemId: entries,
  };

  writeJsonAtomic(OUT_PATH, output, true);
  const kb = (fs.statSync(OUT_PATH).size / 1024).toFixed(1);
  console.log(`\n[SCIFI] Wrote ${OUT_PATH} (${kb} KB)`);
  console.log(`[SCIFI] Summary: ${output.meta.systemsWithFictionCount} / ${catalog.systems.length} systems matched, ${totalNotableWorks} structured entries, ${totalWikiWorks} Wikipedia category works.`);
  console.log('[SCIFI] Top Universes:', topUniverses.slice(0, 15).map((u) => `${u.name} (${u.count})`).join(', '));

  const rsStars = Object.values(entries).filter((e) => e.universes.includes('Revelation Space'));
  console.log(
    `\n[SCIFI] Revelation Space stars matched (${rsStars.length}):`,
    rsStars.map((e) => `${e.systemName}${e.aliases[0] ? ` [${e.aliases[0]}]` : ''} (${e.distLy.toFixed(1)} ly)`).join(' | ')
  );
}

main().catch((err) => {
  console.error('[SCIFI] Sweep failed:', err);
  process.exit(1);
});
