import { useState } from 'react';
import './IconButton.css';

interface IconButtonProps {
  onClick: () => void;
  tooltip: string;
  variant?: 'warning' | 'primary';
  children: React.ReactNode;
}

export function IconButton({ onClick, tooltip, variant = 'primary', children }: IconButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="icon-button-wrapper">
      <button
        className={`icon-button icon-button-${variant}`}
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={tooltip}
      >
        {children}
      </button>
      {showTooltip && (
        <div className="icon-tooltip">
          {tooltip}
        </div>
      )}
    </div>
  );
}
