# ASTROMETRICS // 3D Stellar Cartography, Exoplanets & Relativistic Route Planner

**Live App:** [https://richardlipka.github.io/Earth-like-planets/](https://richardlipka.github.io/Earth-like-planets/)

An interactive 3D stellar astrometrics, exoplanet & habitable-zone catalogue, sci-fi star atlas, and relativistic flight / causality timeline planner designed for hard sci-fi authors and astrophysics exploration.

Built by unifying and expanding the 3D WebGL/CSS2D star map and relativistic kinematics from [`richardLipka/star-empire`](https://github.com/richardLipka/star-empire) with the Spaceship Astrometrics HUD, empirical stellar calibrations, and NASA Exoplanet / Kopparapu Habitable Zone pipeline from [`richardLipka/H-ZDiagram`](https://github.com/richardLipka/H-ZDiagram).

---

## Key Capabilities

1. **100+ Light-Year 3D Stellar & Exoplanet Catalogue (`public/data/astrometrics_catalog.json`):**
   - **384 confirmed exoplanet host systems** (**628 confirmed planets**, including **100 optimistic / 71 conservative Habitable Zone hosts**) within ~105 ly (plus benchmark habitable-zone hosts up to 135 ly such as **TOI-700** and **K2-18**), mapped to exact 3D Galactic Cartesian coordinates using Hipparcos and ESA Gaia DR3 astrometry.
   - **All 623 naked-eye visible star systems from Earth ($V \le 6.5\text{ mag}$)** within 105 ly, plus all nearby solar neighborhood stars within 35 ly (**1,142 core navigation systems** by default, expandable to **3,494 systems** in Deep Survey mode).
   - **Strictly Real Astronomical Data:** Only confirmed planets from the NASA Exoplanet Archive (`pscomppars`) and the Solar System are displayed. Stars without confirmed exoplanets display only their theoretical **Kopparapu et al. (2014) Circumstellar Habitable Zone** boundaries ($S_{\mathrm{eff}}$ for Recent Venus, Runaway Greenhouse, $1.0\,S_\oplus$ Earth-equivalent flux, Maximum Greenhouse, and Early Mars).
   - **Direct Original-Source Links & Live Sky Imagery:** Every selected star and exoplanet links directly to primary records in **NASA Exoplanet Archive**, **SIMBAD (CfA Harvard)**, **VizieR Hipparcos (`I/311/hip2`) & ESA Gaia DR3 (`I/355/gaiadr3`)**, **NASA ADS** peer-reviewed discovery papers, **Wikipedia (EN / CS)**, **NASA SDO AIA 304 Å** (Sol), and **NASA SkyView DSS2 Red / STScI DSS** optical cutouts.
   - **3D Stellar Space Motion & Velocity Vectors ($\pm 100,000\text{ yr}$):** Uses real 3D Galactic space velocity vectors $(v_x, v_y, v_z)$ from Hipparcos/Gaia proper motions and radial velocities to propagate star positions across millennia, with a toggleable 3D velocity-vector arrow overlay (`Off` / `Full 3D PM+RV` / `All Known`, `+10/+20/+50 kyr` projection horizon).

2. **Whole-Catalogue Sci-Fi Literature & Playable Voyages Library (`public/data/scifi_literature.json`, `public/data/scifi_voyages.json`):**
   - Sweeps **all 3,494 catalogue systems** (`9,352` Bayer/Flamsteed/Gliese/HIP/HD/proper aliases) against Wikipedia, Revelation Space Wiki, Bobiverse Wiki, Halopedia, Memory Alpha, Xenopedia, Dune Wiki, Hyperion/Asimov/Known Space/Honorverse/Mass Effect wikis, and SFE.
   - Maps **214+ real stars** across major Western and Eastern European hard sci-fi universes (including **13 *Revelation Space* star systems**, **18+ *Bobiverse* star systems** plus Sol, Stephen Baxter's ***Xeelee Sequence***, Stanisław Lem, Ivan Yefremov, Strugatsky Brothers, Georgy Martynov, Vladimír Babula, *Halo*, *Alien*, *Dune*, *Known Space*, *Star Trek*, *Hyperion Cantos*, *Foundation*, *Alliance–Union*, *Project Hail Mary*, *Three-Body*, *Tau Zero*), with franchise filtering, alias search, and an on-demand live Wikipedia sweep button on every star.
   - **Playable Sci-Fi Voyages & Character Paths Library (26 bilingual `EN/CS` sublight scenarios, 71 starships):**
     - **Revelation Space (Alastair Reynolds):** Nevil Clavain (*Zodiacal Light* & *Nightshade*), Ilia Volyova & Ana Khouri (*Nostalgia for Infinity*), Tanner Mirabel (*Caledonia*), Irravel Veda (*Hirondelle*), *Voice of Evening*.
     - **Bobiverse (Dennis E. Taylor — 4-Chapter Saga, 26 Ships across 19 Real Stars, `2133–2373`):** Book 1 First Wave Expansion (Bob-1, Riker & Homer, Milo, Mario, Calvin & Goku, Linus, Mulder, Khan), Book 2 Human Exodus & Colony Founding (Howard/Bert/Ernie, Rudy & Edwin, Marcus & Monty, Loki, Mack, Luke, Marvin), Books 2–3 The Others War (Bashful, Hal, Claude, Jacques, Delta Pavonis Fleet, Herschel & Neil's *Bellerophon*, and Icarus & Daedalus's relativistic planet-killing flyby strike on GL 877), and Book 4 *Heaven's River* (Bender, Bob-1's Earth Pilgrimage, *HEAVEN-5* rescue to Eta Leporis, Howard & Bridget).
     - **Xeelee Sequence (Stephen Baxter — 3-Chapter Deep-Time Saga, 11 Ships, `AD 3717 → 104,858+`):** *Timelike Infinity* (GUTship *Cauchy*'s exact 1,557-yr / 112-yr proper-time wormhole loop opening the AD 3829 temporal bridge, *Great Northern*'s AD 3953 *Ring* launch along the real Great Attractor vector, *Starfall*'s Alpha Centauri rebellion, and Jasoft Parz's 500-yr Qax Second Interface), *Resurgence & Core Campaigns* (Michael Poole's *Redemption* core expedition along Sagittarius A*, *Reality Dust*, generation ship *Mayflower II* escaping perpendicular out of the Galactic disk toward the North Galactic Pole, and *Orion Line* survey), and *Raft, Flux & Bolder's Ring* (warship *Constancy of Purpose* chasing a Xeelee nightfighter along the Great Attractor vector before breaching into high-$G$ Universe Beta).
     - **Eastern & Central Europe:** Stanisław Lem (*Return from the Stars — Prometheus*, *The Magellanic Cloud — Gea*), Ivan Yefremov (*Andromeda Nebula — Tantra* 5/6c anameson), Arkady & Boris Strugatsky (*Noon: 22nd Century — Taimyr* & *Tariel*), Georgy Martynov (*Kallisto* 1g/0.634c meson sphere), Vladimír Babula (*Planet of Three Suns / Oceánem světelných roků — Paprsek*).
     - **Classic Hard SF:** Poul Anderson (*Tau Zero — Leonora Christine* runaway 1g flyby vs. planned flip), Robert A. Heinlein (*Time for the Stars — Lewis and Clark*), Ursula K. Le Guin (*Hainish Cycle — NAFAL* ships), Larry Niven (*Known Space* slowboats & ramscoops), Arthur C. Clarke (*Rama II/III*, *The Songs of Distant Earth*), Robert L. Forward (*Rocheworld* lightsail).
     - **Modern Hard SF:** Andy Weir (*Project Hail Mary*), James Cameron & Charles Pellegrino (*Avatar — ISV Venture Star*), Kim Stanley Robinson (*Aurora*), Liu Cixin (*The Three-Body Problem* & 1979/1983 light cones).

3. **Relativistic Flight, Propulsion & 3D Doppler Computer:**
   - Supports **Continuous Acceleration + Midpoint Flip (Brachistochrone)**, **Acceleration $\to$ Cruise Speed Cap $\to$ Brake**, **Constant Cruise Speed ($v/c$)**, and **Relativistic Flyby (no braking)**.
   - Exact cancellation-free hyperbolic kinematics computing Earth coordinate time ($\Delta t$), ship crew proper time ($\Delta\tau$), time dilation factor, crew vs. Earth twin biological age, peak speed $\beta = v/c$, Lorentz factor $\gamma$, braking-flare warning lead time, forward/rear Doppler factors, $550\text{ nm}$ starlight shift, CMB temperature ahead, ISM proton impact energy (MeV), and optional Ackeret relativistic rocket mass ratios $M_0/M_f = \exp(\Delta\eta \, c / v_e)$ alongside non-reactive sci-fi drives.

4. **3D Light-Cone Communication & Multi-Ship Minkowski Timeline Studio:**
   - Solves exact 3D light-cone interception $c(t - t_{\mathrm{emit}}) = |\vec{r}_{\mathrm{ship}}(t) - \vec{r}_{\mathrm{emitter}}|$ and exact **3D relativistic Doppler shifts** (including transverse time-dilation shift) for both Star $\to$ Moving Ship and Moving Ship $\to$ Star transmissions, with a toggleable 3D light-cone sphere.
   - Synchronized multi-ship Gantt timeline, interactive **1+1D Minkowski Space-Time Diagram** with bidirectional light cones and exact 3D interception markers, plus JSON project save/load and Markdown novel-notes export.

5. **Bilingual Interface (EN / CS):**
   - Complete English and Czech localization with collapsible sidebars, workspace presets (`Explore 3D` / `Plan Route` / `Novel Studio`), and spectral/constellation/crew-reach/sci-fi filters.

---

## Development & Periodic Local Database Updates (No LLM Required)

```bash
npm install
npm run dev            # Start local development server
npm test               # Run Vitest suite (relativity, 3D Doppler, light-cone, catalogue integrity)
npm run build          # Production build to dist/
```

All local datasets in `public/data/` can be refreshed periodically directly from official astronomical archives and public MediaWiki APIs via `scripts/updateDatabase.mjs`:

```bash
npm run update-db:check                  # Inspect dataset dates, counts & cache freshness (dry run)
npm run update-db                        # Smart periodic update (auto-refreshes stale caches by TTL)
npm run update-db:planets                # Fast live check for newly confirmed NASA exoplanets only
npm run update-db:scifi                  # Force-refresh Wikipedia & 11+ sci-fi wikis only
npm run update-db:voyages                # Rebuild & validate voyages after editing voyages_custom.json
npm run update-db:force                  # Backup public/data/ and re-download every upstream source live
npm run update-db:offline                # Instant offline rebuild from cache + local config files
```

### Expanding the 3D Star Sphere Radius

Pass `--radius <ly>` to add more distant stars, automatically widen the NASA Exoplanet Archive TAP distance query, re-match all newly included stars against Wikipedia & sci-fi wikis, and automatically scale the 3D Galactic rings, camera limits, and UI slider:

```bash
npm run update-db -- --radius 150                     # Expand sphere to 150 ly (~5,200 systems)
npm run update-db -- --radius 200 --save-config       # Expand to 200 ly and save as default radius
npm run update-db -- --radius 300 --mag-limit 7.5     # Wide 300 ly sphere with cleaner faint-star cutoff
```

### Customizing Data Locally Without Editing Code

Edit plain JSON files in `scripts/config/` and re-run `npm run update-db:offline` (or `npm run update-db`):
- `scripts/config/database.config.json` — default sphere radius, HZ margin, close-volume radius, magnitude cutoff, cache TTLs (`planets: 7d`, `scifi: 30d`, `calibration: 90d`, `stars: 180d`), and upstream URLs.
- `scripts/config/scifi_custom.json` — add custom sci-fi books/films, extra MediaWiki franchises, extra Wikipedia articles to scan, or custom star aliases (by `systemId` or star name).
- `scripts/config/voyages_custom.json` — add custom multi-ship or character voyages using plain star names (`"Sol"`, `"Tau Ceti"`, `"Epsilon Eridani"`), automatically validated against the relativistic physics engine.

---

## Credits & Licences

- **Author:** [Richard Lipka](https://home.zcu.cz/~lipka/) · [KIV — Department of Computer Science and Engineering](https://www.kiv.zcu.cz/), FAV, University of West Bohemia.
- **Code:** MIT License, © 2026 Richard Lipka.
- **Star Data:** Derived from the [HYG Stellar Database](https://github.com/astronexus/HYG-Database) by David Nash (Astronexus), licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), Hipparcos New Reduction (van Leeuwen 2007, VizieR `I/311`), and ESA Gaia DR3 (VizieR `I/355`).
- **Exoplanet Data:** [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/) (`pscomppars` table), operated by Caltech under contract with NASA.
- **Astrophysical Calibrations:** Pecaut & Mamajek (2013, ApJS 208, 9), Flower (1996) / Torres (2010), and Kopparapu et al. (2014, ApJL 787, L29).
