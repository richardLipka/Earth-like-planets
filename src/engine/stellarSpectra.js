/**
 * Pure Astrophysical Stellar Spectrum, MK Classification & Planck Blackbody Engine
 *
 * Computes exact physical spectral properties for any catalogued star or brown dwarf:
 *   1. MK Spectral & Luminosity Class decoding (O, B, A, F, G, K, M, L, T, Y, D; Ia..V, BD)
 *   2. Wien's Displacement Law peak wavelength (lambda_max = 2.89777e6 nm*K / Teff)
 *   3. Exact numerical Planck blackbody integration across UV (<380 nm), Visible (380-750 nm),
 *      and Infrared (>750 nm) bolometric energy bands
 *   4. Diagnostic photospheric absorption features (Balmer, He, Ca II, Na I D, Mg b, Fe, TiO, CH4, NH3)
 *   5. Surface gravity log10(g [cm/s^2]) from stellar mass and radius
 */

const WIEN_NM_K = 2897771.955; // CODATA 2018 Wien displacement constant in nm * K
const HC_OVER_KB_NM_K = 14387768.775; // h*c / k_B in nm * K
const LOG_G_SUN_CGS = 4.4381; // log10(27420 cm/s^2)

const CLASS_DESCRIPTIONS = {
  O: {
    en: 'Blue Hyper-Hot Ionized-Helium Star',
    cs: 'Modrá mimořádně horká hvězda (ionizované He)',
    featuresEn: 'He II, He I, O III, weak H Balmer',
    featuresCs: 'He II, He I, O III, slabé Balmerovy čáry H',
  },
  B: {
    en: 'Blue-White Neutral-Helium Star',
    cs: 'Modrobílá heliová hvězda',
    featuresEn: 'Strong He I, strengthening H Balmer',
    featuresCs: 'Silné He I, sílící Balmerovy čáry H',
  },
  A: {
    en: 'White Hydrogen-Balmer Star',
    cs: 'Bílá vodíková hvězda',
    featuresEn: 'Peak H Balmer (Hα, Hβ, Hγ, Hδ), ionized metals',
    featuresCs: 'Maximální Balmerovy čáry H (Hα–Hδ), ionizované kovy',
  },
  F: {
    en: 'Yellow-White Star',
    cs: 'Žlutobílá hvězda',
    featuresEn: 'Ca II H & K, medium H Balmer, Fe I/II',
    featuresCs: 'Ca II H a K, střední H Balmer, Fe I/II',
  },
  G: {
    en: 'Yellow Solar-Type Star',
    cs: 'Žlutá hvězda slunečního typu',
    featuresEn: 'Strong Ca II H & K, G-band (CH), Fe I, Na I D, Mg b',
    featuresCs: 'Silné Ca II H a K, pás G (CH), Fe I, Na I D, Mg b',
  },
  K: {
    en: 'Orange Star',
    cs: 'Oranžová hvězda',
    featuresEn: 'Dominant neutral metals (Fe I, Ca I, Na I D), weak CH/CN',
    featuresCs: 'Dominantní neutrální kovy (Fe I, Ca I, Na I D), slabé CH/CN',
  },
  M: {
    en: 'Red Dwarf / Cool Star',
    cs: 'Červený trpaslík / chladná hvězda',
    featuresEn: 'Broad molecular TiO bands, strong Na I D & Ca I',
    featuresCs: 'Široké molekulární pásy TiO, silný Na I D a Ca I',
  },
  L: {
    en: 'Warm Ultracool Brown Dwarf',
    cs: 'Teplý hnědý trpaslík',
    featuresEn: 'Metal hydrides (FeH, CrH), K I & Na I, silicate dust',
    featuresCs: 'Hydridy kovů (FeH, CrH), K I a Na I, silikátový prach',
  },
  T: {
    en: 'Cool Methane Brown Dwarf',
    cs: 'Chladný metanový hnědý trpaslík',
    featuresEn: 'Deep CH₄ (methane) & H₂O near-IR absorption bands',
    featuresCs: 'Hluboké pásy metanu (CH₄) a vody (H₂O) v blízkém IR',
  },
  Y: {
    en: 'Ultracool Ammonia Brown Dwarf',
    cs: 'Ultrachladný čpavkový hnědý trpaslík',
    featuresEn: 'NH₃ (ammonia) & H₂O clouds; thermal mid-IR emission',
    featuresCs: 'Mraky čpavku (NH₃) a vody; tepelné záření ve středním IR',
  },
  D: {
    en: 'White Dwarf Stellar Remnant',
    cs: 'Bílý trpaslík (hvězdný pozůstatek)',
    featuresEn: 'Pressure-broadened H Balmer (DA) / He (DB) / metal lines',
    featuresCs: 'Tlakově rozšířené čáry H (DA) / He (DB) / kovů',
  },
};

