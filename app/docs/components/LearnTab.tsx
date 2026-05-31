'use client';

import { useMemo, useState } from 'react';
import LessonModal from '@/components/modals/LessonModal';
import { lessonContentData } from '@/data/lessonContent';
import { useLocale } from '@/lib/locale/LocaleProvider';

const LEARN_COPY = {
  'en-US': {
    lessonHint: 'Open this lesson to learn the workflow step by step.',
  },
  'es-ES': {
    lessonHint: 'Abre esta lección para aprender el flujo paso a paso.',
  },
};

export function LearnTab() {
  const lessons = useMemo(() => Object.values(lessonContentData ?? {}), []);
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);
  const { locale } = useLocale();
  const copy = (LEARN_COPY as Record<string, typeof LEARN_COPY['en-US']>)[locale] ?? LEARN_COPY['en-US'];

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
            <p className="mt-2 text-sm text-gray-400">{copy.lessonHint}</p>
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
