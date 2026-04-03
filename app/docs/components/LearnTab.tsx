'use client';

import { useMemo, useState } from 'react';
import LessonModal from '@/components/modals/LessonModal';
import { lessonContentData } from '@/data/lessonContent';

export function LearnTab() {
  const lessons = useMemo(() => Object.values(lessonContentData ?? {}), []);
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {lessons.map((lesson: any) => (
          <button
            key={lesson.title}
            onClick={() => setSelectedLesson(lesson)}
            className="rounded-2xl border border-white/10 bg-white/3 p-5 text-left"
          >
            <h3 className="text-lg font-bold text-white">{lesson.title}</h3>
            <p className="mt-2 text-sm text-gray-400">Open this lesson to learn the workflow step by step.</p>
          </button>
        ))}
      </div>

      <LessonModal
        isOpen={Boolean(selectedLesson)}
        lesson={selectedLesson ?? undefined}
        onClose={() => setSelectedLesson(null)}
      />
    </div>
  );
}
