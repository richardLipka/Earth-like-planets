import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { formatNum, formatDurationYears } from '../../utils/format.js';
import {
  solveSignalToShip,
  computeShipTransmission,
  solveShipToShipSignal,
  computeShipRendezvous,
} from '../../engine/commLightCone.js';
import { LY_PER_PARSEC } from '../../engine/relativity.js';
import { systemPosAtEpoch } from '../../engine/stellarMotion.js';
import {
  Rocket,
  Navigation,
  Plus,
  Trash2,
  ArrowUpDown,
  RotateCcw,
  Radio,
  Zap,
  Clock,
  Activity,
  Copy,
  BookMarked,
  Eye,
  X,
} from 'lucide-react';

export default function RouteComputerPanel({
  ships,
  shipsWithVoyages = [],
  activeShipId,
  onSelectShip,
  onAddShip,
  onDuplicateShip,
  onDeleteShip,
  onClearAllVoyages,
  onUpdateActiveShip,
  activeVoyage,
  selectedSystem,
  systemsById,
  epochOffsetYears,
  masterClockYear,
  lightConeConfig,
  onUpdateLightConeConfig,
  onSelectSystem,
  activeVoyagePreset,
  onOpenVoyageLibrary,
  isBridgeViewOpen,
  onToggleBridgeView,
  onClose,
}) {
  const { lang, t } = useLanguage();
  const [panelTab, setPanelTab] = useState('plan'); // 'plan' | 'telemetry' | 'comm'
  const [commTab, setCommTab] = useState('to-ship'); // 'to-ship' | 'from-ship' | 'ship-to-ship'
  const [emitterSystemId, setEmitterSystemId] = useState('sol');
  const [emitYearOffset, setEmitYearOffset] = useState(2.0);
  const [shipTxYearOffset, setShipTxYearOffset] = useState(2.5);
  const [peerShipId, setPeerShipId] = useState('');
  const [interShipOffset, setInterShipOffset] = useState(1.0);

  const activeShip = useMemo(
    () => ships.find((s) => s.id === activeShipId) || ships[0],
    [ships, activeShipId]
  );

  // Hooks must always run unconditionally before any early return
  const safeDepartureYear = activeShip?.departureYear ?? 2150;
  const emitCoordYear = safeDepartureYear + Number(emitYearOffset || 0);
  const shipTxCoordYear = safeDepartureYear + Number(shipTxYearOffset || 0);

  // Star -> Moving Ship Signal Interception
  const interceptResult = useMemo(() => {
    if (!activeVoyage || !activeVoyage.legs || activeVoyage.legs.length === 0) return null;
    const emitterSys = systemsById.get(emitterSystemId) || systemsById.get('sol');
    if (!emitterSys) return null;
    const emitterPos = systemPosAtEpoch(emitterSys, epochOffsetYears);
    return solveSignalToShip(activeVoyage, emitterPos, emitterSys.name, emitCoordYear);
  }, [activeVoyage, systemsById, emitterSystemId, epochOffsetYears, emitCoordYear]);

  // Moving Ship -> Star Transmission
  const shipTxResult = useMemo(() => {
    if (!activeVoyage || !activeVoyage.legs || activeVoyage.legs.length === 0) return null;
    const solSys = systemsById.get('sol');
    const solWithEpoch = solSys ? { ...solSys, pos: systemPosAtEpoch(solSys, epochOffsetYears) } : null;
    return computeShipTransmission(activeVoyage, shipTxCoordYear, solWithEpoch ? [solWithEpoch] : []);
  }, [activeVoyage, systemsById, shipTxCoordYear, epochOffsetYears]);

  // Peer ships available for Inter-Ship Messaging & Rendezvous
  const otherShipsWithVoyages = useMemo(
    () => (shipsWithVoyages || []).filter((s) => s.id !== activeShip?.id),
    [shipsWithVoyages, activeShip?.id]
  );

  const selectedPeer = useMemo(() => {
    if (otherShipsWithVoyages.length === 0) return null;
    return otherShipsWithVoyages.find((s) => s.id === peerShipId) || otherShipsWithVoyages[0];
  }, [otherShipsWithVoyages, peerShipId]);

  const interShipEmitYear = safeDepartureYear + Number(interShipOffset || 0);

  // Moving Ship A -> Moving Ship B Light-Cone Interception + 2-Way Reply
  const interShipResult = useMemo(() => {
    if (!activeVoyage || !selectedPeer?.voyage) return null;
    return solveShipToShipSignal(
      activeVoyage,
      selectedPeer.voyage,
      interShipEmitYear,
      activeShip?.name || 'Ship A',
      selectedPeer.name || 'Ship B',
      true
    );
  }, [activeVoyage, selectedPeer, interShipEmitYear, activeShip?.name]);

  // Closest Approach / Rendezvous between Ship A and Ship B
  const rendezvousResult = useMemo(() => {
    if (!activeVoyage || !selectedPeer?.voyage) return null;
    return computeShipRendezvous(activeVoyage, selectedPeer.voyage);
  }, [activeVoyage, selectedPeer]);

  // Peak Doppler from highest-speed leg
  const peakLeg = useMemo(() => {
    if (!activeVoyage || !activeVoyage.legs || activeVoyage.legs.length === 0) return null;
    return activeVoyage.legs.reduce(
      (best, l) => (l.profile.peakSpeed > best.profile.peakSpeed ? l : best),
      activeVoyage.legs[0]
    );
  }, [activeVoyage]);

  // Keep 3D Light-Cone Sphere reactively synced when emitter, emit time, route, or epoch changes
  useEffect(() => {
    if (!lightConeConfig?.enabled) return;
    if (lightConeConfig.mode === 'ship-to-ship') {
      if (!interShipResult) return;
      const nextOrigin = interShipResult.senderPos;
      const nextTarget = interShipResult.hitPos;
      const nextRadius = Math.max(0.5, interShipResult.lightTravelYears);
      const sameOrigin =
        lightConeConfig.originPos &&
        Math.abs(lightConeConfig.originPos[0] - nextOrigin[0]) < 1e-4 &&
        Math.abs(lightConeConfig.originPos[1] - nextOrigin[1]) < 1e-4 &&
        Math.abs(lightConeConfig.originPos[2] - nextOrigin[2]) < 1e-4;
      const sameTarget =
        lightConeConfig.targetPos &&
        Math.abs(lightConeConfig.targetPos[0] - nextTarget[0]) < 1e-4 &&
        Math.abs(lightConeConfig.targetPos[1] - nextTarget[1]) < 1e-4 &&
        Math.abs(lightConeConfig.targetPos[2] - nextTarget[2]) < 1e-4;
      if (sameOrigin && sameTarget && Math.abs((lightConeConfig.radiusLy || 0) - nextRadius) < 1e-3) return;
      onUpdateLightConeConfig({
        enabled: true,
        mode: 'ship-to-ship',
        originPos: nextOrigin,
        targetPos: nextTarget,
        emitYear: interShipResult.tEmitCoordYear,
        radiusLy: nextRadius,
        color: '#facc15',
        beamColor: '#facc15',
      });
      return;
    }
    if (!interceptResult) return;
    const emitterSys = systemsById.get(emitterSystemId) || systemsById.get('sol');
    const nextOrigin = emitterSys ? systemPosAtEpoch(emitterSys, epochOffsetYears) : [0, 0, 0];
    const nextRadius = Math.max(0.5, interceptResult.lightTravelYears);
    const sameOrigin =
      lightConeConfig.originPos &&
      Math.abs(lightConeConfig.originPos[0] - nextOrigin[0]) < 1e-4 &&
      Math.abs(lightConeConfig.originPos[1] - nextOrigin[1]) < 1e-4 &&
      Math.abs(lightConeConfig.originPos[2] - nextOrigin[2]) < 1e-4;
    if (sameOrigin && Math.abs((lightConeConfig.radiusLy || 0) - nextRadius) < 1e-3) return;
    onUpdateLightConeConfig({
      enabled: true,
      mode: 'star-to-ship',
      originPos: nextOrigin,
      targetPos: null,
      emitYear: interceptResult.tEmitCoordYear,
      radiusLy: nextRadius,
      color: '#00f0ff',
    });
  }, [
    lightConeConfig?.enabled,
    lightConeConfig?.mode,
    interceptResult,
    interShipResult,
    emitterSystemId,
    systemsById,
    epochOffsetYears,
    onUpdateLightConeConfig,
  ]);

  // Clamp shipTxYearOffset if voyage duration shrinks
  useEffect(() => {
    if (activeVoyage && activeVoyage.totalCoordTimeYears > 0 && shipTxYearOffset > activeVoyage.totalCoordTimeYears) {
      setShipTxYearOffset(Number((activeVoyage.totalCoordTimeYears / 2).toFixed(2)));
    }
  }, [activeVoyage?.totalCoordTimeYears]);

  if (!activeShip) {
    return (
      <aside className="hud-panel left-route-dock">
        <div className="panel-header panel-header-flex">
          <div>
            <div className="panel-kicker">{t('routePanelTitle')}</div>
            <h2 className="panel-main-title">
              <Rocket size={15} className="title-icon" />
              <span>{t('emptyFleetTitle')}</span>
            </h2>
          </div>
          {onClose && (
            <button type="button" className="icon-btn panel-close-btn" onClick={onClose} title={t('hidePanelTooltip')}>
              <X size={15} />
            </button>
          )}
        </div>

        <div className="empty-fleet-card">
          <p className="empty-fleet-desc">{t('emptyFleetDesc')}</p>
          <div className="empty-fleet-actions">
            <button type="button" className="hud-btn primary-btn full-width" onClick={onAddShip}>
              <Plus size={13} />
              <span>{t('btnAddShip')}</span>
            </button>
            {onOpenVoyageLibrary && (
              <button type="button" className="hud-btn secondary-btn full-width" onClick={onOpenVoyageLibrary}>
                <BookMarked size={13} />
                <span>{t('btnVoyageLibraryFull')}</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    );
  }

  const { driveConfig, waypoints } = activeShip;

  const updateDrive = (patch) => {
    onUpdateActiveShip({
      driveConfig: { ...driveConfig, ...patch },
    });
  };

  const handleUpdateWaypointStay = (idx, stayYears) => {
    const next = waypoints.map((wp, i) => (i === idx ? { ...wp, stayYears: Math.max(0, Number(stayYears) || 0) } : wp));
    onUpdateActiveShip({ waypoints: next });
  };

  const handleRemoveWaypoint = (idx) => {
    const next = waypoints.filter((_, i) => i !== idx);
    onUpdateActiveShip({ waypoints: next });
  };

  const handleReverseWaypoints = () => {
    if (waypoints.length < 2) return;
    onUpdateActiveShip({ waypoints: [...waypoints].reverse() });
  };

  const handleAppendSelected = () => {
    if (!selectedSystem) return;
    const last = waypoints[waypoints.length - 1];
    if (last && last.systemId === selectedSystem.id) return;
    onUpdateActiveShip({
      waypoints: [...waypoints, { systemId: selectedSystem.id, stayYears: 0 }],
    });
  };

  return (
    <aside className="hud-panel left-route-dock">
      {/* Header */}
      <div className="panel-header panel-header-flex">
        <div>
          <div className="panel-kicker">{t('routePanelTitle')}</div>
          <h2 className="panel-main-title">
            <Rocket size={15} className="title-icon" />
            <span>{activeShip.name}</span>
          </h2>
        </div>
        {onClose && (
          <button type="button" className="icon-btn panel-close-btn" onClick={onClose} title={t('hidePanelTooltip')}>
            <X size={15} />
          </button>
        )}
      </div>

      {/* Multi-Ship Accessible Roster (Dropdown + Wrapping Quick-Switch Chips for 2–8+ Ships) */}
      <div className="ship-roster-bar">
        <div className="ship-roster-top">
          <div className="ship-select-wrap">
            <span
              className="ship-color-dot"
              style={{ backgroundColor: activeShip.color || '#00f0ff' }}
            />
            <select
              className="hud-select ship-roster-select"
              value={activeShip.id}
              onChange={(e) => onSelectShip(e.target.value)}
              title={activeShip.name}
            >
              {ships.map((sh, idx) => (
                <option key={sh.id} value={sh.id}>
                  {ships.length > 1 ? `[${idx + 1}/${ships.length}] ` : ''}
                  {sh.name}
                </option>
              ))}
            </select>
          </div>
          <div className="ship-roster-actions">
            {onOpenVoyageLibrary && (
              <button
                type="button"
                className="mini-hud-btn scifi-mini-btn"
                onClick={onOpenVoyageLibrary}
                title={t('btnVoyageLibraryFull')}
              >
                <BookMarked size={12} />
              </button>
            )}
            <button type="button" className="mini-hud-btn" onClick={onAddShip} title={t('btnAddShip')}>
              <Plus size={12} />
            </button>
            <button type="button" className="mini-hud-btn" onClick={onDuplicateShip} title={t('btnDuplicateShip')}>
              <Copy size={12} />
            </button>
            <button type="button" className="mini-hud-btn warn" onClick={onDeleteShip} title={t('btnDeleteShip')}>
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {onClearAllVoyages && (
          <div className="ship-roster-clear-row">
            <span className="roster-count-note">
              {ships.length} {t('voyageShipsUnit')}
            </span>
            <button
              type="button"
              className="clear-all-voyages-btn"
              onClick={onClearAllVoyages}
              title={t('btnClearAllVoyagesTooltip')}
            >
              <Trash2 size={11} />
              <span>{t('btnClearAllVoyages')}</span>
            </button>
          </div>
        )}

        {ships.length > 1 && (
          <div className="ship-pills">
            {ships.map((sh) => {
              const shortLabel = sh.name.includes(' · ') ? sh.name.split(' · ')[0] : sh.name;
              return (
                <button
                  key={sh.id}
                  type="button"
                  className={`ship-pill-btn ${sh.id === activeShip.id ? 'active' : ''}`}
                  style={{ borderLeftColor: sh.color }}
                  onClick={() => onSelectShip(sh.id)}
                  title={sh.name}
                >
                  <span>{shortLabel}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Canonical Sci-Fi Scenario Banner (when loaded from Voyage Library) */}
      {activeVoyagePreset && (
        <div className="active-preset-strip">
          <span className="aps-title" title={activeVoyagePreset.title?.[lang] || activeVoyagePreset.title?.en}>
            ★ {lang === 'cs' && activeVoyagePreset.universeCs ? activeVoyagePreset.universeCs : activeVoyagePreset.universe}:{' '}
            {activeVoyagePreset.title?.[lang] || activeVoyagePreset.title?.en}
          </span>
          {onOpenVoyageLibrary && (
            <button type="button" className="text-link-btn" onClick={onOpenVoyageLibrary}>
              {t('btnVoyageLibrary')}
            </button>
          )}
        </div>
      )}

      {/* Compact Sticky Voyage KPI Strip (always visible across tabs) */}
      {activeVoyage && activeVoyage.legs.length > 0 && (
        <div className="dock-kpi-strip">
          <div className="kpi-chip">
            <span>{t('kpiDist')}</span>
            <strong>{formatNum(activeVoyage.totalDistanceLy, 1, lang)} ly</strong>
          </div>
          <div className="kpi-chip cyan">
            <span>{t('kpiEarthDt')}</span>
            <strong>{formatNum(activeVoyage.totalCoordTimeYears, 1, lang)} {t('unitYrShort')}</strong>
          </div>
          <div className="kpi-chip emerald">
            <span>{t('kpiCrewTau')}</span>
            <strong>{formatNum(activeVoyage.totalProperTimeYears, 1, lang)} {t('unitYrShort')}</strong>
          </div>
          <div className="kpi-chip amber">
            <span>v_max</span>
            <strong>{formatNum(activeVoyage.peakSpeedC * 100, 1, lang)}%c</strong>
          </div>
        </div>
      )}

      {/* Clean 3-Tab Sub-Navigation (Progressive Disclosure) */}
      <div className="dock-tabs-bar">
        <button
          type="button"
          className={`dock-tab-btn ${panelTab === 'plan' ? 'active' : ''}`}
          onClick={() => setPanelTab('plan')}
        >
          <Navigation size={12} />
          <span>{t('routeTabPlan')}</span>
        </button>
        <button
          type="button"
          className={`dock-tab-btn ${panelTab === 'telemetry' ? 'active' : ''}`}
          onClick={() => setPanelTab('telemetry')}
        >
          <Activity size={12} />
          <span>{t('routeTabTelemetry')}</span>
        </button>
        <button
          type="button"
          className={`dock-tab-btn ${panelTab === 'comm' ? 'active' : ''}`}
          onClick={() => setPanelTab('comm')}
        >
          <Radio size={12} />
          <span>{t('routeTabComm')}</span>
        </button>
      </div>

      <div className="route-scroll-body">
        {panelTab === 'plan' && (
          <>
            {/* Ship Metadata & Departure Epoch */}
            <div className="section-block compact">
              <div className="form-field">
                <label>{t('shipNameLabel')}</label>
                <input
                  type="text"
                  className="hud-input"
                  value={activeShip.name}
                  onChange={(e) => onUpdateActiveShip({ name: e.target.value })}
                />
              </div>
              <div className="form-row-2">
                <div className="form-field">
                  <label>{t('departureYearLabel')}</label>
                  <input
                    type="number"
                    step="0.5"
                    className="hud-input"
                    value={activeShip.departureYear}
                    onChange={(e) => onUpdateActiveShip({ departureYear: Number(e.target.value) || 2150 })}
                  />
                </div>
                <div className="form-field">
                  <label>{t('crewStartAgeLabel')}</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    className="hud-input"
                    value={activeShip.crewStartAge}
                    onChange={(e) => onUpdateActiveShip({ crewStartAge: Number(e.target.value) || 30 })}
                  />
                </div>
              </div>
            </div>

            {/* Flight Profile & Propulsion Controls */}
            <div className="section-block">
              <div className="section-title-row">
                <Zap size={13} className="section-icon" />
                <span>{t('flightModeLabel')}</span>
              </div>

              <select
                className="hud-select full-width"
                value={driveConfig.mode}
                onChange={(e) => updateDrive({ mode: e.target.value })}
              >
                <option value="flip">{t('modeFlip')}</option>
                <option value="accel-cruise">{t('modeAccelCruise')}</option>
                <option value="constant">{t('modeConstant')}</option>
                <option value="flyby">{t('modeFlyby')}</option>
              </select>

              {driveConfig.mode !== 'constant' && (
                <div className="control-slider-block">
                  <div className="slider-header">
                    <span>{t('accelGLabel')}</span>
                    <strong className="highlight-cyan">{formatNum(driveConfig.accelG, 2, lang)} g</strong>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="6.0"
                    step="0.02"
                    className="hud-range"
                    value={driveConfig.accelG}
                    onChange={(e) => updateDrive({ accelG: Number(e.target.value) })}
                  />
                  <div className="preset-chips-row">
                    {[0.1, 0.3, 0.5, 1.0, 1.5, 3.0, 6.0].map((gVal) => (
                      <button
                        key={gVal}
                        type="button"
                        className={`preset-chip ${Math.abs(driveConfig.accelG - gVal) < 0.005 ? 'active' : ''}`}
                        onClick={() => updateDrive({ accelG: gVal })}
                      >
                        {gVal}g
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {driveConfig.mode !== 'flip' && (
                <div className="control-slider-block">
                  <div className="slider-header">
                    <span>{t('cruiseCLabel')}</span>
                    <strong className="highlight-emerald">{formatNum(driveConfig.cruiseC * 100, 2, lang)}% c</strong>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.995"
                    step="0.005"
                    className="hud-range"
                    value={driveConfig.cruiseC}
                    onChange={(e) => updateDrive({ cruiseC: Number(e.target.value) })}
                  />
                  <div className="preset-chips-row">
                    {[0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99].map((cVal) => (
                      <button
                        key={cVal}
                        type="button"
                        className={`preset-chip ${Math.abs(driveConfig.cruiseC - cVal) < 0.002 ? 'active' : ''}`}
                        onClick={() => updateDrive({ cruiseC: cVal })}
                      >
                        {cVal}c
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Non-Reactive vs. Reaction Rocket Toggle */}
              <div className="drive-physics-toggle">
                <label className="sub-label">{t('driveTypeLabel')}</label>
                <div className="two-col-toggle">
                  <button
                    type="button"
                    className={`toggle-btn ${driveConfig.driveType === 'non-reactive' ? 'active' : ''}`}
                    onClick={() => updateDrive({ driveType: 'non-reactive' })}
                  >
                    {t('driveNonReactive')}
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${driveConfig.driveType === 'reaction' ? 'active' : ''}`}
                    onClick={() => updateDrive({ driveType: 'reaction' })}
                  >
                    {t('driveReaction')}
                  </button>
                </div>

                {driveConfig.driveType === 'reaction' && (
                  <div className="control-slider-block">
                    <div className="slider-header">
                      <span>{t('exhaustVelLabel')}</span>
                      <strong>{formatNum(driveConfig.exhaustVelC, 3, lang)} c</strong>
                    </div>
                    <input
                      type="range"
                      min="0.02"
                      max="1.0"
                      step="0.01"
                      className="hud-range"
                      value={driveConfig.exhaustVelC}
                      onChange={(e) => updateDrive({ exhaustVelC: Number(e.target.value) })}
                    />
                    <div className="preset-chips-row">
                      <button type="button" className="preset-chip" onClick={() => updateDrive({ exhaustVelC: 0.08 })}>
                        {t('presetFusion')}
                      </button>
                      <button type="button" className="preset-chip" onClick={() => updateDrive({ exhaustVelC: 0.33 })}>
                        {t('presetBeamCore')}
                      </button>
                      <button type="button" className="preset-chip" onClick={() => updateDrive({ exhaustVelC: 1.0 })}>
                        {t('presetPhoton')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Multi-Stop Waypoint Chain */}
            <div className="section-block">
              <div className="section-title-row">
                <Navigation size={13} className="section-icon" />
                <span>
                  {t('waypointsTitle')} ({waypoints.length})
                </span>
                <div className="waypoint-header-btns">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={handleReverseWaypoints}
                    title={t('btnReverseRoute')}
                  >
                    <ArrowUpDown size={12} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => onUpdateActiveShip({ waypoints: [{ systemId: 'sol', stayYears: 0 }] })}
                    title={t('btnClearRoute')}
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>
              </div>

              {selectedSystem && (
                <button
                  type="button"
                  className="hud-btn add-stop-btn full-width"
                  onClick={handleAppendSelected}
                >
                  <Plus size={13} />
                  <span>
                    {t('btnAddSelectedStop')} ({selectedSystem.name})
                  </span>
                </button>
              )}

              <div className="waypoints-list">
                {waypoints.length < 2 && (
                  <div className="no-route-hint-box">{t('noRouteHint')}</div>
                )}
                {waypoints.map((wp, idx) => {
                  const sys = systemsById.get(wp.systemId);
                  const stopInfo = activeVoyage?.stops?.[idx];
                  const legIn = idx > 0 ? activeVoyage?.legs?.[idx - 1] : null;
                  const isFirst = idx === 0;
                  const isLast = idx === waypoints.length - 1;

                  return (
                    <div key={`${wp.systemId}-${idx}`} className="waypoint-item">
                      {legIn && (
                        <div className="leg-connector-pill">
                          <span className="leg-dist">{formatNum(legIn.profile.distance, 2, lang)} ly</span>
                          <span>·</span>
                          <span className="leg-coord-t">Δt {formatDurationYears(legIn.profile.totalTime, lang)}</span>
                          <span>·</span>
                          <span className="leg-proper-t">Δτ {formatDurationYears(legIn.profile.properTime, lang)}</span>
                          <span>·</span>
                          <span className="leg-vpeak">{formatNum(legIn.profile.peakSpeed * 100, 1, lang)}%c</span>
                        </div>
                      )}

                      <div className="waypoint-card">
                        <div className="wp-card-top">
                          <span className={`wp-badge ${isFirst ? 'origin' : isLast ? 'dest' : 'stop'}`}>
                            {isFirst ? t('originBadge') : isLast ? t('destBadge') : `${t('stopBadge')} ${idx}`}
                          </span>
                          <button
                            type="button"
                            className="wp-star-name-btn"
                            onClick={() => onSelectSystem(wp.systemId)}
                          >
                            {sys ? sys.name : wp.systemId}
                          </button>

                          {!isFirst && !isLast && (
                            <div className="wp-stay-input">
                              <label>{t('stayDurationLabel')}:</label>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={wp.stayYears || 0}
                                onChange={(e) => handleUpdateWaypointStay(idx, e.target.value)}
                              />
                            </div>
                          )}

                          {waypoints.length > 1 && (
                            <button
                              type="button"
                              className="wp-remove-btn"
                              onClick={() => handleRemoveWaypoint(idx)}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>

                        {stopInfo && (
                          <div className="wp-timestamps">
                            <span>
                              Earth: <strong>{formatNum(stopInfo.arriveCoordYear, 2, lang)}</strong>
                            </span>
                            <span>
                              Crew τ: <strong>{formatDurationYears(stopInfo.arriveCrewProperYears, lang)}</strong>
                            </span>
                            <span>
                              Age: <strong>{formatNum(stopInfo.crewBiologicalAgeArrive, 1, lang)} y</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {panelTab === 'telemetry' && (
          <>
            {!activeVoyage || activeVoyage.legs.length === 0 ? (
              <div className="no-route-hint-box">{t('noRouteHint')}</div>
            ) : (
              <>
                <div className="section-block highlight-box">
                  <div className="section-title-row">
                    <Clock size={13} className="section-icon" />
                    <span>{t('voyageSummaryTitle')}</span>
                  </div>

                  <div className="telemetry-kv-grid">
                    <div className="kv-cell">
                      <span className="kv-label">{t('totalDistance')}</span>
                      <span className="kv-value">
                        {formatNum(activeVoyage.totalDistanceLy, 3, lang)} ly{' '}
                        <small>({formatNum(activeVoyage.totalDistanceLy / LY_PER_PARSEC, 2, lang)} pc)</small>
                      </span>
                    </div>
                    <div className="kv-cell">
                      <span className="kv-label">{t('earthCoordTime')}</span>
                      <span className="kv-value highlight-cyan">
                        {formatDurationYears(activeVoyage.totalCoordTimeYears, lang)}
                      </span>
                    </div>
                    <div className="kv-cell">
                      <span className="kv-label">{t('shipProperTime')}</span>
                      <span className="kv-value highlight-emerald">
                        {formatDurationYears(activeVoyage.totalProperTimeYears, lang)}
                      </span>
                    </div>
                    <div className="kv-cell">
                      <span className="kv-label">{t('timeSavedDilation')}</span>
                      <span className="kv-value highlight-amber">
                        {formatDurationYears(activeVoyage.timeSavedYears, lang)} (×
                        {formatNum(activeVoyage.overallDilationFactor, 2, lang)})
                      </span>
                    </div>
                    <div className="kv-cell">
                      <span className="kv-label">{t('arrivalDateEarth')}</span>
                      <span className="kv-value">
                        {formatNum(activeVoyage.departureYear, 2, lang)} →{' '}
                        <strong>{formatNum(activeVoyage.arrivalYear, 2, lang)}</strong>
                      </span>
                    </div>
                    <div className="kv-cell">
                      <span className="kv-label">{t('crewBiologicalAge')}</span>
                      <span className="kv-value">
                        {formatNum(activeVoyage.crewStartAge, 1, lang)} →{' '}
                        <strong className="highlight-emerald">{formatNum(activeVoyage.crewEndAge, 1, lang)} yr</strong>
                        <small className="block-note">
                          {t('earthTwinAge')}: {formatNum(activeVoyage.earthTwinEndAge, 1, lang)} yr
                        </small>
                      </span>
                    </div>
                    <div className="kv-cell">
                      <span className="kv-label">{t('peakSpeedReached')}</span>
                      <span className="kv-value">
                        {formatNum(activeVoyage.peakSpeedC * 100, 3, lang)}% c{' '}
                        <small>(γ = {formatNum(activeVoyage.peakGamma, 2, lang)})</small>
                      </span>
                    </div>
                    {peakLeg && peakLeg.profile.brake && peakLeg.profile.mode !== 'constant' && (
                      <div className="kv-cell">
                        <span className="kv-label">{t('brakingWarningLead')}</span>
                        <span className="kv-value">
                          {formatDurationYears(peakLeg.profile.warningLeadYears, lang)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {peakLeg && (
                  <div className="section-block">
                    <div className="section-title-row">
                      <Activity size={13} className="section-icon" />
                      <span>{t('dopplerSectionTitle')}</span>
                    </div>

                    <div className="telemetry-kv-grid">
                      <div className="kv-cell">
                        <span className="kv-label">{t('forwardDopplerFactor')}</span>
                        <span className="kv-value highlight-cyan">
                          ×{formatNum(peakLeg.profile.doppler.forwardFactor, 3, lang)}{' '}
                          <small>(z = {formatNum(peakLeg.profile.doppler.zForward, 3, lang)})</small>
                        </span>
                      </div>
                      <div className="kv-cell">
                        <span className="kv-label">{t('rearDopplerFactor')}</span>
                        <span className="kv-value">
                          ×{formatNum(peakLeg.profile.doppler.rearFactor, 3, lang)}{' '}
                          <small>(z = +{formatNum(peakLeg.profile.doppler.zRear, 3, lang)})</small>
                        </span>
                      </div>
                      <div className="kv-cell">
                        <span className="kv-label">{t('greenStarlightShift')}</span>
                        <span className="kv-value">
                          {formatNum(peakLeg.profile.doppler.forwardGreenNm, 1, lang)} nm /{' '}
                          {formatNum(peakLeg.profile.doppler.rearGreenNm, 0, lang)} nm
                        </span>
                      </div>
                      <div className="kv-cell">
                        <span className="kv-label">{t('cmbTempAhead')}</span>
                        <span className="kv-value">
                          {formatNum(peakLeg.profile.doppler.forwardCmbTempK, 2, lang)} K
                        </span>
                      </div>
                      <div className="kv-cell">
                        <span className="kv-label">{t('ismProtonEnergy')}</span>
                        <span className="kv-value">
                          {formatNum(peakLeg.profile.doppler.ismProtonMeV, 1, lang)} MeV
                        </span>
                      </div>
                      <div className="kv-cell">
                        <span className="kv-label">{t('kineticEnergyPerKg')}</span>
                        <span className="kv-value">
                          {formatNum(peakLeg.profile.doppler.kineticEnergyTjPerKg, 0, lang)} TJ/kg
                        </span>
                      </div>

                      {activeVoyage.overallPropulsion.isReactive ? (
                        <>
                          <div className="kv-cell">
                            <span className="kv-label">{t('rocketMassRatio')}</span>
                            <span className="kv-value highlight-amber">
                              {activeVoyage.overallPropulsion.massRatio > 1e6
                                ? `10^${formatNum(activeVoyage.overallPropulsion.log10MassRatio, 1, lang)} : 1`
                                : `${formatNum(activeVoyage.overallPropulsion.massRatio, 1, lang)} : 1`}
                            </span>
                          </div>
                          <div className="kv-cell">
                            <span className="kv-label">{t('propellantFraction')}</span>
                            <span className="kv-value">
                              {formatNum(activeVoyage.overallPropulsion.propellantFraction * 100, 3, lang)}%
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="kv-cell full-span">
                          <span className="kv-label">{t('nonReactiveNote')}</span>
                        </div>
                      )}
                    </div>

                    {onToggleBridgeView && (
                      <button
                        type="button"
                        className={`hud-btn full-width ${isBridgeViewOpen ? 'primary-btn' : 'secondary-btn'}`}
                        onClick={onToggleBridgeView}
                      >
                        <Eye size={13} />
                        <span>{t('btnBridgeView')}</span>
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {panelTab === 'comm' && (
          <>
            {!activeVoyage || activeVoyage.legs.length === 0 ? (
              <div className="no-route-hint-box">{t('noRouteHint')}</div>
            ) : (
              <div className="section-block">
                <div className="section-title-row">
                  <Radio size={13} className="section-icon" />
                  <span>{t('commSectionTitle')}</span>
                </div>

                <div className="three-col-toggle">
                  <button
                    type="button"
                    className={`toggle-btn ${commTab === 'to-ship' ? 'active' : ''}`}
                    onClick={() => setCommTab('to-ship')}
                  >
                    {t('commTabToShip')}
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${commTab === 'from-ship' ? 'active' : ''}`}
                    onClick={() => setCommTab('from-ship')}
                  >
                    {t('commTabFromShip')}
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${commTab === 'ship-to-ship' ? 'active' : ''}`}
                    onClick={() => setCommTab('ship-to-ship')}
                  >
                    {t('commTabShipToShip')}
                  </button>
                </div>

                {commTab === 'to-ship' ? (
                  <div className="comm-calculator-box">
                    <div className="form-row-2">
                      <div className="form-field">
                        <label>{t('commEmitterStar')}</label>
                        <select
                          className="hud-select"
                          value={emitterSystemId}
                          onChange={(e) => setEmitterSystemId(e.target.value)}
                        >
                          <option value="sol">Sol (Earth)</option>
                          {activeVoyage.stops
                            .filter((st, idx, arr) => st.systemId !== 'sol' && arr.findIndex((x) => x.systemId === st.systemId) === idx)
                            .map((st) => (
                              <option key={st.systemId} value={st.systemId}>
                                {st.systemName}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="form-field">
                        <label>{t('commEmitYear')} (+Δt)</label>
                        <input
                          type="number"
                          step="0.5"
                          className="hud-input"
                          value={emitYearOffset}
                          onChange={(e) => setEmitYearOffset(e.target.value)}
                        />
                      </div>
                    </div>

                    {interceptResult && (
                      <div className="comm-result-card">
                        <div className="comm-res-row">
                          <span>{t('commEmitYear')}:</span>
                          <strong>{formatNum(interceptResult.tEmitCoordYear, 2, lang)}</strong>
                        </div>
                        <div className="comm-res-row">
                          <span>{t('commInterceptYear')}:</span>
                          <strong className="highlight-cyan">
                            {formatNum(interceptResult.tHitCoordYear, 2, lang)}
                          </strong>
                        </div>
                        <div className="comm-res-row">
                          <span>{t('commLightTransit')}:</span>
                          <strong>{formatDurationYears(interceptResult.lightTravelYears, lang)}</strong>
                        </div>
                        <div className="comm-res-row">
                          <span>{t('commInterceptCrewTime')}:</span>
                          <strong className="highlight-emerald">
                            {formatDurationYears(interceptResult.tauHitProperYears, lang)}
                          </strong>
                        </div>
                        <div className="comm-res-row">
                          <span>{t('commInterceptCrewAge')}:</span>
                          <strong>{formatNum(interceptResult.crewAgeAtHit, 2, lang)} yr</strong>
                        </div>
                        <div className="comm-res-row">
                          <span>{t('commShipPhaseAtHit')}:</span>
                          <strong>
                            {interceptResult.shipStatusAtHit} ({interceptResult.shipPhaseAtHit})
                          </strong>
                        </div>
                        <div className="comm-res-row">
                          <span>{t('commRxDoppler')}:</span>
                          <strong>
                            ×{formatNum(interceptResult.dopplerFactorAtHit ?? 1, 3, lang)} (
                            {interceptResult.shiftTypeAtHit || 'none'})
                          </strong>
                        </div>

                        <label className="lightcone-checkbox">
                          <input
                            type="checkbox"
                            checked={Boolean(lightConeConfig?.enabled && lightConeConfig?.mode !== 'ship-to-ship')}
                            onChange={(e) => {
                              const emitterSys = systemsById.get(emitterSystemId) || systemsById.get('sol');
                              onUpdateLightConeConfig({
                                enabled: e.target.checked,
                                mode: 'star-to-ship',
                                originPos: emitterSys ? systemPosAtEpoch(emitterSys, epochOffsetYears) : [0, 0, 0],
                                targetPos: null,
                                emitYear: interceptResult.tEmitCoordYear,
                                radiusLy: Math.max(0.5, interceptResult.lightTravelYears),
                                color: '#00f0ff',
                              });
                            }}
                          />
                          <span>{t('commShow3dLightCone')}</span>
                        </label>
                      </div>
                    )}
                  </div>
                ) : commTab === 'from-ship' ? (
                  <div className="comm-calculator-box">
                    <div className="form-field">
                      <label>
                        {t('commSendAtCrewClock')} (+Δt from {activeShip.departureYear})
                      </label>
                      <input
                        type="range"
                        min="0"
                        max={Math.max(1, activeVoyage.totalCoordTimeYears)}
                        step="0.1"
                        className="hud-range"
                        value={shipTxYearOffset}
                        onChange={(e) => setShipTxYearOffset(Number(e.target.value))}
                      />
                      <div className="slider-sub-readout">
                        Earth Year: <strong>{formatNum(shipTxCoordYear, 2, lang)}</strong>
                        {shipTxResult && (
                          <>
                            {' · '}Crew τ: <strong>{formatDurationYears(shipTxResult.tauSendProperYears, lang)}</strong>
                          </>
                        )}
                      </div>
                    </div>

                    {shipTxResult && (
                      <div className="comm-result-card">
                        {shipTxResult.receivers.map((rx) => (
                          <div key={rx.systemId} className="rx-item">
                            <div className="rx-header">
                              <strong>→ {rx.label}</strong>
                              <span className="rx-dist">
                                {formatNum(rx.distanceAtSendLy, 2, lang)} ly {t('awayShort')}
                              </span>
                            </div>
                            <div className="rx-sub">
                              <span>
                                {t('arrivesLabel')}: <strong>{formatNum(rx.arriveCoordYear, 2, lang)}</strong>
                              </span>
                              <span>
                                Doppler: <strong>×{formatNum(rx.dopplerFactor, 2, lang)}</strong> ({rx.shiftType})
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="comm-calculator-box">
                    {otherShipsWithVoyages.length === 0 ? (
                      <div className="no-route-hint-box">{t('commNeedTwoShips')}</div>
                    ) : (
                      <>
                        <div className="form-field">
                          <label>{t('commTargetShipLabel')}</label>
                          <select
                            className="hud-select"
                            value={selectedPeer?.id || ''}
                            onChange={(e) => setPeerShipId(e.target.value)}
                          >
                            {otherShipsWithVoyages.map((peer) => (
                              <option key={peer.id} value={peer.id}>
                                {peer.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-row-2">
                          <div className="form-field">
                            <label>{t('commEmitYear')} (+Δt)</label>
                            <input
                              type="number"
                              step="0.5"
                              className="hud-input"
                              value={interShipOffset}
                              onChange={(e) => setInterShipOffset(e.target.value)}
                            />
                          </div>
                          <div className="form-field">
                            <label>{t('masterClockLabel')}</label>
                            <button
                              type="button"
                              className="hud-btn secondary-btn full-width"
                              onClick={() => {
                                if (Number.isFinite(masterClockYear)) {
                                  setInterShipOffset(Number((masterClockYear - safeDepartureYear).toFixed(2)));
                                }
                              }}
                            >
                              {t('commSyncClockBtn')}
                            </button>
                          </div>
                        </div>

                        {interShipResult && (
                          <div className="comm-result-card">
                            <div className="comm-res-row">
                              <span>{t('commTxFromA')}:</span>
                              <strong>
                                {formatNum(interShipResult.tEmitCoordYear, 2, lang)} (τ={formatNum(interShipResult.senderProperTimeYears, 1, lang)}{t('unitYrShort')})
                              </strong>
                            </div>
                            <div className="comm-res-row">
                              <span>{t('commRxAtB')}:</span>
                              <strong className="highlight-cyan">
                                {formatNum(interShipResult.tHitCoordYear, 2, lang)}
                              </strong>
                            </div>
                            <div className="comm-res-row">
                              <span>{t('commLightTransit')}:</span>
                              <strong>{formatDurationYears(interShipResult.lightTravelYears, lang)}</strong>
                            </div>
                            <div className="comm-res-row">
                              <span>{t('commReceiverTauAge')}:</span>
                              <strong className="highlight-emerald">
                                τ={formatNum(interShipResult.receiverProperTimeYears, 1, lang)}{t('unitYrShort')} · {formatNum(interShipResult.receiverCrewAgeAtHit, 1, lang)}{t('unitYrShort')}
                              </strong>
                            </div>
                            <div className="comm-res-row">
                              <span>{t('commCombinedDoppler')}:</span>
                              <strong className="highlight-amber">
                                ×{formatNum(interShipResult.dopplerFactor, 3, lang)} ({interShipResult.shiftType})
                              </strong>
                            </div>
                            {interShipResult.reply && (
                              <div className="comm-res-row">
                                <span>{t('commRoundTripReply')}:</span>
                                <strong>
                                  {formatNum(interShipResult.reply.tReplyCoordYear, 2, lang)} (Δτ={formatNum(interShipResult.reply.senderProperWaitYears, 1, lang)}{t('unitYrShort')})
                                </strong>
                              </div>
                            )}

                            <label className="lightcone-checkbox">
                              <input
                                type="checkbox"
                                checked={Boolean(lightConeConfig?.enabled && lightConeConfig?.mode === 'ship-to-ship')}
                                onChange={(e) => {
                                  onUpdateLightConeConfig({
                                    enabled: e.target.checked,
                                    mode: 'ship-to-ship',
                                    originPos: interShipResult.senderPos,
                                    targetPos: interShipResult.hitPos,
                                    emitYear: interShipResult.tEmitCoordYear,
                                    radiusLy: Math.max(0.5, interShipResult.lightTravelYears),
                                    color: '#facc15',
                                    beamColor: '#facc15',
                                  });
                                }}
                              />
                              <span>{t('commShow3dShipBeam')}</span>
                            </label>
                          </div>
                        )}

                        {rendezvousResult && (
                          <div className="comm-result-card rendezvous-card">
                            <div className="comm-sub-head">{t('commRendezvousTitle')}</div>
                            <div className="comm-res-row">
                              <span>{t('commClosestDist')}:</span>
                              <strong className="highlight-emerald">
                                {formatNum(rendezvousResult.minDistLy, 2, lang)} ly
                              </strong>
                            </div>
                            <div className="comm-res-row">
                              <span>{t('commClosestYear')}:</span>
                              <strong className="highlight-cyan">
                                {formatNum(rendezvousResult.tClosestCoordYear, 2, lang)}
                              </strong>
                            </div>
                            <div className="comm-res-row">
                              <span>{t('commRelSpeedAtClosest')}:</span>
                              <strong>{formatNum(rendezvousResult.relCoordSpeedC * 100, 1, lang)}%c</strong>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
