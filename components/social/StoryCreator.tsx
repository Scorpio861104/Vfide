'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
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
  const [textContent, setTextContent] = useState('');
  const [selectedBackground, setSelectedBackground] = useState(0);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [caption, setCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        STORY_BACKGROUNDS[selectedBackground].gradient,
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#1A1A2E] border border-[#3A3A4F] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#3A3A4F]">
          <h2 className="text-xl font-bold text-[#00F0FF]">Create Story</h2>
          <button
            onClick={onClose}
            className="text-[#A0A0A5] hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#3A3A4F]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex border-b border-[#3A3A4F]">
          <button
            onClick={() => setMode('text')}
            className={`flex-1 py-3 font-semibold transition-colors flex items-center justify-center gap-2 ${
              mode === 'text'
                ? 'bg-[#00F0FF]/10 text-[#00F0FF] border-b-2 border-[#00F0FF]'
                : 'text-[#A0A0A5] hover:text-white'
            }`}
          >
            <Type size={18} />
            Text Story
          </button>
          <button
            onClick={() => setMode('media')}
            className={`flex-1 py-3 font-semibold transition-colors flex items-center justify-center gap-2 ${
              mode === 'media'
                ? 'bg-[#00F0FF]/10 text-[#00F0FF] border-b-2 border-[#00F0FF]'
                : 'text-[#A0A0A5] hover:text-white'
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
                className="aspect-[9/16] max-w-sm mx-auto rounded-xl overflow-hidden flex items-center justify-center p-8"
                style={{ background: STORY_BACKGROUNDS[selectedBackground].gradient }}
              >
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Type your story..."
                  className="w-full h-full bg-transparent text-white text-2xl md:text-3xl font-bold text-center resize-none focus:outline-none placeholder-white/50"
                  maxLength={200}
                />
              </div>

              {/* Character Count */}
              <p className="text-center text-sm text-[#A0A0A5]">
                {textContent.length}/200 characters
              </p>

              {/* Background Selector */}
              <div>
                <p className="text-[#F5F3E8] mb-3 font-semibold">Choose Background</p>
                <div className="grid grid-cols-5 gap-3">
                  {STORY_BACKGROUNDS.map((bg, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedBackground(index)}
                      className={`aspect-square rounded-lg transition-all ${
                        selectedBackground === index
                          ? 'ring-2 ring-[#00F0FF] scale-110'
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
                accept="image/*,video/*"
                onChange={handleMediaSelect}
                className="hidden"
              />

              {/* Media Upload/Preview */}
              {!mediaPreview ? (
                <div
                  className="aspect-[9/16] max-w-sm mx-auto border-2 border-dashed border-[#3A3A4F] rounded-xl flex flex-col items-center justify-center p-8 cursor-pointer hover:border-[#00F0FF] transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="w-16 h-16 text-[#A0A0A5] mb-4" />
                  <p className="text-[#F5F3E8] text-lg mb-2">Add Photo or Video</p>
                  <p className="text-[#A0A0A5] text-sm">Click to browse</p>
                </div>
              ) : (
                <div className="aspect-[9/16] max-w-sm mx-auto rounded-xl overflow-hidden relative">
                  {mediaFile?.type.startsWith('video/') ? (
                    <video src={mediaPreview} className="w-full h-full object-cover" controls />
                  ) : (
                    <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => {
                      setMediaFile(null);
                      setMediaPreview('');
                      setCaption('');
                    }}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Caption Input */}
              {mediaPreview && (
                <div>
                  <label className="block text-[#F5F3E8] mb-2 font-semibold">
                    Add Caption (optional)
                  </label>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a caption..."
                    className="w-full px-4 py-3 bg-[#0A0A0F] border border-[#3A3A4F] rounded-lg text-[#F5F3E8] placeholder-[#6B6B78] focus:border-[#00F0FF] focus:outline-none"
                    maxLength={100}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#3A3A4F] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-[#3A3A4F] text-[#A0A0A5] rounded-lg font-semibold hover:bg-[#3A3A4F]/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={(mode === 'text' && !textContent.trim()) || (mode === 'media' && !mediaPreview)}
            className="flex-1 py-3 bg-[#00F0FF] text-[#0A0A0F] rounded-lg font-semibold hover:bg-[#00D9E8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Share Story
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default StoryCreator;
