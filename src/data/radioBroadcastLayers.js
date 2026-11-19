/**
 * Real-History Earth Expanding Radio / TV Broadcast Shells & Directed METI Beams
 *
 * Reference epoch: 2026 CE (100-year broadcast horizon ~ 1926 → 100 ly radius;
 * two-way reply horizon ~ 50 ly, where a civilization hearing Earth's 1926
 * signals could already have beamed a light-speed reply back to Earth by 2026).
 *
 * Every directed METI target maps strictly to a real catalogued star in
 * `public/data/astrometrics_catalog.json`.
 */

export const RADIO_REFERENCE_YEAR = 2026;

export const RADIO_SHELL_LAYERS = [
  {
    id: 'layer-100',
    radiusLy: 100,
    innerRadiusLy: 80,
    yearStart: 1926,
    yearEnd: 1946,
    color: '#38bdf8',
    isTwoWayHorizon: false,
    badge: { en: '100 ly · ~1926', cs: '100 ly · ~1926' },
    title: {
      en: 'Dawn of Broadcast Radio & First TV (1926–1946)',
      cs: 'Úsvit rozhlasu a první televize (1926–1946)',
    },
    summary: {
      en: 'Outer leakage frontier (~80–100 ly): high-frequency VHF television tests, commercial network radio, and WWII early-warning radars escaping Earth’s ionosphere.',
      cs: 'Vnější hranice úniku (~80–100 ly): první vysokofrekvenční VKV televizní testy, rozhlasové sítě a vojenské radary 2. světové války pronikající ionosférou.',
    },
    broadcasts: [
      {
        year: 1926,
        type: 'tv',
        title: {
          en: 'John Logie Baird’s First Live TV & NBC/BBC Radio Networks',
          cs: 'První živý TV přenos J. L. Bairda a rozhlasové sítě BBC/NBC',
        },
        detail: {
          en: 'First mechanical TV demonstrations & regular national radio broadcasts (wavefront ~100 ly).',
          cs: 'První demonstrace televize a pravidelné národní rozhlasové vysílání (čelo vlny ~100 ly).',
        },
      },
      {
        year: 1936,
        type: 'tv',
        title: {
          en: '1936 Berlin Olympic Games — First High-Power VHF TV Broadcast',
          cs: 'Olympijské hry Berlín 1936 — první silný VKV televizní přenos',
        },
        detail: {
          en: 'First high-power VHF television signal strong enough to punch cleanly through the ionosphere (featured in Carl Sagan’s Contact, ~90 ly out).',
          cs: 'První silný VKV TV signál pronikající čistě ionosférou (proslavený v Saganově Kontaktu, ~90 ly daleko).',
        },
      },
      {
        year: 1938,
        type: 'radio',
        title: {
          en: 'Orson Welles — “The War of the Worlds” (CBS Radio)',
          cs: 'Orson Welles — „Válka světů“ (CBS Radio)',
        },
        detail: {
          en: 'Mercury Theatre’s famous Halloween Martian-invasion radio drama (~88 ly wavefront).',
          cs: 'Slavná halloweenská rozhlasová hra o invazi z Marsu (~88 ly od Slunce).',
        },
      },
      {
        year: 1940,
        type: 'space',
        title: {
          en: 'Chain Home & WWII High-Power Coastal Radars',
          cs: 'Vysokovýkonné vojenské radary Chain Home (2. sv. válka)',
        },
        detail: {
          en: 'Megawatt-class radar pulses far stronger than civilian radio, expanding ~81–86 ly outward.',
          cs: 'Megawattové radarové pulsy řádově silnější než civilní rozhlas (~81–86 ly daleko).',
        },
      },
    ],
  },
  {
    id: 'layer-80',
    radiusLy: 80,
    innerRadiusLy: 60,
    yearStart: 1946,
    yearEnd: 1966,
    color: '#60a5fa',
    isTwoWayHorizon: false,
    badge: { en: '80 ly · ~1946', cs: '80 ly · ~1946' },
    title: {
      en: 'Golden Age of VHF TV & Space Age Dawn (1946–1966)',
      cs: 'Zlatý věk VKV televize a úsvit kosmonautiky (1946–1966)',
    },
    summary: {
      en: 'Booming global VHF television transmitters, Eurovision, Czechoslovak TV (ČST), Sputnik 1 orbital beeps, and early Cold War BMEWS ballistic-missile radars (~60–80 ly).',
      cs: 'Rozmach globální VKV televize, Eurovize, Československé televize (ČST), pípání Sputniku 1 z oběžné dráhy a raných kosmických radarů (~60–80 ly).',
    },
    broadcasts: [
      {
        year: 1951,
        type: 'tv',
        title: {
          en: '“I Love Lucy” & Mass Network Television Boom',
          cs: '„I Love Lucy“ a nástup masové televizní éry',
        },
        detail: {
          en: 'Iconic post-war US television sitcoms broadcast across thousands of VHF transmitters (~75 ly).',
          cs: 'Ikonické poválečné televizní pořady šířené tisíci VKV vysílači (~75 ly).',
        },
      },
      {
        year: 1953,
        type: 'tv',
        title: {
          en: 'Coronation of Elizabeth II, ČST Prague (1953) & Eurovision (1954)',
          cs: 'Korunovace Alžběty II., start ČST v Praze (1953) a Eurovize (1954)',
        },
        detail: {
          en: 'First pan-European live television relays and launch of Czechoslovak Television (~72–73 ly).',
          cs: 'První celoevropské živé televizní přenosy a zahájení vysílání ČST (~72–73 ly).',
        },
      },
      {
        year: 1957,
        type: 'space',
        title: {
          en: 'Sputnik 1 (20 & 40 MHz) & Yuri Gagarin’s “Poyekhali!” (1961)',
          cs: 'Sputnik 1 (20 a 40 MHz) a Gagarinovo „Pojechali!“ (1961)',
        },
        detail: {
          en: 'Humanity’s first artificial satellite telemetry (~69 ly) and first human orbital voice link (~65 ly).',
          cs: 'Telemetrie první umělé družice (~69 ly) a první lidský hlas z oběžné dráhy (~65 ly).',
        },
      },
      {
        year: 1963,
        type: 'tv',
        title: {
          en: '“Doctor Who” Premiere (1963) & The Beatles on Ed Sullivan (1964)',
          cs: 'Premiéra „Doctor Who“ (1963) a The Beatles v Ed Sullivan Show (1964)',
        },
        detail: {
          en: 'Global pop-culture and classic sci-fi broadcasts passing stars ~62–63 ly from Sol.',
          cs: 'Globální popkulturní a sci-fi milníky právě míjející hvězdy ~62–63 ly od Slunce.',
        },
      },
    ],
  },
  {
    id: 'layer-60',
    radiusLy: 60,
    innerRadiusLy: 50,
    yearStart: 1966,
    yearEnd: 1976,
    color: '#818cf8',
    isTwoWayHorizon: false,
    badge: { en: '60 ly · ~1966', cs: '60 ly · ~1966' },
    title: {
      en: 'Apollo Moon Landings, Star Trek & Arecibo (1966–1976)',
      cs: 'Přistání Apolla na Měsíci, Star Trek a Arecibo (1966–1976)',
    },
    summary: {
      en: 'Peak analog broadcast era (~50–60 ly): Star Trek, Apollo 11 lunar television, Monty Python, and the 1974 Arecibo Message.',
      cs: 'Vrchol analogové éry (~50–60 ly): Star Trek, televizní přenos Apolla 11 z Měsíce, Monty Python a zpráva z Areciba (1974).',
    },
    broadcasts: [
      {
        year: 1966,
        type: 'tv',
        title: {
          en: '“Star Trek” (Original Series) Television Premiere',
          cs: 'Televizní premiéra seriálu „Star Trek“ (TOS)',
        },
        detail: {
          en: 'Gene Roddenberry’s vision of interstellar exploration now crossing ~60 ly.',
          cs: 'Vize mezihvězdného průzkumu Gena Roddenberryho právě protíná hranici ~60 ly.',
        },
      },
      {
        year: 1969,
        type: 'space',
        title: {
          en: 'Apollo 11 Moon Landing — S-Band Lunar TV & Radio',
          cs: 'Přistání Apolla 11 na Měsíci — lunární TV a S-pásmo',
        },
        detail: {
          en: 'Neil Armstrong’s first steps beamed live to 650 million viewers (~57 ly wavefront).',
          cs: 'První kroky Neila Armstronga přenášené živě pro 650 milionů diváků (~57 ly daleko).',
        },
      },
      {
        year: 1974,
        type: 'meti',
        title: {
          en: 'The Arecibo Message (2380 MHz, 3 TW EIRP toward M13)',
          cs: 'Zpráva z Areciba (2380 MHz, směr kulová hvězdokupa M13)',
        },
        detail: {
          en: 'Frank Drake & Carl Sagan’s 1,679-bit pictorial broadcast — humanity’s most famous deliberate interstellar message (~52 ly out).',
          cs: '1679bitová obrazová zpráva F. Drakea a C. Sagana — nejslavnější záměrný mezihvězdný signál (~52 ly daleko).',
        },
      },
    ],
  },
  {
    id: 'layer-50',
    radiusLy: 50,
    innerRadiusLy: 30,
    yearStart: 1976,
    yearEnd: 1996,
    color: '#00ff88',
    isTwoWayHorizon: true,
    badge: { en: '50 ly · 2-Way Reply ⇄', cs: '50 ly · 2-směrná odezva ⇄' },
    title: {
      en: 'Two-Way Reply Horizon (≤50 ly) · Cosmos, MTV & TNG (1976–1996)',
      cs: 'Horizont obousměrné odezvy (≤50 ly) · Cosmos, MTV a TNG (1976–1996)',
    },
    summary: {
      en: 'CRITICAL SETI BOUNDARY (≤50 ly): Any civilization inside this emerald sphere that heard Earth’s 1926 radio dawn has ALREADY had enough time for a light-speed reply to reach Earth by 2026! Contains 41 confirmed HZ host systems (Proxima b, TRAPPIST-1, Teegarden’s Star, LHS 1140, Ross 128).',
      cs: 'KLÍČOVÁ HRANICE SETI (≤50 ly): Každá civilizace uvnitř této smaragdové sféry, která zachytila naše vysílání z r. 1926, již stihla poslat světelnou odpověď zpět na Zemi do r. 2026! Obsahuje 41 potvrzených HZ soustav (Proxima b, TRAPPIST-1, Teegardenova hvězda, LHS 1140, Ross 128).',
    },
    broadcasts: [
      {
        year: 1977,
        type: 'space',
        title: {
          en: 'Voyager 1 & 2 Deep Space Network Telemetry & Star Wars Era',
          cs: 'Telemetrie sond Voyager 1 a 2 (DSN) a éra Star Wars',
        },
        detail: {
          en: 'High-gain X/S-band DSN commands beaming into the outer solar system and beyond (~49 ly).',
          cs: 'Směrové povely sítě Deep Space Network vysílané k vnějším planetám a dál (~49 ly).',
        },
      },
      {
        year: 1980,
        type: 'tv',
        title: {
          en: 'Carl Sagan’s “Cosmos” (1980) & MTV Launch (1981)',
          cs: '„Kosmos“ Carla Sagana (1980) a start MTV (1981)',
        },
        detail: {
          en: 'Passing TRAPPIST-1 (40.5 ly) and approaching 47 Ursae Majoris (~45–46 ly).',
          cs: 'Signály míjejí TRAPPIST-1 (40,5 ly) a blíží se ke 47 Ursae Majoris (~45–46 ly).',
        },
      },
      {
        year: 1985,
        type: 'tv',
        title: {
          en: 'Live Aid Global Broadcast (1985) & “Star Trek: TNG” (1987)',
          cs: 'Globální koncert Live Aid (1985) a „Star Trek: Nová generace“ (1987)',
        },
        detail: {
          en: '1.9 billion viewers on Earth — wavefront right at TRAPPIST-1 & 55 Cancri (~39–41 ly)!',
          cs: '1,9 miliardy diváků na Zemi — čelo vlny právě doráží k TRAPPIST-1 a 55 Cancri (~39–41 ly)!',
        },
      },
      {
        year: 1989,
        type: 'tv',
        title: {
          en: 'Fall of the Berlin Wall (1989), “The Simpsons” & “The X-Files” (1993)',
          cs: 'Pád Berlínské zdi / Sametová revoluce (1989), „Simpsonovi“ a „Akta X“ (1993)',
        },
        detail: {
          en: 'Analog UHF/VHF cultural peak passing stars ~33–37 ly from Earth (Pollux, AU Mic).',
          cs: 'Vrchol analogového UHF/VKV vysílání míjející hvězdy ~33–37 ly od Země.',
        },
      },
    ],
  },
  {
    id: 'layer-30',
    radiusLy: 30,
    innerRadiusLy: 15,
    yearStart: 1996,
    yearEnd: 2011,
    color: '#f59e0b',
    isTwoWayHorizon: false,
    badge: { en: '30 ly · ~1996', cs: '30 ly · ~1996' },
    title: {
      en: 'Satellite TV, Cosmic Call & Planetary Radar (1996–2011)',
      cs: 'Satelitní TV, Cosmic Call a planetární radary (1996–2011)',
    },
    summary: {
      en: 'Late analog / early digital transition (~15–30 ly): Friends, Babylon 5, Stargate SG-1, plus deliberate high-power Evpatoria METI beams (Cosmic Call 1 & 2, AMFE).',
      cs: 'Pozdní analogová a raná digitální éra (~15–30 ly): Přátelé, Babylon 5, Hvězdná brána a silné směrové METI přenosy z Jevpatorije (Cosmic Call 1 a 2, AMFE).',
    },
    broadcasts: [
      {
        year: 1996,
        type: 'tv',
        title: {
          en: '“Friends”, “Babylon 5”, “Stargate SG-1” & Pathfinder on Mars (1997)',
          cs: '„Přátelé“, „Babylon 5“, „Hvězdná brána“ a Mars Pathfinder (1997)',
        },
        detail: {
          en: 'Crossing Vega, Fomalhaut, Beta Hydri & Delta Eridani (~25–30 ly from Sol).',
          cs: 'Vlna protíná Vegu, Fomalhaut, Beta Hydri a Delta Eridani (~25–30 ly od Slunce).',
        },
      },
      {
        year: 1999,
        type: 'meti',
        title: {
          en: 'Cosmic Call 1 (1999) & Cosmic Call 2 (2003) — Evpatoria RT-70',
          cs: 'Cosmic Call 1 (1999) a Cosmic Call 2 (2003) — Jevpatorija RT-70',
        },
        detail: {
          en: 'Targeted 150 kW planetary-radar messages beamed to 16 Cygni, 55 Cancri & 47 UMa (~23–27 ly out).',
          cs: 'Směrové 150kW radarové zprávy vyslané k 16 Cygni, 55 Cancri a 47 UMa (~23–27 ly daleko).',
        },
      },
      {
        year: 2008,
        type: 'meti',
        title: {
          en: '“Across the Universe” (NASA to Polaris) & AMFE to Gliese 581 (2008)',
          cs: '„Across the Universe“ (NASA k Polárce) a AMFE ke Gliese 581 (2008)',
        },
        detail: {
          en: 'AMFE beam is ~18 ly out — arriving at Gliese 581 (20.3 ly) in early 2029!',
          cs: 'Signál AMFE je ~18 ly daleko — k soustavě Gliese 581 (20,3 ly) dorazí začátkem r. 2029!',
        },
      },
    ],
  },
  {
    id: 'layer-15',
    radiusLy: 15,
    innerRadiusLy: 0,
    yearStart: 2011,
    yearEnd: 2026,
    color: '#c084fc',
    isTwoWayHorizon: false,
    badge: { en: '15 ly · ~2011', cs: '15 ly · ~2011' },
    title: {
      en: 'HD Digital Era, Radio Quieting & Sónar Calling (2011–2026)',
      cs: 'HD digitální éra, rádiové ztišení a Sónar Calling (2011–2026)',
    },
    summary: {
      en: 'Inner solar neighborhood (≤15 ly): Earth’s accidental TV leakage drops sharply as fiber, cable & streaming replace megawatt analog towers — while directed METI beams & DSN radars remain bright.',
      cs: 'Vnitřní okolí Slunce (≤15 ly): nechtěný únik TV signálu klesá díky optice a streamování, zatímco směrové METI paprsky a radary DSN září dál.',
    },
    broadcasts: [
      {
        year: 2012,
        type: 'space',
        title: {
          en: 'Curiosity Mars Landing, Higgs Boson & “Game of Thrones” / “Breaking Bad”',
          cs: 'Přistání Curiosity na Marsu, Higgsův boson a „Hra o trůny“ / „Perníkový táta“',
        },
        detail: {
          en: 'Wavefront (~14 ly) has already swept past Alpha Centauri, Barnard’s Star, Sirius, Tau Ceti & Teegarden’s Star.',
          cs: 'Čelo vlny (~14 ly) už minulo Alfu Centauri, Barnardovu hvězdu, Sirius, Tau Ceti a Teegardenovu hvězdu.',
        },
      },
      {
        year: 2017,
        type: 'meti',
        title: {
          en: 'Sónar Calling GJ 273b (EISCAT Tromsø → Luyten’s Star)',
          cs: 'Sónar Calling GJ 273b (radar EISCAT Tromsø → Luytenova hvězda)',
        },
        detail: {
          en: 'Mathematical & musical tutorials beamed at 929 MHz toward Luyten’s Star (12.4 ly) — arriving in 2030!',
          cs: 'Matematické a hudební záznamy vyslané na 929 MHz k Luytenově hvězdě (12,4 ly) — přílet r. 2030!',
        },
      },
      {
        year: 2022,
        type: 'space',
        title: {
          en: 'JWST First Deep Field & Exoplanet Spectra Era (2022–2026)',
          cs: 'První snímky JWST a éra spektroskopie exoplanet (2022–2026)',
        },
        detail: {
          en: 'Latest DSN & satellite broadcasts just reaching Alpha/Proxima Centauri (~4.3 ly)!',
          cs: 'Nejnovější vysílání DSN a družic právě doráží k Alfě a Proximě Centauri (~4,3 ly)!',
        },
      },
    ],
  },
];

