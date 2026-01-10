"use client";

import { useState } from "react";

interface InfoTooltipProps {
  content: string;
  children?: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

export function InfoTooltip({ content, children, position = "top" }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="inline-flex items-center justify-center w-5 h-5 rounded-full border-2 border-[#00F0FF] text-[#00F0FF] text-xs font-bold hover:bg-[#00F0FF] hover:text-[#1A1A1D] transition-all cursor-help"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        aria-label="More information"
      >
        {children || "?"}
      </button>
      
      {isVisible && (
        <div
          className={`absolute z-50 px-4 py-3 bg-[#2A2A2F] border-2 border-[#00F0FF] rounded-lg shadow-lg w-[calc(100vw-2rem)] min-w-62.5 max-w-87.5 sm:w-auto ${positionClasses[position]}`}
          role="tooltip"
        >
          <div className="text-sm text-[#F5F3E8] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            {content}
          </div>
          {/* Tooltip arrow */}
          <div
            className={`absolute w-3 h-3 bg-[#2A2A2F] border-[#00F0FF] transform rotate-45 ${
              position === "bottom"
                ? "-bottom-1.75 left-1/2 -translate-x-1/2 border-b-2 border-r-2"
                : position === "top"
                ? "-top-1.75 left-1/2 -translate-x-1/2 border-t-2 border-l-2"
                : position === "right"
                ? "-right-1.75 top-1/2 -translate-y-1/2 border-t-2 border-r-2"
                : "-left-1.75 top-1/2 -translate-y-1/2 border-b-2 border-l-2"
            }`}
          />
        </div>
      )}
    </div>
  );
}
