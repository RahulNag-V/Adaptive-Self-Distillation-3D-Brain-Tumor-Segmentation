import React from 'react';
import { SkeletonBox, SkeletonText, SkeletonBadge, SkeletonButton, SkeletonCard } from './SkeletonBase';

export default function ModelLabSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-[#111827]" aria-busy="true" aria-label="Loading Model Lab...">
      {/* 1. Header Section */}
      <SkeletonCard>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#111111]/15 pb-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <SkeletonBadge className="w-56" />
              <SkeletonText className="w-64" height="h-3" />
            </div>
            <SkeletonText className="w-80 sm:w-[480px]" height="h-8" rounded="rounded-lg" />
            <SkeletonText className="w-full max-w-xl" height="h-3.5" />
          </div>
          <div className="flex items-center shrink-0">
            <SkeletonButton className="w-32" height="h-9" />
          </div>
        </div>

        {/* 3 Scientific Takeaway Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          {['ENHANCING TUMOR PRECISION', 'BOUNDARY ERROR REDUCTION', 'MEAN DICE TRADE-OFF'].map((title) => (
            <div key={title} className="p-4 rounded-xl skeleton-shimmer skeleton-surface space-y-2">
              <SkeletonText className="w-36" height="h-2.5" />
              <SkeletonText className="w-48" height="h-6" />
              <SkeletonText className="w-full" height="h-3" />
              <SkeletonText className="w-5/6" height="h-3" />
            </div>
          ))}
        </div>
      </SkeletonCard>

      {/* 2. Model Selection & Comparison Bar */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl skeleton-card">
        {['Baseline UNETR', 'Online Tokenizer', 'Dense Predictor', 'Adaptive Self-Distillation'].map((m) => (
          <SkeletonBox key={m} className="w-40 sm:w-48 h-10" rounded="rounded-lg" />
        ))}
      </div>

      {/* 3. Multi-Metric Benchmark Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard>
          <SkeletonText className="w-56" height="h-4" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between">
                  <SkeletonText className="w-32" height="h-3" />
                  <SkeletonText className="w-16" height="h-3" />
                </div>
                <SkeletonBox className="w-full h-4" rounded="rounded-md" />
              </div>
            ))}
          </div>
        </SkeletonCard>

        <SkeletonCard>
          <SkeletonText className="w-56" height="h-4" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 rounded-lg skeleton-shimmer skeleton-surface flex justify-between items-center">
                <SkeletonText className="w-28" height="h-3" />
                <SkeletonText className="w-20" height="h-4" />
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>

      {/* 4. Quantitative Model Comparison Table */}
      <SkeletonCard>
        <div className="flex items-center justify-between border-b border-[#111111]/15 pb-3">
          <SkeletonText className="w-64" height="h-4" />
          <SkeletonBadge className="w-28" />
        </div>
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4].map((row) => (
            <div key={row} className="p-3 rounded-lg skeleton-shimmer skeleton-surface flex items-center justify-between">
              <SkeletonText className="w-36" height="h-3.5" />
              <SkeletonText className="w-20" height="h-3.5" />
              <SkeletonText className="w-20" height="h-3.5" />
              <SkeletonText className="w-20" height="h-3.5" />
              <SkeletonText className="w-24" height="h-3.5" />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}
