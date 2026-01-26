'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Wifi, 
  TrendingUp, 
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock
} from 'lucide-react';

// ==================== TYPES ====================

interface PerformanceMetrics {
  fps: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  } | null;
  network: {
    downlink: number;
    effectiveType: string;
    rtt: number;
    saveData: boolean;
  } | null;
  pageLoadTime: number;
  ttfb: number;
  fcp: number;
  lcp: number;
  cls: number;
  fid: number;
}

interface _MetricTrend {
  current: number;
  previous: number;
  trend: 'up' | 'down' | 'stable';
}

// ==================== PERFORMANCE HOOK ====================

export function usePerformanceMetrics(sampleInterval = 1000) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memory: null,
    network: null,
    pageLoadTime: 0,
    ttfb: 0,
    fcp: 0,
    lcp: 0,
    cls: 0,
    fid: 0,
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafRef = useRef<number | undefined>(undefined);

  // FPS calculation
  useEffect(() => {
    const measureFPS = () => {
      frameCountRef.current++;
      const currentTime = performance.now();
      
      if (currentTime - lastTimeRef.current >= sampleInterval) {
        const fps = Math.round(
          (frameCountRef.current * 1000) / (currentTime - lastTimeRef.current)
        );
        frameCountRef.current = 0;
        lastTimeRef.current = currentTime;
        
        setMetrics((prev) => ({ ...prev, fps }));
      }
      
      rafRef.current = requestAnimationFrame(measureFPS);
    };

    rafRef.current = requestAnimationFrame(measureFPS);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [sampleInterval]);

  // Memory measurement
  useEffect(() => {
    const measureMemory = () => {
      const memoryInfo = (performance as any)?.memory;
      if (memoryInfo) {
        setMetrics((prev) => ({
          ...prev,
          memory: {
            used: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024),
            total: Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024),
            percentage: Math.round(
              (memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100
            ),
          },
        }));
      }
    };

    measureMemory();
    const interval = setInterval(measureMemory, sampleInterval);

    return () => clearInterval(interval);
  }, [sampleInterval]);

  // Network info
  useEffect(() => {
    const updateNetworkInfo = () => {
      const connection = (navigator as any)?.connection;
      if (connection) {
        setMetrics((prev) => ({
          ...prev,
          network: {
            downlink: connection.downlink || 0,
            effectiveType: connection.effectiveType || 'unknown',
            rtt: connection.rtt || 0,
            saveData: connection.saveData || false,
          },
        }));
      }
    };

    updateNetworkInfo();
    (navigator as any)?.connection?.addEventListener('change', updateNetworkInfo);

    return () => {
      (navigator as any)?.connection?.removeEventListener('change', updateNetworkInfo);
    };
  }, []);

  // Web Vitals
  useEffect(() => {
    // Get navigation timing
    const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navTiming) {
      setMetrics((prev) => ({
        ...prev,
        pageLoadTime: Math.round(navTiming.loadEventEnd - navTiming.startTime),
        ttfb: Math.round(navTiming.responseStart - navTiming.requestStart),
      }));
    }

    // Observe paint entries
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          setMetrics((prev) => ({ ...prev, fcp: Math.round(entry.startTime) }));
        }
      }
    });

    try {
      paintObserver.observe({ entryTypes: ['paint'] });
    } catch {
      // Paint observer not supported
    }

    // LCP Observer
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        setMetrics((prev) => ({ ...prev, lcp: Math.round(lastEntry.startTime) }));
      }
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch {
      // LCP observer not supported
    }

    // CLS Observer
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShiftEntry = entry as any;
        if (!layoutShiftEntry.hadRecentInput) {
          clsValue += layoutShiftEntry.value;
          setMetrics((prev) => ({ ...prev, cls: Math.round(clsValue * 1000) / 1000 }));
        }
      }
    });

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch {
      // CLS observer not supported
    }

    // FID Observer
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const firstInputEntry = entry as any;
        const fid = firstInputEntry.processingStart - entry.startTime;
        setMetrics((prev) => ({ ...prev, fid: Math.round(fid) }));
      }
    });

    try {
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch {
      // FID observer not supported
    }

    return () => {
      paintObserver.disconnect();
      lcpObserver.disconnect();
      clsObserver.disconnect();
      fidObserver.disconnect();
    };
  }, []);

  return metrics;
}

// ==================== METRIC DISPLAY HELPERS ====================

function getMetricStatus(value: number, thresholds: { good: number; poor: number; reverse?: boolean }): 'good' | 'moderate' | 'poor' {
  if (thresholds.reverse) {
    if (value >= thresholds.good) return 'good';
    if (value >= thresholds.poor) return 'moderate';
    return 'poor';
  }
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'moderate';
  return 'poor';
}

function getStatusColor(status: 'good' | 'moderate' | 'poor'): string {
  switch (status) {
    case 'good':
      return 'text-green-400';
    case 'moderate':
      return 'text-yellow-400';
    case 'poor':
      return 'text-red-400';
  }
}

function _getTrendIcon(trend: 'up' | 'down' | 'stable') {
  switch (trend) {
    case 'up':
      return <TrendingUp className="w-3 h-3" />;
    case 'down':
      return <TrendingDown className="w-3 h-3" />;
    case 'stable':
      return <Minus className="w-3 h-3" />;
  }
}

// ==================== PERFORMANCE PANEL ====================

interface PerformancePanelProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  collapsed?: boolean;
  showInProduction?: boolean;
}

