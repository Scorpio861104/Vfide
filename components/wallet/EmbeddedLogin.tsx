'use client';

import React from 'react';

export interface EmbeddedLoginProps {
  showSocial?: boolean;
  showEmail?: boolean;
  showSMS?: boolean;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export function EmbeddedLogin({ className = '' }: EmbeddedLoginProps) {
  return (
    <div className={`rounded-xl border border-amber-300/30 bg-amber-50/60 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200 ${className}`}>
      Embedded wallet email/social login is disabled until a production wallet provider is fully integrated and audited.
    </div>
  );
}

export default EmbeddedLogin;