/**
 * Real historically transmitted directed interstellar METI beams anchored
 * strictly to verified star IDs in `public/data/astrometrics_catalog.json`.
 */
export const METI_BEAMS = [
  {
    id: 'meti-sonar-gj273',
    name: {
      en: 'Sónar Calling GJ 273b',
      cs: 'Sónar Calling GJ 273b',
    },
    targetSystemId: 'hip-36208', // Luyten's Star (12.40 ly)
    transmitYear: 2017.8,
    facility: 'EISCAT 929 MHz Radar (Tromsø, Norway)',
    color: '#00ff88',
    note: {
      en: '33 musical pieces + scientific tutorial beamed to super-Earth GJ 273b; earliest possible reply ~2042.',
      cs: '33 hudebních skladeb a vědecký úvod vyslaný k super-Zemi GJ 273b; nejdřívější možná odpověď ~2042.',
    },
  },
  {
    id: 'meti-amfe-gj581',
    name: {
      en: 'A Message From Earth (AMFE) & Hello From Earth',
      cs: 'A Message From Earth (AMFE) a Hello From Earth',
    },
    targetSystemId: 'hip-74995', // GJ 581 (20.27 ly)
    transmitYear: 2008.8,
    facility: 'Yevpatoria RT-70 (5.01 GHz) & Canberra DSS-43',
    color: '#00f0ff',
    note: {
      en: '501 digital messages sent to Gliese 581 (20.3 ly) — arrives ~2029, earliest reply ~2049!',
      cs: '501 digitálních zpráv vyslaných ke Gliese 581 (20,3 ly) — dorazí ~2029, nejdřívější odpověď ~2049!',
    },
  },
  {
    id: 'meti-cc2-55cnc',
    name: {
      en: 'Cosmic Call 2 — 55 Cancri',
      cs: 'Cosmic Call 2 — 55 Cancri (Copernicus)',
    },
    targetSystemId: 'hip-43587', // Copernicus / 55 Cancri (40.25 ly)
    transmitYear: 2003.5,
    facility: 'Yevpatoria RT-70 Planetary Radar',
    color: '#f59e0b',
    note: {
      en: 'Bilingual Dutil–Dumas interstellar Rosetta Stone sent to the 5-planet system 55 Cancri; arrives ~2044.',
      cs: 'Mezihvězdná Rosettská deska Dutil–Dumas vyslaná k pětiplanetární soustavě 55 Cancri; přílet ~2044.',
    },
  },
  {
    id: 'meti-tam-47uma',
    name: {
      en: 'Teen Age Message (2001) & Cosmic Call 2 — 47 UMa',
      cs: 'Teen Age Message (2001) a Cosmic Call 2 — 47 UMa',
    },
    targetSystemId: 'hip-53721', // Chalawan / 47 Ursae Majoris (45.87 ly)
    transmitYear: 2001.7,
    facility: 'Yevpatoria RT-70 Planetary Radar',
    color: '#c084fc',
    note: {
      en: 'Theremin concert + digital message beamed to solar-analog system 47 Ursae Majoris; arrives ~2047.',
      cs: 'Koncert na theremin a digitální zpráva vyslaná ke slunečnímu dvojčeti 47 UMa; přílet ~2047.',
    },
  },
  {
    id: 'meti-cc1-16cyg',
    name: {
      en: 'Cosmic Call 1 — 16 Cygni',
      cs: 'Cosmic Call 1 — 16 Cygni',
    },
    targetSystemId: 'hip-96895', // 16 Cygni (68.75 ly)
    transmitYear: 1999.4,
    facility: 'Yevpatoria RT-70 Planetary Radar',
    color: '#38bdf8',
    note: {
      en: 'First Evpatoria METI message targeting the triple solar-analog system 16 Cygni (68.8 ly); arrives ~2068.',
      cs: 'První jevpatorijský METI signál mířící k trojhvězdě 16 Cygni (68,8 ly); přílet ~2068.',
    },
  },
];
