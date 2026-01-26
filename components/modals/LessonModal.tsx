'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X, Clock, CheckCircle, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

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
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-zinc-900 border-zinc-700 text-zinc-100">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-zinc-100 mb-2">
                {lesson.title}
              </DialogTitle>
              <DialogDescription className="text-zinc-400 text-base">
                {lesson.description}
              </DialogDescription>
              <div className="flex items-center gap-2 mt-3 text-cyan-400">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">{lesson.duration}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-100 transition-colors"
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
              className="bg-zinc-800 rounded-xl p-6 border border-zinc-700"
            >
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-zinc-100">{section.heading}</h3>
              </div>
              <p className="text-zinc-400 mb-4 leading-relaxed">{section.content}</p>
              {section.points && section.points.length > 0 && (
                <ul className="space-y-2">
                  {section.points.map((point, pointIdx) => (
                    <li key={pointIdx} className="flex items-start gap-2 text-zinc-400">
                      <CheckCircle className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          ))}

          {/* Key Takeaways */}
          <div className="bg-linear-to-br from-cyan-400/10 to-emerald-400/10 rounded-xl p-6 border border-cyan-400/30">
            <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Key Takeaways
            </h3>
            <ul className="space-y-2">
              {lesson.keyTakeaways.map((takeaway, idx) => (
                <li key={idx} className="flex items-start gap-2 text-zinc-100">
                  <span className="text-cyan-400 font-bold mt-1">{idx + 1}.</span>
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-linear-to-r from-cyan-400 to-emerald-400 text-zinc-900 font-bold rounded-xl hover:opacity-90 transition-opacity"
            >
              Complete Lesson
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
