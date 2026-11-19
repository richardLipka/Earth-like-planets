import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { getSystemSourceLinks, getSkyCutoutSources } from '../../utils/catalogLinks.js';
import { sweepStarSciFiLive } from '../../services/scifiService.js';
import { formatNum, formatDurationYears, temperatureToHex, SPECTRAL_COLORS } from '../../utils/format.js';
import { distanceBetweenSystems } from '../../engine/stellarMotion.js';
import {
  Orbit,
  ExternalLink,
  Plus,
  Compass,
  Eye,
  EyeOff,
  Flame,
  ShieldCheck,
  Snowflake,
  Database,
  Sparkles,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  BookOpen,
  Search,
  X,
} from 'lucide-react';

export default function SystemInspector({
  system,
  solSystem,
  lastWaypointSystem,
  epochOffsetYears,
  scifiEntry,
  activeSciFiUniverse,
  onFilterBySciFiUniverse,
  onAppendToRoute,
  onSetAsOrigin,
  onClose,
}) {
  const { lang, t } = useLanguage();
  const [inspectorTab, setInspectorTab] = useState('overview'); // 'overview' | 'sources' | 'scifi'
  const [orreryMode, setOrreryMode] = useState('radar'); // 'radar' | 'log'
  const [radarZoom, setRadarZoom] = useState(1.0);
  const [hoveredPlanet, setHoveredPlanet] = useState(null);
  const [selectedStarIdx, setSelectedStarIdx] = useState(0);
  const [imgSourceIdx, setImgSourceIdx] = useState(0);
  const [imgStatus, setImgStatus] = useState('loading'); // 'loading' | 'loaded' | 'error'

  // Live on-demand Wikipedia Sci-Fi sweep state for the selected star
  const [liveSciFiState, setLiveSciFiState] = useState({ status: 'idle', data: null });

  // Reset per-system UI state whenever the user selects a different star system
  useEffect(() => {
    if (!system) return;
    let defaultIdx = 0;
    if (system.stars?.length > 1 && system.planets?.length > 0) {
      const hostIdx = system.stars.findIndex((st) =>
        system.planets.some((pl) => pl.hostComponent === st.name)
      );
      if (hostIdx >= 0) defaultIdx = hostIdx;
    }
    setSelectedStarIdx(defaultIdx);
    setRadarZoom(1.0);
    setHoveredPlanet(null);
    setImgSourceIdx(0);
    setImgStatus('loading');
    setLiveSciFiState({ status: 'idle', data: null });
  }, [system?.id]);

  const activeStar = useMemo(() => {
    if (!system || !system.stars || system.stars.length === 0) return null;
    return system.stars[Math.min(selectedStarIdx, system.stars.length - 1)] || system.stars[0];
  }, [system, selectedStarIdx]);

  const distFromSol = useMemo(() => {
    if (!system || !solSystem) return system?.distLy || 0;
    return distanceBetweenSystems(solSystem, system, epochOffsetYears);
  }, [system, solSystem, epochOffsetYears]);

  const distFromLastStop = useMemo(() => {
    if (!system || !lastWaypointSystem || lastWaypointSystem.id === system.id) return null;
    return distanceBetweenSystems(lastWaypointSystem, system, epochOffsetYears);
  }, [system, lastWaypointSystem, epochOffsetYears]);

  const sourceLinks = useMemo(() => getSystemSourceLinks(system, lang), [system, lang]);
  const skySources = useMemo(() => getSkyCutoutSources(system), [system]);
  const currentSkySource = skySources[imgSourceIdx] || null;

  if (!system || !activeStar) return null;

  const hz = activeStar.hz;
  const allSystemPlanets = system.planets || [];
  const componentPlanets =
    system.stars.length > 1
      ? allSystemPlanets.filter((pl) => pl.hostComponent === activeStar.name)
      : allSystemPlanets;
  const hasAnySystemPlanets = allSystemPlanets.length > 0;
  const hasComponentPlanets = componentPlanets.length > 0;

  // Radar Orrery Geometry
  const svgSize = 270;
  const center = svgSize / 2;
  const maxRadiusPx = center - 18;
  const maxOrbitAU = Math.max(
    ...componentPlanets.map((p) => p.semiMajorAxisAU || 0),
    hz.earlyMarsAU * 1.28,
    0.05
  );
  const auToPx = (au) => ((au || 0) * maxRadiusPx * radarZoom) / maxOrbitAU;
  const starHex = temperatureToHex(activeStar.teff);

  // Logarithmic AU Strip Geometry
  const logMin = Math.log10(
    Math.min(
      hz.recentVenusAU * 0.35,
      ...componentPlanets.map((p) => p.semiMajorAxisAU || 1),
      0.01
    )
  );
  const logMax = Math.log10(
    Math.max(
      hz.earlyMarsAU * 2.2,
      ...componentPlanets.map((p) => p.semiMajorAxisAU || 1),
      0.5
    )
  );
  const auToLogX = (au) => {
    const l = Math.log10(Math.max(1e-4, au));
    return 24 + ((l - logMin) / Math.max(0.1, logMax - logMin)) * (260 - 40);
  };

  // Space velocity magnitude in km/s (1 ly/kyr ≈ 299.792 km/s)
  const velMagLyKyr = system.vel ? Math.hypot(...system.vel) : 0;
  const velKmS = velMagLyKyr * 299.792458;

  const handleImgError = () => {
    if (imgSourceIdx + 1 < skySources.length) {
      setImgSourceIdx((i) => i + 1);
      setImgStatus('loading');
    } else {
      setImgStatus('error');
    }
  };

  const handleLiveSciFiSweep = async () => {
    setLiveSciFiState({ status: 'loading', data: null });
    const data = await sweepStarSciFiLive(system, scifiEntry?.aliases || []);
    setLiveSciFiState({ status: 'done', data });
  };

  const getPlanetHzStatusForZone = (pl) => {
    const starForPl = system.stars.find((s) => s.name === pl.hostComponent) || activeStar;
    const targetHz = starForPl?.hz || hz;
    if (pl.hzStatus === 2) return 'conservative';
    if (pl.hzStatus === 1) return 'optimistic';
    if ((pl.semiMajorAxisAU || 0) < targetHz.recentVenusAU) return 'hot';
    return 'cold';
  };

  const scifiCount = scifiEntry?.totalCount || 0;

  return (
    <aside className="hud-panel right-inspector-dock">
      {/* Header */}
      <div className="panel-header panel-header-flex">
        <div>
          <div className="panel-kicker">{t('inspectorTitle')}</div>
          <h2 className="inspector-star-title">
            <span
              className="spectral-dot"
              style={{ backgroundColor: SPECTRAL_COLORS[activeStar.cls] || '#ffe9b0' }}
            />
            {system.name}
          </h2>
          {scifiEntry?.aliases?.length > 0 && (
            <div className="inspector-aliases-line">
              {t('scifiAlsoKnownAs')}: {scifiEntry.aliases.slice(0, 3).join(' · ')}
            </div>
          )}
          <div className="inspector-sub-badges">
            <span className="hud-tag">{activeStar.spect}</span>
            {system.constellation && <span className="hud-tag dim">{system.constellation}</span>}
            {system.hasConservativeHZ ? (
              <span className="hud-tag emerald">◈ {t('zoneConservativeHZ')}</span>
            ) : system.hasOptimisticHZ ? (
              <span className="hud-tag amber">◇ {t('zoneOptimisticHZ')}</span>
            ) : system.hasPlanets ? (
              <span className="hud-tag cyan">◎ {system.planetCount} {t('planetsShort')}</span>
            ) : null}
            {scifiCount > 0 && (
              <button
                type="button"
                className="hud-tag scifi-pill-btn"
                onClick={() => setInspectorTab('scifi')}
                title={t('scifiSectionTitle')}
              >
                ★ {t('scifiBadgeLabel')} ({scifiCount})
              </button>
            )}
          </div>
        </div>
        {onClose && (
          <button type="button" className="icon-btn panel-close-btn" onClick={onClose} title={t('hidePanelTooltip')}>
            <X size={15} />
          </button>
        )}
      </div>

      {/* Quick Route Actions */}
      <div className="inspector-action-row">
        <button
          type="button"
          className="hud-btn primary-btn"
          onClick={() => onAppendToRoute(system.id)}
        >
          <Plus size={14} />
          <span>{t('btnAppendToRoute')}</span>
        </button>
        <button
          type="button"
          className="hud-btn secondary-btn"
          onClick={() => onSetAsOrigin(system.id)}
        >
          <Compass size={14} />
          <span>{t('btnSetAsOrigin')}</span>
        </button>
      </div>

      {/* Clean 3-Tab Sub-Navigation (Overview & HZ | Sources & Sky | In Sci-Fi) */}
      <div className="dock-tabs-bar">
        <button
          type="button"
          className={`dock-tab-btn ${inspectorTab === 'overview' ? 'active' : ''}`}
          onClick={() => setInspectorTab('overview')}
        >
          <Orbit size={12} />
          <span>{t('inspectorTabOverview')}</span>
        </button>
        <button
          type="button"
          className={`dock-tab-btn ${inspectorTab === 'sources' ? 'active' : ''}`}
          onClick={() => setInspectorTab('sources')}
        >
          <Database size={12} />
          <span>{t('inspectorTabSources')}</span>
        </button>
        <button
          type="button"
          className={`dock-tab-btn ${inspectorTab === 'scifi' ? 'active' : ''}`}
          onClick={() => setInspectorTab('scifi')}
        >
          <BookOpen size={12} />
          <span>
            {t('inspectorTabSciFi')}
            {scifiCount > 0 ? ` (${scifiCount})` : ''}
          </span>
        </button>
      </div>

      <div className="inspector-scroll-body">
        {inspectorTab === 'overview' && (
          <>
            {/* Catalogue Designation Badges */}
            <div className="catalogue-ids-bar">
              {system.ids?.hip && <span className="id-chip">HIP {system.ids.hip}</span>}
              {system.ids?.hd && <span className="id-chip">HD {system.ids.hd}</span>}
              {system.ids?.hr && <span className="id-chip">HR {system.ids.hr}</span>}
              {system.ids?.gl && <span className="id-chip">{system.ids.gl}</span>}
              {system.ids?.gaiaDr3 && (
                <span className="id-chip" title={`Gaia DR3 ${system.ids.gaiaDr3}`}>
                  Gaia DR3 {system.ids.gaiaDr3.slice(0, 10)}…
                </span>
              )}
              {system.ids?.ticId && <span className="id-chip">TIC {system.ids.ticId}</span>}
            </div>

            {/* Astrometric & Comm Distance Readout */}
            <div className="telemetry-kv-grid">
              <div className="kv-cell">
                <span className="kv-label">{t('distFromSol')}</span>
                <span className="kv-value highlight-cyan">
                  {formatNum(distFromSol, 3, lang)} ly <small>({formatNum(distFromSol / 3.26156, 2, lang)} pc)</small>
                </span>
              </div>
              {distFromLastStop !== null && (
                <div className="kv-cell">
                  <span className="kv-label">{t('distFromSelected')} ({lastWaypointSystem.name})</span>
                  <span className="kv-value highlight-emerald">{formatNum(distFromLastStop, 3, lang)} ly</span>
                </div>
              )}
              <div className="kv-cell">
                <span className="kv-label">{t('lightDelayFromSol')}</span>
                <span className="kv-value">{formatDurationYears(distFromSol, lang)}</span>
              </div>
              <div className="kv-cell">
                <span className="kv-label">{t('roundTripPingSol')}</span>
                <span className="kv-value">{formatDurationYears(distFromSol * 2, lang)}</span>
              </div>
              <div className="kv-cell">
                <span className="kv-label">{t('apparentMagV')}</span>
                <span className="kv-value">
                  {formatNum(system.vmag, 2, lang)} mag{' '}
                  <span className={`vis-pill ${system.isVisibleFromEarth ? 'vis-yes' : 'vis-no'}`}>
                    {system.isVisibleFromEarth ? <Eye size={11} /> : <EyeOff size={11} />}
                    {system.isVisibleFromEarth ? t('visibleFromEarthYes') : t('visibleFromEarthNo')}
                  </span>
                </span>
              </div>
              <div className="kv-cell">
                <span className="kv-label">{t('properMotion3D')}</span>
                <span className="kv-value">
                  {system.id === 'sol' ? (
                    <>
                      0 km/s
                      <small className="block-note">{t('velocitySolRef')}</small>
                    </>
                  ) : velMagLyKyr < 1e-5 ? (
                    <>
                      —
                      <small className="block-note">{t('velocityUnknown')}</small>
                    </>
                  ) : (
                    <>
                      {formatNum(velKmS, 1, lang)} km/s ({formatNum(velMagLyKyr, 3, lang)} ly/kyr)
                      <small className="block-note">
                        {system.hasFull3dVelocity ? t('velocityFull3D') : t('velocityTangential')}
                      </small>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Multi-Star Component Switcher & Astrophysical Parameters */}
            <div className="section-block">
              <div className="section-title-row">
                <Sparkles size={13} className="section-icon" />
                <span>
                  {t('stellarComponentsTitle')} ({system.stars.length})
                </span>
              </div>

              {system.stars.length > 1 && (
                <div className="component-tabs">
                  {system.stars.map((st, idx) => {
                    const stPlanetCount = allSystemPlanets.filter((p) => p.hostComponent === st.name).length;
                    return (
                      <button
                        key={st.name + idx}
                        type="button"
                        className={`comp-tab-btn ${idx === selectedStarIdx ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedStarIdx(idx);
                          setRadarZoom(1.0);
                        }}
                      >
                        <span
                          className="comp-dot"
                          style={{ backgroundColor: SPECTRAL_COLORS[st.cls] || '#ffe9b0' }}
                        />
                        <span>{st.name}</span>
                        <small>({st.spect})</small>
                        {stPlanetCount > 0 && <span className="comp-pl-badge">◎{stPlanetCount}</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="star-params-grid">
                <div className="param-box">
                  <span className="p-label">{t('teffLabel')}</span>
                  <span className="p-val">{formatNum(activeStar.teff, 0, lang)} K</span>
                </div>
                <div className="param-box">
                  <span className="p-label">{t('lumLabel')}</span>
                  <span className="p-val">{formatNum(activeStar.lum, 4, lang)} L☉</span>
                </div>
                <div className="param-box">
                  <span className="p-label">{t('radiusLabelStar')}</span>
                  <span className="p-val">{formatNum(activeStar.radius, 3, lang)} R☉</span>
                </div>
                <div className="param-box">
                  <span className="p-label">{t('massLabelStar')}</span>
                  <span className="p-val">{activeStar.mass ? `${formatNum(activeStar.mass, 2, lang)} M☉` : '—'}</span>
                </div>
              </div>
            </div>

            {/* Habitable Zone & Confirmed Planetary Architecture (Kopparapu et al. 2014) */}
            <div className="section-block">
              <div className="section-title-row">
                <Orbit size={14} className="section-icon" />
                <span>
                  {t('orreryTitle')}
                  {system.stars.length > 1 ? ` · ${activeStar.name}` : ''}
                </span>
                <div className="orrery-mode-toggle">
                  <button
                    type="button"
                    className={`mini-tab ${orreryMode === 'radar' ? 'active' : ''}`}
                    onClick={() => setOrreryMode('radar')}
                    title={t('orreryViewRadar')}
                  >
                    2D
                  </button>
                  <button
                    type="button"
                    className={`mini-tab ${orreryMode === 'log' ? 'active' : ''}`}
                    onClick={() => setOrreryMode('log')}
                    title={t('orreryViewLog')}
                  >
                    Log AU
                  </button>
                </div>
              </div>

              <div className={`hz-status-notice ${hasComponentPlanets ? 'confirmed' : 'theoretical'}`}>
                {hasComponentPlanets
                  ? t('confirmedPlanetsBanner')
                  : hasAnySystemPlanets
                    ? t('noPlanetsOnComponentBanner')
                    : t('noConfirmedPlanetsBanner')}
              </div>

              {orreryMode === 'radar' ? (
                <div className="radar-orrery-box">
                  <div className="radar-zoom-bar">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setRadarZoom((z) => Math.max(0.35, z * 0.75))}
                    >
                      <ZoomOut size={13} />
                    </button>
                    <span>{Math.round(radarZoom * 100)}%</span>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setRadarZoom((z) => Math.min(6.0, z * 1.35))}
                    >
                      <ZoomIn size={13} />
                    </button>
                  </div>

                  <svg viewBox={`0 0 ${svgSize} ${svgSize}`} className="radar-orrery-svg">
                    <defs>
                      <radialGradient id={`starGlow-${system.id}-${selectedStarIdx}`} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                        <stop offset="30%" stopColor={starHex} stopOpacity="0.85" />
                        <stop offset="100%" stopColor={starHex} stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    <circle cx={center} cy={center} r={center - 10} fill="none" stroke="rgba(0, 240, 255, 0.1)" strokeDasharray="3,3" />
                    <line x1={center} y1={8} x2={center} y2={svgSize - 8} stroke="rgba(0, 240, 255, 0.08)" />
                    <line x1={8} y1={center} x2={svgSize - 8} y2={center} stroke="rgba(0, 240, 255, 0.08)" />

                    {/* Optimistic HZ */}
                    <circle
                      cx={center}
                      cy={center}
                      r={Math.min(center * 2, auToPx(hz.earlyMarsAU))}
                      fill="rgba(0, 255, 136, 0.07)"
                      stroke="rgba(0, 255, 136, 0.3)"
                      strokeDasharray="2,3"
                    />
                    <circle
                      cx={center}
                      cy={center}
                      r={Math.min(center * 2, auToPx(hz.recentVenusAU))}
                      fill="#050a16"
                      stroke="rgba(255, 170, 0, 0.35)"
                      strokeDasharray="2,3"
                    />

                    {/* Conservative HZ */}
                    <circle
                      cx={center}
                      cy={center}
                      r={Math.min(center * 2, auToPx(hz.maximumGreenhouseAU))}
                      fill="rgba(0, 255, 136, 0.15)"
                      stroke="rgba(0, 255, 136, 0.65)"
                      strokeWidth="1.2"
                      strokeDasharray="4,2"
                    />
                    <circle
                      cx={center}
                      cy={center}
                      r={Math.min(center * 2, auToPx(hz.runawayGreenhouseAU))}
                      fill="#050a16"
                      stroke="rgba(255, 170, 0, 0.6)"
                      strokeWidth="1.2"
                      strokeDasharray="4,2"
                    />

                    {/* Earth Equivalent Insolation */}
                    <circle
                      cx={center}
                      cy={center}
                      r={Math.min(center * 2, auToPx(hz.earthEquivAU))}
                      fill="none"
                      stroke="#00f0ff"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                      opacity="0.75"
                    />

                    {componentPlanets.map((pl, idx) => {
                      if (!pl.semiMajorAxisAU) return null;
                      const rPx = auToPx(pl.semiMajorAxisAU);
                      if (rPx < 3 || rPx > center * 1.45) return null;
                      const angle = ((idx * (360 / Math.max(1, componentPlanets.length)) + 35) % 360) * (Math.PI / 180);
                      const px = center + rPx * Math.cos(angle);
                      const py = center + rPx * Math.sin(angle);
                      const dotR = Math.max(3.2, Math.min(7.5, Math.sqrt(pl.radiusEarth || 1.2) * 2.6));
                      const col =
                        pl.hzStatus === 2
                          ? '#00ff88'
                          : pl.hzStatus === 1
                            ? '#fde047'
                            : pl.semiMajorAxisAU < hz.recentVenusAU
                              ? '#fb7185'
                              : '#38bdf8';
                      const isHov = hoveredPlanet?.name === pl.name;

                      return (
                        <g
                          key={pl.name}
                          onMouseEnter={() => setHoveredPlanet(pl)}
                          onMouseLeave={() => setHoveredPlanet(null)}
                          style={{ cursor: 'pointer' }}
                        >
                          <circle
                            cx={center}
                            cy={center}
                            r={rPx}
                            fill="none"
                            stroke={isHov ? '#00f0ff' : 'rgba(255,255,255,0.18)'}
                            strokeWidth={isHov ? 1.5 : 0.9}
                          />
                          <circle cx={px} cy={py} r={dotR} fill={col} stroke="#030712" strokeWidth="1" />
                          <text
                            x={px + dotR + 3}
                            y={py + 3}
                            fontSize="9.5"
                            fontFamily="'JetBrains Mono', monospace"
                            fill={isHov ? '#00f0ff' : '#cbd5e1'}
                          >
                            {pl.name}
                          </text>
                        </g>
                      );
                    })}

                    <circle cx={center} cy={center} r={14} fill={`url(#starGlow-${system.id}-${selectedStarIdx})`} />
                    <circle cx={center} cy={center} r={5.5} fill={starHex} stroke="#ffffff" strokeWidth="1" />
                  </svg>

                  {hoveredPlanet && (
                    <div className="orrery-hover-strip">
                      <strong>{hoveredPlanet.name}</strong> · {formatNum(hoveredPlanet.semiMajorAxisAU, 3, lang)} AU
                      {hoveredPlanet.radiusEarth ? ` · ${formatNum(hoveredPlanet.radiusEarth, 2, lang)} R⊕` : ''}
                      {hoveredPlanet.eqTempK ? ` · ${formatNum(hoveredPlanet.eqTempK, 0, lang)} K` : ''}
                    </div>
                  )}
                </div>
              ) : (
                <div className="log-orrery-box">
                  <svg viewBox="0 0 260 80" className="log-orrery-svg">
                    <rect
                      x={auToLogX(hz.recentVenusAU)}
                      y={16}
                      width={Math.max(2, auToLogX(hz.earlyMarsAU) - auToLogX(hz.recentVenusAU))}
                      height={34}
                      fill="rgba(0, 255, 136, 0.1)"
                      stroke="rgba(0, 255, 136, 0.3)"
                    />
                    <rect
                      x={auToLogX(hz.runawayGreenhouseAU)}
                      y={19}
                      width={Math.max(2, auToLogX(hz.maximumGreenhouseAU) - auToLogX(hz.runawayGreenhouseAU))}
                      height={28}
                      fill="rgba(0, 255, 136, 0.22)"
                      stroke="#00ff88"
                    />
                    <line x1={12} y1={33} x2={248} y2={33} stroke="#334155" strokeWidth="1.2" />
                    <circle cx={12} cy={33} r={5} fill={starHex} stroke="#fff" />

                    {componentPlanets.map((pl) => {
                      if (!pl.semiMajorAxisAU) return null;
                      const cx = auToLogX(pl.semiMajorAxisAU);
                      const col = pl.hzStatus === 2 ? '#00ff88' : pl.hzStatus === 1 ? '#fde047' : '#38bdf8';
                      return (
                        <g key={pl.name}>
                          <circle cx={cx} cy={33} r={4} fill={col} stroke="#020617" />
                          <text
                            x={cx}
                            y={12}
                            textAnchor="middle"
                            fontSize="7.5"
                            fontFamily="'JetBrains Mono', monospace"
                            fill="#e2e8f0"
                          >
                            {pl.name.replace(system.name, '').trim() || pl.name}
                          </text>
                        </g>
                      );
                    })}

                    {[-2, -1, 0, 1].map((exp) => {
                      const au = 10 ** exp;
                      const tx = auToLogX(au);
                      if (tx < 20 || tx > 245) return null;
                      return (
                        <g key={exp}>
                          <line x1={tx} y1={52} x2={tx} y2={57} stroke="#64748b" />
                          <text x={tx} y={68} textAnchor="middle" fontSize="8" fontFamily="'JetBrains Mono', monospace" fill="#94a3b8">
                            {au} AU
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}

              {/* Kopparapu HZ Telemetry Boxes */}
              <div className="hz-limits-grid">
                <div className="hz-limit-card inner">
                  <span className="hz-lim-title">
                    <Flame size={10} /> Runaway GH
                  </span>
                  <strong>{formatNum(hz.runawayGreenhouseAU, 3, lang)} AU</strong>
                  <small>Recent Venus: {formatNum(hz.recentVenusAU, 3, lang)} AU</small>
                </div>
                <div className="hz-limit-card earth">
                  <span className="hz-lim-title">
                    <ShieldCheck size={10} /> 1.0 S⊕ Flux
                  </span>
                  <strong>{formatNum(hz.earthEquivAU, 3, lang)} AU</strong>
                  <small>Kopparapu (2014)</small>
                </div>
                <div className="hz-limit-card outer">
                  <span className="hz-lim-title">
                    <Snowflake size={10} /> Max GH
                  </span>
                  <strong>{formatNum(hz.maximumGreenhouseAU, 3, lang)} AU</strong>
                  <small>Early Mars: {formatNum(hz.earlyMarsAU, 3, lang)} AU</small>
                </div>
              </div>

              {hz.extrapolated && (
                <div className="hz-extrapolated-warn">
                  <AlertTriangle size={11} />
                  <span>{t('hzExtrapolatedNote')}</span>
                </div>
              )}

              {/* Confirmed Exoplanets Table */}
              {hasAnySystemPlanets && (
                <div className="planets-table-wrap">
                  <table className="hud-table planets-table">
                    <thead>
                      <tr>
                        <th>{t('planetColName')}</th>
                        <th>{t('planetColOrbit')}</th>
                        <th>R / M</th>
                        <th>{t('planetColZone')}</th>
                        <th>{t('planetColSource')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allSystemPlanets.map((pl) => {
                        const zoneKey = getPlanetHzStatusForZone(pl);
                        return (
                          <tr key={pl.name} className={pl.hzStatus > 0 ? 'hz-planet-row' : ''}>
                            <td className="planet-name-cell">
                              <strong>{pl.name}</strong>
                              {system.stars.length > 1 && <small className="host-comp-sub">{pl.hostComponent}</small>}
                            </td>
                            <td>
                              {pl.semiMajorAxisAU ? `${formatNum(pl.semiMajorAxisAU, 3, lang)} AU` : '—'}
                              {pl.periodDays && <small className="block-note">{formatNum(pl.periodDays, 1, lang)} d</small>}
                            </td>
                            <td>
                              {pl.radiusEarth ? `${formatNum(pl.radiusEarth, 2, lang)} R⊕` : ''}
                              {pl.massEarth ? (
                                <small className="block-note">{formatNum(pl.massEarth, 2, lang)} M⊕</small>
                              ) : null}
                            </td>
                            <td>
                              {zoneKey === 'conservative' ? (
                                <span className="zone-pill conservative">◈ {t('zoneConservativeHZ')}</span>
                              ) : zoneKey === 'optimistic' ? (
                                <span className="zone-pill optimistic">◇ {t('zoneOptimisticHZ')}</span>
                              ) : zoneKey === 'hot' ? (
                                <span className="zone-pill hot">{t('zoneHot')}</span>
                              ) : (
                                <span className="zone-pill cold">{t('zoneCold')}</span>
                              )}
                            </td>
                            <td>
                              {pl.discoveryUrl ? (
                                <a
                                  href={pl.discoveryUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="source-ref-link"
                                  title={pl.discoveryMethod}
                                >
                                  <span>{pl.discoveryCitation || pl.discoveryYear || 'ADS'}</span>
                                  <ExternalLink size={10} />
                                </a>
                              ) : (
                                <span className="dim-text">{pl.discoveryCitation || pl.discoveryYear || '—'}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {inspectorTab === 'sources' && (
          <div className="section-block">
            <div className="section-title-row">
              <Database size={13} className="section-icon" />
              <span>{t('originalSourcesTitle')}</span>
            </div>

            {currentSkySource && (
              <div className="sky-cutout-card">
                {imgStatus === 'loading' && (
                  <div className="sky-cutout-placeholder">{t('loadingSkyImage')}</div>
                )}
                {imgStatus === 'error' ? (
                  <div className="sky-cutout-placeholder error">{t('skyImageUnavailable')}</div>
                ) : (
                  <img
                    key={currentSkySource.url}
                    src={currentSkySource.url}
                    alt={`${system.name} Sky Survey Cutout`}
                    className={`sky-cutout-img ${imgStatus === 'loaded' ? 'loaded' : 'loading'}`}
                    onLoad={() => setImgStatus('loaded')}
                    onError={handleImgError}
                  />
                )}
                <div className="sky-cutout-caption">
                  <span>{currentSkySource.label}</span>
                  {system.ra !== null && system.ra !== undefined && (
                    <span>
                      RA {formatNum(system.ra, 3, lang)}° · Dec {formatNum(system.dec, 3, lang)}°
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="source-links-list">
              {sourceLinks.map((lnk) => (
                <a
                  key={lnk.id}
                  href={lnk.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="source-link-card"
                >
                  <div className="source-link-left">
                    <span className="source-badge">{lnk.badge}</span>
                    <div>
                      <div className="source-link-title">{lnk.name}</div>
                      <div className="source-link-sub">{lnk.subtitle}</div>
                    </div>
                  </div>
                  <ExternalLink size={13} className="source-ext-icon" />
                </a>
              ))}
            </div>
          </div>
        )}

        {inspectorTab === 'scifi' && (
          <div className="section-block">
            <div className="section-title-row">
              <BookOpen size={13} className="section-icon" />
              <span>{t('scifiSectionTitle')}</span>
            </div>

            {scifiEntry ? (
              <>
                {scifiEntry.universes?.length > 0 && (
                  <div className="scifi-subsection">
                    <div className="scifi-sub-heading">{t('scifiUniversesLabel')}</div>
                    <div className="scifi-universe-chips">
                      {scifiEntry.universes.map((uni) => {
                        const isActive = activeSciFiUniverse === uni;
                        return (
                          <button
                            key={uni}
                            type="button"
                            className={`scifi-uni-chip ${isActive ? 'active' : ''}`}
                            onClick={() => onFilterBySciFiUniverse && onFilterBySciFiUniverse(uni)}
                            title={t('scifiUniverseFilterLabel')}
                          >
                            ★ {uni}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {scifiEntry.sfeUrl && (
                  <a
                    href={scifiEntry.sfeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-link-card scifi-sfe-card"
                  >
                    <div className="source-link-left">
                      <span className="source-badge scifi-badge">SFE</span>
                      <div>
                        <div className="source-link-title">{t('scifiSfeLink')}</div>
                        <div className="source-link-sub">sf-encyclopedia.com</div>
                      </div>
                    </div>
                    <ExternalLink size={13} className="source-ext-icon" />
                  </a>
                )}

                {scifiEntry.notableWorks?.length > 0 && (
                  <div className="scifi-subsection">
                    <div className="scifi-sub-heading">
                      {t('scifiHighlightsTitle')} ({scifiEntry.notableWorks.length})
                    </div>
                    <div className="scifi-works-list">
                      {scifiEntry.notableWorks.map((w, idx) => (
                        <div key={`${w.title}-${idx}`} className="scifi-work-card">
                          <div className="scifi-work-top">
                            {w.url ? (
                              <a
                                href={w.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="scifi-work-title"
                              >
                                {w.title} <ExternalLink size={10} />
                              </a>
                            ) : (
                              <strong className="scifi-work-title">{w.title}</strong>
                            )}
                            <span className={`scifi-med-badge ${w.medium}`}>{w.medium}</span>
                          </div>
                          <div className="scifi-work-meta">
                            <span>{w.author}</span>
                            {w.year && <span>({w.year})</span>}
                            {w.source && <span className="scifi-work-source">· {w.source}</span>}
                          </div>
                          {w.world && <div className="scifi-work-world">→ {w.world}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {scifiEntry.wikiWorks?.length > 0 && (
                  <div className="scifi-subsection">
                    <div className="scifi-sub-heading">
                      {t('scifiWikiCategoryTitle')} ({scifiEntry.wikiWorks.length})
                    </div>
                    <div className="scifi-wiki-chips">
                      {scifiEntry.wikiWorks.map((ww) => (
                        <a
                          key={ww.title}
                          href={ww.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="scifi-wiki-chip"
                        >
                          <span>{ww.title}</span>
                          <ExternalLink size={9} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="no-route-hint-box">{t('scifiNoPreloaded')}</div>
            )}

            {/* On-Demand Live Wikipedia Sweep Button for ANY star in the 3D sphere */}
            {system.id !== 'sol' && (
              <div className="scifi-live-sweep-block">
                <button
                  type="button"
                  className="hud-btn secondary-btn full-width"
                  disabled={liveSciFiState.status === 'loading'}
                  onClick={handleLiveSciFiSweep}
                >
                  <Search size={13} />
                  <span>
                    {liveSciFiState.status === 'loading' ? t('scifiSweeping') : t('scifiSweepLiveBtn')}
                  </span>
                </button>

                {liveSciFiState.status === 'done' && liveSciFiState.data && (
                  <div className="scifi-live-results">
                    <div className="scifi-sub-heading">{t('scifiLiveResultsTitle')}</div>
                    {liveSciFiState.data.categoryWorks.length === 0 &&
                    liveSciFiState.data.searchHits.length === 0 ? (
                      <div className="dim-text">{t('scifiLiveNoHits')}</div>
                    ) : (
                      <>
                        {liveSciFiState.data.categoryWorks.length > 0 && (
                          <div className="scifi-wiki-chips">
                            {liveSciFiState.data.categoryWorks.map((cw) => (
                              <a
                                key={cw.title}
                                href={cw.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="scifi-wiki-chip"
                              >
                                <span>{cw.title}</span>
                                <ExternalLink size={9} />
                              </a>
                            ))}
                          </div>
                        )}
                        <div className="scifi-works-list">
                          {liveSciFiState.data.searchHits.map((hit) => (
                            <a
                              key={hit.title}
                              href={hit.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="scifi-live-hit-card"
                            >
                              <div className="scifi-work-top">
                                <span className="scifi-work-title">
                                  {hit.title} <ExternalLink size={10} />
                                </span>
                              </div>
                              <p className="scifi-hit-snippet">{hit.snippet}…</p>
                            </a>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
