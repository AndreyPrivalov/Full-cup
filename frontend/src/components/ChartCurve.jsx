import { useEffect, useId, useMemo, useRef, useState } from "react";
import { formatNumber } from "../utils";

export const ChartCurve = ({
  data = [],
  xAxisKey = "name",
  dataKey = "value",
  color = "var(--clr-bg-accent)",
  className = "",
}) => {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const gradientId = useId();

  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          setContainerWidth(Math.round(rect.width));
        }
      }
    };

    updateWidth();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect && entry.contentRect.width > 0) {
          setContainerWidth(Math.round(entry.contentRect.width));
        }
      }
    });

    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const { points, linePath, areaPath } = useMemo(() => {
    if (!data || data.length === 0) {
      return { points: [], linePath: "", areaPath: "" };
    }

    const values = data.map((d) => Number(d[dataKey]) || 0);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const diff = rawMax - rawMin || 1;
    const padding = diff * 0.1;
    const min = Math.max(0, rawMin - padding);
    const max = rawMax + padding;
    const range = max - min || 1;

    const width = containerWidth || 800;
    const height = 220;
    const topPadding = 20;
    const bottomPadding = 40;
    const plotHeight = height - topPadding - bottomPadding;

    const pts = data.map((item, index) => {
      const val = Number(item[dataKey]) || 0;
      const x = data.length === 1 ? width / 2 : 40 + (index / (data.length - 1)) * (width - 80);
      const y = topPadding + plotHeight - ((val - min) / range) * plotHeight;

      let label = item[xAxisKey];
      let subLabel = item.subLabel || null;
      let tooltip = item.tooltip || null;
      let isJanuary = Boolean(item.isJanuary);

      // Support fallback if label is passed as "янв 26"
      if (typeof label === "string" && label.includes(" ")) {
        const parts = label.trim().split(/\s+/);
        if (parts.length === 2 && parts[1].length === 2) {
          label = parts[0];
          subLabel = parts[1];
          isJanuary = label.toLowerCase() === "янв";
          tooltip = tooltip || `${parts[0]} ${parts[1]}`;
        }
      } else if (typeof label === "string" && label.toLowerCase() === "янв") {
        isJanuary = true;
      }

      const isFirst = index === 0;
      const isLast = index === data.length - 1;
      const shouldShowYear = isFirst || isLast || isJanuary;
      const displaySubLabel = shouldShowYear ? subLabel : null;

      return {
        x,
        y,
        val,
        label,
        subLabel: displaySubLabel,
        isJanuary,
        tooltip: tooltip || (displaySubLabel ? `${label} ${displaySubLabel}` : label),
      };
    });

    if (pts.length === 1) {
      return {
        points: pts,
        linePath: `M 0 ${pts[0].y} L ${width} ${pts[0].y}`,
        areaPath: `M 0 ${pts[0].y} L ${width} ${pts[0].y} L ${width} ${height - bottomPadding} L 0 ${height - bottomPadding} Z`,
      };
    }

    // Smooth Bezier curve path
    let lPath = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const cx1 = curr.x + (next.x - curr.x) / 3;
      const cy1 = curr.y;
      const cx2 = curr.x + ((next.x - curr.x) * 2) / 3;
      const cy2 = next.y;
      lPath += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${next.x} ${next.y}`;
    }

    const groundY = height - bottomPadding;
    const aPath = `${lPath} L ${pts[pts.length - 1].x} ${groundY} L ${pts[0].x} ${groundY} Z`;

    return {
      points: pts,
      linePath: lPath,
      areaPath: aPath,
    };
  }, [data, dataKey, xAxisKey, containerWidth]);

  const width = containerWidth || 800;
  const maxLabels = Math.max(5, Math.floor(width / 80));

  const visibleLabelIndices = useMemo(() => {
    if (points.length === 0) return new Set();
    const visible = new Set();
    const minDistance = 32;

    // Priority 1: First, Last, and all January points must be visible
    points.forEach((pt, i) => {
      const isFirst = i === 0;
      const isLast = i === points.length - 1;
      if (isFirst || isLast || pt.isJanuary) {
        visible.add(i);
      }
    });

    // Priority 2: Evenly spaced intermediate points if distance allows
    const step = Math.ceil(points.length / maxLabels);
    for (let i = 0; i < points.length; i += step) {
      if (visible.has(i)) continue;
      let tooClose = false;
      for (const vIdx of visible) {
        if (Math.abs(points[i].x - points[vIdx].x) < minDistance) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) {
        visible.add(i);
      }
    }

    return visible;
  }, [points, maxLabels]);

  if (!data || data.length === 0) {
    return (
      <div
        className={`o-chart-curve a-flex a-items-center a-justify-center a-clr-text-secondary ${className}`}
      >
        Нет данных для графика
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`o-chart-curve ${className}`}
      style={{ position: "relative", width: "100%", height: "240px" }}
    >
      <svg
        viewBox={`0 0 ${width} 240`}
        style={{ width: "100%", height: "100%", overflow: "visible" }}
        role="img"
        aria-label="График динамики"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Gradient fill */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Smooth stroke */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points and labels */}
        {points.map((pt, i) => {
          const showLabel = visibleLabelIndices.has(i);

          return (
            <g key={pt.tooltip || pt.label || i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4"
                fill="var(--clr-bg-page)"
                stroke={color}
                strokeWidth="2"
                style={{ cursor: "pointer" }}
              >
                <title>{`${pt.tooltip}: ${formatNumber(pt.val)} ₽`}</title>
              </circle>

              {showLabel && (
                <g>
                  <text
                    x={pt.x}
                    y={212}
                    textAnchor="middle"
                    fill="var(--clr-text-secondary)"
                    fontSize="12"
                    style={{ userSelect: "none" }}
                  >
                    {pt.label}
                  </text>
                  {pt.subLabel && (
                    <text
                      x={pt.x}
                      y={228}
                      textAnchor="middle"
                      fill="var(--clr-text-secondary)"
                      fontSize="11"
                      style={{ userSelect: "none" }}
                    >
                      {pt.subLabel}
                    </text>
                  )}
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
