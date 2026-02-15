/**
 * Attachment Viewer Component
 * 
 * Display and preview message attachments with download functionality.
 */

'use client';

import {
    Attachment,
    AttachmentType,
    formatFileSize
} from '@/lib/attachments';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Download,
    ExternalLink,
    File,
    FileText,
    Image as ImageIcon,
    Maximize2,
    Music,
    Video,
    X,
} from 'lucide-react';
import React, { useState } from 'react';
import Image from 'next/image';

/** Only allow http(s) URLs to prevent javascript: XSS via user-controlled attachment URLs */
const isSafeUrl = (url: string) => /^https?:\/\//i.test(url);

interface AttachmentViewerProps {
  attachments: Attachment[];
  compact?: boolean;
}

export function AttachmentViewer({ attachments, compact = false }: AttachmentViewerProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const imageAttachments = attachments.filter(a => a.type === AttachmentType.IMAGE);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  if (attachments.length === 0) return null;

  return (
    <>
      <div className={`space-y-2 ${compact ? 'mt-2' : 'mt-3'}`}>
        {attachments.map((attachment, _index) => {
          if (attachment.type === AttachmentType.IMAGE) {
            return (
              <ImageAttachment
                key={attachment.id}
                attachment={attachment}
                compact={compact}
                onClick={() => openLightbox(imageAttachments.findIndex(a => a.id === attachment.id))}
              />
            );
          }

          if (attachment.type === AttachmentType.VIDEO) {
            return (
              <VideoAttachment
                key={attachment.id}
                attachment={attachment}
                compact={compact}
              />
            );
          }

          return (
            <FileAttachment
              key={attachment.id}
              attachment={attachment}
              compact={compact}
            />
          );
        })}
      </div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {lightboxOpen && imageAttachments.length > 0 && (
          <ImageLightbox
            images={imageAttachments}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================================================
// Image Attachment
// ============================================================================

interface ImageAttachmentProps {
  attachment: Attachment;
  compact?: boolean;
  onClick?: () => void;
}

function ImageAttachment({ attachment, compact, onClick }: ImageAttachmentProps) {
  return (
    <div
      onClick={onClick}
      className="relative group cursor-pointer rounded-lg overflow-hidden border border-zinc-800 hover:border-blue-500 transition-colors"
      style={{ maxWidth: compact ? '200px' : '400px' }}
    >
      <Image
        src={isSafeUrl(attachment.url) ? attachment.url : ''}
        alt={attachment.name}
        width={400}
        height={300}
        className="w-full h-auto"
        loading="lazy"
        unoptimized
      />
      
      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isSafeUrl(attachment.url)) window.open(attachment.url, '_blank', 'noopener,noreferrer');
          }}
          className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
        >
          <Download className="w-5 h-5 text-white" />
        </button>
        <button
          className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
        >
          <Maximize2 className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* File info */}
      <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-2">
        <div className="text-white text-xs truncate">{attachment.name}</div>
        <div className="text-gray-300 text-xs">{formatFileSize(attachment.size)}</div>
      </div>
    </div>
  );
}

// ============================================================================
// Video Attachment
// ============================================================================

interface VideoAttachmentProps {
  attachment: Attachment;
  compact?: boolean;
}

function VideoAttachment({ attachment, compact }: VideoAttachmentProps) {
  return (
    <div
      className="rounded-lg overflow-hidden border border-zinc-800"
      style={{ maxWidth: compact ? '300px' : '500px' }}
    >
      <video
        controls
        className="w-full h-auto bg-black"
        preload="metadata"
      >
        <source src={isSafeUrl(attachment.url) ? attachment.url : ''} type={attachment.mimeType} />
        Your browser doesn&apos;t support video playback.
      </video>
      
      <div className="bg-zinc-900 border-t border-zinc-800 p-2 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm truncate">{attachment.name}</div>
          <div className="text-gray-400 text-xs">{formatFileSize(attachment.size)}</div>
        </div>
        <a
          href={isSafeUrl(attachment.url) ? attachment.url : '#'}
          download={attachment.name}
          className="ml-2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

// ============================================================================
// File Attachment
// ============================================================================

interface FileAttachmentProps {
  attachment: Attachment;
  compact?: boolean;
}

function FileAttachment({ attachment, compact: _compact }: FileAttachmentProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center gap-3 hover:border-zinc-700 transition-colors">
      <div className="w-10 h-10 bg-linear-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
        {renderIconComponent(attachment.type, "w-5 h-5 text-blue-400")}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-white font-medium truncate">{attachment.name}</div>
        <div className="text-sm text-gray-400 flex items-center gap-2">
          <span>{formatFileSize(attachment.size)}</span>
          <span className="text-gray-600">•</span>
          <span className="uppercase">{attachment.type}</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <a
          href={isSafeUrl(attachment.url) ? attachment.url : '#'}
          download={attachment.name}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </a>
        <a
          href={isSafeUrl(attachment.url) ? attachment.url : '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"
          title="Open"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

// ============================================================================
// Image Lightbox
// ============================================================================

interface ImageLightboxProps {
  images: Attachment[];
  initialIndex: number;
  onClose: () => void;
}

function ImageLightbox({ images, initialIndex, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentImage = images[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  if (!currentImage) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors z-10"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Image Counter */}
      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg text-white text-sm">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Navigation */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
            className="absolute left-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
          >
            <span className="text-white text-2xl">‹</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
          >
            <span className="text-white text-2xl">›</span>
          </button>
        </>
      )}

      {/* Image */}
      <motion.div
        key={currentImage.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={isSafeUrl(currentImage.url) ? currentImage.url : ''}
          alt={currentImage.name}
          width={800}
          height={600}
          className="max-w-full max-h-[90vh] object-contain"
          unoptimized
        />

        {/* Image Info */}
        <div className="mt-4 text-center">
          <div className="text-white font-medium">{currentImage.name}</div>
          <div className="text-gray-400 text-sm mt-1">
            {formatFileSize(currentImage.size)}
            {currentImage.width && currentImage.height && (
              <span className="ml-2">
                {currentImage.width} × {currentImage.height}
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Download Button */}
      <a
        href={isSafeUrl(currentImage.url) ? currentImage.url : '#'}
        download={currentImage.name}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-4 right-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
      >
        <Download className="w-4 h-4" />
        Download
      </a>
    </motion.div>
  );
}

function renderIconComponent(type: AttachmentType, className: string) {
  switch (type) {
    case AttachmentType.IMAGE:
      return <ImageIcon className={className} />;
    case AttachmentType.VIDEO:
      return <Video className={className} />;
    case AttachmentType.AUDIO:
      return <Music className={className} />;
    case AttachmentType.DOCUMENT:
      return <FileText className={className} />;
    default:
      return <File className={className} />;
  }
}
