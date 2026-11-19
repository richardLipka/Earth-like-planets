import fs from 'node:fs';
import path from 'node:path';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Parse a CLI flag value supporting both `--flag value` and `--flag=value`.
 */
export function getArgValue(argv, flag, fallback = null) {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === flag && i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      return argv[i + 1];
    }
    if (a.startsWith(`${flag}=`)) {
      return a.slice(flag.length + 1);
    }
  }
  return fallback;
}

export function getNumArg(argv, flag, fallback) {
  const raw = getArgValue(argv, flag, null);
  if (raw === null) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid numeric value for ${flag}: "${raw}"`);
  }
  return n;
}

export function readJsonIfExists(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Atomically write text or JSON so an interrupted build never corrupts local data.
 */
export function writeFileAtomic(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tmpPath, content);
  fs.renameSync(tmpPath, filePath);
}

export function writeJsonAtomic(filePath, data, pretty = false) {
  const payload = pretty ? JSON.stringify(data, null, 2) + '\n' : JSON.stringify(data);
  writeFileAtomic(filePath, payload);
}

/**
 * Returns file age in fractional days, or Infinity if the file does not exist.
 */
export function fileAgeDays(filePath) {
  if (!fs.existsSync(filePath)) return Infinity;
  const stat = fs.statSync(filePath);
  return (Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24);
}

export function isCacheFresh(filePath, maxAgeDays) {
  if (!fs.existsSync(filePath)) return false;
  if (!Number.isFinite(maxAgeDays)) return true;
  if (maxAgeDays <= 0) return false;
  return fileAgeDays(filePath) <= maxAgeDays;
}

/**
 * Fetch with timeout and polite exponential backoff retries.
 */
export async function fetchWithRetry(
  url,
  { headers = {}, timeoutMs = 45000, retries = 3, baseDelayMs = 800, label = url } = {}
) {
  let lastErr = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return res;
      // Retry transient 429 / 5xx responses
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status} (${res.statusText})`);
      } else {
        throw new Error(`HTTP ${res.status} (${res.statusText}) for ${label}`);
      }
    } catch (err) {
      lastErr = err;
      // Do not retry non-transient 4xx errors
      if (/HTTP 4\d\d/.test(err.message) && !/HTTP 429/.test(err.message)) {
        throw err;
      }
    }
    if (attempt < retries) {
      const waitMs = baseDelayMs * 2 ** (attempt - 1);
      console.warn(`[NET] Retry ${attempt}/${retries - 1} for ${label} in ${waitMs}ms (${lastErr?.message})`);
      await sleep(waitMs);
    }
  }
  throw lastErr || new Error(`Failed to fetch ${label}`);
}

/**
 * Fast O(1) 3D spatial hash grid for star clustering and cross-catalogue proximity matching.
 */
export function createSpatialGrid(cellSize = 1.0) {
  const cells = new Map();
  const keyOf = (ix, iy, iz) => `${ix},${iy},${iz}`;
  const coord = (v) => Math.floor(v / cellSize);

  return {
    add(pos, item) {
      const k = keyOf(coord(pos[0]), coord(pos[1]), coord(pos[2]));
      let bucket = cells.get(k);
      if (!bucket) {
        bucket = [];
        cells.set(k, bucket);
      }
      bucket.push({ pos, item });
    },
    queryWithin(pos, radius) {
      const cx = coord(pos[0]);
      const cy = coord(pos[1]);
      const cz = coord(pos[2]);
      const rCells = Math.max(1, Math.ceil(radius / cellSize));
      const rSq = radius * radius;
      const hits = [];

      for (let dx = -rCells; dx <= rCells; dx++) {
        for (let dy = -rCells; dy <= rCells; dy++) {
          for (let dz = -rCells; dz <= rCells; dz++) {
            const bucket = cells.get(keyOf(cx + dx, cy + dy, cz + dz));
            if (!bucket) continue;
            for (const entry of bucket) {
              const ddx = entry.pos[0] - pos[0];
              const ddy = entry.pos[1] - pos[1];
              const ddz = entry.pos[2] - pos[2];
              const dSq = ddx * ddx + ddy * ddy + ddz * ddz;
              if (dSq < rSq) hits.push({ item: entry.item, distSq: dSq });
            }
          }
        }
      }
      return hits;
    },
  };
}

