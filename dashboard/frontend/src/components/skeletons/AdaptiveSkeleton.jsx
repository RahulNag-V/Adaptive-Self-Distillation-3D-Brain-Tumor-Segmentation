import React from 'react';
import { SkeletonBox, SkeletonText, SkeletonBadge, SkeletonButton, SkeletonCard } from './SkeletonBase';

export default function AdaptiveSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-[#111827]" aria-busy="true" aria-label="Loading Adaptive Learning...">
      {/* 1. Header Command Strip */}
      <SkeletonCard>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#111111]/15 pb-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <SkeletonBadge className="w-56" />
              <SkeletonText className="w-48" height="h-3" />
            </div>
            <SkeletonText className="w-80 sm:w-[420px]" height="h-8" rounded="rounded-lg" />
            <SkeletonText className="w-full max-w-xl" height="h-3.5" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SkeletonButton className="w-24" height="h-9" />
            <SkeletonButton className="w-36" height="h-9" />
          </div>
        </div>
      </SkeletonCard>

      {/* 2. Segmentation Review Summary Card */}
      <SkeletonCard>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#111111]/15 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <SkeletonBadge className="w-36" height="h-4" />
              <SkeletonText className="w-44" height="h-3" />
            </div>
            <SkeletonText className="w-64" height="h-6" />
          </div>
          <SkeletonBadge className="w-32" height="h-6" />
        </div>

        {/* 4 Metadata Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3.5 rounded-xl skeleton-shimmer skeleton-surface space-y-2">
              <SkeletonText className="w-20" height="h-2.5" />
              <SkeletonText className="w-32" height="h-4" />
              <SkeletonText className="w-full" height="h-2.5" />
            </div>
          ))}
        </div>

        {/* Action Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#111111]/15">
          <SkeletonText className="w-72" height="h-3" />
          <div className="flex gap-2">
            <SkeletonButton className="w-36" height="h-9" />
            <SkeletonButton className="w-44" height="h-9" />
          </div>
        </div>
      </SkeletonCard>

      {/* 3. 4-Stage Governance Distinction Pipeline */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {['1. Data Collected', '2. Data Approved', '3. Used for Training', '4. Model Improved'].map((stage) => (
          <div key={stage} className="skeleton-card p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <SkeletonText className="w-24" height="h-3" />
              <SkeletonBox className="w-4 h-4" rounded="rounded" />
            </div>
            <SkeletonText className="w-16" height="h-7" />
            <SkeletonText className="w-32" height="h-2.5" />
          </div>
        ))}
      </div>

      {/* 4. Supervisory Review Queue Table */}
      <SkeletonCard>
        <div className="flex items-center justify-between border-b border-[#111111]/15 pb-3">
          <div className="space-y-1">
            <SkeletonText className="w-56" height="h-5" />
            <SkeletonText className="w-80" height="h-3" />
          </div>
          <SkeletonBadge className="w-20" />
        </div>
        <div className="space-y-2 pt-2">
          {[1, 2, 3].map((row) => (
            <div key={row} className="p-3 rounded-lg skeleton-shimmer skeleton-surface flex items-center justify-between gap-4">
              <SkeletonText className="w-36" height="h-4" />
              <SkeletonText className="w-20" height="h-3" />
              <SkeletonText className="w-16" height="h-3" />
              <SkeletonText className="w-48" height="h-3" />
              <div className="flex gap-2">
                <SkeletonBox className="w-16 h-7" rounded="rounded-md" />
                <SkeletonBox className="w-16 h-7" rounded="rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}
