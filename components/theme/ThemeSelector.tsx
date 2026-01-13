'use client';

import { motion } from 'framer-motion';
import { useThemeManager } from '@/hooks/useThemeManager';
import { ThemeName, THEME_PRESETS } from '@/config/theme-manager';
import { Check } from 'lucide-react';

export function ThemeSelector() {
  const { currentTheme, setTheme } = useThemeManager();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Theme Presets</h3>
        <span className="text-xs px-2 py-1 bg-blue-600/20 text-blue-400 rounded">
          {currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(THEME_PRESETS).map(([_key, preset]) => (
          <motion.button
            key={preset.id}
            onClick={() => setTheme(preset.id as ThemeName)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative p-4 rounded-lg border-2 transition-all group ${
              currentTheme === preset.id
                ? 'border-blue-500 bg-blue-600/10'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            }`}
          >
            {/* Color preview circles */}
            <div className="flex gap-1.5 mb-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: preset.preview.primary }}
              />
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: preset.preview.secondary }}
              />
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: preset.preview.accent }}
              />
            </div>

            {/* Theme name */}
            <div className="text-xs font-medium text-white text-left">
              {preset.name}
            </div>

            {/* Checkmark */}
            {currentTheme === preset.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
              >
                <Check className="w-3 h-3 text-white" />
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
