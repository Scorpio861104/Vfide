'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original store/[slug] page

export function AboutTab() {
  return (
    <div className="space-y-6">
      <div className="max-w-2xl space-y-6">
  {profile.description && (
    <div>
    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">About</h3>
    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{profile.description}</p>
    </div>
  )}
  {profile.business_hours && Object.keys(profile.business_hours).length > 0 && (
    <div>
    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Business Hours</h3>
    <div className="space-y-1">
    {Object.entries(profile.business_hours).map(([day, hours]) => (
    <div key={day} className="flex justify-between text-sm">
    <span className="text-gray-600 dark:text-gray-400 capitalize">{day}</span>
    <span className="text-gray-900 dark:text-white">{hours}</span>
    </div>
    ))}
    </div>
    </div>
  )}
  {profile.social_links && Object.keys(profile.social_links).length > 0 && (
    <div>
    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Social</h3>
    <div className="flex gap-3">
    {Object.entries(profile.social_links).map(([platform, url]) => (
    <a
    key={platform}
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="text-sm text-blue-600 hover:underline flex items-center gap-1 capitalize"
    >
    {platform} <ExternalLink className="w-3 h-3" />
    </a>
    ))}
    </div>
    </div>
  )}
  <div>
    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Capabilities</h3>
    <div className="flex flex-wrap gap-2">
    {profile.shipping_enabled && <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-1 rounded">Shipping</span>}
    {profile.pickup_enabled && <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-1 rounded">Pickup</span>}
    {profile.digital_goods_enabled && <span className="text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 px-2 py-1 rounded">Digital Goods</span>}
    {profile.services_enabled && <span className="text-xs bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-2 py-1 rounded">Services</span>}
    </div>
  </div>
  </div>
    </div>
  );
}
