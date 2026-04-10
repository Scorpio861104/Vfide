import { useCallback, useEffect, useState } from 'react';
import {
  SecurityLogEntry,
  SecurityEventType,
  formatSecurityEventType,
  generateDeviceFingerprint
} from '@/config/security-advanced';
import { logger } from '@/lib/logger';

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

interface SecurityLogApiRecord {
  id: string;
  ts: string;
  type: SecurityEventType;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  details: Record<string, any> | null;
  user_agent?: string | null;
  location?: string | null;
  device_id?: string | null;
}

function mapApiLogToEntry(record: SecurityLogApiRecord): SecurityLogEntry {
  return {
    id: record.id,
    timestamp: new Date(record.ts),
    type: record.type,
    severity: record.severity,
    message: record.message,
    details: record.details || {},
    userAgent: record.user_agent || undefined,
    location: record.location || undefined,
    deviceId: record.device_id || undefined,
    ipAddress: 'server-validated',
  };
}

async function fetchLogsFromServer(limit: number = MAX_LOGS): Promise<SecurityLogEntry[]> {
  const response = await fetch(`/api/security/logs?limit=${limit}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch security logs (${response.status})`);
  }

  const payload = await response.json() as { logs?: SecurityLogApiRecord[] };
  const records = Array.isArray(payload.logs) ? payload.logs : [];
  return records.map(mapApiLogToEntry);
}

async function persistLogToServer(log: SecurityLogEntry): Promise<void> {
  const response = await fetch('/api/security/logs', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: log.type,
      severity: log.severity,
      message: log.message,
      details: log.details,
      userAgent: log.userAgent,
      location: log.location,
      deviceId: log.deviceId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to store security log (${response.status})`);
  }
}

async function clearLogsOnServer(): Promise<void> {
  const response = await fetch('/api/security/logs', {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to clear security logs (${response.status})`);
  }
}

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
  const [logs, setLogs] = useState<SecurityLogEntry[]>([]);
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
    let mounted = true;

    const load = async () => {
      try {
        const loaded = await fetchLogsFromServer(MAX_LOGS);
        if (!mounted) return;
        setLogs(loaded);
        setFilteredLogs(loaded);
      } catch (error) {
        if (!mounted) return;
        logger.error('Failed to load security logs from backend', error);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
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

    setLogs(prev => [...prev, newLog].slice(-MAX_LOGS));

    void persistLogToServer(newLog).catch((error) => {
      logger.error('Failed to persist security log to backend', error);
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

    void clearLogsOnServer().catch((error) => {
      logger.error('Failed to clear security logs on backend', error);
    });
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
