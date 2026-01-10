/**
 * Governance-specific hooks
 */

'use client';

import { useState, useEffect } from 'react';

export function useCountdown(endTime: number) {
  const [timeLeft, setTimeLeft] = useState("");
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const diff = endTime - now;
      
      if (diff <= 0) {
        setTimeLeft("Ended");
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      
      if (days > 0) {
        setTimeLeft(`${days}d ${remainingHours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h`);
      } else {
        const minutes = Math.floor(diff / (1000 * 60));
        setTimeLeft(`${minutes}m`);
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [endTime]);
  
  return timeLeft;
}
