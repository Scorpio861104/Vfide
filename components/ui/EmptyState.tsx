"use client";

import { ReactNode } from 'react';
import { Inbox, Search, FileQuestion } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: 'default' | 'search' | 'error';
  className?: string;
}

const variantIcons = {
  default: <Inbox className="text-zinc-400" size={48} />,
  search: <Search className="text-zinc-400" size={48} />,
  error: <FileQuestion className="text-zinc-400" size={48} />,
};

/**
 * Empty state placeholder for lists and tables
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <div className="mb-4">
        {icon || variantIcons[variant]}
      </div>
      <h3 className="text-lg font-semibold text-zinc-100 mb-1 text-center">
        {title}
      </h3>
      {description && (
        <p className="text-zinc-400 text-center max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}

/**
 * No results found state
 */
export function NoResults({ query, className = '' }: { query?: string; className?: string }) {
  return (
    <EmptyState
      variant="search"
      title="No results found"
      description={query ? `No results matching "${query}"` : 'Try adjusting your search or filters'}
      className={className}
    />
  );
}

/**
 * No data available state
 */
export function NoData({ 
  title = "No data yet",
  description = "Data will appear here once available",
  action,
  className = '' 
}: { 
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <EmptyState
      variant="default"
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}
