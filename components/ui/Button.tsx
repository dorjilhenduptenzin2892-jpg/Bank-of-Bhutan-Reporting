
import React from 'react';

type ButtonType = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  btnType?: ButtonType;
  loading?: boolean;
  as?: 'button' | 'span';
}

export const Button: React.FC<ButtonProps> = ({
  btnType = 'primary',
  loading = false,
  as = 'button',
  className = '',
  children,
  disabled,
  ...props
}) => {
  const content = loading ? (
    <span className="btn-loading">
      <span className="btn-spinner" />
      Processing...
    </span>
  ) : (
    children
  );

  if (as === 'span') {
    return (
      <span className={`btn btn-${btnType} ${className}`.trim()}>
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`btn btn-${btnType} ${className}`.trim()}
      disabled={disabled || loading}
      {...props}
    >
      {content}
    </button>
  );
};
