'use client';

/**
 * Performance-Optimized Image & Media Components
 * 
 * Optimized images with blur placeholders, lazy loading,
 * responsive sizes, and progressive enhancement.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageOff, Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { usePrefersReducedMotion, useInView } from '@/lib/ux/uxUtils';

// ==================== TYPES ====================

export interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataUrl?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none';
  onLoad?: () => void;
  onError?: () => void;
  sizes?: string;
  quality?: number;
}

export interface AvatarProps {
  src?: string;
  alt: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away' | 'busy';
  className?: string;
}

export interface TokenIconProps {
  symbol: string;
  address?: string;
  chainId?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

// ==================== OPTIMIZED IMAGE ====================

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  placeholder = 'empty',
  blurDataUrl,
  objectFit = 'cover',
  onLoad,
  onError,
  sizes,
  quality = 75,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Lazy load using intersection observer
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const objectFitClasses = {
    contain: 'object-contain',
    cover: 'object-cover',
    fill: 'object-fill',
    none: 'object-none',
  };

  // Generate optimized src URL (for production, use a CDN/image service)
  const optimizedSrc = src.includes('?') 
    ? `${src}&q=${quality}` 
    : `${src}?q=${quality}`;

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Placeholder/blur */}
      {placeholder === 'blur' && blurDataUrl && !isLoaded && (
        <img
          src={blurDataUrl}
          alt="presentation"
          role="presentation"
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full ${objectFitClasses[objectFit]} scale-110 blur-lg`}
        />
      )}

      {/* Loading skeleton */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-800 animate-pulse" />
      )}

      {/* Main image */}
      {isInView && !hasError && (
        <motion.img
          src={optimizedSrc}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0 }}
          animate={isLoaded ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`w-full h-full ${objectFitClasses[objectFit]}`}
        />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <ImageOff className="w-8 h-8 text-gray-600" />
        </div>
      )}
    </div>
  );
}

// ==================== AVATAR ====================

export function Avatar({
  src,
  alt,
  name,
  size = 'md',
  status,
  className = '',
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const sizes = {
    xs: { container: 'w-6 h-6', text: 'text-xs', status: 'w-2 h-2 border' },
    sm: { container: 'w-8 h-8', text: 'text-sm', status: 'w-2.5 h-2.5 border' },
    md: { container: 'w-10 h-10', text: 'text-base', status: 'w-3 h-3 border-2' },
    lg: { container: 'w-12 h-12', text: 'text-lg', status: 'w-3.5 h-3.5 border-2' },
    xl: { container: 'w-16 h-16', text: 'text-xl', status: 'w-4 h-4 border-2' },
  };

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
  };

  const getInitials = () => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getGradient = () => {
    if (!name) return 'from-gray-600 to-gray-700';
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradients = [
      'from-cyan-500 to-blue-500',
      'from-purple-500 to-pink-500',
      'from-green-500 to-emerald-500',
      'from-orange-500 to-red-500',
      'from-yellow-500 to-orange-500',
    ];
    return gradients[hash % gradients.length];
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div className={`
        relative rounded-full overflow-hidden
        ${sizes[size].container}
        ${(!src || hasError) ? `bg-gradient-to-br ${getGradient()}` : 'bg-gray-800'}
      `}>
        {src && !hasError ? (
          <>
            {/* Loading state */}
            {!isLoaded && (
              <div className="absolute inset-0 bg-gray-800 animate-pulse" />
            )}
            <img
              src={src}
              alt={alt}
              onLoad={() => setIsLoaded(true)}
              onError={() => setHasError(true)}
              className={`w-full h-full object-cover transition-opacity ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </>
        ) : (
          <div className={`
            w-full h-full flex items-center justify-center
            font-semibold text-white
            ${sizes[size].text}
          `}>
            {getInitials()}
          </div>
        )}
      </div>

      {/* Status indicator */}
      {status && (
        <span className={`
          absolute bottom-0 right-0 rounded-full border-gray-900
          ${sizes[size].status}
          ${statusColors[status]}
        `} />
      )}
    </div>
  );
}

// ==================== TOKEN ICON ====================

const TOKEN_ICON_SOURCES = [
  (symbol: string) => `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${symbol}/logo.png`,
  (symbol: string) => `https://assets.coingecko.com/coins/images/1/small/${symbol.toLowerCase()}.png`,
  (symbol: string) => `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons/32/color/${symbol.toLowerCase()}.png`,
];

