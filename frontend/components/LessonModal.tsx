"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X, Clock, CheckCircle, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface LessonContent {
  title: string;
  duration: string;
  description: string;
  sections: {
    heading: string;
    content: string;
    points?: string[];
  }[];
  keyTakeaways: string[];
}

interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: LessonContent | null;
}

export default function LessonModal({ isOpen, onClose, lesson }: LessonModalProps) {
  if (!lesson) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-[#1A1A1D] border-[#3A3A3F] text-[#F5F3E8]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-[#F5F3E8] mb-2">
                {lesson.title}
              </DialogTitle>
              <DialogDescription className="text-[#A0A0A5] text-base">
                {lesson.description}
              </DialogDescription>
              <div className="flex items-center gap-2 mt-3 text-[#00F0FF]">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">{lesson.duration}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[#A0A0A5] hover:text-[#F5F3E8] transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Lesson Sections */}
          {lesson.sections.map((section, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-[#2A2A2F] rounded-xl p-6 border border-[#3A3A3F]"
            >
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-[#00F0FF]" />
                <h3 className="text-lg font-bold text-[#F5F3E8]">{section.heading}</h3>
              </div>
              <p className="text-[#A0A0A5] mb-4 leading-relaxed">{section.content}</p>
              {section.points && section.points.length > 0 && (
                <ul className="space-y-2">
                  {section.points.map((point, pointIdx) => (
                    <li key={pointIdx} className="flex items-start gap-2 text-[#A0A0A5]">
                      <CheckCircle className="w-4 h-4 text-[#00FF88] mt-1 flex-shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          ))}

          {/* Key Takeaways */}
          <div className="bg-gradient-to-br from-[#00F0FF]/10 to-[#00FF88]/10 rounded-xl p-6 border border-[#00F0FF]/30">
            <h3 className="text-lg font-bold text-[#00F0FF] mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Key Takeaways
            </h3>
            <ul className="space-y-2">
              {lesson.keyTakeaways.map((takeaway, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[#F5F3E8]">
                  <span className="text-[#00F0FF] font-bold mt-1">{idx + 1}.</span>
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-gradient-to-r from-[#00F0FF] to-[#00FF88] text-[#1A1A1D] font-bold rounded-xl hover:opacity-90 transition-opacity"
            >
              Complete Lesson
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
