'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, PanInfo } from 'framer-motion';
import { 
  Maximize2, 
  Minimize2,
  X,
  GripVertical,
  Check,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit2,
  Copy
} from 'lucide-react';

// ==================== TYPES ====================

export interface SwipeAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  color: string;
  onAction: () => void;
}

// ==================== SWIPEABLE ROW ====================

interface SwipeableRowProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  threshold?: number;
  onSwipeComplete?: (direction: 'left' | 'right', actionId: string) => void;
}

export function SwipeableRow({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 100,
  onSwipeComplete,
}: SwipeableRowProps) {
  const x = useMotionValue(0);
  const [isRevealed, setIsRevealed] = useState<'left' | 'right' | null>(null);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    const _swipe = Math.abs(offset.x) * velocity.x;

    if (offset.x > threshold && leftActions.length > 0) {
      // Reveal left actions (swiping right)
      setIsRevealed('left');
    } else if (offset.x < -threshold && rightActions.length > 0) {
      // Reveal right actions (swiping left)
      setIsRevealed('right');
    } else {
      // Snap back
      setIsRevealed(null);
    }
  };

  const handleActionClick = (action: SwipeAction, direction: 'left' | 'right') => {
    action.onAction();
    onSwipeComplete?.(direction, action.id);
    setIsRevealed(null);
  };

  const actionsWidth = 80 * Math.max(leftActions.length, rightActions.length);

  return (
    <div className="relative overflow-hidden">
      {/* Left Actions (revealed by swiping right) */}
      {leftActions.length > 0 && (
        <div className="absolute left-0 top-0 bottom-0 flex items-stretch">
          {leftActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action, 'left')}
              className={`
                w-20 flex flex-col items-center justify-center gap-1 text-white
                transition-opacity
                ${action.color}
              `}
            >
              {action.icon}
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right Actions (revealed by swiping left) */}
      {rightActions.length > 0 && (
        <div className="absolute right-0 top-0 bottom-0 flex items-stretch">
          {rightActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action, 'right')}
              className={`
                w-20 flex flex-col items-center justify-center gap-1 text-white
                transition-opacity
                ${action.color}
              `}
            >
              {action.icon}
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -actionsWidth, right: actionsWidth }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={{
          x: isRevealed === 'left' 
            ? actionsWidth 
            : isRevealed === 'right' 
              ? -actionsWidth 
              : 0,
        }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
        className="relative z-10 bg-zinc-900 cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>
    </div>
  );
}