export function TokenIcon({
  symbol,
  address,
  chainId: _chainId = 1,
  size = 'md',
  className = '',
}: TokenIconProps) {
  const [currentSource, setCurrentSource] = useState(0);
  const [hasError, setHasError] = useState(false);

  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const handleError = () => {
    if (currentSource < TOKEN_ICON_SOURCES.length - 1) {
      setCurrentSource((prev) => prev + 1);
    } else {
      setHasError(true);
    }
  };

  const getSrc = () => {
    if (address) {
      // Use address-based lookup for more accuracy
      return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${address}/logo.png`;
    }
    const sourceFunc = TOKEN_ICON_SOURCES[currentSource];
    return sourceFunc ? sourceFunc(symbol) : '';
  };

  if (hasError) {
    return (
      <div className={`
        ${sizes[size]} rounded-full
        bg-gradient-to-br from-gray-600 to-gray-700
        flex items-center justify-center
        text-white font-bold text-xs
        ${className}
      `}>
        {symbol.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={getSrc()}
      alt={`${symbol} icon`}
      onError={handleError}
      className={`${sizes[size]} rounded-full ${className}`}
    />
  );
}

// ==================== VIDEO PLAYER ====================

export function VideoPlayer({
  src,
  poster,
  autoPlay = false,
  muted = true,
  loop = false,
  controls = true,
  className = '',
  onPlay,
  onPause,
  onEnded,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [progress, setProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  
  const isIntersecting = useInView(containerRef, { threshold: 0.5 });

  // Auto-play when in view, pause when not
  useEffect(() => {
    if (!videoRef.current || reducedMotion) return;

    if (isIntersecting && autoPlay) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isIntersecting, autoPlay, reducedMotion]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      onPause?.();
    } else {
      videoRef.current.play();
      onPlay?.();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, onPlay, onPause]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(progress);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = percent * videoRef.current.duration;
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative group overflow-hidden rounded-xl bg-black ${className}`}
    >
      {/* Loading state */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"
          />
        </div>
      )}

      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted={isMuted}
        loop={loop}
        playsInline
        onLoadedData={() => setIsLoaded(true)}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          onEnded?.();
        }}
        className="w-full h-full object-cover"
      />

      {/* Custom controls */}
      {controls && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="
              absolute bottom-0 left-0 right-0 p-4
              bg-gradient-to-t from-black/80 to-transparent
              opacity-0 group-hover:opacity-100 transition-opacity
            "
          >
            {/* Progress bar */}
            <div
              onClick={handleSeek}
              className="w-full h-1 bg-gray-600 rounded-full cursor-pointer mb-3"
            >
              <motion.div
                className="h-full bg-cyan-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="p-2 text-white hover:text-cyan-400 transition-colors"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>

              <button
                onClick={toggleMute}
                className="p-2 text-white hover:text-cyan-400 transition-colors"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              <div className="flex-1" />

              <button
                onClick={handleFullscreen}
                className="p-2 text-white hover:text-cyan-400 transition-colors"
                aria-label="Fullscreen"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Play button overlay */}
      {!isPlaying && isLoaded && (
        <button
          onClick={togglePlay}
          className="
            absolute inset-0 flex items-center justify-center
            bg-black/30 hover:bg-black/40 transition-colors
          "
          aria-label="Play video"
        >
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
          >
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </motion.div>
        </button>
      )}
    </div>
  );
}

// ==================== BACKGROUND VIDEO ====================

export function BackgroundVideo({
  src,
  fallbackImage,
  className = '',
  overlay = true,
}: {
  src: string;
  fallbackImage?: string;
  className?: string;
  overlay?: boolean;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [canPlayVideo, setCanPlayVideo] = useState(!reducedMotion);

  useEffect(() => {
    // Check if user prefers reduced data
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) {
      setCanPlayVideo(false);
    }
  }, []);

  if (!canPlayVideo && fallbackImage) {
    return (
      <div className={`absolute inset-0 ${className}`}>
        <img
          src={fallbackImage}
          alt="presentation"
          role="presentation"
          className="w-full h-full object-cover"
          aria-hidden="true"
        />
        {overlay && (
          <div className="absolute inset-0 bg-black/50" />
        )}
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 ${className}`}>
      <video
        src={src}
        autoPlay
        muted
        loop
        playsInline
        className="w-full h-full object-cover"
        aria-hidden="true"
      />
      {overlay && (
        <div className="absolute inset-0 bg-black/50" />
      )}
    </div>
  );
}

// ==================== IMAGE GALLERY ====================

export function ImageGallery({
  images,
  columns = 3,
  gap = 4,
  className = '',
}: {
  images: Array<{ src: string; alt: string; aspectRatio?: number }>;
  columns?: number;
  gap?: number;
  className?: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  return (
    <>
      <div 
        className={`grid gap-${gap} ${className}`}
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {images.map((image, index) => (
          <motion.button
            key={index}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedIndex(index)}
            className="relative aspect-square overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <OptimizedImage
              src={image.src}
              alt={image.alt}
              className="w-full h-full"
              objectFit="cover"
            />
          </motion.button>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedIndex !== null && images[selectedIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedIndex(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          >
            <motion.img
              key={selectedIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={images[selectedIndex]?.src}
              alt={images[selectedIndex]?.alt || ''}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default {
  OptimizedImage,
  Avatar,
  TokenIcon,
  VideoPlayer,
  BackgroundVideo,
  ImageGallery,
};
