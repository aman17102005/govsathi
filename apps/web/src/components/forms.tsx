import { useId, useState, type ReactNode } from 'react';
import { useI18n } from '../i18n';
import { INCOME_BANDS, sameRange } from '../lib/options';
import type { Range } from '@govsathi/shared';

const labelCls = 'block text-base font-bold text-ink';
const helpCls = 'mt-1 text-sm text-muted';
const inputCls =
  'mt-2 block min-h-12 w-full rounded-xl border-2 border-line bg-card px-4 py-2 text-lg text-ink placeholder:text-muted focus:border-brand';
const chipBase =
  'flex min-h-12 items-center justify-center rounded-xl border-2 border-line bg-card px-3 py-2 text-center text-base transition-colors hover:border-brand peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus';

export function ErrorText({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-2 text-sm font-semibold text-red-800">
      {children}
    </p>
  );
}

interface Choice<T extends string> {
  value: T;
  label: string;
}

export function ChoiceGroup<T extends string>({
  legend, help, options, value, onChange, onSkip, skipped, columns = 'sm:grid-cols-2', error,
}: {
  legend: string;
  help?: string;
  options: Choice<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
  /** When provided, a "Prefer not to say" choice is shown. */
  onSkip?: () => void;
  skipped?: boolean;
  columns?: string;
  error?: string;
}) {
  const { t } = useI18n();
  const name = useId();
  const helpId = `${name}-help`;
  const errId = `${name}-err`;
  return (
    <fieldset className="min-w-0 border-0 p-0" aria-describedby={[help ? helpId : '', error ? errId : ''].join(' ').trim() || undefined}>
      <legend className={labelCls}>{legend}</legend>
      {help && <p id={helpId} className={helpCls}>{help}</p>}
      <div className={`mt-3 grid grid-cols-1 gap-2 ${columns}`}>
        {options.map((o) => (
          <label key={o.value} className="block cursor-pointer">
            <input type="radio" name={name} value={o.value} checked={value === o.value && !skipped} onChange={() => onChange(o.value)} className="peer sr-only" />
            <span className={chipBase}>{o.label}</span>
          </label>
        ))}
        {onSkip && (
          <label className="block cursor-pointer">
            <input type="radio" name={name} value="__skip" checked={!!skipped} onChange={onSkip} className="peer sr-only" />
            <span className={`${chipBase} italic`}>{t('common.preferNotToSay')}</span>
          </label>
        )}
      </div>
      {error && <ErrorText id={errId}>{error}</ErrorText>}
    </fieldset>
  );
}

export function YesNoField({ legend, help, value, onChange, onSkip, skipped }: {
  legend: string;
  help?: string;
  value: boolean | undefined;
  onChange: (v: boolean) => void;
  onSkip?: () => void;
  skipped?: boolean;
}) {
  const { t } = useI18n();
  return (
    <ChoiceGroup
      legend={legend}
      help={help}
      columns="grid-cols-2 sm:grid-cols-3"
      options={[{ value: 'yes', label: t('common.yes') }, { value: 'no', label: t('common.no') }]}
      value={value === undefined ? undefined : value ? 'yes' : 'no'}
      onChange={(v) => onChange(v === 'yes')}
      onSkip={onSkip}
      skipped={skipped}
    />
  );
}

export function TextField({ label, help, value, onChange, optional, autoComplete }: {
  label: string; help?: string; value: string; onChange: (v: string) => void; optional?: boolean; autoComplete?: string;
}) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
        {optional && <span className="ms-2 text-sm font-normal text-muted">({t('common.optional')})</span>}
      </label>
      {help && <p id={`${id}-h`} className={helpCls}>{help}</p>}
      <input id={id} type="text" value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} maxLength={80} aria-describedby={help ? `${id}-h` : undefined} className={inputCls} />
    </div>
  );
}

