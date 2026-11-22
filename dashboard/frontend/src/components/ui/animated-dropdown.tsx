import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DropdownItem {
  id: string;
  label: string;
  desc?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
}

export interface AnimatedDropdownProps {
  id: string;
  title: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  items: DropdownItem[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (itemId: string) => void;
  onClose?: () => void;
  className?: string;
  menuClassName?: string;
  align?: 'center' | 'left' | 'right';
  mobileCompact?: boolean;
}

export default function AnimatedDropdown({
  id,
  title,
  icon: Icon,
  items,
  isOpen,
  onToggle,
  onSelect,
  onClose,
  className,
  menuClassName,
  align = 'center',
  mobileCompact = false,
}: AnimatedDropdownProps) {
  const shouldReduceMotion = useReducedMotion();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Reset keyboard focus when closed
  useEffect(() => {
    if (!isOpen) {
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (onClose) {
          onClose();
        } else {
          onToggle();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onToggle, onClose]);

  // Escape key listener & focus restoration
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (onClose) {
          onClose();
        } else {
          onToggle();
        }
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onToggle, onClose]);

  // Keyboard navigation within the dropdown menu
  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev < items.length - 1 ? prev + 1 : 0;
          itemsRef.current[next]?.focus();
          return next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : items.length - 1;
          itemsRef.current[next]?.focus();
          return next;
        });
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        itemsRef.current[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(items.length - 1);
        itemsRef.current[items.length - 1]?.focus();
        break;
      case 'Tab':
        // Close menu on tab out
        if (onClose) {
          onClose();
        } else {
          onToggle();
        }
        break;
      default:
        break;
    }
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      if (!isOpen) {
        e.preventDefault();
        onToggle();
        // Focus first item when opening via keyboard
        setTimeout(() => {
          setFocusedIndex(0);
          itemsRef.current[0]?.focus();
        }, 50);
      }
    }
  };

  // Motion variants matching Emerald UI AnimatedDropdown requirements
  // Duration: ~200ms (0.2s)
  // Opening: Smooth fade-in, slightly downward movement (y: -8 -> 0), scale from 0.95 to 1
  // Closing: Reverse smoothly
  const menuVariants = shouldReduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.1 } },
        exit: { opacity: 0, transition: { duration: 0.1 } },
      }
    : {
        hidden: {
          opacity: 0,
          scale: 0.95,
          y: -8,
          transition: {
            duration: 0.15,
            ease: [0.4, 0, 1, 1],
          },
        },
        visible: {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: {
            duration: 0.2, // ~200ms
            ease: [0.16, 1, 0.3, 1],
            when: 'beforeChildren',
            staggerChildren: 0.03, // Stagger menu items by 0.03s
          },
        },
        exit: {
          opacity: 0,
          scale: 0.95,
          y: -6,
          transition: {
            duration: 0.15,
            ease: [0.4, 0, 1, 1],
          },
        },
      };

  // Menu item stagger variants: moving slightly from left to right (x: -6 -> 0)
  const itemVariants = shouldReduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        hidden: {
          opacity: 0,
          x: -6, // slightly left
        },
        visible: {
          opacity: 1,
          x: 0, // to natural position
          transition: {
            duration: 0.2, // ~200ms
            ease: [0.16, 1, 0.3, 1],
          },
        },
        exit: {
          opacity: 0,
          x: -4,
          transition: {
            duration: 0.1,
          },
        },
      };

  const menuAlignClass =
    align === 'left'
      ? 'left-0'
      : align === 'right'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2';

  const menuId = `dropdown-menu-${id}`;
  const triggerId = `dropdown-trigger-${id}`;

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Existing Navbar Pill Trigger Button */}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        onClick={onToggle}
        onKeyDown={handleTriggerKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={isOpen ? menuId : undefined}
        aria-label={`Open ${title} menu`}
        className={cn(
          'inline-flex items-center cursor-pointer shadow-xs transition-all duration-200 select-none outline-none focus-visible:ring-2 focus-visible:ring-[#399DBA] focus-visible:ring-offset-1',
          mobileCompact
            ? 'gap-1.5 px-3 py-1 rounded-full border border-[#399DBA] bg-white/90 dark:bg-[#092B47]/90 text-[10px] font-bold uppercase text-[#103B5C] dark:text-white'
            : cn(
                'gap-2 px-4 py-1.5 rounded-full border text-[11px] font-bold tracking-wider uppercase hover:shadow-sm',
                isOpen
                  ? 'border-[#399DBA] bg-white dark:bg-[#103B5C] text-[#103B5C] dark:text-white ring-2 ring-[#399DBA]/30'
                  : 'border-[#399DBA]/80 dark:border-[#399DBA]/50 bg-white/90 dark:bg-[#092B47]/90 hover:bg-white dark:hover:bg-[#103B5C] text-[#103B5C] dark:text-white'
              )
        )}
      >
        {Icon && (
          <Icon
            className={cn(
              'shrink-0 text-[#399DBA] dark:text-[#98D9CE]',
              mobileCompact ? 'w-3 h-3' : 'w-3.5 h-3.5'
            )}
            aria-hidden="true"
          />
        )}
        <span>{mobileCompact ? title.split(' ')[0] : title}</span>
        {/* Animated Chevron: Rotate 180° when opened, return to 0° when closed */}
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
          }
          className="inline-flex items-center justify-center shrink-0 pointer-events-none"
        >
          <ChevronDown
            className={cn(
              'text-[#103B5C] dark:text-white',
              mobileCompact ? 'w-3 h-3' : 'w-3.5 h-3.5'
            )}
            aria-hidden="true"
          />
        </motion.span>
      </button>

      {/* Floating Animated Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key={menuId}
            id={menuId}
            role="menu"
            aria-labelledby={triggerId}
            tabIndex={-1}
            onKeyDown={handleMenuKeyDown}
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ transformOrigin: 'top center' }}
            className={cn(
              'absolute top-full mt-2 z-50 rounded-2xl bg-white dark:bg-[#092B47] border border-[#399DBA]/60 shadow-2xl p-2 focus:outline-none pointer-events-auto',
              mobileCompact ? 'w-56 left-0 rounded-xl p-1.5' : 'w-64',
              menuAlignClass,
              menuClassName
            )}
          >
            {/* Header Title inside Dropdown */}
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#103B5C] dark:text-[#98D9CE] border-b border-slate-100 dark:border-slate-800 font-mono mb-1 select-none">
              {title}
            </div>

            {/* Staggered Menu Items */}
            <div className="space-y-0.5">
              {items.map((item, index) => {
                const ItemIcon = item.icon;
                const isItemFocused = focusedIndex === index;

                return (
                  <motion.button
                    key={item.id}
                    ref={(el) => (itemsRef.current[index] = el)}
                    role="menuitem"
                    tabIndex={isItemFocused ? 0 : -1}
                    variants={itemVariants}
                    onClick={() => onSelect(item.id)}
                    className={cn(
                      'w-full px-3 py-2 rounded-xl text-left flex items-start gap-2.5 transition-colors cursor-pointer group outline-none',
                      'hover:bg-[#EBF8F6] dark:hover:bg-[#103B5C] text-[#111827] dark:text-white',
                      'focus-visible:bg-[#EBF8F6] dark:focus-visible:bg-[#103B5C] focus-visible:ring-1 focus-visible:ring-[#399DBA]'
                    )}
                  >
                    {ItemIcon && (
                      <ItemIcon
                        className="w-4 h-4 text-[#399DBA] group-hover:scale-110 group-focus-visible:scale-110 transition-transform shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold leading-tight truncate">
                        {item.label}
                      </div>
                      {item.desc && !mobileCompact && (
                        <div className="text-[10px] text-[#164D70] dark:text-slate-400 font-normal leading-tight truncate mt-0.5">
                          {item.desc}
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
