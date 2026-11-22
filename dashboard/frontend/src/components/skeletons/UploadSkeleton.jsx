import React from 'react';
import { SkeletonBox, SkeletonText, SkeletonBadge, SkeletonButton, SkeletonCard } from './SkeletonBase';

export default function UploadSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-[#111827]" aria-busy="true" aria-label="Loading AI Segmentation...">
      {/* Header section */}
      <SkeletonCard>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#111111]/15 pb-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <SkeletonBadge className="w-48" />
              <SkeletonText className="w-56" height="h-3.5" />
            </div>
            <SkeletonText className="w-80 sm:w-96" height="h-8" rounded="rounded-lg" />
            <SkeletonText className="w-full max-w-xl" height="h-3.5" />
          </div>
          <div className="shrink-0">
            <SkeletonButton className="w-56" height="h-10" />
          </div>
        </div>

        {/* Modality Selection Tabs */}
        <div className="flex gap-2 pt-1">
          <SkeletonButton className="w-44" height="h-9" rounded="rounded-lg" />
          <SkeletonButton className="w-44" height="h-9" rounded="rounded-lg" />
        </div>
      </SkeletonCard>

      {/* 4 MRI Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-card rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <SkeletonBadge className="w-16" height="h-5" />
              <SkeletonText className="w-12" height="h-3" />
            </div>
            <SkeletonText className="w-full" height="h-3" />
            <div className="h-32 rounded-lg skeleton-shimmer skeleton-surface border border-dashed border-[rgba(94,173,157,0.35)] flex flex-col items-center justify-center p-3 gap-2">
              <SkeletonBox className="w-8 h-8" rounded="rounded-full" />
              <SkeletonText className="w-24" height="h-2.5" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <SkeletonText className="w-20" height="h-3" />
              <SkeletonText className="w-14" height="h-3" />
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline Status & Execution Card */}
      <SkeletonCard>
        <div className="flex items-center justify-between border-b border-[#111111]/15 pb-3">
          <SkeletonText className="w-48" height="h-5" />
          <SkeletonBadge className="w-28" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3.5 rounded-xl skeleton-shimmer skeleton-surface space-y-2">
              <SkeletonText className="w-24" height="h-3" />
              <SkeletonText className="w-36" height="h-4" />
              <SkeletonText className="w-full" height="h-2.5" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-[#111111]/15">
          <SkeletonButton className="w-24" height="h-10" />
          <SkeletonButton className="w-48" height="h-10" />
        </div>
      </SkeletonCard>
    </div>
  );
}