export function NumberField({ label, help, value, onChange, min = 0, max, optional, error: externalError, decimal }: {
  label: string; help?: string; value: number | undefined; onChange: (v: number | undefined) => void;
  min?: number; max?: number; optional?: boolean; error?: string; decimal?: boolean;
}) {
  const { t } = useI18n();
  const id = useId();
  const [text, setText] = useState(value === undefined ? '' : String(value));
  const [error, setError] = useState<string | undefined>();
  const commit = (raw: string) => {
    setText(raw);
    const s = raw.trim();
    if (s === '') {
      setError(undefined);
      onChange(undefined);
      return;
    }
    const n = Number(s);
    if (!Number.isFinite(n) || (!decimal && !Number.isInteger(n)) || !/^\d+(\.\d+)?$/.test(s)) {
      setError(t('error.invalidNumber'));
      onChange(undefined);
    } else if (n < min || (max !== undefined && n > max)) {
      setError(externalError ?? t('error.invalidNumber'));
      onChange(undefined);
    } else {
      setError(undefined);
      onChange(n);
    }
  };
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
        {optional && <span className="ms-2 text-sm font-normal text-muted">({t('common.optional')})</span>}
      </label>
      {help && <p id={`${id}-h`} className={helpCls}>{help}</p>}
      <input
        id={id}
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={text}
        onChange={(e) => commit(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={[help ? `${id}-h` : '', error ? `${id}-e` : ''].join(' ').trim() || undefined}
        className={inputCls}
      />
      {error && <ErrorText id={`${id}-e`}>{error}</ErrorText>}
    </div>
  );
}

export function SelectField({ label, help, value, onChange, options, optional }: {
  label: string; help?: string; value: string | undefined; onChange: (v: string | undefined) => void;
  options: { value: string; label: string }[]; optional?: boolean;
}) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
        {optional && <span className="ms-2 text-sm font-normal text-muted">({t('common.optional')})</span>}
      </label>
      {help && <p id={`${id}-h`} className={helpCls}>{help}</p>}
      <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)} aria-describedby={help ? `${id}-h` : undefined} className={inputCls}>
        <option value="">{t('common.select')}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function CheckboxGroup<T extends string>({ legend, options, value, onChange }: {
  legend: string; options: { value: T; label: string }[]; value: T[]; onChange: (v: T[]) => void;
}) {
  const name = useId();
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className={labelCls}>{legend}</legend>
      <div className="mt-3 grid gap-2">
        {options.map((o) => (
          <label key={o.value} className="block cursor-pointer">
            <input
              type="checkbox"
              name={name}
              checked={value.includes(o.value)}
              onChange={(e) => onChange(e.target.checked ? [...value, o.value] : value.filter((x) => x !== o.value))}
              className="peer sr-only"
            />
            <span className={`${chipBase} justify-start text-start`}>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Predefined bands plus an optional exact figure. Stores a Range (exact figures have min === max). */
export function IncomeField({ legend, value, onChange, onSkip, skipped }: {
  legend: string; value: Range | undefined; onChange: (v: Range | undefined) => void; onSkip?: () => void; skipped?: boolean;
}) {
  const { t, money } = useI18n();
  const labelOf = (b: Range, i: number) =>
    i === 0 ? t('onb.income.below', { max: money(b.max!) })
      : b.max === null ? t('onb.income.above', { min: money(b.min) })
        : t('onb.income.between', { min: money(b.min), max: money(b.max) });
  const bandIdx = INCOME_BANDS.findIndex((b) => sameRange(b, value));
  const exact = value && value.max === value.min ? value.min : undefined;
  return (
    <div className="space-y-4">
      <ChoiceGroup
        legend={legend}
        columns="sm:grid-cols-2"
        options={INCOME_BANDS.map((_b, i) => ({ value: String(i), label: labelOf(INCOME_BANDS[i]!, i) }))}
        value={bandIdx >= 0 ? String(bandIdx) : undefined}
        onChange={(v) => onChange(INCOME_BANDS[Number(v)])}
        onSkip={onSkip}
        skipped={skipped}
      />
      {!skipped && (
        <NumberField
          key={exact === undefined ? 'band' : 'exact'}
          label={t('onb.income.exact')}
          value={exact}
          onChange={(n) => onChange(n === undefined ? undefined : { min: n, max: n })}
          optional
        />
      )}
    </div>
  );
}

export function Button({ children, variant = 'primary', ...rest }: { variant?: 'primary' | 'secondary' | 'ghost' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: 'bg-brand text-white hover:bg-brand-dark disabled:opacity-60',
    secondary: 'border-2 border-brand text-brand hover:bg-paper',
    ghost: 'text-brand underline underline-offset-4 hover:bg-paper',
  }[variant];
  return (
    <button type="button" {...rest} className={`min-h-12 rounded-xl px-6 py-2 text-base font-bold ${styles} ${rest.className ?? ''}`}>
      {children}
    </button>
  );
}
