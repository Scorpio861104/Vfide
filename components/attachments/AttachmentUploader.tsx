/**
 * Attachment Uploader Component
 * 
 * UI for uploading files with drag & drop, progress tracking, and previews.
 */

'use client';

import { useAnnounce } from '@/lib/accessibility';
import {
    AttachmentType,
    formatFileSize,
    MAX_FILES_PER_MESSAGE,
    useFileDrop,
    useFileUpload,
    validateFile
} from '@/lib/attachments';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertCircle,
    Check,
    File,
    FileText,
    Image as ImageIcon,
    Music,
    Upload,
    Video,
    X
} from 'lucide-react';
import React, { useRef, useState } from 'react';

interface AttachmentUploaderProps {
  messageId: string;
  userId: string;
  onUploaded?: (attachments: Attachment[]) => void;
}

export function AttachmentUploader({ messageId, userId, onUploaded }: AttachmentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploading: _uploading, progress, attachments, error, upload, remove, clear } = useFileUpload(messageId, userId);
  const { announce } = useAnnounce();
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFiles = async (files: File[]) => {
    setValidationError(null);

    // Validate files
    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        setValidationError(validation.error || 'Invalid file');
        announce(validation.error || 'Invalid file', 'assertive');
        return;
      }
    }

    if (attachments.length + files.length > MAX_FILES_PER_MESSAGE) {
      setValidationError(`Maximum ${MAX_FILES_PER_MESSAGE} files per message`);
      announce(`Maximum ${MAX_FILES_PER_MESSAGE} files per message`, 'assertive');
      return;
    }

    try {
      const uploaded = await upload(files);
      announce(`${uploaded.length} file(s) uploaded`, 'polite');
      if (onUploaded) {
        onUploaded(uploaded);
      }
    } catch (err) {
      console.error('Upload error:', err);
    }
  };

  const { isDragging, dragHandlers } = useFileDrop(handleFiles);

  const handleSelectFiles = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFiles(files);
    }
    // Reset input
    e.target.value = '';
  };

  const handleRemove = (attachmentId: string) => {
    remove(attachmentId);
    announce('Attachment removed', 'polite');
  };

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        {...dragHandlers}
        className={`border-2 border-dashed rounded-lg p-6 transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-900/20'
            : 'border-zinc-800 hover:border-zinc-700'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            isDragging ? 'bg-blue-900/30' : 'bg-zinc-900'
          }`}>
            <Upload className={`w-6 h-6 ${isDragging ? 'text-blue-400' : 'text-gray-400'}`} />
          </div>

          <div className="text-center">
            <p className="text-white font-medium mb-1">
              {isDragging ? 'Drop files here' : 'Upload attachments'}
            </p>
            <p className="text-sm text-gray-400">
              Drag & drop or{' '}
              <button
                onClick={handleSelectFiles}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                browse files
              </button>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Max {MAX_FILES_PER_MESSAGE} files, 50MB each
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          />
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="bg-red-900/20 border border-red-900/30 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{validationError}</p>
        </div>
      )}

      {/* Upload Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-900/30 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Upload Progress */}
      {progress.length > 0 && (
        <div className="space-y-2">
          {progress.map((p) => (
            <div key={p.fileId} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white truncate flex-1">{p.fileName}</span>
                <span className="text-sm text-gray-400 ml-2">{p.percentage}%</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${p.percentage}%` }}
                  className={`h-full ${
                    p.status === 'error'
                      ? 'bg-red-500'
                      : p.status === 'complete'
                      ? 'bg-green-500'
                      : 'bg-blue-500'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Attachments */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">
                Attachments ({attachments.length})
              </span>
              {attachments.length > 0 && (
                <button
                  onClick={clear}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2">
              {attachments.map((attachment) => (
                <AttachmentCard
                  key={attachment.id}
                  attachment={attachment}
                  onRemove={() => handleRemove(attachment.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Attachment Card Component
// ============================================================================

interface AttachmentCardProps {
  attachment: Attachment | File;
  onRemove: () => void;
}

function AttachmentCard({ attachment, onRemove }: AttachmentCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center gap-3 hover:border-zinc-700 transition-colors"
    >
      <div className="w-10 h-10 bg-linear-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
        {renderIconForType(attachment.type, "w-5 h-5 text-blue-400")}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-white font-medium truncate">{attachment.name}</div>
        <div className="text-sm text-gray-400">{formatFileSize(attachment.size)}</div>
      </div>

      <div className="flex items-center gap-2">
        <Check className="w-4 h-4 text-green-400" />
        <button
          onClick={onRemove}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

function renderIconForType(type: AttachmentType, className: string) {
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
