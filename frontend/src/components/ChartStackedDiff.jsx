import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const ChartStackedDiff = ({
  data,
  xAxisKey = "name",
  dataKey1 = "income",
  dataKey2 = "expense",
  color1 = "var(--clr-text-semantic-success)", // e.g. income color
  color2 = "var(--clr-text-semantic-error)", // e.g. expense color
  className = "",
}) => {
  return (
    <div className={`o-chart-stacked-diff ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            cursor={{ fill: "var(--clr-bg-page)" }}
          />
          <ReferenceLine y={0} stroke="var(--clr-border-primary)" />
          {/* We stack them by giving the same stackId. In a diff scenario, one might be positive and one negative */}
          <Bar dataKey={dataKey1} stackId="a" fill={color1} radius={[4, 4, 0, 0]} />
          <Bar dataKey={dataKey2} stackId="a" fill={color2} radius={[0, 0, 4, 4]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
