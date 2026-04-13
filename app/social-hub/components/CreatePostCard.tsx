'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ImageIcon, MapPin, Send, Smile, Video } from 'lucide-react';

export function CreatePostCard({ onPost }: { onPost: (content: string) => void }) {
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = () => {
    if (content.trim()) {
      onPost(content);
      setContent('');
      setIsFocused(false);
    }
  };

  return (
    <motion.div
      layout
      className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-700 rounded-2xl p-4 ring-effect"
    >
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-violet-400 flex items-center justify-center text-lg">
          ✨
        </div>
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) =>  setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
           
            className="w-full bg-transparent text-zinc-50  resize-none outline-none min-h-15"
            rows={isFocused ? 3 : 1}
          />
          
          <AnimatePresence>
            {isFocused && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between pt-3 border-t border-zinc-700 mt-3"
              >
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-cyan-400">
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-violet-400">
                    <Video className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-pink-400">
                    <Smile className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-emerald-500">
                    <MapPin className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${content.length > 280 ? 'text-red-400' : 'text-zinc-500'}`}>
                    {content.length}/280
                  </span>
                  <button
                    onClick={handleSubmit}
                    disabled={!content.trim() || content.length > 280}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-violet-400 text-zinc-950 font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Post
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
