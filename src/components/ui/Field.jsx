import { Children, cloneElement, isValidElement, useId } from 'react';
import clsx from 'clsx';

// One input style everywhere. 16px text on phones — anything smaller and iOS
// Safari zooms the page on focus.
export const INPUT = 'w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-mg-teal focus:ring-2 focus:ring-mg-teal/20 transition disabled:opacity-60 disabled:bg-slate-50';
const useInputClass = () => INPUT;

export function Field({ label, error, hint, required, children, className }) {
  // Tie the label to its control, so tapping the label focuses it and screen
  // readers announce it. Only for a single element child; a composite control
  // keeps whatever ids it sets itself.
  const autoId = useId();
  const only = Children.count(children) === 1 && isValidElement(children) ? children : null;
  const id = only ? (only.props.id ?? autoId) : undefined;
  const control = only && !only.props.id ? cloneElement(only, { id }) : children;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-slate-700 mb-1.5">
          {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}
      {control}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}

export function Input({ className, error, ...rest }) {
  return <input className={clsx(useInputClass(), error && 'border-rose-300 bg-rose-50/40', className)} {...rest} />;
}

export function Select({ className, children, ...rest }) {
  return (
    <select className={clsx(useInputClass(), 'cursor-pointer', className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className, rows = 3, ...rest }) {
  return <textarea rows={rows} className={clsx(useInputClass(), 'h-auto py-2.5 resize-none', className)} {...rest} />;
}
