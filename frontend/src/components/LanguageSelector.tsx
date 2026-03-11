import React from 'react';
import { useLanguage, Language } from '../i18n';

const LanguageSelector: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: t.english, flag: 'EN' },
    { code: 'ru', label: t.russian, flag: 'RU' },
    { code: 'uz', label: t.uzbek, flag: 'UZ' },
  ];

  return (
    <div className="relative">
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="appearance-none bg-white border border-slate-300 rounded-lg px-3 py-1.5 pr-8 text-xs font-medium text-slate-700 cursor-pointer hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
        title={t.language}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

export default LanguageSelector;
