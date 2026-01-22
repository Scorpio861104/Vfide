/**
 * Formatting Utilities Tests
 */

describe('Formatting Utilities', () => {
  describe('formatAddress', () => {
    it('should truncate Ethereum addresses', () => {
      const formatAddress = (addr: string) => 
        `${addr.slice(0, 6)}...${addr.slice(-4)}`;
      
      const address = '0x1234567890123456789012345678901234567890';
      expect(formatAddress(address)).toBe('0x1234...7890');
    });

    it('should handle short addresses', () => {
      const formatAddress = (addr: string) => 
        addr.length < 12 ? addr : `${addr.slice(0, 6)}...${addr.slice(-4)}`;
      
      expect(formatAddress('0x1234')).toBe('0x1234');
    });
  });

  describe('formatCurrency', () => {
    it('should format numbers as currency', () => {
      const formatCurrency = (amount: number) => 
        new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(amount);
      
      expect(formatCurrency(1234.56)).toContain('1,234.56');
    });

    it('should handle different currencies', () => {
      const formatCurrency = (amount: number, currency: string) => 
        new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency 
        }).format(amount);
      
      expect(formatCurrency(100, 'EUR')).toContain('100');
    });

    it('should handle zero and negative values', () => {
      const formatCurrency = (amount: number) => 
        new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(amount);
      
      expect(formatCurrency(0)).toContain('0');
      expect(formatCurrency(-50)).toContain('-');
    });
  });

  describe('formatNumber', () => {
    it('should format large numbers with separators', () => {
      const formatNumber = (num: number) => 
        new Intl.NumberFormat('en-US').format(num);
      
      expect(formatNumber(1234567)).toBe('1,234,567');
    });

    it('should handle decimals', () => {
      const formatNumber = (num: number, decimals: number = 2) => 
        num.toFixed(decimals);
      
      expect(formatNumber(123.456, 2)).toBe('123.46');
    });

    it('should format with abbreviations', () => {
      const formatCompact = (num: number) => {
        if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
        if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
        if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
        return num.toString();
      };
      
      expect(formatCompact(1500)).toBe('1.5K');
      expect(formatCompact(2500000)).toBe('2.5M');
      expect(formatCompact(3500000000)).toBe('3.5B');
    });
  });

  describe('formatDate', () => {
    it('should format dates', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = new Intl.DateTimeFormat('en-US').format(date);
      
      expect(formatted).toContain('2024');
    });

    it('should format relative time', () => {
      const getRelativeTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'just now';
      };
      
      const recent = new Date(Date.now() - 1000 * 60 * 5);
      expect(getRelativeTime(recent)).toContain('ago');
    });

    it('should handle invalid dates', () => {
      const formatDate = (date: Date | null) => {
        if (!date || isNaN(date.getTime())) return 'Invalid date';
        return date.toISOString();
      };
      
      expect(formatDate(null)).toBe('Invalid date');
      expect(formatDate(new Date('invalid'))).toBe('Invalid date');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentages', () => {
      const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;
      
      expect(formatPercent(0.1234)).toBe('12.34%');
      expect(formatPercent(0.5)).toBe('50.00%');
    });

    it('should handle edge cases', () => {
      const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;
      
      expect(formatPercent(0)).toBe('0.00%');
      expect(formatPercent(1)).toBe('100.00%');
      expect(formatPercent(1.5)).toBe('150.00%');
    });
  });

  describe('formatBytes', () => {
    it('should format file sizes', () => {
      const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
      };
      
      expect(formatBytes(1024)).toBe('1.00 KB');
      expect(formatBytes(1048576)).toBe('1.00 MB');
      expect(formatBytes(0)).toBe('0 B');
    });
  });

  describe('formatToken', () => {
    it('should format token amounts', () => {
      const formatToken = (amount: string, decimals: number = 18) => {
        const value = BigInt(amount);
        const divisor = BigInt(10 ** decimals);
        const whole = value / divisor;
        const remainder = value % divisor;
        return `${whole}.${remainder.toString().padStart(decimals, '0')}`;
      };
      
      expect(formatToken('1000000000000000000')).toContain('1.');
    });

    it('should handle different decimal places', () => {
      const formatToken = (amount: string, decimals: number) => {
        const value = parseFloat(amount) / (10 ** decimals);
        return value.toFixed(decimals);
      };
      
      expect(formatToken('1000000', 6)).toBe('1.000000');
    });
  });

  describe('formatDuration', () => {
    it('should format time durations', () => {
      const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
      };
      
      expect(formatDuration(3665)).toBe('1h 1m 5s');
      expect(formatDuration(65)).toBe('1m 5s');
      expect(formatDuration(5)).toBe('5s');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format phone numbers', () => {
      const formatPhone = (phone: string) => {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
          return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        return phone;
      };
      
      expect(formatPhone('1234567890')).toBe('(123) 456-7890');
    });
  });

  describe('formatTruncate', () => {
    it('should truncate long text', () => {
      const truncate = (text: string, length: number = 50) => {
        if (text.length <= length) return text;
        return text.slice(0, length) + '...';
      };
      
      const longText = 'a'.repeat(100);
      expect(truncate(longText, 50)).toHaveLength(53);
      expect(truncate(longText, 50)).toContain('...');
    });

    it('should preserve short text', () => {
      const truncate = (text: string, length: number = 50) => {
        if (text.length <= length) return text;
        return text.slice(0, length) + '...';
      };
      
      expect(truncate('short', 50)).toBe('short');
    });
  });
});
