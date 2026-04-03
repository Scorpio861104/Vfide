'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original docs page

export function LearnTab() {
  return (
    <div className="space-y-6">
      <motion.div
    key="learn"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    >
    {/* Level Selector */}
    <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-8">
    {(["beginner", "intermediate", "advanced"] as const).map((level) => (
    <button
    key={level}
    onClick={() => setSelectedLevel(level)}
    className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold capitalize transition-all text-sm sm:text-base ${
    selectedLevel === level
    ? level === "beginner" ? "bg-green-600 text-white"
    : level === "intermediate" ? "bg-blue-600 text-white"
    : "bg-purple-600 text-white"
    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
    }`}
    >
    {level}
    </button>
    ))}
    </div>

    <div className="max-w-4xl mx-auto mb-8 p-4 sm:p-5 rounded-xl border border-cyan-400/30 bg-cyan-500/10">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div>
    <div className="text-sm sm:text-base font-semibold text-cyan-300">New to crypto and trading?</div>
    <div className="text-xs sm:text-sm text-zinc-300">Start with Seer Academy for beginner-safe learning and trust-aware trading basics.</div>
    </div>
    <Link
    href="/seer-academy"
    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-cyan-300/40 text-cyan-200 hover:bg-cyan-500/20 transition-colors text-sm"
    >
    Open Seer Academy
    </Link>
    <Link
    href="/seer-service"
    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-300/40 text-emerald-200 hover:bg-emerald-500/20 transition-colors text-sm"
    >
    Open Seer Service Center
    </Link>
    </div>
    </div>

    {/* Lessons */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {lessons.find(l => l.level === selectedLevel)?.items.map((lesson, idx) => (
    <motion.div
    key={lesson.title}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: idx * 0.1 }}
    onClick={() => {
    const lessonContent = lessonContentData[lesson.title];
    if (lessonContent) {
    setSelectedLesson(lessonContent);
    setIsLessonModalOpen(true);
    }
    }}
    className="bg-zinc-800 rounded-xl p-6 border border-zinc-700 hover:border-cyan-400/50 transition-all cursor-pointer group"
    >
    <div className="w-12 h-12 mb-4 flex items-center justify-center bg-cyan-400/10 rounded-lg border border-cyan-400/30">
    <Book className="w-6 h-6 text-cyan-400" />
    </div>
    <h3 className="text-lg font-bold text-zinc-100 mb-2 group-hover:text-cyan-400 transition-colors">
    {lesson.title}
    </h3>
    <p className="text-zinc-400 text-sm mb-3">{lesson.description}</p>
    <div className="flex items-center gap-1 text-xs text-cyan-400">
    <Clock className="w-3 h-3" />
    <span>{lesson.duration}</span>
    </div>
    </motion.div>
    ))}
    </div>
    </motion.div>
    </div>
  );
}
