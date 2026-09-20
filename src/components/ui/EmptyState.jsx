import { Icon } from './Icon.jsx';
import { Button } from './Button.jsx';

export function EmptyState({ icon = 'info', title, hint, action, onAction, className = '' }) {
  return (
    <div className={`text-center py-12 px-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300 ${className}`}>
      <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto text-slate-400 mb-3 border border-slate-200">
        <Icon name={icon} className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
      {hint && <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">{hint}</p>}
      {action && (
        <Button className="mt-4" onClick={onAction}>{action}</Button>
      )}
    </div>
  );
}
