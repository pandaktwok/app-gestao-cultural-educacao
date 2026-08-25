import React from 'react';
import { clsx } from 'clsx';

interface BentoCardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
  bgColor?: string; // Hex or tailwind color
  textColor?: string;
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  title,
  subtitle,
  icon,
  badge,
  bgColor = '#FFFFFF',
  textColor = '#1E1E24',
  className,
  children,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      style={{ backgroundColor: bgColor, color: textColor }}
      className={clsx(
        'rounded-bento-lg p-6 shadow-bento transition-all duration-300 relative overflow-hidden',
        onClick && 'cursor-pointer hover:shadow-bento-hover hover:-translate-y-1 active:scale-[0.99]',
        className
      )}
    >
      {(title || icon || badge) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-3 rounded-2xl bg-black/5 flex items-center justify-center shrink-0">
                {icon}
              </div>
            )}
            <div>
              {title && <h3 className="text-xl font-extrabold tracking-tight">{title}</h3>}
              {subtitle && <p className="text-sm opacity-70 font-medium">{subtitle}</p>}
            </div>
          </div>
          {badge && (
            <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-black/10 backdrop-blur-sm">
              {badge}
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
};
