import React from 'react';
import { SkeletonBox, SkeletonText, SkeletonBadge, SkeletonButton, SkeletonCard } from './SkeletonBase';

export default function SecuritySkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-[#111827]" aria-busy="true" aria-label="Loading Privacy & Clinical Security...">
      {/* Top Hero Container */}
      <SkeletonCard>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <SkeletonBadge className="w-56" />
            <SkeletonText className="w-48" height="h-3" />
          </div>
          <SkeletonText className="w-80 sm:w-[460px]" height="h-8" rounded="rounded-lg" />
          <SkeletonText className="w-full max-w-xl" height="h-3.5" />
          <div className="flex gap-4 pt-2">
            <SkeletonText className="w-36" height="h-3" />
            <SkeletonText className="w-48" height="h-3" />
            <SkeletonText className="w-40" height="h-3" />
          </div>
        </div>
      </SkeletonCard>

      {/* 3 Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['Data Protection & Sandboxing', 'Access Control & Authorization', 'Secure Local Processing & Storage'].map((title) => (
          <SkeletonCard key={title}>
            <div className="flex justify-between items-center border-b border-[#111111]/15 pb-3">
              <SkeletonBox className="w-7 h-7" rounded="rounded-lg" />
              <SkeletonBadge className="w-24" />
            </div>
            <div className="space-y-2 pt-1">
              <SkeletonText className="w-48" height="h-4" />
              <SkeletonText className="w-full" height="h-3" />
              <SkeletonText className="w-5/6" height="h-3" />
            </div>
            <div className="pt-2">
              <SkeletonText className="w-32" height="h-3" />
            </div>
          </SkeletonCard>
        ))}
      </div>

      {/* Detailed Specifications Accordion Section */}
      <SkeletonCard>
        <div className="flex items-center justify-between border-b border-[#111111]/15 pb-4">
          <SkeletonText className="w-64" height="h-5" />
          <div className="flex gap-2">
            <SkeletonBox className="w-20 h-7" rounded="rounded-md" />
            <SkeletonBox className="w-20 h-7" rounded="rounded-md" />
          </div>
        </div>

        {/* 6 Accordion Rows */}
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div key={row} className="p-4 rounded-xl skeleton-shimmer skeleton-surface flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SkeletonBox className="w-7 h-7" rounded="rounded-lg" />
                <div className="space-y-1">
                  <SkeletonText className="w-48" height="h-2.5" />
                  <SkeletonText className="w-64 sm:w-80" height="h-4" />
                </div>
              </div>
              <SkeletonBox className="w-4 h-4" rounded="rounded-full" />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}
