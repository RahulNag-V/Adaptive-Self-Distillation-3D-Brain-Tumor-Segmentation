import React from 'react';
import { SkeletonBox, SkeletonText, SkeletonBadge, SkeletonButton, SkeletonCard } from './SkeletonBase';

export default function ReportSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-[#111827]" aria-busy="true" aria-label="Loading Clinical Reports...">
      {/* Header section */}
      <SkeletonCard>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <SkeletonBadge className="w-48" />
            <SkeletonText className="w-80 sm:w-96" height="h-7" rounded="rounded-lg" />
            <SkeletonText className="w-full max-w-xl" height="h-3.5" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SkeletonButton className="w-44" height="h-9" />
            <SkeletonButton className="w-28" height="h-9" />
            <SkeletonButton className="w-36" height="h-9" />
          </div>
        </div>
      </SkeletonCard>

      {/* Patient & Scan Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-card p-4 rounded-xl space-y-1.5">
            <SkeletonText className="w-24" height="h-2.5" />
            <SkeletonText className="w-36" height="h-5" />
            <SkeletonText className="w-full" height="h-2.5" />
          </div>
        ))}
      </div>

      {/* Volumetric Assessment Findings Table */}
      <SkeletonCard>
        <div className="flex justify-between items-center border-b border-[#111111]/15 pb-3">
          <SkeletonText className="w-64" height="h-4" />
          <SkeletonBadge className="w-24" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="p-3 rounded-lg skeleton-shimmer skeleton-surface flex justify-between items-center">
              <SkeletonText className="w-40" height="h-3.5" />
              <SkeletonText className="w-24" height="h-3.5" />
              <SkeletonText className="w-24" height="h-3.5" />
              <SkeletonText className="w-28" height="h-3.5" />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}
