import React, { useState } from 'react';
import { MediaAttachment, formatFileSize, downloadAttachment } from '@/lib/mediaSharing';

interface MediaGalleryProps {
  attachments: MediaAttachment[];
  maxDisplay?: number;
}

export default function MediaGallery({ attachments, maxDisplay = 4 }: MediaGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (attachments.length === 0) return null;

  const displayAttachments = attachments.slice(0, maxDisplay);
  const remainingCount = attachments.length - maxDisplay;

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % attachments.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + attachments.length) % attachments.length);
  };

  const getFileIcon = (attachment: MediaAttachment) => {
    if (attachment.type === 'image') return '🖼️';
    if (attachment.type === 'video') return '🎥';
    if (attachment.type === 'audio') return '🎵';
    if (attachment.mimeType?.includes('pdf')) return '📄';
    if (attachment.mimeType?.includes('zip') || attachment.mimeType?.includes('rar')) return '📦';
    return '📎';
  };

  const currentAttachment = attachments[currentIndex];

  return (
    <>
      {/* Gallery Grid */}
      <div
        className={`grid gap-1 mt-2 ${
          displayAttachments.length === 1
            ? 'grid-cols-1'
            : displayAttachments.length === 2
            ? 'grid-cols-2'
            : 'grid-cols-2'
        }`}
      >
        {displayAttachments.map((attachment, index) => (
          <div
            key={attachment.id}
            className="relative aspect-square bg-black rounded-lg overflow-hidden cursor-pointer group"
            onClick={() => openLightbox(index)}
          >
            {attachment.type === 'image' ? (
              <img
                src={attachment.thumbnailUrl || attachment.url}
                alt={attachment.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : attachment.type === 'video' ? (
              <>
                <video
                  src={attachment.url}
                  className="w-full h-full object-cover"
                  preload="metadata"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                    <div className="w-0 h-0 border-l-8 border-l-black border-y-6 border-y-transparent ml-1" />
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 p-4">
                <span className="text-4xl mb-2">{getFileIcon(attachment)}</span>
                <p className="text-xs text-white text-center truncate w-full">
                  {attachment.name}
                </p>
                <p className="text-xs text-gray-400">{formatFileSize(attachment.size)}</p>
              </div>
            )}

            {/* Remaining count overlay */}
            {index === maxDisplay - 1 && remainingCount > 0 && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">+{remainingCount}</span>
              </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-white text-xs truncate">{attachment.name}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white text-3xl w-12 h-12 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors z-10"
          >
            ✕
          </button>

          {/* Navigation Arrows */}
          {attachments.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 text-white text-4xl w-12 h-12 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors z-10"
              >
                ‹
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 text-white text-4xl w-12 h-12 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors z-10"
              >
                ›
              </button>
            </>
          )}

          {/* Content */}
          <div className="max-w-6xl max-h-[90vh] w-full flex flex-col items-center">
            {currentAttachment.type === 'image' ? (
              <img
                src={currentAttachment.url}
                alt={currentAttachment.name}
                className="max-w-full max-h-[75vh] object-contain"
              />
            ) : currentAttachment.type === 'video' ? (
              <video
                src={currentAttachment.url}
                controls
                autoPlay
                className="max-w-full max-h-[75vh]"
              />
            ) : currentAttachment.type === 'audio' ? (
              <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md">
                <div className="text-6xl text-center mb-4">🎵</div>
                <p className="text-white text-center mb-4">{currentAttachment.name}</p>
                <audio src={currentAttachment.url} controls className="w-full" />
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md text-center">
                <div className="text-6xl mb-4">{getFileIcon(currentAttachment)}</div>
                <p className="text-white text-lg mb-2">{currentAttachment.name}</p>
                <p className="text-gray-400 mb-6">{formatFileSize(currentAttachment.size)}</p>
                <button
                  onClick={() => downloadAttachment(currentAttachment)}
                  className="px-6 py-3 bg-[#00F0FF] text-black font-semibold rounded-lg hover:bg-[#00F0FF]/80 transition-colors"
                >
                  Download File
                </button>
              </div>
            )}

            {/* Info Bar */}
            <div className="mt-4 bg-black/50 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-8">
                <div className="flex-1">
                  <p className="text-white font-medium">{currentAttachment.name}</p>
                  <p className="text-gray-400 text-sm">
                    {formatFileSize(currentAttachment.size)} • {currentAttachment.mimeType}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadAttachment(currentAttachment)}
                    className="px-4 py-2 bg-[#00F0FF] text-black font-semibold rounded-lg hover:bg-[#00F0FF]/80 transition-colors"
                  >
                    Download
                  </button>
                </div>
              </div>

              {/* Counter */}
              {attachments.length > 1 && (
                <p className="text-gray-400 text-sm text-center mt-2">
                  {currentIndex + 1} / {attachments.length}
                </p>
              )}
            </div>
          </div>

          {/* Keyboard hint */}
          {attachments.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-gray-400 text-sm">
              Use arrow keys to navigate
            </div>
          )}
        </div>
      )}
    </>
  );
}
