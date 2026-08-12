export interface LanguageOption {
  code: string;
  label: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
];

export function getLanguage(code: string): LanguageOption {
  return LANGUAGES.find((lang) => lang.code === code) ?? LANGUAGES[0];
}

export function detectDefaultLanguage(): string {
  const browserLang = navigator.language?.slice(0, 2).toLowerCase();
  return LANGUAGES.some((lang) => lang.code === browserLang) ? browserLang : 'es';
}
