'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Eye, Sun, Type, Zap, Volume2 } from 'lucide-react';
import { safeLocalStorage } from '@/lib/utils';

// ==================== TYPES ====================

export interface AccessibilitySettings {
  // Motion & Animation
  reduceMotion: boolean;
  
  // Visual
  highContrast: boolean;
  fontSize: 'normal' | 'large' | 'extra-large';
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  
  // Focus
  focusIndicator: 'default' | 'high-visibility';
  
  // Audio
  soundEffects: boolean;
  
  // Reading
  dyslexicFont: boolean;
  lineSpacing: 'normal' | 'relaxed' | 'loose';
  
  // Interaction
  largeClickTargets: boolean;
  keyboardOnly: boolean;
}

interface AccessibilityContextValue {
  settings: AccessibilitySettings;
  updateSettings: (updates: Partial<AccessibilitySettings>) => void;
  resetSettings: () => void;
  announceMessage: (message: string, priority?: 'polite' | 'assertive') => void;
}

const defaultSettings: AccessibilitySettings = {
  reduceMotion: false,
  highContrast: false,
  fontSize: 'normal',
  colorBlindMode: 'none',
  focusIndicator: 'default',
  soundEffects: true,
  dyslexicFont: false,
  lineSpacing: 'normal',
  largeClickTargets: false,
  keyboardOnly: false,
};

// ==================== CONTEXT ====================

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}

