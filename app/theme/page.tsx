'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useThemeManager } from '@/hooks/useThemeManager';
import { ThemeCustomizer } from '@/components/theme/ThemeCustomizer';
import { ThemeName, THEME_PRESETS, ThemeMode } from '@/config/theme-manager';
import { useCopyToClipboard } from '@/lib/hooks/useCopyToClipboard';
import {
  Palette,
  Moon,
  Sun,
  Monitor,
  Download,
  Upload,
  RotateCcw,
  Copy,
  Settings,
  Star,
  Eye,
} from 'lucide-react';

export default function ThemeManagementPage() {
  const { settings, currentTheme, setTheme, setMode, exportTheme, importTheme, resetToDefault } =
    useThemeManager();

  const [activeTab, setActiveTab] = useState<'presets' | 'customizer' | 'preview' | 'advanced'>('presets');
  const { copied, copy } = useCopyToClipboard();

  const isDarkMode = settings.mode === ThemeMode.DARK;

  // Get current theme preset info
  const themeInfo = useMemo(() => {
    const preset = THEME_PRESETS[currentTheme];
    return {
      name: preset?.name || 'Default',
      description: preset?.description || 'No description',
      palette: preset?.palette || {},
    };
  }, [currentTheme]);

  // Tabs configuration
  const tabs = [
    { id: 'presets' as const, label: 'Presets', icon: Palette, description: 'Choose from ready-made themes' },
    { id: 'customizer' as const, label: 'Customizer', icon: Settings, description: 'Create your own theme' },
    { id: 'preview' as const, label: 'Preview', icon: Eye, description: 'See theme in action' },
    { id: 'advanced' as const, label: 'Advanced', icon: Star, description: 'Export, import, and manage' },
  ];

  const handleExportTheme = () => {
    const json = exportTheme();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme-${currentTheme}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        importTheme(content);
      } catch (error) {
        console.error('Failed to import theme:', error);
      }
    };
    reader.readAsText(file);
  };

  const handleCopyTheme = () => {
    const json = exportTheme();
    copy(json);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800">
        <div className="container mx-auto px-4 py-8">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                  <Palette className="w-10 h-10 text-purple-400" />
                  Theme Management
                </h1>
                <p className="text-slate-400">
                  Customize your experience with colors, modes, and presets
                </p>
              </div>

              <div className="flex items-center gap-2">
                <motion.button
                  onClick={() => setMode(isDarkMode ? ThemeMode.LIGHT : ThemeMode.DARK)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors"
                  title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                >
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </motion.button>

                <motion.button
                  onClick={resetToDefault}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </motion.button>
              </div>
            </div>

            {/* Current Theme Display */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 p-6 bg-linear-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Current Theme</p>
                  <p className="text-2xl font-bold text-white capitalize">{currentTheme}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Mode</p>
                  <div className="flex items-center gap-2 text-white font-medium">
                    {isDarkMode ? (
                      <>
                        <Moon className="w-4 h-4 text-purple-400" />
                        Dark
                      </>
                    ) : (
                      <>
                        <Sun className="w-4 h-4 text-yellow-400" />
                        Light
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Description</p>
                  <p className="text-white text-sm">{themeInfo.description}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-20 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
            {tabs.map(({ id, label, icon: Icon }) => (
              <motion.button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  activeTab === id
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="w-4 h-4" />
                {label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="container mx-auto px-4 py-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          {/* Presets Tab */}
          {activeTab === 'presets' && (
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
          )}

          {/* Customizer Tab */}
          {activeTab === 'customizer' && <ThemeCustomizer />}

          {/* Preview Tab */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Theme Preview</h2>

                {/* Typography Preview */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-slate-400 mb-4 uppercase">Typography</h3>
                  <div className="space-y-3">
                    <p className="text-3xl font-bold text-white">Heading Level 1</p>
                    <p className="text-2xl font-bold text-white">Heading Level 2</p>
                    <p className="text-lg font-semibold text-white">Heading Level 3</p>
                    <p className="text-base text-slate-300">Body text - regular paragraph</p>
                    <p className="text-sm text-slate-400">Small text - supporting information</p>
                  </div>
                </div>

                {/* Color Palette Preview */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-slate-400 mb-4 uppercase">Color Palette</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(themeInfo.palette).slice(0, 8).map(([name, color]) => (
                      <div key={name} className="space-y-2">
                        <div
                          className="h-24 rounded-lg border border-slate-700"
                          style={{ backgroundColor: color as string }}
                        />
                        <p className="text-xs font-medium text-slate-400 capitalize">{name}</p>
                        <p className="text-xs text-slate-500">{color}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Components Preview */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-slate-400 mb-4 uppercase">Components</h3>
                  <div className="space-y-4">
                    <button className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors">
                      Primary Button
                    </button>
                    <button className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors">
                      Secondary Button
                    </button>
                    <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg text-white">
                      <p className="font-semibold mb-1">Card Component</p>
                      <p className="text-sm text-slate-400">This is a preview of a card with the current theme</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
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
          )}
        </motion.div>
      </div>
    </div>
  );
}
