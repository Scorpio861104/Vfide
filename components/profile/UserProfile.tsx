'use client';

import { useState } from 'react';
import { User, Share2 } from 'lucide-react';

import { ActivityHeatmap } from './extracted/ActivityHeatmap';
import { BadgeCarousel } from './extracted/BadgeCarousel';
import { ShareProfileModal } from './extracted/ShareProfileModal';
import { StatCard } from './extracted/StatCard';

export default function UserProfile() {
  const [showShare, setShowShare] = useState(false);
  return (
    <div className="space-y-6">
      {/* TODO: Wire to profile API */}
    </div>
  );
}
