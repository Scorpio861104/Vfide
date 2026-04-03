'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original theme page

export function AdvancedTab() {
  return (
    <div className="space-y-6">
      <div className="space-y-6">
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
    <h2 className="text-2xl font-bold text-white mb-6">Advanced Options</h2>

    <div className="space-y-4">
    {/* Export Theme */}
    <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
    <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
    <Download className="w-5 h-5 text-blue-400" />
    <div>
    <p className="font-semibold text-white">Export Theme</p>
    <p className="text-sm text-slate-400">Download your theme as a JSON file</p>
    </div>
    </div>
    <div className="flex gap-2">
    <motion.button
    onClick={handleCopyTheme}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
    >
    <Copy className="w-4 h-4" />
    {copied ? 'Copied!' : 'Copy'}
    </motion.button>
    <motion.button
    onClick={handleExportTheme}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
    >
    <Download className="w-4 h-4" />
    Download
    </motion.button>
    </div>
    </div>
    </div>

    {/* Import Theme */}
    <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
    <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
    <Upload className="w-5 h-5 text-green-400" />
    <div>
    <p className="font-semibold text-white">Import Theme</p>
    <p className="text-sm text-slate-400">Load a theme from a JSON file</p>
    </div>
    </div>
    <label>
    <input
    type="file"
    accept=".json"
    onChange={handleImportTheme}
    className="hidden"
    />
    <motion.div
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm cursor-pointer"
    >
    <Upload className="w-4 h-4" />
    Choose File
    </motion.div>
    </label>
    </div>
    </div>

    {/* Theme Info */}
    <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
    <p className="font-semibold text-white mb-3">Theme Information</p>
    <div className="space-y-2 text-sm">
    <div className="flex justify-between text-slate-400">
    <span>Current Theme:</span>
    <span className="text-white font-medium capitalize">{currentTheme}</span>
    </div>
    <div className="flex justify-between text-slate-400">
    <span>Theme Mode:</span>
    <span className="text-white font-medium capitalize">{settings.mode}</span>
    </div>
    <div className="flex justify-between text-slate-400">
    <span>Last Modified:</span>
    <span className="text-white font-medium">Just now</span>
    </div>
    </div>
    </div>
    </div>
    </div>

    {/* Reset Warning */}
    <div className="p-4 bg-red-600/10 border border-red-500/30 rounded-lg">
    <p className="text-sm text-red-400 mb-4">
    Resetting to defaults will remove all customizations and restore the original theme.
    </p>
    <motion.button
    onClick={resetToDefault}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
    >
    <RotateCcw className="w-4 h-4" />
    Reset to Defaults
    </motion.button>
    </div>
  </div>
    </div>
  );
}
