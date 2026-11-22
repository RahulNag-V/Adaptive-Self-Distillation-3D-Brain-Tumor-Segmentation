import React from 'react';
import { SkeletonBox, SkeletonText, SkeletonBadge, SkeletonButton, SkeletonCard } from './SkeletonBase';

export default function ResultsSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-[#111827]" aria-busy="true" aria-label="Loading Segmentation Results...">
      {/* Title & Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#98D9CE]/60 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <SkeletonBadge className="w-56" />
            <SkeletonText className="w-48" height="h-3" />
          </div>
          <div className="flex items-center gap-3">
            <SkeletonText className="w-80" height="h-8" rounded="rounded-lg" />
            <SkeletonBadge className="w-28" />
          </div>
          <SkeletonText className="w-full max-w-xl" height="h-3.5" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <SkeletonButton className="w-36" height="h-9" />
          <SkeletonButton className="w-48" height="h-9" />
          <SkeletonButton className="w-32" height="h-9" />
          <SkeletonButton className="w-20" height="h-9" />
        </div>
      </div>

      {/* 5 Primary Metric Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SkeletonText className="w-48" height="h-3.5" />
          <SkeletonBadge className="w-36" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {['Mean Dice', 'WT Dice', 'TC Dice', 'ET Dice', 'Mean HD95'].map((metric) => (
            <div key={metric} className="skeleton-card rounded-xl p-4 space-y-1.5">
              <SkeletonText className="w-20" height="h-2.5" />
              <SkeletonText className="w-24" height="h-7" />
              <SkeletonText className="w-full" height="h-2.5" />
            </div>
          ))}
        </div>
      </div>

      {/* Sub-Compartment Volumetric Breakdown & Model Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 skeleton-card rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-[#111111]/15 pb-3">
            <SkeletonText className="w-64" height="h-4" />
            <SkeletonBadge className="w-32" />
          </div>
          <div className="space-y-4 pt-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3.5 rounded-xl skeleton-shimmer skeleton-surface space-y-2">
                <div className="flex justify-between">
                  <SkeletonText className="w-36" height="h-3.5" />
                  <SkeletonText className="w-24" height="h-3.5" />
                </div>
                <SkeletonBox className="w-full h-3" rounded="rounded-full" />
                <SkeletonText className="w-3/4" height="h-2.5" />
              </div>
            ))}
          </div>
        </div>

        <div className="skeleton-card rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-[#111111]/15 pb-3">
            <SkeletonText className="w-44" height="h-4" />
            <SkeletonBadge className="w-16" />
          </div>
          <div className="space-y-3 pt-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex justify-between py-1 border-b border-[#111111]/10">
                <SkeletonText className="w-28" height="h-3" />
                <SkeletonText className="w-32" height="h-3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
