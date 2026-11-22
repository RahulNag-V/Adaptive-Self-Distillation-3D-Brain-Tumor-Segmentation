import React from 'react';
import { SkeletonBox, SkeletonText, SkeletonBadge, SkeletonButton, SkeletonCard } from './SkeletonBase';

export default function ClassificationSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-[#111827]" aria-busy="true" aria-label="Loading 2D Pathology...">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#98D9CE]/60 pb-5">
        <div className="space-y-1.5">
          <SkeletonBadge className="w-64" />
          <SkeletonText className="w-80 sm:w-96" height="h-8" rounded="rounded-lg" />
          <SkeletonText className="w-full max-w-xl" height="h-3.5" />
        </div>
        <SkeletonBadge className="w-36" height="h-8" />
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Upload Dropzone Card */}
        <SkeletonCard>
          <div className="flex justify-between items-center border-b border-[#111111]/15 pb-3">
            <SkeletonText className="w-44" height="h-4" />
            <SkeletonBadge className="w-24" />
          </div>
          <div className="h-64 rounded-xl skeleton-shimmer skeleton-surface border border-dashed border-[rgba(94,173,157,0.35)] flex flex-col items-center justify-center p-6 gap-3">
            <SkeletonBox className="w-12 h-12" rounded="rounded-full" />
            <SkeletonText className="w-48" height="h-4" />
            <SkeletonText className="w-64" height="h-3" />
          </div>
          <div className="space-y-2 pt-2">
            <SkeletonText className="w-36" height="h-3" />
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonBox key={i} className="h-16" rounded="rounded-lg" />
              ))}
            </div>
          </div>
          <div className="pt-2">
            <SkeletonButton className="w-full" height="h-10" />
          </div>
        </SkeletonCard>

        {/* Right: Prediction Results Card */}
        <SkeletonCard>
          <div className="flex justify-between items-center border-b border-[#111111]/15 pb-3">
            <SkeletonText className="w-44" height="h-4" />
            <SkeletonBadge className="w-28" />
          </div>
          <div className="p-4 rounded-xl skeleton-shimmer skeleton-surface space-y-2">
            <SkeletonText className="w-32" height="h-3" />
            <SkeletonText className="w-56" height="h-7" />
            <SkeletonText className="w-40" height="h-4" />
          </div>
          <div className="space-y-3 pt-2">
            <SkeletonText className="w-48" height="h-3.5" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between">
                  <SkeletonText className="w-24" height="h-3" />
                  <SkeletonText className="w-16" height="h-3" />
                </div>
                <SkeletonBox className="w-full h-3" rounded="rounded-full" />
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
    </div>
  );
}
