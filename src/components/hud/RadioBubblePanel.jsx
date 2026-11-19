import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { formatNum } from '../../utils/format.js';
import {
  RADIO_REFERENCE_YEAR,
  RADIO_SHELL_LAYERS,
  METI_BEAMS,
} from '../../data/radioBroadcastLayers.js';
import { Radio, Tv, Sparkles, Crosshair, X, Orbit } from 'lucide-react';

export default function RadioBubblePanel({
  isOpen,
  onClose,
  selectedLayerId,
  onSelectLayerId,
  showMetiBeams,
  onToggleMetiBeams,
  allSystems,
  systemsById,
  onSelectSystem,
}) {
  const { lang, t } = useLanguage();
  const [tab, setTab] = useState('shells'); // 'shells' | 'meti'

  const activeLayer = useMemo(
    () => RADIO_SHELL_LAYERS.find((l) => l.id === selectedLayerId) || RADIO_SHELL_LAYERS[0],
    [selectedLayerId]
  );

  // Real catalogued stars & confirmed HZ exoplanets inside the selected shell radius
  const shellStats = useMemo(() => {
    const list = (allSystems || []).filter((s) => s.id !== 'sol');
    const r = activeLayer.radiusLy;
    const innerR = activeLayer.innerRadiusLy || 0;

    const insideCumulative = list.filter((s) => s.distLy <= r);
    const hzCumulative = insideCumulative
      .filter((s) => s.hasOptimisticHZ)
      .sort((a, b) => a.distLy - b.distLy);
    const hzInBand = hzCumulative.filter((s) => s.distLy > innerR && s.distLy <= r);
    const exoCount = insideCumulative.filter((s) => s.hasPlanets).length;

    return {
      totalStars: insideCumulative.length,
      exoHosts: exoCount,
      hzCumulative,
      hzInBand,
    };
  }, [allSystems, activeLayer]);

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
          <span>{t('radioTabShells')}</span>
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
            {/* Clickable Shell Layer Selector Pills */}
            <div className="radio-shell-chips">
              {RADIO_SHELL_LAYERS.map((layer) => {
                const isSelected = layer.id === activeLayer.id;
                return (
                  <button
                    key={layer.id}
                    type="button"
                    className={`radio-shell-chip ${isSelected ? 'active' : ''} ${layer.isTwoWayHorizon ? 'two-way' : ''}`}
                    style={{ borderColor: isSelected ? layer.color : undefined }}
                    onClick={() => onSelectLayerId(layer.id)}
                  >
                    <span className="radio-chip-dot" style={{ backgroundColor: layer.color }} />
                    <span>{loc(layer.badge)}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Shell Description & KPIs */}
            <div className="radio-layer-card" style={{ borderLeftColor: activeLayer.color }}>
              <div className="radio-layer-head">
                <strong>{loc(activeLayer.title)}</strong>
              </div>
              <p className="radio-layer-desc">{loc(activeLayer.summary)}</p>

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

            {/* Historical TV, Radio & Space Broadcasts inside this Shell Layer */}
            <div className="radio-sub-heading">{t('radioBroadcastsInLayer')}</div>
            <div className="radio-broadcasts-list">
              {activeLayer.broadcasts.map((b, idx) => {
                const distNow = Math.max(0, RADIO_REFERENCE_YEAR - b.year);
                return (
                  <div key={idx} className="radio-broadcast-item">
                    <div className="rb-item-top">
                      <span className={`rb-type-badge ${b.type}`}>{b.year}</span>
                      <strong>{loc(b.title)}</strong>
                      <span className="rb-dist">{distNow} ly</span>
                    </div>
                    <div className="rb-item-desc">{loc(b.detail)}</div>
                  </div>
                );
              })}
            </div>

            {/* Confirmed HZ Exoplanet Hosts Reached */}
            <div className="radio-sub-heading">
              <Orbit size={11} />
              <span>
                {t('radioHzWorldsReached')} (≤ {activeLayer.radiusLy} ly: {shellStats.hzCumulative.length}
                {shellStats.hzInBand.length > 0 && activeLayer.innerRadiusLy > 0
                  ? ` · ${activeLayer.innerRadiusLy}–${activeLayer.radiusLy} ly: ${shellStats.hzInBand.length}`
                  : ''}
                )
              </span>
            </div>
            <div className="radio-hz-chips">
              {(shellStats.hzInBand.length > 0 ? shellStats.hzInBand : shellStats.hzCumulative)
                .slice(0, 18)
                .map((s) => (
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
