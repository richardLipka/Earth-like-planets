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
   - **3D Stellar Space Motion ($\pm 100,000\text{ yr}$):** Uses real 3D Galactic space velocity vectors $(v_x, v_y, v_z)$ from Hipparcos/Gaia proper motions and radial velocities to propagate star positions and recalculate interstellar distances across millennia.

2. **Whole-Catalogue Sci-Fi Literature & Universe Atlas (`public/data/scifi_literature.json`):**
   - Sweeps **all 3,494 catalogue systems** (`9,352` Bayer/Flamsteed/Gliese/HIP/HD/proper aliases) against Wikipedia, Revelation Space Wiki, Bobiverse Wiki, Halopedia, Memory Alpha, Xenopedia, Dune Wiki, Hyperion/Asimov/Known Space/Honorverse/Mass Effect wikis, and SFE.
   - Maps **214 real stars** across major hard sci-fi universes (including **13 *Revelation Space* star systems**, *Bobiverse*, *Halo*, *Alien*, *Dune*, *Known Space*, *Star Trek*, *Hyperion Cantos*, *Foundation*, *Alliance–Union*, *Project Hail Mary*, *Three-Body*), with franchise filtering, alias search, and an on-demand live Wikipedia sweep button on every star.

3. **Relativistic Flight, Propulsion & 3D Doppler Computer:**
   - Supports **Continuous Acceleration + Midpoint Flip (Brachistochrone)**, **Acceleration $\to$ Cruise Speed Cap $\to$ Brake**, **Constant Cruise Speed ($v/c$)**, and **Relativistic Flyby (no braking)**.
   - Exact cancellation-free hyperbolic kinematics computing Earth coordinate time ($\Delta t$), ship crew proper time ($\Delta\tau$), time dilation factor, crew vs. Earth twin biological age, peak speed $\beta = v/c$, Lorentz factor $\gamma$, braking-flare warning lead time, forward/rear Doppler factors, $550\text{ nm}$ starlight shift, CMB temperature ahead, ISM proton impact energy (MeV), and optional Ackeret relativistic rocket mass ratios $M_0/M_f = \exp(\Delta\eta \, c / v_e)$ alongside non-reactive sci-fi drives.

4. **3D Light-Cone Communication & Multi-Ship Minkowski Timeline Studio:**
   - Solves exact 3D light-cone interception $c(t - t_{\mathrm{emit}}) = |\vec{r}_{\mathrm{ship}}(t) - \vec{r}_{\mathrm{emitter}}|$ and exact **3D relativistic Doppler shifts** (including transverse time-dilation shift) for both Star $\to$ Moving Ship and Moving Ship $\to$ Star transmissions, with a toggleable 3D light-cone sphere.
   - Synchronized multi-ship Gantt timeline, interactive **1+1D Minkowski Space-Time Diagram** with bidirectional light cones and exact 3D interception markers, plus JSON project save/load and Markdown novel-notes export.

5. **Bilingual Interface (EN / CS):**
   - Complete English and Czech localization with collapsible sidebars, workspace presets (`Explore 3D` / `Plan Route` / `Novel Studio`), and spectral/constellation/crew-reach/sci-fi filters.

---

## Development & Reproducible Data Pipelines

```bash
npm install
npm run dev            # Start local development server
npm test               # Run Vitest suite (relativity, 3D Doppler, light-cone, catalogue integrity)
npm run build          # Production build to dist/
```

To rebuild or refresh the astronomical and sci-fi datasets from upstream web archives:

```bash
npm run data           # Rebuild astronomical & sci-fi catalogues from cached sources
npm run data:refresh   # Re-download latest live data from NASA Exoplanet Archive, HYG & wikis
npm run scifi          # Run whole-catalogue Sci-Fi literature sweep only
```

---

## Credits & Licences

- **Author:** [Richard Lipka](https://home.zcu.cz/~lipka/) · [KIV — Department of Computer Science and Engineering](https://www.kiv.zcu.cz/), FAV, University of West Bohemia.
- **Code:** MIT License, © 2026 Richard Lipka.
- **Star Data:** Derived from the [HYG Stellar Database](https://github.com/astronexus/HYG-Database) by David Nash (Astronexus), licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), Hipparcos New Reduction (van Leeuwen 2007, VizieR `I/311`), and ESA Gaia DR3 (VizieR `I/355`).
- **Exoplanet Data:** [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/) (`pscomppars` table), operated by Caltech under contract with NASA.
- **Astrophysical Calibrations:** Pecaut & Mamajek (2013, ApJS 208, 9), Flower (1996) / Torres (2010), and Kopparapu et al. (2014, ApJL 787, L29).
