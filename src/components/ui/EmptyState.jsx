import { Icon } from './Icon.jsx';
import { Button } from './Button.jsx';

export function EmptyState({ icon = 'info', title, hint, action, onAction, className = '' }) {
  return (
    <div className={`text-center py-12 px-6 bg-mg-surface rounded-xl ${className}`}>
      <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto text-mg-teal mb-3 shadow-sm">
        <Icon name={icon} className="w-6 h-6" />
      </div>
      <h4 className="text-base font-semibold text-slate-900">{title}</h4>
      {hint && <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">{hint}</p>}
      {action && (
        <Button className="mt-4" onClick={onAction}>{action}</Button>
      )}
    </div>
  );
}
