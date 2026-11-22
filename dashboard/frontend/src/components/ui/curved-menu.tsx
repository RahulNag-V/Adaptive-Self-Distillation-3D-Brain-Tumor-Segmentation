import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu as MenuIcon, 
  X, 
  Plus, 
  Cpu, 
  Box, 
  UploadCloud, 
  CheckCircle2, 
  Image as ImageIcon, 
  FileText, 
  LayoutDashboard, 
  Activity, 
  RefreshCw, 
  Settings, 
  Info, 
  HelpCircle 
} from 'lucide-react';
import { useServerStatus } from '../../hooks/useServerStatus';

// Animation easing curve specified in requirements
export const CURVE_EASE = [0.76, 0, 0.24, 1] as const;

// Sliding panel motion variants
export const menuSlideVariants = {
  initial: {
    x: 'calc(100% + 100px)',
  },
  enter: {
    x: '0%',
    transition: {
      duration: 0.8,
      ease: CURVE_EASE,
    },
  },
  exit: {
    x: 'calc(100% + 100px)',
    transition: {
      duration: 0.8,
      ease: CURVE_EASE,
    },
  },
};

// Staggered navigation item entrance variants
export const navItemVariants = {
  initial: {
    x: 60,
    opacity: 0,
  },
  enter: (index: number) => ({
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.42,
      ease: CURVE_EASE,
      delay: Math.min(0.018 * index + 0.06, 0.22),
    },
  }),
  exit: (index: number) => ({
    x: 60,
    opacity: 0,
    transition: {
      duration: 0.35,
      ease: CURVE_EASE,
      delay: 0.012 * index,
    },
  }),
};

/**
 * Curve Component: Renders and morphs the curved SVG boundary along the panel's leading edge.
 * Safely handles Next.js / SSR hydration and browser resize events.
 */
export function Curve({ color = '#F8FCFB' }: { color?: string }) {
  const [windowHeight, setWindowHeight] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return window.innerHeight;
    }
    return 900;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const initialPath = `M100 0 L100 ${windowHeight} Q-100 ${windowHeight / 2} 100 0`;
  const targetPath = `M100 0 L100 ${windowHeight} Q100 ${windowHeight / 2} 100 0`;

  const curveVariants = {
    initial: {
      d: initialPath,
    },
    enter: {
      d: targetPath,
      transition: {
        duration: 0.8,
        ease: CURVE_EASE,
      },
    },
    exit: {
      d: initialPath,
      transition: {
        duration: 0.8,
        ease: CURVE_EASE,
      },
    },
  };

  return (
    <svg
      className="absolute top-0 -left-[99px] w-[100px] h-full pointer-events-none overflow-visible fill-current drop-shadow-[-10px_0_18px_rgba(9,43,71,0.12)]"
      style={{ color }}
      aria-hidden="true"
    >
      <motion.path
        variants={curveVariants}
        initial="initial"
        animate="enter"
        exit="exit"
      />
    </svg>
  );
}

/**
 * NavLinkLetterText: Restrained, interactive letter-by-letter hover animation.
 * Moves letters gently on smooth spring physics without causing layout shifts.
 */
export function NavLinkLetterText({
  text,
  isHovered,
  className = '',
}: {
  text: string;
  isHovered: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex whitespace-pre pointer-events-none select-none ${className}`}>
      {text.split('').map((char, index) => (
        <motion.span
          key={index}
          className="inline-block"
          animate={
            isHovered
              ? {
                  y: -2.5,
                  transition: {
                    type: 'spring',
                    stiffness: 420,
                    damping: 14,
                    mass: 0.5,
                    delay: index * 0.016,
                  },
                }
              : {
                  y: 0,
                  transition: {
                    type: 'spring',
                    stiffness: 500,
                    damping: 20,
                    mass: 0.5,
                    delay: index * 0.01,
                  },
                }
          }
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </span>
  );
}

/**
 * MenuToggleButton: Animated hamburger to close (X) toggle button.
 * Preserves the exact styling and position within the navbar while smoothly rotating icons.
 */
export function MenuToggleButton({
  isOpen,
  onClick,
  className = '',
}: {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? 'Close Workspace Navigation Menu' : 'Open Workspace Navigation Menu'}
      aria-expanded={isOpen}
      title={isOpen ? 'Close Menu (Esc)' : 'Workspace Navigation Menu'}
      className={`relative flex items-center justify-center p-2 rounded-xl bg-white/50 hover:bg-white/80 border border-[#111111]/30 text-[#103B5C] transition-all shadow-xs cursor-pointer active:scale-95 overflow-hidden ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isOpen ? (
          <motion.div
            key="close-icon"
            initial={{ rotate: -90, opacity: 0, scale: 0.8 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.22, ease: CURVE_EASE }}
            className="flex items-center justify-center"
          >
            <X className="w-5 h-5 text-[#103B5C]" />
          </motion.div>
        ) : (
          <motion.div
            key="menu-icon"
            initial={{ rotate: 90, opacity: 0, scale: 0.8 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.22, ease: CURVE_EASE }}
            className="flex items-center justify-center"
          >
            <MenuIcon className="w-5 h-5 text-[#103B5C]" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
