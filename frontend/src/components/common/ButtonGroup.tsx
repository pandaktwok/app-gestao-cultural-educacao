import React from 'react';

interface ButtonGroupProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'secondary' | 'solid' | 'bordered' | 'flat';
  className?: string;
}

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export const ButtonGroup: React.FC<ButtonGroupProps> & {
  Separator: React.FC<{ className?: string }>;
} = ({ children, size = 'sm', variant = 'secondary', className = '' }) => {
  const sizeClasses = {
    sm: 'text-xs py-0.5 px-0.5 gap-0.5',
    md: 'text-sm py-1 px-1 gap-1',
    lg: 'text-base py-1.5 px-1.5 gap-1.5',
  }[size];

  const variantClasses = {
    secondary: 'bg-gray-100/90 border border-gray-200 shadow-inner',
    solid: 'bg-gray-200 border border-gray-300',
    bordered: 'bg-transparent border border-gray-300',
    flat: 'bg-gray-50 border border-transparent',
  }[variant];

  return (
    <div
      className={`inline-flex items-center rounded-full p-1 transition-all ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </div>
  );
};

const ButtonGroupSeparator: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`w-px h-3.5 bg-gray-300/80 mx-0.5 self-center shrink-0 ${className}`} />
);

ButtonGroup.Separator = ButtonGroupSeparator;

export const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  onClick,
  className = '',
  disabled = false,
}) => {
  const handleClick = () => {
    if (disabled) return;
    if (onPress) onPress();
    if (onClick) onClick();
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer select-none active:scale-95 flex items-center justify-center ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      {children}
    </button>
  );
};
