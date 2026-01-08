import React, { useState, useRef } from 'react';
import { useMediaUpload, validateFile, formatFileSize, MediaAttachment } from '@/lib/mediaSharing';

interface MediaUploaderProps {
  onUploadComplete: (attachments: MediaAttachment[]) => void;
  onCancel?: () => void;
  maxFiles?: number;
  userAddress: string;
}

export default function MediaUploader({
  onUploadComplete,
  onCancel,
  maxFiles = 10,
  userAddress,
}: MediaUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previews, setPreviews] = useState<{ file: File; preview: string }[]>([]);
  const { uploads, isUploading, uploadFile, clearUpload } = useMediaUpload();

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files).slice(0, maxFiles);
    const validFiles: File[] = [];
    const newPreviews: { file: File; preview: string }[] = [];

    for (const file of fileArray) {
      const validation = validateFile(file);
      if (!validation.valid) {
        alert(`${file.name}: ${validation.error}`);
        continue;
      }

      validFiles.push(file);

      // Create preview for images and videos
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newPreviews.push({ file, preview: e.target?.result as string });
          setPreviews((prev) => [...prev, ...newPreviews]);
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        const videoURL = URL.createObjectURL(file);
        newPreviews.push({ file, preview: videoURL });
        setPreviews((prev) => [...prev, ...newPreviews]);
      } else {
        // For non-media files, use a generic icon
        newPreviews.push({ file, preview: '' });
        setPreviews((prev) => [...prev, ...newPreviews]);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const removeFile = (index: number) => {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    const attachments: MediaAttachment[] = [];

    for (const { file } of previews) {
      try {
        const attachment = await uploadFile(file, userAddress);
        attachments.push(attachment);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }

    onUploadComplete(attachments);
    setPreviews([]);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.startsWith('video/')) return '🎥';
    if (file.type.startsWith('audio/')) return '🎵';
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('zip') || file.type.includes('rar')) return '📦';
    return '📎';
  };

  const uploadsArray = Array.from(uploads.values());
  const uploadProgress = uploadsArray.reduce((sum, u) => sum + u.progress, 0) / (uploadsArray.length || 1);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0A0F] border-2 border-[#00F0FF] rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#00F0FF]/20">
          <h2 className="text-xl font-bold text-[#00F0FF]">Upload Media</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {previews.length === 0 ? (
            // Upload Zone
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
                dragActive
                  ? 'border-[#00F0FF] bg-[#00F0FF]/10'
                  : 'border-gray-600 hover:border-[#00F0FF]/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-6xl mb-4">📁</div>
              <p className="text-xl text-white mb-2">Drop files here or click to browse</p>
              <p className="text-sm text-gray-400">
                Images (10MB), Videos (100MB), Audio (20MB), Files (50MB)
              </p>
              <p className="text-xs text-gray-500 mt-2">Maximum {maxFiles} files</p>
            </div>
          ) : (
            // Preview Grid
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {previews.map((item, index) => {
                  const uploadState = Array.from(uploads.values()).find(
                    (u) => u.file.name === item.file.name
                  );

                  return (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-black rounded-lg overflow-hidden border border-gray-700">
                        {item.preview && item.file.type.startsWith('image/') ? (
                          <img
                            src={item.preview}
                            alt={item.file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : item.preview && item.file.type.startsWith('video/') ? (
                          <video src={item.preview} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-6xl">{getFileIcon(item.file)}</span>
                          </div>
                        )}

                        {/* Upload Progress Overlay */}
                        {uploadState && uploadState.status === 'uploading' && (
                          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-[#00F0FF] text-2xl mb-2">
                                {uploadState.progress}%
                              </div>
                              <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#00F0FF] transition-all"
                                  style={{ width: `${uploadState.progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {uploadState && uploadState.status === 'completed' && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="text-[#50C878] text-4xl">✓</div>
                          </div>
                        )}

                        {uploadState && uploadState.status === 'failed' && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="text-red-500 text-4xl">✕</div>
                          </div>
                        )}
                      </div>

                      {/* File Info */}
                      <div className="mt-2 px-2">
                        <p className="text-sm text-white truncate">{item.file.name}</p>
                        <p className="text-xs text-gray-400">{formatFileSize(item.file.size)}</p>
                      </div>

                      {/* Remove Button */}
                      {!uploadState && (
                        <button
                          onClick={() => removeFile(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add More Button */}
              {previews.length < maxFiles && !isUploading && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-[#00F0FF] hover:text-[#00F0FF] transition-colors"
                >
                  + Add More Files
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {previews.length > 0 && (
          <div className="border-t border-[#00F0FF]/20 p-4 space-y-3">
            {isUploading && (
              <div>
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Uploading...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00F0FF] transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={isUploading}
                className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading || previews.length === 0}
                className="flex-1 px-6 py-3 bg-[#00F0FF] text-black font-semibold rounded-lg hover:bg-[#00F0FF]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUploading ? 'Uploading...' : `Upload ${previews.length} file${previews.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>
    </div>
  );
}
