import React from 'react';
import { SkeletonBox, SkeletonText, SkeletonBadge, SkeletonButton, SkeletonCard } from './SkeletonBase';

export default function AnalyticsSkeleton() {
  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-[#111827]" aria-busy="true" aria-label="Loading Training Dynamics...">
      {/* 1. Header & Training Dynamics Overview */}
      <SkeletonCard>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#111111]/15 pb-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <SkeletonBadge className="w-56" />
              <SkeletonText className="w-64" height="h-3" />
            </div>
            <SkeletonText className="w-80 sm:w-[460px]" height="h-8" rounded="rounded-lg" />
            <SkeletonText className="w-full max-w-xl" height="h-3.5" />
          </div>
          <div className="flex items-center shrink-0">
            <SkeletonButton className="w-36" height="h-9" />
          </div>
        </div>

        {/* Highlight KPI Matrix (4 Cards) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3.5 rounded-lg skeleton-shimmer skeleton-surface space-y-1.5">
              <SkeletonText className="w-28" height="h-2.5" />
              <SkeletonText className="w-20" height="h-6" />
              <SkeletonText className="w-36" height="h-2.5" />
            </div>
          ))}
        </div>
      </SkeletonCard>

      {/* 2. Interactive Loss & Validation Convergence Chart */}
      <SkeletonCard>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#111111]/15 pb-4">
          <div className="space-y-1">
            <SkeletonText className="w-48" height="h-5" />
            <SkeletonText className="w-72" height="h-3" />
          </div>

          {/* 4 Curve Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 rounded-lg skeleton-shimmer skeleton-surface">
            {['Loss Dynamics', 'Validation Dice', 'Distillation Weights', 'Boundary Error'].map((tab) => (
              <SkeletonBox key={tab} className="w-28 h-7" rounded="rounded-md" />
            ))}
          </div>
        </div>

        {/* Big Chart Visualization Canvas */}
        <div className="h-80 sm:h-96 rounded-xl skeleton-shimmer skeleton-surface p-6 flex flex-col justify-between border border-[rgba(94,173,157,0.3)]">
          <div className="flex justify-between items-center">
            <SkeletonText className="w-40" height="h-3.5" />
            <SkeletonBadge className="w-24" />
          </div>
          <div className="w-full flex-1 my-4 flex items-center justify-center">
            <div className="w-full h-32 border-b border-t border-dashed border-[rgba(16,59,92,0.2)] flex items-center justify-around">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((ep) => (
                <div key={ep} className="w-2 h-16 rounded-full bg-[rgba(16,59,92,0.15)]" />
              ))}
            </div>
          </div>
          <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-[#111111]/10">
            <span>Epoch E1</span>
            <span>Epoch E5</span>
            <span>Epoch E10 (Final)</span>
          </div>
        </div>

        {/* Legend row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-4">
            <SkeletonText className="w-32" height="h-3" />
            <SkeletonText className="w-32" height="h-3" />
            <SkeletonText className="w-32" height="h-3" />
          </div>
          <SkeletonBadge className="w-28" />
        </div>
      </SkeletonCard>

      {/* 3. Epoch History Table */}
      <SkeletonCard>
        <div className="flex items-center justify-between border-b border-[#111111]/15 pb-3">
          <SkeletonText className="w-64" height="h-4" />
          <SkeletonText className="w-40" height="h-3" />
        </div>
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4].map((row) => (
            <div key={row} className="p-2.5 rounded-lg skeleton-shimmer skeleton-surface flex justify-between">
              <SkeletonText className="w-20" height="h-3.5" />
              <SkeletonText className="w-24" height="h-3.5" />
              <SkeletonText className="w-24" height="h-3.5" />
              <SkeletonText className="w-24" height="h-3.5" />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}