// ==================== PROVIDER ====================

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const systemReducedMotion = useReducedMotion();
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const announceRef = useRef<HTMLDivElement>(null);

  // Load settings from storage
  useEffect(() => {
    const saved = safeLocalStorage.getItem('vfide_accessibility');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings((prev) => ({ ...prev, ...parsed }));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Sync with system preference for reduced motion
  useEffect(() => {
    if (systemReducedMotion) {
      setSettings((prev) => ({ ...prev, reduceMotion: true }));
    }
  }, [systemReducedMotion]);

  // Apply settings to document
  useEffect(() => {
    const root = document.documentElement;

    // Font size
    const fontSizeMap = {
      normal: '16px',
      large: '18px',
      'extra-large': '20px',
    };
    root.style.setProperty('--base-font-size', fontSizeMap[settings.fontSize]);
    root.classList.toggle('text-lg', settings.fontSize === 'large');
    root.classList.toggle('text-xl', settings.fontSize === 'extra-large');

    // High contrast
    root.classList.toggle('high-contrast', settings.highContrast);

    // Color blind mode
    root.setAttribute('data-color-blind-mode', settings.colorBlindMode);

    // Focus indicator
    root.classList.toggle('high-visibility-focus', settings.focusIndicator === 'high-visibility');

    // Dyslexic font
    root.classList.toggle('dyslexic-font', settings.dyslexicFont);

    // Line spacing
    const lineSpacingMap = {
      normal: '1.5',
      relaxed: '1.75',
      loose: '2',
    };
    root.style.setProperty('--line-spacing', lineSpacingMap[settings.lineSpacing]);

    // Large click targets
    root.classList.toggle('large-targets', settings.largeClickTargets);

    // Reduce motion
    root.classList.toggle('reduce-motion', settings.reduceMotion);

    // Save to storage
    safeLocalStorage.setItem('vfide_accessibility', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<AccessibilitySettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    safeLocalStorage.removeItem('vfide_accessibility');
  }, []);

  const announceMessage = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announceRef.current) {
      announceRef.current.setAttribute('aria-live', priority);
      announceRef.current.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        if (announceRef.current) {
          announceRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{ settings, updateSettings, resetSettings, announceMessage }}
    >
      {children}
      {/* Screen reader announcer */}
      <div
        ref={announceRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      />
      {/* Global accessibility styles */}
      <style jsx global>{`
        /* High Contrast Mode */
        .high-contrast {
          --bg-primary: #000000;
          --bg-secondary: #1a1a1a;
          --text-primary: #ffffff;
          --text-secondary: #e5e5e5;
          --border-color: #ffffff;
          --accent-color: #00ffff;
        }

        .high-contrast * {
          border-color: currentColor !important;
        }

        /* High Visibility Focus */
        .high-visibility-focus *:focus-visible {
          outline: 4px solid #00ffff !important;
          outline-offset: 4px !important;
        }

        /* Dyslexic Font */
        .dyslexic-font {
          font-family: 'OpenDyslexic', 'Comic Sans MS', cursive, sans-serif;
        }

        /* Large Click Targets */
        .large-targets button,
        .large-targets a,
        .large-targets input,
        .large-targets [role="button"],
        .large-targets [role="link"] {
          min-height: 48px;
          min-width: 48px;
        }

        /* Reduce Motion */
        .reduce-motion *,
        .reduce-motion *::before,
        .reduce-motion *::after {
          animation-duration: 0.001ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.001ms !important;
        }

        /* Color Blind Modes */
        [data-color-blind-mode="protanopia"] {
          filter: url('#protanopia');
        }

        [data-color-blind-mode="deuteranopia"] {
          filter: url('#deuteranopia');
        }

        [data-color-blind-mode="tritanopia"] {
          filter: url('#tritanopia');
        }
      `}</style>

      {/* SVG filters for color blind modes */}
      <svg className="hidden" aria-hidden="true">
        <defs>
          <filter id="protanopia">
            <feColorMatrix
              type="matrix"
              values="0.567, 0.433, 0, 0, 0
                      0.558, 0.442, 0, 0, 0
                      0, 0.242, 0.758, 0, 0
                      0, 0, 0, 1, 0"
            />
          </filter>
          <filter id="deuteranopia">
            <feColorMatrix
              type="matrix"
              values="0.625, 0.375, 0, 0, 0
                      0.7, 0.3, 0, 0, 0
                      0, 0.3, 0.7, 0, 0
                      0, 0, 0, 1, 0"
            />
          </filter>
          <filter id="tritanopia">
            <feColorMatrix
              type="matrix"
              values="0.95, 0.05, 0, 0, 0
                      0, 0.433, 0.567, 0, 0
                      0, 0.475, 0.525, 0, 0
                      0, 0, 0, 1, 0"
            />
          </filter>
        </defs>
      </svg>
    </AccessibilityContext.Provider>
  );
}

// ==================== SETTINGS PANEL ====================

interface AccessibilityPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccessibilityPanel({ isOpen, onClose }: AccessibilityPanelProps) {
  const { settings, updateSettings, resetSettings } = useAccessibility();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-zinc-900 border-l border-zinc-800 z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-800 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-bold text-white">Accessibility</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={resetSettings}
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                  aria-label="Close accessibility panel"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-4 space-y-6">
              {/* Motion & Animation */}
              <section>
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Motion & Animation
                </h3>

                <SettingToggle
                  label="Reduce Motion"
                  description="Minimize animations and transitions"
                  checked={settings.reduceMotion}
                  onChange={(v) => updateSettings({ reduceMotion: v })}
                />
              </section>

              {/* Visual */}
              <section>
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Sun className="w-4 h-4" />
                  Visual
                </h3>

                <SettingToggle
                  label="High Contrast"
                  description="Increase contrast for better visibility"
                  checked={settings.highContrast}
                  onChange={(v) => updateSettings({ highContrast: v })}
                />

                <SettingSelect
                  label="Font Size"
                  value={settings.fontSize}
                  onChange={(v) => updateSettings({ fontSize: v as AccessibilitySettings['fontSize'] })}
                  options={[
                    { value: 'normal', label: 'Normal' },
                    { value: 'large', label: 'Large' },
                    { value: 'extra-large', label: 'Extra Large' },
                  ]}
                />

                <SettingSelect
                  label="Color Blind Mode"
                  value={settings.colorBlindMode}
                  onChange={(v) => updateSettings({ colorBlindMode: v as AccessibilitySettings['colorBlindMode'] })}
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'protanopia', label: 'Protanopia (Red-Blind)' },
                    { value: 'deuteranopia', label: 'Deuteranopia (Green-Blind)' },
                    { value: 'tritanopia', label: 'Tritanopia (Blue-Blind)' },
                  ]}
                />

                <SettingSelect
                  label="Focus Indicator"
                  value={settings.focusIndicator}
                  onChange={(v) => updateSettings({ focusIndicator: v as AccessibilitySettings['focusIndicator'] })}
                  options={[
                    { value: 'default', label: 'Default' },
                    { value: 'high-visibility', label: 'High Visibility' },
                  ]}
                />
              </section>

              {/* Reading */}
              <section>
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Reading
                </h3>

                <SettingToggle
                  label="Dyslexic-Friendly Font"
                  description="Use a font designed for easier reading"
                  checked={settings.dyslexicFont}
                  onChange={(v) => updateSettings({ dyslexicFont: v })}
                />

                <SettingSelect
                  label="Line Spacing"
                  value={settings.lineSpacing}
                  onChange={(v) => updateSettings({ lineSpacing: v as AccessibilitySettings['lineSpacing'] })}
                  options={[
                    { value: 'normal', label: 'Normal' },
                    { value: 'relaxed', label: 'Relaxed' },
                    { value: 'loose', label: 'Loose' },
                  ]}
                />
              </section>

              {/* Audio */}
              <section>
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Audio
                </h3>

                <SettingToggle
                  label="Sound Effects"
                  description="Play audio feedback for actions"
                  checked={settings.soundEffects}
                  onChange={(v) => updateSettings({ soundEffects: v })}
                />
              </section>

              {/* Interaction */}
              <section>
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Interaction
                </h3>

                <SettingToggle
                  label="Large Click Targets"
                  description="Increase the size of interactive elements"
                  checked={settings.largeClickTargets}
                  onChange={(v) => updateSettings({ largeClickTargets: v })}
                />

                <SettingToggle
                  label="Keyboard-Only Mode"
                  description="Optimize the interface for keyboard navigation"
                  checked={settings.keyboardOnly}
                  onChange={(v) => updateSettings({ keyboardOnly: v })}
                />
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ==================== SETTING COMPONENTS ====================

