import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const ChartCurve = ({
  data,
  xAxisKey = "name",
  dataKey = "value",
  color = "var(--clr-bg-accent)", // Default to accent color
  className = "",
}) => {
  return (
    <div className={`o-chart-curve ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCurve" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey={xAxisKey}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "var(--clr-text-secondary)" }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "var(--clr-text-secondary)" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--clr-bg-surface)",
              border: "1px solid var(--clr-border-primary)",
              borderRadius: "var(--radius-m)",
              color: "var(--clr-text-primary)",
            }}
            itemStyle={{ color: "var(--clr-text-primary)" }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorCurve)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