export function PerformancePanel({
  position = 'bottom-left',
  collapsed: initialCollapsed = true,
  showInProduction = false,
}: PerformancePanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const metrics = usePerformanceMetrics();

  // Don't show in production unless explicitly enabled
  if (process.env.NODE_ENV === 'production' && !showInProduction) {
    return null;
  }

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  const fpsStatus = getMetricStatus(metrics.fps, { good: 55, poor: 30, reverse: true });
  const memoryStatus = metrics.memory 
    ? getMetricStatus(metrics.memory.percentage, { good: 50, poor: 80 })
    : 'good';
  const fcpStatus = getMetricStatus(metrics.fcp, { good: 1800, poor: 3000 });
  const lcpStatus = getMetricStatus(metrics.lcp, { good: 2500, poor: 4000 });
  const clsStatus = getMetricStatus(metrics.cls, { good: 0.1, poor: 0.25 });
  const fidStatus = getMetricStatus(metrics.fid, { good: 100, poor: 300 });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`fixed ${positionClasses[position]} z-50`}
    >
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl overflow-hidden min-w-70">
        {/* Header */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-white">Performance</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-mono ${getStatusColor(fpsStatus)}`}>
              {metrics.fps} FPS
            </span>
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronUp className="w-4 h-4 text-zinc-500" />
            )}
          </div>
        </button>

        {/* Expanded Content */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-zinc-800"
            >
              <div className="p-4 space-y-4">
                {/* Runtime Metrics */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Runtime
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* FPS */}
                    <div className="bg-zinc-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Cpu className="w-3 h-3 text-zinc-500" />
                        <span className="text-xs text-zinc-400">FPS</span>
                      </div>
                      <p className={`text-lg font-mono font-bold ${getStatusColor(fpsStatus)}`}>
                        {metrics.fps}
                      </p>
                    </div>

                    {/* Memory */}
                    <div className="bg-zinc-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <HardDrive className="w-3 h-3 text-zinc-500" />
                        <span className="text-xs text-zinc-400">Memory</span>
                      </div>
                      {metrics.memory ? (
                        <p className={`text-lg font-mono font-bold ${getStatusColor(memoryStatus)}`}>
                          {metrics.memory.used}MB
                        </p>
                      ) : (
                        <p className="text-lg font-mono text-zinc-600">N/A</p>
                      )}
                    </div>
                  </div>

                  {/* Network */}
                  {metrics.network && (
                    <div className="bg-zinc-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Wifi className="w-3 h-3 text-zinc-500" />
                        <span className="text-xs text-zinc-400">Network</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-zinc-300">
                          {metrics.network.effectiveType.toUpperCase()}
                        </span>
                        <span className="text-zinc-500">
                          {metrics.network.downlink} Mbps
                        </span>
                        <span className="text-zinc-500">
                          {metrics.network.rtt}ms RTT
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Core Web Vitals */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-3 h-3" />
                    Core Web Vitals
                  </h4>

                  <div className="grid grid-cols-3 gap-2">
                    {/* LCP */}
                    <div className="text-center p-2 bg-zinc-800/50 rounded-lg">
                      <p className="text-xs text-zinc-500 mb-1">LCP</p>
                      <p className={`text-sm font-mono font-bold ${getStatusColor(lcpStatus)}`}>
                        {metrics.lcp ? `${(metrics.lcp / 1000).toFixed(1)}s` : '--'}
                      </p>
                    </div>

                    {/* FID */}
                    <div className="text-center p-2 bg-zinc-800/50 rounded-lg">
                      <p className="text-xs text-zinc-500 mb-1">FID</p>
                      <p className={`text-sm font-mono font-bold ${getStatusColor(fidStatus)}`}>
                        {metrics.fid ? `${metrics.fid}ms` : '--'}
                      </p>
                    </div>

                    {/* CLS */}
                    <div className="text-center p-2 bg-zinc-800/50 rounded-lg">
                      <p className="text-xs text-zinc-500 mb-1">CLS</p>
                      <p className={`text-sm font-mono font-bold ${getStatusColor(clsStatus)}`}>
                        {metrics.cls}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timing Metrics */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Timing
                  </h4>

                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">TTFB</span>
                      <span className="font-mono text-zinc-300">{metrics.ttfb}ms</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">FCP</span>
                      <span className={`font-mono ${getStatusColor(fcpStatus)}`}>
                        {metrics.fcp}ms
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Page Load</span>
                      <span className="font-mono text-zinc-300">{metrics.pageLoadTime}ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ==================== FPS COUNTER ====================

export function FPSCounter() {
  const metrics = usePerformanceMetrics();
  const status = getMetricStatus(metrics.fps, { good: 55, poor: 30, reverse: true });

  return (
    <div className={`font-mono text-xs ${getStatusColor(status)}`}>
      {metrics.fps} FPS
    </div>
  );
}

// ==================== MEMORY USAGE ====================

export function MemoryUsage() {
  const metrics = usePerformanceMetrics();

  if (!metrics.memory) return null;

  const status = getMetricStatus(metrics.memory.percentage, { good: 50, poor: 80 });

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${
            status === 'good' ? 'bg-green-500' :
            status === 'moderate' ? 'bg-yellow-500' :
            'bg-red-500'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${metrics.memory.percentage}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <span className={`text-xs font-mono ${getStatusColor(status)}`}>
        {metrics.memory.used}MB
      </span>
    </div>
  );
}

export default PerformancePanel;
