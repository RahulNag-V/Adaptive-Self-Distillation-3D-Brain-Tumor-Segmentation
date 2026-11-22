import React, { useState, useRef, useEffect, useId } from 'react';
import { prefersReducedMotion } from '../../utils/motion';

/**
 * PeakChart
 * 
 * Clinical data visualization component adapted for Neuro Resonence AI research metrics.
 * Features:
 * - Animated SVG line-drawing with stroke-dashoffset transitions
 * - Soft area fill gradients under trajectories
 * - Glowing interactive peak & scrubber nodes (SVG feGaussianBlur)
 * - Dynamic tooltip readout card tracking cursor coordinates
 * - Full support for multi-series trajectories (Dice, Losses, Loss-Weights)
 * - Neuro Resonence AI Palette: Deep Blue (#103B5C), Brand Blue (#399DBA), Ocean Blue (#1B6284), Mint (#98D9CE)
 * - Full reduced-motion compliance and zero GPU strain during 3D MPR inspection
 */
export default function PeakChart({
  series = [], // Array of { id, label, color, points: [{ x, y, val, epoch }], strokeWidth, dash, isArea }
  yAxisLabels = [],
  xAxisLabels = [],
  width = 760,
  height = 280,
  padding = { top: 32, right: 45, bottom: 42, left: 55 },
  selectedIndex = null,
  hoveredIndex = null,
  onHoverIndex = null,
  onSelectIndex = null,
  className = '',
  peakPoint = null, // Optional explicit { x, y, label, val }
  unit = '',
  formatValue = (v) => (typeof v === 'number' ? v.toFixed(3) : v),
}) {
  const chartId = useId().replace(/:/g, '');
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(760);
  const [localHoverIndex, setLocalHoverIndex] = useState(null);
  const [animateProgress, setAnimateProgress] = useState(false);
  const isReduced = typeof window !== 'undefined' ? prefersReducedMotion() : false;

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (isReduced) {
      setAnimateProgress(true);
      return;
    }
    setAnimateProgress(false);
    const raf = requestAnimationFrame(() => {
      setAnimateProgress(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [series, isReduced]);

  const activeIndex = hoveredIndex !== null ? hoveredIndex : localHoverIndex !== null ? localHoverIndex : selectedIndex;

  const getClosestIndex = (clientX) => {
    if (!svgRef.current || (!xAxisLabels.length && !series[0]?.points?.length)) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const svgX = (mouseX / rect.width) * width;
    const pointsCount = xAxisLabels.length || series[0]?.points?.length || 1;
    const plotWidth = width - padding.left - padding.right;

    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < pointsCount; i++) {
      const x = padding.left + (i / Math.max(1, pointsCount - 1)) * plotWidth;
      const diff = Math.abs(x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    return closestIdx;
  };

  const handleMouseMove = (e) => {
    const closestIdx = getClosestIndex(e.clientX);
    setLocalHoverIndex(closestIdx);
    if (onHoverIndex) onHoverIndex(closestIdx);
  };

  const handleTouch = (e) => {
    if (!e.touches || !e.touches[0]) return;
    const closestIdx = getClosestIndex(e.touches[0].clientX);
    setLocalHoverIndex(closestIdx);
    if (onHoverIndex) onHoverIndex(closestIdx);
    if (onSelectIndex) onSelectIndex(closestIdx);
  };

  const handleMouseLeave = () => {
    setLocalHoverIndex(null);
    if (onHoverIndex) onHoverIndex(null);
  };

  const handleClick = () => {
    const targetIdx = localHoverIndex !== null ? localHoverIndex : activeIndex;
    if (targetIdx !== null && onSelectIndex) {
      onSelectIndex(targetIdx);
    }
  };

  // Only display peak indicator if explicitly passed via peakPoint prop
  const calculatedPeak = peakPoint;

  const pointsCount = xAxisLabels.length || series[0]?.points?.length || 1;
  const activePt = series[0]?.points?.[activeIndex];
  const activeX = activePt
    ? activePt.x
    : activeIndex !== null
    ? padding.left + (activeIndex / Math.max(1, pointsCount - 1)) * (width - padding.left - padding.right)
    : null;

  // Collision-aware and responsive tooltip positioning calculation
  const isCompactScreen = containerWidth < 540;
  const activeRatio = activeX !== null ? activeX / width : 0.5;
  const isRightHalf = activeRatio > 0.52;

  // Approximate vertical center of the series values at activeIndex
  let activeYCenter = 70;
  if (activeIndex !== null && series.length > 0) {
    const validPoints = series
      .map(s => s.points?.[activeIndex]?.y)
      .filter(y => typeof y === 'number' && !isNaN(y));
    if (validPoints.length > 0) {
      activeYCenter = validPoints.reduce((a, b) => a + b, 0) / validPoints.length;
    }
  }

  const activeYRatio = Math.max(0.06, Math.min(0.55, (activeYCenter - 22) / height));

  let tooltipStyle = {};
  if (isCompactScreen) {
    // Mobile / compact layout: Centered top banner, never overflows
    tooltipStyle = {
      top: '8px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 24px)',
      maxWidth: '380px',
    };
  } else if (isRightHalf) {
    // Right half (E6 - E10): Shift tooltip to the LEFT of the active line
    const rightPct = ((width - activeX) / width) * 100;
    tooltipStyle = {
      top: `${(activeYRatio * 100).toFixed(1)}%`,
      right: `calc(${rightPct.toFixed(2)}% + 14px)`,
      left: 'auto',
      maxWidth: `calc(${((activeX / width) * 100).toFixed(1)}% - 20px)`,
    };
  } else {
    // Left half (E1 - E5): Shift tooltip to the RIGHT of the active line
    const leftPct = (activeX / width) * 100;
    tooltipStyle = {
      top: `${(activeYRatio * 100).toFixed(1)}%`,
      left: `calc(${leftPct.toFixed(2)}% + 14px)`,
      right: 'auto',
      maxWidth: `calc(${(((width - activeX) / width) * 100).toFixed(1)}% - 20px)`,
    };
  }

  return (
    <div ref={containerRef} className={`relative w-full select-none ${className}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible cursor-crosshair"
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouch}
        onTouchMove={handleTouch}
        onClick={handleClick}
      >
        <defs>
          {/* Subtle Glow Filter for Peak Indicators */}
          <filter id={`glow-${chartId}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Brand Blue & Mint Area Gradients */}
          <linearGradient id={`area-deep-${chartId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#103B5C" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#103B5C" stopOpacity="0.0" />
          </linearGradient>

          <linearGradient id={`area-cyan-${chartId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#399DBA" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#399DBA" stopOpacity="0.0" />
          </linearGradient>

          <linearGradient id={`area-sky-${chartId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1B6284" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#1B6284" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* 1. Horizontal Reference Grid & Y-Axis Labels */}
        {yAxisLabels.map((lbl, idx) => {
          const y = padding.top + (idx / Math.max(1, yAxisLabels.length - 1)) * (height - padding.top - padding.bottom);
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#CDEAE5"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x={padding.left - 10}
                y={y + 3.5}
                textAnchor="end"
                fill="#164D70"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="600"
              >
                {lbl}
              </text>
            </g>
          );
        })}

        {/* 2. Trajectory Area Fills */}
        {series.map((s, sIdx) => {
          if (!s.isArea || !s.points || s.points.length < 2) return null;
          const firstPt = s.points[0];
          const lastPt = s.points[s.points.length - 1];
          const baselineY = height - padding.bottom;
          const ptsStr = s.points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ');
          const areaD = `M ${firstPt.x.toFixed(1)},${baselineY} L ${ptsStr} L ${lastPt.x.toFixed(1)},${baselineY} Z`;

          const gradId = sIdx === 0
            ? `area-deep-${chartId}`
            : sIdx === 1
            ? `area-cyan-${chartId}`
            : `area-sky-${chartId}`;

          return (
            <path
              key={`area-${s.id || sIdx}`}
              d={areaD}
              fill={`url(#${gradId})`}
              className="transition-opacity duration-300"
              opacity={animateProgress ? 1 : 0}
            />
          );
        })}

        {/* 3. Trajectory Lines with Animated Drawing */}
        {series.map((s, sIdx) => {
          if (!s.points || s.points.length < 2) return null;
          const pointsStr = s.points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
          const strokeColor = s.color || '#399DBA';

          return (
            <polyline
              key={`line-${s.id || sIdx}`}
              points={pointsStr}
              fill="none"
              stroke={strokeColor}
              strokeWidth={s.strokeWidth || 2.5}
              strokeDasharray={s.dash || undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          );
        })}

        {/* 3b. Node Dots along All Series Trajectories */}
        {series.map((s, sIdx) => {
          if (!s.points) return null;
          return s.points.map((p, pIdx) => {
            if (activeIndex === pIdx) return null; // Rendered prominently as active-dot
            return (
              <circle
                key={`node-${s.id || sIdx}-${pIdx}`}
                cx={p.x}
                cy={p.y}
                r="3"
                fill="#FFFDF9"
                stroke={s.color || '#399DBA'}
                strokeWidth="1.5"
                className="opacity-80"
              />
            );
          });
        })}

        {/* 4. Vertical Interactive Scrubber Guideline (Exact align to activeX = pt.x) */}
        {activeX !== null && (
          <g className="transition-all duration-100 pointer-events-none">
            <line
              x1={activeX}
              y1={padding.top}
              x2={activeX}
              y2={height - padding.bottom}
              stroke="#399DBA"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            {/* Base anchor circle */}
            <circle
              cx={activeX}
              cy={height - padding.bottom + 8}
              r="4"
              fill="#399DBA"
              className="animate-pulse"
            />
          </g>
        )}

        {/* 5. Glowing Peak Node Indicator (only when explicitly provided) */}
        {calculatedPeak && (
          <g className="transition-transform duration-300 pointer-events-none" filter={`url(#glow-${chartId})`}>
            {/* Outer halo */}
            <circle
              cx={calculatedPeak.x}
              cy={calculatedPeak.y}
              r="7"
              fill="#98D9CE"
              opacity="0.5"
              className="animate-ping"
            />
            {/* Solid core */}
            <circle
              cx={calculatedPeak.x}
              cy={calculatedPeak.y}
              r="4.5"
              fill="#103B5C"
              stroke="#399DBA"
              strokeWidth="2"
            />
          </g>
        )}

        {/* 6. Intersection Dots on All Trajectories at Active Index (Exact align to pt.x = activeX) */}
        {activeIndex !== null &&
          series.map((s, sIdx) => {
            const pt = s.points ? s.points[activeIndex] : null;
            if (!pt) return null;
            return (
              <g key={`active-dot-${s.id || sIdx}`} className="pointer-events-none">
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="5"
                  fill="#FFFDF9"
                  stroke={s.color || '#399DBA'}
                  strokeWidth="2.5"
                  filter={`url(#glow-${chartId})`}
                />
              </g>
            );
          })}

        {/* 7. X-Axis Epoch/Interval Labels (Centered directly below pt.x) */}
        {xAxisLabels.map((lbl, idx) => {
          const pt = series[0]?.points?.[idx];
          const x = pt
            ? pt.x
            : padding.left + (idx / Math.max(1, xAxisLabels.length - 1)) * (width - padding.left - padding.right);
          const isCurrent = activeIndex === idx;
          return (
            <text
              key={idx}
              x={x}
              y={height - padding.bottom + 24}
              textAnchor="middle"
              fill={isCurrent ? '#103B5C' : '#164D70'}
              fontSize="10"
              fontFamily="monospace"
              fontWeight={isCurrent ? '700' : '500'}
              className="transition-colors cursor-pointer select-none"
            >
              {lbl}
            </text>
          );
        })}
      </svg>

      {/* 8. Collision-Aware Floating Hover Readout Card */}
      {activeIndex !== null && (
        <div
          className="absolute pointer-events-none z-30 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white/95 dark:bg-[#0c1e28]/95 border border-[#98D9CE] dark:border-white/20 shadow-md backdrop-blur-md flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1.5 text-xs font-mono transition-all duration-150"
          style={tooltipStyle}
        >
          {/* Epoch Badge */}
          <div className="font-bold text-[#103B5C] dark:text-[#98D9CE] px-2 py-0.5 rounded-md bg-[#EBF8F6] dark:bg-[#103B5C]/50 border border-[#98D9CE] dark:border-[#164D70] shrink-0 text-xs shadow-xs">
            {xAxisLabels[activeIndex] || `Point ${activeIndex + 1}`}
          </div>

          {/* Metric Badges */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1">
            {series.map((s, sIdx) => {
              const pt = s.points ? s.points[activeIndex] : null;
              if (!pt) return null;
              const formattedVal = formatValue(pt.val);
              const displayVal = unit === '%' ? `${formattedVal}%` : unit ? `${formattedVal} ${unit}` : formattedVal;
              const labelText = s.shortLabel || s.label;

              return (
                <div key={sIdx} className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: s.color || '#399DBA' }}
                  />
                  <span className="text-[#25313D] dark:text-slate-300 font-medium">
                    {labelText}:
                  </span>
                  <span className="font-bold text-[#103B5C] dark:text-white">
                    {displayVal}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
