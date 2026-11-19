/**
 * Live On-Demand Sci-Fi Literature Sweep Service
 *
 * Combines:
 *  1. Pre-swept whole-catalogue static index (`public/data/scifi_literature.json`, swept across
 *     ALL 3,494 real star systems against Wikipedia + Revelation Space, Bobiverse, Halo,
 *     Star Trek, Alien, Dune, Hyperion, Foundation, Known Space, Honorverse & Mass Effect wikis).
 *  2. On-demand live Wikipedia MediaWiki API sweep (`sweepStarSciFiLive(system, aliases)`) so the
 *     user can click "Sweep Wikipedia Live" on ANY of the 3,494 stars currently displayed in the
 *     3D sphere to check Wikipedia articles or categories in real time.
 */

const liveCache = new Map();

/**
 * Load the pre-swept Sci-Fi literature dataset.
 */
export async function loadSciFiDataset() {
  try {
    const base = import.meta.env.BASE_URL || './';
    const res = await fetch(`${base.replace(/\/$/, '')}/data/scifi_literature.json`);
    if (!res.ok) return { meta: {}, bySystemId: {} };
    return await res.json();
  } catch {
    return { meta: {}, bySystemId: {} };
  }
}

/**
 * Perform an on-demand live sweep of Wikipedia (MediaWiki API, CORS `origin=*`)
 * for a specific star system currently displayed on the map, searching for:
 *  - Dedicated `Category:Fiction_set_around_<Name>` members
 *  - Wikipedia articles mentioning `"<Name>"` alongside science fiction / novel / film
 */
export async function sweepStarSciFiLive(system, aliases = []) {
  if (!system || system.id === 'sol') {
    return { categoryWorks: [], searchHits: [], checkedAt: new Date().toISOString() };
  }
  const cacheKey = system.id;
  if (liveCache.has(cacheKey)) return liveCache.get(cacheKey);

  const starName = (system.name || '').trim();
  const preferredAlias =
    aliases.find((a) => /groombridge|eridani|draconis|cassiopeiae|ophiuchi|reticuli|piscium|cygni|pavonis/i.test(a)) ||
    null;
  const cleanSearchName = (preferredAlias || starName).replace(/^Gl\s+/i, 'Gliese ').replace(/^GJ\s+/i, 'Gliese ');

  const results = {
    categoryWorks: [],
    searchHits: [],
    checkedAt: new Date().toISOString(),
  };

  try {
    // 1. Check Category:Fiction_set_around_<StarName>
    const catTitle = `Category:Fiction_set_around_${cleanSearchName.replace(/ /g, '_')}`;
    const catUrl =
      'https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmnamespace=0&cmlimit=30&format=json&origin=*&cmtitle=' +
      encodeURIComponent(catTitle);

    // 2. Search Wikipedia for science fiction works mentioning this star
    const searchQ = `"${cleanSearchName}" ("science fiction" OR "in fiction" OR novel)`;
    const searchUrl =
      'https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=8&format=json&origin=*&srsearch=' +
      encodeURIComponent(searchQ);

    const [catRes, searchRes] = await Promise.all([fetch(catUrl), fetch(searchUrl)]);

    if (catRes.ok) {
      const catJson = await catRes.json();
      results.categoryWorks = (catJson.query?.categorymembers || [])
        .map((m) => ({
          title: m.title,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(m.title.replace(/ /g, '_'))}`,
        }))
        .filter((x) => !/^Category:|^List of/i.test(x.title));
    }

    if (searchRes.ok) {
      const sJson = await searchRes.json();
      results.searchHits = (sJson.query?.search || [])
        .filter((item) => item.title.toLowerCase() !== cleanSearchName.toLowerCase())
        .map((item) => ({
          title: item.title,
          snippet: (item.snippet || '').replace(/<[^>]+>/g, ''),
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
        }));
    }
  } catch (err) {
    results.error = err.message;
  }

  liveCache.set(cacheKey, results);
  return results;
}

