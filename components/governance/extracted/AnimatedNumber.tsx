'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => {
    if (suffix === '%') return latest.toFixed(1);
    if (suffix === 'M') return latest.toFixed(1);
    return Math.round(latest).toString();
  });
  const [displayValue, setDisplayValue] = useState('0');
  
  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.5,
      ease: [0.22, 1, 0.36, 1],
    });
    
    const unsubscribe = rounded.on('change', (latest) => {
      setDisplayValue(latest);
    });
    
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, motionValue, rounded]);
  
  return <span>{displayValue}{suffix}</span>;
}
