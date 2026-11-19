import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { formatNum } from '../../utils/format.js';
import {
  RADIO_REFERENCE_YEAR,
  METI_BEAMS,
} from '../../data/radioBroadcastLayers.js';
import {
  BROADCAST_MIN_YEAR,
  BROADCAST_MAX_YEAR,
  getBroadcastsForYear,
  getBroadcastEraForYear,
} from '../../data/broadcastChronicle.js';
import {
  Radio,
  Tv,
  Sparkles,
  Crosshair,
  X,
  Orbit,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Waves,
} from 'lucide-react';

const QUICK_MILESTONES = [
  { year: 1926, label: '1926 · 100 ly' },
  { year: 1957, label: '1957 · Sputnik' },
  { year: 1969, label: '1969 · Apollo' },
  { year: 1976, label: '1976 · 50 ly ⇄', twoWay: true },
  { year: 1985, label: '1985 · 41 ly' },
  { year: 2017, label: '2017 · 9 ly' },
  { year: 2022, label: '2022 · 4 ly' },
];

export default function RadioBubblePanel({
  isOpen,
  onClose,
  selectedYear,
  onSelectYear,
  showMetiBeams,
  onToggleMetiBeams,
  allSystems,
  systemsById,
  onSelectSystem,
}) {
  const { lang, t } = useLanguage();
  const [tab, setTab] = useState('shells'); // 'shells' | 'meti'
  const [isSweeping, setIsSweeping] = useState(false);

  const safeYear = Math.max(
    BROADCAST_MIN_YEAR,
    Math.min(BROADCAST_MAX_YEAR, Math.round(selectedYear ?? 1976))
  );
  const radiusLy = Math.max(0, RADIO_REFERENCE_YEAR - safeYear);
  const isTwoWayBoundary = safeYear >= 1976; // <= 50 ly from Sol

  const era = useMemo(() => getBroadcastEraForYear(safeYear), [safeYear]);
  const yearBroadcasts = useMemo(() => getBroadcastsForYear(safeYear), [safeYear]);

  // Smooth year-by-year expanding wave animation (steps backward in year -> outward in radius 0..100 ly)
  useEffect(() => {
    if (!isOpen || !isSweeping) return undefined;
    const id = setInterval(() => {
      onSelectYear((prev) => {
        const cur = Math.round(prev ?? 1976);
        if (cur <= BROADCAST_MIN_YEAR) {
          setIsSweeping(false);
          return BROADCAST_MIN_YEAR;
        }
        return cur - 1;
      });
    }, 450);
    return () => clearInterval(id);
  }, [isOpen, isSweeping, onSelectYear]);

  // Stop sweep if panel closes
  useEffect(() => {
    if (!isOpen && isSweeping) setIsSweeping(false);
  }, [isOpen, isSweeping]);

  // Real catalogued stars, wavefront-crossing stars, & confirmed HZ exoplanets for this exact year's radius
  const shellStats = useMemo(() => {
    const list = (allSystems || []).filter((s) => s.id !== 'sol');
    const r = radiusLy;

    const insideCumulative = list.filter((s) => s.distLy <= r);
    const hzCumulative = insideCumulative
      .filter((s) => s.hasOptimisticHZ)
      .sort((a, b) => Math.abs(a.distLy - r) - Math.abs(b.distLy - r));
    const exoCount = insideCumulative.filter((s) => s.hasPlanets).length;

    // Stars currently receiving THIS EXACT YEAR's broadcast right now in 2026 (±0.85 ly shell band)
    const bandHalf = r <= 5 ? 1.2 : 0.85;
    const onWavefront = list
      .filter((s) => Math.abs(s.distLy - r) <= bandHalf)
      .sort((a, b) => {
        // Prioritize exoplanet/HZ/named stars right on the wavefront
        const score = (s) =>
          (s.hasOptimisticHZ ? 0 : s.hasPlanets ? 1 : s.isVisibleFromEarth || s.distLy < 25 ? 2 : 3) * 10 +
          Math.abs(s.distLy - r);
        return score(a) - score(b);
      });

    return {
      totalStars: insideCumulative.length,
      exoHosts: exoCount,
      hzCumulative,
      onWavefront,
    };
  }, [allSystems, radiusLy]);

  const metiRows = useMemo(() => {
    return METI_BEAMS.map((beam) => {
      const target = systemsById?.get(beam.targetSystemId);
      const distLy = target?.distLy || 0;
      const elapsedLy = Math.max(0, RADIO_REFERENCE_YEAR - beam.transmitYear);
      const currentLy = Math.min(distLy, elapsedLy);
      const pct = distLy > 0 ? Math.min(100, (currentLy / distLy) * 100) : 0;
      const arriveYear = beam.transmitYear + distLy;
      const replyYear = beam.transmitYear + 2 * distLy;
      return {
        ...beam,
        targetName: target?.name || beam.targetSystemId,
        distLy,
        currentLy,
        pct,
        arriveYear,
        replyYear,
        arrived: elapsedLy >= distLy,
      };
    });
  }, [systemsById]);

  if (!isOpen) return null;

  const loc = (obj) => (obj && typeof obj === 'object' ? obj[lang] || obj.en : obj);

  const handleToggleSweep = () => {
    if (!isSweeping && safeYear <= BROADCAST_MIN_YEAR) {
      onSelectYear(BROADCAST_MAX_YEAR);
    }
    setIsSweeping((v) => !v);
  };

  return (
    <aside className="map-floating-panel radio-bubble-panel">
      <div className="mfp-header">
        <div className="mfp-title-group">
          <Radio size={14} className="section-icon" />
          <span className="mfp-title">{t('radioPanelTitle')}</span>
          <span className="hud-tag cyan">{RADIO_REFERENCE_YEAR}</span>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} title={t('hidePanelTooltip')}>
          <X size={13} />
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="mfp-tabs">
        <button
          type="button"
          className={`mfp-tab-btn ${tab === 'shells' ? 'active' : ''}`}
          onClick={() => setTab('shells')}
        >
          <Tv size={11} />
          <span>{t('radioTabShells')} (1926–2026)</span>
        </button>
        <button
          type="button"
          className={`mfp-tab-btn ${tab === 'meti' ? 'active' : ''}`}
          onClick={() => setTab('meti')}
        >
          <Sparkles size={11} />
          <span>{t('radioTabMeti')} ({metiRows.length})</span>
        </button>
      </div>

      <div className="mfp-body">
        {tab === 'shells' ? (
          <>
            {/* Year-by-Year Broadcast Shell Slider */}
            <div className="radio-year-slider-card" style={{ borderColor: era.color }}>
              <div className="radio-year-head">
                <div className="radio-year-readout">
                  <span className="radio-year-big" style={{ color: era.color }}>
                    {safeYear}
                  </span>
                  <span className="radio-radius-pill">
                    {t('radioWavefrontRadius')}: <strong>{radiusLy} ly</strong>
                  </span>
                  {isTwoWayBoundary && radiusLy > 0 && (
                    <span className="hud-tag emerald radio-twoway-tag" title={t('radioTwoWayNote')}>
                      ⇄ ≤50 ly
                    </span>
                  )}
                </div>

                <div className="radio-year-step-btns">
                  <button
                    type="button"
                    className="mini-hud-btn"
                    onClick={() => {
                      setIsSweeping(false);
                      onSelectYear(Math.max(BROADCAST_MIN_YEAR, safeYear - 1));
                    }}
                    disabled={safeYear <= BROADCAST_MIN_YEAR}
                    title={`${safeYear - 1}`}
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <button
                    type="button"
                    className={`mini-hud-btn ${isSweeping ? 'active' : ''}`}
                    onClick={handleToggleSweep}
                    title={t('radioSweepTooltip')}
                  >
                    {isSweeping ? <Pause size={11} /> : <Play size={11} />}
                  </button>
                  <button
                    type="button"
                    className="mini-hud-btn"
                    onClick={() => {
                      setIsSweeping(false);
                      onSelectYear(Math.min(BROADCAST_MAX_YEAR, safeYear + 1));
                    }}
                    disabled={safeYear >= BROADCAST_MAX_YEAR}
                    title={`${safeYear + 1}`}
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>

              <input
                type="range"
                className="radio-year-range"
                min={BROADCAST_MIN_YEAR}
                max={BROADCAST_MAX_YEAR}
                step={1}
                value={safeYear}
                onChange={(e) => {
                  setIsSweeping(false);
                  onSelectYear(Number(e.target.value));
                }}
                aria-label={t('radioYearSliderLabel')}
              />

              <div className="radio-year-scale">
                <span>1926 (100 ly)</span>
                <span className="highlight-emerald">1976 (50 ly ⇄)</span>
                <span>2026 (0 ly)</span>
              </div>

              {/* Quick Era Jump Chips */}
              <div className="radio-shell-chips">
                {QUICK_MILESTONES.map((m) => (
                  <button
                    key={m.year}
                    type="button"
                    className={`radio-shell-chip ${safeYear === m.year ? 'active' : ''} ${m.twoWay ? 'two-way' : ''}`}
                    onClick={() => {
                      setIsSweeping(false);
                      onSelectYear(m.year);
                    }}
                  >
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Era Context & Live Cumulative KPIs */}
            <div className="radio-layer-card" style={{ borderLeftColor: era.color }}>
              <div className="radio-layer-head">
                <strong>{loc(era.title)}</strong>
              </div>
              <p className="radio-layer-desc">{loc(era.summary)}</p>

              <div className="radio-kpi-row">
                <div className="radio-kpi">
                  <span>{t('radioStarsReached')}</span>
                  <strong>{formatNum(shellStats.totalStars, 0, lang)}</strong>
                </div>
                <div className="radio-kpi cyan">
                  <span>{t('radioExoHosts')}</span>
                  <strong>{formatNum(shellStats.exoHosts, 0, lang)}</strong>
                </div>
                <div className="radio-kpi emerald">
                  <span>{t('radioHzReached')}</span>
                  <strong>{formatNum(shellStats.hzCumulative.length, 0, lang)}</strong>
                </div>
              </div>
            </div>

            {/* 2-3 Authentic Broadcasts from This Exact Year */}
            <div className="radio-sub-heading">
              <Tv size={11} />
              <span>
                {t('radioBroadcastsForYear')} {safeYear} ({radiusLy} ly)
              </span>
            </div>
            <div className="radio-broadcasts-list">
              {yearBroadcasts.map((b, idx) => (
                <div key={`${safeYear}-${idx}`} className="radio-broadcast-item">
                  <div className="rb-item-top">
                    <span className={`rb-type-badge ${b.type}`}>{b.type.toUpperCase()}</span>
                    <strong>{loc(b.title)}</strong>
                    <span className="rb-dist">{radiusLy} ly</span>
                  </div>
                  <div className="rb-item-desc">{loc(b.detail)}</div>
                </div>
              ))}
            </div>

            {/* Stars Currently Crossing THIS Exact Year's Wavefront */}
            <div className="radio-sub-heading">
              <Waves size={11} />
              <span>
                {t('radioStarsOnWavefront')} (~{radiusLy} ly: {shellStats.onWavefront.length})
              </span>
            </div>
            {shellStats.onWavefront.length > 0 ? (
              <div className="radio-hz-chips">
                {shellStats.onWavefront.slice(0, 14).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`radio-hz-star-btn ${s.hasOptimisticHZ ? 'wf-hz' : s.hasPlanets ? 'wf-exo' : ''}`}
                    onClick={() => onSelectSystem(s.id, true)}
                    title={`${s.name} (${formatNum(s.distLy, 2, lang)} ly)`}
                  >
                    <span>
                      {s.hasOptimisticHZ ? '◈ ' : s.hasPlanets ? '◎ ' : ''}
                      {s.name}
                    </span>
                    <em>{formatNum(s.distLy, 1, lang)} ly</em>
                  </button>
                ))}
              </div>
            ) : (
              <div className="radio-empty-wf">{t('radioNoStarsOnWavefront')}</div>
            )}

            {/* Confirmed HZ Exoplanet Hosts Reached (<= radiusLy) */}
            {shellStats.hzCumulative.length > 0 && (
              <>
                <div className="radio-sub-heading">
                  <Orbit size={11} />
                  <span>
                    {t('radioHzWorldsReached')} (≤ {radiusLy} ly: {shellStats.hzCumulative.length})
                  </span>
                </div>
                <div className="radio-hz-chips">
                  {shellStats.hzCumulative.slice(0, 14).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="radio-hz-star-btn"
                      onClick={() => onSelectSystem(s.id, true)}
                      title={`${s.name} (${formatNum(s.distLy, 1, lang)} ly)`}
                    >
                      <span>{s.name}</span>
                      <em>{formatNum(s.distLy, 1, lang)} ly</em>
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <label className="lightcone-checkbox radio-meti-toggle">
              <input
                type="checkbox"
                checked={showMetiBeams}
                onChange={(e) => onToggleMetiBeams(e.target.checked)}
              />
              <span>{t('radioShowMetiBeams')}</span>
            </label>

            <div className="meti-beams-list">
              {metiRows.map((m) => (
                <div key={m.id} className="meti-beam-card" style={{ borderLeftColor: m.color }}>
                  <div className="meti-beam-head">
                    <strong>{loc(m.name)}</strong>
                    <button
                      type="button"
                      className="mini-hud-btn"
                      onClick={() => onSelectSystem(m.targetSystemId, true)}
                      title={m.targetName}
                    >
                      <Crosshair size={11} />
                    </button>
                  </div>
                  <div className="meti-beam-meta">
                    <span>→ {m.targetName} ({formatNum(m.distLy, 1, lang)} ly)</span>
                    <span>· {Math.floor(m.transmitYear)}</span>
                  </div>
                  <div className="meti-progress-track">
                    <div
                      className="meti-progress-fill"
                      style={{ width: `${m.pct.toFixed(1)}%`, backgroundColor: m.color }}
                    />
                  </div>
                  <div className="meti-beam-metrics">
                    <span>
                      {t('radioWavefrontNow')}: <strong>{formatNum(m.currentLy, 1, lang)} ly</strong> ({formatNum(m.pct, 0, lang)}%)
                    </span>
                    <span>
                      {t('arrivesLabel')}: <strong className="highlight-cyan">{Math.round(m.arriveYear)}</strong>
                    </span>
                    <span>
                      ⇄ <strong>{Math.round(m.replyYear)}</strong>
                    </span>
                  </div>
                  <div className="meti-beam-note">{loc(m.note)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
