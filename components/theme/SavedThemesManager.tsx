'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeManager } from '@/hooks/useThemeManager';
import { Trash2, Download, Upload, Plus, Check } from 'lucide-react';

export function SavedThemesManager() {
  const {
    getSavedThemes,
    saveCurrentTheme,
    loadSavedTheme,
    deleteSavedTheme,
    exportTheme,
    importTheme,
  } = useThemeManager();

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [copiedThemeId, setCopiedThemeId] = useState<string | null>(null);
  const savedThemes = getSavedThemes();

  const handleSaveTheme = () => {
    if (saveName.trim()) {
      saveCurrentTheme(saveName.trim(), saveDescription.trim());
      setSaveName('');
      setSaveDescription('');
      setShowSaveDialog(false);
    }
  };

  const handleExport = () => {
    const json = exportTheme();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event: ProgressEvent<FileReader>) => {
          const json = event.target?.result as string;
          if (importTheme(json)) {
            alert('✅ Theme imported successfully!');
          } else {
            alert('❌ Invalid theme file');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleCopyTheme = (id: string) => {
    const theme = savedThemes.find((t) => t.id === id);
    if (theme) {
      navigator.clipboard.writeText(
        JSON.stringify(theme, null, 2)
      );
      setCopiedThemeId(id);
      setTimeout(() => setCopiedThemeId(null), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Saved Themes</h3>
        <div className="flex gap-2">
          <motion.button
            onClick={handleExport}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </motion.button>
          <motion.button
            onClick={handleImport}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm text-white transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </motion.button>
          <motion.button
            onClick={() => setShowSaveDialog(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            Save Current
          </motion.button>
        </div>
      </div>

      {/* Save Dialog */}
      <AnimatePresence>
        {showSaveDialog && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg bg-slate-800 border border-slate-700 space-y-3"
          >
            <input
              type="text"
              placeholder="Theme name (e.g., My Dark Blue)"
              value={saveName}
              onChange={(e) =>  setSaveName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={saveDescription}
              onChange={(e) =>  setSaveDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-2">
              <motion.button
                onClick={handleSaveTheme}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors"
              >
                Save
              </motion.button>
              <motion.button
                onClick={() => setShowSaveDialog(false)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Themes List */}
      <div className="space-y-2">
        {savedThemes.length === 0 ? (
          <div className="p-6 text-center rounded-lg bg-slate-800/50 border border-slate-700">
            <p className="text-slate-400 text-sm">
              No saved themes yet. Customize your theme and save it!
            </p>
          </div>
        ) : (
          savedThemes.map((theme) => (
            <motion.div
              key={theme.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-white truncate">
                    {theme.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {theme.description ||
                      `${theme.theme} • ${theme.colorDensity} density`}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    {new Date(theme.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <motion.button
                    onClick={() => loadSavedTheme(theme.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs text-white transition-colors"
                  >
                    Load
                  </motion.button>
                  <motion.button
                    onClick={() => handleCopyTheme(theme.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      copiedThemeId === theme.id
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {copiedThemeId === theme.id ? (
                      <>
                        <Check className="w-3 h-3 inline mr-1" />
                        Copied
                      </>
                    ) : (
                      'Copy'
                    )}
                  </motion.button>
                  <motion.button
                    onClick={() => deleteSavedTheme(theme.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-2 py-1 bg-red-600/20 hover:bg-red-600/30 rounded text-xs text-red-300 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
