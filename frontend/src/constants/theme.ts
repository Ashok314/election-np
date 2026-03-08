/**
 * Centralized theme colors for JavaScript-based components (Chart.js, Leaflet, etc.)
 * These should align with CSS variables in index.css
 */

export const COLORS = {
  emerald: '#10b981',
  blue: '#3b82f6',
  amber: '#f59e0b',
  rose: '#f43f5e',
  red: '#ef4444',
  pink: '#ec4899',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  zinc: {
    900: '#18181b',
    800: '#27272a',
    700: '#3f3f46',
    400: '#a1a1aa',
    500: '#71717a',
  },
  slate: {
    500: '#64748b',
    400: '#94a3b8',
    200: '#e2e8f0',
    100: '#f1f5f9',
    50: '#f8fafc',
  },
};

export const THEME_COLORS = {
  dark: {
    bg: '#09090b',
    card: '#18181b',
    border: '#27272a',
    text: '#f4f4f5',
    textMuted: '#a1a1aa',
  },
  light: {
    bg: '#f8fafc',
    card: '#ffffff',
    border: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#64748b',
  },
};

export const getStatusColor = (isElected: boolean) => (isElected ? COLORS.emerald : COLORS.blue);
