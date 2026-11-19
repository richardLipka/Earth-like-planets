import React from 'react';
import { ExternalLink, GraduationCap, Award } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

export default function Footer() {
  const { lang, t } = useLanguage();
  const cs = lang === 'cs';

  return (
    <footer className="app-footer-strip">
      <div className="footer-left">
        <a
          href="https://www.kiv.zcu.cz/"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-kiv-link"
          title={t('footerDepartment')}
        >
          <img src="./kiv_logo.svg" alt="KIV ZČU" className="footer-kiv-logo" />
          <span className="footer-dept-text">
            <GraduationCap size={12} />
            <strong>{t('footerDepartmentShort')}</strong>
            <span className="footer-sep">·</span>
            <span>{t('footerUniversityShort')}</span>
          </span>
        </a>
      </div>

      <div className="footer-center">
        <span className="footer-author-label">{t('footerAuthorLabel')}:</span>
        <a
          href="https://home.zcu.cz/~lipka/"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-author-link"
        >
          <strong>Richard Lipka</strong>
          <ExternalLink size={10} />
        </a>
        <span className="footer-sep">·</span>
        <span className="footer-mission">
          {cs
            ? '3D astrometrie, exoplanety (NASA) & relativistické plánování tras'
            : '3D Astrometrics, NASA Exoplanets & Relativistic Route Planning'}
        </span>
      </div>

      <div className="footer-right">
        <a
          href="https://github.com/richardLipka/Earth-like-planets"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-pill-link"
        >
          <span>GitHub</span>
          <ExternalLink size={10} />
        </a>
        <a
          href="https://creativecommons.org/licenses/by-sa/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-pill-link"
          title="HYG Star Data CC BY-SA 4.0 · Application MIT"
        >
          <Award size={11} />
          <span>MIT / CC BY-SA 4.0</span>
        </a>
      </div>
    </footer>
  );
}

