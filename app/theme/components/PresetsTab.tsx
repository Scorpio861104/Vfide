'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original theme page

export function PresetsTab() {
  return (
    <div className="space-y-6">
      <div className="space-y-6">
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
    <h2 className="text-2xl font-bold text-white mb-6">Theme Presets</h2>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Object.entries(THEME_PRESETS).map(([_key, preset]) => (
    <motion.button
    key={preset.id}
    onClick={() => setTheme(preset.id as ThemeName)}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className={`p-6 rounded-lg border-2 transition-all ${
    currentTheme === preset.id
    ? 'border-purple-500 bg-purple-600/10'
    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
    }`}
    >
    {/* Color preview circles */}
    <div className="flex gap-2 mb-4">
    {[preset.preview.primary, preset.preview.secondary, preset.preview.accent].map(
    (color, idx) => (
    <div
    key={idx}
    className="w-6 h-6 rounded-full border border-slate-600"
    style={{ backgroundColor: color }}
    />
    )
    )}
    </div>

    {/* Theme name */}
    <div className="text-left">
    <p className="font-semibold text-white mb-1">{preset.name}</p>
    <p className="text-xs text-slate-400">{preset.description}</p>
    </div>

    {/* Selected indicator */}
    {currentTheme === preset.id && (
    <div className="mt-4 pt-4 border-t border-purple-500/30 flex items-center justify-center text-purple-400">
    <span className="text-xs font-bold">✓ ACTIVE</span>
    </div>
    )}
    </motion.button>
    ))}
    </div>
    </div>

    {/* Mode Selection */}
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
    <h3 className="text-xl font-bold text-white mb-4">Theme Mode</h3>

    <div className="grid grid-cols-3 gap-4">
    {[
    { mode: ThemeMode.LIGHT, label: 'Light', icon: Sun },
    { mode: ThemeMode.DARK, label: 'Dark', icon: Moon },
    { mode: ThemeMode.SYSTEM, label: 'System', icon: Monitor },
    ].map(({ mode, label, icon: Icon }) => (
    <motion.button
    key={mode}
    onClick={() => setMode(mode)}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
    settings.mode === mode
    ? 'border-purple-500 bg-purple-600/10'
    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
    }`}
    >
    <Icon className="w-6 h-6 text-slate-400" />
    <span className="font-medium text-white">{label}</span>
    {settings.mode === mode && (
    <span className="text-xs text-purple-400 font-bold">ACTIVE</span>
    )}
    </motion.button>
    ))}
    </div>
    </div>
  </div>
    </div>
  );
}
