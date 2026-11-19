import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { formatNum, formatDurationYears } from '../../utils/format.js';
import { evaluateVoyageAtCoordYear } from '../../engine/voyagePlanner.js';
import { solveSignalToShip } from '../../engine/commLightCone.js';
import { systemPosAtEpoch } from '../../engine/stellarMotion.js';
import {
  Clock,
  Play,
  Pause,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  X,
  Activity,
  FileText,
  Radio,
} from 'lucide-react';

export default function TimelineAndMinkowskiStudio({
  isOpen,
  onClose,
  shipsWithVoyages,
  activeShipId,
  onSelectShip,
  masterClockYear,
  onChangeMasterClockYear,
  isPlaying,
  onTogglePlay,
  storyEvents,
  onAddStoryEvent,
  onRemoveStoryEvent,
  systemsById,
  epochOffsetYears,
  onExportJson,
  onImportJson,
  onClearAllVoyages,
}) {
  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('gantt'); // 'gantt' | 'minkowski' | 'export'
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventSystemId, setNewEventSystemId] = useState('sol');
  const [newEventYear, setNewEventYear] = useState(2155);
  const [copiedMd, setCopiedMd] = useState(false);

  const minkowskiCanvasRef = useRef(null);

  // Determine overall coordinate time window [minYear, maxYear] across all ships and events
  const { minYear, maxYear } = useMemo(() => {
    let minY = 2150;
    let maxY = 2170;
    if (shipsWithVoyages.length > 0) {
      minY = Math.min(...shipsWithVoyages.map((s) => s.voyage.departureYear));
      maxY = Math.max(...shipsWithVoyages.map((s) => s.voyage.arrivalYear + 2));
    }
    for (const ev of storyEvents) {
      if (ev.year < minY) minY = ev.year;
      if (ev.year + 5 > maxY) maxY = ev.year + 5;
    }
    if (maxY - minY < 10) maxY = minY + 15;
    return { minYear: Math.floor(minY), maxYear: Math.ceil(maxY) };
  }, [shipsWithVoyages, storyEvents]);

  // Draw 1+1D Minkowski Space-Time Diagram when tab === 'minkowski'
  useEffect(() => {
    if (!isOpen || activeTab !== 'minkowski') return;
    const canvas = minkowskiCanvasRef.current;
    if (!canvas) return;

    const drawMinkowski = () => {
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const W = rect.width;
      const H = rect.height;
      const PAD = { left: 75, right: 40, top: 32, bottom: 42 };
      const plotW = W - PAD.left - PAD.right;
      const plotH = H - PAD.top - PAD.bottom;

      ctx.fillStyle = '#040814';
      ctx.fillRect(0, 0, W, H);

      const activeShip = shipsWithVoyages.find((s) => s.id === activeShipId) || shipsWithVoyages[0];
      const maxDistLy = Math.max(
        10,
        ...shipsWithVoyages.map((s) => s.voyage.totalDistanceLy * 1.1)
      );

      // X-axis = Cumulative Path Distance x [ly] (0 to maxDistLy)
      // Y-axis = Coordinate Time t [yr] (minYear at bottom to maxYear at top, standard Minkowski convention!)
      const toX = (dLy) => PAD.left + (dLy / maxDistLy) * plotW;
      const toY = (tYr) => PAD.top + plotH - ((tYr - minYear) / Math.max(1, maxYear - minYear)) * plotH;

      // Grid lines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#64748b';

      const niceStep = (span, targetTicks = 6) => {
        const raw = Math.max(1e-6, span / targetTicks);
        const mag = 10 ** Math.floor(Math.log10(raw));
        const norm = raw / mag;
        const mult = norm <= 1.2 ? 1 : norm <= 2.5 ? 2 : norm <= 6 ? 5 : 10;
        return mult * mag;
      };

      const distStep = niceStep(maxDistLy, 7);
      for (let d = 0; d <= maxDistLy; d += distStep) {
        const x = toX(d);
        ctx.beginPath();
        ctx.moveTo(x, PAD.top);
        ctx.lineTo(x, PAD.top + plotH);
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(d)} ly`, x, PAD.top + plotH + 16);
      }

      const timeSpan = maxYear - minYear;
      const tStep = niceStep(timeSpan, 6);
      for (let tYr = Math.ceil(minYear / tStep) * tStep; tYr <= maxYear; tYr += tStep) {
        const y = toY(tYr);
        ctx.beginPath();
        ctx.moveTo(PAD.left, y);
        ctx.lineTo(PAD.left + plotW, y);
        ctx.stroke();
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.round(tYr)}`, PAD.left - 8, y + 3);
      }

      // Map each stop's systemId to its cumulative route x-coordinate on the active ship
      const stopDistById = new Map();
      if (activeShip && activeShip.voyage.stops.length > 0) {
        let cumDist = 0;
        activeShip.voyage.stops.forEach((st, idx) => {
          if (idx > 0) {
            cumDist += activeShip.voyage.legs[idx - 1].profile.distance;
          }
          if (!stopDistById.has(st.systemId)) stopDistById.set(st.systemId, cumDist);
          const x = toX(cumDist);
          ctx.strokeStyle = 'rgba(0, 255, 136, 0.28)';
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(x, PAD.top);
          ctx.lineTo(x, PAD.top + plotH);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#00ff88';
          ctx.textAlign = 'center';
          ctx.fillText(st.systemName, x, PAD.top - 8);
        });
      }

      // Clip light cones and worldlines inside the plot area
      ctx.save();
      ctx.beginPath();
      ctx.rect(PAD.left, PAD.top, plotW, plotH);
      ctx.clip();

      // Bidirectional 45° Light-Cone rays from story events on the active route (c = 1 ly/yr)
      // plus exact 3D interception markers on the active ship's worldline!
      const drawnEventLabels = [];
      const sortedEvents = [...storyEvents].sort((a, b) => a.year - b.year);
      sortedEvents.forEach((ev) => {
        const isOnActiveRoute = stopDistById.has(ev.systemId);
        if (isOnActiveRoute) {
          const evDist = stopDistById.get(ev.systemId);
          const y0 = toY(ev.year);
          const x0 = toX(evDist);
          const dtMax = maxYear - ev.year;
          if (dtMax > 0) {
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 1.3;

            // Outbound (+x) light ray
            const dxPos = Math.min(maxDistLy - evDist, dtMax);
            if (dxPos > 0) {
              ctx.beginPath();
              ctx.moveTo(x0, y0);
              ctx.lineTo(toX(evDist + dxPos), toY(ev.year + dxPos));
              ctx.stroke();
            }

            // Inbound (-x) light ray (e.g., from Proxima Centauri back toward Sol)
            const dxNeg = Math.min(evDist, dtMax);
            if (dxNeg > 0) {
              ctx.beginPath();
              ctx.moveTo(x0, y0);
              ctx.lineTo(toX(evDist - dxNeg), toY(ev.year + dxNeg));
              ctx.stroke();
            }
            ctx.setLineDash([]);

            // Draw event origin marker dot
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(x0, y0, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Collision-free event text label (prevents vertical overlap on wide millennia spans)
            const labelY = Math.max(PAD.top + 11, Math.min(PAD.top + plotH - 4, y0 - 4));
            const collides = drawnEventLabels.some(
              (pt) => Math.abs(pt.x - x0) < 260 && Math.abs(pt.y - labelY) < 13
            );
            if (!collides) {
              drawnEventLabels.push({ x: x0, y: labelY });
              ctx.textAlign = 'left';
              const rawLbl = ev.title && typeof ev.title === 'object' ? ev.title[lang] || ev.title.en : ev.title;
              const shortLbl = rawLbl.length > 44 ? `${rawLbl.slice(0, 43)}…` : rawLbl;
              ctx.fillText(`⚡ ${shortLbl} (${ev.year})`, x0 + 6, labelY);
            }
          }
        }

        // Exact 3D light-cone interception point on active ship's worldline
        if (activeShip && activeShip.voyage.legs.length > 0) {
          const evSys = systemsById.get(ev.systemId);
          const emitterPos = evSys ? systemPosAtEpoch(evSys, epochOffsetYears) : [0, 0, 0];
          const hit = solveSignalToShip(activeShip.voyage, emitterPos, evSys?.name || ev.systemId, ev.year);
          if (hit && hit.tHitCoordYear >= minYear && hit.tHitCoordYear <= maxYear) {
            const hitSt = evaluateVoyageAtCoordYear(activeShip.voyage, hit.tHitCoordYear);
            if (hitSt) {
              const hx = toX(hitSt.totalDistanceCoveredLy);
              const hy = toY(hit.tHitCoordYear);
              ctx.strokeStyle = '#facc15';
              ctx.lineWidth = 1.8;
              ctx.beginPath();
              ctx.arc(hx, hy, 5.5, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        }
      });

      // Ship worldlines: sample from departureYear through maxYear (includes docked vertical
      // worldline after braking or continuing sloped coast worldline after a flyby!)
      shipsWithVoyages.forEach((sh) => {
        const v = sh.voyage;
        if (!v || v.legs.length === 0) return;

        ctx.strokeStyle = sh.color || '#00f0ff';
        ctx.lineWidth = sh.id === activeShipId ? 2.6 : 1.6;
        ctx.beginPath();
        const samples = 160;
        const endT = Math.max(v.arrivalYear, maxYear);
        for (let i = 0; i <= samples; i++) {
          const tYr = v.departureYear + (i / samples) * Math.max(0.01, endT - v.departureYear);
          const st = evaluateVoyageAtCoordYear(v, tYr);
          const x = toX(st.totalDistanceCoveredLy);
          const y = toY(tYr);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Current Master Clock marker on worldline
        const nowState = evaluateVoyageAtCoordYear(v, masterClockYear);
        if (nowState) {
          const mx = toX(nowState.totalDistanceCoveredLy);
          const my = toY(masterClockYear);
          ctx.fillStyle = sh.color || '#00f0ff';
          ctx.beginPath();
          ctx.arc(mx, my, 4.5, 0, Math.PI * 2);
          ctx.fill();
          if (sh.id === activeShipId) {
            ctx.fillStyle = '#e2e8f0';
            ctx.textAlign = 'left';
            const shortShip = sh.name.includes(' · ') ? sh.name.split(' · ')[0] : sh.name;
            const shipLblY = Math.max(PAD.top + 12, Math.min(PAD.top + plotH - 6, my - 6));
            ctx.fillText(`${shortShip} (τ=${nowState.properTimeYears.toFixed(1)}${t('unitYrShort')})`, mx + 8, shipLblY);
          }
        }
      });

      // Horizontal Master Clock line (Simultaneity slice in Earth Frame)
      const yNow = toY(masterClockYear);
      if (yNow >= PAD.top && yNow <= PAD.top + plotH) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.65)';
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(PAD.left, yNow);
        ctx.lineTo(PAD.left + plotW, yNow);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();

      // Border & Axis Labels
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.strokeRect(PAD.left, PAD.top, plotW, plotH);
      ctx.fillStyle = '#00f0ff';
      ctx.textAlign = 'center';
      ctx.fillText(t('minkowskiXAxis'), PAD.left + plotW / 2, H - 8);

      ctx.save();
      ctx.translate(16, PAD.top + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(t('minkowskiYAxis'), 0, 0);
      ctx.restore();
    };

    drawMinkowski();
    const ro = new ResizeObserver(drawMinkowski);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [isOpen, activeTab, shipsWithVoyages, activeShipId, masterClockYear, storyEvents, minYear, maxYear, systemsById, epochOffsetYears, lang, t]);

  // Generate Markdown summary for novel notes
  const markdownExport = useMemo(() => {
    const lines = [
      '# Hard Sci-Fi Interstellar Voyage & Causality Timeline',
      '',
      `Generated by Astrometrics Suite · Master Clock: **Year ${formatNum(masterClockYear, 2, lang)}**`,
      '',
    ];

    for (const sh of shipsWithVoyages) {
      const v = sh.voyage;
      lines.push(`## Ship / Character: ${sh.name}`);
      lines.push(
        `- **Drive Profile:** ${sh.driveConfig.mode} (${sh.driveConfig.accelG}g, max ${(sh.driveConfig.cruiseC * 100).toFixed(1)}% c, ${sh.driveConfig.driveType})`
      );
      lines.push(
        `- **Total Distance:** ${v.totalDistanceLy.toFixed(3)} ly | **Earth Time (Δt):** ${v.totalCoordTimeYears.toFixed(2)} yr | **Ship Crew Time (Δτ):** ${v.totalProperTimeYears.toFixed(2)} yr | **Crew Age:** ${v.crewStartAge.toFixed(1)} → ${v.crewEndAge.toFixed(1)} yr`
      );
      lines.push('');
      lines.push('| Stop # | Star System | Earth Arrival | Earth Departure | Crew Proper Time (τ) | Crew Biological Age | Earth Twin Age |');
      lines.push('| :--- | :--- | :--- | :--- | :--- | :--- | :--- |');
      v.stops.forEach((st) => {
        lines.push(
          `| ${st.index} | **${st.systemName}** | ${st.arriveCoordYear.toFixed(2)} | ${st.departCoordYear.toFixed(2)} | ${st.arriveCrewProperYears.toFixed(2)} yr | ${st.crewBiologicalAgeArrive.toFixed(2)} yr | ${(st.earthTwinAgeArrive ?? st.earthTwinAgeDepart).toFixed(2)} yr |`
        );
      });
      lines.push('');
    }
    return lines.join('\n');
  }, [shipsWithVoyages, masterClockYear, lang]);

  if (!isOpen) return null;

  return (
    <section className="hud-panel bottom-timeline-studio">
      {/* Studio Top Bar */}
      <div className="studio-header">
        <div className="studio-title-group">
          <Clock size={15} className="section-icon" />
          <span className="studio-title">{t('timelineStudioTitle')}</span>
        </div>

        <div className="studio-tabs">
          <button
            type="button"
            className={`studio-tab-btn ${activeTab === 'gantt' ? 'active' : ''}`}
            onClick={() => setActiveTab('gantt')}
          >
            <Clock size={13} />
            <span>{t('tabTimelineGantt')}</span>
          </button>
          <button
            type="button"
            className={`studio-tab-btn ${activeTab === 'minkowski' ? 'active' : ''}`}
            onClick={() => setActiveTab('minkowski')}
          >
            <Activity size={13} />
            <span>{t('tabMinkowski')}</span>
          </button>
          <button
            type="button"
            className={`studio-tab-btn ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveTab('export')}
          >
            <FileText size={13} />
            <span>{t('tabStoryExport')}</span>
          </button>
        </div>

        {/* Master Coordinate Clock Scrubber */}
        <div className="master-clock-bar">
          <button type="button" className="hud-btn play-btn" onClick={onTogglePlay}>
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            <span>{isPlaying ? t('btnPauseTimeline') : t('btnPlayTimeline')}</span>
          </button>
          <span className="clock-label">{t('masterClockLabel')}:</span>
          <input
            type="range"
            min={minYear}
            max={maxYear}
            step="0.05"
            className="hud-range clock-slider"
            value={masterClockYear}
            onChange={(e) => onChangeMasterClockYear(Number(e.target.value))}
          />
          <strong className="clock-readout">{formatNum(masterClockYear, 2, lang)}</strong>
          {shipsWithVoyages.length > 0 && typeof onClearAllVoyages === 'function' && (
            <button
              type="button"
              className="mini-hud-btn warn"
              onClick={onClearAllVoyages}
              title={t('btnClearAllVoyagesTooltip')}
            >
              <Trash2 size={12} />
            </button>
          )}
          <button type="button" className="icon-btn close-studio-btn" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Studio Body */}
      <div className="studio-body">
        {activeTab === 'gantt' && (
          <div className="gantt-workspace">
            <div className="gantt-tracks-area">
              {/* Time Ruler */}
              <div className="gantt-ruler">
                {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((f) => {
                  const yVal = minYear + f * (maxYear - minYear);
                  return (
                    <span key={f} className="ruler-tick" style={{ left: `${f * 100}%` }}>
                      {formatNum(yVal, 1, lang)}
                    </span>
                  );
                })}
              </div>

              {/* Multi-Ship Dual-Frame Tracks */}
              {shipsWithVoyages.length === 0 && (
                <div className="gantt-empty-notice">{t('emptyFleetDesc')}</div>
              )}
              {shipsWithVoyages.map((sh) => {
                const v = sh.voyage;
                const live = evaluateVoyageAtCoordYear(v, masterClockYear);
                const toPct = (yr) => Math.max(0, Math.min(100, ((yr - minYear) / Math.max(1, maxYear - minYear)) * 100));

                return (
                  <div
                    key={sh.id}
                    className={`gantt-ship-row ${sh.id === activeShipId ? 'active' : ''}`}
                    onClick={() => onSelectShip(sh.id)}
                  >
                    <div className="gantt-ship-meta">
                      <div className="gantt-ship-name">
                        <span className="ship-color-dot" style={{ backgroundColor: sh.color }} />
                        <strong>{sh.name}</strong>
                      </div>
                      {live && (
                        <div className="gantt-live-badges">
                          <span>τ={formatNum(live.properTimeYears, 2, lang)}{t('unitYrShort')}</span>
                          <span>{t('crewAgeShort')}: {formatNum(live.crewAge, 1, lang)}{t('unitYrShort')}</span>
                          <span className="highlight-cyan">{formatNum(live.speedC * 100, 1, lang)}%c</span>
                        </div>
                      )}
                    </div>

                    <div className="gantt-track-bar-container">
                      {/* Render Flight Legs */}
                      {v.legs.map((leg) => {
                        const left = toPct(leg.departCoordYear);
                        const width = Math.max(0.6, toPct(leg.arriveCoordYear) - left);
                        return (
                          <div
                            key={leg.index}
                            className="gantt-leg-segment"
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                              borderColor: sh.color,
                              background: `linear-gradient(90deg, rgba(0,240,255,0.28), rgba(245,158,11,0.28))`,
                            }}
                            title={`${leg.fromSystemName} → ${leg.toSystemName}: Δt=${leg.profile.totalTime.toFixed(2)}y, Δτ=${leg.profile.properTime.toFixed(2)}y`}
                          >
                            <span className="gantt-seg-label">
                              {leg.fromSystemName} → {leg.toSystemName} (Δτ {formatNum(leg.profile.properTime, 1, lang)}{t('unitYrShort')})
                            </span>
                          </div>
                        );
                      })}

                      {/* Render Stopovers */}
                      {v.stops.map((st) => {
                        if (!st.stayYears || st.stayYears <= 0) return null;
                        const left = toPct(st.arriveCoordYear);
                        const width = Math.max(0.4, toPct(st.departCoordYear) - left);
                        return (
                          <div
                            key={`stay-${st.index}`}
                            className="gantt-stay-segment"
                            style={{ left: `${left}%`, width: `${width}%` }}
                            title={`Stopover at ${st.systemName}: ${st.stayYears} yr`}
                          />
                        );
                      })}

                      {/* Current Master Clock Playhead */}
                      <div
                        className="gantt-playhead"
                        style={{ left: `${toPct(masterClockYear)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Story Events & Causality Light-Cone Checker */}
            <div className="story-events-sidebar">
              <div className="section-title-row">
                <Radio size={13} className="section-icon" />
                <span>{t('storyEventsTitle')}</span>
              </div>

              <div className="add-event-form">
                <input
                  type="text"
                  className="hud-input"
                  placeholder={t('eventTitlePlaceholder')}
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                />
                <div className="form-row-2">
                  <select
                    className="hud-select"
                    value={newEventSystemId}
                    onChange={(e) => setNewEventSystemId(e.target.value)}
                  >
                    <option value="sol">Sol (Earth)</option>
                    {shipsWithVoyages
                      .flatMap((s) => s.voyage.stops)
                      .filter((st, idx, arr) => st.systemId !== 'sol' && arr.findIndex((x) => x.systemId === st.systemId) === idx)
                      .map((st) => (
                        <option key={st.systemId} value={st.systemId}>
                          {st.systemName}
                        </option>
                      ))}
                  </select>
                  <input
                    type="number"
                    step="0.5"
                    className="hud-input"
                    value={newEventYear}
                    onChange={(e) => setNewEventYear(Number(e.target.value))}
                  />
                </div>
                <button
                  type="button"
                  className="hud-btn primary-btn full-width"
                  onClick={() => {
                    if (!newEventTitle.trim()) return;
                    onAddStoryEvent({
                      id: `ev-${Date.now()}`,
                      title: newEventTitle.trim(),
                      systemId: newEventSystemId,
                      year: Number(newEventYear) || masterClockYear,
                    });
                    setNewEventTitle('');
                  }}
                >
                  <Plus size={13} />
                  <span>{t('btnAddStoryEvent')}</span>
                </button>
              </div>

              <div className="events-list">
                {storyEvents.map((ev) => {
                  const sys = systemsById.get(ev.systemId);
                  const emitterPos = sys ? systemPosAtEpoch(sys, epochOffsetYears) : [0, 0, 0];
                  const activeShip = shipsWithVoyages.find((s) => s.id === activeShipId) || shipsWithVoyages[0];
                  const hit = activeShip
                    ? solveSignalToShip(activeShip.voyage, emitterPos, sys?.name || ev.systemId, ev.year)
                    : null;

                  return (
                    <div key={ev.id} className="story-event-card">
                      <div className="ev-card-header">
                        <strong>
                          ⚡ {ev.title && typeof ev.title === 'object' ? ev.title[lang] || ev.title.en : ev.title}
                        </strong>
                        <button
                          type="button"
                          className="wp-remove-btn"
                          onClick={() => onRemoveStoryEvent(ev.id)}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                      <div className="ev-card-meta">
                        <span>{sys?.name || ev.systemId}</span> · <span>{t('yearShort')} {formatNum(ev.year, 2, lang)}</span>
                      </div>
                      {hit && activeShip && (
                        <div className="ev-causality-note">
                          {t('reachesShipLabel')} <strong>{activeShip.name}</strong> ({t('yearShort')}{' '}
                          <strong className="highlight-cyan">{formatNum(hit.tHitCoordYear, 2, lang)}</strong> ·{' '}
                          {t('crewAgeShort')}{' '}
                          <strong className="highlight-emerald">
                            {formatNum(hit.crewAgeAtHit, 1, lang)} {t('unitYrShort')}
                          </strong>)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'minkowski' && (
          <div className="minkowski-container">
            <canvas ref={minkowskiCanvasRef} className="minkowski-canvas" />
          </div>
        )}

        {activeTab === 'export' && (
          <div className="export-workspace">
            <div className="export-actions-bar">
              <button
                type="button"
                className="hud-btn primary-btn"
                onClick={() => {
                  navigator.clipboard?.writeText(markdownExport);
                  setCopiedMd(true);
                  setTimeout(() => setCopiedMd(false), 2000);
                }}
              >
                <Copy size={13} />
                <span>{copiedMd ? t('copiedLabel') : t('btnExportMarkdown')}</span>
              </button>
              <button type="button" className="hud-btn secondary-btn" onClick={onExportJson}>
                <Download size={13} />
                <span>{t('btnExportJson')}</span>
              </button>
              <label className="hud-btn secondary-btn file-upload-btn">
                <Upload size={13} />
                <span>{t('btnImportJson')}</span>
                <input
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={onImportJson}
                />
              </label>
            </div>
            <pre className="markdown-preview-box">{markdownExport}</pre>
          </div>
        )}
      </div>
    </section>
  );
}

