import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';

interface MaskedInputProps {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'url' | 'password';
  className?: string;
  maskMode?: 'dots' | 'partial';
  readOnly?: boolean;
}

export function MaskedInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  className = '',
  maskMode = 'dots',
  readOnly = false,
}: MaskedInputProps) {
  const [visible, setVisible] = useState(false);

  const getMaskedValue = (): string => {
    if (!value) return '';
    if (maskMode === 'dots') {
      return '••••••••';
    }
    if (maskMode === 'partial' && value.length > 8) {
      const first = value.slice(0, 5);
      const last = value.slice(-3);
      return `${first}****${last}`;
    }
    return value;
  };

  const displayValue = visible ? value : getMaskedValue();
  const inputType = visible ? type : 'text';

  return (
    <div className="relative">
      <Input
        type={inputType}
        value={readOnly ? displayValue : value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly && !visible}
        className={`font-mono text-sm h-9 rounded-sm pr-10 ${className}`}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={() => setVisible(!visible)}
        tabIndex={-1}
      >
        {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </Button>
    </div>
  );
}
