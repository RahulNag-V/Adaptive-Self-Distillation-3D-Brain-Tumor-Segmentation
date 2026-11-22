import React from 'react';
import { SkeletonBox, SkeletonText, SkeletonBadge, SkeletonButton, SkeletonCard } from './SkeletonBase';

export default function AboutSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-[#111827]" aria-busy="true" aria-label="Loading Methodology...">
      {/* Header section */}
      <SkeletonCard>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <SkeletonBadge className="w-56" />
            <SkeletonText className="w-64" height="h-3" />
          </div>
          <SkeletonText className="w-80 sm:w-[500px]" height="h-8" rounded="rounded-lg" />
          <SkeletonText className="w-full max-w-2xl" height="h-3.5" />
        </div>
      </SkeletonCard>

      {/* 3 Scientific Pillar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i}>
            <div className="flex items-center justify-between border-b border-[#111111]/15 pb-3">
              <SkeletonText className="w-36" height="h-4" />
              <SkeletonBox className="w-6 h-6" rounded="rounded" />
            </div>
            <div className="space-y-2 pt-2">
              <SkeletonText className="w-full" height="h-3" />
              <SkeletonText className="w-5/6" height="h-3" />
              <SkeletonText className="w-4/5" height="h-3" />
            </div>
          </SkeletonCard>
        ))}
      </div>

      {/* Large Technical Deep Dive Section */}
      <SkeletonCard>
        <div className="flex justify-between items-center border-b border-[#111111]/15 pb-3">
          <SkeletonText className="w-64" height="h-4" />
          <SkeletonBadge className="w-32" />
        </div>
        <div className="space-y-3 pt-2">
          <div className="p-4 rounded-xl skeleton-shimmer skeleton-surface space-y-2">
            <SkeletonText className="w-48" height="h-3.5" />
            <SkeletonText className="w-full" height="h-3" />
            <SkeletonText className="w-2/3" height="h-3" />
          </div>
          <div className="p-4 rounded-xl skeleton-shimmer skeleton-surface space-y-2">
            <SkeletonText className="w-48" height="h-3.5" />
            <SkeletonText className="w-full" height="h-3" />
            <SkeletonText className="w-3/4" height="h-3" />
          </div>
        </div>
      </SkeletonCard>
    </div>
  );
}
