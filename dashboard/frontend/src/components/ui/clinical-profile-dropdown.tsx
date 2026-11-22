import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  User,
  Settings,
  ShieldCheck,
  HelpCircle,
  LogOut,
  ChevronDown,
  CheckCircle2,
  Building2,
  X,
  Stethoscope,
  FileCheck2,
  Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';
import HandwritingText from './handwriting-text';

export interface ClinicalUser {
  id: string;
  name: string;
  title: string;
  role: string;
  department: string;
  institution: string;
  licenseNumber?: string;
  isVerified: boolean;
  initials: string;
  tier: string;
  activeCasesCount?: number;
}

const DEFAULT_CLINICAL_USER: ClinicalUser = {
  id: 'RAD-78492',
  name: 'Dr. Sarah Lin, MD',
  title: 'Senior Attending Radiologist',
  role: 'Lead Neuro-Radiologist',
  department: 'Department of Diagnostic Neuroradiology',
  institution: 'Mass General Brigham · Harvard Med',
  licenseNumber: 'MA Med Board #284910',
  isVerified: true,
  initials: 'SL',
  tier: 'Tier 1 Clinical Access',
  activeCasesCount: 3,
};

export interface ClinicalProfileDropdownProps {
  user?: ClinicalUser;
  onNavigate?: (routeId: string) => void;
  onSignOut?: () => void;
  className?: string;
}

