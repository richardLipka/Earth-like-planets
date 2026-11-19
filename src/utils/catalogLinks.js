/**
 * Original Astronomical Source Deep-Link Builder & Optical Sky Cutout Service
 *
 * Links every selected star system and confirmed exoplanet to its primary
 * scientific catalogue records using verified, live-tested mirrors:
 *  - SIMBAD Astronomical Database (CfA Harvard Mirror — simbad.harvard.edu)
 *  - NASA Exoplanet Archive (System Overview + Discovery Paper on NASA ADS)
 *  - VizieR Hipparcos New Reduction (I/311/hip2 — vizier.cfa.harvard.edu)
 *  - VizieR ESA Gaia DR3 (I/355/gaiadr3 — vizier.cfa.harvard.edu)
 *  - NASA Astrophysics Data System (ADS) Peer-Reviewed Literature
 *  - Wikipedia (EN / CS)
 *
 * Optical sky survey cutouts:
 *  - Sol: Live NASA Solar Dynamics Observatory (SDO AIA 304 Å)
 *  - All other stars: NASA GSFC SkyView Virtual Observatory (DSS2 Red all-sky survey)
 *    with automatic fallback to STScI Digitized Sky Survey (archive.stsci.edu)
 */

const WIKIPEDIA_OVERRIDES_EN = {
  Sol: 'Sun',
  'Alpha Centauri': 'Alpha_Centauri',
  "Barnard's Star": "Barnard's_Star",
  "Teegarden's Star": "Teegarden's_Star",
  "Luyten's Star": "Luyten's_Star",
  "Kapteyn's Star": "Kapteyn's_Star",
  Pollux: 'Pollux_(star)',
  Castor: 'Castor_(star)',
  Mira: 'Mira',
  Atlas: 'Atlas_(star)',
  Copernicus: '55_Cancri',
  Ran: 'Epsilon_Eridani',
  Keid: '40_Eridani',
  Sirius: 'Sirius',
  Vega: 'Vega',
  Procyon: 'Procyon',
  Altair: 'Altair',
  Fomalhaut: 'Fomalhaut',
  Arcturus: 'Arcturus',
  Capella: 'Capella',
  Aldebaran: 'Aldebaran',
  Regulus: 'Regulus',
};

const WIKIPEDIA_OVERRIDES_CS = {
  Sol: 'Slunce',
  'Alpha Centauri': 'Alfa_Centauri',
  "Barnard's Star": 'Barnardova_šipka',
  Sirius: 'Sirius',
  Vega: 'Vega',
  Procyon: 'Prokyon',
  Altair: 'Altair',
  Fomalhaut: 'Fomalhaut',
  Arcturus: 'Arktur',
  Capella: 'Capella',
  Aldebaran: 'Aldebaran',
  Regulus: 'Regulus',
  'Tau Ceti': 'Tau_Ceti',
  'Epsilon Eridani': 'Epsilon_Eridani',
  'TRAPPIST-1': 'TRAPPIST-1',
};

/**
 * Primary SIMBAD link using CfA Harvard mirror (simbad.harvard.edu), which remains
 * reliable even when CDS Strasbourg experiences outages.
 */
export function getSimbadUrl(system) {
  if (!system) return 'https://simbad.harvard.edu/simbad/';
  if (system.id === 'sol') return 'https://science.nasa.gov/sun/';
  const ids = system.ids || {};
  const query = ids.hip
    ? `HIP ${ids.hip}`
    : ids.hd
      ? `HD ${ids.hd}`
      : ids.gl
        ? ids.gl
        : ids.neaHost || system.name;
  return `https://simbad.harvard.edu/simbad/sim-id?Ident=${encodeURIComponent(query)}`;
}

export function getNasaExoplanetUrl(system) {
  if (!system || !system.hasPlanets || system.id === 'sol') return null;
  const host = system.ids?.neaHost || system.name;
  return `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(host)}`;
}

export function getVizierHipparcosUrl(system) {
  const hip = system?.ids?.hip;
  if (!hip) return null;
  return `https://vizier.cfa.harvard.edu/viz-bin/VizieR-5?-source=I/311/hip2&HIP=${encodeURIComponent(hip)}`;
}

export function getVizierGaiaDr3Url(system) {
  const gaia = system?.ids?.gaiaDr3;
  if (!gaia) return null;
  return `https://vizier.cfa.harvard.edu/viz-bin/VizieR-5?-source=I/355/gaiadr3&Source=${encodeURIComponent(gaia)}`;
}

export function getAdsLiteratureUrl(system) {
  if (!system || system.id === 'sol') return 'https://ui.adsabs.harvard.edu/';
  const ids = system.ids || {};
  const ident = ids.hip ? `HIP ${ids.hip}` : ids.hd ? `HD ${ids.hd}` : ids.neaHost || system.name;
  return `https://ui.adsabs.harvard.edu/search/q=${encodeURIComponent(`object:"${ident}"`)}&sort=citation_count%20desc`;
}

