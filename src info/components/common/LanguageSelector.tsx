import React from 'react';
import { LANGUAGE_OPTIONS, useTranslation } from '../../i18n/i18n';

interface LanguageSelectorProps {
  compact?: boolean;
}

export function LanguageSelector({ compact = false }: LanguageSelectorProps) {
  const { language, setLanguage } = useTranslation();
  const label = LANGUAGE_OPTIONS.find((option) => option.code === language)?.code.toUpperCase() ?? language.toUpperCase();

  return (
    <div className={compact ? 'relative w-16 min-w-0' : 'relative'}>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as typeof language)}
        className={
          compact
            ? 'w-full rounded-xl border border-(--border) bg-(--surface) px-2 py-1 text-[10px] font-semibold text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 appearance-none'
            : 'rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40'
        }
        aria-label="Select language"
      >
        {LANGUAGE_OPTIONS.map(({ code, label }) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </select>
    </div>
  );
}
