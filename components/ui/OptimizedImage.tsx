'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Optimized image component with automatic loading states and error handling
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  fill = false,
  sizes,
  quality = 75,
  placeholder,
  blurDataURL,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <div 
        className={`bg-zinc-800 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span className="text-zinc-500 text-sm">Failed to load</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={fill ? undefined : { width, height }}>
      {isLoading && (
        <Skeleton 
          width={width} 
          height={height}
          className={fill ? 'absolute inset-0' : ''}
        />
      )}
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        sizes={sizes}
        quality={quality}
        priority={priority}
       
        blurDataURL={blurDataURL}
        onLoad={handleLoad}
        onError={handleError}
        className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 ${className}`}
      />
    </div>
  );
}

/**
 * Avatar image with automatic fallback
 */
export function AvatarImage({
  src,
  alt,
  size = 40,
  fallback,
}: {
  src?: string;
  alt: string;
  size?: number;
  fallback?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className="rounded-full bg-gradient-to-br from-cyan-400 to-violet-400 flex items-center justify-center text-white font-semibold"
        style={{ width: size, height: size, fontSize: size / 2.5 }}
      >
        {fallback || alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="rounded-full object-cover"
      onError={() => setHasError(true)}
    />
  );
}

/**
 * Badge/Achievement image with fallback icon
 */
export function BadgeImage({
  src,
  alt,
  size = 48,
  icon,
}: {
  src?: string;
  alt: string;
  size?: number;
  icon?: React.ReactNode;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className="rounded-full bg-zinc-800 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {icon || <span className="text-zinc-500">🏆</span>}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="rounded-full"
      onError={() => setHasError(true)}
    />
  );
}

/**
 * NFT/Asset image with aspect ratio preservation
 */
export function AssetImage({
  src,
  alt,
  aspectRatio = '1/1',
  className = '',
}: {
  src: string;
  alt: string;
  aspectRatio?: string;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio }}>
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-cover"
      />
    </div>
  );
}
