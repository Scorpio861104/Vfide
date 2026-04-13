'use client';

import Image from 'next/image';
import React, { useState, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { X, Camera, Type, Image as ImageIcon } from 'lucide-react';
import { createTextStory, createMediaStory, STORY_BACKGROUNDS, Story } from '@/lib/storiesSystem';

interface StoryCreatorProps {
  onClose: () => void;
  onCreate: (story: Story) => void;
  userAddress: string;
  userName: string;
  userAvatar?: string;
}

export function StoryCreator({
  onClose,
  onCreate,
  userAddress,
  userName,
  userAvatar,
}: StoryCreatorProps) {
  const [mode, setMode] = useState<'text' | 'media'>('text');
  const shouldReduceMotion = useReducedMotion();
  const [textContent, setTextContent] = useState('');
  const [selectedBackground, setSelectedBackground] = useState(0);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [caption, setCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = new Set([
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ]);

    if (!allowedTypes.has(file.type)) {
      alert('Only PNG, JPEG, WEBP, GIF, MP4, WEBM, and MOV uploads are allowed.');
      return;
    }

    // Validate file size (10MB for images, 100MB for videos)
    const maxSize = file.type.startsWith('video/') ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`);
      return;
    }

    setMediaFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = () => {
    if (mode === 'text') {
      if (!textContent.trim()) {
        alert('Please enter some text');
        return;
      }

      const story = createTextStory(
        userAddress,
        userName,
        textContent,
        STORY_BACKGROUNDS[selectedBackground]?.gradient,
        '#FFFFFF'
      );

      onCreate(story);
    } else {
      if (!mediaPreview) {
        alert('Please select a photo or video');
        return;
      }

      const story = createMediaStory(
        userAddress,
        userName,
        mediaPreview,
        mediaFile?.type.startsWith('video/') ? 'video' : 'image',
        caption,
        userAvatar
      );

      onCreate(story);
    }

    onClose();
  };

  return (
    <motion.div 
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div 
        initial={shouldReduceMotion ? false : { scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={shouldReduceMotion ? { opacity: 1 } : { scale: 0.9, opacity: 0 }}
        className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h2 className="text-xl font-bold text-cyan-400">Create Story</h2>
          <button
            onClick={onClose}
            aria-label="Close story creator"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex border-b border-zinc-700">
          <button
            onClick={() => setMode('text')}
            className={`flex-1 py-3 font-semibold transition-colors flex items-center justify-center gap-2 ${
              mode === 'text'
                ? 'bg-cyan-400/10 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Type size={18} />
            Text Story
          </button>
          <button
            onClick={() => setMode('media')}
            className={`flex-1 py-3 font-semibold transition-colors flex items-center justify-center gap-2 ${
              mode === 'media'
                ? 'bg-cyan-400/10 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Camera size={18} />
            Photo/Video
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {mode === 'text' ? (
            <div className="space-y-6">
              {/* Preview */}
              <div
                className="aspect-9/16 max-w-sm mx-auto rounded-xl overflow-hidden flex items-center justify-center p-8"
                style={{ background: STORY_BACKGROUNDS[selectedBackground]?.gradient }}
              >
                <textarea
                  value={textContent}
                  onChange={(e) =>  setTextContent(e.target.value)}
                 
                  className="w-full h-full bg-transparent text-white text-2xl md:text-3xl font-bold text-center resize-none focus:outline-none "
                  maxLength={200}
                />
              </div>

              {/* Character Count */}
              <p className="text-center text-sm text-zinc-400">
                {textContent.length}/200 characters
              </p>

              {/* Background Selector */}
              <div>
                <p className="text-zinc-100 mb-3 font-semibold">Choose Background</p>
                <div className="grid grid-cols-5 gap-3">
                  {STORY_BACKGROUNDS.map((bg, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedBackground(index)}
                      className={`aspect-square rounded-lg transition-all ${
                        selectedBackground === index
                          ? 'ring-2 ring-cyan-400 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ background: bg.gradient }}
                      title={bg.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                onChange={handleMediaSelect}
                className="hidden"
               aria-label="Upload file" />

              {/* Media Upload/Preview */}
              {!mediaPreview ? (
                <div
                  className="aspect-9/16 max-w-sm mx-auto border-2 border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center p-8 cursor-pointer hover:border-cyan-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="w-16 h-16 text-zinc-400 mb-4" />
                  <p className="text-zinc-100 text-lg mb-2">Add Photo or Video</p>
                  <p className="text-zinc-400 text-sm">Click to browse</p>
                </div>
              ) : (
                <div className="aspect-9/16 max-w-sm mx-auto rounded-xl overflow-hidden relative">
                  {mediaFile?.type.startsWith('video/') ? (
                    <video src={mediaPreview} className="w-full h-full object-cover" controls />
                  ) : (
                    <Image
                      src={mediaPreview}
                      alt="Selected story media preview"
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 100vw, 384px"
                      className="object-cover"
                    />
                  )}
                  <button
                    onClick={() => {
                      setMediaFile(null);
                      setMediaPreview('');
                      setCaption('');
                    }}
                    aria-label="Remove selected media"
                    className="absolute right-2 top-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Caption Input */}
              {mediaPreview && (
                <div>
                  <label className="block text-zinc-100 mb-2 font-semibold">
                    Add Caption (optional)
                  </label>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) =>  setCaption(e.target.value)}
                   
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100  focus:border-cyan-400 focus:outline-none"
                    maxLength={100}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-700 py-3 font-semibold text-zinc-400 transition-colors hover:bg-zinc-700/50 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={(mode === 'text' && !textContent.trim()) || (mode === 'media' && !mediaPreview)}
            className="flex-1 rounded-lg bg-cyan-400 py-3 font-semibold text-zinc-950 transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
          >
            Share Story
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default StoryCreator;
