'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type TabTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active: boolean;
  children: ReactNode;
};

export function TabTrigger({ active, children, className, type = 'button', ...props }: TabTriggerProps) {
  return (
    <button type={type} role="tab" aria-selected={active} className={className} {...props}>
      {children}
    </button>
  );
}