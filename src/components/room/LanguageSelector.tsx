import { LANGUAGES } from '@/constants/languages';

interface LanguageSelectorProps {
  label: string;
  value: string;
  onChange: (code: string) => void;
}

export function LanguageSelector({ label, value, onChange }: LanguageSelectorProps) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-cyan"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.label}
          </option>
        ))}
      </select>
    </label>
  );
}