const LUM_CLASS_LABELS = {
  I: { en: 'Supergiant (Class I)', cs: 'Veleobr (třída I)' },
  II: { en: 'Bright Giant (Class II)', cs: 'Jasný obr (třída II)' },
  III: { en: 'Giant (Class III)', cs: 'Obr (třída III)' },
  IV: { en: 'Subgiant (Class IV)', cs: 'Podobr (třída IV)' },
  V: { en: 'Main Sequence (Class V)', cs: 'Hlavní posloupnost (třída V)' },
  D: { en: 'Degenerate Remnant (WD)', cs: 'Degenerovaný zbytek (WD)' },
  BD: { en: 'Substellar Object (BD)', cs: 'Podhvězdný objekt (BD)' },
};

/**
 * Normalized Planck spectral radiance B_lambda(lambda, T) in arbitrary units.
 * Uses dimensionless x = h*c / (lambda * k_B * T) to prevent numerical overflow.
 */
export function planckRadianceRel(wavelengthNm, teffK) {
  if (!Number.isFinite(wavelengthNm) || wavelengthNm <= 0) return 0;
  const T = Math.max(150, Number(teffK) || 5772);
  const x = HC_OVER_KB_NM_K / (wavelengthNm * T);
  if (x > 700) return 0;
  // Scale by (lambda_max / lambda)^5 so peak is near ~1 regardless of T
  const lamPeak = WIEN_NM_K / T;
  const ratio = lamPeak / wavelengthNm;
  const peakFactor = Math.expm1(HC_OVER_KB_NM_K / (lamPeak * T)); // e^4.965 - 1 ≈ 142.32
  const denom = Math.expm1(x);
  if (!Number.isFinite(denom) || denom <= 0) return 0;
  return (ratio ** 5) * (peakFactor / denom);
}

/**
 * Integrates the exact Planck energy distribution across UV (<380 nm), Visible (380-750 nm),
 * and Infrared (>750 nm) using dimensionless x = hc / (lambda * k_B * T).
 *
 * Since integral_0^inf x^3 / (e^x - 1) dx = pi^4 / 15, integrating in x is exact over ALL
 * wavelengths from 0 to infinity without any finite-wavelength truncation error!
 */
export function computeBolometricBands(teffK) {
  const T = Math.max(150, Number(teffK) || 5772);
  const TOTAL_EXACT = Math.PI ** 4 / 15; // ≈ 6.4939394

  // Exact numerical integral of x^3 / (e^x - 1) on [a, b] via composite Simpson's rule
  const integrateX = (a, b, steps = 200) => {
    const lo = Math.max(0, a);
    const hi = Math.min(80, b);
    if (hi <= lo) return 0;
    const n = steps % 2 === 0 ? steps : steps + 1;
    const h = (hi - lo) / n;
    const f = (x) => {
      if (x <= 1e-8) return 0;
      if (x > 700) return 0;
      return (x ** 3) / Math.expm1(x);
    };
    let sum = f(lo) + f(hi);
    for (let i = 1; i < n; i++) {
      sum += (i % 2 === 0 ? 2 : 4) * f(lo + i * h);
    }
    return (h / 3) * sum;
  };

  // x = hc / (lambda * k_B * T): larger x = shorter wavelength!
  const x750 = HC_OVER_KB_NM_K / (750 * T); // boundary between IR (x < x750) and Visible (x750..x380)
  const x380 = HC_OVER_KB_NM_K / (380 * T); // boundary between Visible and UV (x > x380)

  const irFrac = Math.min(1, Math.max(0, integrateX(0, x750, 240) / TOTAL_EXACT));
  const visFrac = Math.min(1, Math.max(0, integrateX(x750, x380, 240) / TOTAL_EXACT));
  const uvFrac = Math.max(0, 1 - irFrac - visFrac);

  const uvPct = Math.round(uvFrac * 1000) / 10;
  const visPct = Math.round(visFrac * 1000) / 10;
  const irPct = Math.max(0, Math.round((100 - uvPct - visPct) * 10) / 10);

  return { uvPct, visPct, irPct };
}

/**
 * Converts a visible wavelength (380-750 nm) to approximate perceptual sRGB hex color.
 */
