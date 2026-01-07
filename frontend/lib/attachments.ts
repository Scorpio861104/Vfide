/**
 * Attachments System
 * 
 * File upload, download, and management for message attachments.
 */

import { useState, useCallback } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export enum AttachmentType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  OTHER = 'other',
}

export interface Attachment {
  id: string;
  messageId: string;
  type: AttachmentType;
  name: string;
  size: number;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  uploadedAt: number;
  uploadedBy: string;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  loaded: number;
  total: number;
  percentage: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

// ============================================================================
// File Validation
// ============================================================================

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_FILES_PER_MESSAGE = 10;

export const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ],
};

/**
 * Get attachment type from MIME type
 */
export function getAttachmentType(mimeType: string): AttachmentType {
  if (ALLOWED_MIME_TYPES.image.includes(mimeType)) return AttachmentType.IMAGE;
  if (ALLOWED_MIME_TYPES.video.includes(mimeType)) return AttachmentType.VIDEO;
  if (ALLOWED_MIME_TYPES.audio.includes(mimeType)) return AttachmentType.AUDIO;
  if (ALLOWED_MIME_TYPES.document.includes(mimeType)) return AttachmentType.DOCUMENT;
  return AttachmentType.OTHER;
}

/**
 * Validate file
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  const type = getAttachmentType(file.type);
  let maxSize = MAX_FILE_SIZE;

  if (type === AttachmentType.IMAGE) {
    maxSize = MAX_IMAGE_SIZE;
  } else if (type === AttachmentType.VIDEO) {
    maxSize = MAX_VIDEO_SIZE;
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${formatFileSize(maxSize)}`,
    };
  }

  // Check MIME type
  const allAllowedTypes = Object.values(ALLOWED_MIME_TYPES).flat();
  if (!allAllowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'File type not supported',
    };
  }

  return { valid: true };
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file extension
 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Get file icon based on type
 */
export function getFileIcon(attachment: Attachment): string {
  switch (attachment.type) {
    case AttachmentType.IMAGE:
      return '🖼️';
    case AttachmentType.VIDEO:
      return '🎥';
    case AttachmentType.AUDIO:
      return '🎵';
    case AttachmentType.DOCUMENT:
      const ext = getFileExtension(attachment.name);
      if (ext === 'pdf') return '📄';
      if (['doc', 'docx'].includes(ext)) return '📝';
      if (['xls', 'xlsx'].includes(ext)) return '📊';
      if (['ppt', 'pptx'].includes(ext)) return '📽️';
      return '📄';
    default:
      return '📎';
  }
}

// ============================================================================
// File Upload
// ============================================================================

/**
 * Upload file with progress tracking
 */
export async function uploadFile(
  file: File,
  messageId: string,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<Attachment> {
  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create form data
  const formData = new FormData();
  formData.append('file', file);
  formData.append('messageId', messageId);
  formData.append('userId', userId);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({
          fileId,
          fileName: file.name,
          loaded: e.loaded,
          total: e.total,
          percentage: Math.round((e.loaded / e.total) * 100),
          status: 'uploading',
        });
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            if (onProgress) {
              onProgress({
                fileId,
                fileName: file.name,
                loaded: file.size,
                total: file.size,
                percentage: 100,
                status: 'complete',
              });
            }
            resolve(response.attachment);
          } else {
            reject(new Error(response.error || 'Upload failed'));
          }
        } catch (error) {
          reject(new Error('Failed to parse response'));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      if (onProgress) {
        onProgress({
          fileId,
          fileName: file.name,
          loaded: 0,
          total: file.size,
          percentage: 0,
          status: 'error',
          error: 'Upload failed',
        });
      }
      reject(new Error('Upload failed'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    // Send request
    xhr.open('POST', '/api/attachments/upload');
    xhr.send(formData);
  });
}

/**
 * Upload multiple files
 */
export async function uploadFiles(
  files: File[],
  messageId: string,
  userId: string,
  onProgress?: (fileId: string, progress: UploadProgress) => void
): Promise<Attachment[]> {
  if (files.length > MAX_FILES_PER_MESSAGE) {
    throw new Error(`Maximum ${MAX_FILES_PER_MESSAGE} files allowed per message`);
  }

  const uploads = files.map((file) =>
    uploadFile(file, messageId, userId, (progress) => {
      if (onProgress) {
        onProgress(progress.fileId, progress);
      }
    })
  );

  return Promise.all(uploads);
}

// ============================================================================
// Image Processing
// ============================================================================

/**
 * Create image thumbnail
 */
export async function createThumbnail(
  file: File,
  maxWidth: number = 300,
  maxHeight: number = 300
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate dimensions
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create thumbnail'));
          }
        },
        'image/jpeg',
        0.8
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook for file uploads with progress tracking
 */
export function useFileUpload(messageId: string, userId: string) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Map<string, UploadProgress>>(new Map());
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (files: File[]) => {
      setUploading(true);
      setError(null);

      try {
        const uploaded = await uploadFiles(
          files,
          messageId,
          userId,
          (fileId, fileProgress) => {
            setProgress((prev) => new Map(prev).set(fileId, fileProgress));
          }
        );

        setAttachments((prev) => [...prev, ...uploaded]);
        return uploaded;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setError(message);
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [messageId, userId]
  );

  const remove = useCallback((attachmentId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  }, []);

  const clear = useCallback(() => {
    setAttachments([]);
    setProgress(new Map());
    setError(null);
  }, []);

  return {
    uploading,
    progress: Array.from(progress.values()),
    attachments,
    error,
    upload,
    remove,
    clear,
  };
}

/**
 * Hook for drag and drop file uploads
 */
export function useFileDrop(onDrop: (files: File[]) => void) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onDrop(files);
      }
    },
    [onDrop]
  );

  return {
    isDragging,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  };
}
