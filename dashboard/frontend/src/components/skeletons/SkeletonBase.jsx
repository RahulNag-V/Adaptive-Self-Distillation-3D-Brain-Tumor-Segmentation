import React from 'react';

/**
 * SkeletonBox: Base placeholder block with soft mint surface, translucent border, and subtle shimmer.
 */
export function SkeletonBox({ className = '', style = {}, rounded = 'rounded-xl', children }) {
  return (
    <div
      className={`skeleton-shimmer skeleton-surface ${rounded} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * SkeletonText: Text line placeholder.
 */
export function SkeletonText({ className = 'w-full', height = 'h-4', rounded = 'rounded-md' }) {
  return (
    <div
      className={`skeleton-shimmer skeleton-surface ${height} ${rounded} ${className}`}
    />
  );
}

/**
 * SkeletonBadge: Pill-shaped badge placeholder.
 */
export function SkeletonBadge({ className = 'w-24', height = 'h-5' }) {
  return (
    <div
      className={`skeleton-shimmer skeleton-surface rounded-full ${height} ${className}`}
    />
  );
}

/**
 * SkeletonButton: Button placeholder.
 */
export function SkeletonButton({ className = 'w-32', height = 'h-9', rounded = 'rounded-xl' }) {
  return (
    <div
      className={`skeleton-shimmer skeleton-surface ${height} ${rounded} ${className}`}
    />
  );
}

/**
 * SkeletonCard: Frosted-glass container card matching card-transparent.
 */
export function SkeletonCard({ className = '', children }) {
  return (
    <div className={`skeleton-card rounded-2xl p-5 sm:p-6 space-y-4 ${className}`}>
      {children}
    </div>
  );
}
