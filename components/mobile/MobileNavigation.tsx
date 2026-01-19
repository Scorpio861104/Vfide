import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useIsMobile } from '@/hooks/useMobile';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';

// Bottom Navigation Component
interface BottomNavigationProps {
  items: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    onClick: () => void;
  }>;
  activeId?: string;
  className?: string;
}

export function BottomNavigation({
  items,
  activeId,
  className = ''
}: BottomNavigationProps) {
  const isMobile = useIsMobile();
  const { playNotification } = useTransactionSounds();

  if (!isMobile) return null;

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 ${className}`}
      role="navigation"
      aria-label="Bottom navigation"
    >
      <div className="flex justify-around items-center h-16">
        {items.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => {
              item.onClick();
              playNotification();
            }}
            className={`relative flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeId === item.id
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
            aria-label={item.label}
            aria-current={activeId === item.id ? 'page' : undefined}
            whileTap={{ scale: 0.9 }}
          >
            {activeId === item.id && (
              <motion.div
                className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                layoutId="bottomNavIndicator"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
            <motion.div 
              className="relative z-10"
              animate={{ scale: activeId === item.id ? 1.1 : 1 }}
            >
              {item.icon}
              <AnimatePresence>
                {item.badge !== undefined && item.badge > 0 && (
                  <motion.span 
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
            <span className="text-xs mt-1 relative z-10">{item.label}</span>
          </motion.button>
        ))}
      </div>
    </nav>
  );
};

// Mobile Menu Component
interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  sections: Array<{
    title: string;
    items: Array<{
      id: string;
      label: string;
      icon: React.ReactNode;
      badge?: number;
      onClick: () => void;
    }>;
  }>;
  className?: string;
}

export function MobileMenu({
  isOpen,
  onClose,
  sections,
  className = ''
}: MobileMenuProps) {
  const { playNotification } = useTransactionSounds();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Menu */}
          <motion.div
            className={`fixed top-0 left-0 bottom-0 w-full max-w-[85vw] bg-white dark:bg-gray-800 z-50 overflow-y-auto ${className}`}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile menu"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Close button */}
            <motion.button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              aria-label="Close menu"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-6 h-6" />
            </motion.button>

            {/* Menu sections */}
            <div className="py-8 px-4">
              {sections.map((section, sectionIndex) => (
                <motion.div 
                  key={sectionIndex} 
                  className="mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: sectionIndex * 0.1 }}
                >
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item, itemIndex) => (
                      <motion.button
                        key={item.id}
                        onClick={() => {
                          item.onClick();
                          onClose();
                          playNotification();
                        }}
                        className="w-full flex items-center justify-between px-4 py-3 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: sectionIndex * 0.1 + itemIndex * 0.05 }}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon}
                          <span className="text-gray-900 dark:text-gray-100">{item.label}</span>
                        </div>
                        <AnimatePresence>
                          {item.badge !== undefined && item.badge > 0 && (
                            <motion.span 
                              className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs px-2 py-1 rounded-full"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                            >
                              {item.badge > 99 ? '99+' : item.badge}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Floating Action Button
interface FloatingActionButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  label?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  className?: string;
}

export function FloatingActionButton({
  icon,
  onClick,
  label = 'Action',
  position = 'bottom-right',
  className = ''
}: FloatingActionButtonProps) {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  return (
    <motion.button
      onClick={onClick}
      className={`fixed ${positionClasses[position]} w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-40 ${className}`}
      aria-label={label}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
    >
      {icon}
    </motion.button>
  );
};

// Tab Bar Component
interface TabBarProps {
  tabs: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
  }>;
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function TabBar({
  tabs,
  activeId,
  onChange,
  className = ''
}: TabBarProps) {
  const { playNotification } = useTransactionSounds();

  return (
    <div
      className={`flex overflow-x-auto bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => (
        <motion.button
          key={tab.id}
          onClick={() => {
            onChange(tab.id);
            playNotification();
          }}
          className={`relative flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
            activeId === tab.id
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
          role="tab"
          aria-selected={activeId === tab.id}
          aria-controls={`panel-${tab.id}`}
          whileTap={{ scale: 0.95 }}
        >
          {tab.icon}
          {tab.label}
          {activeId === tab.id && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
              layoutId="tabBarIndicator"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
        </motion.button>
      ))}
    </div>
  );
};

// Mobile Header Component
interface MobileHeaderProps {
  title: string;
  leftAction?: {
    icon: React.ReactNode;
    onClick: () => void;
    label: string;
  };
  rightAction?: {
    icon: React.ReactNode;
    onClick: () => void;
    label: string;
  };
  className?: string;
}

export function MobileHeader({
  title,
  leftAction,
  rightAction,
  className = ''
}: MobileHeaderProps) {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <header
      className={`sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${className}`}
    >
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left action */}
        <div className="w-10">
          {leftAction && (
            <button
              onClick={leftAction.onClick}
              className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              aria-label={leftAction.label}
            >
              {leftAction.icon}
            </button>
          )}
        </div>

        {/* Title */}
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
          {title}
        </h1>

        {/* Right action */}
        <div className="w-10 flex justify-end">
          {rightAction && (
            <button
              onClick={rightAction.onClick}
              className="p-2 -mr-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              aria-label={rightAction.label}
            >
              {rightAction.icon}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
