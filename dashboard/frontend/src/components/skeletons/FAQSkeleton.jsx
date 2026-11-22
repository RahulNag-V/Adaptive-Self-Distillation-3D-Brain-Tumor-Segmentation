import React from 'react';
import { SkeletonBox, SkeletonText, SkeletonBadge, SkeletonButton, SkeletonCard } from './SkeletonBase';

export default function FAQSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-[#111827]" aria-busy="true" aria-label="Loading Frequently Asked Questions...">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Fixed / Sticky Knowledge Base Card */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
          <SkeletonCard>
            <div className="space-y-3">
              <SkeletonBadge className="w-48" />
              <SkeletonText className="w-64" height="h-8" rounded="rounded-lg" />
              <SkeletonText className="w-full" height="h-3.5" />
              <SkeletonText className="w-4/5" height="h-3.5" />
            </div>

            <div className="p-4 rounded-xl skeleton-shimmer skeleton-surface space-y-2 mt-4">
              <SkeletonText className="w-40" height="h-3.5" />
              <SkeletonText className="w-full" height="h-3" />
              <div className="flex gap-3 pt-2">
                <SkeletonText className="w-28" height="h-3" />
                <SkeletonText className="w-28" height="h-3" />
              </div>
            </div>
          </SkeletonCard>
        </div>

        {/* Right Column: List of Question Accordions */}
        <div className="lg:col-span-7 skeleton-card rounded-2xl p-4 sm:p-6 space-y-3 max-h-[700px] overflow-hidden">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="p-4 rounded-xl skeleton-shimmer skeleton-surface flex items-center justify-between">
              <SkeletonText className="w-3/4" height="h-4" />
              <SkeletonBox className="w-4 h-4" rounded="rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
