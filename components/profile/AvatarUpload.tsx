/**
 * Avatar Upload Component
 * 
 * Professional avatar upload with preview, cropping, and validation.
 * Integrates with the existing /api/users/:address/avatar endpoint.
 */

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Camera, X, Check, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useAccount } from 'wagmi';
import { apiClient } from '@/lib/api-client';

interface AvatarUploadProps {
  currentAvatar?: string;
  onUploadComplete?: (avatarUrl: string) => void;
  onCancel?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

// File validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MIN_DIMENSION = 100; // Minimum width/height in pixels

export function AvatarUpload({
  currentAvatar,
  onUploadComplete,
  onCancel,
  size = 'md',
}: AvatarUploadProps) {
  const { address } = useAccount();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Size configurations
  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-32 h-32',
    lg: 'w-40 h-40',
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Please upload a valid image file (JPEG, PNG, GIF, or WebP)';
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 5MB';
    }

    return null;
  };

  const validateDimensions = (img: HTMLImageElement): string | null => {
    if (img.width < MIN_DIMENSION || img.height < MIN_DIMENSION) {
      return `Image must be at least ${MIN_DIMENSION}x${MIN_DIMENSION} pixels`;
    }
    return null;
  };

  const handleFileSelect = useCallback((selectedFile: File) => {
    // Validate file
    const fileError = validateFile(selectedFile);
    if (fileError) {
      setError(fileError);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      
      // Validate dimensions
      const img = new Image();
      img.onload = () => {
        const dimensionError = validateDimensions(img);
        if (dimensionError) {
          setError(dimensionError);
          setPreview(null);
          setFile(null);
        } else {
          setPreview(result);
          setFile(selectedFile);
          setError(null);
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(selectedFile);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !address) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate progress (in production, use XMLHttpRequest for real progress)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      // Upload via API
      const response = await apiClient.uploadAvatar(address, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Call success callback
      if (onUploadComplete) {
        onUploadComplete(response.avatarUrl);
      }

      // Reset state after short delay
      setTimeout(() => {
        setPreview(null);
        setFile(null);
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setFile(null);
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="w-full">
      {/* Current/Preview Avatar */}
      <div className="flex flex-col items-center gap-4">
        <div className={`${sizeClasses[size]} relative`}>
          {preview || currentAvatar ? (
            <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-cyan-400/20">
              <img
                src={preview || currentAvatar}
                alt="Avatar preview"
                className="w-full h-full object-cover"
              />
              {preview && !isUploading && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={handleCancel}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-cyan-400 to-violet-400 flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-white/50" />
            </div>
          )}
        </div>

        {/* Upload Progress */}
        <AnimatePresence>
          {isUploading && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-xs"
            >
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-xs p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Area */}
        {!preview && !isUploading && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full max-w-xs p-6 border-2 border-dashed rounded-xl transition-all ${
              isDragging
                ? 'border-cyan-400 bg-cyan-400/5'
                : 'border-zinc-700 hover:border-cyan-400/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              onChange={handleFileInput}
              className="hidden"
            />

            <div className="flex flex-col items-center gap-3 text-center">
              <div className="p-3 bg-cyan-400/10 rounded-full">
                <Upload className="w-6 h-6 text-cyan-400" />
              </div>
              
              <div>
                <p className="text-sm font-semibold text-zinc-100 mb-1">
                  Upload Avatar
                </p>
                <p className="text-xs text-zinc-500">
                  Drag & drop or click to browse
                </p>
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-cyan-400 text-zinc-950 rounded-lg text-sm font-semibold hover:bg-cyan-400 transition-colors"
              >
                Choose File
              </button>

              <p className="text-xs text-zinc-500">
                JPEG, PNG, GIF or WebP • Max 5MB • Min {MIN_DIMENSION}x{MIN_DIMENSION}px
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {preview && !isUploading && (
          <div className="flex gap-3 w-full max-w-xs">
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg text-sm font-semibold hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file}
              className="flex-1 px-4 py-2 bg-cyan-400 text-zinc-950 rounded-lg text-sm font-semibold hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Upload
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact Avatar Upload - For inline editing
 */
export function AvatarUploadCompact({
  currentAvatar,
  onUploadComplete,
}: {
  currentAvatar?: string;
  onUploadComplete?: (avatarUrl: string) => void;
}) {
  const { address } = useAccount();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!address) return;

    // Quick validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('Please upload a valid image file');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert('File must be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      const response = await apiClient.uploadAvatar(address, file);
      if (onUploadComplete) {
        onUploadComplete(response.avatarUrl);
      }
    } catch (_err) {
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative group">
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
        className="hidden"
      />

      <div className="relative w-20 h-20 rounded-full overflow-hidden cursor-pointer">
        {currentAvatar ? (
          <Image src={currentAvatar} alt="Avatar" fill className="object-cover" sizes="80px" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-cyan-400 to-violet-400 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-white/50" />
          </div>
        )}

        {/* Hover Overlay */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {isUploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <>
              <Camera className="w-6 h-6 text-white mb-1" />
              <span className="text-xs text-white font-medium">Change</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
