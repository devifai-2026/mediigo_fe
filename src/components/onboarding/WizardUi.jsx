import { useId } from 'react';
import clsx from 'clsx';

/**
 * The onboarding wizard's building blocks: numbered step tabs, uppercase
 * section titles and roomy labelled inputs. Kept apart from the desk UI kit
 * because a field agent fills this on a phone, standing in a clinic — larger
 * targets and clearer labels than a desk screen needs.
 */

// Same control as the patient portal's Field/Input (components/ui/Field.jsx):
// 8px corners, slate-300 border, teal focus, 16px text on phones so iOS does not zoom.
export const W_INPUT = 'w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-base sm:text-sm font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400 transition focus:outline-none focus:border-mg-teal focus:ring-2 focus:ring-mg-teal/20 disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200';

export function StepTabs({ steps, current, reached, onPick }) {
  return (
    <ol className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      {steps.map((label, i) => {
        const active = i === current;
        const done = i < reached && !active;
        const clickable = i <= reached && i !== current && onPick;
        return (
          <li key={label}>
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onPick(i)}
              aria-current={active ? 'step' : undefined}
              className={clsx(
                'w-full h-10 sm:h-11 px-3 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2',
                active && 'bg-mg-blue text-white shadow-sm',
                !active && done && 'bg-teal-50 text-mg-teal hover:bg-teal-100',
                !active && !done && 'bg-mg-surface text-slate-500',
                !clickable && !active && 'cursor-default',
              )}
            >
              {done && <i className="fa-solid fa-circle-check" aria-hidden="true" />}
              <span className="truncate">{i + 1}. {label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function SectionTitle({ icon, tone = 'text-mg-blue', children, right }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
      <h2 className="flex items-center gap-2.5 text-[13px] sm:text-sm font-semibold uppercase tracking-wide text-slate-900">
        <i className={clsx('fa-solid', icon, tone)} aria-hidden="true" />
        {children}
      </h2>
      {right}
    </div>
  );
}

/** A labelled control. `error` replaces the hint once the step has been attempted. */
export function WField({ label, required, hint, error, className, children }) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-slate-700 mb-1.5">
          {label}{required && <span className="text-rose-500"> *</span>}
        </label>
      )}
      {typeof children === 'function' ? children(id) : children}
      {error
        ? <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>
        : hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function WInput({ label, required, hint, error, className, inputClassName, ...rest }) {
  return (
    <WField label={label} required={required} hint={hint} error={error} className={className}>
      {(id) => <input id={id} className={clsx(W_INPUT, error && 'border-rose-300 bg-rose-50/40', inputClassName)} {...rest} />}
    </WField>
  );
}

/** A grouped block inside a step — the patient portal's card radius (12px), not a pill. */
export function WSection({ tone = 'plain', className, children }) {
  return (
    <section className={clsx(
      'rounded-xl border p-4 sm:p-5',
      tone === 'admin' && 'border-amber-300 bg-amber-50/50',
      tone === 'muted' && 'border-slate-200 bg-mg-surface/60',
      tone === 'plain' && 'border-slate-200 bg-white',
      tone === 'note' && 'border-emerald-200 bg-emerald-50/60',
      className,
    )}>
      {children}
    </section>
  );
}

export function Badge({ tone = 'slate', children }) {
  return (
    <span className={clsx(
      'shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-md',
      tone === 'amber' && 'bg-amber-500 text-white',
      tone === 'emerald' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      tone === 'blue' && 'bg-blue-50 text-mg-blue border border-blue-100',
      tone === 'yellow' && 'bg-amber-50 text-amber-800 border border-amber-200',
      tone === 'slate' && 'bg-slate-100 text-slate-600 border border-slate-200',
    )}>
      {children}
    </span>
  );
}
