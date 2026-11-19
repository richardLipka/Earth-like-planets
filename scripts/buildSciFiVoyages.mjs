#!/usr/bin/env node
/**
 * Builds & validates `public/data/scifi_voyages.json` — a library of canonical
 * hard sci-fi character & starship voyages mapped strictly to real star systems
 * in `public/data/astrometrics_catalog.json`, verified against the relativistic
 * voyage physics engine.
 *
 * Usage:
 *   node scripts/buildSciFiVoyages.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planMultiStopVoyage } from '../src/engine/voyagePlanner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'public', 'data', 'astrometrics_catalog.json');
const OUT_PATH = path.join(ROOT, 'public', 'data', 'scifi_voyages.json');

const VOYAGE_PRESETS = [
  {
    id: 'revelation-space-clavain-inhibitor',
    category: 'revelation-space',
    universe: 'Revelation Space',
    author: 'Alastair Reynolds',
    year: 2002,
    books: 'Revelation Space · Redemption Ark · Absolution Gap',
    sourceUrl: 'https://revelationspace.fandom.com/wiki/Nevil_Clavain',
    sourceLabel: 'Revelation Space Wiki — Nevil Clavain & Official Timeline',
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
    focusSystemId: 'hip-16537', // Epsilon Eridani (Yellowstone)
    ships: [
      {
        id: 'rs-clavain-zodiacal',
        name: 'Nevil Clavain · Zodiacal Light (2.5g)',
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
          { systemId: 'hip-86162', stayYears: 0 },   // GJ 687 (Mother Nest — Clavain defects)
          { systemId: 'hip-16537', stayYears: 1.0 }, // Epsilon Eridani (Yellowstone — seizes Zodiacal Light)
          { systemId: 'hip-99240', stayYears: 0.5 }, // Delta Pavonis (Resurgam — 2633 clash & evacuation)
          { systemId: 'hyg-118084', stayYears: 0 },  // p Eridani (Ararat — 2651–2675 colony)
        ],
      },
      {
        id: 'rs-volyova-infinity',
        name: 'Volyova & Khouri · Nostalgia for Infinity (1g)',
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
          { systemId: 'hip-16537', stayYears: 0 },    // Epsilon Eridani (Yellowstone — departs 2546)
          { systemId: 'hip-99240', stayYears: 62.5 }, // Delta Pavonis (Resurgam — Hades crisis until 2633)
          { systemId: 'hyg-118084', stayYears: 24.0 }, // p Eridani (Ararat — 2651–2675 settlement)
          { systemId: 'hip-7981', stayYears: 0 },     // 107 Piscium (Hela — flees Inhibitors to Haldora/Hela)
        ],
      },
      {
        id: 'rs-quaiche-gnostic',
        name: 'Quaiche · Gnostic Ascension (1g)',
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
          { systemId: 'hip-84405', stayYears: 0 }, // Guniibuu / 36 Ophiuchi / Gliese 664 (Chaloupek)
          { systemId: 'hip-7981', stayYears: 0 },  // 107 Piscium (Hela — arrives ~2615)
        ],
      },
    ],
    storyEvents: [
      { id: 'rs-ev-1', title: 'Hades / Cerberus Awakening (Delta Pavonis)', systemId: 'hip-99240', year: 2567.0 },
      { id: 'rs-ev-2', title: 'Clavain Defects from Conjoiners (Gliese 687)', systemId: 'hip-86162', year: 2615.0 },
      { id: 'rs-ev-3', title: 'Evacuation of Resurgam (Delta Pavonis)', systemId: 'hip-99240', year: 2633.0 },
      { id: 'rs-ev-4', title: 'Inhibitor Assault on Ararat (p Eridani)', systemId: 'hyg-118084', year: 2675.0 },
    ],
  },

  {
    id: 'revelation-space-exodus-chasm-city',
    category: 'revelation-space',
    universe: 'Revelation Space',
    author: 'Alastair Reynolds',
    year: 2001,
    books: 'Chasm City · Galactic North · Diamond Dogs, Turquoise Days',
    sourceUrl: 'https://revelationspace.fandom.com/wiki/Timeline',
    sourceLabel: 'Revelation Space Wiki — Official Reynolds Chronology',
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
          { systemId: 'sol', stayYears: 0 },         // Sol (Mars / Phobos Conjoiner escape)
          { systemId: 'hyg-119585', stayYears: 8.0 }, // Ross 248 (Diadem — arrives 2217, Glacial)
          { systemId: 'hip-86162', stayYears: 0 },   // GJ 687 (Mother Nest)
        ],
      },
      {
        id: 'rs-hirondelle',
        name: 'Irravel Veda · Hirondelle (1g)',
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
          { systemId: 'hip-16537', stayYears: 0 },    // Epsilon Eridani (Yellowstone)
          { systemId: 'hyg-118079', stayYears: 1.0 }, // Gl 65 / Luyten 726-8 (repair stop)
          { systemId: 'hip-114046', stayYears: 2.0 }, // Lacaille 9352 (Fand — hostage crisis)
          { systemId: 'hip-57548', stayYears: 0 },    // Ross 128 (Greenfly release)
        ],
      },
      {
        id: 'rs-mirabel-caledonia',
        name: 'Tanner Mirabel · Caledonia (1g)',
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
          { systemId: 'hip-104214', stayYears: 0 }, // 61 Cygni (Sky's Edge)
          { systemId: 'hip-16537', stayYears: 0 },  // Epsilon Eridani (Yellowstone / Chasm City — arr. 2517)
        ],
      },
      {
        id: 'rs-turquoise-voice',
        name: 'Voice of Evening · Turquoise Days (1g)',
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
          { systemId: 'hip-16537', stayYears: 0 }, // Epsilon Eridani (Yellowstone)
          { systemId: 'hip-49908', stayYears: 0 }, // GJ 380 / Groombridge 1618 (Turquoise — arr. 2541)
        ],
      },
    ],
    storyEvents: [
      { id: 'rse-ev-1', title: 'Discovery of Setterholm’s Worms on Diadem (Ross 248)', systemId: 'hyg-119585', year: 2217.0 },
      { id: 'rse-ev-2', title: 'Fand Hostage Crisis (Lacaille 9352)', systemId: 'hip-114046', year: 2378.0 },
      { id: 'rse-ev-3', title: 'Tanner Mirabel Arrives in Chasm City (Epsilon Eridani)', systemId: 'hip-16537', year: 2517.0 },
    ],
  },

  {
    id: 'clarke-rama-odyssey',
    category: 'classic-sf',
    universe: 'Rama',
    author: 'Arthur C. Clarke & Gentry Lee',
    year: 1991,
    books: 'Rama II · The Garden of Rama · Rama Revealed',
    sourceUrl: 'https://en.wikipedia.org/wiki/The_Garden_of_Rama',
    sourceLabel: 'Wikipedia — The Garden of Rama & Rama Revealed',
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
          { systemId: 'sol', stayYears: 0 },       // Sol (2200 departure after Rama II)
          { systemId: 'hip-32349', stayYears: 1.0 }, // Sirius (Raman Node — 1-yr refurbishment)
          { systemId: 'sol', stayYears: 1.0 },     // Sol (embarks 2,000 human colonists as Rama III)
          { systemId: 'hip-8102', stayYears: 0 },  // Tau Ceti (Raman Tetrahedron Node — Rama Revealed)
        ],
      },
    ],
    storyEvents: [
      { id: 'rama-ev-1', title: 'Rama II Departs Solar System (Sol)', systemId: 'sol', year: 2200.0 },
      { id: 'rama-ev-2', title: 'Arrival at Sirius Raman Node (Sirius)', systemId: 'hip-32349', year: 2212.1 },
      { id: 'rama-ev-3', title: 'Raman Colonist Request Broadcast (Sirius → Sol)', systemId: 'hip-32349', year: 2213.0 },
    ],
  },

  {
    id: 'project-hail-mary',
    category: 'modern-sf',
    universe: 'Project Hail Mary',
    author: 'Andy Weir',
    year: 2021,
    books: 'Project Hail Mary',
    sourceUrl: 'https://en.wikipedia.org/wiki/Project_Hail_Mary',
    sourceLabel: 'Wikipedia — Project Hail Mary',
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
    focusSystemId: 'hip-8102', // Tau Ceti
    ships: [
      {
        id: 'phm-hail-mary',
        name: 'Hail Mary · Ryland Grace (1.5g Astrophage)',
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
          { systemId: 'sol', stayYears: 0 },        // Sol (Earth)
          { systemId: 'hip-8102', stayYears: 0.4 }, // Tau Ceti (Astrophage-immune star)
          { systemId: 'hip-19849', stayYears: 0 },  // 40 Eridani (Erid — rescuing Rocky!)
        ],
      },
      {
        id: 'phm-blip-a',
        name: 'Blip-A · Rocky (2.1g Eridian Torch)',
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
          { systemId: 'hip-19849', stayYears: 0 },   // 40 Eridani (Erid)
          { systemId: 'hip-8102', stayYears: 42.6 }, // Tau Ceti (waits decades in orbit until Hail Mary arrives)
          { systemId: 'hip-19849', stayYears: 0 },   // 40 Eridani (returns home with Grace)
        ],
      },
      {
        id: 'phm-beetles',
        name: 'Beetles · Taumoeba Data Probes (1.5g)',
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
          { systemId: 'hip-8102', stayYears: 0 }, // Tau Ceti
          { systemId: 'sol', stayYears: 0 },      // Sol (delivers Astrophage predator to Earth)
        ],
      },
    ],
    storyEvents: [
      { id: 'phm-ev-1', title: 'Hail Mary Launch from Solar System (Sol)', systemId: 'sol', year: 2025.0 },
      { id: 'phm-ev-2', title: 'First Contact: Grace Meets Rocky (Tau Ceti)', systemId: 'hip-8102', year: 2038.2 },
      { id: 'phm-ev-3', title: 'Beetles Arrive with Taumoeba Cure (Sol)', systemId: 'sol', year: 2051.6 },
    ],
  },

  {
    id: 'bobiverse-expansion',
    category: 'modern-sf',
    universe: 'Bobiverse',
    author: 'Dennis E. Taylor',
    year: 2016,
    books: 'We Are Legion (We Are Bob) · For We Are Many',
    sourceUrl: 'https://bobiverse.fandom.com/wiki/Bob',
    sourceLabel: 'Bobiverse Wiki — Bob & Star Systems',
    title: {
      en: 'Bobiverse — First Wave Expansion (Bob-1, Milo, Mario & Bill)',
      cs: 'Bobiverzum — První vlna expanze (Bob-1, Milo, Mario a Bill)',
    },
    subtitle: {
      en: 'Bob-1 escapes Earth aboard HEAVEN-1 to Epsilon Eridani, replicates, and fans out across Delta Eridani (Deltans), 40 Eridani (Vulcan/Romulus), 82 G. Eridani (Poseidon), Epsilon Indi, and Delta Pavonis (Eden).',
      cs: 'Bob-1 uniká ze Země na lodi HEAVEN-1 k Epsilon Eridani, replikuje se a vysílá klony k Delta Eridani (Delťané), 40 Eridani (Vulkán/Romulus), 82 G. Eridani (Poseidon), Epsilon Indi a Delta Pavonis.',
    },
    physicsNote: {
      en: 'Reactionless SURGE drives modeled at 1.5g accel with 0.90c cruise cap (non-reactive). Watch all 4 Von Neumann replicants fan out simultaneously across the Eridanus/Indus sector.',
      cs: 'Nereaktivní pohony SURGE modelované při zrychlení 1,5g a stropu 0,90c. Sledujte současnou expanzi 4 Von Neumannových sond sektorem Eridanu a Indiána.',
    },
    recommendedClockStart: 2133.0,
    focusSystemId: 'hip-16537',
    ships: [
      {
        id: 'bob-1',
        name: 'Bob-1 · HEAVEN-1 (1.5g SURGE)',
        color: '#00f0ff',
        departureYear: 2133.5,
        crewStartAge: 31.0,
        driveConfig: {
          mode: 'accel-cruise',
          accelG: 1.5,
          cruiseC: 0.9,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'sol', stayYears: 0 },        // Sol (FAITH launch 2133)
          { systemId: 'hip-16537', stayYears: 1.5 }, // Epsilon Eridani (Ragnarok — builds first clones)
          { systemId: 'hip-17378', stayYears: 0 },  // Delta Eridani (Rana — uplifts Deltans)
        ],
      },
      {
        id: 'bob-milo',
        name: 'Milo · Explorer (1.5g SURGE)',
        color: '#00ff88',
        departureYear: 2147.0,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'accel-cruise',
          accelG: 1.5,
          cruiseC: 0.9,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-16537', stayYears: 0 }, // Epsilon Eridani
          { systemId: 'hip-19849', stayYears: 0 }, // 40 Eridani / Omicron² Eridani (Vulcan & Romulus)
        ],
      },
      {
        id: 'bob-mario',
        name: 'Mario · Explorer (1.5g SURGE)',
        color: '#f59e0b',
        departureYear: 2147.0,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'accel-cruise',
          accelG: 1.5,
          cruiseC: 0.9,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-16537', stayYears: 0 },  // Epsilon Eridani
          { systemId: 'hip-15510', stayYears: 1.0 }, // 82 G. Eridani (Poseidon ocean world)
          { systemId: 'hip-2021', stayYears: 0 },   // Beta Hydri
        ],
      },
      {
        id: 'bob-bill',
        name: 'Bill · Foundry & Evacuation (1.5g)',
        color: '#c084fc',
        departureYear: 2147.0,
        crewStartAge: 0.0,
        driveConfig: {
          mode: 'accel-cruise',
          accelG: 1.5,
          cruiseC: 0.9,
          driveType: 'non-reactive',
          exhaustVelC: 1.0,
        },
        waypoints: [
          { systemId: 'hip-16537', stayYears: 0 },   // Epsilon Eridani
          { systemId: 'hip-108870', stayYears: 2.0 }, // Epsilon Indi (R&D base)
          { systemId: 'hip-99240', stayYears: 0 },   // Delta Pavonis (Eden / Pav)
        ],
      },
    ],
    storyEvents: [
      { id: 'bob-ev-1', title: 'HEAVEN-1 Emergency Launch from Earth (Sol)', systemId: 'sol', year: 2133.5 },
      { id: 'bob-ev-2', title: 'Battle of Epsilon Eridani vs. Medeiros', systemId: 'hip-16537', year: 2146.0 },
      { id: 'bob-ev-3', title: 'Milo Explores Vulcan & Romulus (40 Eridani)', systemId: 'hip-19849', year: 2154.5 },
    ],
  },

  {
    id: 'robinson-aurora',
    category: 'modern-sf',
    universe: 'Kim Stanley Robinson',
    author: 'Kim Stanley Robinson',
    year: 2015,
    books: 'Aurora',
    sourceUrl: 'https://en.wikipedia.org/wiki/Aurora_(novel)',
    sourceLabel: 'Wikipedia — Aurora (novel)',
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
          { systemId: 'sol', stayYears: 0 },        // Sol (2545 launch)
          { systemId: 'hip-8102', stayYears: 5.0 }, // Tau Ceti (Aurora moon — prion crisis)
          { systemId: 'sol', stayYears: 0 },        // Sol (desperate return voyage)
        ],
      },
    ],
    storyEvents: [
      { id: 'aur-ev-1', title: 'Generation Ship Launch from Saturn (Sol)', systemId: 'sol', year: 2545.0 },
      { id: 'aur-ev-2', title: 'Landing & Prion Discovery on Aurora (Tau Ceti)', systemId: 'hip-8102', year: 2675.0 },
    ],
  },

  {
    id: 'lem-return-from-the-stars',
    category: 'classic-sf',
    universe: 'Stanisław Lem',
    author: 'Stanisław Lem',
    year: 1961,
    books: 'Return from the Stars (Powrót z gwiazd)',
    sourceUrl: 'https://en.wikipedia.org/wiki/Return_from_the_Stars',
    sourceLabel: 'Wikipedia — Return from the Stars',
    title: {
      en: 'Return from the Stars — Hal Bregg’s Prometheus to Fomalhaut',
      cs: 'Návrat z hvězd — Hal Bregg a loď Prométheus k Fomalhautu',
    },
    subtitle: {
      en: 'Stanisław Lem’s iconic twin-paradox classic: astronaut Hal Bregg flies aboard Prometheus to Fomalhaut (25.13 ly) and returns to a radically transformed future Earth.',
      cs: 'Klasika Stanisława Lema o paradoxu dvojčat: kosmonaut Hal Bregg letí lodí Prométheus k Fomalhautu (25,13 ly) a vrací se na radikálně proměněnou Zemi budoucnosti.',
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
          { systemId: 'sol', stayYears: 0 },          // Sol (Earth)
          { systemId: 'hip-113368', stayYears: 1.0 }, // Fomalhaut (25.13 ly)
          { systemId: 'sol', stayYears: 0 },          // Sol (Return to transformed Earth)
        ],
      },
    ],
    storyEvents: [
      { id: 'lem-ev-1', title: 'Prometheus Departure from Earth (Sol)', systemId: 'sol', year: 2055.0 },
      { id: 'lem-ev-2', title: 'Fomalhaut Arrival Telemetry (Fomalhaut)', systemId: 'hip-113368', year: 2081.4 },
    ],
  },

  {
    id: 'three-body-trisolaris',
    category: 'modern-sf',
    universe: 'Three-Body',
    author: 'Liu Cixin',
    year: 2008,
    books: 'The Three-Body Problem · The Dark Forest',
    sourceUrl: 'https://en.wikipedia.org/wiki/The_Three-Body_Problem_(novel)',
    sourceLabel: 'Wikipedia — The Three-Body Problem',
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
          { systemId: 'hip-71683', stayYears: 0 }, // Alpha Centauri (Trisolaris)
          { systemId: 'sol', stayYears: 0 },       // Sol (Earth)
        ],
      },
      {
        id: 'tbp-fleet',
        name: 'Trisolaran First Fleet (0.01c Antimatter)',
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
          { systemId: 'hip-71683', stayYears: 0 }, // Alpha Centauri (Trisolaris)
          { systemId: 'sol', stayYears: 0 },       // Sol (432-year invasion transit)
        ],
      },
    ],
    storyEvents: [
      { id: 'tbp-ev-1', title: 'Ye Wenjie Red Coast Broadcast (Sol)', systemId: 'sol', year: 1979.0 },
      { id: 'tbp-ev-2', title: 'Listener 1379 Warning: “Do Not Answer!” (Alpha Cen)', systemId: 'hip-71683', year: 1983.4 },
      { id: 'tbp-ev-3', title: 'Earth Reply Lock-On Broadcast (Sol)', systemId: 'sol', year: 1987.8 },
    ],
  },

  {
    id: 'forward-rocheworld',
    category: 'classic-sf',
    universe: 'Classic Hard SF',
    author: 'Robert L. Forward',
    year: 1984,
    books: 'Rocheworld (The Flight of the Dragonfly)',
    sourceUrl: 'https://en.wikipedia.org/wiki/Rocheworld',
    sourceLabel: 'Wikipedia — Rocheworld',
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
          { systemId: 'sol', stayYears: 0 },       // Sol
          { systemId: 'hip-87937', stayYears: 0 }, // Barnard's Star (5.95 ly — Rocheworld)
        ],
      },
    ],
    storyEvents: [
      { id: 'rw-ev-1', title: 'Solar Laser Array Ignition (Sol)', systemId: 'sol', year: 2026.0 },
      { id: 'rw-ev-2', title: 'Deceleration Sail Separation & Arrival (Barnard’s Star)', systemId: 'hip-87937', year: 2062.0 },
    ],
  },

  {
    id: 'clarke-songs-distant-earth',
    category: 'classic-sf',
    universe: 'Arthur C. Clarke',
    author: 'Arthur C. Clarke',
    year: 1986,
    books: 'The Songs of Distant Earth',
    sourceUrl: 'https://en.wikipedia.org/wiki/The_Songs_of_Distant_Earth',
    sourceLabel: 'Wikipedia — The Songs of Distant Earth',
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
          { systemId: 'sol', stayYears: 0 },        // Sol (pre-nova Earth evacuation)
          { systemId: 'hip-71683', stayYears: 2.0 }, // Alpha Centauri (Pasadena colony transit)
          { systemId: 'hip-16537', stayYears: 3.0 }, // Epsilon Eridani (ice-shield refit)
          { systemId: 'hip-2021', stayYears: 0 },   // Beta Hydri (frontier colony sector)
        ],
      },
    ],
    storyEvents: [
      { id: 'sde-ev-1', title: 'Earth Evacuation — Magellan Launch (Sol)', systemId: 'sol', year: 3600.0 },
      { id: 'sde-ev-2', title: 'Solar Nova Flash Observed Ahead (Sol)', systemId: 'sol', year: 3620.0 },
    ],
  },
];

function main() {
  if (!fs.existsSync(CATALOG_PATH)) {
    throw new Error(`Catalogue missing at ${CATALOG_PATH}. Run npm run data first.`);
  }
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const systemsById = new Map(catalog.systems.map((s) => [s.id, s]));

  const validated = VOYAGE_PRESETS.map((preset) => {
    const shipSummaries = [];
    for (const sh of preset.ships) {
      for (const wp of sh.waypoints) {
        if (!systemsById.has(wp.systemId)) {
          throw new Error(`Voyage "${preset.id}" ship "${sh.id}" references unknown systemId "${wp.systemId}"`);
        }
      }
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
        routeNames: sh.waypoints.map((w) => systemsById.get(w.systemId).name),
        totalDistanceLy: Number(v.totalDistanceLy.toFixed(2)),
        totalCoordTimeYears: Number(v.totalCoordTimeYears.toFixed(2)),
        totalProperTimeYears: Number(v.totalProperTimeYears.toFixed(2)),
        peakSpeedC: Number(v.peakSpeedC.toFixed(4)),
        peakGamma: Number(v.peakGamma.toFixed(2)),
      });
    }

    for (const ev of preset.storyEvents || []) {
      if (!systemsById.has(ev.systemId)) {
        throw new Error(`Voyage "${preset.id}" event "${ev.id}" references unknown systemId "${ev.systemId}"`);
      }
    }

    return {
      ...preset,
      computedSummary: shipSummaries,
    };
  });

  const payload = {
    meta: {
      generatedAt: new Date().toISOString().slice(0, 10),
      voyageCount: validated.length,
      totalShipsCount: validated.reduce((s, v) => s + v.ships.length, 0),
    },
    voyages: validated,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`[VOYAGES] Wrote ${OUT_PATH}: ${payload.meta.voyageCount} canonical sci-fi voyages (${payload.meta.totalShipsCount} ships):`);
  for (const v of validated) {
    console.log(`  * ${v.id} (${v.universe}) -> ${v.ships.length} ship(s)`);
    for (const ss of v.computedSummary) {
      console.log(`      - ${ss.name}: ${ss.routeNames.join(' → ')} | ${ss.totalDistanceLy} ly | Δt=${ss.totalCoordTimeYears}y | Δτ=${ss.totalProperTimeYears}y | v_max=${(ss.peakSpeedC * 100).toFixed(2)}%c (γ=${ss.peakGamma})`);
    }
  }
}

main();
