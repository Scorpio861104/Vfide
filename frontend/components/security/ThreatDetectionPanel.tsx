import React, { useEffect } from 'react';
import { useThreatDetection } from '@/hooks/useThreatDetection';
import { ThreatLevel, formatThreatType } from '@/config/security-advanced';

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

export const ThreatDetectionPanel: React.FC<ThreatDetectionPanelProps> = ({ className = '' }) => {
  const threat = useThreatDetection();

  useEffect(() => {
    // Run anomaly detection on mount
    threat.detectAnomalies();
  }, []);

  const handleScan = async () => {
    await threat.detectAnomalies();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Threat Level Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Threat Detection</h2>
          <button
            onClick={handleScan}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            🔍 Scan Now
          </button>
        </div>

        {/* Risk Score */}
        <div className="text-center mb-6">
          <div className="inline-flex flex-col items-center p-6 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Risk Score</div>
            <div className={`text-6xl font-bold ${getRiskScoreColor(threat.riskScore)}`}>
              {threat.riskScore}
            </div>
            <div className="text-sm text-gray-500 mt-1">out of 100</div>
            <div className={`mt-3 px-4 py-2 rounded-full border-2 font-semibold ${getThreatLevelColor(threat.threatLevel)}`}>
              {threat.threatLevel.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {threat.metrics.threatsDetected}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Threats</div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {threat.activeThreats.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {threat.metrics.failedLoginAttempts}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Failed Logins</div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {threat.metrics.activeSessions}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Active Sessions</div>
          </div>
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
      </div>

      {/* Active Threats */}
      {threat.activeThreats.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            🚨 Active Threats ({threat.activeThreats.length})
          </h3>
          <div className="space-y-3">
            {threat.activeThreats.map((t) => (
              <div
                key={t.id}
                className={`p-4 rounded-lg border-2 ${getThreatLevelColor(t.severity)}`}
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
                    <button
                      onClick={() => threat.resolveThread(t.id)}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      title="Mark as resolved"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => threat.dismissThreat(t.id)}
                      className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
      {threat.threats.length === 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">🛡️</div>
          <h3 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">
            All Clear!
          </h3>
          <p className="text-green-800 dark:text-green-200">
            No security threats detected. Your account is secure.
          </p>
        </div>
      )}
    </div>
  );
};
