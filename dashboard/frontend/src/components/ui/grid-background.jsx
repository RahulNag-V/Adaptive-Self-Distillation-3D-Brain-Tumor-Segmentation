import React from 'react';

/**
 * GridBackground
 * 
 * Reusable clean medical workstation background component for Neuro Resonence AI.
 * Solid clean backgrounds with crisp, high-contrast readability.
 * Subtle non-intrusive clinical precision grid lines (40px spacing).
 * Zero background gradients behind text. Zero decorative gradient overlays.
 * Fully non-intrusive: pointer-events: none, zero impact on scrolling or click events.
 */
export default function GridBackground({
  children,
  className = '',
  isDark = false,
}) {
  return (
    <div
      className={`relative min-h-full h-full w-full flex flex-col transition-colors duration-300 ${
        isDark ? 'bg-[#092B47] text-[#F9FAFB]' : 'bg-[var(--app-background-deep-mint)] text-[#000000]'
      } ${className}`}
    >
      {/* 1. Thin 40px Precision Clinical Grid Lines */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        aria-hidden="true"
        style={{
          backgroundImage: isDark
            ? `linear-gradient(to right, rgba(152, 217, 206, 0.04) 1px, transparent 1px),
               linear-gradient(to bottom, rgba(152, 217, 206, 0.04) 1px, transparent 1px)`
            : `linear-gradient(to right, rgba(16, 59, 92, 0.07) 1px, transparent 1px),
               linear-gradient(to bottom, rgba(16, 59, 92, 0.07) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* 2. Content Layer */}
      {children && (
        <div className="relative z-10 min-h-full h-full w-full flex-1 flex flex-col min-h-0">
          {children}
        </div>
      )}
    </div>
  );
}
