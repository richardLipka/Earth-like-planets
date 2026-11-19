import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { formatNum } from '../../utils/format.js';
import { evaluateVoyageAtCoordYear } from '../../engine/voyagePlanner.js';
import { lorentzGamma } from '../../engine/relativity.js';
import { systemPosAtEpoch } from '../../engine/stellarMotion.js';
import {
  buildBridgeBasis,
  projectStarToBridge,
  computeCmbForwardGlow,
} from '../../engine/relativisticOptics.js';
import { Eye, X, Gauge } from 'lucide-react';

export default function RelativisticBridgeView({
  isOpen,
  onClose,
  allSystems,
  activeShip,
  activeVoyage,
  masterClockYear,
  epochOffsetYears,
}) {
  const { lang, t } = useLanguage();
  const canvasRef = useRef(null);
  const [viewMode, setViewMode] = useState('full360'); // 'bow90' | 'full360'
  const [useTestBeta, setUseTestBeta] = useState(false);
  const [testBeta, setTestBeta] = useState(0.85);

  // Live ship kinematics (position, heading, speed, gamma, target star)
  const shipContext = useMemo(() => {
    const defaultDir = [1, 0, 0];
    if (!activeVoyage || !activeVoyage.legs || activeVoyage.legs.length === 0) {
      return {
        pos: [0, 0, 0],
        dir: defaultDir,
        liveBeta: 0,
        liveGamma: 1,
        targetSystemId: null,
        targetSystemName: '—',
        status: 'idle',
      };
    }
    const st = evaluateVoyageAtCoordYear(activeVoyage, masterClockYear);
    const leg = activeVoyage.legs[st?.legIndex ?? 0] || activeVoyage.legs[0];
    const dir = leg?.dir || defaultDir;
    return {
      pos: st?.pos || leg.fromPos || [0, 0, 0],
      dir,
      liveBeta: st?.speedC || 0,
      liveGamma: st?.gamma || 1,
      targetSystemId: leg?.toSystemId || null,
      targetSystemName: leg?.toSystemName || '—',
      status: st?.status || 'in-flight',
    };
  }, [activeVoyage, masterClockYear]);

  const effectiveBeta = useTestBeta ? testBeta : shipContext.liveBeta;
  const effectiveGamma = useTestBeta ? lorentzGamma(testBeta) : shipContext.liveGamma;

  const cmb = useMemo(
    () => computeCmbForwardGlow(effectiveBeta, effectiveGamma),
    [effectiveBeta, effectiveGamma]
  );

  // Render real catalogued stars into the relativistic bridge viewport canvas
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = 286;
    const H = 220;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = W * 0.5;
    const cy = H * 0.5;
    const R = Math.min(W, H) * 0.44;

    // Deep space background
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, W, H);

    // Clip to circular bridge viewport
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();

    // Subtle bridge dome gradient
    const bgGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, R);
    bgGrad.addColorStop(0, '#071326');
    bgGrad.addColorStop(1, '#02050e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

    // Forward CMB blueshift thermal glow around the bow apex when gamma is high
    if (cmb.glowAlpha > 0.01) {
      const cmbR = R * (viewMode === 'bow90' ? 0.55 : 0.34);
      const cmbGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cmbR);
      cmbGrad.addColorStop(0, cmb.glowColor);
      cmbGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cmbGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, cmbR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Angular reticle rings (30°, 60°, 90° abeam equator, and 135° astern in 360° mode)
    const maxAngleRad = viewMode === 'bow90' ? Math.PI * 0.5 : Math.PI;
    const ringsDeg = viewMode === 'bow90' ? [30, 60, 90] : [45, 90, 135, 180];
    ctx.font = '8.5px "JetBrains Mono", monospace';
    for (const deg of ringsDeg) {
      const frac = (deg * Math.PI) / 180 / maxAngleRad;
      const rr = frac * R;
      ctx.strokeStyle =
        deg === 90 ? 'rgba(0, 240, 255, 0.35)' : 'rgba(148, 163, 184, 0.16)';
      ctx.lineWidth = deg === 90 ? 1.1 : 0.7;
      ctx.setLineDash(deg === 90 ? [3, 3] : []);
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      if (deg < 180) {
        ctx.fillStyle = deg === 90 ? 'rgba(0, 240, 255, 0.7)' : 'rgba(148, 163, 184, 0.5)';
        ctx.textAlign = 'left';
        ctx.fillText(`${deg}°`, cx + 3, cy - rr + 9);
      }
    }

    // Crosshairs
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.14)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(cx - R, cy);
    ctx.lineTo(cx + R, cy);
    ctx.moveTo(cx, cy - R);
    ctx.lineTo(cx, cy + R);
    ctx.stroke();

    // Project real catalogued stars!
    const basis = buildBridgeBasis(shipContext.dir);
    const list = allSystems || [];
    const labeledCandidates = [];
    let targetScreen = null;

    for (let i = 0; i < list.length; i++) {
      const sys = list[i];
      // Use primary star temperature & magnitude
      const st0 = sys.stars?.[0];
      const absMag = Number.isFinite(st0?.absmag) ? st0.absmag : 6.0;
      const teff = Number.isFinite(st0?.teff) ? st0.teff : 5200;
      const isTarget = sys.id === shipContext.targetSystemId;

      // Keep rendering fast & crisp: project Tier-1 / bright stars + planets + target (~1,200 stars)
      if (!isTarget && sys.tier !== 1 && !sys.hasPlanets && absMag > 8.5) continue;

      const starPos = systemPosAtEpoch(sys, epochOffsetYears);
      const proj = projectStarToBridge({
        starPos,
        shipPos: shipContext.pos,
        basis,
        beta: effectiveBeta,
        exactGamma: effectiveGamma,
        starTeff: teff,
        starAbsMag: absMag,
      });
      if (!proj) continue;
      if (proj.thetaApparentRad > maxAngleRad) continue;

      const rPx = (proj.thetaApparentRad / maxAngleRad) * R;
      const sx = cx + rPx * Math.cos(proj.azimuthRad);
      const sy = cy - rPx * Math.sin(proj.azimuthRad);

      // Apparent radius from relativistically beamed magnitude
      const radiusPx = Math.max(0.75, Math.min(3.4, 2.7 - 0.24 * proj.apparentMag));
      const alpha = Math.max(0.24, Math.min(1.0, (1.15 - 0.08 * Math.max(-2, proj.apparentMag)) * proj.color.visFactor));

      ctx.fillStyle = `rgba(${proj.color.r}, ${proj.color.g}, ${proj.color.b}, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, radiusPx, 0, Math.PI * 2);
      ctx.fill();

      // Subtle UV/X-ray outer halo ring for strongly blueshifted bright stars
      if ((proj.color.band === 'uv' || proj.color.band === 'xray') && radiusPx >= 1.8) {
        ctx.strokeStyle = `rgba(165, 180, 252, ${(alpha * 0.45).toFixed(2)})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.arc(sx, sy, radiusPx + 1.8, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (isTarget) {
        targetScreen = { sx, sy, name: sys.name, proj };
      } else if (proj.apparentMag < 1.2 || sys.id === 'sol') {
        labeledCandidates.push({ sx, sy, name: sys.name, mag: proj.apparentMag, isSol: sys.id === 'sol' });
      }
    }

    // Highlight Destination Target Star with tactical diamond reticle
    if (targetScreen) {
      const { sx, sy, name } = targetScreen;
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 7);
      ctx.lineTo(sx + 7, sy);
      ctx.lineTo(sx, sy + 7);
      ctx.lineTo(sx - 7, sy);
      ctx.closePath();
      ctx.stroke();

      ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
      ctx.fillStyle = '#00ff88';
      ctx.textAlign = 'center';
      const lblY = sy + 17 < cy + R - 8 ? sy + 17 : sy - 11;
      const lblX = Math.max(cx - R + 42, Math.min(cx + R - 42, sx));
      ctx.fillText(`◈ ${name}`, lblX, lblY);
    }

    // Draw up to 4 brightest non-colliding star labels (always prioritizing Sol!)
    labeledCandidates.sort((a, b) => (b.isSol ? 1 : 0) - (a.isSol ? 1 : 0) || a.mag - b.mag);
    const drawnBoxes = targetScreen ? [{ x: targetScreen.sx, y: targetScreen.sy }] : [];
    ctx.font = '8.5px "JetBrains Mono", monospace';
    let labelCount = 0;
    for (const c of labeledCandidates) {
      if (labelCount >= 4) break;
      if (drawnBoxes.some((b) => Math.hypot(b.x - c.sx, b.y - c.sy) < 34)) continue;
      drawnBoxes.push({ x: c.sx, y: c.sy });
      labelCount++;
      ctx.fillStyle = c.isSol ? '#fde047' : 'rgba(226, 232, 240, 0.78)';
      ctx.textAlign = 'left';
      ctx.fillText(c.name, c.sx + 5, c.sy + 3);
    }

    ctx.restore();

    // Outer circular viewport bezel
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    // Bow / Aft corner indicators
    ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.textAlign = 'left';
    ctx.fillText(t('bridgeBowLabel'), 8, 14);
    ctx.fillStyle = '#fb7185';
    ctx.textAlign = 'right';
    ctx.fillText(viewMode === 'bow90' ? '90°' : t('bridgeAftRimLabel'), W - 8, 14);
  }, [isOpen, allSystems, shipContext, effectiveBeta, effectiveGamma, cmb, viewMode, epochOffsetYears, t]);

  if (!isOpen) return null;

  const dFwd = effectiveBeta < 1e-9 ? 1.0 : effectiveGamma * (1 + effectiveBeta);
  const dRear = 1 / dFwd;

  return (
    <aside className="map-floating-panel bridge-view-panel">
      <div className="mfp-header">
        <div className="mfp-title-group">
          <Eye size={14} className="section-icon" />
          <span className="mfp-title">{t('bridgePanelTitle')}</span>
        </div>
        <div className="bridge-header-actions">
          <button
            type="button"
            className={`mini-hud-btn ${viewMode === 'full360' ? 'active' : ''}`}
            onClick={() => setViewMode((m) => (m === 'full360' ? 'bow90' : 'full360'))}
            title={t('bridgeFovToggleTooltip')}
          >
            {viewMode === 'full360' ? '360°' : '180°'}
          </button>
          <button type="button" className="icon-btn" onClick={onClose} title={t('hidePanelTooltip')}>
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="bridge-body">
        <div className="bridge-ship-strip">
          <span className="bridge-ship-name" title={activeShip?.name}>
            {activeShip?.name?.split(' · ')[0] || 'ISV'} → {shipContext.targetSystemName}
          </span>
          <span className="highlight-cyan">
            β={formatNum(effectiveBeta * 100, 1, lang)}%c · γ={formatNum(effectiveGamma, effectiveGamma > 10 ? 1 : 2, lang)}
          </span>
        </div>

        <div className="bridge-canvas-wrap">
          <canvas ref={canvasRef} className="bridge-canvas" />
        </div>

        {/* Live Clock vs. Interactive Test Beta Override */}
        <div className="bridge-speed-controls">
          <div className="bridge-mode-row">
            <button
              type="button"
              className={`preset-chip ${!useTestBeta ? 'active' : ''}`}
              onClick={() => setUseTestBeta(false)}
            >
              {t('bridgeSyncLive')}
            </button>
            <button
              type="button"
              className={`preset-chip ${useTestBeta ? 'active' : ''}`}
              onClick={() => {
                setUseTestBeta(true);
                if (shipContext.liveBeta > 0.05) setTestBeta(Math.min(0.995, shipContext.liveBeta));
              }}
            >
              <Gauge size={10} /> {t('bridgeTestSpeed')}
            </button>
          </div>
          {useTestBeta && (
            <input
              type="range"
              min="0"
              max="0.999"
              step="0.005"
              className="hud-range full-width"
              value={testBeta}
              onChange={(e) => setTestBeta(Number(e.target.value))}
            />
          )}
        </div>

        {/* Compact Relativistic Optics Telemetry */}
        <div className="bridge-telemetry-grid">
          <div className="bridge-kv">
            <span>{t('bridgeBowShift')}</span>
            <strong className="highlight-cyan">×{formatNum(dFwd, dFwd > 10 ? 1 : 2, lang)}</strong>
          </div>
          <div className="bridge-kv">
            <span>{t('bridgeAftShift')}</span>
            <strong className="highlight-amber">×{formatNum(dRear, 3, lang)}</strong>
          </div>
          <div className="bridge-kv">
            <span>CMB (Bow)</span>
            <strong className={cmb.isVisiblyGlowing ? 'highlight-amber' : ''}>
              {formatNum(cmb.bowTempK, cmb.bowTempK > 50 ? 0 : 1, lang)} K
            </strong>
          </div>
        </div>
      </div>
    </aside>
  );
}
