import React from 'react';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle }) => (
  <button type="button" className="theme-toggle" onClick={onToggle} aria-label="Toggle dark mode">
    <span className="theme-toggle-dot" />
    {theme === 'dark' ? 'Light' : 'Dark'}
  </button>
);

export default ThemeToggle;
