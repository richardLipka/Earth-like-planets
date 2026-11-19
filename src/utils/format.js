/**
 * Number, Duration & Coordinate Formatting Utilities (EN / CS)
 */

export function formatNum(val, digits = 2, lang = 'en') {
  if (val === null || val === undefined || !Number.isFinite(val)) return '—';
  return val.toLocaleString(lang === 'cs' ? 'cs-CZ' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

export function formatFixed(val, digits = 2, lang = 'en') {
  if (val === null || val === undefined || !Number.isFinite(val)) return '—';
  return val.toLocaleString(lang === 'cs' ? 'cs-CZ' : 'en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * Format duration in years into human-readable years + days (or months).
 */
export function formatDurationYears(years, lang = 'en') {
  if (years === null || years === undefined || !Number.isFinite(years)) return '—';
  const cs = lang === 'cs';
  if (Math.abs(years) < 1e-6) return cs ? '0,00 let' : '0.00 yr';
  const absY = Math.abs(years);
  const sign = years < 0 ? '-' : '';
  if (absY < 1 / 365.25) {
    const hours = absY * 365.25 * 24;
    return `${sign}${formatNum(hours, 1, lang)} h`;
  }
  if (absY < 0.1) {
    const days = Math.round(absY * 365.25);
    return cs ? `${sign}${days} dní` : `${sign}${days} d`;
  }
  const yrStr = formatFixed(absY, 2, lang);
  return cs ? `${sign}${yrStr} let` : `${sign}${yrStr} yr`;
}

/**
 * Convert effective temperature (K) to approximate blackbody RGB CSS color.
 */
export function temperatureToHex(tempK) {
  const t = Math.max(1500, Math.min(40000, tempK || 5772)) / 100;
  let r, g, b;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }
  const clamp = (x) => Math.max(0, Math.min(255, Math.round(x)));
  const toHex = (x) => clamp(x).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export const SPECTRAL_COLORS = {
  O: '#9bb0ff',
  B: '#aabfff',
  A: '#d5e0ff',
  F: '#f8f7ff',
  G: '#ffe9b0',
  K: '#ffc27a',
  M: '#ff8b5e',
  L: '#d9463e',
  T: '#a855f7',
  Y: '#6366f1',
  D: '#c8d4e0',
  '?': '#8a96a0',
};

