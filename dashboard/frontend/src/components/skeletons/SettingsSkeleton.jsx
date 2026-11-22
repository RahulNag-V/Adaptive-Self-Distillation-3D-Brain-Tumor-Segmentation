import React from 'react';
import { SkeletonBox, SkeletonText, SkeletonBadge, SkeletonButton, SkeletonCard } from './SkeletonBase';

export default function SettingsSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-[#111827]" aria-busy="true" aria-label="Loading Workstation Settings...">
      {/* Header section */}
      <SkeletonCard>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <SkeletonBadge className="w-56" />
            <SkeletonText className="w-80 sm:w-96" height="h-7" rounded="rounded-lg" />
            <SkeletonText className="w-full max-w-xl" height="h-3.5" />
          </div>
          <SkeletonButton className="w-32" height="h-9" />
        </div>
      </SkeletonCard>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i}>
            <div className="flex justify-between items-center border-b border-[#111111]/15 pb-3">
              <SkeletonText className="w-48" height="h-4" />
              <SkeletonBadge className="w-20" />
            </div>
            <div className="space-y-3 pt-2">
              {[1, 2, 3].map((j) => (
                <div key={j} className="p-3 rounded-lg skeleton-shimmer skeleton-surface flex justify-between items-center">
                  <div className="space-y-1">
                    <SkeletonText className="w-36" height="h-3.5" />
                    <SkeletonText className="w-52" height="h-2.5" />
                  </div>
                  <SkeletonBox className="w-12 h-6" rounded="rounded-full" />
                </div>
              ))}
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}