interface SettingToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function SettingToggle({ label, description, checked, onChange }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800/50 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        {description && (
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative w-12 h-6 rounded-full transition-colors
          ${checked ? 'bg-cyan-500' : 'bg-zinc-700'}
        `}
      >
        <motion.div
          className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
          animate={{ x: checked ? 24 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}

interface SettingSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

function SettingSelect({ label, value, onChange, options }: SettingSelectProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800/50 last:border-0">
      <p className="text-sm font-medium text-white">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ==================== SKIP LINKS ====================

export function SkipLinks() {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <a
        href="#main-content"
        className="fixed top-4 left-4 z-100 bg-cyan-500 text-black px-4 py-2 rounded-lg font-semibold focus:outline-none focus:ring-4 focus:ring-cyan-500/50"
      >
        Skip to main content
      </a>
      <a
        href="#main-navigation"
        className="fixed top-4 left-48 z-100 bg-cyan-500 text-black px-4 py-2 rounded-lg font-semibold focus:outline-none focus:ring-4 focus:ring-cyan-500/50"
      >
        Skip to navigation
      </a>
    </div>
  );
}

// ==================== ACCESSIBLE ICON BUTTON ====================

interface AccessibleIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function AccessibleIconButton({ label, icon, size = 'md', className = '', ...props }: AccessibleIconButtonProps) {
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  return (
    <button
      aria-label={label}
      title={label}
      className={`
        ${sizeClasses[size]}
        rounded-lg hover:bg-zinc-800 transition-colors
        focus:outline-none focus:ring-2 focus:ring-cyan-500/50
        ${className}
      `}
      {...props}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </button>
  );
}

// ==================== LIVE REGION ====================

interface LiveRegionProps {
  message: string;
  priority?: 'polite' | 'assertive';
}

export function LiveRegion({ message, priority = 'polite' }: LiveRegionProps) {
  return (
    <div
      className="sr-only"
      aria-live={priority}
      aria-atomic="true"
      role={priority === 'assertive' ? 'alert' : 'status'}
    >
      {message}
    </div>
  );
}

export default AccessibilityProvider;
