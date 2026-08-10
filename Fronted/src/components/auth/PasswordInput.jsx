import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Input from '../ui/Input';
import { getPasswordStrength } from '../../utils/validators';

export default function PasswordInput({ showStrength = false, value, ...props }) {
  const [visible, setVisible] = useState(false);
  const strength = showStrength ? getPasswordStrength(value || '') : null;

  const barColors = ['bg-line', 'bg-danger', 'bg-brand-400', 'bg-success', 'bg-success'];

  return (
    <div>
      <Input
        type={visible ? 'text' : 'password'}
        value={value}
        suffix={
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            className="rounded-md p-1 text-ink-muted transition-colors hover:text-ink"
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
        {...props}
      />
      {showStrength && value && (
        <div className="mt-2">
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i < strength.score ? barColors[strength.score] : 'bg-line'
                }`}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-ink-muted">{strength.label}</p>
        </div>
      )}
    </div>
  );
}