// ==================== PULL TO REFRESH ====================

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  refreshIndicator?: React.ReactNode;
}

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  refreshIndicator,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const progress = Math.min(pullDistance / threshold, 1);
  const shouldRefresh = pullDistance >= threshold;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if ((containerRef.current?.scrollTop ?? 1) === 0) {
      startY.current = e.touches[0]?.clientY ?? 0;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;

    const currentY = e.touches[0]?.clientY ?? 0;
    const diff = currentY - startY.current;

    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      e.preventDefault();
      setPullDistance(Math.min(diff * 0.5, threshold * 1.5));
    }
  }, [isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (shouldRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [shouldRefresh, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div ref={containerRef} className="relative overflow-auto h-full">
      {/* Pull Indicator */}
      <motion.div
        className="absolute left-0 right-0 flex items-center justify-center z-10"
        style={{
          top: -60,
          height: 60,
        }}
        animate={{
          y: pullDistance,
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        {refreshIndicator || (
          <div className="flex flex-col items-center gap-2">
            <motion.div
              animate={{
                rotate: isRefreshing ? 360 : progress * 180,
              }}
              transition={{
                rotate: isRefreshing
                  ? { duration: 1, repeat: Infinity, ease: 'linear' }
                  : { duration: 0 },
              }}
              className={`
                w-8 h-8 rounded-full border-2 border-t-transparent
                ${shouldRefresh ? 'border-cyan-400' : 'border-zinc-600'}
              `}
            />
            <span className="text-xs text-zinc-500">
              {isRefreshing
                ? 'Refreshing...'
                : shouldRefresh
                  ? 'Release to refresh'
                  : 'Pull to refresh'}
            </span>
          </div>
        )}
      </motion.div>

      {/* Content */}
      <motion.div
        animate={{ y: pullDistance }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ==================== BOTTOM SHEET ====================

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  snapPoints?: number[];
  defaultSnap?: number;
  enableDrag?: boolean;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = [0.5, 0.9],
  defaultSnap = 0,
  enableDrag = true,
}: BottomSheetProps) {
  const [currentSnap, setCurrentSnap] = useState(defaultSnap);
  const sheetRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);

  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const snapHeights = snapPoints.map((p) => windowHeight * (1 - p));

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { velocity, offset } = info;
    const currentHeight = snapHeights[currentSnap] ?? 0;
    const newY = currentHeight + offset.y;

    // Close if dragged down past threshold
    if (velocity.y > 500 || newY > windowHeight * 0.85) {
      onClose();
      return;
    }

    // Find nearest snap point
    let nearestSnap = 0;
    let minDistance = Infinity;

    snapHeights.forEach((height, index) => {
      const distance = Math.abs(newY - height);
      if (distance < minDistance) {
        minDistance = distance;
        nearestSnap = index;
      }
    });

    setCurrentSnap(nearestSnap);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: windowHeight }}
            animate={{ y: snapHeights[currentSnap] }}
            exit={{ y: windowHeight }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            drag={enableDrag ? 'y' : false}
            dragConstraints={{ top: snapHeights[snapHeights.length - 1], bottom: windowHeight }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="fixed left-0 right-0 bottom-0 z-50 bg-zinc-900 rounded-t-3xl shadow-2xl"
            style={{ height: windowHeight, y }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-zinc-700 rounded-full" />
            </div>

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-4 pb-4 border-b border-zinc-800">
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto" style={{ maxHeight: windowHeight * 0.85 }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ==================== EXPANDABLE CARD ====================

interface ExpandableCardProps {
  children: React.ReactNode;
  expandedContent: React.ReactNode;
  defaultExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
}

export function ExpandableCard({
  children,
  expandedContent,
  defaultExpanded = false,
  onExpandChange,
}: ExpandableCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpand = () => {
    const newValue = !isExpanded;
    setIsExpanded(newValue);
    onExpandChange?.(newValue);
  };

  return (
    <motion.div
      layout
      className="bg-zinc-800/50 border border-zinc-700 rounded-2xl overflow-hidden"
    >
      <div className="p-4">
        {children}

        <button
          onClick={toggleExpand}
          className="mt-3 flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          {isExpanded ? (
            <>
              <Minimize2 className="w-4 h-4" />
              Show Less
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4" />
              Show More
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-zinc-700"
          >
            <div className="p-4">{expandedContent}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ==================== REORDERABLE LIST ====================

interface ReorderableItem {
  id: string;
  content: React.ReactNode;
}

interface ReorderableListProps {
  items: ReorderableItem[];
  onReorder: (items: ReorderableItem[]) => void;
  renderItem?: (item: ReorderableItem, index: number) => React.ReactNode;
}

export function ReorderableList({ items, onReorder, renderItem }: ReorderableListProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== draggedItem) {
      setDragOverItem(id);
    }
  };

  const handleDragEnd = () => {
    if (draggedItem && dragOverItem && draggedItem !== dragOverItem) {
      const newItems = [...items];
      const draggedIndex = items.findIndex((item) => item.id === draggedItem);
      const dropIndex = items.findIndex((item) => item.id === dragOverItem);

      if (draggedIndex !== -1 && dropIndex !== -1) {
        const [removed] = newItems.splice(draggedIndex, 1);
        if (removed) {
          newItems.splice(dropIndex, 0, removed);
          onReorder(newItems);
        }
      }
    }

    setDraggedItem(null);
    setDragOverItem(null);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    const newItems = [...items];
    const itemA = newItems[index];
    const itemB = newItems[newIndex];
    if (itemA && itemB) {
      [newItems[index], newItems[newIndex]] = [itemB, itemA];
      onReorder(newItems);
    }
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          layout
          draggable
          onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, item.id)}
          onDragOver={(e) => handleDragOver(e as unknown as React.DragEvent, item.id)}
          onDragEnd={handleDragEnd}
          className={`
            flex items-center gap-3 p-3 bg-zinc-800/50 border rounded-xl
            cursor-grab active:cursor-grabbing transition-colors
            ${dragOverItem === item.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-zinc-700'}
            ${draggedItem === item.id ? 'opacity-50' : 'opacity-100'}
          `}
        >
          <GripVertical className="w-5 h-5 text-zinc-500 flex-shrink-0" />

          <div className="flex-1">
            {renderItem ? renderItem(item, index) : item.content}
          </div>

          <div className="flex flex-col gap-1">
            <button
              onClick={() => moveItem(index, 'up')}
              disabled={index === 0}
              className="p-1 hover:bg-zinc-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowUp className="w-4 h-4 text-zinc-400" />
            </button>
            <button
              onClick={() => moveItem(index, 'down')}
              disabled={index === items.length - 1}
              className="p-1 hover:bg-zinc-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowDown className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ==================== CONTEXT MENU ====================

interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

interface ContextMenuProps {
  trigger: React.ReactNode;
  items: ContextMenuItem[];
  onOpenChange?: (open: boolean) => void;
}

export function ContextMenu({ trigger, items, onOpenChange }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setIsOpen(true);
    onOpenChange?.(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    onOpenChange?.(false);
  };

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <div onContextMenu={handleContextMenu}>{trigger}</div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ left: position.x, top: position.y }}
            className="fixed z-50 min-w-45 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden py-1"
          >
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (!item.disabled) {
                    item.onSelect();
                    handleClose();
                  }
                }}
                disabled={item.disabled}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors
                  ${item.disabled 
                    ? 'opacity-50 cursor-not-allowed' 
                    : item.danger
                      ? 'text-red-400 hover:bg-red-500/10'
                      : 'text-zinc-300 hover:bg-zinc-800'
                  }
                `}
              >
                {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                <span className="flex-1 text-left">{item.label}</span>
                {item.shortcut && (
                  <span className="text-xs text-zinc-500">{item.shortcut}</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ==================== EXAMPLE ACTIONS ====================

export const commonSwipeActions = {
  delete: (onDelete: () => void): SwipeAction => ({
    id: 'delete',
    icon: <Trash2 className="w-5 h-5" />,
    label: 'Delete',
    color: 'bg-red-500',
    onAction: onDelete,
  }),
  edit: (onEdit: () => void): SwipeAction => ({
    id: 'edit',
    icon: <Edit2 className="w-5 h-5" />,
    label: 'Edit',
    color: 'bg-blue-500',
    onAction: onEdit,
  }),
  copy: (onCopy: () => void): SwipeAction => ({
    id: 'copy',
    icon: <Copy className="w-5 h-5" />,
    label: 'Copy',
    color: 'bg-purple-500',
    onAction: onCopy,
  }),
  done: (onDone: () => void): SwipeAction => ({
    id: 'done',
    icon: <Check className="w-5 h-5" />,
    label: 'Done',
    color: 'bg-green-500',
    onAction: onDone,
  }),
};

export default SwipeableRow;
