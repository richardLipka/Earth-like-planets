import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { formatNum } from '../../utils/format.js';
import { BookMarked, Play, Compass, ExternalLink, X, Rocket, Radio, Sparkles } from 'lucide-react';

export default function SciFiVoyagesModal({
  isOpen,
  onClose,
  voyages,
  activeVoyagePresetId,
  onLoadVoyage,
}) {
  const { lang, t } = useLanguage();
  const [category, setCategory] = useState('all');

  const counts = useMemo(() => {
    const list = voyages || [];
    return {
      all: list.length,
      'revelation-space': list.filter((v) => v.category === 'revelation-space').length,
      bobiverse: list.filter((v) => v.category === 'bobiverse').length,
      'eastern-bloc': list.filter((v) => v.category === 'eastern-bloc').length,
      'classic-sf': list.filter((v) => v.category === 'classic-sf').length,
      'modern-sf': list.filter((v) => v.category === 'modern-sf').length,
    };
  }, [voyages]);

  const filtered = useMemo(() => {
    const list = voyages || [];
    if (category === 'all') return list;
    return list.filter((v) => v.category === category);
  }, [voyages, category]);

  if (!isOpen) return null;

  return (
    <div className="hud-modal-backdrop" onClick={onClose}>
      <div className="hud-modal-dialog voyage-library-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="hud-modal-header">
          <div className="modal-title-group">
            <BookMarked size={16} className="section-icon" />
            <h3>{t('voyageModalTitle')}</h3>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} title={t('hidePanelTooltip')}>
            <X size={16} />
          </button>
        </div>

        <div className="hud-modal-body">
          <p className="modal-intro-text">{t('voyageModalIntro')}</p>

          {/* Category Filter Tabs */}
          <div className="voyage-cat-tabs">
            {[
              { id: 'all', label: `${t('voyageCatAll')} (${counts.all})` },
              { id: 'revelation-space', label: `★ ${t('voyageCatRevSpace')} (${counts['revelation-space']})` },
              { id: 'bobiverse', label: `★ ${t('voyageCatBobiverse')} (${counts.bobiverse})` },
              { id: 'eastern-bloc', label: `${t('voyageCatEasternBloc')} (${counts['eastern-bloc']})` },
              { id: 'classic-sf', label: `${t('voyageCatClassic')} (${counts['classic-sf']})` },
              { id: 'modern-sf', label: `${t('voyageCatModern')} (${counts['modern-sf']})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`voyage-cat-btn ${category === tab.id ? 'active' : ''}`}
                onClick={() => setCategory(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 2-Column Voyage Cards Grid */}
          <div className="voyage-cards-grid">
            {filtered.map((vp) => {
              const isLoaded = vp.id === activeVoyagePresetId;
              const loc = (v) => (v && typeof v === 'object' ? v[lang] || v.en : v);
              const titleText = loc(vp.title);
              const subText = loc(vp.subtitle);
              const booksText = loc(vp.books);
              const physNote = loc(vp.physicsNote);
              const sourceTitle = loc(vp.sourceLabel);

              return (
                <article key={vp.id} className={`voyage-preset-card ${isLoaded ? 'active' : ''}`}>
                  <div className="vp-top-meta">
                    <span className="hud-tag scifi-badge-tag">
                      ★ {lang === 'cs' && vp.universeCs ? vp.universeCs : vp.universe}
                    </span>
                    <span className="vp-author">
                      {lang === 'cs' && vp.authorCs ? vp.authorCs : vp.author} ({vp.year})
                    </span>
                    <span className="vp-counts">
                      <Rocket size={11} /> {vp.ships.length} · <Radio size={11} /> {(vp.storyEvents || []).length}
                    </span>
                  </div>

                  <h4 className="vp-title">{titleText}</h4>
                  <div className="vp-books">{booksText}</div>
                  <p className="vp-desc">{subText}</p>

                  {/* Ship Trajectories Preview */}
                  <div className="vp-ships-list">
                    {(vp.computedSummary || []).map((ss, idx) => {
                      const shRaw = vp.ships[idx];
                      const shipName =
                        lang === 'cs' ? ss.nameCs || shRaw?.nameCs || ss.name : ss.name;
                      return (
                        <div key={ss.id} className="vp-ship-row">
                          <div className="vp-ship-head">
                            <span
                              className="ship-color-dot"
                              style={{ backgroundColor: shRaw?.color || '#00f0ff' }}
                            />
                            <strong>{shipName}</strong>
                          </div>
                          <div className="vp-ship-route">{ss.routeNames.join(' → ')}</div>
                          <div className="vp-ship-metrics">
                            <span>{formatNum(ss.totalDistanceLy, 1, lang)} ly</span>
                            <span>·</span>
                            <span className="highlight-cyan">
                              Δt {formatNum(ss.totalCoordTimeYears, 1, lang)}{t('unitYrShort')}
                            </span>
                            <span>·</span>
                            <span className="highlight-emerald">
                              Δτ {formatNum(ss.totalProperTimeYears, 1, lang)}{t('unitYrShort')}
                            </span>
                            <span>·</span>
                            <span className="highlight-amber">
                              {formatNum(ss.peakSpeedC * 100, 1, lang)}%c
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {physNote && (
                    <div className="vp-physics-note">
                      <Sparkles size={12} className="vp-note-icon" />
                      <span>{physNote}</span>
                    </div>
                  )}

                  <div className="vp-card-actions">
                    <button
                      type="button"
                      className="hud-btn primary-btn"
                      onClick={() => {
                        onLoadVoyage(vp, true);
                        onClose();
                      }}
                    >
                      <Play size={12} />
                      <span>{t('voyageLoadAndPlay')}</span>
                    </button>
                    <button
                      type="button"
                      className="hud-btn secondary-btn"
                      onClick={() => {
                        onLoadVoyage(vp, false);
                        onClose();
                      }}
                    >
                      <Compass size={12} />
                      <span>{t('voyageLoadPaused')}</span>
                    </button>
                    {vp.sourceUrl && (
                      <a
                        href={vp.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="source-ref-link vp-src-link"
                        title={sourceTitle}
                      >
                        <span>{t('voyageSourceLink')}</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

