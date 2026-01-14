'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useThemeManager } from '@/hooks/useThemeManager';
import { ThemeSelector } from '@/components/theme/ThemeSelector';
import { ThemeCustomizer } from '@/components/theme/ThemeCustomizer';
import { SavedThemesManager } from '@/components/theme/SavedThemesManager';
import { Palette, RotateCcw, Eye } from 'lucide-react';

export default function ThemeManagerPage() {
  const { resetToDefault, isDirty, isSaved: _isSaved, exportAsCSS: _exportAsCSS } = useThemeManager();
  const [activeTab, setActiveTab] = useState<'presets' | 'customize' | 'saved'>(
    'presets'
  );
  const [showPreview, setShowPreview] = useState(false);

  const tabs = [
    { id: 'presets' as const, label: '🎨 Presets', icon: Palette },
    { id: 'customize' as const, label: '⚙️ Customize', icon: Palette },
    { id: 'saved' as const, label: '💾 Saved', icon: Palette },
  ];

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <Palette className="w-10 h-10 text-purple-400" />
                Theme Manager
              </h1>
              <p className="text-slate-400">
                Customize your interface with themes, colors, and accessibility options
              </p>
            </div>

            <div className="flex gap-2">
              <motion.button
                onClick={() => setShowPreview(!showPreview)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
              >
                <Eye className="w-4 h-4" />
                Preview
              </motion.button>
              <motion.button
                onClick={resetToDefault}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </motion.button>
            </div>
          </motion.div>

          {/* Status Bar */}
          <div className="mt-6 flex items-center gap-4">
            <span
              className={`text-xs px-3 py-1 rounded-full font-medium ${
                isDirty
                  ? 'bg-yellow-600/20 text-yellow-300'
                  : 'bg-green-600/20 text-green-300'
              }`}
            >
              {isDirty ? '✏️ Unsaved Changes' : '✅ All Saved'}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
            {tabs.map(({ id, label }) => (
              <motion.button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  activeTab === id
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          {activeTab === 'presets' && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <ThemeSelector />
            </div>
          )}

          {activeTab === 'customize' && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <ThemeCustomizer />
            </div>
          )}

          {activeTab === 'saved' && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <SavedThemesManager />
            </div>
          )}
        </motion.div>

        {/* Preview Section */}
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 bg-slate-900/50 border border-slate-800 rounded-lg p-8"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Theme Preview</h2>

            {/* Color Palette Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
              {/* Primary Colors */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Primary Palette</h3>
                <div className="space-y-2">
                  {['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'].map(
                    (shade) => (
                      <div
                        key={shade}
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-800"
                      >
                        <div
                          className="w-12 h-12 rounded-lg border border-slate-600"
                          style={{
                            backgroundColor: `var(--color-primary-${shade}, #0ea5e9)`,
                          }}
                        />
                        <span className="text-sm text-slate-300">
                          primary-{shade}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Semantic Colors */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Semantic Colors</h3>
                <div className="space-y-2">
                  {[
                    { name: 'Success', var: '--color-success-500' },
                    { name: 'Warning', var: '--color-warning-500' },
                    { name: 'Error', var: '--color-error-500' },
                    { name: 'Info', var: '--color-info-500' },
                    { name: 'Secondary', var: '--color-secondary-500' },
                    { name: 'Accent', var: '--color-accent-500' },
                  ].map(({ name, var: cssVar }) => (
                    <div
                      key={name}
                      className="flex items-center gap-3 p-3 rounded-lg bg-slate-800"
                    >
                      <div
                        className="w-12 h-12 rounded-lg border border-slate-600"
                        style={{ backgroundColor: `var(${cssVar})` }}
                      />
                      <span className="text-sm text-slate-300">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Component Previews */}
            <div className="mt-8 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Button Variants</h3>
                <div className="flex gap-2 flex-wrap">
                  <button className="px-4 py-2 bg-[var(--color-primary-500)] text-white rounded-lg font-medium">
                    Primary
                  </button>
                  <button className="px-4 py-2 bg-[var(--color-secondary-500)] text-white rounded-lg font-medium">
                    Secondary
                  </button>
                  <button className="px-4 py-2 bg-[var(--color-success-500)] text-white rounded-lg font-medium">
                    Success
                  </button>
                  <button className="px-4 py-2 bg-[var(--color-warning-500)] text-white rounded-lg font-medium">
                    Warning
                  </button>
                  <button className="px-4 py-2 bg-[var(--color-error-500)] text-white rounded-lg font-medium">
                    Error
                  </button>
                </div>
              </div>

              {/* Cards Preview */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Card Styles</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-[var(--color-primary-50)] border-l-4 border-[var(--color-primary-500)] rounded-lg">
                    <p className="text-sm text-slate-800 font-medium">Primary Card</p>
                    <p className="text-xs text-slate-600 mt-1">With primary accent</p>
                  </div>
                  <div className="p-4 bg-[var(--color-success-50)] border-l-4 border-[var(--color-success-500)] rounded-lg">
                    <p className="text-sm text-slate-800 font-medium">Success Card</p>
                    <p className="text-xs text-slate-600 mt-1">With success accent</p>
                  </div>
                  <div className="p-4 bg-[var(--color-error-50)] border-l-4 border-[var(--color-error-500)] rounded-lg">
                    <p className="text-sm text-slate-800 font-medium">Error Card</p>
                    <p className="text-xs text-slate-600 mt-1">With error accent</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
