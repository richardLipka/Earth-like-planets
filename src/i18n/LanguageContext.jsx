import React, { createContext, useContext, useState, useCallback } from 'react';
import { translations } from './translations.js';

const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem('astrometrics_lang');
      if (saved === 'en' || saved === 'cs') return saved;
    } catch {}
    return 'en';
  });

  const changeLang = useCallback((next) => {
    setLang(next);
    try {
      localStorage.setItem('astrometrics_lang', next);
    } catch {}
  }, []);

  const t = useCallback(
    (key) => {
      return translations[lang]?.[key] ?? translations.en?.[key] ?? key;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

