import React from 'react';
import { SkeletonBox, SkeletonText, SkeletonBadge, SkeletonButton } from './SkeletonBase';

export default function ViewerSkeleton() {
  return (
    <div className="h-full flex-1 flex flex-col min-h-0 relative p-3 sm:p-4 gap-3 text-[#111827]" aria-busy="true" aria-label="Loading 3D Workspace...">
      {/* Top Header Command Strip */}
      <div className="skeleton-card rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <SkeletonBadge className="w-32" height="h-6" />
          <div className="flex gap-1.5">
            {['FLAIR', 'T1', 'T1ce', 'T2'].map((m) => (
              <SkeletonBox key={m} className="w-14 h-7" rounded="rounded-md" />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBox className="w-40 h-7" rounded="rounded-md" />
          <SkeletonButton className="w-24" height="h-7" rounded="rounded-md" />
          <SkeletonButton className="w-24" height="h-7" rounded="rounded-md" />
        </div>
      </div>

      {/* Main Workspace Grid: Viewport + Right Panels */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
        {/* Left / Center: Main 3D Viewport Area */}
        <div className="flex-1 skeleton-card rounded-2xl p-4 flex flex-col justify-between min-h-[480px] relative overflow-hidden">
          {/* Top floating HUD toolbar */}
          <div className="flex justify-between items-center z-10">
            <SkeletonBox className="w-48 h-8" rounded="rounded-lg" />
            <SkeletonBox className="w-32 h-8" rounded="rounded-lg" />
          </div>

          {/* Center 3D Brain Wireframe Placeholder */}
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-44 h-44 rounded-full skeleton-shimmer skeleton-surface border border-[rgba(94,173,157,0.35)] flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border border-dashed border-[rgba(16,59,92,0.3)] animate-pulse" />
            </div>
            <SkeletonText className="w-40" height="h-3" />
          </div>

          {/* Bottom 3 Orthogonal Preview Slices */}
          <div className="flex items-center justify-center gap-3 pt-3 border-t border-[#111111]/15 z-10">
            {['Axial Slice', 'Coronal Slice', 'Sagittal Slice'].map((slice) => (
              <div key={slice} className="w-36 h-28 rounded-xl skeleton-shimmer skeleton-surface p-2 flex flex-col justify-between border border-[rgba(94,173,157,0.3)]">
                <SkeletonText className="w-20" height="h-3" />
                <div className="w-full flex-1 my-1 rounded bg-black/5" />
                <SkeletonText className="w-14" height="h-2.5" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar Panels */}
        <div className="w-full lg:w-80 flex flex-col gap-3 shrink-0">
          {/* Slice Coordinates Panel */}
          <div className="skeleton-card rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <SkeletonText className="w-32" height="h-4" />
              <SkeletonBadge className="w-14" />
            </div>
            <div className="space-y-2 pt-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <SkeletonText className="w-12" height="h-3" />
                  <SkeletonBox className="flex-1 h-3" rounded="rounded-full" />
                  <SkeletonText className="w-10" height="h-3" />
                </div>
              ))}
            </div>
          </div>

          {/* Tumor Burden Volumetrics */}
          <div className="skeleton-card rounded-2xl p-4 space-y-3 flex-1">
            <div className="flex justify-between items-center">
              <SkeletonText className="w-36" height="h-4" />
              <SkeletonBadge className="w-16" />
            </div>
            <div className="space-y-2.5 pt-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-2.5 rounded-lg skeleton-shimmer skeleton-surface space-y-1.5">
                  <div className="flex justify-between">
                    <SkeletonText className="w-24" height="h-3" />
                    <SkeletonText className="w-16" height="h-3" />
                  </div>
                  <SkeletonBox className="w-full h-2" rounded="rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
