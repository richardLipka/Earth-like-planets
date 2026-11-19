#!/usr/bin/env node
/**
 * Builds & validates `public/data/scifi_voyages.json` — a bilingual (EN / CS)
 * library of 26 canonical hard sci-fi sublight starship & character voyages
 * (including Revelation Space, the 4-chapter Bobiverse saga across 19 real stars,
 * the 3-chapter Stephen Baxter Xeelee Sequence chronology from Timelike Infinity
 * to Raft & Ring, Eastern & Central European classics by Lem, Yefremov,
 * Strugatsky, Martynov & Babula, Classic Hard SF by Anderson, Heinlein, Le Guin,
 * Niven, Clarke & Forward, and Modern Hard SF), mapped strictly to real 3D star
 * systems in `public/data/astrometrics_catalog.json` and verified against the
 * relativistic flight physics engine.
 *
 * Usage:
 *   node scripts/buildSciFiVoyages.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planMultiStopVoyage } from '../src/engine/voyagePlanner.js';
import { readJsonIfExists, writeJsonAtomic } from './lib/ioUtils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'public', 'data', 'astrometrics_catalog.json');
const SCIFI_PATH = path.join(ROOT, 'public', 'data', 'scifi_literature.json');
const CUSTOM_VOYAGES_PATH = path.join(__dirname, 'config', 'voyages_custom.json');
const OUT_PATH = path.join(ROOT, 'public', 'data', 'scifi_voyages.json');

const VOYAGE_PRESETS = [
  // =========================================================================
  // REVELATION SPACE (ALASTAIR REYNOLDS)
  // =========================================================================
  {
    id: 'revelation-space-clavain-inhibitor',
    category: 'revelation-space',
    universe: 'Revelation Space',
    author: 'Alastair Reynolds',
    year: 2002,
    books: {
      en: 'Revelation Space · Redemption Ark · Absolution Gap',
      cs: 'Odhalený vesmír · Archa vykoupení · Propast rozhřešení',
    },
    sourceUrl: 'https://revelationspace.fandom.com/wiki/Nevil_Clavain',
    sourceLabel: {
      en: 'Revelation Space Wiki — Nevil Clavain & Official Timeline',
      cs: 'Revelation Space Wiki — Nevil Clavain a oficiální časová osa',
    },
    title: {
      en: 'Nevil Clavain & Nostalgia for Infinity (Inhibitor War)',
      cs: 'Nevil Clavain a Nostalgia for Infinity (Válka s Inhibitory)',
    },
    subtitle: {
      en: 'Clavain’s inertia-suppressed Zodiacal Light (2.5g) races to Resurgam & Ararat alongside Ilia Volyova’s Nostalgia for Infinity (1g) and Quaiche’s Gnostic Ascension.',
      cs: 'Clavainova loď Zodiacal Light (2,5g s potlačením setrvačnosti) letí k Resurgamu a Araratu souběžně s Nostalgia for Infinity (1g) a Gnostic Ascension.',
    },
    physicsNote: {
      en: 'Strictly sub-light Conjoiner drives: real 3D distance Delta Pavonis → p Eridani is 16.38 ly, giving 18.2 yr Earth time at 1g flip — matching Reynolds’s canonical 2633 → 2651 timeline!',
      cs: 'Čistě podsvětelné pohony Spojenců: reálná 3D vzdálenost Delta Pavonis → p Eridani je 16,38 ly, což při 1g otočce dává 18,2 roku Země — přesně dle kanonické osy 2633 → 2651!',
    },
    recommendedClockStart: 2546.0,
    focusSystemId: 'hip-16537',
    ships: [
      {
        id: 'rs-clavain-zodiacal',
        name: 'Nevil Clavain · Zodiacal Light (2.5g)',
        nameCs: 'Nevil Clavain · Zodiacal Light (2,5g)',
        color: '#00f0ff',
        departureYear: 2592.0,
        crewStartAge: 85.0,
        driveConfig: {
          mode: 'flip',
          accelG: 2.5,
          cruiseC: 0.99,
          driveType: 'non-reactive',
          exhaustVelC: 0.33,
        },
        waypoints: [
          { systemId: 'hip-86162', stayYears: 0 },
          { systemId: 'hip-16537', stayYears: 1.0 },
          { systemId: 'hip-99240', stayYears: 0.5 },
          { systemId: 'hyg-118084', stayYears: 0 },
        ],
      },
      {
        id: 'rs-volyova-infinity',
        name: 'Volyova & Khouri · Nostalgia for Infinity (1g)',
        nameCs: 'Voljovová a Khouriová · Nostalgia for Infinity (1g)',
        color: '#f59e0b',
        departureYear: 2546.0,
        crewStartAge: 36.0,
        driveConfig: {
          mode: 'flip',
          accelG: 1.0,
          cruiseC: 0.99,
          driveType: 'non-reactive',
          exhaustVelC: 0.33,
        },
        waypoints: [
          { systemId: 'hip-16537', stayYears: 0 },
          { systemId: 'hip-99240', stayYears: 62.5 },
          { systemId: 'hyg-118084', stayYears: 24.0 },
          { systemId: 'hip-7981', stayYears: 0 },
        ],
      },
      {
        id: 'rs-quaiche-gnostic',
        name: 'Quaiche · Gnostic Ascension (1g)',
        nameCs: 'Quaiche · Gnostic Ascension (1g)',
        color: '#c084fc',
        departureYear: 2573.0,
        crewStartAge: 40.0,
        driveConfig: {
          mode: 'flip',
          accelG: 1.0,
          cruiseC: 0.99,
          driveType: 'non-reactive',
          exhaustVelC: 0.33,
        },
        waypoints: [
          { systemId: 'hip-84405', stayYears: 0 },
          { systemId: 'hip-7981', stayYears: 0 },
        ],
      },
    ],
    storyEvents: [
      {
        id: 'rs-ev-1',
        title: {
          en: 'Hades / Cerberus Awakening (Delta Pavonis)',
          cs: 'Probuzení Hádu / Kerbera (Delta Pavonis)',
        },
        systemId: 'hip-99240',
        year: 2567.0,
      },
      {
        id: 'rs-ev-2',
        title: {
          en: 'Clavain Defects from Conjoiners (Gliese 687)',
          cs: 'Clavain opouští Spojence (Gliese 687)',
        },
        systemId: 'hip-86162',
        year: 2615.0,
      },
      {
        id: 'rs-ev-3',
        title: {
          en: 'Evacuation of Resurgam (Delta Pavonis)',
          cs: 'Evakuace Resurgamu (Delta Pavonis)',
        },
        systemId: 'hip-99240',
        year: 2633.0,
      },
      {
        id: 'rs-ev-4',
        title: {
          en: 'Inhibitor Assault on Ararat (p Eridani)',
          cs: 'Útok Inhibitorů na Ararat (p Eridani)',
        },
        systemId: 'hyg-118084',
        year: 2675.0,
      },
    ],
  },

  {
    id: 'revelation-space-exodus-chasm-city',
    category: 'revelation-space',
    universe: 'Revelation Space',
    author: 'Alastair Reynolds',
    year: 2001,
    books: {
      en: 'Chasm City · Galactic North · Diamond Dogs, Turquoise Days',
      cs: 'Odvrácená strana · Galaktický sever · Diamantoví psi, Tyrkysové dny',
    },
    sourceUrl: 'https://revelationspace.fandom.com/wiki/Timeline',
    sourceLabel: {
      en: 'Revelation Space Wiki — Official Reynolds Chronology',
      cs: 'Revelation Space Wiki — oficiální chronologie A. Reynoldse',
    },
    title: {
      en: 'Early Conjoiner Exodus, Chasm City & Galactic North',
      cs: 'Raný exodus Spojenců, Odvrácená strana a Galaktický sever',
    },
    subtitle: {
      en: 'Nevil Clavain’s 2205 flight to Diadem (Ross 248), Irravel Veda’s Hirondelle chase (Galactic North), Tanner Mirabel’s flight from Sky’s Edge (61 Cygni → Yellowstone), and Voice of Evening to Turquoise.',
      cs: 'Clavainův útěk r. 2205 na Diadem (Ross 248), pronásledování lodí Hirondelle (Galaktický sever), let Tannera Mirabela z Okraje nebe (61 Cygni → Yellowstone) a let k Turquoise.',
    },
    physicsNote: {
      en: 'All four vessels use 1g Conjoiner lighthugger flip profiles across real 3D distances (Sol → Ross 248: 10.32 ly = 12.1 yr Earth, matching 2205 → 2217; 61 Cygni → Epsilon Eridani: 16.87 ly = 18.7 yr Earth, matching 2498 → 2517).',
      cs: 'Všechny čtyři lodě využívají 1g brachistochrony v reálných 3D vzdálenostech (Sol → Ross 248: 10,32 ly = 12,1 r. Země, přesně 2205 → 2217; 61 Cygni → Epsilon Eridani: 16,87 ly = 18,7 r. Země).',
    },
    recommendedClockStart: 2205.0,
    focusSystemId: 'sol',
    ships: [
      {
        id: 'rs-early-clavain',
        name: 'Nevil Clavain & Galiana · Nightshade (1g)',
        nameCs: 'Nevil Clavain a Galiana · Nightshade (1g)',
        color: '#00f0ff',
        departureYear: 2205.0,
        crewStartAge: 60.0,
        driveConfig: {
          mode: 'flip',
          accelG: 1.0,
          cruiseC: 0.99,
          driveType: 'non-reactive',
          exhaustVelC: 0.33,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hyg-119585', stayYears: 8.0 },
          { systemId: 'hip-86162', stayYears: 0 },
        ],
      },
      {
        id: 'rs-hirondelle',
        name: 'Irravel Veda · Hirondelle (1g)',
        nameCs: 'Irravel Veda · Hirondelle (1g)',
        color: '#00ff88',
        departureYear: 2303.0,
        crewStartAge: 34.0,
        driveConfig: {
          mode: 'flip',
          accelG: 1.0,
          cruiseC: 0.99,
          driveType: 'non-reactive',
          exhaustVelC: 0.33,
        },
        waypoints: [
          { systemId: 'hip-16537', stayYears: 0 },
          { systemId: 'hyg-118079', stayYears: 1.0 },
          { systemId: 'hip-114046', stayYears: 2.0 },
          { systemId: 'hip-57548', stayYears: 0 },
        ],
      },
      {
        id: 'rs-mirabel-caledonia',
        name: 'Tanner Mirabel · Caledonia (1g)',
        nameCs: 'Tanner Mirabel · Caledonia (1g)',
        color: '#f59e0b',
        departureYear: 2498.0,
        crewStartAge: 35.0,
        driveConfig: {
          mode: 'flip',
          accelG: 1.0,
          cruiseC: 0.99,
          driveType: 'non-reactive',
          exhaustVelC: 0.33,
        },
        waypoints: [
          { systemId: 'hip-104214', stayYears: 0 },
          { systemId: 'hip-16537', stayYears: 0 },
        ],
      },
      {
        id: 'rs-turquoise-voice',
        name: 'Voice of Evening · Turquoise Days (1g)',
        nameCs: 'Hlas večera · Tyrkysové dny (1g)',
        color: '#c084fc',
        departureYear: 2518.0,
        crewStartAge: 30.0,
        driveConfig: {
          mode: 'flip',
          accelG: 1.0,
          cruiseC: 0.99,
          driveType: 'non-reactive',
          exhaustVelC: 0.33,
        },
        waypoints: [
          { systemId: 'hip-16537', stayYears: 0 },
          { systemId: 'hip-49908', stayYears: 0 },
        ],
      },
    ],
    storyEvents: [
      {
        id: 'rse-ev-1',
        title: {
          en: 'Discovery of Setterholm’s Worms on Diadem (Ross 248)',
          cs: 'Objev Setterholmových červů na Diademu (Ross 248)',
        },
        systemId: 'hyg-119585',
        year: 2217.0,
      },
      {
        id: 'rse-ev-2',
        title: {
          en: 'Fand Hostage Crisis (Lacaille 9352)',
          cs: 'Krize s rukojmími na Fandu (Lacaille 9352)',
        },
        systemId: 'hip-114046',
        year: 2378.0,
      },
      {
        id: 'rse-ev-3',
        title: {
          en: 'Tanner Mirabel Arrives in Chasm City (Epsilon Eridani)',
          cs: 'Tanner Mirabel přilétá do Odvráceného města (Epsilon Eridani)',
        },
        systemId: 'hip-16537',
        year: 2517.0,
      },
    ],
  },

  // =========================================================================
  // BOBIVERSE (DENNIS E. TAYLOR) — BOOKS 1–4 COMPLETE SUBLIGHT CHRONOLOGY
  // =========================================================================
  {
    id: 'bobiverse-expansion',
    category: 'bobiverse',
    universe: 'Bobiverse',
    universeCs: 'Bobiverzum',
    author: 'Dennis E. Taylor',
    year: 2016,
    books: {
      en: 'Book 1: We Are Legion (We Are Bob)',
      cs: 'Kniha 1: My jsme legie (My jsme Bob)',
    },
    sourceUrl: 'https://bobiverse.fandom.com/wiki/Timeline',
    sourceLabel: {
      en: 'Bobiverse Wiki — Official Book 1–4 Chronology',
      cs: 'Bobiverse Wiki — oficiální chronologie knih 1–4',
    },
    title: {
      en: 'Bobiverse I — First Wave Expansion & Battle of Epsilon Eridani (2133–2185)',
      cs: 'Bobiverzum I — První vlna expanze a bitva u Epsilon Eridani (2133–2185)',
    },
    subtitle: {
      en: 'Bob-1 flees Earth aboard HEAVEN-1 (2133), defeats Medeiros at Epsilon Eridani (2144), and spawns 8 canonical Von Neumann probe waves fanning out to Delta Eridani (Deltans), Sol (Riker & Homer), 40 Eridani (Milo), Beta Hydri → Zeta Tucanae → GJ 54 (Mario), Alpha Centauri, Epsilon Indi, Eta Cassiopeiae (Poseidon), and 82 Eridani (Khan).',
      cs: 'Bob-1 uniká ze Země na lodi HEAVEN-1 (2133), poráží Medeirose u Epsilon Eridani (2144) a vysílá 8 kanonických vln Von Neumannových sond k Delta Eridani (Delťané), Slunci (Riker a Homer), 40 Eridani (Milo), Beta Hydri → Zeta Tucanae → GJ 54 (Mario), Alfě Centauri, Epsilon Indi, Eta Cassiopeiae (Poseidon) a 82 Eridani (Khan).',
    },
    physicsNote: {
      en: 'Reactionless SURGE probes at 3g midpoint-flip lock onto Dennis E. Taylor’s exact Book 1 months across real 3D Hipparcos distances: Sol → Eps Eri (10.49 ly: Aug 2133 → Aug 2144), Eps Eri → Del Eri (19.01 ly: → Apr 2165), Riker → Sol (Jan 2157), Milo → 40 Eri (Jul 2152) → 82 Eri (Aug 2165), and Mario’s 3-star sweep (2169 → 2177 → 2180)!',
      cs: 'Nereaktivní sondy s pohonem SURGE (3g s otočkou) trefují přesné měsíce 1. knihy v reálných 3D vzdálenostech Hipparcos: Sol → Eps Eri (10,49 ly: srpen 2133 → srpen 2144), Eps Eri → Del Eri (19,01 ly: → duben 2165), Riker → Sol (leden 2157), Milo → 40 Eri (červenec 2152) → 82 Eri (srpen 2165) i Mariův tříhvězdný průzkum (2169 → 2177 → 2180)!',
    },
    recommendedClockStart: 2133.5,
    focusSystemId: 'hip-16537',
    ships: [
      {
        id: 'bob1-heaven1',
        name: 'Bob-1 · HEAVEN-1 (3g SURGE)',
        nameCs: 'Bob-1 · HEAVEN-1 (3g SURGE)',
        color: '#00f0ff',
        departureYear: 2133.63,
        crewStartAge: 31.0,
        driveConfig: {
          mode: 'flip',
          accelG: 3.0,
          cruiseC: 0.995,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-16537', stayYears: 0.9 }, // Epsilon Eridani (Aug 2144 -> Jul 2145 cloning)
          { systemId: 'hip-17378', stayYears: 0 },   // Delta Eridani / Rana (Apr 2165: Eden & Deltans)
        ],
      },
      {
        id: 'bob1-riker-homer',
        name: 'Riker & Homer · Earth Rescue (3g)',
        nameCs: 'Riker a Homer · Záchrana Země (3g)',
        color: '#38bdf8',
        departureYear: 2145.9,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flip',
          accelG: 3.0,
          cruiseC: 0.995,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-16537', stayYears: 0 },
          { systemId: 'sol', stayYears: 0 },         // Sol (Jan 2157: defeats Brazilian probes)
        ],
      },
      {
        id: 'bob1-milo',
        name: 'Milo · Vulcan/Romulus → 82 Eri (3g)',
        nameCs: 'Milo · Vulkán/Romulus → 82 Eri (3g)',
        color: '#00ff88',
        departureYear: 2145.6,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flip',
          accelG: 3.0,
          cruiseC: 0.995,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-16537', stayYears: 0 },
          { systemId: 'hip-19849', stayYears: 0.6 }, // 40 Eridani (Jul 2152: Vulcan & Romulus)
          { systemId: 'hip-15510', stayYears: 0 },   // 82 G. Eridani (Aug 2165: ambushed by Medeiros)
        ],
      },
      {
        id: 'bob1-mario',
        name: 'Mario · Others Trail Sweep (3g)',
        nameCs: 'Mario · Stopa Jiných (3g)',
        color: '#f59e0b',
        departureYear: 2145.6,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flip',
          accelG: 3.0,
          cruiseC: 0.995,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-16537', stayYears: 0 },
          { systemId: 'hip-2021', stayYears: 0.15 }, // Beta Hydri (Aug 2169: metal-stripped graveyard)
          { systemId: 'hip-1599', stayYears: 0.15 }, // Zeta Tucanae (Nov 2176: dead civilization)
          { systemId: 'hip-5496', stayYears: 0 },    // Gliese 54 (May 2180: forward base)
        ],
      },
      {
        id: 'bob1-calvin-goku',
        name: 'Calvin & Goku · Alpha Centauri (3g)',
        nameCs: 'Calvin a Goku · Alfa Centauri (3g)',
        color: '#c084fc',
        departureYear: 2150.7,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flip',
          accelG: 3.0,
          cruiseC: 0.995,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-16537', stayYears: 0 },
          { systemId: 'hip-71683', stayYears: 0 },   // Alpha Centauri (Nov 2163: USE wreck)
        ],
      },
      {
        id: 'bob1-linus',
        name: 'Linus · Epsilon Indi Round-Trip (3g)',
        nameCs: 'Linus · Epsilon Indi tam a zpět (3g)',
        color: '#a3e635',
        departureYear: 2150.7,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flip',
          accelG: 3.0,
          cruiseC: 0.995,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-16537', stayYears: 0 },
          { systemId: 'hip-108870', stayYears: 0.3 }, // Epsilon Indi (Apr 2165: rescues Henry Roberts)
          { systemId: 'hip-16537', stayYears: 0 },    // Returns to Bill at Epsilon Eridani (~2180)
        ],
      },
      {
        id: 'bob1-mulder',
        name: 'Mulder · Poseidon Discovery (3g)',
        nameCs: 'Mulder · Objev Poseidonu (3g)',
        color: '#fbbf24',
        departureYear: 2150.6,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flip',
          accelG: 3.0,
          cruiseC: 0.995,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-16537', stayYears: 0 },
          { systemId: 'hip-3821', stayYears: 0 },     // Eta Cassiopeiae / Achird (Oct 2170: Poseidon)
        ],
      },
      {
        id: 'bob1-khan-fleet',
        name: 'Khan & 7 Bill Clones · 1st 82 Eri Strike (3g)',
        nameCs: 'Khan a 7 Billových klonů · 1. úder na 82 Eri (3g)',
        color: '#fb7185',
        departureYear: 2172.3,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flip',
          accelG: 3.0,
          cruiseC: 0.995,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-16537', stayYears: 0 },
          { systemId: 'hip-15510', stayYears: 0 },    // 82 G. Eridani (Apr 2185: avenges Milo)
        ],
      },
    ],
    storyEvents: [
      {
        id: 'bob1-ev-1',
        title: {
          en: 'HEAVEN-1 Emergency Launch During Earth War (Sol)',
          cs: 'Nouzový start HEAVEN-1 při vypuknutí války na Zemi (Sol)',
        },
        systemId: 'sol',
        year: 2133.63,
      },
      {
        id: 'bob1-ev-2',
        title: {
          en: 'Battle of Epsilon Eridani vs. Medeiros & First Cloning',
          cs: 'Bitva u Epsilon Eridani proti Medeirosovi a první klonování',
        },
        systemId: 'hip-16537',
        year: 2144.7,
      },
      {
        id: 'bob1-ev-3',
        title: {
          en: 'Milo Discovers Habitable Twins Vulcan & Romulus (40 Eridani)',
          cs: 'Milo objevuje obyvatelná dvojčata Vulkán a Romulus (40 Eridani)',
        },
        systemId: 'hip-19849',
        year: 2152.5,
      },
      {
        id: 'bob1-ev-4',
        title: {
          en: 'Riker & Homer Defeat Brazilian Probes & Save Earth (Sol)',
          cs: 'Riker a Homer ničí brazilské sondy a zachraňují Zemi (Sol)',
        },
        systemId: 'sol',
        year: 2157.0,
      },
      {
        id: 'bob1-ev-5',
        title: {
          en: 'Bob-1 Discovers Deltans & Archimedes (Delta Eridani)',
          cs: 'Bob-1 objevuje Delťany a Archiméda na Edenu (Delta Eridani)',
        },
        systemId: 'hip-17378',
        year: 2165.3,
      },
      {
        id: 'bob1-ev-6',
        title: {
          en: 'Mario Finds Metal-Stripped Alien Graveyard (Beta Hydri)',
          cs: 'Mario nachází vytěžené pohřebiště civilizace (Beta Hydri)',
        },
        systemId: 'hip-2021',
        year: 2169.6,
      },
      {
        id: 'bob1-ev-7',
        title: {
          en: 'Mulder Discovers Ocean World Poseidon (Eta Cassiopeiae)',
          cs: 'Mulder objevuje oceánský svět Poseidon (Eta Cassiopeiae)',
        },
        systemId: 'hip-3821',
        year: 2170.8,
      },
    ],
  },

  {
    id: 'bobiverse-exodus-colonies',
    category: 'bobiverse',
    universe: 'Bobiverse',
    universeCs: 'Bobiverzum',
    author: 'Dennis E. Taylor',
    year: 2017,
    books: {
      en: 'Book 2: For We Are Many',
      cs: 'Kniha 2: Protože nás je mnoho',
    },
    sourceUrl: 'https://bobiverse.fandom.com/wiki/Timeline',
    sourceLabel: {
      en: 'Bobiverse Wiki — Exodus & Colony Fleet Timeline',
      cs: 'Bobiverse Wiki — časová osa exodu a kolonizačních flotil',
    },
    title: {
      en: 'Bobiverse II — Human Exodus Convoys & Colony Founding (2165–2222)',
      cs: 'Bobiverzum II — Lidský exodus a zakládání kolonií (2165–2222)',
    },
    subtitle: {
      en: 'As nuclear winter freezes Earth, Riker’s 1.5g stasis transports evacuate humanity to Vulcan & Romulus (Howard, Bert & Ernie), Klown Kar Planet (Rudy & Edwin), Poseidon (Marcus & Monty), and Asgard/Takamagahara (Mack, Isaac, Jack & Owen), while Loki clears Medeiros from 82 Eridani and Luke & Marvin scout outward from Eden.',
      cs: 'Zatímco Zemi svírá jaderná zima, 1,5g transportéry ve stázi evakuují lidstvo na Vulkán a Romulus (Howard, Bert a Ernie), KKP (Rudy a Edwin), Poseidon (Marcus a Monty) a Asgard/Takamagaharu (Mack, Isaac, Jack a Owen); Loki čistí 82 Eridani od Medeirose a Luke s Marvinem zkoumají okolí Edenu.',
    },
    physicsNote: {
      en: 'Human colony transports accelerate at 1.5g (matching stasis-pod limits): Sol → 40 Eridani (16.26 ly: Apr 2171 → Sep 2188), Sol → Epsilon Indi (11.81 ly: → Feb 2190), Sol → Eta Cassiopeiae (19.42 ly: → Mar 2195), and Sol → 82 Eridani (19.71 ly: → Oct 2220). Notice how Howard’s 40 Eri → HIP 14101 leg (16.42 ly) takes 17.7 yr Earth vs. 4.3 yr ship proper time!',
      cs: 'Lidské kolonizační lodě zrychlují 1,5g (limit stázových kapslí): Sol → 40 Eridani (16,26 ly: duben 2171 → září 2188), Sol → Epsilon Indi (11,81 ly: → únor 2190), Sol → Eta Cassiopeiae (19,42 ly: → březen 2195) a Sol → 82 Eridani (19,71 ly: → říjen 2220). Howardův přelet 40 Eri → HIP 14101 (16,42 ly) trvá 17,7 r. Země vs. 4,3 r. vlastního času!',
    },
    recommendedClockStart: 2165.5,
    focusSystemId: 'sol',
    ships: [
      {
        id: 'bob2-howard-exodus',
        name: 'Howard, Bert & Ernie · Exodus-1/2 → Odin (1.5g)',
        nameCs: 'Howard, Bert a Ernie · Exodus-1/2 → Odin (1,5g)',
        color: '#00f0ff',
        departureYear: 2171.3,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flip',
          accelG: 1.5,
          cruiseC: 0.99,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-19849', stayYears: 6.5 }, // 40 Eridani (Sep 2188 Vulcan -> Apr 2195 Bridget's wedding)
          { systemId: 'hip-14101', stayYears: 0 },   // HIP 14101 (Odin gas giant aerial biosphere)
        ],
      },
      {
        id: 'bob2-rudy-edwin',
        name: 'Rudy & Edwin · Exodus-6 to Big Top/KKP (1.5g)',
        nameCs: 'Rudy a Edwin · Exodus-6 na Big Top/KKP (1,5g)',
        color: '#00ff88',
        departureYear: 2177.1,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flip',
          accelG: 1.5,
          cruiseC: 0.99,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-108870', stayYears: 1.0 }, // Epsilon Indi (Feb 2190 colonists settle KKP)
          { systemId: 'sol', stayYears: 0 },          // Edwin returns to Sol for next colony run
        ],
      },
      {
        id: 'bob2-marcus-monty',
        name: 'Marcus & Monty · Poseidon Transport (1.5g)',
        nameCs: 'Marcus a Monty · Transport na Poseidon (1,5g)',
        color: '#38bdf8',
        departureYear: 2174.5,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flip',
          accelG: 1.5,
          cruiseC: 0.99,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-3821', stayYears: 6.6 },   // Eta Cassiopeiae (Mar 2195 -> Nov 2201 Mulder departs)
          { systemId: 'sol', stayYears: 0 },          // Monty returns to Sol for more colonists
        ],
      },
      {
        id: 'bob2-loki-strike',
        name: 'Loki Strike Fleet · 2nd Battle of 82 Eri (3g)',
        nameCs: 'Úderný svaz Lokiho · 2. bitva u 82 Eri (3g)',
        color: '#fb7185',
        departureYear: 2182.8,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flip',
          accelG: 3.0,
          cruiseC: 0.995,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-16537', stayYears: 0 },
          { systemId: 'hip-15510', stayYears: 0 },    // 82 G. Eridani (Nov 2195: defeats Medeiros)
        ],
      },
      {
        id: 'bob2-mack-colonies',
        name: 'Mack, Isaac, Jack & Owen · Asgard Fleet (1.5g)',
        nameCs: 'Mack, Isaac, Jack a Owen · Flotila Asgard (1,5g)',
        color: '#f59e0b',
        departureYear: 2199.8,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flip',
          accelG: 1.5,
          cruiseC: 0.99,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-15510', stayYears: 0 },    // 82 G. Eridani (Oct 2220: Asgard & Takamagahara)
        ],
      },
      {
        id: 'bob2-luke',
        name: 'Luke · Kappa¹ Ceti Scout (3g)',
        nameCs: 'Luke · Průzkum Kappa¹ Ceti (3g)',
        color: '#c084fc',
        departureYear: 2165.8,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flip',
          accelG: 3.0,
          cruiseC: 0.995,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-17378', stayYears: 0 },
          { systemId: 'hip-15457', stayYears: 0 },    // Kappa-1 Ceti (3g super-Earth)
        ],
      },
      {
        id: 'bob2-marvin',
        name: 'Marvin · Pi³ Orionis / Tabit Scout (3g)',
        nameCs: 'Marvin · Průzkum Pi³ Orionis / Tabit (3g)',
        color: '#a3e635',
        departureYear: 2173.9,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flip',
          accelG: 3.0,
          cruiseC: 0.995,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-17378', stayYears: 0 },
          { systemId: 'hip-22449', stayYears: 0 },    // Tabit / Pi3 Orionis
        ],
      },
    ],
    storyEvents: [
      {
        id: 'bob2-ev-1',
        title: {
          en: 'Exodus-1 & 2 Launch from Dying Earth (Sol)',
          cs: 'Start prvních kolonizačních lodí Exodus-1 a 2 ze Země (Sol)',
        },
        systemId: 'sol',
        year: 2171.3,
      },
      {
        id: 'bob2-ev-2',
        title: {
          en: 'Howard, Bert & Ernie Found Vulcan Colony (40 Eridani)',
          cs: 'Howard, Bert a Ernie zakládají kolonii na Vulkánu (40 Eridani)',
        },
        systemId: 'hip-19849',
        year: 2188.8,
      },
      {
        id: 'bob2-ev-3',
        title: {
          en: 'Rudy & Edwin Deliver Exodus-6 to KKP (Epsilon Indi)',
          cs: 'Rudy a Edwin přivážejí Exodus-6 na KKP (Epsilon Indi)',
        },
        systemId: 'hip-108870',
        year: 2190.1,
      },
      {
        id: 'bob2-ev-4',
        title: {
          en: 'Marcus Arrives at Poseidon Ocean Colony (Eta Cassiopeiae)',
          cs: 'Marcus přilétá k oceánské kolonii Poseidon (Eta Cassiopeiae)',
        },
        systemId: 'hip-3821',
        year: 2195.2,
      },
      {
        id: 'bob2-ev-5',
        title: {
          en: 'Loki’s Task Force Clears Medeiros (82 Eridani)',
          cs: 'Lokiho svaz poráží Medeirose v soustavě 82 Eridani',
        },
        systemId: 'hip-15510',
        year: 2195.9,
      },
      {
        id: 'bob2-ev-6',
        title: {
          en: 'Howard Discovers Gas-Giant Life on Odin (HIP 14101)',
          cs: 'Howard objevuje život v atmosféře plynného obra Odin (HIP 14101)',
        },
        systemId: 'hip-14101',
        year: 2219.5,
      },
      {
        id: 'bob2-ev-7',
        title: {
          en: 'Mack Settles Asgard & Takamagahara (82 Eridani)',
          cs: 'Mack osidluje světy Asgard a Takamagahara (82 Eridani)',
        },
        systemId: 'hip-15510',
        year: 2220.8,
      },
    ],
  },

  {
    id: 'bobiverse-others-war',
    category: 'bobiverse',
    universe: 'Bobiverse',
    universeCs: 'Bobiverzum',
    author: 'Dennis E. Taylor',
    year: 2017,
    books: {
      en: 'Books 2–3: For We Are Many · All These Worlds',
      cs: 'Knihy 2–3: Protože nás je mnoho · Všechny tyto světy',
    },
    sourceUrl: 'https://bobiverse.fandom.com/wiki/Timeline',
    sourceLabel: {
      en: 'Bobiverse Wiki — The Others War & Battle of Sol (2180–2288)',
      cs: 'Bobiverse Wiki — Válka s Jinými a bitva o Slunce (2180–2288)',
    },
    title: {
      en: 'Bobiverse III — The Others War, Bellerophon & GL 877 Nova (2180–2288)',
      cs: 'Bobiverzum III — Válka s Jinými, Bellerofontés a nova GL 877 (2180–2288)',
    },
    subtitle: {
      en: 'Bashful & Hal uncover The Others’ Dyson Sphere at Gliese 877; Claude & Jacques discover Newholme and the Pavs before the First Battle of Delta Pavonis (2217); Herschel & Neil pilot the captured alien cargo giant Bellerophon to evacuate Earth during the Battle of Sol (Apr 2257) — synchronized to the exact month with Icarus & Daedalus’s relativistic planet-killing flyby strike on GL 877!',
      cs: 'Bashful a Hal odhalují Dysonovu sféru Jiných u Gliese 877; Claude a Jacques objevují Newholme a Pavy před bitvou u Delta Pavonis (2217); Herschel a Neil přivádějí ukořistěnou obří loď Bellerofontés k evakuaci Země během bitvy o Slunce (duben 2257) — přesně na měsíc synchronizovaně s relativistickým průletovým úderem Ikara a Daidala na GL 877!',
    },
    physicsNote: {
      en: 'Watch April 2257 on the timeline: Herschel & Neil’s heavy captured cargo ship Bellerophon (0.30g / 0.76c, 19.92 ly from Delta Pavonis) reaches Sol at the EXACT same moment Icarus & Daedalus (modeled in relativistic flyby mode at 0.16g / 0.91c towing two worlds across 27.46 ly from Epsilon Eridani) slam into Gliese 877 and coast onward toward Sagittarius A*!',
      cs: 'Sledujte duben 2257 na časové ose: těžká ukořistěná loď Bellerofontés (0,30g / 0,76c, 19,92 ly od Delta Pavonis) doráží ke Slunci ve STEJNÝ okamžik, kdy Ikaros a Daidalos (v režimu relativistického průletu 0,16g / 0,91c táhnoucí dva světy 27,46 ly z Epsilon Eridani) udeří do Gliese 877 a pokračují setrvačností směrem k Sagittarius A*!',
    },
    recommendedClockStart: 2180.5,
    focusSystemId: 'hip-113229',
    ships: [
      {
        id: 'bob3-bashful',
        name: 'Bashful · First Contact at GL 877 (3g)',
        nameCs: 'Bashful · První kontakt u GL 877 (3g)',
        color: '#fb7185',
        departureYear: 2180.8,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flip',
          accelG: 3.0,
          cruiseC: 0.995,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-5496', stayYears: 0 },     // Gliese 54
          { systemId: 'hip-113229', stayYears: 0 },   // Gliese 877 (Nov 2187: self-destructs with warning)
        ],
      },
      {
        id: 'bob3-hal',
        name: 'Hal · GL 877 Dyson Sphere Recon (3g)',
        nameCs: 'Hal · Průzkum Dysonovy sféry GL 877 (3g)',
        color: '#f59e0b',
        departureYear: 2181.4,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flip',
          accelG: 3.0,
          cruiseC: 0.995,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-5496', stayYears: 0 },
          { systemId: 'hip-113229', stayYears: 7.9 }, // Gliese 877 (May 2188 -> Apr 2196 return recon)
          { systemId: 'hip-5496', stayYears: 0 },     // Flees back toward Gliese 54
        ],
      },
      {
        id: 'bob3-claude',
        name: 'Claude · Newholme → Delta Pavonis (3g)',
        nameCs: 'Claude · Newholme → Delta Pavonis (3g)',
        color: '#a3e635',
        departureYear: 2193.5,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flip',
          accelG: 3.0,
          cruiseC: 0.995,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-5496', stayYears: 0 },
          { systemId: 'hip-105858', stayYears: 0.3 }, // Gamma Pavonis (May 2205: discovers Newholme)
          { systemId: 'hip-99240', stayYears: 0 },    // Delta Pavonis (Feb 2217 Battle reinforcement)
        ],
      },
      {
        id: 'bob3-jacques',
        name: 'Jacques · Pav First Contact (3g)',
        nameCs: 'Jacques · Objev Pavů u Delta Pavonis (3g)',
        color: '#c084fc',
        departureYear: 2193.5,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flip',
          accelG: 3.0,
          cruiseC: 0.995,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-5496', stayYears: 0 },
          { systemId: 'hip-99240', stayYears: 0 },    // Delta Pavonis (Feb 2207: discovers Pavs)
        ],
      },
      {
        id: 'bob3-delpav-fleet',
        name: 'Bill’s Delta Pavonis Strike Fleet (3g)',
        nameCs: 'Billův úderný svaz k Delta Pavonis (3g)',
        color: '#38bdf8',
        departureYear: 2207.3,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flip',
          accelG: 3.0,
          cruiseC: 0.995,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-108870', stayYears: 0 },   // Epsilon Indi staging
          { systemId: 'hip-99240', stayYears: 0 },    // Delta Pavonis (Feb 2217: 1st Battle vs. Others)
        ],
      },
      {
        id: 'bob3-bellerophon',
        name: 'Herschel & Neil · Bellerophon (0.3g / 0.76c)',
        nameCs: 'Herschel a Neil · Bellerofontés (0,3g / 0,76c)',
        color: '#00ff88',
        departureYear: 2228.1,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'accel-cruise',
          accelG: 0.3,
          cruiseC: 0.76,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-99240', stayYears: 0 },    // Delta Pavonis (captured Others cargo vessel)
          { systemId: 'sol', stayYears: 1.7 },        // Sol (Apr 2257 Battle of Sol atmospheric rescue -> Jan 2259)
          { systemId: 'hip-15510', stayYears: 0 },    // 82 G. Eridani (final human evacuation convoy)
        ],
      },
      {
        id: 'bob3-icarus-daedalus',
        name: 'Icarus & Daedalus · Planet-Movers (0.91c Flyby)',
        nameCs: 'Ikaros a Daidalos · Vrhači planet (průlet 0,91c)',
        color: '#00f0ff',
        departureYear: 2223.2,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flyby',
          accelG: 0.16,
          cruiseC: 0.91,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-16537', stayYears: 0 },    // Epsilon Eridani (Jan 2223 secret launch with two worlds)
          { systemId: 'hip-113229', stayYears: 0 },   // Gliese 877 (Apr 2257 relativistic star-kill flyby -> Sgr A*)
        ],
      },
    ],
    storyEvents: [
      {
        id: 'bob3-ev-1',
        title: {
          en: 'Bashful & Hal Uncover Others Dyson Sphere (Gliese 877)',
          cs: 'Bashful a Hal odhalují Dysonovu sféru Jiných (Gliese 877)',
        },
        systemId: 'hip-113229',
        year: 2188.4,
      },
      {
        id: 'bob3-ev-2',
        title: {
          en: 'Jacques Discovers Pav Civilization (Delta Pavonis)',
          cs: 'Jacques objevuje civilizaci Pavů (Delta Pavonis)',
        },
        systemId: 'hip-99240',
        year: 2207.2,
      },
      {
        id: 'bob3-ev-3',
        title: {
          en: 'First Battle of Delta Pavonis & Rescue of 20,000 Pavs',
          cs: 'Bitva u Delta Pavonis a záchrana 20 000 Pavů',
        },
        systemId: 'hip-99240',
        year: 2217.2,
      },
      {
        id: 'bob3-ev-4',
        title: {
          en: 'Icarus & Daedalus Launch Planet-Movers (Epsilon Eridani)',
          cs: 'Tajný start Ikara a Daidala s planetami (Epsilon Eridani)',
        },
        systemId: 'hip-16537',
        year: 2223.2,
      },
      {
        id: 'bob3-ev-5',
        title: {
          en: 'Battle of Sol & Bellerophon Atmospheric Rescue (Sol)',
          cs: 'Bitva o Slunce a atmosférická evakuace Bellerofontem (Sol)',
        },
        systemId: 'sol',
        year: 2257.3,
      },
      {
        id: 'bob3-ev-6',
        title: {
          en: 'Icarus & Daedalus Trigger GL 877 Nova — Others Defeated!',
          cs: 'Ikaros a Daidalos vyvolávají novu GL 877 — Jiní poraženi!',
        },
        systemId: 'hip-113229',
        year: 2257.3,
      },
    ],
  },

  {
    id: 'bobiverse-heavens-river',
    category: 'bobiverse',
    universe: 'Bobiverse',
    universeCs: 'Bobiverzum',
    author: 'Dennis E. Taylor',
    year: 2020,
    books: {
      en: 'Books 3–4: All These Worlds · Heaven’s River',
      cs: 'Knihy 3–4: Všechny tyto světy · Nebeská řeka',
    },
    sourceUrl: 'https://bobiverse.fandom.com/wiki/Timeline',
    sourceLabel: {
      en: 'Bobiverse Wiki — Earth Pilgrimage & Heaven’s River Rescue (2165–2373)',
      cs: 'Bobiverse Wiki — Pouť na Zemi a záchranná výprava Nebeská řeka (2165–2373)',
    },
    title: {
      en: 'Bobiverse IV — Search for Bender & Heaven’s River (2165–2373)',
      cs: 'Bobiverzum IV — Hledání Bendera a Nebeská řeka (2165–2373)',
    },
    subtitle: {
      en: 'Follow Bender’s century-old disappearance from Delta Eridani → Gamma Leporis → Eta Leporis, Bob-1’s poignant 2233→2263 Earth Pilgrimage after Archimedes’ funeral, Bob-1’s upgraded HEAVEN-5 rescue mission to the Quinlan topopolis megastructure Heaven’s River (2296→2334), and Howard & Bridget’s voyage from Odin to Big Top & Poseidon.',
      cs: 'Sledujte sto let staré zmizení Bendera po trase Delta Eridani → Gamma Leporis → Eta Leporis, Bobovu pouť na Zemi (2233→2263) po Archimédově pohřbu, vylepšenou výpravu HEAVEN-5 k megastruktuře Nebeská řeka (topopolis Quinlanů, 2296→2334) a cestu Howarda s Bridget z Odinu přes Big Top na Poseidon.',
    },
    physicsNote: {
      en: 'Real 3D Hipparcos distances highlight two awesome astrometric facts: Bob-1’s 2233.4 Earth Pilgrimage (Delta Eridani → Sol, 29.49 ly at 3g flip) reaches Sol in 2263.5 — matching canon Oct 2263! And Delta Eridani → Gamma Leporis → Eta Leporis spans 15.99 + 20.24 = 36.23 ly, so even Bob-1’s 6g HEAVEN-5 arrives in 2333.1 (only ~1.5 yr after canon Sep 2331, demonstrating true light-speed bounds).',
      cs: 'Reálné 3D vzdálenosti Hipparcos ukazují dva skvostné detaily: Bobova pouť k Zemi z května 2233 (Delta Eridani → Sol, 29,49 ly při 3g) doráží r. 2263,5 — přesně dle kanonického října 2263! Trasa Delta Eridani → Gamma Leporis → Eta Leporis měří 15,99 + 20,24 = 36,23 ly, takže i 6g loď HEAVEN-5 doráží v r. 2333,1 (~1,5 r. za knižním zářím 2331, přesně na limitu rychlosti světla).',
    },
    recommendedClockStart: 2233.0,
    focusSystemId: 'hip-28103',
    ships: [
      {
        id: 'bob4-bender',
        name: 'Bender · Missing Explorer Trail (3g)',
        nameCs: 'Bender · Stopa ztraceného průzkumníka (3g)',
        color: '#f59e0b',
        departureYear: 2165.8,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flip',
          accelG: 3.0,
          cruiseC: 0.995,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-17378', stayYears: 0 },   // Delta Eridani (Oct 2165 departure)
          { systemId: 'hip-27072', stayYears: 0.4 }, // Gamma Leporis A (leaves trail)
          { systemId: 'hip-28103', stayYears: 0 },   // Eta Leporis (captured inside Heaven's River)
        ],
      },
      {
        id: 'bob4-bob1-pilgrimage',
        name: 'Bob-1 · Earth Pilgrimage (3g SURGE)',
        nameCs: 'Bob-1 · Pouť na Zemi po Archimédovi (3g)',
        color: '#38bdf8',
        departureYear: 2233.4,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flip',
          accelG: 3.0,
          cruiseC: 0.995,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-17378', stayYears: 0 },   // Delta Eridani (May 2233 after Archimedes' funeral)
          { systemId: 'sol', stayYears: 1.0 },       // Sol (Oct 2263 pilgrimage to ruined Earth)
          { systemId: 'hip-17378', stayYears: 0 },   // Returns to Delta Eridani (~2294.7)
        ],
      },
      {
        id: 'bob4-bob1-heaven5',
        name: 'Bob-1 · HEAVEN-5 Rescue Expedition (6g)',
        nameCs: 'Bob-1 · Záchranná výprava HEAVEN-5 (6g)',
        color: '#00f0ff',
        departureYear: 2296.0,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flip',
          accelG: 6.0,
          cruiseC: 0.998,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-17378', stayYears: 0 },   // Delta Eridani (Jan 2296 launch)
          { systemId: 'hip-27072', stayYears: 0.2 }, // Gamma Leporis (detects megastructure clue)
          { systemId: 'hip-28103', stayYears: 2.5 }, // Eta Leporis (Heaven's River infiltration & Bender rescue)
          { systemId: 'hip-15510', stayYears: 0 },   // 82 G. Eridani (return voyage with Bender)
        ],
      },
      {
        id: 'bob4-howard-bridget',
        name: 'Howard & Bridget · Odin → Big Top → Poseidon (3g)',
        nameCs: 'Howard a Bridget · Odin → Big Top → Poseidon (3g)',
        color: '#c084fc',
        departureYear: 2227.0,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flip',
          accelG: 3.0,
          cruiseC: 0.995,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-14101', stayYears: 0 },    // HIP 14101 (after Rivendell floating city)
          { systemId: 'hip-108870', stayYears: 50.0 }, // Epsilon Indi (Tantor on Big Top)
          { systemId: 'hip-3821', stayYears: 0 },     // Eta Cassiopeiae (Poseidon aquatic android training)
        ],
      },
    ],
    storyEvents: [
      {
        id: 'bob4-ev-1',
        title: {
          en: 'Bender Departs Eden for Gamma Leporis (Delta Eridani)',
          cs: 'Bender odlétá z Edenu směrem ke Gamma Leporis (Delta Eridani)',
        },
        systemId: 'hip-17378',
        year: 2165.8,
      },
      {
        id: 'bob4-ev-2',
        title: {
          en: 'Archimedes’ Funeral — Bob-1 Departs for Earth (Delta Eridani)',
          cs: 'Archimédův pohřeb — Bob-1 odlétá na pouť k Zemi (Delta Eridani)',
        },
        systemId: 'hip-17378',
        year: 2233.4,
      },
      {
        id: 'bob4-ev-3',
        title: {
          en: 'Bob-1 Completes Earth Pilgrimage (Sol)',
          cs: 'Bob-1 doráží na pouť k Zemi (Sol)',
        },
        systemId: 'sol',
        year: 2263.8,
      },
      {
        id: 'bob4-ev-4',
        title: {
          en: 'Bob-1 Launches HEAVEN-5 Search for Bender (Delta Eridani)',
          cs: 'Bob-1 startuje s HEAVEN-5 hledat Bendera (Delta Eridani)',
        },
        systemId: 'hip-17378',
        year: 2296.0,
      },
      {
        id: 'bob4-ev-5',
        title: {
          en: 'Discovery of Heaven’s River Topopolis & Quin (Eta Leporis)',
          cs: 'Objev megastruktury Nebeská řeka (topopolis) a Quinu (Eta Leporis)',
        },
        systemId: 'hip-28103',
        year: 2333.1,
      },
      {
        id: 'bob4-ev-6',
        title: {
          en: 'Bob, Bridget & Hugh Rescue Bender & Negotiate with ANEC (Eta Leporis)',
          cs: 'Bob, Bridget a Hugh zachraňují Bendera a vyjednávají s AI ANEC (Eta Leporis)',
        },
        systemId: 'hip-28103',
        year: 2334.7,
      },
    ],
  },

  // =========================================================================
  // XEELEE SEQUENCE (STEPHEN BAXTER) — TIMELIKE INFINITY, MAYFLOWER II, RAFT & RING
  // =========================================================================
  {
    id: 'xeelee-timelike-infinity',
    category: 'xeelee',
    universe: 'Xeelee Sequence',
    universeCs: 'Série Xeelee',
    author: 'Stephen Baxter',
    year: 1992,
    books: {
      en: 'Timelike Infinity · Ring · Starfall · Vacuum Diagrams (Lieserl, Blue Shift)',
      cs: 'Timelike Infinity · Ring (Prstenec) · Starfall · Vakuové diagramy',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Timelike_Infinity',
    sourceLabel: {
      en: 'Wikipedia & Xeelee Sequence Official Chronology (AD 3717–5774)',
      cs: 'Wikipedie a oficiální chronologie série Xeelee (3717–5774 n. l.)',
    },
    title: {
      en: 'Xeelee I — Timelike Infinity: GUTship Cauchy, Starfall & Qax Interface (3717–5771)',
      cs: 'Xeelee I — Timelike Infinity: GUTloď Cauchy, Starfall a rozhraní Qaxů (3717–5771)',
    },
    subtitle: {
      en: 'Michael Poole’s Interface Project launches GUTship Cauchy (Miriam Berg) in AD 3717 towing a wormhole mouth on a 1,557-year relativistic loop returning in AD 5274 with only ~112 yr elapsed on board — opening a time-travel bridge back to AD 3829! Also tracks Great Northern’s AD 3953 Ring departure, Flood’s Alpha Centauri rebellion (Starfall, AD 4820), and Ambassador Jasoft Parz’s 500-year Qax Second Interface loop.',
      cs: 'Projekt Rozhraní Michaela Poola vypouští r. 3717 GUTloď Cauchy (Miriam Bergová) s jedním ústím červí díry na 1 557letou relativistickou smyčku s návratem r. 5274 při pouhých ~112 letech palubního času — čímž otevírá časový most zpět do r. 3829! Zachycuje i start Great Northern (Ring, r. 3953), povstání Flooda z Alfy Centauri (Starfall, 4820) a 500letou druhou smyčku Qaxů.',
    },
    physicsNote: {
      en: 'Exact wormhole-clock relativity: Cauchy’s deep-space ~1,541 ly circuit (mapped across real boundary stars from Sagittarius Core marker Alnasl) runs at 1g / 0.99905c from AD 3717.0 → 5274.1 (Δt = 1,557.1 yr, Δτ = 112.0 yr), anchoring the wormhole mouth to AD 3717 + 112 = AD 3829 — the EXACT canon year of the Qax time-travel invasion! Great Northern departs in flyby mode toward HD 142415 (2.2° from the real Great Attractor) on its 5-million-year / 1,000-yr-proper-time Ring odyssey.',
      cs: 'Přesná relativita hodin červí díry: smyčka Cauchy (~1 541 ly po reálných okrajových hvězdách od Alnaslu ve směru jádra Galaxie) při 1g / 0,99905c letí 3717,0 → 5274,1 (Δt = 1 557,1 r., Δτ = 112,0 r.), takže ústí červí díry ukazuje přesně do r. 3717 + 112 = 3829 — kanonického roku invaze Qaxů! Great Northern odlétá v průletovém režimu směrem k HD 142415 (2,2° od Velkého atraktoru) na svou 5milionletou cestu (1 000 r. na palubě).',
    },
    recommendedClockStart: 3717.0,
    focusSystemId: 'sol',
    ships: [
      {
        id: 'xel-cauchy',
        name: 'GUTship Cauchy · Miriam Berg (Interface B, 1g / 0.999c)',
        nameCs: 'GUTloď Cauchy · Miriam Bergová (Rozhraní B, 1g / 0,999c)',
        color: '#00f0ff',
        departureYear: 3717.0,
        crewStartAge: 28.0,
        driveConfig: {
          mode: 'accel-cruise',
          accelG: 1.0,
          cruiseC: 0.99905,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-88635', stayYears: 0 },       // Alnasl (4.6° from Sgr A* Galactic Core)
          { systemId: 'nea-hd-28185', stayYears: 0 },    // Outer boundary chord 1
          { systemId: 'nea-hd-141399', stayYears: 0 },   // Outer boundary chord 2
          { systemId: 'nea-hd-213240', stayYears: 0 },   // Outer boundary chord 3
          { systemId: 'nea-bd-08-2823', stayYears: 0 },  // Outer boundary chord 4
          { systemId: 'nea-hd-8673', stayYears: 0 },     // Outer boundary chord 5
          { systemId: 'nea-hd-110067', stayYears: 0 },   // Outer boundary chord 6
          { systemId: 'sol', stayYears: 0 },             // Returns Sol AD 5274.1 (Δτ = 112.0 yr -> AD 3829!)
        ],
      },
      {
        id: 'xel-great-northern',
        name: 'GUTship Great Northern · Ring Launch (1g / 0.9999c Flyby)',
        nameCs: 'GUTloď Great Northern · Start Ring (1g / 0,9999c průlet)',
        color: '#c084fc',
        departureYear: 3953.0,
        crewStartAge: 25.0,
        driveConfig: {
          mode: 'flyby',
          accelG: 1.0,
          cruiseC: 0.9999,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'nea-hd-142415', stayYears: 0 },   // Norma (2.2° from Great Attractor / Bolder's Ring)
        ],
      },
      {
        id: 'xel-starfall-flood',
        name: 'Flood’s Rebel Fleet · Starfall (1g GUTdrive)',
        nameCs: 'Floodova povstalecká flotila · Starfall (1g GUTpohon)',
        color: '#fb7185',
        departureYear: 4820.0,
        crewStartAge: 34.0,
        driveConfig: {
          mode: 'flip',
          accelG: 1.0,
          cruiseC: 0.99,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-71683', stayYears: 0 },       // Alpha Centauri rebel stronghold
          { systemId: 'sol', stayYears: 0 },             // Assault on Empress Shira's Solar Empire
        ],
      },
      {
        id: 'xel-qax-interface2',
        name: 'Qax 2nd Interface · Jasoft Parz (500y Loop, 6g)',
        nameCs: 'Druhé rozhraní Qaxů · Jasoft Parz (500letá smyčka, 6g)',
        color: '#f59e0b',
        departureYear: 5274.0,
        crewStartAge: 45.0,
        driveConfig: {
          mode: 'flip',
          accelG: 6.0,
          cruiseC: 0.9999,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'nea-hd-213240', stayYears: 0 },
          { systemId: 'nea-k2-18', stayYears: 0 },
          { systemId: 'sol', stayYears: 0 },             // ~497 yr future wormhole link (AD 5274 -> 5771)
        ],
      },
    ],
    storyEvents: [
      {
        id: 'xel1-ev-1',
        title: {
          en: 'Launch of GUTship Cauchy & Michael Poole’s Interface Project (Sol)',
          cs: 'Start GUTlodi Cauchy a projektu Rozhraní Michaela Poola (Sol)',
        },
        systemId: 'sol',
        year: 3717.0,
      },
      {
        id: 'xel1-ev-2',
        title: {
          en: 'Qax Wormhole Time-Invasion & Poole’s Hermit Crab Ramming (Sol)',
          cs: 'Časová invaze Qaxů červí dírou a Poolův náraz lodí Hermit Crab (Sol)',
        },
        systemId: 'sol',
        year: 3829.0,
      },
      {
        id: 'xel1-ev-3',
        title: {
          en: 'AI Lieserl Enters the Sun — Discovery of Photino Birds (Sol)',
          cs: 'AI Lieserl vstupuje do Slunce — objev fotinových ptáků (Sol)',
        },
        systemId: 'sol',
        year: 3951.0,
      },
      {
        id: 'xel1-ev-4',
        title: {
          en: 'Launch of Generation GUTship Great Northern on 5-Myr Loop (Sol)',
          cs: 'Start generační GUTlodi Great Northern na 5milionletou smyčku (Sol)',
        },
        systemId: 'sol',
        year: 3953.0,
      },
      {
        id: 'xel1-ev-5',
        title: {
          en: 'Starfall — Flood’s Alpha Centauri Fleet Collapses Solar Empire',
          cs: 'Starfall — Floodova flotila z Alfy Centauri svrhává Sluneční říši',
        },
        systemId: 'hip-71683',
        year: 4820.0,
      },
      {
        id: 'xel1-ev-6',
        title: {
          en: 'Squeem Conquest (4874) & Qax Occupation of Humanity (5088, Sol)',
          cs: 'Dobytí Squeemy (4874) a okupace lidstva Qaxy (5088, Sol)',
        },
        systemId: 'sol',
        year: 5088.0,
      },
      {
        id: 'xel1-ev-7',
        title: {
          en: 'Return of Cauchy — 1,445-Year Temporal Wormhole Opens to AD 3829 (Sol)',
          cs: 'Návrat Cauchy — otevírá se 1 445letý časový most do r. 3829 (Sol)',
        },
        systemId: 'sol',
        year: 5274.1,
      },
      {
        id: 'xel1-ev-8',
        title: {
          en: 'Blue Shift — Jim Bolder Triggers Qax Nova; End of Qax Occupation (Sol)',
          cs: 'Blue Shift — Jim Bolder vyvolává novu Qaxů; konec okupace (Sol)',
        },
        systemId: 'sol',
        year: 5407.0,
      },
    ],
  },

  {
    id: 'xeelee-mayflower-redemption',
    category: 'xeelee',
    universe: 'Xeelee Sequence',
    universeCs: 'Série Xeelee',
    author: 'Stephen Baxter',
    year: 2004,
    books: {
      en: 'Mayflower II · Reality Dust · Silver Ghost · On the Orion Line · Xeelee: Redemption',
      cs: 'Mayflower II · Reality Dust · Silver Ghost · Na linii Orionu · Xeelee: Redemption',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Xeelee_Sequence',
    sourceLabel: {
      en: 'Wikipedia — Xeelee Sequence (Resplendent & Redemption Timeline)',
      cs: 'Wikipedie — Série Xeelee (časová osa Resplendent a Redemption)',
    },
    title: {
      en: 'Xeelee II — Mayflower II Halo Escape, Redemption & Orion Line (4106–6454)',
      cs: 'Xeelee II — Únik Mayflower II do hala, Redemption a linie Orionu (4106–6454)',
    },
    subtitle: {
      en: 'Compare four iconic sublight trajectories across Stephen Baxter’s Resurgence & alternate Redemption timelines: Michael Poole’s AD 4106 near-c expedition straight toward the Galactic Core (Chandra / Sagittarius A*), the post-Qax Third Expansion (Reality Dust, AD 5408), generation ship Mayflower II fleeing Port Sol perpendicular out of the Milky Way disk (AD 5420 → 24,974), and the Coalition’s advance toward the Silver Ghosts & Orion Line.',
      cs: 'Srovnejte čtyři ikonické podsvětelné trasy období Obrody a alternativní linie Redemption: Poolovu téměř světelnou výpravu z r. 4106 přímo k jádru Galaxie (Chandra / Sagittarius A*), třetí expanzi po pádu Qaxů (Reality Dust, 5408), generační loď Mayflower II prchající kolmo z disku Mléčné dráhy (5420 → 24 974) a průzkum Koalice směrem ke Stříbrným duchům a linii Orionu.',
    },
    physicsNote: {
      en: 'True 3D Galactic geometry: Poole’s Redemption fleet exits along Alnasl → HD 169830 (4.6° from Sagittarius A*, 26,000 ly away — only ~20 yr ship time at 1g!), whereas Mayflower II escapes perpendicular to the Galactic plane (+Z North Galactic Pole via HD 110067, 7.6° off-axis) at 0.12c — taking 875 yr just to cross our 105 ly sphere before its 19,554-year halo diaspora ends with Coalition retrieval in AD 24,974 (right after Exultant’s Core conquest in AD 24,973).',
      cs: 'Reálná 3D galaktická geometrie: Poolova flotila Redemption míří přes Alnasl → HD 169830 (4,6° od Sagittarius A* ve vzdálenosti 26 000 ly — při 1g jen ~20 r. vlastního času!), zatímco Mayflower II uniká kolmo nad galaktickou rovinu (+Z severní galaktický pól přes HD 110067) rychlostí 0,12c — 875 let jen k opuštění naší 105 ly sféry před 19 554letou diasporou do roku 24 974 (těsně po dobytí jádra v Exultant r. 24 973).',
    },
    recommendedClockStart: 4106.0,
    focusSystemId: 'nea-hd-110067',
    ships: [
      {
        id: 'xel-redemption-poole',
        name: 'Michael Poole · Redemption Core Fleet (1g / 0.9999c Flyby)',
        nameCs: 'Michael Poole · Výprava k jádru Redemption (1g / 0,9999c průlet)',
        color: '#00f0ff',
        departureYear: 4106.0,
        crewStartAge: 35.0,
        driveConfig: {
          mode: 'flyby',
          accelG: 1.0,
          cruiseC: 0.9999,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-88635', stayYears: 0 },       // Alnasl (4.6° from Sagittarius A* / Chandra)
          { systemId: 'nea-hd-169830', stayYears: 0 },   // Sagittarius Core vector (122.7 ly)
        ],
      },
      {
        id: 'xel-reality-dust',
        name: 'Coalition Resurgence · Reality Dust Scout (3g)',
        nameCs: 'Obroda Koalice · Průzkum Reality Dust (3g)',
        color: '#38bdf8',
        departureYear: 5408.0,
        crewStartAge: 29.0,
        driveConfig: {
          mode: 'flip',
          accelG: 3.0,
          cruiseC: 0.995,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-71683', stayYears: 0.5 },     // Alpha Centauri
          { systemId: 'hip-32349', stayYears: 0.5 },     // Sirius
          { systemId: 'hip-37279', stayYears: 0.5 },     // Procyon
          { systemId: 'sol', stayYears: 0 },
        ],
      },
      {
        id: 'xel-mayflower-ii',
        name: 'Mayflower II · Rusel’s Generation Ship (0.12c Halo Flyby)',
        nameCs: 'Mayflower II · Ruselova generační loď (0,12c únik do hala)',
        color: '#00ff88',
        departureYear: 5420.0,
        crewStartAge: 32.0,
        driveConfig: {
          mode: 'flyby',
          accelG: 0.05,
          cruiseC: 0.12,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'nea-hd-110067', stayYears: 0 },   // Coma Berenices (7.6° from North Galactic Pole +Z)
        ],
      },
      {
        id: 'xel-orion-line',
        name: 'Silver Ghost & Orion Line Survey (1.5g GUTdrive)',
        nameCs: 'Průzkum Stříbrných duchů a linie Orionu (1,5g GUT)',
        color: '#f59e0b',
        departureYear: 5499.0,
        crewStartAge: 30.0,
        driveConfig: {
          mode: 'flip',
          accelG: 1.5,
          cruiseC: 0.99,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-71683', stayYears: 0.5 },     // Alpha Centauri
          { systemId: 'hip-8102', stayYears: 0.5 },      // Tau Ceti
          { systemId: 'hip-16537', stayYears: 0.5 },     // Epsilon Eridani
          { systemId: 'hip-22449', stayYears: 0 },       // Tabit / Pi3 Orionis (Orion Arm axis)
        ],
      },
    ],
    storyEvents: [
      {
        id: 'xel2-ev-1',
        title: {
          en: 'Xeelee: Redemption — Michael Poole Launches Toward Galactic Core (Sol)',
          cs: 'Xeelee: Redemption — Michael Poole startuje k jádru Galaxie (Sol)',
        },
        systemId: 'sol',
        year: 4106.0,
      },
      {
        id: 'xel2-ev-2',
        title: {
          en: 'Reality Dust — Third Expansion Begins Under Coalition Government (Sol)',
          cs: 'Reality Dust — začíná Třetí expanze pod vládou Koalice (Sol)',
        },
        systemId: 'sol',
        year: 5408.0,
      },
      {
        id: 'xel2-ev-3',
        title: {
          en: 'Launch of Generation Starship Mayflower II from Port Sol (+Z Halo)',
          cs: 'Start generačního hvězdoletu Mayflower II z Port Sol (+Z halo)',
        },
        systemId: 'sol',
        year: 5420.0,
      },
      {
        id: 'xel2-ev-4',
        title: {
          en: 'First Contact with the Silver Ghosts (Orion Arm / Tabit)',
          cs: 'První kontakt se Stříbrnými duchy (rameno Orionu / Tabit)',
        },
        systemId: 'hip-22449',
        year: 5499.0,
      },
      {
        id: 'xel2-ev-5',
        title: {
          en: 'On the Orion Line — Height of the Ghost Wars (Orion Arm)',
          cs: 'Na linii Orionu — vrchol válek se Stříbrnými duchy (rameno Orionu)',
        },
        systemId: 'hip-22449',
        year: 6454.0,
      },
    ],
  },

  {
    id: 'xeelee-raft-flux-ring',
    category: 'xeelee',
    universe: 'Xeelee Sequence',
    universeCs: 'Série Xeelee',
    author: 'Stephen Baxter',
    year: 1991,
    books: {
      en: 'Raft (1991) · Stowaway · Flux (1993) · Ring (1994) · Gravity Dreams',
      cs: 'Vor (Raft, 1991) · Stowaway · Flux (1993) · Ring (1994) · Gravity Dreams',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Raft_(novel)',
    sourceLabel: {
      en: 'Wikipedia — Raft, Flux & Ring (War to End Wars Chronology)',
      cs: 'Wikipedie — Vor (Raft), Flux a Ring (chronologie Války k ukončení válek)',
    },
    title: {
      en: 'Xeelee III — Raft, Flux & Bolder’s Ring: Constancy of Purpose (AD 104,350+)',
      cs: 'Xeelee III — Vor (Raft), Flux a Bolderův prstenec: Constancy of Purpose (104 350+)',
    },
    subtitle: {
      en: 'During humanity’s War to End Wars (c. AD 100,000+), the massive GUT-warship Constancy of Purpose chases a Xeelee nightfighter outward along the Great Attractor vector toward Bolder’s Ring — blundering through a spacetime portal into Universe Beta (gravity 10⁹× stronger!), where its wreckage becomes the Raft (AD 104,858, ~500 yr later). Contrasted with a slow heavy relativistic payload analog representing the Flux rogue neutron-star missile.',
      cs: 'Během Války k ukončení válek (kolem r. 100 000+) pronásleduje obří lidská válečná loď Constancy of Purpose xeeleeské noční stíhače směrem k Velkému atraktoru a Bolderovu prstenci — a omylem vletí portálem do Vesmíru Beta (gravitace 10⁹× silnější!), kde se z jejího vraku stane Vor (Raft, r. 104 858, o ~500 let později). Doplněno těžkou relativistickou dráhou analogickou neutronové střele z románu Flux.',
    },
    physicsNote: {
      en: 'Universe Beta (Raft) lies outside our Milky Way’s physics (G = 10⁹ G₀; stars 1.6 km wide!), so this simulation tracks Constancy of Purpose’s canonical origin flight in our universe: straight along Sol → Alpha Centauri → HD 142415 (only 2.2° from the real Norma Cluster / Great Attractor where Bolder’s Ring sits!). Timeline milestones span from Raft (AD 104,858) toward Exaltation of the Integrality (AD 168,349), Flux (AD 193,700), Gravity Dreams reconnection (AD 978,225), and Great Northern’s Ring escape (AD 5,000,000).',
      cs: 'Vesmír Beta (Vor/Raft) leží mimo fyziku naší Galaxie (G = 10⁹ G₀; hvězdy o průměru 1,6 km!), proto modelujeme kanonický startovní let lodi Constancy of Purpose v našem vesmíru: po ose Sol → Alfa Centauri → HD 142415 (pouhých 2,2° od reálné kupy Norma / Velkého atraktoru, kde leží Bolderův prstenec!). Časová linie navazuje od Voru (104 858) ke střele Flux (193 700), znovunavázání kontaktu v Gravity Dreams (978 225) a úniku Great Northern v Ringu (5 000 000).',
    },
    recommendedClockStart: 104350.0,
    focusSystemId: 'nea-hd-142415',
    ships: [
      {
        id: 'xel-nightfighter-quarry',
        name: 'Xeelee Nightfighter · Ring Escape Vector (6g / 0.9999c Flyby)',
        nameCs: 'Xeeleeský noční stíhač · Vektor k Prstenci (6g / 0,9999c průlet)',
        color: '#c084fc',
        departureYear: 104350.0,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flyby',
          accelG: 6.0,
          cruiseC: 0.9999,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'nea-hd-142415', stayYears: 0 },   // Norma / Great Attractor axis (2.2° alignment)
        ],
      },
      {
        id: 'xel-constancy-raft',
        name: 'Constancy of Purpose · Raft Warship (2g / 0.999c Flyby)',
        nameCs: 'Constancy of Purpose · Válečná loď z Voru (2g / 0,999c průlet)',
        color: '#00f0ff',
        departureYear: 104352.0,
        crewStartAge: 30.0,
        driveConfig: {
          mode: 'flyby',
          accelG: 2.0,
          cruiseC: 0.999,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-71683', stayYears: 0 },       // Alpha Centauri (11.5° from Great Attractor)
          { systemId: 'nea-hd-142415', stayYears: 0 },   // Great Attractor / Bolder's Ring vector -> Universe Beta!
        ],
      },
      {
        id: 'xel-flux-neutron-analog',
        name: 'Heavy Ring-Buster Payload · Flux Analog (0.25g / 0.85c Flyby)',
        nameCs: 'Těžká střela na Prstenec · Analog Flux (0,25g / 0,85c průlet)',
        color: '#f59e0b',
        departureYear: 104400.0,
        crewStartAge: 25.0,
        driveConfig: {
          mode: 'flyby',
          accelG: 0.25,
          cruiseC: 0.85,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'nea-hd-142415', stayYears: 0 },   // Great Attractor / Bolder's Ring trajectory
        ],
      },
    ],
    storyEvents: [
      {
        id: 'xel3-ev-1',
        title: {
          en: 'Constancy of Purpose Pursues Xeelee Nightfighter Toward Bolder’s Ring (Sol)',
          cs: 'Constancy of Purpose pronásleduje xeeleeský stíhač k Bolderovu prstenci (Sol)',
        },
        systemId: 'sol',
        year: 104352.0,
      },
      {
        id: 'xel3-ev-2',
        title: {
          en: 'Pursuit Passes Alpha Centauri Staging Sector Along Great Attractor Axis',
          cs: 'Pronásledování míjí sektor Alfy Centauri po ose Velkého atraktoru',
        },
        systemId: 'hip-71683',
        year: 104357.0,
      },
      {
        id: 'xel3-ev-3',
        title: {
          en: 'Portal Breach into High-G Universe Beta (G = 10⁹ G₀, Norma Vector)',
          cs: 'Průnik portálem do vysoko-gravitačního Vesmíru Beta (G = 10⁹ G₀)',
        },
        systemId: 'nea-hd-142415',
        year: 104470.0,
      },
      {
        id: 'xel3-ev-4',
        title: {
          en: 'Raft & Stowaway — Rees & Descendants Survive on Wreckage of Constancy of Purpose',
          cs: 'Vor (Raft) a Stowaway — Rees a potomci přežívají na vraku Constancy of Purpose',
        },
        systemId: 'nea-hd-142415',
        year: 104858.0,
      },
    ],
  },

  // =========================================================================
  // EASTERN & CENTRAL EUROPEAN HARD SCI-FI (POLAND, USSR, CZECHOSLOVAKIA)
  // =========================================================================
  {
    id: 'lem-return-from-the-stars',
    category: 'eastern-bloc',
    universe: 'Stanisław Lem',
    author: 'Stanisław Lem',
    year: 1961,
    books: {
      en: 'Return from the Stars (Powrót z gwiazd)',
      cs: 'Návrat z hvězd (Powrót z gwiazd)',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Return_from_the_Stars',
    sourceLabel: {
      en: 'Wikipedia — Return from the Stars',
      cs: 'Wikipedie — Návrat z hvězd (S. Lem)',
    },
    title: {
      en: 'Return from the Stars — Hal Bregg’s Prometheus to Fomalhaut',
      cs: 'Návrat z hvězd — Hal Bregg a loď Prométheus k Fomalhautu',
    },
    subtitle: {
      en: 'Stanisław Lem’s iconic twin-paradox classic: astronaut Hal Bregg flies aboard Prometheus to Fomalhaut (25.13 ly) and returns to a radically transformed, “betrizated” future Earth.',
      cs: 'Klasika Stanisława Lema o paradoxu dvojčat: kosmonaut Hal Bregg letí lodí Prométheus k Fomalhautu (25,13 ly) a vrací se na radikálně proměněnou, „betrizovanou“ Zemi budoucnosti.',
    },
    physicsNote: {
      en: 'At real distance 25.13 ly each way with 1.5g / 0.992c cruise, round-trip takes ~52.7 yr Earth vs. ~8.7 yr crew proper time (in Lem’s 1961 novel, an extended multi-target survey yields 127 yr Earth vs. 10 yr crew).',
      cs: 'Při reálné vzdálenosti 25,13 ly tam a zpět (1,5g / 0,992c) trvá let ~52,7 r. Země vs. ~8,7 r. pro posádku (v Lemově románu z r. 1961 delší průzkum vytváří 127 r. Země vs. 10 r. pro posádku).',
    },
    recommendedClockStart: 2055.0,
    focusSystemId: 'hip-113368',
    ships: [
      {
        id: 'lem-prometheus',
        name: 'Prometheus · Hal Bregg (1.5g / 0.992c)',
        nameCs: 'Prométheus · Hal Bregg (1,5g / 0,992c)',
        color: '#00f0ff',
        departureYear: 2055.0,
        crewStartAge: 30.0,
        driveConfig: {
          mode: 'accel-cruise',
          accelG: 1.5,
          cruiseC: 0.992,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-113368', stayYears: 1.0 },
          { systemId: 'sol', stayYears: 0 },
        ],
      },
    ],
    storyEvents: [
      {
        id: 'lem-ev-1',
        title: {
          en: 'Prometheus Departure from Earth (Sol)',
          cs: 'Start lodi Prométheus ze Země (Sol)',
        },
        systemId: 'sol',
        year: 2055.0,
      },
      {
        id: 'lem-ev-2',
        title: {
          en: 'Fomalhaut Arrival Telemetry (Fomalhaut)',
          cs: 'Příletová telemetrie od Fomalhautu',
        },
        systemId: 'hip-113368',
        year: 2081.4,
      },
    ],
  },

  {
    id: 'lem-magellanic-cloud',
    category: 'eastern-bloc',
    universe: 'Stanisław Lem',
    author: 'Stanisław Lem',
    year: 1955,
    books: {
      en: 'The Magellanic Cloud (Obłok Magellana)',
      cs: 'K mrakům Magellanovým (Obłok Magellana)',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/The_Magellanic_Cloud',
    sourceLabel: {
      en: 'Wikipedia — The Magellanic Cloud (Stanisław Lem)',
      cs: 'Wikipedie — K mrakům Magellanovým (S. Lem)',
    },
    title: {
      en: 'The Magellanic Cloud — Starship Gea to Alpha & Proxima Centauri',
      cs: 'K mrakům Magellanovým — Hvězdolet Gea k Alfě a Proximě Centauri',
    },
    subtitle: {
      en: 'Humanity’s first interstellar voyage in the 32nd century: the massive starship Gea (227 crew) accelerates past 0.5c on an eight-year psychological odyssey to Alpha & Proxima Centauri.',
      cs: 'První mezihvězdná výprava lidstva ve 32. století: obří hvězdolet Gea (227 členů posádky) překonává rychlost 0,5c na osmileté psychologické odyseji k Alfě a Proximě Centauri.',
    },
    physicsNote: {
      en: 'Sublight photon-reaction drive (ve = 1.0c) at 0.5g accel / 0.62c cruise crosses Sol → Alpha Centauri (4.32 ly) in 8.1 Earth yr (6.7 yr crew time) — closely matching Lem’s canonical ~8-year voyage.',
      cs: 'Podsvětelná fotonová raketa (ve = 1,0c) při 0,5g / 0,62c urazí Sol → Alfa Centauri (4,32 ly) za 8,1 roku Země (6,7 r. palubního času) — v souladu s Lemovým ~8letým letem.',
    },
    recommendedClockStart: 3123.0,
    focusSystemId: 'hip-71683',
    ships: [
      {
        id: 'lem-gea',
        name: 'Gea · 227 Crew (0.5g / 0.62c Photon Drive)',
        nameCs: 'Gea · 227 členů posádky (0,5g / 0,62c fotonový pohon)',
        color: '#38bdf8',
        departureYear: 3123.0,
        crewStartAge: 28.0,
        driveConfig: {
          mode: 'accel-cruise',
          accelG: 0.5,
          cruiseC: 0.62,
          driveType: 'reaction',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-71683', stayYears: 0 },
        ],
      },
    ],
    storyEvents: [
      {
        id: 'lem-mc-1',
        title: {
          en: 'Gea Departs Solar System (32nd Century, Sol)',
          cs: 'Start hvězdoletu Gea ze Sluneční soustavy (32. století)',
        },
        systemId: 'sol',
        year: 3123.0,
      },
      {
        id: 'lem-mc-2',
        title: {
          en: 'Signs of Life & White Planet Encounter (Proxima Centauri)',
          cs: 'Signál života a setkání u Bílé planety (Proxima Centauri)',
        },
        systemId: 'hip-71683',
        year: 3131.0,
      },
    ],
  },

  {
    id: 'yefremov-andromeda-nebula',
    category: 'eastern-bloc',
    universe: 'Eastern Bloc SF',
    universeCs: 'Východní blok SF',
    author: 'Ivan Yefremov',
    authorCs: 'Ivan Jefremov',
    year: 1957,
    books: {
      en: 'Andromeda: A Space-Age Tale (Туманность Андромеды)',
      cs: 'Mlhovina v Andromedě (Туманность Андромеды)',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Andromeda_(novel)',
    sourceLabel: {
      en: 'Wikipedia — Andromeda: A Space-Age Tale (Ivan Yefremov)',
      cs: 'Wikipedie — Mlhovina v Andromedě (Ivan Jefremov)',
    },
    title: {
      en: 'Andromeda Nebula — Tantra’s 5/6c Anameson Return & Great Ring',
      cs: 'Mlhovina v Andromedě — Návrat Tantry (5/6 c) a Velký prstenec',
    },
    subtitle: {
      en: 'Commander Erg Noor & Niza Krit pilot the 37th Expedition starship Tantra home at 5/6 c from dead planet Zirda (Ophiuchus sector), while Earth communicates across the Great Ring via 61 Cygni.',
      cs: 'Velitel Erg Noor a Niza Krit vedou 37. hvězdnou expedici lodi Tantra rychlostí 5/6 c od mrtvé planety Zirda (sektor Hadonoše) zpět k Zemi, zatímco Velký prstenec spojuje Zemi s 61 Cygni.',
    },
    physicsNote: {
      en: 'Yefremov explicitly specifies anameson cruise speed v = 5/6 c (0.8333c), giving Lorentz factor γ = 1.809 (time dilation 0.553 ≈ 4 ship yr per 7 Earth yr, as quoted in the novel!). 70 Ophiuchi (16.6 ly) anchors the Ophiuchus sector.',
      cs: 'Jefremov výslovně uvádí anamezonovou rychlost v = 5/6 c (0,8333c), tedy γ = 1,809 (dilatace 0,553 ≈ 4 roky lodi za 7 let Země — přesně dle románu!). Sektor Hadonoše kotví 70 Ophiuchi (16,6 ly).',
    },
    recommendedClockStart: 3000.0,
    focusSystemId: 'hip-88601',
    ships: [
      {
        id: 'yef-tantra',
        name: 'Tantra · Erg Noor & Niza Krit (5/6 c Anameson)',
        nameCs: 'Tantra · Erg Noor a Niza Krit (5/6 c anamezon)',
        color: '#00f0ff',
        departureYear: 3000.0,
        crewStartAge: 34.0,
        driveConfig: {
          mode: 'accel-cruise',
          accelG: 1.0,
          cruiseC: 0.8333,
          driveType: 'reaction',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-88601', stayYears: 0 }, // 70 Ophiuchi (Zirda / Ophiuchus sector)
          { systemId: 'sol', stayYears: 0 },       // Sol (Earth — after Iron Star ordeal)
        ],
      },
      {
        id: 'yef-great-ring',
        name: 'Great Ring Expedition · 61 Cygni Link (5/6 c)',
        nameCs: 'Výprava Velkého prstence · 61 Cygni (5/6 c)',
        color: '#f59e0b',
        departureYear: 3002.0,
        crewStartAge: 30.0,
        driveConfig: {
          mode: 'accel-cruise',
          accelG: 1.0,
          cruiseC: 0.8333,
          driveType: 'reaction',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-104214', stayYears: 2.0 }, // 61 Cygni (Earth's closest Great Ring partner)
          { systemId: 'sol', stayYears: 0 },
        ],
      },
    ],
    storyEvents: [
      {
        id: 'yef-ev-1',
        title: {
          en: 'Tantra Departs Dead Planet Zirda (Ophiuchus)',
          cs: 'Tantra opouští mrtvou planetu Zirda (Hadonoš)',
        },
        systemId: 'hip-88601',
        year: 3000.0,
      },
      {
        id: 'yef-ev-2',
        title: {
          en: 'Great Ring Broadcast Relayed via 61 Cygni',
          cs: 'Vysílání Velkého prstence přes 61 Cygni',
        },
        systemId: 'hip-104214',
        year: 3010.0,
      },
      {
        id: 'yef-ev-3',
        title: {
          en: 'Tantra Returns to Earth after Iron Star Rescue (Sol)',
          cs: 'Návrat Tantry na Zemi po záchraně od Železné hvězdy (Sol)',
        },
        systemId: 'sol',
        year: 3021.3,
      },
    ],
  },

  {
    id: 'strugatsky-noon-22nd-century',
    category: 'eastern-bloc',
    universe: 'Noon Universe',
    universeCs: 'Svět Poledne',
    author: 'Arkady & Boris Strugatsky',
    authorCs: 'Arkadij a Boris Strugačtí',
    year: 1961,
    books: {
      en: 'Noon: 22nd Century (Полдень, XXII век)',
      cs: 'Poledne, 22. století (Полдень, XXII век)',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Noon:_22nd_Century',
    sourceLabel: {
      en: 'Wikipedia — Noon: 22nd Century (Strugatsky Brothers)',
      cs: 'Wikipedie — Poledne, 22. století (bratři Strugačtí)',
    },
    title: {
      en: 'Noon: 22nd Century — Photon Ship Taimyr & Gorbovsky’s Tariel',
      cs: 'Poledne, 22. století — Fotonový Tajmyr a Gorbovského Tariel',
    },
    subtitle: {
      en: 'Launched Nov 7, 2017 toward Lyra (Vega sector) to test the light barrier, the photon ship Taimyr experiences extreme relativistic time dilation — returning survivors Kondratyev & Slavin to a utopian 22nd-century Earth, alongside Leonid Gorbovsky’s Tariel.',
      cs: 'Fotonový hvězdolet Tajmyr startuje 7. listopadu 2017 směrem k Lyře (sektor Vegy) k testu bariéry rychlosti světla a vrací přeživší Kondratěva a Slavina do 22. století; souběžně létá Gorbovského Tariel.',
    },
    physicsNote: {
      en: 'Taimyr’s photon rocket (ve = 1.0c, 1g / 0.98c) round-trip along the Lyra/Vega axis (50.1 ly) spans ~54 yr Earth vs. ~16 yr crew (the novel adds a near-c space-time anomaly stretching Earth time to a full century: 2017 → 2117).',
      cs: 'Fotonová raketa Tajmyr (ve = 1,0c, 1g / 0,98c) po ose Lyry/Vegy (50,1 ly) trvá ~54 r. Země vs. ~16 r. posádky (v románu anomálie u bariéry c prodlužuje pozemský čas na celé století: 2017 → 2117).',
    },
    recommendedClockStart: 2017.0,
    focusSystemId: 'hip-91262',
    ships: [
      {
        id: 'str-taimyr',
        name: 'Taimyr · Kondratyev & Slavin (1g / 0.98c Photon)',
        nameCs: 'Tajmyr · Kondratěv a Slavin (1g / 0,98c fotonová)',
        color: '#00f0ff',
        departureYear: 2017.85,
        crewStartAge: 29.0,
        driveConfig: {
          mode: 'accel-cruise',
          accelG: 1.0,
          cruiseC: 0.98,
          driveType: 'reaction',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-91262', stayYears: 0.5 }, // Vega (Constellation Lyra axis — Planet of Blue Sands)
          { systemId: 'sol', stayYears: 0 },
        ],
      },
      {
        id: 'str-tariel',
        name: 'Tariel · Leonid Gorbovsky (1.5g D-Photon)',
        nameCs: 'Tariel · Leonid Gorbovskij (1,5g D-fotonový)',
        color: '#00ff88',
        departureYear: 2118.0,
        crewStartAge: 42.0,
        driveConfig: {
          mode: 'flip',
          accelG: 1.5,
          cruiseC: 0.99,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-15510', stayYears: 1.0 }, // 82 G. Eridani (Noon EN-2 solar analog)
          { systemId: 'sol', stayYears: 0 },
        ],
      },
    ],
    storyEvents: [
      {
        id: 'str-ev-1',
        title: {
          en: 'Taimyr & Unmanned Probe Yermak Launch from Pluto-2 (Sol)',
          cs: 'Start Tajmyru a bezpilotní sondy Jermak z Pluta-2 (Sol)',
        },
        systemId: 'sol',
        year: 2017.85,
      },
      {
        id: 'str-ev-2',
        title: {
          en: 'First Extrasolar Landing: Planet of Blue Sands (Lyra)',
          cs: 'První přistání na exoplanetě: Planeta modrých písků (Lyra)',
        },
        systemId: 'hip-91262',
        year: 2045.0,
      },
      {
        id: 'str-ev-3',
        title: {
          en: 'Kondratyev & Slavin Return to 22nd-Century Earth (Sol)',
          cs: 'Návrat Kondratěva a Slavina na Zemi 22. století (Sol)',
        },
        systemId: 'sol',
        year: 2117.0,
      },
    ],
  },

  {
    id: 'martynov-kallisto-sirius',
    category: 'eastern-bloc',
    universe: 'Eastern Bloc SF',
    universeCs: 'Východní blok SF',
    author: 'Georgy Martynov',
    authorCs: 'Georgij Martynov',
    year: 1957,
    books: {
      en: 'Kallisto · The Kallistonians (Каллисто / Каллистяне)',
      cs: 'Kallisto · Kallisťané (Каллисто / Каллистяне)',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Georgy_Martynov',
    sourceLabel: {
      en: 'Wikipedia — Georgy Martynov (Kallisto Dilogy)',
      cs: 'Wikipedie — Georgij Martynov (dilogie Kallisto)',
    },
    title: {
      en: 'Kallisto — 1g Meson Starship Between Sirius & Sol',
      cs: 'Kallisto — Mezonový hvězdolet (1g) mezi Siriem a Sluncem',
    },
    subtitle: {
      en: 'A gleaming 30-meter kessind meson starship arrives from the Sirius system to make peaceful first contact with Earth, then carries two Soviet scientists back to Kallisto at >190,000 km/s.',
      cs: 'Třicetimetrový kulový mezonový hvězdolet ze soustavy Siria přilétá k mírovému prvnímu kontaktu se Zemí a poté odváží dva pozemské vědce zpět na Kallisto rychlostí přes 190 000 km/s.',
    },
    physicsNote: {
      en: 'Directly modeled on Martynov’s explicit numbers: 1g artificial-gravity acceleration up to >190,000 km/s (0.634c) cruise, coasting phase, and 1g deceleration across 8.60 ly (Sirius ↔ Sol: 14.3 yr Earth / 11.4 yr crew each way).',
      cs: 'Přesně dle Martynovových údajů: zrychlení 1g (umělá tíže) na >190 000 km/s (0,634c), let setrvačností a brzdění 1g přes 8,60 ly (Sirius ↔ Sol: 14,3 r. Země / 11,4 r. posádky jedním směrem).',
    },
    recommendedClockStart: 1960.0,
    focusSystemId: 'hip-32349',
    ships: [
      {
        id: 'mar-kallisto',
        name: 'Kallisto Meson Sphere (1g / 0.634c)',
        nameCs: 'Mezonová koule Kallisto (1g / 0,634c)',
        color: '#c084fc',
        departureYear: 1960.0,
        crewStartAge: 32.0,
        driveConfig: {
          mode: 'accel-cruise',
          accelG: 1.0,
          cruiseC: 0.634,
          driveType: 'reaction',
          exhaustVelC: 0.85,
        },
        waypoints: [
          { systemId: 'hip-32349', stayYears: 0 }, // Sirius (Kallisto homeworld)
          { systemId: 'sol', stayYears: 1.0 },     // Sol (First Contact in USSR, boards Sipagin & Shilov)
          { systemId: 'hip-32349', stayYears: 0 }, // Sirius (Return to Kallisto)
        ],
      },
    ],
    storyEvents: [
      {
        id: 'mar-ev-1',
        title: {
          en: 'Kallisto Sphere Launches from Sirius System',
          cs: 'Start mezonového hvězdoletu ze soustavy Siria',
        },
        systemId: 'hip-32349',
        year: 1960.0,
      },
      {
        id: 'mar-ev-2',
        title: {
          en: 'Peaceful First Contact Landing on Earth (Sol)',
          cs: 'Mírové přistání bílého kulového hvězdoletu na Zemi (Sol)',
        },
        systemId: 'sol',
        year: 1974.3,
      },
      {
        id: 'mar-ev-3',
        title: {
          en: 'Earth Delegates Arrive at Planet Kallisto (Sirius)',
          cs: 'Přílet pozemské výpravy na planetu Kallisto (Sirius)',
        },
        systemId: 'hip-32349',
        year: 1989.6,
      },
    ],
  },

  {
    id: 'babula-planet-of-three-suns',
    category: 'eastern-bloc',
    universe: 'Eastern Bloc SF',
    universeCs: 'Československá SF',
    author: 'Vladimír Babula',
    year: 1954,
    books: {
      en: 'Signals from Space · Planet of Three Suns · Friends from Ophiuchus',
      cs: 'Signály z vesmíru · Planeta tří sluncí · Přátelé z Hadonoše (Oceánem světelných roků)',
    },
    sourceUrl: 'https://cs.wikipedia.org/wiki/Vladim%C3%ADr_Babula',
    sourceLabel: {
      en: 'Czech Wikipedia — Vladimír Babula Trilogy',
      cs: 'Česká Wikipedie — trilogie Vladimíra Babuly',
    },
    title: {
      en: 'Planet of Three Suns — Czechoslovak Starship Paprsek',
      cs: 'Planeta tří sluncí — Československý hvězdolet Paprsek',
    },
    subtitle: {
      en: 'Czechoslovakia’s pioneering 1950s hard-SF interstellar trilogy: after receiving radio signals from Alpha Centauri, the Moon-built atomic/photon ship Paprsek voyages to the triple star (Kvarten) and onward to Ophiuchus.',
      cs: 'Průkopnická československá hard-SF trilogie 50. let: po zachycení radiových signálů z Alfy Centauri vyplouvá z Měsíce atomový/fotonový hvězdolet Paprsek k Planetě tří sluncí (Kvarten) a dále do Hadonoše.',
    },
    physicsNote: {
      en: 'Modeled as a relativistic 1g / 0.75c photon-atomic expedition across real 3D distances: Sol → Alpha Centauri (4.32 ly) → Barnard’s Star in Ophiuchus (6.45 ly) → Sol (5.95 ly), total 16.71 ly.',
      cs: 'Modelováno jako relativistická 1g / 0,75c fotonová výprava v reálných 3D vzdálenostech: Sol → Alfa Centauri (4,32 ly) → Barnardova hvězda v Hadonoši (6,45 ly) → Sol (5,95 ly), celkem 16,71 ly.',
    },
    recommendedClockStart: 2050.0,
    focusSystemId: 'hip-71683',
    ships: [
      {
        id: 'bab-paprsek',
        name: 'Paprsek (The Beam · 1g / 0.75c Photon)',
        nameCs: 'Paprsek (1g / 0,75c atomovo-fotonový hvězdolet)',
        color: '#fbbf24',
        departureYear: 2050.0,
        crewStartAge: 30.0,
        driveConfig: {
          mode: 'accel-cruise',
          accelG: 1.0,
          cruiseC: 0.75,
          driveType: 'reaction',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-71683', stayYears: 1.5 }, // Alpha Centauri (Planet of Three Suns / Kvarten)
          { systemId: 'hip-87937', stayYears: 1.0 }, // Barnard's Star (Ophiuchus — Friends from Ophiuchus)
          { systemId: 'sol', stayYears: 0 },
        ],
      },
    ],
    storyEvents: [
      {
        id: 'bab-ev-1',
        title: {
          en: 'Signals from Space Received from Alpha Centauri (Sol)',
          cs: 'Zachycení Signálů z vesmíru od Alfy Centauri (Sol)',
        },
        systemId: 'hip-71683',
        year: 2045.5,
      },
      {
        id: 'bab-ev-2',
        title: {
          en: 'Paprsek Arrives at Planet of Three Suns — Kvarten (Alpha Cen)',
          cs: 'Přílet Paprsku k Planetě tří sluncí — Kvarten (Alfa Centauri)',
        },
        systemId: 'hip-71683',
        year: 2056.7,
      },
      {
        id: 'bab-ev-3',
        title: {
          en: 'Contact in Ophiuchus — Friends from Ophiuchus (Barnard’s Star)',
          cs: 'Setkání v Hadonoši — Přátelé z Hadonoše (Barnardova hvězda)',
        },
        systemId: 'hip-87937',
        year: 2067.7,
      },
    ],
  },

  // =========================================================================
  // CLASSIC HARD SCI-FI (ANDERSON, HEINLEIN, LE GUIN, NIVEN, CLARKE, FORWARD)
  // =========================================================================
  {
    id: 'anderson-tau-zero',
    category: 'classic-sf',
    universe: 'Classic Hard SF',
    universeCs: 'Klasická hard SF',
    author: 'Poul Anderson',
    year: 1970,
    books: {
      en: 'Tau Zero',
      cs: 'Tau nula (Tau Zero)',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Tau_Zero',
    sourceLabel: {
      en: 'Wikipedia — Tau Zero (Poul Anderson)',
      cs: 'Wikipedie — Tau nula (Poul Anderson)',
    },
    title: {
      en: 'Tau Zero — Runaway Bussard Ramjet Leonora Christine',
      cs: 'Tau nula — Neovladatelný náporový let lodi Leonora Christine',
    },
    subtitle: {
      en: 'The ultimate special-relativity novel: the Bussard ramjet Leonora Christine (50 colonists) heads for Beta Virginis (Zavijava, 35.65 ly) — but an interstellar dust cloud destroys its decelerator, locking it into unstoppable 1g acceleration past its target as τ → 0!',
      cs: 'Vrcholný román o speciální relativitě: náporová loď Leonora Christine (50 kolonistů) míří k Beta Virginis (Zavijava, 35,65 ly), ale porucha brzdného systému ji uvězní v nezastavitelném zrychlení 1g a průletu kolem cíle k τ → 0!',
    },
    physicsNote: {
      en: 'Compare BOTH profiles side-by-side: the damaged Runaway Flyby (1g, no braking) blasts past Beta Virginis at 99.96%c (γ = 37.8, only 4.2 yr crew time!) vs. the Planned 1g Flip (~37.5 yr Earth / ~7.2 yr crew).',
      cs: 'Porovnejte oba profily vedle sebe: neovladatelný průlet (1g bez brzdění) míjí Beta Virginis rychlostí 99,96%c (γ = 37,8, jen 4,2 r. pro posádku!) oproti plánované 1g otočce (~37,5 r. Země / ~7,2 r. posádka).',
    },
    recommendedClockStart: 2250.0,
    focusSystemId: 'hip-57757', // Zavijava (Beta Virginis)
    ships: [
      {
        id: 'tz-runaway',
        name: 'Leonora Christine · Runaway Flyby (1g, No Brake!)',
        nameCs: 'Leonora Christine · Neovladatelný průlet (1g bez brzdění!)',
        color: '#fb7185',
        departureYear: 2250.0,
        crewStartAge: 31.0,
        driveConfig: {
          mode: 'flyby',
          accelG: 1.0,
          cruiseC: 0.9999,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-57757', stayYears: 0 }, // Beta Virginis (Zavijava — 35.65 ly)
        ],
      },
      {
        id: 'tz-planned',
        name: 'Leonora Christine · Planned Mission (1g Flip)',
        nameCs: 'Leonora Christine · Plánovaný let (1g otočka)',
        color: '#38bdf8',
        departureYear: 2250.0,
        crewStartAge: 31.0,
        driveConfig: {
          mode: 'flip',
          accelG: 1.0,
          cruiseC: 0.999,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-57757', stayYears: 0 },
        ],
      },
    ],
    storyEvents: [
      {
        id: 'tz-ev-1',
        title: {
          en: 'Leonora Christine Launches from Sol toward Beta Virginis',
          cs: 'Start lodi Leonora Christine od Slunce k Beta Virginis',
        },
        systemId: 'sol',
        year: 2250.0,
      },
      {
        id: 'tz-ev-2',
        title: {
          en: 'Nebula Strike Destroys Decelerator Mid-Flight (Sol)',
          cs: 'Srážka s mlhovinou zničí brzdný pohon uprostřed letu',
        },
        systemId: 'sol',
        year: 2266.0,
      },
      {
        id: 'tz-ev-3',
        title: {
          en: 'Unstoppable 99.96%c Flyby Past Beta Virginis (Zavijava)',
          cs: 'Nezastavitelný průlet rychlostí 99,96%c kolem Beta Virginis',
        },
        systemId: 'hip-57757',
        year: 2286.6,
      },
    ],
  },

  {
    id: 'heinlein-time-for-the-stars',
    category: 'classic-sf',
    universe: 'Classic Hard SF',
    universeCs: 'Klasická hard SF',
    author: 'Robert A. Heinlein',
    year: 1956,
    books: {
      en: 'Time for the Stars',
      cs: 'Čas pro hvězdy (Time for the Stars)',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Time_for_the_Stars',
    sourceLabel: {
      en: 'Wikipedia — Time for the Stars (R. A. Heinlein)',
      cs: 'Wikipedie — Čas pro hvězdy (R. A. Heinlein)',
    },
    title: {
      en: 'Time for the Stars — Torchship Lewis and Clark (Twin Paradox)',
      cs: 'Čas pro hvězdy — Pochodňová loď Lewis and Clark (Paradox dvojčat)',
    },
    subtitle: {
      en: 'Tom Bartlett boards the 1g Long Range Foundation torchship Lewis and Clark (“Elsie”) to survey Tau Ceti and Beta Hydri (“Inferno”), staying linked by telepathy to his rapidly aging twin brother Pat back on Earth.',
      cs: 'Tom Bartlett odlétá na 1g pochodňové lodi Lewis and Clark („Elsie“) k průzkumu Tau Ceti a Beta Hydri („Inferno“) v telepatickém spojení se svým rychle stárnoucím dvojčetem Patem na Zemi.',
    },
    physicsNote: {
      en: 'Textbook Twin Paradox showcase: check the Crew Age vs. Earth Twin Age telemetry! Over the 57.7 ly 1g survey loop (Sol → Tau Ceti → Beta Hydri → Sol), Tom ages only 19.7 yr while twin Pat on Earth ages 65.3 yr.',
      cs: 'Učebnicová ukázka paradoxu dvojčat: sledujte věk posádky oproti dvojčeti na Zemi! Na 57,7 ly okruhu při 1g (Sol → Tau Ceti → Beta Hydri → Sol) zestárne Tom jen o 19,7 roku, zatímco Pat na Zemi o 65,3 roku.',
    },
    recommendedClockStart: 2060.0,
    focusSystemId: 'hip-8102',
    ships: [
      {
        id: 'hei-elsie',
        name: 'LRT Lewis and Clark (“Elsie”) · Tom Bartlett (1g)',
        nameCs: 'LRT Lewis and Clark („Elsie“) · Tom Bartlett (1g)',
        color: '#00f0ff',
        departureYear: 2060.0,
        crewStartAge: 18.0,
        driveConfig: {
          mode: 'flip',
          accelG: 1.0,
          cruiseC: 0.99,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-8102', stayYears: 1.0 }, // Tau Ceti
          { systemId: 'hip-2021', stayYears: 1.0 }, // Beta Hydri ("Inferno" ammonia-ocean world)
          { systemId: 'sol', stayYears: 0 },
        ],
      },
    ],
    storyEvents: [
      {
        id: 'hei-ev-1',
        title: {
          en: 'Twelve Torchships Depart Earth — Twins Tom & Pat Separate (Sol)',
          cs: 'Start dvanácti pochodňových lodí — rozloučení dvojčat Toma a Pata',
        },
        systemId: 'sol',
        year: 2060.0,
      },
      {
        id: 'hei-ev-2',
        title: {
          en: 'Survey of Tau Ceti — Pat Already Middle-Aged on Earth',
          cs: 'Průzkum Tau Ceti — dvojče Pat na Zemi je již ve středním věku',
        },
        systemId: 'hip-8102',
        year: 2073.7,
      },
      {
        id: 'hei-ev-3',
        title: {
          en: 'Ammonia-Ocean World “Inferno” Discovered (Beta Hydri)',
          cs: 'Objev čpavkového světa „Inferno“ (Beta Hydri)',
        },
        systemId: 'hip-2021',
        year: 2093.6,
      },
    ],
  },

  {
    id: 'leguin-hainish-nafal',
    category: 'classic-sf',
    universe: 'Hainish Cycle',
    universeCs: 'Hainský cyklus',
    author: 'Ursula K. Le Guin',
    year: 1974,
    books: {
      en: 'The Dispossessed · Rocannon’s World',
      cs: 'Vyděděnec · Rocannonův svět (Hainský cyklus)',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Hainish_Cycle',
    sourceLabel: {
      en: 'Wikipedia — Hainish Cycle & NAFAL Starships',
      cs: 'Wikipedie — Hainský cyklus a podsvětelné lodě NAFAL',
    },
    title: {
      en: 'Hainish Cycle — NAFAL Sublight Voyages (Tau Ceti & Fomalhaut)',
      cs: 'Hainský cyklus — Podsvětelné lodě NAFAL (Tau Ceti a Fomalhaut)',
    },
    subtitle: {
      en: 'In Ursula K. Le Guin’s Ekumen, passenger ships are strictly sublight NAFAL (“Nearly As Fast As Light”) vessels, causing decades of planetary separation while Shevek’s ansible unlocks instantaneous communication.',
      cs: 'V Ekumeně Ursuly K. Le Guinové létají lodě striktně podsvětelně (NAFAL — „téměř rychlostí světla“), což odděluje světy na desetiletí, zatímco Shevekův ansibl přináší okamžitou komunikaci.',
    },
    physicsNote: {
      en: 'NAFAL relativistic ships (1.5g / 0.99c): Tau Ceti → Sol (11.91 ly) takes 13.1 yr planetary time vs. 3.9 yr shipboard; Sol → Fomalhaut (25.13 ly, Rocannon’s World) takes 26.5 yr planetary time vs. 5.5 yr shipboard.',
      cs: 'Relativistické lodě NAFAL (1,5g / 0,99c): Tau Ceti → Sol (11,91 ly) trvá 13,1 r. planetárního času vs. 3,9 r. na palubě; Sol → Fomalhaut (25,13 ly, Rocannonův svět) trvá 26,5 r. vs. 5,5 r.',
    },
    recommendedClockStart: 2300.0,
    focusSystemId: 'hip-8102',
    ships: [
      {
        id: 'leg-shevek-nafal',
        name: 'Hainish NAFAL Courier · Shevek’s Ansible Envoy (0.99c)',
        nameCs: 'Hainská loď NAFAL · Poselství Shevekova ansiblu (0,99c)',
        color: '#00f0ff',
        departureYear: 2300.0,
        crewStartAge: 38.0,
        driveConfig: {
          mode: 'accel-cruise',
          accelG: 1.5,
          cruiseC: 0.99,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-8102', stayYears: 0 }, // Tau Ceti (Anarres & Urras)
          { systemId: 'sol', stayYears: 0 },      // Sol (Terra)
        ],
      },
      {
        id: 'leg-rocannon-nafal',
        name: 'League NAFAL Survey · Rocannon (0.99c)',
        nameCs: 'Průzkumná loď Ligy NAFAL · Rocannon (0,99c)',
        color: '#c084fc',
        departureYear: 2300.0,
        crewStartAge: 35.0,
        driveConfig: {
          mode: 'accel-cruise',
          accelG: 1.5,
          cruiseC: 0.99,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-113368', stayYears: 0 }, // Fomalhaut (Fomalhaut II / Rokanan)
        ],
      },
    ],
    storyEvents: [
      {
        id: 'leg-ev-1',
        title: {
          en: 'Shevek Publishes General Temporal Theory / Ansible (Tau Ceti)',
          cs: 'Shevek dokončuje Obecnou teorii času a ansibl (Tau Ceti)',
        },
        systemId: 'hip-8102',
        year: 2300.0,
      },
      {
        id: 'leg-ev-2',
        title: {
          en: 'Rocannon’s Survey Ship Reaches Fomalhaut II',
          cs: 'Rocannonova průzkumná loď doráží k Fomalhautu II',
        },
        systemId: 'hip-113368',
        year: 2326.5,
      },
    ],
  },

  {
    id: 'niven-known-space-slowboats',
    category: 'classic-sf',
    universe: 'Known Space',
    universeCs: 'Známý vesmír',
    author: 'Larry Niven',
    year: 1966,
    books: {
      en: 'World of Ptavvs · A Gift from Earth · Flatlander · Man-Kzin Wars',
      cs: 'Svět Ptavvů · Dar ze Země · Kzinské války (Známý vesmír)',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Known_Space',
    sourceLabel: {
      en: 'Wikipedia — Larry Niven’s Known Space Chronology',
      cs: 'Wikipedie — Chronologie Známého vesmíru Larryho Nivena',
    },
    title: {
      en: 'Known Space — Slowboat & Bussard Ramscoop Era',
      cs: 'Známý vesmír — Éra pomalých lodí a Bussardových kolektorů',
    },
    subtitle: {
      en: 'Before hyperdrive, humanity expanded strictly sublight: slowboat colonists settle Wunderland (Alpha Centauri), Ramscoop #4 maps Plateau (Tau Ceti), Lazy Eight II suffers a runaway flyby past Sirius, and first sublight contact erupts near 61 Ursae Majoris (Kzin).',
      cs: 'Před hyperpohonem lidstvo expandovalo čistě podsvětelně: kolonisté na Wunderland (Alfa Centauri), sonda Ramscoop #4 k Tau Ceti, neovladatelný let Lazy Eight II kolem Siria a střet u 61 Ursae Majoris (Kzin).',
    },
    physicsNote: {
      en: 'Showcases 3 distinct sublight regimes simultaneously: 0.11c fusion slowboat (~40 yr to Alpha Centauri), 0.15c runaway flyby (Lazy Eight II), and 0.25g Bussard ramscoop probes to Tau Ceti & 61 UMa.',
      cs: 'Souběžná ukázka 3 podsvětelných režimů: fúzní pomalá loď 0,11c (~40 let k Alfě Centauri), neovladatelný průlet Lazy Eight II (0,15c) a Bussardův kolektor 0,25g k Tau Ceti a 61 UMa.',
    },
    recommendedClockStart: 2110.0,
    focusSystemId: 'sol',
    ships: [
      {
        id: 'ks-wunderland',
        name: 'Wunderland Colony Slowboat (0.11c Fusion)',
        nameCs: 'Koloniální pomalá loď Wunderland (0,11c fúze)',
        color: '#00ff88',
        departureYear: 2110.0,
        crewStartAge: 26.0,
        driveConfig: {
          mode: 'accel-cruise',
          accelG: 0.05,
          cruiseC: 0.11,
          driveType: 'reaction',
          exhaustVelC: 0.12,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-71683', stayYears: 0 }, // Alpha Centauri (Wunderland — ~41 yr)
        ],
      },
      {
        id: 'ks-lazy-eight',
        name: 'Lazy Eight II · Flatlander (0.15c Runaway Flyby)',
        nameCs: 'Lazy Eight II · Ztracený průlet (0,15c bez brzdění)',
        color: '#fb7185',
        departureYear: 2115.0,
        crewStartAge: 30.0,
        driveConfig: {
          mode: 'flyby',
          accelG: 0.05,
          cruiseC: 0.15,
          driveType: 'non-reactive',
          exhaustVelC: 0.12,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-32349', stayYears: 0 }, // Sirius (runaway flyby)
        ],
      },
      {
        id: 'ks-ramscoop-tau',
        name: 'Ramscoop Robot #4 & Planck (0.25g to Tau Ceti)',
        nameCs: 'Bussardova sonda #4 a Planck (0,25g k Tau Ceti)',
        color: '#00f0ff',
        departureYear: 2112.0,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'accel-cruise',
          accelG: 0.25,
          cruiseC: 0.45,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-8102', stayYears: 2.0 }, // Tau Ceti (Plateau / Mount Lookitthat)
          { systemId: 'hip-56997', stayYears: 0 }, // 61 Ursae Majoris (Kzinhome sector)
        ],
      },
    ],
    storyEvents: [
      {
        id: 'ks-ev-1',
        title: {
          en: 'Wunderland Colony Founded (Alpha Centauri)',
          cs: 'Založení kolonie Wunderland (Alfa Centauri)',
        },
        systemId: 'hip-71683',
        year: 2151.0,
      },
      {
        id: 'ks-ev-2',
        title: {
          en: 'Ramscoop #4 Maps Mount Lookitthat (Tau Ceti)',
          cs: 'Sonda Ramscoop #4 mapuje plošinu Plateau (Tau Ceti)',
        },
        systemId: 'hip-8102',
        year: 2140.5,
      },
      {
        id: 'ks-ev-3',
        title: {
          en: 'First Contact Warning Near Kzinhome (61 Ursae Majoris)',
          cs: 'Varování před prvním kontaktem u Kzinu (61 Ursae Majoris)',
        },
        systemId: 'hip-56997',
        year: 2215.0,
      },
    ],
  },

  {
    id: 'clarke-rama-odyssey',
    category: 'classic-sf',
    universe: 'Rama',
    author: 'Arthur C. Clarke & Gentry Lee',
    year: 1991,
    books: {
      en: 'Rama II · The Garden of Rama · Rama Revealed',
      cs: 'Návrat Rámy · Zahrada Rámova · Odhalení Rámy',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/The_Garden_of_Rama',
    sourceLabel: {
      en: 'Wikipedia — The Garden of Rama & Rama Revealed',
      cs: 'Wikipedie — Zahrada Rámova a Odhalení Rámy',
    },
    title: {
      en: 'Path of Rama II & Rama III (Nicole Wakefield)',
      cs: 'Cesta Rámy II a Rámy III (Nicole Wakefieldová)',
    },
    subtitle: {
      en: 'Trapped astronauts Nicole des Jardins, Richard Wakefield & Michael O’Toole ride the alien cylinder from Sol to the Sirius Raman Node (12-yr voyage), return to Sol for 2,000 colonists, and voyage to the Tau Ceti Node.',
      cs: 'Astronauti Nicole des Jardins, Richard Wakefield a Michael O’Toole letí na palubě mimozemského válce od Slunce k Rámovu uzlu u Siria (12 let), vracejí se k Sol pro 2 000 kolonistů a míří k uzlu u Tau Ceti.',
    },
    physicsNote: {
      en: 'Reactionless Raman space-drive modeled at 0.35g / 0.80c cruise cap: Sol → Sirius (8.60 ly) takes 12.1 Earth yr (8.1 yr crew proper time), matching The Garden of Rama’s 12-year outbound diary.',
      cs: 'Nereaktivní pohon Rámy modelovaný při 0,35g / strop 0,80c: let Sol → Sirius (8,60 ly) trvá 12,1 roku Země (8,1 roku pro posádku), což přesně odpovídá 12letému deníku v Zahradě Rámově.',
    },
    recommendedClockStart: 2200.0,
    focusSystemId: 'sol',
    ships: [
      {
        id: 'rama-ii-iii',
        name: 'Rama II → Rama III (Nicole Wakefield)',
        nameCs: 'Ráma II → Ráma III (Nicole Wakefieldová)',
        color: '#00f0ff',
        departureYear: 2200.0,
        crewStartAge: 36.0,
        driveConfig: {
          mode: 'accel-cruise',
          accelG: 0.35,
          cruiseC: 0.8,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-32349', stayYears: 1.0 },
          { systemId: 'sol', stayYears: 1.0 },
          { systemId: 'hip-8102', stayYears: 0 },
        ],
      },
    ],
    storyEvents: [
      {
        id: 'rama-ev-1',
        title: {
          en: 'Rama II Departs Solar System (Sol)',
          cs: 'Ráma II opouští Sluneční soustavu (Sol)',
        },
        systemId: 'sol',
        year: 2200.0,
      },
      {
        id: 'rama-ev-2',
        title: {
          en: 'Arrival at Sirius Raman Node (Sirius)',
          cs: 'Přílet k Rámovu uzlu u Siria (Sirius)',
        },
        systemId: 'hip-32349',
        year: 2212.1,
      },
      {
        id: 'rama-ev-3',
        title: {
          en: 'Raman Colonist Request Broadcast (Sirius → Sol)',
          cs: 'Výzva Rámanů o kolonisty (Sirius → Sol)',
        },
        systemId: 'hip-32349',
        year: 2213.0,
      },
    ],
  },

  {
    id: 'forward-rocheworld',
    category: 'classic-sf',
    universe: 'Classic Hard SF',
    universeCs: 'Klasická hard SF',
    author: 'Robert L. Forward',
    year: 1984,
    books: {
      en: 'Rocheworld (The Flight of the Dragonfly)',
      cs: 'Rocheworld (Let Vážky)',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Rocheworld',
    sourceLabel: {
      en: 'Wikipedia — Rocheworld (Robert L. Forward)',
      cs: 'Wikipedie — Rocheworld (Robert L. Forward)',
    },
    title: {
      en: 'Rocheworld — Laser-Pushed Lightsail Prometheus to Barnard’s Star',
      cs: 'Rocheworld — Laserová plachetnice Prométheus k Barnardově hvězdě',
    },
    subtitle: {
      en: 'Physicist Robert L. Forward’s rigorously engineered interstellar lightsail mission: accelerated by a Solar System laser array to 0.20c and braked via a separable reflector sail at Barnard’s Star (5.95 ly).',
      cs: 'Fyzikálně propracovaná mise laserové plachetnice fyzika Roberta L. Forwarda: urychlena slunečním laserem na 0,20c a brzděna odraznou plachtou u Barnardovy hvězdy (5,95 ly).',
    },
    physicsNote: {
      en: 'External beamed propulsion (non-reactive onboard): 0.03g laser acceleration to 0.20c cruise covers 5.95 ly in 36.2 Earth yr / 35.6 yr crew time — closely matching the novel’s 40-year voyage.',
      cs: 'Externí laserový pohon (bez paliva na palubě): 0,03g zrychlení na 0,20c urazí 5,95 ly za 36,2 r. Země / 35,6 r. posádky — velmi blízko 40letému letu v románu.',
    },
    recommendedClockStart: 2026.0,
    focusSystemId: 'hip-87937',
    ships: [
      {
        id: 'roche-prometheus',
        name: 'Prometheus Lightsail · George & Jill (0.20c)',
        nameCs: 'Plachetnice Prométheus · George a Jill (0,20c)',
        color: '#38bdf8',
        departureYear: 2026.0,
        crewStartAge: 32.0,
        driveConfig: {
          mode: 'accel-cruise',
          accelG: 0.03,
          cruiseC: 0.2,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-87937', stayYears: 0 },
        ],
      },
    ],
    storyEvents: [
      {
        id: 'rw-ev-1',
        title: {
          en: 'Solar Laser Array Ignition (Sol)',
          cs: 'Zážeh slunečního laserového pole (Sol)',
        },
        systemId: 'sol',
        year: 2026.0,
      },
      {
        id: 'rw-ev-2',
        title: {
          en: 'Deceleration Sail Separation & Arrival (Barnard’s Star)',
          cs: 'Oddělení brzdné plachty a přílet (Barnardova hvězda)',
        },
        systemId: 'hip-87937',
        year: 2062.0,
      },
    ],
  },

  {
    id: 'clarke-songs-distant-earth',
    category: 'classic-sf',
    universe: 'Arthur C. Clarke',
    author: 'Arthur C. Clarke',
    year: 1986,
    books: {
      en: 'The Songs of Distant Earth',
      cs: 'Zpěv vzdálené Země (The Songs of Distant Earth)',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/The_Songs_of_Distant_Earth',
    sourceLabel: {
      en: 'Wikipedia — The Songs of Distant Earth',
      cs: 'Wikipedie — Zpěv vzdálené Země (A. C. Clarke)',
    },
    title: {
      en: 'The Songs of Distant Earth — Seedship Magellan (0.20c Ark)',
      cs: 'Zpěv vzdálené Země — Archa Magellan (0,20c)',
    },
    subtitle: {
      en: 'Fleeing the dying Sun in 3600 AD with a million hibernating colonists aboard, the quantum-drive starship Magellan crosses the local neighborhood at 0.20c (Sol → Alpha Centauri → Epsilon Eridani → Beta Hydri).',
      cs: 'Při útěku od umírajícího Slunce v roce 3600 n. l. s milionem hibernujících kolonistů putuje kvantová loď Magellan rychlostí 0,20c místním sektorem (Sol → Alfa Centauri → Epsilon Eridani → Beta Hydri).',
    },
    physicsNote: {
      en: 'Quantum-vacuum field drive (non-reactive) capped at 0.20c due to interstellar dust erosion of the forward ice shield — modeled at 0.10g accel / 0.20c cruise.',
      cs: 'Kvantový vakuový pohon omezený na 0,20c kvůli erozi předního ledového štítu mezihvězdným prachem — modelováno při 0,10g zrychlení / 0,20c přeletu.',
    },
    recommendedClockStart: 3600.0,
    focusSystemId: 'sol',
    ships: [
      {
        id: 'sde-magellan',
        name: 'Magellan · Loren Lorenson (0.20c Quantum Drive)',
        nameCs: 'Magellan · Loren Lorenson (0,20c kvantový pohon)',
        color: '#00f0ff',
        departureYear: 3600.0,
        crewStartAge: 28.0,
        driveConfig: {
          mode: 'accel-cruise',
          accelG: 0.1,
          cruiseC: 0.2,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-71683', stayYears: 2.0 },
          { systemId: 'hip-16537', stayYears: 3.0 },
          { systemId: 'hip-2021', stayYears: 0 },
        ],
      },
    ],
    storyEvents: [
      {
        id: 'sde-ev-1',
        title: {
          en: 'Earth Evacuation — Magellan Launch (Sol)',
          cs: 'Evakuace Země — start archy Magellan (Sol)',
        },
        systemId: 'sol',
        year: 3600.0,
      },
      {
        id: 'sde-ev-2',
        title: {
          en: 'Solar Nova Flash Observed Ahead (Sol)',
          cs: 'Záblesk novy Slunce pozorovaný na trase (Sol)',
        },
        systemId: 'sol',
        year: 3620.0,
      },
    ],
  },

  // =========================================================================
  // MODERN HARD SCI-FI (WEIR, TAYLOR, ROBINSON, LIU CIXIN, CAMERON)
  // =========================================================================
  {
    id: 'project-hail-mary',
    category: 'modern-sf',
    universe: 'Project Hail Mary',
    universeCs: 'Spasitel',
    author: 'Andy Weir',
    year: 2021,
    books: {
      en: 'Project Hail Mary',
      cs: 'Spasitel (Project Hail Mary)',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Project_Hail_Mary',
    sourceLabel: {
      en: 'Wikipedia — Project Hail Mary',
      cs: 'Wikipedie — Spasitel (Andy Weir)',
    },
    title: {
      en: 'Project Hail Mary — Ryland Grace & Rocky (Blip-A)',
      cs: 'Spasitel (Project Hail Mary) — Ryland Grace a Rocky',
    },
    subtitle: {
      en: 'Synchronized multi-ship rendezvous at Tau Ceti: Hail Mary’s 1.5g Astrophage torch from Sol, Rocky’s Blip-A from 40 Eridani (Erid), the Beetle cure probes back to Earth, and Grace’s rescue flight to Erid.',
      cs: 'Synchronizované setkání u Tau Ceti: loď Spasitel (1,5g pohon na astrofágy) od Slunce, Rockyho Blip-A z 40 Eridani, sondy Brouci zpět k Zemi a záchranný let k Eridu.',
    },
    physicsNote: {
      en: 'Exact Astrophage photon-rocket physics (ve = 1.0c): Hail Mary at 1.5g flip covers Sol → Tau Ceti (11.90 ly) in 13.1 yr Earth / 3.86 yr crew proper time — matching the novel’s ~13-yr Earth / ~4-yr ship clocks.',
      cs: 'Přesná fyzika fotonové rakety (ve = 1,0c): Spasitel při 1,5g otočce urazí Sol → Tau Ceti (11,90 ly) za 13,1 r. Země / 3,86 r. palubního času — přesně jako v románu (~13 r. Země / ~4 r. loď).',
    },
    recommendedClockStart: 2025.0,
    focusSystemId: 'hip-8102',
    ships: [
      {
        id: 'phm-hail-mary',
        name: 'Hail Mary · Ryland Grace (1.5g Astrophage)',
        nameCs: 'Spasitel (Hail Mary) · Ryland Grace (1,5g)',
        color: '#00f0ff',
        departureYear: 2025.0,
        crewStartAge: 36.0,
        driveConfig: {
          mode: 'flip',
          accelG: 1.5,
          cruiseC: 0.99,
          driveType: 'reaction',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-8102', stayYears: 0.4 },
          { systemId: 'hip-19849', stayYears: 0 },
        ],
      },
      {
        id: 'phm-blip-a',
        name: 'Blip-A · Rocky (2.1g Eridian Torch)',
        nameCs: 'Blip-A · Rocky (2,1g eridianský pohon)',
        color: '#f59e0b',
        departureYear: 1985.0,
        crewStartAge: 240.0,
        driveConfig: {
          mode: 'flip',
          accelG: 2.1,
          cruiseC: 0.99,
          driveType: 'reaction',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-19849', stayYears: 0 },
          { systemId: 'hip-8102', stayYears: 42.6 },
          { systemId: 'hip-19849', stayYears: 0 },
        ],
      },
      {
        id: 'phm-beetles',
        name: 'Beetles · Taumoeba Data Probes (1.5g)',
        nameCs: 'Brouci · Datové sondy s Taumoebou (1,5g)',
        color: '#00ff88',
        departureYear: 2038.5,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'flip',
          accelG: 1.5,
          cruiseC: 0.99,
          driveType: 'reaction',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-8102', stayYears: 0 },
          { systemId: 'sol', stayYears: 0 },
        ],
      },
    ],
    storyEvents: [
      {
        id: 'phm-ev-1',
        title: {
          en: 'Hail Mary Launch from Solar System (Sol)',
          cs: 'Start lodi Spasitel ze Sluneční soustavy (Sol)',
        },
        systemId: 'sol',
        year: 2025.0,
      },
      {
        id: 'phm-ev-2',
        title: {
          en: 'First Contact: Grace Meets Rocky (Tau Ceti)',
          cs: 'První kontakt: Grace se setkává s Rockym (Tau Ceti)',
        },
        systemId: 'hip-8102',
        year: 2038.2,
      },
      {
        id: 'phm-ev-3',
        title: {
          en: 'Beetles Arrive with Taumoeba Cure (Sol)',
          cs: 'Přílet sond Brouci s lékem Taumoeba na Zemi (Sol)',
        },
        systemId: 'sol',
        year: 2051.6,
      },
    ],
  },

  {
    id: 'cameron-avatar-venture-star',
    category: 'modern-sf',
    universe: 'Avatar',
    author: 'James Cameron & Charles Pellegrino',
    year: 2009,
    books: {
      en: 'Avatar · Activist Survival Guide (ISV Venture Star)',
      cs: 'Avatar — Hvězdolet ISV Venture Star (Alfa Centauri / Pandora)',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Avatar_(2009_film)',
    sourceLabel: {
      en: 'Wikipedia — Avatar & ISV Venture Star Hard-SF Specs',
      cs: 'Wikipedie — Avatar a fyzika lodi ISV Venture Star',
    },
    title: {
      en: 'Avatar — ISV Venture Star Shuttle (Sol ↔ Alpha Centauri)',
      cs: 'Avatar — Hvězdolet ISV Venture Star (Sol ↔ Alfa Centauri)',
    },
    subtitle: {
      en: 'Designed with physicist Charles Pellegrino: RDA’s hybrid laser-sail / antimatter starship ISV Venture Star accelerates at 1.5g to 0.70c, carrying Jake Sully from Earth (2148) to Pandora around Alpha Centauri A (2154).',
      cs: 'Navrženo s fyzikem Charlesem Pellegrinem: hybridní laserovo-antihmotový hvězdolet ISV Venture Star zrychluje 1,5g na 0,70c a dopravuje Jakea Sullyho ze Země (2148) na Pandoru u Alfy Centauri A (2154).',
    },
    physicsNote: {
      en: 'Exact canon kinematics: 1.5g accel → 0.70c cruise → 1.5g antimatter brake over 4.32 ly yields 6.72 yr Earth time / 5.01 yr crew time (matching the film’s 6.75 yr Earth / ~5.7 yr cryo transit from 2148 to 2154!).',
      cs: 'Přesná kanonická kinematika: 1,5g zrychlení → 0,70c přelet → 1,5g brzdění antihmotou na 4,32 ly dává 6,72 r. Země / 5,01 r. palubního času (shoda s 6,75 r. letem 2148 → 2154 ve filmu!).',
    },
    recommendedClockStart: 2148.0,
    focusSystemId: 'hip-71683',
    ships: [
      {
        id: 'ava-venture-star',
        name: 'ISV Venture Star · Jake Sully (1.5g / 0.70c)',
        nameCs: 'ISV Venture Star · Jake Sully (1,5g / 0,70c)',
        color: '#00f0ff',
        departureYear: 2148.0,
        crewStartAge: 22.0,
        driveConfig: {
          mode: 'accel-cruise',
          accelG: 1.5,
          cruiseC: 0.7,
          driveType: 'reaction',
          exhaustVelC: 0.95,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-71683', stayYears: 1.0 }, // Alpha Centauri A (Polyphemus / Pandora)
          { systemId: 'sol', stayYears: 0 },
        ],
      },
      {
        id: 'ava-manifest',
        name: 'ISV Manifest Destiny · RDA Return (1.5g / 0.70c)',
        nameCs: 'ISV Manifest Destiny · Zpáteční linka RDA (1,5g / 0,70c)',
        color: '#f59e0b',
        departureYear: 2149.0,
        crewStartAge: 34.0,
        driveConfig: {
          mode: 'accel-cruise',
          accelG: 1.5,
          cruiseC: 0.7,
          driveType: 'reaction',
          exhaustVelC: 0.95,
        },
        waypoints: [
          { systemId: 'hip-71683', stayYears: 0 },
          { systemId: 'sol', stayYears: 1.0 },
          { systemId: 'hip-71683', stayYears: 0 },
        ],
      },
    ],
    storyEvents: [
      {
        id: 'ava-ev-1',
        title: {
          en: 'ISV Venture Star Laser-Pushed Departure (Sol)',
          cs: 'Laserem urychlený start ISV Venture Star ze Země (Sol)',
        },
        systemId: 'sol',
        year: 2148.0,
      },
      {
        id: 'ava-ev-2',
        title: {
          en: 'Jake Sully Arrives at Pandora (Alpha Centauri A)',
          cs: 'Jake Sully přilétá na Pandoru (Alfa Centauri A)',
        },
        systemId: 'hip-71683',
        year: 2154.7,
      },
    ],
  },

  {
    id: 'robinson-aurora',
    category: 'modern-sf',
    universe: 'Kim Stanley Robinson',
    author: 'Kim Stanley Robinson',
    year: 2015,
    books: {
      en: 'Aurora',
      cs: 'Aurora',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Aurora_(novel)',
    sourceLabel: {
      en: 'Wikipedia — Aurora (novel)',
      cs: 'Wikipedie — Aurora (K. S. Robinson)',
    },
    title: {
      en: 'Aurora — Generation Ship “Ship” (Round-Trip to Tau Ceti)',
      cs: 'Aurora — Generační loď „Ship“ (Tam a zpět k Tau Ceti)',
    },
    subtitle: {
      en: 'Launched in 2545 at 0.10c by a Solar System laser array, the 24-biome generation ship crosses 11.9 ly to Tau Ceti’s moon Aurora — and after ecological collapse, attempts the desperate return voyage to Earth.',
      cs: 'Generační loď s 24 biomy vypuštěná r. 2545 rychlostí 0,10c laserovým paprskem letí 11,9 ly k měsíci Aurora u Tau Ceti — a po ekologické krizi se pokouší o návrat zpět k Zemi.',
    },
    physicsNote: {
      en: 'Low-acceleration laser-sail / nuclear cruise profile (0.01g accel to 0.10c cap): ~129 Earth yr each way (~128.4 yr ship time — minimal dilation at 10%c, highlighting multi-generational ecology).',
      cs: 'Nízkozrychlující laserová plachta / jaderný přelet (0,01g na 0,10c): ~129 let Země jedním směrem (~128,4 r. pro posádku — minimální dilatace při 10%c, generační rozměr mise).',
    },
    recommendedClockStart: 2545.0,
    focusSystemId: 'hip-8102',
    ships: [
      {
        id: 'aurora-ship',
        name: 'Ship · Freya & Devi (0.10c Generation Ship)',
        nameCs: 'Loď „Ship“ · Freya a Devi (0,10c generační loď)',
        color: '#00ff88',
        departureYear: 2545.0,
        crewStartAge: 20.0,
        driveConfig: {
          mode: 'accel-cruise',
          accelG: 0.01,
          cruiseC: 0.1,
          driveType: 'non-reactive',
          exhaustVelC: 0.08,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },
          { systemId: 'hip-8102', stayYears: 5.0 },
          { systemId: 'sol', stayYears: 0 },
        ],
      },
    ],
    storyEvents: [
      {
        id: 'aur-ev-1',
        title: {
          en: 'Generation Ship Launch from Saturn (Sol)',
          cs: 'Start generační lodi od Saturnu (Sol)',
        },
        systemId: 'sol',
        year: 2545.0,
      },
      {
        id: 'aur-ev-2',
        title: {
          en: 'Landing & Prion Discovery on Aurora (Tau Ceti)',
          cs: 'Přistání a objev prionů na měsíci Aurora (Tau Ceti)',
        },
        systemId: 'hip-8102',
        year: 2675.0,
      },
    ],
  },

  {
    id: 'three-body-trisolaris',
    category: 'modern-sf',
    universe: 'Three-Body',
    universeCs: 'Problém tří těles',
    author: 'Liu Cixin',
    authorCs: 'Liou Cch’-sin',
    year: 2008,
    books: {
      en: 'The Three-Body Problem · The Dark Forest',
      cs: 'Problém tří těles · Temný les',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/The_Three-Body_Problem_(novel)',
    sourceLabel: {
      en: 'Wikipedia — The Three-Body Problem',
      cs: 'Wikipedie — Problém tří těles (Liou Cch’-sin)',
    },
    title: {
      en: 'Three-Body — Trisolaran Fleet & 1979/1983 Light-Cone Handshake',
      cs: 'Problém tří těles — Flotila Trisolaris a světelný kužel 1979/1983',
    },
    subtitle: {
      en: 'Inspect the exact 8.64-year round-trip light-cone exchange between Ye Wenjie’s Red Coast Base and Alpha Centauri, followed by the near-light Sophon probe and the 430-year Trisolaran First Fleet (0.01c).',
      cs: 'Prozkoumejte přesnou 8,64letou světelnou výměnu mezi základnou Rudé pobřeží a Alfou Centauri, následovanou sondou Sofon (0,995c) a 430letým letem První flotily Trisolaris (0,01c).',
    },
    physicsNote: {
      en: 'Open the Minkowski 1+1D tab to watch Ye Wenjie’s 1979 radio signal reach Alpha Centauri in 1983.3 and the pacifist warning (“Do Not Answer!”) reach Earth in 1987.7.',
      cs: 'Otevřete záložku Minkowski 1+1D a sledujte signál z r. 1979 dorážející k Alfě Centauri v r. 1983,3 a varování („Neodpovídejte!“) zpět na Zemi v r. 1987,7.',
    },
    recommendedClockStart: 1979.0,
    focusSystemId: 'hip-71683',
    ships: [
      {
        id: 'tbp-sophon',
        name: 'Sophon Probe (0.995c Relativistic)',
        nameCs: 'Sonda Sofon (0,995c relativistická)',
        color: '#00f0ff',
        departureYear: 1988.0,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'constant',
          accelG: 0,
          cruiseC: 0.995,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-71683', stayYears: 0 },
          { systemId: 'sol', stayYears: 0 },
        ],
      },
      {
        id: 'tbp-fleet',
        name: 'Trisolaran First Fleet (0.01c Antimatter)',
        nameCs: 'První flotila Trisolaris (0,01c antihmota)',
        color: '#fb7185',
        departureYear: 1988.0,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'accel-cruise',
          accelG: 0.02,
          cruiseC: 0.01,
          driveType: 'reaction',
          exhaustVelC: 0.08,
        },
        waypoints: [
          { systemId: 'hip-71683', stayYears: 0 },
          { systemId: 'sol', stayYears: 0 },
        ],
      },
    ],
    storyEvents: [
      {
        id: 'tbp-ev-1',
        title: {
          en: 'Ye Wenjie Red Coast Broadcast (Sol)',
          cs: 'Vysílání Jie Wen-ťie ze základny Rudé pobřeží (Sol)',
        },
        systemId: 'sol',
        year: 1979.0,
      },
      {
        id: 'tbp-ev-2',
        title: {
          en: 'Listener 1379 Warning: “Do Not Answer!” (Alpha Cen)',
          cs: 'Varování posluchače 1379: „Neodpovídejte!“ (Alfa Centauri)',
        },
        systemId: 'hip-71683',
        year: 1983.4,
      },
      {
        id: 'tbp-ev-3',
        title: {
          en: 'Earth Reply Lock-On Broadcast (Sol)',
          cs: 'Odpověď ze Země prozrazuje souřadnice (Sol)',
        },
        systemId: 'sol',
        year: 1987.8,
      },
    ],
  },
];

function main() {
  if (!fs.existsSync(CATALOG_PATH)) {
    throw new Error(`Catalogue missing at ${CATALOG_PATH}. Run npm run data first.`);
  }
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const scifiDoc = readJsonIfExists(SCIFI_PATH, {}) || {};
  const systemsById = new Map(catalog.systems.map((s) => [s.id, s]));

  // Build case-insensitive star name & alias lookup so custom voyages can use plain star names!
  const nameToSystemId = new Map();
  const norm = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

  for (const s of catalog.systems) {
    nameToSystemId.set(norm(s.name), s.id);
    if (s.ids?.gl) nameToSystemId.set(norm(s.ids.gl), s.id);
    if (s.ids?.hip) nameToSystemId.set(`hip ${s.ids.hip}`, s.id);
    if (s.ids?.hd) nameToSystemId.set(`hd ${s.ids.hd}`, s.id);
    for (const st of s.stars || []) {
      if (st.name) nameToSystemId.set(norm(st.name), s.id);
    }
  }
  for (const [sysId, entry] of Object.entries(scifiDoc.bySystemId || {})) {
    if (!systemsById.has(sysId)) continue;
    for (const alias of entry.aliases || []) {
      const k = norm(alias);
      if (k && !nameToSystemId.has(k)) nameToSystemId.set(k, sysId);
    }
  }

  const resolveSystemId = (idOrName) => {
    if (!idOrName) return null;
    if (systemsById.has(idOrName)) return idOrName;
    return nameToSystemId.get(norm(idOrName)) || null;
  };

  // Merge built-in canonical presets + user-editable scripts/config/voyages_custom.json
  const customDoc = readJsonIfExists(CUSTOM_VOYAGES_PATH, {}) || {};
  const customPresets = (customDoc.voyages || []).filter((v) => v && !v._example);
  const allPresets = [...VOYAGE_PRESETS, ...customPresets];

  const validated = allPresets.map((rawPreset) => {
    const focusSystemId =
      resolveSystemId(rawPreset.focusSystemId || rawPreset.focusSystem) || 'sol';

    const ships = (rawPreset.ships || []).map((sh) => ({
      ...sh,
      waypoints: (sh.waypoints || []).map((wp) => {
        const resolvedId = resolveSystemId(wp.systemId || wp.system);
        if (!resolvedId) {
          throw new Error(
            `Voyage "${rawPreset.id}" ship "${sh.id}" references unknown star "${wp.systemId || wp.system}"`
          );
        }
        return { systemId: resolvedId, stayYears: Number(wp.stayYears) || 0 };
      }),
    }));

    const storyEvents = (rawPreset.storyEvents || []).map((ev) => {
      const resolvedId = resolveSystemId(ev.systemId || ev.system);
      if (!resolvedId) {
        throw new Error(
          `Voyage "${rawPreset.id}" event "${ev.id}" references unknown star "${ev.systemId || ev.system}"`
        );
      }
      return { ...ev, systemId: resolvedId };
    });

    const preset = {
      ...rawPreset,
      focusSystemId,
      ships,
      storyEvents,
    };
    delete preset.focusSystem;
    delete preset._example;

    const shipSummaries = [];
    for (const sh of preset.ships) {
      const v = planMultiStopVoyage({
        waypoints: sh.waypoints,
        systemsById,
        departureYear: sh.departureYear,
        crewStartAge: sh.crewStartAge,
        driveConfig: sh.driveConfig,
      });
      shipSummaries.push({
        id: sh.id,
        name: sh.name,
        nameCs: sh.nameCs || sh.name,
        routeNames: sh.waypoints.map((w) => systemsById.get(w.systemId).name),
        totalDistanceLy: Number(v.totalDistanceLy.toFixed(2)),
        totalCoordTimeYears: Number(v.totalCoordTimeYears.toFixed(2)),
        totalProperTimeYears: Number(v.totalProperTimeYears.toFixed(2)),
        peakSpeedC: Number(v.peakSpeedC.toFixed(4)),
        peakGamma: Number(v.peakGamma.toFixed(2)),
      });
    }

    return {
      ...preset,
      computedSummary: shipSummaries,
    };
  });

  const nowIso = new Date().toISOString();
  const payload = {
    meta: {
      generatedAt: nowIso.slice(0, 10),
      generatedAtIso: nowIso,
      voyageCount: validated.length,
      customVoyagesCount: customPresets.length,
      totalShipsCount: validated.reduce((s, v) => s + v.ships.length, 0),
    },
    voyages: validated,
  };

  writeJsonAtomic(OUT_PATH, payload, true);
  console.log(
    `[VOYAGES] Wrote ${OUT_PATH}: ${payload.meta.voyageCount} sci-fi voyages (${payload.meta.customVoyagesCount} custom, ${payload.meta.totalShipsCount} ships):`
  );
  for (const v of validated) {
    console.log(`  * [${v.category}] ${v.id} (${v.universe}) -> ${v.ships.length} ship(s)`);
    for (const ss of v.computedSummary) {
      console.log(
        `      - ${ss.name}: ${ss.routeNames.join(' → ')} | ${ss.totalDistanceLy} ly | Δt=${ss.totalCoordTimeYears}y | Δτ=${ss.totalProperTimeYears}y | v_max=${(ss.peakSpeedC * 100).toFixed(2)}%c (γ=${ss.peakGamma})`
      );
    }
  }
}

main();
