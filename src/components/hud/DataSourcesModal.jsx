import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { Database, ExternalLink, X } from 'lucide-react';

export default function DataSourcesModal({ isOpen, onClose, catalogMeta, scifiMeta }) {
  const { lang } = useLanguage();
  if (!isOpen || !catalogMeta) return null;
  const cs = lang === 'cs';

  const allSources = [
    ...(catalogMeta.sources || []),
    ...((scifiMeta?.sources || []).map((s, idx) => ({
      id: `scifi-${idx}`,
      name: s.name,
      url: s.url,
      citation: cs
        ? `Celo-katalogový sci-fi index (${scifiMeta.systemsWithFictionCount} / ${scifiMeta.catalogueSystemsSwept || 3494} hvězd, ${scifiMeta.curatedHighlightsCount} záznamů, ${scifiMeta.wikipediaCategoryWorksCount} děl z Wikipedie)`
        : `Whole-catalogue Sci-Fi index (${scifiMeta.systemsWithFictionCount} / ${scifiMeta.catalogueSystemsSwept || 3494} stars swept, ${scifiMeta.curatedHighlightsCount} entries, ${scifiMeta.wikipediaCategoryWorksCount} Wikipedia works)`,
    }))),
  ];

  return (
    <div className="hud-modal-backdrop" onClick={onClose}>
      <div className="hud-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="hud-modal-header">
          <div className="modal-title-group">
            <Database size={16} className="section-icon" />
            <h3>
              {cs
                ? 'ASTRONOMICKÉ KATALOGY, ZDROJE DAT A METODIKA'
                : 'ASTRONOMICAL CATALOGUES, DATA SOURCES & METHODOLOGY'}
            </h3>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="hud-modal-body">
          <div className="modal-stats-banner">
            <div className="m-stat">
              <span>
                {cs
                  ? `Hvězdné soustavy (≤ ${catalogMeta.maxRadiusLy || 105} ly)`
                  : `Star Systems (≤ ${catalogMeta.maxRadiusLy || 105} ly)`}
              </span>
              <strong>{catalogMeta.counts?.totalSystems}</strong>
            </div>
            <div className="m-stat">
              <span>{cs ? 'Viditelné ze Země (V ≤ 6,5)' : 'Visible from Earth (V ≤ 6.5)'}</span>
              <strong>{catalogMeta.counts?.visibleFromEarthSystems}</strong>
            </div>
            <div className="m-stat">
              <span>{cs ? 'Soustavy s exoplanetami' : 'Exoplanet Host Systems'}</span>
              <strong className="highlight-cyan">{catalogMeta.counts?.exoplanetHostSystems}</strong>
            </div>
            <div className="m-stat">
              <span>{cs ? 'V obyvatelné zóně (HZ)' : 'Habitable Zone Hosts'}</span>
              <strong className="highlight-emerald">{catalogMeta.counts?.optimisticHzHostSystems}</strong>
            </div>
            <div className="m-stat">
              <span>{cs ? 'Potvrzené planety' : 'Confirmed Planets'}</span>
              <strong>{catalogMeta.counts?.totalConfirmedPlanets}</strong>
            </div>
          </div>

          <p className="modal-intro-text">
            {cs
              ? `Katalog této aplikace je sestavován výhradně ze skutečných pozorovaných dat pomocí automatizovaného skriptu (npm run update-db). Poslední aktualizace lokálních dat: ${catalogMeta.generatedAt || '—'}${scifiMeta?.generatedAt ? ` (Sci-Fi index: ${scifiMeta.generatedAt})` : ''}. Žádné fiktivní planety nejsou v astronomických tabulkách zobrazovány.`
              : `This catalogue is built strictly from real observational data via an automated local pipeline (npm run update-db). Last local dataset refresh: ${catalogMeta.generatedAt || '—'}${scifiMeta?.generatedAt ? ` (Sci-Fi index: ${scifiMeta.generatedAt})` : ''}. No fictional planets are displayed in astronomical tables.`}
          </p>

          <div className="sources-cards-grid">
            {allSources.map((src) => (
              <div key={src.id} className="modal-source-card">
                <div className="m-src-top">
                  <strong>{src.name}</strong>
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className="source-ref-link">
                    <span>Open Source</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
                <div className="m-src-cit">{src.citation}</div>
                {src.license && <div className="m-src-lic">License: {src.license}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

