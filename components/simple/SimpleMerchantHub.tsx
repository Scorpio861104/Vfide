/**
 * Simplified Merchant Hub
 * 
 * Unified dashboard replacing 7 scattered merchant pages
 * Focus on "What to do now" with clear actionable items
 */

'use client';

import { useState } from 'react';

interface MerchantStats {
  todaySales: string;
  pendingOrders: number;
  newReviews: number;
  averageRating: number;
}

interface ActionItem {
  id: string;
  type: 'urgent' | 'important' | 'info';
  icon: string;
  title: string;
  description: string;
  action: string;
  actionUrl: string;
}

interface Activity {
  id: string;
  type: 'sale' | 'review' | 'order' | 'message';
  icon: string;
  title: string;
  description: string;
  timestamp: string;
  actionUrl?: string;
}

export function SimpleMerchantHub() {
  const [stats] = useState<MerchantStats>({
    todaySales: '245.50 VFIDE',
    pendingOrders: 3,
    newReviews: 2,
    averageRating: 4.8,
  });
  
  const [actionItems] = useState<ActionItem[]>([
    {
      id: '1',
      type: 'urgent',
      icon: '📦',
      title: '3 Orders Awaiting Delivery',
      description: 'Mark as delivered to release escrow funds',
      action: 'Mark Delivered',
      actionUrl: '/merchant/orders',
    },
    {
      id: '2',
      type: 'important',
      icon: '⭐',
      title: '2 New Customer Reviews',
      description: 'Respond to reviews to build trust',
      action: 'Respond',
      actionUrl: '/merchant/reviews',
    },
  ]);
  
  const [recentActivity] = useState<Activity[]>([
    {
      id: '1',
      type: 'sale',
      icon: '💰',
      title: 'New sale: Coffee Beans',
      description: '25.00 VFIDE',
      timestamp: '5 min ago',
      actionUrl: '/merchant/orders/123',
    },
    {
      id: '2',
      type: 'review',
      icon: '⭐',
      title: 'New 5-star review',
      description: 'John Doe: "Great service!"',
      timestamp: '1 hour ago',
      actionUrl: '/merchant/reviews/456',
    },
    {
      id: '3',
      type: 'order',
      icon: '✅',
      title: 'Order delivered',
      description: 'Order #789 completed',
      timestamp: '3 hours ago',
    },
  ]);
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Merchant Hub
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Everything you need in one place
          </p>
        </div>
        <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
          + New Product
        </button>
      </div>
      
      {/* What to Do Now (Urgent Actions) */}
      {actionItems.length > 0 && (
        <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-6 border-2 border-orange-300 dark:border-orange-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>🔔</span>
            <span>What to Do Now</span>
          </h2>
          <div className="space-y-3">
            {actionItems.map((item) => (
              <ActionItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
      
      {/* Today's Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon="💰"
          label="Today's Sales"
          value={stats.todaySales}
          trend="+12%"
          trendUp
        />
        <StatCard
          icon="📦"
          label="Pending Orders"
          value={stats.pendingOrders.toString()}
          highlight={stats.pendingOrders > 0}
        />
        <StatCard
          icon="⭐"
          label="New Reviews"
          value={stats.newReviews.toString()}
          highlight={stats.newReviews > 0}
        />
        <StatCard
          icon="📊"
          label="Average Rating"
          value={stats.averageRating.toFixed(1)}
          subtitle="out of 5.0"
        />
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickActionButton icon="📦" label="View Orders" href="/merchant/orders" />
          <QuickActionButton icon="📊" label="Analytics" href="/merchant/analytics" />
          <QuickActionButton icon="⭐" label="Reviews" href="/merchant/reviews" />
          <QuickActionButton icon="💳" label="Payments" href="/merchant/payments" />
          <QuickActionButton icon="🏷️" label="Products" href="/merchant/products" />
          <QuickActionButton icon="🎨" label="Storefront" href="/merchant/store" />
          <QuickActionButton icon="⚙️" label="Settings" href="/merchant/settings" />
          <QuickActionButton icon="❓" label="Help" href="/merchant/help" />
        </div>
      </div>
      
      {/* Recent Activity Feed */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Recent Activity
        </h2>
        <div className="space-y-3">
          {recentActivity.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>
        <div className="mt-4 text-center">
          <a
            href="/merchant/activity"
            className="text-purple-600 dark:text-purple-400 hover:underline text-sm font-medium"
          >
            View All Activity →
          </a>
        </div>
      </div>
    </div>
  );
}

function ActionItemCard({ item }: { item: ActionItem }) {
  const bgColor = {
    urgent: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700',
    important: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700',
    info: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
  }[item.type];
  
  return (
    <div className={`${bgColor} rounded-lg p-4 border-2 flex items-start justify-between gap-4`}>
      <div className="flex items-start gap-3 flex-1">
        <span className="text-3xl">{item.icon}</span>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {item.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {item.description}
          </p>
        </div>
      </div>
      <a
        href={item.actionUrl}
        className="px-4 py-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-medium text-sm hover:border-purple-500 dark:hover:border-purple-500 transition-colors whitespace-nowrap"
      >
        {item.action}
      </a>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
  trend,
  trendUp,
  highlight,
}: {
  icon: string;
  label: string;
  value: string;
  subtitle?: string;
  trend?: string;
  trendUp?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-5 border-2 ${
      highlight
        ? 'border-purple-500 dark:border-purple-500'
        : 'border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-3xl">{icon}</span>
        {trend && (
          <span className={`text-sm font-medium ${
            trendUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

function QuickActionButton({ icon, label, href }: { icon: string; label: string; href: string }) {
  return (
    <a
      href={href}
      className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-purple-500 dark:hover:border-purple-500 transition-colors group"
    >
      <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{icon}</span>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
        {label}
      </span>
    </a>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <span className="text-2xl">{activity.icon}</span>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 dark:text-white">
          {activity.title}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {activity.description}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {activity.timestamp}
        </p>
      </div>
      {activity.actionUrl && (
        <a
          href={activity.actionUrl}
          className="text-purple-600 dark:text-purple-400 hover:underline text-sm font-medium whitespace-nowrap"
        >
          View →
        </a>
      )}
    </div>
  );
}
