'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { Shield, Search, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import { useThreatDetection } from '@/hooks/useThreatDetection';
import { ThreatLevel, formatThreatType } from '@/config/security-advanced';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';

interface ThreatDetectionPanelProps {
  className?: string;
}

const getThreatLevelColor = (level: ThreatLevel): string => {
  switch (level) {
    case 'critical':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-500';
    case 'high':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-500';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-500';
    case 'low':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-500';
    default:
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-500';
  }
};

const getRiskScoreColor = (score: number): string => {
  if (score >= 90) return 'text-red-600 dark:text-red-400';
  if (score >= 70) return 'text-orange-600 dark:text-orange-400';
  if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
  if (score >= 20) return 'text-blue-600 dark:text-blue-400';
  return 'text-green-600 dark:text-green-400';
};

export function ThreatDetectionPanel({ className = '' }: ThreatDetectionPanelProps) {
  const threat = useThreatDetection();
  const { playSuccess, playNotification, playError } = useTransactionSounds();
  const [isScanning, setIsScanning] = useState(false);

  // Animated risk score
  const AnimatedRiskScore = ({ score }: { score: number }) => {
    const motionValue = useMotionValue(0);
    const rounded = useTransform(motionValue, (v) => Math.round(v));
    
    useEffect(() => {
      const controls = animate(motionValue, score, { duration: 1.5 });
      return controls.stop;
    }, [score, motionValue]);
    
    return <motion.span>{rounded}</motion.span>;
  };

  useEffect(() => {
    // Run anomaly detection on mount
    threat.detectAnomalies();
  }, [threat]);

  const handleScan = async () => {
    setIsScanning(true);
    playNotification();
    await threat.detectAnomalies();
    setIsScanning(false);
    if (threat.activeThreats.length === 0) {
      playSuccess();
    } else {
      playError();
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Threat Level Overview */}
      <motion.div 
        className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-500" />
            Threat Detection
          </h2>
          <motion.button
            onClick={handleScan}
            disabled={isScanning}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 disabled:opacity-50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isScanning ? (
              <motion.div
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <Search className="w-5 h-5" />
            )}
            {isScanning ? 'Scanning...' : 'Scan Now'}
          </motion.button>
        </div>

        {/* Risk Score */}
        <div className="text-center mb-6">
          <motion.div 
            className="inline-flex flex-col items-center p-6 bg-gray-50 dark:bg-gray-900 rounded-xl"
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Risk Score</div>
            <div className={`text-6xl font-bold ${getRiskScoreColor(threat.riskScore)}`}>
              <AnimatedRiskScore score={threat.riskScore} />
            </div>
            <div className="text-sm text-gray-500 mt-1">out of 100</div>
            <motion.div 
              className={`mt-3 px-4 py-2 rounded-full border-2 font-semibold ${getThreatLevelColor(threat.threatLevel)}`}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              key={threat.threatLevel}
            >
              {threat.threatLevel.toUpperCase()}
            </motion.div>
          </motion.div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Threats', value: threat.metrics.threatsDetected },
            { label: 'Active', value: threat.activeThreats.length, isRed: true },
            { label: 'Failed Logins', value: threat.metrics.failedLoginAttempts },
            { label: 'Active Sessions', value: threat.metrics.activeSessions }
          ].map((item, index) => (
            <motion.div 
              key={item.label}
              className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              <div className={`text-2xl font-bold ${item.isRed ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                {item.value}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{item.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Recommendations */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">💡 Security Recommendations</h3>
          <ul className="space-y-2">
            {threat.getRecommendations().map((rec, i) => (
              <li key={i} className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
                <span>•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* Active Threats */}
      <AnimatePresence>
      {threat.activeThreats.length > 0 && (
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Active Threats ({threat.activeThreats.length})
          </h3>
          <div className="space-y-3">
            {threat.activeThreats.map((t, index) => (
              <motion.div
                key={t.id}
                className={`p-4 rounded-lg border-2 ${getThreatLevelColor(t.severity)}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{formatThreatType(t.type)}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${getThreatLevelColor(t.severity)}`}>
                        {t.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm mb-2">{t.message}</p>
                    <div className="text-xs opacity-75">
                      Detected: {t.detected.toLocaleString()}
                    </div>
                    {Object.keys(t.details).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer hover:underline">View Details</summary>
                        <pre className="mt-2 p-2 bg-black/10 rounded text-xs overflow-x-auto">
                          {JSON.stringify(t.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => {
                        threat.resolveThread(t.id);
                        playSuccess();
                      }}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                      title="Mark as resolved"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        threat.dismissThreat(t.id);
                        playNotification();
                      }}
                      className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                      title="Dismiss"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Threat History */}
      {threat.threats.length > threat.activeThreats.length && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            📜 Resolved Threats
          </h3>
          <div className="space-y-2">
            {threat.threats.filter(t => t.resolved).slice(0, 5).map((t) => (
              <div key={t.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg opacity-60">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{formatThreatType(t.type)}</span>
                    <span className="text-sm text-gray-500 ml-2">✓ Resolved</span>
                  </div>
                  <div className="text-xs text-gray-500">{t.detected.toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Threats */}
      <AnimatePresence>
      {threat.threats.length === 0 && (
        <motion.div 
          className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-12 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <motion.div 
            className="text-6xl mb-4"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🛡️
          </motion.div>
          <h3 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">
            All Clear!
          </h3>
          <p className="text-green-800 dark:text-green-200">
            No security threats detected. Your account is secure.
          </p>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};
