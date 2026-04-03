'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original theme page

export function PreviewTab() {
  return (
    <div className="space-y-6">
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
    </div>
  );
}