export function wavelengthToRgb(nm) {
  let r = 0;
  let g = 0;
  let b = 0;
  if (nm >= 380 && nm < 440) {
    r = -(nm - 440) / (440 - 380);
    b = 1;
  } else if (nm >= 440 && nm < 490) {
    g = (nm - 440) / (490 - 440);
    b = 1;
  } else if (nm >= 490 && nm < 510) {
    g = 1;
    b = -(nm - 510) / (510 - 490);
  } else if (nm >= 510 && nm < 580) {
    r = (nm - 510) / (580 - 510);
    g = 1;
  } else if (nm >= 580 && nm < 645) {
    r = 1;
    g = -(nm - 645) / (645 - 580);
  } else if (nm >= 645 && nm <= 750) {
    r = 1;
  }

  // Intensity taper near vision limits
  let factor = 1.0;
  if (nm < 420) factor = 0.3 + (0.7 * (nm - 380)) / (420 - 380);
  else if (nm > 700) factor = 0.3 + (0.7 * (750 - nm)) / (750 - 700);

  const gamma = 0.8;
  const conv = (c) => (c <= 0 ? 0 : Math.round(255 * Math.pow(c * factor, gamma)));
  return [conv(r), conv(g), conv(b)];
}

/**
 * Diagnostic visible-light absorption/emission lines (380-750 nm) by spectral class.
 * Each item: { nm, widthNm, depth (0..1; negative = emission), label }
 */
export function getVisibleSpectralLines(cls, spect = '') {
  const c = (cls || 'G').toUpperCase();
  const hasEmission = /e\b|Ve/i.test(spect || '');

  if (c === 'O' || c === 'B') {
    return [
      { nm: 410.2, widthNm: 2.2, depth: 0.45, label: 'Hδ' },
      { nm: 434.0, widthNm: 2.4, depth: 0.5, label: 'Hγ' },
      { nm: 447.1, widthNm: 2.2, depth: 0.72, label: 'He I' },
      { nm: 468.6, widthNm: 2.0, depth: c === 'O' ? 0.78 : 0.25, label: 'He II' },
      { nm: 486.1, widthNm: 2.6, depth: 0.55, label: 'Hβ' },
      { nm: 587.6, widthNm: 2.2, depth: 0.65, label: 'He I' },
      { nm: 656.3, widthNm: 2.8, depth: hasEmission ? -0.7 : 0.5, label: 'Hα' },
    ];
  }
  if (c === 'A') {
    return [
      { nm: 393.4, widthNm: 2.0, depth: 0.35, label: 'Ca II' },
      { nm: 410.2, widthNm: 4.0, depth: 0.88, label: 'Hδ' },
      { nm: 434.0, widthNm: 4.2, depth: 0.9, label: 'Hγ' },
      { nm: 486.1, widthNm: 4.5, depth: 0.92, label: 'Hβ' },
      { nm: 656.3, widthNm: 4.5, depth: 0.88, label: 'Hα' },
    ];
  }
  if (c === 'F') {
    return [
      { nm: 393.4, widthNm: 3.0, depth: 0.72, label: 'Ca K' },
      { nm: 396.8, widthNm: 3.0, depth: 0.7, label: 'Ca H' },
      { nm: 410.2, widthNm: 2.8, depth: 0.62, label: 'Hδ' },
      { nm: 434.0, widthNm: 2.8, depth: 0.65, label: 'Hγ' },
      { nm: 486.1, widthNm: 3.0, depth: 0.66, label: 'Hβ' },
      { nm: 517.5, widthNm: 2.0, depth: 0.38, label: 'Mg b' },
      { nm: 589.3, widthNm: 2.0, depth: 0.42, label: 'Na D' },
      { nm: 656.3, widthNm: 3.0, depth: 0.62, label: 'Hα' },
    ];
  }
  if (c === 'G') {
    return [
      { nm: 393.4, widthNm: 3.6, depth: 0.88, label: 'Ca K' },
      { nm: 396.8, widthNm: 3.6, depth: 0.84, label: 'Ca H' },
      { nm: 430.8, widthNm: 3.0, depth: 0.74, label: 'CH G' },
      { nm: 486.1, widthNm: 2.4, depth: 0.52, label: 'Hβ' },
      { nm: 517.5, widthNm: 2.6, depth: 0.64, label: 'Mg b' },
      { nm: 527.0, widthNm: 2.2, depth: 0.55, label: 'Fe I' },
      { nm: 589.3, widthNm: 2.6, depth: 0.68, label: 'Na D' },
      { nm: 656.3, widthNm: 2.4, depth: 0.5, label: 'Hα' },
    ];
  }
  if (c === 'K') {
    return [
      { nm: 393.4, widthNm: 3.8, depth: 0.88, label: 'Ca K' },
      { nm: 422.7, widthNm: 3.2, depth: 0.8, label: 'Ca I' },
      { nm: 430.8, widthNm: 3.2, depth: 0.78, label: 'CH G' },
      { nm: 517.5, widthNm: 3.2, depth: 0.78, label: 'Mg b' },
      { nm: 527.0, widthNm: 2.5, depth: 0.68, label: 'Fe I' },
      { nm: 589.3, widthNm: 3.6, depth: 0.85, label: 'Na D' },
      { nm: 616.0, widthNm: 4.5, depth: 0.45, label: 'TiO' },
      { nm: 656.3, widthNm: 2.0, depth: hasEmission ? -0.6 : 0.35, label: 'Hα' },
    ];
  }
  if (c === 'M') {
    return [
      { nm: 422.7, widthNm: 3.5, depth: 0.86, label: 'Ca I' },
      { nm: 495.5, widthNm: 8.5, depth: 0.62, label: 'TiO' },
      { nm: 516.7, widthNm: 9.0, depth: 0.68, label: 'TiO' },
      { nm: 544.8, widthNm: 9.0, depth: 0.65, label: 'TiO' },
      { nm: 589.3, widthNm: 4.2, depth: 0.88, label: 'Na D' },
      { nm: 615.9, widthNm: 11.0, depth: 0.74, label: 'TiO' },
      { nm: 656.3, widthNm: 2.5, depth: hasEmission ? -0.85 : 0.28, label: 'Hα' },
      { nm: 705.4, widthNm: 12.0, depth: 0.8, label: 'TiO' },
    ];
  }
  if (c === 'D') {
    const isDB = /^DB/i.test(spect || '');
    if (isDB) {
      return [
        { nm: 402.6, widthNm: 5.5, depth: 0.7, label: 'He I' },
        { nm: 447.1, widthNm: 6.5, depth: 0.85, label: 'He I' },
        { nm: 587.6, widthNm: 6.0, depth: 0.8, label: 'He I' },
      ];
    }
    return [
      { nm: 410.2, widthNm: 7.5, depth: 0.82, label: 'Hδ' },
      { nm: 434.0, widthNm: 8.5, depth: 0.86, label: 'Hγ' },
      { nm: 486.1, widthNm: 9.5, depth: 0.9, label: 'Hβ' },
      { nm: 656.3, widthNm: 9.5, depth: 0.86, label: 'Hα' },
    ];
  }
  // L / T / Y brown dwarfs — deep red/near-IR alkali & hydride troughs
  return [
    { nm: 589.3, widthNm: 12.0, depth: 0.88, label: 'Na I' },
    { nm: 670.8, widthNm: 4.5, depth: 0.6, label: 'Li I' },
    { nm: 705.0, widthNm: 14.0, depth: 0.78, label: c === 'L' ? 'CrH/FeH' : 'H₂O/CH₄' },
  ];
}