export function ClinicalProfileDropdown({
  user = DEFAULT_CLINICAL_USER,
  onNavigate,
  onSignOut,
  className,
}: ClinicalProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<ClinicalUser>(user);
  const [isSignedIn, setIsSignedIn] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const prefersReduced = useReducedMotion();

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Keyboard navigation & Escape key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % menuItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + menuItems.length) % menuItems.length);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Focus active item when focusedIndex changes
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex, isOpen]);

  const toggleDropdown = () => {
    setIsOpen((prev) => {
      if (!prev) setFocusedIndex(-1);
      return !prev;
    });
  };

  const handleSelectRoute = (routeId?: string) => {
    setIsOpen(false);
    if (routeId && onNavigate) {
      onNavigate(routeId);
    }
  };

  const handleSignOutClick = () => {
    setIsOpen(false);
    setIsSignedIn(false);
    if (onSignOut) {
      onSignOut();
    }
  };

  const handleSignInClick = () => {
    setIsSignedIn(true);
    setIsOpen(false);
  };

  // Clinician profile menu options
  const menuItems = [
    {
      id: 'profile',
      label: 'My Profile',
      desc: 'Clinician credentials & licenses',
      icon: User,
      action: () => {
        setIsOpen(false);
        setIsProfileModalOpen(true);
      },
    },
    {
      id: 'settings',
      label: 'Account Settings',
      desc: 'Workstation preferences & UI',
      icon: Settings,
      action: () => handleSelectRoute('settings'),
    },
    {
      id: 'security',
      label: 'Privacy & Clinical Security',
      desc: 'Local sandbox, data protection & governance',
      icon: ShieldCheck,
      tag: 'Policy v1.2',
      tagColor: 'bg-teal-500/10 text-teal-800 dark:text-teal-300 border-teal-500/20',
      action: () => {
        setIsOpen(false);
        if (onNavigate) {
          onNavigate('security');
        } else {
          setIsSecurityModalOpen(true);
        }
      },
    },
    {
      id: 'divider-2',
      isDivider: true,
    },
    {
      id: 'help',
      label: 'Help & Support',
      desc: 'Clinical manual & BraTS FAQ',
      icon: HelpCircle,
      action: () => handleSelectRoute('faq'),
    },
    {
      id: 'signout',
      label: 'Sign Out',
      desc: 'End authenticated clinician session',
      icon: LogOut,
      isDanger: true,
      action: handleSignOutClick,
    },
  ];

  return (
    <>
      <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
        {/* Navbar Trigger Button: Pill-shaped container with thin mint border & frosted backdrop */}
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleDropdown}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label="Clinician Profile Menu"
          data-slot="clinical-profile-trigger"
          className={cn(
            'group relative flex items-center gap-2 sm:gap-2.5 p-1 sm:pl-1.5 sm:pr-3 py-1 rounded-full',
            'border border-[#7FC9BB]/60 hover:border-[#5EAD9D] dark:border-[#7FC9BB]/40',
            'bg-white/50 hover:bg-white/80 dark:bg-[#103B5C]/50 dark:hover:bg-[#103B5C]/75 backdrop-blur-md',
            'shadow-[0_2px_8px_rgba(16,59,92,0.06)] hover:shadow-[0_4px_14px_rgba(16,59,92,0.12)]',
            'transition-all duration-200 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-[#5EAD9D]',
            isOpen && 'border-[#5EAD9D] bg-white/90 dark:bg-[#103B5C]/90 shadow-[0_4px_16px_rgba(16,59,92,0.15)]'
          )}
          title={isSignedIn ? `${currentUser.name} (${currentUser.role})` : 'Clinician Sign In'}
        >
          {/* Circular Clinician Avatar: 36px with status indicator */}
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-full overflow-hidden bg-gradient-to-tr from-[#103B5C] via-[#1B6284] to-[#399DBA] p-[1.5px] shadow-sm">
            <div className="w-full h-full rounded-full bg-[#EBF8F5] dark:bg-[#0B253A] flex items-center justify-center text-[#103B5C] dark:text-[#9DD9CC] font-bold text-xs">
              {/* Doctor Stethoscope Silhouette SVG Avatar */}
              <svg
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full text-[#103B5C] dark:text-[#7FC9BB]"
              >
                <circle cx="16" cy="11" r="5" fill="currentColor" fillOpacity="0.85" />
                <path
                  d="M7 26C7 21.0294 11.0294 17 16 17C20.9706 17 25 21.0294 25 26"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <circle cx="23" cy="23" r="2" fill="#10B981" />
              </svg>
            </div>
            {/* Real-time Online / Verified Verification Indicator */}
            {isSignedIn && (
              <span
                className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 ring-2 ring-white dark:ring-[#103B5C] rounded-full"
                title="Authenticated Clinician Session Active"
              />
            )}
          </div>

          {/* Clinician Identity Text (Collapsed into avatar on narrow mobile screens) */}
          {isSignedIn ? (
            <div className="hidden sm:flex flex-col text-left leading-tight pr-0.5">
              <span className="text-xs font-semibold text-[#111827] dark:text-white tracking-tight flex items-center gap-1">
                <HandwritingText text={currentUser.name} delay={0.35} stagger={0.02} duration={0.18} />
                {currentUser.isVerified && (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 handwriting-icon" style={{ animationDelay: '0.65s' }} />
                )}
              </span>
              <span className="text-[10px] font-medium text-[#1B6284] dark:text-[#9DD9CC]">
                <HandwritingText text={currentUser.role} delay={0.48} stagger={0.015} duration={0.18} />
              </span>
            </div>
          ) : (
            <div className="hidden sm:flex flex-col text-left leading-tight pr-0.5">
              <span className="text-xs font-semibold text-[#111827] dark:text-white">
                <HandwritingText text="Sign In" delay={0.35} stagger={0.02} duration={0.18} />
              </span>
              <span className="text-[10px] text-[#64748B]">
                <HandwritingText text="Clinical Portal" delay={0.48} stagger={0.015} duration={0.18} />
              </span>
            </div>
          )}

          {/* Downward Chevron with Smooth 180° Rotation */}
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 text-[#1B6284] dark:text-[#9DD9CC] shrink-0 transition-transform duration-200 ml-0.5',
              isOpen && 'rotate-180 text-[#103B5C] dark:text-white'
            )}
          />
        </button>

        {/* Profile Dropdown: Refined Floating Card with Framer Motion Animation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
              animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              role="menu"
              aria-label="Clinical User Menu"
              className={cn(
                'absolute right-0 top-full mt-2.5 z-50',
                'w-[285px] sm:w-[295px] rounded-2xl overflow-hidden',
                'bg-white/95 dark:bg-[#0B253A]/95 backdrop-blur-xl',
                'border border-[#9DD9CC]/70 dark:border-[#1E4D6B]',
                'shadow-[0_16px_40px_rgba(16,59,92,0.16)] dark:shadow-[0_20px_48px_rgba(0,0,0,0.45)]'
              )}
            >
              {isSignedIn ? (
                <>
                  {/* Profile Header: Avatar, Name, Role, Affiliation, and Verified Badge */}
                  <div className="bg-gradient-to-b from-[#EBF8F5]/90 via-[#F4FAF8]/60 to-transparent dark:from-[#133F5F]/40 p-4 border-b border-[#9DD9CC]/40 dark:border-[#1E4D6B]/80 select-none">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="relative w-11 h-11 shrink-0 rounded-full overflow-hidden bg-gradient-to-tr from-[#103B5C] via-[#1B6284] to-[#399DBA] p-[2px] shadow-sm">
                        <div className="w-full h-full rounded-full bg-white dark:bg-[#0B253A] flex items-center justify-center">
                          <svg
                            viewBox="0 0 32 32"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-full h-full text-[#103B5C] dark:text-[#7FC9BB]"
                          >
                            <circle cx="16" cy="11" r="5" fill="currentColor" fillOpacity="0.85" />
                            <path
                              d="M7 26C7 21.0294 11.0294 17 16 17C20.9706 17 25 21.0294 25 26"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                            />
                            <circle cx="23" cy="23" r="2" fill="#10B981" />
                          </svg>
                        </div>
                      </div>

                      {/* Header Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-bold text-[#111827] dark:text-white truncate">
                            {currentUser.name}
                          </h4>
                          {currentUser.isVerified && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60 shrink-0">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Verified</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-medium text-[#103B5C] dark:text-[#B8E6DA] mt-0.5 truncate">
                          {currentUser.role}
                        </p>
                        <p className="text-[10px] text-[#4B6275] dark:text-[#94A3B8] flex items-center gap-1 mt-1 truncate">
                          <Building2 className="w-3 h-3 shrink-0 text-[#1B6284] dark:text-[#7FC9BB]" />
                          <span className="truncate">{currentUser.institution}</span>
                        </p>
                      </div>
                    </div>

                    {/* Clinical Access Badge */}
                    <div className="mt-2.5 pt-2 border-t border-[#9DD9CC]/20 dark:border-[#1E4D6B]/40 flex items-center justify-between text-[10px] text-[#1B6284] dark:text-[#7FC9BB]">
                      <span className="font-mono bg-[#9DD9CC]/20 dark:bg-[#9DD9CC]/10 px-1.5 py-0.5 rounded">
                        {currentUser.id}
                      </span>
                      <span className="font-medium text-[#103B5C] dark:text-[#E2E8F0]">
                        {currentUser.tier}
                      </span>
                    </div>
                  </div>

                  {/* Navigation List: 8 items with staggered subtle animation */}
                  <div className="p-1.5 space-y-0.5 max-h-[380px] overflow-y-auto no-scrollbar">
                    {menuItems.map((item, index) => {
                      if (item.isDivider) {
                        return (
                          <div
                            key={item.id}
                            className="border-t border-[#9DD9CC]/35 dark:border-[#1E4D6B]/50 my-1"
                          />
                        );
                      }

                      const Icon = item.icon!;
                      const isFocused = focusedIndex === index;

                      return (
                        <motion.button
                          key={item.id}
                          ref={(el) => (itemRefs.current[index] = el)}
                          type="button"
                          onClick={item.action}
                          role="menuitem"
                          tabIndex={isOpen ? 0 : -1}
                          initial={prefersReduced ? false : { opacity: 0, x: -6 }}
                          animate={prefersReduced ? false : { opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02, duration: 0.16 }}
                          className={cn(
                            'w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors duration-150 group cursor-pointer outline-none',
                            item.isDanger
                              ? 'text-rose-600 hover:bg-rose-50/80 dark:hover:bg-rose-950/30'
                              : 'text-[#25313D] dark:text-[#E2E8F0] hover:bg-[#EBF8F5] hover:text-[#103B5C] dark:hover:bg-[#133F5F] dark:hover:text-white',
                            isFocused && (item.isDanger ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-[#EBF8F5] dark:bg-[#133F5F]')
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={cn(
                                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                                item.isDanger
                                  ? 'bg-rose-100/60 dark:bg-rose-950/50 text-rose-600'
                                  : 'bg-[#9DD9CC]/25 dark:bg-[#103B5C]/60 text-[#103B5C] dark:text-[#7FC9BB] group-hover:bg-[#7FC9BB]/30'
                              )}
                            >
                              <Icon className="w-3.5 h-3.5 stroke-[1.8]" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-semibold tracking-tight truncate">
                                {item.label}
                              </span>
                              {item.desc && (
                                <span className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] truncate leading-tight">
                                  {item.desc}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Optional Pill Tag */}
                          {item.tag && (
                            <span
                              className={cn(
                                'px-1.5 py-0.5 rounded-full text-[9px] font-medium border shrink-0 ml-2',
                                item.tagColor
                              )}
                            >
                              {item.tag}
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* Signed Out State Preview */
                <div className="p-4 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-[#103B5C] flex items-center justify-center text-slate-500">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#111827] dark:text-white">
                      Clinician Session Ended
                    </h4>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Sign in to access your authorized MRI analyses and workspace.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignInClick}
                    className="w-full py-2 px-3 rounded-xl bg-[#103B5C] hover:bg-[#1B6284] text-white font-medium text-xs shadow transition-colors cursor-pointer"
                  >
                    Sign In as Radiologist
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Clinician Profile Modal ("My Profile") */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0B253A] border border-[#9DD9CC] dark:border-[#1E4D6B] shadow-2xl p-6 relative select-none"
            >
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3.5 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#103B5C] via-[#1B6284] to-[#399DBA] p-[2px] shadow-sm">
                  <div className="w-full h-full rounded-full bg-white dark:bg-[#0B253A] flex items-center justify-center text-[#103B5C] font-bold text-base">
                    SL
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold text-[#111827] dark:text-white">
                      {currentUser.name}
                    </h3>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-xs font-medium text-[#103B5C] dark:text-[#9DD9CC]">
                    {currentUser.role}
                  </p>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    {currentUser.department}
                  </p>
                </div>
              </div>

              <div className="py-4 space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
                  <span className="text-[#64748B]">Medical Affiliation</span>
                  <span className="font-medium text-[#111827] dark:text-white text-right">
                    {currentUser.institution}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
                  <span className="text-[#64748B]">Board Registration</span>
                  <span className="font-mono text-[#111827] dark:text-white">
                    {currentUser.licenseNumber}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
                  <span className="text-[#64748B]">Subspecialties</span>
                  <span className="font-medium text-[#111827] dark:text-white text-right">
                    Neuro-oncology · BraTS 3D Volumetry
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#64748B]">Clinical Privileges</span>
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                    Full UNETR 3D Segmentation Access
                  </span>
                </div>
              </div>

              <div className="mt-3 p-3 rounded-xl bg-[#EBF8F5]/80 dark:bg-[#133F5F]/30 border border-[#9DD9CC]/40 text-[11px] text-[#103B5C] dark:text-[#9DD9CC] leading-relaxed">
                <strong>RESEARCH & CLINICAL NOTICE:</strong> Authorized for academic clinical research and secondary radiomics validation under IRB Protocol #2024P00189.
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#103B5C] hover:bg-[#1B6284] text-white text-xs font-medium transition-colors"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Privacy & Security Executive Summary Modal */}
      <AnimatePresence>
        {isSecurityModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0B253A] border border-[#98D9CE] dark:border-[#1E4D6B] shadow-2xl p-6 relative select-none font-sans"
            >
              <button
                type="button"
                onClick={() => setIsSecurityModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 border-b border-[#111111]/10 dark:border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-xl bg-[#103B5C] text-white flex items-center justify-center shadow-xs shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#103B5C] dark:text-white">
                    Privacy &amp; Clinical Security
                  </h3>
                  <p className="text-xs text-[#64748B]">Workstation Data Sandboxing &amp; Governance Specification</p>
                </div>
              </div>

              <div className="py-4 space-y-2.5 text-xs text-[#25313D] dark:text-[#E2E8F0]">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[#111111]/10 space-y-1">
                  <span className="font-bold text-[#103B5C] dark:text-[#7FC9BB] block font-mono text-[11px] uppercase">
                    1. Isolated Local Execution
                  </span>
                  <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                    Uploaded NIfTI structural volumes (.nii.gz) are processed on the local host instance. No patient MRI voxel arrays are sent to external cloud APIs or public AI models.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[#111111]/10 space-y-1">
                  <span className="font-bold text-[#103B5C] dark:text-[#7FC9BB] block font-mono text-[11px] uppercase">
                    2. Role-Based Access Controls
                  </span>
                  <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                    Clinical operator sessions isolate diagnostic neuroradiology contours from benchmark dataset training dynamics, preserving clinical trial integrity.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[#111111]/10 space-y-1">
                  <span className="font-bold text-[#103B5C] dark:text-[#7FC9BB] block font-mono text-[11px] uppercase">
                    3. Investigational Research Scope
                  </span>
                  <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                    Neuro Resonence AI is an investigational software platform for clinical research. Algorithmic segmentations require expert neuroradiologist verification.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#111111]/10 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsSecurityModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#475569] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>

                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSecurityModalOpen(false);
                      onNavigate('security');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#103B5C] hover:bg-[#1B6284] text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer active:scale-95"
                  >
                    <span>Open Full Privacy &amp; Security Portal</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
