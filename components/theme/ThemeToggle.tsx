'use client';

import { motion } from 'framer-motion';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeManager } from '@/hooks/useThemeManager';
import { ThemeMode } from '@/config/theme-manager';

interface ThemeToggleProps {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ThemeToggle({ showLabel = false, size = 'md' }: ThemeToggleProps) {
  const { settings, setMode } = useThemeManager();
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
  
  const buttonClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  };

  const modes = [
    { mode: ThemeMode.LIGHT, icon: Sun, label: 'Light' },
    { mode: ThemeMode.DARK, icon: Moon, label: 'Dark' },
    { mode: ThemeMode.SYSTEM, icon: Monitor, label: 'System' },
  ];

  const cycleMode = () => {
    const currentIndex = modes.findIndex(m => m.mode === settings.mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const nextMode = modes[nextIndex];
    if (nextMode) {
      setMode(nextMode.mode);
    }
  };

  const defaultMode = modes[1]!;
  const currentMode = modes.find(m => m.mode === settings.mode) ?? defaultMode;
  const CurrentIcon = currentMode?.icon ?? Moon;

  return (
    <motion.button
      onClick={cycleMode}
      className={`
        ${buttonClasses[size]} rounded-lg
        text-zinc-400 hover:text-zinc-50
        hover:bg-zinc-900 transition-all
        flex items-center gap-2
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={`Current theme: ${currentMode?.label ?? 'Dark'}. Click to switch theme mode`}
      title={`Theme: ${currentMode?.label ?? 'Dark'}`}
    >
      <motion.div
        key={settings.mode}
        initial={{ rotate: -180, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        exit={{ rotate: 180, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <CurrentIcon className={sizeClasses[size]} />
      </motion.div>
      {showLabel && (
        <span className="text-sm font-medium">{currentMode?.label ?? 'Dark'}</span>
      )}
    </motion.button>
  );
}

// Expanded toggle with all three options visible
export function ThemeToggleExpanded({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const { settings, setMode } = useThemeManager();
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const modes = [
    { mode: ThemeMode.LIGHT, icon: Sun, label: 'Light' },
    { mode: ThemeMode.DARK, icon: Moon, label: 'Dark' },
    { mode: ThemeMode.SYSTEM, icon: Monitor, label: 'System' },
  ];

  return (
    <div className="flex items-center gap-1 bg-zinc-950/80 rounded-lg p-1 border border-zinc-800">
      {modes.map(({ mode, icon: Icon, label }) => {
        const isActive = settings.mode === mode;
        return (
          <motion.button
            key={mode}
            onClick={() => setMode(mode)}
            className={`
              p-2 rounded-md transition-all
              ${isActive 
                ? 'bg-cyan-400/20 text-cyan-400' 
                : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900'
              }
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={`Switch to ${label} theme`}
            aria-pressed={isActive}
          >
            <Icon className={sizeClasses[size]} />
          </motion.button>
        );
      })}
    </div>
  );
}
