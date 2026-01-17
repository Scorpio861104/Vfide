"use client";

import { useState, useEffect } from "react";
import { useSafeTimeout } from '@/hooks/useMemoryLeak';

interface TypewriterTextProps {
  texts: string[];
  className?: string;
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
}

export function TypewriterText({
  texts,
  className = "",
  typingSpeed = 100,
  deletingSpeed = 50,
  pauseDuration = 2000,
}: TypewriterTextProps) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const safeTimeout = useSafeTimeout();

  useEffect(() => {
    const currentText = texts[currentIndex] ?? '';

    if (!isDeleting && displayText === currentText) {
      // Pause before deleting
      safeTimeout(() => setIsDeleting(true), pauseDuration);
      return;
    }

    if (isDeleting && displayText === "") {
      // Move to next text
      safeTimeout(() => {
        setIsDeleting(false);
        setCurrentIndex((prev) => (prev + 1) % texts.length);
      }, 0);
      return;
    }

    safeTimeout(
      () => {
        setDisplayText(
          isDeleting
            ? currentText.substring(0, displayText.length - 1)
            : currentText.substring(0, displayText.length + 1)
        );
      },
      isDeleting ? deletingSpeed : typingSpeed
    );
  }, [displayText, isDeleting, currentIndex, texts, typingSpeed, deletingSpeed, pauseDuration, safeTimeout]);

  return (
    <span className={className}>
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  );
}
