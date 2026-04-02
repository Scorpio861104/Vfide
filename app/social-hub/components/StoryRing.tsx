'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

type Story = {
  author: { name: string; avatar?: string };
  preview?: string;
  viewed?: boolean;
  isLive?: boolean;
};

export function StoryRing({ story, onClick }: { story: Story; onClick: () => void }) {
  const isYou = story.author.name === 'You';
  
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1 min-w-18"
    >
      <div className={`
        relative p-0.5 rounded-full
        ${story.viewed ? 'bg-zinc-700' : 'bg-gradient-to-tr from-rose-500 via-[#FF6B9D] to-cyan-400'}
        ${story.isLive ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-[#0A0A0F]' : ''}
      `}>
        <div className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center text-2xl overflow-hidden">
          {story.preview ? (
            <Image src={story.preview} alt={`${story.author.name} story preview`} width={56} height={56} className="w-full h-full object-cover" />
          ) : isYou ? (
            <Plus className="w-6 h-6 text-cyan-400" />
          ) : (
            story.author.avatar
          )}
        </div>
        {story.isLive && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">
            LIVE
          </span>
        )}
      </div>
      <span className="text-xs text-zinc-400 truncate max-w-15">
        {story.author.name}
      </span>
    </motion.button>
  );
}