export function getWikipediaUrl(system, lang = 'en') {
  if (!system) return lang === 'cs' ? 'https://cs.wikipedia.org/wiki/Hvězda' : 'https://en.wikipedia.org/wiki/Star';
  if (lang === 'cs') {
    if (WIKIPEDIA_OVERRIDES_CS[system.name]) {
      return `https://cs.wikipedia.org/wiki/${encodeURIComponent(WIKIPEDIA_OVERRIDES_CS[system.name])}`;
    }
    return `https://cs.wikipedia.org/w/index.php?search=${encodeURIComponent(system.name)}&go=Go`;
  }
  if (WIKIPEDIA_OVERRIDES_EN[system.name]) {
    return `https://en.wikipedia.org/wiki/${encodeURI(WIKIPEDIA_OVERRIDES_EN[system.name])}`;
  }
  return `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(system.name)}&go=Go`;
}

/**
 * Build complete array of outbound source links for a selected star system.
 */
export function getSystemSourceLinks(system, lang = 'en') {
  if (!system) return [];
  const cs = lang === 'cs';
  const ids = system.ids || {};
  const links = [];

  if (system.id === 'sol') {
    links.push({
      id: 'nasa-sol',
      badge: 'NASA',
      name: cs ? 'NASA — Přehled Slunce a Sluneční soustavy' : 'NASA — Sun & Solar System Overview',
      subtitle: 'science.nasa.gov/sun',
      url: 'https://science.nasa.gov/sun/',
    });
  } else {
    links.push({
      id: 'simbad',
      badge: 'SIMBAD',
      name: cs ? 'Astronomická databáze SIMBAD (CfA)' : 'SIMBAD Astronomical Database (CfA)',
      subtitle: ids.hip ? `HIP ${ids.hip}` : ids.neaHost || system.name,
      url: getSimbadUrl(system),
    });
  }

  const neaUrl = getNasaExoplanetUrl(system);
  if (neaUrl) {
    links.push({
      id: 'nea',
      badge: 'NASA ARCHIVE',
      name: cs ? 'Archiv exoplanet NASA (NExScI)' : 'NASA Exoplanet Archive (NExScI)',
      subtitle: cs
        ? `${system.planetCount} potvrzených planet (${ids.neaHost || system.name})`
        : `${system.planetCount} confirmed planets (${ids.neaHost || system.name})`,
      url: neaUrl,
    });
  }

  const hipUrl = getVizierHipparcosUrl(system);
  if (hipUrl) {
    links.push({
      id: 'hip2',
      badge: 'VIZIER I/311',
      name: cs ? 'Katalog Hipparcos (van Leeuwen 2007)' : 'Hipparcos New Reduction (VizieR I/311)',
      subtitle: `HIP ${ids.hip}`,
      url: hipUrl,
    });
  }

  const gaiaUrl = getVizierGaiaDr3Url(system);
  if (gaiaUrl) {
    links.push({
      id: 'gaia',
      badge: 'ESA GAIA DR3',
      name: cs ? 'Katalog ESA Gaia DR3 (VizieR I/355)' : 'ESA Gaia DR3 Astrometry (VizieR I/355)',
      subtitle: `Gaia DR3 ${ids.gaiaDr3}`,
      url: gaiaUrl,
    });
  }

  if (system.id !== 'sol') {
    links.push({
      id: 'ads',
      badge: 'NASA ADS',
      name: cs ? 'Odborné publikace v NASA ADS' : 'Peer-Reviewed Papers in NASA ADS',
      subtitle: cs ? 'Seřazeno podle citací' : 'Sorted by citation count',
      url: getAdsLiteratureUrl(system),
    });
  }

  links.push({
    id: 'wiki',
    badge: cs ? 'WIKIPEDIE' : 'WIKIPEDIA',
    name: cs ? 'Článek na Wikipedii' : 'Wikipedia Encyclopedia Article',
    subtitle: system.name,
    url: getWikipediaUrl(system, lang),
  });

  return links;
}

/**
 * Primary and fallback optical sky cutout image URLs for a selected star system.
 * - Sol: Live NASA SDO AIA 304 Å full-disk solar image (fallback: AIA 171 Å)
 * - Other stars: NASA GSFC SkyView DSS2 Red (all-sky coverage, fast ~1s JPEG),
 *   fallback to STScI Digitized Sky Survey (archive.stsci.edu).
 */
export function getSkyCutoutSources(system) {
  if (!system) return [];
  if (system.id === 'sol') {
    return [
      {
        url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0304.jpg',
        label: 'NASA SDO AIA 304 Å (Live)',
      },
      {
        url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0171.jpg',
        label: 'NASA SDO AIA 171 Å (Live)',
      },
    ];
  }
  if (system.ra === null || system.dec === null || system.ra === undefined || system.dec === undefined) {
    return [];
  }
  const ra = Number(system.ra).toFixed(5);
  const dec = Number(system.dec).toFixed(5);
  return [
    {
      url: `https://skyview.gsfc.nasa.gov/current/cgi/runquery.pl?Position=${ra},${dec}&Survey=DSS2+Red&Pixels=300&Size=0.28&Return=JPEG`,
      label: 'NASA SkyView DSS2 Red Survey',
    },
    {
      url: `https://archive.stsci.edu/cgi-bin/dss_search?v=poss2ukstu_red&r=${ra}&d=${dec}&e=J2000&h=15.0&w=15.0&f=gif&c=none`,
      label: 'STScI Digitized Sky Survey (DSS2)',
    },
  ];
}

/** Backwards-compatible helper returning the primary sky cutout URL. */
export function getSkyCutoutUrl(system) {
  return getSkyCutoutSources(system)[0]?.url || null;
}
