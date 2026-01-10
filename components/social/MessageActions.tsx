/**
 * Message Actions Component
 * 
 * Provides edit, delete, copy, and other actions for messages.
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Reply,
  Forward,
  Flag,
  Check,
  X,
} from 'lucide-react';
import { Message } from '@/types/messaging';

interface MessageActionsProps {
  message: Message;
  isOwnMessage: boolean;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onCopy?: (content: string) => void;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onReport?: (messageId: string) => void;
}

export function MessageActions({
  message,
  isOwnMessage,
  onEdit,
  onDelete,
  onCopy,
  onReply,
  onForward,
  onReport,
}: MessageActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.decryptedContent || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleEdit = () => {
    setIsEditing(true);
    setIsOpen(false);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && onEdit) {
      onEdit(message.id, editContent.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(message.decryptedContent || '');
    setIsEditing(false);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
    setIsOpen(false);
  };

  const confirmDelete = () => {
    if (onDelete) {
      onDelete(message.id);
    }
    setShowDeleteConfirm(false);
  };

  const handleCopy = () => {
    if (onCopy && message.decryptedContent) {
      onCopy(message.decryptedContent);
      setIsOpen(false);
    }
  };

  // If message is deleted, show deleted state
  if (message.deletedAt) {
    return (
      <div className="text-gray-500 italic text-sm">
        This message was deleted
      </div>
    );
  }

  // If editing mode
  if (isEditing) {
    return (
      <div className="flex flex-col gap-2">
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full p-2 bg-[#1A1A1F] border border-[#2A2A2F] rounded-lg text-white resize-none focus:outline-none focus:border-blue-500"
          rows={3}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSaveEdit();
            } else if (e.key === 'Escape') {
              handleCancelEdit();
            }
          }}
        />
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <button
            onClick={handleSaveEdit}
            className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            <Check className="w-3 h-3" />
            Save
          </button>
          <button
            onClick={handleCancelEdit}
            className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
          >
            <X className="w-3 h-3" />
            Cancel
          </button>
          <span className="ml-2 text-gray-500">
            Press Enter to save, Esc to cancel
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-[#2A2A2F] rounded transition-all"
          aria-label="Message actions"
        >
          <MoreVertical className="w-4 h-4 text-gray-400" />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className={`absolute ${
                isOwnMessage ? 'right-0' : 'left-0'
              } top-8 z-50 w-48 bg-[#1A1A1F] border border-[#2A2A2F] rounded-lg shadow-xl overflow-hidden`}
            >
              <div className="py-1">
                {isOwnMessage && onEdit && (
                  <button
                    onClick={handleEdit}
                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[#2A2A2F] text-white transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-blue-400" />
                    <span>Edit Message</span>
                  </button>
                )}

                {onCopy && (
                  <button
                    onClick={handleCopy}
                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[#2A2A2F] text-white transition-colors"
                  >
                    <Copy className="w-4 h-4 text-gray-400" />
                    <span>Copy Text</span>
                  </button>
                )}

                {onReply && (
                  <button
                    onClick={() => {
                      onReply(message);
                      setIsOpen(false);
                    }}
                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[#2A2A2F] text-white transition-colors"
                  >
                    <Reply className="w-4 h-4 text-gray-400" />
                    <span>Reply</span>
                  </button>
                )}

                {onForward && (
                  <button
                    onClick={() => {
                      onForward(message);
                      setIsOpen(false);
                    }}
                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[#2A2A2F] text-white transition-colors"
                  >
                    <Forward className="w-4 h-4 text-gray-400" />
                    <span>Forward</span>
                  </button>
                )}

                {onReport && !isOwnMessage && (
                  <>
                    <div className="my-1 border-t border-[#2A2A2F]" />
                    <button
                      onClick={() => {
                        onReport(message.id);
                        setIsOpen(false);
                      }}
                      className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[#2A2A2F] text-yellow-400 transition-colors"
                    >
                      <Flag className="w-4 h-4" />
                      <span>Report</span>
                    </button>
                  </>
                )}

                {isOwnMessage && onDelete && (
                  <>
                    <div className="my-1 border-t border-[#2A2A2F]" />
                    <button
                      onClick={handleDelete}
                      className="w-full px-4 py-2 flex items-center gap-3 hover:bg-red-900/20 text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Message</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-6 max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-2">
                Delete Message?
              </h3>
              <p className="text-gray-400 mb-6">
                This message will be deleted for everyone in the conversation. This action cannot be undone.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Edited Indicator
 * Shows when a message has been edited
 */
export function EditedIndicator({ editedAt }: { editedAt?: number }) {
  if (!editedAt) return null;

  return (
    <span className="text-xs text-gray-500 ml-2" title={new Date(editedAt).toLocaleString()}>
      (edited)
    </span>
  );
}
