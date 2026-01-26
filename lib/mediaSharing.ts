/**
 * Media Sharing System
 * Handle file uploads, image sharing, and media attachments in messages
 */

export interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  name: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
  uploadedAt: number;
  uploadedBy: string;
  messageId?: string;
  conversationId?: string;
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
  attachment?: MediaAttachment;
}

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
  audio: 20 * 1024 * 1024, // 20MB
  file: 50 * 1024 * 1024, // 50MB
};

// Allowed file types
export const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
  file: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip',
  ],
};

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Get file type category
  const category = getFileCategory(file.type);
  
  if (!category) {
    return {
      valid: false,
      error: 'File type not supported',
    };
  }

  // Check if file type is allowed
  const allowedTypes = ALLOWED_FILE_TYPES[category];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }

  // Check file size
  const maxSize = FILE_SIZE_LIMITS[category];
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${formatFileSize(maxSize)}`,
    };
  }

  return { valid: true };
}

/**
 * Get file category from MIME type
 */
export function getFileCategory(mimeType: string): keyof typeof ALLOWED_FILE_TYPES | null {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'file';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Generate thumbnail for image
 */
export async function generateThumbnail(
  file: File,
  maxWidth: number = 200,
  maxHeight: number = 200
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };

    img.onerror = reject;
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

/**
 * Upload file (in production, upload to IPFS or cloud storage)
 */
export async function uploadFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<MediaAttachment> {
  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // In production, this would upload to IPFS or cloud storage
  // For now, use data URLs for demo
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const url = e.target?.result as string;
        
        // Generate thumbnail for images
        let thumbnailUrl: string | undefined;
        if (file.type.startsWith('image/')) {
          thumbnailUrl = await generateThumbnail(file);
        }

        const attachment: MediaAttachment = {
          id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: getFileCategory(file.type) || 'file',
          name: file.name,
          size: file.size,
          url,
          thumbnailUrl,
          mimeType: file.type,
          uploadedAt: Date.now(),
          uploadedBy: '', // Will be set by caller
        };

        resolve(attachment);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));

    // Simulate progress
    if (onProgress) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        onProgress(progress);
        if (progress >= 90) clearInterval(interval);
      }, 100);
    }

    reader.readAsDataURL(file);
  });
}

/**
 * Upload multiple files
 */
export async function uploadFiles(
  files: File[],
  onProgress?: (fileIndex: number, progress: number) => void
): Promise<MediaAttachment[]> {
  const attachments: MediaAttachment[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) continue;
    const attachment = await uploadFile(file, (progress) => {
      if (onProgress) {
        onProgress(i, progress);
      }
    });
    attachments.push(attachment);
  }

  return attachments;
}

/**
 * Download media attachment
 */
export function downloadAttachment(attachment: MediaAttachment): void {
  const link = document.createElement('a');
  link.href = attachment.url;
  link.download = attachment.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Get media icon based on type
 */
export function getMediaIcon(type: MediaAttachment['type']): string {
  const icons = {
    image: '🖼️',
    video: '🎥',
    audio: '🎵',
    file: '📄',
  };
  return icons[type];
}

/**
 * React hook for media upload
 */
export function useMediaUpload() {
  const [uploads, setUploads] = React.useState<Map<string, UploadProgress>>(new Map());
  const [isUploading, setIsUploading] = React.useState(false);

  const handleUploadFile = React.useCallback(async (file: File, userAddress: string): Promise<MediaAttachment> => {
    const uploadId = `upload_${Date.now()}_${Math.random()}`;
    
    // Add to uploads map
    setUploads((prev) => {
      const next = new Map(prev);
      next.set(uploadId, {
        file,
        progress: 0,
        status: 'uploading',
      });
      return next;
    });

    setIsUploading(true);

    try {
      const onProgressCallback = (progress: number): void => {
        setUploads((prev) => {
          const next = new Map(prev);
          const upload = next.get(uploadId);
          if (upload) {
            next.set(uploadId, {
              ...upload,
              progress,
            });
          }
          return next;
        });
      };

      const attachment: MediaAttachment = await (async function() {
        return uploadFile(file, onProgressCallback);
      })();

      // Set uploader
      attachment.uploadedBy = userAddress;

      // Mark as completed
      setUploads((prev) => {
        const next = new Map(prev);
        next.set(uploadId, {
          file,
          progress: 100,
          status: 'completed',
          attachment,
        });
        return next;
      });

      return attachment;
    } catch (error: unknown) {
      // Mark as failed
      setUploads((prev) => {
        const next = new Map(prev);
        next.set(uploadId, {
          file,
          progress: 0,
          status: 'failed',
          error: error.message,
        });
        return next;
      });

      throw error;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const clearUpload = React.useCallback((uploadId: string) => {
    setUploads((prev) => {
      const next = new Map(prev);
      next.delete(uploadId);
      return next;
    });
  }, []);

  const clearCompleted = React.useCallback(() => {
    setUploads((prev) => {
      const next = new Map(prev);
      for (const [id, upload] of next) {
        if (upload.status === 'completed' || upload.status === 'failed') {
          next.delete(id);
        }
      }
      return next;
    });
  }, []);

  return {
    uploads: Array.from(uploads.entries()).map(([id, upload]) => ({ id, ...upload })),
    isUploading,
    uploadFile: handleUploadFile,
    clearUpload,
    clearCompleted,
  };
}

/**
 * Storage for media attachments
 */
export const mediaStorage = {
  save(conversationId: string, attachments: MediaAttachment[]): void {
    const key = `vfide_media_${conversationId}`;
    localStorage.setItem(key, JSON.stringify(attachments));
  },

  load(conversationId: string): MediaAttachment[] {
    const key = `vfide_media_${conversationId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  },

  add(conversationId: string, attachment: MediaAttachment): void {
    const existing = this.load(conversationId);
    existing.push(attachment);
    this.save(conversationId, existing);
  },

  remove(conversationId: string, attachmentId: string): void {
    const existing = this.load(conversationId);
    const filtered = existing.filter((a) => a.id !== attachmentId);
    this.save(conversationId, filtered);
  },

  clear(conversationId: string): void {
    const key = `vfide_media_${conversationId}`;
    localStorage.removeItem(key);
  },
};

// For React hook
import * as React from 'react';
