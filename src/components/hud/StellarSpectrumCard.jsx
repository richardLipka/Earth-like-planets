import React, { useMemo, useRef, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { formatNum, SPECTRAL_COLORS } from '../../utils/format.js';
import {
  analyzeStarSpectrum,
  planckRadianceRel,
  wavelengthToRgb,
} from '../../engine/stellarSpectra.js';
import { Activity } from 'lucide-react';

const MIN_NM = 380;
const MAX_NM = 750;

export default function StellarSpectrumCard({ star }) {
  const { lang, t } = useLanguage();
  const canvasRef = useRef(null);

  const info = useMemo(() => analyzeStarSpectrum(star), [star]);

  // Draw Planck-weighted visible spectrum bar (380-750 nm) with authentic absorption/emission lines
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !info) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = 280;
    const H = 38;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, W, H);

    // Compute visible-band max Planck intensity for balanced dynamic range
    let maxVisI = 1e-12;
    for (let nm = MIN_NM; nm <= MAX_NM; nm += 5) {
      const val = planckRadianceRel(nm, info.teff);
      if (val > maxVisI) maxVisI = val;
    }

    // For ultracool brown dwarfs (<1800 K), visibly dim the optical continuum to convey IR dominance
    const opticalFloor = info.teff < 1400 ? 0.16 : info.teff < 2400 ? 0.45 : 0.85;

    for (let x = 0; x < W; x++) {
      const nm = MIN_NM + (x / (W - 1)) * (MAX_NM - MIN_NM);
      const [baseR, baseG, baseB] = wavelengthToRgb(nm);

      // Smooth continuum tilt from real Planck B_lambda(T)
      const relI = planckRadianceRel(nm, info.teff) / maxVisI;
      let brightness = opticalFloor * (0.28 + 0.72 * Math.pow(Math.max(0, relI), 0.45));

      // Apply authentic Gaussian absorption (depth > 0) or emission (depth < 0) lines
      let emitBoost = 0;
      for (const line of info.lines) {
        const dNm = nm - line.nm;
        if (Math.abs(dNm) > line.widthNm * 3.5) continue;
        const g = Math.exp(-0.5 * (dNm / (line.widthNm * 0.55)) ** 2);
        if (line.depth > 0) {
          brightness *= Math.max(0.06, 1 - line.depth * g);
        } else {
          emitBoost = Math.max(emitBoost, -line.depth * g);
        }
      }

      const r = Math.min(255, Math.round(baseR * brightness + emitBoost * 255));
      const gCol = Math.min(255, Math.round(baseG * brightness + emitBoost * 90));
      const b = Math.min(255, Math.round(baseB * brightness + emitBoost * 110));

      ctx.fillStyle = `rgb(${r},${gCol},${b})`;
      ctx.fillRect(x, 0, 1, H);
    }

    // Draw subtle Wien peak marker line if inside 380-750 nm
    if (info.peakNm >= MIN_NM && info.peakNm <= MAX_NM) {
      const px = ((info.peakNm - MIN_NM) / (MAX_NM - MIN_NM)) * (W - 1);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, H);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [info]);

  if (!info) return null;

  const formatWavelength = (nm) => {
    if (nm >= 1000) return `${formatNum(nm / 1000, 2, lang)} µm`;
    return `${formatNum(nm, 0, lang)} nm`;
  };

  // Pick up to 5 non-overlapping line callout ticks along the 380-750 nm strip
  const lineLabels = [];
  for (const ln of info.lines) {
    const pct = ((ln.nm - MIN_NM) / (MAX_NM - MIN_NM)) * 100;
    if (pct < 4 || pct > 96) continue;
    if (lineLabels.some((prev) => Math.abs(prev.pct - pct) < 14)) continue;
    lineLabels.push({ ...ln, pct });
    if (lineLabels.length >= 6) break;
  }

  return (
    <div className="section-block spectral-analysis-section">
      <div className="section-title-row">
        <Activity size={13} className="section-icon" />
        <span>{t('spectralSectionTitle')}</span>
        <span
          className="spectral-class-pill"
          style={{
            borderColor: SPECTRAL_COLORS[info.cls] || '#ffe9b0',
            color: SPECTRAL_COLORS[info.cls] || '#ffe9b0',
          }}
        >
          {info.spect}
        </span>
      </div>

      {/* Decoded MK Class & Luminosity Class */}
      <div className="spectral-class-summary">
        <strong>{info.classDesc[lang] || info.classDesc.en}</strong>
        <span className="spectral-lum-sub">
          {info.lumClassDesc[lang] || info.lumClassDesc.en}
          {info.hasEmissionLines ? ` · ${t('spectralEmissionNote')}` : ''}
        </span>
      </div>

      {/* Authentic Visible Absorption Spectrum Strip (380-750 nm) */}
      <div className="spectrum-strip-box">
        <div className="spectrum-lines-labels">
          {lineLabels.map((ln) => (
            <span
              key={`${ln.label}-${ln.nm}`}
              className={`spec-line-tag ${ln.depth < 0 ? 'emission' : ''}`}
              style={{ left: `${ln.pct.toFixed(1)}%` }}
              title={`${ln.label} (${ln.nm} nm)`}
            >
              {ln.label}
            </span>
          ))}
        </div>

        <canvas
          ref={canvasRef}
          className="spectrum-bar-canvas"
          aria-label={`${info.spect} visible absorption spectrum (380–750 nm)`}
        />

        <div className="spectrum-axis-ticks">
          <span>380 nm (UV)</span>
          <span>500</span>
          <span>600</span>
          <span>750 nm (IR)</span>
        </div>
      </div>

      {/* Exact Planck Bolometric Energy Distribution Bar (UV / Visible / IR) */}
      <div className="planck-bands-box">
        <div className="planck-bands-header">
          <span>{t('spectralEnergyDistLabel')}</span>
          <span className="planck-peak-chip">
            λ<sub>max</sub> {formatWavelength(info.peakNm)} ({info.peakBand[lang] || info.peakBand.en})
          </span>
        </div>
        <div className="planck-bands-bar">
          {info.bands.uvPct > 0.3 && (
            <div
              className="pb-seg uv"
              style={{ width: `${info.bands.uvPct}%` }}
              title={`UV (<380 nm): ${info.bands.uvPct}%`}
            />
          )}
          {info.bands.visPct > 0.3 && (
            <div
              className="pb-seg vis"
              style={{ width: `${info.bands.visPct}%` }}
              title={`${t('spectralBandVis')}: ${info.bands.visPct}%`}
            />
          )}
          {info.bands.irPct > 0.3 && (
            <div
              className="pb-seg ir"
              style={{ width: `${info.bands.irPct}%` }}
              title={`${t('spectralBandIr')}: ${info.bands.irPct}%`}
            />
          )}
        </div>
        <div className="planck-bands-legend">
          <span className="pb-lbl uv">UV {formatNum(info.bands.uvPct, 1, lang)}%</span>
          <span className="pb-lbl vis">
            {t('spectralBandVis')} {formatNum(info.bands.visPct, 1, lang)}%
          </span>
          <span className="pb-lbl ir">
            {t('spectralBandIr')} {formatNum(info.bands.irPct, 1, lang)}%
          </span>
        </div>
      </div>

      {/* 4-Cell Spectral & Photometric Telemetry */}
      <div className="star-params-grid">
        <div className="param-box">
          <span className="p-label">{t('spectralPeakLabel')}</span>
          <span className="p-val highlight-cyan">{formatWavelength(info.peakNm)}</span>
        </div>
        <div className="param-box">
          <span className="p-label">{t('spectralBvLabel')}</span>
          <span className="p-val">
            {info.bv !== null && Number.isFinite(info.bv)
              ? `${info.bv > 0 ? '+' : ''}${formatNum(info.bv, 2, lang)}`
              : '—'}
          </span>
        </div>
        <div className="param-box">
          <span className="p-label">{t('absMagLabel')}</span>
          <span className="p-val">
            {info.absmag !== null && Number.isFinite(info.absmag)
              ? `${formatNum(info.absmag, 2, lang)} mag`
              : '—'}
          </span>
        </div>
        <div className="param-box">
          <span className="p-label">{t('spectralLogGLabel')}</span>
          <span className="p-val">
            {info.logG !== null ? `${formatNum(info.logG, 2, lang)} cgs` : '—'}
          </span>
        </div>
      </div>

      {/* Dominant Diagnostic Photospheric Lines */}
      <div className="spectral-features-note">
        <span>{t('spectralLinesLabel')}:</span>{' '}
        <strong>{info.dominantFeatures[lang] || info.dominantFeatures.en}</strong>
      </div>
    </div>
  );
}
