import { useCallback, useEffect, useState } from 'react';
import { log } from '@/lib/logging';
import {
  SecurityLogEntry,
  SecurityEventType,
  SECURITY_STORAGE_KEYS,
  formatSecurityEventType,
  generateDeviceFingerprint
} from '@/config/security-advanced';

export interface UseSecurityLogsResult {
  logs: SecurityLogEntry[];
  filteredLogs: SecurityLogEntry[];
  
  // Logging
  log: (type: SecurityEventType, message: string, details?: Record<string, any>) => void;
  logSuccess: (type: SecurityEventType, message: string, details?: Record<string, any>) => void;
  logWarning: (type: SecurityEventType, message: string, details?: Record<string, any>) => void;
  logCritical: (type: SecurityEventType, message: string, details?: Record<string, any>) => void;
  
  // Filtering
  filterByType: (type: SecurityEventType | null) => void;
  filterBySeverity: (severity: 'info' | 'warning' | 'critical' | null) => void;
  filterByDateRange: (start: Date, end: Date) => void;
  search: (query: string) => void;
  clearFilters: () => void;
  
  // Management
  exportLogs: (format?: 'json' | 'csv') => string;
  clearLogs: () => void;
  getLogCount: (severity?: 'info' | 'warning' | 'critical') => number;
}

const MAX_LOGS = 1000; // Keep only last 1000 logs

const loadLogs = (): SecurityLogEntry[] => {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(SECURITY_STORAGE_KEYS.logs);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return parsed.map((log: { id: string; type: string; action: string; timestamp: string; details?: Record<string, unknown> }) => ({
      ...log,
      timestamp: new Date(log.timestamp)
    }));
  } catch (error) {
    log.error('Failed to load security logs', error);
    return [];
  }
};

const saveLogs = (logs: SecurityLogEntry[]): void => {
  if (typeof window === 'undefined') return;
  // Keep only the most recent logs
  const toSave = logs.slice(-MAX_LOGS);
  localStorage.setItem(SECURITY_STORAGE_KEYS.logs, JSON.stringify(toSave));
};

const generateLogId = (): string => {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const getClientInfo = () => {
  if (typeof window === 'undefined') {
    return {
      userAgent: 'server',
      ipAddress: 'unknown',
      location: 'unknown',
      deviceId: 'server'
    };
  }

  const device = generateDeviceFingerprint();
  
  return {
    userAgent: navigator.userAgent,
    ipAddress: 'client', // In production, get from backend
    location: Intl.DateTimeFormat().resolvedOptions().timeZone,
    deviceId: device.id
  };
};

export const useSecurityLogs = (): UseSecurityLogsResult => {
  const [logs, setLogs] = useState<SecurityLogEntry[]>(loadLogs());
  const [filteredLogs, setFilteredLogs] = useState<SecurityLogEntry[]>([]);
  const [filters, setFilters] = useState<{
    type: SecurityEventType | null;
    severity: 'info' | 'warning' | 'critical' | null;
    dateRange: { start: Date; end: Date } | null;
    searchQuery: string;
  }>({
    type: null,
    severity: null,
    dateRange: null,
    searchQuery: ''
  });

  useEffect(() => {
    const loaded = loadLogs();
    setLogs(loaded);
    setFilteredLogs(loaded);
  }, []);

  // Apply filters whenever logs or filters change
  useEffect(() => {
    let filtered = [...logs];

    if (filters.type) {
      filtered = filtered.filter(log => log.type === filters.type);
    }

    if (filters.severity) {
      filtered = filtered.filter(log => log.severity === filters.severity);
    }

    if (filters.dateRange) {
      filtered = filtered.filter(log =>
        log.timestamp >= filters.dateRange!.start &&
        log.timestamp <= filters.dateRange!.end
      );
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(query) ||
        log.type.toLowerCase().includes(query) ||
        JSON.stringify(log.details).toLowerCase().includes(query)
      );
    }

    setFilteredLogs(filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
  }, [logs, filters]);

  const addLog = useCallback((
    type: SecurityEventType,
    message: string,
    severity: 'info' | 'warning' | 'critical',
    details: Record<string, any> = {}
  ) => {
    const clientInfo = getClientInfo();
    
    const newLog: SecurityLogEntry = {
      id: generateLogId(),
      timestamp: new Date(),
      type,
      severity,
      message,
      details,
      ...clientInfo
    };

    setLogs(prev => {
      const updated = [...prev, newLog];
      saveLogs(updated);
      return updated;
    });
  }, []);

  const log = useCallback((type: SecurityEventType, message: string, details?: Record<string, any>) => {
    addLog(type, message, 'info', details);
  }, [addLog]);

  const logSuccess = useCallback((type: SecurityEventType, message: string, details?: Record<string, any>) => {
    addLog(type, message, 'info', details);
  }, [addLog]);

  const logWarning = useCallback((type: SecurityEventType, message: string, details?: Record<string, any>) => {
    addLog(type, message, 'warning', details);
  }, [addLog]);

  const logCritical = useCallback((type: SecurityEventType, message: string, details?: Record<string, any>) => {
    addLog(type, message, 'critical', details);
  }, [addLog]);

  const filterByType = useCallback((type: SecurityEventType | null) => {
    setFilters(prev => ({ ...prev, type }));
  }, []);

  const filterBySeverity = useCallback((severity: 'info' | 'warning' | 'critical' | null) => {
    setFilters(prev => ({ ...prev, severity }));
  }, []);

  const filterByDateRange = useCallback((start: Date, end: Date) => {
    setFilters(prev => ({ ...prev, dateRange: { start, end } }));
  }, []);

  const search = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      type: null,
      severity: null,
      dateRange: null,
      searchQuery: ''
    });
  }, []);

  const exportLogs = useCallback((format: 'json' | 'csv' = 'json'): string => {
    if (format === 'csv') {
      const headers = ['Timestamp', 'Type', 'Severity', 'Message', 'Details', 'IP', 'Device'];
      const rows = filteredLogs.map(log => [
        log.timestamp.toISOString(),
        formatSecurityEventType(log.type),
        log.severity.toUpperCase(),
        log.message,
        JSON.stringify(log.details),
        log.ipAddress || 'N/A',
        log.deviceId || 'N/A'
      ]);

      return [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
    }

    // JSON format
    return JSON.stringify(filteredLogs, null, 2);
  }, [filteredLogs]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setFilteredLogs([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SECURITY_STORAGE_KEYS.logs);
    }
  }, []);

  const getLogCount = useCallback((severity?: 'info' | 'warning' | 'critical'): number => {
    if (!severity) return logs.length;
    return logs.filter(log => log.severity === severity).length;
  }, [logs]);

  return {
    logs,
    filteredLogs,
    log,
    logSuccess,
    logWarning,
    logCritical,
    filterByType,
    filterBySeverity,
    filterByDateRange,
    search,
    clearFilters,
    exportLogs,
    clearLogs,
    getLogCount
  };
};