/**
 * Full spectral dossier for a selected stellar component (`activeStar`).
 */
export function analyzeStarSpectrum(star) {
  if (!star) return null;
  const teff = Math.max(150, Number(star.teff) || 5772);
  const cls = (star.cls || 'G').toUpperCase();
  const lumClass = star.lumClass || (cls === 'L' || cls === 'T' || cls === 'Y' ? 'BD' : cls === 'D' ? 'D' : 'V');

  const peakNm = WIEN_NM_K / teff;
  let peakBand = { id: 'vis', en: 'Visible', cs: 'Viditelné' };
  if (peakNm < 380) peakBand = { id: 'uv', en: 'Ultraviolet', cs: 'Ultrafialové (UV)' };
  else if (peakNm > 2500) peakBand = { id: 'mir', en: 'Mid-Infrared', cs: 'Střední IR' };
  else if (peakNm > 750) peakBand = { id: 'nir', en: 'Near-Infrared', cs: 'Blízké IR' };

  const bands = computeBolometricBands(teff);
  const lines = getVisibleSpectralLines(cls, star.spect);
  const desc = CLASS_DESCRIPTIONS[cls] || CLASS_DESCRIPTIONS.G;
  const lumDesc = LUM_CLASS_LABELS[lumClass] || LUM_CLASS_LABELS.V;

  // Surface gravity log10(g [cm/s^2]) = log10(M/R^2) + 4.4381
  let logG = null;
  if (Number.isFinite(star.mass) && star.mass > 0 && Number.isFinite(star.radius) && star.radius > 0) {
    logG = Math.round((Math.log10(star.mass / (star.radius * star.radius)) + LOG_G_SUN_CGS) * 100) / 100;
  }

  // Decode optional spectral peculiarity suffixes
  const spectStr = star.spect || '';
  const hasEmissionLines = /e\b|Ve/i.test(spectStr);

  return {
    cls,
    spect: spectStr || `${cls}`,
    lumClass,
    teff,
    peakNm: Math.round(peakNm),
    peakBand,
    bands, // { uvPct, visPct, irPct }
    lines,
    classDesc: { en: desc.en, cs: desc.cs },
    lumClassDesc: lumDesc,
    dominantFeatures: { en: desc.featuresEn, cs: desc.featuresCs },
    bv: star.bv ?? null,
    absmag: star.absmag ?? null,
    logG,
    hasEmissionLines,
  };
}
