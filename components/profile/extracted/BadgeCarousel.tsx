'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function BadgeCarousel({ badges }: { badges: Badge[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { play: playSound } = useTransactionSounds();

  const next = () => {
    playSound('click');
    setCurrentIndex(prev => (prev + 1) % badges.length);
  };
  const prev = () => {
    playSound('click');
    setCurrentIndex(prev => (prev - 1 + badges.length) % badges.length);
  };

  if (badges.length === 0) return null;

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Badge Showcase</h3>
        <div className="flex gap-2">
          <button onClick={prev} className="p-2 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
            <ChevronLeft className="w-4 h-4 text-zinc-400" />
          </button>
          <button onClick={next} className="p-2 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>
      <div className="relative h-48 overflow-hidden">
        <AnimatePresence mode="popLayout">
          {badges.map((badge, i) => {
            const offset = i - currentIndex;
            const isActive = i === currentIndex;
            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, x: 300, rotateY: 45 }}
                animate={{
                  opacity: Math.abs(offset) > 1 ? 0 : 1 - Math.abs(offset) * 0.3,
                  x: offset * 120,
                  scale: isActive ? 1 : 0.85,
                  rotateY: offset * -15,
                  zIndex: badges.length - Math.abs(offset)
                }}
                exit={{ opacity: 0, x: -300, rotateY: -45 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute left-1/2 -translate-x-1/2 w-40"
                style={{ perspective: 1000 }}
              >
                <div className={`bg-gradient-to-br ${
                  badge.rarity === 'legendary' ? 'from-yellow-500/20 to-orange-500/20 border-yellow-500/50' :
                  badge.rarity === 'epic' ? 'from-purple-500/20 to-pink-500/20 border-purple-500/50' :
                  badge.rarity === 'rare' ? 'from-blue-500/20 to-cyan-500/20 border-blue-500/50' :
                  'from-gray-500/20 to-gray-600/20 border-gray-500/50'
                } border rounded-xl p-4 text-center ${isActive ? 'shadow-2xl' : ''}`}>
                  <motion.div 
                    className="text-5xl mb-2"
                    animate={isActive ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {badge.icon}
                  </motion.div>
                  <h4 className="font-bold text-white text-sm truncate">{badge.name}</h4>
                  <p className="text-xs text-zinc-400 truncate">{badge.description}</p>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    badge.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-400' :
                    badge.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' :
                    badge.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {formatRarityLabel(badge.rarity)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <div className="flex justify-center gap-1 mt-4">
        {badges.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-amber-400 w-4' : 'bg-zinc-800'}`}
          />
        ))}
      </div>
    </div>
  );
}
