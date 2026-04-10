'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeManager } from '@/hooks/useThemeManager';
import {
  ThemeMode,
  ColorDensity,
  BorderRadius,
  isValidHexColor,
} from '@/config/theme-manager';
import { ChevronDown, Copy, Check } from 'lucide-react';

export function ThemeCustomizer() {
  const {
    settings,
    setMode,
    setColorDensity,
    setBorderRadius,
    setDisableAnimations,
    setHighContrast,
  } = useThemeManager();

  const [expandedSection, setExpandedSection] = useState<string | null>('appearance');
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState(settings.customPalette?.primary?.['500'] || '#0ea5e9');

  const themeModes = [
    { value: ThemeMode.LIGHT, label: '☀️ Light', hint: 'Light theme' },
    { value: ThemeMode.DARK, label: '🌙 Dark', hint: 'Dark theme' },
    { value: ThemeMode.SYSTEM, label: '🖥️ System', hint: 'Follow system preference' },
  ];

  const densityOptions = [
    { value: ColorDensity.LOW, label: 'Low', hint: 'Lighter colors' },
    { value: ColorDensity.MEDIUM, label: 'Medium', hint: 'Balanced colors' },
    { value: ColorDensity.HIGH, label: 'High', hint: 'Vibrant colors' },
  ];

  const radiusOptions = [
    { value: BorderRadius.SQUARE, label: '□ Square', hint: 'Sharp corners' },
    { value: BorderRadius.ROUNDED, label: '◯ Rounded', hint: 'Rounded corners' },
    { value: BorderRadius.PILL, label: '◉ Pill', hint: 'Pill-shaped' },
  ];

  const copyToClipboard = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const sections = [
    {
      id: 'appearance',
      title: '🎨 Appearance',
      content: (
        <div className="space-y-6">
          {/* Theme Mode */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-3 block">
              Theme Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {themeModes.map((mode) => (
                <motion.button
                  key={mode.value}
                  onClick={() => setMode(mode.value as ThemeMode)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    settings.mode === mode.value
                      ? 'border-blue-500 bg-blue-600/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                  title={mode.hint}
                >
                  <div className="text-sm font-medium text-white">{mode.label}</div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Color Density */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-3 block">
              Color Density
            </label>
            <div className="grid grid-cols-3 gap-2">
              {densityOptions.map((option) => (
                <motion.button
                  key={option.value}
                  onClick={() => setColorDensity(option.value as ColorDensity)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    settings.colorDensity === option.value
                      ? 'border-blue-500 bg-blue-600/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                  title={option.hint}
                >
                  <div className="text-sm font-medium text-white">{option.label}</div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Border Radius */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-3 block">
              Border Radius
            </label>
            <div className="grid grid-cols-3 gap-2">
              {radiusOptions.map((option) => (
                <motion.button
                  key={option.value}
                  onClick={() => setBorderRadius(option.value as BorderRadius)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    settings.borderRadius === option.value
                      ? 'border-blue-500 bg-blue-600/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                  title={option.hint}
                >
                  <div className="text-sm font-medium text-white">{option.label}</div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'accessibility',
      title: '♿ Accessibility',
      content: (
        <div className="space-y-4">
          {/* Animations */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <div>
              <label className="text-sm font-medium text-white">Disable Animations</label>
              <p className="text-xs text-slate-400 mt-1">
                Reduce motion for accessibility
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.disableAnimations}
              onChange={(e) =>  setDisableAnimations(e.target.checked)}
              className="w-5 h-5 cursor-pointer"
            />
          </div>

          {/* High Contrast */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <div>
              <label className="text-sm font-medium text-white">High Contrast</label>
              <p className="text-xs text-slate-400 mt-1">
                Increase color contrast for better readability
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.highContrast}
              onChange={(e) =>  setHighContrast(e.target.checked)}
              className="w-5 h-5 cursor-pointer"
            />
          </div>
        </div>
      ),
    },
    {
      id: 'colors',
      title: '🎯 Custom Colors',
      content: (
        <div className="space-y-4">
          {/* Primary Color Input */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              Primary Color
            </label>
            <div className="flex gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) =>  {
                  setPrimaryColor(e.target.value);
                  if (isValidHexColor(e.target.value)) {
                    // Would generate palette from color here
                  }
                }}
                className="w-16 h-10 rounded-lg cursor-pointer border border-slate-700"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) =>  setPrimaryColor(e.target.value)}
                placeholder="#0ea5e9"
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
              />
              <motion.button
                onClick={() => copyToClipboard(primaryColor)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                {copiedColor === primaryColor ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </motion.button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Enter a valid hex color (#RRGGBB)
            </p>
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-600/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-blue-300">
              💡 Custom color palettes are automatically generated from your primary color. Your custom theme will override the current preset.
            </p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-white mb-4">Customize Theme</h3>

      {sections.map((section) => (
        <motion.div
          key={section.id}
          className="rounded-lg border border-slate-700 bg-slate-900/50"
        >
          <motion.button
            onClick={() =>
              setExpandedSection(expandedSection === section.id ? null : section.id)
            }
            className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
          >
            <span className="text-sm font-medium text-white">{section.title}</span>
            <motion.div
              animate={{ rotate: expandedSection === section.id ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {expandedSection === section.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-slate-700"
              >
                <div className="p-4">{section.content}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}
