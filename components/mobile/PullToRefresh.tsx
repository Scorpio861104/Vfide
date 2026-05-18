import React, { useRef } from 'react';
import { usePullToRefresh } from '@/hooks/useTouch';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  disabled?: boolean;
  className?: string;
}

export function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  disabled = false,
  className = ''
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { isPulling, isRefreshing, pullDistance, progress } = usePullToRefresh(
    containerRef as React.RefObject<HTMLElement>,
    {
      onRefresh,
      threshold,
      disabled
    }
  );

  const showIndicator = (isPulling && pullDistance > 0) || isRefreshing;
  const indicatorHeight = 60;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Pull indicator */}
      {showIndicator && (
        <div
          style={{
            height: `${indicatorHeight}px`,
            opacity: progress,
            transition: isPulling ? 'none' : 'opacity 0.3s ease'
          }}
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all"
        >
          <div className="flex flex-col items-center">
            {isRefreshing ? (
              <>
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Refreshing...
                </span>
              </>
            ) : (
              <>
                <div
                  className="w-8 h-8 text-blue-600 transition-transform"
                  style={{
                    transform: `rotate(${progress * 180}deg)`
                  }}
                >
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <span className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {progress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div
        style={{
          transform: showIndicator ? `translateY(${indicatorHeight}px)` : undefined,
          transition: isPulling ? 'none' : 'transform 0.3s ease'
        }}
      >
        {children}
      </div>
    </div>
  );
};
