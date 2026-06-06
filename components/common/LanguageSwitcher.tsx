'use client';

import { LOCALE_OPTIONS, SupportedLocale } from '@/lib/i18n';
import { useLocale } from '@/hooks/useLocale';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const FLAG: Record<SupportedLocale, string> = {
  'en-US': '🇺🇸',
  'en-GB': '🇬🇧',
  'es-ES': '🇪🇸',
  'fr-FR': '🇫🇷',
  'de-DE': '🇩🇪',
  'ar-SA': '🇸🇦',
  'fil-PH': '🇵🇭',
  'hi-IN': '🇮🇳',
  'id-ID': '🇮🇩',
  'th-TH': '🇹🇭',
  'ja-JP': '🇯🇵',
  'zh-CN': '🇨🇳',
  'sw-KE': '🇰🇪',
  'ha-NG': '🇳🇬',
  'pt-BR': '🇧🇷',
};

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const [locale, setLocale] = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Change language"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium
                   bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-300 hover:text-white
                   border border-zinc-700/50 transition-colors duration-150"
      >
        <Globe size={14} className="opacity-70" />
        <span>{FLAG[locale]}</span>
        <span className="hidden sm:inline">{LOCALE_OPTIONS.find((o) => o.value === locale)?.label ?? locale}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Language options"
          className="absolute right-0 mt-1 w-44 rounded-xl border border-zinc-700/60
                     bg-zinc-900 shadow-xl z-50 overflow-hidden py-1"
        >
          {LOCALE_OPTIONS.map((opt) => (
            <li key={opt.value} role="option" aria-selected={locale === opt.value}>
              <button
                onClick={() => { setLocale(opt.value); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2
                             transition-colors duration-100
                             ${locale === opt.value
                               ? 'bg-accent/10 text-accent font-medium'
                               : 'text-zinc-300 hover:bg-zinc-800'}`}
              >
                <span>{FLAG[opt.value]}</span>
                <span>{opt.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
