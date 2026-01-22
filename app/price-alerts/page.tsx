"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Footer } from '@/components/layout/Footer';
import { useAccount } from 'wagmi';
import { 
  Bell, 
  BellRing,
  TrendingUp, 
  TrendingDown,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  DollarSign,
  Percent,
  Clock,
  ChevronDown,
  Volume2,
  VolumeX,
  Smartphone,
  Mail,
  Settings,
  BarChart3,
  Activity,
  Zap,
  Target,
  ArrowUp,
  ArrowDown,
  RefreshCw
} from 'lucide-react';

// Types
type AlertType = 'price_above' | 'price_below' | 'percent_change' | 'volume_spike';
type AlertStatus = 'active' | 'triggered' | 'paused';
type NotificationChannel = 'browser' | 'email' | 'push';

interface PriceAlert {
  id: string;
  token: string;
  tokenSymbol: string;
  type: AlertType;
  targetValue: number;
  currentPrice: number;
  status: AlertStatus;
  createdAt: Date;
  triggeredAt?: Date;
  channels: NotificationChannel[];
  note?: string;
}

interface TokenInfo {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  icon: string;
}

// Sample token data
const TOKENS: TokenInfo[] = [
  { symbol: 'VFIDE', name: 'VFIDE Token', price: 0.0847, change24h: 5.23, icon: '🔷' },
  { symbol: 'ETH', name: 'Ethereum', price: 3847.52, change24h: -1.24, icon: '⟠' },
  { symbol: 'BTC', name: 'Bitcoin', price: 67234.18, change24h: 2.15, icon: '₿' },
  { symbol: 'USDC', name: 'USD Coin', price: 1.00, change24h: 0.01, icon: '💵' },
  { symbol: 'ARB', name: 'Arbitrum', price: 1.23, change24h: -3.45, icon: '🔵' },
  { symbol: 'OP', name: 'Optimism', price: 2.87, change24h: 4.12, icon: '🔴' },
  { symbol: 'MATIC', name: 'Polygon', price: 0.89, change24h: -0.87, icon: '💜' },
];

const ALERT_TYPES: Record<AlertType, { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  'price_above': { label: 'Price Above', icon: TrendingUp },
  'price_below': { label: 'Price Below', icon: TrendingDown },
  'percent_change': { label: '% Change', icon: Percent },
  'volume_spike': { label: 'Volume Spike', icon: BarChart3 }
};

