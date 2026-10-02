import { useId, useMemo } from "react";
import { formatNumber } from "../utils";

export const ChartCurve = ({
  data = [],
  xAxisKey = "name",
  dataKey = "value",
  color = "var(--clr-bg-accent)",
  className = "",
}) => {
  const gradientId = useId();

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

    const width = 800;
    const height = 220;
    const topPadding = 20;
    const bottomPadding = 40;
    const plotHeight = height - topPadding - bottomPadding;

    const pts = data.map((item, index) => {
      const val = Number(item[dataKey]) || 0;
      const x = data.length === 1 ? width / 2 : 40 + (index / (data.length - 1)) * (width - 80);
      const y = topPadding + plotHeight - ((val - min) / range) * plotHeight;
      return { x, y, val, label: item[xAxisKey] };
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
  }, [data, dataKey, xAxisKey]);

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
      className={`o-chart-curve ${className}`}
      style={{ position: "relative", width: "100%", height: "240px" }}
    >
      <svg
        viewBox="0 0 800 240"
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
          const step = Math.ceil(points.length / 10);
          const showLabel = i % step === 0 || i === points.length - 1;

          return (
            <g key={pt.label || i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4"
                fill="var(--clr-bg-page)"
                stroke={color}
                strokeWidth="2"
                style={{ cursor: "pointer" }}
              >
                <title>{`${pt.label}: ${formatNumber(pt.val)} ₽`}</title>
              </circle>

              {showLabel && (
                <text
                  x={pt.x}
                  y={225}
                  textAnchor="middle"
                  fill="var(--clr-text-secondary)"
                  fontSize="12"
                  style={{ userSelect: "none" }}
                >
                  {pt.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