export default function PriceAlertsPage() {
  const { address } = useAccount();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'triggered'>('all');
  
  // New alert form state
  const [newToken, setNewToken] = useState('VFIDE');
  const [newType, setNewType] = useState<AlertType>('price_above');
  const [newValue, setNewValue] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newChannels, setNewChannels] = useState<NotificationChannel[]>(['browser']);
  
  // Settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [browserNotifications, setBrowserNotifications] = useState(false);

  // Load alerts from localStorage
  useEffect(() => {
    if (address) {
      const stored = localStorage.getItem(`price_alerts_${address}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setAlerts(parsed.map((a: PriceAlert) => ({
          ...a,
          createdAt: new Date(a.createdAt),
          triggeredAt: a.triggeredAt ? new Date(a.triggeredAt) : undefined
        })));
      }
    }
  }, [address]);

  // Save alerts
  const saveAlerts = useCallback((newAlerts: PriceAlert[]) => {
    if (address) {
      localStorage.setItem(`price_alerts_${address}`, JSON.stringify(newAlerts));
    }
    setAlerts(newAlerts);
  }, [address]);

  // Request browser notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setBrowserNotifications(permission === 'granted');
    }
  };

  // Create alert
  const handleCreateAlert = () => {
    const token = TOKENS.find(t => t.symbol === newToken);
    if (!token || !newValue) return;

    const alert: PriceAlert = {
      id: Date.now().toString(36),
      token: token.name,
      tokenSymbol: token.symbol,
      type: newType,
      targetValue: parseFloat(newValue),
      currentPrice: token.price,
      status: 'active',
      createdAt: new Date(),
      channels: newChannels,
      note: newNote || undefined
    };

    saveAlerts([alert, ...alerts]);
    resetForm();
  };

  const resetForm = () => {
    setNewToken('VFIDE');
    setNewType('price_above');
    setNewValue('');
    setNewNote('');
    setNewChannels(['browser']);
    setIsCreating(false);
  };

  // Delete alert
  const handleDeleteAlert = (id: string) => {
    saveAlerts(alerts.filter(a => a.id !== id));
  };

  // Toggle alert status
  const handleToggleAlert = (id: string) => {
    saveAlerts(alerts.map(a => {
      if (a.id === id) {
        return {
          ...a,
          status: a.status === 'active' ? 'paused' : 'active'
        };
      }
      return a;
    }));
  };

  // Filter alerts
  const filteredAlerts = alerts.filter(a => {
    if (filter === 'active') return a.status === 'active';
    if (filter === 'triggered') return a.status === 'triggered';
    return true;
  });

  // Calculate alert statistics
  const stats = {
    total: alerts.length,
    active: alerts.filter(a => a.status === 'active').length,
    triggered: alerts.filter(a => a.status === 'triggered').length
  };

  const getSelectedToken = () => TOKENS.find(t => t.symbol === newToken);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-jade-500/10 rounded-full text-jade-400 text-sm font-medium mb-4">
              <BellRing size={16} />
              Price Monitoring
            </div>
            <h1 className="text-4xl font-bold text-white">Price Alerts</h1>
            <p className="text-zinc-400 mt-2">Get notified when your tokens hit target prices</p>
          </div>
          
          <button
            onClick={() => setIsCreating(true)}
            className="px-6 py-3 bg-gradient-to-r from-jade-500 to-teal-500 text-black font-semibold rounded-lg flex items-center gap-2"
          >
            <Plus size={18} />
            Create Alert
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-zinc-900/50 border border-zinc-700 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800 rounded-lg">
                <Bell className="text-zinc-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-sm text-zinc-400">Total Alerts</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-zinc-900/50 border border-zinc-700 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-jade-500/10 rounded-lg">
                <Activity className="text-jade-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-jade-400">{stats.active}</p>
                <p className="text-sm text-zinc-400">Active</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-zinc-900/50 border border-zinc-700 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Zap className="text-amber-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-400">{stats.triggered}</p>
                <p className="text-sm text-zinc-400">Triggered</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-zinc-900/50 border border-zinc-700 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-800 rounded-lg">
                  {soundEnabled ? (
                    <Volume2 className="text-zinc-400" size={20} />
                  ) : (
                    <VolumeX className="text-zinc-400" size={20} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Sound</p>
                  <p className="text-xs text-zinc-400">{soundEnabled ? 'On' : 'Off'}</p>
                </div>
              </div>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  soundEnabled ? 'bg-jade-500' : 'bg-zinc-700'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Market Overview */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Market Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {TOKENS.map(token => (
              <div key={token.symbol} className="p-3 bg-zinc-900/50 border border-zinc-700 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{token.icon}</span>
                  <span className="font-medium text-white">{token.symbol}</span>
                </div>
                <p className="text-lg font-bold text-white">
                  ${token.price < 1 ? token.price.toFixed(4) : token.price.toLocaleString()}
                </p>
                <p className={`text-sm flex items-center gap-1 ${
                  token.change24h >= 0 ? 'text-jade-400' : 'text-red-400'
                }`}>
                  {token.change24h >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  {Math.abs(token.change24h).toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Create Alert Modal */}
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setIsCreating(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white">Create Price Alert</h3>
                  <button
                    onClick={() => setIsCreating(false)}
                    className="p-2 hover:bg-zinc-800 rounded-lg"
                  >
                    <X size={20} className="text-zinc-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Token Selection */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Token</label>
                    <select
                      value={newToken}
                      onChange={(e) => setNewToken(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-jade-500"
                    >
                      {TOKENS.map(token => (
                        <option key={token.symbol} value={token.symbol}>
                          {token.icon} {token.symbol} - ${token.price < 1 ? token.price.toFixed(4) : token.price.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Alert Type */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Alert Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.entries(ALERT_TYPES) as [AlertType, typeof ALERT_TYPES[AlertType]][]).map(([type, config]) => {
                        const Icon = config.icon;
                        return (
                          <button
                            key={type}
                            onClick={() => setNewType(type)}
                            className={`p-3 rounded-lg border flex items-center gap-2 ${
                              newType === type
                                ? 'border-jade-400 bg-jade-500/10 text-jade-400'
                                : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                            }`}
                          >
                            <Icon size={18} />
                            <span className="text-sm">{config.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Target Value */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      {newType === 'percent_change' ? 'Percentage Change' : 
                       newType === 'volume_spike' ? 'Volume Multiplier' : 'Target Price'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                        {newType === 'percent_change' ? '%' : 
                         newType === 'volume_spike' ? 'x' : '$'}
                      </span>
                      <input
                        type="number"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        placeholder={newType === 'percent_change' ? '10' : 
                                   newType === 'volume_spike' ? '2' : 
                                   getSelectedToken()?.price.toString() || '0'}
                        className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-jade-500"
                      />
                    </div>
                    {getSelectedToken() && newType !== 'percent_change' && newType !== 'volume_spike' && (
                      <p className="text-xs text-zinc-500 mt-1">
                        Current price: ${getSelectedToken()!.price < 1 ? getSelectedToken()!.price.toFixed(4) : getSelectedToken()!.price.toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Note */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Note (optional)</label>
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="e.g., Buy more if price drops"
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-jade-500"
                    />
                  </div>

                  {/* Notification Channels */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Notify via</label>
                    <div className="flex gap-2">
                      {[
                        { id: 'browser' as const, icon: Bell, label: 'Browser' },
                        { id: 'email' as const, icon: Mail, label: 'Email' },
                        { id: 'push' as const, icon: Smartphone, label: 'Push' }
                      ].map(channel => (
                        <button
                          key={channel.id}
                          onClick={() => {
                            if (newChannels.includes(channel.id)) {
                              setNewChannels(newChannels.filter(c => c !== channel.id));
                            } else {
                              setNewChannels([...newChannels, channel.id]);
                              if (channel.id === 'browser') {
                                requestNotificationPermission();
                              }
                            }
                          }}
                          className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 ${
                            newChannels.includes(channel.id)
                              ? 'border-jade-400 bg-jade-500/10 text-jade-400'
                              : 'border-zinc-700 bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          <channel.icon size={16} />
                          <span className="text-sm">{channel.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setIsCreating(false)}
                    className="flex-1 py-3 bg-zinc-800 text-white rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateAlert}
                    disabled={!newValue}
                    className="flex-1 py-3 bg-gradient-to-r from-jade-500 to-teal-500 text-black font-semibold rounded-lg disabled:opacity-50"
                  >
                    Create Alert
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          {(['all', 'active', 'triggered'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-jade-500/20 text-jade-400'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Alerts List */}
        {filteredAlerts.length === 0 ? (
          <div className="p-12 bg-zinc-900/50 border border-zinc-700 rounded-xl text-center">
            <Bell className="text-zinc-600 mx-auto mb-4" size={48} />
            <h3 className="text-lg font-semibold text-white mb-2">No alerts yet</h3>
            <p className="text-zinc-400 mb-6">Create your first price alert to get notified when tokens hit your targets</p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-6 py-3 bg-jade-500/10 text-jade-400 rounded-lg"
            >
              Create Alert
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map(alert => {
              const token = TOKENS.find(t => t.symbol === alert.tokenSymbol);
              const AlertIcon = ALERT_TYPES[alert.type].icon;
              const progress = alert.type === 'price_above' 
                ? Math.min((alert.currentPrice / alert.targetValue) * 100, 100)
                : alert.type === 'price_below'
                  ? Math.min((alert.targetValue / alert.currentPrice) * 100, 100)
                  : 50;
              
              return (
                <motion.div
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 bg-zinc-900/50 border rounded-xl ${
                    alert.status === 'triggered' 
                      ? 'border-amber-500/50' 
                      : alert.status === 'paused'
                        ? 'border-zinc-700 opacity-60'
                        : 'border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">{token?.icon || '🪙'}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{alert.tokenSymbol}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            alert.status === 'active' ? 'bg-jade-500/20 text-jade-400' :
                            alert.status === 'triggered' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-zinc-700 text-zinc-400'
                          }`}>
                            {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-zinc-400 mt-1">
                          <AlertIcon size={14} />
                          <span>{ALERT_TYPES[alert.type].label}</span>
                          <span className="text-white font-medium">
                            {alert.type === 'percent_change' ? `${alert.targetValue}%` :
                             alert.type === 'volume_spike' ? `${alert.targetValue}x` :
                             `$${alert.targetValue < 1 ? alert.targetValue.toFixed(4) : alert.targetValue.toLocaleString()}`}
                          </span>
                        </div>
                        {alert.note && (
                          <p className="text-xs text-zinc-500 mt-1">{alert.note}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Progress to target */}
                      {(alert.type === 'price_above' || alert.type === 'price_below') && token && (
                        <div className="hidden sm:block w-32">
                          <div className="flex justify-between text-xs text-zinc-500 mb-1">
                            <span>Current</span>
                            <span>{progress.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-jade-500 to-teal-500 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-zinc-400 mt-1 text-right">
                            ${token.price < 1 ? token.price.toFixed(4) : token.price.toLocaleString()}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleAlert(alert.id)}
                          className={`p-2 rounded-lg ${
                            alert.status === 'active' 
                              ? 'bg-jade-500/10 text-jade-400' 
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                          title={alert.status === 'active' ? 'Pause alert' : 'Resume alert'}
                        >
                          {alert.status === 'active' ? <Bell size={18} /> : <RefreshCw size={18} />}
                        </button>
                        <button
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="p-2 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-red-500/10 hover:text-red-400"
                          title="Delete alert"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Quick Create Presets */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Alerts</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => {
                setNewToken('VFIDE');
                setNewType('price_above');
                const vfide = TOKENS.find(t => t.symbol === 'VFIDE');
                setNewValue(vfide ? (vfide.price * 1.1).toFixed(4) : '0.10');
                setNewNote('10% price increase');
                setIsCreating(true);
              }}
              className="p-4 bg-zinc-900/50 border border-zinc-700 rounded-xl hover:border-zinc-500 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-jade-500/10 rounded-lg">
                  <TrendingUp className="text-jade-400" size={20} />
                </div>
                <div>
                  <p className="font-medium text-white">VFIDE +10%</p>
                  <p className="text-sm text-zinc-400">Alert when VFIDE rises 10%</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setNewToken('ETH');
                setNewType('price_below');
                setNewValue('3500');
                setNewNote('ETH buying opportunity');
                setIsCreating(true);
              }}
              className="p-4 bg-zinc-900/50 border border-zinc-700 rounded-xl hover:border-zinc-500 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <TrendingDown className="text-blue-400" size={20} />
                </div>
                <div>
                  <p className="font-medium text-white">ETH under $3,500</p>
                  <p className="text-sm text-zinc-400">Buy the dip alert</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setNewToken('BTC');
                setNewType('price_above');
                setNewValue('70000');
                setNewNote('BTC new ATH territory');
                setIsCreating(true);
              }}
              className="p-4 bg-zinc-900/50 border border-zinc-700 rounded-xl hover:border-zinc-500 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Target className="text-amber-400" size={20} />
                </div>
                <div>
                  <p className="font-medium text-white">BTC at $70K</p>
                  <p className="text-sm text-zinc-400">New all-time high alert</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
